-- 0053_public_directory_polish.sql faalde halverwege (op het laatste
-- onderdeel, zie 0054) — de Supabase SQL Editor voert een script als één
-- transactie uit, dus de twee stappen daarvóór (medewerkers-default,
-- logo-opslagregel) zijn toen hoogstwaarschijnlijk óók teruggedraaid,
-- ondanks dat ze op het oog leken te slagen. Dit zet ze alsnog, idempotent
-- (drop policy if exists eerst) voor het geval de policy ergens toch al
-- wél bestaat.
alter table public.profiles alter column publicly_visible set default true;
update public.profiles set publicly_visible = true where publicly_visible = false;

drop policy if exists "company_logos_public_select" on storage.objects;

create policy "company_logos_public_select" on storage.objects
  for select
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.companies
      where id::text = (storage.foldername(name))[1]
        and is_publicly_visible = true
    )
  );
