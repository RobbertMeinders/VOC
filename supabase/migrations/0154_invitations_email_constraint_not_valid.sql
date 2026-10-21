-- Fix op H3 (0141/0143): invitations_board_requires_email werd toegevoegd
-- als een gewone CHECK constraint, en die valideert bij het toevoegen zelf
-- META ALLE BESTAANDE rijen — op de live database bestond al een echte,
-- legitieme e-mailloze bestuurs-/beheerderuitnodiging (aangemaakt vóórdat
-- deze beveiligingsfix bestond, dus mét een invited_by, niet de
-- bootstrap-uitzondering uit 0143), waardoor het toevoegen van de
-- constraint zelf al faalde (23514) voordat 0143's verruiming ooit kon
-- draaien. CI's migratie-replay raakte dit nooit, want een lege,
-- disposable testdatabase heeft nooit zo'n historische rij.
--
-- NOT VALID: Postgres slaat de initiële scan van bestaande rijen over,
-- maar blijft de constraint wél afdwingen voor elke nieuwe/gewijzigde rij
-- vanaf nu — precies het gewenste gedrag (de dreiging die H3 dichtzet is
-- een NIEUWE, door de app aangemaakte e-mailloze bestuursuitnodiging, niet
-- een al bestaande rij van vóór deze fix).
alter table public.invitations
  drop constraint if exists invitations_board_requires_email;

alter table public.invitations
  add constraint invitations_board_requires_email
  check (role = 'lid' or email is not null or invited_by is null)
  not valid;
