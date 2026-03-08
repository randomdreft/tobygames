# TobyGames 🎮

**Gratis browsergames voor kinderen — zonder reclame, zonder tracking, voor altijd.**

[tobygames.nl](https://tobygames.nl)

Een verzameling zelfgemaakte HTML5-games. De meeste spellen zijn een enkel HTML-bestand. De grotere spellen (Dierenklikker, TobyTypen) zijn opgesplitst in meerdere bestanden. Open het bestand, speel het spel. Zo simpel is het.

## De Games

### 🐾 Dierenklikker
*Idle clicker met dieren, mini-games en een evolutiesysteem*

Klik op dieren, verdien punten, koop nieuwe diersoorten en ontgrendel upgrades. Met 12 diersoorten (van mier tot draak), 12 mini-games, een buff-systeem, een prestige-mechanisme, unlockbare kleurthema's en geluidseffecten. Het grootste en meest uitgebreide spel op de site.

**[Speel Dierenklikker](https://tobygames.nl/dierenklikker.html)**

---

### ⌨️ TobyTypen
*ADHD-vriendelijke typecursus met 28 lessen*

Gamified typecursus met progressieve letterintroductie, falling-word arcade-mechanics, boss fights en een XP/level-systeem. Ontworpen voor kinderen (6-10 jaar) met korte aandachtsspanne.

**[Speel TobyTypen](https://tobygames.nl/typen/index.html)**

---

### 👃 Neuswormen
*Trek wormpjes uit een neus met je pincet*

Gebruik je pincet om kronkelende wormpjes uit een gigantische neus te trekken en in de emmer te gooien. Elke worm heeft zijn eigen persoonlijkheid en kronkelt flink tegen. Hoe meer je vangt, hoe hoger je score.

**[Speel Neuswormen](https://tobygames.nl/worms.html)**

---

### 🛒 Winkeltje
*Run je eigen winkel en help klanten*

Top-down winkelmanagement game. Loop door je winkel, pak de juiste artikelen en breng ze naar de kassa voordat klanten ongeduldig vertrekken. Draag tot 3 items tegelijk en probeer zo veel mogelijk geld te verdienen.

**[Speel Winkeltje](https://tobygames.nl/winkeltje.html)**

---

### ⭕❌ Boter Kaas en Eieren XL
*De klassieker, maar dan op een 5x5 bord*

Vier op een rij op een groter bord. Speel tegen een vriend of tegen een AI-tegenstander. Met scorebord en confetti bij winst.

**[Speel BKE XL](https://tobygames.nl/boter-kaas-eieren-xl.html)**

---

### 🐍 Snake
*De onverwoestbare klassieker*

Bestuur je slang, eet appels, word langer. Met aanpasbare kleuren, snelheidsinstellingen, touch controls voor mobiel en high score tracking.

**[Speel Snake](https://tobygames.nl/snake.html)**

---

### 🚔 Politiejacht
*Ontsnap aan de politie!*

Stadachtervolging vanuit vogelperspectief. Vlucht voor de politie door een procedureel gegenereerde stad, verzamel brandstof (of batterijen in EV-modus) en probeer zo lang mogelijk te overleven.

**[Speel Politiejacht](https://tobygames.nl/politiejacht.html)**

## Technisch

- **Nul externe dependencies** — puur HTML5 + CSS3 + JavaScript
- **Nul build tools** — geen npm, geen webpack, geen node_modules
- **Nul tracking** — geen analytics, geen cookies, geen ads
- **Mobile-friendly** — touch controls waar nodig
- **Apple emojis** — Dierenklikker gebruikt lokaal gehoste Apple-emojis (`emoji/` + `emoji-hires/`) voor consistente weergave op alle platforms. Twemoji-library als parser (CDN), met automatische FE0F-fallback.
- **Offline** — download de bestanden, speel zonder internet

## Projectstructuur

```
tobygames/
├── index.html              # Landing page / game portal
├── dierenklikker.html      # Dierenklikker (HTML shell)
├── dierenklikker/           # Dierenklikker modules
│   ├── style.css           # Alle CSS + kleurthema variabelen
│   ├── sound.js            # Web Audio geluidseffecten
│   ├── data.js             # Constanten, dieren, quiz/minigame data
│   ├── state.js            # Game state, save/load (INI-formaat)
│   ├── engine.js           # Berekeningen, achievements, klik/koop
│   ├── minigames.js        # Alle 12 mini-games
│   └── ui.js               # Prestige, UI rendering, thema's, init
├── typen/                   # TobyTypen typecursus
│   ├── index.html          # HTML shell
│   ├── style.css           # CSS
│   ├── audio.js            # Geluidseffecten
│   ├── engine.js           # Game engine
│   └── lessons.js          # 28 lessen met woordlijsten
├── server.js               # Node.js API server (heartbeat, leaderboard)
├── Dockerfile              # Container build configuratie
├── snake.html              # Snake (single file)
├── worms.html              # Neuswormen (single file)
├── winkeltje.html          # Winkeltje (single file)
├── boter-kaas-eieren-xl.html # BKE XL (single file)
├── politiejacht.html       # Politiejacht (HTML shell)
├── politiejacht/            # Politiejacht modules
│   ├── style.css           # CSS
│   ├── sound.js            # Web Audio geluidseffecten
│   ├── renderer.js         # Canvas rendering
│   └── game.js             # Game engine en AI
├── emoji/                  # Apple emoji PNGs (lokaal gehost)
├── GAMES.md                # Gedetailleerde technische docs per spel
└── README.md               # Dit bestand
```

## Zelf draaien

```bash
# Optie 1: gewoon openen
open index.html

# Optie 2: lokale server (nodig voor multi-file spellen)
python3 -m http.server 8000
```

## Bijdragen

Idee voor een spel? Bug gevonden? Open een [issue](https://github.com/randomdreft/tobygames/issues)!

## Licentie

Open source — vrij te gebruiken, te spelen en aan te passen.
