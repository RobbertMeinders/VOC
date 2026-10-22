-- Lidmaatschap Deel 1, vervolg: opzeggen via de bedrijfspagina.
--
-- Flow: het primaire contact kiest een harde einddatum (sluit aan bij de
-- notulen, dus geen automatische berekening) -> request_company_cancellation
-- zet alleen membership_end_date (status blijft 'lid' tot bevestiging) en
-- meldt bestuur. De Next.js-laag stuurt daarna de bevestigingsmail (met een
-- ondertekende link, zie src/lib/company/cancellation-link.ts) en zet bij
-- bevestiging zelf membership_status op 'opgezegd' via de admin/service-
-- role-client (zelfde patroon als /afmelden, src/app/afmelden/route.ts) —
-- dat is bewust GEEN RPC hier: het token bewijst de autorisatie al, een RPC
-- met een anon-grant zou dat juist omzeilen.
--
-- Bestuur kan een lidmaatschap ook zelf opzeggen: board_cancel_company_
-- membership zet membership_status direct op 'opgezegd' (geen bevestiging
-- nodig, dat is al een geautoriseerde bestuursactie).
create or replace function public.request_company_cancellation(p_company_id uuid, p_end_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text;
  v_company_slug text;
  v_cfg record;
begin
  if p_end_date <= current_date then
    raise exception 'end date must be in the future';
  end if;

  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and profile_id = auth.uid() and is_primary
  ) then
    raise exception 'not authorized';
  end if;

  update public.companies
  set membership_end_date = p_end_date
  where id = p_company_id and membership_status = 'lid'
  returning name, slug into v_company_name, v_company_slug;

  if v_company_name is null then
    raise exception 'company is not an active member';
  end if;

  select * into v_cfg from public.notification_dispatch_config('company_cancellation_started');
  if v_cfg.enabled then
    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'company_cancellation_started', 'Lidmaatschap opgezegd (wacht op bevestiging)',
      coalesce(v_company_name, 'Een bedrijf') || ' heeft het lidmaatschap opgezegd per ' || to_char(p_end_date, 'DD-MM-YYYY') || '.',
      '/bedrijven/' || v_company_slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  end if;
end;
$$;

grant execute on function public.request_company_cancellation(uuid, date) to authenticated;

create or replace function public.board_cancel_company_membership(p_company_id uuid, p_end_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text;
  v_company_slug text;
  v_cfg record;
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  if p_end_date <= current_date then
    raise exception 'end date must be in the future';
  end if;

  update public.companies
  set membership_status = 'opgezegd', membership_end_date = p_end_date
  where id = p_company_id and membership_status = 'lid'
  returning name, slug into v_company_name, v_company_slug;

  if v_company_name is null then
    raise exception 'company is not an active member';
  end if;

  select * into v_cfg from public.notification_dispatch_config('company_cancellation_started');
  if v_cfg.enabled then
    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'company_cancellation_started', 'Lidmaatschap opgezegd door bestuur',
      coalesce(v_company_name, 'Een bedrijf') || ' is door bestuur/beheer opgezegd per ' || to_char(p_end_date, 'DD-MM-YYYY') || '.',
      '/bedrijven/' || v_company_slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    from public.profiles
    where is_active and role = any(coalesce(v_cfg.roles, array['bestuurslid', 'beheerder']));
  end if;
end;
$$;

grant execute on function public.board_cancel_company_membership(uuid, date) to authenticated;

-- Rolinstelling voor de nieuwe meldingstypes, zelfde patroon als new_member
-- (0102/0104): alleen bestuur/beheer, geen "collega's"-tak nodig (dit is
-- geen aanvraag die het bedrijf zelf ook moet zien — het primaire contact
-- weet het al, die heeft de actie zelf net gestart).
insert into public.notification_type_settings (type, roles)
values ('company_cancellation_started', array['bestuurslid', 'beheerder'])
on conflict (type) do nothing;

-- Nieuw, bewerkbaar sjabloon op de berichten-tab (Beheer -> Instellingen ->
-- Berichten) voor de opzeg-bevestigingsmail. {{link}} is altijd de vaste
-- CTA-bestemming (zie renderMessageEmail) — hier de ondertekende
-- bevestigingslink; {{einddatum}} wordt door de aanroepende code ingevuld.
insert into public.message_templates
  (key, sort_order, group_label, name, when_text, to_text, signature_type, has_push, subject, body_html, cta_label, after_html, push_title, push_body)
values
(
  'opzeg-bevestiging', 20, 'Account en toegang', 'Opzegging bevestigen',
  'Het primaire contact van een bedrijf start een opzegging via de bedrijfspagina', 'Het primaire contact', 'alg', false,
  'Bevestig het opzeggen van je VOC-lidmaatschap',
  '<p>{{greeting}}</p>' ||
  '<p>Je hebt het lidmaatschap van {{bedrijf}} opgezegd per {{einddatum}}. Tot die datum blijft alle toegang tot het ledenportaal gewoon bestaan.</p>' ||
  '<p>Bevestig je opzegging via de knop hieronder. Heb je dit per ongeluk gedaan of toch bedacht? Neem dan contact op met het bestuur, dan maken we het ongedaan.</p>',
  'Opzegging bevestigen',
  '<p>Na bevestiging kan dit niet meer zelf ongedaan gemaakt worden; neem daarvoor contact op met het bestuur.</p>',
  null, null
)
on conflict (key) do nothing;
