# Foutenrapport: Statistieken in Beheer (herbouw)

- **Getest:** 20 oktober 2026, ca. 19:30–20:15 (Amsterdam).
- **Live:** https://voc-blue.vercel.app/beheer/statistieken, ingelogd als het testaccount (beheerder).
- **Code:** branch `claude/voc-ledenportaal-pwa-i3ku74` @ `13aac72`. De herbouw zelf zit in `c76fe79`. Live draait deze code: de badge-labels en de vijf tabbladen komen overeen.
- **Methode:**
  - Playwright op 1366×900 en 390×844 (isMobile, touch), in licht en donker (`colorScheme`).
  - Alle 5 tabbladen × 5 periodes × 4 configuraties, dus 100 paginaladingen. Per lading gemeten: console, requests, horizontale overloop, as-labels en KPI-teksten.
  - Daarna handmatige interactietests en een vergelijking met de andere Beheer-pagina's.
  - Strikt alleen lezen: niets opgeslagen of verstuurd.
- **Screenshots:** in deze map. Prefix `live-<formaat>-<thema>-<tab>-<periode>.png`, plus `bewijs-*`, `badge-*`, `tooltip-*` en `mobiel-*`.

---

## 0. Extra punt van Robbert: badges in de petrol BeheerSidebar

**Wat hij ziet klopt.**
- Het ledenmenu toont **"Beheer 2"**.
- In Beheer staat bij **Aanvragen** en **Gemelde berichten** geen rood bolletje.
- Het dashboard zegt **"Wacht op jou – Niets te doen."**

**Bewijs:**
- `badge-00-naast-elkaar-desktop.png`: links het ledenmenu op `/` met "Beheer 2", rechts `/beheer` met de BeheerSidebar zonder badges en "Niets te doen".
- `badge-03-mobiel-beide-menus.png`: op mobiel zie je beide menu's tegelijk (onderbalk met de rode ring om "Profiel", en het uitgeklapte Beheer-menu). Ook daar staan geen badges.
- Zes keer gemeten over ~70 s: steeds "Beheer 2", steeds 0 in de sidebar, steeds "Niets te doen". Het is dus geen cache-moment.
- `/beheer/instroom` toont "Geen openstaande aanvragen". `/beheer/rapportages` toont "Geen openstaande rapportages".

**Wat de code doet:**
- De badges worden wél doorgegeven en gerenderd.
  - `src/app/(app)/beheer/layout.tsx:24-30` geeft `badges={{ "/beheer/instroom": counts.accessRequests, "/beheer/rapportages": counts.openReports }}` mee.
  - `src/components/beheer/BeheerSidebar.tsx:118-134` (desktop) en `:89-106` (mobiel) renderen `NavBadge`.
- `NavBadge` (`src/components/layout/NavBadge.tsx:5`) toont niets bij een telling van 0. Beide tellingen zijn live 0, dus de sidebar is technisch correct leeg.
- De "Beheer"-badge in het ledenmenu is de **som van vijf** tellingen: `src/app/(app)/layout.tsx:51` met `beheerWaitingCounts.total` uit `src/lib/beheer/waitingCounts.ts:37-58`. Die som bevat ook:
  - `pendingActivities`;
  - `pendingMembershipRequests` (bedrijfskoppelingen);
  - `expiringInvitations`.
- Voor die drie categorieën bestaat **geen** badge in de BeheerSidebar. De 2 komt dus uit een categorie die je in de sidebar nergens terugziet.

**Waarom "Wacht op jou" 0 zegt (meest waarschijnlijke oorzaak):**
- `src/app/(app)/beheer/page.tsx:128` haalt de bedrijfskoppelingen op met `profile:profiles(id, first_name, last_name)`.
- `company_membership_requests` heeft **twee** foreign keys naar `profiles`: `profile_id` en `decided_by` (zie `supabase/migrations/0013_company_membership_approval.sql:9,12`). PostgREST weigert zo'n dubbelzinnige embed met fout PGRST201. Daardoor is `data` `null`.
- De fout wordt niet gecontroleerd, dus het dashboard telt 0.
- `waitingCounts.ts:42` doet een kale `count` zonder embed en telt de 2 rijen wél.
- Ondersteunend bewijs: `/beheer/notificaties` toont op 18-10-2026 10:10 meerdere meldingen "Nieuwe bedrijfskoppeling ter goedkeuring". Op het tabblad Communicatie (7 dagen) staat "Bedrijfskoppeling ter goedkeuring 5".
- Alternatief, als de embed toch werkt: `page.tsx:196-198` filtert koppelingen waarvan bedrijf of profiel `null` is (wezen), en `waitingCounts.ts` doet dat niet.
- Beide routes geven "Beheer 2" tegenover "Wacht op jou 0".
- Hetzelfde embed-probleem zit in `src/components/company/CompanyProfileContent.tsx:64`. Ook op de bedrijfspagina zie je de openstaande koppelingen dan niet.

