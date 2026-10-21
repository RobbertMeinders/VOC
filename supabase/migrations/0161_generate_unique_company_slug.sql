-- Bedrijfs-slugs plakten tot nu toe altijd een willekeurige/id-staart achter
-- de naam (zie createCompanyAction, updateMyCompanyAction, de bulk-import,
-- en handle_new_user hieronder) — bv. "capture-a61926fa" in plaats van het
-- nette "capture". Leden hebben dat probleem al niet: generate_unique_
-- profile_slug (0122) gebruikt de kale naam als basis en telt alleen bij
-- een échte botsing een oplopend "-2"/"-3" op. Dezelfde aanpak nu voor
-- bedrijven, als herbruikbare functie voor elk aanmaakpad.
create or replace function public.generate_unique_company_slug(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  v_base := nullif(trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), '');
  v_base := coalesce(v_base, 'bedrijf');
  v_candidate := v_base;
  while exists (select 1 from public.companies where slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;
  return v_candidate;
end;
$$;

-- H4 (0144) zette "alter default privileges ... revoke execute on functions
-- from public, anon, authenticated" — een nieuwe functie krijgt daardoor
-- geen automatische toegang meer, dus hier expliciet voor de server actions
-- die 'm rechtstreeks aanroepen (createCompanyAction, updateMyCompanyAction,
-- de bulk-import).
grant execute on function public.generate_unique_company_slug(text) to authenticated;

-- handle_new_user (laatst herdefinieerd in 0126) opnieuw, nu met dezelfde
-- generator i.p.v. de losse substr(id,1,8)-staart — verder woord voor woord
-- gelijk aan de 0126-versie.
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
      public.generate_unique_company_slug(v_new_company_name),
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
