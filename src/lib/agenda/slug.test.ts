import { describe, it, expect } from "vitest";
import { activityHref, activityIdFilter } from "./slug";

// Zelfde patroon als members/slug.ts, voor activiteiten.
describe("activityHref", () => {
  it("bouwt de URL op basis van de slug", () => {
    expect(activityHref({ slug: "open-borrel" })).toBe("/agenda/open-borrel");
  });

  it("voegt een optioneel suffix toe", () => {
    expect(activityHref({ slug: "open-borrel" }, "/bewerken")).toBe("/agenda/open-borrel/bewerken");
  });
});

describe("activityIdFilter", () => {
  it("herkent een UUID en filtert op id", () => {
    expect(activityIdFilter("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual(["id", "eq", "3fa85f64-5717-4562-b3fc-2c963f66afa6"]);
  });

  it("behandelt een leesbare slug als slug, niet als id", () => {
    expect(activityIdFilter("open-borrel")).toEqual(["slug", "eq", "open-borrel"]);
  });
});
