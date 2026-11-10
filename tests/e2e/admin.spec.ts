import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test.describe("admin authorisation", () => {
  test("regular users cannot open any admin page", async ({ page }) => {
    await onboard(page, { model: null });
    for (const path of ["/en/admin", "/en/admin/users", "/en/admin/devices", "/en/admin/knowledge"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(page.getByTestId("admin-stats")).toHaveCount(0);
      await expect(page.getByTestId("users-table")).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("the demo admin persona can manage the catalogue, recipes and knowledge base", async ({ page }) => {
    await onboard(page, { model: null });
    await page.getByTestId("user-menu").click();
    await page.getByTestId("demo-role-switch").click();
    await page.goto("/en/admin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin overview");
    await expect(page.getByTestId("admin-stats")).toContainText("Appliance models");
    await expect(page.getByText("Not configured").first()).toBeVisible();

    // Appliances: "Documented" is refused without a source, accepted with one.
    await page.goto("/en/admin/devices?edit=new");
    const form = page.getByTestId("device-form");
    const modelNumber = `ZZ${Date.now().toString().slice(-7)}`;
    await form.getByLabel("Model number").fill(modelNumber);
    await form.getByLabel("Product name").fill("Test Air Fryer");
    await form.getByLabel("Programs, accessories and features").fill("program | air-fry | Air Fry | Air Fry | 40 | 200 | C");
    await form.getByLabel("Verification").selectOption("documented");
    await form.getByLabel("Visible in the catalogue").check();
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("require at least one https source", { exact: false })).toBeVisible();
    await form.getByLabel("Sources").fill("Owner guide | https://example.com/guide.pdf | manual");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/admin\/devices$/);
    await expect(page.getByRole("row", { name: new RegExp(modelNumber) })).toContainText("Documented");

    // Recipes: unpublishing removes a recipe from the public library.
    await page.goto("/en/admin/recipes");
    const row = page.getByRole("row", { name: /Mango & lime sorbet/ });
    await row.getByRole("combobox").selectOption("draft");
    await expect(page.getByText("Saved").first()).toBeVisible();
    await page.goto("/en/dashboard/recipes?q=mango");
    await expect(page.getByTestId("recipe-count")).toHaveText("No recipes");
    await page.goto("/en/admin/recipes");
    await page.getByRole("row", { name: /Mango & lime sorbet/ }).getByRole("combobox").selectOption("published");
    await expect(page.getByText("Saved").first()).toBeVisible();

    // "Verified" cannot be claimed without a model marked as tested.
    await page.getByRole("row", { name: /Mango & lime sorbet/ }).getByRole("link", { name: "Edit" }).click();
    await page.getByTestId("recipe-form").getByLabel("Provenance").selectOption("verified");
    await page.getByTestId("recipe-form").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("“Verified” requires at least one model marked as tested", { exact: false })).toBeVisible();

    // Knowledge base ingestion
    await page.goto("/en/admin/knowledge");
    const before = await page.getByTestId("knowledge-table").getByRole("row").count();
    const k = page.getByTestId("knowledge-form");
    await k.getByLabel("Title").fill("Resting meat");
    await k.getByLabel("Source", { exact: true }).fill("CookPilot test kitchen");
    await k.getByLabel("Rights / usage note").fill("Original text written by our team");
    await k.getByLabel("Content").fill(`Resting meat after cooking lets the juices redistribute. Rest steaks for five minutes under loose foil before slicing. Note ${Date.now()}.`);
    await k.getByRole("button", { name: "Ingest document" }).click();
    await expect(page.getByText("chunks indexed for text search", { exact: false })).toBeVisible();
    await expect(page.getByTestId("knowledge-table").getByRole("row")).toHaveCount(before + 1);

    await page.goto("/en/admin/users");
    // An admin cannot change their own role (exactly one row — theirs — is locked).
    await expect(page.getByTestId("users-table").locator("select:disabled")).toHaveCount(1);
    await expect(page.getByTestId("users-table").locator("select:disabled")).toHaveValue("admin");
  });
});
