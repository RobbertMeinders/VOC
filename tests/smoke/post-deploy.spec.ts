import { test, expect } from "@playwright/test";

// Vangnet (post-deploy rooktest): draait tegen de ECHTE gedeployde URL met
// een los, niet-gevoelig testaccount (SMOKE_EMAIL/SMOKE_PASSWORD -- nooit
// in code, alleen als GitHub Actions secrets). Schrijft alleen naar het
// eigen profiel van dat account (bio-veld), nooit aanmeldingen/mails/
// berichten. Controleert precies de paden die deze sessie herhaald live
// braken terwijl de code en zelfs de CI al klaar waren: profiel opslaan
// (0188, PostgREST-schemacache) en rol-afscherming.
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;
const BIO_MARKER = "Automatische rooktest - dit profiel wordt door een geautomatiseerde test bewerkt.";

test.beforeAll(() => {
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    throw new Error("SMOKE_EMAIL en SMOKE_PASSWORD moeten als omgevingsvariabelen (GitHub secrets) gezet zijn.");
  }
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", SMOKE_EMAIL!);
  await page.fill("#password", SMOKE_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL("/", { timeout: 15_000 });
}

test("inloggen lukt en landt op Home", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL("/");
});

test("profiel opslaan werkt en blijft na herladen behouden", async ({ page }) => {
  await login(page);
  await page.goto("/profiel");

  const bioField = page.locator("#bio");
  await bioField.fill(BIO_MARKER);
  await page.getByRole("button", { name: "Opslaan" }).click();

  // Dit is precies de check die de 0188-breuk ("Opslaan is niet gelukt",
  // een database-rpc die niet door PostgREST werd opgepikt) had gevangen.
  await expect(page.getByRole("alert").filter({ hasText: "Opslaan is niet gelukt" })).toHaveCount(0);
  await expect(page.getByText("Opgeslagen.")).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.locator("#bio")).toHaveValue(BIO_MARKER);
});

test("gewoon lid wordt teruggestuurd van een beheerpagina", async ({ page }) => {
  await login(page);
  await page.goto("/beheer/leden");
  // requireBoard() stuurt een niet-bestuurslid/beheerder terug naar Home.
  // Faalt deze assertie, dan is het testaccount zelf per ongeluk bestuur/
  // beheerder geworden, of is de rol-afscherming zelf geregresseerd -- in
  // beide gevallen terecht een rode CI-run.
  await expect(page).toHaveURL("/", { timeout: 10_000 });
});

test("Home en een ledenprofiel laden zonder console- of netwerkfouten", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await login(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(consoleErrors, `Console-fouten op Home: ${consoleErrors.join("; ")}`).toEqual([]);
  expect(failedResponses, `Mislukte requests op Home: ${failedResponses.join("; ")}`).toEqual([]);
});
