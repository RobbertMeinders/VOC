-- Portaal-gezondheidsonderzoek, Blok B1: regressietest voor RLS-policies en
-- functies. De kernoorzaak achter het terugkerende patroon (0063, 0094,
-- 0127, en 0078 t.o.v. 0093) is dat een migratie een functie herschrijft
-- vanuit een OUDE kopie van de body — zonder enige vastgelegde referentie
-- om tegen te vergelijken, valt zo'n eerdere fix stilletjes weg, en niemand
-- merkt het totdat een gebruiker er tegenaan loopt.
--
-- get_schema_snapshot() geeft een deterministische, canonieke tekstweergave
-- terug van (1) elke RLS-policy in het public-schema (tabel, naam, commando,
-- rollen, USING/WITH CHECK) en (2) de volledige broncode van elke functie in
-- het public-schema (via pg_get_functiondef, dat exact dezelfde
-- CREATE-instructie teruggeeft als waarmee de functie gedefinieerd is — elke
-- wijziging aan een policy of functiebody komt dus letterlijk terug als een
-- git-diff). scripts/db-schema-snapshot.mjs roept dit op en vergelijkt het
-- resultaat met een vastgelegd bestand in de repo (supabase/schema-snapshot.txt);
-- de volgende ronde (B2) sluit dit aan op CI, zodat een onbedoelde
-- terugval nooit meer ongemerkt een PR doorkomt.
create function public.get_schema_snapshot()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    '-- POLICIES --' || E'\n' ||
    coalesce(
      (
        select string_agg(
          format(
            '%s.%s | %s | cmd=%s | roles=%s | using=%s | check=%s',
            schemaname, tablename, policyname, cmd, roles::text, coalesce(qual, ''), coalesce(with_check, '')
          ),
          E'\n'
          order by tablename, policyname
        )
        from pg_policies
        where schemaname = 'public'
      ),
      ''
    )
    || E'\n\n-- FUNCTIONS --' || E'\n' ||
    coalesce(
      (
        select string_agg(pg_get_functiondef(p.oid), E'\n---\n' order by p.proname, p.oid)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          -- get_schema_snapshot() zelf buiten de eigen snapshot houden: anders
          -- verandert elke volgende wijziging aan DEZE functie de snapshot van
          -- zichzelf, wat de vergelijking alleen maar ruis geeft.
          and p.proname <> 'get_schema_snapshot'
      ),
      ''
    );
$$;

revoke execute on function public.get_schema_snapshot() from public, anon, authenticated;
grant execute on function public.get_schema_snapshot() to service_role;
