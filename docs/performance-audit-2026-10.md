# VOC-ledenportaal — performance-audit

17 oktober 2026 · online versie: https://claude.ai/code/artifact/4b085df0-2850-4bd9-89c2-ae84d529b88f

## A. Samenvatting

Het portaal is niet traag door de database of door het Vercel-abonnement. De vertraging zit op drie plekken, in deze volgorde:

1. **Afbeeldingen worden op volle grootte geladen.** Logo's, profielfoto's en activiteitsfoto's van 1200 tot 2363 pixels breed worden getoond als icoon van 32 tot 112 pixels. Gemeten per paginabezoek: Agenda 1,9 MB, Community 2,6 MB, Home 0,7 MB, een activiteit openen 1,2 MB. Dat is 75 tot 90 procent van alle bytes per pagina. Op een telefoon met matig bereik is dit wat “traag” voelt. Oorzaak: de afbeeldingsoptimalisatie staat als noodmaatregel uit (`next.config.ts`, `images.unoptimized: true`) en uploads krijgen geen kleine versie.
2. **Elke volledige paginalading wacht op een reeks verzoeken achter elkaar.** Eerst de inlogcontrole bij Supabase, dan het profiel, dan de gegevens van de menubalk, dan pas de pagina zelf. Gemeten serverreactietijd: meestal 0,45 tot 0,9 seconde, met uitschieters van 2,1 tot 2,9 seconde (activiteit openen, Beheer → Agenda, een ledenprofiel). Daarbovenop vraagt de server voor elke foto los een tijdelijke link aan: ruim 110 losse verzoeken op Leden en op Bedrijven.
3. **Sommige acties doen meer dan nodig.** Een activiteit openen schrijft eerst een statistiekregel weg en wacht daarop. Aanmelden ververst de hele pagina twee keer. Een reactie in de community verschijnt pas via een omweg. Een pushmelding na het publiceren van een activiteit kan tot een dag op zich laten wachten (bekend punt A3).

Wat al goed werkt: doorklikken binnen het portaal via het menu is snel (gemeten 40 tot 115 ms), omdat Next.js de pagina's vooraf ophaalt. De hoeveelheid JavaScript is redelijk (ongeveer 250 tot 280 kB per pagina, gecomprimeerd), en de app-schil komt na het eerste bezoek uit de cache van de app op de telefoon.

Vrijwel alles is zonder extra kosten op te lossen. Er is geen bewijs dat Vercel Hobby of het Supabase-abonnement de snelheid beperkt. Wel ontbreken nog metingen van de server zelf (Vercel-logs, Speed Insights) en van de database (querystatistieken); zie J.

Belangrijke kanttekening bij de metingen: ze zijn gedaan vanaf een server in de Verenigde Staten. Voor een lid in Veendam komt daar per volledige paginalading naar schatting 0,1 tot 0,3 seconde netwerktijd bij, omdat zowel de Vercel-server als (vermoedelijk) de database in de VS staan.

## B. Architectuur

| Onderdeel | Hoe het nu werkt | Invloed op snelheid |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind. Pagina's zijn servercomponenten; interactieve delen (feed, filters, formulieren, kaart) zijn clientcomponenten. Leaflet-kaart wordt pas in de browser geladen (`dynamic(..., { ssr: false })`). | Goed opgezet. JavaScript ongeveer 250 tot 280 kB per pagina (gemeten, gecomprimeerd). |
| Rendering | Alles wordt per verzoek op de server gerenderd: de root-layout leest `headers()` voor de CSP-nonce, dus geen enkele pagina is statisch. Geen `revalidate` of `dynamic` per route. | Elke volledige lading kost een serverronde. Doorklikken via het menu is wel snel dankzij vooraf ophalen (prefetch). |
| Authenticatie | `src/proxy.ts` → `updateSession` roept bij elk verzoek `supabase.auth.getUser()` aan (`src/lib/supabase/middleware.ts:81`): een netwerkverzoek naar Supabase Auth. Ook voor prefetches en serveracties. Daarna `get_member_profile` (één keer per verzoek dankzij React `cache()`). | Vaste kosten van twee rondes vóór er iets van de pagina gebeurt. |
| Gemeenschappelijke layout | `src/app/(app)/layout.tsx` haalt bij elke pagina ongelezen meldingen, de eigen avatar, bedrijf en app-instellingen op (vier verzoeken tegelijk). | Een derde ronde vóór de pagina zelf. |
| Data | Supabase-client per verzoek, met RLS. Een gedeelde cache (`src/lib/cache/queryCache.ts`, `unstable_cache`) voor ledenlijst, bedrijvenlijst, documenten en nieuws (60 s), beheerlijsten (300 s) en statistieken (60 s). | Helpt; de fotolinks vallen er echter buiten. |
| Opslag | Foto's en bestanden in Supabase Storage. De server vraagt per bestand een tijdelijke link aan (`src/lib/supabase/storage.ts`, `getSignedStorageUrls`), één verzoek per foto, onthouden per serverinstantie (30 min). De browser laadt de foto daarna rechtstreeks uit Storage. | Veel losse verzoeken en volle bestandsgroottes. |
| Achtergrondwerk | `after()` voor push na acties; vijf dagelijkse Vercel-crons (Hobby: maximaal één keer per dag). Realtime voor meldingen (elke pagina) en community. | Meldingen kunnen een dag op zich laten wachten. |
| Hosting | Vercel Hobby, functies in regio `iad1` (Washington). Afgeleid uit de `x-vercel-id`-header. Supabase-project `qqgolkxwreqprmwjgaab`: de reactietijd vanaf de VS is gelijk aan die van AWS us-east-1 en niet aan die van eu-central-1, dus de database staat vermoedelijk ook in de VS. | Server en database zitten dicht bij elkaar (goed), maar ver van de leden: elke volledige lading en elke foto gaat de oceaan over. |

