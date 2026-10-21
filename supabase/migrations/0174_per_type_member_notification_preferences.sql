-- Meldingensysteem-overhaul Fase 3 (lagen op één lijn): de twee brede
-- categorieën "Activiteiten" (new_activity + activity_reminder) en
-- "Reacties en vermeldingen" (feed_comment + feed_mention) dwongen een lid
-- tot ÉÉN kanaalkeuze voor twee inhoudelijk heel verschillende soorten
-- meldingen — terwijl de admin-kant (notification_type_settings, Fase 1)
-- allang per-type werkt. Vervangt de 4 categorie-kolommen door 8 per-type
-- kolommen, zodat een lid bijvoorbeeld wél een pushmelding wil bij een
-- nieuwe activiteit maar geen herinnering 2 dagen vooraf, of @vermeldingen
-- via e-mail wil maar losse reacties liever niet.
--
-- Tijdkritische types die "altijd aan" blijven (geen lid-keuze, zoals
-- vandaag) blijven ONGEWIJZIGD: waitlist_promoted, activity_decision en
-- company_membership_decision (besluiten óver het lid zelf, 0079) en
-- activity_changed/activity_cancelled (over een activiteit waar het lid al
-- op staat — net zo min iets om per ongeluk te missen). Dit blok raakt
-- alleen de vier types die vandaag al via push_activities/push_feed/
-- email_activities/email_feed liepen.

-- 1. Nieuwe kolommen, defaults gelijk aan de kolom die ze vervangen
-- (push_activities/push_feed: true sinds 0037; email_activities/
-- email_feed: false sinds 0079 — "nieuwe profielen starten op
-- Pushmelding").
alter table public.profiles
  add column push_new_activity boolean not null default true,
  add column push_activity_reminder boolean not null default true,
  add column push_feed_comment boolean not null default true,
  add column push_feed_mention boolean not null default true,
  add column email_new_activity boolean not null default false,
  add column email_activity_reminder boolean not null default false,
  add column email_feed_comment boolean not null default false,
  add column email_feed_mention boolean not null default false;

-- 2. Bestaande leden: hun huidige categoriekeuze geldt voor beide types
-- binnen die categorie (geen gedragswijziging bij het uitrollen van deze
-- migratie zelf — pas als een lid de nieuwe, fijnere keuze expliciet
-- aanpast, lopen de twee types binnen een categorie uiteen).
update public.profiles set
  push_new_activity = push_activities,
  push_activity_reminder = push_activities,
  push_feed_comment = push_feed,
  push_feed_mention = push_feed,
  email_new_activity = email_activities,
  email_activity_reminder = email_activities,
  email_feed_comment = email_feed,
  email_feed_mention = email_feed;

-- 3. Oude categoriekolommen weg. Hun kolom-grants (0139) en elke
-- RLS-referentie verdwijnen automatisch mee met de kolom zelf.
alter table public.profiles
  drop column push_activities,
  drop column push_feed,
  drop column email_activities,
  drop column email_feed;

grant update (
  push_new_activity, push_activity_reminder, push_feed_comment, push_feed_mention,
  email_new_activity, email_activity_reminder, email_feed_comment, email_feed_mention
) on public.profiles to authenticated;

-- De tabel-brede SELECT-grant (0091) somt kolommen expliciet op (zonder
-- email/phone) en noemde daarin ook push_activities/push_feed/
-- email_activities/email_feed — die rechten verdwijnen automatisch mee met
-- de kolom zelf (0091 is zo immers geschreven). src/lib/statistics/
-- communication.ts leest de kanaalvoorkeur rechtstreeks (niet via
-- get_member_profile) voor het bestuursrapport "Communicatie" — zonder
-- deze aparte grant voor de nieuwe kolomnamen zou die select stil 0 rijen
-- relevante data teruggeven.
grant select (
  push_new_activity, push_activity_reminder, push_feed_comment, push_feed_mention,
  email_new_activity, email_activity_reminder, email_feed_comment, email_feed_mention
) on public.profiles to authenticated, anon;

-- 4. get_pending_push_notifications (0173): de twee gecombineerde
-- category-condities worden vier losse per-type condities. Zelfde functie-
-- signatuur/RETURNS TABLE als 0173, dus create or replace volstaat.
create or replace function public.get_pending_push_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  profile_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications n
  set pushed_at = now()
  from public.profiles p
  where n.profile_id = p.id
    and n.pushed_at is null
    and n.communication_id is null
    and (
      not n.channel_push_allowed
      or n.type = 'new_member'
      or (n.type = 'new_activity' and not p.push_new_activity)
      or (n.type = 'activity_reminder' and not p.push_activity_reminder)
      or (n.type = 'feed_comment' and not p.push_feed_comment)
      or (n.type = 'feed_mention' and not p.push_feed_mention)
    );

  return query
  with claimed as (
    select n.id, n.type, n.title, n.body, n.link, n.profile_id
    from public.notifications n
    where n.pushed_at is null
      and n.communication_id is null
      and exists (select 1 from public.push_subscriptions s where s.profile_id = n.profile_id)
    order by n.created_at
    limit p_limit
    for update of n skip locked
  ),
  marked as (
    update public.notifications n
    set pushed_at = now()
    from claimed c
    where n.id = c.id
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id
  )
  select m.id, m.type, m.title, m.body, m.link, m.profile_id, s.endpoint, s.p256dh, s.auth
  from marked m
  join public.push_subscriptions s on s.profile_id = m.profile_id;
end;
$$;

-- 5. get_pending_email_notifications (0173): zelfde verfijning, de digest-
-- uitsluiting (email_digest_*) blijft ongewijzigd staan.
create or replace function public.get_pending_email_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications n
  set emailed_at = now()
  from public.profiles p
  where n.profile_id = p.id
    and n.emailed_at is null
    and n.communication_id is null
    and (
      not n.channel_email_allowed
      or n.type = 'new_member'
      or (n.type = 'new_activity' and not p.email_new_activity)
      or (n.type = 'activity_reminder' and not p.email_activity_reminder)
      or (n.type = 'feed_comment' and not p.email_feed_comment)
      or (n.type = 'feed_mention' and not p.email_feed_mention)
    );

  return query
  with claimed as (
    select n.id
    from public.notifications n
    join public.profiles p on p.id = n.profile_id
    where n.emailed_at is null
      and n.communication_id is null
      and (n.email_claimed_at is null or n.email_claimed_at < now() - interval '10 minutes')
      and not (
        (n.type = 'new_activity' and p.email_digest_new_activity)
        or (n.type = 'feed_comment' and p.email_digest_feed_comment)
        or (n.type = 'feed_mention' and p.email_digest_feed_mention)
      )
    order by n.created_at
    limit p_limit
    for update of n skip locked
  ),
  leased as (
    update public.notifications n
    set email_claimed_at = now()
    from claimed c
    where n.id = c.id
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id
  )
  select l.id, l.type, l.title, l.body, l.link, p.email
  from leased l
  join public.profiles p on p.id = l.profile_id;
end;
$$;

-- 6. get_member_profile/get_members_directory (laatst herdefinieerd in
-- 0139 resp. 0122) somen hun kolommen expliciet op (geen select *) — drop
-- + create omdat de kolomlijst van de RETURNS TABLE wijzigt.
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
    p.created_at, p.updated_at
  from public.profiles p
  where p.id = auth.uid() or public.is_active_member()
  order by p.last_name, p.first_name;
$$;

grant execute on function public.get_members_directory() to authenticated;
