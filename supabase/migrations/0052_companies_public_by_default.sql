-- Bijstelling op 0050_public_company_directory.sql: bedrijven bleken in de
-- praktijk vrijwel nooit zelf naar het schuifje te gaan, dus de
-- bedrijvengids-embed bleef leeg. Bedrijven staan nu standaard WEL op de
-- openbare bedrijvengids (opt-out i.p.v. opt-in) — een bedrijf kan zich er
-- nog altijd vanaf halen via hetzelfde schuifje (CompanyForm of
-- Instellingen). De per-persoon zichtbaarheid van naam+functie
-- (profiles.publicly_visible) blijft bewust wél opt-in/default false: dat
-- is een persoonlijke, geen bedrijfsbrede keuze.
alter table public.companies alter column is_publicly_visible set default true;

update public.companies set is_publicly_visible = true where is_publicly_visible = false;
