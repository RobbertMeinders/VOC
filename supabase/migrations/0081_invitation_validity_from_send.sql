-- UX-review punt 5: expires_at werd altijd bij het AANMAKEN van een
-- uitnodiging gezet (0001_init.sql, default now()+14 dagen), niet bij het
-- daadwerkelijk VERSTUREN. Een uitnodiging die pas later verstuurd wordt
-- (bijv. bulk-geïmporteerd, of de e-mail faalt in eerste instantie door een
-- SMTP-probleem) kon daardoor al verlopen zijn voordat iemand de link ooit
-- ontving. Kolom nullable maken: NULL betekent nu expliciet "nog niet
-- verstuurd, dus nog niet geldig" — de server-actions (zie
-- beheer/uitnodigingen/actions.ts) zetten expires_at voortaan pas bij een
-- geslaagde verzending.

alter table public.invitations
  alter column expires_at drop not null,
  alter column expires_at drop default;

drop function if exists public.get_invitation_preview(text);

create function public.get_invitation_preview(p_token text)
returns table (
  valid boolean,
  role public.user_role,
  email text,
  first_name text,
  last_name text,
  phone text,
  job_title text,
  company_id uuid,
  company_name text,
  company_city text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (i.status = 'pending' and i.expires_at is not null and i.expires_at > now()) as valid,
    i.role,
    i.email,
    i.first_name,
    i.last_name,
    i.phone,
    i.job_title,
    i.company_id,
    c.name as company_name,
    c.city as company_city
  from public.invitations i
  left join public.companies c on c.id = i.company_id
  where i.token = p_token;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- LET OP: zonder de expliciete "is null"-check zou "expires_at < now()"
-- bij NULL evalueren tot NULL (niet tot true), en de voorwaarde zou dan
-- stilzwijgend NIET matchen — dat zou de controle juist omzeilbaar maken
-- i.p.v. strenger.
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
     or v_invitation.expires_at is null
     or v_invitation.expires_at < now()
  then
    raise exception 'Deze uitnodiging is ongeldig of verlopen.';
  end if;

  if v_invitation.email is not null and lower(v_invitation.email) <> lower(new.email) then
    raise exception 'Dit e-mailadres komt niet overeen met de uitnodiging.';
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
