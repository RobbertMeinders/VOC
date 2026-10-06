# VOC Ledenomgeving — ontwerp-, UX- en functionaliteitsreview

6 oktober 2026 · Robbert Meinders

Origineel (bewerkbaar): https://claude.ai/code/artifact/caf3dafb-da01-4207-9025-ca0e6990f42e

## Oordeel in het kort

De ledenkant voelt al als één product; het beheer nog als een verzameling losse schermen. De kleuren, de kaarten, de navigatie en het donkere thema zijn consequent. Waar het uiteenloopt, is in de onderdelen die vaak zijn bijgebouwd: zoeken en filteren (vier verschillende patronen), lijsten in beheer (kaarten met drie rode knoppen per rij), knoppen (65 bestanden met een eigen `<button>` naast 23 die de gedeelde `Button` gebruiken) en paginabreedtes.

De drie structurele punten die het meeste opleveren:

1. **Eén lijstpatroon voor het hele portaal.** Zoekveld, filterchips, sortering, teller, lege staat en bulkacties als één herbruikbaar blok. Dat lost ongeveer een derde van alle bevindingen in dit rapport in één keer op.
2. **Een actiegericht bestuursdashboard en een herschikt beheermenu.** Nu zijn het acht losse getallen en 18 menu-items; een bestuurslid moet zelf bedenken waar werk ligt.
3. **Rollen kloppen niet met de schermen.** Een bestuurslid ziet in het beheermenu bijvoorbeeld “Leden”, maar de pagina en alle acties erachter zijn alleen voor beheerders. Rechten moeten per handeling worden vastgelegd, niet per pagina.

**Hoe getest:** live site, 6 oktober, als het testaccount (rol beheerder), op desktop (1440×900) en mobiel (390×844), in licht en donker thema, 37 schermen per combinatie, plus de broncode voor rechten en gedrag. De rol bestuurslid is niet live getest maar uit de code afgeleid; dat staat erbij waar het speelt. Niets is opgeslagen, verzonden of goedgekeurd.

**Leeswijzer bij de tabellen:** *Type* is UX (gebruiksprobleem), Eff (efficiëntie), Cons (inconsistentie), Func (ontbrekende functie) of Smaak (ontwerpvoorkeur). Impact en Moeite: K = klein, M = middel, G = groot.

## Deel 1 — Visueel ontwerp en uitstraling

De basis is consequent (rood als enige accentkleur, ronde kaarten, Inter, goed donker thema), maar knoppen, paginakoppen, breedtes en lege staten zijn per scherm opnieuw bedacht. Daardoor voelt elk scherm net anders zonder dat één ervan echt fout is.

| Nr | Waar | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | Overal; zichtbaarst in Beheer → Leden | De gedeelde `Button` wordt in 23 bestanden gebruikt, een losse `<button>` in 65. Gevolg: in één ledenkaart staan drie rode elementen (“Opslaan” gevuld, “Deactiveren” rode rand, “Verberg uit ledenlijst” gevuld). “Verberg uit ledenlijst” is visueel de zwaarste actie op de pagina. | Vier varianten met vaste regels: *primair* (rood gevuld) maximaal één per scherm of formulier; *secundair* (rand) voor alternatieven; *tekst/ghost* voor rij-acties; *destructief* alleen in een bevestigingsdialoog. Rij-acties in lijsten gaan naar een “…”-menu. Alle losse `<button>`s naar de component. | De volgende stap is in één oogopslag duidelijk; destructieve acties worden niet per ongeluk de opvallendste. | Cons | G | M |
| V2 | Agenda, agenda-detail, bedrijfsdetail, profiel vs. Home, Documenten | Vier breedtes: Agenda \~770px gecentreerd; detailpagina's \~770px links uitgelijnd met 45% leeg rechts; Home en Documenten volle breedte; Profiel-formulier tot 1060px breed. | Drie paginasjablonen: *lijst* (max 1024px, gecentreerd), *detail* (max 1024px met rechterkolom voor meta, kaart en acties vanaf 1280px), *formulier* (max 672px). | Hetzelfde soort scherm ziet er overal hetzelfde uit; geen “halflege” detailpagina's op desktop. | Cons | M | K |
| V3 | Paginakoppen overal | Elke pagina bouwt zijn kop anders: Home titel + lange ondertitel; Leden/Bedrijven titel “Netwerk” + tabs; bedrijfsdetail géén titel of terug-link; “Nieuwe activiteit” wél een terug-link; beheerpagina's titel + technische omschrijving. Op mobiel valt “+ Nieuwe activiteit” in Beheer → Activiteiten buiten beeld (pagina 481px breed). | Eén `PageHeader`: terug-link (alleen op detail/formulier), titel, optioneel één regel uitleg, één primaire actie rechts. Op mobiel gaat die actie onder de titel op volle breedte, of wordt een zwevende +-knop. | Gebruiker weet altijd waar hij is en waar de hoofdactie staat; lost de mobiele overflow structureel op. | Cons | M | K |
| V4 | Home (lid) | Het nieuwsbericht beslaat als hero \~450px; “Snelle toegang” herhaalt exact vier items uit het hoofdmenu; de ondertitel beschrijft de pagina in plaats van iets te zeggen. Er staat niets persoonlijks. | Home wordt een persoonlijk startscherm: (1) “Jouw volgende activiteit” met aanmeldstatus, (2) “Nieuw sinds je laatste bezoek” (berichten, nieuwe leden, documenten, met tellers), (3) nieuws als compacte kaart van max. 200px. Snelle toegang vervalt. | Home wordt de reden om in te loggen in plaats van een tussenstation naar het menu. | UX | G | M |
| V5 | Beheer → Activiteiten, Campagnes | Elke activiteit draagt een groene badge “Goedgekeurd”, elke campagne “Concept”. De uitzondering valt daardoor niet op. | Badges alleen voor afwijkende statussen: Ter goedkeuring (oranje), Afgewezen (grijs/rood), Verzonden (groen) en Ingepland (blauw). De normale toestand krijgt geen badge. | Statussen worden een signaal in plaats van behang. | UX | K | K |
| V6 | Lege staten: profiel “Berichten”, bedrijf “Werkzaam bij”, “Nog niets verzonden.”, “Geen leden gevonden.” | Een deel heeft een vormgegeven lege staat (Notificaties, Prospects, Rapportages: icoon in gestippeld vak), de rest is een kale grijze zin. Op 113 van de 114 bedrijfspagina's staat “Nog geen leden gekoppeld aan dit bedrijf.” | Eén `EmptyState`-component (icoon, titel, één zin, optionele actie). Op detailpagina's een lege sectie verbergen in plaats van tonen. Bij zoeken/filters: “Geen resultaten voor ‘x’” + knop “Filters wissen”. | Lege pagina's zien er bedoeld uit, en lege secties maken de bedrijvengids niet leeg-ogend. | Cons | M | K |
| V7 | Elke onbekende URL | Standaard Next.js-pagina: Engels (“404 This page could not be found.”), zonder menu, puur zwart in donker thema. Er is ook geen eigen foutpagina (`error.tsx`). | Eigen `not-found` en `error` binnen de app-shell, Nederlands: “Deze pagina bestaat niet (meer)” + knoppen Home en Zoeken; bij een fout “Er ging iets mis” + “Opnieuw proberen”. | Een dode link voelt nu als een kapotte site. | UX | M | K |
| V8 | Eigen profiel (`/leden/<id>`) | Twee bewerk-ingangen met verschillende namen: “Profiel aanpassen” bovenaan en “Profiel bewerken” onder Beheer, plus een aparte pagina `/profiel`. Op mobiel een potlood-icoon én de rode link. | Eén knop “Bewerken” op het eigen profiel. Beheerfuncties voor andermans profiel in een “…”-menu (“Rol wijzigen”, “Account deactiveren”, “Gegevens corrigeren”). | Minder twijfel welke knop je nodig hebt. | Cons | M | K |
| V9 | Statistieken | Op één pagina twee actieve-stijlen: tabs rood gevuld, periodekeuze zwart gevuld. | Eén segment-component voor alle tabs/keuzes (zie deel 3): actief = rood gevuld. | Zelfde betekenis, zelfde vorm. | Cons | K | K |
| V10 | Bevestigingen (verwijderen, pushbericht, campagne) | Native browserdialoog (`window.confirm`): grijs, systeemknoppen “OK/Annuleren”, geen merk, geen gevolgen benoemd. | `ConfirmDialog` met de actie in de knop (“Activiteit verwijderen”), het gevolg in één zin (“2 aanmeldingen vervallen”) en rode knop alleen hier. | Destructieve stappen worden bewuster en voelen onderdeel van het product. | Cons | M | K |
| V11 | Typografie | Hiërarchie is vlak: paginatitel 20px, sectiekop 14–16px, body 14px, meta 12px grijs. Op 1440px leest een titel van 20px als een sectiekop. | Schaal: paginatitel 24px (desktop) / 22px (mobiel), sectiekop 16px semibold, body 15px, meta minimaal 13px. | Duidelijker onderscheid tussen niveaus, en metatekst blijft leesbaar. | Smaak | M | K |
| V12 | Native besturingselementen | Dropdowns (“Alle branches”, “Alle rollen”), datum/tijd (`mm/dd/yyyy` bij een Engelse browser) zijn browserstandaard en wijken per apparaat af. | Eigen `Select` in de stijl van de inputs; datum en tijd als twee velden met Nederlandse notatie (dd-mm-jjjj, 24-uurs). | Voelt als één product; minder invoerfouten. | Cons | K | M |
| V13 | Sidebar onderin | De sociale knoppen van VOC (LinkedIn, Facebook, Instagram) staan permanent in de navigatie. | Naar de voettekst van Home of een pagina “Over VOC”. | Navigatieruimte voor navigatie. | Smaak | K | K |

