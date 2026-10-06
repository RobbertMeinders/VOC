# Implementatieplan — maillijst als MailBlue-vervanger

Doel: het portaal neemt de nieuwsbrief over van MailBlue. Alle mail gaat via de
eigen mailbox **info@vocveendam.nl** (SMTP bij LJPc), zonder Resend en zonder
extra abonnementen. Campagnes bereiken leden én mensen zonder account.

Ontwerp en achtergrond: zie het ontwerpvoorstel "Maillijst als MailBlue-vervanger"
(claude.ai doc). Dit bestand is het uitvoerplan.

## Werkwijze (geldt voor elke stap)

- Branch: `claude/voc-ledenportaal-pwa-i3ku74`. Eerst `git pull`.
- Elke genummerde stap = eigen commit. Vóór elke commit:
  `npx tsc --noEmit && npm run lint && npm run build`.
- Pas committen/pushen na akkoord van Robbert per stap.
- Migraties: volgende vrije nummer in `supabase/migrations/` (nu `0073`).
  Robbert voert ze uit in de Supabase SQL Editor; noem in je bericht welk
  bestand hij moet draaien, vóór de deploy die ervan afhangt.
- **Testen nooit naar echte leden.** Testmails alleen naar eigen adressen,
  testcampagnes alleen naar een testlijst met eigen adressen. Groep "Leden"
  niet aanvinken tijdens testen. Pushmeldingen niet aanraken.
- Afzendernaam van de vereniging: **Veendammer Ondernemers Compagnie** (met s).

## Gecontroleerde uitgangssituatie (6 okt 2026)

- DNS vocveendam.nl: MX bij LJPc (`mx1/mx2.ljpc.email`), SPF staat LJPc toe,
  DKIM-selector `default` aanwezig, DMARC `p=quarantine`. Versturen via LJPc-SMTP
  als info@ is dus geauthenticeerd.
- Alle mail loopt via `src/lib/email/send.ts` (drie functies:
  `sendTemplatedEmail`, `sendRawHtmlEmail`, `sendNotificationEmail`), nu met
  Resend. Aanroepers: `beheer/communicatie/actions.ts`,
  `beheer/uitnodigingen/actions.ts`, `api/cron/send-email-notifications`,
  `login/actions.ts`, `wachtwoord-vergeten/actions.ts`, `lib/newsletter/send.ts`.
- Open/klik-meting komt nu binnen via `api/webhooks/resend` →
  `log_email_opened` / `log_email_clicked` op `notifications.email_provider_id`.
- Campagne-ontvangers: `claim_newsletter_recipients()` = alle `profiles` met
  `is_active` (en sinds 0070 `email_campaigns`). Ontvangers zijn rijen in
  `notifications` (vereist `profile_id`).
- Vercel Hobby: crons 1× per dag (zie `vercel.json`), `maxDuration = 300` op de
  campagnepagina en de campagne-cron.

---

## Stap 1 — Mail via SMTP (info@vocveendam.nl)

Na deze stap werken inlogmails, uitnodigingen, resets, meldingen en testmails.

1. `npm i nodemailer` en `npm i -D @types/nodemailer`; `resend` verwijderen
   uit `package.json`.
