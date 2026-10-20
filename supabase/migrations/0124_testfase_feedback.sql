-- Testfase-disclaimer + feedbackmogelijkheid voor testleden (onboarding-
-- opdracht H): tijdens de testfase draaien sommige dingen nog via de oude,
-- externe weg (aanmelden voor activiteiten, nieuwsbrieven, koppelingen met
-- de website) — dat moet duidelijk zijn voor testleden, met een plek om
-- feedback achter te laten. Zie src/app/(app)/testfase voor de pagina en
-- het formulier, en src/app/(app)/beheer/feedback voor het beheerscherm.

-- Eén schakelaar die het label naast het logo, de banner op Home, de
-- /testfase-pagina, de menulink, de regel bij aanmelden en de
-- welkomststap in één keer aan/uit zet. Standaard aan (de hele reden dat
-- dit bestaat is de huidige testfase), alleen door een beheerder te
-- wijzigen.
alter table public.app_settings add column if not exists show_testfase boolean not null default true;

-- Geen aparte "status"/"afgehandeld" of reactiemogelijkheid (bewust, zie
-- de opdracht): dit is puur een inbox voor het bestuur/beheer om te lezen,
-- geen ticketsysteem.
create table public.testfase_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('probleem', 'idee')),
  message text not null,
  -- Welke pagina het was (referrer, of een meegegeven ?van=) en wat voor
  -- apparaat/scherm — automatisch meegestuurd, geen los invoerveld (zie de
  -- opdracht: "We sturen automatisch mee op welke pagina je was en welk
  -- apparaat je gebruikt").
  page text,
  user_agent text,
  screen_width integer,
  -- Pad in de private 'feedback-screenshots'-bucket hieronder; optioneel.
  screenshot_path text,
  created_at timestamptz not null default now()
);

create index testfase_feedback_created_at_idx on public.testfase_feedback (created_at desc);

alter table public.testfase_feedback enable row level security;

-- Alleen voor zichzelf, en alleen een actief lid (geen anon/externe
-- invoer zoals bij access_requests — dit is alleen voor ingelogde leden).
create policy "testfase_feedback_insert" on public.testfase_feedback
  for insert with check (profile_id = auth.uid() and public.is_active_member());

-- Alleen de rol beheerder leest dit terug (de opdracht: "alleen zichtbaar
-- voor de rol beheerder, niet voor bestuursleden") — is_admin() i.p.v.
-- is_board().
create policy "testfase_feedback_admin_select" on public.testfase_feedback
  for select using (public.is_admin());

-- Rate limit (de opdracht noemt "bijvoorbeeld 10 per lid per dag"): een
-- BEFORE INSERT-trigger i.p.v. alleen een applicatielaag-check, zelfde
-- redenering als enforce_access_request_rate_limit (0120) — een check die
-- alleen in de server action zit is te omzeilen door rechtstreeks tegen
-- Supabase's REST-API te posten.
create or replace function public.enforce_testfase_feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  select count(*) into v_recent_count
    from public.testfase_feedback
    where profile_id = new.profile_id
      and created_at > now() - interval '1 day';

  if v_recent_count >= 10 then
    raise exception 'Je hebt vandaag al genoeg feedback achtergelaten. Probeer het morgen opnieuw.';
  end if;

  return new;
end;
$$;

create trigger testfase_feedback_rate_limit
  before insert on public.testfase_feedback
  for each row execute function public.enforce_testfase_feedback_rate_limit();

-- Interne trigger-functie, niet bedoeld om rechtstreeks aangeroepen te
-- worden door een rol — zelfde patroon als 0114/0115/0116.
revoke execute on function public.enforce_testfase_feedback_rate_limit() from public, anon, authenticated;

-- Screenshots: private bucket, alleen leesbaar voor beheerders via een
-- signed URL (zie getSignedStorageUrl), net als avatars/company-logos maar
-- dan zonder publieke select-policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "feedback_screenshots_insert" on storage.objects
  for insert with check (bucket_id = 'feedback-screenshots' and public.is_active_member());
create policy "feedback_screenshots_admin_select" on storage.objects
  for select using (bucket_id = 'feedback-screenshots' and public.is_admin());
