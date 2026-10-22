import { defineConfig, devices } from "@playwright/test";

// Vangnet (post-deploy rooktest): draait los van de Vitest-unittests, tegen
// de ECHTE gedeployde URL i.p.v. een lokale dev-server of wegwerp-
// Supabase-stack - dat is precies het punt: dit controleert of een
// migratie die op de database staat ook daadwerkelijk live werkt (zie de
// 0188-profiel-opslaan-breuk die hiermee gevangen had kunnen worden).
export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://app.vocveendam.nl",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
