# Redesign ledenportaal: gekozen ontwerp en uitvoeringsplan

Status: goedgekeurd door de opdrachtgever (19-10-2026). Het portaal is nog niet live, dus alles mag in één traject worden doorgevoerd.

- Voorbeeldschermen (nu / richting A / gekozen ontwerp, licht en donker): https://claude.ai/artifact/UFiNYR2DebHWLMBtgkPhBD
- Kleuren en tokens: `docs/stijl-kleurenpalet.md` (blijft leidend voor kleurwaarden).

## Uitgangspunt

"Richting B, rustig gehouden": meer karakter door een eigen kopletter, donkerpetrol accenten, foto's en lichte diepte. Alles wat leden moeten terugvinden blijft op dezelfde plek: de navigatie (zijbalk desktop, balk onderin mobiel, vijf onderdelen met tekst) en de ledenlijst werken zoals nu.

Bewust **niet** doen (afgewezen na beoordeling):
- zwevende navigatiebalk met alleen iconen;
- glaseffect of decoratieve cirkels in het welkomstblok;
- gekleurde ringen of verlooprand om profielfoto's;
- leden als visitekaartjes;
- zware schaduwen. Schaduw is licht: ongeveer `0 1px 2px rgb(11 46 51 / .06), 0 4px 12px rgb(11 46 51 / .05)`; in donker vrijwel geen schaduw, scheiding via de achtergrondkleur.

## Besluiten

1. **Kopletter**: Bricolage Grotesque (via `next/font/google`, gewichten 600/700/800) als `--font-display` voor paginatitels (h1), grote cijfers (statistieken, datumtegels) en kaarttitels waar het voorbeeld dat laat zien. Inter blijft voor alle overige tekst. Niet gebruiken in e-mails, nieuwsbrief en embeds met `?thema=website`.
2. **Rood op dieet**: rood alleen voor logo, de belangrijkste knop per scherm, actief menu-item, tellers en foutmeldingen. Zie de tabel "rood op dieet" hieronder.
3. **Petrol** voor iconen, datumtegels, grafieken, focusring, links en vlakken; donkerpetrol (`#0B2E33`) voor het welkomstblok op Home en de beheerzijbalk.
4. **Zacht verloop** bovenaan de pagina (petrol-soft naar achtergrond, ongeveer 200 px) op Home, Agenda, Community, Netwerk, het beheerdashboard en lege toestanden.
5. **Actieve filters, tabs en segmentknoppen** in inkt (`bg-foreground text-background`), niet in rood. Het patroon bestaat al bij de periodekeuze op `beheer/statistieken`.
6. **Focusring** in petrol in plaats van rood.
7. **Nieuw bericht**: op mobiel een rode zwevende knop "Bericht" rechtsonder op Community, boven de navigatiebalk. Die opent het keuzevenster als venster dat van onderen opschuift. Op desktop blijft het opstelveld bovenaan de feed.
8. **Beheer**: op `/beheer` vervangt een donkerpetrol beheerzijbalk de gewone zijbalk. Bovenaan staat een duidelijke link "Terug naar portaal". Het actieve item krijgt een rood streepje links; tellers zijn rood.
9. **Vereniging-menu op mobiel**: de ingang blijft zoals die nu is, geen wijziging.

## Rood op dieet (richting per rol)

| Rol | Nu | Wordt |
|---|---|---|
| Hover-accent op kaarten, iconknoppen, outline-knoppen | rood | neutraal (rand of tekst in inkt) |
| Fouten, waarschuwingen, foutteksten | rood | **blijft rood** (`danger`-tokens) |
| Tekstlinks ("Alle nieuws", vermeldingen, links in tekst) | rood | petrol |
| Gevulde primaire knop | rood | rood, maar maximaal één per scherm; andere knoppen worden secundair |
| Rode hero's (over-ons, bestuur) | rood verloop | donkerpetrol |
| Status- en labelpillen (VOC-activiteit, rollen, Nieuws-label) | rood | grijs met stip, of labelkleur uit het palet |
| Focusring invoervelden | rood | petrol |
| Actieve chips, tabs, segmenten (16 bestanden met eigen kopie) | rood gevuld | inkt |
| Getinte icoontegels en avatar-initialen | rood licht | petrol-soft met petrol |
| Actief navigatie-item | rood | **blijft rood** |
| Grafieken (primaire reeks) | rood | petrol via nieuw token `--chart-primary`; tweede reeks opnieuw controleren op kleurenblindheid |
| Tellers en badges | rood | **blijft rood** |
| Like-status | rood | blijft rood (hartje) |
| Schakelaar aan | rood | petrol |
| Verwijder-iconen in lijsten | rood | neutraal; alleen de bevestigingsknop in het dialoogvenster is rood |

