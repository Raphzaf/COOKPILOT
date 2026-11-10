"use client";

import { ArrowLeft, ArrowRight, Bell, BellRing, Check, ChefHat, ListChecks, Maximize, Minus, Pause, Play, Plus, RotateCcw, Sun, Thermometer, Timer as TimerIcon, Volume2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { finishCookingAction } from "@/actions/user";
import { streamChef } from "@/components/chef/stream";
import { IngredientList } from "@/components/recipes/ingredients-panel";
import { StarRating } from "@/components/recipes/recipe-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Notice, Progress, Spinner } from "@/components/ui/states";
import type { Locale, MeasurementSystem, Recipe, TemperatureUnit } from "@/lib/domain/types";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { formatClock, formatDuration, formatTemperature } from "@/lib/units";
import { cn } from "@/lib/utils";

interface CookTimer {
  id: number;
  label: string;
  total: number;
  /** Epoch ms when the timer ends; null while paused. */
  endsAt: number | null;
  /** Seconds left when paused. */
  remaining: number;
  done: boolean;
}

const noopSubscribe = () => () => undefined;
const readPermission = (): NotificationPermission | "unsupported" => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // Audio is best-effort.
  }
}

export function CookingMode({
  recipe,
  system,
  unit,
  deviceLabel,
  deviceModelId,
  programNames,
  initialServings,
  advanced,
}: {
  recipe: Recipe;
  system: MeasurementSystem;
  unit: TemperatureUnit;
  deviceLabel: string | null;
  deviceModelId: string | null;
  programNames: Record<string, string>;
  initialServings: number;
  /** Pro: keep-screen-awake and read-aloud. */
  advanced: boolean;
}) {
  const t = useTranslations("cooking");
  const c = useTranslations("common");
  const r = useTranslations("recipes");
  const e = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const total = recipe.steps.length;
  // -1 = ingredients, 0..total-1 = steps, total = finish
  const [index, setIndex] = useState(-1);
  const [servings, setServings] = useState(initialServings);
  const [timers, setTimers] = useState<CookTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const detectedPermission = useSyncExternalStore(noopSubscribe, readPermission, () => "default" as const);
  const [grantedPermission, setNotify] = useState<NotificationPermission | null>(null);
  const notify = grantedPermission ?? detectedPermission;
  const [showIngredients, setShowIngredients] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [awake, setAwake] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const nextId = useRef(1);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const step = index >= 0 && index < total ? recipe.steps[index]! : null;

  const timersRef = useRef<CookTimer[]>([]);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // One ticking clock drives every timer and detects the ones that just finished.
  const running = timers.some((x) => x.endsAt !== null && !x.done);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      const finished = timersRef.current.filter((x) => !x.done && x.endsAt !== null && x.endsAt <= current);
      if (finished.length === 0) return;
      const ids = new Set(finished.map((f) => f.id));
      timersRef.current = timersRef.current.map((x) => (ids.has(x.id) ? { ...x, done: true, endsAt: null, remaining: 0 } : x));
      setTimers((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, done: true, endsAt: null, remaining: 0 } : x)));
      beep();
      navigator.vibrate?.([300, 150, 300]);
      for (const timer of finished) {
        toast.success(t("timerDone", { label: timer.label }), { duration: 15000 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(t("timerDoneTitle"), { body: timer.label, tag: `cookpilot-timer-${timer.id}`, icon: "/icons/icon-192.png" });
          } catch {
            // Some mobile browsers only allow notifications from a service worker.
          }
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, t]);

  // Keep the screen on (Pro) while cooking.
  useEffect(() => {
    if (!advanced || !awake || !("wakeLock" in navigator)) return;
    let released = false;
    const acquire = () =>
      (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((lock) => {
          if (released) void lock.release();
          else wakeLock.current = lock;
        })
        .catch(() => setAwake(false));
    void acquire();
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [advanced, awake]);

  const addTimer = useCallback((label: string, seconds: number) => {
    setNow(Date.now());
    setTimers((prev) => [...prev, { id: nextId.current++, label, total: seconds, endsAt: Date.now() + seconds * 1000, remaining: seconds, done: false }]);
  }, []);

  const left = (timer: CookTimer) => (timer.endsAt === null ? timer.remaining : Math.max(0, (timer.endsAt - now) / 1000));

  const toggleTimer = (id: number) =>
    setTimers((prev) =>
      prev.map((x) => {
        if (x.id !== id || x.done) return x;
        return x.endsAt === null ? { ...x, endsAt: Date.now() + x.remaining * 1000 } : { ...x, remaining: Math.max(0, (x.endsAt - Date.now()) / 1000), endsAt: null };
      }),
    );

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    setNotify(await Notification.requestPermission());
  };

  const speak = () => {
    if (!step || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(step.instruction);
    utterance.lang = locale === "fr" ? "fr-FR" : "en-GB";
    window.speechSynthesis.speak(utterance);
  };

  const finish = () =>
    start(async () => {
      const result = await finishCookingAction({ recipeId: recipe.id, deviceModelId, servings, rating, comment: comment.trim() || null });
      if (!result.ok) return void toast.error(e(result.error));
      toast.success(t("finish.saved"));
      router.replace(`/dashboard/recipes/${recipe.id}`);
      router.refresh();
    });

  const progress = index < 0 ? 0 : (Math.min(index + 1, total) / total) * 100;
  const stepTimerLabel = step ? t("stepTimer", { step: index + 1 }) : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="cooking-mode">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Button asChild variant="ghost" size="icon" aria-label={t("exit")}><Link href={`/dashboard/recipes/${recipe.id}`}><X /></Link></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg leading-tight">{recipe.title}</p>
          <p className="truncate text-xs text-muted">{deviceLabel ?? t("noDevice")}</p>
        </div>
        {advanced ? (
          <Button variant={awake ? "soft" : "ghost"} size="icon" onClick={() => setAwake((v) => !v)} aria-pressed={awake} aria-label={t("keepAwake")} title={t("keepAwake")}><Sun /></Button>
        ) : null}
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} aria-label={t("fullscreen")} title={t("fullscreen")}><Maximize /></Button>
        <Button variant="secondary" size="sm" onClick={() => setShowIngredients(true)}><ListChecks /><span className="hidden sm:inline">{r("ingredients")}</span></Button>
        <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} data-testid="cooking-ask"><ChefHat /><span className="hidden sm:inline">{t("askChef")}</span></Button>
      </header>
      <Progress value={progress} className="h-1.5 rounded-none" label={t("progress")} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 md:px-8">
          {index < 0 ? (
            <section aria-labelledby="prep-title">
              <p className="eyebrow mb-2">{t("prep.eyebrow")}</p>
              <h1 id="prep-title" className="text-4xl md:text-5xl">{t("prep.title")}</h1>
              <p className="mt-3 text-lg text-muted">{t("prep.subtitle")}</p>
              <div className="my-6 inline-flex items-center gap-3" role="group" aria-label={r("adjustServings")}>
                <Button variant="secondary" size="icon" className="size-12" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label={r("fewerServings")}><Minus /></Button>
                <span className="min-w-28 text-center text-lg font-medium">{r("servings", { count: servings })}</span>
                <Button variant="secondary" size="icon" className="size-12" onClick={() => setServings((s) => Math.min(24, s + 1))} aria-label={r("moreServings")}><Plus /></Button>
              </div>
              <IngredientList ingredients={recipe.ingredients} baseServings={recipe.servings} servings={servings} system={system} checkable large />
              {recipe.accessories.length > 0 ? (
                <div className="mt-6 rounded-xl border border-border bg-surface p-4">
                  <p className="mb-2 text-sm font-semibold">{r("accessories")}</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted">{recipe.accessories.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              ) : null}
              {recipe.safetyNotes.length > 0 ? <Notice tone="danger" className="mt-4"><ul className="list-disc space-y-1 pl-4">{recipe.safetyNotes.map((n) => <li key={n}>{n}</li>)}</ul></Notice> : null}
            </section>
          ) : step ? (
            <section aria-labelledby="step-title" className="flex flex-1 flex-col" data-testid="cooking-step">
              <p id="step-title" className="eyebrow mb-4" aria-live="polite">{t("stepOf", { current: index + 1, total })}</p>
              {step.program || step.temperatureC != null || step.durationSeconds ? (
                <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-4" aria-label={t("settings")}>
                  {step.program ? <Badge variant="olive" className="px-3.5 py-1.5 text-base [&_svg]:size-4"><ChefHat />{programNames[step.program] ?? step.program}{step.level ? ` · ${step.level}` : ""}</Badge> : null}
                  {step.temperatureC != null ? <Badge variant="amber" className="px-3.5 py-1.5 text-base [&_svg]:size-4"><Thermometer />{formatTemperature(step.temperatureC, unit)}</Badge> : null}
                  {step.durationSeconds ? <Badge variant="neutral" className="px-3.5 py-1.5 text-base [&_svg]:size-4"><TimerIcon />{formatDuration(step.durationSeconds, locale)}</Badge> : null}
                </div>
              ) : null}
              <p className="font-serif text-3xl leading-snug md:text-4xl md:leading-snug">{step.instruction}</p>
              {step.tip ? <p className="mt-5 border-l-2 border-primary pl-4 text-lg italic text-muted">{step.tip}</p> : null}
              <div className="mt-8 flex flex-wrap gap-3">
                {step.durationSeconds ? (
                  <Button size="lg" variant="soft" onClick={() => addTimer(stepTimerLabel, step.durationSeconds!)} data-testid="start-step-timer"><TimerIcon />{t("startTimer", { duration: formatDuration(step.durationSeconds, locale) })}</Button>
                ) : null}
                {advanced ? <Button size="lg" variant="secondary" onClick={speak}><Volume2 />{t("readAloud")}</Button> : null}
              </div>
            </section>
          ) : (
            <section aria-labelledby="finish-title" data-testid="cooking-finish">
              <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="size-7" /></span>
              <h1 id="finish-title" className="text-4xl md:text-5xl">{t("finish.title")}</h1>
              <p className="mt-3 text-lg text-muted">{t("finish.subtitle")}</p>
              <div className="mt-8 space-y-5">
                <div><p className="mb-2 text-sm font-medium">{t("finish.rate")}</p><StarRating value={rating} onChange={setRating} size="lg" /></div>
                <Textarea value={comment} onChange={(ev) => setComment(ev.target.value)} maxLength={2000} placeholder={t("finish.commentPlaceholder")} aria-label={t("finish.comment")} className="min-h-28 text-base" />
              </div>
            </section>
          )}

          {/* Timers */}
          <section className="mt-10" aria-label={t("timers")}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><TimerIcon className="size-4" />{t("timers")}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 5, 10].map((m) => (
                  <Button key={m} variant="secondary" size="sm" onClick={() => addTimer(t("customTimer", { minutes: m }), m * 60)} data-testid={`quick-timer-${m}`}><Plus />{t("minutesShort", { count: m })}</Button>
                ))}
                {notify === "default" ? <Button variant="ghost" size="sm" onClick={requestNotifications}><Bell />{t("enableNotifications")}</Button> : null}
                {notify === "granted" ? <span className="inline-flex items-center gap-1 px-2 text-xs text-muted"><BellRing className="size-3.5" />{t("notificationsOn")}</span> : null}
              </div>
            </div>
            {timers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-muted">{t("noTimers")}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2" data-testid="timer-list">
                {timers.map((timer) => {
                  const seconds = left(timer);
                  return (
                    <li key={timer.id} className={cn("flex items-center gap-3 rounded-xl border p-3", timer.done ? "border-primary bg-accent" : "border-border bg-surface")}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted">{timer.label}</p>
                        <p className="font-serif text-3xl tabular-nums" role="timer" aria-live="off">{timer.done ? t("done") : formatClock(seconds)}</p>
                        <Progress value={timer.done ? 100 : ((timer.total - seconds) / timer.total) * 100} className="mt-1.5 h-1" label={timer.label} />
                      </div>
                      {!timer.done ? (
                        <Button variant="secondary" size="icon" className="size-12" onClick={() => toggleTimer(timer.id)} aria-label={timer.endsAt === null ? t("resume") : t("pause")}>{timer.endsAt === null ? <Play /> : <Pause />}</Button>
                      ) : (
                        <Button variant="secondary" size="icon" className="size-12" onClick={() => { setTimers((prev) => prev.filter((x) => x.id !== timer.id)); addTimer(timer.label, timer.total); }} aria-label={t("restart")}><RotateCcw /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-12" onClick={() => setTimers((prev) => prev.filter((x) => x.id !== timer.id))} aria-label={t("removeTimer")}><X /></Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Bottom navigation: big targets for messy hands */}
      <footer className="grid grid-cols-2 gap-3 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6">
        <Button variant="secondary" size="xl" onClick={() => setIndex((i) => Math.max(-1, i - 1))} disabled={index < 0 || pending} data-testid="cooking-prev"><ArrowLeft />{t("previous")}</Button>
        {index < total ? (
          <Button size="xl" onClick={() => setIndex((i) => i + 1)} data-testid="cooking-next">
            {index < 0 ? t("start") : index === total - 1 ? t("lastStep") : t("next")}
            <ArrowRight />
          </Button>
        ) : (
          <Button size="xl" onClick={finish} disabled={pending} data-testid="cooking-finish-button">{pending ? <Spinner /> : <Check />}{t("finish.save")}</Button>
        )}
      </footer>

      <Dialog open={showIngredients} onOpenChange={setShowIngredients}>
        <DialogContent closeLabel={c("close")}>
          <DialogTitle>{r("ingredients")}</DialogTitle>
          <DialogDescription>{r("servings", { count: servings })}</DialogDescription>
          <div className="mt-4"><IngredientList ingredients={recipe.ingredients} baseServings={recipe.servings} servings={servings} system={system} checkable /></div>
        </DialogContent>
      </Dialog>

      <CookingHelp open={showHelp} onOpenChange={setShowHelp} recipeId={recipe.id} stepNumber={step ? index + 1 : null} />
    </div>
  );
}

/** "Ask the chef" without leaving the cooking screen. Each question is grounded in this recipe. */
function CookingHelp({ open, onOpenChange, recipeId, stepNumber }: { open: boolean; onOpenChange: (open: boolean) => void; recipeId: string; stepNumber: number | null }) {
  const t = useTranslations("cooking");
  const ch = useTranslations("chef");
  const c = useTranslations("common");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversation = useRef<string | null>(null);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setAnswer("");
    setError(null);
    await streamChef(
      { conversationId: conversation.current, recipeId, locale, message: stepNumber ? `${t("help.stepContext", { step: stepNumber })} ${message}` : message },
      (event) => {
        if (event.type === "meta") conversation.current = event.conversationId;
        else if (event.type === "delta") setAnswer((prev) => prev + event.text);
        else if (event.type === "final") setAnswer(event.message.content);
        else setError(ch(`errors.${event.code}`, { seconds: event.retryAfterSeconds ?? 60 }));
      },
    );
    setBusy(false);
    setQuestion("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={c("close")}>
        <DialogTitle>{t("help.title")}</DialogTitle>
        <DialogDescription>{t("help.subtitle")}</DialogDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["doneness", "substitute", "wrong"] as const).map((key) => (
            <button key={key} type="button" disabled={busy} onClick={() => void ask(t(`help.quick.${key}`))} className="cursor-pointer rounded-full border border-border-strong px-3.5 py-2 text-sm hover:bg-sunken disabled:opacity-50">{t(`help.quick.${key}`)}</button>
          ))}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
          <Input value={question} onChange={(ev) => setQuestion(ev.target.value)} maxLength={500} placeholder={t("help.placeholder")} aria-label={t("help.placeholder")} data-testid="cooking-help-input" />
          <Button type="submit" disabled={busy || !question.trim()}>{busy ? <Spinner /> : ch("send")}</Button>
        </form>
        {answer ? <div className="mt-4 whitespace-pre-wrap rounded-xl bg-sunken p-4 text-[15px] leading-relaxed" aria-live="polite" data-testid="cooking-help-answer">{answer}</div> : null}
        {error ? <Notice tone="danger" className="mt-4">{error}</Notice> : null}
      </DialogContent>
    </Dialog>
  );
}
