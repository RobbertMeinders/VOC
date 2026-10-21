import { describe, it, expect } from "vitest";
import { companyHref, companyIdFilter } from "./slug";

// Bepaalt of een oude, rechtstreeks verstuurde link (kaal UUID) nog werkt
// naast de nieuwe, leesbare slug-URL's (zie members/slug.ts, agenda/slug.ts).
describe("companyHref", () => {
  it("bouwt de URL op basis van de slug, niet een id", () => {
    expect(companyHref({ slug: "voc-veendam" })).toBe("/bedrijven/voc-veendam");
  });

  it("voegt een optioneel suffix toe", () => {
    expect(companyHref({ slug: "voc-veendam" }, "/bewerken")).toBe("/bedrijven/voc-veendam/bewerken");
  });
});

describe("companyIdFilter", () => {
  it("herkent een UUID en filtert op id", () => {
    expect(companyIdFilter("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual(["id", "eq", "3fa85f64-5717-4562-b3fc-2c963f66afa6"]);
  });

  it("herkent een UUID hoofdletterongevoelig", () => {
    expect(companyIdFilter("3FA85F64-5717-4562-B3FC-2C963F66AFA6")[0]).toBe("id");
  });

  it("behandelt een leesbare slug als slug, niet als id", () => {
    expect(companyIdFilter("voc-veendam")).toEqual(["slug", "eq", "voc-veendam"]);
  });

  it("behandelt een slug die toevallig uit hexadecimale tekens bestaat nog steeds als slug (verkeerde lengte/structuur voor UUID)", () => {
    expect(companyIdFilter("deaf")[0]).toBe("slug");
  });
});
