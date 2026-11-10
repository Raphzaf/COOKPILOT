import { SEED_BRANDS, SEED_CATEGORIES, SEED_DEVICES } from "@/data/seed/devices";
import { buildSeedKnowledge } from "@/data/seed/knowledge";
import { SEED_RECIPES } from "@/data/seed/recipes";
import type {
  AdminStats,
  ChatMessage,
  Conversation,
  CookingSession,
  DeviceModel,
  KnowledgeChunk,
  KnowledgeDocument,
  Locale,
  Profile,
  RecipeFeedback,
  Subscription,
  SupportRequest,
  UsageEvent,
  UserDevice,
  UserPreferences,
  UserRole,
} from "@/lib/domain/types";
import { DEFAULT_PREFERENCES } from "@/lib/domain/types";
import { chunkText, contentHash } from "@/lib/rag/chunk";
import { lexicalSearch } from "@/lib/rag/lexical";
import { filterRecipes } from "@/lib/recipes/filter";
import { materialize, seedToRecord, summarize, type RecipeRecord } from "@/lib/recipes/record";
import { normalizeText, slugify, uid } from "@/lib/utils";
import type { DataStore, DeviceModelInput } from "./store";

/**
 * In-memory demo database. It exists so the product is fully explorable before a Supabase
 * project is connected. Everything in it is demonstration data and is lost when the server
 * instance recycles; a compact per-visitor snapshot is kept in a cookie (see lib/auth/demo.ts).
 */

interface DemoUserState {
  profile: Profile;
  preferences: UserPreferences;
  devices: Omit<UserDevice, "model">[];
  favorites: string[];
  conversations: Conversation[];
  messages: ChatMessage[];
  cooking: CookingSession[];
  subscription: Subscription | null;
}

interface DemoDb {
  devices: DeviceModel[];
  recipes: RecipeRecord[];
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  users: Map<string, DemoUserState>;
  feedback: RecipeFeedback[];
  support: SupportRequest[];
  usage: UsageEvent[];
}

/** Compact, cookie-sized view of a demo visitor's state. */
export interface DemoSnapshot {
  n: string | null;
  l: Locale;
  o: boolean;
  r: UserRole;
  p: UserPreferences;
  d: { m: string; n: string | null; f: boolean }[];
  f: string[];
  s: "free" | "pro";
}

const globalRef = globalThis as unknown as { __cookpilotDemoDb?: DemoDb };

function buildDb(): DemoDb {
  const documents: KnowledgeDocument[] = [];
  const chunks: KnowledgeChunk[] = [];
  for (const doc of buildSeedKnowledge()) {
    const id = uid();
    const parts = chunkText(doc.content);
    documents.push({
      id,
      title: doc.title,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      manufacturer: doc.manufacturer,
      modelNumber: doc.modelNumber,
      language: doc.language,
      docType: doc.docType,
      publishedAt: doc.publishedAt,
      verificationStatus: doc.verificationStatus,
      rightsNote: doc.rightsNote,
      contentHash: contentHash(doc.content),
      chunkCount: parts.length,
      updatedAt: new Date().toISOString(),
    });
    parts.forEach((content, position) =>
      chunks.push({
        id: uid(),
        documentId: id,
        position,
        content,
        manufacturer: doc.manufacturer,
        modelNumber: doc.modelNumber,
        language: doc.language,
        docType: doc.docType,
        verificationStatus: doc.verificationStatus,
        documentTitle: doc.title,
        sourceUrl: doc.sourceUrl,
      }),
    );
  }
  return {
    devices: structuredClone(SEED_DEVICES),
    recipes: SEED_RECIPES.map(seedToRecord),
    documents,
    chunks,
    users: new Map(),
    feedback: [],
    support: [],
    usage: [],
  };
}

function db(): DemoDb {
  if (!globalRef.__cookpilotDemoDb) globalRef.__cookpilotDemoDb = buildDb();
  return globalRef.__cookpilotDemoDb;
}

/** Test helper: wipes the demo database. */
export function resetDemoDb(): void {
  globalRef.__cookpilotDemoDb = undefined;
}

function newUser(userId: string): DemoUserState {
  return {
    profile: {
      id: userId,
      email: "demo@cookpilot.app",
      displayName: null,
      role: "user",
      locale: "en",
      onboarded: false,
      createdAt: new Date().toISOString(),
    },
    preferences: structuredClone(DEFAULT_PREFERENCES),
    devices: [],
    favorites: [],
    conversations: [],
    messages: [],
    cooking: [],
    subscription: null,
  };
}

