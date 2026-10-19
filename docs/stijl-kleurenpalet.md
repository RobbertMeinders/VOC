# Stijlafspraken kleur (voor de grafische ronde)

Status: gekozen richting, nog niet doorgevoerd. Meenemen bij de grafische ronde van het portaal (en de website).
Visueel overzicht: https://claude.ai/artifact/KduqUZMM3jV5ZJhAzXNWTZ

## Uitgangspunten
- Rood (VOC-rood) is schaars: alleen logo, de belangrijkste knop per scherm, het actieve menu-item, de meldingsteller, foutmeldingen en op de website één nadrukwoord ("Veendam").
- Geen rood op: filterchips, labels, links, iconen in rondjes, schakelaars, verwijderknoppen in lijsten, badges als "VOC-activiteit" (die wordt grijs met een klein rood bolletje).
- Actief filter: inkt (zwart in licht, wit in donker), niet rood.
- Keuzeschermen zonder "belangrijkste" optie (zoals Nieuw bericht) blijven volledig neutraal.
- Tweede kleur: **diep petrol**. Vervangt zwart als groot vlak (hero, footer, cijferbalk) en kleurt pictogrammen en cijfers. Schermen in het portaal blijven verder grijs/wit.

## Tokens
| Rol | Licht | Donker |
|---|---|---|
| Rood (knop, teller) | #E8000F | #F0323C |
| Rood hover | #B8000C | #FF5A63 |
| Rode tekst | #C8000D | #FF6B72 |
| Rode tekst op petrolvlak | #FF3B45 | #FF3B45 |
| Petrol diep vlak | #0B2E33 | #0B2E33 |
| Petrol (iconen, cijfers) | #0E5A63 | #7CC4C8 |
| Petrol zacht vlak | #E3F0F0 | #13292C |
| Achtergrond | #F7F7F8 | #0F0F12 |
| Vlak | #FFFFFF | #1A1A1E |
| Verhoogd (nieuw) | #F1F1F3 | #232328 |
| Lijn | #E4E4E7 | #2E2E34 |
| Gedempt | #6B6B72 | #9A9AA2 |
| Inkt | #17171A | #F2F2F3 |

## Labelkleuren community (tint-achtergrond + tekst)
- Vraag: blauw #1D4ED8 / #8AB4FF
- Aanbod: groen #15803D / #6EE7A0
- Nieuws & ervaringen: **paars** #6D28D9 / #C4B2FF (was rood)
- Even voorstellen: oranje #B45309 / #FBC96B
- Overig: grijs #55555C / #B4B4BB

## Status
- Gelukt #15803D, Let op #B45309, Fout #C8000D, Neutraal (concept/afgelast/verlopen) #55555C.

## Achtergrond (wens Robbert, 19-10)
- Spaarzaam een zachte gradient op de achtergrond in plaats van alleen blokken: lichte petroltint (#E3F0F0) die bovenaan of achter een kop naar wit/achtergrond verloopt; donker van #13292C naar #0F0F12. Bijvoorbeeld bovenaan Home, het beheerdashboard en lege staten.
