import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test.describe("onboarding and appliances", () => {
  test("dashboard requires onboarding, which stores preferences", async ({ page }) => {
    await page.goto("/en/dashboard/chef");
    await expect(page).toHaveURL(/\/en\/onboarding$/);
    await expect(page.getByTestId("onboarding-step")).toHaveText("Step 1 of 5");
    await page.getByLabel("First name").fill("Arthur");
    await page.getByTestId("onboarding-next").click();
    await page.getByRole("radio", { name: /Imperial/ }).click();
    await page.getByRole("radio", { name: /Fahrenheit/ }).click();
    await page.getByTestId("onboarding-next").click();
    await page.getByPlaceholder("Search a model").fill("creami");
    await expect(page.getByTestId("device-results").getByRole("listitem")).toHaveCount(3);
    await page.getByTestId("add-NC301").click();
    await page.getByTestId("onboarding-next").click();
    await page.getByLabel("Allergies").fill("peanuts");
    await page.getByTestId("onboarding-next").click();
    await expect(page.getByText("1 appliance added")).toBeVisible();
    await page.getByTestId("onboarding-finish").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, Arthur");
    await expect(page.getByTestId("quota-remaining")).toHaveText("5 of 5 left");

    // Preferences are applied: the appliance sheet shows documented facts, settings persisted.
    await page.goto("/en/dashboard/settings");
    await expect(page.getByRole("radio", { name: /Imperial/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Allergies")).toHaveValue("peanuts");
  });

  test("onboarding works in French", async ({ page }) => {
    await onboard(page, { locale: "fr", model: null });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour");
    await expect(page.getByText("Ajoutez votre premier appareil")).toBeVisible();
  });

  test("free plan allows one appliance; Pro preview unlocks more; appliances can be removed", async ({ page }) => {
    await onboard(page, { model: "AF101" });
    await page.goto("/en/dashboard/devices/add");
    await expect(page.getByText("Your plan includes 1 appliance.")).toBeVisible();
    await expect(page.getByTestId("add-NC301")).toBeDisabled();

    await page.goto("/en/dashboard/subscription");
    await expect(page.getByTestId("current-plan")).toHaveText("Free");
    await expect(page.getByTestId("checkout-button")).toBeDisabled();
    await page.getByTestId("demo-plan-toggle").click();
    await expect(page.getByTestId("current-plan")).toHaveText("Pro");
    await expect(page.getByTestId("quota-remaining")).toHaveText("60 of 60 left");

    await page.goto("/en/dashboard/devices/add");
    await page.getByTestId("add-NC301").click();
    await page.goto("/en/dashboard/devices");
    await expect(page.getByTestId("my-devices").getByRole("listitem")).toHaveCount(2);

    await page.getByRole("link", { name: /AF101/ }).click();
    await expect(page.getByText("105–400 °F").first()).toBeVisible();
    await expect(page.getByText("What we do not know yet")).toBeVisible();
    await page.getByTestId("remove-device").click();
    await page.getByTestId("confirm-remove-device").click();
    await expect(page).toHaveURL(/\/dashboard\/devices$/);
    await expect(page.getByTestId("my-devices").getByRole("listitem")).toHaveCount(1);
  });

  test("an incomplete model is shown as such and can be requested when missing", async ({ page }) => {
    await onboard(page, { model: null });
    await page.goto("/en/dashboard/devices/add?model=ninja-foodi-health-grill-ag301eu");
    await expect(page.getByText("No program has been documented for this model yet.", { exact: false })).toBeVisible();
    await page.goto("/en/dashboard/devices/add");
    await page.getByPlaceholder("Search a model").fill("thermomix");
    await expect(page.getByText("No model matches your search")).toBeVisible();
    await page.getByRole("button", { name: "Request a model" }).click();
    await page.getByLabel("Brand and model number").fill("Ninja AF400EU");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Request sent. Thank you!")).toBeVisible();
  });
});

test.describe("recipes and AI chef", () => {
  test("favourites, feedback and compatibility for the user's appliance", async ({ page }) => {
    await onboard(page, { model: "AF101" });
    await page.goto("/en/dashboard/recipes");
    await page.getByRole("link", { name: "Crispy paprika potato wedges" }).click();
    await expect(page.getByText("Works with your Ninja AF101", { exact: false })).toBeVisible();
    await page.getByTestId("favorite-button").click();
    await expect(page.getByText("Added to favourites")).toBeVisible();
    await page.getByRole("radio", { name: "4 stars" }).click();
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByText("your feedback was saved", { exact: false })).toBeVisible();
    await page.goto("/en/dashboard/favorites");
    await expect(page.getByTestId("favorites-grid").getByRole("article")).toHaveCount(1);

    // A recipe for an appliance the user does not own is flagged.
    await page.goto("/en/dashboard/recipes?appliance=indoor-grill");
    await page.getByRole("link", { name: "Grilled ribeye with garlic butter" }).click();
    await expect(page.getByText("None of your appliances is in this recipe’s category", { exact: false })).toBeVisible();
  });

  test("chef answers for the user's appliance, shows provenance, meters the quota and saves recipes", async ({ page }) => {
    await onboard(page, { model: "AF101" });
    await page.goto("/en/dashboard/chef");
    await expect(page.getByTestId("chef-quota")).toContainText("5 of 5");
    await expect(page.getByText("No AI model is connected", { exact: false })).toBeVisible();
    await page.getByTestId("chef-input").fill("Crispy potato wedges in my air fryer");
    await page.getByTestId("chef-send").click();
    const answer = page.getByTestId("assistant-message").first();
    await expect(answer.getByTestId("chef-recipe-card")).toBeVisible();
    await expect(answer.locator('[data-provenance="adapted"]')).toBeVisible();
    await expect(answer.getByText("Demo answer · library only")).toBeVisible();
    await expect(answer.getByText("Ninja AF101").first()).toBeVisible();
    await expect(page.getByTestId("chef-quota")).toContainText("4 of 5");
    await expect(page.getByTestId("conversation-list").getByRole("listitem")).toHaveCount(1);

    await page.getByTestId("save-chef-recipe").click();
    await expect(page.getByText("Recipe saved")).toBeVisible();
    await page.goto("/en/dashboard/recipes?tab=mine");
    await expect(page.getByRole("article")).toHaveCount(1);

    // The conversation is restored from the server.
    await page.goto("/en/dashboard/history");
    await page.getByRole("link", { name: /Crispy potato wedges/ }).click();
    await expect(page.getByTestId("assistant-message")).toHaveCount(1);
  });

  test("chef API rejects malformed and cross-origin requests", async ({ request }) => {
    expect((await request.post("/api/chef/chat", { data: "x", headers: { "content-type": "text/plain" } })).status()).toBe(415);
    expect((await request.post("/api/chef/chat", { data: { message: "", locale: "en" } })).status()).toBe(400);
    expect((await request.post("/api/chef/chat", { data: { message: "hi", locale: "de" } })).status()).toBe(400);
    expect((await request.post("/api/chef/chat", { data: { message: "hi", locale: "en" }, headers: { origin: "https://evil.example" } })).status()).toBe(403);
    expect((await request.post("/api/stripe/webhook", { data: {} })).status()).toBe(503);
  });

  test("personal data can be exported", async ({ page }) => {
    await onboard(page, { model: "NC301" });
    const response = await page.request.get("/api/account/export");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.devices).toEqual([expect.objectContaining({ model: "Ninja NC301" })]);
    expect(data.preferences.measurementSystem).toBe("metric");
  });
});
