-- Door bestuur/beheerder bewerkbare e-mailtemplates. De app verstuurt zelf
-- e-mails (uitnodigingen, wachtwoord-reset) via een eigen e-mailservice i.p.v.
-- Supabase Auth's ingebouwde mails, zodat de inhoud hier beheerd kan worden
-- in plaats van in het Supabase-dashboard.
--
-- get_email_template() is een security definer RPC zodat het versturen van
-- een mail (bijv. wachtwoord-reset, vóór inloggen) de templateinhoud kan
-- lezen zonder dat de aanvrager zelf bestuur/beheerder hoeft te zijn — de
-- select/update-policies op de tabel zelf blijven board-only, dat is alleen
-- voor het beheerscherm.
create table public.email_templates (
  key text primary key,
  subject text not null,
  body_html text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.email_templates enable row level security;

create policy "email_templates_board_select" on public.email_templates
  for select using (public.is_board());
create policy "email_templates_board_update" on public.email_templates
  for update using (public.is_board());

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

create or replace function public.get_email_template(p_key text)
returns table (subject text, body_html text)
language sql
security definer
set search_path = public
stable
as $$
  select subject, body_html from public.email_templates where key = p_key;
$$;

grant execute on function public.get_email_template(text) to anon, authenticated;

insert into public.email_templates (key, subject, body_html, description) values
(
  'uitnodiging',
  'Uitnodiging voor het VOC Ledenportaal',
  '<p>Hallo,</p>' ||
  '<p>Je bent uitgenodigd voor het ledenportaal van de Veendammer OndernemersCompagnie.</p>' ||
  '<p><a href="{{link}}">Maak je account aan</a></p>' ||
  '<p>Deze uitnodiging is 14 dagen geldig.</p>' ||
  '<p>Met vriendelijke groet,<br>VOC</p>',
  'Variabelen: {{link}} — de registratielink. Verstuurd bij het aanmaken van een uitnodiging (Beheer → Uitnodigingen).'
),
(
  'wachtwoord_reset',
  'Wachtwoord opnieuw instellen',
  '<p>Hallo,</p>' ||
  '<p>Je hebt een nieuw wachtwoord aangevraagd voor het VOC Ledenportaal.</p>' ||
  '<p><a href="{{link}}">Stel een nieuw wachtwoord in</a></p>' ||
  '<p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren.</p>' ||
  '<p>Met vriendelijke groet,<br>VOC</p>',
  'Variabelen: {{link}} — de link om een nieuw wachtwoord in te stellen. Verstuurd via "Wachtwoord vergeten".'
);
