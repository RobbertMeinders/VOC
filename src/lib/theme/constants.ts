export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "voc-theme";

// Zelfde --background-waarden als globals.css (licht: regel ~32, donker:
// regel ~186/245) — hier gedupliceerd omdat een CSS custom property niet
// uit JS valt te lezen vóór die stylesheet is toegepast, en dit precies de
// waarde is die <meta name="theme-color"> (de iOS-statusbalk/Android-
// adresbalktint) moet volgen.
const THEME_COLOR_LIGHT = "#f5f3ef";
const THEME_COLOR_DARK = "#0f0f12";

// Gedeeld door THEME_INIT_SCRIPT (vóór eerste paint), ThemeColorSync (bij elke
// latere data-theme-/systeemvoorkeurwijziging) en potentieel andere plekken —
// zonder dit ene punt zou theme-color-logica op drie plekken uit de pas
// kunnen gaan lopen.
export function setThemeColorMeta(theme: "light" | "dark") {
  const content = theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

// Inline, blocking script string injected into <head> so the theme — én de
// bijbehorende <meta name="theme-color"> — is toegepast vóór eerste paint
// (voorkomt een flits van het verkeerde thema/de verkeerde statusbalktint).
// Keep this framework-free: kan geen setThemeColorMeta() importeren, dus de
// kleurwaarden/logica hieronder bewust hetzelfde als die functie.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    var content = theme === "dark" ? "${THEME_COLOR_DARK}" : "${THEME_COLOR_LIGHT}";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  } catch (e) {}
})();
`;
