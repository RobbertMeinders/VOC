-- Ingebrachte activiteiten mogen aanmelden via een externe website i.p.v.
-- de ingebouwde aanmeldfunctionaliteit; leeg laat de bestaande, interne
-- aanmeldknop gewoon werken.
alter table public.activities
  add column if not exists external_registration_url text;
