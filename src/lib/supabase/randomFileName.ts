import "server-only";

// Avoid depending on the global Web Crypto API being present in every
// runtime — build the id from Math.random if crypto.randomUUID is missing.
export function randomFileName(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
