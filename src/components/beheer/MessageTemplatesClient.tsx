"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Mail, Bell, PenLine } from "lucide-react";
import { MessageTemplateEditor, type MessageTemplate } from "@/components/beheer/MessageTemplateEditor";
import { SignaturesEditor } from "@/components/beheer/SignaturesEditor";
import type { AppSettings } from "@/lib/settings/app-settings";

// Eén client-component voor lijst + editor i.p.v. URL-gestuurde selectie
// (zoals /beheer/instroom se tabs): hier moet een wissel tussen berichten
// een niet-opgeslagen wijziging kunnen afvangen (ontwerp-eis "melding of je
// wijzigingen niet opgeslagen zijn"), wat met een kale <Link>-navigatie
// niet te onderscheppen is.
export function MessageTemplatesClient({ templates, settings }: { templates: MessageTemplate[]; settings: AppSettings }) {
  const [selected, setSelected] = useState<string>(templates[0]?.key ?? "signatures");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function select(key: string) {
    if (key === selected) return;
    if (dirty && !window.confirm("Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt wisselen?")) {
      return;
    }
    setDirty(false);
    setSelected(key);
  }

  const groups = new Map<string, MessageTemplate[]>();
  for (const t of templates) {
    const list = groups.get(t.group_label) ?? [];
    list.push(t);
    groups.set(t.group_label, list);
  }

  const activeTemplate = templates.find((t) => t.key === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Berichten" className="flex flex-col gap-1 rounded-2xl bg-surface p-2 shadow-sm">
        {[...groups.entries()].map(([group, items]) => (
          <div key={group}>
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
            {items.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => select(t.key)}
                aria-current={selected === t.key}
                className={clsx(
                  "flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm",
                  selected === t.key ? "bg-petrol-soft text-petrol" : "hover:bg-black/[.03] dark:hover:bg-white/[.06]"
                )}
              >
                <span>
                  <span className="block font-medium text-foreground">{t.name}</span>
                  <span className="block text-xs text-muted">{t.when_text}</span>
                </span>
                <span className="mt-0.5 flex shrink-0 items-center gap-1 text-muted">
                  <Mail size={13} />
                  {t.has_push && <Bell size={13} />}
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => select("signatures")}
            aria-current={selected === "signatures"}
            className={clsx(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
              selected === "signatures" ? "bg-petrol-soft text-petrol" : "hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            )}
          >
            <PenLine size={14} />
            <span>
              <span className="block font-medium text-foreground">Handtekeningen</span>
              <span className="block text-xs text-muted">Algemeen en persoonlijk</span>
            </span>
          </button>
        </div>
      </nav>

      <div className="min-w-0">
        {selected === "signatures" || !activeTemplate ? (
          <SignaturesEditor settings={settings} />
        ) : (
          <MessageTemplateEditor key={activeTemplate.key + activeTemplate.updated_at} template={activeTemplate} onDirtyChange={setDirty} />
        )}
      </div>
    </div>
  );
}
