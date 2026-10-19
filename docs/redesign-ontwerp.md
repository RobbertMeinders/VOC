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

## Niet aanraken zonder aparte opdracht
- Nieuwsbrief-renderer en e-mailopmaak (`lib/newsletter/render.ts`, `lib/email/send.ts`, voorbeelden in templateformulieren). Die volgen bewust niet het portaalthema.
- Database, migraties, beveiligingsregels, authenticatie, e-mail- en pushprocessen.
- Acties die echte leden bereiken (push, publiceren, campagnes).
- Kaartpinnen in `CompanyMap` mogen naar petrol, maar dat is optioneel.
