# VOC Ledenportaal

Besloten community- en ledenportaal voor de Veendammer OndernemersCompagnie (VOC), gebouwd als
Progressive Web App met Next.js (App Router) en Supabase.

> **Status:** Fase 7 — Beheeromgeving. Bovenop de fundering (fase 1), profielen/bedrijven/ledenlijst
> (fase 2), de community-feed (fase 3) en de agenda (fase 4) heeft het portaal nu ook: een
> notificatiecentrum met web push (fase 5), een documentenbibliotheek met categorieën en
> upload/downloadrechten (fase 6), en een `/beheer`-dashboard met kengetallen en snelkoppelingen plus
> de mogelijkheid voor een beheerder om een lid te (de)activeren (fase 7). Alleen fase 8
> (PWA-afwerking: installability, offline, performance, Capacitor) staat nog open.

## Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Supabase**: Postgres, Auth, Storage, Row Level Security
- **Tailwind CSS v4** met de VOC-huisstijl (`#E8000F`) als thema
- **Web Push**: live sinds fase 5 (VAPID + service worker + Vercel Cron dispatch)
- **PWA / Capacitor**: architectuur is hierop voorbereid, installability/offline/performance volgen in fase 8

## Projectstructuur

```
src/
  app/
    (app)/            # Beveiligde app-shell: feed, agenda, leden, bedrijven, documenten,
                       # notificaties, profiel, beheer
    login/             # Inloggen
    register/           # Eerste account aanmaken (alleen zolang er nog geen profiel bestaat)
    register/[token]/  # Registreren via een uitnodigingslink
    auth/confirm/       # Callback voor e-mailbevestiging (Supabase Auth)
    embed/agenda/       # Publieke, navigatieloze pagina voor de WordPress-iframe
    api/cron/           # Vercel Cron-endpoints (agenda-herinneringen, push-dispatch)
  components/
    layout/            # AppShell, Sidebar (desktop), BottomNav (mobiel), header
    ui/                # Kleine herbruikbare UI-bouwstenen (Button, Input, Avatar, Logo, …)
    feed/, auth/, invitations/
  lib/
    supabase/          # Browser-, server- en middleware-clients
    auth/               # Sessie-/rolhelpers (server-only) en de logout-action
    types/database.ts  # Handgeschreven type-spiegel van het Supabase-schema
supabase/
  migrations/          # SQL-migraties (schema + RLS + storage policies)
  seed.sql             # Eenmalige bootstrap-uitnodiging voor de eerste beheerder
```

## Lokale ontwikkeling

### 1. Installeren

```bash
npm install
```

### 2. Supabase-project

Maak een gratis project aan op [supabase.com](https://supabase.com) (of gebruik de lokale Supabase
CLI). Kopieer daarna de environment variables:

```bash
cp .env.local.example .env.local
```

Vul `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` in (Project Settings → API). Zet
**nooit** de `service_role`-key in een `NEXT_PUBLIC_*`-variabele of in clientcode — deze app heeft
die key niet nodig; alle autorisatie loopt via Row Level Security.

