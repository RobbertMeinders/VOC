-- De zoekoverlay en /zoeken filteren op ilike '%term%' — een leidend
-- jokerteken maakt een gewone btree-index onbruikbaar, dus dat was tot nu
-- toe een sequential scan over de hele tabel bij elke zoekopdracht. GIN
-- trigram-indexen maken diezelfde ilike-substring-zoekopdrachten wel
-- index-versneld, ook naarmate het ledenbestand/documentenarchief groeit.

create extension if not exists pg_trgm;

create index if not exists profiles_first_name_trgm_idx on public.profiles using gin (first_name gin_trgm_ops);
create index if not exists profiles_last_name_trgm_idx on public.profiles using gin (last_name gin_trgm_ops);

create index if not exists companies_name_trgm_idx on public.companies using gin (name gin_trgm_ops);
create index if not exists companies_city_trgm_idx on public.companies using gin (city gin_trgm_ops);
create index if not exists companies_tagline_trgm_idx on public.companies using gin (tagline gin_trgm_ops);

create index if not exists documents_title_trgm_idx on public.documents using gin (title gin_trgm_ops);
create index if not exists documents_description_trgm_idx on public.documents using gin (description gin_trgm_ops);
create index if not exists documents_category_trgm_idx on public.documents using gin (category gin_trgm_ops);

create index if not exists activities_title_trgm_idx on public.activities using gin (title gin_trgm_ops);
create index if not exists activities_location_trgm_idx on public.activities using gin (location gin_trgm_ops);
create index if not exists activities_description_trgm_idx on public.activities using gin (description gin_trgm_ops);

create index if not exists feed_posts_content_trgm_idx on public.feed_posts using gin (content gin_trgm_ops);
