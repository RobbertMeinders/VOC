-- Automatische berichten: volledige herbouw van e-mail-/pushteksten.
-- Vervangt email_templates/push_templates (die blijven ongebruikt bestaan,
-- geen destructieve drop) door één tabel per bericht (mail + push samen),
-- met leesbare namen, een "wanneer/naar wie"-uitleg, een vaste
-- knoptekst-CTA en een handtekeningkeuze — zie
-- docs/design/automatische-berichten/index.html (leidend voorbeeld).
--
-- Dezelfde get_*_template()-RPC-opzet als email_templates (0014): de
-- select/update-policies op de tabel zelf zijn admin-only (voor het
-- beheerscherm, zelfde aanscherping als 0071), maar versturen moet ook
-- vanuit een niet-ingelogde context kunnen lezen (wachtwoord-reset,
-- inloglink) — vandaar de aparte security-definer RPC.
create table public.message_templates (
  key text primary key,
  sort_order int not null,
  group_label text not null,
  name text not null,
  when_text text not null,
  to_text text not null,
  signature_type text not null default 'alg' check (signature_type in ('alg', 'pers')),
  has_push boolean not null default false,
  subject text not null,
  body_html text not null,
  cta_label text not null,
  after_html text not null default '',
  push_title text,
  push_body text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.message_templates enable row level security;

create policy "message_templates_admin_select" on public.message_templates
  for select using (public.is_admin());
create policy "message_templates_admin_update" on public.message_templates
  for update using (public.is_admin());

create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

create or replace function public.get_message_template(p_key text)
returns table (subject text, body_html text, cta_label text, after_html text, signature_type text, push_title text, push_body text)
language sql
security definer
set search_path = public
stable
as $$
  select subject, body_html, cta_label, after_html, signature_type, push_title, push_body
  from public.message_templates where key = p_key;
$$;

grant execute on function public.get_message_template(text) to anon, authenticated;

insert into public.message_templates
  (key, sort_order, group_label, name, when_text, to_text, signature_type, has_push, subject, body_html, cta_label, after_html, push_title, push_body)
values
(
  'uit-nieuw', 1, 'Account en toegang', 'Uitnodiging nieuw lid',
  'Een aanvraag via "Word lid" wordt goedgekeurd', 'De nieuwe aanmelder', 'alg', false,
  'Welkom bij de Veendammer Ondernemers Compagnie',
  '<p>{{greeting}}</p>' ||
  '<p>Hartelijk dank voor je aanmelding bij de Veendammer Ondernemers Compagnie. Namens het bestuur heet ik je van harte welkom als lid van ons netwerk!</p>' ||
  '<p>We organiseren het hele jaar door verschillende activiteiten voor onze leden, van netwerkborrels en kennissessies tot sportieve evenementen zoals padel en golf. Een overzicht van alle geplande activiteiten vind je op <a href="https://vocveendam.nl/agenda">vocveendam.nl/agenda</a>.</p>' ||
  '<p>Als VOC-lid maak je deel uit van het zakelijke netwerk van Veendam, met meer dan 110 aangesloten organisaties. We hopen je dan ook snel bij een van onze activiteiten te mogen ontmoeten!</p>' ||
  '<p>Het lidmaatschap loopt per kalenderjaar. De contributie wordt jaarlijks vastgesteld tijdens de Algemene Ledenvergadering en bedraagt momenteel &euro; 200,- exclusief btw. Je ontvangt de contributienota rond de ALV in het voorjaar.</p>' ||
  '<p>Als lid krijg je ook toegang tot het ledenportaal, waar je o.a. je profiel beheert, je aanmeldt voor activiteiten en in contact komt met andere leden.</p>',
  'Account aanmaken',
  '<p>Deze link is 14 dagen geldig. Mocht je vragen hebben, neem dan gerust contact op via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
  null, null
),
(
  'uit-bestaand', 2, 'Account en toegang', 'Uitnodiging bestaand lid',
  'Een lid krijgt toegang tot het portaal (import of via Beheer)', 'Leden die al lid zijn', 'alg', false,
  'Je persoonlijke toegang tot het VOC-ledenportaal',
  '<p>{{greeting}}</p>' ||
  '<p>De Veendammer Ondernemers Compagnie heeft een eigen ledenportaal, en als lid kun je daar vanaf nu gebruik van maken.</p>' ||
  '<p>In het portaal vind je de agenda met alle activiteiten van de VOC en meld je je eenvoudig aan. Je ziet welke ondernemers en bedrijven er nog meer lid zijn, en leden delen er ervaringen, vragen en aanbod met elkaar.</p>' ||
  '<p>Aan je lidmaatschap verandert niets; je hoeft alleen nog een account aan te maken. Dat doe je via de knop hieronder.</p>',
  'Maak je account aan',
  '<p>De link is 14 dagen geldig en alleen voor jou bedoeld. Heb je vragen over het portaal? Mail ons gerust via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
  null, null
),
(
  'uit-collega', 3, 'Account en toegang', 'Uitnodiging collega',
  'Een lid nodigt een collega uit via Mijn bedrijf', 'De uitgenodigde collega', 'alg', false,
  '{{naam_uitnodiger}} nodigt je uit voor het VOC-ledenportaal',
  '<p>{{greeting}}</p>' ||
  '<p>{{naam_uitnodiger}} heeft je uitgenodigd voor het ledenportaal van de Veendammer Ondernemers Compagnie. Omdat {{bedrijf}} lid is van de VOC, kun jij daar als collega ook gebruik van maken.</p>' ||
  '<p>In het portaal vind je de agenda met netwerkbijeenkomsten en andere activiteiten, meld je je aan en leer je de andere leden kennen. Je account wordt direct aan {{bedrijf}} gekoppeld.</p>',
  'Maak je account aan',
  '<p>De link is 14 dagen geldig. Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail gewoon negeren.</p>',
  null, null
),
(
  'magic', 4, 'Account en toegang', 'Inloggen zonder wachtwoord',
  'Iemand vraagt een inloglink aan', 'Het lid zelf', 'alg', false,
  'Je inloglink voor het VOC-ledenportaal',
  '<p>{{greeting}}</p>' ||
  '<p>Je hebt gevraagd om in te loggen zonder wachtwoord. Met de knop hieronder ben je direct ingelogd in het ledenportaal.</p>',
  'Inloggen',
  '<p>Deze link werkt één keer en is één uur geldig. Is hij verlopen? Vraag dan op de inlogpagina eenvoudig een nieuwe aan.</p>' ||
  '<p>Heb je dit niet zelf aangevraagd? Dan hoef je niets te doen. Zonder deze link kan niemand op je account inloggen.</p>',
  null, null
),
(
  'reset', 5, 'Account en toegang', 'Wachtwoord opnieuw instellen',
  'Iemand klikt op "Wachtwoord vergeten"', 'Het lid zelf', 'alg', false,
  'Stel een nieuw wachtwoord in voor het VOC-ledenportaal',
  '<p>{{greeting}}</p>' ||
  '<p>We hebben een verzoek ontvangen om het wachtwoord van je account te wijzigen. Via de knop hieronder kies je een nieuw wachtwoord.</p>',
  'Nieuw wachtwoord kiezen',
  '<p>De link is één uur geldig. Kies bij voorkeur een wachtwoord dat je nergens anders gebruikt.</p>' ||
  '<p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren; je huidige wachtwoord blijft gewoon geldig.</p>',
  null, null
),
(
  'email', 6, 'Account en toegang', 'Nieuw e-mailadres bevestigen',
  'Een lid wijzigt zijn e-mailadres', 'Het nieuwe e-mailadres', 'alg', false,
  'Bevestig je nieuwe e-mailadres',
  '<p>{{greeting}}</p>' ||
  '<p>Je hebt in het ledenportaal je e-mailadres gewijzigd naar dit adres. Bevestig de wijziging via de knop hieronder. Daarna ontvang je alle berichten van de VOC op dit adres.</p>',
  'E-mailadres bevestigen',
  '<p>Tot je de wijziging bevestigt, blijft je oude e-mailadres in gebruik. Heb je dit niet zelf gedaan? Neem dan contact met ons op via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>',
  null, null
),
(
  'nieuw-act', 7, 'Activiteiten', 'Nieuwe activiteit',
  'Er wordt een activiteit gepubliceerd', 'Leden met deze melding aan', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk en meld je aan',
  '',
  '{{title}}', '{{body}}'
),
(
  'herinnering', 8, 'Activiteiten', 'Herinnering activiteit',
  '2 dagen voor een activiteit waarvoor je bent aangemeld', 'Aangemelde leden', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk de activiteit',
  '',
  '{{title}}', '{{body}}'
),
(
  'wachtlijst', 9, 'Activiteiten', 'Plek vrij (wachtlijst)',
  'Er komt een plek vrij en je schuift door van de wachtlijst', 'Het lid dat doorschuift', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk de activiteit',
  '',
  '{{title}}', '{{body}}'
),
(
  'reactie', 10, 'Community en netwerk', 'Reactie op je bericht',
  'Iemand reageert op een bericht dat jij plaatste', 'De schrijver van het bericht', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk de reactie',
  '',
  '{{title}}', '{{body}}'
),
(
  'genoemd', 11, 'Community en netwerk', 'Je bent genoemd',
  'Iemand noemt je met @ in een bericht of reactie', 'Het genoemde lid', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk het bericht',
  '',
  '{{title}}', '{{body}}'
),
(
  -- notify_new_member (0102) stuurt dit bewust alleen naar bestuur/beheer,
  -- niet naar alle leden met de voorkeur aan — to_text beschrijft het
  -- huidige gedrag, niet de bredere doelgroep uit het ontwerp-voorbeeld.
  'nieuw-lid', 12, 'Community en netwerk', 'Nieuw lid',
  'Er komt een nieuw lid bij', 'Bestuur en beheer', 'alg', true,
  '{{title}}',
  '<p>{{body}}</p>',
  'Bekijk het profiel',
  '',
  '{{title}}', '{{body}}'
);

-- Signatuur "Persoonlijk": vrije tekstvelden (geen HTML-editor) i.p.v. de
-- ruwe, los-bewerkbare handtekening-HTML uit het ontwerp-voorbeeld — zelfde
-- reden als overal elders in deze app: platte velden die de app zelf
-- opmaakt, nooit vrije HTML van een beheerder rechtstreeks renderen. De
-- "Algemeen"-handtekening heeft geen eigen velden nodig: logo/organisatie-
-- naam komen al uit app_settings, en het contactadres/website uit de
-- bestaande EMAIL_FROM/SITE_URL-omgevingsvariabelen (zie
-- src/lib/templates/signature.ts) — dus altijd in sync, nooit dubbel in te
-- vullen.
alter table public.app_settings add column signature_personal_name text;
alter table public.app_settings add column signature_personal_role text;
alter table public.app_settings add column signature_personal_phone text;
alter table public.app_settings add column signature_personal_email text;

-- Uitnodiging-in-drieën: "source" registreert met welk sjabloon (en via
-- welke weg) een uitnodiging is aangemaakt, geschreven bij het aanmaken en
-- ongewijzigd teruggelezen bij het (opnieuw) versturen van de mail —
-- bestaande rijen zijn geen van drieën met zekerheid te herleiden, de
-- backfill benadert op basis van "imported" (het enige bestaande, enigszins
-- vergelijkbare signaal).
alter table public.invitations add column source text not null default 'nieuw_lid' check (source in ('nieuw_lid', 'bestaand_lid', 'collega'));
update public.invitations set source = case when imported then 'bestaand_lid' else 'nieuw_lid' end;
