-- Performance-audit #8 (fase 3): Agenda en Zoeken haalden tot nu toe de hele
-- activity_registrations-tabel op (activity_id, is_waitlisted) om per
-- activiteit het aantal niet-wachtlijst-aanmeldingen in JavaScript te tellen.
-- Nu nog klein, maar fout zodra de tabel boven de 1000 rijen komt (Supabase's
-- standaardlimiet op een gewone select): de telling wordt dan stil afgekapt.
-- Een GROUP BY in de database telt per activiteit i.p.v. per aanmelding, dus
-- de resultaatset blijft altijd beperkt tot het aantal activiteiten, niet het
-- (groeiende) aantal aanmeldingen.
create or replace function public.get_activity_registration_counts()
returns table (activity_id uuid, registered_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select activity_id, count(*) as registered_count
  from public.activity_registrations
  where is_waitlisted = false
  group by activity_id;
$$;

grant execute on function public.get_activity_registration_counts() to authenticated;
