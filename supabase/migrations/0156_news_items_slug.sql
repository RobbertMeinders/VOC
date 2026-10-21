-- URL-ronde #101: leesbare, stabiele slug per nieuwsbericht (bv.
-- "nieuwe-website-live" i.p.v. de kale uuid) — zelfde opbouw en collision-
-- staart ("-2", "-3", ...) als activiteiten (0049_activity_slug.sql) en
-- leden (0122_profile_slug.sql). I.t.t. agenda blijft dit bewust voor
-- altijd stabiel (zie lib/news/slug.ts): een nieuwsbericht heeft geen
-- datumcomponent in de slug en wordt na publicatie niet herverplaatst,
-- dus is er geen aanleiding om 'm ooit te laten wijzigen — geen
-- alias-tabel nodig.
alter table public.news_items add column if not exists slug text;

with numbered as (
  select
    id,
    nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '') as base_slug,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
      order by created_at
    ) as rn
  from public.news_items
)
update public.news_items n
set slug = coalesce(num.base_slug, 'nieuws') || case when num.rn > 1 then '-' || num.rn else '' end
from numbered num
where n.id = num.id
  and n.slug is null;

alter table public.news_items alter column slug set not null;

create unique index if not exists news_items_slug_key on public.news_items (slug);
