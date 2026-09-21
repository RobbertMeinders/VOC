import Image from "next/image";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import { ExpandableText } from "@/components/ui/ExpandableText";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export function CompanyHeader({ company, logoUrl }: { company: Company; logoUrl: string | null }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <Image src={logoUrl} alt={company.name} width={64} height={64} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
            <Building2 size={28} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
          {company.tagline ? (
            <p className="text-sm font-medium text-voc-red">{company.tagline}</p>
          ) : (
            company.industry && <p className="text-sm text-muted">{company.industry}</p>
          )}
          {company.tagline && company.industry && (
            <p className="mt-0.5 text-xs text-muted">{company.industry}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {company.city && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {company.city}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-voc-red hover:underline"
              >
                <Globe size={14} />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>
      {company.description && <ExpandableText text={company.description} className="mt-4" />}

      {(company.address || company.phone || company.email) && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm text-muted">
          {company.address && (
            <p className="flex items-start gap-1">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>
                {company.address}
                {company.postal_code && `, ${company.postal_code}`}
                {company.city && ` ${company.city}`}
              </span>
            </p>
          )}
          {company.phone && (
            <a href={`tel:${company.phone}`} className="flex items-center gap-1 hover:text-voc-red">
              <Phone size={14} className="shrink-0" />
              {company.phone}
            </a>
          )}
          {company.email && (
            <a href={`mailto:${company.email}`} className="flex items-center gap-1 hover:text-voc-red">
              <Mail size={14} className="shrink-0" />
              {company.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
