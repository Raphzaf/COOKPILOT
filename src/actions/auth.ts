"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAppUrl, isSupabaseConfigured, publicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./helpers";

const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(200) });
const localeSchema = z.enum(["en", "fr"]);

async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
}

async function origin(): Promise<string> {
  if (publicEnv.appUrl) return publicEnv.appUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : getAppUrl();
}

async function guard(scope: string): Promise<ActionResult | null> {
  if (!isSupabaseConfigured()) return { ok: false, error: "NOT_CONFIGURED" };
  if (!rateLimit(`auth:${scope}:${await clientKey()}`, 8, 60_000).allowed) return { ok: false, error: "RATE_LIMITED" };
  return null;
}

export async function signInAction(input: { email: string; password: string }): Promise<ActionResult> {
  const blocked = await guard("signin");
  if (blocked) return blocked;
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_CREDENTIALS" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  return error ? { ok: false, error: "INVALID_CREDENTIALS" } : { ok: true, data: null };
}

export async function signUpAction(input: { email: string; password: string; locale: string }): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const blocked = await guard("signup");
  if (blocked) return blocked as ActionResult<{ needsConfirmation: boolean }>;
  const parsed = credentials.safeParse(input);
  const locale = localeSchema.safeParse(input.locale);
  if (!parsed.success || !locale.success) return { ok: false, error: parsed.success ? "INVALID_INPUT" : "WEAK_PASSWORD" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/${locale.data}/onboarding`,
      data: { locale: locale.data },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "WEAK_PASSWORD" };
    if (error.code === "user_already_exists" || error.code === "email_exists") return { ok: false, error: "EMAIL_IN_USE" };
    console.error("[auth] sign-up failed:", error.code ?? error.status);
    return { ok: false, error: "UNKNOWN" };
  }
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function googleSignInAction(localeInput: string): Promise<ActionResult<{ url: string }>> {
  const blocked = await guard("oauth");
  if (blocked) return blocked as ActionResult<{ url: string }>;
  const locale = localeSchema.catch("en").parse(localeInput);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=/${locale}/dashboard` },
  });
  if (error || !data.url) return { ok: false, error: "NOT_CONFIGURED" };
  return { ok: true, data: { url: data.url } };
}

export async function requestPasswordResetAction(input: { email: string; locale: string }): Promise<ActionResult> {
  const blocked = await guard("reset");
  if (blocked) return blocked;
  const email = z.string().trim().toLowerCase().email().safeParse(input.email);
  const locale = localeSchema.catch("en").parse(input.locale);
  if (email.success) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await origin()}/auth/callback?next=/${locale}/reset-password` });
  }
  // Always succeed: never reveal whether an address has an account.
  return { ok: true, data: null };
}

export async function updatePasswordAction(password: string): Promise<ActionResult> {
  const blocked = await guard("password");
  if (blocked) return blocked;
  const parsed = z.string().min(8).max(200).safeParse(password);
  if (!parsed.success) return { ok: false, error: "WEAK_PASSWORD" };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "UNAUTHENTICATED" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  return error ? { ok: false, error: error.code === "weak_password" ? "WEAK_PASSWORD" : "UNKNOWN" } : { ok: true, data: null };
}

export async function signOutAction(): Promise<ActionResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return { ok: true, data: null };
}
