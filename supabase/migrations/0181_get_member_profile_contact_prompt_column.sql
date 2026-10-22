-- get_member_profile (laatst herdefinieerd in 0174_per_type_member_notification_preferences.sql,
-- NIET 0139 -- deze migratie bouwt verder op 0174's kolomschema en
-- where-clausule) gaf contact_visibility_prompt_dismissed_at (nieuw in
-- 0180_privacy_defaults_hidden.sql) nog niet terug, waardoor
-- requireProfile() dat veld altijd als undefined teruggeeft. Zonder deze
-- toevoeging zou ContactVisibilityPrompt na het wegklikken ("Niet nu") bij
-- elke volgende paginalaad opnieuw verschijnen: de DB-kolom wordt wel
-- bijgewerkt, maar nooit uitgelezen. Verder woordelijk gelijk aan 0174.
drop function if exists public.get_member_profile(text);

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
  push_new_activity boolean,
  push_activity_reminder boolean,
  push_feed_comment boolean,
  push_feed_mention boolean,
  push_new_members boolean,
  email_new_activity boolean,
  email_activity_reminder boolean,
  email_feed_comment boolean,
  email_feed_mention boolean,
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
  contact_visibility_prompt_dismissed_at timestamptz,
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
    p.push_new_activity, p.push_activity_reminder, p.push_feed_comment, p.push_feed_mention, p.push_new_members,
    p.email_new_activity, p.email_activity_reminder, p.email_feed_comment, p.email_feed_mention, p.email_new_members,
    p.deactivated_at, p.anonymized_at, p.last_active_at,
    p.linkedin_url, p.instagram_url, p.facebook_url, p.bio,
    p.is_organization_account, p.publicly_visible,
    p.onboarding_dismissed_at, p.introduction_prompt_dismissed_at,
    p.contact_visibility_prompt_dismissed_at,
    p.created_at, p.updated_at
  from public.profiles p
  where (
    case
      when p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p.id::text = p_id
      else p.slug = p_id
    end
  ) and (p.id = auth.uid() or public.is_active_member());
$$;

grant execute on function public.get_member_profile(text) to authenticated;
