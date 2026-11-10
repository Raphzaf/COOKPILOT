import type { DeviceModel, KnowledgeDocType, Locale, VerificationStatus } from "@/lib/domain/types";
import { LOCALES } from "@/lib/domain/types";
import { SEED_DEVICES } from "./devices";
import { SEED_RECIPES, localizeSeedRecipe } from "./recipes";
import { formatDuration } from "@/lib/units";

export interface SeedKnowledgeDocument {
  key: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  language: Locale;
  docType: KnowledgeDocType;
  publishedAt: string | null;
  verificationStatus: VerificationStatus;
  rightsNote: string;
  content: string;
}

const OWN_RIGHTS = "Original CookPilot text. Facts summarised from the public sources cited on the appliance record; no manufacturer text is reproduced.";

/** Turns a catalogue record into a plain-language capability sheet the retriever can find. */
export function deviceToKnowledge(model: DeviceModel, locale: Locale): SeedKnowledgeDocument {
  const fr = locale === "fr";
  const programs = model.capabilities.filter((c) => c.kind === "program");
  const extras = model.capabilities.filter((c) => c.kind !== "program");
  const lines: string[] = [];
  lines.push(
    fr
      ? `${model.brand.name} ${model.name} — modèle ${model.modelNumber} (région ${model.region}). Catégorie : ${model.category.name.fr}.`
      : `${model.brand.name} ${model.name} — model ${model.modelNumber} (region ${model.region}). Category: ${model.category.name.en}.`,
  );
  lines.push(model.description[locale]);
  if (programs.length > 0) {
    lines.push(fr ? "Programmes documentés :" : "Documented programs:");
    for (const p of programs) {
      const parts = [p.name[locale]];
      if (p.tempMin != null && p.tempMax != null && p.tempUnit) parts.push(`${p.tempMin}–${p.tempMax} °${p.tempUnit}`);
      if (p.levels.length > 0) parts.push((fr ? "niveaux : " : "levels: ") + p.levels.join(", "));
      if (p.notes) parts.push(p.notes[locale]);
      lines.push(`- ${parts.join(" — ")}`);
    }
  } else {
    lines.push(
      fr
        ? "Aucun programme n'est documenté pour ce modèle. Ne recommandez aucun programme précis pour cet appareil."
        : "No program is documented for this model. Do not recommend any specific program for this appliance.",
    );
  }
  if (extras.length > 0) {
    lines.push(fr ? "Accessoires et fonctions :" : "Accessories and features:");
    for (const e of extras) lines.push(`- ${e.name[locale]}${e.notes ? ` — ${e.notes[locale]}` : ""}`);
  }
  if (model.specs.length > 0) {
    lines.push(fr ? "Caractéristiques :" : "Specifications:");
    for (const s of model.specs) lines.push(`- ${s.label[locale]} : ${s.value}`);
  }
  if (model.missingInfo.length > 0) {
    lines.push(fr ? "Informations non documentées (ne pas deviner) :" : "Not documented (do not guess):");
    for (const m of model.missingInfo) lines.push(`- ${m[locale]}`);
  }
  return {
    key: `device-${model.slug}-${locale}`,
    title: fr ? `Fiche capacités — ${model.brand.name} ${model.modelNumber}` : `Capability sheet — ${model.brand.name} ${model.modelNumber}`,
    source: "CookPilot appliance catalogue",
    sourceUrl: model.sources[0]?.url ?? null,
    manufacturer: model.brand.name,
    modelNumber: model.modelNumber,
    language: locale,
    docType: "capability",
    publishedAt: model.lastVerifiedAt,
    verificationStatus: model.verificationStatus,
    rightsNote: OWN_RIGHTS,
    content: lines.join("\n"),
  };
}

