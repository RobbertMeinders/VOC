-- URL-ronde #100: de activiteiten-slug krijgt er de Nederlandse maand + het
-- jaar van starts_at bij (zie activitySlugBase, lib/agenda/slug.ts) en kan
-- daardoor voortaan wijzigen — bij een titel- of datumwijziging (zie
-- updateActivityAction), i.t.t. de leden-/bedrijven-slug die bewust voor
-- altijd stabiel blijft. Zonder deze tabel zou zo'n wijziging een al
-- gedeelde link (e-mail, WhatsApp, agenda-uitnodiging) stuk maken — elke
-- overschreven slug komt hier te staan, en wijst altijd naar de huidige
-- activiteit, zodat de oude URL met een 308 naar de nieuwe doorstuurt.
create table public.activity_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  activity_id uuid not null references public.activities (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index activity_slug_aliases_activity_id_idx on public.activity_slug_aliases (activity_id);

alter table public.activity_slug_aliases enable row level security;

-- Alleen gelezen door de portaal-routes zelf (ActivityDetailContent,
-- ActivityEditContent, de .ics/.csv-downloadroutes) om een gemiste
-- directe match op te lossen — zelfde zichtbaarheidsgrens als de
-- activiteiten die deze tabel beschrijft (actief lid, of bestuur/beheer).
-- Geen anon-policy: de publieke embed (/embed/agenda/[id]) adresseert
-- altijd op het kale UUID, nooit op slug, en kent deze tabel dus niet.
create policy "activity_slug_aliases_select" on public.activity_slug_aliases
  for select to authenticated
  using (public.is_active_member());

-- Alleen bestuur/beheer mag een activiteit bewerken (activities_board_update,
-- 0001_init.sql) — alleen zij kunnen dus ook een slug laten verouderen.
create policy "activity_slug_aliases_insert" on public.activity_slug_aliases
  for insert to authenticated
  with check (public.is_board());

grant select, insert on public.activity_slug_aliases to authenticated;

-- Backfill: elke bestaande activiteit krijgt de nieuwe, datum-gekwalificeerde
-- slug; de oude (kale titel-slug) wordt een alias naar dezelfde activiteit,
-- zodat een al gedeelde link blijft werken. Zelfde opbouw als
-- activitySlugBase (lib/agenda/slug.ts) en dezelfde collision-staart
-- ("-2", "-3", ...) als de bestaande generateUniqueSlug (agenda/actions.ts)
-- — hier in SQL nagebouwd omdat een migratie geen app-code kan aanroepen.
-- Eén tijdelijke tabel i.p.v. de berekening tweemaal herhalen (alias-insert
-- + activities-update): anders zouden de twee stappen bij de geringste
-- afwijking uit elkaar kunnen lopen.
create temporary table tmp_activity_new_slugs on commit drop as
with maand_namen (nr, naam) as (
  values
    (1, 'januari'), (2, 'februari'), (3, 'maart'), (4, 'april'), (5, 'mei'), (6, 'juni'),
    (7, 'juli'), (8, 'augustus'), (9, 'september'), (10, 'oktober'), (11, 'november'), (12, 'december')
),
basis as (
  select
    a.id,
    a.slug as old_slug,
    nullif(
      trim(both '-' from regexp_replace(
        lower(a.title || ' ' || m.naam || ' ' || extract(year from a.starts_at at time zone 'Europe/Amsterdam')::text),
        '[^a-z0-9]+', '-', 'g'
      )),
      ''
    ) as new_base
  from public.activities a
  join maand_namen m on m.nr = extract(month from a.starts_at at time zone 'Europe/Amsterdam')
),
genummerd as (
  select
    id,
    old_slug,
    coalesce(new_base, 'activiteit') as new_base,
    row_number() over (partition by coalesce(new_base, 'activiteit') order by id) as rn
  from basis
)
select id, old_slug, new_base || case when rn > 1 then '-' || rn else '' end as new_slug
from genummerd;

insert into public.activity_slug_aliases (slug, activity_id)
select old_slug, id from tmp_activity_new_slugs where old_slug <> new_slug;

update public.activities a
set slug = t.new_slug
from tmp_activity_new_slugs t
where a.id = t.id and a.slug <> t.new_slug;
