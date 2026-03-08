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
| `politiejacht.html` + `politiejacht/` | Politiejacht | Stadachtervolging met brandstofmechanisme, EV-modus, meerdere politieauto's |

---

## Dierenklikker

Het meest uitgebreide spel. Cookie Clicker-achtig incrementeel spel met veel subsystemen.

### Bestandsstructuur (`dierenklikker/`)

| Bestand | Regels | Inhoud |
|---------|--------|--------|
| `style.css` | ~1200 | CSS variabelen (`:root`), layout, component-styling, achievement-viering animatie, milestone-bars, tab-badges, wolkendierentuin, mobiele aanpassingen |
| `sound.js` | ~180 | Web Audio API geluidssynthese, volume-beheer (localStorage) |
| `data.js` | ~430 | Constanten, dierdata (12 soorten + upgrades), quiz-vragen, minigame-data, dagelijkse uitdagingen, wolkendierentuin levels, sterrenshop perks |
| `state.js` | ~560 | `defaultState()`, INI save/load (`stateToIni`/`iniToState`), import/export, Apple-emoji rendering (`parseAppleEmoji`) |
| `engine.js` | ~950 | Prijsberekening, DPS, click value, achievements, buy-functies, `getDpsBreakdown()`, `getMaxAffordable()`, dagelijkse uitdagingen, anti-cheat |
| `minigames.js` | ~1300 | Alle 12 mini-games, cancel-systeem (`cancelMinigame`/`cancelAllMinigames`), `buyMax` variabele |
| `ui.js` | ~1970 | Prestige, Dierenhemel, wolkendierentuin, thema's, shop-rendering, game loop, `render()`, `init()`, tab-badges, DPS-uitsplitsing, keyboard shortcuts, scorebord, online spelers |

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

**Beloningen**: enkele-vraag games (quiz, tellen, wiskunde) geven 5 min DPS. Multi-score games geven 1 min DPS per punt. Memory: max 8 min DPS, 0-3 fouten = 100% ("Klasse!"), daarna aflopend.

**Annuleren**: elke actieve minigame toont een "✕ Stop"-knop om het spel te sluiten zonder cooldown of beloning.

### Buff-systeem

Vijf buffs (30 seconden actief, 60s met sterrenshop-perk):
- **Vuurkracht** (🔥): DPS x4
- **Uitverkoop** (🏷️): alle dieren halve prijs
- **Gouden Regen** (⭐): +20% van DPS per klik
- **Jackpot** (💰): direct 30 sec DPS als bonus
- **Geluksregen** (🍀): 3× meer lieveheersbeestjes gedurende de buff

### Evolutiesysteem (prestige)

- Beschikbaar wanneer je alle 12 diersoorten bezit
- Reset dieren en punten, behoud sterren (+5% DPS per ster)
- Sterren gebaseerd op verdiende punten per run: `floor(log10(verdiend) - 9 - sterren×0.02)`. Graduele strafschaling voorkomt oneindig farmen; plafond rond ~400 sterren
- Bij 3⭐: behoud offline upgrades. Bij 7⭐: klik-upgrades. Bij 12⭐: globale upgrades.
- **Dierenhemel**: bij evolutie verschijnt een schermvullend paradijs met alle bezeten dieren in hun natuurlijke habitat, etend van hun favoriete voer (wolken, animaties, etherisch geluid). "Terug naar de Aarde"-knop voert de eigenlijke reset uit.
- Alle actieve minigames worden automatisch gestopt bij evolutie

### Dagelijkse uitdagingen

- 3 willekeurige missies per dag (geseed op datum)
- Beloning: 10 min DPS per missie, 30 min DPS bonus bij alle 3
- Streak-systeem: telt aaneengesloten dagen met alle 3 voltooid
- Achievements bij 3, 7 en 30 dagen streak
- Uitdagingen: klikken, minigames spelen, dieren kopen, unieke minigames, etc.
- Voortgang gebaseerd op delta-snapshots (verschil met start van de dag)
- Inklapbaar op mobiel

### Multiplayer scorebord