const FOOD_SAFETY: Record<Locale, { title: string; content: string }> = {
  en: {
    title: "Safe internal cooking temperatures",
    content: `Safe minimum internal temperatures, as published by food-safety agencies (USDA FSIS). Always measure with a food thermometer in the thickest part, away from bone.

Poultry (chicken, turkey, duck — whole, pieces or minced): 74 °C / 165 °F.

Minced or ground meat (beef, pork, veal, lamb), burgers and sausages: 71 °C / 160 °F.

Whole cuts of beef, pork, veal and lamb (steaks, chops, roasts): 63 °C / 145 °F, then rest for at least 3 minutes. Steak served rare or medium-rare is below this recommendation; it is a personal choice and is not advised for pregnant women, young children, older adults or people with weakened immunity.

Fish and shellfish: 63 °C / 145 °F, or until the flesh is opaque and flakes easily.

Egg dishes: 71 °C / 160 °F. Leftovers and casseroles: reheat to 74 °C / 165 °F.

Do not leave cooked food at room temperature for more than 2 hours (1 hour above 32 °C / 90 °F). Refrigerate promptly and keep raw meat separate from ready-to-eat food. Wash hands, boards and utensils after handling raw meat, poultry or fish.`,
  },
  fr: {
    title: "Températures à cœur de sécurité",
    content: `Températures minimales à cœur publiées par les agences de sécurité alimentaire (USDA FSIS). Mesurez toujours avec un thermomètre de cuisine dans la partie la plus épaisse, sans toucher l'os.

Volaille (poulet, dinde, canard — entière, en morceaux ou hachée) : 74 °C / 165 °F.

Viande hachée (bœuf, porc, veau, agneau), burgers et saucisses : 71 °C / 160 °F.

Pièces entières de bœuf, porc, veau et agneau (steaks, côtes, rôtis) : 63 °C / 145 °F, puis au moins 3 minutes de repos. Un steak servi bleu ou saignant se situe en dessous de cette recommandation ; c'est un choix personnel, déconseillé aux femmes enceintes, aux jeunes enfants, aux personnes âgées ou immunodéprimées.

Poissons et fruits de mer : 63 °C / 145 °F, ou jusqu'à ce que la chair soit opaque et s'effeuille facilement.

Plats à base d'œufs : 71 °C / 160 °F. Restes et plats mijotés : réchauffer à 74 °C / 165 °F.

Ne laissez pas d'aliments cuits à température ambiante plus de 2 heures (1 heure au-delà de 32 °C). Réfrigérez rapidement et séparez les viandes crues des aliments prêts à consommer. Lavez-vous les mains, ainsi que les planches et ustensiles, après avoir manipulé de la viande, de la volaille ou du poisson crus.`,
  },
};

