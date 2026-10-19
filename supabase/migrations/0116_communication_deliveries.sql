-- B1 + N5 (nieuwsbriefsysteem-plan, "de enige grotere stap"): één tabel per
-- ontvanger per nieuwsbrief (leden én contacten samen, ontdubbeld op
-- e-mailadres) i.p.v. de twee aparte tabellen (notifications voor leden,
-- communication_contact_sends voor contacten, zie 0065/0089) die niets
-- wisten van elkaars ontvangers. Vervangt niet: de oude tabellen en hun
-- claim/mark/finalize-functies blijven ongewijzigd bestaan (historie,
-- rollback-pad); de applicatiecode (performNewsletterSend) stopt vanaf nu
-- met ze aan te roepen voor nieuwe verzendingen.

create table public.communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  -- E-mailadres zoals het op het moment van claimen was (D2/D3) — altijd
  -- lowercase/getrimd opgeslagen, dat is ook meteen de sleutel voor
  -- ontdubbeling (zie de unieke index hieronder en
  -- claim_newsletter_deliveries). Blijft intact ook als het lid of contact
  -- zelf later wordt verwijderd (vandaar profile_id/contact_id "on delete
  -- set null" i.p.v. cascade).
  email text not null,
  status text not null default 'wachten' check (status in ('wachten', 'verstuurd', 'mislukt', 'overgeslagen')),
  failure_reason text,
  attempt_id uuid,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  -- Nooit allebei tegelijk (ambigu); wél allebei leeg toegestaan — D4: een
  -- verwijderd contact laat zijn verzendregel staan (met het bewaarde
  -- e-mailadres), en "on delete set null" hierboven zou anders zelf tegen
  -- deze check aanlopen zodra contact_id leeg wordt gemaakt.
  constraint communication_deliveries_not_both_recipient check (
    not (profile_id is not null and contact_id is not null)
  )
);

-- D3: "niet twee keer dezelfde nieuwsbrief" — afgedwongen op databaseniveau,
-- niet alleen in de claim-functie: dit adres krijgt voor deze nieuwsbrief
-- hoogstens één rij, ongeacht via hoeveel lijsten of als lid-én-contact het
-- erin voorkomt.
create unique index communication_deliveries_email_uniq on public.communication_deliveries (communication_id, email);
create index communication_deliveries_communication_idx on public.communication_deliveries (communication_id);

alter table public.communication_deliveries enable row level security;
create policy "board_manage_communication_deliveries" on public.communication_deliveries for all
  using (public.is_board()) with check (public.is_board());

