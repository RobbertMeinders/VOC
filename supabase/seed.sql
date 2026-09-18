-- One-time bootstrap.
-- profiles can only be created by accepting an invitation (see
-- handle_new_user() in 0001_init.sql), so the very first account needs one
-- seeded manually. Run this once against a fresh database, copy the
-- returned token, and open /register/<token> to create the founding
-- beheerder account. Safe to re-run — each run issues a fresh token.

insert into public.invitations (token, role, expires_at)
values (encode(gen_random_bytes(24), 'hex'), 'beheerder', now() + interval '7 days')
returning token as bootstrap_invitation_token;
