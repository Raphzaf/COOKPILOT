import { getTranslations } from "next-intl/server";
import { ChefChat } from "@/components/chef/chef-chat";
import type { DeviceLabels } from "@/components/chef/chef-recipe-card";
import { PageHeader } from "@/components/ui/states";
import { getEntitlements, getQuota, historyCutoff } from "@/lib/billing/entitlements";
import { getIntegrationStatus } from "@/lib/env";
import { appPage } from "@/lib/page-context";

export default async function ChefPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string; q?: string; recipe?: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("chef");
  const sp = await searchParams;
  const { plan, limits } = await getEntitlements(store, user.id);
  const [conversations, active, quota, devices, prefs, focus] = await Promise.all([
    store.listConversations(user.id, historyCutoff(limits)),
    sp.c ? store.getConversation(user.id, sp.c) : Promise.resolve(null),
    getQuota(store, user.id, plan),
    store.listUserDevices(user.id),
    store.getPreferences(user.id),
    sp.recipe ? store.getRecipeById(sp.recipe, locale, user.id) : Promise.resolve(null),
  ]);
  const labels: DeviceLabels = {};
  for (const d of devices) {
    labels[d.model.id] = {
      label: `${d.model.brand.name} ${d.model.modelNumber}`,
      programs: Object.fromEntries(d.model.capabilities.filter((c) => c.kind === "program").map((c) => [c.key, c.name[locale]])),
    };
  }
  const categories = new Set(devices.map((d) => d.model.category.slug));
  const suggestions = [
    ...(categories.has("indoor-grill") ? [t("suggestions.steak")] : []),
    ...(categories.has("air-fryer") ? [t("suggestions.airFryer")] : []),
    ...(categories.has("frozen-dessert-maker") ? [t("suggestions.iceCream")] : []),
    t("suggestions.ingredients"),
    t("suggestions.quick"),
    ...(categories.size === 0 ? [t("suggestions.whatCan")] : []),
  ].slice(0, 4);

  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <ChefChat
        key={active?.conversation.id ?? "new"}
        conversations={conversations}
        activeId={active?.conversation.id ?? null}
        initialMessages={active?.messages ?? []}
        initialQuota={quota}
        suggestions={suggestions}
        focusRecipe={focus ? { id: focus.id, title: focus.title } : null}
        initialQuestion={sp.q ? sp.q.slice(0, 500) : null}
        hasDevices={devices.length > 0}
        devices={labels}
        system={prefs.measurementSystem}
        unit={prefs.temperatureUnit}
        aiConfigured={getIntegrationStatus().gemini}
      />
    </>
  );
}