**Gevolg:**
- Er wachten waarschijnlijk 2 bedrijfskoppelingen op goedkeuring die je **nergens** in Beheer te zien krijgt.
- De Beheer-badge is daarmee de enige plek die het (terecht) meldt, maar je kunt er niet op handelen.

**Fix:**
1. `beheer/page.tsx:128` en `CompanyProfileContent.tsx:64`: maak de embed eenduidig met `profile:profiles!company_membership_requests_profile_id_fkey(id, first_name, last_name)` en log of toon `error`.
2. Laat het dashboard dezelfde bron gebruiken. `totalWaiting` in `beheer/page.tsx` moet `getBeheerWaitingCounts()` zijn, of `waitingCounts.ts` moet hetzelfde wezen-filter toepassen. Dan kunnen de twee nooit meer uiteenlopen.
3. Geef in `beheer/layout.tsx:30` élke categorie uit de som een plek in de sidebar:
   - `"/beheer/instroom": accessRequests + expiringInvitations`;
   - `"/beheer/bedrijven": pendingMembershipRequests`;
   - `"/beheer/agenda": pendingActivities`;
   - `"/beheer/rapportages": openReports`.

   Zo is de som van de sidebar-badges altijd gelijk aan de Beheer-badge.
4. Laag: `waitingCounts` (`cachedQuery("beheer-waiting-counts", 30s)`) wordt nergens met `invalidateQuery` ververst na goedkeuren of afwijzen. Na een actie loopt de badge dus tot ±30 s (stale-while-revalidate) achter. Roep `invalidateQuery("beheer-waiting-counts")` aan in de betreffende server actions.

---

## 1. Wat goed is

- Vijf tekst-tabs met onderlijn en één periodeknop rechts, met de vijf juiste keuzes en "Vergelijk met vorige periode" standaard aan.
- `?tab=`, `?periode=` en `?vergelijk=` staan in de URL.
  - Tabblad wisselen behoudt de periode.
  - Terug en vooruit werken. Getest: `periode=7d` → `tab=leden` → `vergelijk=0`, daarna back, back, forward geeft telkens de juiste staat.
  - Ongeldige waarden (`tab=foo&periode=bar`) vallen netjes terug op Overzicht en 30 dagen.
- Vergelijking uit (`vergelijk=0`): de grijze stippellijn en de legenda verdwijnen en de delta's worden leeg. Het datumregeltje laat dan "· vergeleken met …" weg.
- Periodemenu: Esc sluit, en een klik erbuiten sluit (overlay).
- De datumreeks onder de balk klopt per periode met de buckets:
  - 7d: 14–20 okt;
  - 30d: 21 sep – 20 okt;
  - 3m: 27 jul – 20 okt (13 weken, wk 31–43);
  - 12m: nov 2025 – okt 2026;
  - jaar: jan – okt 2026.
- Y-assen beginnen bij 0, de ticks zijn heel (0,1,2… of 0,2,4,6). `niceStep` klemt kleine maxima goed af, dus geen dubbele "1"-labels.
- Grafiekkleuren volgen de opdracht. Gemeten via `getComputedStyle`:
  - licht: #0a8f9c / #d46a1f / #a8a29a;
  - donker: #2a9fab / #d9722b / #6f6f76.
- Legenda staat er bij twee of meer reeksen.
- Lijngrafiek: kruisdraad plus één gedeelde tooltip per x-positie. De waarden kloppen met de punten (21 sep = 1, 6 okt = 2, 20 okt = 3).
- Lege toestanden zijn netjes, bijvoorbeeld "Nog geen gegevens in deze periode." (Community 7d) en "Nog geen nieuwsbrieven verstuurd.".
- Geen console-errors en geen 4xx/5xx. De enige mislukte requests zijn afgebroken RSC-prefetches (`net::ERR_ABORTED`) bij het wegnavigeren, en die zijn onschuldig.
- BeheerSidebar is op desktop `fixed` en vult de volle hoogte. Na 1500 px scrollen: top 0, bottom 900 = viewport (`sidebar-na-scroll-desktop.png`).
- Getallen die onderling kloppen:
  - Leden 8 = dashboard "Actieve leden 8" = `/beheer/leden` "8 van 8" (0 gedeactiveerd);
  - Nieuwe leden 30d 6 = dashboard "Nieuwe leden deze maand 6";
  - 12 maanden 8 aanmeldingen = som van de activiteiten in de agenda;
  - "Wie komt er" 1 + 2 + 5 = 8 actieve leden;
  - Profiel incompleet 7 ↔ Profiel compleet 13% (1 van 8);
  - Leden per plaats en per branche tellen op tot de 7 gekoppelde leden.

---

## 2. Fouten op ernst

### HOOG

#### H1. Instroomtrechter: balk loopt buiten de kaart en de pagina, met percentages tot 800%

