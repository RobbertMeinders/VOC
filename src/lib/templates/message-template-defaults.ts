// Standaardinhoud per bericht — zelfde tekst als de seed in migratie
// 0129_message_templates.sql. Losse, bewust gedupliceerde bron (i.p.v. de
// migratie-SQL inlezen) omdat "Standaardtekst terugzetten" in de UI gewoon
// een TypeScript-waarde moet kunnen teruglezen; wijzigt de standaardtekst
// ooit, dan verandert dat net als de migratie zelf niet met terugwerkende
// kracht voor bestaande installaties.
export type MessageTemplateDefault = {
  subject: string;
  bodyHtml: string;
  ctaLabel: string;
  afterHtml: string;
  pushTitle: string | null;
  pushBody: string | null;
};

export const MESSAGE_TEMPLATE_DEFAULTS: Record<string, MessageTemplateDefault> = {
  "uit-nieuw": {
    subject: "Welkom bij de Veendammer Ondernemers Compagnie",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>Hartelijk dank voor je aanmelding bij de Veendammer Ondernemers Compagnie. Namens het bestuur heet ik je van harte welkom als lid van ons netwerk!</p>" +
      '<p>We organiseren het hele jaar door verschillende activiteiten voor onze leden, van netwerkborrels en kennissessies tot sportieve evenementen zoals padel en golf. Een overzicht van alle geplande activiteiten vind je op <a href="https://vocveendam.nl/agenda">vocveendam.nl/agenda</a>.</p>' +
      "<p>Als VOC-lid maak je deel uit van het zakelijke netwerk van Veendam, met meer dan 110 aangesloten organisaties. We hopen je dan ook snel bij een van onze activiteiten te mogen ontmoeten!</p>" +
      "<p>Het lidmaatschap loopt per kalenderjaar. De contributie wordt jaarlijks vastgesteld tijdens de Algemene Ledenvergadering en bedraagt momenteel &euro; 200,- exclusief btw. Je ontvangt de contributienota rond de ALV in het voorjaar.</p>" +
      "<p>Als lid krijg je ook toegang tot het ledenportaal, waar je o.a. je profiel beheert, je aanmeldt voor activiteiten en in contact komt met andere leden.</p>",
    ctaLabel: "Account aanmaken",
    afterHtml:
      '<p>Deze link is 14 dagen geldig. Mocht je vragen hebben, neem dan gerust contact op via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
    pushTitle: null,
    pushBody: null,
  },
  "uit-bestaand": {
    subject: "Je persoonlijke toegang tot het VOC-ledenportaal",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>De Veendammer Ondernemers Compagnie heeft een eigen ledenportaal, en als lid kun je daar vanaf nu gebruik van maken.</p>" +
      "<p>In het portaal vind je de agenda met alle activiteiten van de VOC en meld je je eenvoudig aan. Je ziet welke ondernemers en bedrijven er nog meer lid zijn, en leden delen er ervaringen, vragen en aanbod met elkaar.</p>" +
      "<p>Aan je lidmaatschap verandert niets; je hoeft alleen nog een account aan te maken. Dat doe je via de knop hieronder.</p>",
    ctaLabel: "Maak je account aan",
    afterHtml:
      '<p>De link is 14 dagen geldig en alleen voor jou bedoeld. Heb je vragen over het portaal? Mail ons gerust via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
    pushTitle: null,
    pushBody: null,
  },
  "uit-collega": {
    subject: "{{naam_uitnodiger}} nodigt je uit voor het VOC-ledenportaal",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>{{naam_uitnodiger}} heeft je uitgenodigd voor het ledenportaal van de Veendammer Ondernemers Compagnie. Omdat {{bedrijf}} lid is van de VOC, kun jij daar als collega ook gebruik van maken.</p>" +
      "<p>In het portaal vind je de agenda met netwerkbijeenkomsten en andere activiteiten, meld je je aan en leer je de andere leden kennen. Je account wordt direct aan {{bedrijf}} gekoppeld.</p>",
    ctaLabel: "Maak je account aan",
    afterHtml: "<p>De link is 14 dagen geldig. Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail gewoon negeren.</p>",
    pushTitle: null,
    pushBody: null,
  },
  magic: {
    subject: "Je inloglink voor het VOC-ledenportaal",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>Je hebt gevraagd om in te loggen zonder wachtwoord. Met de knop hieronder ben je direct ingelogd in het ledenportaal.</p>",
    ctaLabel: "Inloggen",
    afterHtml:
      "<p>Deze link werkt één keer en is één uur geldig. Is hij verlopen? Vraag dan op de inlogpagina eenvoudig een nieuwe aan.</p>" +
      "<p>Heb je dit niet zelf aangevraagd? Dan hoef je niets te doen. Zonder deze link kan niemand op je account inloggen.</p>",
    pushTitle: null,
    pushBody: null,
  },
  reset: {
    subject: "Stel een nieuw wachtwoord in voor het VOC-ledenportaal",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>We hebben een verzoek ontvangen om het wachtwoord van je account te wijzigen. Via de knop hieronder kies je een nieuw wachtwoord.</p>",
    ctaLabel: "Nieuw wachtwoord kiezen",
    afterHtml:
      "<p>De link is één uur geldig. Kies bij voorkeur een wachtwoord dat je nergens anders gebruikt.</p>" +
      "<p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren; je huidige wachtwoord blijft gewoon geldig.</p>",
    pushTitle: null,
    pushBody: null,
  },
  email: {
    subject: "Bevestig je nieuwe e-mailadres",
    bodyHtml:
      "<p>{{greeting}}</p>" +
      "<p>Je hebt in het ledenportaal je e-mailadres gewijzigd naar dit adres. Bevestig de wijziging via de knop hieronder. Daarna ontvang je alle berichten van de VOC op dit adres.</p>",
    ctaLabel: "E-mailadres bevestigen",
    afterHtml:
      '<p>Tot je de wijziging bevestigt, blijft je oude e-mailadres in gebruik. Heb je dit niet zelf gedaan? Neem dan contact met ons op via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
    pushTitle: null,
    pushBody: null,
  },
  "nieuw-act": {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk en meld je aan",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
  herinnering: {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk de activiteit",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
  wachtlijst: {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk de activiteit",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
  reactie: {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk de reactie",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
  genoemd: {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk het bericht",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
  "nieuw-lid": {
    subject: "{{title}}",
    bodyHtml: "<p>{{body}}</p>",
    ctaLabel: "Bekijk het profiel",
    afterHtml: "",
    pushTitle: "{{title}}",
    pushBody: "{{body}}",
  },
};
