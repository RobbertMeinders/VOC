-- Live gevonden (niet via code, via een rechtstreekse SQL-sessie): de
-- companies_guard_privileges-trigger (0096) zet companies.slug stilzwijgend
-- terug naar de oude waarde tenzij de uitvoerder bestuur is (is_board()).
-- Dat geldt ook voor een rechtstreekse SQL-editor-sessie of een migratie:
-- die heeft geen auth.uid()/auth.role() (geen PostgREST-laag, dus geen
-- request.jwt.claims), dus is_board() is dan altijd false en de trigger
-- draait een expliciete UPDATE ... SET slug = ... stil terug, zonder fout
-- -- precies wat migratie 0187 trof (de update "slaagde", maar sloeg niets
-- op). Zelfde klasse probleem als guard_profile_privileges/0140 (daar
-- opgelost met een service_role-uitzondering), maar hier net iets breder:
-- auth.role() is bij een rechtstreekse databaseverbinding niet 'service_role'
-- maar NULL (geen enkele API-aanroep -- anoniem, ingelogd, of service_role
-- -- kan auth.role() ooit NULL laten zijn: PostgREST zet altijd een
-- rolclaim). "auth.role() is null" is dus een veilige, exclusieve manier om
-- precies "rechtstreekse databasetoegang (migratie/SQL-editor)" te
-- herkennen, zonder de app-kant breder open te zetten.
create or replace function public.guard_company_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role' or auth.role() is null) then
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

-- Nu migratie 0187 alsnog met terugwerkende kracht voltooien: dezelfde
-- backfill-logica, maar de trigger blokkeert de UPDATE niet langer (deze
-- migratie draait vóór de poging hieronder in dezelfde sessie).
do $$
declare
  r record;
  v_new_slug text;
begin
  for r in
    select id, name, slug
    from public.companies
    where slug ~ '^.+-[0-9a-f]{8}$'
    order by created_at
  loop
    v_new_slug := public.generate_unique_company_slug(r.name);
    insert into public.company_slug_aliases (slug, company_id)
      values (r.slug, r.id)
      on conflict (slug) do nothing;
    update public.companies set slug = v_new_slug where id = r.id;
  end loop;
end;
$$;

insert into public.schema_migration_log (version) values ('0190') on conflict (version) do nothing;
notify pgrst, 'reload schema';
