import type { ReactNode } from "react";

// Groepeert losse formuliervelden onder een koptekst, gescheiden door een
// dunne lijn i.p.v. elk veld los achter elkaar te zetten (zie CompanyForm/
// CompanyBillingForm/ProfileForm) — en i.p.v. elke schakelaar in een eigen
// omrande/gevulde box te zetten (zoals eerder), wat bij meerdere schakelaars
// op één formulier al snel op een stapel losse meldingen ging lijken.
// Zelfde visuele taal als SettingGroup/SettingSubRow op /instellingen, maar
// dan als secties binnen één formulier i.p.v. losse kaarten.
export function FormSection({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        {/* Bewust lichter dan een kaarttitel (h2) of een veld-/schakelaar-
            label — anders ogen een kaarttitel + sectielabel + veldlabel
            vlak onder elkaar als drie gelijkwaardige koppen op een rij. */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// Plaats meerdere FormSection-kinderen hierin om ze met een dunne lijn
// (i.p.v. elk een eigen kaart/box) van elkaar te scheiden.
export function FormSections({ children }: { children: ReactNode }) {
  return <div className="flex flex-col divide-y divide-border [&>*]:pt-5 [&>*:first-child]:pt-0">{children}</div>;
}

// Eén schakelaar-rij zonder eigen kaart-omranding — titel+toelichting links,
// schakelaar rechts uitgelijnd. Vervangt de eerder gebruikte bordered/filled
// box per schakelaar.
export function FormToggleRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
