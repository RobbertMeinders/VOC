-- Schrijfstijl-afwerking (Opdracht 2): resterende lange streepjes (—) in
-- geseede/DB-tekst die leden te zien krijgen.

-- email_wijzigen (0118) viel buiten de eerdere opschoonronde (0117, die
-- dateert van vóór 0118) — zelfde stijl als 0117 toen al toepaste op de
-- andere sjablonen.
update public.email_templates
set description = 'Variabelen: {{link}}. De bevestigingslink. Verstuurd naar zowel het huidige als het nieuwe e-mailadres bij "E-mailadres wijzigen" (Instellingen).'
where key = 'email_wijzigen';

-- promote_next_waitlisted (laatst herdefinieerd in 0157 voor de slug-link)
-- nam toen ongemerkt weer de oorspronkelijke (0023/0105) tekst met een lang
-- streepje over, i.p.v. de nette versie die 0117 er eerder al van had
-- gemaakt — hersteld hier, met behoud van 0157's slug-link.
create or replace function public.promote_next_waitlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.activity_registrations;
  v_title text;
  v_slug text;
  v_cfg record;
begin
  if old.is_waitlisted then
    return old;
  end if;

  select * into v_next
    from public.activity_registrations
    where activity_id = old.activity_id and is_waitlisted
    order by created_at
    limit 1
    for update;

  if v_next.id is null then
    return old;
  end if;

  update public.activity_registrations set is_waitlisted = false where id = v_next.id;

  select * into v_cfg from public.notification_dispatch_config('waitlist_promoted');
  if v_cfg.enabled then
    select title, slug into v_title, v_slug from public.activities where id = old.activity_id;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      v_next.profile_id,
      'waitlist_promoted',
      'Je staat nu op de deelnemerslijst',
      'Er is een plek vrijgekomen voor "' || coalesce(v_title, 'de activiteit') || '". Je bent van de wachtlijst gehaald.',
      '/agenda/' || v_slug,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;

  return old;
end;
$$;
