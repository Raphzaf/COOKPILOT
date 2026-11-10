"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteUserRecipeAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/i18n/navigation";

export function DeleteRecipeButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const t = useTranslations("recipes");
  const e = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-terracotta-soft"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await deleteUserRecipeAction(id);
          if (!result.ok) return void toast.error(e(result.error));
          toast.success(t("deleted"));
          if (redirectTo) router.replace(redirectTo);
          router.refresh();
        })
      }
    >
      <Trash2 />
      {t("delete")}
    </Button>
  );
}
