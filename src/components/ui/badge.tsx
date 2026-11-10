import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      neutral: "bg-sunken text-muted",
      olive: "bg-accent text-accent-foreground",
      amber: "bg-amber-soft text-amber-foreground",
      terracotta: "bg-terracotta-soft text-terracotta",
      outline: "border border-border-strong text-muted",
      solid: "bg-foreground text-surface",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
