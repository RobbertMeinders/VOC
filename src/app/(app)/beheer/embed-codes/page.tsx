import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireBoard } from "@/lib/auth/session";
import { BackLink } from "@/components/ui/BackLink";
import { CopyEmbedCode } from "@/components/beheer/CopyEmbedCode";

export const metadata: Metadata = { title: "Embed-codes" };

const EMBEDS = [
  {
    id: "voc-embed-agenda",
    path: "/embed/agenda",
    label: "Agenda",
    description: "Overzicht van goedgekeurde activiteiten, doorklikbaar naar aanmelden.",
  },
  {
    id: "voc-embed-aanmelden",
    path: "/embed/aanmelden",
    label: "Word lid",
    description: "Aanmeldformulier voor nieuwe leden (komt bij Beheer > Toegangsaanvragen terecht).",
  },
];

// Basis-URL wordt uit de request zelf gehaald (host-header) i.p.v. de
// SITE_URL-environment variable, die op dit moment niet gezet hoeft te zijn
// (geen e-mailinfra vereist) — zelfde reden als waarom InvitationRow zijn
// link met window.location.origin opbouwt, alleen dan server-side.
export default async function EmbedCodesPage() {
  await requireBoard();
  const headerList = await headers();
  const host = headerList.get("host") ?? "voc-blue.vercel.app";
  const origin = `https://${host}`;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Embed-codes</h1>
        <p className="text-sm text-muted">
          Plak deze code in een HTML/iframe-blok op de openbare VOC-website (bijv. in Elementor) om het
          bijbehorende onderdeel daar te tonen.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {EMBEDS.map((embed) => {
          // Het scriptje luistert naar de hoogte die de embed-pagina zelf
          // doorgeeft (zie EmbedAutoHeight) en zet de iframe daarop — zonder
          // dit zou de iframe op de opgegeven starthoogte (600) blijven
          // staan, met een eigen scrollbalkje zodra de inhoud langer is.
          const code = `<iframe id="${embed.id}" src="${origin}${embed.path}" width="100%" height="600" style="border:0;" allow="clipboard-write; web-share" title="VOC ${embed.label}"></iframe>
<script>
(function () {
  var iframe = document.getElementById('${embed.id}');
  window.addEventListener('message', function (event) {
    if (event.source === iframe.contentWindow && event.data && event.data.type === 'voc-embed-height') {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
</script>`;
          return (
            <div key={embed.path} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{embed.label}</p>
              <p className="mt-0.5 text-xs text-muted">{embed.description}</p>
              <div className="mt-3">
                <CopyEmbedCode code={code} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        De hoogte past zich automatisch aan de inhoud aan (600 is alleen de starthoogte tot de pagina geladen is) —
        geen los scrollbalkje in het iframe nodig. De inhoud is altijd in het lichte thema, ongeacht het
        thema-voorkeur van de bezoeker, zodat het bij een witte website blijft passen.
      </p>
    </div>
  );
}
