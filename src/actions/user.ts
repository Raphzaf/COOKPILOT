"use server";

import { z } from "zod";
import { track } from "@/lib/analytics/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { canAddDevice, canAddFavorite } from "@/lib/billing/plans";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email/resend";
import { parseTags } from "@/lib/utils";
import { ActionError, userAction, type ActionResult } from "./helpers";

const preferencesSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  locale: z.enum(["en", "fr"]),
  measurementSystem: z.enum(["metric", "imperial"]),
  temperatureUnit: z.enum(["C", "F"]),
  cuisines: z.string().max(400).default(""),
  allergies: z.string().max(400).default(""),
  diets: z.array(z.string().max(30)).max(10).default([]),
  dislikes: z.string().max(400).default(""),
  experience: z.enum(["beginner", "intermediate", "advanced"]).nullable().default(null),
  servings: z.number().int().min(1).max(12),
});

export type PreferencesInput = z.input<typeof preferencesSchema>;

async function savePreferences(input: PreferencesInput, completeOnboarding: boolean): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const data = preferencesSchema.parse(input);
    await store.updatePreferences(user.id, {
      measurementSystem: data.measurementSystem,
      temperatureUnit: data.temperatureUnit,
      cuisines: parseTags(data.cuisines),
      allergies: parseTags(data.allergies),
      diets: data.diets,
      dislikes: parseTags(data.dislikes),
      experience: data.experience,
      servings: data.servings,
    });
    const wasOnboarded = user.profile.onboarded;
    await store.updateProfile(user.id, {
      locale: data.locale,
      ...(data.displayName !== undefined ? { displayName: data.displayName || null } : {}),
      ...(completeOnboarding ? { onboarded: true } : {}),
    });
    if (completeOnboarding && !wasOnboarded) {
      track("onboarding_completed", user.id, { locale: data.locale });
      if (!user.isDemo) await sendEmail(user.email, EMAIL_TEMPLATES.welcome(data.locale, data.displayName || null), data.locale);
    }
    return null;
  });
}

export async function completeOnboardingAction(input: PreferencesInput): Promise<ActionResult> {
  return savePreferences(input, true);
}

export async function updateSettingsAction(input: PreferencesInput): Promise<ActionResult> {
  return savePreferences(input, false);
}

export async function addDeviceAction(modelId: string, nickname?: string): Promise<ActionResult<{ id: string }>> {
  return userAction(async ({ user, store }) => {
    const id = z.string().uuid().parse(modelId);
    const name = z.string().trim().max(60).optional().parse(nickname);
    const model = await store.getDeviceModel(id);
    if (!model || !model.published) throw new ActionError("NOT_FOUND");
    const [devices, { plan }] = await Promise.all([store.listUserDevices(user.id), getEntitlements(store, user.id)]);
    const existing = devices.find((d) => d.modelId === id);
    if (existing) return { id: existing.id };
    if (!canAddDevice(plan, devices.length)) throw new ActionError("DEVICE_LIMIT_REACHED");
    const device = await store.addUserDevice(user.id, id, name || null);
    track("device_added", user.id, { model: model.modelNumber });
    return { id: device.id };
  });
}

export async function updateDeviceAction(id: string, patch: { nickname?: string | null; isFavorite?: boolean }): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const data = z.object({ nickname: z.string().trim().max(60).nullable().optional(), isFavorite: z.boolean().optional() }).parse(patch);
    await store.updateUserDevice(user.id, z.string().uuid().parse(id), { ...data, nickname: data.nickname === "" ? null : data.nickname });
    return null;
  });
}

export async function removeDeviceAction(id: string): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    await store.removeUserDevice(user.id, z.string().uuid().parse(id));
    return null;
  });
}

const supportSchema = z.object({
  kind: z.enum(["missing_device", "feedback", "support"]),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(2).max(4000),
});

export async function submitSupportRequestAction(input: z.input<typeof supportSchema>): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const data = supportSchema.parse(input);
    await store.createSupportRequest({ userId: user.id, email: user.isDemo ? null : user.email, ...data });
    return null;
  });
}

export async function toggleFavoriteAction(recipeId: string, favorite: boolean): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const id = z.string().uuid().parse(recipeId);
    if (!favorite) {
      await store.removeFavorite(user.id, id);
      return null;
    }
    const recipe = await store.getRecipeById(id, user.profile.locale, user.id);
    if (!recipe) throw new ActionError("NOT_FOUND");
    const [ids, { plan }] = await Promise.all([store.listFavoriteIds(user.id), getEntitlements(store, user.id)]);
    if (ids.includes(id)) return null;
    if (!canAddFavorite(plan, ids.length)) throw new ActionError("FAVORITE_LIMIT_REACHED");
    await store.addFavorite(user.id, id);
    return null;
  });
}

