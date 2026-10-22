-- Functioneel defect (gevonden tijdens de hardening-ronde): inviteColleagueAction
-- (bedrijven/[id]/actions.ts) is geschreven zodat een gewoon lid een collega
-- bij zijn EIGEN bedrijf mag uitnodigen (controleert zelf of de aanroeper
-- aan dat bedrijf gekoppeld is), maar invitations_insert (RLS) liet alleen
-- bestuur/beheer ooit een rij invoegen -- een gewoon lid liep dus altijd
-- stuk op een database-weigering, ook al was de eigen app-logica akkoord.
-- Na overleg met Robbert: dit moet weer werken zoals de code al
-- veronderstelt, dus de policy krijgt er een derde, specifiekere tak bij
-- i.p.v. de bestaande twee te verruimen: role moet 'lid' blijven (nooit
-- een collega als bestuurslid/beheerder uitnodigen), de aanvrager moet zelf
-- een ACTIEF lid zijn, en company_id moet een bedrijf zijn waar de
-- aanvrager zelf aantoonbaar aan gekoppeld is.
drop policy if exists "invitations_insert" on public.invitations;

create policy "invitations_insert" on public.invitations
  for insert with check (
    invited_by = (select auth.uid())
    and (
      (select public.is_admin())
      or (role = 'lid' and (select public.is_board()))
      or (
        role = 'lid'
        and company_id is not null
        and (select public.is_active_member())
        and exists (
          select 1 from public.company_members
          where company_id = invitations.company_id and profile_id = (select auth.uid())
        )
      )
    )
  );

-- Zonder dit zou de insert hierboven voor een gewoon lid wél slagen, maar
-- de .select("token").single() direct erna (inviteColleagueAction leest de
-- nieuwe rij terug om de registratielink op te bouwen) niets teruggeven --
-- invitations_board_select liet een niet-bestuurslid nooit ÉÉN enkele
-- invitations-rij zien, ook niet zijn eigen zojuist aangemaakte. Wie een
-- uitnodiging zelf heeft aangemaakt mag die ene rij nu ook zien.
drop policy if exists "invitations_board_select" on public.invitations;

create policy "invitations_board_select" on public.invitations
  for select using (
    (select public.is_admin())
    or (role = 'lid' and (select public.is_board()))
    or invited_by = (select auth.uid())
  );

insert into public.schema_migration_log (version) values ('0206') on conflict (version) do nothing;
notify pgrst, 'reload schema';
