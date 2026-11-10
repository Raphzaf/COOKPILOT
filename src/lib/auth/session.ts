import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getStore } from "@/lib/data";
import { hydrateDemoUser, snapshotDemoUser, type DemoSnapshot } from "@/lib/data/demo-store";
import type { Locale, SessionUser } from "@/lib/domain/types";
import { isDemoAdminEnabled, isDemoMode } from "@/lib/env";
import { redirect } from "@/lib/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_SESSION_COOKIE = "cp_demo_sid";
export const DEMO_STATE_COOKIE = "cp_demo_state";

function parseSnapshot(raw: string | undefined): DemoSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoSnapshot;
    return parsed && typeof parsed === "object" && Array.isArray(parsed.d) && Array.isArray(parsed.f) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the current user on the server.
 *  - Supabase mode: validates the session with Supabase Auth (never trusts client state).
 *  - Demo mode: every visitor gets an isolated, clearly-labelled demo account.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await getStore();

  if (isDemoMode()) {
    const cookieStore = await cookies();
    const sid = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
    // First request before the proxy cookie exists: use a throw-away id.
    const userId = `demo-${sid && /^[0-9a-f-]{36}$/i.test(sid) ? sid : crypto.randomUUID()}`;
    hydrateDemoUser(userId, parseSnapshot(cookieStore.get(DEMO_STATE_COOKIE)?.value));
    const stored = await store.getProfile(userId);
    if (!stored) return null;
    // The admin persona only exists where it has been explicitly enabled.
    const profile = stored.role === "admin" && !isDemoAdminEnabled() ? { ...stored, role: "user" as const } : stored;
    return { id: userId, email: profile.email, profile, isDemo: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const profile = (await store.getProfile(data.user.id)) ?? {
    id: data.user.id,
    email: data.user.email ?? "",
    displayName: null,
    role: "user" as const,
    locale: "en" as const,
    onboarded: false,
    createdAt: data.user.created_at,
  };
  return { id: data.user.id, email: data.user.email ?? profile.email, profile, isDemo: false };
});

/** Demo mode only: mirrors the visitor's small state into a cookie so it survives server recycling. */
export async function persistDemoState(userId: string): Promise<void> {
  if (!isDemoMode()) return;
  try {
    const cookieStore = await cookies();
    cookieStore.set(DEMO_STATE_COOKIE, JSON.stringify(snapshotDemoUser(userId)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Not in an action/route handler context — nothing to persist.
  }
}

/** Page guard: redirects anonymous visitors to the login page. */
export async function requireUser(locale: Locale): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale });
  return user;
}

/** Page guard for the application area: signed in AND onboarded. */
export async function requireOnboardedUser(locale: Locale): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (!user.profile.onboarded) return redirect({ href: "/onboarding", locale });
  return user;
}

/** Page guard for /admin: the role is read from the database on the server. Non-admins get a 404. */
export async function requireAdmin(locale: Locale): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.profile.role !== "admin") notFound();
  return user;
}

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
    this.name = "AuthError";
  }
}

/** Guard for server actions and route handlers. Throws instead of redirecting. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401);
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (user.profile.role !== "admin") throw new AuthError(403);
  return user;
}