function user(userId: string): DemoUserState {
  const users = db().users;
  let state = users.get(userId);
  if (!state) {
    state = newUser(userId);
    users.set(userId, state);
  }
  return state;
}

export function hasDemoUser(userId: string): boolean {
  return db().users.has(userId);
}

export function hydrateDemoUser(userId: string, snapshot: DemoSnapshot | null): void {
  if (db().users.has(userId)) return;
  const state = newUser(userId);
  if (snapshot) {
    const known = new Set(db().devices.map((d) => d.id));
    state.profile.displayName = snapshot.n;
    state.profile.locale = snapshot.l;
    state.profile.onboarded = snapshot.o;
    state.profile.role = snapshot.r;
    state.preferences = { ...DEFAULT_PREFERENCES, ...snapshot.p };
    state.devices = snapshot.d
      .filter((d) => known.has(d.m))
      .map((d) => ({ id: uid(), userId, modelId: d.m, nickname: d.n, isFavorite: d.f, addedAt: new Date().toISOString() }));
    state.favorites = snapshot.f;
    if (snapshot.s === "pro") state.subscription = demoProSubscription(userId);
  }
  db().users.set(userId, state);
}

export function snapshotDemoUser(userId: string): DemoSnapshot {
  const state = user(userId);
  return {
    n: state.profile.displayName,
    l: state.profile.locale,
    o: state.profile.onboarded,
    r: state.profile.role,
    p: state.preferences,
    d: state.devices.slice(0, 12).map((d) => ({ m: d.modelId, n: d.nickname, f: d.isFavorite })),
    f: state.favorites.slice(0, 30),
    s: state.subscription?.plan === "pro" ? "pro" : "free",
  };
}

