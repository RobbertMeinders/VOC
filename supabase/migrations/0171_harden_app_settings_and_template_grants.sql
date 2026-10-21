-- H1: app_settings (0072) is publiek leesbaar bedoeld voor de écht
-- algemene velden (naam/logo/privacytekst) zodat ook een niet-ingelogde
-- pagina (login, wachtwoord-vergeten, embeds) die kan tonen — maar de
-- persoonlijke-handtekeningvelden uit 0129 (signature_personal_name/role/
-- phone/email, het telefoonnummer/e-mailadres van een bestuurslid) kregen
-- zo ook ongemerkt dezelfde publieke (anon) leestoegang. Kolom-grant
-- intrekken en gericht teruggeven, zelfde patroon als companies (0145).
revoke select on public.app_settings from anon, authenticated;

grant select (
  id, site_name, org_name, logo_url, privacy_content, show_testfase, updated_at, updated_by
) on public.app_settings to anon, authenticated;

-- Alleen voor een ingelogd lid: de persoonlijke-handtekeningvelden worden
-- uitsluitend gebruikt bij het opstellen/versturen van automatische
-- berichten (Beheer -> Communicatie), nooit op een anonieme pagina.
-- fetchAppSettings (lib/settings/app-settings.ts) selecteert deze kolommen
-- altijd samen met de publieke kolommen in één query — een "permission
-- denied" op deze kolommen voor anon laat die hele query falen, wat door
-- de al bestaande catch-fallback daar correct wordt opgevangen (valt terug
-- op alleen de publieke kolommen, exact zoals bedoeld voor een niet-
-- ingelogde bezoeker).
grant select (
  signature_personal_name, signature_personal_role, signature_personal_phone, signature_personal_email
) on public.app_settings to authenticated;

-- H2 (laag): get_email_template (0014) heeft geen enkele aanroeper meer in
-- de code (get_message_template, 0129, heeft 'm overgenomen) — ongebruikte
-- publieke RPC-oppervlakte, intrekken. get_message_template zelf blijft
-- bewust WEL open voor anon: wachtwoord-vergeten en de passwordless-
-- inlogmail (login/actions.ts, wachtwoord-vergeten/actions.ts) roepen 'm
-- aan vanuit een sessie zonder ingelogde gebruiker.
revoke execute on function public.get_email_template(text) from anon, authenticated;

-- H2b (laag): log_notification_click (0042) had geen enkele grens op hoe
-- vaak dezelfde melding als "geopend" geboekt kon worden — wie een geldige
-- notification_id te pakken kreeg (bv. uit een pushmelding-payload) kon
-- de open-statistiek voor die ene melding ongelimiteerd ophogen. Een klik
-- hoort semantisch toch maar één keer te tellen per melding; dedupliceren
-- op (profile_id, target_id) lost de vervuiling op zonder een aparte
-- tijdvenster-tabel nodig te hebben.
create or replace function public.log_notification_click(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select profile_id into v_profile_id from public.notifications where id = p_notification_id;
  if v_profile_id is null then
    return;
  end if;

  if exists (
    select 1 from public.events
    where event_type = 'notification_opened'
      and target_type = 'notification'
      and target_id = p_notification_id
      and profile_id = v_profile_id
  ) then
    return;
  end if;

  insert into public.events (event_type, profile_id, target_type, target_id, metadata)
  values ('notification_opened', v_profile_id, 'notification', p_notification_id, jsonb_build_object('channel', 'push'));
end;
$$;
