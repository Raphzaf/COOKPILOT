/** Domain model shared by the demo store, the Supabase store, the AI layer and the UI. */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export type I18nText = Record<Locale, string>;

export type VerificationStatus = "verified" | "documented" | "partial" | "incomplete";
/** How a recipe came to exist. Shown on every recipe and every AI answer. */
export type Provenance = "verified" | "adapted" | "generated";
export type TemperatureUnit = "C" | "F";
export type MeasurementSystem = "metric" | "imperial";
export type Difficulty = "easy" | "medium" | "advanced";
export type UserRole = "user" | "admin";
export type PlanId = "free" | "pro";
export type BillingInterval = "month" | "year";

// ───────────── Appliance catalogue ─────────────

export interface Brand {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
}

export interface DeviceCategory {
  id: string;
  slug: string;
  name: I18nText;
  description: I18nText;
}

export type CapabilityKind = "program" | "accessory" | "feature";

export interface DeviceCapability {
  id: string;
  kind: CapabilityKind;
  /** Stable machine key, e.g. "air-fry". Used by recipes and AI validation. */
  key: string;
  name: I18nText;
  /** Temperature range exactly as documented, in the unit the source uses. Null = not documented. */
  tempMin: number | null;
  tempMax: number | null;
  tempUnit: TemperatureUnit | null;
  /** Named levels (e.g. LOW/MED/HIGH/MAX) when the appliance uses levels rather than degrees. */
  levels: string[];
  notes: I18nText | null;
}

export interface DeviceSource {
  id: string;
  title: string;
  url: string;
  kind: "manufacturer" | "manual" | "retailer" | "other";
  accessedAt: string;
}

export interface DeviceSpec {
  key: string;
  label: I18nText;
  value: string;
}

export interface DeviceModel {
  id: string;
  slug: string;
  brand: Brand;
  category: DeviceCategory;
  name: string;
  modelNumber: string;
  region: string;
  description: I18nText;
  imageUrl: string | null;
  specs: DeviceSpec[];
  /** Explicit list of what we do NOT know yet. Never filled with guesses. */
  missingInfo: I18nText[];
  capabilities: DeviceCapability[];
  sources: DeviceSource[];
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  published: boolean;
}

export interface UserDevice {
  id: string;
  userId: string;
  modelId: string;
  nickname: string | null;
  isFavorite: boolean;
  addedAt: string;
  model: DeviceModel;
}

// ───────────── Users ─────────────

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  locale: Locale;
  onboarded: boolean;
  createdAt: string;
}

export type CookingExperience = "beginner" | "intermediate" | "advanced";

export interface UserPreferences {
  measurementSystem: MeasurementSystem;
  temperatureUnit: TemperatureUnit;
  cuisines: string[];
  allergies: string[];
  diets: string[];
  dislikes: string[];
  experience: CookingExperience | null;
  servings: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  measurementSystem: "metric",
  temperatureUnit: "C",
  cuisines: [],
  allergies: [],
  diets: [],
  dislikes: [],
  experience: null,
  servings: 2,
};

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
  isDemo: boolean;
}

// ───────────── Recipes ─────────────

export type RecipeStatus = "draft" | "published" | "private" | "archived";

export interface RecipeIngredient {
  name: string;
  /** Canonical metric quantity. Null for "to taste" items. */
  quantity: number | null;
  /** g, kg, ml, l, tsp, tbsp, piece, pinch, or null */
  unit: string | null;
  note: string | null;
  optional: boolean;
}

export interface RecipeStep {
  position: number;
  instruction: string;
  /** Capability key of the program used in this step, when a program is used. */
  program: string | null;
  /** Free-form level (LOW/MED/HIGH/MAX) for appliances that use levels. */
  level: string | null;
  temperatureC: number | null;
  durationSeconds: number | null;
  tip: string | null;
}

export interface RecipeCompatibility {
  deviceModelId: string;
  /** True only when the recipe was physically tested on this exact model. */
  tested: boolean;
  notes: string | null;
}

export interface Recipe {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  coverImage: string | null;
  /** Key of a built-in illustration used when no photo is available. */
  illustration: string | null;
  category: string;
  cuisine: string | null;
  dietary: string[];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  /** Device category slug the recipe requires (e.g. "air-fryer"). */
  deviceCategory: string;
  programs: string[];
  accessories: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  safetyNotes: string[];
  compatibility: RecipeCompatibility[];
  provenance: Provenance;
  sourceNote: string | null;
  authorName: string;
  ownerId: string | null;
  status: RecipeStatus;
  isDemo: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type RecipeSummary = Omit<Recipe, "ingredients" | "steps" | "safetyNotes"> & {
  ingredientNames: string[];
};

export interface RecipeFilter {
  query?: string;
  deviceCategory?: string;
  deviceModelId?: string;
  category?: string;
  difficulty?: Difficulty;
  maxTotalMinutes?: number;
  diet?: string;
  ingredients?: string[];
}

export interface RecipeFeedback {
  id: string;
  recipeId: string;
  recipeTitle: string;
  userId: string;
  rating: number | null;
  comment: string | null;
  deviceModelId: string | null;
  createdAt: string;
}

export interface CookingSession {
  id: string;
  userId: string;
  recipeId: string;
  recipeTitle: string;
  deviceModelId: string | null;
  servings: number;
  completedAt: string;
}

// ───────────── AI / chat ─────────────

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  /** Validated structured payload for assistant messages (recipe card, provenance, warnings…). */
  payload: unknown | null;
  createdAt: string;
}

export type KnowledgeDocType = "manual" | "specification" | "capability" | "recipe" | "food_safety" | "guide";

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  language: Locale;
  docType: KnowledgeDocType;
  publishedAt: string | null;
  verificationStatus: VerificationStatus;
  rightsNote: string;
  contentHash: string;
  chunkCount: number;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  position: number;
  content: string;
  /** Denormalised metadata for filtering. */
  manufacturer: string | null;
  modelNumber: string | null;
  language: Locale;
  docType: KnowledgeDocType;
  verificationStatus: VerificationStatus;
  documentTitle: string;
  sourceUrl: string | null;
}

export interface RetrievedChunk extends KnowledgeChunk {
  score: number;
}

// ───────────── Billing / usage ─────────────

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "none";

export interface Subscription {
  userId: string;
  plan: PlanId;
  interval: BillingInterval | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export type UsageKind = "chef_message" | "recipe_generation" | "embedding";

export interface UsageEvent {
  userId: string;
  kind: UsageKind;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt: string;
}

export type SupportRequestKind = "missing_device" | "feedback" | "support";
export type SupportRequestStatus = "open" | "in_review" | "resolved";

export interface SupportRequest {
  id: string;
  userId: string | null;
  email: string | null;
  kind: SupportRequestKind;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
}

export interface AdminStats {
  users: number;
  proSubscribers: number;
  devices: number;
  devicesNeedingReview: number;
  recipesPublished: number;
  recipesDraft: number;
  knowledgeDocuments: number;
  openRequests: number;
  aiRequests30d: number;
  aiCost30dUsd: number;
  usageByDay: { day: string; requests: number; costUsd: number }[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  plan: PlanId;
  createdAt: string;
  deviceCount: number;
}