## Uitvoering in fases

Elke fase apart afronden: `npx tsc --noEmit && npm run lint && npm run build`, schermafbeeldingen bekijken (mobiel en desktop, licht en donker), dan committen en pushen.

### Fase 1: tokens en lettertype
- Nieuwe tokens in `src/app/globals.css`, in **alle vier** de blokken: `:root`, de `prefers-color-scheme: dark`-media, `:root[data-theme=dark]` en `[data-theme=light]`. Dat laatste blok is voor de embeds; zonder de nieuwe tokens krijgen embeds donkere waarden.
  - Tokens: `--petrol-deep`, `--petrol`, `--petrol-soft`, `--raised`, `--danger`, `--danger-text`, `--danger-soft`, labelkleuren (vraag, aanbod, nieuws, voorstellen, overig), statuskleuren (success, warning, neutral), `--chart-primary`.
  - Alles toevoegen aan de `@theme inline`-mapping.
- Herstel de rode tokens in donker volgens het palet: `--voc-red` `#F0323C`, hover `#FF5A63`, `--voc-red-text` `#FF6B72`. Lijnkleur naar `#E4E4E7` / `#2E2E34`.
- Zet Bricolage Grotesque op als `--font-display` (utility bijvoorbeeld `font-display`).
- Pas de focus-outline (globals.css) aan naar petrol.
- `themeColor` in `layout.tsx` en `manifest.ts`: naar `#0B2E33`.

### Fase 2: gedeelde componenten
Voeg toe in `src/components/ui`:
- `Chip` / `SegmentedControl`
- `StatusPill`
- `IconButton`
- `Alert` (fout, succes, info)
- `Textarea`
- `StatTile`
- `Card`

Vervang daarna de inline kopieën. De belangrijkste:
- ongeveer 30 losse rode primaire knoppen die `Button` omzeilen;
- ongeveer 25 outline-knoppen;
- ongeveer 56 ronde iconknoppen;
- 16 eigen kopieën van actieve chips;
- ongeveer 30 foutkaders en 10 succeskaders;
- `text-green-600` zonder donkere variant op 12 plekken (vervangen door het success-token).

De vier losse kleurmaps (`lib/feed/postType.ts`, `lib/auth/roles.ts`, `BeheerAgendaContent`, `CommunicationRow`) gaan naar de label- en statustokens.

### Fase 3: schil en navigatie
- Sidebar, BottomNav en MobileHeader: dezelfde plek en opbouw. Nieuwe kleuren, actief item blijft rood.
- NetworkTabs: geen gevuld rood meer; segmentknop in de nieuwe stijl.
- Beheerzijbalk in donkerpetrol (besluit 8).
- Zacht verloop bovenaan de inhoud (besluit 4).
- Paginatitels: één `PageHeader`-stijl met de kopletter. Nu gebruiken ongeveer 20 pagina's een losse h1.

### Fase 4: schermen
- **Home**:
  - donkerpetrol welkomstblok met datum, begroeting op naam en een korte regel over wat er voor jou speelt (eigen aanmeldingen, nieuwe berichten);
  - daarin de eerstvolgende activiteit als witte kaart, met rode datumtegel en de knop "Aanmelden" (of de status "Aangemeld");
  - daaronder vier snelle acties: Bericht, Lid zoeken, Agenda, Documenten;
  - "Nieuw in het netwerk": gewone ronde profielfoto's, of initialen in petrol-soft;
  - nieuws met foto;
  - de profieltip en de introductietekst vervallen.
- **Agenda**:
  - weekstrook bovenaan met stippen op dagen met activiteiten (rood VOC, petrol extern);
  - daaronder een tijdlijn per maand met grote datumcijfers en een gekleurde rand per soort activiteit;
  - de foto van de activiteit als smalle band bovenaan de kaart;
  - eerdere activiteiten ingeklapt;
  - een aparte kalenderweergave is optioneel en mag later.
