# AI architecture

The AI Chef runs entirely on the server (`POST /api/chef/chat`). The browser never sees prompts, API keys or raw model output.

## One turn, step by step

`runChef()` in `src/lib/ai/chef.ts`:

1. **Cost controls** — burst limit (8 messages/minute), monthly generation quota, daily message cap. Refused requests never reach the model.
2. **Conversation** — loaded with an ownership check, or created. The user message is stored.
3. **Context** — preferences, the user's appliances with their documented capabilities, the recipe being viewed (if any).
4. **Retrieval** — `retrieveKnowledge()` embeds the question (cached) and calls `match_knowledge_chunks`, filtered by language and by the user's model numbers so another model's sheet can never be retrieved. Falls back to full-text / BM25 when embeddings are unavailable. Library recipes referenced by retrieved chunks are loaded in full.
5. **Prompt** — `buildSystemPrompt()` lists, per appliance, each program key with its documented limits, and what is *not* documented.
6. **Generation** — the provider streams a JSON document constrained by a response schema. `JsonStringFieldStream` extracts the `reply` field as it arrives, so the user sees text streaming while the structured answer is still being produced.
7. **Validation** — Zod schema, then the deterministic guard-rails below.
8. **Persistence and metering** — the validated payload is stored with the assistant message; a `chef_message` usage event (tokens, estimated cost) is recorded, plus a `recipe_generation` event when the answer contains a recipe.

Events sent to the browser: `meta`, `delta`, `final`, `error`.

## Provider abstraction

`LLMProvider` (`src/lib/ai/provider.ts`) has two methods: `streamStructured()` and `embed()`.

- `gemini.ts` — Google Gemini over REST (streaming SSE, `responseSchema`, `batchEmbedContents` with 768 dimensions). The only file with Gemini-specific code. Models are configurable with `GEMINI_MODEL` and `GEMINI_EMBEDDING_MODEL`.
- `library-provider.ts` — used when no API key is set. It generates nothing: it returns the best library recipe compatible with the user's appliances and labels the answer "Demo answer · library only".

To add a provider, implement the interface and return it from `getLLMProvider()`.

## Structured output

`chefResponseSchema` (`src/lib/ai/schema.ts`): `reply`, `needsClarification`, `clarifyingQuestions`, `provenance`, `knowledgeGap`, `recipe` (ingredients, steps with program / level / temperature / duration, accessories, safety notes, `deviceModelId`, `basedOnRecipeId`) and `followUps`. A unit test keeps the provider JSON schema aligned with the Zod schema. Output that fails validation is discarded, the user is told, and no generation is charged.

## Guard-rails (`src/lib/ai/validate.ts`)

The model is never trusted on appliance facts. After schema validation:

| Check | Action |
| --- | --- |
| Appliance not owned by the user | reference removed |
| Program not documented on the model | program, level and temperature removed, warning shown |
| Model has no documented program at all | all programs removed, "undocumented" warning |
| Temperature outside the documented range | temperature removed |
| Degrees given for a level-only program (e.g. a grill set by LOW/MED/HIGH) | temperature removed |
| Level not in the documented list | level removed |
| `verified` claimed | allowed only if the answer is based on a library recipe that is verified **and** recorded as tested on the user's exact model; otherwise downgraded to `adapted` or `generated` |
| `adapted` without a known source recipe | downgraded to `generated` |
| Meat, poultry or fish without the safe internal temperature | localised note appended |
| Ingredient matching a declared allergy (with synonyms) | warning shown |

Warnings are displayed with the answer under "Checked against your appliance".

## Provenance

Every answer and recipe carries one of:

- **Verified** — physically tested on the exact model (requires an admin-recorded test).
- **Adapted** — adapted from an existing documented recipe.
- **Generated** — AI recommendation, not physically tested.

A saved AI recipe can never be stored as `verified` (enforced in `chefRecipeToRecord()` and by RLS).

## Knowledge base and ingestion

`ingestDocument()` (`src/lib/rag/ingest.ts`): text extraction/cleaning → SHA-256 content hash (de-duplication) → paragraph-aware chunking with overlap → embeddings (optional) → storage. Each document records source, URL, manufacturer, model, language, type, publication date, verification status and a mandatory rights note.

Seeded knowledge (all original text): a capability sheet per model and language generated from the catalogue, a summary of public food-safety temperature guidance, three technique guides and the demo recipes. Admins add documents from **Admin → Knowledge**. Chunks seeded by SQL or ingested without a key are embedded later with `npm run knowledge:ingest`.

Only ingest content you have the right to use. Do not paste copyrighted books or content obtained by bypassing a website's protections.

## Cost control

| Control | Where |
| --- | --- |
| Monthly generations: 5 Free / 60 Pro | `plans.ts`, counted from `usage_events` |
| Daily messages: 15 Free / 150 Pro | `chef.ts` |
| Burst: 8 per minute per user | `rate-limit.ts` |
| Input: 2 000 characters; history: last 10 messages, 1 500 characters each | `schema.ts`, `chef.ts` |
| Output: 4 096 tokens; 60 s timeout | `chef.ts` |
| Query-embedding cache | `retrieve.ts` |
| Cost estimates per request | `cost.ts` → **Admin → AI & plans** |

Only chat turns call the model. Listing, filtering, favourites, cooking mode and every other operation are plain database queries.

## Personalisation and memory

Allergies, diets, dislikes, units and default servings are always applied. Favourite cuisines and experience level are used on Pro ("personalised recipes"). Conversations are stored so users can resume them; Free shows 30 days. Users can delete conversations individually, export everything, or delete their account.
