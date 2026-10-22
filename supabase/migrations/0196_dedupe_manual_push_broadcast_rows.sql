-- Punt 7: record_manual_push_broadcast (0041) voegde één notifications-rij
-- toe per BEREIKT ABONNEMENT (apparaat), niet per lid -- een lid met 2
-- geregistreerde apparaten kreeg daardoor 2 identieke "manual_broadcast"-
-- meldingen per handmatige uitzending. "select distinct unnest(...)" i.p.v.
-- "select unnest(...)" dedupet de profile_id's binnen de functie zelf, als
-- vangnet naast de dedup die pushbericht/actions.ts nu ook al vooraf doet.
--
-- create or replace (niet drop+create): signature/kolommen van de functie
-- blijven ongewijzigd, alleen de insert-select erin verandert.
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
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, body, pushed_at)
  select distinct unnest(p_reached_profile_ids), 'manual_broadcast', p_title, p_body, now();

  if array_length(p_dead_endpoints, 1) > 0 then
    delete from public.push_subscriptions where endpoint = any(p_dead_endpoints);
  end if;
end;
$$;

insert into public.schema_migration_log (version) values ('0196') on conflict (version) do nothing;
notify pgrst, 'reload schema';
