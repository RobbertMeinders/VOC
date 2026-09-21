-- Coördinaten voor de interactieve kaart op de bedrijvenpagina. Worden
-- server-side gevuld door geocodeAddress() (src/lib/geo/geocode.ts) zodra
-- een bedrijfsadres wordt opgeslagen — geen aparte migratie van bestaande
-- adressen; die krijgen pas coördinaten bij de eerstvolgende keer bewerken.
alter table public.companies
  add column latitude double precision,
  add column longitude double precision;