2. Nieuw `src/lib/email/transport.ts` (server-only):
   - Leest `SMTP_HOST`, `SMTP_PORT` (465 → `secure: true`, 587 → STARTTLS),
     `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.
   - Eén hergebruikte Nodemailer-transport (`pool: true`, `maxConnections: 1`).
   - `sendMail({ to, subject, html, from?, headers? })` →
     `{ providerId: info.messageId } | { error }`.
   - Ontbreekt config: `{ error: "E-mail versturen is niet geconfigureerd (SMTP_HOST / SMTP_USER / SMTP_PASSWORD / EMAIL_FROM ontbreken)." }`.
3. `src/lib/email/send.ts`: de drie `resend.emails.send`-aanroepen vervangen
   door `sendMail`. Signatures en returnvorm blijven gelijk, zodat aanroepers
   niet hoeven te veranderen. De `senderName`-logica van `sendRawHtmlEmail`
   blijft (naam vóór het adres uit `EMAIL_FROM`).
4. `api/webhooks/resend/route.ts` verwijderen; de uitsluiting `api/webhooks`
   in `src/proxy.ts` mag blijven. `RESEND_*` nergens meer lezen.
5. Beheer → App-instellingen: kaart "E-mail" met de status (host en
   afzender tonen, nooit het wachtwoord) en een knop **"Testmail naar mij"**
   (alleen naar het e-mailadres van de ingelogde beheerder).
6. Controleren dat geen route die mailt `runtime = "edge"` heeft (Nodemailer
   vereist Node).

**Robbert doet:** in Vercel (Production) zetten: `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER` (info@vocveendam.nl), `SMTP_PASSWORD`,
`EMAIL_FROM` = `Veendammer Ondernemers Compagnie <info@vocveendam.nl>`;
`RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET` mogen weg. Bij LJPc navragen hoeveel
mails per uur/dag via SMTP mogen.

**Klaar als:** testmail uit App-instellingen komt aan (niet in spam; headers
tonen `dkim=pass` en `spf=pass`), een uitnodiging naar een eigen adres komt aan,
en een magic link naar een eigen adres werkt.

---

## Stap 2 — Database voor contacten, lijsten en ontvangers

Migratie `0073_mail_contacts.sql`:

- `mail_contacts`: `id`, `email` (uniek, lowercase opgeslagen), `name`,
  `company_name`, `profile_id` (uniek, nullable, FK `profiles` on delete set
  null), `status` check in (`ingeschreven`, `onbevestigd`, `afgemeld`,
  `onbestelbaar`), `source` (`lid`, `uitnodiging`, `handmatig`, `activiteit`,
  `prospect`, `formulier`), `subscribed_at`, `unsubscribed_at`,
  `unsubscribe_token` (uniek, default `encode(gen_random_bytes(24),'hex')`),
  `created_at`, `updated_at`.
- `mail_lists`: `id`, `name` (uniek), `description`, `created_at`. Seed:
  **Nieuwe leden**, **Oud-leden**, **Geabonneerd**.
- `mail_list_members`: `list_id`, `contact_id`, `added_at`, PK op beide.
- `communication_recipients`: `id`, `communication_id` (FK cascade),
  `contact_id`, `email`, `sent_at`, `provider_id`, `opened_at`, `clicked_at`,
  `error`; unique (`communication_id`, `contact_id`).
- `communications`: kolom `recipient_groups jsonb not null default '["leden"]'`.
  Vorm: `["leden", "uitgenodigd", "list:<uuid>", "activiteit:<uuid>", "prospects:<status>"]`.
- RLS: alle vier tabellen alleen `is_board()`.
- Backfill: contact per profiel (`source 'lid'`, `profile_id` gekoppeld,
  status `afgemeld` als `email_campaigns = false`) en per openstaande
  uitnodiging met e-mail (`source 'uitnodiging'`), ontdubbeld op e-mail.
- Triggers: nieuw/gewijzigd profiel-e-mailadres → contact upserten en koppelen;
  nieuwe uitnodiging met e-mail → contact upserten.
- Synchronisatie opt-out: `profiles.email_campaigns` ↔ contactstatus beide
  kanten op (trigger), zodat Instellingen en afmeldlink altijd kloppen.

Functies (security definer, `search_path = public`):

- `resolve_campaign_recipients(p_groups jsonb)` → distinct (`email`, `name`,
  `profile_id`) uit: `leden` = actieve profielen; `uitgenodigd` = invitations
  status pending met e-mail en zonder profiel; `list:<id>` = lijstleden;
  `activiteit:<id>` = `activity_registrations` (via profiel) +
  `public_activity_registrations`; `prospects:<status>` = `prospects`.
  Upsert ontbrekende contacten; sluit `afgemeld` en `onbestelbaar` uit.
  Alleen board.
- `count_campaign_recipients(p_groups jsonb)` → `{ total, skipped_unsubscribed, skipped_bounced }`
  voor de teller. Alleen board.
- `claim_campaign_recipients(p_communication_id)` → vult
  `communication_recipients` (on conflict do nothing) en geeft de nog niet
  verzonden rijen terug. Board of service_role (voor de cron).
- `unsubscribe_contact(p_token)` → status `afgemeld`, datum, en bij een
  gekoppeld profiel `email_campaigns = false`. Granted aan `anon`.
- `log_campaign_open(p_recipient_id)` / `log_campaign_click(p_recipient_id)`
  → zet `opened_at` / `clicked_at` als die nog leeg is. Granted aan `anon`;
  recipient-id is een uuid (niet te raden).

**Klaar als:** migratie draait zonder fouten op een kopie/lokaal; backfill geeft
één contact per uniek adres; RLS weigert een gewoon lid.

---

## Stap 3 — Versturen van campagnes

1. `src/lib/newsletter/send.ts`:
   - `claim_campaign_recipients` i.p.v. `claim_newsletter_recipients`.
   - Per ontvanger de HTML personaliseren: afmeldlink
     `${siteUrl}/afmelden/<token>`, open-pixel
     `${siteUrl}/api/mail/o/<recipient-id>`, en links in de inhoud herschrijven
     naar `${siteUrl}/api/mail/c/<recipient-id>?u=<url>&s=<hmac>`
     (HMAC-SHA256 met `MAIL_LINK_SECRET`, zodat het geen open redirect is).
   - Headers: `List-Unsubscribe: <${siteUrl}/api/mail/unsubscribe/<token>>, <mailto:info@vocveendam.nl?subject=afmelden>`
     en `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
   - Tempo: wachten tussen mails volgens `SMTP_SEND_DELAY_MS` (default 2000).
   - Tijdsbudget: stop netjes na ~240 s; status blijft dan
     `verzenden_mislukt` met "Nog N te gaan — Ga verder" in de UI (hervatten
     is al idempotent). De dagelijkse cron `send-scheduled-campaigns` gaat
     ook verder met onvoltooide ingeplande campagnes.
   - Mislukt een adres hard (SMTP 5xx), dan contact op `onbestelbaar`.
