import { describe, it, expect } from "vitest";
import { newsItemHref, newsItemIdFilter } from "./slug";

// Zelfde patroon als members/slug.ts, voor nieuwsberichten.
describe("newsItemHref", () => {
  it("bouwt de URL op basis van de slug, niet een id", () => {
    expect(newsItemHref({ slug: "nieuwe-website-live" })).toBe("/nieuws/nieuwe-website-live");
  });

  it("voegt een optioneel suffix toe", () => {
    expect(newsItemHref({ slug: "nieuwe-website-live" }, "/bewerken")).toBe("/nieuws/nieuwe-website-live/bewerken");
  });
});

describe("newsItemIdFilter", () => {
  it("herkent een UUID en filtert op id", () => {
    expect(newsItemIdFilter("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual(["id", "eq", "3fa85f64-5717-4562-b3fc-2c963f66afa6"]);
  });

  it("behandelt een leesbare slug als slug, niet als id", () => {
    expect(newsItemIdFilter("nieuwe-website-live")).toEqual(["slug", "eq", "nieuwe-website-live"]);
  });
});
