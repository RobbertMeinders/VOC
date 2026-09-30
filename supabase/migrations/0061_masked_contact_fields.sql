-- profiles_members_select (0001_init.sql) laat elk actief lid de VOLLEDIGE
-- rij van elk ander lid lezen (public.is_active_member()), inclusief
-- email/phone, ONGEACHT de show_email/show_phone-voorkeur van dat lid. Op
-- de site zelf is dat nooit zichtbaar (de UI respecteert die voorkeuren
-- keurig), maar RLS is row-level, geen column-level bescherming: een lid
-- dat rechtstreeks met zijn eigen, geldige sessie tegen de Supabase-client
-- `select('email, phone')` op profiles doet (bv. via de browserconsole)
-- kon zo alsnog de "verborgen" contactgegevens van elk ander lid opvragen.
--
-- Kolomtoegang kan niet per rij variëren (in tegenstelling tot RLS), dus
-- i.p.v. een view/kolomrechten-truc (die afhangt van of de rol die dit
-- migratiebestand uitvoert wel/niet BYPASSRLS heeft — met BYPASSRLS zou een
-- view alle rijen laten zien, niet alleen de bedoelde) gebruiken we hetzelfde
-- bewezen patroon als de rest van deze codebase (get_public_company e.d.):
-- een security-definer RPC die de bestaande zichtbaarheidsregels EXPLICIET
-- in de eigen query herhaalt, i.p.v. op de onderliggende RLS/kolomrechten te
-- vertrouwen. De RLS-policies op profiles zelf blijven ongewijzigd (ze
-- dekken nog steeds de "kale" tabel af); dit is een aanvulling, geen
-- vervanging.
create or replace function public.get_member_profile(p_id uuid)
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
    p.is_organization_account, p.publicly_visible,
    p.created_at, p.updated_at
  from public.profiles p
  -- Zelfde combinatie als profiles_self_select OR profiles_members_select:
  -- je eigen rij altijd, een andere rij alleen als jijzelf actief lid bent.
  where p.id = p_id and (p.id = auth.uid() or public.is_active_member());
$$;

grant execute on function public.get_member_profile(uuid) to authenticated;

-- Zelfde maskering, nu voor de volledige ledenlijst (bv. Beheer -> Leden).
create or replace function public.get_members_directory()
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
    p.is_organization_account, p.publicly_visible,
    p.created_at, p.updated_at
  from public.profiles p
  where p.id = auth.uid() or public.is_active_member()
  order by p.last_name, p.first_name;
$$;

grant execute on function public.get_members_directory() to authenticated;
