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
    fullWidth: false,
  },
  {
    id: "voc-embed-aanmelden",
    path: "/embed/aanmelden",
    label: "Word lid",
    description: "Aanmeldformulier voor nieuwe leden (komt bij Beheer > Toegangsaanvragen terecht).",
    fullWidth: false,
  },
  {
    id: "voc-embed-bedrijven",
    path: "/embed/bedrijven",
    label: "Bedrijvengids",
    description: "Overzicht van bedrijven die opt-in zijn voor de openbare bedrijvengids (zie Instellingen).",
    // Spant de volle breedte van de website (i.p.v. de smallere content-
    // container) via de bekende "full-bleed"-CSS-truc — nodig zodat de
    // verduistering achter een geopend bedrijf (zie CompanyDetailOverlay)
    // niet blijft steken in witte marges links/rechts. De inhoud zelf blijft
    // via een max-w-wrapper in de embed-pagina zelf mooi centraal staan.
    fullWidth: true,
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
          //
          // Voor de agenda-embed: leest ook een leesbaar #-anker (bv.
          // "#open-borrel") in de URL van DEZE (WordPress-)pagina uit — dat
          // kan het scriptje hier wél, in tegenstelling tot de iframe-inhoud
          // zelf, die vanwege cross-origin nooit bij de hash van de
          // omliggende pagina kan. Dat anker komt uit de "Delen"-knop op de
          // activiteit-detailpagina (zie ShareActivityButton, marketingUrl).
          // Het scriptje geeft de slug enkel door als ?activiteit=<slug> —
          // /embed/agenda zoekt 'm zelf op en stuurt de iframe door, zodat
          // een gedeelde link altijd de echte site opent, direct
          // doorgesprongen naar de juiste activiteit, i.p.v. de kale
          // embed-URL zonder sitenavigatie eromheen.
          const hashRedirect =
            embed.id === "voc-embed-agenda"
              ? `
  var slug = window.location.hash.replace(/^#/, '');
  if (slug) {
    iframe.src = '${origin}/embed/agenda?activiteit=' + encodeURIComponent(slug);
  }`
              : "";
          // full-bleed-truc: laat de iframe de volle breedte van het venster
          // innemen ondanks een smallere content-container eromheen — nodig
          // zodat de eigen verduistering van de bedrijvengids-overlay (zie
          // CompanyDetailOverlay, gewoon binnen de iframe zelf) niet blijft
          // steken in witte marges links/rechts. Werkt niet als een thema
          // ergens overflow-x: hidden zet op een voorouder van de iframe.
          const fullWidthStyle = embed.fullWidth
            ? "width:100vw;position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;"
            : "";
          const code = `<iframe id="${embed.id}" src="${origin}${embed.path}" width="100%" height="600" style="border:0;${fullWidthStyle}" allow="clipboard-write; web-share" title="VOC ${embed.label}"></iframe>
<script>
(function () {
  var iframe = document.getElementById('${embed.id}');
  window.addEventListener('message', function (event) {
    if (event.source !== iframe.contentWindow || !event.data) return;
    if (event.data.type === 'voc-embed-height') {
      iframe.style.height = event.data.height + 'px';
    }
    // Deze iframe heeft zelf geen scrollbalk (hoogte volgt de inhoud) — dus
    // scrollen gebeurt altijd op deze pagina. Zonder dit blijft de pagina op
    // dezelfde scrollpositie hangen zodra je vanuit een lang, naar beneden
    // gescrold overzicht doorklikt naar een detailpagina: je ziet dan het
    // midden van die nieuwe pagina i.p.v. de titel/context bovenaan.
    if (event.data.type === 'voc-embed-scroll-top') {
      var rect = iframe.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 20, behavior: 'smooth' });
    }
    // De bedrijvengids-embed toont een detailoverlay bovenop de lijst i.p.v.
    // een nieuwe pagina — die iframe heeft zelf geen scrollbalk (window.scrollY
    // is daarbinnen altijd 0), dus alleen wij weten hier welk stukje van de
    // iframe nu daadwerkelijk in beeld is. Dat geven we terug zodat de
    // overlay zich daarop kan positioneren i.p.v. altijd bovenaan te
    // verschijnen.
    if (event.data.type === 'voc-embed-request-viewport-offset') {
      var iframeRect = iframe.getBoundingClientRect();
      var offset = Math.max(0, -iframeRect.top);
      iframe.contentWindow.postMessage({ type: 'voc-embed-viewport-offset', offset: offset }, '*');
    }
  });
${hashRedirect}
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
        thema-voorkeur van de bezoeker, zodat het bij een witte website blijft passen. Klik je in de agenda door naar
        een detailpagina (of terug), dan scrollt de website automatisch weer naar de bovenkant van het embed, ook als
        je daarvoor ver naar beneden had gescrold. In de bedrijvengids opent een bedrijf juist als overlay bovenop de
        lijst, precies waar je op dat moment aan het kijken bent — de iframe neemt daarvoor de volle breedte van de
        website in (i.p.v. de smallere content-container), zodat de verduistering achter de overlay niet blijft
        steken in witte marges; de inhoud zelf blijft daarbinnen gewoon mooi centraal staan. Staat er nog een oudere
        versie van deze code op de website, plak &apos;m dan hier opnieuw.
      </p>
      <p className="text-xs text-muted">
        De &quot;Delen&quot;-knop op een activiteit deelt naar de echte website (met een leesbaar #-anker, bijv.
        #open-borrel) in plaats van de kale embed-URL, zodra de environment variable{" "}
        <code>MARKETING_AGENDA_URL</code> op Vercel is ingesteld op de volledige URL van de agenda-pagina (bijv.
        https://www.vocveendam.nl/agenda). Plak na het instellen of wijzigen daarvan de agenda-embedcode hierboven
        opnieuw, zodat het scriptje het anker herkent.
      </p>
    </div>
  );
}
