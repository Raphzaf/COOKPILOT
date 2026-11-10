import "server-only";
import { setRequestLocale } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { asLocale } from "@/lib/i18n/locale";

/** Common preamble for authenticated application pages. */
export async function appPage(params: Promise<{ locale: string }>) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const user = await requireOnboardedUser(locale);
  const store = await getStore();
  return { locale, user, store };
}
