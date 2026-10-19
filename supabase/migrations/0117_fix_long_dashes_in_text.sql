-- Afwerkronde (stijl/tekst): lange streepjes (— en –) in tekst die leden of
-- beheerders te zien krijgen, worden een punt of een kort streepje met
-- spaties — hier de kant die in de database staat (e-mailteksten in het
-- beheerscherm, en de wachtlijstmelding die promote_next_waitlisted
-- genereert). De overige, in de applicatiecode hardcoded teksten zijn in
-- dezelfde ronde al rechtstreeks aangepast.

update public.email_templates
set description = 'Variabelen: {{link}}. De registratielink. Verstuurd bij het aanmaken van een uitnodiging (Beheer → Uitnodigingen).'
where key = 'uitnodiging';

update public.email_templates
set description = 'Variabelen: {{link}}. De link om een nieuw wachtwoord in te stellen. Verstuurd via "Wachtwoord vergeten".'
where key = 'wachtwoord_reset';

update public.email_templates
set description = 'Variabelen: {{link}}. De inloglink. Verstuurd via "Inloggen via e-mail" op de inlogpagina.'
where key = 'inloggen_magic_link';

update public.email_templates
set description = 'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd als je van de wachtlijst van een activiteit wordt gehaald. Altijd aan, los van de meldingsvoorkeuren (tijdkritisch: er is nu een plek voor je vrij).'
where key = 'waitlist_promoted';

update public.push_templates
set description = 'Variabelen: {{title}}, {{body}}. Verstuurd als je van de wachtlijst van een activiteit wordt gehaald. Altijd aan, los van de meldingsvoorkeuren.'
where key = 'waitlist_promoted';

-- De eigenlijke wachtlijstmelding (titel/body van de notificatie, en via
-- {{body}} ook de e-mail- en pushtekst): zelfde functie als 0105, alleen de
-- tekst gewijzigd.
create or replace function public.promote_next_waitlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.activity_registrations;
  v_title text;
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
    select title into v_title from public.activities where id = old.activity_id;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    values (
      v_next.profile_id,
      'waitlist_promoted',
      'Je staat nu op de deelnemerslijst',
      'Er is een plek vrijgekomen voor "' || coalesce(v_title, 'de activiteit') || '". Je bent van de wachtlijst af.',
      '/agenda/' || old.activity_id,
      v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
    );
  end if;

  return old;
end;
$$;
