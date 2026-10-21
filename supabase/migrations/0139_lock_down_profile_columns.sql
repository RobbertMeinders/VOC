-- Beveiligingsfixlijst Blok 1, H1: authenticated had tabel-brede UPDATE op
-- public.profiles (Supabase's auto_expose_new_tables-standaardgedrag) — de
-- RLS-policies (profiles_self_update/profiles_board_update/profiles_admin_
-- update) beperken alleen WELKE RIJ geraakt mag worden, niet welke KOLOM.
-- Daardoor kon een lid, via een rechtstreekse API-aanroep op de eigen rij,
-- ook kolommen zetten die nergens in de app zelf aanpasbaar zijn: het
-- e-mailadres, de onveranderlijke profiel-slug, en de interne
-- anonimiserings-boekhouding.
--
-- Kolommen zonder enig legitiem rechtstreeks client-pad gaan hier helemaal
-- uit de kolom-grant:
--   - email: loopt via een aparte sync-trigger vanaf auth.users (0112),
--     nooit een rechtstreekse client-update op profiles zelf.
--   - slug: wordt precies één keer gezet bij registratie en daarna nooit
--     meer gewijzigd (0122).
--   - anonymized_at/auth_scrubbed_at/pending_avatar_cleanup: alleen via de
--     service-role-RPC's uit 0136.
-- De overige kolommen blijven aanpasbaar zoals nu. role/is_active waren al
-- via guard_profile_privileges tot de legitieme overgangen beperkt;
-- is_organization_account en deactivated_at krijgen hieronder dezelfde
-- behandeling, want die werden tot nu toe alleen in servercode (niet in de
-- database zelf) tot bestuur/de juiste overgang beperkt.
revoke update on public.profiles from authenticated;

grant update (
  first_name, last_name, phone, job_title, avatar_url, avatar_thumb_url,
  role, is_active, deactivated_at,
  show_email, show_phone, show_attended_activities,
  push_activities, push_feed, push_new_members,
  email_activities, email_feed, email_new_members, email_campaigns,
  linkedin_url, instagram_url, facebook_url, bio,
  is_organization_account, publicly_visible,
  onboarding_dismissed_at, introduction_prompt_dismissed_at, welcome_dialog_dismissed_at,
  last_active_at
) on public.profiles to authenticated;

-- is_active's bestaande voorwaarde blijft ongewijzigd (zie 0093) — de
-- ontbrekende service-role-uitzondering daar is een apart, al bekend
-- gebrek (los op te pakken). deactivated_at hoort altijd samen met
-- is_active te veranderen en krijgt daarom dezelfde voorwaarde, mét een
-- service-role-uitzondering: zonder die zou deze nieuwe guard de
-- bestaande, vandaag werkende deactivated_at-zet door
-- anonymize_profile_now (service-role) net zo goed blokkeren als een
-- oneigenlijke directe aanpassing.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    if not (
      public.is_board()
      or (new.id = auth.uid() and old.is_active and not new.is_active)
    ) then
      new.is_active := old.is_active;
    end if;
    if not (
      public.is_board()
      or auth.role() = 'service_role'
      or (new.id = auth.uid() and old.is_active and not new.is_active)
    ) then
      new.deactivated_at := old.deactivated_at;
    end if;
    if not public.is_board() then
      new.is_organization_account := old.is_organization_account;
    end if;
  end if;
  return new;
end;
$$;

-- get_member_profile (0122) matchte p_id tegen zowel id als slug in één
-- OR-voorwaarde. Een profiel-slug is weliswaar uniek afgedwongen
-- (profiles_slug_key), maar niets voorkwam dat iemand zijn eigen slug naar
-- een willekeurige, nog ongebruikte tekenreeks zette — inclusief een
-- tekenreeks die toevallig als UUID oogt. Matcht de aanroep dan zelf op
-- id (een UUID), dan is niet gegarandeerd welke van de twee treffende
-- rijen wint zonder expliciete order/limit. Nu eerst controleren of p_id
-- een UUID-vorm heeft (zelfde conventie als lib/members/slug.ts
-- client-side) en dan UITSLUITEND op id, of anders UITSLUITEND op slug
-- matchen — nooit beide tegelijk.
create or replace function public.get_member_profile(p_id text)
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
  where (
    case
      when p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p.id::text = p_id
      else p.slug = p_id
    end
  )
  and (p.id = auth.uid() or public.is_active_member());
$$;
