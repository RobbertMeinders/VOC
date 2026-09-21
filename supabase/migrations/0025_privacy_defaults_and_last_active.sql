-- Twee onafhankelijke toevoegingen, bewust in één migratie omdat ze allebei
-- kleine, hergebruikte kolommen zijn:
--
-- 1. Privacy: geïmporteerde leden (bulk-CSV, zie 0021) hadden tot nu toe
--    dezelfde show_email/show_phone-default (true) als een lid dat zichzelf
--    aanmeldt. Voor geïmporteerde gegevens is dat ongewenst — die zijn nooit
--    expliciet door het lid zelf gedeeld voor zichtbaarheid. `imported` op de
--    uitnodiging (gezet door de bulk-import-actie) laat handle_new_user() de
--    juiste default kiezen bij registratie.
--
-- 2. "Laatst actief", zichtbaar voor bestuur/beheer: gezet door de eigen
--    inlog-server-action (niet elke achtergrond-request), dus dit weerspiegelt
--    een echte inlog-actie.

alter table public.invitations
  add column imported boolean not null default false;

alter table public.profiles
  add column last_active_at timestamptz;

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
    raise exception 'Registratie vereist een geldige uitnodiging.';
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

  insert into public.profiles (id, first_name, last_name, email, phone, job_title, role, show_email, show_phone)
  values (
    new.id,
    coalesce(v_meta ->> 'first_name', ''),
    coalesce(v_meta ->> 'last_name', ''),
    new.email,
    v_meta ->> 'phone',
    v_meta ->> 'job_title',
    v_invitation.role,
    not v_invitation.imported,
    not v_invitation.imported
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
    insert into public.company_membership_requests (company_id, profile_id) values (v_company_id, new.id);
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;
