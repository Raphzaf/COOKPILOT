"use client";

import { ArrowUp, CookingPot, MessageSquarePlus, Settings2, Sparkles, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteConversationAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Notice, Spinner } from "@/components/ui/states";
import type { ChefErrorCode } from "@/lib/ai/chef";
import type { ChefPayload } from "@/lib/ai/schema";
import type { QuotaState } from "@/lib/billing/plans";
import type { ChatMessage, Conversation, MeasurementSystem, TemperatureUnit } from "@/lib/domain/types";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { AssistantAvatar, AssistantMessage, UserBubble } from "./chef-message";
import type { DeviceLabels } from "./chef-recipe-card";
import { streamChef } from "./stream";

interface UiMessage {
  id: string | null;
  role: "user" | "assistant";
  content: string;
  payload: ChefPayload | null;
}

export function ChefChat({
  conversations,
  activeId,
  initialMessages,
  initialQuota,
  suggestions,
  focusRecipe,
  initialQuestion,
  hasDevices,
  devices,
  system,
  unit,
  aiConfigured,
}: {
  conversations: Conversation[];
  activeId: string | null;
  initialMessages: ChatMessage[];
  initialQuota: QuotaState;
  suggestions: string[];
  focusRecipe: { id: string; title: string } | null;
  initialQuestion: string | null;
  hasDevices: boolean;
  devices: DeviceLabels;
  system: MeasurementSystem;
  unit: TemperatureUnit;
  aiConfigured: boolean;
}) {
  const t = useTranslations("chef");
  const locale = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    initialMessages.map((m) => ({ id: m.id, role: m.role, content: m.content, payload: (m.payload as ChefPayload | null) ?? null })),
  );
  const [conversationId, setConversationId] = useState(activeId);
  const [list, setList] = useState(conversations);
  const [quota, setQuota] = useState(initialQuota);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<{ code: ChefErrorCode; retry?: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busy = streaming !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setError(null);
      setInput("");
      setMessages((prev) => [...prev, { id: null, role: "user", content: message, payload: null }]);
      setStreaming("");
      const controller = new AbortController();
      abortRef.current = controller;
      let currentId = conversationId;
      await streamChef(
        { conversationId, message, locale, recipeId: focusRecipe?.id ?? null },
        (event) => {
          if (event.type === "meta") {
            if (!currentId) {
              currentId = event.conversationId;
              setConversationId(event.conversationId);
              const now = new Date().toISOString();
              setList((prev) => [{ id: event.conversationId, userId: "", title: message.slice(0, 70), createdAt: now, updatedAt: now }, ...prev]);
              window.history.replaceState(null, "", `/${locale}/dashboard/chef?c=${event.conversationId}`);
            }
          } else if (event.type === "delta") {
            setStreaming((prev) => (prev ?? "") + event.text);
          } else if (event.type === "final") {
            setStreaming(null);
            setQuota(event.quota);
            setMessages((prev) => [...prev, { id: event.message.id, role: "assistant", content: event.message.content, payload: event.message.payload as ChefPayload }]);
          } else {
            setStreaming(null);
            setError({ code: event.code, retry: event.retryAfterSeconds });
          }
        },
        controller.signal,
      );
      setStreaming(null);
      inputRef.current?.focus();
    },
    [busy, conversationId, focusRecipe, locale],
  );

  const remove = async (id: string) => {
    const result = await deleteConversationAction(id);
    if (!result.ok) return void toast.error(t("errors.PROVIDER_ERROR"));
    setList((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) {
      router.replace("/dashboard/chef");
      router.refresh();
    }
  };

  const empty = messages.length === 0 && !busy;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="order-2 lg:order-1" aria-label={t("history.title")}>
        <Button asChild variant="secondary" className="w-full justify-start">
          {/* A full navigation resets the chat state for a clean new conversation. */}
          <a href={`/${locale}/dashboard/chef`} data-testid="new-conversation"><MessageSquarePlus />{t("new")}</a>
        </Button>
        <p className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-subtle">{t("history.title")}</p>
        {list.length === 0 ? (
          <p className="px-1 text-sm text-muted">{t("history.empty")}</p>
        ) : (
          <ul className="space-y-1" data-testid="conversation-list">
            {list.map((c) => (
              <li key={c.id} className={cn("group flex items-center gap-1 rounded-lg", c.id === conversationId ? "bg-accent" : "hover:bg-sunken")}>
                <a href={`/${locale}/dashboard/chef?c=${c.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-sm" aria-current={c.id === conversationId ? "page" : undefined}>{c.title || t("untitled")}</a>
                <button type="button" onClick={() => remove(c.id)} className="mr-1 cursor-pointer rounded-md p-1.5 text-subtle opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100" aria-label={t("history.delete")}>
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="order-1 flex min-h-[70dvh] flex-col rounded-2xl border border-border bg-surface/60 lg:order-2" aria-label={t("title")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" />{t("title")}</p>
          <p className="text-xs tabular-nums text-muted" data-testid="chef-quota">{t("quota", { remaining: quota.remaining, limit: quota.limit })}</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6" aria-live="polite">
          {!aiConfigured ? <Notice tone="warning" icon={Settings2}>{t("notConfigured")}</Notice> : null}
          {!hasDevices ? (
            <Notice icon={CookingPot}>
              {t("noDevices")} <Link href="/dashboard/devices/add" className="font-medium underline">{t("addDevice")}</Link>
            </Notice>
          ) : null}
          {focusRecipe ? <Notice>{t("aboutRecipe", { title: focusRecipe.title })}</Notice> : null}

          {empty ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AssistantAvatar />
              <h2 className="mt-4 text-3xl">{t("empty.title")}</h2>
              <p className="mt-2 max-w-md text-muted">{t("empty.subtitle")}</p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-border-strong hover:bg-sunken" data-testid="chef-suggestion">{s}</button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={m.id ?? `u${i}`} text={m.content} />
            ) : (
              <AssistantMessage key={m.id ?? `a${i}`} text={m.content} payload={m.payload} conversationId={conversationId} messageId={m.id} system={system} unit={unit} devices={devices} onAsk={i === messages.length - 1 ? send : undefined} />
            ),
          )}

          {busy ? (
            streaming ? (
              <AssistantMessage text={streaming} payload={null} conversationId={null} messageId={null} system={system} unit={unit} devices={devices} streaming />
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted" role="status"><AssistantAvatar /><Spinner />{t("thinking")}</div>
            )
          ) : null}

          {error ? (
            <Notice tone="danger" className="items-center">
              <p data-testid="chef-error">{t(`errors.${error.code}`, { seconds: error.retry ?? 60 })}</p>
              {error.code === "QUOTA_EXCEEDED" ? <Link href="/dashboard/subscription" className="mt-1 inline-block font-medium underline">{t("upgrade")}</Link> : null}
            </Notice>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-border-strong bg-surface p-2 focus-within:outline-2 focus-within:outline-ring">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) {
                  ev.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              disabled={quota.remaining <= 0}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-subtle [field-sizing:content]"
              data-testid="chef-input"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim() || quota.remaining <= 0} aria-label={t("send")} data-testid="chef-send">
              {busy ? <Spinner /> : <ArrowUp />}
            </Button>
          </div>
          <p className="mt-2 px-2 text-center text-xs text-subtle">{t("disclaimer")}</p>
        </form>
      </section>
    </div>
  );
}
