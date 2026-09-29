-- Eén lichte, generieke audit_logs-tabel voor betekenisvolle beheeracties
-- (wie heeft een activiteit goedgekeurd/afgewezen/gewijzigd, wie heeft een
-- rapportage behandeld, wie heeft een lid geactiveerd/gedeactiveerd, ...) —
-- geen groot apart auditsysteem en geen dashboard, alleen de bron waaruit de
-- context contextueel (bij de activiteit/rapportage/het lid zelf) getoond
-- wordt. Zelfde vorm en RPC-patroon als de bestaande events-tabel
-- (0042_events_and_statistics.sql), maar bewust een aparte tabel: events is
-- voor statistieken (aantallen), audit_logs is een append-only
-- verantwoordingslog met altijd een actor. Alles wat al een eigen kolom
-- heeft (activities.created_by/created_at, invitations.invited_by/
-- accepted_by, documents.uploaded_by) wordt niet nogmaals hier gelogd.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_type, target_id, created_at desc);
create index audit_logs_action_created_idx on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

-- Alleen bestuur/beheer leest dit terug (contextueel bij activiteiten/
-- rapportages/leden/bedrijven/documenten); inserts gaan altijd via de
-- security-definer RPC hieronder, nooit rechtstreeks.
create policy "audit_logs_board_select" on public.audit_logs
  for select using (public.is_board());

-- actor_id komt altijd uit auth.uid() zelf, nooit van de client. Stilzwijgend
-- niets doen voor een niet-bestuurslid i.p.v. een foutmelding: audit-logging
-- mag nooit de aanroepende beheeractie laten mislukken (elke call-site is
-- toch al zelf met requireBoard()/requireAdmin() gegated).
create or replace function public.log_audit_action(
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    return;
  end if;

  insert into public.audit_logs (action, actor_id, target_type, target_id, metadata)
  values (p_action, auth.uid(), p_target_type, p_target_id, p_metadata);
end;
$$;

grant execute on function public.log_audit_action(text, text, uuid, jsonb) to authenticated;
