"use client";

import { Plus } from "lucide-react";
import { Accordion as Primitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Accordion = Primitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn("border-b border-border", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Header>
      <Primitive.Trigger
        className={cn("group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-lg font-medium", className)}
        {...props}
      >
        {children}
        <Plus className="size-5 shrink-0 text-muted transition-transform group-data-[state=open]:rotate-45" />
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content className="overflow-hidden text-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <div className={cn("pb-5 pr-8 leading-relaxed", className)}>{children}</div>
    </Primitive.Content>
  );
}
