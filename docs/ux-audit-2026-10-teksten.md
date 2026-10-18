# Tekstaudit VOC-ledenportaal (UI-teksten)

Branch: `claude/voc-ledenportaal-pwa-i3ku74`. Alleen gelezen, niets gewijzigd. Paden zijn relatief aan `/home/user/VOC/`.
Toetsvraag per tekst: *helpt dit de gebruiker iets te begrijpen of te beslissen?*

Legenda Advies: **schrappen** · **inkorten** · **vervangen** · **behouden-want** (alleen genoemd bij privacy/veiligheid/onomkeerbaar).

---

## 1. Teksten per pagina/onderdeel

### 1.1 Home

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/page.tsx:97 | "Het laatste nieuws en de eerstvolgende activiteit van het ledenportaal, overzichtelijk bij elkaar." | schrappen | – (de secties eronder zeggen dit al) |
| src/app/(app)/page.tsx:137 | "Wachtlijst" (badge) | vervangen | "Op wachtlijst" (zelfde status heet elders "Op de wachtlijst") |
| src/app/(app)/page.tsx:185 | "Op de wachtlijst" / "Je bent aangemeld" | vervangen | Gelijk aan badge r.137: "Op wachtlijst" / "Aangemeld" |
| src/app/(app)/page.tsx:192 | "Er staat nog geen activiteit gepland." | inkorten | "Geen activiteiten gepland." (zelfde als agenda) |
| src/app/(app)/page.tsx:118 | linkLabel "Alle aanmeldingen" | behouden | – |
| src/components/home/ProfilePhotoPrompt.tsx:51 | aria-label "Wegklikken" | vervangen | "Sluiten" (overal elders "Sluiten") |
| src/components/home/NewsHeroCarousel.tsx:172 | aria-label "Ga naar nieuwsitem …" | vervangen | "Ga naar nieuwsbericht …" (elders "nieuwsbericht") |

### 1.2 Agenda (lijst, kaart, detail, formulier, goedkeuren/afgelasten)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/agenda/page.tsx:102 · src/components/agenda/NewActivityFlow.tsx:55 | "Agenda activiteit toevoegen" | vervangen | "Activiteit toevoegen" (ook spelfout: zou "agenda-activiteit" zijn) |
| src/app/(app)/agenda/page.tsx:138 | "Kom later terug voor nieuwe VOC-activiteiten." | schrappen | – (titel "Geen activiteiten gepland" volstaat) |
| src/app/(app)/agenda/page.tsx:19-20 | filters "Activiteiten" / "Externe activiteiten" | vervangen | "VOC-activiteiten" / "Externe activiteiten" ("Activiteiten" naast "Alles" is onduidelijk) |
| src/components/agenda/ActivityCard.tsx:78 | "· vol" | behouden | – |
| src/components/agenda/ActivityCard.tsx:71 · ActivityDetailContent.tsx:232 | "Op de wachtlijst" / "op wachtlijst" | vervangen | één vorm: "Op wachtlijst" |
| src/components/agenda/ActivityDetailContent.tsx:215 | "Toegevoegd door {naam}" | vervangen | "Ingediend door {naam}" (zelfde rol heet in beheer "Aangeleverd door") |
| src/components/agenda/ActivityDetailContent.tsx:243 | "Deze activiteit is afgelast. Aanmelden is niet meer mogelijk." | inkorten | "Deze activiteit is afgelast." |
| src/components/agenda/ActivityDetailContent.tsx:252 | "Aanmelden via externe website" (knop, 4 woorden) | inkorten | "Aanmelden" + extern-icoon |
| src/components/agenda/ActivityDetailContent.tsx:265 | "Aanmelden kan tot {datum}." | behouden | – |
| src/components/agenda/ActivityDetailContent.tsx:273 | "Zet in je agenda" (download .ics) | behouden | – (goed: geen ".ics" getoond) |
| src/components/agenda/ActivityDetailContent.tsx:288-292 | kop "Niet-leden aangemeld (n)" + "Via de openbare agenda-embed, buiten het ledenbestand om. Zie ook Beheer > Potentiële leden." | vervangen | Kop: "Aangemeld via de website (n)"; uitleg schrappen of: "Staan ook bij Instroom > Potentiële leden." (technisch "embed", "ledenbestand") |
| src/components/agenda/ActivityDetailContent.tsx:327 | "Deze activiteit wacht nog op een besluit." | inkorten | "Wacht op goedkeuring." |
| src/components/agenda/ActivityDetailContent.tsx:355 | tooltip "Bewuste extra stap - leden krijgen al automatisch een melding zodra deze activiteit gepubliceerd wordt. Gebruik dit voor extra aandacht (bijv. weinig aanmeldingen), niet als standaardactie." | inkorten | "Leden kregen al een melding bij publicatie. Alleen gebruiken voor extra aandacht." |
| src/components/agenda/ActivityDetailContent.tsx:359 | "Communiceer over deze activiteit" (knop, 4 woorden; "communiceer" vaag) | vervangen | "Nieuwsbrief maken" |
| src/components/agenda/ActivityDetailContent.tsx:367 | "Aanmeldingen downloaden" | behouden | – (goed: geen "CSV") |
| src/components/agenda/ActivityDetailContent.tsx:384 | "Weet je zeker dat je deze inzending wilt intrekken?" | vervangen | "Wil je je aanvraag voor deze activiteit intrekken?" ("inzending" ≠ term elders) |
| src/components/agenda/AttendeeList.tsx:97 | "Wie gaat er ook" | behouden | – |
| src/components/agenda/AttendeeList.tsx:99 | "Vink af wie er daadwerkelijk was - dat verschijnt dan op hun profiel." | inkorten | "Vink aan wie er was. Dit komt op hun profiel." ("afvinken" is dubbelzinnig) |
| src/components/agenda/AttendeeList.tsx:117 | "Nog niemand aangemeld." | behouden | – |
| src/components/agenda/RegisterButton.tsx:52 | "Aanmelden is gesloten" | behouden | – |
| src/components/agenda/RegisterButton.tsx:67 | knoplabel "Op de wachtlijst" (is een actie, leest als status) | vervangen | "Op wachtlijst zetten" |
| src/components/agenda/RegisterButton.tsx:72 | "Je staat op de wachtlijst - je krijgt bericht zodra er een plek vrijkomt." | behouden-want | voorkomt onzekerheid; evt. "Je krijgt bericht als er een plek vrijkomt." |
| src/components/agenda/RegisterButton.tsx:76 | "Deze activiteit is vol, maar je kunt je op de wachtlijst zetten." | inkorten | "Vol – je kunt op de wachtlijst." |
| src/components/agenda/NewActivityFlow.tsx:19 | "Is dit een officiële VOC-activiteit of een externe activiteit?" | inkorten | "Wat voor activiteit?" |
| src/components/agenda/NewActivityFlow.tsx:31 | "Direct gepubliceerd, geen goedkeuring nodig." | inkorten | "Direct zichtbaar in de agenda." |
| src/components/agenda/NewActivityFlow.tsx:44 · ActivityForm.tsx:225 | "Volgt de gewone goedkeuringslogica, net als bij een lid." / "Externe activiteiten volgen de gewone goedkeuringslogica, net als bij een lid." | vervangen | "Moet eerst worden goedgekeurd." (jargon "goedkeuringslogica"; staat er 2x) |
| src/components/agenda/NewActivityFlow.tsx:59 | "Je activiteit komt pas in de agenda te staan zodra bestuur of beheer 'm heeft goedgekeurd." | inkorten | "Het bestuur keurt je activiteit eerst goed." |
| src/components/agenda/NewActivityFlow.tsx:70 | "Indienen ter goedkeuring" | inkorten | "Indienen" |
| src/components/agenda/ActivityForm.tsx:209 | type-knop "Activiteit" (naast "Externe activiteit") | vervangen | "VOC-activiteit" (zoals NewActivityFlow:30) |
| src/components/agenda/ActivityForm.tsx:239 | "Beschrijving" | vervangen | "Omschrijving" (bedrijf/nieuwsbrief gebruiken "omschrijving") – of andersom, maar één term |
| src/components/agenda/ActivityForm.tsx:271 | "Bv. 24-12-2026 20:00." | schrappen | – (datum-/tijdkiezer, `type="datetime-local"`) |
| src/components/agenda/ActivityForm.tsx:285 | "Op dezelfde dag als de start." | behouden-want | voorkomt fout bij meerdaagse activiteit |
| src/components/agenda/ActivityForm.tsx:304 | "Aanmelddeadline (optioneel)" | vervangen | "Aanmelden kan tot (optioneel)" |
| src/components/agenda/ActivityForm.tsx:313 | "Bv. 20-12-2026 23:59." | schrappen | – (datumkiezer) |
| src/components/agenda/ActivityForm.tsx:317 | "Maximum deelnemers" | vervangen | "Max. aantal deelnemers" |
| src/components/agenda/ActivityForm.tsx:334-335 | "Uit: een bezoeker van de openbare website ziet deze activiteit wel, maar kan alleen een lid zich (via het portaal) aanmelden." | inkorten | "Uit: alleen leden kunnen zich aanmelden." |
| src/components/agenda/ActivityForm.tsx:376 | "Zonder vinkje gebruikt deze activiteit de gewone VOC-aanmeldfunctie." | schrappen | – (spreekt voor zich) |
| src/components/agenda/ActivityForm.tsx:432 | kop "Melding bij publiceren" | behouden | – |
| src/components/agenda/ActivityForm.tsx:434-435 | "Respecteert altijd de persoonlijke meldingsvoorkeuren van elk lid - dit bepaalt alleen of het kanaal zelf openstaat." | inkorten | "Leden die dit hebben uitgezet, krijgen niets." (technisch "kanaal") |
| src/components/agenda/ActivityForm.tsx:438/450 · ApproveActivityForm.tsx:40/44 | "Pushmelding versturen" vs "Push versturen"; "E-mail versturen" | vervangen | overal "Pushmelding" en "E-mail" |
| src/components/agenda/ActivityForm.tsx:80 | "Aangemelden zijn geïnformeerd." | vervangen | "Deelnemers zijn geïnformeerd." |
| src/components/agenda/ActivityForm.tsx:85 | "Aangemelden informeren over deze wijziging?" | vervangen | "Deelnemers informeren over de wijziging?" |
| src/components/agenda/ActivityForm.tsx:107 | "Niet nu" | behouden | – |
| src/components/agenda/ApproveActivityForm.tsx:54 | "Bevestig goedkeuren" | vervangen | "Goedkeuren" |
| src/components/agenda/RejectActivityForm.tsx:72 | "Afwijzen met deze reden" (4 woorden) | inkorten | "Afwijzen" |
| src/components/agenda/RejectActivityForm.tsx:9 | "Onvoldoende informatie in de inzending" | vervangen | "Onvoldoende informatie" |
| src/components/agenda/CancelActivityButton.tsx:66-67 | "Alle aangemelden (leden en niet-leden) krijgen hieronder meteen een melding. De activiteit blijft zichtbaar als "Afgelast" en kan niet meer geboekt worden." | behouden-want / inkorten | onomkeerbaar; "Alle deelnemers krijgen dit bericht. De activiteit blijft zichtbaar als Afgelast." ("hieronder" en "geboekt" verwarrend) |
| src/components/agenda/CancelActivityButton.tsx:93 | "Afgelasten en informeren" | behouden | – |
| src/app/(app)/agenda/actions.ts:359 | "Deze activiteit heeft {n} aanmelding(en) en kan daarom niet verwijderd worden. Gebruik "Afgelasten" om aangemelden te informeren." | behouden-want / vervangen | voorkomt datafout; "aangemelden" → "deelnemers" |
| src/app/(app)/agenda/actions.ts:237 / 331 | "Er ging iets onverwachts mis bij het aanmaken/opslaan. Probeer het opnieuw." | inkorten | "Er ging iets mis. Probeer het opnieuw." |
| src/components/agenda/ActivityAttachmentUploadForm.tsx:35 | "Bijlage toevoegen" | behouden | – |

