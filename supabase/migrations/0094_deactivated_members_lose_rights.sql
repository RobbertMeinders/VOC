-- B5: een gedeactiveerd account (is_active=false) houdt via requireProfile()
-- (lib/auth/session.ts) geen toegang meer tot een Server Component/Action,
-- en via current_role()/is_board()/is_admin() (die allemaal via
-- current_role() lopen, en die al is_active=true vereist) ook geen
-- bestuurs-/beheerrechten meer op RLS-niveau. Maar twee "zelf"-policies
-- controleerden alleen `id/profile_id = auth.uid()`, zonder is_active_member()
-- — een gedeactiveerd account met een nog geldige sessie kon zo, buiten de
-- normale paginaflow om, nog altijd het eigen profiel bijwerken of zichzelf
-- aan een bedrijf koppelen.
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid() and public.is_active_member())
  with check (id = auth.uid() and public.is_active_member());

drop policy if exists "company_members_self_or_board_insert" on public.company_members;
create policy "company_members_self_or_board_insert" on public.company_members
  for insert with check ((profile_id = auth.uid() and public.is_active_member()) or public.is_board());
