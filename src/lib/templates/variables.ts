import type { VariableDef } from "@/components/ui/VariableEditor";

// Elk sjabloon (email_templates/push_templates) begint zijn description met
// "Variabelen: {{a}}, {{b}}, ..." (zie bv. migratie 0039/0101/0117/0118) —
// dat is de ene plek waar al staat welke {{...}}-tokens voor dit specifieke
// sjabloon geldig zijn, dus die wordt hier uitgelezen i.p.v. een los,
// dubbel-onderhouden lijstje per sjabloon-key.
const KNOWN_EXAMPLES: Record<string, string> = {
  link: "https://voorbeeld.nl/link",
  title: "Nieuwe activiteit: Netwerkborrel",
  body: "Er is een nieuwe activiteit gepland. Bekijk de details en meld je aan.",
};

const KNOWN_LABELS: Record<string, string> = {
  link: "Link",
  title: "Titel",
  body: "Berichttekst",
};

export function variablesForTemplate(description: string | null): VariableDef[] {
  const found: string[] = [];
  for (const m of (description ?? "").matchAll(/\{\{(\w+)\}\}/g)) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found.map((key) => ({
    key,
    label: KNOWN_LABELS[key] ?? key,
    example: KNOWN_EXAMPLES[key] ?? `voorbeeld-${key}`,
  }));
}
