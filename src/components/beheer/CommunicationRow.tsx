"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCommunicationAction } from "@/app/(app)/beheer/communicatie/actions";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import type { NewsletterBlock } from "@/lib/newsletter/types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"] & {
  activity?: { title: string } | null;
};

// Een echte (sterk verkleinde) weergave van de campagne i.p.v. de platte
// onderwerp/pre-header-tekst — hergebruikt dezelfde renderfunctie als de
// editor-preview en de verzending zelf, dus loopt nooit uit de pas met hoe
// de e-mail er daadwerkelijk uitziet. De iframe rendert op volledige
// e-mailbreedte (600px) en wordt daarna met een CSS-transform verkleind —
// goedkoper en altijd actueel, in tegenstelling tot een losse
// screenshot-service.
const THUMB_WIDTH = 112;
const THUMB_HEIGHT = 84;
const SOURCE_WIDTH = 600;
const SOURCE_HEIGHT = 450;
const THUMB_SCALE = THUMB_WIDTH / SOURCE_WIDTH;

function CampaignThumbnail({
  communication,
  orgName,
  logoUrl,
}: {
  communication: Communication;
  orgName: string;
  logoUrl: string | null;
}) {
  const html = useMemo(() => {
    const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];
    return renderNewsletterHtml(content, {
      subject: communication.subject,
      preheader: communication.preheader,
      showHeader: communication.show_header,
      showFooter: communication.show_footer,
      orgName,
      logoUrl,
    });
  }, [
    communication.content,
    communication.subject,
    communication.preheader,
    communication.show_header,
    communication.show_footer,
    orgName,
    logoUrl,
  ]);

  return (
    <div
      // UX-review punt 25: bg-white is bewust (toont het echte witte
      // e-mailcanvas), maar "sprong" in donker thema als een niet-getheemd
      // element i.p.v. een bewuste voorvertoning — een subtiele ring maakt
      // dat verschil duidelijk.
      className="shrink-0 overflow-hidden rounded-lg border border-border bg-white dark:ring-1 dark:ring-white/10"
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
    >
      <iframe
        title={`Voorbeeld ${communication.subject}`}
        srcDoc={html}
        sandbox=""
        scrolling="no"
        style={{
          width: SOURCE_WIDTH,
          height: SOURCE_HEIGHT,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          border: "none",
        }}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    concept: "bg-black/[.06] text-muted dark:bg-white/[.08]",
    verzonden: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    verzenden_mislukt: "bg-voc-red-light text-voc-red-text",
    ingepland: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  };
  const labels: Record<string, string> = {
    concept: "Concept",
    verzonden: "Verzonden",
    verzenden_mislukt: "Verzending onderbroken",
    ingepland: "Ingepland",
  };
  // UX-review T5: status ook herkenbaar voor kleurenblinden, niet alleen op kleur.
  const icons: Record<string, LucideIcon> = {
    verzonden: CheckCircle2,
    verzenden_mislukt: XCircle,
    ingepland: Clock,
  };
  const Icon = icons[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.concept}`}
    >
      {Icon && <Icon size={11} />}
      {labels[status] ?? status}
    </span>
  );
}

export function CommunicationRow({
  communication,
  orgName,
  logoUrl,
}: {
  communication: Communication;
  orgName: string;
  logoUrl: string | null;
}) {
  const canDelete = communication.status !== "verzonden";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <Link href={`/beheer/communicatie/${communication.id}`} className="shrink-0">
        <CampaignThumbnail communication={communication} orgName={orgName} logoUrl={logoUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/beheer/communicatie/${communication.id}`}
          className="block truncate text-sm font-medium text-foreground hover:underline"
        >
          {communication.subject}
        </Link>
        {communication.preheader && <p className="truncate text-xs text-muted">{communication.preheader}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={communication.status} />
          {communication.activity && (
            <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-muted dark:bg-white/[.08]">
              {communication.activity.title}
            </span>
          )}
          <span className="text-xs text-muted">
            {formatDate(communication.sent_at ?? communication.scheduled_at ?? communication.created_at)}
          </span>
          {typeof communication.total_recipients === "number" && (
            <span className="text-xs text-muted">{communication.total_recipients} ontvangers</span>
          )}
        </div>
      </div>
      {canDelete && (
        <DeleteButton
          confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
          onDelete={deleteCommunicationAction.bind(null, communication.id)}
        />
      )}
    </div>
  );
}
