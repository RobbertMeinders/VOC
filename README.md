# VOC Ledenportaal

Besloten community- en ledenportaal voor de Veendammer OndernemersCompagnie (VOC), gebouwd als
Progressive Web App met Next.js (App Router) en Supabase.

> **Status:** Fase 1 — Fundering. Authenticatie, rollen/autorisatie, de databasebasis en de
> responsive app-shell met community-feed als startpagina staan. Profielen, bedrijven, de volledige
> feed, agenda, notificaties, documenten en het beheergedeelte volgen in latere fases (zie onderaan).

## Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Supabase**: Postgres, Auth, Storage, Row Level Security
- **Tailwind CSS v4** met de VOC-huisstijl (`#E8000F`) als thema
- **PWA / Web Push / Capacitor**: architectuur is hierop voorbereid, wordt in fase 8 afgerond

## Projectstructuur

```
src/
  app/
    (app)/            # Beveiligde app-shell: feed, agenda, leden, profiel, beheer
    login/             # Inloggen
    register/           # Eerste account aanmaken (alleen zolang er nog geen profiel bestaat)
    register/[token]/  # Registreren via een uitnodigingslink
    auth/confirm/       # Callback voor e-mailbevestiging (Supabase Auth)
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

## Fases

1. ✅ Fundering — project, Supabase, database, auth, rollen, responsive layout, feed-shell
2. Profielen, bedrijven, ledenlijst, zoeken/filteren
3. Community: berichten, afbeeldingen/PDF's, likes, reacties, moderatie, realtime
4. Agenda: activiteiten, aanmelden/afmelden, herinneringen, WordPress-embed
5. Notificaties: in-app + push, voorkeuren
6. Documenten: categorieën, upload/download, rechten
7. Beheeromgeving: bestuursdashboard voor leden, bedrijven, activiteiten, moderatie
8. PWA-afwerking: installability, offline, performance, toegankelijkheid, Capacitor-voorbereiding

## Deployment

Elke Next.js-hostingprovider werkt (Vercel is de eenvoudigste optie). Zet de twee
`NEXT_PUBLIC_SUPABASE_*`-variabelen in de environment settings van je hostingprovider en voer de
migraties uit tegen je productie-Supabase-project vóór de eerste deploy.

## WordPress-embed (agenda)

Volgt in fase 4: een aparte, responsive `/embed/agenda`-route zonder navigatie, bedoeld om in een
Elementor/WordPress-iframe te laden.

## Capacitor (toekomst)

De architectuur houdt hier nu al rekening mee: alle dataverkeer loopt via Supabase's JS-client
(geen Next.js-specifieke API-routes die de app dichttimmeren op web), en de UI is al gebouwd voor
een "echte app"-gevoel op mobiel (bottom navigation, touch-vriendelijke targets). Wanneer we
Capacitor toevoegen, wrapt dat de bestaande web-app zonder herstructurering van de databaselaag of
autorisatie.
