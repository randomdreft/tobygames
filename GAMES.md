# TobyGames - Technische Documentatie

Alle spellen op [tobygames.nl](https://tobygames.nl). Grotere spellen zijn opgesplitst in meerdere bestanden; kleinere spellen zijn single-file HTML.

## Spellen

| Bestand(en) | Spel | Beschrijving |
|-------------|------|-------------|
| `dierenklikker.html` + `dierenklikker/` | Dierenklikker | Idle clicker met 12 dieren, 12 mini-games, buffs, upgrades, evolutie, kleurthema's, geluid |
| `typen/index.html` + `typen/` | TobyTypen | ADHD-vriendelijke typecursus met 28 lessen, boss fights, XP-systeem |
| `snake.html` | Snake | Klassiek slangenspel met aanpasbare kleuren en snelheid |
| `worms.html` | Neuswormen | Trek wormen uit neusgaten met een pincet |
| `boter-kaas-eieren-xl.html` | BKE XL | 5x5 boter-kaas-en-eieren met AI-modus |
| `winkeltje.html` | Winkeltje | Winkelsimulatie: verzamel items, help klanten |
| `politie.html` | Politie Jacht | Politie-achtervolgingsspel |

---

## Dierenklikker

Het meest uitgebreide spel. Cookie Clicker-achtig incrementeel spel met veel subsystemen.

### Bestandsstructuur (`dierenklikker/`)

| Bestand | Regels | Inhoud |
|---------|--------|--------|
| `style.css` | ~590 | CSS variabelen (`:root`), layout, alle component-styling |
| `sound.js` | ~130 | Web Audio API geluidssynthese, volume-beheer (localStorage) |
| `data.js` | ~375 | Constanten, dierdata (12 soorten + upgrades), quiz-vragen, minigame-data |
| `state.js` | ~440 | `defaultState()`, INI save/load (`stateToIni`/`iniToState`), import/export |
| `engine.js` | ~315 | Prijsberekening, DPS, click value, achievements, buy-functies |
| `minigames.js` | ~1180 | Alle 12 mini-games (quiz, vanger, memory, puzzel, etc.) |
| `ui.js` | ~760 | Prestige, thema's, shop-rendering, game loop, `render()`, `init()` |

### Kernsystemen

- **Klikken & DPS**: klik op het dier voor punten, koop dieren die automatisch punten genereren
- **12 diersoorten**: mier, slak, kikker, kip, kat, hond, lama, paard, panda, olifant, walvis, draak — elk met 5 upgrades
- **Klik-upgrades**: 7 stappen (vaste waarde + DPS-percentage per klik)
- **Globale upgrades**: 7 stappen (DPS +10% tot x2)
- **Offline upgrades**: 5 stappen (10% tot 100% DPS terwijl offline)
- **Mijlpalen**: bij 1/10/25/50/100/250/500/1000 dieren per soort
- **Prestaties (achievements)**: ~100 achievements, elk +2% DPS. Spoiler-toggle beschikbaar.

### 12 Mini-games

| Mini-game | Unlock-dier | Cooldown | Type |
|-----------|------------|----------|------|
| Dieren Tellen | Mier | 3 min | Tel dieren in een grid |
| Dierenquiz | Slak | 3 min | Meerkeuze dierenvragen |
| Dierenvanger | Kikker | 5 min | Klik op vallende dieren |
| De Indringer | Kip | 4 min | Vind het dier dat er niet bij hoort |
| Dieren Wiskunde | Kat | 3 min | Rekensommen |
| Groter of Kleiner | Hond | 4 min | Welk dier is zwaarder? |
| Buff Kiezer | Lama | 4 min | Kies een tijdelijke buff |
| Paardenrace | Paard | 5 min | Gok op het winnende paard |
| Dieren Puzzel | Panda | 5 min | 3x3 schuifpuzzel |
| Wat Eet Ik? | Olifant | 3 min | Kies het juiste voedsel |
| Dieren Sorteren | Walvis | 5 min | Sorteer in boerderij/bos/water |
| Dieren Memory | Draak | 5 min | Vind paren (auto-flip laatste 2) |

### Buff-systeem

Vier buffs (elk 30 seconden actief):
- **Vuurkracht** (🔥): DPS x2
- **Uitverkoop** (🏷️): alle dieren halve prijs
- **Gouden Regen** (⭐): +5% van DPS per klik
- **Jackpot** (💰): direct 30 sec DPS als bonus

### Evolutiesysteem (prestige)

- Beschikbaar wanneer je alle 12 diersoorten bezit
- Reset dieren en punten, behoud sterren (+5% DPS per ster)
- Sterren gebaseerd op totaal verdiende punten (log10 - 9)
- Bij 3⭐: behoud offline upgrades. Bij 7⭐: klik-upgrades. Bij 12⭐: globale upgrades.

### Kleurthema's

11 thema's, elke 10 sterren een nieuw thema (0-100 sterren):
- Oerwoud (standaard), Oceaan, Savanne, Bloesem, Middernacht, Vulkaan, Arctisch, Herfstbos, Koninklijk, Kosmos, Regenboog
- Standaard: automatisch het hoogst vrijgespeelde thema
- "Onthoud deze kleurstelling" toggle om handmatige keuze vast te zetten
- Thema-definitie in `data.js` (`COLOR_THEMES`), toepassing in `ui.js` (`applyTheme`)

### Geluidssysteem

- Web Audio API synthesized geluiden (geen audio bestanden)
- Geluiden: klik, koop, quiz goed/fout, memory match/fail, game start/eind, achievement, prestige
- Volume slider in opties, opgeslagen in localStorage (`dierenklikker_volume`)
- Alle sfx-functies in `sound.js`

### Opslag

- INI-tekstformaat met secties (`[dieren]`, `[upgrades]`, `[prestaties]`, `[evolutie]`, `[statistieken]`, etc.)
- Automatische save elke 30 seconden via localStorage (`dierenklikker_save`)
- Offline-verdiensten berekend bij terugkomst (max 14 dagen)
- Export/import als tekstbestand
- Bij laden: obsolete achievement-IDs worden opgeruimd

### Bulk-kopen

- Na eerste evolutie: 1x/10x/100x knoppen boven de dierenwinkel
- Bij gedeeltelijke betaalbaarheid: koopt wat betaalbaar is
- Prijsweergave toont totaalprijs voor het geselecteerde aantal

---

## TobyTypen

ADHD-vriendelijke typecursus voor kinderen (6-10 jaar).

### Bestandsstructuur (`typen/`)

| Bestand | Inhoud |
|---------|--------|
| `index.html` | HTML shell met lessenkaart |
| `style.css` | Alle CSS |
| `audio.js` | Web Audio geluidseffecten |
| `engine.js` | Game engine: falling words, boss fights, XP, toetsenbord |
| `lessons.js` | 28 lessen met woordlijsten per moeilijkheidsgraad |

### Kernsystemen

- **28 lessen** in 4 fasen: home row, klinkers, bovenrij, onderrij + speciale tekens
- **3 woordlijsttypen per les**: words1 (basis), words2 (gevorderder), words3 (zinnen/lang)
- **Falling-word mechanic**: woorden vallen naar beneden, type ze voordat ze de onderkant raken
- **Boss fights**: elke les eindigt met een boss fight (HP-balk)
- **XP/level systeem**: verdien XP per correct getypt woord
- **Progressieve snelheid**: vroege lessen sneller (0.35), latere lessen tot 0.5
- **Consecutive error detection**: voorkomt spam-typen

### Lesstructuur

Elke les introduceert nieuwe letters en bouwt voort op eerder geleerde letters:
- Les 1-5: Home row (f, j, d, k, s, l, a, g, h)
- Les 6-9: Klinkers (e, i, o, u)
- Les 10-17: Bovenrij (r, t, y, w, q, p)
- Les 18-24: Onderrij (v, b, n, m, c, x, z)
- Les 25-28: Speciale tekens (punt, komma, hoofdletters, cijfers)

---

## Overige Spellen (single-file)

### Snake (`snake.html`)
- Canvas-based slangenspel
- Aanpasbare kleuren en snelheid
- Touch controls voor mobiel
- High score in localStorage

### Neuswormen (`worms.html`)
- Canvas-based physics game
- Drag-and-drop pincet mechanic
- Wormen met unieke persoonlijkheden en kronkelgedrag

### Winkeltje (`winkeltje.html`)
- Top-down winkelmanagement
- Klanten met geduld-timer
- Tot 3 items tegelijk dragen

### BKE XL (`boter-kaas-eieren-xl.html`)
- 5x5 grid, vier op een rij
- AI-tegenstander
- Scorebord en confetti

### Politie Jacht (`politie.html`)
- Race/ontsnappingsspel
- Sterretjes verzamelen voor bonus
- Countdown timer

---

## Emojis

- Apple-emojis lokaal gehost in `emoji/` (~3800 PNG bestanden)
- Bron: `emoji-datasource-apple@16.0.0` (npm)
- Twemoji-library (CDN) als parser: vervangt emoji-tekens door `<img>` tags
- Geen runtime-afhankelijkheid van externe CDN voor afbeeldingen

## Conventies

- **Taal**: alle UI-tekst is Nederlands
- **Opslag**: localStorage, INI-formaat voor Dierenklikker, JSON waar simpeler
- **Geluid**: Web Audio API synthesized (geen audiobestanden nodig)
- **Thema's**: CSS custom properties (`:root` variabelen), runtime verwisseld via JavaScript
- **Emoji rendering**: `parseAppleEmoji(element)` vervangt native emoji door Apple PNG via twemoji