- Tab "Scorebord" in middenpaneel
- Top 10 + eigen positie als je lager staat
- Sorteerorde: sterren (primair), score (tiebreaker)
- Vertrouwensindicator per score (🟢 ≥80, 🟠 ≥60, 🔴 <60)
- Filter: "alleen betrouwbaar" (standaard aan, trust ≥ 60)
- Auto-submit bij prestige en elke 5 minuten
- Spelers geïdentificeerd via persistent `pid` in localStorage

### Online spelers

- Hartslag-API pollt elke 30s met sessie-ID
- Sessies verlopen na 90s inactiviteit
- Speleraantal getoond in statistieken-tab

### Kleurthema's

11 thema's, elke 10 sterren een nieuw thema (0-100 sterren):
- Oerwoud (standaard), Oceaan, Savanne, Bloesem, Middernacht, Vulkaan, Arctisch, Herfstbos, Koninklijk, Kosmos, Regenboog
- Standaard: automatisch het hoogst vrijgespeelde thema
- "Onthoud deze kleurstelling" toggle om handmatige keuze vast te zetten
- Thema-definitie in `data.js` (`COLOR_THEMES`), toepassing in `ui.js` (`applyTheme`)

### Geluidssysteem

- Web Audio API synthesized geluiden (geen audio bestanden)
- Geluiden: klik, koop, quiz goed/fout, memory match/fail, game start/eind, achievement, prestige, dierenhemel
- Volume slider in opties, opgeslagen in localStorage (`dierenklikker_volume`)
- Alle sfx-functies in `sound.js`

### Opslag

- INI-tekstformaat met secties (`[dieren]`, `[upgrades]`, `[prestaties]`, `[evolutie]`, `[statistieken]`, etc.)
- Automatische save elke 30 seconden via localStorage (`dierenklikker_save`)
- Offline-verdiensten berekend bij terugkomst (max 14 dagen)
- Export/import als tekstbestand
- Bij laden: obsolete achievement-IDs worden opgeruimd

### Sterrenshop

Na eerste evolutie beschikbaar. Perks kosten sterren en bieden permanente voordelen:
- **Geluk**: hogere kans op lieveheersbeestjes, hogere beloning
- **Evolutie**: behoud upgrades bij evolutie (offline, klik, globaal)
- **Koop alles**: per diersoort (12×) en per upgradecategorie (4×) een "Koop alles"-knop, elk 2⭐
- **Synergieën**: bonussen voor combinaties van dieren

### Wolkendierentuin (Dierenhemel)

Bij evolutie gaan bezeten dieren naar de "wolkendierentuin" — een apart tabblad met enclosures per dier:
- **4 niveaus**: Wolkenweitje (gratis) → Wolkenverblijf (3⭐) → Wolkenpaleis (6⭐) → Gouden Paleis (10⭐)
- **Gelukssysteem**: dieren hebben geluk (happiness) dat langzaam daalt; aaien en voeren verhoogt het
- **Sterrenproductie**: elke enclosure genereert periodiek ⭐ op basis van niveau en geluk (1-5 sterren rating)
- **Verval**: geluk daalt per uur, hogere niveaus hebben minder verval
- **Naamgeving**: spelers geven hun dierentuin een eigen naam
- Staat wordt opgeslagen in INI-formaat onder `[wolkendierentuin]`

### Bulk-kopen

- Na eerste evolutie: 1x/10x/100x/Max knoppen boven de dierenwinkel
- **Max-modus**: berekent automatisch hoeveel dieren je kunt betalen, toont aantal bij de prijs
- Bij gedeeltelijke betaalbaarheid: koopt wat betaalbaar is
- Prijsweergave toont totaalprijs voor het geselecteerde aantal

### Quality of Life

- **Cooldown voortgangsbalken**: visueel balkje onder elke minigame-timer
- **Milestone voortgang**: gouden balkje onder elk dier in de winkel (pas zichtbaar na eerste evolutie), details in tooltip
- **Notificatie-badges**: groen bolletje op Dieren/Upgrades-tab als je iets kunt kopen, goud op Evolutie als je kunt evolueren. Verborgen op actieve tab.
- **DPS-uitsplitsing**: in statistieken een breakdown per diersoort met percentage, plus prestatie-/sterren-/buff-bonus
- **DPS-tooltip op dieren**: hover toont aantal, DPS per stuk, totaal DPS, percentage en volgende milestone
- **Toetsenbordsneltoetsen**: Spatie = klik (geen key-repeat), 1-5 = winkeltabs, G = games, S = statistieken
- **Tab-geheugen**: actieve winkel-, midden- en mobieltab worden onthouden in localStorage (`dk_shoptab`, `dk_midtab`, `dk_mobilepanel`)
- **Prestatie-viering**: bij unlock vliegt de prestatie-emoji groot over het scherm (1.2s animatie)

