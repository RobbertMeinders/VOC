-- Feed-categorisatie: een optioneel label op een bericht (vraag, aanbod,
-- nieuws, overig) zodat vraag-en-aanbod tussen leden onderling makkelijker
-- vindbaar is dan in een ongesorteerde tijdlijn. Bestaande berichten blijven
-- ongelabeld (null) — geen migratie van bestaande content nodig.
alter table public.feed_posts
  add column type text check (type in ('vraag', 'aanbod', 'nieuws', 'overig'));

create index feed_posts_type_idx on public.feed_posts (type);
