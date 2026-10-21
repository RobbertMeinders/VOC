-- Portaal-gezondheid Blok C (schaalbaarheid): public.events groeit
-- ongelimiteerd (log_event, log_notification_click, log_push_unsubscribed,
-- log_email_opened/clicked, en de rate-limit-boekhouding in
-- lib/auth/rate-limit.ts) zonder dat er ooit iets wordt opgeruimd. Elke
-- bestaande consument (Statistieken, de rate-limiters zelf) kijkt hoogstens
-- terug tot een paar uur of 365 dagen — 400 dagen bewaartermijn (ruim boven
-- het breedste bestaande gebruik) voorkomt onbegrensde groei zonder een
-- van de huidige functies te raken.
create or replace function public.cleanup_old_events()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.events where created_at < now() - interval '400 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_old_events() from public, anon, authenticated;
grant execute on function public.cleanup_old_events() to service_role;
