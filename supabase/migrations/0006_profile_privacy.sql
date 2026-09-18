-- Let members hide their email/phone from other members' view of their
-- profile. This is an application-layer display decision, not an RLS
-- restriction: board/admin and the member themself can always see it, and
-- the columns aren't sensitive enough to warrant hiding at the RLS layer
-- (this is still a closed community, not a public directory).

alter table public.profiles
  add column show_email boolean not null default true,
  add column show_phone boolean not null default true;
