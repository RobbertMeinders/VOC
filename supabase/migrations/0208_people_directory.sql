-- Aanmelden zonder account + personenmodel, Fase 1a (fundament).
--
-- Beheer -> Leden toont tot nu toe alleen echte profielen
-- (get_members_directory, 0174), terwijl het bestuur in de praktijk drie
-- soorten "personen" bijhoudt: geactiveerde/gedeactiveerde leden (profiles),
-- openstaande uitnodigingen (invitations, status 'pending') en losse
-- contacten (contacts, handmatig bijgehouden t.b.v. nieuwsbrieven). Die drie
-- bronnen staan nu los van elkaar, met als gevolg dat de nieuwsbrief-
-- audiences "iedereen"/"niet-leden" (al correct geïmplementeerd in 0192)
-- in de praktijk dun zijn: de contacts-tabel wordt alleen handmatig gevuld.
--
-- Deze migratie legt het fundament:
--  1) get_people_directory(): één RPC die de drie bronnen samenvoegt,
--     dedupliceert op e-mailadres (een profiel wint altijd van een
--     uitnodiging/contact met hetzelfde adres) en een weergave-bedrijfsnaam
--     meegeeft. Board-only (bevat PII uit invitations/contacts, die RLS
--     al tot is_board() beperkt — security definer moet die grens dus zelf
--     herhalen, vandaar de expliciete check in plpgsql i.p.v. language sql).
--  2) Twee triggers die openstaande uitnodigingen automatisch synchroniseren
--     naar contacts (zodat de al werkende nieuwsbrief-audience-logica uit
--     0192/0193 zonder wijziging ook uitnodigingen bereikt) en de
--     bijbehorende contact weer opruimen zodra de uitnodiging wordt
--     geaccepteerd (dan bestaat er een echt profiel). Nooit een handmatig
--     aangemaakt contact overschrijven: on conflict (lower(email)) do
--     nothing.
--
-- Een losse nieuwsbrief-opt-out-vlag per persoon is hiermee niet nodig: die
-- bestaat al twee keer, met precies de juiste scope — profiles.email_
-- campaigns (opt-in voor leden, 0070) en contacts.opted_out (opt-out voor
-- contacten, 0089).

-- ---------------------------------------------------------------------------
-- 1) get_people_directory()
-- ---------------------------------------------------------------------------

create or replace function public.get_people_directory()
returns table (
  id uuid,
  source text,
  person_status text,
  slug text,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  avatar_thumb_url text,
  role public.user_role,
  is_active boolean,
  is_organization_account boolean,
  anonymized_at timestamptz,
  company_name text,
  membership_status text,
  last_active_at timestamptz
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
  with profiel_rows as (
    select
      p.id,
      'profiel'::text as source,
      case when p.is_active then 'geactiveerd' else 'gedeactiveerd' end as person_status,
      p.slug,
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.avatar_url,
      p.avatar_thumb_url,
      p.role,
      p.is_active,
      p.is_organization_account,
      p.anonymized_at,
      coalesce(primary_company.name, any_company.name) as company_name,
      coalesce(primary_company.membership_status, any_company.membership_status) as membership_status,
      p.last_active_at,
      lower(trim(p.email)) as email_key,
      1 as priority
    from public.profiles p
    left join lateral (
      select c.name, c.membership_status
      from public.company_members cm
      join public.companies c on c.id = cm.company_id
      where cm.profile_id = p.id and cm.is_primary
      limit 1
    ) primary_company on true
    left join lateral (
      select c.name, c.membership_status
      from public.company_members cm
      join public.companies c on c.id = cm.company_id
      where cm.profile_id = p.id
      order by cm.created_at
      limit 1
    ) any_company on true
  ),
  uitnodiging_rows as (
    select
      i.id,
      'uitnodiging'::text as source,
      'uitgenodigd'::text as person_status,
      null::text as slug,
      i.first_name,
      i.last_name,
      i.email,
      i.phone,
      null::text as avatar_url,
      null::text as avatar_thumb_url,
      i.role,
      false as is_active,
      false as is_organization_account,
      null::timestamptz as anonymized_at,
      -- Echte koppeling via company_id (door het bestuur zelf gezet bij het
      -- aanmaken van de uitnodiging) -- geen vrij-tekstveld, dus wel een
      -- bevestigde naam, net als bij profiel_rows.
      c.name as company_name,
      c.membership_status,
      null::timestamptz as last_active_at,
      lower(trim(i.email)) as email_key,
      2 as priority
    from public.invitations i
    left join public.companies c on c.id = i.company_id
    where i.status = 'pending' and i.email is not null
  ),
  contact_rows as (
    select
      ct.id,
      'contact'::text as source,
      'nog_niet_uitgenodigd'::text as person_status,
      null::text as slug,
      -- contacts.name is één vrij veld (geen voor-/achternaam-splitsing) --
      -- hier als first_name meegeven en last_name leeg laten i.p.v. een
      -- gok-splitsing die bij samengestelde namen toch fout gaat.
      ct.name as first_name,
      ''::text as last_name,
      ct.email,
      null::text as phone,
      null::text as avatar_url,
      null::text as avatar_thumb_url,
      null::public.user_role as role,
      false as is_active,
      false as is_organization_account,
      null::timestamptz as anonymized_at,
      -- contacts.company is zelf-ingetypt en onbevestigd -- bewust nooit
      -- gekoppeld aan een echte companies-rij, alleen ter weergave.
      ct.company as company_name,
      null::text as membership_status,
      null::timestamptz as last_active_at,
      lower(trim(ct.email)) as email_key,
      3 as priority
    from public.contacts ct
  ),
  combined as (
    select * from profiel_rows
    union all
    select * from uitnodiging_rows
    union all
    select * from contact_rows
  ),
  ranked as (
    select
      combined.*,
      row_number() over (
        partition by coalesce(email_key, source || ':' || id::text)
        order by priority
      ) as rn
    from combined
  )
  select
    ranked.id, ranked.source, ranked.person_status, ranked.slug,
    ranked.first_name, ranked.last_name, ranked.email, ranked.phone,
    ranked.avatar_url, ranked.avatar_thumb_url, ranked.role, ranked.is_active,
    ranked.is_organization_account, ranked.anonymized_at,
    ranked.company_name, ranked.membership_status, ranked.last_active_at
  from ranked
  where rn = 1
  order by ranked.last_name, ranked.first_name;
end;
$$;

revoke all on function public.get_people_directory() from public, anon;
grant execute on function public.get_people_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) invitations <-> contacts synchronisatie
-- ---------------------------------------------------------------------------

