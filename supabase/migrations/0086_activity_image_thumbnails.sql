-- Vervolg op 0085_image_thumbnails.sql (performance-audit #1, fase 2): zelfde
-- aanpak, nu voor activiteitfoto's. Een activiteitkaart (Agenda, Home,
-- Zoeken) toont de foto op 112-366px, maar kreeg tot nu toe altijd de volle
-- (tot 1920px) foto — bij Agenda gemeten 1,9 MB aan afbeeldingen per
-- paginaweergave. Nullable: bestaande activiteiten hebben nog geen thumbnail
-- tot iemand de afbeelding opnieuw upload; de kaarten vallen tot die tijd
-- terug op de volledige foto.
alter table public.activities add column if not exists image_thumb_url text;
