-- Live gevonden (screenshot, Beheer -> Communicatie -> nieuwsbrief): het
-- Versturen-paneel gaf bij ELK doelgroepfilter ("Alle actieve leden",
-- "Iedereen", "Niet-leden", "Specifieke lijst(en)") en ook bij losse extra
-- ontvangers "Naar 0 ontvangers." aan, zonder foutmelding.
--
-- Oorzaak: previewNewsletterRecipients (src/lib/newsletter/recipients.ts,
-- N4/N5) doet een rechtstreekse .from("profiles").select("id, is_active,
-- email, email_campaigns") als de ingelogde bestuurssessie zelf (niet via
-- een security-definer-RPC). profiles.email zit sinds 0091 bewust NIET in
-- de kolom-grant voor authenticated (alleen get_member_profile/
-- get_members_directory mogen het tonen, met show_email-maskering) -- een
-- rechtstreekse select op die kolom geeft dus een "permission denied for
-- column email"-fout terug. De aanroepende code checkt de Supabase-
-- foutwaarde nergens (`const [{ data: profiles }, ...] = await
-- Promise.all([...])`, direct `profiles ?? []`), dus die fout verdwijnt
-- stilzwijgend en de hele profielenlijst wordt leeg behandeld -- vandaar
-- 0 bij elk filter, ongeacht hoeveel leden er daadwerkelijk voldoen.
-- contacts kende dit probleem niet (geen kolom-lockdown daar, alleen een
-- "board_manage_contacts"-RLS-policy), dus alleen de ledenkant faalde.
--
-- Fix: dezelfde aanpak als overal elders waar een rechtstreekse
-- clientquery tegen een afgeschermde kolom zou botsen (get_member_profile,
-- get_members_export, claim_newsletter_deliveries, ...) -- een smalle
-- is_board()-gated RPC die precies deze vier kolommen teruggeeft, i.p.v.
-- de kolom-grant te verbreden (dat zou profiles.email weer breed
-- opvraagbaar maken voor elke ingelogde sessie, exact wat 0091 afsloot).
create or replace function public.get_profiles_for_newsletter_preview()
returns table (id uuid, is_active boolean, email text, email_campaigns boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  return query select p.id, p.is_active, p.email, p.email_campaigns from public.profiles p;
end;
$$;

grant execute on function public.get_profiles_for_newsletter_preview() to authenticated;

insert into public.schema_migration_log (version) values ('0194') on conflict (version) do nothing;
notify pgrst, 'reload schema';