### 1.3 Community (feed)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/components/feed/FeedList.tsx:208 | "Zodra leden updates delen met het netwerk, verschijnen ze hier in de community-feed." | vervangen | "Plaats het eerste bericht." ("updates", "community-feed") |
| src/components/feed/FeedList.tsx:209 | "Probeer een ander label, of bekijk alle berichten." | inkorten | "Kies een ander label." |
| src/components/feed/PostComposer.tsx:160/201 | "Wat wil je delen met het netwerk?" | behouden | – |
| src/components/feed/PostComposer.tsx:195 | "Zet bestanden hier neer om toe te voegen" | inkorten | "Zet bestanden hier neer" |
| src/components/feed/PostComposer.tsx:211 | "Foto's of PDF toevoegen" | behouden | – |
| src/components/feed/PostComposer.tsx:265 · PostTypePicker.tsx:52 · src/app/(app)/actions.ts:45 | "Kies eerst een label (vraag, aanbod, nieuws of overig) voordat je kunt plaatsen." + "Kies een label voordat je plaatst." + servermelding | schrappen (dubbel) | één keer: "Kies een label." (de knoppen tonen de opties al) |
| src/app/(app)/actions.ts:54 | "Alleen afbeeldingen (PNG/JPEG/WebP) of PDF's zijn toegestaan als bijlage." | inkorten | "Alleen foto's of PDF's." |
| src/components/feed/ReportPostOverlay.tsx:57 | "Bedankt, je melding is verstuurd naar bestuur/beheer." | vervangen | "Bedankt. Het bestuur bekijkt het bericht." ("melding" = hier rapportage; botst met Meldingen) |
| src/components/feed/ReportPostOverlay.tsx:83/89 | label "Toelichting" + placeholder "Optionele toelichting…" | inkorten | placeholder schrappen (label + "(verplicht)" volstaat) |
| src/components/feed/LikeButton.tsx:57 | "Niet meer leuk vinden" | behouden | – |
| src/components/feed/PostCard.tsx:367 | "· bewerkt" | behouden | – |
| src/components/feed/PostCard.tsx:482 | "Nog {n} reacties bekijken" | behouden | – |

### 1.4 Netwerk – leden, bedrijven, profielen, bewerkformulieren, factuurgegevens

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/components/members/MemberListClient.tsx:70 · company/BedrijvenListClient.tsx:66 | "Geen leden/bedrijven gevonden" + "Pas je zoekopdracht of filter aan." | inkorten | alleen titel |
| src/components/members/MemberProfileContent.tsx:136/146 | "Profiel aanpassen" | vervangen | "Profiel bewerken" (profiel/page.tsx:43 en AdminEditProfile:21) |
| src/components/members/MemberProfileContent.tsx:125 | "Laatst actief: {Vandaag/Nog nooit ingelogd}" | vervangen | kleine letter na dubbele punt ("Laatst actief: vandaag") |
| src/components/members/MemberProfileContent.tsx:174 | "E-mailadres is verborgen" | behouden-want | privacy-feedback |
| src/components/company/CompanyHeader.tsx:84 · PostCard.tsx:262 · MemberProfileContent.tsx:157 vs ui/ExpandableText.tsx:25 | "Meer weergeven" vs default "Lees meer" | vervangen | één term: "Lees meer" / "Minder" |
| src/app/(app)/bedrijven/[id]/bewerken/page.tsx:61 | "Zichtbaar voor leden van dit bedrijf en voor bestuur/beheer." (onder "Bedrijfsgegevens bewerken") | vervangen | Klopt niet voor het profiel (dat ziet iedereen). Verplaatsen naar Factuurgegevens: "Alleen zichtbaar voor jouw bedrijf en het bestuur." |
| src/app/(app)/bedrijven/[id]/bewerken/page.tsx:74 | "Verwijdert dit bedrijf definitief, inclusief alle koppelingen met leden. Kan niet ongedaan gemaakt worden." | behouden-want / inkorten | onomkeerbaar; "Leden worden losgekoppeld. Dit kan niet ongedaan worden gemaakt." (bevestiging r.78 herhaalt "definitief") |
| src/components/company/CompanyForm.tsx:124 | "Klik op het camera-icoon om een logo te uploaden." | schrappen | – (UI-instructie) |
| src/components/company/CompanyForm.tsx:138/144 | "Korte omschrijving" + placeholder "Pakkende zin in een paar woorden" | behouden | – |
| src/components/company/CompanyForm.tsx:151/158 | "Biografie" + "Meer over het bedrijf: geschiedenis, aanbod, waar jullie voor staan..." | vervangen | label "Over het bedrijf" ("biografie" past bij persoon) |
| src/components/company/CompanyForm.tsx:206 | "Social media" | vervangen | "Sociale media" |
| src/components/company/CompanyForm.tsx:257/272 | "Bezoekersadres" / "Bezoekersadres tonen" | vervangen | "Bezoekadres" (billing gebruikt "bezoekadres") |
| src/components/company/CompanyForm.tsx:306/311 | "Zichtbaar op de openbare bedrijvengids" (onder kop "Openbare bedrijvengids") | inkorten | "Tonen op de website" (kop herhaalt) |
| src/components/profile/ProfileForm.tsx:108 | "Klik op het camera-icoon om een profielfoto te uploaden." | schrappen | – |
| src/components/profile/ProfileForm.tsx:157/166 | "Telefoonnummer zichtbaar voor andere leden" / "E-mailadres zichtbaar voor andere leden" | behouden-want | privacy; maar dubbel met Instellingen > Privacy ("… tonen") – kies één plek of zelfde label |
| src/components/profile/CompanyMembershipForm.tsx:35 | "Aanvraag verzonden - een collega bij dit bedrijf of bestuur/beheerder moet 'm nog goedkeuren." | inkorten | "Aanvraag verstuurd. Een collega of het bestuur keurt deze goed." |
| src/components/profile/CompanyMembershipForm.tsx:36 | "Bedrijfskoppeling opgeslagen." | vervangen | "Bedrijf opgeslagen." |
| src/components/company/CompanyMembershipRequests.tsx:46 | "Openstaande koppelingsaanvragen" | vervangen | "Nieuwe collega's" / "Aanvragen van collega's" |
| src/components/company/CompanyMembershipRequests.tsx:48 | "Alleen zichtbaar voor bestaande collega's bij dit bedrijf en bestuur/beheer." | behouden-want / inkorten | privacy; "Alleen zichtbaar voor collega's en het bestuur." |
| src/app/(app)/profiel/page.tsx:79 | "Aanvraag voor {bedrijf} in behandeling" | behouden | – |
| src/components/company/CompanySelector.tsx:35 | "Mijn bedrijf toevoegen" | behouden | – |
| src/components/company/CompanyBillingForm.tsx:68 | "Factuuradres is hetzelfde als bezoekadres" | inkorten | "Zelfde als bezoekadres" (kop is al "Factuuradres") |
| src/components/company/CompanyBillingForm.tsx:79 | "Nog geen bezoekadres ingevuld - vul dat eerst bij de bedrijfsgegevens in." | behouden-want | voorkomt fout |
| src/components/company/CompanyBillingForm.tsx:132 | "Alleen invullen als facturen op een andere naam moeten komen." | behouden-want | voorkomt fout |
| src/components/company/CompanyBillingForm.tsx:144 | "Factuur-e-mailadres" | vervangen | "E-mailadres voor facturen" |
| src/components/company/CompanyBillingForm.tsx:111 vs CompanyForm.tsx:182 vs CompanySelector:58 vs AccessRequestForm:84 | "Plaats" / "Vestigingsplaats" / "Plaatsnaam" | vervangen | overal "Plaats" |
| src/components/company/CompanyMap.tsx:88 | "Geen bedrijven met een bekende locatie." | behouden | – |
| src/components/company/CompanyProfileContent.tsx:114 | "Werkzaam bij dit bedrijf" | behouden | – |

### 1.5 Documenten

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/components/documents/DocumentListClient.tsx:83 | "Zodra het bestuur documenten deelt, verschijnen ze hier." | schrappen | – (titel "Nog geen documenten") |
| src/components/documents/DocumentListClient.tsx:83 | "Geen documenten voor "{q}"." (titel "Niets gevonden") | behouden | – |
| src/components/documents/DocumentUploadForm.tsx:52/56 | "Korte omschrijving (optioneel)" / "Categorie (optioneel)" | behouden | – |
| src/lib/supabase/uploadDocument.ts:28 | "Bestandstype niet toegestaan (kreeg: {mime-type}). Toegestaan: PDF, Word, PowerPoint, PNG, JPEG." | inkorten | "Dit bestandstype kan niet. Gebruik PDF, Word, PowerPoint of een foto." (geen MIME-type tonen) |
| src/lib/supabase/uploadDocument.ts:44/50 · upload.ts:78/84 | "Uploaden is niet gelukt: {error.message}" | vervangen | "Uploaden is niet gelukt. Probeer het opnieuw." (ruwe Engelse fout) |

### 1.6 Nieuws

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/nieuws/page.tsx:39 | "Mededelingen en updates vanuit het bestuur." | schrappen | – |
| src/app/(app)/nieuws/page.tsx:70 | "Zodra het bestuur iets deelt, verschijnt het hier." | schrappen | – (titel "Nog geen nieuwsberichten") |

