-- Communicatieplan fase 1b: 'activity_reminder' en 'waitlist_promoted'
-- hadden nog geen eigen template (zie NOTIFICATION_EMAIL_TEMPLATE_KEYS /
-- NOTIFICATION_PUSH_TEMPLATE_KEYS in respectievelijk send.ts en
-- dispatch-push.ts) en vielen daardoor terug op de rauwe titel/body van de
-- notificatie zelf, zonder aanhef/afsluiting op e-mail. Zelfde
-- {{title}}/{{body}}/{{link}}-variabelen als de bestaande vier (0039) — die
-- staan al klaar in de bron-triggers (create_activity_reminders,
-- promote_next_waitlisted), dus geen wijziging daar nodig.
insert into public.email_templates (key, subject, body_html, description) values
(
  'activity_reminder',
  '{{title}}',
  '<p>Hallo,</p><p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p><p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd 2 dagen voor een activiteit waarvoor je bent aangemeld, als je hiervoor e-mailmeldingen aan hebt staan.'
),
(
  'waitlist_promoted',
  '{{title}}',
  '<p>Hallo,</p><p>{{body}}</p><p><a href="{{link}}">Bekijk in het ledenportaal</a></p><p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>',
  'Variabelen: {{title}}, {{body}}, {{link}}. Verstuurd als je van de wachtlijst van een activiteit wordt gehaald — altijd aan, los van de meldingsvoorkeuren (tijdkritisch: er is nu een plek voor je vrij).'
);

insert into public.push_templates (key, title, body, description) values
(
  'activity_reminder',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd 2 dagen voor een activiteit waarvoor je bent aangemeld, als je hiervoor pushmeldingen aan hebt staan.'
),
(
  'waitlist_promoted',
  '{{title}}',
  '{{body}}',
  'Variabelen: {{title}}, {{body}}. Verstuurd als je van de wachtlijst van een activiteit wordt gehaald — altijd aan, los van de meldingsvoorkeuren.'
);
