import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="container-page flex min-h-[80dvh] flex-col items-center justify-center py-16 text-center">
      <Link href="/" className="mb-10"><Logo /></Link>
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground"><Compass className="size-6" /></span>
      <h1 className="text-5xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-muted">{t("notFoundBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href="/">{t("backHome")}</Link></Button>
        <Button asChild variant="secondary"><Link href="/recipes">{t("browseRecipes")}</Link></Button>
      </div>
    </main>
  );
}
