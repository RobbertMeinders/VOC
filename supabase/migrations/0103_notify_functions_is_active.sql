-- Communicatieplan fase 1e: drie triggerfuncties selecteren hun
-- bestuur/beheer-ontvangers op rol, maar filterden (anders dan bv.
-- notify_access_request en, sinds 0102, notify_new_member) niet op
-- is_active — een gedeactiveerd bestuurs-/beheerderslid kon in theorie nog
-- een melding krijgen. Alleen de rol-gebaseerde selectie krijgt de
-- toevoeging; het gedrag voor de overige ontvangers in deze functies
-- verandert niet.

create or replace function public.notify_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitter_name text;
begin
  if new.status = 'pending' then
    select first_name || ' ' || last_name into v_submitter_name
      from public.profiles where id = new.created_by;

    insert into public.notifications (profile_id, type, title, body, link)
    select id, 'activity_submission', 'Nieuwe activiteit ter goedkeuring',
      coalesce(v_submitter_name, 'Een lid') || ' heeft "' || new.title || '" ingediend.',
      '/agenda/' || new.id
    from public.profiles
    where is_active and role in ('bestuurslid', 'beheerder');
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
begin
  select first_name || ' ' || last_name into v_applicant_name from public.profiles where id = new.profile_id;
  select name into v_company_name from public.companies where id = new.company_id;

  insert into public.notifications (profile_id, type, title, body, link)
  select distinct recipient_id, 'company_membership_request', 'Nieuwe bedrijfskoppeling ter goedkeuring',
    coalesce(v_applicant_name, 'Iemand') || ' wil gekoppeld worden aan ' || coalesce(v_company_name, 'een bedrijf') || '.',
    '/bedrijven/' || new.company_id
  from (
    select profile_id as recipient_id from public.company_members where company_id = new.company_id
    union
    select id as recipient_id from public.profiles where is_active and role in ('bestuurslid', 'beheerder')
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
begin
  select first_name || ' ' || last_name into v_reporter_name
    from public.profiles where id = new.reporter_id;

  insert into public.notifications (profile_id, type, title, body, link)
  select id, 'feed_post_report', 'Bericht gerapporteerd',
    coalesce(v_reporter_name, 'Een lid') || ' heeft een bericht gerapporteerd (' || new.reason || ').',
    '/beheer/rapportages'
  from public.profiles
  where is_active and role in ('bestuurslid', 'beheerder');

  return new;
end;
$$;
