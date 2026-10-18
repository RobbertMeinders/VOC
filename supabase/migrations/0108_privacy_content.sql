-- Privacy & veiligheid (/privacy) was volledig hardcoded tekst in de code;
-- nu door een beheerder zelf aanpasbaar via Beheer -> Portaalinstellingen,
-- net als naam/logo in diezelfde tabel. Eén vrij tekstveld i.p.v. een losse
-- kolom per sectie: de pagina herkent zelf een lichte markdown-achtige
-- opmaak ("## Kopje" voor een tussenkop, "---" voor een scheidingslijn,
-- "[tekst](/pad)" voor een link — zie src/lib/text/renderLiteMarkdown.tsx),
-- zodat het bestuur zelf secties kan toevoegen/hernoemen/verwijderen zonder
-- dat daar een los invoerveld per sectie voor nodig is. Publiek leesbaar,
-- net als de rest van app_settings — een privacyverklaring is sowieso
-- bedoeld om gelezen te kunnen worden, ook door wie nog geen lid is.
alter table public.app_settings
  add column privacy_content text;

update public.app_settings
set privacy_content = $$Hoe het ledenportaal omgaat met je persoonsgegevens en de toegang tot het portaal.

## Persoonsgegevens
Het ledenportaal verwerkt persoonsgegevens, zoals je naam, contactgegevens en functie, om het ledenportaal en de community mogelijk te maken. We gaan zorgvuldig met deze gegevens om.

## Jij bepaalt wat zichtbaar is
Je kunt zelf instellen welke contactgegevens, zoals je e-mailadres en telefoonnummer, zichtbaar zijn voor andere leden. Je beheert deze voorkeuren via [Instellingen](/instellingen).

## Bedrijfsinformatie en persoonlijke gegevens
Bedrijfsgegevens in de bedrijvengids, zoals de bedrijfsnaam, branche en het logo, staan los van je persoonlijke contactgegevens. Deze worden niet automatisch openbaar gemaakt.

## Toegang op basis van rollen
Bepaalde gegevens en functies, zoals ledenbeheer en beheerrapportages, zijn alleen toegankelijk voor bevoegde bestuursleden en beheerders.

## Veilig inloggen
Je logt in via een beveiligde verbinding, met je wachtwoord of een inloglink per e-mail. Het ledenportaal is toegankelijk voor uitgenodigde gebruikers.

## Bescherming van gegevens
We nemen passende technische en organisatorische maatregelen om je persoonsgegevens te beschermen en de toegang tot het ledenportaal zorgvuldig te beheren.

---

We gaan zorgvuldig om met je gegevens en nemen maatregelen om deze te beschermen. Heb je vragen over je gegevens of privacyinstellingen? Neem dan contact op met het bestuur of bekijk je voorkeuren via [Instellingen](/instellingen).$$
where id = true;

alter table public.app_settings
  alter column privacy_content set not null;
