-- Profielhero-herontwerp: een optionele eigen coverfoto boven de gebrande
-- banner, instelbaar via het Bewerken-formulier (bedrijf en lid allebei).
-- Zonder foto blijft de petrol-gradient-banner gewoon staan — deze kolom is
-- dus puur additief, nooit verplicht. Geen aparte thumb-variant (i.t.t.
-- avatar/logo): de banner wordt overal op dezelfde brede maat getoond, er
-- is geen kleine-lijst-context die een losse thumbnail zou rechtvaardigen.
alter table public.companies
  add column cover_url text;

alter table public.profiles
  add column cover_url text;

-- profiles heeft (i.t.t. companies, zie 0186) een kolom-gerichte UPDATE-grant
-- (0139_lock_down_profile_columns.sql) die per kolom moet worden uitgebreid;
-- zonder deze toevoeging kan niemand de nieuwe kolom zetten.
grant update (cover_url) on public.profiles to authenticated;

-- Zelfde opzet als avatars/company-logos (0002_storage.sql): privé bucket,
-- pad-conventie {company_id}/{file} resp. {profile_id}/{file}. Bekijken mag
-- elk actief lid (zelfde kring als die de hero-pagina's zelf al mag zien);
-- company-covers volgt de company-logos-regel (elk actief lid mag een eerste
-- foto toevoegen, alleen bestuur/beheer mag vervangen/verwijderen) i.p.v. een
-- nieuwe autorisatieregel te verzinnen; profile-covers volgt de
-- avatars-regel (eigenaar beheert alleen de eigen map).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-covers', 'company-covers', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('profile-covers', 'profile-covers', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "company_covers_select" on storage.objects
  for select using (bucket_id = 'company-covers' and public.is_active_member());
create policy "company_covers_insert" on storage.objects
  for insert with check (bucket_id = 'company-covers' and public.is_active_member());
create policy "company_covers_board_update" on storage.objects
  for update using (bucket_id = 'company-covers' and public.is_board());
create policy "company_covers_board_delete" on storage.objects
  for delete using (bucket_id = 'company-covers' and public.is_board());

create policy "profile_covers_select" on storage.objects
  for select using (bucket_id = 'profile-covers' and public.is_active_member());
create policy "profile_covers_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'profile-covers' and public.is_active_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "profile_covers_owner_update" on storage.objects
  for update using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_covers_owner_delete" on storage.objects
  for delete using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text);
