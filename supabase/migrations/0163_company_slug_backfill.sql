-- Backfill: bestaande companies.slug-waarden (met een willekeurige/id-staart,
-- zie 0161) hergenereren naar de schone vorm die 0161 nu voor nieuwe
-- bedrijven gebruikt. Zelfde opzet als de activiteiten-backfill (0155):
-- één tijdelijke tabel i.p.v. de berekening tweemaal herhalen, botsingen op
-- dezelfde naam krijgen hun suffix op volgorde van created_at (oudste rij
-- houdt de kale slug), en de oude slug wordt een alias naar hetzelfde
-- bedrijf zodat een al gedeelde embed-/portaal-link blijft werken.
create temporary table tmp_company_new_slugs on commit drop as
with numbered as (
  select
    id,
    slug as old_slug,
    nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), '') as base_slug,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
      order by created_at
    ) as rn
  from public.companies
)
select
  id,
  old_slug,
  coalesce(base_slug, 'bedrijf') || case when rn > 1 then '-' || rn else '' end as new_slug
from numbered;

insert into public.company_slug_aliases (slug, company_id)
select old_slug, id from tmp_company_new_slugs where old_slug <> new_slug;

update public.companies c
set slug = t.new_slug
from tmp_company_new_slugs t
where c.id = t.id and c.slug <> t.new_slug;
