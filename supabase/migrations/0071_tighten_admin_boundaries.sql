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

-- Handmatige pushbroadcast (0041_manual_push_broadcast.sql). 0042 breidde
-- list_push_subscriptions() al eens uit met een created_at-kolom (voor de
-- "nieuwe abonnementen"-telling in Statistieken) — dat is dus de huidige,
-- echte vorm op de database, niet de oorspronkelijke uit 0041. create or
-- replace mag de OUT-parameters niet wijzigen, dus eerst droppen; een drop
-- gooit ook de grant weg, die zetten we na de recreate expliciet terug.
drop function if exists public.list_push_subscriptions();

create function public.list_push_subscriptions()
returns table (profile_id uuid, endpoint text, p256dh text, auth text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query select s.profile_id, s.endpoint, s.p256dh, s.auth, s.created_at from public.push_subscriptions s;
end;
$$;

grant execute on function public.list_push_subscriptions() to authenticated;

-- record_manual_push_broadcast zelf had geen OUT-parameterwijziging (blijft
-- void), dus create or replace volstaat — wel de volledige 0042-versie
-- overnemen (die logt ook een push_unsubscribed-event per opgeruimd dood
-- endpoint, voor diezelfde statistiek), niet de oudere 0041-versie.
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
    insert into public.events (event_type, target_type, metadata)
    select 'push_unsubscribed', 'push_subscription', jsonb_build_object('endpoint', endpoint)
    from unnest(p_dead_endpoints) as endpoint;

    delete from public.push_subscriptions where endpoint = any(p_dead_endpoints);
  end if;
end;
$$;
