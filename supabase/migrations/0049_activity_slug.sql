-- Leesbare, stabiele slug per activiteit (bv. "open-borrel" i.p.v. de kale
-- uuid), gebruikt voor de #-ankers die de "Delen"-knop op de openbare
-- agenda-embed genereert (zie ShareActivityButton + /embed/agenda's
-- ?activiteit=<slug>-lookup). Wordt eenmalig bij het aanmaken van een
-- activiteit gegenereerd (app-side, zie generateUniqueSlug in
-- agenda/actions.ts) en daarna nooit meer overschreven, ook niet als de
-- titel later wijzigt — anders zou een eerder gedeelde link stukgaan.

alter table public.activities add column if not exists slug text;

-- Backfill voor bestaande rijen: slugify(title), met een oplopend
-- "-2"/"-3"-achtervoegsel bij een botsing (oudste rij houdt de kale slug).
with numbered as (
  select
    id,
    nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '') as base_slug,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
      order by created_at
    ) as rn
  from public.activities
)
update public.activities a
set slug = coalesce(n.base_slug, 'activiteit') || case when n.rn > 1 then '-' || n.rn else '' end
from numbered n
where a.id = n.id
  and a.slug is null;

alter table public.activities alter column slug set not null;

create unique index if not exists activities_slug_key on public.activities (slug);
