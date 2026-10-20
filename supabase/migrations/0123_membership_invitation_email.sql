-- Robberts feedback: de uitnodigingsmail ging alleen over "het ledenportaal",
-- terwijl de aanvraag feitelijk om een lidmaatschap van de vereniging gaat —
-- het portaal is daar een onderdeel van, niet het belangrijkste. Nieuwe tekst
-- is zijn eigen, al eerder handmatig verstuurde welkomsttekst, met het
-- portaal-stukje (en de registratielink) als los, duidelijk gelabeld
-- onderdeel aan het eind i.p.v. als enige boodschap.
--
-- {{greeting}} i.p.v. rechtstreeks {{first_name}}: renderTemplate kent geen
-- conditionals, en een voornaam is er niet altijd (de kale, handmatige
-- uitnodiging via Beheer -> Uitnodigingen vraagt die niet verplicht) — de
-- code kiest nu zelf "Beste <naam>," of "Hallo," (zie invitationGreeting in
-- lib/email/send.ts) en geeft dat als kant-en-klare aanhef mee.
update public.email_templates set
  subject = 'Welkom bij de Veendammer Ondernemers Compagnie',
  body_html =
    '<p>{{greeting}}</p>' ||
    '<p>Hartelijk dank voor je aanmelding bij de Veendammer Ondernemers Compagnie. Namens het bestuur heet ik je van harte welkom als lid van ons netwerk!</p>' ||
    '<p>We organiseren het hele jaar door verschillende activiteiten voor onze leden, van netwerkborrels en kennissessies tot sportieve evenementen zoals padel en golf. Een overzicht van alle geplande activiteiten vind je op <a href="https://vocveendam.nl/agenda">vocveendam.nl/agenda</a>.</p>' ||
    '<p>Als VOC-lid maak je deel uit van het zakelijke netwerk van Veendam, met meer dan 110 aangesloten organisaties. We hopen je dan ook snel bij een van onze activiteiten te mogen ontmoeten!</p>' ||
    '<p>Het lidmaatschap loopt per kalenderjaar. De contributie wordt jaarlijks vastgesteld tijdens de Algemene Ledenvergadering en bedraagt momenteel &euro; 200,- exclusief btw. Je ontvangt de contributienota rond de ALV in het voorjaar.</p>' ||
    '<p>Als lid krijg je ook toegang tot het ledenportaal, waar je o.a. je profiel beheert, je aanmeldt voor activiteiten en in contact komt met andere leden. <a href="{{link}}">Maak hier je account aan</a> (deze link is 14 dagen geldig).</p>' ||
    '<p>Mocht je vragen hebben, neem dan gerust contact op via <a href="mailto:info@vocveendam.nl">info@vocveendam.nl</a>.</p>' ||
    '<p>Met vriendelijke groet,<br>Veendammer Ondernemers Compagnie</p>',
  description = 'Variabelen: {{greeting}}, {{link}}. Verstuurd bij het accepteren van een lidmaatschapsaanvraag of het aanmaken van een uitnodiging (Beheer -> Aanvragen/Uitnodigingen).'
where key = 'uitnodiging';