### 1.7 Meldingen

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/notificaties/page.tsx:39 | "Hier verschijnen meldingen zodra er iets voor je gebeurt." | schrappen | – |
| src/components/notifications/NotificationCenter.tsx:103/198 vs notificaties/page.tsx:38 | "Geen meldingen." vs "Geen meldingen" | vervangen | gelijk (zonder punt in titel) |
| src/components/notifications/NotificationCenter.tsx:127 | "Alles bekijken" | vervangen | gelijk aan beheer "Bekijk alles" → kies één: "Alles bekijken" |
| src/components/notifications/NotificationList.tsx:61 | "Alles markeren als gelezen" (4 woorden) | inkorten | "Alles gelezen" |

### 1.8 Profiel / Zoeken / Navigatie

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/zoeken/page.tsx:55 | "Zoek in één keer in leden, bedrijven, activiteiten, berichten en documenten." | schrappen | – (placeholder volstaat) |
| src/components/search/SearchForm.tsx:31 vs SearchOverlay.tsx:89 | "Zoek in leden, bedrijven en documenten…" vs "Zoek leden, bedrijven, activiteiten…" | vervangen | één placeholder: "Zoek leden, bedrijven, activiteiten…" (SearchForm noemt activiteiten/berichten niet, maar doorzoekt ze wel) |
| src/components/layout/Sidebar.tsx:68 · ProfileMenu.tsx:33 | "Mijn bedrijfsprofiel" | behouden | – (maar zie terminologie "bedrijfsgegevens/bedrijfsprofiel") |
| src/components/layout/nav-items.ts:33/48 | aria "ongelezen melding(en) over de agenda/het netwerk" | behouden | – |
| src/components/layout/AppShell.tsx:130 | "Naar inhoud" | behouden | – (toegankelijkheid) |

### 1.9 Instellingen (en Privacy-pagina)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/instellingen/page.tsx:49 | "Licht, donker of volgens de instelling van je apparaat." | schrappen | – (knoppen Systeem/Licht/Donker zeggen het) |
| src/app/(app)/instellingen/page.tsx:58 | "Inloggen kan ook zonder wachtwoord via een inloglink per e-mail. Wil je toch een wachtwoord instellen, of je e-mailadres wijzigen, dan kan dat hier." | inkorten | "Een wachtwoord is optioneel: je kunt ook inloggen met een link per e-mail." |
| src/app/(app)/instellingen/page.tsx:66 | knop "Instellen" (ook als er al een wachtwoord is) | vervangen | "Wijzigen" of "Instellen/wijzigen" |
| src/app/(app)/instellingen/page.tsx:76 | "Kies per soort melding: pushmelding, e-mail, beide, of geen. Voor dingen die rechtstreeks over jou gaan - zoals de uitkomst van een aanvraag - krijg je altijd bericht, dat staat vast." | inkorten | "Berichten over je eigen aanvragen krijg je altijd." |
| src/app/(app)/instellingen/page.tsx:78 | sublabel "Dit apparaat" + switch "Pushmeldingen" | behouden | – |
| src/components/profile/NotificationChannelChoice.tsx:19 | "Mail" | vervangen | "E-mail" (overal elders) |
| src/components/profile/PushToggle.tsx:66-67 | "Pushmeldingen (niet beschikbaar)" + "Nog niet beschikbaar op deze omgeving." | inkorten | label "Pushmeldingen" + "Niet beschikbaar op dit apparaat." ("omgeving" = technisch, dubbel "niet beschikbaar") |
| src/components/profile/PushToggle.tsx:26 | "Pushmeldingen worden niet ondersteund in deze browser." | behouden | – |
| src/components/profile/PushToggle.tsx:43 · profiel/actions.ts:111 | "Aanmelden is niet gelukt." / "Aanmelden voor pushmeldingen is niet gelukt." | vervangen | "Pushmeldingen aanzetten is niet gelukt." ("aanmelden" botst met activiteit) |
| src/lib/push/subscribe.ts:20 | "Toestemming voor meldingen is niet gegeven." | inkorten | "Sta meldingen toe in je browser." (actiegericht) |
| src/components/profile/EmailChangeForm.tsx:33 | "Check je nieuwe (en huidige) e-mailadres voor een bevestigingslink - pas na bevestigen wijzigt je e-mailadres echt." | behouden-want / inkorten | voorkomt verwarring; "Bevestig via de link in je mail. Pas daarna wijzigt je e-mailadres." |
| src/components/profile/EmailChangeForm.tsx:18 | "Bevestigingslink versturen" | behouden | – |
| src/app/(app)/profiel/actions.ts:274 | "Wijzigen is niet gelukt: {error.message}" | vervangen | geen ruwe fout tonen |
| src/app/(app)/instellingen/page.tsx:104 | "Zichtbaar voor andere leden op je profiel of de bedrijfspagina." | behouden-want | privacy |
| src/app/(app)/instellingen/page.tsx:118 | "Bezoekersadres bedrijf tonen" | vervangen | "Bezoekadres bedrijf tonen" |
| src/app/(app)/instellingen/page.tsx:124 | "Naam en functie tonen op bedrijvengids" | vervangen | "Naam en functie tonen op de website" (behouden-want privacy) |
| src/app/(app)/instellingen/page.tsx:130 | "Hoe het portaal met je gegevens en toegang omgaat." | schrappen | – (label "Privacy & veiligheid" zegt het) |
| src/app/(app)/instellingen/page.tsx:142 | "Een bestand met je profielgegevens, geplaatste berichten/reacties en activiteit-aanmeldingen." | behouden-want | privacy (AVG-inzage) |
| src/app/(app)/instellingen/page.tsx:157-160 | "Account verwijderen" + "Je account wordt direct gedeactiveerd; persoonsgegevens worden na 90 dagen automatisch gewist. Geplaatste berichten en reacties blijven staan." | behouden-want | onomkeerbaar; let op term (zie §2 verwijderen/deactiveren) |
| src/components/profile/DeleteAccountButton.tsx:17-20 | "Je wordt direct uitgelogd en het account is niet meer bruikbaar. Persoonsgegevens (…) worden na 90 dagen automatisch gewist. Geplaatste berichten en reacties blijven staan, wel voortaan onder "Verwijderd lid". Binnen die 90 dagen kan alleen het bestuur dit nog ongedaan maken." | behouden-want / inkorten | herhaalt pagina-tekst; "Je wordt uitgelogd. Na 90 dagen worden je gegevens gewist; tot dan kan het bestuur dit terugdraaien. Berichten blijven staan als "Verwijderd lid"." |
| src/app/login/page.tsx:26-27 | "Je account is verwijderd. Persoonsgegevens worden na 90 dagen automatisch gewist; geplaatste berichten en reacties blijven staan." | behouden-want / inkorten | 3e herhaling; "Je account is verwijderd." volstaat |
| src/app/(app)/privacy/page.tsx:47 | "Hoe het ledenportaal met je gegevens en toegang omgaat, in het kort." | schrappen | – |
| src/app/(app)/privacy/page.tsx:36-37 | "Toegangsrechten ook achter de schermen gecontroleerd" + "Wat je op het scherm wel of niet ziet, is niet de enige controle: …" | inkorten | samenvoegen met "Toegang op basis van rol" (r.26-27) |
| src/app/(app)/privacy/page.tsx:11-32, 65-66 | overige privacyteksten | behouden-want | privacy/juridisch |
| src/app/(app)/privacy/page.tsx:44 | "Terug naar Instellingen" | vervangen | "Terug naar instellingen" (elders kleine letter) |

### 1.10 Login / Registreren / Toegang aanvragen / Wachtwoord / Account

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/login/page.tsx:32 | "Log in om verder te gaan." | schrappen | – |
| src/app/login/page.tsx:43 | "Wachtwoord vergeten? Neem contact op met het bestuur." | behouden | – |
| src/app/login/page.tsx:48-50 | "Nieuw lid? Vraag toegang aan" | behouden | – |
| src/components/auth/LoginForm.tsx:69-70 | "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een inloglink. Geen wachtwoord nodig - klik de link in je mail en je bent binnen." | inkorten | "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een inloglink." (behouden-want: niet verraden welk adres bestaat) |
| src/components/auth/LoginForm.tsx:77 | "Terug naar inloggen met wachtwoord" (5 woorden) | inkorten | "Inloggen met wachtwoord" |
| src/components/auth/LoginForm.tsx:98 | "We sturen je een inloglink - geen wachtwoord nodig." | behouden | – |
| src/components/auth/LoginForm.tsx:55 | "Inloggen zonder wachtwoord" | behouden | – |
| src/components/auth/ForgotPasswordForm.tsx:15 | "Verstuur resetlink" | vervangen | "Link versturen" ("reset" = Engels) |
| src/components/auth/ForgotPasswordForm.tsx:26-27 | "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een link …" | behouden-want | veiligheid |
| src/app/wachtwoord-vergeten/page.tsx:23 | "Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen." | inkorten | "We sturen je een link om een nieuw wachtwoord te kiezen." |
| src/app/wachtwoord-vergeten/page.tsx:29-30 · actions.ts:16 | "Wachtwoord opnieuw instellen via e-mail is momenteel niet beschikbaar. …" / "Wachtwoord-reset via e-mail is momenteel niet beschikbaar." | vervangen | één tekst: "Dit werkt nu niet. Vraag het bestuur je wachtwoord te resetten." |
| src/app/wachtwoord-instellen/page.tsx:19 | "Kies een nieuw wachtwoord voor je account." | schrappen | – (kop "Nieuw wachtwoord instellen") |
| src/app/wachtwoord-instellen/actions.ts:25 | "… Vraag een nieuwe resetlink aan." | vervangen | "… Vraag een nieuwe link aan." |
| src/components/auth/SetPasswordForm.tsx:61 · RegisterForm.tsx:127 · BootstrapForm.tsx:60 | "Minimaal 8 tekens." | behouden-want | voorkomt fout |
| src/components/auth/RegisterForm.tsx:143 vs SetPasswordForm.tsx:77 | "Komt niet overeen." vs "De wachtwoorden komen niet overeen." | vervangen | één tekst |
| src/app/register/[token]/page.tsx:26 | "Er ging iets mis bij het verbinden met de database. Probeer het later opnieuw." | vervangen | "Er ging iets mis. Probeer het later opnieuw." |
| src/app/register/[token]/page.tsx:36-37 | "Deze uitnodigingslink is ongeldig, verlopen of al gebruikt. Vraag het bestuur om een nieuwe link." | behouden | – |
| src/app/register/[token]/page.tsx:44-45 | "Je bent uitgenodigd als {rol}. Vul je gegevens aan en kies een wachtwoord om je account te activeren." | inkorten | "Vul je gegevens aan en kies een wachtwoord." |
| src/app/register/[token]/actions.ts:88/110 | "Registreren is niet gelukt. Controleer de uitnodigingslink en probeer opnieuw." | behouden | – |
| src/app/register/actions.ts:42 · toegang-aanvragen/actions.ts:59 | "Registreren/Versturen is niet gelukt: {error.message}" | vervangen | zonder ruwe fout |
| src/app/register/page.tsx:22 | "Al geïnitialiseerd" | vervangen | "Portaal is al ingericht" |
| src/app/register/page.tsx:35-37 | "Er bestaat nog geen account op dit ledenportaal. Maak het eerste account aan - dit wordt automatisch de beheerder. Deze pagina werkt alleen tot het eerste account bestaat." | inkorten | "Maak het eerste account aan. Dit wordt de beheerder." |
| src/components/auth/BootstrapForm.tsx:15 | "Beheerdersaccount aanmaken" | behouden | – |
| src/components/auth/BootstrapForm.tsx:27 | "Bijna klaar! Check je e-mail en klik op de bevestigingslink om je account te activeren." | behouden | – |
| src/app/toegang-aanvragen/page.tsx:19 | "Nog geen uitnodiging? Laat je gegevens achter en het bestuur neemt contact met je op." | behouden | – |
| src/components/auth/AccessRequestForm.tsx:34-35 | "Bedankt! Het bestuur beoordeelt je aanvraag en stuurt je een uitnodigingslink als je in aanmerking komt." | behouden | – |
| src/components/auth/AccessRequestForm.tsx:144 | placeholder "Bijvoorbeeld: waarom je graag lid wilt worden" | behouden | – |
| src/components/auth/AccessRequestForm.tsx:150-151 | "Door dit formulier in te dienen doe ik een lidmaatschapsaanvraag bij de Veendammer OndernemersCompagnie en geef ik toestemming …" | behouden-want | juridisch/AVG (maar naam vereniging inconsistent, zie §3) |
| src/app/account-gedeactiveerd/page.tsx:15-16 | "Het bestuur heeft je toegang tot het ledenportaal tijdelijk stopgezet. Neem contact op met het bestuur van de VOC als je denkt dat dit niet klopt." | behouden-want / inkorten | "tijdelijk" klopt niet altijd (na 90 dagen gewist); "Je hebt geen toegang meer. Klopt dit niet? Neem contact op met het bestuur." |
| src/app/offline/page.tsx:19 | "Het ledenportaal heeft een verbinding nodig. Probeer het opnieuw zodra je weer online bent." | inkorten | "Probeer het opnieuw zodra je weer online bent." |
| src/components/ui/NotFoundContent.tsx:15 | "Controleer de link, of ga terug naar een van de volgende pagina's." | inkorten | "Controleer de link." |
| src/app/login/actions.ts:78 | "Inloggen zonder wachtwoord is momenteel niet beschikbaar." | behouden | – |