-- Eén poging (knop-klik) om een nieuwsbrief te versturen: eerste verzending,
-- nasturen naar een nieuw toegevoegde ontvanger, of opnieuw proberen na een
-- mislukking. Puur voor de geschiedenis ("wie verstuurde wanneer, en
-- waarom"); communication_deliveries.attempt_id verwijst naar de laatste
-- poging die een rij heeft aangeraakt.
create table public.communication_send_attempts (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications (id) on delete cascade,
  kind text not null check (kind in ('eerste_verzending', 'nasturen', 'opnieuw_proberen')),
  started_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now()
);
create index communication_send_attempts_communication_idx on public.communication_send_attempts (communication_id);

alter table public.communication_send_attempts enable row level security;
create policy "board_manage_communication_send_attempts" on public.communication_send_attempts for all
  using (public.is_board()) with check (public.is_board());

alter table public.communication_deliveries
  add constraint communication_deliveries_attempt_id_fkey
  foreign key (attempt_id) references public.communication_send_attempts (id) on delete set null;

-- Centrale ontdubbelfunctie (D3): maakt een nieuwe verzendpoging aan en
-- zorgt dat elke op dit moment bedoelde ontvanger (leden via het gekozen
-- filter/lijsten plus losse extra's, contacten via lijsten/extra's) een rij
-- heeft — leden eerst, dus een contact met hetzelfde adres als een lid komt
-- er door de e-mail-uniekheid hierboven nooit apart bij (een lid "wint").
-- Afgemelde/inactieve ontvangers krijgen meteen status 'overgeslagen' i.p.v.
-- domweg te worden overgeslagen zonder spoor. Draait bij elke klik op
-- "Versturen" opnieuw (eerste keer, nasturen, of opnieuw proberen) — nooit
-- vooraf, nooit in bulk; wie al 'verstuurd' is wordt met rust gelaten, wie
-- 'wachten' of 'mislukt' is krijgt deze poging toegewezen en komt terug in
-- het resultaat.
create or replace function public.claim_newsletter_deliveries(p_communication_id uuid, p_kind text)
returns table (delivery_id uuid, profile_id uuid, contact_id uuid, email text, attempt_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter text;
  v_attempt_id uuid;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;
  if p_kind not in ('eerste_verzending', 'nasturen', 'opnieuw_proberen') then
    raise exception 'ongeldig soort verzendpoging: %', p_kind;
  end if;

  select recipient_filter into v_filter from public.communications where id = p_communication_id;
  if v_filter is null then
    raise exception 'nieuwsbrief niet gevonden';
  end if;

  insert into public.communication_send_attempts (communication_id, kind, started_by)
  values (p_communication_id, p_kind, auth.uid())
  returning id into v_attempt_id;

  insert into public.communication_deliveries (communication_id, profile_id, email, status, failure_reason)
  select
    p_communication_id,
    p.id,
    lower(trim(p.email)),
    case when p.email_campaigns then 'wachten' else 'overgeslagen' end,
    case when p.email_campaigns then null else 'afgemeld' end
  from public.profiles p
  where p.is_active
    and (
      v_filter = 'alle_actieve_leden'
      or exists (
        select 1 from public.communication_recipient_lists crl
        join public.contact_list_profiles clp on clp.list_id = crl.list_id
        where crl.communication_id = p_communication_id and clp.profile_id = p.id
      )
      or exists (
        select 1 from public.communication_recipient_profiles crp
        where crp.communication_id = p_communication_id and crp.profile_id = p.id
      )
    )
  on conflict (communication_id, email) do nothing;

  insert into public.communication_deliveries (communication_id, contact_id, email, status, failure_reason)
  select
    p_communication_id,
    ct.id,
    lower(trim(ct.email)),
    case when ct.opted_out then 'overgeslagen' else 'wachten' end,
    case when ct.opted_out then 'afgemeld' else null end
  from public.contacts ct
  where (
      v_filter = 'lijsten' and exists (
        select 1 from public.communication_recipient_lists crl
        join public.contact_list_contacts clc on clc.list_id = crl.list_id
        where crl.communication_id = p_communication_id and clc.contact_id = ct.id
      )
    )
    or exists (
      select 1 from public.communication_recipient_contacts crc
      where crc.communication_id = p_communication_id and crc.contact_id = ct.id
    )
  on conflict (communication_id, email) do nothing;

  update public.communications
  set total_recipients = (select count(*) from public.communication_deliveries where communication_id = p_communication_id)
  where id = p_communication_id;

  update public.communication_deliveries
  set attempt_id = v_attempt_id, status = 'wachten', failure_reason = null
  where communication_id = p_communication_id
    and status in ('wachten', 'mislukt');

  return query
  select d.id, d.profile_id, d.contact_id, d.email, d.attempt_id
  from public.communication_deliveries d
  where d.communication_id = p_communication_id
    and d.attempt_id = v_attempt_id
    and d.status = 'wachten';
end;
$$;

revoke execute on function public.claim_newsletter_deliveries(uuid, text) from public, anon;
grant execute on function public.claim_newsletter_deliveries(uuid, text) to authenticated, service_role;

create or replace function public.mark_newsletter_delivery_sent(p_delivery_id uuid, p_provider_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.communication_deliveries
  set status = 'verstuurd', sent_at = now(), provider_id = p_provider_id, failure_reason = null
  where id = p_delivery_id;
end;
$$;

revoke execute on function public.mark_newsletter_delivery_sent(uuid, text) from public, anon;
grant execute on function public.mark_newsletter_delivery_sent(uuid, text) to authenticated, service_role;

create or replace function public.mark_newsletter_delivery_failed(p_delivery_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.communication_deliveries
  set status = 'mislukt', failure_reason = left(coalesce(p_reason, 'Onbekende fout'), 500)
  where id = p_delivery_id;
end;
$$;

revoke execute on function public.mark_newsletter_delivery_failed(uuid, text) from public, anon;
grant execute on function public.mark_newsletter_delivery_failed(uuid, text) to authenticated, service_role;

-- Onderscheiden van mark_newsletter_delivery_failed: dit is geen mislukte
-- verzending maar een bewust, door beleid genegeerde ontvanger (bv. de
-- EMAIL_ALLOWLIST in een niet-productieomgeving — zie src/lib/email/send.ts).
-- Telt bij finalize_newsletter_send_v2 mee als "klaar", niet als "mislukt".
create or replace function public.mark_newsletter_delivery_skipped(p_delivery_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.communication_deliveries
  set status = 'overgeslagen', failure_reason = left(coalesce(p_reason, 'Overgeslagen'), 500)
  where id = p_delivery_id;
end;
$$;

revoke execute on function public.mark_newsletter_delivery_skipped(uuid, text) from public, anon;
grant execute on function public.mark_newsletter_delivery_skipped(uuid, text) to authenticated, service_role;

-- Mirror van finalize_newsletter_send (0089), maar op de nieuwe tabel en met
-- 'overgeslagen' meegeteld als "klaar" — een afgemelde ontvanger hoort de
-- campagne niet voorgoed op 'verzenden_mislukt' te houden.
create or replace function public.finalize_newsletter_send_v2(p_communication_id uuid)
returns table (total integer, sent integer, failed integer, skipped integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_sent integer;
  v_failed integer;
  v_skipped integer;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select
    count(*),
    count(*) filter (where status = 'verstuurd'),
    count(*) filter (where status = 'mislukt'),
    count(*) filter (where status = 'overgeslagen')
  into v_total, v_sent, v_failed, v_skipped
  from public.communication_deliveries
  where communication_id = p_communication_id;

  update public.communications
  set status = case when v_total > 0 and (v_sent + v_skipped) >= v_total then 'verzonden' else 'verzenden_mislukt' end,
      sent_at = case
        when v_total > 0 and (v_sent + v_skipped) >= v_total and sent_at is null then now()
        else sent_at
      end
  where id = p_communication_id;

  return query select v_total, v_sent, v_failed, v_skipped;
end;
$$;

revoke execute on function public.finalize_newsletter_send_v2(uuid) from public, anon;
grant execute on function public.finalize_newsletter_send_v2(uuid) to authenticated, service_role;

-- Eenmalig overzetten van de bestaande verzendgeschiedenis (alleen al-
-- geclaimde ontvangers van reeds verzonden/deels-verzonden campagnes — een
-- concept heeft nog niets geclaimd). Kopie, geen verplaatsing: de oude
-- rijen in notifications/communication_contact_sends blijven ongewijzigd
-- staan. "on conflict do nothing" maakt dit veilig om nog eens te draaien.
insert into public.communication_deliveries (communication_id, profile_id, email, status, sent_at, provider_id, created_at)
select
  n.communication_id,
  n.profile_id,
  lower(trim(p.email)),
  case when n.emailed_at is not null then 'verstuurd' else 'wachten' end,
  n.emailed_at,
  n.email_provider_id,
  n.created_at
from public.notifications n
join public.profiles p on p.id = n.profile_id
where n.type = 'newsletter' and n.communication_id is not null
on conflict (communication_id, email) do nothing;

insert into public.communication_deliveries (communication_id, contact_id, email, status, sent_at, provider_id, created_at)
select
  s.communication_id,
  s.contact_id,
  lower(trim(c.email)),
  case when s.emailed_at is not null then 'verstuurd' else 'wachten' end,
  s.emailed_at,
  s.email_provider_id,
  s.created_at
from public.communication_contact_sends s
join public.contacts c on c.id = s.contact_id
on conflict (communication_id, email) do nothing;

update public.communications c
set total_recipients = (select count(*) from public.communication_deliveries d where d.communication_id = c.id)
where exists (select 1 from public.communication_deliveries d where d.communication_id = c.id);
