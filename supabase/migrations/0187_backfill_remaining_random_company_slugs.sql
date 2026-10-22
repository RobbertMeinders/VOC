-- Vervolg op 0163 (eenmalige backfill van willekeurige/id-staarten in
-- companies.slug, zoals "capture-a61926fa" i.p.v. "capture"): die backfill
-- heeft blijkbaar niet alle bestaande rijen gevangen (bv. bedrijven die pas
-- later zijn aangemaakt of hernoemd, in een venster tussen 0161's
-- codewijziging en het daadwerkelijk live draaien van de migraties). Pakt
-- hier gericht het oude patroon aan -- een "-" gevolgd door exact 8
-- hex-tekens, het kenmerk van de vóór-0161-generator -- i.p.v. de hele
-- tabel opnieuw te hernummeren, zodat al correcte slugs (incl. legitieme
-- "-2"/"-3"-botsingsuffixen uit 0161/0163 zelf) ongemoeid blijven.
-- Hergebruikt generate_unique_company_slug() (0161) voor dezelfde
-- botsingslogica, en zet de oude slug net als bij 0163 om naar een alias
-- zodat een al gedeelde/ingebedde link blijft werken.
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
    insert into public.company_slug_aliases (slug, company_id) values (r.slug, r.id);
    update public.companies set slug = v_new_slug where id = r.id;
  end loop;
end;
$$;
