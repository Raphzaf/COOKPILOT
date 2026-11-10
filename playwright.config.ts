import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * End-to-end tests run against a production build in DEMO MODE (no external credentials),
 * which exercises the full UI ↔ server actions ↔ data-store path.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /admin/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /cooking|public/ },
    // Admin tests change the shared demo catalogue, so they run alone, after everything else.
    { name: "admin", use: { ...devices["Desktop Chrome"] }, testMatch: /admin/, dependencies: ["desktop", "mobile"] },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      GEMINI_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      DEMO_ADMIN_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
