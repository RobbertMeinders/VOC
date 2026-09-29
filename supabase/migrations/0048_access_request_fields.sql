-- Het openbare aanmeldformulier (/embed/aanmelden) vroeg tot nu toe veel
-- minder dan het externe WordPress-formulier dat het vervangt — bestuur
-- wil zoveel mogelijk info van een potentieel lid vóórdat ze een
-- uitnodiging sturen. `name` blijft bestaan (not null, gebruikt door de
-- bestaande notificatietrigger en het beheerscherm) en wordt voortaan
-- server-side samengesteld uit first_name + last_name — geen brekende
-- wijziging voor bestaande code.
alter table public.access_requests
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists website text,
  -- Tijdstip waarop de aanvrager expliciet akkoord ging met het bewaren van
  -- zijn/haar gegevens (de verplichte toestemmingscheckbox op het
  -- formulier) — nooit automatisch gezet, alleen als de checkbox echt is
  -- aangevinkt. Bewaart wanneer, niet alleen dát.
  add column if not exists consent_at timestamptz;

-- Best-effort terugvullen voor bestaande rijen (alleen `name` had een
-- waarde) — laatste woord = achternaam, de rest = voornaam. Niet waterdicht
-- bij tussenvoegsels, maar beter dan lege velden; nieuwe aanvragen krijgen
-- de losse velden gewoon direct mee vanuit het formulier.
update public.access_requests
set
  first_name = coalesce(first_name, nullif(trim(substring(name from '^(.*)\s+\S+$')), '')),
  last_name = coalesce(last_name, nullif(trim(substring(name from '\S+$')), ''))
where first_name is null;
