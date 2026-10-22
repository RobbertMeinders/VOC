-- Lidmaatschap, export & privacy — Deel 1: lidmaatschap wordt een
-- eigenschap van het BEDRIJF (niet van een account). Een lid-bedrijf kan
-- bestaan en beheerd worden zonder dat er een account aan gekoppeld is;
-- personen zijn alleen nog contactpersonen/gebruikers (company_members).
--
-- "Prospect" hier is een andere betekenis dan de bestaande, losstaande
-- public.prospects-tabel (0051_prospects.sql, leads uit de openbare agenda
-- die nog geen bedrijfsrecord hebben) — dit is bewust: membership_status
-- beschrijft de levenscyclus van een bedrijf dat al wél een companies-rij
-- heeft (bv. via import of een afgeronde aanmelding), maar nog niet als
-- betalend lid is bevestigd. Twee verschillende dingen die toevallig
-- hetzelfde woord delen; geen koppeling tussen de tabellen.
--
-- Twee stappen voor de default (zelfde truc als elders in deze codebase
-- voor "nieuwe default, bestaande rijen anders"): eerst de kolom met
-- default 'lid' toevoegen (bestaande bedrijven worden zo in één keer
-- 'lid'), dan de default voor NIEUWE rijen omzetten naar 'prospect'.
-- Criterium voor de bulk-vooraf-default is bewust ruim ("alles wat er al
-- stond is lid"): dit is een besloten portaal waar een companies-rij tot nu
-- toe alleen ontstond via een al goedgekeurd/handmatig aangemaakt bedrijf,
-- dus een beste-gok van 'lid' voor alles wat al bestaat is redelijk.
-- Robbert loopt dit zelf handmatig na via Beheer en corrigeert waar nodig
-- (bv. bedrijven die eigenlijk nog prospect/oud-lid zijn).
alter table public.companies
  add column membership_status text not null default 'lid'
    check (membership_status in ('prospect', 'lid', 'opgezegd', 'oud-lid')),
  add column member_since date,
  add column membership_end_date date;

alter table public.companies
  alter column membership_status set default 'prospect';

comment on column public.companies.membership_status is
  'Lidmaatschapsstatus van het BEDRIJF (beheer-begrip, niet member-facing): prospect/lid/opgezegd (bevestigd, loopt af op membership_end_date)/oud-lid (afgelopen).';
comment on column public.companies.member_since is
  'Optioneel, door het bedrijf zelf in te vullen op de bedrijfspagina — geen automatische afleiding.';
comment on column public.companies.membership_end_date is
  'Harde einddatum, gekozen bij het opzeggen (sluit aan bij de notulen). Tot die datum blijft toegang bestaan; de cron-taak (0177) rondt af op/na deze datum.';

-- ---------------------------------------------------------------------------
-- Eén primair contact per bedrijf, afdwingbaar
-- ---------------------------------------------------------------------------
-- company_members.is_primary (0001_init.sql) had tot nu toe geen enforcement
-- en default true: bij meerdere gekoppelde personen kon elke rij true staan.
-- Backfill: de oudste koppeling (created_at) per bedrijf wordt primair, de
-- rest expliciet false — een redelijke beste-gok (wie zich als eerste
-- koppelde was typisch ook de aanmelder), door Robbert handmatig te
-- corrigeren via de nieuwe set_company_primary_contact()-functie hieronder
-- als dat niet klopt.
with ranked as (
  select id, company_id,
    row_number() over (partition by company_id order by created_at asc, id asc) as rn
  from public.company_members
)
update public.company_members cm
set is_primary = (ranked.rn = 1)
from ranked
where cm.id = ranked.id and cm.is_primary <> (ranked.rn = 1);

-- Afdwingen: hoogstens 1 primaire rij per bedrijf (een bedrijf zonder enige
-- gekoppelde persoon heeft gewoon geen rijen, dat is toegestaan — "een
-- lid-bedrijf kan bestaan zonder account").
create unique index company_members_one_primary_idx
  on public.company_members (company_id)
  where is_primary;

-- Smalle, specifieke functie i.p.v. de company_members-RLS-policy te
-- verruimen (zelfde aanpak als set_company_show_address, 0036): bestuur mag
-- het primaire contact wijzigen, zonder dat elk lid ineens company_members
-- in het algemeen mag updaten. Atomisch: de oude primary gaat eerst naar
-- false, dan de nieuwe naar true, binnen één transactie/functie-aanroep.
create or replace function public.set_company_primary_contact(p_company_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and profile_id = p_profile_id
  ) then
    raise exception 'profile is not a member of this company';
  end if;

  update public.company_members set is_primary = false
  where company_id = p_company_id and is_primary and profile_id <> p_profile_id;

  update public.company_members set is_primary = true
  where company_id = p_company_id and profile_id = p_profile_id;
end;
$$;

grant execute on function public.set_company_primary_contact(uuid, uuid) to authenticated;

-- "Lid sinds" is optioneel, door het bedrijf zelf in te vullen op de
-- bedrijfspagina (niet alleen bestuur) — zelfde aanpak als
-- set_company_show_address (0036): een smalle functie i.p.v. de
-- companies_board_update-RLS-policy te verruimen, zodat een gewoon lid
-- nog steeds niet de rest van het bedrijfsprofiel kan wijzigen.
create or replace function public.set_company_member_since(p_company_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = p_company_id and profile_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  update public.companies set member_since = p_date where id = p_company_id;
end;
$$;

grant execute on function public.set_company_member_since(uuid, date) to authenticated;
