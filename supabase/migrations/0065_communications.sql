-- Communicatiemodule (nieuwsbrieven): database- en e-mailmodel. Bewust
-- additief — niets bestaands wordt hierdoor vervangen (zie het analyse-
-- document "Communicatiemodule VOC Ledenportaal" voor de volledige
-- afweging). Verzendcode zelf volgt pas na aparte goedkeuring van de
-- verzendarchitectuur; deze migratie legt alleen het schema vast.

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'newsletter',
  subject text not null,
  preheader text,
  sender_name text,
  -- 'verzenden_mislukt' is geen doodlopende staat: "opnieuw proberen"
  -- berekent zelf wie nog ontbreekt (vergelijking met notifications-rijen
  -- voor deze communication_id) en verstuurt alleen aan hen door.
  status text not null default 'concept' check (status in ('concept', 'verzonden', 'verzenden_mislukt')),
  content jsonb not null default '[]'::jsonb,
  template_key text,
  -- Alleen herkomst-bookkeeping (bv. "waar kwam dit concept vandaan"),
  -- nooit de brondata van een evenementblok — dat is een snapshot in
  -- content zelf, zodat een latere wijziging aan de activiteit een
  -- concept/verzonden campagne nooit met terugwerkende kracht verandert.
  linked_activity_id uuid references public.activities (id) on delete set null,
  -- Vandaag altijd deze ene waarde; het veld bestaat zodat een latere
  -- doelgroepselectie geen schemawijziging nodig heeft.
  recipient_filter text not null default 'alle_actieve_leden',
  -- Vastgelegd op het moment van versturen, zodat de teller stabiel
  -- blijft ook als het ledenaantal tussentijds verandert.
  total_recipients integer,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index communications_status_idx on public.communications (status, created_at desc);

create trigger communications_set_updated_at
  before update on public.communications
  for each row execute function public.set_updated_at();

alter table public.communications enable row level security;

create policy "communications_board_select" on public.communications
  for select using (public.is_board());
create policy "communications_board_insert" on public.communications
  for insert with check (public.is_board());
create policy "communications_board_update" on public.communications
  for update using (public.is_board());
create policy "communications_board_delete" on public.communications
  for delete using (public.is_board());

-- Elke notifications-rij die een nieuwsbriefverzending vertegenwoordigt
-- krijgt deze FK — vervangt de fragiele type::title-groepering uit de
-- bestaande statistieken alleen voor campagnes; voor alle 12 bestaande
-- triggertypes blijft deze kolom null en verandert er niets.
alter table public.notifications
  add column communication_id uuid references public.communications (id) on delete set null;

create index notifications_communication_idx on public.notifications (communication_id);

-- Klikregistratie: mirror van log_email_opened (0043) voor het
-- email.clicked-webhookevent. Vereist dat click tracking is aangezet op
-- het verzenddomein bij Resend (DNS/dashboard-stap, geen code).
create or replace function public.log_email_clicked(p_provider_id text, p_link text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_profile_id uuid;
begin
  select id, profile_id into v_notification_id, v_profile_id
    from public.notifications where email_provider_id = p_provider_id;

  if v_notification_id is not null then
    insert into public.events (event_type, profile_id, target_type, target_id, metadata)
    values ('notification_clicked', v_profile_id, 'notification', v_notification_id, jsonb_build_object('channel', 'email', 'link', p_link));
  end if;
end;
$$;

grant execute on function public.log_email_clicked(text, text) to anon, authenticated;
