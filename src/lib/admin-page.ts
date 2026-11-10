import "server-only";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { asLocale } from "@/lib/i18n/locale";

/** Preamble for every admin page: the admin role is re-checked on the server for each request. */
export async function adminPage(params: Promise<{ locale: string }>) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const user = await requireAdmin(locale);
  const store = await getStore();
  return { locale, user, store };
}