- **Avatars bij activiteiten** (wie er gaan): alleen tonen als de bestaande zichtbaarheidsregels dat al toestaan. Anders alleen het aantal. Geen beveiligingsregels aanpassen hiervoor.
- **Community**:
  - kaarten met een gekleurd label per soort bericht, met icoon;
  - filters met een kleurstip, actief filter in inkt;
  - titel in de kopletter, foto's als afgeronde collage;
  - hartje en reacties onderaan;
  - zwevende knop "Bericht" op mobiel (besluit 7).
- **Netwerk (leden en bedrijven)**:
  - lijst blijft;
  - grotere profielfoto's, initialen in petrol-soft in plaats van rood;
  - segment Leden/Bedrijven in de nieuwe stijl, branchefilter als chip.
- **Beheerdashboard**:
  - begroeting in de kopletter;
  - "Wacht op jou" als opvallende melding bovenaan (rood-soft) met één knop;
  - stattegels via `StatTile`;
  - aanmeldingen per komende activiteit als balkjes;
  - grafieken in petrol;
  - trendlijntjes alleen tonen als de data er al is; geen cijfers verzinnen.
- **Overige pagina's** (activiteit, profiel, bedrijf, documenten, notificaties, instellingen, over-ons, bestuur, beheersubpagina's): tokens en componenten uit fase 1–3 toepassen. Rode hero's worden donkerpetrol.

### Fase 5: opschonen
- Dark-mode-inconsistenties:
  - hoverschalen gelijktrekken;
  - `hover:bg-black/[.1]` zonder donkere variant aanvullen;
  - losse alfa-overlays vervangen door `--raised`.
- Radiusconventie:
  - pill voor knoppen en chips;
  - 2xl voor kaarten;
  - xl voor tegels en menu's;
  - lg voor invoer en meldingen.
  - Uitzonderingen rechtzetten.
- Icoonmaten terugbrengen naar 14 / 16 / 20.
- Gedachtestreepjes in UI-teksten vervangen; een en-dash in tijdsbereiken mag blijven.

## Wat verandert waar (overzicht)

| Onderdeel | Plek en structuur | Wat er verandert |
|---|---|---|
| Zijbalk desktop, balk onderin mobiel, mobiele kop | **ongewijzigd** (zelfde onderdelen, volgorde en labels) | alleen kleuren; actief item blijft rood |
| Beheer (`/beheer/*`) | gewone zijbalk wordt vervangen door de beheerzijbalk | donkerpetrol zijbalk met link "Terug naar portaal" bovenaan |
| Home | zelfde route | nieuwe opbouw: welkomstblok met activiteit, snelle acties, Nieuw in het netwerk, nieuws |
| Agenda | zelfde route en filters | weekstrook plus tijdlijn in plaats van losse kaarten met grote foto |
| Community | zelfde route, opstelveld blijft op desktop | op mobiel komt de zwevende knop "Bericht" in plaats van het opstelveld bovenaan; labels in kleur |
| Netwerk (leden en bedrijven) | **ongewijzigd** (lijst) | foto's groter, initialen petrol, segmentknop en filter in nieuwe stijl |
| Overige pagina's | ongewijzigd | alleen tokens, componenten, kopletter en rode hero's naar petrol |

## Desktop

De voorbeeldschermen zijn mobiel (behalve Beheer). Op desktop:
- **Home** (binnen de bestaande contentbreedte):
  - het welkomstblok als brede banner: begroeting links, de kaart met de eerstvolgende activiteit rechts;
  - daaronder twee kolommen: links het nieuws met foto (breed), rechts "Nieuw in het netwerk" en de snelle acties als lijst of tegels.
- **Agenda**: weekstrook en tijdlijn in een kolom van maximaal `max-w-3xl`, zoals nu.
- **Community**: geen zwevende knop; het opstelveld blijft bovenaan de feed. Kaarten zoals op mobiel.
- **Beheer**: zie het voorbeeld (zijbalk 196–240 px, inhoud met verloop bovenaan).

## Maten en details (uit de voorbeeldschermen)

