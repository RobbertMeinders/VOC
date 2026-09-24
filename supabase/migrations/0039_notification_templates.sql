-- Fase B: beheerbare inhoud voor automatische notificaties, op beide
-- kanalen. E-mail hergebruikt de bestaande email_templates-tabel (0014) —
-- vier nieuwe rijen ernaast. Push krijgt een parallelle push_templates-
-- tabel in dezelfde vorm (geen HTML-body nodig), met hetzelfde
-- RLS/RPC-patroon.

-- get_pending_push_notifications (0037) gaf tot nu toe geen type terug —
-- de dispatch-cron kende de tekst al kant-en-klaar. Nu de cron zelf een
-- template per type moet opzoeken, moet dat type mee. CREATE OR REPLACE
-- kan de kolommen van een TABLE-return niet wijzigen, dus eerst droppen.
drop function if exists public.get_pending_push_notifications(integer);

create function public.get_pending_push_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications n
  set pushed_at = now()
  from public.profiles p
  where n.profile_id = p.id
    and n.pushed_at is null
    and (
      (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
      or (n.type = 'new_member' and not p.push_new_members)
    );

  return query
  select n.id, n.type, n.title, n.body, n.link, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
  order by n.created_at
  limit p_limit;
end;
$$;

grant execute on function public.get_pending_push_notifications(integer) to anon, authenticated;

-- Mirror van email_templates (0014_email_templates.sql), zonder HTML-body:
-- een pushmelding is platte tekst (titel + bericht).
create table public.push_templates (
  key text primary key,
  title text not null,
  body text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.push_templates enable row level security;

create policy "push_templates_board_select" on public.push_templates
  for select using (public.is_board());
create policy "push_templates_board_update" on public.push_templates
  for update using (public.is_board());

create trigger push_templates_set_updated_at
  before update on public.push_templates
  for each row execute function public.set_updated_at();

-- Security definer zodat de push-dispatch-cron (anonieme, cron-getriggerde
-- caller) de templateinhoud kan lezen — zelfde reden als get_email_template.
create or replace function public.get_push_template(p_key text)
returns table (title text, body text)
language sql
security definer
set search_path = public
stable
as $$
  select title, body from public.push_templates where key = p_key;
$$;

grant execute on function public.get_push_template(text) to anon, authenticated;

-- Vier notificatietypes krijgen beheerbare content op beide kanalen.
-- Variabelen ({{title}}/{{body}}/{{link}}) zijn precies wat de bestaande
-- trigger-functies al in de notifications-rij zetten (zie bv.
-- 0019_broadcast_notifications.sql, 0020_feed_mentions.sql) — geen nieuwe
-- variabele-afleiding nodig. Standaardinhoud is een kale doorgeefluik van
-- titel/body, zodat het gedrag niet verandert totdat een beheerder het
-- aanpast.
insert into public.email_templates (key, subject, body_html, description) values
(
  'nieuwe_activiteit',
  '{{title}}',
  '<p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd bij een nieuwe activiteit, aan leden die hiervoor e-mailmeldingen aan hebben staan.'
),
(
  'nieuw_lid',
  '{{title}}',
  '<p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd bij een nieuw lid, aan leden die hiervoor e-mailmeldingen aan hebben staan.'
),
(
  'feed_reactie',
  '{{title}}',
  '<p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd bij een reactie op je bericht, als je hiervoor e-mailmeldingen aan hebt staan.'
),
(
  'feed_vermelding',
  '{{title}}',
  '<p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd als je getagd wordt in de feed, als je hiervoor e-mailmeldingen aan hebt staan.'
);

insert into public.push_templates (key, title, body, description) values
(
  'nieuwe_activiteit',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd bij een nieuwe activiteit, aan leden die hiervoor pushmeldingen aan hebben staan.'
),
(
  'nieuw_lid',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd bij een nieuw lid, aan leden die hiervoor pushmeldingen aan hebben staan.'
),
(
  'feed_reactie',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd bij een reactie op je bericht, als je hiervoor pushmeldingen aan hebt staan.'
),
(
  'feed_vermelding',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd als je getagd wordt in de feed, als je hiervoor pushmeldingen aan hebt staan.'
);
