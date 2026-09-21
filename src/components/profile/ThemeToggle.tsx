"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { clsx } from "clsx";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme/constants";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Systeem", icon: Monitor },
  { value: "light", label: "Licht", icon: Sun },
  { value: "dark", label: "Donker", icon: Moon },
];

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // Uitgesteld naar een microtask zodat setState niet synchroon in de
    // effect-body staat (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") setTheme(stored);
      } catch {
        // localStorage kan geblokkeerd zijn; val terug op systeemvoorkeur.
      }
    });
  }, []);

  function handleSelect(value: Theme) {
    setTheme(value);
    applyTheme(value);
    try {
      if (value === "system") {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, value);
      }
    } catch {
      // Niet kritiek: thema werkt dan alleen voor deze sessie.
    }
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleSelect(value)}
          className={clsx(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            theme === value ? "bg-voc-red text-white" : "text-muted hover:text-foreground"
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