- **Wat:**
  - De "Nieuw lid"-balk is 300–400% breed. Er ontstaat **horizontale scroll op de hele pagina**:
    - desktop: `scrollWidth` 1464–1595 bij 1366 breed;
    - mobiel: 474–574 bij 390 breed.
  - De percentages zijn onzin, bijvoorbeeld "Nieuw lid 6 · 600%" en "Nieuw lid 8 · 800%".
  - Op het tabblad Leden heeft de trechter "Activatie" hetzelfde: "Actief, 30 dagen 8 · 800%" na "Profiel compleet 1".
- **Waar:** Overzicht → Instroom, bij 30d, 3m, 12m en jaar, in alle formaten en thema's. Leden → Activatie bij elke periode.
- **Bewijs:**
  - `bewijs-trechter-overloop-desktop.png`;
  - `live-desktop-light-overzicht-30d.png`;
  - `live-mobile-light-overzicht-30d.png`, waarin de pagina 474 px breed is.
- **Oorzaak:**
  - `src/components/beheer/statistics/Charts.tsx:313,317`: de breedte is `s.value / steps[0].value * 100` zonder plafond.
  - `:327-329`: het percentage is t.o.v. de vorige stap.
  - De stappen zijn geen deelverzamelingen van elkaar:
    - "Nieuw lid" telt álle nieuwe profielen (`overview.ts:166-170`), ook geïmporteerde of uitgenodigde, niet alleen die via de website;
    - "Actief, 30 dagen" is geen subset van "Profiel compleet" (`members.ts:127-132`).
- **Fix:**
  - Breedte `Math.min(100, …)` en de schaal op `Math.max(...steps.map(s => s.value))`.
  - Percentage alleen tonen als de stap een echte subset is, of altijd t.o.v. stap 1 en geklemd.
  - Inhoudelijk: "Nieuw lid" beperken tot profielen die uit een toegangsaanvraag of prospect komen (koppeling via e-mail). Of het label veranderen in "Nieuwe leden (alle bronnen)" zonder percentage.
  - "Activatie": volgorde "Account → Actief 30 d → Profiel compleet", of geen percentages.

#### H2. KPI "Actieve leden" rekent met `last_active_at`, dus delta's en periodes kloppen niet

- **Wat:**
  - De vorige periode is vrijwel altijd ~0%: "100% +100% t.o.v. vorige 30 dagen" en "88% +75% t.o.v. vorige 7 dagen".
  - Tegelijk toont de grafiek "Actieve leden" in dezelfde vorige periode wél actieve leden (grijze stippellijn met een piek van 2).
  - Langere periodes geven een *lager* percentage dan kortere: 12 maanden 88% < 30 dagen 100%. Dat kan logisch niet.
- **Waar:** Overzicht, KPI 2, elke periode.
- **Bewijs:**
  - `bewijs-kpi-rij-desktop.png`;
  - `bewijs-actieve-leden-grafiek.png`;
  - crawl-data 7d "88% +75%", 30d "100% +100%", 12m "88%", jaar "100%".
- **Oorzaak:**
  - `src/lib/statistics/overview.ts:55-67,233-237`: telt profielen met `last_active_at` in [start, end).
  - `last_active_at` is één rollend tijdstip. Wie vandaag actief was, telt nooit mee in de vorige periode, en wie na `end` weer actief werd, valt eruit.
  - Elke periode heeft zijn eigen 60 s-cache (`cachedQuery(\`statistieken-overzicht-${period}\`)`, `overview.ts:71`), gevuld op verschillende momenten.
  - De grafiek gebruikt een andere, betere bron (`getActivityRows`, `shared.ts:312-329`).
- **Fix:**
  - Bereken de KPI uit dezelfde reconstructie als de grafiek: unieke `profile_id` uit `getActivityRows` binnen [start, end) en [prevStart, prevEnd).
  - Of laat de delta weg (`previousValue: null`) tot er een echte inloggeschiedenis is.

#### H3. Ledenontwikkeling en "per maand"-grafieken: 13 kolommen, twee keer "okt" zonder jaar, en de tooltip wordt afgeknipt

- **Wat:**
  - "Laatste 12 maanden" toont 13 maanden: okt 2025 … okt 2026.
  - Het label "okt" staat twee keer op de as, en ook de tooltip zegt alleen "okt". Dit is het oude "okt 26"-probleem in een nieuwe vorm.
  - Slechts om de maand staat een label, dus de "sep"-kolom met waarde 2 is naamloos.
  - De eerste maand is maar deels gevuld: alleen data vanaf 20 okt 2025.
- **Waar:** Overzicht → Ledenontwikkeling; Leden → "Nieuw en uitgeschreven per maand"; Activiteiten → "Aanmeldingen per maand". Bij elke periode.
- **Bewijs:**
  - `bewijs-ledenontwikkeling-twee-okt.png`;
  - `tooltip-staaf-leden-0.png` en `tooltip-staaf-leden-12.png`: beide tooltips "okt", en de rechter tooltip is afgeknipt ("Uitgeschreve…").
  - Node-check van `buildBuckets`: 13 buckets, `okt,nov,…,sep,okt`.
