import type {
  AdminStats,
  AdminUserRow,
  Brand,
  ChatMessage,
  Conversation,
  CookingSession,
  DeviceCapability,
  DeviceCategory,
  DeviceModel,
  DeviceSource,
  DeviceSpec,
  I18nText,
  KnowledgeChunk,
  KnowledgeDocument,
  Locale,
  Profile,
  Recipe,
  RecipeFeedback,
  RecipeFilter,
  RecipeStatus,
  RecipeSummary,
  RetrievedChunk,
  Subscription,
  SupportRequest,
  SupportRequestKind,
  SupportRequestStatus,
  UsageEvent,
  UsageKind,
  UserDevice,
  UserPreferences,
  UserRole,
  VerificationStatus,
} from "@/lib/domain/types";
import type { RecipeContent, RecipeMeta } from "@/lib/recipes/record";
import type { ChunkFilter } from "@/lib/rag/lexical";

export interface DeviceModelInput {
  id?: string;
  slug: string;
  brandId: string;
  categoryId: string;
  name: string;
  modelNumber: string;
  region: string;
  description: I18nText;
  imageUrl: string | null;
  specs: DeviceSpec[];
  missingInfo: I18nText[];
  capabilities: Omit<DeviceCapability, "id">[];
  sources: Omit<DeviceSource, "id">[];
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  published: boolean;
}

export type RecipeMetaInput = Pick<
  RecipeMeta,
  | "slug"
  | "coverImage"
  | "illustration"
  | "category"
  | "cuisine"
  | "dietary"
  | "servings"
  | "prepMinutes"
  | "cookMinutes"
  | "difficulty"
  | "deviceCategory"
  | "programs"
  | "provenance"
  | "status"
  | "authorName"
> & { compatibility: RecipeMeta["compatibility"] };

export interface RecipeInput {
  id?: string;
  meta: RecipeMetaInput;
  translations: Partial<Record<Locale, RecipeContent>>;
}

export interface KnowledgeDocumentInput {
  title: string;
  source: string;
  sourceUrl: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  language: Locale;
  docType: KnowledgeDocument["docType"];
  publishedAt: string | null;
  verificationStatus: VerificationStatus;
  rightsNote: string;
  contentHash: string;
  chunks: { content: string; embedding: number[] | null }[];
}

export interface KnowledgeSearch {
  query: string;
  embedding: number[] | null;
  filter: ChunkFilter;
  limit: number;
}

export interface UserDataExport {
  exportedAt: string;
  profile: Profile | null;
  preferences: UserPreferences;
  devices: { model: string; nickname: string | null; addedAt: string }[];
  favorites: string[];
  recipes: RecipeSummary[];
  conversations: { conversation: Conversation; messages: ChatMessage[] }[];
  cookingSessions: CookingSession[];
  subscription: Subscription | null;
}

/**
 * Persistence boundary. Two implementations exist:
 *  - DemoStore     (in-memory, clearly labelled demo data, used when Supabase is not configured)
 *  - SupabaseStore (PostgreSQL + RLS)
 * They are never combined: a deployment uses exactly one.
 *
 * Authorisation is enforced by callers (lib/auth) AND by RLS in the Supabase implementation.
 */
export interface DataStore {
  readonly mode: "demo" | "supabase";

  // Catalogue
  listBrands(): Promise<Brand[]>;
  listCategories(): Promise<DeviceCategory[]>;
  listDeviceModels(opts?: { query?: string; brandSlug?: string; categorySlug?: string; includeUnpublished?: boolean }): Promise<DeviceModel[]>;
  getDeviceModel(idOrSlug: string): Promise<DeviceModel | null>;
  upsertDeviceModel(input: DeviceModelInput): Promise<DeviceModel>;
  deleteDeviceModel(id: string): Promise<void>;