const feedbackSchema = z.object({
  recipeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().trim().max(2000).nullable(),
  deviceModelId: z.string().uuid().nullable(),
});

export async function submitRecipeFeedbackAction(input: z.input<typeof feedbackSchema>): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const data = feedbackSchema.parse(input);
    if (data.rating == null && !data.comment) throw new ActionError("INVALID_INPUT");
    const recipe = await store.getRecipeById(data.recipeId, user.profile.locale, user.id);
    if (!recipe) throw new ActionError("NOT_FOUND");
    await store.addRecipeFeedback(user.id, { ...data, comment: data.comment || null });
    return null;
  });
}

const finishSchema = z.object({
  recipeId: z.string().uuid(),
  deviceModelId: z.string().uuid().nullable(),
  servings: z.number().int().min(1).max(24),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().trim().max(2000).nullable(),
});

export async function finishCookingAction(input: z.input<typeof finishSchema>): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    const data = finishSchema.parse(input);
    const recipe = await store.getRecipeById(data.recipeId, user.profile.locale, user.id);
    if (!recipe) throw new ActionError("NOT_FOUND");
    await store.logCookingSession(user.id, { recipeId: data.recipeId, deviceModelId: data.deviceModelId, servings: data.servings });
    if (data.rating != null || data.comment) {
      await store.addRecipeFeedback(user.id, { recipeId: data.recipeId, rating: data.rating, comment: data.comment || null, deviceModelId: data.deviceModelId });
    }
    track("recipe_cooked", user.id, { provenance: recipe.provenance });
    return null;
  });
}

export async function deleteUserRecipeAction(id: string): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    await store.deleteUserRecipe(user.id, z.string().uuid().parse(id));
    return null;
  });
}

export async function deleteConversationAction(id: string): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    await store.deleteConversation(user.id, z.string().uuid().parse(id));
    return null;
  });
}

/** Saves the recipe of an AI answer to the user's library. The recipe is read from the stored message, never from the client. */
export async function saveChefRecipeAction(conversationId: string, messageId: string): Promise<ActionResult<{ id: string }>> {
  return userAction(async ({ user, store }) => {
    const conversation = await store.getConversation(user.id, z.string().uuid().parse(conversationId));
    const message = conversation?.messages.find((m) => m.id === messageId && m.role === "assistant");
    if (!message?.payload) throw new ActionError("NOT_FOUND");
    const { chefRecipeToRecord, fallbackDeviceCategory } = await import("@/lib/ai/convert");
    const devices = await store.listUserDevices(user.id);
    const converted = chefRecipeToRecord(
      message.payload as import("@/lib/ai/schema").ChefPayload,
      devices,
      await fallbackDeviceCategory(store, devices),
      user.profile.displayName ?? "CookPilot AI",
    );
    if (!converted) throw new ActionError("NOT_FOUND");
    const recipe = await store.saveUserRecipe(user.id, user.profile.locale, converted.meta, converted.content);
    return { id: recipe.id };
  });
}

export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  return userAction(async ({ user, store }) => {
    if (confirmation.trim().toUpperCase() !== "DELETE" && confirmation.trim().toUpperCase() !== "SUPPRIMER") throw new ActionError("INVALID_INPUT");
    const subscription = await store.getSubscription(user.id);
    if (subscription?.stripeSubscriptionId && subscription.status !== "canceled") {
      const { getStripe } = await import("@/lib/billing/stripe");
      await getStripe()?.subscriptions.cancel(subscription.stripeSubscriptionId).catch(() => undefined);
    }
    await store.deleteUserData(user.id);
    if (user.isDemo) {
      const { cookies } = await import("next/headers");
      const { DEMO_STATE_COOKIE, DEMO_SESSION_COOKIE } = await import("@/lib/auth/session");
      const jar = await cookies();
      jar.delete(DEMO_STATE_COOKIE);
      jar.delete(DEMO_SESSION_COOKIE);
    } else {
      const { createSupabaseServerClient } = await import("@/lib/supabase/server");
      await (await createSupabaseServerClient()).auth.signOut().catch(() => undefined);
    }
    return null;
  });
}
