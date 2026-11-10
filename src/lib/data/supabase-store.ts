import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminStats,
  ChatMessage,
  Conversation,
  DeviceModel,
  KnowledgeDocument,
  Locale,
  Profile,
  Subscription,
  UserDevice,
  UserPreferences,
} from "@/lib/domain/types";
import { DEFAULT_PREFERENCES } from "@/lib/domain/types";
import { filterRecipes } from "@/lib/recipes/filter";
import { materialize, summarize, type RecipeContent, type RecipeRecord } from "@/lib/recipes/record";
import type {
  ConversationRow,
  CookingSessionRow,
  DeviceModelJoinedRow,
  KnowledgeDocumentRow,
  MatchedChunkRow,
  MessageRow,
  ProfileRow,
  RecipeCompatibilityRow,
  RecipeFeedbackRow,
  RecipeIngredientRow,
  RecipeRow,
  RecipeStepRow,
  RecipeTranslationRow,
  RecipeVersionRow,
  SubscriptionRow,
  SupportRequestRow,
  UsageEventRow,
  UserDeviceRow,
  UserPreferencesRow,
} from "@/lib/supabase/database.types";
import { slugify, uid } from "@/lib/utils";
import type { DataStore, RecipeInput, RecipeMetaInput } from "./store";

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

function check(error: PostgrestError | null): void {
  if (!error) return;
  // Limit triggers raise P0001 with a machine-readable message (see 0006_billing_support.sql).
  if (error.message.includes("DEVICE_LIMIT_REACHED")) throw new StoreError("DEVICE_LIMIT_REACHED", "DEVICE_LIMIT_REACHED");
  if (error.message.includes("FAVORITE_LIMIT_REACHED")) throw new StoreError("FAVORITE_LIMIT_REACHED", "FAVORITE_LIMIT_REACHED");
  throw new StoreError(error.message, error.code);
}

const MODEL_SELECT =
  "*, brand:brands(*), category:device_categories(*), capabilities:device_capabilities(*), sources:device_sources(*)";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toModel(row: DeviceModelJoinedRow): DeviceModel {
  return {
    id: row.id,
    slug: row.slug,
    brand: { id: row.brand.id, slug: row.brand.slug, name: row.brand.name, manufacturer: row.brand.manufacturer },
    category: { id: row.category.id, slug: row.category.slug, name: row.category.name, description: row.category.description },
    name: row.name,
    modelNumber: row.model_number,
    region: row.region,
    description: row.description,
    imageUrl: row.image_url,
    specs: row.specs ?? [],
    missingInfo: row.missing_info ?? [],
    capabilities: [...(row.capabilities ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        key: c.key,
        name: c.name,
        tempMin: c.temp_min,
        tempMax: c.temp_max,
        tempUnit: c.temp_unit,
        levels: c.levels ?? [],
        notes: c.notes,
      })),
    sources: (row.sources ?? []).map((s) => ({ id: s.id, title: s.title, url: s.url, kind: s.kind, accessedAt: s.accessed_at })),
    verificationStatus: row.verification_status,
    lastVerifiedAt: row.last_verified_at,
    published: row.published,
  };
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
    onboarded: row.onboarded,
    createdAt: row.created_at,
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    userId: row.user_id,
    plan: row.plan,
    interval: row.billing_interval,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

