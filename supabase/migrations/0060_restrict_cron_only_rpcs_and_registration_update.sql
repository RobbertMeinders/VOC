-- Kritiek lek, gevonden bij een gerichte beveiligingsaudit: de RPC's die de
-- push/e-mail-cronjobs gebruiken om te bepalen wát er verstuurd moet worden
-- stonden volledig open voor `anon` — géén enkele controle binnen de functie
-- zelf, en Supabase belicht elke `grant ... to anon`-functie automatisch als
-- publiek REST-endpoint (POST /rest/v1/rpc/<naam>). Concreet betekende dit
-- dat iemand met alleen de publieke anon-sleutel (die toch al in elke
-- bezoekersbrowser staat) zonder in te loggen:
--   - get_pending_push_notifications(): voor elk lid met een openstaande
--     melding de titel/inhoud MET de geheime pushabonnement-sleutels
--     (endpoint/p256dh/auth) kon opvragen — genoeg om zelf vervalste
--     pushmeldingen rechtstreeks naar dat toestel te sturen.
--   - get_pending_email_notifications(): de echte e-mailadressen + inhoud
--     van openstaande meldingen kon opvragen.
--   - beide riepen daarbij ALTIJD hun eigen pushed_at/emailed_at-update aan,
--     dus herhaald aanroepen zou echte meldingen ook stil laten "verdwijnen"
--     zonder ooit verstuurd te zijn.
-- Dit waren nooit voor een gewone gebruiker bedoeld — alleen de eigen
-- cronroutes (al zelf CRON_SECRET-gecontroleerd) en de Resend-webhook
-- (al zelf handtekening-gecontroleerd) horen dit aan te roepen. Grants nu
-- ingetrokken van anon/authenticated; de aanroepende routes gebruiken vanaf
-- nu de service-role-client (createAdminClient(), al gebruikt in
-- anonymize-members) in plaats van de sessie-gebonden client, want een
-- cron-/webhook-request heeft toch al geen bruikbare gebruikerssessie.
revoke execute on function public.get_pending_push_notifications(integer) from anon, authenticated;
revoke execute on function public.mark_notifications_pushed(uuid[]) from anon, authenticated;
revoke execute on function public.get_pending_email_notifications(integer) from anon, authenticated;
revoke execute on function public.mark_notifications_emailed(uuid[]) from anon, authenticated;
revoke execute on function public.set_notification_email_provider_id(uuid, text) from anon, authenticated;
revoke execute on function public.log_email_opened(text) from anon, authenticated;
revoke execute on function public.create_activity_reminders() from anon, authenticated;
revoke execute on function public.anonymize_expired_profiles() from anon, authenticated;
revoke execute on function public.delete_expired_prospects() from anon, authenticated;

grant execute on function public.get_pending_push_notifications(integer) to service_role;
grant execute on function public.mark_notifications_pushed(uuid[]) to service_role;
grant execute on function public.get_pending_email_notifications(integer) to service_role;
grant execute on function public.mark_notifications_emailed(uuid[]) to service_role;
grant execute on function public.set_notification_email_provider_id(uuid, text) to service_role;
grant execute on function public.log_email_opened(text) to service_role;
grant execute on function public.create_activity_reminders() to service_role;
grant execute on function public.anonymize_expired_profiles() to service_role;
grant execute on function public.delete_expired_prospects() to service_role;

-- log_push_unsubscribed blijft wél nodig voor ingelogde leden zelf (zie
-- unsubscribeFromPushAction, profiel/instellingen) — alleen het anonieme pad
-- intrekken, niet authenticated. De cron-aanroep (dode abonnementen
-- opruimen) gaat ook hier voortaan via de service-role-client.
revoke execute on function public.log_push_unsubscribed(text, uuid) from anon;


-- Medium: public_activity_registrations_update stond op `using (true)` —
-- bedoeld zodat iemand die het openbare aanmeldformulier nogmaals met
-- hetzelfde e-mailadres invult zijn eigen inzending mag bijwerken, maar RLS
-- kan niet zien MET welk filter de aanroeper de update deed. Een aanvraag
-- rechtstreeks tegen de REST-API (buiten het formulier om) kon zo, met een
-- geraden/bekend activity_id, de naam/bedrijfsnaam van EEN WILLEKEURIGE
-- andere aanmelding op die activiteit overschrijven, niet per se de eigen
-- rij. Vervangen door een security-definer RPC die de insert-of-update
-- atomisch binnen de database zelf op (activity_id, email) matcht — een
-- aanroeper kan dan onmogelijk een andere rij raken dan zijn eigen
-- (activity_id, email)-combinatie, ongeacht welk filter hij zelf verzint.
drop policy if exists "public_activity_registrations_insert" on public.public_activity_registrations;
drop policy if exists "public_activity_registrations_update" on public.public_activity_registrations;

create or replace function public.upsert_public_activity_registration(
  p_activity_id uuid,
  p_name text,
  p_email text,
  p_company_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.activities
    where id = p_activity_id and status = 'approved' and allow_public_registration
  ) then
    raise exception 'Deze activiteit staat niet open voor aanmelden.';
  end if;

  insert into public.public_activity_registrations (activity_id, name, email, company_name)
  values (p_activity_id, p_name, p_email, p_company_name)
  on conflict (activity_id, email)
  do update set name = excluded.name, company_name = excluded.company_name;
end;
$$;

grant execute on function public.upsert_public_activity_registration(uuid, text, text, text) to anon, authenticated;
