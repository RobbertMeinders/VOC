"use client";

// Eén iOS-stijl schakelaar, gedeeld door elke aan/uit-instelling
// (pushmeldingen, bijgewoonde evenementen tonen, ...) i.p.v. dat elke
// instelling zijn eigen knop-stijl uitvindt.
//
// Kleur én knop-positie zijn bewust inline styles i.p.v. Tailwind's
// bracket-syntax (was `translate-x-[22px]`/`bg-black/[.12]`) — meldingen
// dat de schakelaars "niet klopten" bleven terugkomen, en inline styles
// laten geen ruimte voor een niet-gegenereerde/gepurgede utility-class als
// mogelijke oorzaak. Ook een duidelijk zichtbare rand op de uit-stand, i.p.v.
// een track die bijna niet afstak tegen de achtergrond.
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        backgroundColor: checked ? "var(--voc-red)" : "transparent",
        borderColor: checked ? "var(--voc-red)" : "var(--border)",
      }}
      className="relative h-6 w-11 shrink-0 rounded-full border-2 transition-colors disabled:opacity-60"
    >
      <span
        style={{
          transform: checked ? "translateX(20px)" : "translateX(0)",
          backgroundColor: checked ? "#ffffff" : "var(--muted)",
        }}
        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow transition-transform"
      />
    </button>
  );
}
