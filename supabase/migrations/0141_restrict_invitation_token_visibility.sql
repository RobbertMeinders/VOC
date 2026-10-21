-- Beveiligingsfixlijst Blok 1, H3: invitations_board_select (0001_init.sql)
-- liet élk bestuurslid de volledige rij van ELKE uitnodiging lezen,
-- inclusief de token-kolom waarmee de uitnodiging daadwerkelijk verzilverd
-- kan worden — ook voor een bestuurs-/beheerdersuitnodiging, die een gewoon
-- bestuurslid zelf niet mag aanmaken of wijzigen (invitations_insert/
-- invitations_update beperken dat al tot is_admin()). Dezelfde voorwaarde
-- geldt nu ook voor select: wie de token niet mag toekennen, krijgt 'm ook
-- niet te zien.
drop policy if exists "invitations_board_select" on public.invitations;

create policy "invitations_board_select" on public.invitations
  for select using (
    public.is_admin() or (role = 'lid' and public.is_board())
  );

-- Een generieke (e-mailloze) uitnodigingslink is voor "lid" bewust
-- ondersteund (bv. een algemene aanmeldlink op een netwerkborrel), maar
-- voor bestuur/beheerder zou zo'n link, eenmaal gelekt, voor IEDEREEN die
-- hem in handen krijgt een account met verhoogde rechten opleveren — zonder
-- dat de e-mailadres-matchcontrole uit handle_new_user() (0063) daar iets
-- tegen kan doen, want die controle slaat alleen aan als invitations.email
-- al ingevuld is.
alter table public.invitations
  add constraint invitations_board_requires_email
  check (role = 'lid' or email is not null);