---

## TobyTypen

ADHD-vriendelijke typecursus voor kinderen (6-10 jaar). Ontworpen als alternatief voor saaie typecursussen (ticken.nl etc.) met maximale dopamine en gamification.

### Bestandsstructuur (`typen/`)

| Bestand | Regels | Inhoud |
|---------|--------|--------|
| `index.html` | ~108 | HTML shell: 3 schermen (kaart, les, resultaten), overlays (intro, achievements, level-up, toast, combo) |
| `style.css` | ~450 | Volledige styling: glassmorphic UI, animaties (pulse-glow, boss-shake, confetti-fall, word-explode, levelup-slide), responsive breakpoints |
| `lessons.js` | ~325 | 28 lesdefinities met woordlijsten, 32 achievement-definities, keyboard layout met vingerindeling, XP-drempels |
| `audio.js` | ~55 | Web Audio API procedurele geluiden: correct, fout, woord klaar, streak, les klaar, level-up, achievement, boss hit/defeat, ster |
| `engine.js` | ~980 | Game state, save/load, XP/levels, achievements, UI helpers, keyboard rendering, levelkaart, lesflow (4 rondes), typing input, vallende woorden, boss fights, resultaten |

### Ontwerpfilosofie (ADHD-vriendelijk)

- **Geen straf bij fouten**: fouten resetten de combo maar kosten geen punten. Alleen bij 5 fouten achter elkaar faalt de les (anti-spam).
- **Maximale beloning**: XP bij elke letter, combo-multiplier, confetti bij sterren, geluidseffecten, level-ups, achievements
- **Korte sessies**: elke les duurt 2-5 minuten, 4 afwisselende rondes
- **Visuele feedback overal**: toetsenbord highlight, voortgangsbalk, combo-display, boss HP-balk

### Lesstructuur (28 lessen, 6 fases)

| Fase | Lessen | Nieuwe letters | Focus |
|------|--------|---------------|-------|
| 1: Thuisrij | 1-5 | f j d k s l a ; g h | Vingerplaatsing, thuispositie |
| 2: Klinkers | 6-9 | e i o u | Eerste echte woorden! |
| 3: Bovenrij | 10-14 | r t w p q y | Nederlandse woorden, veel combinaties |
| 4: Onderrij | 15-21 | n m b v c , x . z / | Alle letters compleet, komma en punt |
| 5: Hoofdletters | 22-24 | Shift, 0-9, ! ? ' " - | Shift-toets, cijfers, leestekens |
| 6: Snelheid | 25-28 | — | Sprint, zinnen, snelheidstest, eindexamen |

**Belangrijk**: elke les's `allLetters` array bevat ALLEEN de tot dan toe geleerde letters. Alle woorden in `words1`/`words2`/`words3` mogen uitsluitend die letters gebruiken. Bij het toevoegen van woorden altijd controleren tegen `allLetters`!

### 4 Rondes per les

| Ronde | Type | Beschrijving |
|-------|------|-------------|
| 1 — Kennismaking | Statisch | Losse letters typen, nieuwe letter geïntroduceerd |
| 2 — Woordjes | Woordrij | Korte woorden uit een wachtrij, voltooide woorden doorgestreept |
| 3 — Vallende Woorden | Arcade | Woorden vallen naar beneden, typ ze voor ze de onderkant raken |
| 4 — Boss Fight | Timer | Monster met HP-balk, elk correct woord doet damage |

### Boss Fight Systeem

- **Mini-bosses**: na elke les (HP 5-12, timer ~45-180s)
- **Eindbazen**: na les 5, 9, 14, 21, 24, 28 (HP 8-15, timer ~60-180s, `bigBoss: true`)
- **Timer scaling**: `secsPerHP` × `boss.hp` (15s/HP vroeg, 12s/HP laat), max 300s
- **Win**: boss HP → 0 = sterren + XP. Timer op + HP > 0 = 0 sterren, geen XP
- **Boss woorden**: willekeurige mix uit `words2` + `words3`, regenereert als pool op is

