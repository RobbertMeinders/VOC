-- Social-mediahandles (LinkedIn/Instagram/Facebook) voor zowel het
-- persoonlijke profiel als het bedrijfsprofiel — losse, optionele velden,
-- zichtbaar op beide publieke profielpagina's zodra ze zijn ingevuld.
alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

alter table public.companies
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;
