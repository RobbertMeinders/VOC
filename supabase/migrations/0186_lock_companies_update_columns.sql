-- Afronding van het kolomrechten-patroon dat 0091/0139/0145 al voor SELECT
-- op companies toepasten: UPDATE op public.companies staat voor authenticated
-- nog tabel-breed open (elke kolom in één GRANT), terwijl de echte
-- autorisatie (wie mag welk bedrijf bewerken) alleen op rijniveau zit
-- (companies_member_update/companies_board_update, RLS). Dit beperkt UPDATE
-- nu ook op kolomniveau tot de velden die een lid/bestuur daadwerkelijk via
-- een gewone tabel-UPDATE bewerkt (CompanyForm/updateCompanyAction en het
-- "snel bewerken"-paneel in Beheer). Beheer-/levenscyclusvelden
-- (membership_status, membership_end_date, created_by, slug) en de
-- onveranderlijke/systeemvelden (id, created_at, updated_at) blijven erbuiten
-- -- die lopen al via eigen smalle SECURITY DEFINER-functies (die als
-- functie-eigenaar draaien en dus niet door deze kolomrechten geraakt
-- worden) of via de cron/admin-laag.

-- "Snel bewerken" (CompanyQuickEditForm/quickUpdateCompanyAction) zette
-- membership_status tot nu toe via een gewone tabel-UPDATE -- dat kan niet
-- meer zodra de kolom hieronder uit de grant valt, dus eerst een smalle
-- RPC ervoor, zelfde opzet als set_company_show_address (0036) en
-- set_company_member_since (0175).
create function public.set_company_membership_status(p_company_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  if p_status not in ('prospect', 'lid', 'opgezegd', 'oud-lid') then
    raise exception 'invalid status';
  end if;

  update public.companies set membership_status = p_status where id = p_company_id;
end;
$$;

grant execute on function public.set_company_membership_status(uuid, text) to authenticated;

revoke update on public.companies from authenticated;
grant update (
  name, tagline, description, industry, website, city,
  address, postal_code, show_address,
  phone, email, latitude, longitude,
  linkedin_url, instagram_url, facebook_url,
  logo_url, logo_thumb_url, cover_url,
  is_publicly_visible
) on public.companies to authenticated;
