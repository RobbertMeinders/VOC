-- VOC Ledenportaal — initial schema (Fase 1)
-- Covers the full core data model up front (profiles, companies, invitations,
-- feed, activities, documents, notifications) so later fases only add
-- functionality, not structure. RLS is enabled on every table from the
-- start; policies enforce lid / bestuurslid / beheerder rights so the
-- frontend can never reach data it isn't authorized for.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('lid', 'bestuurslid', 'beheerder');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.feed_attachment_type as enum ('image', 'pdf');

-- Generic updated_at maintenance trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  industry text,
  website text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_industry_idx on public.companies (industry);
create index companies_name_idx on public.companies (lower(name));

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  job_title text,
  website text,
  avatar_url text,
  role public.user_role not null default 'lid',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_name_idx on public.profiles (lower(last_name), lower(first_name));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, used inside RLS policies)
-- ---------------------------------------------------------------------------
-- These read the caller's own profile row. They run as definer so they can
-- be evaluated inside a policy on `profiles` itself without recursive RLS
-- lookups, and are marked stable so the planner can cache them per query.
-- They must come after `profiles` exists: LANGUAGE SQL functions (unlike
-- plpgsql) are parsed and validated against the catalog at CREATE time.

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active = true);
$$;

create or replace function public.is_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('bestuurslid', 'beheerder'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'beheerder', false);
$$;

grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_active_member() to anon, authenticated;
grant execute on function public.is_board() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Prevent a member from escalating their own role or reactivating themselves
-- through a self-service profile update; only an admin (or the definer-owned
-- signup trigger) may change these two columns.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- company_members (n:n profiles <-> companies)
-- ---------------------------------------------------------------------------

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create index company_members_company_idx on public.company_members (company_id);
create index company_members_profile_idx on public.company_members (profile_id);

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  email text,
  role public.user_role not null default 'lid',
  invited_by uuid references public.profiles (id) on delete set null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_token_idx on public.invitations (token);
create index invitations_status_idx on public.invitations (status);

-- ---------------------------------------------------------------------------
-- activities & registrations
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_deadline timestamptz,
  max_participants integer,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_max_participants_positive check (max_participants is null or max_participants > 0)
);

create index activities_starts_at_idx on public.activities (starts_at);

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

create table public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, profile_id)
);

create index activity_registrations_activity_idx on public.activity_registrations (activity_id);
create index activity_registrations_profile_idx on public.activity_registrations (profile_id);

-- Enforce the registration deadline and max-participants cap atomically so
-- concurrent sign-ups can't race past the limit.
create or replace function public.enforce_activity_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
  v_max integer;
  v_count integer;
begin
  select registration_deadline, max_participants
    into v_deadline, v_max
    from public.activities
    where id = new.activity_id
    for update;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'De aanmelddeadline voor deze activiteit is verstreken.';
  end if;

  if v_max is not null then
    select count(*) into v_count
      from public.activity_registrations
      where activity_id = new.activity_id;

    if v_count >= v_max then
      raise exception 'Deze activiteit heeft het maximum aantal deelnemers bereikt.';
    end if;
  end if;

  return new;
end;
$$;

create trigger activity_registrations_enforce_rules
  before insert on public.activity_registrations
  for each row execute function public.enforce_activity_registration_rules();

-- ---------------------------------------------------------------------------
-- feed: posts, comments, likes, attachments
-- ---------------------------------------------------------------------------

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_posts_not_empty check (coalesce(content, '') <> '')
);

create index feed_posts_created_at_idx on public.feed_posts (created_at desc);
create index feed_posts_author_idx on public.feed_posts (author_id);

create trigger feed_posts_set_updated_at
  before update on public.feed_posts
  for each row execute function public.set_updated_at();

create table public.feed_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  type public.feed_attachment_type not null,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index feed_attachments_post_idx on public.feed_attachments (post_id);

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feed_comments_post_idx on public.feed_comments (post_id, created_at);

create trigger feed_comments_set_updated_at
  before update on public.feed_comments
  for each row execute function public.set_updated_at();

create table public.feed_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

