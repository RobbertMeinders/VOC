-- Live gevonden (bevestigd via een teruggedraaide directe RPC-aanroep op
-- productie, foutcode 42703 "record \"new\" has no field \"website\""):
-- guard_link_url_scheme() (0151) gebruikt een samengestelde AND-conditie
--   if TG_TABLE_NAME = 'companies' and new.website is not null and ... then
-- PostgreSQL garandeert GEEN short-circuit-evaluatie op zo'n voorwaarde in
-- een PL/pgSQL IF (anders dan in de meeste procedurele talen) -- new.website
-- kan dus ook worden uitgelezen wanneer TG_TABLE_NAME = 'profiles', en die
-- kolom bestaat daar niet meer sinds 0007_drop_profile_website.sql.
--
-- De profiles-trigger (0164) vuurt bij elke update van linkedin_url, dus dit
-- trof zowel update_my_profile (0188, zet linkedin_url altijd expliciet --
-- de live "Opslaan is niet gelukt"-blokker) als anonymize_profile_now (0168,
-- zet linkedin_url naar null bij lid verwijderen/opzeggen -- de live
-- "Verwijderen is niet gelukt"-fout) en de oudere directe update-paden in
-- profiel/actions.ts en leden/[id]/actions.ts.
--
-- Fix: geneste IF i.p.v. samengestelde AND, zodat new.website nooit wordt
-- uitgelezen tenzij de trigger daadwerkelijk op companies draait. De
-- linkedin/instagram/facebook-regels blijven ongewijzigd (die kolommen
-- bestaan op beide tabellen).
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
  if TG_TABLE_NAME = 'companies' then
    if new.website is not null and new.website !~* '^https?://\S+\.\S+' then
      new.website := null;
    end if;
  end if;
  return new;
end;
$$;

insert into public.schema_migration_log (version) values ('0191') on conflict (version) do nothing;
notify pgrst, 'reload schema';
