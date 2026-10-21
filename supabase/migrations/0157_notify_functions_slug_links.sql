-- URL-ronde #102: de notify_*-functies (0105 en latere fixes) bouwden hun
-- notification.link nog op met het kale UUID ('/agenda/' || new.id,
-- '/bedrijven/' || new.company_id, '/leden/' || new.id) — sinds de
-- UUID->slug 308-redirects op alle drie de routes bestaan (URL-ronde #99,
-- #100, #101) kan dat voortaan rechtstreeks de nette slug-URL zijn, zodat
-- een lid die op een notificatie tikt meteen de leesbare URL in de
-- adresbalk/deelvenster krijgt i.p.v. een redirect-sprongetje.
--
-- Alleen de link-expressie verandert hieronder, functie voor functie — de
-- rest van elke functiebody (notification_dispatch_config-gating,
-- is_active_member()/is_board()-checks, rolselectie, enz. uit de
-- beveiligingsronde) blijft exact zoals de laatst gewijzigde versie hem
-- achterliet. companies.slug, profiles.slug en activities.slug zijn alle
-- drie "not null" (0001_init.sql, 0122_profile_slug.sql, 0049_activity_slug.sql),
-- dus geen coalesce-fallback naar het UUID nodig.
--
-- Niet meegenomen (bouwen geen /agenda-, /bedrijven- of /leden-link):
-- notify_feed_post_report, notify_access_request, notify_on_feed_comment,
-- dispatch_mention_notifications, notify_report_resolved.

-- new.slug: profiles-rij bestaat al (AFTER INSERT on profiles), slug wordt
-- in dezelfde insert gezet door handle_new_user().
create or replace function public.notify_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if new.is_active then
    select * into v_cfg from public.notification_dispatch_config('new_member');
    if not v_cfg.enabled then
      return new;
    end if;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'new_member', 'Nieuw lid',
      new.first_name || ' ' || new.last_name || ' is lid geworden van de VOC.',
      '/leden/' || new.slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder'])) and id <> new.id;
  end if;
  return new;
end;
$$;

-- new.slug: activities-rij bestaat al (AFTER INSERT on activities), slug
-- wordt app-side (generateUniqueSlug, agenda/actions.ts) in dezelfde insert
-- meegegeven.
create or replace function public.notify_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitter_name text;
  v_cfg record;
begin
  if new.status = 'pending' then
    select * into v_cfg from public.notification_dispatch_config('activity_submission');
    if not v_cfg.enabled then
      return new;
    end if;

    select first_name || ' ' || last_name into v_submitter_name
      from public.profiles where id = new.created_by;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'activity_submission', 'Nieuwe activiteit ter goedkeuring',
      coalesce(v_submitter_name, 'Een lid') || ' heeft "' || new.title || '" ingediend.',
      '/agenda/' || new.slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  end if;
  return new;
end;
$$;

-- new.company_id wijst naar companies, niet naar de eigen tabel -> slug via
-- dezelfde select die v_company_name al ophaalt.
create or replace function public.notify_company_membership_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_name text;
  v_company_name text;
  v_company_slug text;
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('company_membership_request');
  if not v_cfg.enabled then
    return new;
  end if;

  select first_name || ' ' || last_name into v_applicant_name from public.profiles where id = new.profile_id;
  select name, slug into v_company_name, v_company_slug from public.companies where id = new.company_id;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select distinct recipient_id, 'company_membership_request', 'Nieuwe bedrijfskoppeling ter goedkeuring',
    coalesce(v_applicant_name, 'Iemand') || ' wil gekoppeld worden aan ' || coalesce(v_company_name, 'een bedrijf') || '.',
    '/bedrijven/' || v_company_slug,
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from (
    -- collega's van het bedrijf blijven onvoorwaardelijk ontvanger — de
    -- rolinstelling geldt alleen voor de bestuur/beheer-tak hieronder.
    select profile_id as recipient_id from public.company_members where company_id = new.company_id
    union
    select id as recipient_id from public.profiles where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']))
  ) recipients
  where recipient_id <> new.profile_id;

  return new;
end;
$$;

-- new.id in de case-expressies hieronder blijft het rij-id van de
-- activiteit zelf (titel/goedkeuring), niet de link — alleen de link-regel
-- verandert.
create or replace function public.notify_activity_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if new.created_by is not null
     and new.status in ('approved', 'rejected')
     and old.status = 'pending'
     and new.status is distinct from old.status
  then
    select * into v_cfg from public.notification_dispatch_config('activity_decision');
    if not v_cfg.enabled then
      return new;
    end if;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      new.created_by,
      'activity_decision',
      case when new.status = 'approved' then 'Activiteit goedgekeurd' else 'Activiteit afgewezen' end,
      case
        when new.status = 'approved' then 'Je activiteit "' || new.title || '" is goedgekeurd en staat nu in de agenda.'
        when new.rejection_reason is not null and new.rejection_reason <> ''
          then 'Je activiteit "' || new.title || '" is afgewezen: ' || new.rejection_reason
        else 'Je activiteit "' || new.title || '" is afgewezen.'
      end,
      '/agenda/' || new.slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;
  return new;
end;
$$;

-- new.company_id wijst naar companies, niet naar de eigen tabel (company_
-- membership_requests) -> slug via scalar subquery. Body en opbouw verder
-- exact zoals 0132 (herstel van 0097 + 0105-gating) hem achterliet.
create or replace function public.handle_company_membership_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    delete from public.company_members
    where profile_id = new.profile_id and company_id <> new.company_id;

    insert into public.company_members (company_id, profile_id)
    values (new.company_id, new.profile_id)
    on conflict do nothing;
  end if;

  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    new.decided_at = now();

    select * into v_cfg from public.notification_dispatch_config('company_membership_decision');
    if v_cfg.enabled then
      insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
      values (
        new.profile_id,
        'company_membership_decision',
        case when new.status = 'approved' then 'Bedrijfskoppeling goedgekeurd' else 'Bedrijfskoppeling afgewezen' end,
        case
          when new.status = 'approved' then 'Je aanvraag om aan dit bedrijf gekoppeld te worden is goedgekeurd.'
          when new.decision_reason is not null and new.decision_reason <> ''
            then 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen. Reden: ' || new.decision_reason
          else 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen.'
        end,
        '/bedrijven/' || (select slug from public.companies where id = new.company_id),
        v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
      );
    end if;
  end if;

  return new;
end;
$$;

-- old.activity_id wijst naar activities, niet naar de eigen tabel
-- (activity_registrations) -> slug via dezelfde select die v_title al
-- ophaalt. Tekst/opbouw verder exact zoals 0117 hem achterliet.
create or replace function public.promote_next_waitlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.activity_registrations;
  v_title text;
  v_slug text;
  v_cfg record;
begin
  if old.is_waitlisted then
    return old;
  end if;

  select * into v_next
    from public.activity_registrations
    where activity_id = old.activity_id and is_waitlisted
    order by created_at
    limit 1
    for update;

  if v_next.id is null then
    return old;
  end if;

  update public.activity_registrations set is_waitlisted = false where id = v_next.id;

  select * into v_cfg from public.notification_dispatch_config('waitlist_promoted');
  if v_cfg.enabled then
    select title, slug into v_title, v_slug from public.activities where id = old.activity_id;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      v_next.profile_id,
      'waitlist_promoted',
      'Je staat nu op de deelnemerslijst',
      'Er is een plek vrijgekomen voor "' || coalesce(v_title, 'de activiteit') || '" — je bent van de wachtlijst gehaald.',
      '/agenda/' || v_slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;

  return old;
end;
$$;

-- a.slug: al een join tegen activities (a) voor a.title/a.starts_at/
-- a.location -> dezelfde rij levert ook de slug. De n.link-vergelijking in
-- de "not exists"-dedupe-check hieronder moet dezelfde expressie gebruiken
-- als de insert zelf, anders zou een al verstuurde herinnering niet meer
-- als zodanig herkend worden en dubbel verstuurd worden.
create or replace function public.create_activity_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('activity_reminder');
  if not v_cfg.enabled then
    return 0;
  end if;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select
    r.profile_id,
    'activity_reminder',
    'Herinnering: ' || a.title,
    'Deze activiteit vindt plaats op ' ||
      to_char(a.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
      coalesce(' bij ' || a.location, '') || '.',
    '/agenda/' || a.slug,
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from public.activity_registrations r
  join public.activities a on a.id = r.activity_id
  where a.starts_at > now()
    and a.starts_at <= now() + interval '2 days'
    and not exists (
      select 1 from public.notifications n
      where n.profile_id = r.profile_id
        and n.type = 'activity_reminder'
        and n.link = '/agenda/' || a.slug
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- new.slug: activities-rij bestaat al (AFTER INSERT OR UPDATE on
-- activities), slug wordt app-side gezet/eventueel herverplaatst (updateActivityAction)
-- vóórdat deze trigger-statement vuurt.
create or replace function public.notify_activity_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    select * into v_cfg from public.notification_dispatch_config('new_activity');
    if not v_cfg.enabled then
      return new;
    end if;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'new_activity', 'Nieuwe activiteit: ' || new.title,
      'Op ' || to_char(new.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
        coalesce(' bij ' || new.location, '') || '.',
      '/agenda/' || new.slug,
      new.notify_push and v_cfg.channel_push,
      new.notify_email and v_cfg.channel_email,
      v_cfg.channel_inapp
    from public.profiles
    where is_active and (new.created_by is null or id <> new.created_by);
  end if;
  return new;
end;
$$;

-- p_activity_id is een parameter, geen rij uit de eigen tabel -> slug via
-- scalar subquery.
create or replace function public.notify_activity_participants(
  p_activity_id uuid,
  p_type text,
  p_title text,
  p_body text
)
returns table (email text, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if not public.is_board() then
    raise exception 'Alleen bestuur kan dit.';
  end if;

  select * into v_cfg from public.notification_dispatch_config(p_type);
  if v_cfg.enabled then
    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select profile_id, p_type, p_title, p_body, '/agenda/' || (select slug from public.activities where id = p_activity_id),
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.activity_registrations
    where activity_id = p_activity_id;
  end if;

  return query
  select par.email, par.name
  from public.public_activity_registrations par
  where par.activity_id = p_activity_id;
end;
$$;