Kleurwaarden staan in `docs/stijl-kleurenpalet.md`. Aanvullend:
- **Welkomstblok en beheerzijbalk (donkerpetrol)**:
  - licht: `radial-gradient(120% 80% at 100% 0%, #1B6A73 0%, transparent 55%), linear-gradient(165deg, #0B2E33 0%, #0E4249 100%)`;
  - donker: dezelfde opbouw met `#15545B`, `#081F23` en `#0B2E33`;
  - tekst wit, het kleine kopje (datum) `#9FD3D6`, het VOC-logo erop `#FF3B45`;
  - geen decoratie, geen glas en geen blur.
- **Kaart eerstvolgende activiteit** in het welkomstblok:
  - gewone kaart (surface), radius 16 px, lichte schaduw;
  - datumtegel 46 px breed, rood, wit, maand in 9–10 px hoofdletters, dag 22 px in de kopletter;
  - de knop "Aanmelden" volle breedte, rood. Bij een bestaande aanmelding de status "Aangemeld" (groen label) in plaats van de knop.
- **Snelle acties**:
  - 4 tegels van 48 px, radius 16, surface met lichte schaduw, icoon petrol 18 px, label 10–11 px eronder;
  - op mobiel staan ze direct onder het welkomstblok en nooit tegen de navigatie onderin.
- **Nieuw in het netwerk**: ronde avatars van 44 px, de foto of anders initialen; voornaam eronder; geen ring en geen rand.
- **Nieuws**: kaart met de foto bovenaan (ongeveer 96–180 px hoog), een wit label "Nieuws" linksboven, de titel in de kopletter. Bij meerdere berichten blijft vegen mogelijk zoals nu.
- **Kopletter-maten**:
  - paginatitel 28 px (mobiel) tot 32 px (desktop), gewicht 800, letter-spacing -0.03em;
  - begroeting Home 25 px;
  - sectiekoppen 16 px, gewicht 700;
  - grote cijfers 22–26 px.
- **Kaarten**: radius 16–18 px; schaduw licht `0 1px 2px rgb(11 46 51 / .06), 0 4px 12px rgb(11 46 51 / .05)`, donker `0 1px 2px rgb(0 0 0 / .35)`; een rand mag blijven waar dat nu helpt.
- **Agenda-tijdlijn**:
  - datumkolom 44 px met dag 24 px in de kopletter en weekdag 9.5 px;
  - verticale lijn 2 px in de lijnkleur;
  - kaart met een linkerrand van 4 px: rood voor VOC, petrol voor extern;
  - de activiteitsfoto als band van ongeveer 58 px bovenaan de kaart;
  - weekstrook: geselecteerde dag gevuld petrol, stip 5 px onder dagen met activiteiten.
- **Zwevende knop Community (mobiel)**:
  - rood, hoogte 46 px, pill, icoon plus tekst "Bericht";
  - rechtsonder, ongeveer 16 px boven de navigatiebalk.
- **Labels per soort bericht**: pill met icoon in de labelkleur op de lichte achtergrond van die kleur, zoals in het palet.
- **Navigatie onderin**: hoogte en opbouw zoals nu; actief = rode tekst en rood icoon, zonder gevulde achtergrond.
- **Beheer**:
  - actief item: witte tekst op wit 10%, met een rood streepje van 3 px links;
  - "Wacht op jou": danger-soft vlak met een rode icoontegel en één knop in inkt;
  - stattegels met een groot cijfer in de kopletter.

## Niet aanraken zonder aparte opdracht
- Nieuwsbrief-renderer en e-mailopmaak (`lib/newsletter/render.ts`, `lib/email/send.ts`, voorbeelden in templateformulieren). Die volgen bewust niet het portaalthema.
- Database, migraties, beveiligingsregels, authenticatie, e-mail- en pushprocessen.
- Acties die echte leden bereiken (push, publiceren, campagnes).
- Kaartpinnen in `CompanyMap` mogen naar petrol, maar dat is optioneel.

## Stijlronde "zelfde indeling, nieuwe stijl" (2026-10)

Uitgangsprincipe van deze ronde, en voor elke latere stijlronde die hier
op doorbouwt: **de indeling blijft precies zoals hij is — alleen de
uitstraling verandert.** Niets verplaatsen, toevoegen of weghalen zonder
dat een los, expliciet besluit dat vraagt. Zoeken, meldingen, profiel,
menu-onderdelen en hun volgorde, en de blokken per pagina blijven op hun
plek; het doel is dat elke pagina hetzelfde aanvoelt — één geheel.