### 1.11 Beheer – dashboard

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/page.tsx:191 | "Overzicht voor bestuur en beheer." | schrappen | – |
| src/app/(app)/beheer/page.tsx:182 | "Activatiegraad" | vervangen | "Account geactiveerd" (% leden) – jargon |
| src/app/(app)/beheer/page.tsx:183 | "Nieuwe aanmeldingen deze maand" (= nieuwe leden) | vervangen | "Nieuwe leden deze maand" ("aanmelding" = activiteit) |
| src/app/(app)/beheer/page.tsx:215 | "Niets dat op je wacht" + "Nieuwe aanvragen, inzendingen en meldingen verschijnen hier." | schrappen (beschrijving) | titel "Niets te doen" |
| src/app/(app)/beheer/page.tsx:324 vs 354 | "Komende activiteiten" / "Geen aankomende activiteiten." | vervangen | één woord: "Komende activiteiten" / "Geen komende activiteiten." |
| src/app/(app)/beheer/page.tsx:382 | "Profiel incompleet" | vervangen | "Profiel niet compleet" |
| src/app/(app)/beheer/page.tsx:429 | "Alle communicatie" (link naar Nieuwsbrieven) | vervangen | "Alle nieuwsbrieven" |
| src/app/(app)/beheer/page.tsx:440 | "Geen concepten of ingeplande nieuwsbrieven." | behouden | – |

### 1.12 Beheer – Agenda beheren

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/components/beheer/BeheerAgendaContent.tsx:131 | "Alle activiteiten met status, goedkeuren/afwijzen/bewerken/verwijderen." | schrappen | – |
| src/components/beheer/BeheerAgendaContent.tsx:169 | "Pas het filter aan of maak een nieuwe activiteit aan." | schrappen | – (knop "Nieuwe activiteit" staat erboven) |
| src/components/beheer/BeheerAgendaContent.tsx:200 | "Aangeleverd door" / "Aangemaakt door" | vervangen | "Ingediend door" / "Aangemaakt door" (detail zegt "Toegevoegd door") |

### 1.13 Beheer – Leden / Bedrijven

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/components/beheer/BeheerLedenContent.tsx:76 | "Rol wijzigen en activeren/deactiveren, direct vanuit dit overzicht." | schrappen | – |
| src/app/(app)/beheer/bedrijven/page.tsx:12 | "Bedrijfsprofiel snel aanpassen en factuuradres/btw-nummer inzien, direct vanuit dit overzicht." | schrappen | – |
| src/components/beheer/BeheerLedenListClient.tsx:112 · BeheerBedrijvenListClient.tsx:69 | "Snel bewerken" / "Snel bewerken sluiten" | behouden | – |
| src/components/beheer/MemberQuickEditForm.tsx:88 · CompanyQuickEditForm.tsx:119 | "Meer bewerken" | vervangen | "Alles bewerken" |
| src/components/beheer/BeheerBedrijvenListClient.tsx:147 vs BeheerLedenListClient:101 | "Pas je zoekopdracht aan." vs "Pas je zoekopdracht of filter aan." | schrappen | alleen titel |
| src/components/members/RoleEditor.tsx:51 | "Rol wijzigen (alleen zichtbaar voor beheerders)" | inkorten | "Rol wijzigen" |
| src/components/members/RoleEditor.tsx:69 | "Rol bijgewerkt." | vervangen | "Opgeslagen." (overal elders) |
| src/components/members/GenerateLoginLinkButton.tsx:41 | "Eenmalig bruikbaar en verloopt automatisch; alleen te gebruiken om dit lid te helpen inloggen." | behouden-want | veiligheid; evt. "Eenmalig te gebruiken. Alleen delen met dit lid." |
| src/components/members/MemberActiveToggle.tsx:31-34 · MemberRowMenu.tsx:84-87 | "Het account is dan direct niet meer bruikbaar en verdwijnt uit de ledenlijst. Persoonsgegevens (…) worden na 90 dagen automatisch verwijderd, tenzij het lid binnen die termijn weer geactiveerd wordt. Geplaatste berichten en reacties blijven staan, wel voortaan onder "Verwijderd lid"." | behouden-want / inkorten | "Het lid kan niet meer inloggen. Na 90 dagen worden de gegevens gewist, tenzij je het lid weer activeert." |
| src/components/members/DeleteMemberButton.tsx:19-21 · MemberRowMenu.tsx:127-129 | "{naam} wordt direct uitgelogd en ontkoppeld van het eigen bedrijf … Dit kan niet ongedaan worden gemaakt." | behouden-want / inkorten | "Alle gegevens van {naam} worden direct gewist. Berichten blijven staan als "Verwijderd lid". Dit kan niet ongedaan worden gemaakt." |
| src/components/members/MemberRowMenu.tsx:108 | "Tonen in ledenlijst" / "Verbergen uit ledenlijst" | behouden | – |
| src/components/members/MemberActiveToggle.tsx:55 | "Account is actief/gedeactiveerd" | behouden | – |

### 1.14 Beheer – Instroom (aanvragen, uitnodigingen, potentiële leden, importeren)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/instroom/page.tsx:156 | "Van toegangsaanvraag of activiteit-aanmelding tot lid - op één plek i.p.v. verspreid over vier schermen." | schrappen | – (ontwikkelaarsperspectief) |
| src/app/(app)/beheer/instroom/page.tsx:54 | "Nieuwe aanvragen vanuit het inlogscherm verschijnen hier." | schrappen | – |
| src/app/(app)/beheer/instroom/page.tsx:89 | "Verleng alle met 14 dagen" (5 woorden, grammatica) | vervangen | "Alles verlengen" (+ tooltip "14 dagen") |
| src/app/(app)/beheer/instroom/page.tsx:110-115 | "Gebruik het e-mailadres om zelf contact op te nemen (bijv. na de activiteit, of om te vragen of diegene lid wil worden), en zet daarna de status: Wil lid worden als iemand toegevoegd moet worden (via de tab Uitnodigingen hiernaast), Wil niet lid worden of Geen antwoord om af te sluiten. Met het prullenbakje kun je een rij ook direct verwijderen, bijvoorbeeld bij een verkeerd ingevuld e-mailadres." | inkorten | "Neem zelf contact op en zet daarna de status." |
| src/app/(app)/beheer/instroom/page.tsx:124 | "Zodra een niet-lid zich via de openbare agenda-embed aanmeldt voor een activiteit, verschijnt die hier." | vervangen | "Niet-leden die zich via de website aanmelden, verschijnen hier." ("embed") |
| src/app/(app)/beheer/instroom/page.tsx:136-141 | "Upload een CSV-bestand met bestaande ledengegevens (…). Er wordt per rij een uitnodiging aangemaakt - zonder dat daar meteen een e-mail bij verstuurd wordt; een bedrijf dat nog niet bestaat wordt automatisch aangemaakt met het opgegeven adres. Bekijk en pas de gegevens hieronder aan voordat je importeert; de e-mail versturen doe je later, per lid, vanaf de tab Uitnodigingen." | inkorten | "Per rij wordt een uitnodiging gemaakt, nog zonder e-mail. Die verstuur je later bij Uitnodigingen." (kolommen + bedrijf-aanmaak staan al in BulkImportForm:71-73 = dubbel) |
| src/components/invitations/BulkImportForm.tsx:58 | "CSV-bestand kiezen" | vervangen | "Excel-/CSV-bestand kiezen" of "Bestand kiezen" (CSV is technisch; noem "opslaan als CSV" in voorbeeldbestand) |
| src/components/invitations/BulkImportForm.tsx:71-73 | "Verwachte kolommen (in elke volgorde): voornaam, achternaam, email, telefoon, bedrijf, bezoekersadres, postcode, vestigingsplaats. Een bedrijf dat nog niet bestaat wordt automatisch aangemaakt met het opgegeven adres." | behouden-want / inkorten | voorkomt importfouten; 2e zin schrappen (staat ook in pagina-intro) |
| src/components/invitations/BulkImportForm.tsx:128 | "{n} leden importeren" | behouden | – |
| src/components/invitations/BulkImportForm.tsx:138-141 | "{n} uitnodigingen aangemaakt (nog geen e-mail verstuurd) - te vinden bij Uitnodigingen." | behouden | – |
| src/components/invitations/InviteForm.tsx:84 | "Naam en bedrijf alvast invullen" | behouden | – |
| src/components/invitations/InviteForm.tsx:102-103 | "Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt ({emailError}). Deel de link hieronder zelf." | vervangen | technische fout tussen haakjes schrappen |
| src/components/invitations/InviteForm.tsx:107 | "Uitnodiging aangemaakt. Geen e-mailadres opgegeven - deel de link hieronder zelf." | behouden-want | actie nodig |
| src/components/invitations/AccessRequestRow.tsx:78-79 | "Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt ({fout}). Verstuur 'm opnieuw via Uitnodigingen." | vervangen | "… Verstuur hem opnieuw bij Uitnodigingen." (zonder fout, zonder "'m") |
| src/components/invitations/InvitationRow.tsx:52/60/67 | "Verstuur e-mail" / "Kopieer link" / "Verleng met 14 dagen" | vervangen | infinitief: "E-mail versturen" / "Link kopiëren" / "Verlengen (14 dagen)" |
| src/components/invitations/InvitationRow.tsx:92 | "Geen naam/e-mailadres opgegeven" | inkorten | "Zonder naam" |
| src/components/invitations/InvitationRow.tsx:100 | "verloopt pas na versturen" | behouden | – |
| src/components/invitations/InvitationList.tsx:124 | "Er zijn nog geen openstaande uitnodigingen." | inkorten | "Geen openstaande uitnodigingen." |
| src/components/invitations/InvitationList.tsx:149/158 | bulk "Verstuur" / "Verleng" | vervangen | "Versturen" / "Verlengen" |
| src/components/invitations/InvitationList.tsx:202 | "Toon meer ({n} resterend)" | vervangen | "Meer tonen ({n})" (zie embed "Meer tonen") |
| src/components/beheer/ProspectRow.tsx:26 | "Voor het eerst gezien: {X} · Laatst aangemeld: {Y}" | vervangen | kleine letter na dubbele punt |
| src/components/beheer/ProspectRow.tsx:51 | "{naam} verwijderen uit de potentiële leden?" | behouden | – |
| src/components/beheer/ProspectStatusSelect.tsx:8-11 | "Nog te beoordelen / Wil lid worden / Wil niet lid worden / Geen antwoord" | behouden | – |

