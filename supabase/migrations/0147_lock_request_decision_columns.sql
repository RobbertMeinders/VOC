-- Beveiligingsfixlijst Blok 2, Laag.
--
-- 1) company_membership_requests_self_insert en commission_applications_
-- self_insert beperken wie een rij mag INVOEGEN (de aanvrager zelf), maar
-- niet welke KOLOMMEN daarbij gezet mogen worden — een aanvrager kon zijn
-- eigen aanvraag dus met status al op 'approved'/'goedgekeurd' en een
-- verzonnen decided_by indienen, in plaats van de echte beoordeling door
-- bestuur/een bestaand bedrijfslid af te wachten. Twee kleine BEFORE
-- INSERT-triggers forceren de beginwaarden, ongeacht wat de client meestuurt.
create or replace function public.guard_company_membership_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'pending';
  new.decided_by := null;
  new.decided_at := null;
  return new;
end;
$$;

create trigger company_membership_requests_guard_insert
  before insert on public.company_membership_requests
  for each row execute function public.guard_company_membership_request_insert();

create or replace function public.guard_commission_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'in_behandeling';
  new.decided_by := null;
  new.decided_at := null;
  return new;
end;
$$;

create trigger commission_applications_guard_insert
  before insert on public.commission_applications
  for each row execute function public.guard_commission_application_insert();

-- 2) enforce_activity_registration_rules (laatst herdefinieerd in 0135) zet
-- is_waitlisted al hard zelf, maar liet attended ongemoeid — een lid kon
-- zich dus meteen als "aanwezig geweest" aanmelden, in plaats van dat
-- bestuur dat pas na afloop afvinkt (zie 0030).
create or replace function public.enforce_activity_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
  v_max integer;
  v_status text;
  v_confirmed_count integer;
begin
  new.attended := false;

  select registration_deadline, max_participants, status
    into v_deadline, v_max, v_status
    from public.activities
    where id = new.activity_id
    for update;

  if v_status = 'cancelled' then
    raise exception 'Deze activiteit is afgelast.';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'De aanmelddeadline voor deze activiteit is verstreken.';
  end if;

  if v_max is not null then
    select
      (select count(*) from public.activity_registrations where activity_id = new.activity_id and not is_waitlisted)
      + (select count(*) from public.public_activity_registrations where activity_id = new.activity_id)
      into v_confirmed_count;

    new.is_waitlisted := v_confirmed_count >= v_max;
  else
    new.is_waitlisted := false;
  end if;

  return new;
end;
$$;

-- 3) company_billing_details (0083) en companies_member_update/company_logos_
-- member_* (ook 0083) gaven elk gekoppeld lid rechten op het eigen bedrijf
-- op basis van een company_members-rij alleen — zonder te checken of dat
-- lid zelf nog actief is. Een gedeactiveerd account met een (nooit
-- opgeruimde) company_members-rij behield zo lees-/schrijfrechten op
-- factuurgegevens, het bedrijfsprofiel en het bedrijfslogo.
drop policy "company_billing_details_member_select" on public.company_billing_details;
create policy "company_billing_details_member_select" on public.company_billing_details
  for select using (
    public.is_board()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = auth.uid()
      )
    )
  );

drop policy "company_billing_details_member_insert" on public.company_billing_details;
create policy "company_billing_details_member_insert" on public.company_billing_details
  for insert with check (
    public.is_board()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = auth.uid()
      )
    )
  );

drop policy "company_billing_details_member_update" on public.company_billing_details;
create policy "company_billing_details_member_update" on public.company_billing_details
  for update using (
    public.is_board()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = auth.uid()
      )
    )
  );

drop policy "companies_member_update" on public.companies;
create policy "companies_member_update" on public.companies
  for update using (
    public.is_active_member()
    and exists (
      select 1 from public.company_members
      where company_id = companies.id and profile_id = auth.uid()
    )
  );

drop policy "company_logos_member_insert" on storage.objects;
create policy "company_logos_member_insert" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and public.is_active_member()
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy "company_logos_member_update" on storage.objects;
create policy "company_logos_member_update" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and public.is_active_member()
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy "company_logos_member_delete" on storage.objects;
create policy "company_logos_member_delete" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and public.is_active_member()
    and exists (
      select 1 from public.company_members
      where profile_id = auth.uid() and company_id::text = (storage.foldername(name))[1]
    )
  );
