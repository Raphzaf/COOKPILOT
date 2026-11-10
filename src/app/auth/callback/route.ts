import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { routing } from "@/lib/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Only same-site relative paths are accepted as a post-login destination (prevents open redirects). */
function safeNext(value: string | null): string {
  if (value && /^\/(?!\/)[\w\-/]*$/.test(value)) return value;
  return `/${routing.defaultLocale}/dashboard`;
}

/**
 * Supabase Auth callback: OAuth (PKCE `code`) and email links (`token_hash` + `type`)
 * both land here, get exchanged for a session cookie, then redirect into the app.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const locale = next.split("/")[1] || routing.defaultLocale;
  const failure = new URL(`/${locale}/login?error=auth`, url.origin);

  if (!isSupabaseConfigured()) return NextResponse.redirect(failure);

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(failure);
}
