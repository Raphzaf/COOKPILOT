"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-card !font-sans",
          description: "!text-muted",
        },
      }}
    />
  );
}
