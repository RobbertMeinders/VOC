-- Beveiligingsfixlijst Blok 2, H4: Postgres geeft EXECUTE op een nieuwe
-- functie in schema public standaard aan PUBLIC (en dus aan anon/
-- authenticated, die daar via Supabase van afgeleid zijn), tenzij een
-- migratie dat expliciet intrekt. Een volledige doorloop van alle ~80
-- functies in de migratiegeschiedenis bevestigt dat vrijwel elke functie
-- die via de app wordt aangeroepen (of sowieso gevoelig is) al zo'n
-- expliciete revoke/grant heeft — met één overgebleven uitzondering:
-- generate_unique_profile_slug (0122) kreeg die nooit, puur omdat niets
-- 'm rechtstreeks via de client aanroept (alleen handle_new_user() zelf,
-- via een gewone SQL-aanroep binnen zijn eigen SECURITY DEFINER-context,
-- wat geen aparte EXECUTE-grant vereist). Risicoloos in zijn huidige vorm
-- (puur lezend, geeft alleen een nog-vrije-slugsuggestie terug), maar
-- hoort net zo min default-open te staan als de rest.
--
-- Dit is bewust geen blinde "revoke alles, her-grant alles"-migratie: met
-- alleen migratiegeschiedenis (geen live database) als bron zou een
-- transcriptiefout bij het overtikken van tientallen functiehandtekeningen
-- een bestaande, legitieme grant stilzwijgend kunnen laten vervallen —
-- zonder dat CI's schema-snapshot-check (die alleen policy's/functiebodies
-- vergelijkt, geen kolom-/functie-grants) dat zou opmerken. In plaats
-- daarvan: toekomstige functies default dicht, en de ene nu gevonden
-- openstaande functie alsnog expliciet dicht.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

revoke execute on function public.generate_unique_profile_slug(text, text) from public, anon, authenticated;

-- log_event (0042) accepteerde élke p_event_type-waarde van een willekeurige
-- ingelogde gebruiker, zonder te controleren of het account nog actief is.
-- De app logt zelf maar drie soorten events (zie src/lib/events/log.ts se
-- aanroepers) — alles daarbuiten kan alleen van een rechtstreekse
-- REST-aanroep komen, niet van de app zelf, en zou de events-tabel (de bron
-- voor Statistieken) kunnen vervuilen met verzonnen event-types. Zelfde
-- "stil niets doen" bij een ongeldige aanroep als de bestaande auth.uid()
-- is null-check hieronder, i.p.v. een foutmelding — logEvent() in de app
-- negeert een mislukte log toch al.
create or replace function public.log_event(
  p_event_type text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_member() then
    return;
  end if;

  if p_event_type not in ('activity_viewed', 'document_viewed', 'post_viewed') then
    return;
  end if;

  insert into public.events (event_type, profile_id, target_type, target_id, metadata)
  values (p_event_type, auth.uid(), p_target_type, p_target_id, p_metadata);
end;
$$;