*Figuur: verzoekstroom van één volledige paginalading (in het online rapport als tekening).* Browser → Vercel-server (iad1): 1. inlogcontrole (getUser, Supabase Auth) → 2. profiel ophalen → 3. menubalk (4 verzoeken tegelijk) → 4. paginagegevens → 5. fotolinks, 1 per foto (Supabase Storage) → HTML terug naar de browser. Daarna laadt de browser de foto's op volle grootte rechtstreeks uit Storage (0,4 tot 2,6 MB per pagina).

De vijf stappen gebeuren na elkaar, dus elke extra ronde telt op. Stap 5 groeit mee met het aantal foto's op de pagina.

## C. Prestatieanalyse per pagina

**Hoe gemeten.** Met een echte browser (Chromium via Playwright) op de live site, ingelogd met het testaccount, alleen lezen. Per pagina een eerste en een herhaald bezoek, op desktop (1440 px) en mobiel (390 px, 3× pixeldichtheid, CPU 4× vertraagd). Gemeten: tijd tot eerste byte (TTFB), eerste en grootste zichtbare inhoud (FCP, LCP), verschuivingen (CLS), aantal verzoeken, bytes per soort, en de afmetingen van getoonde afbeeldingen. Een aparte meting zonder cache en zonder service worker gaf de werkelijke JavaScript- en afbeeldingsgrootte.

Beperkingen: de meetserver staat in de VS, dicht bij Vercel, dus een lid in Nederland zit per lading ongeveer 0,1 tot 0,3 s hoger. De netwerkvertraging voor mobiel is niet goed toegepast (de TTFB-waarden op mobiel zijn even laag als op desktop), dus de mobiele cijfers gelden voor een snelle verbinding. INP (reactietijd op een tik) is niet gemeten; zie I.

*Figuur: tijd tot eerste byte (TTFB) per pagina, mediaan van 4 metingen en traagste meting (Playwright, 17-10-2026, vanaf een server in de VS).*

| Pagina | Mediaan (ms) | Traagste (ms) |
|---|---|---|
| Home | 635 | 749 |
| Agenda | 588 | 801 |
| Activiteit | 772 | 2874 |
| Community | 631 | 852 |
| Leden | 689 | 870 |
| Ledenprofiel | 558 | 2122 |
| Bedrijven | 756 | 991 |
| Bedrijfsprofiel | 655 | 833 |
| Documenten | 549 | 748 |
| Meldingen | 548 | 839 |
| Profiel | 529 | 771 |
| Instellingen | 698 | 884 |
| Privacy | 1065 | 1412 |
| Beheer | 719 | 1084 |
| Beheer → Leden | 931 | 1191 |
| Beheer → Agenda | 738 | 2282 |
| Statistieken | 556 | 849 |
| Instroom | 708 | 832 |

Privacy heeft geen eigen databaseverzoeken en is toch de traagste pagina (mediaan 1065 ms). Dat wijst erop dat een deel van de serverreactie niet door de pagina zelf komt, maar door vaste kosten (inlogcontrole, layout) en waarschijnlijk door een koude serverinstantie voor weinig bezochte pagina's. Of de uitschieters van 2,1 tot 2,9 s koude starts zijn, kan alleen worden bewezen met de Vercel-logs.

**Bevindingen per onderdeel**

