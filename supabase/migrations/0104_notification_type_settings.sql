-- Communicatieplan fase 2: per notificatietype instelbaar of de regel aan
-- staat, welke rollen 'm krijgen (voor de rolgebaseerde types) en via welke
-- kanalen (in-app/push/e-mail) hij verstuurd mag worden. Mirrors
-- email_templates (0014) qua vorm en RLS: alleen bestuur/beheer mag lezen/
-- bewerken, rijen zelf worden alleen door migraties geseed/verwijderd.
--
-- channel_push/channel_email werken als EXTRA voorwaarde naast de bestaande
-- per-rij channel_push_allowed/channel_email_allowed-kolommen (bijv. de
-- per-activiteit keuze uit 0040, of newsletter/report_resolved se eigen
-- vaste uitzondering) en naast de persoonlijke voorkeuren in
-- get_pending_push_notifications/get_pending_email_notifications (0079) —
-- die laatste twee mechanismen blijven ongewijzigd, dit is een derde,
-- optionele laag erboven.
create table public.notification_type_settings (
  type text primary key,
  enabled boolean not null default true,
  -- alleen relevant voor rolgebaseerde types (new_member, activity_submission,
  -- company_membership_request, feed_post_report, access_request); null voor
  -- de overige, op-individu gerichte types (die hebben geen "rol"-begrip).
  roles text[],
  channel_inapp boolean not null default true,
  channel_push boolean not null default true,
  channel_email boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.notification_type_settings enable row level security;

create policy "notification_type_settings_board_select" on public.notification_type_settings
  for select using (public.is_board());
create policy "notification_type_settings_board_update" on public.notification_type_settings
  for update using (public.is_board());

create trigger notification_type_settings_set_updated_at
  before update on public.notification_type_settings
  for each row execute function public.set_updated_at();

-- Extra, derde kanaal naast de bestaande channel_push_allowed/
-- channel_email_allowed: bepaalt of een melding in de bel/lijst van de
-- ontvanger verschijnt. Wordt per rij vastgelegd bij het aanmaken (net als
-- de andere twee), zodat een latere wijziging van de instelling niet
-- met terugwerkende kracht al verstuurde meldingen verandert.
alter table public.notifications
  add column channel_inapp_allowed boolean not null default true;

-- Centrale lookup die elke notify_*-functie aanroept vóór het inserten.
-- Geeft altijd precies 1 rij terug (ook als er nog geen instellingenrij
-- bestaat voor het type), met veilige defaults die het bestaande gedrag
-- reproduceren — zo blijft elk type correct werken, ook typen die hieronder
-- nog niet geseed zijn.
create or replace function public.notification_dispatch_config(p_type text)
returns table (enabled boolean, roles text[], channel_inapp boolean, channel_push boolean, channel_email boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(s.enabled, true),
    s.roles,
    coalesce(s.channel_inapp, true),
    coalesce(s.channel_push, true),
    coalesce(s.channel_email, true)
  from (select p_type as type) t
  left join public.notification_type_settings s on s.type = t.type;
$$;

-- Seed: reproduceert exact het huidige gedrag per type (zie onderzoek fase
-- 2). new_member en report_resolved hadden push/e-mail al uitgeschakeld
-- (0079 resp. 0079's notify_report_resolved) — hier als instelling i.p.v.
-- hardcoded, de rest staat standaard overal aan.
-- newsletter en manual_broadcast zijn bewust NIET opgenomen: beide hebben al
-- hun eigen, specifiekere beheerscherm (doelgroepen resp. Handmatig
-- pushbericht) en passeren deze tabel niet.
insert into public.notification_type_settings (type, roles, channel_push, channel_email) values
('new_member', array['bestuurslid', 'beheerder'], false, false),
('activity_submission', array['bestuurslid', 'beheerder'], true, true),
('company_membership_request', array['bestuurslid', 'beheerder'], true, true),
('feed_post_report', array['bestuurslid', 'beheerder'], true, true),
('access_request', array['bestuurslid', 'beheerder'], true, true),
('activity_decision', null, true, true),
('company_membership_decision', null, true, true),
('feed_comment', null, true, true),
('feed_mention', null, true, true),
('waitlist_promoted', null, true, true),
('activity_reminder', null, true, true),
('new_activity', null, true, true),
('activity_changed', null, true, true),
('activity_cancelled', null, true, true),
('report_resolved', null, false, false);