In **Authentication → Providers → Email** raden we aan **"Confirm email"** uit te zetten voor deze
besloten omgeving: een account is alleen te maken via een geldige uitnodigingslink, dus e-mail
bevestigen is een extra stap die weinig toevoegt. Laat je het wél aan staan, dan werkt de
bevestigingsflow via `/auth/confirm` (zorg dat de Supabase e-mailtemplate linkt naar
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`).

Voor **"Wachtwoord vergeten"** (via `/wachtwoord-vergeten`) moet de **"Reset Password"**
e-mailtemplate in Supabase linken naar
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord-instellen`.

Voor **"E-mailadres wijzigen"** (op het profielscherm) gebruikt Supabase standaard de
**"Change Email Address"**-template naar zowel het oude als het nieuwe adres (afhankelijk van of
"Secure email change" aan staat in Authentication → Settings); die hoeft niet aangepast te worden
tenzij je 'm wilt aanpassen aan de huisstijl.

### 3. Database-migraties

Voer de migraties uit tegen je project, bijvoorbeeld met de Supabase CLI:

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

Of plak de inhoud van `supabase/migrations/0001_init.sql` en `0002_storage.sql` (in die volgorde)
in de SQL Editor van het Supabase dashboard.

### 4. Eerste beheerder aanmaken

Profielen ontstaan normaal alleen via een geldige uitnodiging (zie `handle_new_user()` in
`0001_init.sql`). Voor het allereerste account op een verse installatie is dat niet werkbaar —
er is dan nog niemand om een uitnodiging te versturen — dus `0003_bootstrap_first_admin.sql`
opent een eenmalig token-vrij pad:

1. Voer ook `supabase/migrations/0003_bootstrap_first_admin.sql` uit (na 0001 en 0002).
2. Open `http://localhost:3000/register` (géén token in de URL) en maak het account aan. Zolang
   `public.profiles` leeg is, wordt dit account automatisch **beheerder**.
3. Zodra dit account bestaat, sluit deze pagina zichzelf af (`has_any_profiles()` geeft `true`) —
   zowel de UI als de trigger zelf weigeren daarna elke token-vrije registratie. Nieuwe leden gaan
   vanaf dan altijd via een échte uitnodigingslink.
4. Vanaf nu kan deze beheerder via **Uitnodigingen** (in de sidebar) nieuwe leden, bestuursleden of
   beheerders uitnodigen.

`supabase/seed.sql` (een handmatig gezaaide uitnodiging) werkt nog steeds als alternatief, maar is
met de bootstrap-route hierboven niet meer nodig.

### 5. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variabele | Verplicht | Omschrijving |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ja | Supabase project-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Supabase anon/public key |
| `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | fase 5 | Web Push-sleutels |

## Database & beveiliging

- **Rollen**: `lid`, `bestuurslid`, `beheerder` (enum `user_role`). Een bestuurslid heeft **niet**
  automatisch beheerdersrechten — dat wordt afgedwongen in Postgres zelf, niet alleen in de UI:
  - `public.is_board()` / `public.is_admin()`: `security definer`-functies die de rol van de
    ingelogde gebruiker opzoeken en overal in RLS-policies worden hergebruikt.
  - Een trigger (`profiles_guard_privileges`) blokkeert dat een lid via een eigen profielupdate
    zijn `role` of `is_active` aanpast — alleen een beheerder-update mag dat.
  - Uitnodigingen voor de rol `bestuurslid`/`beheerder` mogen alleen door een beheerder worden
    aangemaakt (afgedwongen in de `WITH CHECK`-clausule van de insert-policy).
- **Uitnodigingen**: een account aanmaken kan uitsluitend met een geldig, niet-verlopen
  uitnodigingstoken. De registratiepagina en de bedrijvenzoekfunctie voor niet-ingelogde bezoekers
  gebruiken smalle `security definer`-functies (`get_invitation_preview`,
  `search_companies_for_signup`) die nooit de onderliggende tabellen blootleggen aan `anon`.
- **RLS overal aan**: elke tabel heeft Row Level Security ingeschakeld met expliciete policies per
  rol; er is geen tabel die "open" staat voor de frontend.
- **Storage**: alle buckets (`avatars`, `company-logos`, `feed-media`, `documents`) zijn privé.
  Bestanden zijn nooit via een kale publieke URL te benaderen — toegang loopt via dezelfde
  rolgebaseerde policies als de databasetabellen, met het eigenaar-ID als eerste mappad-segment
  (bijv. `avatars/<profile_id>/foto.png`).

## Architectuurkeuzes (fase 1)

- **Volledig schema vanaf het begin**: alle tabellen uit de opdracht (`profiles`, `companies`,
  `company_members`, `invitations`, `activities`, `activity_registrations`, `feed_posts`,
  `feed_comments`, `feed_likes`, `feed_attachments`, `documents`, `notifications`,
  `push_subscriptions`) staan al in `0001_init.sql`, inclusief RLS. Zo hoeven latere fases geen
  breaking schema-wijzigingen te doen — alleen functionaliteit toe te voegen.
- **`(app)` route group**: bundelt alle beveiligde schermen achter één `layout.tsx` die
  `requireProfile()` aanroept en de responsive `AppShell` (sidebar op desktop, bottom nav + header
  op mobiel) rendert. Publieke routes (`/login`, `/register/[token]`) vallen hierbuiten.
- **Server Actions i.p.v. API-routes** voor login, registratie en het aanmaken/intrekken van
  uitnodigingen — minder boilerplate, en de Supabase server-client (die cookies leest/schrijft)
  past hier natuurlijk bij.
- **Proxy** (`src/proxy.ts`, met de sessielogica in `src/lib/supabase/middleware.ts`) ververst de
  Supabase-sessie op elk request en stuurt niet-ingelogde bezoekers naar `/login`. Next.js 16 heeft
  het bestand "middleware.ts" hernoemd naar "proxy.ts"; dit project gebruikt al de nieuwe naam.
- **Community feed als home**: `/` toont direct de feed (leeg in fase 1, want berichten plaatsen is
  fase 3) in plaats van een dashboard — conform het uitgangspunt dat dit een community-app is, geen
  ledenadministratie.
- **Handgeschreven `Database`-type** (`src/lib/types/database.ts`) is 1-op-1 gestructureerd zoals de
  output van `supabase gen types typescript`, zodat het straks zonder codewijzigingen te vervangen
  is door een gegenereerd bestand.
- **Signed URLs voor profielfoto's en logo's** (`src/lib/supabase/storage.ts`): omdat alle
  Storage-buckets privé zijn, wordt `avatar_url`/`logo_url` als een pad opgeslagen
  (`avatars/<profile_id>/<bestand>`), en genereert elke Server Component die een afbeelding toont
  er zelf een kortlevende (1 uur) signed URL voor. Geen publieke URL's, geen aparte
  cache-invalidatie nodig.
- **Feed-realtime via Postgres Changes, niet via optimistic-only state** (`FeedList.tsx`):
  nieuwe berichten/reacties komen bij *alle* kijkers binnen via een Supabase Realtime-subscription
  op `feed_posts`/`feed_comments` (aangezet in `0005_feed_realtime.sql`). Bij een INSERT-event wordt
  de volledige, gehydrateerde rij (met signed URL's) via een server action opgehaald — de
  Postgres-changes-payload zelf bevat alleen de kale rij, geen joins. De auteur van een nieuw
  bericht ziet het ook direct via de return-waarde van de post-actie (dus niet afhankelijk van een
  werkende websocket-verbinding); reacties en likes verschijnen bij de auteur zelf via diezelfde
  realtime-laag als bij ieder ander.
- **Reacties triggeren een notificatie, likes niet** (`notify_on_feed_comment()` in
  `0005_feed_realtime.sql`): een database-trigger — niet applicatiecode — schrijft een rij naar
  `notifications` zodra iemand op jouw bericht reageert (nooit bij een reactie op je eigen bericht).
  Dit is bewust in de database gelegd zodat het ook werkt ongeacht welke client de reactie plaatst.
  Het volledige notificatiecentrum (ongelezen-teller, voorkeuren, push) volgt in fase 5.
- **Activiteiten zijn publiek leesbaar** (`activities_public_select` in `0008_agenda.sql`): bewust
  een uitzondering op het "besloten community"-uitgangspunt, omdat `/embed/agenda` zonder sessie
  moet kunnen laden op de publieke WordPress-site. Wie zich aanmeldt blijft wél alleen zichtbaar
  voor leden (`activity_registrations` bleef ongewijzigd members-only).
- **Deadline en maximum aantal deelnemers worden in de database afgedwongen**
  (`enforce_activity_registration_rules()` in `0001_init.sql`, `for update`-lock op de activiteit),
  niet in de server action — zo kan een race tussen twee gelijktijdige aanmeldingen het maximum
  nooit overschrijden, en geeft de trigger direct een Nederlandse foutmelding die de UI ongewijzigd
  doorgeeft.
- **Herinneringen lopen buiten de request-cyclus om**: `create_activity_reminders()` (security
  definer, `0008_agenda.sql`) schrijft notificatie-rijen voor iedereen die is aangemeld voor een
  activiteit die binnen 2 dagen begint, en is idempotent (dedupe op profiel + activiteit). Vercel
  Cron roept dit dagelijks aan via `/api/cron/agenda-reminders`, beveiligd met `CRON_SECRET` (zie
  `vercel.json` en `.env.local.example`). De notificatie-rij bestaat al; het bijbehorende
  notificatiecentrum (badge, lijst) volgt in fase 5.

## Fases

1. ✅ Fundering — project, Supabase, database, auth, rollen, responsive layout, feed-shell
2. ✅ Profielen, bedrijven, ledenlijst, zoeken/filteren
3. ✅ Community: berichten, afbeeldingen/PDF's, likes, reacties, moderatie, realtime
4. ✅ Agenda: activiteiten, aanmelden/afmelden, herinneringen, WordPress-embed
5. ✅ Notificaties: in-app + push, voorkeuren
6. ✅ Documenten: categorieën, upload/download, rechten
7. ✅ Beheeromgeving: bestuursdashboard voor leden, bedrijven, activiteiten, moderatie
8. PWA-afwerking: installability, offline, performance, toegankelijkheid, Capacitor-voorbereiding

## Deployment

Elke Next.js-hostingprovider werkt (Vercel is de eenvoudigste optie). Zet de twee
`NEXT_PUBLIC_SUPABASE_*`-variabelen in de environment settings van je hostingprovider en voer de
migraties uit tegen je productie-Supabase-project vóór de eerste deploy.

**Let op bij Vercel + Supabase**: gebruik je Vercel's ingebouwde Supabase-marketplace-integratie
(via "Storage" of tijdens het importeren), dan maakt Vercel automatisch een *eigen*, apart
Supabase-project aan en injecteert dat zijn eigen `NEXT_PUBLIC_SUPABASE_*`-variabelen in al je
environments — die overschrijven of overschaduwen environment variables die je zelf handmatig hebt
ingesteld, zonder duidelijke melding. Wil je met je eigen, al bestaande Supabase-project werken
(zoals hier beschreven), gebruik dan **niet** die marketplace-integratie: zet de twee
`NEXT_PUBLIC_SUPABASE_*`-variabelen zelf, handmatig, onder Project → Settings → Environments →
Production.

## WordPress-embed (agenda)

`/embed/agenda` is een publieke, responsive pagina zonder navigatie of ingelogde sessie — bedoeld om
in een Elementor/WordPress-iframe op de publieke VOC-site te laden. Toon alleen aankomende
activiteiten (titel, datum, locatie, korte omschrijving, afbeelding); wie zich heeft aangemeld blijft
verborgen. Voorbeeld-iframe:

```html
<iframe src="https://<jouw-portaal-domein>/embed/agenda" style="width:100%;border:0;height:600px"></iframe>
```

## Herinneringen (agenda)

`/api/cron/agenda-reminders` wordt dagelijks om 07:00 UTC aangeroepen door Vercel Cron (zie
`vercel.json`) en schrijft een herinneringsnotificatie voor iedereen die is aangemeld voor een
activiteit die binnen 2 dagen begint. Zet `CRON_SECRET` (zie `.env.local.example`) in de
environment variables van je hostingprovider — Vercel Cron stuurt die dan automatisch mee als
`Authorization: Bearer <CRON_SECRET>`. Gebruik je geen Vercel, dan kan elke cron-dienst dit endpoint
met diezelfde header aanroepen.

## Notificaties & web push (fase 5)

In-app meldingen (notificatiebel, `/notificaties`) werken realtime via Supabase Realtime — geen
cron nodig. Web push is anders: een browser-pushbericht versturen betekent een HTTP-call naar de
pushdienst maken, en dat kan een Postgres-trigger niet zelf. Daarom haalt `/api/cron/send-push`
(elke 15 minuten, zie `vercel.json`) nog-niet-verstuurde notificaties op via de
`get_pending_push_notifications()` RPC en verstuurt ze met de `web-push`-library.

**Let op op Vercel's Hobby-plan**: crons draaien daar maximaal 1x per dag, ongeacht het schema in
`vercel.json` — pushmeldingen komen dan pas de volgende ochtend aan in plaats van binnen 15 minuten.
Voor bijna-realtime push is een Pro-abonnement nodig.

Vereiste environment variables (zie `.env.local.example`): `VAPID_PRIVATE_KEY` en
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Genereer je eigen paar met `npx web-push generate-vapid-keys` — nooit
een paar uit een voorbeeld of chat hergebruiken.

## Documenten (fase 6)

`/documenten` groepeert bestanden op categorie (vrij tekstveld met autocomplete uit bestaande
categorieën — geen vaste lijst). Bestuur/beheer uploadt en verwijdert (PDF, Word, PowerPoint, PNG,
JPEG, max 25 MB); leden kunnen alleen bekijken en downloaden. Rechten zitten in de RLS-policies en
storage-policies van `0002_storage.sql` (al sinds fase 1 aanwezig).

## Beheeromgeving (fase 7)

`/beheer` is het dashboard voor bestuur/beheer: kengetallen (actieve leden, openstaande
uitnodigingen/aanvragen, aankomende activiteiten) plus snelkoppelingen naar Uitnodigingen,
Aanvragen, Leden, Bedrijven, Documenten en Agenda. Een beheerder (niet bestuur) kan een lid
activeren/deactiveren vanaf diens ledenpagina — een gedeactiveerd account wordt bij de eerstvolgende
aanvraag naar `/account-gedeactiveerd` gestuurd. Moderatie (berichten/reacties verwijderen, en sinds
de vorige update ook bewerken voor een beheerder) zat al in de feed zelf (fase 3) en is bewust niet
verdubbeld in een apart moderatiescherm.

## Capacitor (toekomst)

De architectuur houdt hier nu al rekening mee: alle dataverkeer loopt via Supabase's JS-client
(geen Next.js-specifieke API-routes die de app dichttimmeren op web), en de UI is al gebouwd voor
een "echte app"-gevoel op mobiel (bottom navigation, touch-vriendelijke targets). Wanneer we
Capacitor toevoegen, wrapt dat de bestaande web-app zonder herstructurering van de databaselaag of
autorisatie.
