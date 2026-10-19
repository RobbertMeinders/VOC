-- Introductiebericht-stap in de onboarding (zie IntroductionPrompt): een
-- eigen, losstaande "weggeklikt"-vlag i.p.v. de bestaande
-- onboarding_dismissed_at hergebruiken. Die laatste dekt profielvelden
-- (foto/functie/bedrijf) en is bij bestaande leden mogelijk al lang
-- geleden gezet — zouden we die hergebruiken, dan zou de nieuwe
-- introductie-prompt voor hen nooit verschijnen. Of iemand al een
-- introductiebericht heeft geplaatst, wordt niet hier opgeslagen maar
-- afgeleid uit feed_posts (type = 'voorstellen') — dat blijft zo de enige
-- bron van waarheid, ook als het bericht buiten deze stap om geplaatst is.
alter table public.profiles
  add column introduction_prompt_dismissed_at timestamptz;

-- Bijvangst tijdens het bouwen van deze stap: 0085_image_thumbnails.sql
-- herdefinieerde get_member_profile/get_members_directory (nodig voor
-- avatar_thumb_url) maar deed dat op basis van een oudere kopie van de
-- functie van vóór 0075_onboarding_dismissed.sql — onboarding_dismissed_at
-- viel daarbij stilletjes uit de kolomlijst. Sindsdien geeft requireProfile()
-- (die via deze RPC loopt, niet via een rechtstreekse select) altijd
-- `undefined` terug voor dat veld, waardoor de bestaande profielprompt op
-- Home na weg klikken alsnog kan terugkomen. Hersteld hier, in dezelfde
-- aanpassing die introduction_prompt_dismissed_at toevoegt.
drop function if exists public.get_member_profile(uuid);

create function public.get_member_profile(p_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
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
    p.id, p.first_name, p.last_name,
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
  where p.id = p_id and (p.id = auth.uid() or public.is_active_member());
$$;

grant execute on function public.get_member_profile(uuid) to authenticated;

drop function if exists public.get_members_directory();

create function public.get_members_directory()
returns table (
  id uuid,
  first_name text,
  last_name text,
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
    p.id, p.first_name, p.last_name,
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

-- Zelfde kolom-brede SELECT-grant als 0091_lock_down_profiles_table_select_
-- grant.sql, nu met introduction_prompt_dismissed_at erbij — zonder dit zou
-- een eventuele toekomstige rechtstreekse select op deze kolom (buiten de
-- RPC's hierboven om) stilzwijgend niets teruggeven.
revoke select on public.profiles from authenticated, anon;

grant select (
  id, first_name, last_name, job_title, avatar_url, avatar_thumb_url, role,
  is_active, show_email, show_phone, show_attended_activities,
  push_activities, push_feed, push_new_members, email_activities,
  email_feed, email_new_members, email_campaigns, deactivated_at,
  anonymized_at, last_active_at, linkedin_url, instagram_url, facebook_url,
  bio, is_organization_account, publicly_visible, onboarding_dismissed_at,
  introduction_prompt_dismissed_at, created_at, updated_at
) on public.profiles to authenticated, anon;
