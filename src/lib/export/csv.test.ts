import { describe, it, expect } from "vitest";
import { csvEscape } from "./csv";

describe("csvEscape", () => {
  it("zet elke cel tussen aanhalingstekens, ook zonder speciale tekens", () => {
    expect(csvEscape("Jan Jansen")).toBe('"Jan Jansen"');
  });

  it("verdubbelt aanhalingstekens binnen de waarde", () => {
    expect(csvEscape('Jan "de Man" Jansen')).toBe('"Jan ""de Man"" Jansen"');
  });

  it("zet een voorloop-apostrof voor cellen die als formule gelezen zouden worden", () => {
    expect(csvEscape("=cmd|'/c calc'!A0")).toBe("\"'=cmd|'/c calc'!A0\"");
    expect(csvEscape("+1 234")).toBe("\"'+1 234\"");
    expect(csvEscape("-1 234")).toBe("\"'-1 234\"");
    expect(csvEscape("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });

  it("laat een gewone waarde die toevallig een = elders bevat met rust", () => {
    expect(csvEscape("a=b")).toBe('"a=b"');
  });
});
