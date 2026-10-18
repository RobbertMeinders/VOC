-- Communicatieplan fase 2: koppelt elke notify_*-functie/RPC die een
-- configureerbaar type aanmaakt aan notification_dispatch_config (0104).
-- Per functie: (1) niets inserten als het type uitgeschakeld is, (2) de
-- rolgebaseerde selectie (waar van toepassing) uit de instellingen lezen
-- i.p.v. hardcoded, met de oude hardcoded rollen als fallback, (3) de drie
-- channel_*_allowed-kolommen vullen vanuit de instellingen. Waar al een
-- eigen, specifiekere uitzondering bestond (new_activity se per-activiteit
-- notify_push/notify_email, report_resolved se hardcoded in-app-only) blijft
-- die behouden en telt de nieuwe instelling als EXTRA voorwaarde (AND), niet
-- als vervanging.

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
      '/leden/' || new.id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder'])) and id <> new.id;
  end if;
  return new;
end;
$$;

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
      '/agenda/' || new.id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  end if;
  return new;
end;
$$;

create or replace function public.notify_company_membership_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_name text;
  v_company_name text;
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('company_membership_request');
  if not v_cfg.enabled then
    return new;
  end if;

  select first_name || ' ' || last_name into v_applicant_name from public.profiles where id = new.profile_id;
  select name into v_company_name from public.companies where id = new.company_id;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select distinct recipient_id, 'company_membership_request', 'Nieuwe bedrijfskoppeling ter goedkeuring',
    coalesce(v_applicant_name, 'Iemand') || ' wil gekoppeld worden aan ' || coalesce(v_company_name, 'een bedrijf') || '.',
    '/bedrijven/' || new.company_id,
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

create or replace function public.notify_feed_post_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_name text;
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('feed_post_report');
  if not v_cfg.enabled then
    return new;
  end if;

  select first_name || ' ' || last_name into v_reporter_name
    from public.profiles where id = new.reporter_id;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select id, 'feed_post_report', 'Bericht gerapporteerd',
    coalesce(v_reporter_name, 'Een lid') || ' heeft een bericht gerapporteerd (' || new.reason || ').',
    '/beheer/rapportages',
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from public.profiles
  where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));

  return new;
end;
$$;

create or replace function public.notify_access_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('access_request');
  if not v_cfg.enabled then
    return new;
  end if;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select id, 'access_request', 'Nieuwe aanmelding',
    new.name || ' heeft toegang aangevraagd voor het ledenportaal.',
    '/beheer/aanvragen',
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from public.profiles
  where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  return new;
end;
$$;

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
      '/agenda/' || new.id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;
  return new;
end;
$$;

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
          else 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen.'
        end,
        '/bedrijven/' || new.company_id,
        v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.notify_on_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_commenter_name text;
  v_cfg record;
begin
  select author_id into v_post_author from public.feed_posts where id = new.post_id;

  if v_post_author is not null and v_post_author <> new.author_id then
    select * into v_cfg from public.notification_dispatch_config('feed_comment');
    if not v_cfg.enabled then
      return new;
    end if;

    select first_name || ' ' || last_name into v_commenter_name
      from public.profiles where id = new.author_id;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      v_post_author,
      'feed_comment',
      'Nieuwe reactie op je bericht',
      coalesce(v_commenter_name, 'Iemand') || ' heeft gereageerd op je bericht.',
      '/community?highlight=' || new.id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;

  return new;
end;
$$;

create or replace function public.dispatch_mention_notifications(
  p_content text,
  p_author_id uuid,
  p_context text,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_name text;
  v_match text[];
  v_profile_ids uuid[] := '{}';
  v_company_ids uuid[] := '{}';
  v_target_ids uuid[];
  v_cfg record;
begin
  if p_content is null then
    return;
  end if;

  for v_match in
    select regexp_matches(p_content, '@\[[^\]]+\]\((profiel|bedrijf):([0-9a-fA-F-]{36})\)', 'g')
  loop
    if v_match[1] = 'profiel' then
      v_profile_ids := array_append(v_profile_ids, v_match[2]::uuid);
    else
      v_company_ids := array_append(v_company_ids, v_match[2]::uuid);
    end if;
  end loop;

  if array_length(v_profile_ids, 1) is null and array_length(v_company_ids, 1) is null then
    return;
  end if;

  select * into v_cfg from public.notification_dispatch_config('feed_mention');
  if not v_cfg.enabled then
    return;
  end if;

  select first_name || ' ' || last_name into v_author_name
    from public.profiles where id = p_author_id;

  select array_agg(distinct target) into v_target_ids
  from (
    select p.id as target
    from public.profiles p
    where p.id = any(v_profile_ids) and p.is_active and p.id <> p_author_id

    union

    select cm.profile_id as target
    from public.company_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.company_id = any(v_company_ids) and p.is_active and cm.profile_id <> p_author_id
  ) t;

  if v_target_ids is null then
    return;
  end if;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select target, 'feed_mention', 'Je bent genoemd in de feed',
    coalesce(v_author_name, 'Iemand') || ' heeft je genoemd in ' || p_context || '.',
    '/community?highlight=' || p_target_id,
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from unnest(v_target_ids) as target;
end;
$$;

create or replace function public.promote_next_waitlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.activity_registrations;
  v_title text;
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
    select title into v_title from public.activities where id = old.activity_id;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      v_next.profile_id,
      'waitlist_promoted',
      'Je staat nu op de deelnemerslijst',
      'Er is een plek vrijgekomen voor "' || coalesce(v_title, 'de activiteit') || '" — je bent van de wachtlijst gehaald.',
      '/agenda/' || old.activity_id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;

  return old;
end;
$$;

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
    '/agenda/' || a.id,
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from public.activity_registrations r
  join public.activities a on a.id = r.activity_id
  where a.starts_at > now()
    and a.starts_at <= now() + interval '2 days'
    and not exists (
      select 1 from public.notifications n
      where n.profile_id = r.profile_id
        and n.type = 'activity_reminder'
        and n.link = '/agenda/' || a.id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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
      '/agenda/' || new.id,
      new.notify_push and v_cfg.channel_push,
      new.notify_email and v_cfg.channel_email,
      v_cfg.channel_inapp
    from public.profiles
    where is_active and (new.created_by is null or id <> new.created_by);
  end if;
  return new;
end;
$$;

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
    select profile_id, p_type, p_title, p_body, '/agenda/' || p_activity_id,
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

-- report_resolved was voorheen hardcoded in-app-only (channel_push_allowed/
-- channel_email_allowed altijd false) — nu via de instelling (0104 seedt
-- 'report_resolved' al met channel_push/channel_email = false), zodat deze
-- voortaan ook via de nieuwe instellingen-tab aan te zetten is.
create or replace function public.notify_report_resolved(p_report_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid;
  v_cfg record;
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  select reporter_id into v_reporter_id from public.feed_post_reports where id = p_report_id;
  if v_reporter_id is null then
    return;
  end if;

  select * into v_cfg from public.notification_dispatch_config('report_resolved');
  if not v_cfg.enabled then
    return;
  end if;

  insert into public.notifications (profile_id, type, title, body, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  values (
    v_reporter_id,
    'report_resolved',
    'Je melding is behandeld',
    case
      when p_decision = 'deleted' then 'Het gemelde bericht is verwijderd.'
      else 'De melding is beoordeeld; het bericht blijft staan.'
    end,
    v_cfg.channel_push,
    v_cfg.channel_email,
    v_cfg.channel_inapp
  );
end;
$$;