-- Elke nieuwe openstaande uitnodiging krijgt een spiegelend contact, zodat
-- de nieuwsbrief-audiences "iedereen"/"niet-leden" (claim_newsletter_
-- deliveries, 0192/0193) uitgenodigden zonder account automatisch meenemen.
-- Nooit een al bestaand (handmatig bijgehouden) contact overschrijven.
create or replace function public.sync_invitation_to_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_company_name text;
begin
  if exists (select 1 from public.profiles where lower(email) = lower(new.email)) then
    return new;
  end if;

  if new.company_id is not null then
    select name into v_company_name from public.companies where id = new.company_id;
  end if;

  insert into public.contacts (name, email, company, created_by)
  values (
    coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), new.email),
    new.email,
    v_company_name,
    new.invited_by
  )
  on conflict (lower(email)) do nothing;

  return new;
end;
$$;

create trigger invitations_sync_to_contact
  after insert on public.invitations
  for each row
  when (new.status = 'pending' and new.email is not null)
  execute function public.sync_invitation_to_contact();

-- Zodra een uitnodiging wordt geaccepteerd bestaat er een echt profiel --
-- het spiegelende contact (indien aangemaakt door de trigger hierboven, of
-- toevallig hetzelfde adres als een los bijgehouden contact) is dan
-- overbodig en zou de persoon dubbel in get_people_directory() tonen.
create or replace function public.cleanup_contact_on_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if new.email is not null then
    delete from public.contacts where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

create trigger invitations_cleanup_contact_on_accept
  after update on public.invitations
  for each row
  when (old.status = 'pending' and new.status = 'accepted')
  execute function public.cleanup_contact_on_invitation_accepted();

-- Backfill: bestaande openstaande uitnodigingen (van vóór deze migratie)
-- meteen laten meedoen, i.p.v. pas bij hun volgende statuswijziging.
insert into public.contacts (name, email, company, created_by)
select
  coalesce(nullif(trim(coalesce(i.first_name, '') || ' ' || coalesce(i.last_name, '')), ''), i.email),
  i.email,
  c.name,
  i.invited_by
from public.invitations i
left join public.companies c on c.id = i.company_id
where i.status = 'pending'
  and i.email is not null
  and not exists (select 1 from public.profiles p where lower(p.email) = lower(i.email))
on conflict (lower(email)) do nothing;

insert into public.schema_migration_log (version) values ('0208') on conflict (version) do nothing;
notify pgrst, 'reload schema';
