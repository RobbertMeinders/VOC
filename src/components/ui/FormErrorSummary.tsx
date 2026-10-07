// UX-review U5: "bij meerdere fouten een samenvatting bovenaan" — bij één
// fout is die al zichtbaar als FieldError onder het veld zelf, dus pas
// vanaf twee fouten toont dit iets (anders zou de melding dubbel staan).
export function FormErrorSummary({ errors }: { errors: Record<string, string> }) {
  const messages = Object.values(errors);
  if (messages.length < 2) return null;

  return (
    <div role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
      <p className="font-medium">Controleer de volgende velden:</p>
      <ul className="mt-1 list-disc pl-4">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
