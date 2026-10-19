// Gedeelde donkerpetrol kop voor de Vereniging-pagina's (Over de VOC zonder
// headerfoto, Bestuur, Commissies) — zodat ze allemaal op dezelfde manier
// openen i.p.v. de ene met een merkkop en de andere met een kale titel.
export function VerenigingHero({ eyebrow = "Vereniging", title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div
      className="animate-rise-in overflow-hidden rounded-2xl border border-border p-6 shadow-sm sm:p-10"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-white/75">{eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-white/80">{description}</p>}
    </div>
  );
}