  // Profile & preferences
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: Partial<Pick<Profile, "displayName" | "locale" | "onboarded">>): Promise<void>;
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, prefs: UserPreferences): Promise<void>;

  // User appliances
  listUserDevices(userId: string): Promise<UserDevice[]>;
  getUserDevice(userId: string, id: string): Promise<UserDevice | null>;
  addUserDevice(userId: string, modelId: string, nickname: string | null): Promise<UserDevice>;
  updateUserDevice(userId: string, id: string, patch: { nickname?: string | null; isFavorite?: boolean }): Promise<void>;
  removeUserDevice(userId: string, id: string): Promise<void>;

  // Recipes
  listRecipes(locale: Locale, filter?: RecipeFilter): Promise<RecipeSummary[]>;
  getRecipeBySlug(slug: string, locale: Locale): Promise<Recipe | null>;
  /** Returns published recipes, plus private recipes owned by `userId`. */
  getRecipeById(id: string, locale: Locale, userId?: string | null): Promise<Recipe | null>;
  listUserRecipes(userId: string, locale: Locale): Promise<RecipeSummary[]>;
  saveUserRecipe(userId: string, locale: Locale, meta: RecipeMetaInput, content: RecipeContent): Promise<Recipe>;
  deleteUserRecipe(userId: string, id: string): Promise<void>;
  listAllRecipes(locale: Locale): Promise<RecipeSummary[]>;
  getRecipeInput(id: string): Promise<RecipeInput | null>;
  upsertRecipe(input: RecipeInput): Promise<string>;
  setRecipeStatus(id: string, status: RecipeStatus): Promise<void>;

  // Favourites
  listFavoriteIds(userId: string): Promise<string[]>;
  listFavorites(userId: string, locale: Locale): Promise<RecipeSummary[]>;
  addFavorite(userId: string, recipeId: string): Promise<void>;
  removeFavorite(userId: string, recipeId: string): Promise<void>;

  // Feedback & cooking history
  addRecipeFeedback(userId: string, input: { recipeId: string; rating: number | null; comment: string | null; deviceModelId: string | null }): Promise<void>;
  listRecipeFeedback(limit: number): Promise<RecipeFeedback[]>;
  logCookingSession(userId: string, input: { recipeId: string; deviceModelId: string | null; servings: number }): Promise<void>;
  listCookingSessions(userId: string, sinceIso: string | null): Promise<CookingSession[]>;

  // Conversations
  listConversations(userId: string, sinceIso: string | null): Promise<Conversation[]>;
  getConversation(userId: string, id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] } | null>;
  createConversation(userId: string, title: string): Promise<Conversation>;
  addMessage(userId: string, conversationId: string, message: { role: "user" | "assistant"; content: string; payload: unknown | null }): Promise<ChatMessage>;
  deleteConversation(userId: string, id: string): Promise<void>;

  // Knowledge base
  listKnowledgeDocuments(): Promise<KnowledgeDocument[]>;
  ingestKnowledgeDocument(input: KnowledgeDocumentInput): Promise<KnowledgeDocument>;
  deleteKnowledgeDocument(id: string): Promise<void>;
  searchKnowledge(search: KnowledgeSearch): Promise<RetrievedChunk[]>;
  listKnowledgeChunks?(): Promise<KnowledgeChunk[]>;

  // Billing & usage
  getSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(subscription: Subscription): Promise<void>;
  findUserIdByStripeCustomer(customerId: string): Promise<string | null>;
  recordUsage(event: UsageEvent): Promise<void>;
  countUsage(userId: string, kind: UsageKind, sinceIso: string): Promise<number>;

  // Support
  createSupportRequest(input: { userId: string | null; email: string | null; kind: SupportRequestKind; subject: string; message: string }): Promise<void>;
  listSupportRequests(): Promise<SupportRequest[]>;
  updateSupportRequestStatus(id: string, status: SupportRequestStatus): Promise<void>;

  // Admin
  getAdminStats(): Promise<AdminStats>;
  listUsers(): Promise<AdminUserRow[]>;
  setUserRole(userId: string, role: UserRole): Promise<void>;

  // Privacy
  exportUserData(userId: string, locale: Locale): Promise<UserDataExport>;
  /** Deletes all personal data. In Supabase mode the auth user is removed separately with the service role. */
  deleteUserData(userId: string): Promise<void>;
}
