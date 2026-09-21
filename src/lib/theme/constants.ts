export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "voc-theme";

// Inline, blocking script string injected into <head> so the theme is applied
// before first paint (avoids a flash of the wrong theme). Keep this framework-free.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;
