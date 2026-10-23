-- KRITIEKE REGRESSIE op productie (bedrijf aanmaken, profiel opslaan,
-- activiteit aanmaken braken allemaal): 0202 breidde guard_link_url_scheme()
-- uit met een activities-check, maar bracht daarmee precies de PL/pgSQL-
-- valkuil terug die 0191 al eens gefixt had (foutcode 42703 "record \"new\"
-- has no field ..."):
--
--  1) new.linkedin_url/instagram_url/facebook_url worden in 0202 nog steeds
--     ONVOORWAARDELIJK uitgelezen (geen TG_TABLE_NAME-check, zelfde patroon
--     als vóór 0191) -- en 0202 voegde ook de trigger
--     activities_guard_link_url_scheme toe, die op de activities-tabel
--     vuurt. Die tabel heeft geen van die drie kolommen, dus elke
--     activity-insert/-update van external_registration_url faalt
--     gegarandeerd.
--  2) De nieuwe external_registration_url-check gebruikt weer een
--     samengestelde AND (`if TG_TABLE_NAME = 'activities' and
--     new.external_registration_url is not null ...`) -- PostgreSQL
--     garandeert geen short-circuit-evaluatie in een PL/pgSQL IF, dus die
--     kolom kan ook worden uitgelezen op profiles/companies, waar hij niet
--     bestaat.
--
-- Fix, in dezelfde geest als 0191: een geneste IF per tabel, zodat een veld
-- nooit wordt uitgelezen tegen een rijtype dat het niet heeft. Komt een
-- volgende tabel/kolom hierbij, dan hoort die binnen zijn eigen
-- TG_TABLE_NAME-blok te staan, nooit als extra voorwaarde in een
-- samengestelde AND/IF die ook voor andere tabellen geldt.
create or replace function public.guard_link_url_scheme()
returns trigger
language plpgsql
as $$
begin
  if TG_TABLE_NAME in ('profiles', 'companies') then
    if new.linkedin_url is not null and new.linkedin_url !~* '^https?://\S+\.\S+' then
      new.linkedin_url := null;
    end if;
    if new.instagram_url is not null and new.instagram_url !~* '^https?://\S+\.\S+' then
      new.instagram_url := null;
    end if;
    if new.facebook_url is not null and new.facebook_url !~* '^https?://\S+\.\S+' then
      new.facebook_url := null;
    end if;
  end if;
  if TG_TABLE_NAME = 'companies' then
    if new.website is not null and new.website !~* '^https?://\S+\.\S+' then
      new.website := null;
    end if;
  end if;
  if TG_TABLE_NAME = 'activities' then
    if new.external_registration_url is not null
       and new.external_registration_url !~* '^https?://\S+\.\S+' then
      new.external_registration_url := null;
    end if;
  end if;
  return new;
end;
$$;

insert into public.schema_migration_log (version) values ('0213') on conflict (version) do nothing;
notify pgrst, 'reload schema';