const GUIDES: Record<Locale, { key: string; title: string; content: string }[]> = {
  en: [
    {
      key: "guide-air-frying",
      title: "Air frying fundamentals",
      content: `Air fryers cook with fast-moving hot air, so results depend on air reaching the food.

Dry food thoroughly before cooking; surface moisture prevents browning. Use a small amount of oil (about a teaspoon to a tablespoon) for fresh vegetables and potatoes. Arrange food in a single, loose layer and cook in batches rather than overfilling the basket. Shake the basket or turn the food halfway through for even colour.

Adapting a conventional oven recipe: as a starting point, lower the oven temperature by about 20 °C (25 °F) and reduce the time by roughly 20 %, then check early. These are general rules of thumb, not manufacturer settings — always confirm doneness with a thermometer for meat, poultry and fish.

Never exceed the maximum temperature documented for your model, and only use programs your model actually has.`,
    },
    {
      key: "guide-indoor-grill",
      title: "Indoor grilling fundamentals",
      content: `Lidded indoor grills sear food on a preheated grill plate while hot air circulates under the closed lid.

Always let the appliance finish preheating before adding food; a hot plate gives grill marks and prevents sticking. Pat food dry and oil the food rather than the plate. Use an oil with a high smoke point for high-heat grilling. Fatty cuts and sugary marinades produce more smoke — ventilate the kitchen and wipe off excess marinade.

Cook meat to internal temperature rather than by time: thickness and starting temperature change cooking times considerably. Rest steaks and chops for a few minutes before slicing.

Some grills are set by level (for example LOW, MED, HIGH, MAX) instead of by degrees. Use the level names shown on your model and do not assume a degree value unless your owner's guide states it.`,
    },
    {
      key: "guide-frozen-desserts",
      title: "Frozen dessert maker fundamentals",
      content: `Pint-processing dessert makers work on a base that is already frozen solid, which is different from churn-style ice cream makers.

Fill the container only up to the max fill line. Freeze it upright on a level surface with the lid on; a base frozen at an angle must not be processed. Ninja says to freeze the base overnight, and 24 hours is the commonly reported practice for a fully frozen pint.

Choose the program that matches the base: richer dairy bases for the ice cream or gelato programs, fruit-based bases for the sorbet program. If the result is crumbly or powdery after the first pass, add a tablespoon of liquid (milk for dairy bases, juice or water for sorbets) and process once more.

Mix-ins such as chocolate chips or biscuit pieces are added after the base has been processed: make a hole in the centre, add the pieces and run the mix-in program. Containers of different sizes are not interchangeable between models.`,
    },
  ],
  fr: [
    {
      key: "guide-air-frying",
      title: "Les bases de la cuisson à l'air fryer",
      content: `Un air fryer cuit grâce à un flux d'air chaud rapide : le résultat dépend de la circulation de l'air autour des aliments.

Séchez soigneusement les aliments avant cuisson ; l'humidité en surface empêche de dorer. Utilisez un peu d'huile (d'une cuillère à café à une cuillère à soupe) pour les légumes frais et les pommes de terre. Disposez les aliments en une seule couche aérée et procédez en plusieurs fournées plutôt que de surcharger le panier. Secouez le panier ou retournez les aliments à mi-cuisson pour une coloration uniforme.

Adapter une recette de four traditionnel : comme point de départ, baissez la température d'environ 20 °C et réduisez le temps d'environ 20 %, puis contrôlez tôt. Ce sont des repères généraux, pas des réglages constructeur — vérifiez toujours la cuisson des viandes, volailles et poissons au thermomètre.

Ne dépassez jamais la température maximale documentée pour votre modèle et n'utilisez que les programmes réellement présents sur celui-ci.`,
    },
    {
      key: "guide-indoor-grill",
      title: "Les bases du gril d'intérieur",
      content: `Un gril d'intérieur à couvercle saisit les aliments sur une plaque préchauffée pendant que l'air chaud circule sous le couvercle fermé.

Attendez toujours la fin du préchauffage avant de déposer les aliments ; une plaque bien chaude marque la viande et évite qu'elle n'attache. Séchez les aliments et huilez-les plutôt que la plaque. Choisissez une huile à point de fumée élevé pour les cuissons vives. Les pièces grasses et les marinades sucrées dégagent davantage de fumée — aérez la cuisine et essuyez l'excédent de marinade.

Cuisez la viande à la température à cœur plutôt qu'à la minute : l'épaisseur et la température de départ modifient fortement les temps. Laissez reposer steaks et côtes quelques minutes avant de trancher.

Certains grils se règlent par niveau (par exemple LOW, MED, HIGH, MAX) et non en degrés. Utilisez les noms de niveaux affichés sur votre modèle et ne supposez aucune valeur en degrés si votre notice ne l'indique pas.`,
    },
    {
      key: "guide-frozen-desserts",
      title: "Les bases des turbines à pot congelé",
      content: `Les turbines à pot travaillent une base déjà congelée à cœur, contrairement aux sorbetières classiques.

Remplissez le pot sans dépasser le repère maximal. Congelez-le debout, à plat, couvercle fermé ; une base congelée de travers ne doit pas être turbinée. Ninja indique de congeler la base une nuit, et 24 heures est la pratique couramment rapportée pour un pot congelé à cœur.

Choisissez le programme adapté à la base : bases lactées riches pour les programmes glace ou gelato, bases aux fruits pour le programme sorbet. Si le résultat est friable ou poudreux après le premier passage, ajoutez une cuillère à soupe de liquide (lait pour les bases lactées, jus ou eau pour les sorbets) et turbinez une seconde fois.

Les ajouts comme les pépites de chocolat ou les morceaux de biscuit s'incorporent une fois la base turbinée : creusez un puits au centre, ajoutez les morceaux et lancez le programme d'ajouts (mix-in). Les pots de tailles différentes ne sont pas interchangeables entre modèles.`,
    },
  ],
};

