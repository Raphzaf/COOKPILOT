import "server-only";
import type { Locale } from "@/lib/domain/types";
import { getAppUrl, serverEnv } from "@/lib/env";

interface EmailContent {
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail(content: EmailContent, locale: Locale): { html: string; text: string } {
  const footer =
    locale === "fr"
      ? "CookPilot est un service indépendant, sans lien avec les fabricants d'appareils."
      : "CookPilot is an independent service, not affiliated with appliance manufacturers.";
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#faf6ee;font-family:Georgia,'Times New Roman',serif;color:#26251f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #e7e0d0;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:18px;font-weight:bold;color:#55622f">CookPilot</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${escapeHtml(content.heading)}</h1>
${content.paragraphs.map((p) => `<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4a483f">${escapeHtml(p)}</p>`).join("")}
${content.cta ? `<p style="margin:24px 0 0"><a href="${escapeHtml(content.cta.href)}" style="display:inline-block;background:#55622f;color:#fffdf8;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;padding:12px 22px;border-radius:999px">${escapeHtml(content.cta.label)}</a></p>` : ""}
</td></tr></table>
<p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a8677">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`;
  const text = [content.heading, "", ...content.paragraphs, ...(content.cta ? ["", `${content.cta.label}: ${content.cta.href}`] : []), "", footer].join("\n");
  return { html, text };
}

export const EMAIL_TEMPLATES = {
  welcome(locale: Locale, name: string | null): EmailContent {
    const url = `${getAppUrl()}/${locale}/dashboard`;
    return locale === "fr"
      ? {
          subject: "Bienvenue sur CookPilot",
          heading: name ? `Bienvenue, ${name} !` : "Bienvenue !",
          paragraphs: [
            "Votre cuisine est prête. CookPilot connaît désormais vos appareils et adapte chaque recette à leurs programmes réels.",
            "Commencez par demander une recette à votre chef IA, ou parcourez la bibliothèque.",
          ],
          cta: { label: "Ouvrir mon tableau de bord", href: url },
        }
      : {
          subject: "Welcome to CookPilot",
          heading: name ? `Welcome, ${name}!` : "Welcome!",
          paragraphs: [
            "Your kitchen is set up. CookPilot now knows your appliances and adapts every recipe to the programs they really have.",
            "Start by asking your AI chef for a recipe, or browse the library.",
          ],
          cta: { label: "Open my dashboard", href: url },
        };
  },
  subscriptionActive(locale: Locale): EmailContent {
    const url = `${getAppUrl()}/${locale}/dashboard/subscription`;
    return locale === "fr"
      ? {
          subject: "Votre abonnement CookPilot Pro est actif",
          heading: "Merci, vous êtes Pro !",
          paragraphs: [
            "Appareils illimités, 60 générations IA par mois, historique complet et recettes personnalisées : tout est activé.",
            "Vous pouvez gérer ou annuler votre abonnement à tout moment depuis votre espace.",
          ],
          cta: { label: "Gérer mon abonnement", href: url },
        }
      : {
          subject: "Your CookPilot Pro subscription is active",
          heading: "Thank you — you're Pro!",
          paragraphs: [
            "Unlimited appliances, 60 AI generations a month, full history and personalised recipes are now unlocked.",
            "You can manage or cancel your subscription at any time from your account.",
          ],
          cta: { label: "Manage my subscription", href: url },
        };
  },
  subscriptionCanceled(locale: Locale, until: string | null): EmailContent {
    return locale === "fr"
      ? {
          subject: "Votre abonnement CookPilot Pro a été annulé",
          heading: "Abonnement annulé",
          paragraphs: [
            until ? `Vous conservez les avantages Pro jusqu'au ${until}.` : "Votre compte est repassé à l'offre gratuite.",
            "Vos recettes et vos appareils restent enregistrés. Vous pouvez revenir quand vous voulez.",
          ],
        }
      : {
          subject: "Your CookPilot Pro subscription was cancelled",
          heading: "Subscription cancelled",
          paragraphs: [
            until ? `You keep your Pro benefits until ${until}.` : "Your account is back on the Free plan.",
            "Your recipes and appliances stay saved. You are welcome back any time.",
          ],
        };
  },
};

export type EmailResult = { sent: true } | { sent: false; reason: "not_configured" | "failed" };

/** Sends a transactional email through Resend. No-op (reported as such) when RESEND_API_KEY is missing. */
export async function sendEmail(to: string, content: EmailContent, locale: Locale): Promise<EmailResult> {
  const key = serverEnv.resendApiKey;
  if (!key || !to) return { sent: false, reason: "not_configured" };
  const { html, text } = renderEmail(content, locale);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: serverEnv.emailFrom, to: [to], subject: content.subject, html, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("[email] Resend responded with", response.status);
      return { sent: false, reason: "failed" };
    }
    return { sent: true };
  } catch {
    console.error("[email] Resend request failed");
    return { sent: false, reason: "failed" };
  }
}
