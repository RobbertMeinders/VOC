import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/session";
import { CopyEmbedCode } from "@/components/beheer/CopyEmbedCode";

export const metadata: Metadata = { title: "Embed-codes" };

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
    description: "Aanmeldformulier voor nieuwe leden (komt bij Beheer > Toegangsaanvragen terecht).",
    // Starthoogte vóór de eerste echte hoogtemeting — dit formulier heeft
    // elf velden onder elkaar, dus 600 (de generieke starthoogte) laat de
    // verstuurknop er al staan zonder dat er ooit een hoogte-update binnen
    // is gekomen (zie EmbedAutoHeight's vangnetten in embed.js).
    startHeight: 1100,
  },
  {
    kind: "bedrijven",
    label: "Bedrijvengids",
    description: "Overzicht van bedrijven die opt-in zijn voor de openbare bedrijvengids (zie Instellingen).",
    startHeight: 600,
  },
];

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
      <div>
        <h1 className="text-xl font-semibold text-foreground">Embed-codes</h1>
        <p className="text-sm text-muted">
          Plak deze code in een HTML/iframe-blok op de openbare VOC-website (bijv. in Elementor) om het
          bijbehorende onderdeel daar te tonen.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {EMBEDS.map((embed) => {
          // UX-review E2: dit was een complete kopie van de iframe- en
          // hoogte-/scroll-logica per embed, geplakt als inline <script> op
          // elke WordPress-pagina — een verbetering betekende dus alle
          // pagina's opnieuw bijwerken. Nu staat die logica eenmalig in
          // /public/embed.js (door dit portaal zelf gehost); de website
          // plakt alleen nog dit korte tagje, en krijgt toekomstige fixes
          // vanzelf mee bij de volgende paginalading.
          const code = `<script src="${origin}/embed.js" data-embed="${embed.kind}" data-start-height="${embed.startHeight}" data-sticky-header="100" async></script>`;
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
        Dit ene tagje plaatst de iframe zelf (geen los <code>&lt;iframe&gt;</code> meer nodig op de website) en regelt
        de hoogte: <code>data-start-height</code> is alleen de starthoogte tot de pagina geladen is, daarna past
        &apos;m zich automatisch aan de inhoud aan — geen los scrollbalkje in het iframe nodig. Komt dit door een
        optimalisatieplugin vertraagd tot stand, dan herhaalt de embed de eerste 10 seconden elke seconde zijn hoogte
        én vraagt het scriptje er zelf nog eens actief naar zodra de iframe geladen is. De inhoud is altijd in het
        lichte thema, ongeacht de thema-voorkeur van de bezoeker, zodat het bij een witte website blijft passen. Klik
        je in de agenda door naar een detailpagina (of terug), dan scrollt de website automatisch weer naar de
        bovenkant van het embed, ook als je daarvoor ver naar beneden had gescrold — staat de titel daarvan nu nog
        (deels) achter de menubalk van de website, verhoog dan het getal in <code>data-sticky-header</code> (0 als de
        site geen vaste menubalk heeft). In de bedrijvengids opent een bedrijf juist als overlay bovenop de lijst,
        precies waar je op dat moment aan het kijken bent — daar hoeft dus niets te scrollen. Staat er nog een oudere
        versie (met een los <code>&lt;iframe&gt;</code> en een lang inline scriptje) op de website, vervang die dan
        door de nieuwe, korte code hierboven.
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
