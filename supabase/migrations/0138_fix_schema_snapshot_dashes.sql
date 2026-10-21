-- 0137 faalde bij het draaien ("unterminated dollar-quoted string"): de
-- functiebody gebruikte '-- POLICIES --' en '-- FUNCTIONS --' als
-- sectiekopjes IN string-literalen. Dat is voor Postgres zelf prima geldige
-- syntax (binnen aanhalingstekens is -- geen commentaar), maar de Supabase
-- SQL-editor (en vermoedelijk andere SQL-tools) strippen kennelijk alles
-- vanaf -- tot einde van de regel, ook binnen een string-literal — dat
-- brak de string halverwege en liet de rest van de functiebody
-- onherkenbaar verminkt achter, met deze foutmelding als gevolg.
-- Zelfde functie, nu met kopjes zonder -- erin.
create or replace function public.get_schema_snapshot()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    '== POLICIES ==' || E'\n' ||
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
    || E'\n\n== FUNCTIONS ==' || E'\n' ||
    coalesce(
      (
        select string_agg(pg_get_functiondef(p.oid), E'\n---\n' order by p.proname, p.oid)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname <> 'get_schema_snapshot'
      ),
      ''
    );
$$;

revoke execute on function public.get_schema_snapshot() from public, anon, authenticated;
grant execute on function public.get_schema_snapshot() to service_role;