create index feed_likes_post_idx on public.feed_likes (post_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_category_idx on public.documents (category);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications & push subscriptions
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unread_idx on public.notifications (profile_id) where is_read = false;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- ---------------------------------------------------------------------------
-- Invitation-driven signup: handle_new_user trigger on auth.users
-- ---------------------------------------------------------------------------
-- Registration only ever happens through a valid invitation token. The
-- client calls supabase.auth.signUp() with the token (and profile/company
-- data) in the user metadata; this trigger validates the token and builds
-- the profile/company rows in the same transaction as the auth user, so a
-- failed or invalid invitation aborts the signup entirely.

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public, minimal invitation lookup used by the registration page before an
-- account exists. Never exposes the token table itself to anon/authenticated
-- roles, only a single row matched by the exact (unguessable) token.
create or replace function public.get_invitation_preview(p_token text)
returns table (valid boolean, role public.user_role, email text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (status = 'pending' and expires_at > now()) as valid,
    role,
    email
  from public.invitations
  where token = p_token;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- Minimal, unauthenticated company lookup so the registration form can let
-- a new member pick an existing company instead of creating a duplicate.
-- Deliberately returns only the fields needed to disambiguate a match.
create or replace function public.search_companies_for_signup(p_query text)
returns table (id uuid, name text, city text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, city
  from public.companies
  where p_query is not null and length(trim(p_query)) >= 2 and name ilike '%' || trim(p_query) || '%'
  order by name
  limit 10;
$$;

grant execute on function public.search_companies_for_signup(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.invitations enable row level security;
alter table public.activities enable row level security;
alter table public.activity_registrations enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_attachments enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_likes enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_members_select" on public.profiles
  for select using (public.is_active_member());
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- companies
create policy "companies_members_select" on public.companies
  for select using (public.is_active_member());
create policy "companies_members_insert" on public.companies
  for insert with check (public.is_active_member());
create policy "companies_board_update" on public.companies
  for update using (public.is_board());
create policy "companies_admin_delete" on public.companies
  for delete using (public.is_admin());

-- company_members
create policy "company_members_select" on public.company_members
  for select using (public.is_active_member());
create policy "company_members_self_or_board_insert" on public.company_members
  for insert with check (profile_id = auth.uid() or public.is_board());
create policy "company_members_board_update" on public.company_members
  for update using (public.is_board());
create policy "company_members_self_or_board_delete" on public.company_members
  for delete using (profile_id = auth.uid() or public.is_board());

-- invitations (board manages "lid" invites, only admin may grant board/admin roles)
create policy "invitations_board_select" on public.invitations
  for select using (public.is_board());
create policy "invitations_insert" on public.invitations
  for insert with check (
    invited_by = auth.uid()
    and (public.is_admin() or (role = 'lid' and public.is_board()))
  );
create policy "invitations_update" on public.invitations
  for update using (
    public.is_admin() or (role = 'lid' and public.is_board())
  );

-- activities
create policy "activities_members_select" on public.activities
  for select using (public.is_active_member());
create policy "activities_board_insert" on public.activities
  for insert with check (public.is_board());
create policy "activities_board_update" on public.activities
  for update using (public.is_board());
create policy "activities_board_delete" on public.activities
  for delete using (public.is_board());

-- activity_registrations
create policy "activity_registrations_members_select" on public.activity_registrations
  for select using (public.is_active_member());
create policy "activity_registrations_self_insert" on public.activity_registrations
  for insert with check (profile_id = auth.uid() and public.is_active_member());
create policy "activity_registrations_self_or_board_delete" on public.activity_registrations
  for delete using (profile_id = auth.uid() or public.is_board());

-- feed_posts
create policy "feed_posts_members_select" on public.feed_posts
  for select using (public.is_active_member());
create policy "feed_posts_self_insert" on public.feed_posts
  for insert with check (author_id = auth.uid() and public.is_active_member());
create policy "feed_posts_self_or_board_delete" on public.feed_posts
  for delete using (author_id = auth.uid() or public.is_board());

-- feed_attachments
create policy "feed_attachments_members_select" on public.feed_attachments
  for select using (public.is_active_member());
create policy "feed_attachments_author_insert" on public.feed_attachments
  for insert with check (
    exists (
      select 1 from public.feed_posts
      where id = post_id and author_id = auth.uid()
    )
  );
create policy "feed_attachments_author_or_board_delete" on public.feed_attachments
  for delete using (
    public.is_board()
    or exists (select 1 from public.feed_posts where id = post_id and author_id = auth.uid())
  );

-- feed_comments
create policy "feed_comments_members_select" on public.feed_comments
  for select using (public.is_active_member());
create policy "feed_comments_self_insert" on public.feed_comments
  for insert with check (author_id = auth.uid() and public.is_active_member());
create policy "feed_comments_self_or_board_delete" on public.feed_comments
  for delete using (author_id = auth.uid() or public.is_board());

-- feed_likes
create policy "feed_likes_members_select" on public.feed_likes
  for select using (public.is_active_member());
create policy "feed_likes_self_insert" on public.feed_likes
  for insert with check (profile_id = auth.uid() and public.is_active_member());
create policy "feed_likes_self_delete" on public.feed_likes
  for delete using (profile_id = auth.uid());

-- documents
create policy "documents_members_select" on public.documents
  for select using (public.is_active_member());
create policy "documents_board_insert" on public.documents
  for insert with check (public.is_board());
create policy "documents_board_update" on public.documents
  for update using (public.is_board());
create policy "documents_board_delete" on public.documents
  for delete using (public.is_board());

-- notifications (recipient-only; rows are created server-side, not by clients)
create policy "notifications_self_select" on public.notifications
  for select using (profile_id = auth.uid());
create policy "notifications_self_update" on public.notifications
  for update using (profile_id = auth.uid());
create policy "notifications_self_delete" on public.notifications
  for delete using (profile_id = auth.uid());

-- push_subscriptions (owner-only)
create policy "push_subscriptions_self_select" on public.push_subscriptions
  for select using (profile_id = auth.uid());
create policy "push_subscriptions_self_insert" on public.push_subscriptions
  for insert with check (profile_id = auth.uid());
create policy "push_subscriptions_self_update" on public.push_subscriptions
  for update using (profile_id = auth.uid());
create policy "push_subscriptions_self_delete" on public.push_subscriptions
  for delete using (profile_id = auth.uid());
