import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";

export type CompanyListItem = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
  tagline: string | null;
};

export function CompanyCard({ company }: { company: CompanyListItem }) {
  return (
    <Link
      href={`/bedrijven/${company.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
    >
      {company.logoUrl ? (
        <Image
          src={company.logoUrl}
          alt={company.name}
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
          <Building2 size={30} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{company.name}</p>
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
