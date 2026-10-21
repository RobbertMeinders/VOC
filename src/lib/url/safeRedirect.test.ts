import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "./safeRedirect";

describe("safeRedirectPath", () => {
  it("laat een lege waarde met de fallback terugvallen", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("accepteert een gewoon intern pad, inclusief query/hash", () => {
    expect(safeRedirectPath("/leden/123")).toBe("/leden/123");
    expect(safeRedirectPath("/agenda?tab=verleden#details")).toBe("/agenda?tab=verleden#details");
  });

  it("wijst een pad af dat niet met / begint", () => {
    expect(safeRedirectPath("evil.com")).toBe("/");
    expect(safeRedirectPath("http://evil.com")).toBe("/");
  });

  it("wijst protocol-relative open-redirect-varianten af", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("/\\/evil.com")).toBe("/");
    expect(safeRedirectPath("/\t/evil.com")).toBe("/");
  });

  it("behandelt een letterlijke spatie als onderdeel van het pad (geen protocol-relative truc)", () => {
    // Een spatie wordt door de URL-parser als %20 in het pad gecodeerd,
    // niet als padscheiding gelezen — dit blijft dus gewoon hetzelfde
    // (veilige) origin, in tegenstelling tot "//" of "/\\".
    expect(safeRedirectPath("/ /evil.com")).toBe("/%20/evil.com");
  });

  it("gebruikt de meegegeven fallback i.p.v. de standaard /", () => {
    expect(safeRedirectPath("//evil.com", "/login")).toBe("/login");
  });
});
