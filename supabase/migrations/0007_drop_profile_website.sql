-- The personal "website" field is redundant with the company's website and
-- confused members during signup. Website now lives only on companies.

alter table public.profiles
  drop column website;
