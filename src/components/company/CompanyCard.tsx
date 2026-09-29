import Link from "next/link";
import { CompanyLogo } from "./CompanyLogo";

export type CompanyListItem = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
  tagline: string | null;
  // Standaard het interne portaalpad; de openbare bedrijvengids-embed geeft
  // hier /embed/bedrijven/{slug} door, zodat dit component ongewijzigd
  // herbruikt kan worden (zie /embed/bedrijven/page.tsx).
  href?: string;
};

export function CompanyCard({ company }: { company: CompanyListItem }) {
  return (
    <Link
      href={company.href ?? `/bedrijven/${company.id}`}
      className="animate-rise-in flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-500 ease-out hover:scale-[1.008] hover:border-voc-red hover:shadow-md"
    >
      <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={80} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground">{company.name}</p>
        {company.tagline ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{company.tagline}</p>
        ) : (
          <p className="mt-0.5 truncate text-xs text-muted">
            {company.industry && <span>{company.industry}</span>}
            {company.industry && company.city && <span> — </span>}
            {company.city && <span>{company.city}</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
