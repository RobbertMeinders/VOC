-- E-mailwijziging ging tot nu toe via Supabase Auth's ingebouwde
-- updateUser({ email })-mails, verstuurd vanaf Supabase's eigen
-- afzenderadres i.p.v. info@vocveendam.nl (op gebruikersverzoek). Zelfde
-- patroon als uitnodiging/wachtwoord_reset hierboven: één beheerbaar
-- sjabloon, hergebruikt voor zowel de bevestigingsmail naar het huidige als
-- naar het nieuwe adres (het project heeft "Secure email change" aan, dus
-- allebei moeten bevestigen voordat de wijziging echt ingaat).
insert into public.email_templates (key, subject, body_html, description) values
(
  'email_wijzigen',
  'Bevestig je nieuwe e-mailadres',
  '<p>Hallo,</p>' ||
  '<p>Er is een wijziging van e-mailadres aangevraagd voor je account op het VOC Ledenportaal.</p>' ||
  '<p><a href="{{link}}">Bevestig deze wijziging</a></p>' ||
  '<p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren - je e-mailadres wijzigt dan niet.</p>' ||
  '<p>Met vriendelijke groet,<br>VOC</p>',
  'Variabelen: {{link}} — de bevestigingslink. Verstuurd naar zowel het huidige als het nieuwe e-mailadres bij "E-mailadres wijzigen" (Instellingen).'
);
