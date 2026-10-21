-- Fix op 0141: invitations_board_requires_email (role = 'lid' or email is
-- not null) hield geen rekening met de bootstrap-uitnodiging uit
-- supabase/seed.sql, die bewust zonder e-mailadres EN zonder invited_by
-- wordt aangemaakt (de eerste beheerder-uitnodiging, vóórdat er al een
-- bestuur bestaat dat 'm zou kunnen versturen) — CI's eigen migratie-
-- replay (db:snapshot-stack) brak hier meteen op bij het draaien van
-- seed.sql.
--
-- invitations_insert (0001_init.sql) eist sowieso al `invited_by =
-- auth.uid()`: een rij met invited_by is null kan dus alleen via
-- rechtstreekse SQL (migratie/seed, een vertrouwde context) ontstaan, nooit
-- via de normale insert-policy voor een ingelogde gebruiker — de
-- oorspronkelijke dreiging (een gelekte, e-mailloze bestuurslink die
-- iedereen kan verzilveren) blijft hiermee net zo dichtgezet voor elke
-- uitnodiging die wél via de app is aangemaakt.
alter table public.invitations
  drop constraint if exists invitations_board_requires_email;

alter table public.invitations
  add constraint invitations_board_requires_email
  check (role = 'lid' or email is not null or invited_by is null);
