-- Bedrijfsprofiel: tagline (kort, gebruikt op zowel de bedrijfspagina als de
-- overzichtspagina) en eigen contactgegevens, los van de persoonlijke
-- gegevens van een medewerker.
alter table public.companies
  add column tagline text,
  add column phone text,
  add column email text;
