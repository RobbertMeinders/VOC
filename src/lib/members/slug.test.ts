import { describe, it, expect } from "vitest";
import { memberHref, memberIdFilter } from "./slug";

// Bepaalt of een oude, rechtstreeks verstuurde link (kaal UUID) nog werkt
// naast de nieuwe, leesbare slug-URL's (zie members/slug.ts).
describe("memberHref", () => {
  it("bouwt de URL op basis van de slug, niet een id", () => {
    expect(memberHref({ slug: "robbert-meinders" })).toBe("/leden/robbert-meinders");
  });

  it("voegt een optioneel suffix toe", () => {
    expect(memberHref({ slug: "robbert-meinders" }, "/bewerken")).toBe("/leden/robbert-meinders/bewerken");
  });
});

describe("memberIdFilter", () => {
  it("herkent een UUID en filtert op id", () => {
    expect(memberIdFilter("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual(["id", "eq", "3fa85f64-5717-4562-b3fc-2c963f66afa6"]);
  });

  it("herkent een UUID hoofdletterongevoelig", () => {
    expect(memberIdFilter("3FA85F64-5717-4562-B3FC-2C963F66AFA6")[0]).toBe("id");
  });

  it("behandelt een leesbare slug als slug, niet als id", () => {
    expect(memberIdFilter("robbert-meinders")).toEqual(["slug", "eq", "robbert-meinders"]);
  });

  it("behandelt een slug die toevallig uit hexadecimale tekens bestaat nog steeds als slug (verkeerde lengte/structuur voor UUID)", () => {
    expect(memberIdFilter("deaf")[0]).toBe("slug");
  });
});
