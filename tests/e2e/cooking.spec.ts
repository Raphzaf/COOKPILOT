import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("guided cooking: checklist, appliance settings, timers, navigation, feedback and history", async ({ page }) => {
  await onboard(page, { model: "AF101" });
  await page.goto("/en/dashboard/recipes");
  await page.getByRole("link", { name: "Honey & thyme roasted carrots" }).click();
  await page.getByTestId("start-cooking").click();
  const mode = page.getByTestId("cooking-mode");
  await expect(mode).toBeVisible();
  await expect(mode.getByText("Ninja Air Fryer 4-Quart AF101")).toBeVisible();

  // Ingredient checklist
  await expect(mode.getByRole("heading", { name: "Gather your ingredients" })).toBeVisible();
  await mode.getByRole("checkbox").first().check();
  await expect(mode.getByTestId("cooking-prev")).toBeDisabled();

  // Step 1 → 2: one step at a time, with the appliance settings for this model
  await mode.getByTestId("cooking-next").click();
  await expect(mode.getByText("Step 1 of 3")).toBeVisible();
  await mode.getByTestId("cooking-next").click();
  await expect(mode.getByText("Step 2 of 3")).toBeVisible();
  const settings = mode.getByLabel("Appliance settings");
  await expect(settings.getByText("Roast")).toBeVisible();
  await expect(settings.getByText("190 °C")).toBeVisible();
  await expect(settings.getByText("12 min")).toBeVisible();

  // Multiple timers
  await mode.getByTestId("start-step-timer").click();
  await mode.getByTestId("quick-timer-1").click();
  await expect(mode.getByTestId("timer-list").getByRole("listitem")).toHaveCount(2);
  await expect(mode.getByRole("timer").first()).toHaveText(/11:5\d/);
  await mode.getByRole("button", { name: "Pause timer" }).first().click();
  await expect(mode.getByRole("button", { name: "Resume timer" })).toHaveCount(1);
  await mode.getByRole("button", { name: "Remove timer" }).last().click();
  await expect(mode.getByTestId("timer-list").getByRole("listitem")).toHaveCount(1);

  // Back and forward
  await mode.getByTestId("cooking-prev").click();
  await expect(mode.getByText("Step 1 of 3")).toBeVisible();
  await mode.getByTestId("cooking-next").click();
  await mode.getByTestId("cooking-next").click();
  await expect(mode.getByText("Step 3 of 3")).toBeVisible();

  // Ask the chef mid-recipe
  await mode.getByTestId("cooking-ask").click();
  await page.getByTestId("cooking-help-input").fill("Can I use maple syrup instead?");
  await page.getByTestId("cooking-help-input").press("Enter");
  await expect(page.getByTestId("cooking-help-answer")).toContainText("Honey & thyme roasted carrots");
  await page.keyboard.press("Escape");

  // Finish with feedback
  await mode.getByTestId("cooking-next").click();
  await expect(mode.getByTestId("cooking-finish")).toBeVisible();
  await mode.getByRole("radio", { name: "5 stars" }).click();
  await mode.getByPlaceholder("Anything to remember next time?").fill("Perfect with a little extra thyme.");
  await mode.getByTestId("cooking-finish-button").click();
  await expect(page).toHaveURL(/\/dashboard\/recipes\//);

  await page.goto("/en/dashboard/history");
  await expect(page.getByTestId("history-cooked").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByTestId("history-cooked")).toContainText("Honey & thyme roasted carrots");
});