### 1.15 Beheer – Nieuws

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/nieuws/page.tsx:36 | "Officiële mededelingen vanuit bestuur - staan los van de community-feed, bovenaan het dashboard en op de nieuwspagina voor alle leden." | inkorten | "Verschijnt op Home en bij Nieuws." ("dashboard"/"community-feed") |
| src/app/(app)/beheer/nieuws/page.tsx:54 | "Het eerste bericht verschijnt hier." | schrappen | – |
| src/components/beheer/NewsItemForm.tsx:58-59 | "Pre-header (korte samenvatting, optioneel)" | vervangen | "Korte samenvatting (optioneel)" |
| src/components/beheer/NewsItemForm.tsx:43 | "Opgeslagen." / "Geplaatst." | behouden | – |
| src/components/beheer/NewsItemRow.tsx:49/59 | "Naar boven verplaatsen" / "Naar beneden verplaatsen" | behouden | – (aria) |

### 1.16 Beheer – Moderatie

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/rapportages/page.tsx:102 | "Door leden gerapporteerde berichten uit de community-feed." | schrappen | – |
| src/app/(app)/beheer/rapportages/page.tsx:109 | "Gerapporteerde berichten verschijnen hier." | schrappen | – |
| src/components/moderation/ReportRow.tsx:103 | "Melding afwijzen" | vervangen | "Bericht behouden" (zo heet de uitkomst al, rapportages/actions.ts:30; "melding" botst met Meldingen) |
| src/components/moderation/ReportRow.tsx:45 | "Dit bericht wordt definitief verwijderd." | behouden-want | onomkeerbaar |
| src/components/moderation/ReportRow.tsx:81 vs page.tsx:115 | "Behandeld door:" vs kop "Afgehandeld" | vervangen | "Afgehandeld door:" |
| src/components/moderation/ReportRow.tsx:13 vs ReportPostOverlay.tsx:15 | "Anders" vs "Anders, namelijk…" | behouden | – (lijstweergave vs keuze) |

### 1.17 Beheer – Nieuwsbrieven (communicatie)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/communicatie/page.tsx:34 | "Centrale plek voor nieuwsbrieven en algemene e-mailcommunicatie naar leden." | schrappen | – |
| src/app/(app)/beheer/communicatie/page.tsx:51 | "Nog geen communicatie" | vervangen | "Nog geen nieuwsbrieven" |
| src/app/(app)/beheer/communicatie/page.tsx:52 | "Plaats hier je eerste nieuwsbrief, of ga naar een activiteit en kies "Communiceer over deze activiteit"." | schrappen | – (knop "Nieuwe nieuwsbrief" staat erboven) |
| src/app/(app)/beheer/communicatie/page.tsx:65/78 | "Geen openstaande concepten." / "Nog niets verzonden." | vervangen | "Geen concepten." / "Nog niets verstuurd." |
| src/app/(app)/beheer/communicatie/[id]/page.tsx:72-77 | status "Verzonden - alleen-lezen" / "Verzenden gedeeltelijk mislukt" / "Ingepland" / "Concept" | vervangen | gelijk aan lijst (CommunicationRow.tsx:99-102): "Verstuurd" / "Deels verstuurd" / "Ingepland" / "Concept" ("alleen-lezen" schrappen) |
| src/components/beheer/CommunicationRow.tsx:101 | "Verzending onderbroken" | vervangen | "Deels verstuurd" |
| src/components/beheer/NewsletterEditor.tsx:759 | placeholder "De hoofdregel die leden in hun inbox zien" | behouden | – |
| src/components/beheer/NewsletterEditor.tsx:765/772 | "Pre-header (optioneel)" + "Korte aanvullende tekst, zichtbaar naast het onderwerp in de inbox" | vervangen | label "Voorbeeldtekst in inbox (optioneel)"; placeholder schrappen |
| src/components/beheer/NewsletterEditor.tsx:787 | placeholder "Veendammer Ondernemer Compagnie" | vervangen | officiële naam (zie §3) |
| src/components/beheer/NewsletterEditor.tsx:797-798 | "Voettekst met social-links" | vervangen | "Voettekst met sociale media" |
| src/components/beheer/NewsletterEditor.tsx:377 | "Ververs" | vervangen | "Opnieuw ophalen" |
| src/components/beheer/NewsletterEditor.tsx:400-401 | "Ververs haalt titel, locatie, omschrijving en afbeelding opnieuw op uit de activiteit - eigen wijzigingen daaraan gaan dan verloren. De knoptekst blijft altijd staan." | behouden-want / inkorten | dataverlies; "Je eigen wijzigingen in dit blok gaan dan verloren." |
| src/components/beheer/NewsletterEditor.tsx:547 | "Een nette, dunne lijn tussen twee blokken - geen verdere instellingen." | schrappen | – |
| src/components/beheer/NewsletterEditor.tsx:366/520 | placeholder "Knoptekst, bv. "Bekijk activiteit"" | behouden | – |
| src/components/beheer/NewsletterEditor.tsx:626-630 | "Opnieuw proberen te versturen aan de {n} leden die 'm nog niet ontvingen." / "Dit verstuurt "{onderwerp}" naar {n} actieve leden. Dit kan niet ongedaan worden gemaakt." | behouden-want | onomkeerbaar; "'m" → "hem" |
| src/components/beheer/NewsletterEditor.tsx:653 | "Wordt verstuurd op {datum}. Dit kan niet ongedaan worden gemaakt." | vervangen | onjuist: inplannen kán worden geannuleerd (r.671). Schrappen: "Wordt verstuurd op {datum}." |
| src/components/beheer/NewsletterEditor.tsx:900 vs 673 | "Annuleer planning" vs "Planning annuleren" | vervangen | "Planning annuleren" |
| src/components/beheer/NewsletterEditor.tsx:912-913 | "{x} van {n} actieve leden ontvingen 'm al - de rest nog niet." / "Gaat naar alle {n} actieve leden." | behouden | ("'m" → "hem") |
| src/components/beheer/NewsletterEditor.tsx:924 | "- probeer het later opnieuw voor de rest." | behouden | – |
| src/components/beheer/NewsletterEditor.tsx:933 | "Of plan in voor later" | inkorten | "Later versturen" |
| src/components/beheer/NewsletterEditor.tsx:981 | "Testmail versturen naar mij" (4 woorden) | inkorten | "Testmail sturen" |
| src/components/beheer/NewsletterEditor.tsx:960/964 | "Desktop" / "Mobiel" | vervangen | "Computer" / "Mobiel" |
| src/app/(app)/beheer/communicatie/actions.ts:341/345/397/401 | "… voor je kunt versturen/inplannen." | vervangen | "voordat je kunt …" |

### 1.18 Beheer – E-mailtemplates / Pushtemplates

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/email-templates/page.tsx:13/75 · beheer-nav-items.ts:82 | "E-mailtemplates" | vervangen | "E-mailteksten" |
| src/app/(app)/beheer/email-templates/page.tsx:78-79 | "Inhoud van de mails die de app zelf verstuurt. Gebruik {{link}} op de plek waar de link moet komen." | inkorten | "Zet {{link}} waar de knop/link moet komen." (behouden-want: voorkomt kapotte mails) |
| src/app/(app)/beheer/email-templates/page.tsx:97 | "Pushtemplates" | vervangen | "Teksten pushmeldingen" |
| src/app/(app)/beheer/email-templates/page.tsx:98 | "Inhoud van de automatische pushmeldingen, per type." | schrappen | – |
| src/components/beheer/EmailTemplateForm.tsx:147 | "Inhoud (HTML)" | behouden-want | admin moet weten dat het HTML is |
| src/components/beheer/EmailTemplateForm.tsx:150 | "Afbeelding toevoegen (bv. logo of handtekening)" | inkorten | "Afbeelding toevoegen" |
| src/components/beheer/EmailTemplateForm.tsx:61 / AppSettingsForm.tsx:35 | "Uploaden" / "Logo uploaden" | behouden | – |

