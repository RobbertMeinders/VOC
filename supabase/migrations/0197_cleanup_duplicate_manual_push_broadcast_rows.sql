-- Eenmalige opschoning bij punt 7: ruimt de dubbele "manual_broadcast"-
-- meldingen op die er al staan van vóór de 0196-fix (één rij per abonnement
-- i.p.v. per lid). Binnen één insert-statement geeft now() exact dezelfde
-- timestamp aan alle rijen van dezelfde uitzending, dus profile_id/title/
-- body/created_at samen identificeren een duplicaat-groep betrouwbaar; de
-- rij met het laagste id per groep blijft staan, de rest wordt verwijderd.
-- Idempotent: op een schone tabel (rn altijd 1) verwijdert dit niets.
delete from public.notifications n
using (
  select id,
         row_number() over (
           partition by profile_id, title, body, created_at
           order by id
         ) as rn
  from public.notifications
  where type = 'manual_broadcast'
) dup
where n.id = dup.id
  and dup.rn > 1;

insert into public.schema_migration_log (version) values ('0197') on conflict (version) do nothing;
notify pgrst, 'reload schema';
