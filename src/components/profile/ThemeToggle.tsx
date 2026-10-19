"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme/constants";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Automatisch", icon: Monitor },
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
    <SegmentedControl
      items={OPTIONS.map(({ value, label, icon: Icon }) => ({
        key: value,
        active: theme === value,
        onClick: () => handleSelect(value),
        label: (
          <span className="flex items-center justify-center gap-1.5">
            <Icon size={14} />
            {label}
          </span>
        ),
      }))}
    />
  );
}
