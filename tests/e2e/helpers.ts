import { expect, type Page } from "@playwright/test";

/** Walks through onboarding in demo mode and lands on the dashboard. */
export async function onboard(page: Page, options: { model?: string | null; locale?: "en" | "fr" } = {}) {
  const locale = options.locale ?? "en";
  const model = options.model === undefined ? "AF101" : options.model;
  await page.goto(`/${locale}/dashboard`);
  await expect(page).toHaveURL(new RegExp(`/${locale}/onboarding`));
  await page.getByTestId("onboarding-next").click(); // language
  await page.getByTestId("onboarding-next").click(); // units
  if (model) {
    await page.getByTestId(`add-${model}`).click();
    await expect(page.getByTestId(`add-${model}`)).toHaveCount(0);
  }
  await page.getByTestId("onboarding-next").click(); // appliances
  await page.getByTestId("onboarding-next").click(); // tastes
  await page.getByTestId("onboarding-finish").click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
}
