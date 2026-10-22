import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getOwnDataExport } from "@/lib/profile/export-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateLong, formatDateTime } from "@/lib/format/date";

export const metadata: Metadata = { title: "Mijn gegevens" };

const POST_TYPE_LABELS: Record<string, string> = {
  update: "Update",
  vraag: "Vraag",
  aanbod: "Aanbod",
  voorstellen: "Voorstellen",
};

// Lidmaatschap-traject Deel 3: leesbaar alternatief voor de rauwe JSON-
// export (/api/profiel/export) — zelfde data (getOwnDataExport), maar als
// Nederlandstalig overzicht i.p.v. een technisch bestand. De JSON-versie
// blijft gewoon bestaan en wordt hieronder als "technische versie" gelinkt.
export default async function ProfileExportPage() {
  const profile = await requireProfile();
  const data = await getOwnDataExport(profile);

  return (
    <div>
      <PageHeader
        title="Mijn gegevens"
        description={`Een overzicht van wat de VOC over jou bewaart, gegenereerd op ${formatDateLong(data.geëxporteerd_op)}.`}
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Profiel</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Field label="Naam" value={data.profiel.naam} />
            <Field label="E-mailadres" value={data.profiel.email} />
            <Field label="Telefoon" value={data.profiel.telefoon} />
            <Field label="Functie" value={data.profiel.functie} />
            <Field label="Rol" value={data.profiel.rol} />
            <Field label="Lid sinds" value={formatDateLong(data.profiel.lid_sinds)} />
            <Field label="LinkedIn" value={data.profiel.linkedin} />
            <Field label="Instagram" value={data.profiel.instagram} />
            <Field label="Facebook" value={data.profiel.facebook} />
          </dl>
          {data.profiel.bio && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted">Bio</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{data.profiel.bio}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bedrijfskoppeling</h2>
          {data.bedrijfskoppeling.length === 0 ? (
            <p className="text-sm text-muted">Niet gekoppeld aan een bedrijf.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {data.bedrijfskoppeling.map((row, i) => (
                <li key={i}>
                  {row.company?.name ?? "Onbekend bedrijf"}
                  {row.is_primary && " — primair contact"} (sinds {formatDateLong(row.created_at)})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Activiteit-aanmeldingen</h2>
          {data.activiteit_aanmeldingen.length === 0 ? (
            <p className="text-sm text-muted">Geen aanmeldingen.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {data.activiteit_aanmeldingen.map((row, i) => (
                <li key={i}>
                  {row.activity?.title ?? "Verwijderde activiteit"}
                  {row.activity?.starts_at && <> — {formatDateLong(row.activity.starts_at)}</>}
                  {row.is_waitlisted && " (wachtlijst)"}
                  {row.attended && " · aanwezig geweest"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Berichten in de feed</h2>
          {data.feed_berichten.length === 0 ? (
            <p className="text-sm text-muted">Geen berichten geplaatst.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm text-foreground">
              {data.feed_berichten.map((post) => (
                <li key={post.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <p className="mb-1 text-xs text-muted">
                    {(post.type && POST_TYPE_LABELS[post.type]) ?? post.type} — {formatDateTime(post.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{post.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Reacties</h2>
          {data.feed_reacties.length === 0 ? (
            <p className="text-sm text-muted">Geen reacties geplaatst.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm text-foreground">
              {data.feed_reacties.map((comment) => (
                <li key={comment.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <p className="mb-1 text-xs text-muted">{formatDateTime(comment.created_at)}</p>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/api/profiel/export"
          download
          className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-petrol hover:underline"
        >
          <Download size={14} />
          Technische versie downloaden (JSON)
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
