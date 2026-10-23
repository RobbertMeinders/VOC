"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Send, XCircle, type LucideIcon } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { deleteCommunicationAction, duplicateCommunicationAction } from "@/app/(app)/beheer/communicatie/actions";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import { formatDateShort } from "@/lib/format/date";
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
  return formatDateShort(iso);
}

function StatusBadge({ status }: { status: string }) {
  // Redesign fase 2: statuskleuren uit de nieuwe tokens i.p.v. losse
  // Tailwind-standaardkleuren zonder donkere variant.
  const styles: Record<string, string> = {
    concept: "bg-status-neutral-soft text-status-neutral",
    verzonden: "bg-status-success-soft text-status-success",
    verzenden_mislukt: "bg-danger-soft text-danger-text",
    ingepland: "bg-status-warning-soft text-status-warning",
    versturen: "bg-status-warning-soft text-status-warning",
  };
  const labels: Record<string, string> = {
    concept: "Concept",
    verzonden: "Verstuurd",
    verzenden_mislukt: "Deels verstuurd",
    ingepland: "Ingepland",
    versturen: "Wordt verstuurd…",
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
  const router = useRouter();
  const confirm = useConfirm();
  const canDelete = communication.status !== "verzonden";

  const items: ActionMenuItem[] = [
    {
      label: "Dupliceren",
      onClick: async () => {
        const result = await duplicateCommunicationAction(communication.id);
        if (result.id) router.push(`/beheer/communicatie/${result.id}`);
      },
    },
  ];
  if (canDelete) {
    items.push({
      label: "Verwijderen",
      danger: true,
      onClick: async () => {
        const confirmed = await confirm({
          title: "Verwijderen?",
          description: `Weet je zeker dat je "${communication.subject}" wilt verwijderen?`,
          confirmLabel: "Verwijderen",
          danger: true,
        });
        if (!confirmed) return;
        await deleteCommunicationAction(communication.id);
        router.refresh();
      },
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface p-3 shadow-sm">
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
      {/* Live feedback: snelkoppeling naar de Verzendingen-tab (pogingen +
          ontvangers) vanuit het overzicht i.p.v. eerst de kaart te openen en
          dan handmatig naar dat tabblad te klikken. Alleen zinvol zodra er
          iets te zien is (ingepland/versturen/verzonden/deels verstuurd) --
          een concept heeft nog geen verzendingen. */}
      {communication.status !== "concept" && (
        <Link
          href={`/beheer/communicatie/${communication.id}?tab=verzendingen`}
          aria-label="Verzendingen bekijken"
          title="Verzendingen bekijken"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted"
        >
          <Send size={14} />
        </Link>
      )}
      <ActionMenu items={items} />
    </div>
  );
}
