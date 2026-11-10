import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-sunken", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center", className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-xl">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-terracotta/30 bg-terracotta-soft/60 px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface text-terracotta">
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="text-xl">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  icon: Icon,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger";
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-accent text-accent-foreground border-[#dfe4c8]",
    warning: "bg-amber-soft text-amber-foreground border-[#ecdcae]",
    danger: "bg-terracotta-soft text-terracotta border-terracotta/25",
  };
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("h-2 overflow-hidden rounded-full bg-sunken", className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