- **Oorzaak:**
  - `overview.ts:376-384`, `members.ts:33,105-112` en `activities.ts:202,319-326`: `start = now − 365 dagen`, en `buildBuckets` snapt naar het begin van die maand. Daardoor ontstaan 13 vakken.
  - `period.ts:186-188`: `monthLabel` zonder jaar.
  - `Charts.tsx:200`: `sparseLabelIndexes(…, 12)` geeft bij 13 labels stap 2.
  - Tooltip: `Charts.tsx:229` staat altijd op `align="center"`, en de SVG (`:206`) knipt af (standaard `overflow:hidden`).
- **Fix:**
  - `start = addMonths(startOfMonth(now), -11)`, zodat het precies 12 buckets zijn. Of hergebruik `resolvePeriodRange("12m")`.
  - Label "okt '25" bij een jaarwissel, of altijd het jaar in de tooltip.
  - In BarChart dezelfde `align` start/end voor de eerste en laatste kolom als in LineChart (`:142`), plus `overflow="visible"` of `className="overflow-visible"` op de `<svg>`.

#### H4. Signalen linken niet naar een gefilterde ledenlijst

- **Wat:** "Profiel incompleet (7)", "Nooit naar een activiteit (6)" en "Niet ingelogd 90+" linken alle drie naar kaal `/beheer/leden`. Daar zie je alle 8 leden, ongefilterd.
- **Waar:** Overzicht → Signalen.
- **Bewijs:** de href's die zijn uitgelezen: `/beheer/leden` voor alle drie.
- **Oorzaak:**
  - `overview.ts:335,346,357`: `href: "/beheer/leden"`.
  - `BeheerLedenListClient.tsx:35-43` kent alleen de filters `q`, `role` en `active`. Er bestaat geen filter voor incompleet, nooit-geweest of 90 dagen inactief.
- **Fix:** voeg URL-filters toe aan de ledenlijst, bijvoorbeeld `?signaal=incompleet|nooit|inactief90`, met dezelfde definities als `overview.ts:320-324`. Link de pills daarheen.

### MIDDEL

#### M1. KPI-rij op desktop: zes tegels naast elkaar, afgekapte labels, delta over drie regels, en maar één sparkline

- **Wat:**
  - Bij 1366 px staan zes tegels van ~150 px in één rij. De labels worden afgekapt: "Aanmeldingen acti…", "Berichten en react…", "Nieuwsbrief afgel…".
  - "t.o.v. vorige 30 dagen" breekt over 2–3 regels.
  - Alleen "Leden" heeft een sparkline, terwijl de opdracht en het ontwerp er zes vragen.
  - De Leden-sparkline is bovendien nep: een rechte interpolatie tussen het vorige en het huidige totaal.
- **Waar:** alle tabbladen, desktop ≥1024 px.
- **Bewijs:** `bewijs-kpi-rij-desktop.png` tegenover `ontwerp-statistieken-desktop.png` en `docs/design/statistieken-overzicht-desktop.png` (3 × 2).
- **Oorzaak:**
  - `src/app/(app)/beheer/statistieken/page.tsx:46` gebruikt `lg:grid-cols-6`.
  - Sparklines: alleen `overview.ts:230` vult `sparkline`, met `cumulativeMemberSparkline` (`:443-447`).
- **Fix:**
  - `lg:grid-cols-3`, zoals het ontwerp.
  - Echte reeksen per bucket voor alle zes:
    - actieve leden: hergebruik `activeMembersTrend`;
    - aanmeldingen en unieke deelnemers: `bucketCountSeries` / `bucketUniqueSeries` op `registrationsForUnique`;
    - berichten: posts en comments per bucket;
    - leden: cumulatief tellen per bucket.

#### M2. Mobiel: periodeknop breekt in drie regels en duwt de tabbladen weg

- **Wat:**
  - Op 390 px staat de periodeknop naast de tabs, ~102 px breed met `h-9`.
  - De tekst "Laatste / 30 / dagen" loopt buiten de knop.
  - Er blijft 243 px over voor de tabs: "Activiteite" wordt afgesneden, en Community en Communicatie zijn onzichtbaar, zonder enige scroll-hint.
  - In het ontwerp staat de periodeknop op mobiel op een eigen regel onder de tabs.
- **Waar:** elk tabblad, mobiel, licht en donker.
- **Bewijs:**
  - `bewijs-mobiel-tabs-periodeknop.png`;
  - `mobiel-periodemenu-open.png`;
  - ontwerp: `docs/design/statistieken-overzicht-mobiel.png`.
