-- Communicatieplan fase 1a: consistente aanhef/afsluiting en naamgeving in
-- de e-mailtemplates. "VOC" als ondertekening vervangen door de volledige,
-- officiële naam (zie ook de eerdere tekstopschoning elders in de app), en
-- de vier kale notificatie-templates (die tot nu toe alleen {{body}} + een
-- link waren, zonder aanhef/afsluiting) krijgen dezelfde, korte e-mailvorm
-- als de drie bestaande transactionele mails — nog steeds beknopt, maar nu
-- leesbaar als volwaardige e-mail i.p.v. een los zinnetje.

update public.email_templates set body_html =
  '<p>Hallo,</p>' ||
  '<p>Je bent uitgenodigd voor het ledenportaal van de Veendammer Ondernemers Compagnie.</p>' ||
  '<p><a href="{{link}}">Maak je account aan</a></p>' ||
  '<p>Deze uitnodiging is 14 dagen geldig.</p>' ||
  '<p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>'
where key = 'uitnodiging';

update public.email_templates set body_html =
  '<p>Hallo,</p>' ||
  '<p>Je hebt een nieuw wachtwoord aangevraagd voor het VOC Ledenportaal.</p>' ||
  '<p><a href="{{link}}">Stel een nieuw wachtwoord in</a></p>' ||
  '<p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren.</p>' ||
  '<p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>'
where key = 'wachtwoord_reset';

update public.email_templates set body_html =
  '<p>Hallo,</p>' ||
  '<p>Klik op onderstaande link om in te loggen bij het VOC Ledenportaal. Geen wachtwoord nodig.</p>' ||
  '<p><a href="{{link}}">Log in</a></p>' ||
  '<p>Deze link is een uur geldig en eenmalig te gebruiken. Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren.</p>' ||
  '<p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>'
where key = 'inloggen_magic_link';

update public.email_templates set body_html =
  '<p>Hallo,</p>' ||
  '<p>{{body}}</p>' ||
  '<p><a href="{{link}}">Bekijk in het ledenportaal</a></p>' ||
  '<p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>'
where key in ('nieuwe_activiteit', 'nieuw_lid', 'feed_reactie', 'feed_vermelding');
