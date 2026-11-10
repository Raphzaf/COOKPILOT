import type { Locale } from "@/lib/domain/types";

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
}

/**
 * Baseline legal texts describing how the product actually works.
 * They are a starting point: have them reviewed by a lawyer and complete the operator's
 * identity and contact details before a commercial launch.
 */
export const PRIVACY: Record<Locale, LegalDocument> = {
  en: {
    title: "Privacy policy",
    updated: "2026-11-10",
    intro: "This policy explains what CookPilot stores about you, why, and the control you have over it. We collect as little as the service needs.",
    sections: [
      { heading: "What we store", paragraphs: [
        "Account: your email address and, if you sign in with Google, the name Google shares with us. Passwords are handled by our authentication provider (Supabase Auth) and are never stored by CookPilot in readable form.",
        "Kitchen profile: the appliances you register, your language, unit preferences and default serving size.",
        "Optional cooking preferences: favourite cuisines, allergies, dietary preferences and disliked foods. These are optional. Allergies and diets can reveal health-related information, so we only use them to tailor recipes and warnings for you, and you can delete them at any time in Settings.",
        "Activity: recipes you save, rate or cook, your conversations with the AI Chef, and a count of your AI requests used to enforce plan limits.",
      ] },
      { heading: "How we use it", paragraphs: [
        "To run the service: adapt recipes to your appliances, remember your preferences, show your history and apply your plan's limits.",
        "Your messages to the AI Chef, together with your appliance list and preferences, are sent to our AI provider (Google Gemini API) to generate an answer. We do not sell personal data and do not use it for advertising.",
      ] },
      { heading: "Service providers", paragraphs: [
        "Supabase (database and authentication), Vercel (hosting), Google (AI generation), Stripe (payments — we never see your card number), Resend (transactional email), and, when enabled, PostHog (privacy-friendly product analytics without persistent identifiers) and Sentry (error monitoring).",
      ] },
      { heading: "Retention", paragraphs: [
        "On the Free plan, conversation and cooking history is shown for 30 days. You can delete individual conversations and saved recipes whenever you like. When you delete your account, your profile, appliances, preferences, conversations, saved recipes and history are erased. Invoices are kept by Stripe as required by law.",
      ] },
      { heading: "Your rights", paragraphs: [
        "You can view and correct your data in Settings, download a copy of it (Settings → Your data → Export), and delete your account (Settings → Delete account). If you are in the EU/EEA or UK you also have the right to object, to restrict processing and to complain to your data-protection authority.",
      ] },
      { heading: "Cookies", paragraphs: [
        "CookPilot uses only essential cookies: one to keep you signed in and one to remember demo-mode state. We do not use advertising cookies.",
      ] },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "2026-11-10",
    intro: "Cette politique explique ce que CookPilot conserve à votre sujet, pourquoi, et le contrôle dont vous disposez. Nous collectons le strict nécessaire au service.",
    sections: [
      { heading: "Ce que nous conservons", paragraphs: [
        "Compte : votre adresse e-mail et, si vous vous connectez avec Google, le nom que Google nous communique. Les mots de passe sont gérés par notre prestataire d'authentification (Supabase Auth) et ne sont jamais stockés en clair par CookPilot.",
        "Profil de cuisine : les appareils que vous enregistrez, votre langue, vos préférences d'unités et votre nombre de portions par défaut.",
        "Préférences culinaires facultatives : cuisines favorites, allergies, régimes alimentaires et aliments que vous n'aimez pas. Ces informations sont facultatives. Les allergies et régimes pouvant révéler des informations liées à la santé, nous les utilisons uniquement pour adapter les recettes et les avertissements, et vous pouvez les supprimer à tout moment dans les Réglages.",
        "Activité : les recettes que vous enregistrez, notez ou cuisinez, vos conversations avec le Chef IA et le décompte de vos requêtes IA, utilisé pour appliquer les limites de votre offre.",
      ] },
      { heading: "Comment nous les utilisons", paragraphs: [
        "Pour faire fonctionner le service : adapter les recettes à vos appareils, mémoriser vos préférences, afficher votre historique et appliquer les limites de votre offre.",
        "Vos messages au Chef IA, accompagnés de la liste de vos appareils et de vos préférences, sont transmis à notre fournisseur d'IA (API Google Gemini) pour générer une réponse. Nous ne vendons aucune donnée personnelle et ne les utilisons pas à des fins publicitaires.",
      ] },
      { heading: "Prestataires", paragraphs: [
        "Supabase (base de données et authentification), Vercel (hébergement), Google (génération IA), Stripe (paiements — nous ne voyons jamais votre numéro de carte), Resend (e-mails transactionnels) et, lorsqu'ils sont activés, PostHog (mesure d'audience respectueuse de la vie privée, sans identifiant persistant) et Sentry (suivi des erreurs).",
      ] },
      { heading: "Durée de conservation", paragraphs: [
        "Avec l'offre gratuite, l'historique des conversations et des cuissons est affiché pendant 30 jours. Vous pouvez supprimer à tout moment une conversation ou une recette enregistrée. Lorsque vous supprimez votre compte, votre profil, vos appareils, vos préférences, vos conversations, vos recettes enregistrées et votre historique sont effacés. Les factures sont conservées par Stripe conformément à la loi.",
      ] },
      { heading: "Vos droits", paragraphs: [
        "Vous pouvez consulter et corriger vos données dans les Réglages, en télécharger une copie (Réglages → Vos données → Exporter) et supprimer votre compte (Réglages → Supprimer le compte). Si vous résidez dans l'UE/EEE ou au Royaume-Uni, vous disposez également d'un droit d'opposition, de limitation du traitement et de réclamation auprès de votre autorité de protection des données (la CNIL en France).",
      ] },
      { heading: "Cookies", paragraphs: [
        "CookPilot n'utilise que des cookies essentiels : un pour maintenir votre connexion et un pour mémoriser l'état du mode démonstration. Nous n'utilisons aucun cookie publicitaire.",
      ] },
    ],
  },
};

export const TERMS: Record<Locale, LegalDocument> = {
  en: {
    title: "Terms of service",
    updated: "2026-11-10",
    intro: "By using CookPilot you agree to these terms. Please read the sections on cooking safety and independence carefully.",
    sections: [
      { heading: "The service", paragraphs: [
        "CookPilot is a cooking assistant that adapts recipes and advice to the kitchen appliances you tell us you own. It is available as a free plan and a paid Pro subscription.",
      ] },
      { heading: "Independence from manufacturers", paragraphs: [
        "CookPilot is an independent product. It is not affiliated with, endorsed by or sponsored by SharkNinja or any other appliance manufacturer. Brand and model names are used only to identify compatible appliances and remain the property of their owners. No recipe on CookPilot is an official manufacturer recipe.",
      ] },
      { heading: "Recipes and AI answers", paragraphs: [
        "Every recipe is labelled: “Verified” (physically tested on the exact model), “Adapted” (adapted from an existing documented recipe) or “Generated” (an AI recommendation that has not been physically tested). AI answers can be wrong. Appliance information comes from public documentation and may be incomplete; where we lack information we say so.",
        "Always follow your appliance's own manual and safety instructions, which take precedence over anything shown in CookPilot.",
      ] },
      { heading: "Cooking safety", paragraphs: [
        "You are responsible for cooking safely: check that food reaches a safe internal temperature, handle hot equipment with care, and check ingredients against your own allergies and dietary needs. Allergy warnings in CookPilot are an aid, not a guarantee. CookPilot does not provide medical or nutritional advice.",
      ] },
      { heading: "Subscriptions", paragraphs: [
        "Pro is billed in advance, monthly or annually, through Stripe, and renews automatically until cancelled. You can cancel at any time from your account; you keep Pro until the end of the period already paid. Where the law gives you a withdrawal right, it applies. Plan limits (appliances, AI generations, favourites) are described on the pricing page.",
      ] },
      { heading: "Acceptable use", paragraphs: [
        "Do not misuse the service: no attempts to bypass usage limits or security, no automated scraping, and no use of the AI Chef for purposes unrelated to cooking.",
      ] },
      { heading: "Liability", paragraphs: [
        "The service is provided “as is”. To the extent permitted by law, CookPilot is not liable for indirect damages or for the outcome of recipes prepared with it. Nothing in these terms limits rights that consumer law does not allow to be limited.",
      ] },
    ],
  },
  fr: {
    title: "Conditions d'utilisation",
    updated: "2026-11-10",
    intro: "En utilisant CookPilot, vous acceptez les présentes conditions. Merci de lire attentivement les sections consacrées à la sécurité en cuisine et à l'indépendance du service.",
    sections: [
      { heading: "Le service", paragraphs: [
        "CookPilot est un assistant culinaire qui adapte recettes et conseils aux appareils de cuisine que vous déclarez posséder. Il est proposé en offre gratuite et en abonnement payant Pro.",
      ] },
      { heading: "Indépendance vis-à-vis des fabricants", paragraphs: [
        "CookPilot est un produit indépendant. Il n'est ni affilié à SharkNinja ou à tout autre fabricant d'appareils, ni approuvé ou sponsorisé par eux. Les noms de marques et de modèles servent uniquement à identifier les appareils compatibles et restent la propriété de leurs titulaires. Aucune recette de CookPilot n'est une recette officielle de fabricant.",
      ] },
      { heading: "Recettes et réponses de l'IA", paragraphs: [
        "Chaque recette porte une mention : « Vérifiée » (testée physiquement sur le modèle exact), « Adaptée » (adaptée d'une recette documentée existante) ou « Générée » (recommandation de l'IA non testée physiquement). Les réponses de l'IA peuvent comporter des erreurs. Les informations sur les appareils proviennent de la documentation publique et peuvent être incomplètes ; lorsque nous manquons d'informations, nous l'indiquons.",
        "Respectez toujours la notice et les consignes de sécurité de votre appareil, qui prévalent sur tout contenu affiché dans CookPilot.",
      ] },
      { heading: "Sécurité en cuisine", paragraphs: [
        "Vous êtes responsable de cuisiner en toute sécurité : vérifiez que les aliments atteignent une température à cœur sûre, manipulez les équipements chauds avec précaution et contrôlez les ingrédients au regard de vos allergies et besoins alimentaires. Les avertissements d'allergènes de CookPilot sont une aide, pas une garantie. CookPilot ne fournit aucun conseil médical ou nutritionnel.",
      ] },
      { heading: "Abonnements", paragraphs: [
        "L'offre Pro est facturée d'avance, au mois ou à l'année, via Stripe, et se renouvelle automatiquement jusqu'à résiliation. Vous pouvez résilier à tout moment depuis votre compte ; vous conservez l'offre Pro jusqu'à la fin de la période déjà payée. Lorsque la loi vous accorde un droit de rétractation, celui-ci s'applique. Les limites des offres (appareils, générations IA, favoris) sont décrites sur la page Tarifs.",
      ] },
      { heading: "Usage acceptable", paragraphs: [
        "N'abusez pas du service : pas de tentative de contournement des limites d'usage ou de la sécurité, pas d'extraction automatisée, pas d'utilisation du Chef IA à des fins sans rapport avec la cuisine.",
      ] },
      { heading: "Responsabilité", paragraphs: [
        "Le service est fourni « en l'état ». Dans les limites permises par la loi, CookPilot n'est pas responsable des dommages indirects ni du résultat des recettes réalisées avec son aide. Aucune stipulation ne limite les droits que le droit de la consommation interdit de restreindre.",
      ] },
    ],
  },
};
