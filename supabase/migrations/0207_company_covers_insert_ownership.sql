-- VOC-21: company_covers_insert (0183) checkte alleen is_active_member(),
-- niet of de uploader ook echt bij het doelbedrijf hoort — elk actief lid
-- kon zo een coverfoto in de map van een WILLEKEURIG ander bedrijf zetten.
-- Zelfde eigenaarschapscheck als company_logos_member_insert (0147).
drop policy if exists "company_covers_insert" on storage.objects;

create policy "company_covers_insert" on storage.objects
  for insert with check (
    bucket_id = 'company-covers'
    and public.is_active_member()
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );

insert into public.schema_migration_log (version) values ('0207') on conflict (version) do nothing;
notify pgrst, 'reload schema';