**Herbruikbare patronen die hieruit volgen:** `PageHeader`, `Button` met vier varianten en gebruiksregels, `EmptyState`, `ConfirmDialog`, `Select`, en drie paginasjablonen. Samen met het lijstpatroon uit deel 3 dekt dat het grootste deel van wat nu als “losse schermen” voelt.

## Deel 2 — UX en gebruiksgemak

Een nieuw lid kan zonder uitleg rondkijken, maar krijgt geen enkele hulp om goed te starten, en na een actie is vaak niet zichtbaar wat er gebeurd is. De grootste winst zit in de eerste vijf minuten na registratie en in feedback na opslaan.

| Nr | Waar | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U1 | Na registratie (`/register/<token>` → `/`) | Een nieuw lid landt direct op Home, met een leeg profiel (geen foto, functie of bedrijf) en geen enkele aanwijzing wat nu. | Welkomstblok op Home tot het af is: checklist met vier stappen (foto, functie, bedrijf koppelen, pushmeldingen aan) + voortgangsbalk, wegklikbaar. Profielen zonder foto en functie tonen een subtiele “Profiel aanvullen”-prompt. | Een gevulde ledenlijst is de kern van het netwerk; nu blijft die leeg tot iemand het zelf bedenkt. | Func | G | M |
| U2 | Inloggen | “Inloggen zonder wachtwoord” en “Wachtwoord vergeten?” sturen een mail, maar het portaal kan op dit moment geen mail versturen (geen Resend/SMTP ingesteld). De gebruiker ziet een succesmelding en krijgt niets. | Tot stap 1 van het maillijstplan live is: beide links verbergen of een melding tonen “Tijdelijk niet beschikbaar, neem contact op met info@vocveendam.nl”. Daarna: na versturen tonen naar welk adres en “niets ontvangen? check je spam”. | Een stille mislukking bij inloggen is de snelste manier om leden kwijt te raken. | UX | G | K |
| U3 | Netwerk (desktop-sidebar, mobiele bottom nav, tabs op de pagina) | Drie mechanismen voor hetzelfde: een uitklapmenu in de sidebar, een keuzepopover op mobiel, en tabs Leden/Bedrijven op de pagina zelf. “Netwerk” aanklikken navigeert nergens heen. | “Netwerk” gaat direct naar `/leden`; de tabs op de pagina doen de rest. Uitklapmenu en mobiele popover vervallen. | Eén tik minder op de meest gebruikte opzoekfunctie, en minder code die (zoals bij de scrollbug) fout kan gaan. | UX | M | K |
| U4 | Na opslaan (profiel, activiteit, bedrijf) | Feedback is een klein groen “Opgeslagen.” naast de knop onderaan het formulier; op mobiel en bij lange formulieren valt dat buiten beeld. | Eén toastsysteem (rechtsonder op desktop, boven de bottom nav op mobiel) voor succes, fout en “Ongedaan maken”. | De gebruiker weet altijd dat een actie gelukt is, zonder te zoeken. | UX | M | K |
| U5 | Formuliervalidatie | Fouten komen uit de browser zelf (bijv. bij een ongeldige LinkedIn-URL de systeemballon, in de taal van de browser), niet onder het veld. | Validatie in de app: rode rand + Nederlandse foutregel onder het veld (“Vul een volledige link in, beginnend met https://”), bij meerdere fouten een samenvatting bovenaan. | Duidelijke, consistente foutmeldingen, ook in Engelstalige browsers. | UX | M | M |
| U6 | Agenda-detail (als beheerder) | Ledenweergave en beheer staan door elkaar: onder de beschrijving direct “Vink af wie er daadwerkelijk was” en “Niet-leden aangemeld” met e-mailadressen. | Beheergedeelte inklapbaar onder een kop “Beheer” (dicht als de activiteit nog moet plaatsvinden), of als tab “Aanmeldingen” naast “Informatie”. | Het bestuur ziet wat een lid ziet, en kan beheren zonder dat de pagina een lijst wordt. | UX | M | K |
| U7 | Nieuwe activiteit | Eerst een apart keuzescherm “VOC-activiteit of Ingebracht”, pas daarna het formulier. | Keuze als schakelaar bovenin het formulier, standaard “VOC-activiteit” voor bestuur; voor gewone leden onzichtbaar (altijd “Ingebracht”). | Eén scherm minder voor een handeling die het bestuur maandelijks doet. | Eff | K | K |
| U8 | Community, nieuw bericht | Plaatsen kan pas na het kiezen van een label (“Kies een label voordat je plaatst”); de knop lijkt actief maar weigert. Onder elk bericht staat permanent een reactieveld. | Label optioneel (standaard “Overig”), of de knop pas actief na labelkeuze. Reactieveld ingeklapt tot “Reageer” wordt aangeklikt; alleen bij het eerste bericht open. | Minder drempel om iets te delen; een rustiger feed. | UX | M | K |
| U9 | Badges in het menu (Netwerk “1”, bel “1”) | Een rood getal op Netwerk zegt niet waarover het gaat; na het openen van Leden is onduidelijk wat “nieuw” was. | Nieuwe items in de lijst zelf markeren (“Nieuw”-label bij een nieuw lid), en het getal in het menu een tooltip geven (“1 nieuw lid”). | Een badge moet uitleggen waar je naartoe moet. | UX | K | K |
| U10 | Beheer naast de ledenkant | Dezelfde taken op twee plekken: documenten uploaden/verwijderen op Documenten én in Beheer → Documenten; activiteit toevoegen in Agenda én in Beheer; bedrijf bewerken op de detailpagina én in Beheer → Bedrijven. | Vaste regel: één item bewerk je in context (op de pagina zelf); lijsten, status, bulk en overzicht doe je in Beheer. Beheer → Documenten wordt dan een overzicht met mappen, downloadstatistiek en bulkacties, of vervalt. | Een bestuurslid hoeft niet te kiezen waar iets moet, en Beheer voegt dan echt iets toe. | Cons | M | M |
| U11 | Formulieren: terug/annuleren | Formulieren hebben een “Terug naar …”-link bovenaan maar geen “Annuleren” naast “Opslaan”. Overlays sluiten met kruisje/Esc (goed), en er is al een waarschuwing bij niet-opgeslagen wijzigingen (goed). | Onderaan elk formulier “Opslaan” (primair) + “Annuleren” (tekstknop), op mobiel als vaste balk onderin. | De afsluitende actie staat waar de duim al is. | UX | K | K |

## Deel 3 — Zoeken, filters en efficiëntie

Zoeken en filteren werkt, maar via vier verschillende patronen, nergens met sortering, teller of bulkselectie, en elke toetsaanslag gaat langs de server. Het voorstel is één `ListToolbar` die overal hetzelfde werkt.

**Wat er nu is**

| Plek | Zoekt op | Filter | Gedrag |
| --- | --- | --- | --- |
| Leden (lid) | naam, bedrijfsnaam | branche (dropdown) | 300 ms na typen, server-request |
| Bedrijven (lid) | naam, plaats | branche (dropdown), lijst/kaart | idem |
| Documenten | documentnaam | — | idem (component heet `DocumentSearch`) |
| Beheer → Leden | naam, e-mail | rol, status (twee dropdowns) | idem |
| Beheer → Bedrijven | naam, branche, plaats | — | idem |
| Beheer → Uitnodigingen | naam, e-mail | — | idem |
| Beheer → Activiteiten | — | status (chips) | direct |
| Agenda, Community, Statistieken | — | chips | direct |
| Globaal zoeken (icoon + `/zoeken`) | leden, bedrijven, activiteiten, berichten, documenten | — | gegroepeerde resultaten |

**Beoordeling van wat er staat**

| Nr | Waar | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Z1 | Alle zoekvelden in lijsten | Elke toetsaanslag (na 300 ms) laadt de pagina opnieuw vanaf de server; gemeten 500–1000 ms per keer. Bij doortypen verspringt de lijst. | Lijsten tot \~500 items filteren in de browser (de data is er al), direct bij typen. Alleen de URL bijwerken (zodat terug en delen werkt), zonder server-render. | Zoeken voelt direct in plaats van haperend. | Eff | G | M |
| Z2 | Alle zoekvelden | Geen wisknopje (×), geen teller (“12 van 137”), geen label (alleen placeholder, ook niet voor schermlezers). | In de toolbar: × in het veld zodra er tekst staat, teller rechts boven de lijst, `aria-label` gelijk aan de placeholder. | Je ziet wat je filter doet en zet het met één tik terug. | UX | M | K |
| Z3 | Zoek + los filter (Beheer → Leden, Leden, Bedrijven) | Zoekveld op de ene regel, twee native dropdowns op de volgende; op Agenda en Community hetzelfde soort keuze als chips. | Filters met ≤ 5 waarden als chips (Rol: Alle · Lid · Bestuur · Beheerder), anders als één knop “Filters” die een paneel opent (op mobiel een bottom sheet). Actieve filters als verwijderbare chips onder de zoekbalk + “Alles wissen”. | Eén manier van filteren door het hele portaal; actieve filters zijn altijd zichtbaar. | Cons | M | M |
| Z4 | Wat doorzocht wordt | Leden: niet op functie of branche; Bedrijven: niet op tagline, branche als tekst of de mensen die er werken; Beheer → Leden: niet op bedrijf; geen spelfoutvergeving (“meinders” vindt “Meinders” wel, “meinder s” niet; accenten worden niet genegeerd). | Per lijst één zoekindex: leden op naam, functie, bedrijf, branche, e-mail (beheer); bedrijven op naam, tagline, branche, plaats, mensen. Accenten negeren (“cafe” vindt “Café”). Placeholder noemt de velden: “Zoek op naam, functie of bedrijf”. | Leden zoeken naar “wie doet marketing”, niet naar een exacte naam. | Func | M | K |
| Z5 | Globaal zoeken | “veendam” geeft 90 bedrijven onder elkaar, zonder ordening of “toon meer”; zoeken staat als klein icoon naast het logo. | Max. 5 per groep met “Alle 90 bedrijven →” naar de gefilterde lijst; exacte naamtreffers bovenaan. Sneltoets `/` of `Ctrl+K` op desktop. | Snelle sprong naar wat je zoekt, zonder eindeloze lijst. | UX | M | K |
| Z6 | Mobiel: chips | Statuschips in Beheer → Activiteiten lopen buiten beeld (“Afge…”) zonder hint dat je kunt scrollen. | Chips laten afbreken naar een tweede regel, of bij meer dan 4 waarden één knop “Status: Alle ▾” met bottom sheet. | Alles bereikbaar zonder gokken. | UX | K | K |

**Het voorstel: één `ListToolbar`**, overal gelijk opgebouwd:

1. Zoekveld (met ×, label, directe filtering) links; teller “12 van 137” rechts.
2. Filterchips of één “Filters”-knop; actieve filters als verwijderbare chips, plus “Alles wissen”.
3. Sorteerkeuze (“Sorteer: Naam ▾”) waar volgorde ertoe doet.
4. Optioneel: selectievakjes per rij, met een balk “3 geselecteerd · Actie ▾” die verschijnt zodra iets geselecteerd is.
5. Lege staat “Geen resultaten voor ‘x’” + “Filters wissen”.
6. Filters en zoekterm in de URL, zodat terug en delen werken.

**Waar zoeken, filteren, sorteren of bulk nog ontbreekt**

| Plek | Zoeken | Filter | Sortering | Bulk / snelactie |
| --- | --- | --- | --- | --- |
| Leden (lid) | + functie, branche | “Nieuw” (laatste 30 dagen), commissie | Naam, nieuwste eerst | — |
| Bedrijven (lid) | + mensen, tagline | plaats | Naam, nieuwste | — |
| Agenda (lid) | titel, locatie | “Ik ben aangemeld” | — | Aanmelden direct vanuit de kaart |
| Community | tekst, auteur | “Mijn berichten”, “Met vermelding van mij” | Nieuwste, meeste reacties | — |
| Documenten | + inhoud van de PDF | map, jaar | Datum, naam | — |
| Beheer → Leden | + bedrijf | + “profiel onvolledig”, “nooit ingelogd” | Naam, laatst actief | Rol wijzigen, (de)activeren, op lijst zetten |
| Beheer → Bedrijven | — | branche, “zonder leden”, “zonder logo” | Naam, aangemaakt | Branche wijzigen, verwijderen |
| Beheer → Uitnodigingen | — | verloopt binnen 7 dagen, verlopen, nooit verstuurd | Vervaldatum, naam | **Versturen**, verlengen, intrekken voor een selectie |
| Beheer → Activiteiten | titel | komend / afgelopen | Datum | Goedkeuren direct vanuit de lijst |
| Beheer → Campagnes, Nieuws | onderwerp | status | Datum | Dupliceren |
| Potentiële leden, Aanvragen, Rapportages | naam, e-mail | status | Datum | Status zetten voor een selectie; “Uitnodigen” vanuit de rij |
| Beheer → Notificaties (log) | titel | type, kanaal | Datum | — |

## Deel 4 — Nieuwe functionaliteit

Het portaal is nu sterk in vastleggen (agenda, bedrijven, documenten) en zwak in verbinden: leden hebben weinig redenen om terug te komen of elkaar via het portaal te vinden. De voorstellen hieronder bouwen allemaal voort op wat er al is, en staan op volgorde van waarde.

| Nr | Wat | Waarom | Voor wie | Hoe het werkt | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | **“Nieuw sinds je laatste bezoek” + weekoverzicht per mail** | Nu is er geen reden om in te loggen als je geen melding krijgt; de meeste leden zullen niet dagelijks kijken. | Alle leden | Op Home een blok met tellers en de items zelf: nieuwe berichten, nieuwe leden, nieuwe activiteiten, nieuwe documenten, sinds `last_seen`. Elke maandag een digestmail met hetzelfde, uit te zetten in Instellingen. Bouwt op het notificatiesysteem en het SMTP-plan. | G | M |
| F2 | **Vraag & aanbod als volwaardig prikbord** | De labels Vraag en Aanbod bestaan al, maar verdwijnen in de feed. Juist zakelijke vragen (“wie kent een goede installateur”, “ik heb ruimte over”) zijn wat leden nu via WhatsApp doen. | Alle leden | Bericht van type Vraag/Aanbod krijgt een categorie (branche), optioneel “geldig tot”, en een status “Opgelost”. Eigen pagina “Vraag & aanbod” met filter op branche; open vragen uit je eigen branche komen op Home. Reacties kunnen openbaar of “privé reageren” (zie F6). | G | M |
| F3 | **Functies binnen VOC en commissies** | Wie de voorzitter is of wie de padel organiseert, staat nu nergens. Commissies organiseren de activiteiten, maar bestaan niet in het systeem. | Leden, bestuur, commissieleden | Tabellen `committees` en `committee_members` (met functie: voorzitter, secretaris, lid). Op profielen badges (“Penningmeester”, “Padelcommissie”). Per commissie een pagina met leden, komende activiteiten en een contactknop. Activiteiten krijgen “Georganiseerd door: Padelcommissie”. Zie deel 7 voor de rechten. | G | M |
| F4 | **Lid-voordelen op bedrijfsprofielen** | Het klassieke argument om lid te blijven van een ondernemersvereniging is wat je aan elkaar hebt; dat is nu niet zichtbaar. | Leden, potentiële leden (op de website) | Bedrijven kunnen een “Voordeel voor VOC-leden” invullen (titel, omschrijving, hoe te claimen). Overzichtspagina “Ledenvoordelen”, filterbaar op branche, en een teller op het bedrijfsprofiel. Optioneel tonen op de openbare bedrijvengids als wervend argument. | G | K |
| F5 | **Onboarding en voorstelronde voor nieuwe leden** | Nieuwe leden zijn voor de rest onzichtbaar tot ze zelf iets doen. | Nieuwe leden, alle leden | Checklist bij de eerste keer inloggen (zie U1). Na het aanvullen van het profiel een voorstel: “Stel jezelf voor in de community” met een ingevuld sjabloon (naam, bedrijf, wat je zoekt, wat je biedt). Op Home een blok “Nieuwe leden deze maand” met foto's. | G | M |
| F6 | **Contact opnemen zonder e-mailadres te delen** | Contactgegevens zijn (terecht) per lid af te schermen; dan is er nu geen manier om iemand te bereiken. | Alle leden | Knop “Stuur bericht” op profiel en bedrijfspagina. Het portaal mailt het bericht door met jouw naam en je adres als reply-to; de ontvanger beslist zelf of hij antwoordt. Geen chatfunctie (te veel onderhoud), wel een log zodat misbruik te zien is. Vereist SMTP (maillijstplan stap 1). | M | M |
| F7 | **“Mijn agenda” en een abonneerbare agenda-feed** | Leden zien niet in één oogopslag waarvoor ze zich hebben aangemeld; één .ics per activiteit downloaden is omslachtig. | Alle leden | Filter “Ik ben aangemeld” op Agenda en een blok op Home. Per lid een privé iCal-link (“Abonneer in je agenda”) die alle aangemelde (of alle) VOC-activiteiten bevat en vanzelf bijwerkt in Outlook, Google of Apple. | M | K |
| F8 | **Inchecken bij activiteiten met een QR-code** | Aanwezigheid wordt nu achteraf handmatig afgevinkt; dat gebeurt in de praktijk niet consequent. | Bestuur, commissies | Per activiteit een QR-code op de deur; leden scannen en zijn ingecheckt (“daadwerkelijk aanwezig”). Niet-leden kunnen hun naam achterlaten en komen bij Potentiële leden. Voedt de aanwezigheidsstatistieken. | M | M |
| F9 | **Zoeken in de inhoud van documenten** | Notulen en stukken zijn alleen op titel vindbaar; “wanneer is het contributiebesluit genomen” vind je niet. | Leden, bestuur | Bij uploaden de tekst uit de PDF halen en opslaan in een zoekindex (Postgres full-text, Nederlands). Zoekresultaten tonen het fragment met de treffer. | M | M |
| F10 | **Contributie- en lidmaatschapsstatus** | De penningmeester houdt dit nu waarschijnlijk in een spreadsheet bij, los van het ledenbestand. | Penningmeester, bestuur | Per lid/bedrijf: lid sinds, lidmaatschapstype, contributie betaald (ja/nee per jaar), opzegdatum. Export naar CSV. Geen betalingen in de app; alleen de administratie op één plek. | M | M |

**Bewust niet voorgesteld:** een eigen chat (WhatsApp blijft winnen en het kost veel onderhoud) en “volgen” of favorieten (te weinig waarde bij \~115 leden; zoeken en de digest dekken dit).

## Deel 5 — Beheer: één samenhangend beheerpaneel

Het beheermenu telt 18 items in vijf groepen, ingedeeld naar soort scherm in plaats van naar het werk van een bestuurslid. Vier items gaan over hetzelfde proces (iemand wordt lid), twee “Notificaties” betekenen iets anders dan in de rest van het portaal, en “Handmatig pushbericht” staat onder Systeem terwijl het communicatie is. Voorstel: vijf groepen, ingedeeld naar taak, 14 items, waarvan twee nieuw (Commissies, Contacten & lijsten). Documenten verdwijnt uit Beheer en wordt alleen op de Documentenpagina zelf beheerd (zie U10).

**Voorgestelde structuur**

| Groep | Menu-item | Bevat (nu) | Wie |
| --- | --- | --- | --- |
| Overzicht | **Vandaag** | Dashboard, maar actiegericht (zie deel 6) | Bestuur |
| Overzicht | **Statistieken** | Statistieken | Bestuur |
| Leden | **Leden** | Leden; tab “Rollen” alleen voor beheerder | Bestuur (wijzigen: zie deel 7) |
| Leden | **Bedrijven** | Bedrijven | Bestuur |
| Leden | **Instroom** | Tabs: Aanvragen · Uitnodigingen · Potentiële leden · Importeren | Bestuur |
| Leden | **Commissies** *(nieuw)* | Commissies en functies (deel 4, F3) | Bestuur |
| Activiteiten & content | **Activiteiten** | Activiteiten (met “Ter goedkeuring” als eerste tab als er iets wacht) | Bestuur, commissie voor eigen activiteiten |
| Activiteiten & content | **Nieuws** | Nieuws | Bestuur |
| Activiteiten & content | **Moderatie** | Rapportages (hernoemd), plus verwijderde berichten | Bestuur |
| Communicatie | **Nieuwsbrieven** | Campagnes (hernoemd) | Bestuur |
| Communicatie | **Contacten & lijsten** *(nieuw)* | Uit het maillijstplan | Bestuur |
| Communicatie | **Pushbericht** | Handmatig pushbericht (verplaatst uit Systeem) | Beheerder |
| Communicatie | **Verzendlog** | Notificaties (hernoemd) | Beheerder |
| Instellingen | **Instellingen** *(één pagina met tabs)* | Algemeen & branding (App-instellingen) · Sjablonen (e-mail en push) · Website-koppelingen (Embed-codes) · Rollen & rechten *(nieuw)* · E-mailverzending (SMTP-status, testmail) | Beheerder |

**Wat samengaat en waarom**

- **Instroom** bundelt vier pagina's die één trechter zijn: iemand vraagt toegang aan of meldt zich aan voor een activiteit, krijgt een uitnodiging, en wordt lid. Nu wissel je tussen vier schermen om één persoon te volgen. Met tabs en per persoon een status (“Aangevraagd → Uitgenodigd → Lid”) zie je de hele weg op één plek. Vanuit Potentiële leden en Aanvragen wordt “Uitnodigen” een knop in de rij.
- **Instellingen** bundelt vier systeempagina's. Die worden zelden bezocht en horen niet als vier gelijkwaardige menu-items naast het dagelijkse werk.
- **Moderatie** in plaats van Rapportages: “rapportage” leest als een cijferrapport, terwijl het over gemelde berichten gaat.

**Wat apart blijft:** Activiteiten (dagelijks gebruik, eigen goedkeuringsflow), Nieuwsbrieven (eigen editor) en Statistieken (andere vraag dan “wat moet ik doen”).

**Indeling van het scherm**

- **Desktop:** in Beheer staan nu twee zijbalken naast elkaar (\~530px); de inhoud begint op een derde van het scherm. Voorstel: in Beheer klapt de hoofdsidebar in tot alleen iconen (64px), met bovenaan “← Terug naar portaal”.
- **Mobiel:** nu een dropdown bovenaan elke beheerpagina. Voorstel: “Beheer” opent een overzichtspagina met de groepen als lijst (zoals Instellingen op een telefoon), met badges voor openstaand werk; elke subpagina krijgt een terugpijl naar dat overzicht.
- **Badges in het beheermenu** tonen openstaand werk (aanvragen, ter goedkeuring, meldingen), niet totalen.

## Deel 6 — Beheer: efficiëntie

Het dashboard toont acht getallen die nergens naartoe linken; wie “0 openstaande aanvragen” ziet, moet zelf naar het juiste scherm. En het proces “iemand wordt lid” vraagt dubbel invoeren: een toegangsaanvraag kun je alleen “afgehandeld” markeren en moet je daarna met de hand overtypen in Uitnodigingen.

**Een actiegericht dashboard (“Vandaag”)**

Van boven naar beneden, en een blok verdwijnt als het leeg is:

1. **Wacht op jou** — één lijst, met de actie in de rij: toegangsaanvragen (“Uitnodigen” / “Afwijzen”), activiteiten ter goedkeuring (“Goedkeuren” / “Bekijken”), gemelde berichten (“Behouden” / “Verwijderen”), uitnodigingen die binnen 7 dagen verlopen (“Verlengen”), ingeplande nieuwsbrieven die nog geen ontvangers hebben.
2. **Komende activiteiten** — de eerstvolgende drie met aanmeldingen t.o.v. maximum (“14/40”), en een waarschuwing bij weinig aanmeldingen kort voor de datum.
3. **Recent** — nieuwe leden van de afgelopen 30 dagen (met “profiel onvolledig”-markering), laatste berichten in de community, nieuwsbriefconcepten.
4. **Kerncijfers** — vier tegels, elk klikbaar naar de gefilterde lijst: actieve leden (met trend), activatie (“4 van 141 uitgenodigden hebben een account”), aanmeldingen deze maand, leden actief in de laatste 30 dagen. “Leden nu online” vervalt; het zegt niets over wat het bestuur moet doen.

**Per onderdeel**

| Nr | Onderdeel | Meest gebruikte actie | Nu | Voorstel | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Toegangsaanvragen → Uitnodigingen | Iemand toelaten | Aanvraag markeren als afgehandeld, daarna in Uitnodigingen het e-mailadres opnieuw invullen. Het uitnodigingsformulier vraagt alleen e-mail en rol, geen naam of bedrijf. | Knop “Uitnodigen” in de aanvraag zelf, die naam, e-mail en bedrijf meeneemt; idem vanuit Potentiële leden. Uitnodigingsformulier krijgt voornaam, achternaam en bedrijf (met bestaand bedrijf kiezen). | G | K |
| B2 | Uitnodigingen | Herinneren, verlengen | 137 rijen met elk twee knoppen en twee iconen (±17.000 px op mobiel). Alleen “Verleng alle” is bulk. Geen status “al verstuurd?”. | Compacte tabel: naam, bedrijf, status (Niet verstuurd / Verstuurd op … / Verlopen), vervaldatum, “…”-menu. Selectie + “Verstuur”, “Verleng”, “Intrekken”. Filter “Nooit verstuurd”. | G | M |
| B3 | Leden | Rol wijzigen, deactiveren | Per lid een kaart met rolkeuze + Opslaan, deactiveren en “Verberg uit ledenlijst”; geen link naar het profiel; geen “laatst actief”. | Tabelrij: naam (link naar profiel), bedrijf, rol, status, laatst actief, “…”-menu. Rol wijzigen in het menu met bevestiging en “Ongedaan maken”. Kolom “Profiel” met % compleet. | M | M |
| B4 | Activiteiten | Goedkeuren, aanwezigheid | Goedkeuren gebeurt op de detailpagina. Lijst mengt verleden en toekomst. | Tabs “Komend” (oplopend), “Ter goedkeuring” (met teller), “Afgelopen” (aflopend). Goedkeuren en afwijzen in de rij. Kolom aanmeldingen/maximum. “Dupliceren” voor terugkerende borrels. | M | K |
| B5 | Bedrijven | Gegevens bijwerken | 114 kaarten, alleen bewerken en verwijderen. Niet te zien welke bedrijven onvolledig zijn. | Kolommen: logo aanwezig, aantal leden, laatst bijgewerkt. Filters “zonder logo”, “zonder leden”, “zonder omschrijving”. Bedrijfseigenaren vragen hun profiel aan te vullen (mail via SMTP). | M | M |
| B6 | Nieuwsbrieven | Opstellen, versturen | Editor is sterk. Elke nieuwsbrief begint leeg of vanuit een activiteit. | “Dupliceer vorige nieuwsbrief” en “Opslaan als sjabloon”. Blok “Komende activiteiten” dat zichzelf vult. | M | K |
| B7 | Moderatie (Rapportages) | Melding afhandelen | Werkt; afgehandelde meldingen blijven onder elkaar staan. | Afgehandeld standaard ingeklapt; badge in het menu voor open meldingen. | K | K |
| B8 | Nieuws | Publiceren | Formulier en lijst op één pagina; formulier staat altijd open bovenaan. | Lijst eerst, “Nieuw bericht” opent het formulier; voorbeeld zoals het op Home verschijnt. | K | K |
| B9 | Overal in beheer | Dezelfde info opnieuw zoeken | Wisselen tussen Leden, Bedrijven, Uitnodigingen en Aanvragen om één persoon te begrijpen. | Eén persoonspagina voor beheer met tijdlijn: aangevraagd → uitgenodigd → account → aanmeldingen → berichten. Overal waar een naam staat, linkt die daarheen. | M | M |

## Deel 7 — Rollen en rechten

De drie rollen zijn een goede basis, maar de rechten zijn per pagina geregeld in plaats van per handeling, en schermen laten opties zien die de rol niet mag gebruiken. Daarnaast ontbreekt het onderscheid tussen *wie iemand is binnen VOC* (functie, commissie) en *wat iemand mag in het systeem* (rol).

**Wat nu niet klopt (uit de code; de rol bestuurslid is niet live getest)**

| Nr | Observatie | Voorstel | Impact | Moeite |
| --- | --- | --- | --- | --- |
| R1 | Beheer → Leden staat in het menu voor bestuursleden, maar de pagina vereist beheerder (`requireAdmin`). Een bestuurslid klikt dus op een menu-item dat niet werkt. | Bestuurslid krijgt Leden wél te zien (lezen, deactiveren, gegevens corrigeren); alleen het toekennen van rollen blijft beheerder. | G | K |
| R2 | Het uitnodigingsformulier toont een bestuurslid ook de rollen Bestuurslid en Beheerder; kiezen geeft pas na verzenden een foutmelding. | Rolkeuze verbergen voor bestuursleden (altijd “Lid”). | K | K |
| R3 | Een beheerder kan in Beheer → Leden de eigen rol verlagen. Er is geen bescherming tegen “geen enkele beheerder meer”. | Eigen rol niet wijzigbaar; de laatste beheerder kan niet worden verlaagd of gedeactiveerd. | M | K |
| R4 | Rechten zitten verspreid als `isBoard`/`isAdmin`/`requireBoard`/`requireAdmin` in tientallen bestanden, plus RLS. | Eén centrale helper `can(profiel, "activiteiten.goedkeuren")` met de matrix hieronder, zowel in de app als in Postgres-functies. Menu-items en knoppen lezen dezelfde bron. | M | M |

**Voorstel: rechten per rol**

✓ = mag · — = mag niet · *eigen* = alleen voor de eigen commissie of het eigen bedrijf. Vetgedrukt = anders dan nu.

| Handeling | Lid | Commissielid | Bestuurslid | Beheerder |
| --- | --- | --- | --- | --- |
| Leden en bedrijven bekijken (met privacy-instellingen) | ✓ | ✓ | ✓ incl. contactgegevens | ✓ |
| Eigen profiel en eigen bedrijf bewerken | ✓ | ✓ | ✓ | ✓ |
| Gegevens van andere leden corrigeren | — | — | **✓** | ✓ |
| Leden deactiveren | — | — | **✓** | ✓ |
| Leden definitief verwijderen / anonimiseren | — | — | — | ✓ |
| Rollen toekennen | — | — | — | ✓ (niet de eigen, niet de laatste beheerder) |
| **Functies en commissies toekennen** | — | — | ✓ | ✓ |
| Bedrijven van anderen bewerken | — | — | ✓ | ✓ |
| Bedrijven verwijderen | — | — | — | ✓ |
| Activiteit inbrengen | ✓ ter goedkeuring | **✓ direct gepubliceerd, *eigen*** | ✓ | ✓ |
| Activiteiten bewerken, aanmeldingen en aanwezigheid beheren | eigen inzending | **✓ *eigen*** | ✓ | ✓ |
| Activiteiten goedkeuren of afwijzen | — | — | ✓ | ✓ |
| Nieuws en documenten beheren | — | — | ✓ | ✓ |
| Community modereren (verwijderen, meldingen afhandelen) | — | — | ✓ | ✓ |
| Berichten van anderen inhoudelijk bewerken | — | — | — | ✓ |
| Nieuwsbrief opstellen | — | **concept, *eigen* activiteiten** | ✓ | ✓ |
| Nieuwsbrief versturen | — | — | ✓ | ✓ |
| **Mail naar aangemelden van een activiteit** | — | **✓ *eigen*** | ✓ | ✓ |
| Pushbericht naar iedereen | — | — | **✓** (met aantal ontvangers en bevestiging) | ✓ |
| Uitnodigen als lid / als bestuur of beheerder | — | — | ✓ / — | ✓ / ✓ |
| Statistieken en verzendlog bekijken | — | — | ✓ | ✓ |
| Branding, sjablonen, website-koppelingen, e-mailinstellingen | — | — | — | ✓ |

**Functies en commissies (wie iemand is)**

- **Functie** is een label, geen recht: Voorzitter, Secretaris, Penningmeester, Bestuurslid, Commissievoorzitter. Zichtbaar als badge op profiel en in de ledenlijst. Wie een bestuursfunctie krijgt zonder de rol Bestuurslid, krijgt een vraag: “Ook de rol Bestuurslid geven?”
- **Commissie** is een groep met leden en een voorzitter (Oudejaarsbijeenkomstcommissie, Padelcommissie, Golfcommissie, Kenniscommissie). Lidmaatschap van een commissie geeft rechten *binnen* die commissie: activiteiten publiceren en beheren, aanmeldingen en aanwezigheid zien, de aangemelden mailen. Geen toegang tot de rest van Beheer, maar een eigen tab “Mijn commissie” in het menu.
- **Rol** blijft de technische bevoegdheid: Lid, Bestuurslid, Beheerder. “Commissielid” is daarmee geen vierde rol, maar een lid met commissierechten; dat houdt de rollen simpel.

## Deel 8 — Website-integratie

Agenda en bedrijvengids komen al uit het portaal (één keer invoeren, op de website zichtbaar), en openbare aanmeldingen komen terug als potentiële leden. Dat werkt goed. Het principe breekt bij lid worden (gegevens worden twee keer ingevoerd) en bij alles wat over mensen en de vereniging zelf gaat.

| Nr | Onderdeel | Nu | Voorstel | Impact | Moeite |
| --- | --- | --- | --- | --- | --- |
| W1 | Lid worden (`/embed/aanmelden`) | Vraagt naam, bedrijf, adres, e-mail, telefoon, functie, website. Wordt een toegangsaanvraag; daarna moet het bestuur in Uitnodigingen alles opnieuw invoeren (alleen e-mail), en het bedrijf apart aanmaken. | “Uitnodigen” vanuit de aanvraag maakt in één stap de uitnodiging én (als het nog niet bestaat) het bedrijf aan, met alle ingevulde gegevens. Bij registratie zijn de velden al ingevuld. | G | M |
| W2 | Bedrijfsdetail op de website | Alleen naam, branche, plaats en website-link. Tagline, omschrijving, logo-groot, social links en contactpersoon ontbreken, terwijl die in het portaal bestaan. | Openbare bedrijfspagina met logo, tagline, omschrijving, socials, adres (als het bedrijf dat toestaat) en eventueel het ledenvoordeel (F4). Velden die openbaar mogen, krijgen in het bedrijfsformulier een oogje “Ook op de website”. | M | K |
| W3 | Personen bij bedrijven | Niet op de website, ook niet als het lid dat wil. | Per lid een schakelaar “Toon mij als contactpersoon op de openbare bedrijfspagina” (standaard uit); dan naam, functie en foto zichtbaar, geen contactgegevens. | M | K |
| W4 | Bestuur en commissies | Bestaan niet in het portaal, dus de website moet ze los bijhouden. | Embed “Bestuur” en “Commissies” uit de functies en commissies van deel 7: foto, naam, functie, bedrijf. Bestuurswissel = één wijziging in het portaal. | M | K |
| W5 | Ledenaantal en nieuws | Het ledenaantal staat als vaste tekst in content (bijv. de omschrijving van de Open Borrel: “meer dan 110 leden”). Nieuws staat alleen in het portaal. | Kleine embed of API met kerncijfers (aantal leden, bedrijven, activiteiten dit jaar) en optioneel openbare nieuwsberichten (vinkje “Ook op de website” per bericht). | K | K |
| W6 | Teksten in de embeds | Introductietekst van de agenda staat vast in de code; de naam staat er als “Veendammer OndernemersCompagnie” (zonder spatie), terwijl het portaal “Veendammer Ondernemers Compagnie” gebruikt. | Introteksten in App-instellingen bewerkbaar; overal de verenigingsnaam uit de instellingen gebruiken. | K | K |
| W7 | Laadtijd | De agenda-embed deed er bij de eerste keer laden 5,8 s over, de andere embeds \~3,4 s (koude start van de server). | Embeds statisch genereren en elke paar minuten verversen (ISR), zodat de website nooit op een koude server wacht. | M | K |
| W8 | Lid worden vanuit een activiteit | Wie zich als niet-lid aanmeldt voor een activiteit, krijgt geen uitnodiging om lid te worden. | In de bevestiging van de openbare aanmelding een regel “Interesse in lidmaatschap? Laat het weten” met één klik; zet de status in Potentiële leden op “Wil lid worden”. | M | K |

## Deel 9 — Mobiel

De ledenkant is op de telefoon goed bruikbaar: bottom nav, detailpagina's als bottom sheet met sleepgreep, zoeken als overlay. Beheer is op mobiel vooral een gekrompen desktop: kaarten met drie knoppen per rij en lijsten van duizenden pixels. Op 390px breed was er na de recente fixes nog één pagina met horizontale scroll.

| Nr | Waar | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Beheer → Activiteiten | Pagina is 481px breed op een scherm van 390px; “+ Nieuwe activiteit” valt half buiten beeld. | Via `PageHeader` (V3): actie onder de titel op volle breedte of als zwevende +-knop rechtsonder, boven de bottom nav. | Hoofdactie altijd bereikbaar. | UX | M | K |
| M2 | Beheer → Uitnodigingen, Leden, Bedrijven | Lijsten van kaarten met meerdere knoppen per rij: Uitnodigingen ±17.000px hoog bij 137 rijen; knoplabels breken af (“Verstuur e-/mail”). | Op mobiel: rij = naam + één statusregel + “…”-knop die een actiemenu (bottom sheet) opent. Selectie via lang indrukken. | Een lijst wordt weer scanbaar, knoppen zijn niet te klein. | UX | G | M |
| M3 | Bottom nav | Documenten en Notificaties zitten niet in de bottom nav; Documenten is alleen via de tegel op Home of het profielmenu te vinden. | Laten zo, maar Documenten opnemen in het menu achter “Profiel” (hernoemd naar “Meer”) met Mijn profiel, Mijn bedrijf, Documenten, Instellingen en Beheer. | Alles bereikbaar in maximaal twee tikken, zonder vijfde of zesde tab. | UX | M | K |
| M4 | Community en profielen | 18–19 klikbare elementen kleiner dan 32×32px (like, reageren, “…”, verzend-icoon). | Minimaal 44×44px tikvlak (icoon mag klein blijven, de klikbare zone niet). | Minder mis-tikken, en voldoet aan de richtlijn voor aanraakdoelen. | UX | M | K |
| M5 | Beheer-navigatie | Een dropdown bovenaan elke beheerpagina; om van Leden naar Activiteiten te gaan: omhoog scrollen, dropdown openen, kiezen. | Beheer-startpagina als lijst met groepen en badges (zie deel 5); subpagina's met terugpijl. | Navigeren zoals mensen dat van instellingen op hun telefoon gewend zijn. | UX | M | K |
| M6 | Nieuwsbrief-editor op mobiel | Werkt, maar het voorbeeld staat pas helemaal onderaan na alle blokken; bewerken op een telefoon is lang scrollen. | Op mobiel tabs “Bewerken” / “Voorbeeld” / “Versturen”. | Je ziet het resultaat zonder eindeloos te scrollen; versturen vanaf de telefoon (bijv. na een testmail) wordt makkelijk. | UX | K | K |
| M7 | Formulieren op mobiel | “Opslaan” staat onderaan lange formulieren (bedrijf bewerken ±3 schermen); de bevestiging “Opgeslagen.” valt buiten beeld. | Vaste actiebalk onderin met Opslaan/Annuleren zodra er iets gewijzigd is; bevestiging als toast (U4). | Opslaan zonder naar beneden te zoeken. | UX | M | K |
| M8 | Filters op mobiel | Chips scrollen horizontaal zonder hint; twee native dropdowns naast elkaar bij Beheer → Leden. | Zie Z3 en Z6: chips laten afbreken, of één knop “Filters” met bottom sheet. | Geen verborgen opties. | UX | K | K |

## Deel 10 — Licht en donker thema

Het donkere thema is goed uitgewerkt: elke pagina heeft een echte donkere variant, het e-mailvoorbeeld blijft terecht wit, en grijze tekst is in donker zelfs beter leesbaar dan in licht. Het zwakke punt is het VOC-rood als tekstkleur in donker, en randen van invoervelden in beide thema's.

**Gemeten contrast** (WCAG-eis: 4,5 voor gewone tekst, 3 voor randen van invoervelden en grote tekst)

| Combinatie | Licht | Donker | Waar je het ziet |
| --- | --- | --- | --- |
| Hoofdtekst op kaart | 17,9 | 15,5 | Overal |
| Grijze tekst op kaart | 5,3 | 6,2 | Metatekst, ondertitels |
| Rode tekst op kaart | 4,7 | **3,7** | Links als “Inloggen zonder wachtwoord”, “Profiel bewerken”, “Bekijk in de feed” |
| Rode tekst op lichtrode achtergrond | **4,1** | **3,7** | Actief menu-item, actieve tab, badges als “Nieuws” |
| Witte tekst op rode knop | 4,7 | 4,7 | Primaire knoppen |
| Rand van invoerveld op kaart | **1,3** | **1,2** | Alle invoervelden en dropdowns |

| Nr | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Rood als tekst haalt in donker de norm niet (3,7), en in licht niet op lichtrood (4,1). | Twee tokens: `--voc-red` (#E8000F) voor vlakken en knoppen, `--voc-red-text` voor tekst: in licht #C8000D (6,1 op wit, 5,3 op lichtrood), in donker #FF5A63 (5,7 op de kaart en op donkerrood). Actief menu-item in donker: tekst #FF5A63. | Rode links en actieve tabs goed leesbaar in beide thema's, zonder de huisstijl te veranderen. | UX | M | K |
| T2 | Randen van invoervelden zijn nauwelijks zichtbaar (1,2–1,3); een leeg veld is in licht thema bijna onzichtbaar wit op wit. | Aparte input-randkleur: licht #8E8E93 (3,3 op wit), donker #6E6E76 (3,4 op de kaart). Kaartranden mogen subtiel blijven. | Formulieren lezen als formulieren, ook voor slechtziende leden. | UX | M | K |
| T3 | Bedrijfslogo's staan in donker thema op felwitte tegels; in een lijst van 114 bedrijven geeft dat een raster van witte vlakken. Tijdens laden zijn sommige tegels leeg (wit zonder inhoud, in beide thema's). | Tegel in donker iets gedempt (#EDEDED) met 1px rand; tijdens laden een grijze placeholder of de initialen van het bedrijf. | Rustiger beeld; nooit een “kapot” leeg vak. | Smaak | K | K |
| T4 | De 404-pagina is in donker volledig zwart met witte Engelse tekst, los van het thema (zie V7). | Eigen 404 binnen de app-shell. | Consistentie. | Cons | K | K |
| T5 | Statusbadges (groen “Goedgekeurd”, grijs “Ingebracht”, “Concept”) zijn in beide thema's leesbaar, maar groen en rood worden zonder icoon gebruikt. | Statusbadges een klein icoon geven (vinkje, klok, kruis). | Status ook herkenbaar voor kleurenblinden. | UX | K | K |

## Deel 11 — Technische kwaliteit vanuit gebruikersperspectief

De app is stabiel, maar elke pagina wordt bij elk bezoek opnieuw op de server opgebouwd; dat maakt alles een halve tot hele seconde “zwaar”. De tussenlaag die dat moet versnellen, kan na een wijziging minutenlang oude gegevens tonen.

**Performance** (gemeten bij volledig laden van de live site, tijd tot eerste byte, 4 doorlopen × 37 pagina's)

| Wat | Gemeten | Opmerking |
| --- | --- | --- |
| Gewone pagina's | 480–1.000 ms | Mediaan rond 600 ms. Navigeren binnen de app (zonder volledig laden) is niet apart gemeten. |
| Traagste pagina's | Leden importeren 1.460 ms, Beheer 1.070 ms, Home 1.060 ms, Community (mobiel) 1.350 ms | Wisselend per meting; geen pagina structureel boven 1,5 s. |
| Uitschieters | Bedrijven één keer 10,9 s volledig laden; `/brand/voc-logo-mark.png` één keer 30 s time-out, daarna 0,3 s | Eenmalig; kan aan het testnetwerk liggen. Niet structureel vastgesteld. |
| Website-embeds, eerste keer | Agenda 5,8 s, Bedrijven en Lid worden 3,4 s | Koude start; zie W7. |
| Zoeken in lijsten | Elke zoekactie 500–1.000 ms | Zie Z1. |

| Nr | Onderdeel | Observatie | Concreet voorstel | Waarom | Type | Impact | Moeite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Q1 | Gegevens actueel houden | Lijsten (Leden, Bedrijven, Documenten, Nieuws, Beheer-lijsten) gebruiken een geheugencache per serverinstantie, 60 s tot 5 min geldig. Na een wijziging wordt alleen de cache van de instantie die de wijziging verwerkte geleegd. Op Vercel draaien meerdere instanties, dus andere gebruikers (of jijzelf bij een volgend verzoek) kunnen tot 5 minuten oude gegevens zien. | Overstappen op de cache van Next.js zelf met tags (`unstable_cache` + `revalidateTag`), die over alle instanties werkt. Nu 0 keer gebruikt. | “Ik heb het aangepast maar ik zie het niet” is het soort fout dat vertrouwen kost. | Eff | G | M |
| Q2 | Laden van pagina's | Elke navigatie wacht op de server; alleen een paar pagina's hebben een laadskelet (Agenda, Bedrijven, Community, Documenten, Leden). Beheerpagina's tonen niets tot alles er is. | Laadskeletten (`loading.tsx`) voor alle beheerpagina's; gegevens die zelden wijzigen (branches, app-instellingen) langer cachen. | Direct visuele reactie op elke klik. | UX | M | K |
| Q3 | Afbeeldingen | Avatars en logo's (via ondertekende opslag-URL's) zijn tijdens laden soms een leeg wit vak, in beide thema's. | Placeholder met initialen of een grijs vlak, en `sizes` zodat er geen te grote afbeeldingen worden geladen. | Geen “kapot” ogende lijsten. | UX | K | K |
| Q4 | Foutafhandeling | Inlogfout is duidelijk (“E-mailadres of wachtwoord onjuist.”). Formulierfouten komen uit de browser (zie U5). Er is geen eigen foutpagina: een crash toont de Engelse standaardpagina van Next.js. Verwijderen vraagt altijd bevestiging (goed). | `error.tsx` per sectie met “Er ging iets mis” + “Opnieuw proberen”, en de fout gelogd. Validatie in de app (U5). Toasts (U4). | Fouten lopen netjes af, in het Nederlands. | UX | M | K |
| Q5 | Toegankelijkheid: focus | De gedeelde `Button` heeft geen eigen focusstijl; links en knoppen leunen op de dunne browsercontour. Invoervelden hebben wel een rode focusring. Er is geen “Naar inhoud”-link. | Overal `focus-visible:ring-2 ring-voc-red ring-offset-2`; “Naar inhoud” als eerste tab-stop. | Toetsenbordgebruikers zien waar ze zijn. | UX | M | K |
| Q6 | Toegankelijkheid: namen en labels | Zoekvelden en het nieuwsformulier hebben alleen een placeholder als label. Op Community hebben 8 knoppen zonder tekst geen toegankelijke naam (icoonknoppen); op Campagnes 2, op Documenten 1. | `aria-label` op elke icoonknop (“Vind ik leuk”, “Meer opties”, “Downloaden”); zichtbare of verborgen labels voor elk veld. | Bruikbaar met een schermlezer, en vaak ook een tooltip voor iedereen. | UX | K | K |
| Q7 | Toegankelijkheid: contrast en tikvlakken | Zie T1, T2 en M4. | — | — | UX | M | K |
| Q8 | PWA | Manifest, iconen (ook maskable), service worker met pushmeldingen en een offline-pagina zijn aanwezig. De app heet op het beginscherm “Ledenportaal”; de achtergrondkleur van het opstartscherm is altijd wit, ook in donker thema. Pushmeldingen aanzetten kan alleen via Instellingen → “Dit apparaat”; het portaal biedt het nergens aan. Installeren en push op een echt toestel kon ik hier niet testen. | Korte naam “VOC” (of “VOC Leden”) zodat het icoon herkenbaar is tussen andere apps. Op iOS een korte uitleg “Zet op beginscherm” (iOS toont geen installatieprompt). Push actief aanbieden op een logisch moment, bijv. na aanmelden voor een activiteit (“Wil je een herinnering op je telefoon?”) of in de onboarding-checklist (U1). | Hogere installatie- en push-acceptatie; herkenbaar icoon. | UX | M | K |

## Deel 12 — Content en terminologie

De teksten zijn helder Nederlands, maar voor dezelfde dingen worden meerdere woorden gebruikt, en het beheer bevat technische termen die een bestuurder niet hoeft te kennen.

**Eén woord per begrip**

| Begrip | Nu in gebruik | Voorstel | Waar aanpassen |
| --- | --- | --- | --- |
| Een bijeenkomst | Activiteit, evenement (“Bekijk evenement”, “Bijgewoonde evenementen”, “Communiceer over dit evenement”), Agenda | **Activiteit**; “Agenda” alleen als naam van het overzicht | Profiel-instellingen, nieuwsbrief-knopvoorbeeld, Campagnes |
| Wat een lid krijgt bij nieuwe dingen | Notificaties (pagina, beheer), meldingen (Instellingen: Pushmeldingen, E-mailmeldingen) | **Meldingen** voor leden; in beheer **Verzendlog** | Paginatitel, bel-tooltip, beheermenu |
| Mail naar alle leden | Campagnes (menu), Communicatie (paginatitel), Nieuwe campagne, “Nieuwe nieuwsbrief” (standaardtitel) | **Nieuwsbrief** | Menu, titel, knop |
| Ongepast bericht doorgeven | Rapporteren, rapportages, melding | **Melden** (“Bericht melden”); beheer: **Moderatie** / “Gemelde berichten” | Feed-menu, beheermenu |
| Activiteit van een lid | “Ingebracht” | **“Door een lid”** (badge) en filter “Van leden” | Agenda-filter, badges, beheer |
| Lid willen worden | Toegangsaanvraag (beheer), “Vraag toegang aan” (inloggen), “Word lid van de VOC” (website) | **Lidmaatschapsaanvraag** in beheer; “Lid worden” op inlogscherm en website | Beheermenu, inlogpagina |
| Iets wijzigen | Bewerken, aanpassen (“Profiel aanpassen”, “Bedrijfsprofiel snel aanpassen”) | **Bewerken** | Profiel, Beheer → Bedrijven |
| De vereniging | “Veendammer Ondernemers Compagnie”, “Veendammer OndernemersCompagnie” (aanmeldformulier, agenda-embed, vast in de code), “Veendammer Ondernemer Compagnie” (afzender in een campagne) | Altijd de naam uit App-instellingen: **Veendammer Ondernemers Compagnie** | `AccessRequestForm.tsx`, `embed/agenda/page.tsx`, campagne-afzender |
| De app | “Ledenportaal” (logo, tabtitel, app-naam) | **VOC Ledenportaal**; als korte app-naam **VOC** | App-instellingen |

**Technische termen vervangen**

| Waar | Nu | Voorstel |
| --- | --- | --- |
| Nieuwsbrief-editor | Pre-header (optioneel) | Voorvertoningstekst (de regel die in de inbox onder het onderwerp staat) |
| Beheermenu | Embed-codes | Website-koppelingen |
| E-mail- en pushtemplates | Koppen als `feed_reactie`, “Inhoud (HTML)”, “Variabelen: {{title}}” | Kop “Reactie op je bericht”; “Tekst van de e-mail”; variabelen als klikbare chips (“Titel invoegen”) |
| Beheer → Leden | “Gewoon lid in de ledenlijst” / “Verberg uit ledenlijst” | “Verenigingsaccount” (schakelaar) met uitleg “niet tonen als persoon in de ledenlijst” |
| Agenda-detail | Toevoegen aan agenda (.ics) | Zet in je agenda |
| Beheerpagina's | Ondertitels als “Alle activiteiten met status, goedkeuren/afwijzen/bewerken/verwijderen.” | Weglaten, of één zin over het doel: “Keur activiteiten goed en houd de agenda bij.” |

**Knopteksten**

| Nu | Voorstel | Waarom |
| --- | --- | --- |
| Agenda activiteit toevoegen | Activiteit toevoegen | Korter; “agenda” is dubbel |
| Uitnodiging aanmaken | Uitnodigen (met e-mail) / Uitnodigingslink maken (zonder) | Zegt wat er gebeurt: wel of geen mail |
| Verleng alle met 14 dagen | Alle verlengen (+14 dagen) | Actie eerst |
| Opslaan (per lid naast de rolkeuze) | weg; rol wijzigen via menu met bevestiging (B3) | Eén Opslaan per scherm |
| Inloggen zonder wachtwoord | Stuur me een inloglink | Zegt wat er gebeurt |
| Home-ondertitel “Het laatste nieuws en de eerstvolgende activiteit van het ledenportaal, overzichtelijk bij elkaar.” | weglaten | Beschrijft het scherm in plaats van iets te zeggen |

## Prioriteiten

De nummers verwijzen naar de bevindingen hierboven.

**🔴 Direct aanpakken** — raakt gebruik, vertrouwen of de lopende ledenwerving

- U2 — Inloglink en wachtwoord-reset tonen “verstuurd” terwijl er geen mail uitgaat; verbergen of melden tot SMTP werkt.
- Maillijstplan stap 1 (SMTP via info@) — voorwaarde voor U2, uitnodigingen, digest en contact tussen leden.
- B1 / W1 — Lidmaatschapsaanvraag in één klik omzetten in uitnodiging + bedrijf, zonder overtypen.
- B2 — Uitnodigingen met status en bulk-versturen/verlengen; 137 openstaand, verlopen op 20 oktober.
- R1, R2, R3 — Menu en rechten laten kloppen; laatste beheerder beschermen.
- Q1 — Cache die tot 5 minuten oude gegevens toont, vervangen.
- M1 — Horizontale overflow op Beheer → Activiteiten (mobiel).
- T1, T2 — Contrast van rode tekst in donker en van invoervelden in beide thema's.

**🟠 Daarna** — duidelijke waarde, minder urgent

- Deel 6 — Actiegericht dashboard “Vandaag”.
- Deel 5 — Beheermenu herindelen (Instroom, één Instellingen-pagina, nieuwe namen).
- Z1–Z4 — Één `ListToolbar` met directe filtering, teller, wissen en bredere zoekvelden.
- U1 — Onboarding-checklist voor nieuwe leden.
- V1, V2, V3 — Knoppensysteem, paginabreedtes en `PageHeader`.
- U4, U5, Q4, V7 — Toasts, validatie in de app, eigen fout- en 404-pagina.
- B3, B4 — Leden en activiteiten in beheer als tabel met snelacties en tabs.
- R4 + deel 7 — Centrale rechtenhelper volgens de matrix.
- U3 — Netwerk direct naar Leden, één mechanisme.
- U10 — Vaste regel: één item in context, lijsten en bulk in Beheer.
- W2, W3 — Rijkere openbare bedrijfspagina, optioneel met contactpersoon.
- Q5, Q6 — Focusstijlen, labels en namen voor icoonknoppen.

**🟢 Polish** — kleinere visuele of UX-verbeteringen

- V5 (minder badges), V6 (`EmptyState`), V9 (één segmentstijl), V10 (`ConfirmDialog`), V11 (typografie), V12 (eigen select en datumvelden), V13 (socials uit de sidebar).
- U6, U7, U8, U9, U11 — Kleine flows: beheer inklappen op activiteit, keuze VOC/lid als schakelaar, label optioneel, uitleg bij badges, Annuleren-knop.
- Z5, Z6, M2–M8 — Globaal zoeken ordenen, chips op mobiel, mobiele lijsten en actiebalk.
- T3, T5, Q2, Q3, Q8 — Logotegels, statusiconen, laadskeletten, afbeeldingsplaceholders, PWA-naam en push aanbieden.
- W6, W7, W8, B5–B8 — Embedteksten, snelle embeds, lid worden na activiteit, kleinere beheerverbeteringen.
- Deel 12 — Terminologie en knopteksten gelijktrekken.

**💡 Nieuwe functionaliteiten**

- F1 Nieuw sinds je laatste bezoek + weekoverzicht · F2 Vraag & aanbod · F3 Functies en commissies · F4 Lid-voordelen · F5 Voorstelronde nieuwe leden · F6 Contact zonder e-mailadres te delen · F7 Mijn agenda + agenda-feed · F8 QR-inchecken · F9 Zoeken in documenten · F10 Contributiestatus · B9 Persoonspagina met tijdlijn voor beheer · W4 Bestuur en commissies op de website.

## Top 15

Geordend op gebruikerswaarde × hoe vaak het geraakt wordt, gedeeld door de moeite.

| # | Verbetering | Ref | Impact | Moeite | Waarom deze plek |
| --- | --- | --- | --- | --- | --- |
| 1 | Mail werkend krijgen via info@ (SMTP), en tot dan mail-knoppen verbergen | U2, maillijstplan | G | K | Zonder mail werken inloglinks, resets en uitnodigingen niet, en ziet de gebruiker dat niet eens. |
| 2 | Aanvraag → uitnodiging + bedrijf in één klik | B1, W1 | G | K | Het meest herhaalde bestuurswerk van de komende maanden, nu met dubbel invoeren. |
| 3 | Uitnodigingen: status en bulk versturen/verlengen | B2 | G | M | 137 mensen moeten het portaal in, en hun uitnodigingen verlopen op 20 oktober. |
| 4 | Rechten laten kloppen met menu en schermen | R1–R3 | G | K | Een bestuurslid loopt nu tegen een menu-item aan dat niet werkt; een beheerder kan zichzelf buitensluiten. |
| 5 | Cache die oude gegevens toont vervangen | Q1 | G | M | “Ik heb het aangepast maar zie het niet” ondermijnt vertrouwen in alles wat je in beheer doet. |
| 6 | Onboarding-checklist voor nieuwe leden | U1, F5 | G | M | Een gevulde ledenlijst is de kern van het netwerk; elk nieuw lid is een kans die nu ongebruikt blijft. |
| 7 | Actiegericht bestuursdashboard “Vandaag” | Deel 6 | G | M | Bestuursleden zien in één scherm wat er moet gebeuren, in plaats van acht getallen zonder link. |
| 8 | Home persoonlijk maken: “nieuw sinds je laatste bezoek”, jouw volgende activiteit | V4, F1 | G | M | Geeft leden een reden om terug te komen; de huidige Home herhaalt vooral het menu. |
| 9 | Één `ListToolbar` voor zoeken, filteren, sorteren en bulk | Z1–Z4 | G | M | Lost in één component een derde van de bevindingen op en maakt elke lijst sneller. |
| 10 | Beheermenu herindelen (Instroom, één Instellingen) | Deel 5 | M | K | Van 18 naar 14 items, ingedeeld naar taak; minder zoeken voor elk bestuurslid. |
| 11 | Contrast: rode tekst in donker, randen van invoervelden | T1, T2 | M | K | Twee kleurtokens, en het hele portaal is beter leesbaar. |
| 12 | Knoppensysteem + `PageHeader` | V1, V3 | M | M | Maakt van losse schermen één product, en lost de mobiele overflow structureel op. |
| 13 | Functies en commissies | F3, deel 7 | G | M | Maakt zichtbaar wie wat doet, en laat commissies hun eigen activiteiten beheren zonder het bestuur. |
| 14 | Vraag & aanbod als prikbord | F2 | G | M | Het meest directe zakelijke nut van een B2B-netwerk, en bouwt op labels die er al zijn. |
| 15 | Toasts, validatie in de app en eigen foutpagina's | U4, U5, Q4, V7 | M | K | Elke handeling geeft duidelijke, Nederlandse feedback; samen weinig werk. |
