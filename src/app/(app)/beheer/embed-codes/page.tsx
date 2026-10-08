import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyEmbedCode } from "@/components/beheer/CopyEmbedCode";

export const metadata: Metadata = { title: "Code voor de website" };

const EMBEDS = [
  {
    kind: "agenda",
    label: "Agenda",
    description: "Overzicht van goedgekeurde activiteiten, doorklikbaar naar aanmelden.",
    startHeight: 600,
  },
  {
    kind: "aanmelden",
    label: "Word lid",
    description: "Aanmeldformulier voor nieuwe leden (komt bij Beheer > Instroom terecht).",
    // Starthoogte vóór de eerste echte hoogtemeting — dit formulier heeft
    // elf velden onder elkaar, dus 600 (de generieke starthoogte) laat de
    // verstuurknop er al staan zonder dat er ooit een hoogte-update binnen
    // is gekomen (zie EmbedAutoHeight's vangnetten in de embed-pagina zelf).
    startHeight: 1100,
  },
  {
    kind: "bedrijven",
    label: "Bedrijvengids",
    description: "Overzicht van bedrijven die opt-in zijn voor de openbare bedrijvengids (zie Instellingen).",
    startHeight: 600,
  },
];

// Eerder plaatste dit scherm één <script src=".../embed.js" ...>-tagje, dat
// zelf een iframe injecteerde (UX-review E2: logica eenmalig gehost i.p.v.
// per WordPress-pagina gekopieerd). Op de praktijkwebsite bleek een extern
// geladen script onbetrouwbaar — waarschijnlijk een beveiligingsplugin of
// CSP die scripts van een ander domein blokkeert/uitstelt, met als gevolg
// een onzichtbare embed zonder enige foutmelding. Een kale <iframe> (geen
// JS nodig) werkt daar wél, dus die staat nu direct in de HTML. Het enige
// stukje JavaScript dat overblijft is een klein, hier inline meegegeven
// scriptje (geen los bestand van een ander domein) dat alleen luistert naar
// de hoogte-berichtjes die de embed-pagina zelf al verstuurt — dat raakt
// dus niet alsnog geblokkeerd door hetzelfde probleem.
function buildEmbedCode(origin: string, embed: (typeof EMBEDS)[number]): string {
  const id = `voc-embed-${embed.kind}`;
  // UX-review E3: ?thema=website laat de embed Open Sans, hoekige knoppen en
  // een transparante achtergrond gebruiken i.p.v. het portaalthema, zodat
  // 'm niet meer als een los blok op de website staat (zie
  // src/lib/embed/theme.ts). Het portaal zelf (zonder deze parameter)
  // verandert hierdoor niet.
  const src = `${origin}/embed/${embed.kind}?thema=website`;
  // Agenda-specifiek: een leesbaar #-anker op de WordPress-pagina (bv.
  // "#open-borrel", gezet door de "Delen"-knop op de activiteit-
  // detailpagina) kan de iframe-inhoud zelf nooit lezen (cross-origin) —
  // dit scriptje wel, en geeft de slug door als &activiteit=<slug> (de src
  // heeft hierboven al een ?thema=website-parameter).
  const hashHandling =
    embed.kind === "agenda"
      ? `
  var slug = window.location.hash.replace(/^#/, "");
  if (slug) {
    iframe.src = iframe.src + "&activiteit=" + encodeURIComponent(slug);
  }
`
      : "";

  return `<iframe id="${id}" src="${src}" width="100%" height="${embed.startHeight}" style="border:0;" allow="clipboard-write; web-share" title="VOC ${embed.label}"></iframe>
<script>
(function () {
  var iframe = document.getElementById("${id}");
  if (!iframe) return;
${hashHandling}
  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow || !event.data) return;
    if (event.data.type === "voc-embed-height") {
      iframe.style.height = event.data.height + "px";
    }
    if (event.data.type === "voc-embed-scroll-top") {
      var rect = iframe.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 100 - 20, behavior: "smooth" });
    }
  });

  iframe.addEventListener("load", function () {
    iframe.contentWindow.postMessage({ type: "voc-embed-request-height" }, "*");
  });
})();
</script>`;
}

// Basis-URL wordt uit de request zelf gehaald (host-header) i.p.v. de
// SITE_URL-environment variable, die op dit moment niet gezet hoeft te zijn
// (geen e-mailinfra vereist) — zelfde reden als waarom InvitationRow zijn
// link met window.location.origin opbouwt, alleen dan server-side.
export default async function EmbedCodesPage() {
  await requireAdmin();
  const headerList = await headers();
  const host = headerList.get("host") ?? "voc-blue.vercel.app";
  const origin = `https://${host}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Code voor de website"
        description="Plak deze code in een HTML/iframe-blok op de openbare VOC-website (bijv. in Elementor) om het bijbehorende onderdeel daar te tonen."
      />

      <div className="flex flex-col gap-4">
        {EMBEDS.map((embed) => {
          const code = buildEmbedCode(origin, embed);
          return (
            <div key={embed.kind} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
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
        Plak de hele code (de <code>&lt;iframe&gt;</code>-regel én het <code>&lt;script&gt;</code>-blok erna) in één
        HTML-blok. Het getal in <code>height=&quot;…&quot;</code> is alleen de starthoogte tot de pagina geladen is, daarna
        past &apos;m zich automatisch aan de inhoud aan — geen scrollbalkje in het iframe nodig. Komt dit door een
        optimalisatieplugin op de website vertraagd tot stand, dan herhaalt de embed de eerste 10 seconden elke
        seconde zijn hoogte én vraagt het scriptje er zelf nog eens actief naar zodra de iframe geladen is. De inhoud
        is altijd in het lichte thema, ongeacht de thema-voorkeur van de bezoeker, zodat het bij een witte website
        blijft passen. De URL hierboven staat al op <code>?thema=website</code> — dat geeft de embed het lettertype
        (Open Sans), de knopvorm (hoeken i.p.v. pil) en de transparante achtergrond van vocveendam.nl zelf mee
        i.p.v. het portaalthema, en blijft ook na doorklikken (bijv. naar een activiteit) staan. Haal die parameter
        uit de URL om de embed in het portaalthema te laten zien. Klik je in de agenda door naar een detailpagina
        (of terug), dan scrollt de website automatisch
        weer naar de bovenkant van het embed, ook als je daarvoor ver naar beneden had gescrold — staat de titel
        daarvan nu nog (deels) achter de menubalk van de website, verhoog dan de <code>100</code> in de regel met
        <code>rect.top - 100 - 20</code> in het geplakte scriptje (0 als de site geen vaste menubalk heeft). In de
        bedrijvengids opent een bedrijf juist als overlay bovenop de lijst, precies waar je op dat moment aan het
        kijken bent — daar hoeft dus niets te scrollen. Staat er nog een oudere versie (een los{" "}
        <code>&lt;script src=&quot;.../embed.js&quot;&gt;</code>-tagje, of een nog ouder los <code>&lt;iframe&gt;</code> zonder
        scriptje) op de website, vervang die dan door de nieuwe code hierboven — die gehoste <code>embed.js</code>{" "}
        bleek op de praktijkwebsite onbetrouwbaar (waarschijnlijk een beveiligingsplugin of CSP die extern geladen
        scripts blokkeert), een inline scriptje zonder externe bestandslading niet.
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
