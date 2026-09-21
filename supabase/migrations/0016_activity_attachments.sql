-- Extra bijlagen bij een activiteit (PDF-uitnodiging, extra foto's), naast
-- de bestaande hero-afbeelding. Zelfde toegangspatroon als "documents"
-- (0002_storage.sql): elk actief lid mag bekijken/downloaden, alleen
-- bestuur/beheer beheert.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-attachments',
  'activity-attachments',
  false,
  26214400,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword'
  ]
)
on conflict (id) do nothing;

create policy "activity_attachments_storage_select" on storage.objects
  for select using (bucket_id = 'activity-attachments' and public.is_active_member());
create policy "activity_attachments_storage_board_insert" on storage.objects
  for insert with check (bucket_id = 'activity-attachments' and public.is_board());
create policy "activity_attachments_storage_board_delete" on storage.objects
  for delete using (bucket_id = 'activity-attachments' and public.is_board());

create table public.activity_attachments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index activity_attachments_activity_idx on public.activity_attachments (activity_id);

alter table public.activity_attachments enable row level security;

create policy "activity_attachments_select" on public.activity_attachments
  for select using (public.is_active_member());
create policy "activity_attachments_board_insert" on public.activity_attachments
  for insert with check (public.is_board());
create policy "activity_attachments_board_delete" on public.activity_attachments
  for delete using (public.is_board());
