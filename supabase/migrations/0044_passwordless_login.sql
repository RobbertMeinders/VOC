-- Wachtwoordloze login: uitnodigingen activeren voortaan direct een account
-- (geen wachtwoord meer nodig, zie register/[token]/actions.ts — gebruikt
-- admin.generateLink(type: 'invite') + verifyOtp, dezelfde opzet als de
-- bestaande wachtwoord-reset-mail), en leden kunnen op /login ook inloggen
-- via een magic link i.p.v. een wachtwoord. Wachtwoord blijft een optie:
-- de bestaande wachtwoord-vergeten/-instellen-flow verandert niet.
--
-- Alleen een nieuw e-mailtemplate nodig — geen kolom-/tabelwijzigingen, dit
-- hergebruikt de bestaande invitations-tabel, handle_new_user()-trigger en
-- /auth/confirm-route ongewijzigd.

insert into public.email_templates (key, subject, body_html, description) values
(
  'inloggen_magic_link',
  'Log in bij het VOC Ledenportaal',
  '<p>Hallo,</p>' ||
  '<p>Klik op onderstaande link om in te loggen bij het VOC Ledenportaal. Geen wachtwoord nodig.</p>' ||
  '<p><a href="{{link}}">Log in</a></p>' ||
  '<p>Deze link is een uur geldig en eenmalig te gebruiken. Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren.</p>' ||
  '<p>Met vriendelijke groet,<br>VOC</p>',
  'Variabelen: {{link}} — de inloglink. Verstuurd via "Inloggen via e-mail" op de inlogpagina.'
);
