import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";

export type CompanyListItem = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
};

export function CompanyCard({ company }: { company: CompanyListItem }) {
  return (
    <Link
      href={`/bedrijven/${company.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm hover:border-voc-red"
    >
      {company.logoUrl ? (
        <Image
          src={company.logoUrl}
          alt={company.name}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
          <Building2 size={18} />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
        <p className="truncate text-xs text-muted">
          {company.industry && <span>{company.industry}</span>}
          {company.industry && company.city && <span> — </span>}
          {company.city && <span>{company.city}</span>}
        </p>
      </div>
    </Link>
  );
}
