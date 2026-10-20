-- Bedrijfskoppeling aanscherpen: companies.created_by registreert wie een
-- bedrijf heeft aangemaakt (default: de ingelogde gebruiker van de insert,
-- via auth.uid() — bij de registratietrigger (security definer, geen
-- request-context) komt dit op null uit, wat hier geen probleem is).
alter table public.companies add column created_by uuid references public.profiles (id) on delete set null default auth.uid();

-- De "eerste lid van een nog ledenloos bedrijf"-uitzondering gold voor élk
-- bedrijf zonder leden, niet alleen voor een bedrijf dat je zelf net hebt
-- aangemaakt — bij een grotendeels geïmporteerde bedrijvenlijst (nog geen
-- gekoppelde leden) was dat in de praktijk nauwelijks een beperking. Nu ook
-- vereist dat het bedrijf door jezelf is aangemaakt.
drop policy if exists "company_members_self_new_company_insert" on public.company_members;
create policy "company_members_self_new_company_insert" on public.company_members
  for insert with check (
    profile_id = auth.uid()
    and public.is_active_member()
    and exists (select 1 from public.companies c where c.id = company_members.company_id and c.created_by = auth.uid())
    and not exists (select 1 from public.company_members cm where cm.company_id = company_members.company_id)
  );
