import type { Difficulty, I18nText, Locale, Provenance, Recipe, RecipeSummary } from "@/lib/domain/types";
import { DEVICE_IDS, seedId } from "./devices";

/**
 * Demonstration recipes.
 *
 * These are original CookPilot recipes written for the demo library. None of them has been
 * physically tested on a specific appliance model, so none is labelled "verified" and every
 * compatibility entry has `tested: false`. They are flagged `isDemo` and shown as such in the UI.
 */

interface SeedIngredient {
  name: I18nText;
  quantity: number | null;
  unit: string | null;
  note?: I18nText;
  optional?: boolean;
}

interface SeedStep {
  instruction: I18nText;
  program?: string;
  level?: string;
  temperatureC?: number;
  durationSeconds?: number;
  tip?: I18nText;
}

export interface SeedRecipe {
  id: string;
  slug: string;
  title: I18nText;
  description: I18nText;
  illustration: string;
  category: string;
  cuisine: string | null;
  dietary: string[];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  deviceCategory: string;
  programs: string[];
  accessories: I18nText[];
  ingredients: SeedIngredient[];
  steps: SeedStep[];
  safetyNotes: I18nText[];
  compatibleModelIds: string[];
  provenance: Provenance;
  sourceNote: I18nText;
}

const NOT_TESTED: I18nText = {
  en: "Original CookPilot demonstration recipe. Not yet physically tested on a specific model — check doneness yourself and adjust times to your appliance.",
  fr: "Recette de démonstration originale CookPilot. Pas encore testée physiquement sur un modèle précis — vérifiez la cuisson et ajustez les temps à votre appareil.",
};

const AIR_FRYERS = [DEVICE_IDS.af101, DEVICE_IDS.af300eu];
const CREAMIS = [DEVICE_IDS.nc301, DEVICE_IDS.nc300eu];

