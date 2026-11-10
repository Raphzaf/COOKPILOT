# Content and recipe guidelines

CookPilot's value is trust: a user must be able to rely on what it says about *their* appliance. These rules apply to the seed data, the admin panel and anything added to the knowledge base.

## Appliance data

1. **Never invent a specification.** Record a program, temperature range, level, capacity or accessory only if a source states it for that exact model number and region.
2. **Never infer from a similar model.** `AG301` and `AG301EU`, or `NC301` and `NC501`, are separate records. If the EU variant's program list is not confirmed, leave it empty.
3. **Empty beats approximate.** Unknown values are `null` and are listed under "Not documented" so the UI and the AI can say "not documented" instead of guessing.
4. **Keep the source's unit.** Store 105–400 °F as documented; the app converts for display.
5. **Cite sources** with the date accessed. Prefer the official owner's guide and manufacturer pages, then retailer listings (which often conflict — note the conflict).
6. **Status honestly:**
   - *Verified* — checked against the physical appliance or its official owner's guide by the CookPilot team.
   - *Documented* — consistent public documentation, not yet checked hands-on.
   - *Partial* — some facts confirmed, gaps listed.
   - *Incomplete* — too little to give model-specific settings.
7. **Re-verify** when a manufacturer revises a model, and update "last verified".

### State of the seeded catalogue (researched 9 November 2026)

| Model | Status | Confirmed | Not confirmed |
| --- | --- | --- | --- |
| Air Fryer AF101 (US) | Documented | 4 programs, 4 qt, 1550 W, overall 105–400 °F | per-program ranges |
| Foodi Dual Zone AF300EU | Partial | 6 programs, Sync/Match, 2 × 3.8 L, 2400 W | temperature ranges (40–240 °C is retailer-reported only) |
| Foodi Indoor Grill AG301 (US) | Partial | 5 functions, grill levels LOW/MED/HIGH/MAX | degrees per level, other ranges, power |
| Foodi Health Grill AG301EU | Incomplete | 5.7 L, 1760 W | program list, ranges |
| CREAMi NC301 (US) | Documented | 7 programs, 16 oz pints, Re-spin | power, official freezing time |
| CREAMi NC300EU | Partial | 7 programs, 473 ml tubs, 800 W | official freezing time |
| CREAMi Deluxe NC501 (US) | Incomplete | 11 programs (count), 24 oz pints | program names, power |

These came from web research, not from the appliances themselves. Check each against its owner's guide before marking anything *verified*.

## Recipes

1. **Original content only.** Do not copy recipes, text or photographs from manufacturer recipe books, cookbooks or websites. Ingredient lists are not protected, but wording, structure and images are — write your own.
2. **Never claim a recipe is official** or approved by a manufacturer.
3. **Provenance is a statement of fact:**
   - *Verified* — cooked on the exact model listed, by us, with the result recorded. Tick "physically tested" for that model only.
   - *Adapted* — adapted from an existing documented recipe; say from what in the source note.
   - *Generated* — produced by AI or written without a physical test.
4. **Demonstration recipes** stay flagged `is_demo` and are never *verified*. Remove or test them before a commercial launch.
5. **Use only documented programs** for the models you list as compatible, and stay within their documented limits.
6. **Food safety is mandatory.** State the safe internal temperature for meat, poultry, fish and eggs; when a recipe targets a doneness below official guidance (medium-rare steak), say so and give the official figure. Declare common allergens.
7. **Metric canonical quantities**, one action per step, a duration wherever a timer helps.
8. **Both languages.** Publish a recipe once EN and FR are complete; a missing language falls back to the other one.
9. **Photography:** only images you shot or licensed. The bundled covers are original illustrations.

## Knowledge base

- Every document needs a rights note explaining why CookPilot may store and use it.
- Summarise public facts in your own words; do not ingest copyrighted manuals or books wholesale unless you hold the rights.
- Do not scrape sites that prohibit it or bypass technical protections.
- Tag model-specific documents with the model number so they are only retrieved for owners of that model.

## SEO content

No bulk-generated pages. A public recipe page must be useful on its own: accurate, complete, original, with clear provenance. Rating markup is emitted only when real user ratings exist.

## AI behaviour (for reviewers)

The chef must: answer in the user's language; ask when information is missing; refuse to name programs a model does not have; say what it does not know; label every recipe. These are enforced in code (`src/lib/ai/validate.ts`) and covered by tests — if you change the rules, change the tests.
