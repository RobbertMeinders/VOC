import { describe, it, expect } from "vitest";
import { normalizeUrl, validateUrl, validateEmail, validateDisplayNamePart } from "./fields";

// Enige plek waar het FORMAAT van een e-mailadres/URL echt gecontroleerd
// wordt (zie fields.ts) — gebruikt op elk formulier met zo'n veld
// (registratie, uitnodigingen, toegang-aanvragen, bedrijfsprofiel).
describe("normalizeUrl", () => {
  it("laat een lege waarde met rust", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });

  it("vult https:// aan bij een waarde zonder schema", () => {
    expect(normalizeUrl("vocveendam.nl")).toBe("https://vocveendam.nl");
  });

  it("laat een waarde met een bestaand schema ongewijzigd", () => {
    expect(normalizeUrl("http://vocveendam.nl")).toBe("http://vocveendam.nl");
    expect(normalizeUrl("https://vocveendam.nl")).toBe("https://vocveendam.nl");
  });

  it("laat een afwijkend schema (bv. mailto:) met rust", () => {
    expect(normalizeUrl("mailto:info@vocveendam.nl")).toBe("mailto:info@vocveendam.nl");
  });

  it("trimt omliggende spaties", () => {
    expect(normalizeUrl("  vocveendam.nl  ")).toBe("https://vocveendam.nl");
  });
});

describe("validateUrl", () => {
  it("accepteert een lege, niet-verplichte waarde", () => {
    expect(validateUrl("")).toBeUndefined();
  });

  it("wijst een lege, verplichte waarde af", () => {
    expect(validateUrl("", true)).toBeDefined();
  });

  it("accepteert een volledige https-URL", () => {
    expect(validateUrl("https://vocveendam.nl")).toBeUndefined();
  });

  it("wijst een URL zonder schema af (normalizeUrl moet daarvoor eerst draaien)", () => {
    expect(validateUrl("vocveendam.nl")).toBeDefined();
  });

  it("wijst een onvolledige URL af", () => {
    expect(validateUrl("https://")).toBeDefined();
  });
});

describe("validateEmail", () => {
  it("accepteert een lege, niet-verplichte waarde", () => {
    expect(validateEmail("")).toBeUndefined();
  });

  it("wijst een lege, verplichte waarde af", () => {
    expect(validateEmail("", true)).toBeDefined();
  });

  it("accepteert een normaal e-mailadres", () => {
    expect(validateEmail("robbert@voc-veendam.nl")).toBeUndefined();
  });

  it("wijst een adres zonder @ af", () => {
    expect(validateEmail("robbert.voc-veendam.nl")).toBeDefined();
  });

  it("wijst een adres zonder domein-punt af", () => {
    expect(validateEmail("robbert@vocveendam")).toBeDefined();
  });

  it("wijst een adres met een spatie af", () => {
    expect(validateEmail("rob bert@voc-veendam.nl")).toBeDefined();
  });
});

// M1: voor-/achternaam komen terecht in de weergavenaam van een
// e-mailafzender — deze tekens kunnen daar een adresveld laten lijken op
// iets anders dan het echte, geverifieerde adres.
describe("validateDisplayNamePart", () => {
  it("accepteert een normale naam", () => {
    expect(validateDisplayNamePart("Robbert")).toBeUndefined();
    expect(validateDisplayNamePart("Jean-Pierre")).toBeUndefined();
  });

  it("wijst tekens af die een e-mailadresveld kunnen laten lijken op iets anders", () => {
    expect(validateDisplayNamePart("Evil <victim@example.com>")).toBeDefined();
    expect(validateDisplayNamePart("Evil@example.com")).toBeDefined();
    expect(validateDisplayNamePart("Evil, Bcc: x@example.com")).toBeDefined();
    expect(validateDisplayNamePart("Evil; Bcc: x@example.com")).toBeDefined();
  });

  it("wijst een regeleinde af", () => {
    expect(validateDisplayNamePart("Evil\r\nBcc: x@example.com")).toBeDefined();
  });
});