export const SEED_RECIPES: SeedRecipe[] = [
  {
    id: seedId("0ec1", 1),
    slug: "lemon-herb-chicken-thighs",
    title: { en: "Lemon & herb chicken thighs", fr: "Hauts de cuisse de poulet citron et herbes" },
    description: {
      en: "Bone-in thighs with crackling skin and a bright lemon, garlic and thyme rub. A weeknight staple that needs almost no attention.",
      fr: "Des hauts de cuisse à la peau croustillante, frottés au citron, à l'ail et au thym. Un classique de semaine qui demande très peu d'attention.",
    },
    illustration: "chicken",
    category: "main",
    cuisine: "mediterranean",
    dietary: ["gluten-free", "dairy-free"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 24,
    difficulty: "easy",
    deviceCategory: "air-fryer",
    programs: ["air-fry"],
    accessories: [{ en: "Instant-read thermometer", fr: "Thermomètre à lecture instantanée" }],
    ingredients: [
      { name: { en: "Bone-in, skin-on chicken thighs", fr: "Hauts de cuisse de poulet avec os et peau" }, quantity: 4, unit: "piece", note: { en: "about 600 g", fr: "environ 600 g" } },
      { name: { en: "Olive oil", fr: "Huile d'olive" }, quantity: 1, unit: "tbsp" },
      { name: { en: "Lemon", fr: "Citron" }, quantity: 1, unit: "piece", note: { en: "zest and juice", fr: "zeste et jus" } },
      { name: { en: "Garlic cloves, finely grated", fr: "Gousses d'ail finement râpées" }, quantity: 2, unit: "clove" },
      { name: { en: "Fresh thyme leaves", fr: "Feuilles de thym frais" }, quantity: 2, unit: "tsp" },
      { name: { en: "Fine sea salt", fr: "Sel fin" }, quantity: 1, unit: "tsp" },
      { name: { en: "Black pepper", fr: "Poivre noir" }, quantity: null, unit: null, note: { en: "to taste", fr: "selon le goût" } },
    ],
    steps: [
      {
        instruction: {
          en: "Pat the chicken thighs very dry with kitchen paper. Mix the oil, lemon zest, garlic, thyme, salt and pepper, then rub it all over the chicken, including under the skin.",
          fr: "Séchez soigneusement les hauts de cuisse avec du papier absorbant. Mélangez l'huile, le zeste de citron, l'ail, le thym, le sel et le poivre, puis frottez-en le poulet, y compris sous la peau.",
        },
        tip: { en: "Dry skin is what makes it crisp.", fr: "Une peau bien sèche est le secret du croustillant." },
      },
      {
        instruction: {
          en: "Preheat the air fryer on Air Fry at 200 °C for 3 minutes.",
          fr: "Préchauffez l'air fryer en mode Air Fry à 200 °C pendant 3 minutes.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 180,
      },
      {
        instruction: {
          en: "Place the thighs skin-side down in a single layer. Cook for 12 minutes.",
          fr: "Déposez les hauts de cuisse côté peau vers le bas, en une seule couche. Faites cuire 12 minutes.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 720,
      },
      {
        instruction: {
          en: "Turn the thighs skin-side up and cook for 10–12 minutes more, until the skin is deep golden and the thickest part reaches 74 °C.",
          fr: "Retournez les hauts de cuisse, peau vers le haut, et poursuivez la cuisson 10 à 12 minutes, jusqu'à ce que la peau soit bien dorée et que la partie la plus épaisse atteigne 74 °C.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 660,
        tip: { en: "Measure next to the bone without touching it.", fr: "Mesurez près de l'os, sans le toucher." },
      },
      {
        instruction: {
          en: "Rest for 5 minutes, squeeze over the lemon juice and serve.",
          fr: "Laissez reposer 5 minutes, arrosez de jus de citron et servez.",
        },
        durationSeconds: 300,
      },
    ],
    safetyNotes: [
      {
        en: "Poultry is safe to eat once the thickest part reaches 74 °C (165 °F). Use a thermometer rather than colour.",
        fr: "La volaille est sûre lorsque la partie la plus épaisse atteint 74 °C (165 °F). Fiez-vous à un thermomètre plutôt qu'à la couleur.",
      },
      {
        en: "Wash hands, boards and utensils after handling raw chicken.",
        fr: "Lavez-vous les mains, ainsi que les planches et ustensiles, après avoir manipulé du poulet cru.",
      },
    ],
    compatibleModelIds: AIR_FRYERS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 2),
    slug: "crispy-potato-wedges",
    title: { en: "Crispy paprika potato wedges", fr: "Potatoes croustillantes au paprika" },
    description: {
      en: "Soaked, dried and lightly oiled wedges that come out crisp at the edges and fluffy inside.",
      fr: "Des quartiers de pommes de terre trempés, séchés et légèrement huilés : croustillants sur les bords, moelleux à cœur.",
    },
    illustration: "wedges",
    category: "side",
    cuisine: null,
    dietary: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 22,
    difficulty: "easy",
    deviceCategory: "air-fryer",
    programs: ["air-fry"],
    accessories: [],
    ingredients: [
      { name: { en: "Floury potatoes", fr: "Pommes de terre à chair farineuse" }, quantity: 500, unit: "g" },
      { name: { en: "Neutral oil", fr: "Huile neutre" }, quantity: 1, unit: "tbsp" },
      { name: { en: "Smoked paprika", fr: "Paprika fumé" }, quantity: 1, unit: "tsp" },
      { name: { en: "Garlic powder", fr: "Ail en poudre" }, quantity: 0.5, unit: "tsp", optional: true },
      { name: { en: "Fine sea salt", fr: "Sel fin" }, quantity: 0.5, unit: "tsp" },
    ],
    steps: [
      {
        instruction: {
          en: "Cut the potatoes into even wedges, about 2 cm thick. Soak in cold water for 10 minutes, then drain and dry thoroughly in a clean towel.",
          fr: "Coupez les pommes de terre en quartiers réguliers d'environ 2 cm d'épaisseur. Faites-les tremper 10 minutes dans l'eau froide, puis égouttez et séchez-les soigneusement dans un torchon propre.",
        },
        durationSeconds: 600,
      },
      {
        instruction: {
          en: "Toss the wedges with the oil, paprika, garlic powder and salt until evenly coated.",
          fr: "Mélangez les quartiers avec l'huile, le paprika, l'ail en poudre et le sel jusqu'à ce qu'ils soient bien enrobés.",
        },
      },
      {
        instruction: {
          en: "Cook on Air Fry at 200 °C for 10 minutes in a single, loose layer.",
          fr: "Faites cuire en mode Air Fry à 200 °C pendant 10 minutes, en une seule couche aérée.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 600,
        tip: { en: "Crowding the basket steams the potatoes — cook in two batches if needed.", fr: "Un panier trop rempli fait cuire les pommes de terre à la vapeur — procédez en deux fois si besoin." },
      },
      {
        instruction: {
          en: "Shake the basket well, then cook for 10–12 minutes more until golden and crisp.",
          fr: "Secouez bien le panier, puis poursuivez la cuisson 10 à 12 minutes jusqu'à ce qu'elles soient dorées et croustillantes.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 660,
      },
    ],
    safetyNotes: [
      {
        en: "The basket and drawer are very hot after cooking — use the handle and place the drawer on a heat-proof surface.",
        fr: "Le panier et le tiroir sont très chauds après la cuisson — utilisez la poignée et posez le tiroir sur une surface résistante à la chaleur.",
      },
    ],
    compatibleModelIds: AIR_FRYERS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 3),
    slug: "honey-thyme-roasted-carrots",
    title: { en: "Honey & thyme roasted carrots", fr: "Carottes rôties au miel et au thym" },
    description: {
      en: "Tender, lightly caramelised carrots finished with honey and thyme. Simple enough for a Tuesday, pretty enough for guests.",
      fr: "Des carottes tendres et légèrement caramélisées, relevées de miel et de thym. Assez simples pour un mardi soir, assez jolies pour recevoir.",
    },
    illustration: "carrots",
    category: "side",
    cuisine: "french",
    dietary: ["vegetarian", "gluten-free", "dairy-free"],
    servings: 2,
    prepMinutes: 8,
    cookMinutes: 16,
    difficulty: "easy",
    deviceCategory: "air-fryer",
    programs: ["roast"],
    accessories: [],
    ingredients: [
      { name: { en: "Carrots", fr: "Carottes" }, quantity: 400, unit: "g", note: { en: "halved lengthways if thick", fr: "coupées en deux dans la longueur si elles sont épaisses" } },
      { name: { en: "Olive oil", fr: "Huile d'olive" }, quantity: 1, unit: "tbsp" },
      { name: { en: "Honey", fr: "Miel" }, quantity: 2, unit: "tsp" },
      { name: { en: "Fresh thyme sprigs", fr: "Brins de thym frais" }, quantity: 3, unit: "sprig" },
      { name: { en: "Fine sea salt", fr: "Sel fin" }, quantity: 0.5, unit: "tsp" },
    ],
    steps: [
      {
        instruction: {
          en: "Toss the carrots with the olive oil and salt.",
          fr: "Mélangez les carottes avec l'huile d'olive et le sel.",
        },
      },
      {
        instruction: {
          en: "Cook on Roast at 190 °C for 12 minutes, shaking the basket halfway through.",
          fr: "Faites cuire en mode Roast à 190 °C pendant 12 minutes, en secouant le panier à mi-cuisson.",
        },
        program: "roast",
        temperatureC: 190,
        durationSeconds: 720,
      },
      {
        instruction: {
          en: "Drizzle over the honey, add the thyme and toss. Cook for 3–4 minutes more, until glossy and tender when pierced with a knife.",
          fr: "Arrosez de miel, ajoutez le thym et mélangez. Poursuivez la cuisson 3 à 4 minutes, jusqu'à ce que les carottes soient brillantes et tendres sous la pointe d'un couteau.",
        },
        program: "roast",
        temperatureC: 190,
        durationSeconds: 210,
        tip: { en: "Honey burns quickly — add it only at the end.", fr: "Le miel brûle vite — ajoutez-le seulement en fin de cuisson." },
      },
    ],
    safetyNotes: [
      {
        en: "Honey is not suitable for children under one year old.",
        fr: "Le miel ne convient pas aux enfants de moins d'un an.",
      },
    ],
    compatibleModelIds: AIR_FRYERS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 4),
    slug: "lemon-dill-salmon",
    title: { en: "Salmon fillets with lemon & dill", fr: "Pavés de saumon au citron et à l'aneth" },
    description: {
      en: "Just-cooked salmon with a crisp top and a quick lemon-dill dressing. On the table in a quarter of an hour.",
      fr: "Un saumon cuit juste à point, doré en surface, avec une sauce minute au citron et à l'aneth. À table en un quart d'heure.",
    },
    illustration: "salmon",
    category: "main",
    cuisine: "nordic",
    dietary: ["gluten-free", "pescatarian", "dairy-free"],
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    difficulty: "easy",
    deviceCategory: "air-fryer",
    programs: ["air-fry"],
    accessories: [{ en: "Instant-read thermometer", fr: "Thermomètre à lecture instantanée" }],
    ingredients: [
      { name: { en: "Salmon fillets, skin on", fr: "Pavés de saumon avec la peau" }, quantity: 2, unit: "piece", note: { en: "about 150 g each", fr: "environ 150 g chacun" } },
      { name: { en: "Olive oil", fr: "Huile d'olive" }, quantity: 2, unit: "tsp" },
      { name: { en: "Fine sea salt", fr: "Sel fin" }, quantity: 0.5, unit: "tsp" },
      { name: { en: "Lemon juice", fr: "Jus de citron" }, quantity: 1, unit: "tbsp" },
      { name: { en: "Chopped fresh dill", fr: "Aneth frais ciselé" }, quantity: 1, unit: "tbsp" },
    ],
    steps: [
      {
        instruction: {
          en: "Pat the salmon dry, rub with half the oil and season with salt.",
          fr: "Séchez le saumon, frottez-le avec la moitié de l'huile et salez.",
        },
      },
      {
        instruction: {
          en: "Cook skin-side down on Air Fry at 200 °C for 8–10 minutes, depending on thickness, until the flesh flakes easily and the centre reaches 63 °C.",
          fr: "Faites cuire côté peau vers le bas en mode Air Fry à 200 °C pendant 8 à 10 minutes selon l'épaisseur, jusqu'à ce que la chair s'effeuille facilement et que le cœur atteigne 63 °C.",
        },
        program: "air-fry",
        temperatureC: 200,
        durationSeconds: 540,
      },
      {
        instruction: {
          en: "Stir together the lemon juice, dill and remaining oil. Spoon over the salmon and serve straight away.",
          fr: "Mélangez le jus de citron, l'aneth et le reste d'huile. Nappez le saumon et servez aussitôt.",
        },
      },
    ],
    safetyNotes: [
      {
        en: "Food-safety agencies recommend cooking fish to an internal temperature of 63 °C (145 °F).",
        fr: "Les agences de sécurité alimentaire recommandent de cuire le poisson à une température à cœur de 63 °C (145 °F).",
      },
      { en: "Contains fish.", fr: "Contient du poisson." },
    ],
    compatibleModelIds: AIR_FRYERS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 5),
    slug: "grilled-ribeye-steak",
    title: { en: "Grilled ribeye with garlic butter", fr: "Entrecôte grillée au beurre d'ail" },
    description: {
      en: "A thick ribeye seared on a hot grill plate and finished with garlic-parsley butter. Cook to temperature, not to time.",
      fr: "Une entrecôte épaisse saisie sur une plaque bien chaude et terminée au beurre d'ail et persil. Cuisez à la température, pas à la minute.",
    },
    illustration: "steak",
    category: "main",
    cuisine: "steakhouse",
    dietary: ["gluten-free"],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 10,
    difficulty: "medium",
    deviceCategory: "indoor-grill",
    programs: ["grill"],
    accessories: [
      { en: "Grill plate", fr: "Plaque de gril" },
      { en: "Instant-read thermometer", fr: "Thermomètre à lecture instantanée" },
    ],
    ingredients: [
      { name: { en: "Ribeye steak, 3 cm thick", fr: "Entrecôte de 3 cm d'épaisseur" }, quantity: 500, unit: "g", note: { en: "at room temperature for 30 minutes", fr: "sortie 30 minutes à l'avance" } },
      { name: { en: "Neutral oil with a high smoke point", fr: "Huile neutre à point de fumée élevé" }, quantity: 2, unit: "tsp" },
      { name: { en: "Flaky sea salt", fr: "Fleur de sel" }, quantity: 1, unit: "tsp" },
      { name: { en: "Butter, softened", fr: "Beurre mou" }, quantity: 30, unit: "g" },
      { name: { en: "Garlic clove, finely grated", fr: "Gousse d'ail finement râpée" }, quantity: 1, unit: "clove" },
      { name: { en: "Chopped flat-leaf parsley", fr: "Persil plat ciselé" }, quantity: 1, unit: "tbsp" },
    ],
    steps: [
      {
        instruction: {
          en: "Mash the butter with the garlic and parsley and set aside. Pat the steak dry, rub with oil and season generously with salt.",
          fr: "Écrasez le beurre avec l'ail et le persil, puis réservez. Séchez l'entrecôte, huilez-la et salez généreusement.",
        },
      },
      {
        instruction: {
          en: "Fit the grill plate, close the lid and preheat on Grill, HIGH, until the appliance signals it is ready.",
          fr: "Installez la plaque de gril, fermez le couvercle et préchauffez en mode Grill, niveau HIGH, jusqu'à ce que l'appareil signale qu'il est prêt.",
        },
        program: "grill",
        level: "HIGH",
        tip: { en: "A fully preheated plate gives proper grill marks.", fr: "Une plaque bien préchauffée assure un beau marquage." },
      },
      {
        instruction: {
          en: "Lay the steak on the plate, close the lid and grill for 4 minutes.",
          fr: "Posez l'entrecôte sur la plaque, fermez le couvercle et faites griller 4 minutes.",
        },
        program: "grill",
        level: "HIGH",
        durationSeconds: 240,
      },
      {
        instruction: {
          en: "Flip and grill for 3–5 minutes more. Start checking early: remove at 52–54 °C for medium-rare (it will rise a few degrees while resting), or 63 °C for the officially recommended doneness.",
          fr: "Retournez et faites griller encore 3 à 5 minutes. Contrôlez tôt : retirez à 52–54 °C pour une cuisson saignante à rosée (la température monte encore de quelques degrés au repos), ou à 63 °C pour la cuisson officiellement recommandée.",
        },
        program: "grill",
        level: "HIGH",
        durationSeconds: 240,
      },
      {
        instruction: {
          en: "Top with the garlic butter and rest for 5 minutes before slicing against the grain.",
          fr: "Déposez le beurre d'ail sur la viande et laissez reposer 5 minutes avant de trancher perpendiculairement aux fibres.",
        },
        durationSeconds: 300,
      },
    ],
    safetyNotes: [
      {
        en: "Food-safety agencies recommend 63 °C (145 °F) plus a 3-minute rest for whole cuts of beef. Medium-rare is below that; it is a personal choice and not advised for pregnant, elderly or immunocompromised people.",
        fr: "Les agences de sécurité alimentaire recommandent 63 °C (145 °F) suivis de 3 minutes de repos pour les pièces de bœuf entières. Une cuisson saignante se situe en dessous : c'est un choix personnel, déconseillé aux femmes enceintes, aux personnes âgées ou immunodéprimées.",
      },
      {
        en: "Grilling fatty cuts produces smoke — keep the appliance clear of cupboards and ventilate the kitchen.",
        fr: "La cuisson de pièces grasses dégage de la fumée — éloignez l'appareil des placards et aérez la cuisine.",
      },
      { en: "Contains milk (butter).", fr: "Contient du lait (beurre)." },
    ],
    compatibleModelIds: [DEVICE_IDS.ag301],
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 6),
    slug: "grilled-vegetable-skewers",
    title: { en: "Grilled vegetable skewers with herb oil", fr: "Brochettes de légumes grillés à l'huile d'herbes" },
    description: {
      en: "Courgette, pepper, red onion and mushrooms, lightly charred and brushed with a lemony herb oil.",
      fr: "Courgette, poivron, oignon rouge et champignons, légèrement grillés et badigeonnés d'une huile d'herbes citronnée.",
    },
    illustration: "skewers",
    category: "main",
    cuisine: "mediterranean",
    dietary: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 10,
    difficulty: "easy",
    deviceCategory: "indoor-grill",
    programs: ["grill"],
    accessories: [
      { en: "Grill plate", fr: "Plaque de gril" },
      { en: "Short skewers that fit under the closed lid", fr: "Piques courtes tenant sous le couvercle fermé" },
    ],
    ingredients: [
      { name: { en: "Courgette, in thick half-moons", fr: "Courgette en demi-rondelles épaisses" }, quantity: 1, unit: "piece" },
      { name: { en: "Red pepper, in 3 cm pieces", fr: "Poivron rouge en morceaux de 3 cm" }, quantity: 1, unit: "piece" },
      { name: { en: "Red onion, in wedges", fr: "Oignon rouge en quartiers" }, quantity: 1, unit: "piece" },
      { name: { en: "Chestnut mushrooms", fr: "Champignons de Paris bruns" }, quantity: 150, unit: "g" },
      { name: { en: "Olive oil", fr: "Huile d'olive" }, quantity: 2, unit: "tbsp" },
      { name: { en: "Lemon juice", fr: "Jus de citron" }, quantity: 1, unit: "tbsp" },
      { name: { en: "Chopped parsley and oregano", fr: "Persil et origan ciselés" }, quantity: 2, unit: "tbsp" },
      { name: { en: "Fine sea salt", fr: "Sel fin" }, quantity: 0.5, unit: "tsp" },
    ],
    steps: [
      {
        instruction: {
          en: "If you use wooden skewers, soak them in water for 15 minutes. Thread the vegetables, alternating colours, and brush with half the olive oil. Season with salt.",
          fr: "Si vous utilisez des piques en bois, faites-les tremper 15 minutes dans l'eau. Enfilez les légumes en alternant les couleurs, puis badigeonnez-les de la moitié de l'huile d'olive. Salez.",
        },
      },
      {
        instruction: {
          en: "Fit the grill plate, close the lid and preheat on Grill, MED.",
          fr: "Installez la plaque de gril, fermez le couvercle et préchauffez en mode Grill, niveau MED.",
        },
        program: "grill",
        level: "MED",
      },
      {
        instruction: {
          en: "Grill the skewers for 8–10 minutes, turning them halfway, until tender with charred edges.",
          fr: "Faites griller les brochettes 8 à 10 minutes en les retournant à mi-cuisson, jusqu'à ce que les légumes soient tendres et marqués.",
        },
        program: "grill",
        level: "MED",
        durationSeconds: 540,
      },
      {
        instruction: {
          en: "Mix the remaining oil with the lemon juice and herbs, and brush over the hot skewers.",
          fr: "Mélangez le reste d'huile avec le jus de citron et les herbes, puis badigeonnez-en les brochettes chaudes.",
        },
      },
    ],
    safetyNotes: [
      {
        en: "Skewer tips and the grill plate stay hot — use tongs to turn and serve.",
        fr: "Les pointes des piques et la plaque restent brûlantes — utilisez une pince pour retourner et servir.",
      },
    ],
    compatibleModelIds: [DEVICE_IDS.ag301],
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 7),
    slug: "vanilla-bean-ice-cream",
    title: { en: "Vanilla bean ice cream", fr: "Glace à la vanille en gousse" },
    description: {
      en: "A no-cook cream cheese base that turns into a smooth, scoopable vanilla ice cream. Make the base today, spin it tomorrow.",
      fr: "Une base sans cuisson au fromage frais qui donne une glace vanille lisse et onctueuse. Préparez la base aujourd'hui, turbinez demain.",
    },
    illustration: "vanilla",
    category: "dessert",
    cuisine: null,
    dietary: ["vegetarian", "gluten-free"],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 5,
    difficulty: "easy",
    deviceCategory: "frozen-dessert-maker",
    programs: ["ice-cream"],
    accessories: [{ en: "One CREAMi pint (16 oz / 473 ml) with lid", fr: "Un pot CREAMi (16 oz / 473 ml) avec couvercle" }],
    ingredients: [
      { name: { en: "Full-fat cream cheese, softened", fr: "Fromage frais entier, ramolli" }, quantity: 15, unit: "g" },
      { name: { en: "Caster sugar", fr: "Sucre en poudre" }, quantity: 65, unit: "g" },
      { name: { en: "Vanilla pod, seeds scraped", fr: "Gousse de vanille, graines grattées" }, quantity: 1, unit: "piece", note: { en: "or 1 tsp vanilla extract", fr: "ou 1 c. à café d'extrait de vanille" } },
      { name: { en: "Double (heavy) cream", fr: "Crème liquide entière" }, quantity: 180, unit: "ml" },
      { name: { en: "Whole milk", fr: "Lait entier" }, quantity: 240, unit: "ml" },
    ],
    steps: [
      {
        instruction: {
          en: "Whisk the cream cheese, sugar and vanilla seeds into a smooth paste. Gradually whisk in the cream and milk until the sugar has dissolved.",
          fr: "Fouettez le fromage frais, le sucre et les graines de vanille jusqu'à obtenir une pâte lisse. Incorporez peu à peu la crème et le lait jusqu'à dissolution du sucre.",
        },
      },
      {
        instruction: {
          en: "Pour into the pint without going over the max fill line. Close the lid and freeze on a level surface for 24 hours.",
          fr: "Versez dans le pot sans dépasser le repère de remplissage maximal. Fermez le couvercle et congelez à plat pendant 24 heures.",
        },
        durationSeconds: 86400,
        tip: { en: "A level, fully frozen base is essential for the blade to process it evenly.", fr: "Une base bien plane et entièrement congelée est indispensable pour un turbinage homogène." },
      },
      {
        instruction: {
          en: "Remove the lid, lock the pint into the outer bowl and the machine, and run the Ice Cream program.",
          fr: "Retirez le couvercle, verrouillez le pot dans le bol extérieur puis sur la machine, et lancez le programme Ice Cream.",
        },
        program: "ice-cream",
      },
      {
        instruction: {
          en: "If the texture is crumbly, add a tablespoon of milk and process once more. Serve straight away.",
          fr: "Si la texture est friable, ajoutez une cuillère à soupe de lait et turbinez une seconde fois. Servez aussitôt.",
        },
      },
    ],
    safetyNotes: [
      { en: "Contains milk.", fr: "Contient du lait." },
      {
        en: "Never process a pint that was frozen at an angle or filled above the max line.",
        fr: "Ne turbinez jamais un pot congelé de travers ou rempli au-delà du repère maximal.",
      },
    ],
    compatibleModelIds: CREAMIS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
  {
    id: seedId("0ec1", 8),
    slug: "mango-lime-sorbet",
    title: { en: "Mango & lime sorbet", fr: "Sorbet mangue et citron vert" },
    description: {
      en: "Three ingredients, intensely fruity and naturally dairy-free. The lime keeps the mango bright.",
      fr: "Trois ingrédients, un goût de fruit intense et naturellement sans lactose. Le citron vert réveille la mangue.",
    },
    illustration: "sorbet",
    category: "dessert",
    cuisine: null,
    dietary: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 5,
    difficulty: "easy",
    deviceCategory: "frozen-dessert-maker",
    programs: ["sorbet"],
    accessories: [{ en: "One CREAMi pint (16 oz / 473 ml) with lid", fr: "Un pot CREAMi (16 oz / 473 ml) avec couvercle" }],
    ingredients: [
      { name: { en: "Ripe mango flesh", fr: "Chair de mangue bien mûre" }, quantity: 400, unit: "g" },
      { name: { en: "Caster sugar", fr: "Sucre en poudre" }, quantity: 40, unit: "g", note: { en: "adjust to the sweetness of the fruit", fr: "à ajuster selon le fruit" } },
      { name: { en: "Lime juice", fr: "Jus de citron vert" }, quantity: 2, unit: "tbsp" },
    ],
    steps: [
      {
        instruction: {
          en: "Blend the mango, sugar and lime juice to a completely smooth purée.",
          fr: "Mixez la mangue, le sucre et le jus de citron vert jusqu'à obtenir une purée parfaitement lisse.",
        },
      },
      {
        instruction: {
          en: "Pour into the pint up to the max fill line, tap to remove air pockets, close and freeze on a level surface for 24 hours.",
          fr: "Versez dans le pot jusqu'au repère maximal, tapotez pour chasser les bulles d'air, fermez et congelez à plat pendant 24 heures.",
        },
        durationSeconds: 86400,
      },
      {
        instruction: {
          en: "Remove the lid, lock the pint into the machine and run the Sorbet program.",
          fr: "Retirez le couvercle, verrouillez le pot sur la machine et lancez le programme Sorbet.",
        },
        program: "sorbet",
      },
      {
        instruction: {
          en: "If it looks powdery, add a tablespoon of water or juice and process again until smooth.",
          fr: "Si la texture est poudreuse, ajoutez une cuillère à soupe d'eau ou de jus et turbinez à nouveau jusqu'à obtenir un sorbet lisse.",
        },
      },
    ],
    safetyNotes: [
      {
        en: "Never process a pint that was frozen at an angle or filled above the max line.",
        fr: "Ne turbinez jamais un pot congelé de travers ou rempli au-delà du repère maximal.",
      },
    ],
    compatibleModelIds: CREAMIS,
    provenance: "generated",
    sourceNote: NOT_TESTED,
  },
];

const SEED_DATE = "2026-11-09T00:00:00.000Z";

export function localizeSeedRecipe(seed: SeedRecipe, locale: Locale): Recipe {
  return {
    id: seed.id,
    slug: seed.slug,
    locale,
    title: seed.title[locale],
    description: seed.description[locale],
    coverImage: null,
    illustration: seed.illustration,
    category: seed.category,
    cuisine: seed.cuisine,
    dietary: seed.dietary,
    servings: seed.servings,
    prepMinutes: seed.prepMinutes,
    cookMinutes: seed.cookMinutes,
    difficulty: seed.difficulty,
    deviceCategory: seed.deviceCategory,
    programs: seed.programs,
    accessories: seed.accessories.map((a) => a[locale]),
    ingredients: seed.ingredients.map((i) => ({
      name: i.name[locale],
      quantity: i.quantity,
      unit: i.unit,
      note: i.note?.[locale] ?? null,
      optional: i.optional ?? false,
    })),
    steps: seed.steps.map((s, index) => ({
      position: index + 1,
      instruction: s.instruction[locale],
      program: s.program ?? null,
      level: s.level ?? null,
      temperatureC: s.temperatureC ?? null,
      durationSeconds: s.durationSeconds ?? null,
      tip: s.tip?.[locale] ?? null,
    })),
    safetyNotes: seed.safetyNotes.map((n) => n[locale]),
    compatibility: seed.compatibleModelIds.map((deviceModelId) => ({ deviceModelId, tested: false, notes: null })),
    provenance: seed.provenance,
    sourceNote: seed.sourceNote[locale],
    authorName: "CookPilot",
    ownerId: null,
    status: "published",
    isDemo: true,
    ratingAverage: null,
    ratingCount: 0,
    version: 1,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

export function toSummary(recipe: Recipe): RecipeSummary {
  const { ingredients, steps: _steps, safetyNotes: _safety, ...rest } = recipe;
  return { ...rest, ingredientNames: ingredients.map((i) => i.name) };
}