function recipeDocs(locale: Locale): SeedKnowledgeDocument[] {
  const fr = locale === "fr";
  return SEED_RECIPES.map((seed) => {
    const r = localizeSeedRecipe(seed, locale);
    const models = SEED_DEVICES.filter((d) => seed.compatibleModelIds.includes(d.id)).map((d) => d.modelNumber);
    const content = [
      `${r.title}. ${r.description}`,
      fr
        ? `Recette de démonstration CookPilot (non testée physiquement). Appareil : ${r.deviceCategory}. Modèles compatibles sur le papier : ${models.join(", ")}. Pour ${r.servings} personnes.`
        : `CookPilot demonstration recipe (not physically tested). Appliance: ${r.deviceCategory}. Compatible on paper with: ${models.join(", ")}. Serves ${r.servings}.`,
      (fr ? "Ingrédients : " : "Ingredients: ") +
        r.ingredients.map((i) => `${i.quantity ?? ""}${i.unit && i.unit !== "piece" ? ` ${i.unit}` : ""} ${i.name}`.trim()).join("; "),
      ...r.steps.map((s) => {
        const meta = [
          s.program,
          s.level,
          s.temperatureC != null ? `${s.temperatureC} °C` : null,
          s.durationSeconds != null ? formatDuration(s.durationSeconds, locale) : null,
        ].filter(Boolean);
        return `${s.position}. ${s.instruction}${meta.length ? ` [${meta.join(", ")}]` : ""}`;
      }),
      (fr ? "Sécurité : " : "Safety: ") + r.safetyNotes.join(" "),
    ].join("\n");
    return {
      key: `recipe-${seed.slug}-${locale}`,
      title: r.title,
      source: "CookPilot demonstration recipes",
      sourceUrl: null,
      manufacturer: null,
      modelNumber: null,
      language: locale,
      docType: "recipe" as const,
      publishedAt: "2026-11-09",
      verificationStatus: "partial" as const,
      rightsNote: "Original CookPilot recipe. Demonstration content, not physically tested.",
      content: `[recipe:${seed.id}]\n${content}`,
    };
  });
}

export function buildSeedKnowledge(): SeedKnowledgeDocument[] {
  const docs: SeedKnowledgeDocument[] = [];
  for (const locale of LOCALES) {
    for (const model of SEED_DEVICES) docs.push(deviceToKnowledge(model, locale));
    docs.push({
      key: `food-safety-${locale}`,
      title: FOOD_SAFETY[locale].title,
      source: "USDA FSIS — Safe Minimum Internal Temperature Chart (summarised)",
      sourceUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
      manufacturer: null,
      modelNumber: null,
      language: locale,
      docType: "food_safety",
      publishedAt: null,
      verificationStatus: "documented",
      rightsNote: "Summary in our own words of public-domain U.S. government guidance.",
      content: FOOD_SAFETY[locale].content,
    });
    for (const g of GUIDES[locale]) {
      docs.push({
        key: `${g.key}-${locale}`,
        title: g.title,
        source: "CookPilot cooking guides",
        sourceUrl: null,
        manufacturer: null,
        modelNumber: null,
        language: locale,
        docType: "guide",
        publishedAt: "2026-11-09",
        verificationStatus: "documented",
        rightsNote: "Original CookPilot text. General technique guidance, not manufacturer instructions.",
        content: g.content,
      });
    }
    docs.push(...recipeDocs(locale));
  }
  return docs;
}
