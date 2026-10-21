-- Diepte-audit Blok B2: een verlopen uitnodiging (expires_at in het
-- verleden, status nog 'pending') bleef voor altijd in de tabel staan.
-- Zelfde bewaartermijn-conventie als delete_expired_prospects (0051) en
-- anonymize_expired_profiles (0037/0136): 90 dagen na het moment dat hij
-- nutteloos werd (hier: expires_at), dan pas definitief verwijderen — ruim
-- genoeg om een bestuurslid nog naar een recent verlopen uitnodiging te
-- laten zoeken/die te verlengen voor hij verdwijnt.
create function public.delete_expired_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.invitations
  where status = 'pending' and expires_at <= now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.delete_expired_invitations() from public, anon, authenticated;
grant execute on function public.delete_expired_invitations() to service_role;
