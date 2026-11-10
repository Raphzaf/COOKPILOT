/**
 * Row types for the CookPilot schema (database/migrations).
 *
 * Hand-maintained to match the SQL migrations. After connecting your Supabase project you can
 * replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
 */
import type { I18nText } from "@/lib/domain/types";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  locale: "en" | "fr";
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  measurement_system: "metric" | "imperial";
  temperature_unit: "C" | "F";
  cuisines: string[];
  allergies: string[];
  diets: string[];
  dislikes: string[];
  experience: "beginner" | "intermediate" | "advanced" | null;
  servings: number;
}

export interface BrandRow {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
}

export interface DeviceCategoryRow {
  id: string;
  slug: string;
  name: I18nText;
  description: I18nText;
}

export interface DeviceCapabilityRow {
  id: string;
  device_model_id: string;
  kind: "program" | "accessory" | "feature";
  key: string;
  name: I18nText;
  temp_min: number | null;
  temp_max: number | null;
  temp_unit: "C" | "F" | null;
  levels: string[];
  notes: I18nText | null;
  position: number;
}

export interface DeviceSourceRow {
  id: string;
  device_model_id: string;
  title: string;
  url: string;
  kind: "manufacturer" | "manual" | "retailer" | "other";
  accessed_at: string;
}

export interface DeviceModelRow {
  id: string;
  slug: string;
  brand_id: string;
  category_id: string;
  name: string;
  model_number: string;
  region: string;
  description: I18nText;
  image_url: string | null;
  specs: { key: string; label: I18nText; value: string }[];
  missing_info: I18nText[];
  verification_status: "verified" | "documented" | "partial" | "incomplete";
  last_verified_at: string | null;
  published: boolean;
}

export interface DeviceModelJoinedRow extends DeviceModelRow {
  brand: BrandRow;
  category: DeviceCategoryRow;
  capabilities: DeviceCapabilityRow[];
  sources: DeviceSourceRow[];
}

export interface UserDeviceRow {
  id: string;
  user_id: string;
  device_model_id: string;
  nickname: string | null;
  is_favorite: boolean;
  added_at: string;
}

export interface RecipeRow {
  id: string;
  slug: string;
  owner_id: string | null;
  status: "draft" | "published" | "private" | "archived";
  cover_image: string | null;
  illustration: string | null;
  category: string;
  cuisine: string | null;
  dietary: string[];
  difficulty: "easy" | "medium" | "advanced";
  device_category: string;
  programs: string[];
  provenance: "verified" | "adapted" | "generated";
  author_name: string;
  is_demo: boolean;
  current_version_id: string | null;
  rating_average: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeVersionRow {
  id: string;
  recipe_id: string;
  version: number;
  servings: number;
  prep_minutes: number;
  cook_minutes: number;
}

export interface RecipeTranslationRow {
  recipe_id: string;
  locale: "en" | "fr";
  title: string;
  description: string;
  accessories: string[];
  safety_notes: string[];
  source_note: string | null;
}

export interface RecipeIngredientRow {
  version_id: string;
  locale: "en" | "fr";
  position: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  optional: boolean;
}

export interface RecipeStepRow {
  version_id: string;
  locale: "en" | "fr";
  position: number;
  instruction: string;
  program: string | null;
  level: string | null;
  temperature_c: number | null;
  duration_seconds: number | null;
  tip: string | null;
}

export interface RecipeCompatibilityRow {
  recipe_id: string;
  device_model_id: string;
  tested: boolean;
  notes: string | null;
}

export interface RecipeFeedbackRow {
  id: string;
  recipe_id: string;
  user_id: string;
  rating: number | null;
  comment: string | null;
  device_model_id: string | null;
  created_at: string;
}

export interface CookingSessionRow {
  id: string;
  user_id: string;
  recipe_id: string | null;
  recipe_title: string;
  device_model_id: string | null;
  servings: number;
  completed_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  payload: unknown | null;
  created_at: string;
}

export interface KnowledgeDocumentRow {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  manufacturer: string | null;
  model_number: string | null;
  language: "en" | "fr";
  doc_type: "manual" | "specification" | "capability" | "recipe" | "food_safety" | "guide";
  published_at: string | null;
  verification_status: "verified" | "documented" | "partial" | "incomplete";
  rights_note: string;
  content_hash: string;
  updated_at: string;
}

export interface MatchedChunkRow {
  id: string;
  document_id: string;
  chunk_position: number;
  content: string;
  manufacturer: string | null;
  model_number: string | null;
  language: "en" | "fr";
  doc_type: KnowledgeDocumentRow["doc_type"];
  verification_status: KnowledgeDocumentRow["verification_status"];
  document_title: string;
  source_url: string | null;
  score: number;
}

export interface SubscriptionRow {
  user_id: string;
  plan: "free" | "pro";
  billing_interval: "month" | "year" | null;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "none";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface UsageEventRow {
  user_id: string;
  kind: "chef_message" | "recipe_generation" | "embedding";
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

export interface SupportRequestRow {
  id: string;
  user_id: string | null;
  email: string | null;
  kind: "missing_device" | "feedback" | "support";
  subject: string;
  message: string;
  status: "open" | "in_review" | "resolved";
  created_at: string;
}

/** Table name → row type map, mirroring the public schema. */
export interface Tables {
  profiles: ProfileRow;
  user_preferences: UserPreferencesRow;
  brands: BrandRow;
  device_categories: DeviceCategoryRow;
  device_models: DeviceModelRow;
  device_capabilities: DeviceCapabilityRow;
  device_sources: DeviceSourceRow;
  user_devices: UserDeviceRow;
  recipes: RecipeRow;
  recipe_versions: RecipeVersionRow;
  recipe_translations: RecipeTranslationRow;
  recipe_ingredients: RecipeIngredientRow;
  recipe_steps: RecipeStepRow;
  recipe_compatibility: RecipeCompatibilityRow;
  recipe_feedback: RecipeFeedbackRow;
  favorites: { user_id: string; recipe_id: string; created_at: string };
  cooking_sessions: CookingSessionRow;
  conversations: ConversationRow;
  messages: MessageRow;
  knowledge_documents: KnowledgeDocumentRow;
  knowledge_chunks: { id: string; document_id: string; position: number; content: string };
  subscriptions: SubscriptionRow;
  stripe_events: { id: string; type: string; received_at: string };
  usage_events: UsageEventRow;
  support_requests: SupportRequestRow;
}
