# TobyGames - Speloverzicht

Alle spellen op [tobygames.nl](https://tobygames.nl). Elk spel is een enkel HTML-bestand met inline CSS en JavaScript, zonder externe dependencies (behalve dierenklikker die lokale Apple-emoji afbeeldingen gebruikt uit `emoji/`).

## Spellen

| Bestand | Spel | Beschrijving |
|---------|------|-------------|
| `snake.html` | Snake | Klassiek slangenspel met aanpasbare kleuren. Instellingen worden opgeslagen in localStorage. |
| `worms.html` | Neuswormen | Trek wormen uit neusgaten met een pincet en laat ze in een emmer vallen. |
| `boter-kaas-eieren-xl.html` | Boter Kaas en Eieren XL | 5×5 boter-kaas-en-eieren met mens vs. AI modus en confetti bij winst. |
| `winkeltje.html` | Winkeltje | Winkelsimulatie: verzamel items, help klanten bij de kassa, beheer je voorraad. |
| `politie.html` | Politie Jacht! | Politie-achtervolgingsspel met countdown timer en scorebord. |
| `dierenklikker.html` | Dierenklikker | Idle clicker met dieren, mini-games, buffs, upgrades en evolutiesysteem. |

## Dierenklikker - Technische Details

Het meest uitgebreide spel op de site. Gebouwd als Cookie Clicker-achtig incrementeel spel.

### Kernsystemen
- **Klikken & DPS**: klik op het dier voor punten, koop dieren die automatisch punten genereren (DPS)
- **10 diersoorten**: mier, slak, kikker, kip, kat, hond, paard, olifant, walvis, draak — elk met 3 upgrades
- **Klik-upgrades**: vaste klikwaarde-verhogingen en DPS-percentage-per-klik
- **Globale upgrades**: DPS-vermenigvuldigers (+10%, +25%, +50%, ×2)
- **Offline upgrades**: verdien 10-100% van DPS terwijl je weg bent
- **Mijlpalen**: bij 1/10/25/50/100/250/500/1000 dieren van een soort: DPS ×2 per stap
- **Prestaties**: 30+ achievements die elk +2% DPS bonus geven

### Mini-games (ontgrendeld door dieren te kopen)
| Mini-game | Vereiste | Cooldown | Beschrijving |
|-----------|---------|----------|-------------|
| Dierenquiz | Slak | 3 min | Meerkeuze dierenvragen |
| Dierenvanger | Kip | 5 min | Vang vallende dieren |
| Rekenspel | Hond | 3 min | Los rekensommen op |
| Buff Chooser | Olifant | 4 min | Kies een tijdelijke buff |
| Dieren Sorteren | Draak | 5 min | Sorteer dieren in categorieën (boerderij/bos/water) |

### Buff-systeem
Vier buffs beschikbaar via de Buff Chooser (elk 30 seconden actief):
- **Vuurkracht**: DPS ×2
- **Uitverkoop**: alle dieren halve prijs (visueel met doorgestreepte prijs)
- **Gouden Regen**: +10% van DPS per klik
- **Jackpot**: direct 30 seconden DPS als bonus (geen timer)

### Evolutiesysteem (prestige)
- Beschikbaar wanneer je alle 10 diersoorten bezit
- Reset dieren en punten, maar behoud sterren (+5% DPS per ster)
- Aantal sterren gebaseerd op totaal verdiende punten (log10)
- Bij voldoende sterren behoud je ook bepaalde upgrades

### Bulk-kopen
- Na eerste evolutie verschijnen 1×/10×/100× knoppen boven de dierenwinkel
- Bij gedeeltelijke betaalbaarheid (bijv. 10× geselecteerd maar 3 betaalbaar): koopt alsnog de 3
- Prijsweergave toont totaalprijs voor het geselecteerde aantal

### Emojis
- Apple-emojis lokaal gehost in `emoji/` (3793 PNG bestanden, 27 MB)
- Bron: `emoji-datasource-apple@16.0.0` (npm)
- Twemoji-library (CDN) wordt gebruikt als parser om emoji-tekens te vervangen door `<img>` tags
- Geen afhankelijkheid van externe CDN voor de afbeeldingen zelf

### Opslag
- Automatische save elke 30 seconden via localStorage
- Offline-verdiensten berekend bij terugkomst
- Handmatige save/load/reset via opties-paneel
