-- Let the very first account on a fresh installation register itself as
-- beheerder without needing a seeded invitation. This only ever applies
-- once: the moment a single profile exists, this path closes itself off
-- again (both here and in the UI), and every later signup goes back
-- through the normal invitation flow.

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
begin
  if v_token is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Registratie vereist een geldige uitnodiging.';
    end if;

    -- Bootstrap: no profiles exist yet, so this signup becomes the
    -- founding beheerder. No invitation or company involved.
    insert into public.profiles (id, first_name, last_name, email, phone, job_title, role)
    values (
      new.id,
      coalesce(v_meta ->> 'first_name', ''),
      coalesce(v_meta ->> 'last_name', ''),
      new.email,
      v_meta ->> 'phone',
      v_meta ->> 'job_title',
      'beheerder'
    );

    return new;
  end if;

  select * into v_invitation
    from public.invitations
    where token = v_token
    for update;

  if v_invitation is null
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at < now()
  then
    raise exception 'Deze uitnodiging is ongeldig of verlopen.';
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, job_title, role)
  values (
    new.id,
    coalesce(v_meta ->> 'first_name', ''),
    coalesce(v_meta ->> 'last_name', ''),
    new.email,
    v_meta ->> 'phone',
    v_meta ->> 'job_title',
    v_invitation.role
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
    insert into public.company_members (company_id, profile_id) values (v_company_id, new.id);
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;

-- Public, minimal check so the bootstrap page can tell whether it should
-- still offer the "create the first account" form.
create or replace function public.has_any_profiles()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles);
$$;

grant execute on function public.has_any_profiles() to anon, authenticated;