### Sterren & Beoordeling

| Sterren | Voorwaarde |
|---------|-----------|
| 0 | Boss niet verslagen / te veel fouten achter elkaar |
| 1 | Les uitgespeeld |
| 2 | Nauwkeurigheid ≥ 90% |
| 3 | Nauwkeurigheid ≥ 95% EN WPM ≥ 15 + lesnummer |

### Anti-spam Systeem

Voorkomt dat kinderen willekeurige toetsen spammen om door de les heen te komen:
- **5 fouten achter elkaar** = les mislukt (0 sterren)
- **2 correcte toetsen** achter elkaar reset de foutenteller
- Variabelen: `consecutiveErrors`, `correctSinceLastError`, `MAX_CONSECUTIVE_ERRORS = 5`, `CORRECT_TO_RESET = 2`

### XP & Level Systeem

- Elke juiste letter: +10 XP × combo-multiplier
- Combo multipliers: x1 (< 10), x2 (10-24), x3 (25-49), x5 (50+)
- Les voltooid: +500 XP (niet bij fail)
- Boss defeated: +500 XP (mini) / +1000 XP (eindbaas)
- Level thresholds: `Math.floor(800 × i^1.3)` voor level i

### Gamification

- **Combo counter**: visueel rechts in beeld, groeit in grootte en kleur (geel → oranje → roze → rood)
- **Dagelijkse streak**: kalender onderaan de kaart, 7/30 dagen milestones
- **32 achievements**: eerste stappen, fase-completie, snelheid, combo, streaks, letter-tellingen, level-milestones
- **Confetti**: bij 2+ sterren, level-up
- **Level-up banner**: compact bovenaan (niet-blokkerend), verdwijnt na 3s
- **Toast notificaties**: achievements, streak milestones, combo milestones

### Vallende Woorden Mechaniek

- Snelheid: `baseSpeed (0.35) + (lessonNum/28 × 0.15)` × `lengthFactor`
- `lengthFactor`: `max(0.4, 1 - (textLength - 5) × 0.04)` — langere woorden vallen langzamer
- Spawn delay: `max(2200ms, gemiddelde woordlengte × 200ms)`
- Gemist woord: telt als 1 error, reset combo
- Actief woord: geel gemarkeerd, getypte deel groen

### On-screen Toetsenbord

- 4 rijen + spatiebalk, Shift-toetsen links/rechts
- Vingerkleur-codering: roze (pink), oranje (ring), groen (middel), blauw (wijs), paars (duim)
- Niet-geleerde toetsen: `opacity: 0.2` (`.inactive` class)
- Huidige toets: geel highlight met glow
- Toets-flash bij typen (`.pressed` class, 150ms)
- Shift highlight bij hoofdletters en shift-tekens

### Levelkaart (Mario-stijl)

- 6 fasegroepen met gekleurde nodes
- Per level: nummer + 0-3 sterren (of `· · ·` als nog niet gespeeld)
- `.not-started`: 50% opacity
- `.current`: geel pulserende glow
- `.completed`: groene achtergrond
- Eindbazen: rode rand + 💀 badge
- Onderaan: streak-panel (7-dagenkalender) + achievements-knop

### Opslag

- localStorage key: `tobygames_typen_save`
- JSON-formaat met: `xp`, `level`, `lessonStars` (object: lesnr → sterren), `achievements` (array van IDs), `dailyDates`, `currentStreak`, `stats` (totalLetters, totalWords, accuracy, fastestWPM, bestCombo, perfectLessons)
- Autosave: elke 30 seconden + bij `beforeunload`

### Audio (Web Audio API)

Alle geluiden procedureel gegenereerd, geen externe bestanden:

