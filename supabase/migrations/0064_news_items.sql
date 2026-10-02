-- Nieuws: korte officiële berichten van bestuur/communicatie, los van de
-- community-feed (die kent zelf al een "nieuws"-categorietag, maar dat zijn
-- door leden geplaatste berichten — dit is uitdrukkelijk een apart kanaal
-- voor officiële mededelingen, zichtbaar op het dashboard en op een eigen
-- overzichtspagina). Bewust geen koppeling met het notificatiesysteem (push/
-- e-mail) — dat wordt in een aparte stap herzien i.p.v. er hier nog een
-- trigger-gebonden kanaal bovenop te stapelen.

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  body text not null,
  image_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index news_items_created_at_idx on public.news_items (created_at desc);

create trigger news_items_set_updated_at
  before update on public.news_items
  for each row execute function public.set_updated_at();

alter table public.news_items enable row level security;

create policy "news_items_members_select" on public.news_items
  for select using (public.is_active_member());
create policy "news_items_board_insert" on public.news_items
  for insert with check (public.is_board());
create policy "news_items_board_update" on public.news_items
  for update using (public.is_board());
create policy "news_items_board_delete" on public.news_items
  for delete using (public.is_board());

-- news-images: zelfde zichtbaarheid als de documents-bucket (alleen actieve
-- leden, dus NIET zoals activity-images dat ook aan anonieme embed-bezoekers
-- toont) — nieuws is uitdrukkelijk een intern kanaal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif'])
on conflict (id) do nothing;

create policy "news_images_select" on storage.objects
  for select using (bucket_id = 'news-images' and public.is_active_member());
create policy "news_images_board_insert" on storage.objects
  for insert with check (bucket_id = 'news-images' and public.is_board());
create policy "news_images_board_update" on storage.objects
  for update using (bucket_id = 'news-images' and public.is_board());
create policy "news_images_board_delete" on storage.objects
  for delete using (bucket_id = 'news-images' and public.is_board());
