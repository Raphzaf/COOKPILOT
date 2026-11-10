"use server";

import { z } from "zod";
import { getLLMProvider } from "@/lib/ai";
import { parseCapabilities, parseI18nLines, parseIngredients, parseLines, parseSources, parseSpecs, parseSteps } from "@/lib/admin/parse";
import type { Locale } from "@/lib/domain/types";
import { ingestDocument } from "@/lib/rag/ingest";
import { slugify } from "@/lib/utils";
import { ActionError, adminAction, type ActionResult } from "./helpers";

const verification = z.enum(["verified", "documented", "partial", "incomplete"]);

const deviceSchema = z.object({
  id: z.string().uuid().optional(),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  modelNumber: z.string().trim().min(1).max(40),
  region: z.string().trim().min(2).max(12),
  descriptionEn: z.string().trim().max(600),
  descriptionFr: z.string().trim().max(600),
  imageUrl: z.string().trim().url().startsWith("https://").max(500).or(z.literal("")),
  specs: z.string().max(4000),
  missingInfo: z.string().max(4000),
  capabilities: z.string().max(8000),
  sources: z.string().max(4000),
  verificationStatus: verification,
  published: z.boolean(),
});

export async function saveDeviceAction(input: z.input<typeof deviceSchema>): Promise<ActionResult<{ id: string }>> {
  return adminAction(async ({ store }) => {
    const data = deviceSchema.parse(input);
    const today = new Date().toISOString().slice(0, 10);
    const sources = parseSources(data.sources, today);
    // A model cannot be called documented/verified without at least one source to back it.
    if ((data.verificationStatus === "verified" || data.verificationStatus === "documented") && sources.length === 0) {
      throw new ActionError("INVALID_INPUT");
    }
    const model = await store.upsertDeviceModel({
      id: data.id,
      slug: slugify(`${data.name}-${data.modelNumber}`),
      brandId: data.brandId,
      categoryId: data.categoryId,
      name: data.name,
      modelNumber: data.modelNumber.toUpperCase(),
      region: data.region.toUpperCase(),
      description: { en: data.descriptionEn, fr: data.descriptionFr || data.descriptionEn },
      imageUrl: data.imageUrl || null,
      specs: parseSpecs(data.specs),
      missingInfo: parseI18nLines(data.missingInfo),
      capabilities: parseCapabilities(data.capabilities),
      sources,
      verificationStatus: data.verificationStatus,
      lastVerifiedAt: today,
      published: data.published,
    });
    return { id: model.id };
  });
}

export async function deleteDeviceAction(id: string): Promise<ActionResult> {
  return adminAction(async ({ store }) => {
    await store.deleteDeviceModel(z.string().uuid().parse(id));
    return null;
  });
}

const recipeSchema = z.object({
  id: z.string().uuid().optional(),
  locale: z.enum(["en", "fr"]),
  slug: z.string().trim().max(80),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(600),
  coverImage: z.string().trim().url().startsWith("https://").max(500).or(z.literal("")),
  category: z.string().trim().min(2).max(30),
  cuisine: z.string().trim().max(40),
  dietary: z.array(z.string().max(30)).max(10),
  servings: z.number().int().min(1).max(24),
  prepMinutes: z.number().int().min(0).max(1440),
  cookMinutes: z.number().int().min(0).max(2880),
  difficulty: z.enum(["easy", "medium", "advanced"]),
  deviceCategory: z.string().trim().min(2).max(40),
  provenance: z.enum(["verified", "adapted", "generated"]),
  status: z.enum(["draft", "published", "archived"]),
  compatibleModelIds: z.array(z.string().uuid()).max(50),
  testedModelIds: z.array(z.string().uuid()).max(50),
  ingredients: z.string().min(1).max(8000),
  steps: z.string().min(1).max(16000),
  accessories: z.string().max(2000),
  safetyNotes: z.string().max(4000),
  sourceNote: z.string().trim().max(600),
});

