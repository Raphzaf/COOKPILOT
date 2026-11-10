import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export const DEMO_SESSION_COOKIE = "cp_demo_sid";

/**
 * Runs on every page request:
 *  1. locale negotiation / redirects (next-intl)
 *  2. Supabase session refresh, when Supabase is configured
 *  3. otherwise, assigns an anonymous demo-session id so demo data is per visitor
 *
 * Authorisation is NOT done here — pages, actions and route handlers check the session
 * server-side (see src/lib/auth/session.ts) and the database enforces RLS.
 */
export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    });
    // Revalidates the JWT and refreshes it when needed.
    await supabase.auth.getUser();
  } else if (!request.cookies.get(DEMO_SESSION_COOKIE)) {
    response.cookies.set(DEMO_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|monitoring|.*\\..*).*)"],
};
