-- Leesbare, stabiele slug per lid (bv. "robbert-meinders" i.p.v. de kale
-- uuid in /leden/<id>) — zelfde aanpak als activities.slug (0049): eenmalig
-- gegenereerd en daarna nooit overschreven, ook niet als iemand later zijn
-- voor-/achternaam wijzigt (anders zou een eerder gedeelde profiellink
-- stukgaan). Profielen ontstaan via handle_new_user() (0001, een trigger op
-- auth.users), niet via app-code zoals een activiteit — de generatie +
-- botsingsafhandeling moet dus hier in SQL, niet in een server action.

alter table public.profiles add column if not exists slug text;

-- Herbruikbare generator (ook voor de backfill verderop, en later evt.
-- handmatig door beheer aan te roepen): botsingen krijgen een oplopend
-- "-2"/"-3"-achtervoegsel, geen willekeurige/uuid-achtervoegsel — dat zou
-- de URL meteen weer minder leesbaar maken dan het doel van deze migratie.
create or replace function public.generate_unique_profile_slug(p_first_name text, p_last_name text)
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
  v_base := nullif(trim(both '-' from regexp_replace(lower(p_first_name || '-' || p_last_name), '[^a-z0-9]+', '-', 'g')), '');
  v_base := coalesce(v_base, 'lid');
  v_candidate := v_base;
  while exists (select 1 from public.profiles where slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;
  return v_candidate;
end;
$$;

-- Backfill voor bestaande rijen in één set-based pass (i.p.v. de generator
-- hierboven rij voor rij aanroepen) — zelfde window-functiepatroon als
-- activities.slug: botsingen op dezelfde naam krijgen hun suffix op volgorde
-- van created_at.
with numbered as (
  select
    id,
    nullif(trim(both '-' from regexp_replace(lower(first_name || '-' || last_name), '[^a-z0-9]+', '-', 'g')), '') as base_slug,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(first_name || '-' || last_name), '[^a-z0-9]+', '-', 'g'))
      order by created_at
    ) as rn
  from public.profiles
)
update public.profiles p
set slug = coalesce(n.base_slug, 'lid') || case when n.rn > 1 then '-' || n.rn else '' end
from numbered n
where p.id = n.id
  and p.slug is null;

alter table public.profiles alter column slug set not null;

create unique index if not exists profiles_slug_key on public.profiles (slug);

-- 0091/0110_introduction_prompt_dismissed.sql zette een expliciete kolom-
-- grant (niet alleen RLS) op profiles — zonder slug hier ook toe te voegen
-- zou elke rechtstreekse .select(...slug...) buiten de RPC's hieronder om
-- stilzwijgend niets teruggeven, ongeacht RLS.
revoke select on public.profiles from authenticated, anon;

grant select (
  id, first_name, last_name, slug, job_title, avatar_url, avatar_thumb_url, role,
  is_active, show_email, show_phone, show_attended_activities,
  push_activities, push_feed, push_new_members, email_activities,
  email_feed, email_new_members, email_campaigns, deactivated_at,
  anonymized_at, last_active_at, linkedin_url, instagram_url, facebook_url,
  bio, is_organization_account, publicly_visible, onboarding_dismissed_at,
  introduction_prompt_dismissed_at, created_at, updated_at
) on public.profiles to authenticated, anon;

-- get_member_profile/get_members_directory (0061, laatst herdefinieerd in
-- 0110) opnieuw, met slug in de kolomlijst. get_member_profile's parameter
-- verandert van uuid naar text: de route-waarde in /leden/<param> is nu
-- óf een echt UUID (oude links), óf de slug zelf — zelfde matching-aanpak
-- als activityIdFilter (lib/agenda/slug.ts), hier met een OR in de
-- WHERE-clause i.p.v. in de JS-aanroeper, want dit is een RPC-aanroep,
-- geen .filter()-opbouw. Supabase-js geeft dit argument toch al als platte
-- tekst door, dus de aanroepers (session.ts, MemberProfileContent.tsx,
-- leden/[id]/actions.ts) hoeven zelf niet aangepast te worden.
drop function if exists public.get_member_profile(uuid);