### 1.19 Beheer – Handmatig pushbericht / Verzonden meldingen / Statistieken

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/pushbericht/page.tsx:15 | "Verstuur direct een pushbericht naar alle actieve abonnementen - los van de automatische meldingen, en zonder de persoonlijke meldingsvoorkeuren van leden." | behouden-want / inkorten | "Gaat direct naar iedereen met pushmeldingen aan, ook wie dit soort meldingen heeft uitgezet." ("abonnementen") |
| src/components/beheer/PushBroadcastForm.tsx:39 | "Dit gaat direct naar alle abonnees." | vervangen | "Dit gaat direct naar alle leden met pushmeldingen aan." |
| src/components/beheer/PushBroadcastForm.tsx:16 | "Stuur pushbericht" | vervangen | "Versturen" |
| src/app/(app)/beheer/pushbericht/actions.ts:32 | "Pushmeldingen zijn niet geconfigureerd (VAPID-sleutels ontbreken)." | vervangen | "Pushmeldingen zijn nog niet ingesteld. Neem contact op met de beheerder." |
| src/app/(app)/beheer/pushbericht/actions.ts:44 | "Ophalen van pushabonnementen is niet gelukt." | vervangen | "Er ging iets mis. Probeer het opnieuw." |
| src/lib/email/send.ts:55 | "E-mail versturen is niet geconfigureerd (SMTP_HOST / EMAIL_FROM ontbreken)." | vervangen | "E-mail is nog niet ingesteld." (komt in InviteForm-melding terecht) |
| src/app/(app)/beheer/notificaties/page.tsx:49 | "Logboek van de {n} meest recente meldingen - per stuk te zien of ze als push en/of e-mail zijn verstuurd en geopend." | inkorten | "De laatste {n} meldingen." |
| src/app/(app)/beheer/notificaties/page.tsx:64 | tooltip "Niet beschikbaar: de eigen SMTP-mailbox levert geen open-tracking (dat vereiste eerder een Resend-webhook). Staat daarom altijd op n.v.t." | schrappen | kolom "E-mail geopend" weghalen (altijd n.v.t.) |
| src/app/(app)/beheer/notificaties/page.tsx:91 | "Nog geen meldingen." | behouden | – |
| src/app/(app)/beheer/statistieken/page.tsx:423 | "Belangrijkste cijfers over leden, community, activiteiten, e-mail en push." | schrappen | – (tabs tonen het) |
| src/app/(app)/beheer/statistieken/page.tsx:325/362 vs 327/347 | "Open rate" vs "Openingspercentage per maand" | vervangen | "Openingspercentage" |
| src/app/(app)/beheer/statistieken/page.tsx:363 | "Klik rate" | vervangen | "Klikpercentage" |
| src/app/(app)/beheer/statistieken/page.tsx:127/153 | "Likes" | vervangen | "Duimpjes" / "Vind ik leuk" (feed gebruikt "Leuk"/"Vind ik leuk") |
| src/app/(app)/beheer/statistieken/page.tsx:141/151/152/230 | "unieke views" / "Unieke views" / "Totale views" | vervangen | "Unieke lezers" / "Keer bekeken" (r.126/187 zeggen al "Unieke leden die bekeken") |
| src/app/(app)/beheer/statistieken/page.tsx:99/340 | "Actieve pushabonnementen" | vervangen | "Apparaten met pushmeldingen" |
| src/app/(app)/beheer/statistieken/page.tsx:342-343 | "Nieuwe abonnementen" / "Opgezegde abonnementen" | vervangen | "Pushmeldingen aangezet" / "… uitgezet" |
| src/app/(app)/beheer/statistieken/page.tsx:308 vs 398 | "Nog niks verstuurd." vs "Nog geen nieuwsbrieven verstuurd." | vervangen | "niets" (geen "niks") |
| src/app/(app)/beheer/statistieken/page.tsx:283/286/371/376 vs 361 | "Verzonden" / "Verzonden op" vs "Totaal verstuurd" | vervangen | overal "Verstuurd" |
| src/app/(app)/beheer/statistieken/page.tsx:44 | "Activiteitherinnering" | vervangen | "Herinnering activiteit" |
| src/app/(app)/beheer/statistieken/page.tsx:49-50 | "Bedrijfskoppeling ter goedkeuring" / "Bedrijfskoppeling-besluit" | vervangen | "Aanvraag collega" / "Besluit aanvraag collega" |
| src/app/(app)/beheer/statistieken/page.tsx:53 | "Activiteit-besluit" | vervangen | "Besluit activiteit" |
| src/app/(app)/beheer/statistieken/page.tsx:55 | "Handmatig pushbericht" | behouden | – |
| src/components/beheer/statistics/Charts.tsx:32/89 | "Nog geen gegevens in deze periode." | behouden | – |

### 1.20 Beheer – App-instellingen / Code voor de website

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/(app)/beheer/instellingen/page.tsx:17 | "Naam, logo en verenigingsnaam van het ledenportaal - zichtbaar voor alle leden." | schrappen | – |
| src/components/beheer/AppSettingsForm.tsx:103 | "Verschijnt in de zijbalk/mobiele header van de app én bovenaan elke verstuurde nieuwsbrief." | inkorten | "Staat in de app en bovenaan nieuwsbrieven." |
| src/components/beheer/AppSettingsForm.tsx:117 | "Browsertab, app-naam op het beginscherm, titel in e-mails." | inkorten | "Zichtbaar in de browser, op het beginscherm en in e-mails." |
| src/components/beheer/AppSettingsForm.tsx:124 | "Gebruikt in de voettekst van nieuwsbrieven en automatische e-mailmeldingen." | inkorten | "Staat onderaan e-mails." |
| src/components/beheer/AppSettingsForm.tsx:74 | "Terug naar het standaardlogo" | inkorten | "Standaardlogo" |
| src/app/(app)/beheer/embed-codes/page.tsx:106 | "Plak deze code in een HTML/iframe-blok op de openbare VOC-website (bijv. in Elementor) om het bijbehorende onderdeel daar te tonen." | inkorten | "Plak de code in een HTML-blok op de VOC-website." |
| src/app/(app)/beheer/embed-codes/page.tsx:13 | "Overzicht van goedgekeurde activiteiten, doorklikbaar naar aanmelden." | inkorten | "Activiteiten met aanmeldknop." |
| src/app/(app)/beheer/embed-codes/page.tsx:19 | "Aanmeldformulier voor nieuwe leden (komt bij Beheer > Instroom terecht)." | behouden | – (zegt waar aanvragen landen) |
| src/app/(app)/beheer/embed-codes/page.tsx:29 | "Overzicht van bedrijven die opt-in zijn voor de openbare bedrijvengids (zie Instellingen)." | vervangen | "Bedrijven die zichtbaar willen zijn op de website." ("opt-in") |
| src/app/(app)/beheer/embed-codes/page.tsx:124-145 | ca. 250 woorden over iframe, height, optimalisatieplugin, ?thema=website, Open Sans, rect.top - 100 - 20, embed.js, CSP … | schrappen | Eén zin behouden: "Plak de hele code, inclusief het script, in één HTML-blok." Rest naar technische documentatie |
| src/app/(app)/beheer/embed-codes/page.tsx:146-152 | "De "Delen"-knop op een activiteit deelt naar de echte website … environment variable MARKETING_AGENDA_URL op Vercel …" | schrappen | – (ontwikkelaarsinfo) |
| src/components/beheer/CopyEmbedCode.tsx:33 | "Kopiëren" / "Gekopieerd" | behouden | – |
| src/components/beheer/beheer-nav-items.ts:84 | "Code voor de website" | behouden | – (goed: geen "embed") |

### 1.21 Embeds (openbare website)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/app/embed/agenda/page.tsx:156-158 | "De Veendammer OndernemersCompagnie organiseert het hele jaar door activiteiten … er is voor ieder wat wils." | behouden | marketingtekst op website (naam vereniging, zie §3) |
| src/app/embed/agenda/page.tsx:161-162 | "Alle activiteiten zijn bedoeld om ondernemers samen te brengen … Aanmelden is verplicht in verband met de organisatie." | inkorten | "Aanmelden is verplicht." (1e zin herhaalt de alinea erboven) |
| src/app/embed/agenda/page.tsx:167 | "Er zijn momenteel geen activiteiten gepland." | behouden | – |
| src/app/embed/agenda/[id]/page.tsx:140 | "Deze activiteit heeft al plaatsgevonden." | behouden | – |
| src/components/embed/MemberOrVisitorRegistration.tsx:108 | "Al ingelogd op deze browser? Klik hier" | vervangen | "Ik ben al lid – inloggen" ("Klik hier") |
| src/components/embed/MemberOrVisitorRegistration.tsx:120/140 | "Log in om je aan te melden" (5 woorden) | inkorten | "Inloggen als lid" |
| src/components/embed/MemberOrVisitorRegistration.tsx:123/143 | "Kon geen toegang krijgen - gebruik de knop hierboven." | vervangen | "Lukt het niet? Gebruik de knop hierboven." |
| src/components/embed/MemberOrVisitorRegistration.tsx:126 | "Meld je aan als bezoeker" | behouden | – |
| src/components/embed/MemberOrVisitorRegistration.tsx:135 | "Deze activiteit is alleen voor leden." | behouden | – |
| src/components/embed/PublicRegistrationForm.tsx:29 | "Bedankt voor je aanmelding! Tot dan." | behouden | – |
| src/app/embed/agenda/actions.ts:61 | "Aanmelden is niet gelukt. Mogelijk staat deze activiteit niet (meer) open voor aanmelden." | behouden | – |
| src/app/embed/aanmelden/page.tsx:8 | metadata "Aanmelden bij de VOC" | vervangen | "Lid worden van de VOC" (aanmelden = activiteit) |
| src/app/embed/aanmelden/page.tsx:36 | "Laat je gegevens achter en het bestuur neemt contact met je op." | behouden | – |
| src/app/embed/bedrijven/BedrijvenEmbedList.tsx:82 | "Pas je zoekopdracht of filter aan." | schrappen | – |
| src/app/embed/bedrijven/BedrijvenEmbedList.tsx:77 | "Meer tonen ({n})" | behouden | standaard voor "meer" |
| src/components/embed/CompanyDetailContent.tsx:111-113 | "Log in voor meer info." | behouden | – |
| src/components/embed/ShareActivityButton.tsx:98 | "Delen" / "Link gekopieerd" | behouden | – |
| src/app/embed/agenda/page.tsx:14 · [id]/page.tsx:20 · bedrijven/page.tsx:10 | metadata "VOC Agenda" / "VOC Bedrijvengids" | vervangen | "VOC-agenda" / "VOC-bedrijvengids" |

### 1.22 Algemene toasts/fouten (gedeeld)

| Locatie | Huidige tekst | Advies | Voorgestelde vervanging |
|---|---|---|---|
| src/lib/ui/UnsavedChangesContext.tsx:26 | "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?" | behouden-want | voorkomt dataverlies |
| src/components/ui/ErrorContent.tsx:17 | "Het is niet gelukt om deze pagina te laden." | behouden | – |
| src/lib/validation/fields.ts:13 | "Vul een volledige link in, beginnend met https://" | behouden | – |
| src/lib/supabase/upload.ts:47 | "Alleen PNG, JPEG, WebP, SVG of AVIF-afbeeldingen zijn toegestaan (kreeg: {type})." | inkorten | "Kies een foto (JPG, PNG of WebP)." |
| diverse actions.ts | "{X} is niet gelukt. Probeer het opnieuw." | behouden | consequent, goed |

