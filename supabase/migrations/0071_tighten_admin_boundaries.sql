-- Scherper onderscheid bestuurslid vs. beheerder: bestuurslid = inhoudelijk
-- beheer van de vereniging (leden/bedrijven/activiteiten/nieuws/documenten/
-- campagnes/moderatie), beheerder = dat plus systeembrede/technische
-- instellingen. Drie dingen stonden tot nu toe nog op bestuursniveau terwijl
-- ze eigenlijk systeembreed zijn:
--
-- 1. E-mail-/pushtemplates: wijzigen is stil en app-breed — raakt elke
--    toekomstige uitnodiging/herinnering/wachtwoord-reset/pushmelding voor
--    de hele vereniging, zonder review per verzending.
-- 2. Handmatige pushbroadcast: één klik bereikt direct alle abonnementen,
--    zonder concept/voorbeeld/inplannen zoals de nieuwsbrief dat wel heeft.
-- 3. Embed-/website-integraties: technische koppeling met de buitenwereld.

-- E-mailtemplates
drop policy "email_templates_board_select" on public.email_templates;
drop policy "email_templates_board_update" on public.email_templates;
create policy "email_templates_admin_select" on public.email_templates
  for select using (public.is_admin());
create policy "email_templates_admin_update" on public.email_templates
  for update using (public.is_admin());

-- Pushtemplates
drop policy "push_templates_board_select" on public.push_templates;
drop policy "push_templates_board_update" on public.push_templates;
create policy "push_templates_admin_select" on public.push_templates
  for select using (public.is_admin());
create policy "push_templates_admin_update" on public.push_templates
  for update using (public.is_admin());

-- Handmatige pushbroadcast (0041_manual_push_broadcast.sql) — geen
-- OUT-parameterwijziging, dus create or replace volstaat.
create or replace function public.list_push_subscriptions()
returns table (profile_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query select s.profile_id, s.endpoint, s.p256dh, s.auth from public.push_subscriptions s;
end;
$$;

create or replace function public.record_manual_push_broadcast(
  p_reached_profile_ids uuid[],
  p_dead_endpoints text[],
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, body, pushed_at)
  select unnest(p_reached_profile_ids), 'manual_broadcast', p_title, p_body, now();

  if array_length(p_dead_endpoints, 1) > 0 then
    delete from public.push_subscriptions where endpoint = any(p_dead_endpoints);
  end if;
end;
$$;
