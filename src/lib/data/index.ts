import "server-only";
import { cache } from "react";
import { isDemoMode } from "@/lib/env";
import { createSupabasePublicClient, createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { demoStore } from "./demo-store";
import type { DataStore } from "./store";
import { createSupabaseStore } from "./supabase-store";

/** Request-scoped store bound to the signed-in user (RLS applies in Supabase mode). */
export const getStore = cache(async (): Promise<DataStore> => {
  if (isDemoMode()) return demoStore;
  return createSupabaseStore(await createSupabaseServerClient(), createSupabaseServiceClient());
});

/** Cookieless store for public catalogue reads (landing page, public recipes, sitemap). */
export function getPublicStore(): DataStore {
  if (isDemoMode()) return demoStore;
  return createSupabaseStore(createSupabasePublicClient());
}

/** Service-role store for trusted server jobs (Stripe webhook). Null when the key is missing. */
export function getServiceStore(): DataStore | null {
  if (isDemoMode()) return demoStore;
  const service = createSupabaseServiceClient();
  return service ? createSupabaseStore(service, service) : null;
}

export type { DataStore } from "./store";
