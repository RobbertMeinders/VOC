-- Lidmaatschap Deel 1, afronding: de geplande cron-taak die op/na de
-- gekozen einddatum het lidmaatschap daadwerkelijk laat eindigen.
--
-- Hergebruikt bewust anonymize_profile_now() (Diepte-audit Blok B1,
-- 0168) voor het intrekken van elk gekoppeld account, i.p.v. een eigen,
-- losse verwijderlogica — zo blijft de al eerder beveiligde/geaudite
-- anonimiseringslogica op één plek. anonymize_profile_now zet
-- anonymized_at, wat get_profiles_pending_auth_scrub() (bestaande cron,
-- src/app/api/cron/anonymize-members/route.ts) de volgende keer automatisch
-- oppikt voor de auth.users-e-mailoverschrijving + avatar-opruiming — geen
-- dubbele logica hier nodig.
--
-- Een bedrijf zonder gekoppelde accounts (toegestaan: "een lid-bedrijf kan
-- bestaan zonder account") doorloopt de lus gewoon zonder iets te
-- anonimiseren en krijgt alleen de statusovergang.
create or replace function public.process_company_membership_cancellations()
returns table (company_id uuid, profiles_anonymized int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company record;
  v_member record;
  v_count int;
begin
  for v_company in
    select c.id from public.companies c
    where c.membership_status = 'opgezegd' and c.membership_end_date <= current_date
  loop
    v_count := 0;
    for v_member in
      select cm.profile_id from public.company_members cm where cm.company_id = v_company.id
    loop
      perform public.anonymize_profile_now(v_member.profile_id);
      v_count := v_count + 1;
    end loop;

    update public.companies set membership_status = 'oud-lid' where id = v_company.id;

    company_id := v_company.id;
    profiles_anonymized := v_count;
    return next;
  end loop;
end;
$$;

revoke execute on function public.process_company_membership_cancellations() from public, anon, authenticated;
grant execute on function public.process_company_membership_cancellations() to service_role;