- **Oorzaak:** `page.tsx:412-417`: één `flex items-end justify-between`-rij zonder wrap of breakpoint. `PeriodMenu.tsx:153`: geen `whitespace-nowrap`.
- **Fix:**
  - `flex-col-reverse sm:flex-row` (of `flex-wrap`) voor de rij, en `whitespace-nowrap` op de knop.
  - Een fade of schaduw aan de rechterrand van de tablist als er meer te scrollen is.

#### M3. Grafieklabels op mobiel onleesbaar (~6 px), tooltips werken niet met aanraken

- **Wat:**
  - De as-labels zijn `fontSize=10` in een viewBox van 640 breed. Op een kaart van 326 px is dat **6,0 px** hoog, gemeten met `getBoundingClientRect`. Op desktop is het ~8 px.
  - Tikken op een kolom of punt toont geen tooltip (opacity blijft 0).
  - Op touch is er dus geen enkele manier om een waarde af te lezen.
- **Waar:** alle lijn- en staafgrafieken, mobiel. Ook desktop is krap.
- **Bewijs:** `mobiel-tik-tooltip.png` en `live-mobile-light-overzicht-30d.png`.
- **Oorzaak:**
  - `Charts.tsx:26` (`CHART_WIDTH = 640`) en `:89,164,210,239` (`fontSize={10}` in viewBox-eenheden).
  - De tooltip werkt alleen via CSS `group-hover` (`:18`).
- **Fix:**
  - Meet de containerbreedte (ResizeObserver) en teken in echte pixels. Of schaal de fontSize omgekeerd mee, zodat de labels minstens 11 px zijn.
  - Voor touch: een kleine client-wrapper die bij tap of focus een `data-active`-index zet (`:focus-within` op een `tabIndex=0`-`<g>` werkt ook).

#### M4. "Nooit naar een activiteit" geeft twee verschillende getallen

- **Wat:** Overzicht → Signalen zegt "Nooit naar een activiteit (12 mnd): **6** leden". Activiteiten → "Wie komt er?" zegt "Nog nooit (12 mnd): **5**". Dezelfde vraag levert twee antwoorden.
- **Waar:** Overzicht en Activiteiten, elke periode.
- **Oorzaak:**
  - `overview.ts:185-189,323-324` telt op `attended = true` (opkomst).
  - `activities.ts:244-249,301-311` telt op aanmeldingen, inclusief wachtlijst en gedeactiveerde profielen.
- **Fix:**
  - Kies één definitie, bij voorkeur aanmelding zonder wachtlijst, of opkomst als die consequent wordt bijgehouden. Zet die in `shared.ts` en gebruik hem op beide plekken.
  - Filter daarnaast op `is_active` leden.

#### M5. Links "Activiteiten", "Leden" en "Communicatie" in de kaartkoppen gooien de periode weg

- **Wat:** vanuit Overzicht met `periode=7d&vergelijk=0` brengt de link "Activiteiten" je naar `/beheer/statistieken?tab=activiteiten`. Je staat dan weer op 30 dagen met de vergelijking aan.
- **Waar:** Overzicht, de kaarten "Activiteiten in deze periode", "Ledenontwikkeling" en "Bereik".
- **Oorzaak:** de hardgecodeerde hrefs in `page.tsx:98,119,130`. Ze gebruiken ook een kale `<Link>`, niet de `useStatsNav`-transitie, dus het dimmen ontbreekt.
- **Fix:** bouw de href uit de huidige `periode` en `vergelijk` (die zijn al bekend in `OverviewTab`), of maak er een kleine client-link van die `StatsTabs.hrefFor` hergebruikt.

#### M6. Deels verstuurde nieuwsbrief telt nergens mee

- **Wat:**
  - De nieuwsbrief "Herinnering: Open Borrel donderdag 8 oktober & Netwerk Oost 3 november" heeft status "Deels verstuurd" (6 okt) en is dus bij een deel van de ontvangers aangekomen.
  - Statistieken zegt toch overal "Nog geen nieuwsbrief verstuurd" en "Nieuwsbrieven verstuurd 0", ook in de KPI "Nieuwsbrief afgeleverd" en in Bereik.
- **Waar:** Overzicht (KPI 6 en Bereik) en Communicatie, elke periode.
- **Bewijs:**
  - `nieuwsbrieven-deels-verstuurd.png`;
  - `statistieken-communicatie-geen-nieuwsbrief.png`.
  - Kanttekening: de Nieuwsbrieven-pagina zet hem zelf onder "Concepten" met "Verzonden: Nog niets verzonden". Statistieken volgt dus dezelfde (twijfelachtige) indeling.
- **Oorzaak:** `communication.ts:208` en `overview.ts:193` filteren op `.eq("status", "verzonden")`. Status `verzenden_mislukt` (zie `CommunicationRow.tsx:104`) valt erbuiten, terwijl er `communication_deliveries` zijn.
- **Fix:** `.in("status", ["verzonden", "verzenden_mislukt"])` en in de tabel een status-pill "Deels". Dan zijn "afgeleverd" en "mislukt" precies de interessante cijfers.

