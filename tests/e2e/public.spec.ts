import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("landing page renders in English with the demo banner and SEO tags", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your AI chef.");
    await expect(page.getByTestId("demo-banner")).toBeVisible();
    await expect(page).toHaveTitle(/CookPilot/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /CookPilot/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("French locale is fully translated and the switcher keeps the page", async ({ page }) => {
    await page.goto("/fr/pricing");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Des tarifs simples et honnêtes");
    await page.getByRole("contentinfo").getByRole("button", { name: "en", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/pricing$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Simple, honest pricing");
  });

  test("root redirects to a locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(en|fr)$/);
  });

  test("pricing shows the real prices and toggles the billing period", async ({ page }) => {
    await page.goto("/en/pricing");
    await expect(page.getByTestId("pro-price")).toContainText("29.99");
    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(page.getByTestId("pro-price")).toContainText("3.99");
  });

  test("recipes can be filtered by appliance, diet and ingredient", async ({ page }) => {
    await page.goto("/en/recipes");
    await expect(page.getByTestId("recipe-count")).toHaveText("8 recipes");
    await page.getByLabel("Appliance").selectOption("frozen-dessert-maker");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByTestId("recipe-count")).toHaveText("2 recipes");
    await page.getByLabel("Diet").selectOption("vegan");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByTestId("recipe-count")).toHaveText("1 recipe");
    await expect(page.getByRole("heading", { name: "Mango & lime sorbet" })).toBeVisible();
    await page.goto("/en/recipes?ingredients=salmon");
    await expect(page.getByTestId("recipe-count")).toHaveText("1 recipe");
    await page.goto("/en/recipes?q=zzzz");
    await expect(page.getByText("No recipe matches these filters")).toBeVisible();
  });

  test("recipe page shows provenance, compatibility, structured data and scales servings", async ({ page }) => {
    await page.goto("/en/recipes/lemon-herb-chicken-thighs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lemon & herb chicken thighs");
    await expect(page.locator('[data-provenance="generated"]').first()).toBeVisible();
    await expect(page.getByText("Not tested yet").first()).toBeVisible();
    await expect(page.getByText("74 °C").first()).toBeVisible();
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(jsonLd ?? "{}");
    expect(data["@type"]).toBe("Recipe");
    expect(data.recipeInstructions.length).toBe(5);
    expect(data.aggregateRating).toBeUndefined();
    await expect(page.getByText("1 tbsp").first()).toBeVisible();
    await page.getByRole("button", { name: "More servings" }).click();
    await page.getByRole("button", { name: "More servings" }).click();
    await expect(page.getByTestId("servings-value")).toHaveText("4 servings");
    await expect(page.getByText("2 tbsp").first()).toBeVisible();
    await page.getByRole("button", { name: "Imperial" }).click();
    await page.goto("/fr/recipes/lemon-herb-chicken-thighs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hauts de cuisse de poulet citron et herbes");
  });

  test("sitemap, robots, manifest and health endpoints", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/en/recipes/grilled-ribeye-steak");
    expect(sitemap).toContain("/fr/pricing");
    expect(sitemap).not.toContain("/dashboard");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap:");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("CookPilot");
    const health = await (await request.get("/api/health")).json();
    expect(health).toMatchObject({ status: "ok", mode: "demo" });
    expect(JSON.stringify(health)).not.toMatch(/key|secret/i);
  });

  test("security headers are set", async ({ request }) => {
    const headers = (await request.get("/en")).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["strict-transport-security"]).toContain("max-age");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("unknown pages show the localised 404", async ({ page }) => {
    const response = await page.goto("/fr/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page introuvable");
  });

  test("auth pages show the setup state instead of a broken form when Supabase is missing", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByTestId("auth-setup-state")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await page.getByRole("link", { name: "Continue in demo mode" }).click();
    await expect(page).toHaveURL(/\/en\/onboarding$/);
  });
});
