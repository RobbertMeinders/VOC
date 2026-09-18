-- Lightweight "request access" mechanism for the login page's "Nieuw lid?"
-- link. Anyone can submit one; only board/admin can see and manage them.
-- This does not send email itself (no transactional email provider is wired
-- up yet) — the board reviews requests here and, if legitimate, creates a
-- real invitation via /beheer/uitnodigingen.

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'handled')),
  created_at timestamptz not null default now()
);

create index access_requests_status_idx on public.access_requests (status, created_at desc);

alter table public.access_requests enable row level security;

create policy "access_requests_public_insert" on public.access_requests
  for insert with check (true);

create policy "access_requests_board_select" on public.access_requests
  for select using (public.is_board());

create policy "access_requests_board_update" on public.access_requests
  for update using (public.is_board());