#### M7. "Hoe komen meldingen aan?" zegt 100% push, terwijl 13% push heeft

- **Wat:** Communicatie toont "Ook als pushmelding **100%**". De KPI ernaast en Bereik op Overzicht zeggen "Leden met pushmeldingen **13%** (1 van de 8)".
- **Waar:** Communicatie, elke periode.
- **Oorzaak:** `communication.ts:267-276` kijkt alleen naar de voorkeursvlaggen `push_*` en `email_*`, die standaard aan staan. Of iemand een pushabonnement heeft, telt niet mee.
- **Fix:** push = voorkeur aan **én** een `push_subscription` (de `pushSubscriptions` zijn al opgehaald in `:201`). "Alleen in het portaal" hoort dan de rest te zijn.

#### M8. Periodemenu niet met het toetsenbord te bedienen

- **Wat:**
  - Enter op de knop opent het menu, maar de focus blijft op de knop.
  - ArrowDown doet niets.
  - Tab springt naar de pagina-inhoud (de link "Activiteiten") in plaats van naar het menu, omdat het menu in een portal aan het eind van `<body>` staat.
  - Na Esc of sluiten keert de focus niet terug naar de knop.
  - Het vinkje staat als gewone checkbox binnen een `role="menu"`.
- **Waar:** alle tabbladen, desktop.
- **Bewijs:** testlog: "open after Enter true, focus: BUTTON Laatste 30 dagen", "after ArrowDown focus: BUTTON", "after Tab focus: A Activiteiten".
- **Oorzaak:** `PeriodMenu.tsx:159-199`: geen focusbeheer, geen roving focus en geen `menuitemcheckbox`.
- **Fix:**
  - Bij openen de focus naar het actieve `menuitemradio`; pijl op en neer, Home en End; Tab of Esc sluit en zet de focus terug op `anchorRef`.
  - Het vinkje als `role="menuitemcheckbox" aria-checked`.
  - Of gebruik een bestaand toegankelijk listbox- of menu-component.

#### M9. Tabbladen zijn geen volledige tabs

- **Wat:**
  - Er is `role="tablist"` en `role="tab"`, maar geen `aria-controls` en geen `role="tabpanel"` (0 gevonden).
  - Alle vijf tabs hebben `tabIndex 0` (geen roving tabindex).
  - Pijltjestoetsen doen niets.
  - Tijdens het laden zijn alle tabs `disabled`, waardoor de focus verloren gaat.
  - Het actieve streepje verspringt pas nadat de server antwoordt (niet optimistisch, ondanks het commentaar in `StatsNavContext.tsx:84-86`).
