-- Zelfde patroon als show_email/show_phone (0006_profile_privacy.sql): een
-- lid bepaalt zelf of "Bijgewoonde evenementen" op zijn/haar profiel
-- zichtbaar is voor andere leden. Bestuur/beheer en het lid zelf zien het
-- altijd, ongeacht deze instelling (zie leden/[id]/page.tsx).
alter table public.profiles
  add column show_attended_activities boolean not null default true;
