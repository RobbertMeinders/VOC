import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint } from "./endpoint";

describe("isAllowedPushEndpoint", () => {
  it("accepteert bekende pushdienst-endpoints", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par3p.notify.windows.com/abc")).toBe(true);
  });

  it("wijst een willekeurige/interne URL af (SSRF)", () => {
    expect(isAllowedPushEndpoint("https://evil.example.com/collect")).toBe(false);
    expect(isAllowedPushEndpoint("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedPushEndpoint("http://localhost:8080/admin")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example.com/x")).toBe(false);
  });

  it("wijst een niet-https-endpoint af, ook op een toegestane host", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
  });

  it("wijst een ongeldige URL af", () => {
    expect(isAllowedPushEndpoint("niet-een-url")).toBe(false);
    expect(isAllowedPushEndpoint("")).toBe(false);
  });
});