- **Waar:** alle tabbladen.
- **Oorzaak:** `StatsTabs.tsx:40-57` en `StatsContentArea.tsx:72` (geen `role="tabpanel"`).
- **Fix:**
  - `id` en `aria-controls` plus `role="tabpanel" aria-labelledby` op `StatsContentArea`.
  - `tabIndex={active ? 0 : -1}` en pijltjes links/rechts.
  - Niet disablen, maar `aria-busy` op het panel.
  - Een optimistische actieve tab via `useOptimistic` of lokale state.
  - Alternatief: gewone `<nav>` met links en `aria-current="page"` (het zijn feitelijk URL's).

#### M10. Grafieken hebben geen bruikbaar tekstalternatief

- **Wat:** elke SVG heeft alleen `aria-label="Trendgrafiek"` of `"Staafdiagram"`, zonder titel, waarden of periode. De tooltips zijn alleen met de muis te bereiken.
- **Waar:** alle grafieken.
- **Oorzaak:** `Charts.tsx:85,206`.
- **Fix:**
  - Een beschrijvend label, bijvoorbeeld "Actieve leden per dag, 21 sep – 20 okt; hoogste 4 op 6 okt".
  - Plus een visueel verborgen `<table>` met labels en waarden per reeks (`sr-only`).
  - De trechter en de horizontale balken zijn wel tekst en dus prima.

#### M11. Tijdzone: periodegrenzen liggen op 02:00 (zomer) of 01:00 (winter) Amsterdamse tijd, niet op middernacht

- **Wat:** `amsterdamMidnightUTC` geeft UTC-middernacht terug in plaats van Amsterdamse middernacht. Bijvoorbeeld: start 7d = `2026-10-14T00:00Z`, maar dat moet `2026-10-13T22:00Z` zijn. Acties tussen 00:00 en 02:00 lokale tijd vallen daardoor in de vorige dag, week of maand.
- **Waar:** alle periodes en alle buckets.
- **Bewijs:** node-run van `period.ts` met `now = 2026-10-20T19:50Z`. Alle buckets beginnen op `T00:00:00Z`, ook over de DST-wissel van 25 okt.
- **Oorzaak:** `period.ts:67-73`. De correctie vergelijkt alleen de **datum** van de Amsterdamse lezing (`read.year/month/day`), niet het uur. UTC-middernacht valt in Amsterdam op dezelfde datum, dus de correctie is altijd 0.
- **Fix:** bereken de offset met `timeZoneName: "longOffset"` (of lees ook `hour` en `minute` en trek die af). Bijvoorbeeld: `offset = (Date.UTC(read.y, read.m-1, read.d, read.h, read.min) - guess.getTime())` en `return new Date(guess.getTime() - offset)`.

#### M12. Rijlimiet: veel queries halen ongelimiteerd rijen op

- **Wat:** Supabase/PostgREST geeft standaard maximaal 1000 rijen terug. Deze queries hebben geen paginering of `count`:
  - `events` (`post_viewed` all-time): `community.ts:72`, `overview.ts:202-206`, `shared.ts:318`;
  - `feed_comments` all-time: `community.ts:107`;
  - alle `communication_deliveries`: `communication.ts:210`;
  - `notifications` in de periode: `communication.ts:219-224` (één nieuwe activiteit geeft al ~1 rij per lid);
  - `activity_registrations` over 12 maanden: `activities.ts:244-251`.

  Bij echte aantallen gaan "meest gelezen", "meldingen per type", afgeleverd/mislukt en de actieve-leden-trend **stil te laag** tellen.
- **Waar:** nu nog niet zichtbaar (testdata is klein). Het is een structureel risico.
- **Fix:** aggregeren in SQL. Gebruik een RPC of view met `group by`, of minstens `.range()` met een lus, of `count: "exact", head: true` per type.

#### M13. Laadtijd: soms 12–22 s

- **Wat:**
  - Met warme cache laadt een tabblad in 0,5–1,3 s.
  - Bij een cache-miss duurt Overzicht 3,5–4,8 s (eerste lading).
  - Twee keer gemeten: **Community 12m 21,7 s**, **Communicatie 12m 18,6 s** en **Community 3m 12,5 s** (tweede ronde).
- **Waar:** vooral Community en Communicatie, lange periodes.
- **Oorzaak:**
  - Ongelimiteerde all-time selects (zie M12): `events`, `feed_comments` en `communication_deliveries`.
  - Plus een opeenvolgende tweede ronde queries (`community.ts:107`; `overview.ts:267,290-293,395-399,411`).
  - Daarnaast doet de root-layout bij elke pagina ook `getBeheerWaitingCounts` en de notificaties.
- **Fix:** aggregeren in SQL (zie M12). De `feed_comments`-telling naar de eerste `Promise.all`. `getActivityRows(prevStart)` vervangt beide aanroepen (`overview.ts:148,267`): één keer vanaf `prevStart` ophalen en splitsen.

### LAAG

#### L1. "Gemiddelde bezetting 0%" terwijl geen enkele activiteit een maximum heeft

- **Waar:** Activiteiten, elke periode.
- **Wat:** 0% suggereert lege activiteiten.
- **Oorzaak:** `activities.ts:284-290`.
- **Fix:** bij `occupancyRates.length === 0` "–" tonen met de note "geen maximum ingesteld".

#### L2. Bezettingsbalk zonder maximum is misleidend

- **Wat:** Bij "Activiteiten in deze periode" is de balk van "Open borrel 2 aanmeldingen" vol. Er is geen `max_participants`, maar de toelichting zegt "Balk = bezetting t.o.v. het maximum".
- **Waar:** Overzicht en Activiteiten.
- **Oorzaak:** `Charts.tsx:278` valt terug op de hoogste rij.
- **Fix:** zonder max een andere kleur of geen balk, en de toelichting aanpassen.
- **Ontwerp:** het ontwerp toont ook de datum per activiteit ("do 8 okt"). Die ontbreekt: `sublabel` wordt niet gevuld in `page.tsx:100-108`.

#### L3. Delta's bij percentages heten "+75%" terwijl het procentpunten zijn

- **Waar:** `KpiTile.tsx:25-27`.
- **Fix:** gebruik "pp" of "procentpunt".

#### L4. Tooltip niet echt "direct"

- **Wat:** Er zit een `transition-opacity` van 150 ms op. Na 50 ms is de opacity 0,46.
- **Waar:** `Charts.tsx:18`.
- **Fix:** `transition-none` of `duration-75`.

#### L5. Hoofdletters niet gelijk tussen legenda en tooltip

- **Wat:** de tooltip zegt "vorige 30 dagen", de legenda "Vorige 30 dagen".
- **Waar:** `page.tsx:74` tegenover `:82`.

#### L6. KPI "Leden" telt alle profielen, ook gedeactiveerde

- **Wat:** Het dashboard telt alleen `is_active`. Nu nog gelijk (0 gedeactiveerd), maar de twee lopen uiteen zodra iemand zich uitschrijft.
- **Waar:** `overview.ts:104-105`, `members.ts:50-51`.
- **Fix:** gebruik "actieve leden op moment X" (`created_at < X` en (`deactivated_at` is null of > X)).

#### L7. Branche en plaats tellen ook gedeactiveerde leden mee

- **Wat:** Het commentaar zegt "van elk actief lid", maar de code filtert daar niet op.
- **Waar:** `members.ts:137-151`.

#### L8. Vorige-periodereeks in de grafiek wijkt soms een vak af

- **Wat:**
  - De vorige-periodereeks begint bij 3m op de maandag vóór `prevStart` (27 apr in plaats van 2 mei). Het eerste vorige vak telt dus 5 dagen extra.
  - Bij 7d en 30d begint `prevStart` om 04:10 in plaats van om middernacht. De KPI en de stippellijn gebruiken dus net andere grenzen.
- **Waar:** `period.ts:131-144`.
- **Fix:** `prevStart` ook op dag- of weekbegin snappen.

#### L9. Signaal-sublabels worden op mobiel afgekapt

- **Wat:** bijvoorbeeld "Geen foto of nog niet aan een bedrijf geko…".
- **Fix:** kortere tekst, zoals in het ontwerp ("Geen foto of bedrijf"), of laten afbreken.

#### L10. Mobiel Beheer-menu toont geen badge-som op de ingeklapte knop

- **Wat:** Je ziet pas na het openklappen dat er iets wacht (`BeheerSidebar.tsx:146-155`).

#### L11. Tikdoelen net onder 44 px

- **Wat:** Tabs zijn 40 px hoog, de periodeknop en de menu-items 36 px. Dat haalt WCAG 2.2 AA (24 px), maar niet de iOS/Material-richtlijn van 44/48 px.

---

## 3. Afwijkingen van het ontwerp

| Onderdeel | Ontwerp | Live |
|---|---|---|
| KPI-raster | 3 × 2, delta op één regel | 6 × 1 (desktop), labels afgekapt, delta over 2–3 regels |
| Sparklines | in alle zes KPI's | alleen "Leden", en die is lineair geïnterpoleerd |
| Mobiele kop | tabs, daaronder de periodeknop | naast elkaar; knop breekt in 3 regels, tabs afgesneden |
| Actieve leden | y-as 0–60, ruime labels | labels 6–8 px |
| Activiteiten in deze periode | datum per rij, "48 / 60", wachtlijst in oranje | geen datum; bij ontbrekend max een volle balk |
| Ledenontwikkeling | 12 maanden, elk een label | 13 maanden, om de maand een label, "okt" dubbel |
| Signalen | 4 signalen incl. "X vol – Populair" | alleen signalen met telling > 0 (OK), links niet gefilterd |
| Bereik | tegeltjes met tekstlabel "MAIL / PUSH / POSTS" | icoontjes van 10 px; het getal "–" bij geen nieuwsbrief |
| Delta-stijl | zwart ▲/▼ met vet getal | groene/rode pijl (acceptabel, wel afwijkend) |
| Sidebar-badges | rood bij Aanvragen (3) en Gemelde berichten (1) | mechanisme aanwezig, maar mist de categorieën die de Beheer-badge wel telt (zie §0) |

---

## 4. Niet (volledig) getest

- **Database-tellingen rechtstreeks:** geen directe DB-toegang. Het uitlezen van de Supabase-sessie om REST-queries te doen werd geblokkeerd, en dat is terecht.
  - De oorzaak van "Beheer 2" (PGRST201 op de embed in `beheer/page.tsx:128`) is daardoor afgeleid uit het schema en de meldingen, niet uit de foutmelding zelf.
  - Verifiëren kan via Supabase → Logs → API op `company_membership_requests`, of door die select in de SQL-/REST-console uit te voeren.
- **Signaal "X vol – Populair" en de wachtlijst-weergave:** er is geen activiteit met een wachtlijst of een `max_participants`.
- **Echte bezettingspercentages:** zelfde reden, geen activiteit met een maximum.
- **Nieuwsbrieventabel met gevulde rijen:** er is geen enkele nieuwsbrief met status `verzonden`.
- **"Niet ingelogd, 90+ dagen":** de telling is 0, dus de rij verschijnt niet.
- **Rijlimiet (M12) en prestaties bij grote aantallen:** de testdata is te klein (8 leden). Dit is alleen uit de code beoordeeld.
- **Echte iOS/Android-browsers:** alleen Chromium-emulatie (isMobile + touch). Het hover-gedrag op echte Safari kan afwijken: iOS emuleert soms `:hover` bij een tik.
- **Schermlezer:** niet met NVDA of VoiceOver getest. Het toegankelijkheidsoordeel is gebaseerd op de DOM/ARIA-structuur en toetsenbordtests.
- **Badge-gedrag na goedkeuren of afwijzen:** niet getest, want dat zou data wijzigen.
