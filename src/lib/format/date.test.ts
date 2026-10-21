import { describe, it, expect, vi, afterEach } from "vitest";
import { formatActivityDate, formatActivityDateCompact, splitUpcomingAndPast, getGreeting } from "./date";

// Alles hier is expliciet op Europe/Amsterdam gepind (zie het commentaar
// bovenin date.ts) — de bekende UTC-valkuil die elders in het portaal nog
// speelt (D2, portaal-gezondheidsonderzoek) is hier al voorkomen. Deze tests
// leggen dat vast, zodat een latere wijziging die pinning niet per ongeluk
// weer losmaakt.
describe("formatActivityDate", () => {
  it("toont datum en tijd in de Nederlandse tijdzone, ook als de ISO-tijd in UTC gegeven is", () => {
    // 2026-06-15T18:00:00Z is tijdens de Nederlandse zomertijd (CEST, UTC+2)
    // dus 20:00 lokale tijd.
    expect(formatActivityDate("2026-06-15T18:00:00Z")).toBe("maandag 15 juni om 20:00");
  });

  it("houdt rekening met wintertijd (UTC+1)", () => {
    // 2026-01-15T18:00:00Z -> 19:00 lokale tijd (CET, UTC+1).
    expect(formatActivityDate("2026-01-15T18:00:00Z")).toBe("donderdag 15 januari om 19:00");
  });
});

describe("formatActivityDateCompact", () => {
  it("toont een korte vorm zonder tijd", () => {
    expect(formatActivityDateCompact("2026-11-03T10:00:00Z")).toBe("di 3 nov");
  });
});

describe("splitUpcomingAndPast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("splitst toekomstige activiteiten (vroegste eerst) van verleden (meest recent eerst)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));

    const items = [
      { id: "a", starts_at: "2026-07-01T00:00:00Z" }, // toekomst, verder weg
      { id: "b", starts_at: "2026-05-01T00:00:00Z" }, // verleden, ouder
      { id: "c", starts_at: "2026-06-15T00:00:00Z" }, // toekomst, eerst
      { id: "d", starts_at: "2026-05-20T00:00:00Z" }, // verleden, recenter
    ];

    const { upcoming, past } = splitUpcomingAndPast(items);

    expect(upcoming.map((i) => i.id)).toEqual(["c", "a"]);
    expect(past.map((i) => i.id)).toEqual(["d", "b"]);
  });

  it("behandelt het huidige moment als toekomstig (>=), niet als verleden", () => {
    vi.useFakeTimers();
    const now = new Date("2026-06-01T12:00:00Z");
    vi.setSystemTime(now);

    const { upcoming, past } = splitUpcomingAndPast([{ id: "nu", starts_at: now.toISOString() }]);

    expect(upcoming.map((i) => i.id)).toEqual(["nu"]);
    expect(past).toHaveLength(0);
  });
});

describe("getGreeting", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("toont 'Goedemorgen' in de ochtend, lokale tijd", () => {
    vi.useFakeTimers();
    // 08:00 CEST (zomertijd) = 06:00 UTC.
    vi.setSystemTime(new Date("2026-06-15T06:00:00Z"));
    expect(getGreeting()).toBe("Goedemorgen");
  });

  it("toont 'Goedenavond' aan het einde van de dag, lokale tijd", () => {
    vi.useFakeTimers();
    // 21:00 CEST (zomertijd) = 19:00 UTC.
    vi.setSystemTime(new Date("2026-06-15T19:00:00Z"));
    expect(getGreeting()).toBe("Goedenavond");
  });
});
