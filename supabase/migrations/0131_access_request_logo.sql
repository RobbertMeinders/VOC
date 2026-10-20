-- D: anonieme bedrijfslogo-upload op het aanmeldformulier. Robberts
-- verduidelijking van taak D: bij het invullen van /toegang-aanvragen kun je,
-- als je een nieuw bedrijf opgeeft, meteen het logo meesturen — dan staat
-- het al klaar zodra het bestuur de aanvraag goedkeurt en het account
-- geactiveerd wordt, zonder dat het logo later nog een keer apart geüpload
-- hoeft te worden.
--
-- Bewaart alleen het storage-PAD (zelfde opzet als companies.logo_url/
-- logo_thumb_url, zie 0001_init.sql), niet of het pad al écht bestaat — de
-- upload zelf gebeurt via een service-role-client naar een tijdelijke
-- 'pending/{access_request.id}/...'-map (er is op aanmeldmoment nog geen
-- company_id om de bestaande company-logos-RLS op te laten matchen), en
-- wordt pas bij goedkeuring (createInvitationFromAccessRequestAction) naar
-- de echte bedrijfsmap verplaatst — alleen als daarbij ook echt een NIEUW
-- bedrijf wordt aangemaakt, nooit bij een match met een bestaand bedrijf.
alter table public.access_requests
  add column if not exists logo_path text,
  add column if not exists logo_thumb_path text;
