-- Beheerwens: een lid (of iedereen) direct kunnen uitloggen — bv. bij
-- verdenking van een gedeelde/gestolen sessie, of na een rolwijziging die
-- meteen moet ingaan, zonder te wachten tot het account zelf uitlogt of de
-- sessie verloopt. Supabase Auth heeft geen admin-API om een sessie op
-- user-id te beëindigen (auth.admin.signOut() werkt alleen met het JWT van
-- de gebruiker zelf, niet met een los user-id) — de gedocumenteerde omweg
-- is de sessie rechtstreeks uit auth.sessions (en, voor de zekerheid, de
-- bijbehorende auth.refresh_tokens) verwijderen: de volgende
-- tokenverversing voor dat account faalt daardoor en de gebruiker moet
-- opnieuw inloggen. Alleen de server-acties (met admin-client, voor
-- rechtstreekse toegang tot het auth-schema) roepen dit aan — zelfde
-- rechten-opzet als anonymize_profile_now (0078).
create function public.force_logout_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.refresh_tokens where user_id = p_id::text;
  delete from auth.sessions where user_id = p_id;
end;
$$;

grant execute on function public.force_logout_member(uuid) to service_role;

-- "Iedereen uitloggen": zelfde mechanisme voor alle sessies tegelijk.
-- p_except_id houdt de sessie van de beheerder die deze actie zelf
-- uitvoert in leven, anders zou die zichzelf er ook meteen uitgooien.
create function public.force_logout_all_members(p_except_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.refresh_tokens
  where p_except_id is null or user_id <> p_except_id::text;
  delete from auth.sessions
  where p_except_id is null or user_id <> p_except_id;
end;
$$;

grant execute on function public.force_logout_all_members(uuid) to service_role;
