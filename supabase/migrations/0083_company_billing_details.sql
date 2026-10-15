-- Factuurgegevens los van het bezoekersadres (companies.address/postal_code/
-- city, die blijven ongewijzigd). Aparte tabel i.p.v. kolommen op companies
-- zelf, om twee redenen: (1) companies_members_select (0001_init.sql) geeft
-- vandaag elk actief lid leesrechten op de volledige companies-rij — factuur-
-- gegevens (btw-nummer, evt. afwijkend factuur-e-mailadres) zijn gevoeliger
-- dan een bezoekadres en horen alleen bij het eigen bedrijf + bestuur/beheer;
-- (2) één nette, zelfstandige plek voor een latere Moneybird-koppeling.
--
-- same_as_visit_address=true (default) betekent: de invoice_*-kolommen
-- worden genegeerd door de applicatie (zie updateCompanyBillingAction) en
-- het bezoekadres geldt als factuuradres. Ze worden bij true bewust NIET
-- leeggemaakt — zo gaat een eerder ingevuld afwijkend adres niet verloren
-- als iemand het vinkje per ongeluk aan/uit zet.
create table public.company_billing_details (
  company_id uuid primary key references public.companies (id) on delete cascade,
  same_as_visit_address boolean not null default true,
  invoice_name text,
  invoice_address text,
  invoice_postal_code text,
  invoice_city text,
  invoice_country text not null default 'Nederland',
  vat_number text,
  invoice_email text,
  updated_at timestamptz not null default now()
);

create trigger company_billing_details_set_updated_at
  before update on public.company_billing_details
  for each row execute function public.set_updated_at();

alter table public.company_billing_details enable row level security;

-- Smaller dan companies_members_select: alleen leden van dit specifieke
-- bedrijf (niet elk actief VOC-lid) of bestuur/beheer.
create policy "company_billing_details_member_select" on public.company_billing_details
  for select using (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = company_billing_details.company_id and profile_id = auth.uid()
    )
  );
create policy "company_billing_details_member_insert" on public.company_billing_details
  for insert with check (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = company_billing_details.company_id and profile_id = auth.uid()
    )
  );
create policy "company_billing_details_member_update" on public.company_billing_details
  for update using (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = company_billing_details.company_id and profile_id = auth.uid()
    )
  );

-- Bedrijfsprofiel zelf bewerken was tot nu toe bestuur/beheer-only
-- (companies_board_update) — leden konden alleen via de losse
-- set_company_show_address-RPC het bezoekadres zichtbaar/onzichtbaar maken,
-- verder niets. Op uitdrukkelijk verzoek: elk gekoppeld lid krijgt nu
-- volledige bewerkrechten op het eigen bedrijf, net als bestuur/beheer.
-- Permissive policies worden OR'd, dus dit voegt toe aan (vervangt niet)
-- companies_board_update. Verwijderen blijft apart geregeld
-- (companies_admin_delete, ongewijzigd) — alleen beheerder.
create policy "companies_member_update" on public.companies
  for update using (
    exists (
      select 1 from public.company_members
      where company_id = companies.id and profile_id = auth.uid()
    )
  );

-- Bedrijfslogo-upload volgt dezelfde verruiming. company_logos_insert stond
-- ooit open voor elk actief lid zonder ownership-check en is in
-- 0058_company_logos_board_only_insert.sql bewust naar bestuur/beheer-only
-- gezet, juist om te voorkomen dat een lid in de logo-map van een ANDER
-- bedrijf kon schrijven. Deze policies herstellen zelfbeheer, maar wél met
-- die ownership-check: alleen de map van het eigen bedrijf
-- (company-logos/{company_id}/...), nooit een ander bedrijf.
create policy "company_logos_member_insert" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );
create policy "company_logos_member_update" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );
create policy "company_logos_member_delete" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );
