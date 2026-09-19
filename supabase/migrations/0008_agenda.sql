-- Fase 4: agenda.

-- Activities become publicly readable so the WordPress embed (a public,
-- unauthenticated page on the marketing site) can list upcoming
-- VOC-activiteiten. Registrations themselves stay members-only — who's
-- attending is not exposed publicly.
drop policy if exists "activities_members_select" on public.activities;
create policy "activities_public_select" on public.activities
  for select using (true);

-- activity-images: same public-read reasoning as the activities row itself
-- (used on the public embed), board/admin manage the files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-images', 'activity-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "activity_images_select" on storage.objects
  for select using (bucket_id = 'activity-images');
create policy "activity_images_board_insert" on storage.objects
  for insert with check (bucket_id = 'activity-images' and public.is_board());
create policy "activity_images_board_update" on storage.objects
  for update using (bucket_id = 'activity-images' and public.is_board());
create policy "activity_images_board_delete" on storage.objects
  for delete using (bucket_id = 'activity-images' and public.is_board());

-- Reminder notifications: called once a day by a Vercel Cron job hitting
-- /api/cron/agenda-reminders. Security definer so it can write to
-- public.notifications (recipient-only inserts otherwise) and read every
-- member's registrations regardless of the (anonymous, cron-triggered)
-- caller. Dedupes on (profile_id, type, link) so re-running the same day —
-- or the activity still falling in the window tomorrow — never double-sends.
create or replace function public.create_activity_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.notifications (profile_id, type, title, body, link)
  select
    r.profile_id,
    'activity_reminder',
    'Herinnering: ' || a.title,
    'Deze activiteit vindt plaats op ' ||
      to_char(a.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
      coalesce(' bij ' || a.location, '') || '.',
    '/agenda/' || a.id
  from public.activity_registrations r
  join public.activities a on a.id = r.activity_id
  where a.starts_at > now()
    and a.starts_at <= now() + interval '2 days'
    and not exists (
      select 1 from public.notifications n
      where n.profile_id = r.profile_id
        and n.type = 'activity_reminder'
        and n.link = '/agenda/' || a.id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.create_activity_reminders() to anon, authenticated;
