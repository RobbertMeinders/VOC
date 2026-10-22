-- Hardening-batch, vervolgronde. Bundelt bewust de trigger-typefout-fix MET
-- de nieuwe insert-guards hieronder (niet los opleveren): zolang de
-- typefout in de vier meldingstriggers staat, laat die een aanroep met een
-- ingeschakelde meldingsconfig voor dat type sowieso knappen op "operator
-- does not exist: user_role = text" (role is een enum, v_cfg.roles text[])
-- -- wat de insert daar zelf ook blokkeert. Dat is toevallig een
-- bijwerking die de hieronder gefixte paden al deels afschermde; die
-- toevallige bescherming vervalt zodra de typefout alleen wordt gefixt.
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
  where is_active and role::text = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  return new;
end;
$$;

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
    where is_active and role::text = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder'])) and id <> new.id;
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
      '/agenda/' || new.slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role::text = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
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
    select profile_id as recipient_id from public.company_members where company_id = new.company_id
    union
    select id as recipient_id from public.profiles where is_active and role::text = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']))
  ) recipients
  where recipient_id <> new.profile_id;

  return new;
end;
$$;

-- VOC-04: access_requests.logo_path/logo_thumb_path worden door
-- createInvitationFromAccessRequestAction (beheer/aanvragen/actions.ts)
-- rechtstreeks aan een service-role storage move()/remove() doorgegeven,
-- zonder te checken of het pad daadwerkelijk bij DEZE aanvraag hoort --
-- een anoniem ingediende aanvraag (submitAccessRequestAction) kan deze
-- velden vrij zetten, dus zonder deze CHECK kon een vervalst pad een
-- willekeurig storage-object in company-logos laten verplaatsen of
-- (bij een naamsmatch met een bestaand bedrijf) verwijderen. Alleen het
-- verwachte 'pending/<eigen-aanvraag-id>/...'-pad is toegestaan; de
-- action zelf krijgt hieronder ook een eigen check als tweede laag.
alter table public.access_requests
  add constraint access_requests_logo_path_scoped
  check (logo_path is null or logo_path like 'pending/' || id::text || '/%'),
  add constraint access_requests_logo_thumb_path_scoped
  check (logo_thumb_path is null or logo_thumb_path like 'pending/' || id::text || '/%');

-- VOC-06: companies_members_insert (0172) laat elk actief lid een
-- companies-rij invoegen met elke kolomwaarde naar keuze -- inclusief
-- membership_status='lid', is_publicly_visible=true, een vervalste
-- created_by/member_since en een zelfgekozen slug. BEFORE INSERT-guard
-- forceert voor niet-bestuur dezelfde beginwaarden als een echte nieuwe
-- prospect, en genereert de slug altijd zelf (nooit clientinvoer) zodat
-- een bestaande alias niet gekaapt kan worden.
create or replace function public.generate_unique_company_slug(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  v_base := nullif(trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), '');
  v_base := coalesce(v_base, 'bedrijf');
  v_candidate := v_base;
  while exists (select 1 from public.companies where slug = v_candidate)
     or exists (select 1 from public.company_slug_aliases where slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;
  return v_candidate;
end;
$$;

create or replace function public.guard_company_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    new.membership_status := 'prospect';
    new.is_publicly_visible := false;
    new.created_by := auth.uid();
    new.member_since := null;
    new.membership_end_date := null;
    new.slug := public.generate_unique_company_slug(new.name);
  end if;
  return new;
end;
$$;

create trigger companies_guard_insert
  before insert on public.companies
  for each row execute function public.guard_company_insert();

revoke execute on function public.guard_company_insert() from public;

-- VOC-10: activities_insert (0172) laat elk actief lid een activiteit
-- invoegen; normalize_activity_submission (0015) forceert al source/status
-- voor een niet-bestuurslid, maar nooit created_by zelf -- new.created_by
-- kon dus vervalst worden. Zelfde if-tak uitgebreid i.p.v. een losse
-- trigger. external_registration_url miste bovendien de scheme-check die
-- linkedin/instagram/facebook/website al hebben (0151) -- guard_link_url_
-- scheme uitgebreid met een activities-tak, nieuwe trigger erbij.
create or replace function public.normalize_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_board() then
    if new.source = 'lid' then
      new.status = 'pending';
    else
      new.source = 'voc';
      new.status = 'approved';
    end if;
  else
    new.source = 'lid';
    new.status = 'pending';
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.guard_link_url_scheme()
returns trigger
language plpgsql
as $$
begin
  if new.linkedin_url is not null and new.linkedin_url !~* '^https?://\S+\.\S+' then
    new.linkedin_url := null;
  end if;
  if new.instagram_url is not null and new.instagram_url !~* '^https?://\S+\.\S+' then
    new.instagram_url := null;
  end if;
  if new.facebook_url is not null and new.facebook_url !~* '^https?://\S+\.\S+' then
    new.facebook_url := null;
  end if;
  if TG_TABLE_NAME = 'companies' and new.website is not null and new.website !~* '^https?://\S+\.\S+' then
    new.website := null;
  end if;
  if TG_TABLE_NAME = 'activities' and new.external_registration_url is not null
     and new.external_registration_url !~* '^https?://\S+\.\S+' then
    new.external_registration_url := null;
  end if;
  return new;
end;
$$;

create trigger activities_guard_link_url_scheme
  before insert or update of external_registration_url on public.activities
  for each row execute function public.guard_link_url_scheme();

insert into public.schema_migration_log (version) values ('0202') on conflict (version) do nothing;
notify pgrst, 'reload schema';