### Kleuren (alleen het lichte thema)
Lichtblauw (de petrol-tint in de lichte achtergrond-/kaart-/randkleuren)
is vervangen door warm zand. Donker thema en de huisstijlkleuren
(rood/petrol zelf) zijn ongewijzigd. Nieuwe waarden in `globals.css`
(`:root` en `[data-theme="light"]`):

| Token | Was | Wordt |
|---|---|---|
| `--background` | `#f7f7f8` | `#f5f3ef` |
| `--raised` | `#f1f1f3` | `#ede9e2` |
| `--border` | `#e4e4e7` | `#e7e2d9` |
| `--muted` | `#5e5e66` | `#67625b` |
| `--petrol-soft` | `#e3f0f0` | `#efe9df` (naam blijft, betekent nu "zand") |
| `--shadow-card` | `0 1px 2px rgb(11 46 51 / .06), 0 4px 12px rgb(11 46 51 / .05)` | `0 1px 2px rgb(40 30 20 / .05), 0 4px 14px rgb(40 30 20 / .05)` |

### Geen verloop meer bovenaan
Het zachte petrol-verloop bovenaan het hoofdgebied (`AppShell`'s
`showTopGradient`) is volledig verwijderd — op ledenpagina's én in
Beheer. De donkerpetrol beheerzijbalk zelf blijft ongewijzigd.

### Kaarten: schaduw, geen rand meer
De kaartconventie is overal `rounded-2xl bg-surface shadow-card`
(via Tailwinds — in `globals.css` herdefinieerde — `shadow-sm`), zonder
`border border-border` ernaast: scheiding van de zandkleurige achtergrond
gaat voortaan alleen via de schaduw. Zie `components/ui/Card.tsx` en de
~75 call sites die hetzelfde patroon met de hand typten.

### Sectiekoppen
Een sectiekop binnen een pagina (bv. "Nieuws", "Agenda", "Nieuw in het
netwerk") is `font-display text-[19px] font-bold tracking-[-0.015em]`
(was 16px zonder tracking) — zie `components/ui/SectionHeader.tsx`. De
paginatitel zelf (`<h1>`, 28–32px) verandert niet.

### Zijbalk (desktop)
Actief item: `bg-raised` + `font-semibold` + icoon in de voorgrondkleur,
met een rood streepje van 3px *binnen* het vlak aan de linkerkant
(afgerond, verticaal ingesprongen) — niet meer een linkerrand die het
item naar rechts duwt. Inactieve iconen `text-muted`. Scheidingslijnen
ingesprongen (±10px marge, niet over de volle breedte). Zie
`components/layout/Sidebar.tsx` en `VerenigingMenu.tsx`.

### Agenda
De weekstrook is weg (desktop en mobiel) — de datumtegel per activiteit
doet dat werk al. "+ Activiteit" is nu de rode hoofdknop van het scherm
(`h-11 px-5`, semibold, lichte rode schaduw) i.p.v. een witte
outline-knop. Activiteitkaarten krijgen op desktop (`md:`) een iets
grotere, liggende foto (±120×84) en een titel in `font-display` ±18px.

### Overig uit Robberts feedback, in deze ronde meegenomen
- Hamburgermenu (mobiel): geen logo meer in het paneel, meer witruimte
  links bij de items (`px-6` i.p.v. `px-4`), scheidingslijnen minder
  aanwezig en ingesprongen.
- Bestuur: op mobiel weer onder elkaar (volle breedte), bedrijfsnamen
  lopen om i.p.v. af te kappen, "Sinds ..." is weg, meer ruimte tussen
  functie en bedrijf met nadruk op de functie, foto's `rounded-xl`
  (`Avatar`'s nieuwe `shape="square"`-optie) in hogere kwaliteit
  (`quality={90}`).
- `SegmentedControl` (Lijst/Kalender e.d.): de actieve stand is nu ook
  `font-semibold`, niet alleen een andere kleur.
- Beheerdashboard: de agendalijst heeft nu dezelfde datumtegel als op de
  ledenkant (Home), i.p.v. een losse tekstregel die tegen de rand aan zat.
- Mobiele Home: meer lucht tussen de blokken (`gap-8` i.p.v. `gap-6`),
  volgorde ongewijzigd.