| Functie | Beschrijving | Toon |
|---------|-------------|------|
| `sndCorrect()` | Juiste letter | Stijgend met combo (600 + combo×10 Hz) |
| `sndWrong()` | Foute letter | Laag, zacht (200 Hz triangle) |
| `sndWordComplete()` | Woord af | C-E-G arpeggio |
| `sndStreakMilestone()` | 10/25/50/100 combo | Snelle oplopende arpeggio |
| `sndLessonComplete()` | Les voltooid | 5-noot fanfare |
| `sndLevelUp()` | Level omhoog | 7-noot uitgebreide fanfare |
| `sndAchievement()` | Achievement ontgrendeld | 3-noot square wave |
| `sndBossHit()` | Boss geraakt | Sawtooth + sine kort |
| `sndBossDefeat()` | Boss verslagen | 7-noot victorie tune |
| `sndStar()` | Ster verdiend | Hoge C + E |
| `sndBossDrum()` | Boss start | 6-beat drumroll (sawtooth) |

### CSS Animaties

| Naam | Gebruikt voor | Duur |
|------|--------------|------|
| `pulse-glow` | Huidige level-node op kaart | 2s infinite |
| `blink-cursor` | Cursor onder huidige letter | 1s infinite |
| `word-explode` | Vallend woord getypt | 0.4s |
| `boss-shake` | Boss bij hit | 0.15s |
| `toast-in/out` | Toast notificaties | 0.3s in, 0.3s out na 2.2s |
| `confetti-fall` | Confetti deeltjes | 1.5-3.5s |
| `levelup-slide` | Level-up banner | 0.4s |
| `combo-pulse` | x5 combo display | 0.5s infinite |

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

---

## Politiejacht

Stadachtervolging vanuit vogelperspectief. Vlucht voor de politie door een procedureel gegenereerde stad. Rijden kost brandstof; jerrycans (of batterijen in EV-modus) vullen je tank. Tank leeg of gepakt door de politie = game over. Score = resterende brandstof.

### Bestandsstructuur (`politiejacht/`)

| Bestand | Regels | Inhoud |
|---------|--------|--------|
| `style.css` | ~300 | CSS variabelen, glassmorphism overlays, HUD, joystick, responsive |
| `sound.js` | ~160 | Web Audio API: motor (pitch varieert met snelheid), sirene (afstandsafhankelijk), pickup, crash, waarschuwingspiep, countdown |
| `renderer.js` | ~510 | Canvas rendering: stad (wegen, gebouwen, parken), auto's, jerrycans/batterijen, particles, bandensporen, vignette, minimap, brandstofpijl |
| `game.js` | ~830 | Game class, input, physics, politie-AI, spawning, collision, pauze, high scores |

### Wereld

- **Stadsraster**: 14x14 grid van cellen (elk 240px: 80px weg + 160px blok)
- **Totale wereld**: 3360x3360 pixels met scrollende camera (look-ahead)
- **Gebouwen**: gevarieerde kleuren, daken, ramen (verlicht/donker), solide collision
- **Parken**: ~12% van de blokken, doorrijdbaar terrein met bomen (shortcut!)
- **Wegen**: donker asfalt met gele stippellijnen, kruispunten

### Brandstof-/scoresysteem

| Parameter | Waarde |
|-----------|--------|
| Startbrandstof | 60 |
| Verbruik stilstaand | 0.3/s |
| Verbruik bij max snelheid | 3.0/s (proportioneel) |
| Jerrycan/batterij opbrengst | +22 |
| Max op de kaart | 6 tegelijk |
| Spawn-interval | 2-5s (langzamer over tijd) |
| Geen maximum | brandstof kan boven 100 komen |

**Score = resterende brandstof bij game over.** Efficient rijden (korte routes naar jerrycans) levert de hoogste score.

### Speler

- **Besturing**: pijltjestoetsen of WASD, touch-joystick (floating, verschijnt waar je tikt)
- **Snelheid**: max 220 px/s, acceleratie 280, remmen 350, frictie 120
- **Stuurgedrag**: draaien alleen bij snelheid, proportioneel aan snelheid
- **Collision**: cirkel-gebaseerd (radius 14px), slide langs gebouwen
- **Bandensporen**: verschijnen bij snel bochtenwerk

### Politie-AI

