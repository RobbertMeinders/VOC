-- Hardening-batch, P0-1: Postgres geeft EXECUTE op een nieuwe functie
-- standaard aan de pseudo-rol PUBLIC, en elke andere rol (dus ook anon/
-- authenticated) erft daarvan -- een latere "revoke execute ... from
-- anon, authenticated" haalt dat PUBLIC-grant zelf niet weg. Eerdere
-- opschoonrondes (0144/0161) gingen er terecht van uit dat dit probleem
-- bestond, maar hun "alter default privileges in schema public revoke
-- execute on functions from public, anon, authenticated" werkt alleen
-- voor nieuwe functies, en bleek dat zelfs daar niet betrouwbaar te doen:
-- functies die ruim ná 0144 zijn aangemaakt (bv. claim_push_send_slot,
-- get_pending_email_digest_notifications in 0173) kregen bij hun eigen
-- aanmaak gewoon weer het standaard PUBLIC-grant, en de daaropvolgende
-- "revoke ... from anon, authenticated" (zonder "from public") liet dat
-- onopgemerkt staan. Zelfde patroon bij functies die nooit een eigen
-- grant-regel kregen (notification_dispatch_config) of waar alleen de
-- toen bekende rollen expliciet zijn ingetrokken (get_email_template in
-- 0171, log_push_unsubscribed in 0060).
--
-- In plaats van opnieuw tientallen functiehandtekeningen stuk voor stuk
-- over te typen (foutgevoelig, zie de toelichting in 0144 zelf) nu één
-- brede, zelf-actualiserende sweep: EXECUTE van PUBLIC af op elke functie
-- in schema public die niet bij een extensie hoort (pg_trgm's
-- operator-/opclass-functies blijven onaangeroerd -- die moeten per
-- definitie voor elke rol werken, anders breekt elke trigram-zoekopdracht
-- die de GIN-index gebruikt). De al bestaande, functie-specifieke grants
-- aan anon/authenticated/service_role verderop in de migratiegeschiedenis
-- blijven volledig intact: PUBLIC is een aparte grant, "revoke ... from
-- public" raakt een losse "grant ... to authenticated" niet.
do $$
declare
  r record;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('revoke execute on function public.%I(%s) from public', r.proname, r.args);
  end loop;
end $$;

-- T1: regressiebewaking tegen precies dit probleem. get_schema_snapshot()
-- (0137/0138) legt al policies en functiebodies vast zodat een onbedoelde
-- terugval meteen als git-diff zichtbaar wordt (zie 0127-regressie) -- nu
-- ook een sectie met elke niet-extensie-functie waar PUBLIC nog EXECUTE
-- op heeft. Na deze migratie hoort die lijst leeg te zijn; maakt een
-- latere migratie per ongeluk weer een publiek-uitvoerbare functie aan
-- (het Postgres-default), dan verandert de snapshot en faalt
-- db:snapshot:check in CI totdat dat bewust wordt opgelost of bevestigd.
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
    )
    || E'\n\n== PUBLIC EXECUTE GRANTS (non-extensie) ==' || E'\n' ||
    coalesce(
      (
        select string_agg(
          format('%s.%s(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
          E'\n'
          order by p.proname, p.oid
        )
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname <> 'get_schema_snapshot'
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
          and has_function_privilege('public', p.oid, 'EXECUTE')
      ),
      '(geen)'
    );
$$;

insert into public.schema_migration_log (version) values ('0200') on conflict (version) do nothing;
notify pgrst, 'reload schema';
