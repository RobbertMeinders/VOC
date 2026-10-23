-- Aanmelden zonder account + personenmodel, Fase 3 (bevestigingsmail).
--
-- Nieuw, bewerkbaar sjabloon op de berichten-tab (Beheer -> Instellingen ->
-- Berichten) voor de bevestigingsmail na elke publieke activiteit-
-- aanmelding (embed/agenda/actions.ts). {{link}} is altijd de vaste
-- CTA-bestemming (renderMessageEmail) -- hier de publieke activiteitpagina;
-- {{title}}/{{datum}}/{{extra}}/{{afmeldlink}} worden door de aanroepende
-- code ingevuld. {{extra}} is een losse, status-afhankelijke zin (leeg,
-- een activeer-je-account-seintje, of een korte lidmaatschapsteaser) --
-- bewust platte tekst, geen eigen markup, zodat de verplichte HTML-escaping
-- van elke variabele in renderMessageEmail er niets aan stukmaakt.
insert into public.message_templates
  (key, sort_order, group_label, name, when_text, to_text, signature_type, has_push, subject, body_html, cta_label, after_html, push_title, push_body)
values
(
  'aanmelding-bevestiging', 21, 'Activiteiten', 'Bevestiging publieke aanmelding',
  'Iemand meldt zich aan via de openbare agenda (embed), zonder account', 'De aanmelder', 'alg', false,
  'Je aanmelding voor {{title}} is bevestigd',
  '<p>{{greeting}}</p>' ||
  '<p>Je aanmelding voor {{title}} op {{datum}} is bevestigd. We zien je daar graag!</p>' ||
  '<p>{{extra}}</p>',
  'Bekijk de activiteit',
  '<p>Deze bevestiging gaat alleen over je aanmelding voor deze activiteit. Wil je je aanmelding intrekken? <a href="{{afmeldlink}}">{{afmeldlink}}</a></p>',
  null, null
)
on conflict (key) do nothing;

-- public_activity_registrations is zelf alleen leesbaar voor bestuur (RLS,
-- zie 0047) -- de bevestigingsmail hierboven heeft het eigen rij-id nodig
-- (voor de intrek-link) terwijl de aanmelder zelf anoniem is. Deze functie
-- geeft alleen het id terug voor de exacte (activity_id, email)-combinatie
-- die de aanmelder net zelf heeft ingevuld -- dezelfde blootstelling als
-- upsert_public_activity_registration zelf, niets extra's.
create or replace function public.get_public_registration_id(p_activity_id uuid, p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.public_activity_registrations
  where activity_id = p_activity_id and lower(email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.get_public_registration_id(uuid, text) from public;
grant execute on function public.get_public_registration_id(uuid, text) to anon, authenticated;

insert into public.schema_migration_log (version) values ('0210') on conflict (version) do nothing;
notify pgrst, 'reload schema';
