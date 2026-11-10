import type {
  Brand,
  DeviceCapability,
  DeviceCategory,
  DeviceModel,
  DeviceSource,
  I18nText,
  TemperatureUnit,
} from "@/lib/domain/types";

/**
 * Appliance catalogue seed.
 *
 * RULES (see docs/CONTENT_AND_RECIPE_GUIDELINES.md):
 *  - Only facts found in the public sources listed on each model are recorded.
 *  - Anything we could not confirm is listed in `missingInfo` and left null — never guessed.
 *  - No model here is "verified": that status is reserved for an admin who has checked the
 *    physical appliance or its official owner's guide.
 *  - Similar model numbers are NOT assumed to share capabilities.
 */

export function seedId(namespace: string, n: number): string {
  const ns = namespace.padEnd(4, "0").slice(0, 4);
  return `00000000-0000-4000-8000-${ns}${String(n).padStart(8, "0")}`;
}

const ACCESSED = "2026-11-09";

export const SEED_BRANDS: Brand[] = [
  { id: seedId("b0a0", 1), slug: "ninja", name: "Ninja", manufacturer: "SharkNinja" },
];

export const SEED_CATEGORIES: DeviceCategory[] = [
  {
    id: seedId("ca70", 1),
    slug: "indoor-grill",
    name: { en: "Indoor grill", fr: "Gril d'intérieur" },
    description: {
      en: "Countertop electric grills with a lid and grill plate.",
      fr: "Grils électriques de comptoir avec couvercle et plaque de cuisson.",
    },
  },
  {
    id: seedId("ca70", 2),
    slug: "air-fryer",
    name: { en: "Air fryer", fr: "Air fryer" },
    description: {
      en: "Basket or drawer appliances that cook with fast-circulating hot air.",
      fr: "Appareils à panier ou à tiroir qui cuisent à l'air chaud pulsé.",
    },
  },
  {
    id: seedId("ca70", 3),
    slug: "frozen-dessert-maker",
    name: { en: "Frozen dessert maker", fr: "Turbine à glace" },
    description: {
      en: "Machines that process a frozen base into ice cream, sorbet and more.",
      fr: "Machines qui transforment une base congelée en glace, sorbet et plus encore.",
    },
  },
];

const ninja = SEED_BRANDS[0]!;
const [grill, airFryer, frozen] = SEED_CATEGORIES as [DeviceCategory, DeviceCategory, DeviceCategory];

const PROGRAM_NAMES: Record<string, I18nText> = {
  grill: { en: "Grill", fr: "Grill" },
  "air-crisp": { en: "Air Crisp", fr: "Air Crisp" },
  "air-fry": { en: "Air Fry", fr: "Air Fry" },
  "max-crisp": { en: "Max Crisp", fr: "Max Crisp" },
  roast: { en: "Roast", fr: "Rôtir" },
  bake: { en: "Bake", fr: "Cuire au four" },
  reheat: { en: "Reheat", fr: "Réchauffer" },
  dehydrate: { en: "Dehydrate", fr: "Déshydrater" },
  "ice-cream": { en: "Ice Cream", fr: "Ice Cream (crème glacée)" },
  "lite-ice-cream": { en: "Lite Ice Cream", fr: "Lite Ice Cream (glace allégée)" },
  sorbet: { en: "Sorbet", fr: "Sorbet" },
  gelato: { en: "Gelato", fr: "Gelato" },
  milkshake: { en: "Milkshake", fr: "Milkshake" },
  "smoothie-bowl": { en: "Smoothie Bowl", fr: "Smoothie Bowl" },
  "mix-in": { en: "Mix-in", fr: "Mix-in (ajouts)" },
};

let capCounter = 0;
function program(
  key: string,
  opts: { min?: number; max?: number; unit?: TemperatureUnit; levels?: string[]; notes?: I18nText } = {},
): DeviceCapability {
  capCounter += 1;
  return {
    id: seedId("cab0", capCounter),
    kind: "program",
    key,
    name: PROGRAM_NAMES[key] ?? { en: key, fr: key },
    tempMin: opts.min ?? null,
    tempMax: opts.max ?? null,
    tempUnit: opts.unit ?? null,
    levels: opts.levels ?? [],
    notes: opts.notes ?? null,
  };
}