function toConversation(row: ConversationRow): Conversation {
  return { id: row.id, userId: row.user_id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function toMessage(row: MessageRow): ChatMessage {
  return { id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content, payload: row.payload, createdAt: row.created_at };
}

function toDocument(row: KnowledgeDocumentRow & { knowledge_chunks?: { count: number }[] }): KnowledgeDocument {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    sourceUrl: row.source_url,
    manufacturer: row.manufacturer,
    modelNumber: row.model_number,
    language: row.language,
    docType: row.doc_type,
    publishedAt: row.published_at,
    verificationStatus: row.verification_status,
    rightsNote: row.rights_note,
    contentHash: row.content_hash,
    chunkCount: row.knowledge_chunks?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
  };
}

/** Builds an OR-joined prefix tsquery from free text, e.g. "grilled steak" → "grilled:* | steak:*". */
export function toTsQuery(text: string): string {
  const stop = new Set(["the", "and", "for", "with", "how", "les", "des", "une", "pour", "avec", "dans", "que", "est", "mon", "can", "you"]);
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2 && !stop.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
  return [...new Set(tokens)].slice(0, 16).map((t) => `${t}:*`).join(" | ");
}

/**
 * Supabase implementation of the DataStore.
 * @param db          client used for reads/writes (user session → RLS applies; or anon for public reads)
 * @param privileged  optional service-role client for server-only writes (usage metering, webhooks)
 */
export function createSupabaseStore(db: SupabaseClient, privileged: SupabaseClient | null = null): DataStore {
  const sys = privileged ?? db;

  async function loadRecords(rows: RecipeRow[]): Promise<RecipeRecord[]> {
    if (rows.length === 0) return [];
    const recipeIds = rows.map((r) => r.id);
    const versionIds = rows.map((r) => r.current_version_id).filter((v): v is string => Boolean(v));
    const [versions, translations, ingredients, steps, compat] = await Promise.all([
      db.from("recipe_versions").select("*").in("id", versionIds),
      db.from("recipe_translations").select("*").in("recipe_id", recipeIds),
      db.from("recipe_ingredients").select("*").in("version_id", versionIds).order("position"),
      db.from("recipe_steps").select("*").in("version_id", versionIds).order("position"),
      db.from("recipe_compatibility").select("*").in("recipe_id", recipeIds),
    ]);
    for (const res of [versions, translations, ingredients, steps, compat]) check(res.error);
    const versionById = new Map((versions.data as RecipeVersionRow[]).map((v) => [v.id, v]));
    return rows.map((row) => {
      const version = row.current_version_id ? versionById.get(row.current_version_id) : undefined;
      const record: RecipeRecord = {
        meta: {
          id: row.id,
          slug: row.slug,
          coverImage: row.cover_image,
          illustration: row.illustration,
          category: row.category,
          cuisine: row.cuisine,
          dietary: row.dietary ?? [],
          servings: version?.servings ?? 2,
          prepMinutes: version?.prep_minutes ?? 0,
          cookMinutes: version?.cook_minutes ?? 0,
          difficulty: row.difficulty,
          deviceCategory: row.device_category,
          programs: row.programs ?? [],
          compatibility: (compat.data as RecipeCompatibilityRow[])
            .filter((c) => c.recipe_id === row.id)
            .map((c) => ({ deviceModelId: c.device_model_id, tested: c.tested, notes: c.notes })),
          provenance: row.provenance,
          authorName: row.author_name,
          ownerId: row.owner_id,
          status: row.status,
          isDemo: row.is_demo,
          ratingAverage: row.rating_average != null ? Number(row.rating_average) : null,
          ratingCount: row.rating_count,
          version: version?.version ?? 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        translations: {},
      };
      for (const t of (translations.data as RecipeTranslationRow[]).filter((x) => x.recipe_id === row.id)) {
        record.translations[t.locale] = {
          title: t.title,
          description: t.description,
          accessories: t.accessories ?? [],
          safetyNotes: t.safety_notes ?? [],
          sourceNote: t.source_note,
          ingredients: (ingredients.data as RecipeIngredientRow[])
            .filter((i) => i.version_id === row.current_version_id && i.locale === t.locale)
            .map((i) => ({ name: i.name, quantity: i.quantity != null ? Number(i.quantity) : null, unit: i.unit, note: i.note, optional: i.optional })),
          steps: (steps.data as RecipeStepRow[])
            .filter((s) => s.version_id === row.current_version_id && s.locale === t.locale)
            .map((s) => ({
              position: s.position,
              instruction: s.instruction,
              program: s.program,
              level: s.level,
              temperatureC: s.temperature_c != null ? Number(s.temperature_c) : null,
              durationSeconds: s.duration_seconds,
              tip: s.tip,
            })),
        };
      }
      return record;
    });
  }

  async function summaries(rows: RecipeRow[], locale: Locale) {
    const records = await loadRecords(rows);
    return records
      .map((r) => materialize(r, locale))
      .filter((r) => r !== null)
      .map(summarize);
  }

  async function writeVersion(
    recipeId: string,
    versionNumber: number,
    meta: Pick<RecipeMetaInput, "servings" | "prepMinutes" | "cookMinutes" | "compatibility">,
    translations: Partial<Record<Locale, RecipeContent>>,
    createdBy: string | null,
  ): Promise<void> {
    const versionId = uid();
    check(
      (
        await db.from("recipe_versions").insert({
          id: versionId,
          recipe_id: recipeId,
          version: versionNumber,
          servings: meta.servings,
          prep_minutes: meta.prepMinutes,
          cook_minutes: meta.cookMinutes,
          created_by: createdBy,
        })
      ).error,
    );
    const entries = Object.entries(translations) as [Locale, RecipeContent][];
    for (const [locale, content] of entries) {
      check(
        (
          await db.from("recipe_translations").upsert(
            {
              recipe_id: recipeId,
              locale,
              title: content.title,
              description: content.description,
              accessories: content.accessories,
              safety_notes: content.safetyNotes,
              source_note: content.sourceNote,
            },
            { onConflict: "recipe_id,locale" },
          )
        ).error,
      );
      if (content.ingredients.length > 0) {
        check(
          (
            await db.from("recipe_ingredients").insert(
              content.ingredients.map((i, index) => ({
                version_id: versionId,
                locale,
                position: index + 1,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                note: i.note,
                optional: i.optional,
              })),
            )
          ).error,
        );
      }
      if (content.steps.length > 0) {
        check(
          (
            await db.from("recipe_steps").insert(
              content.steps.map((s, index) => ({
                version_id: versionId,
                locale,
                position: index + 1,
                instruction: s.instruction,
                program: s.program,
                level: s.level,
                temperature_c: s.temperatureC,
                duration_seconds: s.durationSeconds,
                tip: s.tip,
              })),
            )
          ).error,
        );
      }
    }
    check((await db.from("recipe_compatibility").delete().eq("recipe_id", recipeId)).error);
    if (meta.compatibility.length > 0) {
      check(
        (
          await db.from("recipe_compatibility").insert(
            meta.compatibility.map((c) => ({ recipe_id: recipeId, device_model_id: c.deviceModelId, tested: c.tested, notes: c.notes })),
          )
        ).error,
      );
    }
    check((await db.from("recipes").update({ current_version_id: versionId }).eq("id", recipeId)).error);
  }

  function recipeColumns(meta: RecipeMetaInput) {
    return {
      slug: meta.slug,
      status: meta.status,
      cover_image: meta.coverImage,
      illustration: meta.illustration,
      category: meta.category,
      cuisine: meta.cuisine,
      dietary: meta.dietary,
      difficulty: meta.difficulty,
      device_category: meta.deviceCategory,
      programs: meta.programs,
      provenance: meta.provenance,
      author_name: meta.authorName,
    };
  }

  const store: DataStore = {
    mode: "supabase",

    async listBrands() {
      const { data, error } = await db.from("brands").select("id, slug, name, manufacturer").order("name");
      check(error);
      return data ?? [];
    },
    async listCategories() {
      const { data, error } = await db.from("device_categories").select("id, slug, name, description").order("slug");
      check(error);
      return data ?? [];
    },
    async listDeviceModels(opts = {}) {
      let query = db.from("device_models").select(MODEL_SELECT).order("model_number");
      if (!opts.includeUnpublished) query = query.eq("published", true);
      const { data, error } = await query;
      check(error);
      const q = opts.query?.trim().toLowerCase() ?? "";
      return (data as unknown as DeviceModelJoinedRow[])
        .map(toModel)
        .filter((d) => !opts.brandSlug || d.brand.slug === opts.brandSlug)
        .filter((d) => !opts.categorySlug || d.category.slug === opts.categorySlug)
        .filter((d) => !q || `${d.brand.name} ${d.name} ${d.modelNumber} ${d.region}`.toLowerCase().includes(q));
    },
    async getDeviceModel(idOrSlug) {
      const column = UUID_RE.test(idOrSlug) ? "id" : "slug";
      const { data, error } = await db.from("device_models").select(MODEL_SELECT).eq(column, idOrSlug).maybeSingle();
      check(error);
      return data ? toModel(data as unknown as DeviceModelJoinedRow) : null;
    },
    async upsertDeviceModel(input) {
      const id = input.id ?? uid();
      check(
        (
          await db.from("device_models").upsert({
            id,
            slug: input.slug || slugify(`${input.name}-${input.modelNumber}`),
            brand_id: input.brandId,
            category_id: input.categoryId,
            name: input.name,
            model_number: input.modelNumber,
            region: input.region,
            description: input.description,
            image_url: input.imageUrl,
            specs: input.specs,
            missing_info: input.missingInfo,
            verification_status: input.verificationStatus,
            last_verified_at: input.lastVerifiedAt,
            published: input.published,
          })
        ).error,
      );
      check((await db.from("device_capabilities").delete().eq("device_model_id", id)).error);
      check((await db.from("device_sources").delete().eq("device_model_id", id)).error);
      if (input.capabilities.length > 0) {
        check(
          (
            await db.from("device_capabilities").insert(
              input.capabilities.map((c, position) => ({
                device_model_id: id,
                kind: c.kind,
                key: c.key,
                name: c.name,
                temp_min: c.tempMin,
                temp_max: c.tempMax,
                temp_unit: c.tempUnit,
                levels: c.levels,
                notes: c.notes,
                position,
              })),
            )
          ).error,
        );
      }
      if (input.sources.length > 0) {
        check(
          (
            await db
              .from("device_sources")
              .insert(input.sources.map((s) => ({ device_model_id: id, title: s.title, url: s.url, kind: s.kind, accessed_at: s.accessedAt })))
          ).error,
        );
      }
      const model = await store.getDeviceModel(id);
      if (!model) throw new StoreError("Device model could not be saved");
      return model;
    },
    async deleteDeviceModel(id) {
      check((await db.from("device_models").delete().eq("id", id)).error);
    },

    async getProfile(userId) {
      const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
      check(error);
      return data ? toProfile(data as ProfileRow) : null;
    },
    async updateProfile(userId, patch) {
      const update: Partial<ProfileRow> = {};
      if (patch.displayName !== undefined) update.display_name = patch.displayName;
      if (patch.locale !== undefined) update.locale = patch.locale;
      if (patch.onboarded !== undefined) update.onboarded = patch.onboarded;
      check((await db.from("profiles").update(update).eq("id", userId)).error);
    },
    async getPreferences(userId) {
      const { data, error } = await db.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
      check(error);
      if (!data) return { ...DEFAULT_PREFERENCES };
      const row = data as UserPreferencesRow;
      return {
        measurementSystem: row.measurement_system,
        temperatureUnit: row.temperature_unit,
        cuisines: row.cuisines ?? [],
        allergies: row.allergies ?? [],
        diets: row.diets ?? [],
        dislikes: row.dislikes ?? [],
        experience: row.experience,
        servings: row.servings,
      };
    },
    async updatePreferences(userId, prefs: UserPreferences) {
      check(
        (
          await db.from("user_preferences").upsert({
            user_id: userId,
            measurement_system: prefs.measurementSystem,
            temperature_unit: prefs.temperatureUnit,
            cuisines: prefs.cuisines,
            allergies: prefs.allergies,
            diets: prefs.diets,
            dislikes: prefs.dislikes,
            experience: prefs.experience,
            servings: prefs.servings,
          })
        ).error,
      );
    },

    async listUserDevices(userId) {
      const { data, error } = await db
        .from("user_devices")
        .select(`*, model:device_models(${MODEL_SELECT})`)
        .eq("user_id", userId)
        .order("added_at");
      check(error);
      return ((data ?? []) as unknown as (UserDeviceRow & { model: DeviceModelJoinedRow | null })[])
        .filter((row) => row.model)
        .map(
          (row): UserDevice => ({
            id: row.id,
            userId: row.user_id,
            modelId: row.device_model_id,
            nickname: row.nickname,
            isFavorite: row.is_favorite,
            addedAt: row.added_at,
            model: toModel(row.model!),
          }),
        );
    },
    async getUserDevice(userId, id) {
      if (!UUID_RE.test(id)) return null;
      return (await store.listUserDevices(userId)).find((d) => d.id === id) ?? null;
    },
    async addUserDevice(userId, modelId, nickname) {
      const existing = (await store.listUserDevices(userId)).find((d) => d.modelId === modelId);
      if (existing) return existing;
      const id = uid();
      const { count } = await db.from("user_devices").select("id", { count: "exact", head: true }).eq("user_id", userId);
      check((await db.from("user_devices").insert({ id, user_id: userId, device_model_id: modelId, nickname, is_favorite: (count ?? 0) === 0 })).error);
      const created = await store.getUserDevice(userId, id);
      if (!created) throw new StoreError("Device could not be added");
      return created;
    },
    async updateUserDevice(userId, id, patch) {
      if (patch.isFavorite) check((await db.from("user_devices").update({ is_favorite: false }).eq("user_id", userId)).error);
      const update: Partial<UserDeviceRow> = {};
      if (patch.nickname !== undefined) update.nickname = patch.nickname;
      if (patch.isFavorite !== undefined) update.is_favorite = patch.isFavorite;
      check((await db.from("user_devices").update(update).eq("id", id).eq("user_id", userId)).error);
    },
    async removeUserDevice(userId, id) {
      check((await db.from("user_devices").delete().eq("id", id).eq("user_id", userId)).error);
    },

    async listRecipes(locale, filter = {}) {
      let query = db.from("recipes").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(200);
      if (filter.deviceCategory) query = query.eq("device_category", filter.deviceCategory);
      if (filter.category) query = query.eq("category", filter.category);
      if (filter.difficulty) query = query.eq("difficulty", filter.difficulty);
      if (filter.diet) query = query.contains("dietary", [filter.diet]);
      const { data, error } = await query;
      check(error);
      return filterRecipes(await summaries((data ?? []) as RecipeRow[], locale), filter);
    },
    async getRecipeBySlug(slug, locale) {
      const { data, error } = await db.from("recipes").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      check(error);
      if (!data) return null;
      const [record] = await loadRecords([data as RecipeRow]);
      return record ? materialize(record, locale) : null;
    },
    async getRecipeById(id, locale) {
      if (!UUID_RE.test(id)) return null;
      // Visibility (published / owned / admin) is enforced by RLS.
      const { data, error } = await db.from("recipes").select("*").eq("id", id).maybeSingle();
      check(error);
      if (!data) return null;
      const [record] = await loadRecords([data as RecipeRow]);
      return record ? materialize(record, locale) : null;
    },
    async listUserRecipes(userId, locale) {
      const { data, error } = await db.from("recipes").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(200);
      check(error);
      return summaries((data ?? []) as RecipeRow[], locale);
    },
    async saveUserRecipe(userId, locale, meta, content) {
      const id = uid();
      const slug = `${slugify(content.title) || "recipe"}-${id.slice(0, 8)}`;
      check(
        (
          await db.from("recipes").insert({
            id,
            ...recipeColumns({ ...meta, slug, status: "private" }),
            owner_id: userId,
            is_demo: false,
          })
        ).error,
      );
      try {
        await writeVersion(id, 1, meta, { [locale]: content }, userId);
      } catch (error) {
        await db.from("recipes").delete().eq("id", id);
        throw error;
      }
      const recipe = await store.getRecipeById(id, locale, userId);
      if (!recipe) throw new StoreError("Recipe could not be saved");
      return recipe;
    },
    async deleteUserRecipe(userId, id) {
      check((await db.from("recipes").delete().eq("id", id).eq("owner_id", userId)).error);
    },
    async listAllRecipes(locale) {
      const { data, error } = await db.from("recipes").select("*").is("owner_id", null).order("created_at", { ascending: false }).limit(500);
      check(error);
      return summaries((data ?? []) as RecipeRow[], locale);
    },
    async getRecipeInput(id): Promise<RecipeInput | null> {
      if (!UUID_RE.test(id)) return null;
      const { data, error } = await db.from("recipes").select("*").eq("id", id).maybeSingle();
      check(error);
      if (!data) return null;
      const [record] = await loadRecords([data as RecipeRow]);
      return record ? { id, meta: record.meta, translations: record.translations } : null;
    },
    async upsertRecipe(input) {
      if (input.id) {
        const existing = await store.getRecipeInput(input.id);
        if (!existing) throw new StoreError("Recipe not found");
        const { data: versions } = await db.from("recipe_versions").select("version").eq("recipe_id", input.id).order("version", { ascending: false }).limit(1);
        const next = ((versions?.[0] as { version: number } | undefined)?.version ?? 0) + 1;
        check((await db.from("recipes").update(recipeColumns(input.meta)).eq("id", input.id)).error);
        await writeVersion(input.id, next, input.meta, { ...existing.translations, ...input.translations }, null);
        return input.id;
      }
      const id = uid();
      check((await db.from("recipes").insert({ id, ...recipeColumns(input.meta), owner_id: null, is_demo: false })).error);
      try {
        await writeVersion(id, 1, input.meta, input.translations, null);
      } catch (error) {
        await db.from("recipes").delete().eq("id", id);
        throw error;
      }
      return id;
    },
    async setRecipeStatus(id, status) {
      check((await db.from("recipes").update({ status }).eq("id", id)).error);
    },

    async listFavoriteIds(userId) {
      const { data, error } = await db.from("favorites").select("recipe_id").eq("user_id", userId);
      check(error);
      return ((data ?? []) as { recipe_id: string }[]).map((f) => f.recipe_id);
    },
    async listFavorites(userId, locale) {
      const ids = await store.listFavoriteIds(userId);
      if (ids.length === 0) return [];
      const { data, error } = await db.from("recipes").select("*").in("id", ids);
      check(error);
      return summaries((data ?? []) as RecipeRow[], locale);
    },
    async addFavorite(userId, recipeId) {
      check((await db.from("favorites").upsert({ user_id: userId, recipe_id: recipeId }, { onConflict: "user_id,recipe_id", ignoreDuplicates: true })).error);
    },
    async removeFavorite(userId, recipeId) {
      check((await db.from("favorites").delete().eq("user_id", userId).eq("recipe_id", recipeId)).error);
    },

    async addRecipeFeedback(userId, input) {
      check(
        (
          await db.from("recipe_feedback").upsert(
            { recipe_id: input.recipeId, user_id: userId, rating: input.rating, comment: input.comment, device_model_id: input.deviceModelId },
            { onConflict: "recipe_id,user_id" },
          )
        ).error,
      );
    },
    async listRecipeFeedback(limit) {
      const { data, error } = await db.from("recipe_feedback").select("*").order("created_at", { ascending: false }).limit(limit);
      check(error);
      const rows = (data ?? []) as RecipeFeedbackRow[];
      const ids = [...new Set(rows.map((r) => r.recipe_id))];
      const titles = new Map<string, string>();
      if (ids.length > 0) {
        const { data: tr } = await db.from("recipe_translations").select("recipe_id, title, locale").in("recipe_id", ids);
        for (const t of (tr ?? []) as { recipe_id: string; title: string; locale: string }[]) {
          if (!titles.has(t.recipe_id) || t.locale === "en") titles.set(t.recipe_id, t.title);
        }
      }
      return rows.map((r) => ({
        id: r.id,
        recipeId: r.recipe_id,
        recipeTitle: titles.get(r.recipe_id) ?? "",
        userId: r.user_id,
        rating: r.rating,
        comment: r.comment,
        deviceModelId: r.device_model_id,
        createdAt: r.created_at,
      }));
    },
    async logCookingSession(userId, input) {
      const { data } = await db.from("recipe_translations").select("title").eq("recipe_id", input.recipeId).limit(1);
      check(
        (
          await db.from("cooking_sessions").insert({
            user_id: userId,
            recipe_id: input.recipeId,
            recipe_title: (data?.[0] as { title: string } | undefined)?.title ?? "",
            device_model_id: input.deviceModelId,
            servings: input.servings,
          })
        ).error,
      );
    },
    async listCookingSessions(userId, sinceIso) {
      let query = db.from("cooking_sessions").select("*").eq("user_id", userId).order("completed_at", { ascending: false }).limit(200);
      if (sinceIso) query = query.gte("completed_at", sinceIso);
      const { data, error } = await query;
      check(error);
      return ((data ?? []) as CookingSessionRow[]).map((c) => ({
        id: c.id,
        userId: c.user_id,
        recipeId: c.recipe_id ?? "",
        recipeTitle: c.recipe_title,
        deviceModelId: c.device_model_id,
        servings: c.servings,
        completedAt: c.completed_at,
      }));
    },

    async listConversations(userId, sinceIso) {
      let query = db.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
      if (sinceIso) query = query.gte("updated_at", sinceIso);
      const { data, error } = await query;
      check(error);
      return ((data ?? []) as ConversationRow[]).map(toConversation);
    },
    async getConversation(userId, id) {
      if (!UUID_RE.test(id)) return null;
      const { data, error } = await db.from("conversations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
      check(error);
      if (!data) return null;
      const messages = await db.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(200);
      check(messages.error);
      return { conversation: toConversation(data as ConversationRow), messages: ((messages.data ?? []) as MessageRow[]).map(toMessage) };
    },
    async createConversation(userId, title) {
      const { data, error } = await db.from("conversations").insert({ user_id: userId, title }).select("*").single();
      check(error);
      return toConversation(data as ConversationRow);
    },
    async addMessage(userId, conversationId, message) {
      const { data, error } = await db
        .from("messages")
        .insert({ conversation_id: conversationId, user_id: userId, role: message.role, content: message.content, payload: message.payload })
        .select("*")
        .single();
      check(error);
      await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", userId);
      return toMessage(data as MessageRow);
    },
    async deleteConversation(userId, id) {
      check((await db.from("conversations").delete().eq("id", id).eq("user_id", userId)).error);
    },

    async listKnowledgeDocuments() {
      const { data, error } = await db.from("knowledge_documents").select("*, knowledge_chunks(count)").order("title").limit(500);
      check(error);
      return ((data ?? []) as unknown as (KnowledgeDocumentRow & { knowledge_chunks: { count: number }[] })[]).map(toDocument);
    },
    async ingestKnowledgeDocument(input) {
      const existing = await db
        .from("knowledge_documents")
        .select("*, knowledge_chunks(count)")
        .eq("content_hash", input.contentHash)
        .eq("language", input.language)
        .maybeSingle();
      check(existing.error);
      if (existing.data) return toDocument(existing.data as unknown as KnowledgeDocumentRow & { knowledge_chunks: { count: number }[] });
      const id = uid();
      check(
        (
          await db.from("knowledge_documents").insert({
            id,
            title: input.title,
            source: input.source,
            source_url: input.sourceUrl,
            manufacturer: input.manufacturer,
            model_number: input.modelNumber,
            language: input.language,
            doc_type: input.docType,
            published_at: input.publishedAt,
            verification_status: input.verificationStatus,
            rights_note: input.rightsNote,
            content_hash: input.contentHash,
          })
        ).error,
      );
      if (input.chunks.length > 0) {
        const { error } = await db
          .from("knowledge_chunks")
          .insert(input.chunks.map((c, position) => ({ document_id: id, position, content: c.content, embedding: c.embedding })));
        if (error) {
          await db.from("knowledge_documents").delete().eq("id", id);
          check(error);
        }
      }
      const { data } = await db.from("knowledge_documents").select("*, knowledge_chunks(count)").eq("id", id).single();
      return toDocument(data as unknown as KnowledgeDocumentRow & { knowledge_chunks: { count: number }[] });
    },
    async deleteKnowledgeDocument(id) {
      check((await db.from("knowledge_documents").delete().eq("id", id)).error);
    },
    async searchKnowledge({ query, embedding, filter, limit }) {
      const run = async (vector: number[] | null) => {
        const { data, error } = await db.rpc("match_knowledge_chunks", {
          query_embedding: vector,
          query_text: vector ? null : toTsQuery(query),
          match_count: limit,
          filter_language: filter.language ?? null,
          filter_models: filter.modelNumbers ?? null,
          filter_doc_types: filter.docTypes ?? null,
        });
        check(error);
        return ((data ?? []) as MatchedChunkRow[]).map((row) => ({
          id: row.id,
          documentId: row.document_id,
          position: row.chunk_position,
          content: row.content,
          manufacturer: row.manufacturer,
          modelNumber: row.model_number,
          language: row.language,
          docType: row.doc_type,
          verificationStatus: row.verification_status,
          documentTitle: row.document_title,
          sourceUrl: row.source_url,
          score: row.score,
        }));
      };
      if (embedding) {
        const semantic = await run(embedding);
        if (semantic.length > 0) return semantic;
      }
      // Fallback: full-text search (also covers chunks that have no embedding yet).
      return toTsQuery(query) ? run(null) : [];
    },

    async getSubscription(userId) {
      const { data, error } = await db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
      check(error);
      return data ? toSubscription(data as SubscriptionRow) : null;
    },
    async upsertSubscription(subscription) {
      check(
        (
          await sys.from("subscriptions").upsert({
            user_id: subscription.userId,
            plan: subscription.plan,
            billing_interval: subscription.interval,
            status: subscription.status,
            current_period_end: subscription.currentPeriodEnd,
            cancel_at_period_end: subscription.cancelAtPeriodEnd,
            stripe_customer_id: subscription.stripeCustomerId,
            stripe_subscription_id: subscription.stripeSubscriptionId,
          })
        ).error,
      );
    },
    async findUserIdByStripeCustomer(customerId) {
      const { data, error } = await sys.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      check(error);
      return (data as { user_id: string } | null)?.user_id ?? null;
    },
    async recordUsage(event) {
      check(
        (
          await sys.from("usage_events").insert({
            user_id: event.userId,
            kind: event.kind,
            model: event.model,
            input_tokens: event.inputTokens,
            output_tokens: event.outputTokens,
            estimated_cost_usd: event.estimatedCostUsd,
          })
        ).error,
      );
    },
    async countUsage(userId, kind, sinceIso) {
      const { count, error } = await db
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", kind)
        .gte("created_at", sinceIso);
      check(error);
      return count ?? 0;
    },

    async createSupportRequest(input) {
      check(
        (await db.from("support_requests").insert({ user_id: input.userId, email: input.email, kind: input.kind, subject: input.subject, message: input.message }))
          .error,
      );
    },
    async listSupportRequests() {
      const { data, error } = await db.from("support_requests").select("*").order("created_at", { ascending: false }).limit(200);
      check(error);
      return ((data ?? []) as SupportRequestRow[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        kind: r.kind,
        subject: r.subject,
        message: r.message,
        status: r.status,
        createdAt: r.created_at,
      }));
    },
    async updateSupportRequestStatus(id, status) {
      check((await db.from("support_requests").update({ status }).eq("id", id)).error);
    },

    async getAdminStats(): Promise<AdminStats> {
      const count = async (table: string, apply?: (q: ReturnType<typeof head>) => ReturnType<typeof head>) => {
        const base = head(table);
        const { count: c, error } = await (apply ? apply(base) : base);
        check(error);
        return c ?? 0;
      };
      const head = (table: string) => db.from(table).select("*", { count: "exact", head: true });
      const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [users, pro, devices, devicesReview, published, draft, docs, open, usage] = await Promise.all([
        count("profiles"),
        count("subscriptions", (q) => q.eq("plan", "pro").in("status", ["active", "trialing", "past_due"])),
        count("device_models"),
        count("device_models", (q) => q.neq("verification_status", "verified")),
        count("recipes", (q) => q.is("owner_id", null).eq("status", "published")),
        count("recipes", (q) => q.is("owner_id", null).eq("status", "draft")),
        count("knowledge_documents"),
        count("support_requests", (q) => q.eq("status", "open")),
        db.from("usage_events").select("kind, estimated_cost_usd, created_at").eq("kind", "chef_message").gte("created_at", cutoff).limit(10000),
      ]);
      check(usage.error);
      const rows = (usage.data ?? []) as Pick<UsageEventRow, "estimated_cost_usd" | "created_at">[];
      const byDay = new Map<string, { requests: number; costUsd: number }>();
      for (const row of rows) {
        const day = row.created_at.slice(0, 10);
        const entry = byDay.get(day) ?? { requests: 0, costUsd: 0 };
        entry.requests += 1;
        entry.costUsd += Number(row.estimated_cost_usd);
        byDay.set(day, entry);
      }
      return {
        users,
        proSubscribers: pro,
        devices,
        devicesNeedingReview: devicesReview,
        recipesPublished: published,
        recipesDraft: draft,
        knowledgeDocuments: docs,
        openRequests: open,
        aiRequests30d: rows.length,
        aiCost30dUsd: rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0),
        usageByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      };
    },
    async listUsers() {
      const [profiles, subs, devices] = await Promise.all([
        db.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
        db.from("subscriptions").select("*").limit(1000),
        db.from("user_devices").select("user_id").limit(5000),
      ]);
      check(profiles.error);
      const subByUser = new Map(((subs.data ?? []) as SubscriptionRow[]).map((s) => [s.user_id, toSubscription(s)]));
      const deviceCount = new Map<string, number>();
      for (const d of (devices.data ?? []) as { user_id: string }[]) deviceCount.set(d.user_id, (deviceCount.get(d.user_id) ?? 0) + 1);
      const { resolvePlan } = await import("@/lib/billing/plans");
      return ((profiles.data ?? []) as ProfileRow[]).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        role: p.role,
        plan: resolvePlan(subByUser.get(p.id) ?? null),
        createdAt: p.created_at,
        deviceCount: deviceCount.get(p.id) ?? 0,
      }));
    },
    async setUserRole(userId, role) {
      check((await db.from("profiles").update({ role }).eq("id", userId)).error);
    },

    async exportUserData(userId, locale) {
      const [profile, preferences, devices, favorites, recipes, conversations, cookingSessions, subscription] = await Promise.all([
        store.getProfile(userId),
        store.getPreferences(userId),
        store.listUserDevices(userId),
        store.listFavoriteIds(userId),
        store.listUserRecipes(userId, locale),
        store.listConversations(userId, null),
        store.listCookingSessions(userId, null),
        store.getSubscription(userId),
      ]);
      const full = await Promise.all(conversations.map((c) => store.getConversation(userId, c.id)));
      return {
        exportedAt: new Date().toISOString(),
        profile,
        preferences,
        devices: devices.map((d) => ({ model: `${d.model.brand.name} ${d.model.modelNumber}`, nickname: d.nickname, addedAt: d.addedAt })),
        favorites,
        recipes,
        conversations: full.filter((c) => c !== null),
        cookingSessions,
        subscription,
      };
    },
    async deleteUserData(userId) {
      if (privileged) {
        const { error } = await privileged.auth.admin.deleteUser(userId);
        if (error) throw new StoreError(error.message);
        return;
      }
      // No service role: the SECURITY DEFINER RPC removes the caller's auth user; all data cascades.
      check((await db.rpc("delete_my_account")).error);
    },
  };

  return store;
}
