-- Aanmelden zonder account + personenmodel, Fase 2 (herkenning + koppeling
-- bij website-aanmelding).
--
-- Een aanmelding via de openbare agenda-embed (public_activity_registrations,
-- 0047) wordt vandaag altijd als "geen lid" behandeld, ook als het ingevulde
-- e-mailadres toevallig precies overeenkomt met een bestaand lid of een
-- openstaande uitnodiging. Twee nieuwe functies:
--
--  1) match_person_by_email(): board-onafhankelijk (anon + authenticated,
--     net als upsert_public_activity_registration zelf), exacte match op
--     e-mailadres tegen profiles/invitations. Bij een match met een
--     openstaande uitnodiging geeft hij meteen de velden terug die de
--     TS-laag nodig heeft om dezelfde uitnodigingsmail nogmaals te sturen
--     (de SMTP-verzending zelf kan niet in SQL, vandaar deze knip) en boekt
--     de geldigheidsverlenging meteen bij -- zelfde tolerantie als
--     createInvitationAction: een eventueel mislukte verzending daarna mag
--     dit niet terugdraaien.
--  2) get_public_activity_registrations(): board-only vervanging van de
--     rechtstreekse select op public_activity_registrations in
--     ActivityDetailContent/registraties.csv, nu mét dezelfde matching
--     (person_status + invitation_id erbij) zodat het bestuur ziet wie al
--     lid is, wie al uitgenodigd is (met een knop om die uitnodiging
--     opnieuw te versturen) en wie een echte buitenstaander is (met een
--     knop om die direct uit te nodigen).
--
-- Nooit automatisch een bedrijfsnaam koppelen op basis van het zelf-
-- ingetypte company_name -- dat blijft, net als in get_people_directory
-- (0208), alleen weergave; de "uitnodigen als lid"-actie in de UI laat het
-- bedrijf dan ook bewust leeg.

create or replace function public.match_person_by_email(p_email text)
returns table (
  status text,
  invitation_token text,
  invitation_first_name text,
  invitation_source text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
  v_invitation_id uuid;
  v_token text;
  v_first_name text;
  v_source text;
begin
  if exists (select 1 from public.profiles where lower(email) = v_email) then
    return query select 'lid'::text, null::text, null::text, null::text;
    return;
  end if;

  select i.id, i.token, i.first_name, i.source
    into v_invitation_id, v_token, v_first_name, v_source
  from public.invitations i
  where lower(i.email) = v_email and i.status = 'pending'
  limit 1;

  if v_invitation_id is not null then
    update public.invitations
    set last_sent_at = now(), expires_at = now() + interval '14 days'
    where id = v_invitation_id;

    return query select 'lid_zonder_account'::text, v_token, v_first_name, v_source;
    return;
  end if;

  return query select 'geen_lid'::text, null::text, null::text, null::text;
end;
$$;

revoke all on function public.match_person_by_email(text) from public;
grant execute on function public.match_person_by_email(text) to anon, authenticated;

create or replace function public.get_public_activity_registrations(p_activity_id uuid)
returns table (
  id uuid,
  name text,
  email text,
  company_name text,
  created_at timestamptz,
  person_status text,
  invitation_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id,
    r.name,
    r.email,
    r.company_name,
    r.created_at,
    case
      when exists (select 1 from public.profiles p where lower(p.email) = lower(r.email)) then 'lid'
      when exists (select 1 from public.invitations i where lower(i.email) = lower(r.email) and i.status = 'pending') then 'lid_zonder_account'
      else 'geen_lid'
    end,
    (select i.id from public.invitations i where lower(i.email) = lower(r.email) and i.status = 'pending' limit 1)
  from public.public_activity_registrations r
  where r.activity_id = p_activity_id
  order by r.created_at;
end;
$$;

revoke all on function public.get_public_activity_registrations(uuid) from public, anon;
grant execute on function public.get_public_activity_registrations(uuid) to authenticated;

insert into public.schema_migration_log (version) values ('0209') on conflict (version) do nothing;
notify pgrst, 'reload schema';