function demoProSubscription(userId: string): Subscription {
  return {
    userId,
    plan: "pro",
    interval: "month",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

/** Demo-only switches (persona / plan preview). Never available when Supabase is configured. */
export function setDemoRole(userId: string, role: UserRole): void {
  user(userId).profile.role = role;
}
export function setDemoPlan(userId: string, plan: "free" | "pro"): void {
  user(userId).subscription = plan === "pro" ? demoProSubscription(userId) : null;
}

function withModel(device: Omit<UserDevice, "model">): UserDevice | null {
  const model = db().devices.find((d) => d.id === device.modelId);
  return model ? { ...device, model } : null;
}

function since<T>(items: T[], pick: (item: T) => string, sinceIso: string | null): T[] {
  if (!sinceIso) return items;
  const t = new Date(sinceIso).getTime();
  return items.filter((i) => new Date(pick(i)).getTime() >= t);
}

export const demoStore: DataStore = {
  mode: "demo",

  async listBrands() {
    return SEED_BRANDS;
  },
  async listCategories() {
    return SEED_CATEGORIES;
  },
  async listDeviceModels(opts = {}) {
    const q = opts.query ? normalizeText(opts.query) : "";
    return db()
      .devices.filter((d) => opts.includeUnpublished || d.published)
      .filter((d) => !opts.brandSlug || d.brand.slug === opts.brandSlug)
      .filter((d) => !opts.categorySlug || d.category.slug === opts.categorySlug)
      .filter((d) => !q || normalizeText(`${d.brand.name} ${d.name} ${d.modelNumber} ${d.region}`).includes(q))
      .sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
  },
  async getDeviceModel(idOrSlug) {
    return db().devices.find((d) => d.id === idOrSlug || d.slug === idOrSlug) ?? null;
  },
  async upsertDeviceModel(input: DeviceModelInput) {
    const brand = SEED_BRANDS.find((b) => b.id === input.brandId);
    const category = SEED_CATEGORIES.find((c) => c.id === input.categoryId);
    if (!brand || !category) throw new Error("Unknown brand or category");
    const model: DeviceModel = {
      id: input.id ?? uid(),
      slug: input.slug || slugify(`${brand.name}-${input.name}-${input.modelNumber}`),
      brand,
      category,
      name: input.name,
      modelNumber: input.modelNumber,
      region: input.region,
      description: input.description,
      imageUrl: input.imageUrl,
      specs: input.specs,
      missingInfo: input.missingInfo,
      capabilities: input.capabilities.map((c) => ({ ...c, id: uid() })),
      sources: input.sources.map((s) => ({ ...s, id: uid() })),
      verificationStatus: input.verificationStatus,
      lastVerifiedAt: input.lastVerifiedAt,
      published: input.published,
    };
    const list = db().devices;
    const index = list.findIndex((d) => d.id === model.id);
    if (index >= 0) list[index] = model;
    else list.push(model);
    return model;
  },
  async deleteDeviceModel(id) {
    const d = db();
    d.devices = d.devices.filter((m) => m.id !== id);
    for (const state of d.users.values()) state.devices = state.devices.filter((ud) => ud.modelId !== id);
  },

  async getProfile(userId) {
    return user(userId).profile;
  },
  async updateProfile(userId, patch) {
    Object.assign(user(userId).profile, patch);
  },
  async getPreferences(userId) {
    return user(userId).preferences;
  },
  async updatePreferences(userId, prefs) {
    user(userId).preferences = prefs;
  },

  async listUserDevices(userId) {
    return user(userId)
      .devices.map(withModel)
      .filter((d): d is UserDevice => d !== null);
  },
  async getUserDevice(userId, id) {
    const device = user(userId).devices.find((d) => d.id === id);
    return device ? withModel(device) : null;
  },
  async addUserDevice(userId, modelId, nickname) {
    const state = user(userId);
    const existing = state.devices.find((d) => d.modelId === modelId);
    if (existing) return withModel(existing)!;
    const device = { id: uid(), userId, modelId, nickname, isFavorite: state.devices.length === 0, addedAt: new Date().toISOString() };
    const full = withModel(device);
    if (!full) throw new Error("Unknown device model");
    state.devices.push(device);
    return full;
  },
  async updateUserDevice(userId, id, patch) {
    const state = user(userId);
    const device = state.devices.find((d) => d.id === id);
    if (!device) return;
    if (patch.nickname !== undefined) device.nickname = patch.nickname;
    if (patch.isFavorite !== undefined) {
      if (patch.isFavorite) for (const d of state.devices) d.isFavorite = false;
      device.isFavorite = patch.isFavorite;
    }
  },
  async removeUserDevice(userId, id) {
    const state = user(userId);
    state.devices = state.devices.filter((d) => d.id !== id);
  },

  async listRecipes(locale, filter = {}) {
    const all = db()
      .recipes.filter((r) => r.meta.status === "published")
      .map((r) => materialize(r, locale))
      .filter((r) => r !== null)
      .map(summarize);
    return filterRecipes(all, filter);
  },
  async getRecipeBySlug(slug, locale) {
    const record = db().recipes.find((r) => r.meta.slug === slug && r.meta.status === "published");
    return record ? materialize(record, locale) : null;
  },
  async getRecipeById(id, locale, userId) {
    const record = db().recipes.find((r) => r.meta.id === id);
    if (!record) return null;
    if (record.meta.status !== "published" && record.meta.ownerId !== userId) return null;
    return materialize(record, locale);
  },
  async listUserRecipes(userId, locale) {
    return db()
      .recipes.filter((r) => r.meta.ownerId === userId)
      .map((r) => materialize(r, locale))
      .filter((r) => r !== null)
      .map(summarize)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async saveUserRecipe(userId, locale, meta, content) {
    const now = new Date().toISOString();
    const id = uid();
    const record: RecipeRecord = {
      meta: {
        ...meta,
        id,
        slug: `${slugify(content.title) || "recipe"}-${id.slice(0, 8)}`,
        status: "private",
        ownerId: userId,
        isDemo: false,
        ratingAverage: null,
        ratingCount: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      translations: { [locale]: content },
    };
    db().recipes.push(record);
    return materialize(record, locale)!;
  },
  async deleteUserRecipe(userId, id) {
    const d = db();
    d.recipes = d.recipes.filter((r) => !(r.meta.id === id && r.meta.ownerId === userId));
  },
  async listAllRecipes(locale) {
    return db()
      .recipes.filter((r) => r.meta.ownerId === null)
      .map((r) => materialize(r, locale))
      .filter((r) => r !== null)
      .map(summarize);
  },
  async getRecipeInput(id) {
    const record = db().recipes.find((r) => r.meta.id === id);
    if (!record) return null;
    return { id, meta: record.meta, translations: record.translations };
  },
  async upsertRecipe(input) {
    const d = db();
    const now = new Date().toISOString();
    const existing = input.id ? d.recipes.find((r) => r.meta.id === input.id) : undefined;
    if (existing) {
      existing.meta = { ...existing.meta, ...input.meta, version: existing.meta.version + 1, updatedAt: now };
      existing.translations = { ...existing.translations, ...input.translations };
      return existing.meta.id;
    }
    const id = uid();
    d.recipes.push({
      meta: { ...input.meta, id, ownerId: null, isDemo: false, ratingAverage: null, ratingCount: 0, version: 1, createdAt: now, updatedAt: now },
      translations: input.translations,
    });
    return id;
  },
  async setRecipeStatus(id, status) {
    const record = db().recipes.find((r) => r.meta.id === id);
    if (record) record.meta.status = status;
  },

  async listFavoriteIds(userId) {
    return user(userId).favorites;
  },
  async listFavorites(userId, locale) {
    const ids = new Set(user(userId).favorites);
    return db()
      .recipes.filter((r) => ids.has(r.meta.id))
      .map((r) => materialize(r, locale))
      .filter((r) => r !== null)
      .map(summarize);
  },
  async addFavorite(userId, recipeId) {
    const state = user(userId);
    if (!state.favorites.includes(recipeId)) state.favorites.push(recipeId);
  },
  async removeFavorite(userId, recipeId) {
    const state = user(userId);
    state.favorites = state.favorites.filter((id) => id !== recipeId);
  },

  async addRecipeFeedback(userId, input) {
    const d = db();
    const record = d.recipes.find((r) => r.meta.id === input.recipeId);
    if (!record) return;
    d.feedback = d.feedback.filter((f) => !(f.userId === userId && f.recipeId === input.recipeId));
    d.feedback.unshift({
      id: uid(),
      recipeId: input.recipeId,
      recipeTitle: materialize(record, "en")?.title ?? record.meta.slug,
      userId,
      rating: input.rating,
      comment: input.comment,
      deviceModelId: input.deviceModelId,
      createdAt: new Date().toISOString(),
    });
    const ratings = d.feedback.filter((f) => f.recipeId === input.recipeId && f.rating != null).map((f) => f.rating!);
    record.meta.ratingCount = ratings.length;
    record.meta.ratingAverage = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
  },
  async listRecipeFeedback(limit) {
    return db().feedback.slice(0, limit);
  },
  async logCookingSession(userId, input) {
    const record = db().recipes.find((r) => r.meta.id === input.recipeId);
    const state = user(userId);
    state.cooking.unshift({
      id: uid(),
      userId,
      recipeId: input.recipeId,
      recipeTitle: record ? (materialize(record, state.profile.locale)?.title ?? "") : "",
      deviceModelId: input.deviceModelId,
      servings: input.servings,
      completedAt: new Date().toISOString(),
    });
  },
  async listCookingSessions(userId, sinceIso) {
    return since(user(userId).cooking, (c) => c.completedAt, sinceIso);
  },

  async listConversations(userId, sinceIso) {
    return since(user(userId).conversations, (c) => c.updatedAt, sinceIso).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getConversation(userId, id) {
    const state = user(userId);
    const conversation = state.conversations.find((c) => c.id === id);
    if (!conversation) return null;
    return { conversation, messages: state.messages.filter((m) => m.conversationId === id) };
  },
  async createConversation(userId, title) {
    const now = new Date().toISOString();
    const conversation: Conversation = { id: uid(), userId, title, createdAt: now, updatedAt: now };
    const state = user(userId);
    state.conversations.unshift(conversation);
    // Demo memory guard: keep the 20 most recent conversations.
    for (const old of state.conversations.splice(20)) state.messages = state.messages.filter((m) => m.conversationId !== old.id);
    return conversation;
  },
  async addMessage(userId, conversationId, message) {
    const state = user(userId);
    const conversation = state.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const created: ChatMessage = { id: uid(), conversationId, createdAt: new Date().toISOString(), ...message };
    state.messages.push(created);
    conversation.updatedAt = created.createdAt;
    return created;
  },
  async deleteConversation(userId, id) {
    const state = user(userId);
    state.conversations = state.conversations.filter((c) => c.id !== id);
    state.messages = state.messages.filter((m) => m.conversationId !== id);
  },

  async listKnowledgeDocuments() {
    return [...db().documents].sort((a, b) => a.title.localeCompare(b.title));
  },
  async ingestKnowledgeDocument(input) {
    const d = db();
    const duplicate = d.documents.find((doc) => doc.contentHash === input.contentHash && doc.language === input.language);
    if (duplicate) return duplicate;
    const { chunks, ...meta } = input;
    const doc: KnowledgeDocument = { ...meta, id: uid(), chunkCount: chunks.length, updatedAt: new Date().toISOString() };
    d.documents.push(doc);
    chunks.forEach((chunk, position) =>
      d.chunks.push({
        id: uid(),
        documentId: doc.id,
        position,
        content: chunk.content,
        manufacturer: doc.manufacturer,
        modelNumber: doc.modelNumber,
        language: doc.language,
        docType: doc.docType,
        verificationStatus: doc.verificationStatus,
        documentTitle: doc.title,
        sourceUrl: doc.sourceUrl,
      }),
    );
    return doc;
  },
  async deleteKnowledgeDocument(id) {
    const d = db();
    d.documents = d.documents.filter((doc) => doc.id !== id);
    d.chunks = d.chunks.filter((c) => c.documentId !== id);
  },
  async searchKnowledge({ query, filter, limit }) {
    return lexicalSearch(query, db().chunks, filter, limit);
  },
  async listKnowledgeChunks() {
    return db().chunks;
  },

  async getSubscription(userId) {
    return user(userId).subscription;
  },
  async upsertSubscription(subscription) {
    user(subscription.userId).subscription = subscription;
  },
  async findUserIdByStripeCustomer(customerId) {
    for (const [id, state] of db().users) if (state.subscription?.stripeCustomerId === customerId) return id;
    return null;
  },
  async recordUsage(event) {
    const d = db();
    d.usage.push(event);
    if (d.usage.length > 5000) d.usage.splice(0, d.usage.length - 5000);
  },
  async countUsage(userId, kind, sinceIso) {
    const t = new Date(sinceIso).getTime();
    return db().usage.filter((u) => u.userId === userId && u.kind === kind && new Date(u.createdAt).getTime() >= t).length;
  },

  async createSupportRequest(input) {
    db().support.unshift({ id: uid(), status: "open", createdAt: new Date().toISOString(), ...input });
  },
  async listSupportRequests() {
    return db().support;
  },
  async updateSupportRequestStatus(id, status) {
    const request = db().support.find((s) => s.id === id);
    if (request) request.status = status;
  },

  async getAdminStats(): Promise<AdminStats> {
    const d = db();
    const cutoff = Date.now() - 30 * 86400_000;
    const recent = d.usage.filter((u) => new Date(u.createdAt).getTime() >= cutoff && u.kind === "chef_message");
    const byDay = new Map<string, { requests: number; costUsd: number }>();
    for (const u of recent) {
      const day = u.createdAt.slice(0, 10);
      const entry = byDay.get(day) ?? { requests: 0, costUsd: 0 };
      entry.requests += 1;
      entry.costUsd += u.estimatedCostUsd;
      byDay.set(day, entry);
    }
    const catalogue = d.recipes.filter((r) => r.meta.ownerId === null);
    return {
      users: d.users.size,
      proSubscribers: [...d.users.values()].filter((u) => u.subscription?.plan === "pro").length,
      devices: d.devices.length,
      devicesNeedingReview: d.devices.filter((m) => m.verificationStatus !== "verified").length,
      recipesPublished: catalogue.filter((r) => r.meta.status === "published").length,
      recipesDraft: catalogue.filter((r) => r.meta.status === "draft").length,
      knowledgeDocuments: d.documents.length,
      openRequests: d.support.filter((s) => s.status === "open").length,
      aiRequests30d: recent.length,
      aiCost30dUsd: recent.reduce((sum, u) => sum + u.estimatedCostUsd, 0),
      usageByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
    };
  },
  async listUsers() {
    return [...db().users.values()].map((state) => ({
      id: state.profile.id,
      email: state.profile.email,
      displayName: state.profile.displayName,
      role: state.profile.role,
      plan: state.subscription?.plan === "pro" ? ("pro" as const) : ("free" as const),
      createdAt: state.profile.createdAt,
      deviceCount: state.devices.length,
    }));
  },
  async setUserRole(userId, role) {
    const state = db().users.get(userId);
    if (state) state.profile.role = role;
  },

  async exportUserData(userId, locale) {
    const state = user(userId);
    const devices = await this.listUserDevices(userId);
    return {
      exportedAt: new Date().toISOString(),
      profile: state.profile,
      preferences: state.preferences,
      devices: devices.map((d) => ({ model: `${d.model.brand.name} ${d.model.modelNumber}`, nickname: d.nickname, addedAt: d.addedAt })),
      favorites: state.favorites,
      recipes: await this.listUserRecipes(userId, locale),
      conversations: state.conversations.map((conversation) => ({
        conversation,
        messages: state.messages.filter((m) => m.conversationId === conversation.id),
      })),
      cookingSessions: state.cooking,
      subscription: state.subscription,
    };
  },
  async deleteUserData(userId) {
    const d = db();
    d.users.delete(userId);
    d.recipes = d.recipes.filter((r) => r.meta.ownerId !== userId);
    d.feedback = d.feedback.filter((f) => f.userId !== userId);
    d.usage = d.usage.filter((u) => u.userId !== userId);
    d.support = d.support.filter((s) => s.userId !== userId);
  },
};
