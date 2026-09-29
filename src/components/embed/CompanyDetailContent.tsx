import { Building2, Globe } from "lucide-react";
import { PopupLoginLink } from "@/components/embed/PopupLoginLink";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { Avatar } from "@/components/ui/Avatar";

export type CompanyDetailData = {
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  city: string | null;
  website: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  employees: { id: string; firstName: string; lastName: string; jobTitle: string | null; avatarUrl: string | null }[];
};

// Gedeelde opmaak voor het bedrijfsdetail op de bedrijvengids-embed — gebruikt
// door zowel /embed/bedrijven/[slug] (directe/gedeelde link, echte
// paginanavigatie) als CompanyDetailOverlay (klik vanuit de lijst, geen
// navigatie). Verwacht kant-en-klare, al-opgeloste velden (signed URL's e.d.)
// i.p.v. rauwe database-rijen, zodat dit component zelf geen server- of
// client-specifieke data-ophaal-logica hoeft te kennen.
export function CompanyDetailContent({ company }: { company: CompanyDetailData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <div className="flex items-start gap-4">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- publieke, external-embed pagina: geen framework-afhankelijkheden
            <img src={company.logoUrl} alt={company.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-voc-red-light text-voc-red">
              <Building2 size={28} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            {company.tagline && <p className="mt-0.5 text-sm text-muted">{company.tagline}</p>}
            {(company.industry || company.city) && (
              <p className="mt-0.5 text-sm text-muted">{[company.industry, company.city].filter(Boolean).join(" · ")}</p>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red hover:underline"
              >
                <Globe size={14} />
                {company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
        </div>

        {company.description && (
          <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm text-foreground">
            {company.description}
          </p>
        )}

        {(company.linkedinUrl || company.instagramUrl || company.facebookUrl) && (
          // text-foreground: EntitySocialLinks' compact variant stelt zelf
          // geen tekstkleur in (op de echte portaalpagina's altijd prima,
          // want die volgen consequent hetzelfde thema) en erft daardoor
          // hier de (op een donker OS-thema witte) kleur van <body> i.p.v.
          // onze data-theme="light"-override — dat maakte de tekst
          // onzichtbaar tot je eroverheen hoverde.
          <div className="mt-4 border-t border-border pt-4">
            <EntitySocialLinks
              linkedinUrl={company.linkedinUrl}
              instagramUrl={company.instagramUrl}
              facebookUrl={company.facebookUrl}
              variant="compact"
              className="text-foreground"
            />
          </div>
        )}
      </div>

      {company.employees.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij {company.name}</p>
          <ul className="flex flex-col gap-3">
            {company.employees.map((employee) => (
              <li key={employee.id}>
                {/* Klik op een naam -> loginmuur, geen openbaar profiel (zie
                    de eerdere ontwerp-discussie). Pop-up i.p.v. target="_top":
                    zie PopupLoginLink voor waarom. */}
                <PopupLoginLink
                  href={`/login?next=${encodeURIComponent(`/leden/${employee.id}`)}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <Avatar firstName={employee.firstName} lastName={employee.lastName} avatarUrl={employee.avatarUrl} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.firstName} {employee.lastName}
                    </p>
                    {employee.jobTitle && <p className="truncate text-xs text-muted">{employee.jobTitle}</p>}
                  </div>
                </PopupLoginLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