---

## 2. Terminologie

Tellingen zijn gebaseerd op een extractie van gebruikerszichtbare strings in `src/app`, `src/components` en `src/lib` (excl. commentaar); ± enkele door variabelen.

| Term(en) | Aantal | Voorbeelden (file:line) | Voorstel |
|---|---|---|---|
| **activiteit** vs evenement | activiteit ~103; evenement 0 (alleen branche "Horeca & Evenementen") | – | Goed: houd **activiteit**. Wel: type-naam inconsistent: "Activiteit" (ActivityForm.tsx:209) vs "VOC-activiteit" (NewActivityFlow.tsx:30) vs filter "Activiteiten" (agenda/page.tsx:19) → overal **VOC-activiteit** / **Externe activiteit**. |
| **lid** vs gebruiker | lid overal; gebruiker 0 | – | Goed. "Account" alleen voor inloggen/verwijderen. |
| **bedrijf** vs organisatie | bedrijf overal; organisatie 1 (embed/agenda/page.tsx:162, andere betekenis) | – | Goed. Wel: **bedrijfsprofiel / bedrijfsgegevens / bedrijfspagina / Bedrijf bewerken**: Sidebar.tsx:68 "Mijn bedrijfsprofiel", profiel/page.tsx:72 "Bedrijfsgegevens bewerken", bewerken/page.tsx:21 metadata "Bedrijf bewerken", instellingen:104 "bedrijfspagina", beheer/bedrijven:12 "Bedrijfsprofiel" → **Bedrijfsprofiel** (bekijken) en **Bedrijf bewerken** (bewerken). |
| **melding** vs notificatie; melding = rapportage | melding ~56 (notificatie 0 zichtbaar; route `/notificaties`) | Notificatie-betekenis: notificaties/page.tsx:31, instellingen:75. Rapportage-betekenis: ReportPostOverlay.tsx:57 "je melding is verstuurd", ReportRow.tsx:103 "Melding afwijzen", beheer/page.tsx:215 "aanvragen, inzendingen en meldingen" | **melding** = alleen notificatie. Voor gerapporteerde berichten: **rapportage** / "gemeld bericht" (beheer gebruikt al "rapportages", "Moderatie"). |
| **pushmelding / pushbericht / push** | push* ~38 | "Pushmelding versturen" ActivityForm.tsx:438; "Push versturen" ApproveActivityForm.tsx:40; "Handmatig pushbericht" pushbericht/page.tsx:14; tab "Push" statistieken:26; keuze "Push" NotificationChannelChoice.tsx:18; "Leden met push" statistieken:100; "abonnementen/abonnees" pushbericht/page.tsx:15, PushBroadcastForm.tsx:39 | **pushmelding** overal (ook in beheer: "Pushmelding versturen"); keuzeknop mag "Push" blijven naast "E-mail". "Abonnement/abonnee" vervangen door "leden/apparaten met pushmeldingen". |
| **e-mail vs mail** | e-mail ~31; "Mail" 1; "mails" 1 | NotificationChannelChoice.tsx:19 "Mail"; email-templates/page.tsx:78 "mails"; LoginForm.tsx:70 "in je mail" | **E-mail** in labels; "mail" alleen in lopende tekst acceptabel. |
| **nieuwsbrief vs communicatie** (campagne 0) | communicatie 6; nieuwsbrief ~30 | nav-groep "Communicatie" (beheer-nav-items.ts:50), "Nog geen communicatie" (communicatie/page.tsx:51), "Alle communicatie" (beheer/page.tsx:429), "algemene e-mailcommunicatie" (communicatie/page.tsx:34), "Communiceer over deze activiteit" (ActivityDetailContent.tsx:359) | **nieuwsbrief** voor het ding; "Communicatie" alleen als nav-groepnaam. Prop `email_campaigns` niet zichtbaar – OK. |
| **verzenden vs versturen vs publiceren** | versturen/verstuurd ~56; verzenden/verzonden ~18; publiceren 4 | Verzonden: communicatie/page.tsx:70, CommunicationRow.tsx:100, statistieken:283/286/360/371/376, notificaties/page.tsx:10 ("Verzonden meldingen"), CompanyMembershipForm.tsx:35 ("Aanvraag verzonden"). Verstuurd: InvitationList.tsx:79, notificaties/page.tsx:59/61, statistieken:361 (naast "Verzonden nieuwsbrieven" op hetzelfde scherm!) | **versturen / verstuurd** overal (meest gebruikt). **publiceren** alleen voor activiteiten in de agenda zetten (ActivityForm:432, NewActivityFlow:31); nieuws: "Plaatsen" is OK. |
| **verwijderen vs deactiveren** | verwijder ~60; deactiv 13 | "Account verwijderen" (instellingen:157, DeleteAccountButton.tsx:21) doet feitelijk: "Je account wordt direct gedeactiveerd; persoonsgegevens worden na 90 dagen automatisch gewist" (instellingen:159) en is binnen 90 dagen terug te draaien; terwijl "Lid verwijderen" (DeleteMemberButton.tsx:17) direct en onomkeerbaar wist. MemberActiveToggle.tsx:32 zegt "verwijderd", DeleteAccountButton.tsx:18 "gewist". | Voor leden: **Account opzeggen** (zelf, 90 dagen bedenktijd) vs **Lid verwijderen** (beheer, direct) vs **Deactiveren** (beheer, tijdelijk). Gebruik "gewist" voor persoonsgegevens, consequent. |
| **opslaan vs bewaren** | Opslaan overal (knoppen); "bewaren" 2× alleen in AVG-toestemming (AccessRequestForm.tsx:151, toegang-aanvragen/actions.ts:29) | – | Goed. Toasts: "Opgeslagen." overal, behalve RoleEditor.tsx:69 "Rol bijgewerkt." en CompanyMembershipForm.tsx:36 "Bedrijfskoppeling opgeslagen." → "Opgeslagen." |
| **aanmelden (activiteit) vs aanmelden (lid worden) vs inloggen** | aanmeld ~48; inlog ~34 | Activiteit: RegisterButton.tsx:68, agenda/actions.ts:90. Lid worden: embed/aanmelden/page.tsx:8 "Aanmelden bij de VOC", embed-codes/page.tsx:17-19 kind "aanmelden" / "Aanmeldformulier voor nieuwe leden", beheer/page.tsx:183 "Nieuwe aanmeldingen deze maand" (= nieuwe leden). Push: PushToggle.tsx:43 "Aanmelden is niet gelukt.", profiel/actions.ts:111. Inloggen-als-"log in": MemberOrVisitorRegistration.tsx:120 "Log in om je aan te melden", CompanyDetailContent.tsx:111 "Log in". | **aanmelden** = alleen voor activiteiten. Lid worden: **lid worden / toegang aanvragen**. Push: **aanzetten**. Inloggen: **inloggen** (werkwoordknop), "Log in" alleen in zinnen. |
| **bewerken vs aanpassen vs wijzigen** | – | "Profiel bewerken" (profiel/page.tsx:43, AdminEditProfile.tsx:21) vs "Profiel aanpassen" (MemberProfileContent.tsx:136/146); "Bedrijf wijzigen" (CompanyMembershipForm.tsx:49) = ander bedrijf kiezen; "Rol wijzigen" | **bewerken** voor gegevens; **wijzigen** voor een keuze (rol, bedrijf, e-mailadres). |
| **goedkeuring: inzending / indienen / aangeleverd / toegevoegd** | inzending 3; indienen 1; aangeleverd 1; toegevoegd 1 | ActivityDetailContent.tsx:215 "Toegevoegd door", BeheerAgendaContent.tsx:200 "Aangeleverd door", ActivityDetailContent.tsx:384 "inzending", NewActivityFlow.tsx:70 "Indienen ter goedkeuring", RejectActivityForm.tsx:9 "inzending", beheer/page.tsx:215 "inzendingen" | **Ingediend door** / **indienen**; status **Ter goedkeuring**. "Inzending" vermijden. |
| **status-namen activiteit** | – | Goedgekeurd / Ter goedkeuring / Afgewezen / Afgelast (BeheerAgendaContent.tsx:37-40) – consistent; "wacht nog op een besluit" (ActivityDetailContent.tsx:327) | Houd vier statussen; detailtekst → "Wacht op goedkeuring". |
| **status wachtlijst** | – | "Wachtlijst" (page.tsx:137), "Op de wachtlijst" (page.tsx:185, ActivityCard.tsx:71, RegisterButton.tsx:67 als knop), "op wachtlijst" (ActivityDetailContent.tsx:232) | Status: **Op wachtlijst**; knop: **Op wachtlijst zetten**. |
| **status nieuwsbrief** | – | Lijst: "Concept / Verzonden / Verzending onderbroken / Ingepland" (CommunicationRow.tsx:99-102); detail: "Verzonden - alleen-lezen / Verzenden gedeeltelijk mislukt / Ingepland / Concept" (communicatie/[id]/page.tsx:72-77) | **Concept / Ingepland / Verstuurd / Deels verstuurd**. |
| **status uitnodiging** | – | "Niet verstuurd / Verstuurd / Verlopen" + "Verlengd / Ingetrokken" (InvitationList.tsx:78-80,154,163) | Goed; knoppen in infinitief. |
| **adres/plaats** | Bezoekersadres 6; bezoekadres 3; Vestigingsplaats 2; Plaats 2; Plaatsnaam 1 | CompanyForm.tsx:257 vs CompanyBillingForm.tsx:68; CompanySelector.tsx:58 vs CompanyBillingForm.tsx:111 vs AccessRequestForm.tsx:84 | **Bezoekadres**, **Plaats**. |
| **telefoon vs telefoonnummer** | Telefoon 3 labels; Telefoonnummer 5 | MemberQuickEditForm.tsx:74, CompanyQuickEditForm.tsx:93, BulkImportForm.tsx:15 vs ProfileForm.tsx:153, CompanyForm.tsx:282 | **Telefoonnummer** in formulieren. |
| **"meer" knoppen** | – | "Meer weergeven" (CompanyHeader.tsx:84, PostCard.tsx:262/415, MemberProfileContent.tsx:157), "Lees meer" (ExpandableText.tsx:25), "Meer tonen" (BedrijvenEmbedList.tsx:77), "Toon meer (n resterend)" (InvitationList.tsx:202), "Alles bekijken" (NotificationCenter.tsx:127), "Bekijk alles" (beheer/page.tsx:~314) | Tekst uitklappen: **Lees meer / Minder**; lijst aanvullen: **Meer tonen**; naar overzicht: **Alles bekijken**. |
| **bestuur/beheer** | 4 | bewerken/page.tsx:61, beheer/page.tsx:191, ReportPostOverlay.tsx:57, CompanyMembershipForm.tsx:35 ("bestuur/beheerder"), NewActivityFlow.tsx:59 "bestuur of beheer" | Voor leden: **het bestuur** (rol "beheerder" is voor leden niet relevant). |
| **knoplabels: infinitief vs gebiedende wijs** | – | Gebiedend: "Verstuur e-mail", "Kopieer link", "Verleng met 14 dagen" (InvitationRow.tsx:52/60/67), "Verstuur"/"Verleng" (InvitationList.tsx:149/158), "Stuur inloglink" (LoginForm.tsx:109), "Verstuur resetlink" (ForgotPasswordForm.tsx:15), "Stuur pushbericht" (PushBroadcastForm.tsx:16), "Annuleer planning" (NewsletterEditor.tsx:900), "Ververs" (NewsletterEditor.tsx:377), "Verleng alle met 14 dagen" (instroom/page.tsx:89), "Bevestig goedkeuren" (ApproveActivityForm.tsx:54) | Meerderheid is infinitief ("Opslaan", "Verwijderen", "Versturen"): **infinitief overal**. |
| **Engelse/technische termen zichtbaar** | – | template(s) (email-templates/page.tsx:13/75/97), Pre-header (NewsItemForm.tsx:58, NewsletterEditor.tsx:765), embed (instroom/page.tsx:124, ActivityDetailContent.tsx:292, embed-codes:124-145), iframe/HTML/CSP/URL/Vercel/environment variable (embed-codes:106-152), opt-in (embed-codes:29), CSV (instroom:136, BulkImportForm.tsx:58), Open rate / Klik rate / Likes / views (statistieken), Desktop (NewsletterEditor.tsx:960), social-links / Social media (NewsletterEditor.tsx:797, CompanyForm.tsx:206), feed/community-feed (beheer/nieuws:36, rapportages:102, FeedList:208, ReportRow:73, beheer/page:403), dashboard (beheer/nieuws:36), updates (FeedList:208, nieuws/page:39), reset(link) (ForgotPasswordForm:15, wachtwoord-instellen/actions:25), SMTP/Resend-webhook/open-tracking (notificaties/page.tsx:64), VAPID (pushbericht/actions.ts:32), SMTP_HOST/EMAIL_FROM (lib/email/send.ts:55), database (register/[token]/page.tsx:26), geïnitialiseerd (register/page.tsx:22), MIME-types "kreeg: …" (upload.ts:47, uploadDocument.ts:28), ruwe `error.message` (6 plekken). Goed: geen "token", "slug", "RLS", "cron", "broadcast" of ".ics" zichtbaar ("broadcast" alleen als interne key → "Handmatig pushbericht"). | Zie tabellen §1 voor vervangingen. "Community" als paginanaam is ingeburgerd – behouden; "feed" → "Community". |
| **'m (informeel)** | 6 | NewActivityFlow.tsx:59, CompanyMembershipForm.tsx:35, AccessRequestRow.tsx:79, NewsletterEditor.tsx:626/912, embed-codes:126 | "hem" of zin herschrijven. |
| **bv. / bijv. / Bv. / Bijvoorbeeld** | – | "bijv." (embed-codes:106, instroom:110, ActivityDetailContent:355), "bv." (EmailTemplateForm:150, NewsletterEditor:366/520), "Bv." (ActivityForm:271/313), "Bijvoorbeeld:" (AccessRequestForm:144) | **bijv.** (of uitschrijven). Ook "i.p.v." (instroom:156, embed-codes:133) vermijden. |
| **Komende / Aankomende / Eerstvolgende** | 5 | beheer/page.tsx:324 "Komende", :354 "aankomende", statistieken:103 "Aankomende", page.tsx:146 "Eerstvolgende" (andere betekenis, OK) | **Komende activiteiten**. |

