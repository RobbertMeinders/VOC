import { describe, it, expect } from "vitest";
import { renderTemplate } from "./render";

// Kernlogica van elk automatisch bericht (e-mail, push en nieuwsbrief) —
// zie src/lib/templates/message-render.ts en dispatch-push.ts.
describe("renderTemplate", () => {
  it("vervangt een bekende variabele", () => {
    expect(renderTemplate("Hallo {{naam}}!", { naam: "Robbert" })).toBe("Hallo Robbert!");
  });

  it("vervangt dezelfde variabele op meerdere plekken", () => {
    expect(renderTemplate("{{naam}} en nog eens {{naam}}", { naam: "Bo" })).toBe("Bo en nog eens Bo");
  });

  it("laat een onbekende {{variabele}} ongewijzigd staan", () => {
    expect(renderTemplate("Hallo {{onbekend}}!", { naam: "Robbert" })).toBe("Hallo {{onbekend}}!");
  });

  it("doet niets zonder variabelen", () => {
    expect(renderTemplate("Platte tekst, geen variabelen.", {})).toBe("Platte tekst, geen variabelen.");
  });

  it("vervangt een lege-string-waarde ook echt naar leeg", () => {
    expect(renderTemplate("Functie: {{functie}}.", { functie: "" })).toBe("Functie: .");
  });

  it("vervangt elk voorkomen (replaceAll), niet alleen de eerste match", () => {
    expect(renderTemplate("{{a}} en {{a}} en {{a}}", { a: "hi" })).toBe("hi en hi en hi");
  });

  it("documenteert een bestaand randgeval: komt de {{token}}-tekst van een latere variabele toevallig in een eerdere waarde terecht, dan wordt die ook mee-vervangen", () => {
    // Sequentiële substitutie per key (Object.entries-volgorde): nadat "a"
    // vervangen is door de letterlijke tekst "{{b}}", vervangt de stap voor
    // "b" óók dat net ingevoegde fragment. Geen huidige templatewaarde
    // bevat dit patroon, maar het is goed om vast te leggen hoe
    // renderTemplate zich hier gedraagt.
    expect(renderTemplate("{{a}}{{b}}", { a: "{{b}}", b: "X" })).toBe("XX");
  });
});
