-- Onderscheid tussen "aangemeld" en "daadwerkelijk aanwezig geweest" — nodig
-- voor de "Bijgewoonde evenementen"-sectie op het ledenprofiel, die alleen
-- activiteiten mag tonen die echt zijn bijgewoond, niet elke aanmelding.
-- Bestuur/beheerder vinkt na afloop af wie er was (AttendeeList.tsx).

alter table public.activity_registrations
  add column if not exists attended boolean not null default false;

drop policy if exists "activity_registrations_board_update" on public.activity_registrations;
create policy "activity_registrations_board_update" on public.activity_registrations
  for update using (public.is_board());
