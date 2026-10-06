-- UX-review B2: de uitnodigingenlijst (Beheer -> Uitnodigingen) had geen
-- zichtbare status of een uitnodiging al eens gemaild is -- InvitationRow
-- hield dat alleen in lokale React state (sendResult), dus na een
-- paginarefresh (of voor een ander bestuurslid) was dat weer onzichtbaar.
-- last_sent_at wordt gezet bij elke geslaagde verzending (aanmaken-met-mail,
-- los opnieuw versturen, of de nieuwe bulkverzending) en voedt de
-- "Niet verstuurd" / "Verstuurd op ..." status in de UI.
alter table public.invitations add column last_sent_at timestamptz;