create function public.get_member_profile(p_id text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  slug text,
  email text,
  phone text,
  job_title text,
  avatar_url text,
  avatar_thumb_url text,
  role public.user_role,
  is_active boolean,
  show_email boolean,
  show_phone boolean,
  show_attended_activities boolean,
  push_activities boolean,
  push_feed boolean,
  push_new_members boolean,
  email_activities boolean,
  email_feed boolean,
  email_new_members boolean,
  deactivated_at timestamptz,
  anonymized_at timestamptz,
  last_active_at timestamptz,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  bio text,
  is_organization_account boolean,
  publicly_visible boolean,
  onboarding_dismissed_at timestamptz,
  introduction_prompt_dismissed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.first_name, p.last_name, p.slug,
    case when p.id = auth.uid() or p.show_email or public.is_board() then p.email else null end,
    case when p.id = auth.uid() or p.show_phone or public.is_board() then p.phone else null end,
    p.job_title, p.avatar_url, p.avatar_thumb_url, p.role, p.is_active,
    p.show_email, p.show_phone, p.show_attended_activities,
    p.push_activities, p.push_feed, p.push_new_members,
    p.email_activities, p.email_feed, p.email_new_members,
    p.deactivated_at, p.anonymized_at, p.last_active_at,
    p.linkedin_url, p.instagram_url, p.facebook_url, p.bio,
    p.is_organization_account, p.publicly_visible,
    p.onboarding_dismissed_at, p.introduction_prompt_dismissed_at,
    p.created_at, p.updated_at
  from public.profiles p
  where (p.id::text = p_id or p.slug = p_id) and (p.id = auth.uid() or public.is_active_member());
$$;

grant execute on function public.get_member_profile(text) to authenticated;

drop function if exists public.get_members_directory();

create function public.get_members_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
  slug text,
  email text,
  phone text,
  job_title text,
  avatar_url text,
  avatar_thumb_url text,
  role public.user_role,
  is_active boolean,
  show_email boolean,
  show_phone boolean,
  show_attended_activities boolean,
  push_activities boolean,
  push_feed boolean,
  push_new_members boolean,
  email_activities boolean,
  email_feed boolean,
  email_new_members boolean,
  deactivated_at timestamptz,
  anonymized_at timestamptz,
  last_active_at timestamptz,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  bio text,
  is_organization_account boolean,
  publicly_visible boolean,
  onboarding_dismissed_at timestamptz,
  introduction_prompt_dismissed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.first_name, p.last_name, p.slug,
    case when p.id = auth.uid() or p.show_email or public.is_board() then p.email else null end,
    case when p.id = auth.uid() or p.show_phone or public.is_board() then p.phone else null end,
    p.job_title, p.avatar_url, p.avatar_thumb_url, p.role, p.is_active,
    p.show_email, p.show_phone, p.show_attended_activities,
    p.push_activities, p.push_feed, p.push_new_members,
    p.email_activities, p.email_feed, p.email_new_members,
    p.deactivated_at, p.anonymized_at, p.last_active_at,
    p.linkedin_url, p.instagram_url, p.facebook_url, p.bio,
    p.is_organization_account, p.publicly_visible,
    p.onboarding_dismissed_at, p.introduction_prompt_dismissed_at,
    p.created_at, p.updated_at
  from public.profiles p
  where p.id = auth.uid() or public.is_active_member()
  order by p.last_name, p.first_name;
$$;

grant execute on function public.get_members_directory() to authenticated;

-- handle_new_user() opnieuw, nu met slug — qua validatie verder exact
-- gelijk aan de huidige versie (0081_invitation_validity_from_send.sql):
-- de expires_at-is-null-check en de e-mailadres-komt-overeen-check blijven
-- allebei staan, alleen de profiles-insert krijgt er een slug bij.
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
    insert into public.company_members (company_id, profile_id) values (v_company_id, new.id);
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;
