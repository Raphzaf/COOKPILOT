"use client";

import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { googleSignInAction, requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/states";
import { Link, useRouter } from "@/lib/i18n/navigation";

type Mode = "login" | "register" | "forgot" | "reset";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function AuthForm({ mode, initialError }: { mode: Mode; initialError?: boolean }) {
  const t = useTranslations("auth");
  const e = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? t("callbackError") : null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      if (mode === "login") {
        const result = await signInAction({ email, password });
        if (!result.ok) return setError(e(result.error));
        router.replace("/dashboard");
        router.refresh();
      } else if (mode === "register") {
        const result = await signUpAction({ email, password, locale });
        if (!result.ok) return setError(e(result.error));
        if (result.data.needsConfirmation) return setDone(t("confirmEmail", { email }));
        router.replace("/onboarding");
        router.refresh();
      } else if (mode === "forgot") {
        const result = await requestPasswordResetAction({ email, locale });
        if (!result.ok) return setError(e(result.error));
        setDone(t("resetSent"));
      } else {
        const result = await updatePasswordAction(password);
        if (!result.ok) return setError(e(result.error));
        router.replace("/dashboard");
        router.refresh();
      }
    });
  };

  const google = () =>
    start(async () => {
      const result = await googleSignInAction(locale);
      if (!result.ok) return setError(t("googleUnavailable"));
      window.location.assign(result.data.url);
    });

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"><MailCheck className="size-5" /></span>
        <p className="text-muted">{done}</p>
        <Button asChild variant="link" className="mt-4"><Link href="/login">{t("backToLogin")}</Link></Button>
      </div>
    );
  }

  return (
    <div>
      {mode === "login" || mode === "register" ? (
        <>
          <Button variant="secondary" className="w-full" onClick={google} disabled={pending}><GoogleIcon />{t("google")}</Button>
          <div className="my-5 flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-border" />{t("or")}<span className="h-px flex-1 bg-border" /></div>
        </>
      ) : null}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode !== "reset" ? (
          <div>
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(ev) => setEmail(ev.target.value)} />
          </div>
        ) : null}
        {mode !== "forgot" ? (
          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">{mode === "reset" ? t("newPassword") : t("password")}</Label>
              {mode === "login" ? <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">{t("forgot")}</Link> : null}
            </div>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(ev) => setPassword(ev.target.value)} />
            {mode !== "login" ? <FieldHint>{t("passwordHint")}</FieldHint> : null}
          </div>
        ) : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit" className="w-full" disabled={pending || (mode !== "reset" && !email) || (mode !== "forgot" && password.length < 8)}>
          {pending ? <Spinner /> : null}
          {t(`submit.${mode}`)}
        </Button>
      </form>
      {mode === "register" ? <p className="mt-4 text-center text-xs text-subtle">{t.rich("legal", { terms: (c) => <Link href="/terms" className="underline">{c}</Link>, privacy: (c) => <Link href="/privacy" className="underline">{c}</Link> })}</p> : null}
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? <>{t("noAccount")} <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">{t("createAccount")}</Link></> : null}
        {mode === "register" ? <>{t("haveAccount")} <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">{t("signIn")}</Link></> : null}
        {mode === "forgot" ? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">{t("backToLogin")}</Link> : null}
      </p>
    </div>
  );
}
