// Simpele {{variabele}}-substitutie, gedeeld door e-mail- en
// pushmelding-templates (geen regex nodig, dus geen escaping-risico's).
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{{${key}}}`, value),
    template
  );
}