---

## 3. Spelling, grammatica en hoofdletters

| Locatie | Probleem | Correctie |
|---|---|---|
| src/app/(app)/beheer/communicatie/actions.ts:37, :175 · src/components/beheer/NewsletterEditor.tsx:787 | Naam vereniging: "Veendammer Ondernemer Compagnie" | Kies één officiële schrijfwijze. Nu 3 varianten: "Veendammer Ondernemer Compagnie" (3×), "Veendammer Ondernemers Compagnie" (lib/settings/app-settings.ts:20, lib/newsletter/render.ts:230), "Veendammer OndernemersCompagnie" (embed/agenda/page.tsx:156, AccessRequestForm.tsx:150 – juridische tekst!) |
| src/app/(app)/agenda/page.tsx:102 · NewActivityFlow.tsx:55 | "Agenda activiteit toevoegen" – samenstelling los geschreven | "Agenda-activiteit" of beter "Activiteit toevoegen" |
| src/app/embed/agenda/page.tsx:14 · embed/agenda/[id]/page.tsx:20 · embed/bedrijven/page.tsx:10 · embed/bedrijven/[slug]/page.tsx:13 · lib/settings/app-settings.ts:19 | "VOC Agenda", "VOC Bedrijvengids", "VOC Ledenportaal" – afkorting + woord zonder koppelteken | "VOC-agenda", "VOC-bedrijvengids", "VOC-ledenportaal" (vgl. correct "VOC-logo", "VOC-activiteit") |
| src/app/(app)/privacy/page.tsx:44 | "Terug naar Instellingen" – hoofdletter midden in zin (elders "Terug naar agenda") | "Terug naar instellingen" |
| src/app/(app)/beheer/statistieken/page.tsx:363 | "Klik rate" – Engels en los geschreven | "Klikpercentage" |
| src/app/(app)/beheer/statistieken/page.tsx:325, :362 | "Open rate" | "Openingspercentage" |
| src/app/(app)/beheer/instroom/page.tsx:89 | "Verleng alle met 14 dagen" – "alle" zonder zelfstandig naamwoord | "Alles verlengen met 14 dagen" / "Alle uitnodigingen verlengen" |
| src/app/(app)/beheer/communicatie/actions.ts:341, :345, :397, :401 | "voor je kunt versturen/inplannen" – "voor" als voegwoord is spreektaal | "voordat je kunt …" |
| src/components/agenda/ActivityForm.tsx:80, :85 · CancelActivityButton.tsx:66 · agenda/actions.ts:359 | "Aangemelden" / "aangemelden" – ongebruikelijk zelfstandig gebruik | "deelnemers" |
| src/components/members/MemberProfileContent.tsx:125 · src/components/beheer/ProspectRow.tsx:26 · lib/format/date.ts:51-55 | Hoofdletter na dubbele punt ("Laatst actief: Vandaag", "Laatst aangemeld: Gisteren") | kleine letter: "Laatst actief: vandaag" |
| src/app/(app)/beheer/statistieken/page.tsx:50, :53 · instroom/page.tsx:156 · instellingen/page.tsx:142 | Onnodige koppeltekens: "Bedrijfskoppeling-besluit", "Activiteit-besluit", "activiteit-aanmelding(en)" | "Besluit bedrijfskoppeling", "Besluit activiteit", "aanmeldingen voor activiteiten" |
| src/app/(app)/beheer/statistieken/page.tsx:44 | "Activiteitherinnering" – correct maar moeilijk leesbaar | "Herinnering activiteit" |
| src/app/(app)/beheer/page.tsx:382 | "Profiel incompleet" – "incompleet" is spreektaal | "Profiel onvolledig" |
| src/app/(app)/beheer/statistieken/page.tsx:308 | "Nog niks verstuurd." – spreektaal (elders "niets") | "Nog niets verstuurd." |
| src/components/beheer/NewsletterEditor.tsx:797-798 · CompanyForm.tsx:206 | "social-links", "Social media" | "sociale media" |
| src/app/(app)/agenda/actions.ts:359 · beheer/instroom/page.tsx (BulkImportForm.tsx:146) · Sidebar.tsx:90 · nav-items.ts:33 | "aanmelding(en)", "rij(en)", "melding(en)" – haakjesmeervoud | Enkelvoud/meervoud per aantal kiezen (zoals AttendeeList.tsx al doet) |
| src/components/agenda/AttendeeList.tsx:99 | "Vink af wie er daadwerkelijk was" – "afvinken" kan zowel aan- als uitvinken betekenen | "Vink aan wie er was" |
| src/components/agenda/RegisterButton.tsx:67 | Knop "Op de wachtlijst" is een status, geen werkwoord | "Op wachtlijst zetten" |
| src/components/beheer/NewsletterEditor.tsx:653 | Onjuiste uitspraak: "Dit kan niet ongedaan worden gemaakt." bij inplannen, terwijl "Planning annuleren" bestaat (r.671) | zin schrappen |
| src/app/account-gedeactiveerd/page.tsx:15 | "tijdelijk stopgezet" – na 90 dagen worden gegevens gewist, dus niet per se tijdelijk | "stopgezet" |
| src/app/(app)/bedrijven/[id]/bewerken/page.tsx:61 | Inhoudelijk onjuist: bedrijfsprofiel is zichtbaar voor alle leden (en evt. openbaar), niet alleen "voor leden van dit bedrijf en bestuur/beheer" | verplaatsen naar sectie Factuurgegevens |
| src/components/search/SearchForm.tsx:31 | Placeholder "Zoek in leden, bedrijven en documenten…" – onvolledig (zoekt ook activiteiten en berichten, zie zoeken/page.tsx:55) | "Zoek leden, bedrijven, activiteiten…" |
| src/app/(app)/beheer/embed-codes/page.tsx:136 | "gescrold" – correct volgens Woordenlijst, maar hele alinea schrappen | – |
| Algemeen (o.a. instellingen:76, instroom:110-115, embed-codes:124-145, RegisterButton:72, FeedList, MemberRowMenu) | " - " (spatie-streepje-spatie) als gedachtestreep/puntkomma in lopende zinnen; maakt zinnen lang | Zin splitsen met punt, of "–" (en-dash) |
| src/components/feed/ReportPostOverlay.tsx:89 | Placeholder "Optionele toelichting…" terwijl label bij "Anders" "(verplicht)" toont – tegenstrijdig | placeholder schrappen of dynamisch maken |

---

## 4. Tellingen

- Beoordeelde tekstregels in tabellen §1: **317** (22 onderdelen).
- Advies **schrappen**: 40 · **inkorten**: 69 · **vervangen**: 109 · **behouden-want**: 32 (privacy/veiligheid/onomkeerbaar; een deel gecombineerd met "inkorten") · **behouden**: 80. (Gecombineerde adviezen tellen in beide categorieën.)
- Inconsistente termen/varianten (§2): **24** terminologiegroepen.
- Spelling/grammatica/hoofdletters (§3): **25** punten (o.a. 3 schrijfwijzen van de verenigingsnaam).
- Technische/Engelse termen zichtbaar voor gebruikers: ≈ **35** plekken; ruwe `error.message` in **6** foutmeldingen.
