-- Nachtaudit (critical): migratie 0094 maakte "company_members_self_or_board_insert"
-- opnieuw aan (nodig voor de is_active_member()-check op gedeactiveerde
-- accounts), en zette daarmee de fix uit 0013 terug — een actief lid kon zich
-- zo weer rechtstreeks aan élk bedrijf koppelen, zonder enige goedkeuring.
-- Koppelen hoort alleen te lopen via company_membership_requests (goedkeuring
-- door bestuur/beheerder of een bestaand gekoppeld lid), met twee smalle
-- uitzonderingen die al bestonden vóór 0094: bestuur/beheerder mag altijd
-- direct koppelen, en wie zélf een gloednieuw bedrijf aanmaakt (nog geen
-- enkel lid) wordt daar meteen eerste lid van — er is dan niemand om het
-- goed te keuren (zie profiel/actions.ts, companyMode "new").
drop policy if exists "company_members_self_or_board_insert" on public.company_members;
-- B1-regressietest (migratie-replay op een lege database) ving dit: deze
-- policy-naam bestaat al sinds 0013 en werd daarna nooit gedropt — zonder
-- deze drop botst de create hieronder bij een schone replay. Live blijft
-- dit onschadelijk (de policy staat daar al, met exact dezelfde definitie).
drop policy if exists "company_members_board_insert" on public.company_members;

create policy "company_members_board_insert" on public.company_members
  for insert with check (public.is_board());

-- "Nog geen enkel lid" i.p.v. "is dit bedrijf van mij" (geen aanmaakdatum/
-- eigenaarskolom om op te toetsen): een kwaadwillende kan hiermee in theorie
-- een bedrijf claimen waarvan iedereen is vertrokken/verwijderd, maar dat is
-- een veel smaller gat dan zich aan een willekeurig bedrijf mét collega's
-- koppelen zonder goedkeuring (wat hiervoor mogelijk was).
create policy "company_members_self_new_company_insert" on public.company_members
  for insert with check (
    profile_id = auth.uid()
    and public.is_active_member()
    and not exists (select 1 from public.company_members cm where cm.company_id = company_members.company_id)
  );

-- Zelfde "gedeactiveerd lid verliest bedrijfsrechten"-redenering als 0094
-- (profiles_self_update/company_members_self_or_board_insert): de policies
-- hieronder controleerden tot nu toe alleen of iemand (ooit, toen nog actief)
-- lid was van het bedrijf, niet of dat account nu nog actief is.
drop policy if exists "company_membership_requests_select" on public.company_membership_requests;
create policy "company_membership_requests_select" on public.company_membership_requests
  for select using (
    profile_id = auth.uid()
    or public.is_board()
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id
        and cm.profile_id = auth.uid()
        and public.is_active_member()
    )
  );

drop policy if exists "company_membership_requests_decide_update" on public.company_membership_requests;
create policy "company_membership_requests_decide_update" on public.company_membership_requests
  for update using (
    public.is_board()
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id
        and cm.profile_id = auth.uid()
        and public.is_active_member()
    )
  );

-- handle_new_user: dezelfde regressie als hierboven slopen bij registreren.
-- Vanaf 0063 werd de tak voor "bestaand bedrijf gekozen" een rechtstreekse
-- company_members-insert i.p.v. de company_membership_requests-aanvraag die
-- 0013 hier juist voor instelde (de self-of-board-insertpolicy ving dat
-- destijds niet op omdat dit een security-definer trigger is, die RLS
-- sowieso omzeilt). Nu weer een aanvraag, BEHALVE als het gekozen bedrijf
-- precies het bedrijf is dat de uitnodiging zelf al meegaf (invitations.
-- company_id, gezet door wie de uitnodiging aanmaakte — bijv. bestuur via
-- "Naam en bedrijf alvast invullen" op Aanvragen -> Uitnodigingen): dan is er
-- al iemand bevoegd die dit bedrijf voor deze uitnodiging koos, en koppelen
-- we meteen door, net als bij een gloednieuw bedrijf.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := new.raw_user_meta_data;
  v_token text := v_meta ->> 'invitation_token';
  v_invitation public.invitations;
  v_company_id uuid := nullif(v_meta ->> 'company_id', '')::uuid;
  v_new_company_name text := v_meta ->> 'new_company_name';
  v_created_company_id uuid;
  v_first_name text := coalesce(v_meta ->> 'first_name', '');
  v_last_name text := coalesce(v_meta ->> 'last_name', '');
begin
  if v_token is null then
    raise exception 'Registratie vereist een geldige uitnodiging.';
  end if;

  select * into v_invitation
    from public.invitations
    where token = v_token
    for update;

  if v_invitation is null
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at is null
     or v_invitation.expires_at < now()
  then
    raise exception 'Deze uitnodiging is ongeldig of verlopen.';
  end if;

  if v_invitation.email is not null and lower(v_invitation.email) <> lower(new.email) then
    raise exception 'Dit e-mailadres komt niet overeen met de uitnodiging.';
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, job_title, role, slug)
  values (
    new.id,
    v_first_name,
    v_last_name,
    new.email,
    v_meta ->> 'phone',
    v_meta ->> 'job_title',
    v_invitation.role,
    public.generate_unique_profile_slug(v_first_name, v_last_name)
  );

  if v_new_company_name is not null and v_new_company_name <> '' then
    insert into public.companies (name, slug, industry, website, city)
    values (
      v_new_company_name,
      lower(regexp_replace(v_new_company_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8),
      v_meta ->> 'new_company_industry',
      v_meta ->> 'new_company_website',
      v_meta ->> 'new_company_city'
    )
    returning id into v_created_company_id;

    insert into public.company_members (company_id, profile_id) values (v_created_company_id, new.id);
  elsif v_company_id is not null then
    if v_invitation.company_id is not null and v_invitation.company_id = v_company_id then
      insert into public.company_members (company_id, profile_id) values (v_company_id, new.id);
    else
      insert into public.company_membership_requests (company_id, profile_id) values (v_company_id, new.id);
    end if;
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;
