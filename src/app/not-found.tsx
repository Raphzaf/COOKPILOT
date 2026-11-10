import { redirect } from "next/navigation";
import { routing } from "@/lib/i18n/routing";

/** Requests outside any locale are sent to the localised 404 page. */
export default function GlobalNotFound() {
  redirect(`/${routing.defaultLocale}/not-found`);
}
