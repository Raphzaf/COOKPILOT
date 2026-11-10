/**
 * Central, typed access to environment configuration.
 *
 * Nothing here throws when a variable is missing: every integration degrades to an
 * explicit "not configured" state so the app keeps working (demo mode) until the
 * owner supplies credentials. Secrets are only ever read on the server.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/** Values that are safe to expose to the browser (inlined at build time). */
export const publicEnv = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL?.trim() || "").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "",
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "",
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Demo mode = no Supabase project connected. Demo data is never mixed with real data. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function getAppUrl(): string {
  if (publicEnv.appUrl) return publicEnv.appUrl;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Server-only secrets. Importing this from a client component would yield undefined values. */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get geminiApiKey() {
    return read("GEMINI_API_KEY");
  },
  get geminiModel() {
    return read("GEMINI_MODEL") ?? "gemini-2.5-flash";
  },
  get geminiEmbeddingModel() {
    return read("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-001";
  },
  get stripeSecretKey() {
    return read("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return read("STRIPE_WEBHOOK_SECRET");
  },
  get stripePriceMonthly() {
    return read("STRIPE_PRICE_PRO_MONTHLY");
  },
  get stripePriceAnnual() {
    return read("STRIPE_PRICE_PRO_ANNUAL");
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get emailFrom() {
    return read("EMAIL_FROM") ?? "CookPilot <onboarding@resend.dev>";
  },
  get posthogKey() {
    return read("POSTHOG_KEY") ?? read("NEXT_PUBLIC_POSTHOG_KEY");
  },
  get sentryDsn() {
    return read("SENTRY_DSN") ?? read("NEXT_PUBLIC_SENTRY_DSN");
  },
};

export interface IntegrationStatus {
  supabase: boolean;
  supabaseServiceRole: boolean;
  gemini: boolean;
  stripe: boolean;
  stripePrices: boolean;
  stripeWebhook: boolean;
  resend: boolean;
  posthog: boolean;
  sentry: boolean;
}

/** Server-side snapshot of which integrations are configured. Contains booleans only — never values. */
export function getIntegrationStatus(): IntegrationStatus {
  return {
    supabase: isSupabaseConfigured(),
    supabaseServiceRole: Boolean(serverEnv.supabaseServiceRoleKey),
    gemini: Boolean(serverEnv.geminiApiKey),
    stripe: Boolean(serverEnv.stripeSecretKey),
    stripePrices: Boolean(serverEnv.stripePriceMonthly && serverEnv.stripePriceAnnual),
    stripeWebhook: Boolean(serverEnv.stripeWebhookSecret),
    resend: Boolean(serverEnv.resendApiKey),
    posthog: Boolean(serverEnv.posthogKey),
    sentry: Boolean(serverEnv.sentryDsn),
  };
}