2. Nieuwe routes (toevoegen aan de uitsluitingen in `src/proxy.ts`):
   - `GET /api/mail/o/[id]` → `log_campaign_open`, geeft 1×1 transparante GIF.
   - `GET /api/mail/c/[id]` → controleer HMAC, `log_campaign_click`, redirect.
   - `POST /api/mail/unsubscribe/[token]` → one-click afmelden (header-knop
     in Gmail/Outlook).
   - Pagina `/afmelden/[token]`: GET toont "Afmelden voor de nieuwsbrief van
     Veendammer Ondernemers Compagnie?" met knop; pas de POST/actie meldt af
     (linkscanners mogen niet per ongeluk afmelden). Daarna bevestiging.
3. `src/lib/newsletter/render.ts` voettekst: "Je ontvangt dit omdat je op de
   maillijst van {orgName} staat. Afmelden" (+ voor leden "Voorkeuren
   aanpassen" naar `/instellingen`). In de live preview een dummy-link.
4. `NewsletterEditor.tsx`, blok "Versturen":
   - Vinkjes: Leden · Uitgenodigd, nog geen account · elke lijst uit
     `mail_lists` · Aangemeld voor activiteit (keuzelijst) · Potentiële leden
     per status. Opslaan in `recipient_groups`.
   - Teller via `count_campaign_recipients`: "Gaat naar 142 adressen
     (3 afgemeld en 1 onbestelbaar worden overgeslagen)."
   - Versturen-knop uit bij 0 ontvangers. Bevestiging noemt het aantal.
   - Voortgang tijdens versturen; na afloop: verzonden / geopend / geklikt /
     afgemeld uit `communication_recipients`.
5. Statistieken → tab Campagnes: cijfers uit `communication_recipients`.
6. `api/cron/send-email-notifications`: `set_notification_email_provider_id`
   blijft met de SMTP `messageId`; open-meting voor automatische meldingen
   vervalt (geen webhook meer) — accepteren of later een pixel toevoegen.

**Klaar als:** campagne naar een testlijst met 2–3 eigen adressen komt aan,
afmeldlink en Gmail-afmeldknop werken, open en klik worden geteld, een
afgemeld adres wordt bij de volgende campagne overgeslagen.

---

## Stap 4 — Beheer → Contacten

1. Nieuw item "Contacten" onder Communicatie in
   `src/components/beheer/beheer-nav-items.ts`, pagina `/beheer/contacten`.
2. Lijst met zoeken (naam, e-mail, bedrijf), filters op lijst, status en
   bron; per contact: lijsten aan/uit, status zetten (afgemeld,
   onbestelbaar, opnieuw ingeschreven alleen na bevestiging dat de persoon
   dat zelf vroeg), ontvangen campagnes.
3. Contact handmatig toevoegen (naam, e-mail, bedrijf, lijsten).
4. Lijsten beheren: hernoemen, toevoegen, verwijderen (niet als een
   ingeplande campagne de lijst gebruikt).
5. Beheer → Leden: na deactiveren een vraag "Ook op lijst Oud-leden zetten?".
6. Mobiel nalopen op 390 px: geen horizontale overflow.

**Klaar als:** Robbert kan Nieuwe leden, Oud-leden en Geabonneerd vullen en
de teller in de campagne-editor klopt met de lijst.

---

## Stap 5 — Nieuwsbrief-vinkje op het aanmeldformulier

1. Migratie: `access_requests.newsletter_opt_in boolean not null default false`.
2. `AccessRequestForm` (gebruikt door `/toegang-aanvragen` én
   `/embed/aanmelden`): vinkje "Houd me op de hoogte via de nieuwsbrief",
   standaard uit.
3. `submitAccessRequestAction`: bij vinkje contact upserten met status
   `onbevestigd` (ook als het adres eerder `afgemeld` was: de persoon vraagt
   het nu zelf, en pas na bevestigen telt het) en een bevestigingsmail sturen met
   `${siteUrl}/nieuwsbrief/bevestigen/<token>`.
4. Pagina `/nieuwsbrief/bevestigen/[token]` (in proxy-uitsluitingen): zet
   status `ingeschreven`, `subscribed_at`, en lijst **Nieuwe leden**.
5. E-mailtemplate `nieuwsbrief_bevestigen` toevoegen aan de templates.

**Klaar als:** formulier met vinkje → bevestigingsmail → klik → contact
ingeschreven en op Nieuwe leden; zonder klik krijgt het adres geen campagnes.

---

## Daarna

- Eerste echte nieuwsbrief versturen via het portaal.
- MailBlue opzeggen.
- Optioneel later: open-pixel voor automatische meldingen, opschonen van
  afgemelde contacten (alleen e-mail + afmelddatum bewaren).
