import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#55622f" />
      <path d="M9 17.5a7 7 0 0 0 14 0Z" fill="#fffdf8" />
      <path d="M7.5 17.5h17" stroke="#fffdf8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 6.5c-1.6 1.6-1.6 3.2 0 4.8M12 8.2c-1 1-1 2.1 0 3.1M20 8.2c1 1 1 2.1 0 3.1" stroke="#dfe4c8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-serif text-xl font-medium tracking-tight">CookPilot</span>
    </span>
  );
}