function extra(kind: "accessory" | "feature", key: string, name: I18nText, notes?: I18nText): DeviceCapability {
  capCounter += 1;
  return { id: seedId("cab0", capCounter), kind, key, name, tempMin: null, tempMax: null, tempUnit: null, levels: [], notes: notes ?? null };
}

let srcCounter = 0;
function source(title: string, url: string, kind: DeviceSource["kind"]): DeviceSource {
  srcCounter += 1;
  return { id: seedId("50c0", srcCounter), title, url, kind, accessedAt: ACCESSED };
}

const L = {
  capacity: { en: "Capacity", fr: "Capacité" },
  power: { en: "Power", fr: "Puissance" },
  programs: { en: "Programs", fr: "Programmes" },
  tempRange: { en: "Temperature range", fr: "Plage de température" },
  container: { en: "Container size", fr: "Taille des pots" },
  drawers: { en: "Drawers", fr: "Tiroirs" },
};

export const SEED_DEVICES: DeviceModel[] = [
  {
    id: seedId("de00", 1),
    slug: "ninja-foodi-grill-ag301",
    brand: ninja,
    category: grill,
    name: "Foodi 5-in-1 Indoor Grill",
    modelNumber: "AG301",
    region: "US",
    description: {
      en: "Lidded indoor grill that also air crisps, roasts, bakes and dehydrates.",
      fr: "Gril d'intérieur à couvercle qui permet aussi de frire à l'air, rôtir, cuire au four et déshydrater.",
    },
    imageUrl: null,
    specs: [
      { key: "programs", label: L.programs, value: "5" },
      { key: "capacity", label: L.capacity, value: "4 qt crisper basket" },
    ],
    missingInfo: [
      {
        en: "Exact temperature in degrees for each grill level (LOW / MED / HIGH / MAX).",
        fr: "Température exacte en degrés de chaque niveau du grill (LOW / MED / HIGH / MAX).",
      },
      {
        en: "Temperature ranges of the Air Crisp, Roast, Bake and Dehydrate programs.",
        fr: "Plages de température des programmes Air Crisp, Roast, Bake et Dehydrate.",
      },
      { en: "Rated power.", fr: "Puissance nominale." },
    ],
    capabilities: [
      program("grill", {
        levels: ["LOW", "MED", "HIGH", "MAX"],
        notes: {
          en: "The grill is set by level, not by degrees.",
          fr: "Le grill se règle par niveau, pas en degrés.",
        },
      }),
      program("air-crisp"),
      program("roast"),
      program("bake"),
      program("dehydrate"),
    ],
    sources: [
      source("Ninja Foodi AG300/AG301/AG302 Owner's Manual (ManualMachine)", "https://manualmachine.com/ninja/foodiag300/20675458-owners-manual", "manual"),
      source("Ninja Foodi 5-in-1 4-qt Indoor Grill & Air Fryer AG301 (Belk listing)", "https://www.belk.com/p/ninja-foodi-5in1-4qt-indoor-grill-air-fryer/8100515AG301.html", "retailer"),
    ],
    verificationStatus: "partial",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 2),
    slug: "ninja-foodi-health-grill-ag301eu",
    brand: ninja,
    category: grill,
    name: "Foodi Health Grill & Air Fryer",
    modelNumber: "AG301EU",
    region: "EU",
    description: {
      en: "European version of the Foodi lidded grill. Its program list has not been confirmed yet.",
      fr: "Version européenne du gril Foodi à couvercle. La liste de ses programmes n'a pas encore été confirmée.",
    },
    imageUrl: null,
    specs: [
      { key: "capacity", label: L.capacity, value: "5.7 L" },
      { key: "power", label: L.power, value: "1760 W" },
    ],
    missingInfo: [
      {
        en: "Official program list and names for the EU model (not assumed to match the US AG301).",
        fr: "Liste et noms officiels des programmes du modèle européen (non supposés identiques à l'AG301 américain).",
      },
      { en: "Temperature ranges and grill levels.", fr: "Plages de température et niveaux du grill." },
    ],
    capabilities: [],
    sources: [
      source("Ninja Foodi Grill & Airfryer AG301EU (Digitec listing)", "https://www.digitec.ch/en/s1/product/ninja-foodi-grill-airfryer-ag301eu-570-l-fryers-17959543", "retailer"),
      source("Ninja Foodi Multi-Function Cooker 1760W (Skroutz listing)", "https://www.skroutz.eu/s/33222598/Ninja-Foodi-Multi-Function-Cooker-5-7lt-1760W-Silver.html", "retailer"),
    ],
    verificationStatus: "incomplete",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 3),
    slug: "ninja-air-fryer-af101",
    brand: ninja,
    category: airFryer,
    name: "Air Fryer 4-Quart",
    modelNumber: "AF101",
    region: "US",
    description: {
      en: "Single-basket air fryer with four programs and a wide 105–400 °F range.",
      fr: "Air fryer à panier unique avec quatre programmes et une large plage de 105 à 400 °F.",
    },
    imageUrl: null,
    specs: [
      { key: "capacity", label: L.capacity, value: "4 qt" },
      { key: "power", label: L.power, value: "1550 W" },
      { key: "programs", label: L.programs, value: "4" },
      { key: "tempRange", label: L.tempRange, value: "105–400 °F" },
    ],
    missingInfo: [
      {
        en: "Temperature range of each individual program (only the overall 105–400 °F range is documented).",
        fr: "Plage de température de chaque programme (seule la plage globale 105–400 °F est documentée).",
      },
    ],
    capabilities: [
      program("air-fry", { max: 400, min: 105, unit: "F", notes: { en: "Overall appliance range; per-program limits not documented.", fr: "Plage globale de l'appareil ; limites par programme non documentées." } }),
      program("roast", { max: 400, min: 105, unit: "F", notes: { en: "Overall appliance range; per-program limits not documented.", fr: "Plage globale de l'appareil ; limites par programme non documentées." } }),
      program("reheat", { max: 400, min: 105, unit: "F", notes: { en: "Overall appliance range; per-program limits not documented.", fr: "Plage globale de l'appareil ; limites par programme non documentées." } }),
      program("dehydrate", { max: 400, min: 105, unit: "F", notes: { en: "Overall appliance range; per-program limits not documented.", fr: "Plage globale de l'appareil ; limites par programme non documentées." } }),
    ],
    sources: [
      source("AF101 Series Ninja Air Fryer Owner's Guide (Ninja support)", "https://old-support.ninjakitchen.com/hc/en-us/articles/4403477105948-AF101-Series-Ninja-Air-Fryer-Owner-s-Guide", "manufacturer"),
      source("Ninja AF101 Owner's Manual (ManualsLib)", "https://www.manualslib.com/manual/2682787/Ninja-Af101.html", "manual"),
      source("Ninja 4qt Air Fryer AF101 (Target listing)", "https://www.target.com/p/product/-/A-53649826", "retailer"),
    ],
    verificationStatus: "documented",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 4),
    slug: "ninja-foodi-dual-zone-af300eu",
    brand: ninja,
    category: airFryer,
    name: "Foodi Dual Zone Air Fryer",
    modelNumber: "AF300EU",
    region: "EU",
    description: {
      en: "Two independent 3.8 L drawers with six programs, plus Sync and Match to coordinate both zones.",
      fr: "Deux tiroirs indépendants de 3,8 L avec six programmes, et les fonctions Sync et Match pour coordonner les deux zones.",
    },
    imageUrl: null,
    specs: [
      { key: "capacity", label: L.capacity, value: "7.6 L (2 × 3.8 L)" },
      { key: "drawers", label: L.drawers, value: "2" },
      { key: "power", label: L.power, value: "2400 W" },
      { key: "programs", label: L.programs, value: "6" },
      { key: "tempRange", label: L.tempRange, value: "40–240 °C (retailer-reported)" },
    ],
    missingInfo: [
      {
        en: "Temperature range of each individual program. The overall 40–240 °C figure comes from retailer listings, not from Ninja's EU manual.",
        fr: "Plage de température de chaque programme. La plage globale de 40 à 240 °C provient de fiches revendeurs, pas du manuel Ninja européen.",
      },
    ],
    capabilities: [
      program("max-crisp"),
      program("air-fry"),
      program("roast"),
      program("bake"),
      program("reheat"),
      program("dehydrate"),
      extra("feature", "sync", { en: "Sync", fr: "Sync" }, {
        en: "Runs different settings in each drawer so both finish at the same time.",
        fr: "Lance des réglages différents dans chaque tiroir pour une fin de cuisson simultanée.",
      }),
      extra("feature", "match", { en: "Match", fr: "Match" }, {
        en: "Copies the settings of one drawer to the other.",
        fr: "Copie les réglages d'un tiroir sur l'autre.",
      }),
    ],
    sources: [
      source("Ninja Foodi Dual Zone AF300EU 7.6 L 2400 W (Multitronic listing)", "https://www.multitronic.fi/en/products/3991489/ninja-foodi-dual-zone-af300eu--7-6-l--1-6-kg--2400-w--airfryer--musta", "retailer"),
      source("Ninja Foodi Dual Zone AF300EU (Galaxus listing)", "https://www.galaxus.de/en/s2/product/ninja-foodi-dual-zone-af300eu-760-l-fryers-17551157", "retailer"),
      source("Ninja Foodi Dual Zone Air Fryer AF300EU (Carrefour UAE listing)", "https://www.carrefouruae.com/mafuae/en/fryer/ninja-foodi-dual-zone-air-fryer-af300eu/p/622356239561", "retailer"),
    ],
    verificationStatus: "partial",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 5),
    slug: "ninja-creami-nc301",
    brand: ninja,
    category: frozen,
    name: "CREAMi 7-in-1 Ice Cream Maker",
    modelNumber: "NC301",
    region: "US",
    description: {
      en: "Processes a frozen 16 oz pint into ice cream, sorbet, gelato and more with seven one-touch programs.",
      fr: "Transforme un pot congelé de 16 oz en glace, sorbet, gelato et plus encore grâce à sept programmes automatiques.",
    },
    imageUrl: null,
    specs: [
      { key: "programs", label: L.programs, value: "7" },
      { key: "container", label: L.container, value: "16 oz pint" },
    ],
    missingInfo: [
      { en: "Rated power.", fr: "Puissance nominale." },
      {
        en: "Official minimum freezing time (Ninja says to freeze the base overnight; 24 hours is the commonly reported practice).",
        fr: "Durée minimale officielle de congélation (Ninja indique de congeler la base une nuit ; 24 heures est la pratique couramment rapportée).",
      },
    ],
    capabilities: [
      program("ice-cream"),
      program("lite-ice-cream"),
      program("sorbet"),
      program("gelato"),
      program("milkshake"),
      program("smoothie-bowl"),
      program("mix-in"),
      extra("feature", "re-spin", { en: "Re-spin", fr: "Re-spin" }, {
        en: "Second pass used when a processed pint is crumbly rather than creamy.",
        fr: "Second passage à utiliser lorsqu'un pot turbiné est friable plutôt que crémeux.",
      }),
      extra("accessory", "pint-16oz", { en: "16 oz CREAMi pint", fr: "Pot CREAMi 16 oz" }, {
        en: "Not interchangeable with CREAMi Deluxe 24 oz pints.",
        fr: "Non interchangeable avec les pots CREAMi Deluxe de 24 oz.",
      }),
    ],
    sources: [
      source("Ninja CREAMi 7-in-1 Ice Cream Maker NC301 (Ninja product page)", "https://www.ninjakitchen.com/products/ninja-creami-zidNC301", "manufacturer"),
      source("Ninja CREAMi 7-in-1 NC301 (SharkNinja)", "https://www.sharkninja.com/ninja-creami-7-in-1-ice-cream-maker/NC301.html", "manufacturer"),
    ],
    verificationStatus: "documented",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 6),
    slug: "ninja-creami-nc300eu",
    brand: ninja,
    category: frozen,
    name: "CREAMi Ice Cream & Frozen Dessert Maker",
    modelNumber: "NC300EU",
    region: "EU",
    description: {
      en: "European CREAMi with seven programs and 473 ml tubs.",
      fr: "CREAMi européenne avec sept programmes et des pots de 473 ml.",
    },
    imageUrl: null,
    specs: [
      { key: "programs", label: L.programs, value: "7" },
      { key: "container", label: L.container, value: "473 ml" },
      { key: "power", label: L.power, value: "800 W" },
    ],
    missingInfo: [
      {
        en: "Official minimum freezing time for the base.",
        fr: "Durée minimale officielle de congélation de la base.",
      },
    ],
    capabilities: [
      program("ice-cream"),
      program("lite-ice-cream", { notes: { en: "Sold as “Light Ice Cream” on EU listings.", fr: "Appelé « Light Ice Cream » sur les fiches européennes." } }),
      program("gelato"),
      program("smoothie-bowl"),
      program("milkshake"),
      program("sorbet"),
      program("mix-in"),
      extra("accessory", "tub-473ml", { en: "473 ml CREAMi tub", fr: "Pot CREAMi 473 ml" }),
    ],
    sources: [
      source("Ninja NC300EU Creami (Galaxus listing)", "https://www.galaxus.de/en/s2/product/ninja-nc300eu-creami-eu-version-ice-cream-machines-ice-makers-21876376", "retailer"),
      source("Heladera Ninja Creami NC300EU, 7 programas, 800 W (MediaMarkt listing)", "https://mediamarkt.es/es/product/_heladera-ninja-creami-nc300eu-7-programas-800-w-450-ml-negro-plateado-1534845.html", "retailer"),
      source("Ninja CREAMi Ice Cream Maker 3×473 ml (Skroutz listing)", "https://www.skroutz.mt/s/37487464/Ninja-CREAMi-Ice-Cream-Maker-3x473ml-Black-Grey.html", "retailer"),
    ],
    verificationStatus: "partial",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
  {
    id: seedId("de00", 7),
    slug: "ninja-creami-deluxe-nc501",
    brand: ninja,
    category: frozen,
    name: "CREAMi Deluxe 11-in-1",
    modelNumber: "NC501",
    region: "US",
    description: {
      en: "Larger CREAMi with eleven one-touch programs and 24 oz pints. Program names not yet documented here.",
      fr: "CREAMi grand format avec onze programmes automatiques et des pots de 24 oz. Les noms des programmes ne sont pas encore documentés ici.",
    },
    imageUrl: null,
    specs: [
      { key: "programs", label: L.programs, value: "11" },
      { key: "container", label: L.container, value: "24 oz pint (3 cups)" },
    ],
    missingInfo: [
      {
        en: "Names of the eleven programs (the count is confirmed, the list is not).",
        fr: "Noms des onze programmes (le nombre est confirmé, la liste ne l'est pas).",
      },
      { en: "Rated power.", fr: "Puissance nominale." },
    ],
    capabilities: [
      extra("accessory", "pint-24oz", { en: "24 oz CREAMi Deluxe pint", fr: "Pot CREAMi Deluxe 24 oz" }, {
        en: "Not interchangeable with 16 oz CREAMi pints.",
        fr: "Non interchangeable avec les pots CREAMi de 16 oz.",
      }),
    ],
    sources: [
      source("Ninja CREAMi (pint compatibility note, Ninja product page)", "https://www.ninjakitchen.com/products/ninja-creami-zidNC301", "manufacturer"),
      source("Soft Serve & Ice Cream Makers (Ninja)", "https://www.ninjakitchen.com/page/ice-cream-makers", "manufacturer"),
    ],
    verificationStatus: "incomplete",
    lastVerifiedAt: ACCESSED,
    published: true,
  },
];

export const DEVICE_IDS = {
  ag301: seedId("de00", 1),
  ag301eu: seedId("de00", 2),
  af101: seedId("de00", 3),
  af300eu: seedId("de00", 4),
  nc301: seedId("de00", 5),
  nc300eu: seedId("de00", 6),
  nc501: seedId("de00", 7),
} as const;
