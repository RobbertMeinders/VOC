-- "Over mij" op het persoonlijke profiel, analoog aan companies.description.
alter table public.profiles
  add column if not exists bio text;