| Onderdeel | Gemeten | Wat de code doet | Knelpunt |
| --- | --- | --- | --- |
| Inloggen | Loginpagina: 277 kB, waarvan 183 kB JavaScript. Van klik op Inloggen tot Home zichtbaar: 2,7 s (desktop en mobiel). | Server-action, sessie-cookie, redirect naar `/`, daarna een volledige Home-lading. | Twee volledige rondes achter elkaar. Acceptabel voor iets wat je zelden doet. |
| Home | TTFB mediaan 635 ms. Afbeeldingen 0,7 MB; een nieuwsfoto van 1300 px getoond op 96 px. LCP tot 4,8 s op mobiel bij een eerste bezoek. | Tweede golf haalt **alle** aanmeldingen ooit op, met volledige activiteitrijen, om er 3 te tonen (`src/app/(app)/page.tsx:64-68`). | Grote foto's; onnodig brede query (klein nu, groeit mee). |
| Agenda | TTFB 588 ms. Afbeeldingen **1,9 MB** (foto's van 1920 px getoond op 112 tot 366 px). | Alle activiteiten met `select('*')`, plus de hele `activity_registrations`-tabel om in JavaScript te tellen (`agenda/page.tsx:29-33`). Fotolinks voor alle activiteiten, ook voorbije. | Grote foto's. De telling wordt stil afgekapt zodra er meer dan 1000 aanmeldingen zijn (Supabase-standaardlimiet). |
| Activiteit openen | TTFB 772 ms, uitschieter 2874 ms. Openen als paneel vanuit de agenda: 1,8 s (desktop) tot 5,0 s (mobiel, 1,2 MB aan foto's). | Zes rondes na elkaar, waaronder `await logEvent("activity_viewed")` vóór het renderen (`src/components/agenda/ActivityDetailContent.tsx:43`). | Statistiekregel blokkeert de pagina; grote foto's. |
| Aanmelden | Niet gemeten (zou productiegegevens wijzigen). | Server-action met twee keer `revalidatePath`; de hele route inclusief layout wordt opnieuw opgebouwd en schrijft opnieuw een `activity_viewed`. | Naar schatting 8 tot 9 rondes wachttijd na een klik (uit de code). |
| Community | TTFB 631 ms. Afbeeldingen **2,6 MB** zonder cache. | 5 berichten per keer, elk met alle reacties en likes (`src/lib/feed/queries.ts`). Realtime-kanaal zonder filter: bij elk nieuw bericht of elke reactie haalt **elke open tab** dat bericht opnieuw op via een server-action. | Grote foto's; een eigen reactie verschijnt pas na een omweg via realtime. |
| Leden | TTFB 689 ms. 0,4 MB aan foto's. Zoeken: direct in de browser, geen netwerk. | Lijst uit de gedeelde cache, maar daarna ruim 110 losse fotolink-verzoeken buiten de cache. | Fotolinks per stuk; profielfoto's op volle grootte. |
| Ledenprofiel | TTFB 558 ms, uitschieter 2122 ms. | Profiel-RPC, daarna een tweede golf, daarna het bedrijfslogo apart; titelquery dubbel (in `generateMetadata` en in de pagina). | Rondes die tegelijk kunnen. |
| Bedrijven | TTFB 756 ms. HTML **300 kB**, 1400 elementen, 14 tot 67 logo's direct uit Storage. | Alle \~114 bedrijven plus alle bedrijfskoppelingen met namen (alleen voor zoeken) gaan mee in de pagina. Kaart wordt pas in de browser geladen. | Zware pagina-inhoud; fotolinks per stuk. |
| Bedrijfsprofiel | TTFB 655 ms; 0,2 MB logo/foto's. | Bedrijf, dan leden en verzoeken, dan fotolinks: vijf rondes. | Rondes die tegelijk kunnen. |
| Documenten | TTFB 549 ms. | Alle documenten uit de cache, maar voor **elk** document wordt vooraf een downloadlink aangevraagd. | Klein nu; groeit lineair. |
| Meldingen, Profiel, Instellingen | TTFB 529 tot 698 ms. | Begrensd (50 meldingen). Instellingen haalt profielkolommen opnieuw op. Markeren als gelezen ververst de hele route (`revalidatePath`). | Klein. |
| Globaal zoeken | 2,2 s (desktop) tot 3,1 s (mobiel) tot alles geladen is. HTML 322 kB. | Vijf zoekopdrachten zonder limiet, twee met `select('*')`, plus weer de hele aanmeldingentabel. | Geen limiet; groeit mee. |
| Beheer-dashboard | TTFB 719 ms; ongeveer 17 Supabase-verzoeken per lading. | 13 verzoeken tegelijk plus een tellingsverzoek per komende activiteit. | Redelijk; kleine N+1. |
| Beheer → Leden | TTFB 931 ms (hoogste mediaan na Privacy). | Ledenlijst uit de gedeelde cache (300 s), plus fotolinks voor alle leden. | Fotolinks per stuk. |
| Beheer → Agenda | TTFB 738 ms, uitschieter 2282 ms. | Drie golven na elkaar: activiteiten, dan audit-log, dan aanmeldingen. De laatste twee kunnen tegelijk. | Onnodige wachtronde. |
| Statistieken | TTFB 556 ms (cache 60 s). | Hele tabellen (`events`, `notifications`, `feed_likes`, `feed_comments`, `profiles`) worden naar de server gehaald en in JavaScript geteld (`src/lib/statistics/queries.ts`). | Nu snel door de cache; wordt fout (afgekapt op 1000 rijen) en trager naarmate tabellen groeien. |
| Instroom | TTFB 708 ms. | Alleen het actieve tabblad laadt. Uitnodigingen: alle \~134 met `select('*')` (inclusief tokenkolom) naar de browser. | Lange lijst zonder paginering (zie de UX-audit). |
| Menu-navigatie | 40 tot 115 ms, geen netwerkverzoek nodig. | Next.js haalt de menu-pagina's vooraf op. | Goed. |

Geen enkele pagina had zichtbare verschuivingen van betekenis (CLS 0 tot 0,12). De rekentijd in de browser was verwaarloosbaar (geen lange taken gemeten).

## D. Database en backend

Grondslag: alle 83 migraties doorgelopen en vergeleken met de queries in `src/`. Er was geen toegang tot de database zelf, dus geen querystatistieken of `EXPLAIN`. Met ongeveer 113 leden, 114 bedrijven en enkele honderden berichten en meldingen past alles in het geheugen van de database. **De database is nu niet de bottleneck.** Het gaat vooral om het aantal rondes vanaf de server, en om queries die meegroeien met de tijd.

**Wat aandacht verdient**

| # | Bevinding | Bewijs en locatie | Gevolg nu / later |
| --- | --- | --- | --- |
| D1 | Elk verzoek doet eerst `auth.getUser()` bij Supabase Auth, ook link-prefetches en server-actions. | `src/lib/supabase/middleware.ts:81`; matcher in `src/proxy.ts`. | Nu: een vaste ronde per verzoek, en ongeveer 10 extra Auth-verzoeken per lading door de prefetch van menulinks. |
| D2 | Zes rondes na elkaar bij een activiteit, inclusief een geblokkeerde statistiekregel. | `ActivityDetailContent.tsx:43` (`await logEvent`); de detailpagina's van leden en bedrijven starten hun id-queries pas na de hoofdquery. | Nu merkbaar: 100 tot 300 ms extra per opening. |
| D3 | Fotolinks worden per bestand aangevraagd (`createSignedUrl`), niet in één keer (`createSignedUrls`). Ze worden alleen onthouden in het geheugen van één serverinstantie. | `src/lib/supabase/storage.ts:31-51,99-111`. | Ruim 110 verzoeken op Leden en op Bedrijven bij een koude instantie. Een andere instantie maakt een andere link, dus de browser downloadt dezelfde foto opnieuw. |
| D4 | Tellen in JavaScript door hele tabellen op te halen. | Agenda: alle aanmeldingen (`agenda/page.tsx:31`); Zoeken: idem; Statistieken: hele tabellen (`statistics/queries.ts`); Home: alle eigen aanmeldingen met volledige activiteit (`page.tsx:64-68`). | Nu klein. Fout zodra een tabel boven de 1000 rijen komt (Supabase-standaardlimiet): tellingen worden dan stil afgekapt. Meldingen groeien met ongeveer 113 rijen per bericht aan alle leden. |
| D5 | N+1: één telling per activiteit. | Website-embed `src/app/embed/agenda/page.tsx:120-130` (`get_activity_interest_count` per activiteit, op een openbare pagina); `beheer/page.tsx:162-166`. | Nu klein; de embed wordt wel door bezoekers van vocveendam.nl geladen. |
| D6 | De verzendrij voor push loopt vol. Meldingen voor leden zonder pushabonnement worden nooit als “verwerkt” gemarkeerd, en er is geen index op de openstaande rijen. | `get_pending_push_notifications` (migratie 0079:22); na een actie worden maar 10 of 50 pushes verstuurd (`agenda/actions.ts`, `(app)/actions.ts:181`), de rest wacht op de dagelijkse cron (ook maximaal 50). | Nu: bij een nieuwe activiteit (ongeveer 112 meldingen) komt het grootste deel pas de volgende dag. Dit is waarschijnlijk de belangrijkste oorzaak van “meldingen zijn traag”. |
| D7 | Geen enkele van de 149 RLS-policies zet `auth.uid()` of de hulpfuncties (`is_active_member()`, `is_board()`) tussen `(select …)`. Daardoor draaien ze per rij in plaats van één keer per query. | Hulpfuncties in 0001:88-131 (correct STABLE en SECURITY DEFINER); policies op feed, bedrijven, leden, documenten, storage. Zwaarst: de feedquery, waarin elke ingebedde reactie en like de controle herhaalt. | Nu een paar milliseconden. Dit is de bovenste waarschuwing van de Supabase Performance Advisor. De aanpassing is mechanisch maar raakt de beveiliging, dus voorzichtig en getest uitvoeren. |
| D8 | Een melding aan alle leden wordt binnen het verzoek van de gebruiker aangemaakt (ongeveer 113 rijen per keer), en meldingen staan in realtime. | Triggers `notify_new_member` (0019), `notify_activity_published` (0040), nieuwsbrief (0070). | Nu tientallen milliseconden. Realtime controleert elke rij tegen elke open verbinding. |
| D9 | Elke open tab doet elke 2 minuten een “ik ben online”-update op `profiles`, met twee triggers. | `(app)/actions.ts:357`; triggers in 0001:75,151. | Licht, maar wel een server-action plus inlogcontrole per tab elke 2 minuten. |
| D10 | Statistieken en Verzendlog laten voor bestuursleden alleen hun **eigen** meldingen zien: er is geen leesrecht voor het bestuur op `notifications`. | Alleen `notifications_self_select` (0001:625); `beheer/notificaties/page.tsx:28-34` gebruikt de gewone client. | Geen snelheidsprobleem, wel een fout in de cijfers. |

**Indexen.** De belangrijke zijn aanwezig: ongelezen meldingen (de bel op elke pagina), meldingen per lid, de feed op datum, reacties per bericht, aanmeldingen per activiteit en per lid, trigramindexen voor zoeken. Wat ontbreekt is nu onschadelijk: een gedeeltelijke index op openstaande push- en mailmeldingen (hoort bij D6), en indexen op een aantal vreemde sleutels naar `profiles` (alleen relevant bij hard verwijderen, en profielen worden geanonimiseerd). Er zijn acht dubbele of overbodige indexen (bijvoorbeeld `invitations_token_idx` naast de unieke sleutel op token). Die kosten alleen schrijftijd, en die is verwaarloosbaar.

**Realtime.** Zes tabellen staan in de realtime-publicatie, maar de app luistert er maar naar drie (`feed_posts`, `feed_comments`, `notifications`). `feed_likes`, `feed_attachments` en `feed_comment_likes` worden gepubliceerd zonder dat iemand ze gebruikt.

**Cache en privacy.** De gedeelde cache bevat bij `beheer-leden-page-data` de volledige ledengegevens, inclusief e-mail en telefoon. Dat is veilig zolang elke lezer van die sleutel achter `requireBoard` zit, en dat is nu zo. Bij elke nieuwe plek die deze sleutel gebruikt, moet dat opnieuw worden gecontroleerd. Daarnaast doet `invalidateQuery("statistieken-activiteiten")` in `agenda/actions.ts` niets: de echte sleutels heten `statistieken-activiteiten-${period}` (`statistics/queries.ts:316`), dus de statistieken lopen tot 60 seconden achter.

**Bijvangst, buiten snelheid.** Nieuwe leden worden sinds migratie 0063 bij activeren direct aan een bestaand bedrijf gekoppeld, zonder het goedkeuringsverzoek uit 0013. Dat is bewust: het bestuur legt de bedrijfskoppeling vooraf vast. Hier is dus niets te doen.

## E. Frontend

De browser doet weinig rekenwerk: tijdens de metingen waren er geen lange taken, ook niet met 4× vertraagde CPU. Het werk in de browser zit vooral in **downloaden**, niet in rekenen.

| # | Bevinding | Bewijs | Gevolg |
| --- | --- | --- | --- |
| E1 | **Afbeeldingen op volle grootte.** De Next.js-optimalisatie staat uit als noodmaatregel (`next.config.ts`: `images.unoptimized: true`, met de TODO “root cause vinden en optimalisatie terugzetten”). Uploads worden alleen in de browser verkleind tot maximaal 1920 px (`src/lib/image/compress.ts:8`), PNG blijft PNG, en er komt geen kleine versie bij. | Gemeten: logo's en foto's van 1200 tot 2363 px, getoond op 32 tot 112 px (bijvoorbeeld 2363 → 40 px, 1920 → 112 px). Een foto van 609 kB voor een kaartje. Zonder cache: Agenda 1,9 MB, Community 2,6 MB, Home 0,7 MB aan afbeeldingen. | Grootste merkbare vertraging op mobiel, en een grote kostenpost in mobiele data. Op een 4G-verbinding met 1,6 Mbit/s duurt 2,6 MB al ruim 13 seconden. |
| E2 | Fotolinks wisselen per serverinstantie en elke 30 minuten. | `storage.ts`: cache per proces. | De browser herkent dezelfde foto niet als dezelfde en downloadt hem opnieuw. Zichtbaar in de metingen: bij een herhaald bezoek aan Home werd 710 kB aan foto's opnieuw geladen. |
| E3 | Bedrijven en Zoeken sturen veel data mee in de pagina. | HTML 300 kB (Bedrijven) en 322 kB (Zoeken); 1400 elementen. Alle bedrijfskoppelingen met namen gaan mee, alleen voor de zoekfunctie. | Langer downloaden en verwerken op een telefoon. |
| E4 | Drie server-actions bij elke volledige lading: de online-hartslag (bij openen, elke 2 minuten en bij terugkeer naar het tabblad) en twee realtime-tokenverzoeken (AppShell en Community). | `src/components/layout/OnlineHeartbeat.tsx:12-18`; `getRealtimeAuthTokenAction`. | Next.js voert server-actions na elkaar uit. Een klik direct na het laden kan daardoor achter deze verzoeken in de rij staan. Vermoeden, nog te meten. |
| E5 | Na een eigen reactie of aanmelding wordt de pagina opnieuw van de server gehaald (`revalidatePath`, `router.refresh()`), ook waar de interface al optimistisch is bijgewerkt. | Meldingen markeren als gelezen, verwijderen, aanmelden, een reactie plaatsen. | Extra wachttijd en onnodige serverrondes. |
| E6 | Een nieuwe reactie verschijnt pas via realtime. Elke open tab haalt bij elk nieuw bericht of elke nieuwe reactie het hele bericht opnieuw op. | `createCommentAction` geeft de reactie niet terug; kanaal `feed-changes` zonder filter (`FeedList.tsx`). | Voelt traag voor wie reageert; extra werk voor iedereen die Community open heeft. |
| E7 | Lange lijsten zonder paginering: alle leden, alle bedrijven, alle activiteiten (ook voorbije), 134 uitnodigingen. | Uit de code en de metingen (Bedrijven 1400 elementen). | Nu werkbaar. Wordt merkbaar bij groei, vooral de agenda met het verleden erbij. |
| E8 | JavaScript. | 250 tot 280 kB per pagina gecomprimeerd (gemeten zonder cache); de loginpagina 183 kB. 135 clientcomponenten; Leaflet wordt correct pas op de kaartpagina's geladen. De service worker houdt de app-schil na het eerste bezoek lokaal. | Redelijk; geen prioriteit. |
| E9 | Laadstatussen. | Er is een `loading.tsx` voor de app; menu-klikken voelen direct door prefetch. Het activiteitenpaneel heeft geen tussenstatus terwijl het 1,8 tot 5 s laadt. | Gebruiker ziet bij een activiteit even niets gebeuren. |
| E10 | Verschuivingen tijdens het laden. | CLS 0 tot 0,12 (alleen het activiteitenpaneel kwam op 0,116). | Goed. |

Conclusie voor de frontend: de app-code zelf is niet zwaar. Eerst de afbeeldingen aanpakken (E1, E2). Daarna de onnodige verversingen na acties (E5, E6), want die bepalen hoe snel klikken voelt.

## F. Infrastructuur

**Regio's.** De Vercel-functies draaien in `iad1` (Washington); dat blijkt uit de `x-vercel-id`-header van elk antwoord. Het Supabase-project reageert vanaf de VS even snel als AWS us-east-1 (161 ms tegenover 184 ms, via dezelfde verbinding) en veel sneller dan eu-central-1 (547 ms). De database staat dus vermoedelijk ook in de VS. Controleren kan in Supabase → Project Settings → General → Region.

- **Gevolg:** server en database zitten dicht bij elkaar. Dat is goed, want de vier tot zes rondes per pagina blijven daardoor kort. De leden zitten wel ver weg: elke volledige lading en elke foto uit Storage gaat de Atlantische Oceaan over, naar schatting 0,1 tot 0,3 s extra per lading.
- **Wat je niet moet doen:** alleen de Vercel-regio naar Frankfurt (`fra1`) zetten. Dan wordt elke databaseronde trans-Atlantisch, en dat is met vier tot zes rondes na elkaar trager dan nu.
- **Wat ooit kan:** beide naar Europa verhuizen. Voor Supabase betekent dat een nieuw project en het overzetten van database, accounts en bestanden. Dat is groot en riskant voor relatief weinig winst; pas overwegen als de andere verbeteringen gedaan zijn en metingen vanuit Nederland dat rechtvaardigen.

**Koude starts.** Niet bewezen, wel aannemelijk. Er is weinig verkeer (113 leden), en Privacy, een pagina zonder eigen databasewerk, is gemiddeld het traagst. De uitschieters van 2,1 tot 2,9 s kwamen telkens bij een andere pagina voor. Bewijzen kan alleen met de functieduur en de “cold start”-markering in Vercel Observability. Die waren in deze sessie niet toegankelijk: de Vercel-koppeling heeft geen rechten op het account robbertmeinders.

**Caching.** Wat er is, werkt goed:

- De gedeelde Next.js-cache (`unstable_cache`) houdt lijsten 60 tot 300 seconden vast en wordt bij wijzigingen direct geleegd (`updateTag`).
- De service worker houdt de app-schil op de telefoon.
- Statische bestanden krijgen `immutable` cacheheaders.
- Voor de website-embed is al een stabiele, lang te cachen logo-URL gemaakt (`publicLogoUrl` → `/api/embed/logo/...`).

Wat ontbreekt, is precies dat laatste voor het portaal zelf. Daar krijgen logo's en foto's steeds een nieuwe link, zodat noch de browser noch een CDN ze kan hergebruiken. HTML-pagina's horen niet gedeeld gecachet te worden: ze bevatten persoonlijke gegevens, en de huidige `private, no-store`-headers zijn juist.

**Abonnementen.**

- **Vercel Hobby:** de enige limiet die nu aantoonbaar speelt, is dat crons maar één keer per dag mogen. Dat raakt de pushmeldingen. Het is op te lossen zonder abonnement, door na een actie alle meldingen direct te versturen (via `after()`, in delen) in plaats van maximaal 10 of 50.
- **Afbeeldingsoptimalisatie van Vercel:** Hobby heeft daar een maandelijks tegoed. Met een paar honderd unieke afbeeldingen is dat vermoedelijk ruim voldoende, maar het verbruik staat in Vercel → Usage en is nog niet ingezien.
- **Functieduur, geheugen, aantal verzoeken:** geen aanwijzingen dat die knellen.
- **Supabase:** welk abonnement het is, is niet bekend. Er zijn geen aanwijzingen dat de database traag is: tabellen zijn klein en de relevante indexen bestaan. De beeldtransformatie van Supabase Storage zit alleen in het betaalde abonnement, en is ook niet nodig als foto's bij het uploaden worden verkleind.

**Conclusie infrastructuur:** er is geen bewijs dat een duurder abonnement sneller wordt. De winst zit in minder rondes, kleinere afbeeldingen en stabiele fotolinks.

## G. Geprioriteerde verbeterlijst

QW = quick win (klein, weinig risico, merkbaar).

| # | Prioriteit | Probleem | Verwacht effect | Inspanning | Risico |
| --- | --- | --- | --- | --- | --- |
| 1 | Hoog | Afbeeldingen op volle grootte (E1) | 70 tot 90% minder bytes per pagina; Agenda en Community van ongeveer 2 MB naar enkele honderden kB. Grootste winst op mobiel. | Middel | Laag tot middel |
| 2 | Hoog · QW | Fotolinks per stuk en steeds nieuw (D3, E2) | Ruim 100 serververzoeken minder op Leden en Bedrijven; de browser hergebruikt foto's. | Klein tot middel | Laag tot middel |
| 3 | Hoog · QW | Statistiekregel blokkeert het openen van een activiteit (D2) | 100 tot 300 ms sneller per activiteit; ook bij aanmelden. | Klein | Laag |
| 4 | Hoog | Pushmeldingen tot een dag vertraagd (D6) | Meldingen binnen minuten in plaats van de volgende ochtend. | Middel | Middel |
| 5 | Middel · QW | Rondes na elkaar die tegelijk kunnen (D2; detailpagina's, Beheer → Agenda, Home) | 50 tot 200 ms per pagina. | Klein | Laag |
| 6 | Middel | Onnodig verversen na acties; een reactie verschijnt pas via realtime (E5, E6) | Aanmelden, reageren en meldingen markeren voelen direct. | Middel | Laag tot middel |
| 7 | Middel | Bedrijven en Zoeken sturen te veel data mee (E3) | HTML van ongeveer 300 kB naar een fractie; sneller op telefoons. | Klein tot middel | Laag |
| 8 | Middel | Queries zonder grens en tellen in JavaScript (D4) | Nu weinig snelheidswinst; voorkomt vertraging bij groei en foute cijfers boven 1000 rijen. | Middel | Laag tot middel |
| 9 | Middel | Inlogcontrole bij elk verzoek, ook prefetch (D1) | Een ronde minder per verzoek; minder belasting van Auth. Effect eerst meten. | Klein tot middel | Middel tot hoog (beveiliging) |
| 10 | Laag · QW | Website-embed: telling per activiteit (D5) | Snellere agenda op vocveendam.nl. | Klein | Laag |
| 11 | Laag · QW | Verkeerde cache-sleutel voor statistieken | Statistieken direct actueel na wijziging. | Klein | Laag |
| 12 | Laag | Hartslag elke 2 minuten en twee tokenverzoeken per lading (E4, D9) | Minder server-actions die een klik kunnen ophouden. | Klein | Laag |
| 13 | Laag | RLS-hulpfuncties per rij (D7) | Een paar milliseconden nu; meer bij groei van de feed. | Middel | Middel (beveiliging) |
| 14 | Laag | Realtime: ongebruikte tabellen in de publicatie, feedkanaal zonder filter (E6) | Minder werk voor database en open tabs. | Klein | Laag |
| — | Niet nu | Server en database naar Europa verhuizen | 0,1 tot 0,3 s per volledige lading voor leden in Nederland. | Groot | Hoog |

**Details per bevinding**

| # | Bewijs | Locatie | Oplossing | Vertrouwen |
| --- | --- | --- | --- | --- |
| 1 | Gemeten: 2363 → 40 px, 1920 → 112 px; Agenda 1,9 MB, Community 2,6 MB. | `next.config.ts` (`images.unoptimized: true`); `src/lib/image/compress.ts`; avatars en logo's in ledenlijst, bedrijvengids, agenda en feed. | Bij het uploaden ook een kleine versie opslaan (bijvoorbeeld 160 px voor profielfoto en logo, 800 px voor activiteit- en feedfoto's). Bestaande afbeeldingen eenmalig omzetten. Lijsten tonen de kleine versie, detail de grote. Daarnaast de oorzaak van de kapotte optimizer-uitvoer zoeken; dan kan `unoptimized` weer uit. | Gemeten |
| 2 | Gemeten: 710 kB opnieuw geladen bij herhaald bezoek; ruim 110 tekenverzoeken in de code. | `src/lib/supabase/storage.ts` (`getSignedStorageUrls`, cache per proces). | Per bucket één `createSignedUrls`-verzoek. Logo's van openbare bedrijven via de bestaande stabiele route `/api/embed/logo/...` (zoals op de website). Profielfoto's: links met een vaste geldigheid die gedeeld worden onthouden, zodat de URL gelijk blijft. Rechten blijven ongewijzigd. | Sterk onderbouwd |
| 3 | `await logEvent("activity_viewed")` vóór het renderen. | `src/components/agenda/ActivityDetailContent.tsx:43`; e-mails in een lus bij afgelasten (`agenda/actions.ts`). | In `after()` zetten, zodat het na het antwoord gebeurt. | Sterk onderbouwd |
| 4 | 10 of 50 pushes per actie, de rest wacht op de dagelijkse cron; rijen zonder pushabonnement blijven openstaan. | Migratie 0079:22; `agenda/actions.ts`; `(app)/actions.ts:181`; `vercel.json`. | Na publiceren alle meldingen in delen versturen binnen `after()`. Niet-verstuurbare rijen markeren. Gedeeltelijke index op openstaande rijen. Eerst op de testomgeving, want dit raakt echte leden. | Sterk onderbouwd |
| 5 | Code: id-queries starten pas na de hoofdquery; `generateMetadata` haalt de rij dubbel op. | `leden/[id]`, `bedrijven/[id]`, `beheer/agenda`, `src/app/(app)/page.tsx`. | Onafhankelijke queries in één `Promise.all`; titelquery met `cache()` delen. | Sterk onderbouwd |
| 6 | Code: dubbele `revalidatePath` bij aanmelden; `router.refresh()` na verwijderen; `createCommentAction` geeft niets terug. | `agenda/actions.ts`, `notificaties`, `src/lib/feed`, `FeedList.tsx`. | Alleen verversen wat verandert; de nieuwe reactie meteen teruggeven en tonen. | Sterk onderbouwd |
| 7 | Gemeten: HTML 300 kB en 322 kB, 1400 elementen. | `bedrijven/page.tsx`, `zoeken/page.tsx`. | Alleen de velden meesturen die de lijst toont; zoeken op naam van leden via de server of een kleinere index. | Gemeten |
| 8 | Code: hele `activity_registrations`-tabel op Agenda en Zoeken; hele tabellen in Statistieken; alle eigen aanmeldingen op Home. | `agenda/page.tsx:29-33`, `statistics/queries.ts`, `page.tsx:64-68`, `zoeken`. | Tellingen in de database (een RPC of view met `count`), alleen komende activiteiten standaard, limieten op zoeken. | Sterk onderbouwd (groei) |
| 9 | Code: `getUser()` bij elk verzoek in de proxy. | `src/lib/supabase/middleware.ts:81`, `src/proxy.ts`. | Eerst meten hoeveel tijd het kost. Dan eventueel `getClaims()` (lokale controle met asymmetrische sleutels) of prefetch-verzoeken anders behandelen. Alleen met een grondige beveiligingstest. | Te onderzoeken |
| 10 | Code: één RPC per activiteit. | `src/app/embed/agenda/page.tsx:120-130`; `beheer/page.tsx:162-166`. | Eén RPC die alle tellingen in één keer teruggeeft. | Sterk onderbouwd |
| 11 | Code: sleutel zonder periode. | `agenda/actions.ts` (5×) tegenover `statistics/queries.ts:316`. | Alle periodesleutels legen. | Bewezen (code) |
| 12 | Code: interval van 2 minuten, plus bij focus; twee tokenverzoeken. | `OnlineHeartbeat.tsx`, `AppShell`, `FeedList`. | Hartslag minder vaak en niet direct bij openen; één gedeeld realtime-token. | Vermoeden |
| 13 | Schema: geen `(select …)` in 149 policies. | Migraties; Supabase Performance Advisor. | Policies stapsgewijs omschrijven, met `EXPLAIN` vóór en na, en rechten-tests per rol. | Te onderzoeken |
| 14 | Schema en code: zes tabellen gepubliceerd, drie gebruikt. | Migraties 0005, 0011, 0027; `FeedList.tsx`. | Ongebruikte tabellen uit de publicatie; feedupdates bundelen. | Sterk onderbouwd |

Niet voor snelheid, wel gevonden: bestuursleden zien in Statistieken en Verzendlog alleen hun eigen meldingen (D10).

## H. Implementatievoorstel

Elke fase apart opleveren en meten (zie I) vóór de volgende begint. Elke wijziging op de vaste branch, met `npx tsc --noEmit && npm run lint && npm run build`, en pas na akkoord per wijziging.

**Fase 0 — Eerst meten (geen code)**

- Vercel-toegang herstellen. Daarna Speed Insights en Observability uitlezen: functieduur per route, koude starts, echte LCP en INP van leden.
- In Supabase de Performance Advisor en Query Performance uitlezen, en de regio bevestigen.
- Nulmeting vastleggen met het meetscript uit deze audit, liefst vanaf een verbinding in Nederland.

**Fase 1 — Kleine optimalisaties met weinig risico (1 tot 2 dagdelen)**

- \#3 `logEvent` en de e-maillus bij afgelasten naar `after()`.
- \#5 Onafhankelijke queries tegelijk uitvoeren (detailpagina's, Beheer → Agenda, Home); titelquery delen met `cache()`.
- \#2 Fotolinks per bucket in één verzoek; logo's van openbare bedrijven via de bestaande stabiele logo-route.
- \#10 De telling in de website-embed en het beheerdashboard in één RPC.
- \#11 De cache-sleutel voor statistieken.

**Fase 2 — Afbeeldingen (2 tot 4 dagdelen)**

- \#1 Kleine versie bij upload (profielfoto, logo, activiteit, feed); lijsten gebruiken de kleine versie.
- Eenmalig script om bestaande afbeeldingen te verkleinen. Eerst op een kopie testen; originelen bewaren.
- Parallel de oorzaak van de kapotte optimizer-uitvoer onderzoeken. Is die gevonden, dan kan de Next.js-optimalisatie terug als tweede verdedigingslinie.

**Fase 3 — Queries en data-ophaalgedrag (2 tot 4 dagdelen)**

- \#8 Tellingen in de database in plaats van in JavaScript (Agenda, Zoeken, Statistieken); de agenda toont standaard alleen komende activiteiten, met “oudere tonen”.
- \#7 Bedrijven en Zoeken: alleen benodigde velden meesturen.
- \#4 Push direct en volledig versturen na publiceren, niet-verstuurbare rijen markeren, gedeeltelijke index. Eerst testen met een testgroep.
- \#14 Ongebruikte tabellen uit de realtime-publicatie.

**Fase 4 — Rendering en interactie (2 tot 3 dagdelen)**

- \#6 Minder verversen na acties; nieuwe reactie direct tonen; laadstatus in het activiteitenpaneel.
- \#12 Hartslag en realtime-token samenvoegen of minder vaak.
- \#9 en #13 (inlogcontrole en RLS) alleen als de metingen uit fase 0 laten zien dat ze tijd kosten, en dan met aparte beveiligingstests per rol.

**Fase 5 — Infrastructuur, alleen bij bewijs**

- Geen abonnementswijziging nodig op basis van wat nu bekend is.
- Verhuizing naar Europa pas overwegen als, na fase 1 tot 4, metingen vanuit Nederland laten zien dat de afstand de grootste resterende vertraging is.

## I. Vervolgmetingen

**Vergelijkbaar meten.** Hetzelfde meetscript als in deze audit opnieuw draaien, met dezelfde pagina's, apparaten en volgorde (eerste en herhaald bezoek), vóór en na elke fase. Het script staat nu in de werkmap van deze sessie; met akkoord zet ik het in de repository (`docs/` of `scripts/`), zodat het herhaalbaar is. Liefst ook één keer meten vanaf een verbinding in Nederland, of met de Chrome DevTools-netwerkstand “Fast 4G”.

**Doelen per fase**

| Meting | Nu (deze audit) | Doel na fase 1 tot 3 |
| --- | --- | --- |
| Afbeeldingen per pagina zonder cache (Agenda, Community) | 1,9 MB en 2,6 MB | Onder 400 kB |
| Afbeeldingen opnieuw geladen bij herhaald bezoek (Home) | 710 kB | Bijna 0 |
| Fotolink-verzoeken op Leden en Bedrijven | Ruim 110 per pagina | 1 of 2 per pagina |
| TTFB mediaan, alle pagina's | 530 tot 1065 ms | Onder 500 ms; Activiteit onder 600 ms |
| Uitschieters TTFB | Tot 2,9 s | Verklaard (koude start of query) en waar mogelijk weg |
| Activiteit openen als paneel, mobiel | 5,0 s | Onder 1,5 s |
| HTML Bedrijven | 300 kB | Onder 80 kB |
| Push na publiceren van een activiteit | Deels pas de volgende ochtend | Iedereen binnen 5 minuten |

**Echte gebruikers.** Vercel Speed Insights is al in de app ingebouwd (`@vercel/speed-insights`). Daar staan LCP, INP en CLS van echte leden per pagina, op hun eigen telefoons. Dat is het beste bewijs. Vergelijk het 75e percentiel van de week vóór en na elke fase. Streefwaarden van Google: LCP onder 2,5 s, INP onder 200 ms, CLS onder 0,1.

**Server en database.**

- Vercel Observability: functieduur per route (p50 en p95) en het aandeel koude starts, vóór en na.
- Supabase Query Performance (`pg_stat_statements`): totale tijd en aantal aanroepen van de top 20 queries; het aantal Storage-tekenverzoeken per dag.
- Na fase 3: in Supabase controleren dat er geen openstaande push-meldingen ouder dan een uur zijn.

**Controle dat niets stukgaat.** Na elke fase met drie accounts (lid, bestuurslid, beheerder) de hoofdroutes doorlopen. Controleren dat afbeeldingen, rechten (geen andermans gegevens zichtbaar), aanmelden, reageren en meldingen hetzelfde werken als ervoor.

## J. Conclusie

**Wat zijn de drie belangrijkste verbeterkansen?**

1. **Afbeeldingen verkleinen** (#1). Dit is gemeten de grootste vertraging op mobiel: 75 tot 90 procent van alle bytes per pagina zijn te grote foto's.
2. **Minder wachtrondes per pagina en per actie** (#2, #3, #5, #6): fotolinks in één keer, statistiekregel na het antwoord, onafhankelijke queries tegelijk, niet onnodig verversen.
3. **Pushmeldingen direct versturen** (#4). Dit is geen paginasnelheid, maar wel wat leden het meest als “traag” zullen ervaren.

**Wat kunnen we waarschijnlijk zonder extra abonnementskosten verbeteren?** Alles in de lijst. Geen enkele verbetering vraagt een duurder Vercel- of Supabase-abonnement of een nieuwe dienst.

**Is er bewijs dat het huidige Vercel- of Supabase-abonnement de snelheid beperkt?** Nee.

- De enige Hobby-limiet die speelt, is één cron per dag, en die is te omzeilen door meldingen direct na de actie te versturen.
- De database is klein, en de relevante indexen bestaan.
- Kanttekening: de serverkant zelf (functieduur, koude starts) kon niet worden ingezien. Tot die gegevens er zijn, is “geen bewijs” niet hetzelfde als “bewezen niet”.

**Welke metingen ontbreken nog?**

- Vercel Observability: functieduur per route en koude starts. Dit zou de uitschieters van 2,1 tot 2,9 s verklaren.
- Vercel Speed Insights: LCP, INP en CLS van echte leden.
- Supabase: querystatistieken (`pg_stat_statements`), de Performance Advisor, de bevestigde regio en het abonnement.
- Metingen vanuit Nederland, en met een echt vertraagde mobiele verbinding.
- INP: hoe snel de app reageert op een tik.
- De tijd van acties die gegevens wijzigen (aanmelden, reageren, opslaan). Die zijn bewust niet uitgevoerd op productie; meten kan op een testomgeving of met een testactiviteit.

**Wat zou ik als eerste aanpakken, en waarom?** Fase 1 (#3, #5, #2), in een of twee dagdelen. Het zijn kleine, goed afgebakende wijzigingen met weinig risico, die direct merkbaar zijn bij het openen van activiteiten, leden en bedrijven. Ze raken geen rechten of gegevens. Direct daarna de afbeeldingen (#1), omdat daar de grootste winst zit; dat vraagt iets meer zorg, door het omzetten van bestaande bestanden en de onopgeloste optimizer-storing. Daarvoor eerst de Vercel-toegang herstellen, zodat de nulmeting ook de serverkant omvat.

In deze audit is niets gewijzigd: geen code, database, configuratie of productiegegevens. Ik wacht op akkoord voordat er iets wordt doorgevoerd.
