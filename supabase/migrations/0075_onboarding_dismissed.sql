-- UX-review U1: welkomst-checklist op Home ("foto, functie, bedrijf
-- koppelen, pushmeldingen aan") blijft staan tot alle vier klaar zijn, of tot
-- een lid 'm zelf wegklikt — dat laatste moet iets vastleggen, anders komt
-- de banner na elke login terug.
alter table public.profiles
  add column onboarding_dismissed_at timestamptz;

-- get_member_profile/get_members_directory (0061_masked_contact_fields.sql)
-- declareren hun kolommen expliciet via RETURNS TABLE — Postgres kan die
-- lijst niet via create-or-replace uitbreiden (ander OUT-parameterprofiel),
-- dus eerst droppen.
drop function if exists public.get_member_profile(uuid);
drop function if exists public.get_members_directory();

create function public.get_member_profile(p_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  job_title text,
  avatar_url text,
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
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.first_name, p.last_name,
    case when p.id = auth.uid() or p.show_email or public.is_board() then p.email else null end,
    case when p.id = auth.uid() or p.show_phone or public.is_board() then p.phone else null end,
    p.job_title, p.avatar_url, p.role, p.is_active,
    p.show_email, p.show_phone, p.show_attended_activities,
    p.push_activities, p.push_feed, p.push_new_members,
    p.email_activities, p.email_feed, p.email_new_members,
    p.deactivated_at, p.anonymized_at, p.last_active_at,
    p.linkedin_url, p.instagram_url, p.facebook_url, p.bio,
    p.is_organization_account, p.publicly_visible, p.onboarding_dismissed_at,
    p.created_at, p.updated_at
  from public.profiles p
  where p.id = p_id and (p.id = auth.uid() or public.is_active_member());
$$;

grant execute on function public.get_member_profile(uuid) to authenticated;

create function public.get_members_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  job_title text,
  avatar_url text,
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
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.first_name, p.last_name,
    case when p.id = auth.uid() or p.show_email or public.is_board() then p.email else null end,
    case when p.id = auth.uid() or p.show_phone or public.is_board() then p.phone else null end,
    p.job_title, p.avatar_url, p.role, p.is_active,
    p.show_email, p.show_phone, p.show_attended_activities,
    p.push_activities, p.push_feed, p.push_new_members,
    p.email_activities, p.email_feed, p.email_new_members,
    p.deactivated_at, p.anonymized_at, p.last_active_at,
    p.linkedin_url, p.instagram_url, p.facebook_url, p.bio,
    p.is_organization_account, p.publicly_visible, p.onboarding_dismissed_at,
    p.created_at, p.updated_at
  from public.profiles p
  where p.id = auth.uid() or public.is_active_member()
  order by p.last_name, p.first_name;
$$;

grant execute on function public.get_members_directory() to authenticated;
