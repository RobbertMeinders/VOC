import Link from "next/link";
import { Globe, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { CompanyLogo } from "./CompanyLogo";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export function CompanyHeader({
  company,
  logoUrl,
  editHref,
}: {
  company: Company;
  logoUrl: string | null;
  editHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <CompanyLogo logoUrl={logoUrl} name={company.name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-lg font-semibold text-foreground sm:text-xl">{company.name}</h1>
            {company.tagline ? (
              <p className="break-words text-sm font-medium text-muted">{company.tagline}</p>
            ) : (
              company.industry && <p className="text-sm text-muted">{company.industry}</p>
            )}
            {company.tagline && company.industry && (
              <p className="mt-0.5 text-xs text-muted">{company.industry}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {/* Plaatsnaam staat al achter het volledige adres verderop —
                  alleen hier tonen als er geen adres is, anders dubbelop. */}
              {company.city && !company.address && (
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
                  className="flex items-center gap-1 break-all text-voc-red hover:underline"
                >
                  <Globe size={14} className="shrink-0" />
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>
        {editHref && (
          <>
            {/* Op mobiel alleen het potloodje — de volledige "Bewerken"-pil
                drukte de naam/tagline anders te veel opzij. */}
            <Link
              href={editHref}
              aria-label="Bewerken"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red sm:hidden"
            >
              <Pencil size={14} />
            </Link>
            <Link
              href={editHref}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-voc-red hover:text-voc-red sm:flex"
            >
              <Pencil size={14} />
              Bewerken
            </Link>
          </>
        )}
      </div>
      {company.description && (
        <ExpandableText
          text={company.description}
          className="mt-4"
          lines={5}
          expandLabel="Meer weergeven"
          collapseLabel="Minder weergeven"
        />
      )}
      {(company.address || company.phone || company.email || company.linkedin_url || company.instagram_url || company.facebook_url) && (
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
          {(company.linkedin_url || company.instagram_url || company.facebook_url) &&
            (company.address || company.phone || company.email) && <div className="my-1 border-t border-border" />}
          <EntitySocialLinks
            variant="compact"
            linkedinUrl={company.linkedin_url}
            instagramUrl={company.instagram_url}
            facebookUrl={company.facebook_url}
          />
        </div>
      )}
    </div>
  );
}
