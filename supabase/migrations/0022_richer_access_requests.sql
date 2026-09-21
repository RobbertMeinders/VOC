-- Eigen, embeddable aanmeldformulier (vervangt het externe WordPress-
-- formulier): vraagt iets meer dan naam/e-mail/toelichting, en notificeert
-- bestuur/beheer meteen zodat een aanvraag niet alleen via de teller op
-- /beheer wordt opgemerkt.

alter table public.access_requests
  add column phone text,
  add column company_name text,
  add column job_title text;

create or replace function public.notify_access_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, type, title, body, link)
  select id, 'access_request', 'Nieuwe aanmelding',
    new.name || ' heeft toegang aangevraagd voor het ledenportaal.',
    '/beheer/aanvragen'
  from public.profiles
  where is_active and role in ('bestuurslid', 'beheerder');
  return new;
end;
$$;

create trigger access_requests_notify
  after insert on public.access_requests
  for each row execute function public.notify_access_request();
