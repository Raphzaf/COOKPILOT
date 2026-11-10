import type { MetadataRoute } from "next";
import { getPublicStore } from "@/lib/data";
import { routing } from "@/lib/i18n/routing";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await getPublicStore().listRecipes("en").catch(() => []);
  const paths: { path: string; priority: number; lastModified?: string }[] = [
    { path: "", priority: 1 },
    { path: "/recipes", priority: 0.9 },
    { path: "/pricing", priority: 0.7 },
    { path: "/about", priority: 0.5 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
    ...recipes.map((r) => ({ path: `/recipes/${r.slug}`, priority: 0.8, lastModified: r.updatedAt })),
  ];
  return paths.flatMap(({ path, priority, lastModified }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${path}`),
      lastModified: lastModified ? new Date(lastModified) : undefined,
      priority,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])) },
    })),
  );
}