- **Weg-navigatie**: detecteert of agent op kruispunt, horizontale weg, verticale weg, of in park is
- **Kruispunt-beslissing**: Manhattan-optimale richting naar speler, met 10% kans op willekeurige omweg
- **Park-gedrag**: directe achtervolging (recht op speler af)
- **Wegcentrering**: automatische correctie naar midden van de weg, even/oneven agenten op verschillende rijstroken
- **Variatie per agent**: `randomBias` beinvloedt routekeuze en snelheid
- **Onderlinge collision**: politieauto's duwen elkaar uit elkaar, langzamere wijkt meer
- **Moeilijkheidsopbouw**:

| Tijd | Max politie | Snelheid |
|------|------------|----------|
| 0s | 1 | 130 px/s |
| 25s | 2 | 140 px/s |
| 50s | 3 | 150 px/s |
| 75s | 4 | 160 px/s |
| max | 6 | 200 px/s |

### Modus-keuze

- **Benzine**: rode auto, rode jerrycans met gele dop, brandstof-icoon
- **Elektrisch (EV)**: groene auto, groene batterijen met bliksemschicht, batterij-icoon
- Toggle op het startscherm, puur visueel/thematisch verschil

### Visuele effecten

- **Vignette**: rood pulsend bij lage brandstof (< 25), blauw flitsend bij politie dichtbij (< 150px)
- **Particles**: uitlaatdampen bij rijden, vonken bij crash, glitter bij pickup
- **Bandensporen**: persistent op het wegdek, langzaam vervagende zwarte markeringen
- **Jerrycan-animatie**: zwevend/bobbend met glow-effect
- **Sirene-gloed**: afwisselend rood/blauw op politieauto's
- **Minimap**: rechtsbovenhoek, toont wegen, speler (rood/groen), politie (blauw), jerrycans (geel/groen), viewport

### Brandstofpijl

Pulserende richtingspijl aan de schermrand die naar de dichtstbijzijnde jerrycan/batterij wijst:
- Verschijnt alleen als de jerrycan buiten beeld is
- Kleur past bij modus (geel/groen)
- Toont afstand in meters

### Geluid (Web Audio API)

| Geluid | Beschrijving |
|--------|-------------|
| Motor | Sawtooth oscillator, frequentie 40-120 Hz op basis van snelheid |
| Sirene | Twee sinusgolven (600/800 Hz) die alterneren, volume op basis van afstand |
| Pickup | Stijgende drietoon (600-900-1200 Hz) |
| Crash | Noise burst (0.3s) |
| Waarschuwing | Pieptoon elke 600ms bij brandstof < 20 |
| Countdown | Sinus 440 Hz, "GO!" = 880 Hz |

### Overig

- **Pauze**: spatiebalk, Escape, of P. Overlay met hervat-knop.
- **High scores**: top 10 in localStorage (`politiejacht_scores`), toont score, tijd, verzamelde items, modus, datum
- **Responsive**: canvas vult volledig scherm, devicePixelRatio-ondersteuning
- **Oude versie**: `politie.html` is nog aanwezig maar niet meer gelinkt vanuit index

---

## Emojis

- Apple-emojis lokaal gehost in `emoji/` (~3800 PNG bestanden), hoge resolutie dieren in `emoji-hires/`
- Bron: `emoji-datasource-apple@16.0.0` (npm)
- Twemoji-library (CDN) als parser: vervangt emoji-tekens door `<img>` tags
- `parseAppleEmoji(element)` in `state.js` roept `twemoji.parse()` aan met custom callback naar lokale `/emoji/`-map
- **FE0F-fallback**: sommige emoji-codepoints worden door twemoji zonder variation selector (FE0F) opgevraagd, maar de PNG-bestanden bestaan alleen met `-fe0f` suffix. Een globale `error`-handler op `<img class="emoji">` probeert automatisch het pad met `-fe0f.png` als fallback.
- Geen runtime-afhankelijkheid van externe CDN voor afbeeldingen

## Conventies

- **Taal**: alle UI-tekst is Nederlands
- **Opslag**: localStorage, INI-formaat voor Dierenklikker, JSON waar simpeler
- **Geluid**: Web Audio API synthesized (geen audiobestanden nodig)
- **Thema's**: CSS custom properties (`:root` variabelen), runtime verwisseld via JavaScript
- **Emoji rendering**: `parseAppleEmoji(element)` vervangt native emoji door Apple PNG via twemoji
