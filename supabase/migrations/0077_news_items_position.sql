-- UX-wens: nieuwsberichten (Beheer -> Nieuws) handmatig kunnen herordenen
-- ("regel hoger/lager zetten"), i.p.v. altijd automatisch op created_at te
-- sorteren -- die volgorde voedt zowel /nieuws als de nieuws-hero op Home.
alter table public.news_items add column position integer;

-- Backfill: huidige created_at-desc-volgorde (nieuwste eerst) wordt de
-- startpositie, zodat bestaande berichten niet door elkaar springen.
with ranked as (
  select id, row_number() over (order by created_at desc) - 1 as rn
  from public.news_items
)
update public.news_items n
set position = ranked.rn
from ranked
where ranked.id = n.id;

alter table public.news_items alter column position set not null;
alter table public.news_items alter column position set default 0;

drop index if exists public.news_items_created_at_idx;
create index news_items_position_idx on public.news_items (position);
