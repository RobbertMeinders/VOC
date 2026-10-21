-- get_activity_registration_counts (0088) telde alleen aanmeldingen van
-- leden (activity_registrations) — externe aanmeldingen voor dezelfde
-- activiteit (public_activity_registrations) hadden geen wachtlijst-
-- onderscheid en telden hier nergens mee. Drie plekken in de app
-- (agenda/zoeken via deze RPC, het activiteitdetail, en de embed-
-- statusroute) toonden daardoor elk een eigen, inconsistente telling —
-- stuk voor stuk zonder de externe aanmeldingen. Rij-vorm blijft
-- ongewijzigd, dus "create or replace" volstaat (geen 42P13-risico).
create or replace function public.get_activity_registration_counts()
returns table (activity_id uuid, registered_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select activity_id, count(*) as registered_count
  from (
    select activity_id from public.activity_registrations where is_waitlisted = false
    union all
    select activity_id from public.public_activity_registrations
  ) combined
  group by activity_id;
$$;

grant execute on function public.get_activity_registration_counts() to authenticated;