export async function saveRecipeAction(input: z.input<typeof recipeSchema>): Promise<ActionResult<{ id: string }>> {
  return adminAction(async ({ store }) => {
    const data = recipeSchema.parse(input);
    const steps = parseSteps(data.steps);
    const ingredients = parseIngredients(data.ingredients);
    if (steps.length === 0 || ingredients.length === 0) throw new ActionError("INVALID_INPUT");
    const tested = new Set(data.testedModelIds.filter((id) => data.compatibleModelIds.includes(id)));
    // "Verified" means physically tested on an exact model — refuse the label without a recorded test.
    if (data.provenance === "verified" && tested.size === 0) throw new ActionError("INVALID_INPUT");
    const existing = data.id ? await store.getRecipeInput(data.id) : null;
    const id = await store.upsertRecipe({
      id: data.id,
      meta: {
        slug: data.slug ? slugify(data.slug) : slugify(data.title),
        coverImage: data.coverImage || null,
        illustration: existing?.meta.illustration ?? null,
        category: data.category,
        cuisine: data.cuisine || null,
        dietary: data.dietary,
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        difficulty: data.difficulty,
        deviceCategory: data.deviceCategory,
        programs: [...new Set(steps.map((s) => s.program).filter((p): p is string => Boolean(p)))],
        provenance: data.provenance,
        status: data.status,
        authorName: existing?.meta.authorName ?? "CookPilot",
        compatibility: data.compatibleModelIds.map((deviceModelId) => ({ deviceModelId, tested: tested.has(deviceModelId), notes: null })),
      },
      translations: {
        [data.locale as Locale]: {
          title: data.title,
          description: data.description,
          ingredients,
          steps,
          accessories: parseLines(data.accessories),
          safetyNotes: parseLines(data.safetyNotes),
          sourceNote: data.sourceNote || null,
        },
      },
    });
    return { id };
  });
}

export async function setRecipeStatusAction(id: string, status: string): Promise<ActionResult> {
  return adminAction(async ({ store }) => {
    await store.setRecipeStatus(z.string().uuid().parse(id), z.enum(["draft", "published", "archived"]).parse(status));
    return null;
  });
}

const knowledgeSchema = z.object({
  title: z.string().trim().min(3).max(200),
  source: z.string().trim().min(2).max(200),
  sourceUrl: z.string().trim().url().startsWith("https://").max(500).or(z.literal("")),
  manufacturer: z.string().trim().max(60),
  modelNumber: z.string().trim().max(40),
  language: z.enum(["en", "fr"]),
  docType: z.enum(["manual", "specification", "capability", "recipe", "food_safety", "guide"]),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  verificationStatus: verification,
  rightsNote: z.string().trim().min(10).max(500),
  content: z.string().min(40).max(400_000),
});

export async function ingestKnowledgeAction(input: z.input<typeof knowledgeSchema>): Promise<ActionResult<{ chunks: number; embedded: boolean }>> {
  return adminAction(async ({ store }) => {
    const data = knowledgeSchema.parse(input);
    const result = await ingestDocument(
      store,
      getLLMProvider(),
      {
        title: data.title,
        source: data.source,
        sourceUrl: data.sourceUrl || null,
        manufacturer: data.manufacturer || null,
        modelNumber: data.modelNumber ? data.modelNumber.toUpperCase() : null,
        language: data.language,
        docType: data.docType,
        publishedAt: data.publishedAt || null,
        verificationStatus: data.verificationStatus,
        rightsNote: data.rightsNote,
      },
      data.content,
    );
    return { chunks: result.chunkCount, embedded: result.embedded };
  });
}

export async function deleteKnowledgeAction(id: string): Promise<ActionResult> {
  return adminAction(async ({ store }) => {
    await store.deleteKnowledgeDocument(z.string().uuid().parse(id));
    return null;
  });
}

export async function updateSupportRequestAction(id: string, status: string): Promise<ActionResult> {
  return adminAction(async ({ store }) => {
    await store.updateSupportRequestStatus(z.string().uuid().parse(id), z.enum(["open", "in_review", "resolved"]).parse(status));
    return null;
  });
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  return adminAction(async ({ user, store }) => {
    const target = z.string().min(1).max(80).parse(userId);
    // An admin cannot remove their own access (prevents locking everyone out).
    if (target === user.id) throw new ActionError("FORBIDDEN");
    await store.setUserRole(target, z.enum(["user", "admin"]).parse(role));
    return null;
  });
}
