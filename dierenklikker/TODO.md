# Dierenklikker - Ideeën & Toekomstige Features

## Server architectuur

De game draait op een Node.js server in Docker (zie `/Dockerfile` en `/server.js`).

- **Container**: `tobygames` via `/opt/static-sites/docker-compose.yml`
- **Poort**: 3000 (intern), bereikbaar via nginx-proxy-manager
- **Statische bestanden**: `/var/www/tobygames` gemount als `/static` (read-only)
- **Rebuild**: `cd /opt/static-sites && sudo docker compose up -d --build tobygames`

### API endpoints
| Endpoint | Methode | Beschrijving |
|---|---|---|
| `/api/heartbeat?sid=xxx` | GET | Actieve spelers tellen. Retourneert `{ online, sid }`. Client pollt elke 30s. Sessies verlopen na 90s. |
| `/api/leaderboard` | POST | Score submitten met gamestate payload (pid, zooName, score, animals, etc). Anti-cheat trust score wordt berekend. |
| `/api/leaderboard?pid=X&trusted=0\|1` | GET | Top 10 + eigen ranking. `trusted=1` filtert op trust >= 60. |

## Afgerond

### B1 - Dagelijkse uitdagingen / missies ✅
- Compact kaartje links onder het klikbare dier, 3 missies per dag
- Diverse uitdagingen: klikken, minigames spelen, dieren vangen, etc.
- Beloning: 10 min DPS per missie, 30 min DPS bonus bij alle 3
- Streak-systeem met achievements (3, 7 en 30 dagen op rij)
- Inklapbaar op mobiel

### B2 - Sterrenshop (permanente perks) ✅
- Extra tab in middenpaneel, zichtbaar na eerste evolutie
- 5 categorieën: Snelheid, Geluk, Buffs, Evolutie, Synergieën
- Sterren worden uitgegeven (niet passief behouden)
- Perks blijven behouden na prestige

### B3 - Dier-synergieën (via sterrenshop) ✅
- Koop synergie-pakketten in de sterrenshop
- "Kruipertjes" (mier+slak+kikker = +15% DPS)
- "Boerderij" (kip+hond+lama = +15% DPS)
- "Safari" (paard+panda+olifant = +20% DPS)
- "Mythisch verbond" (walvis+draak = +25% DPS)
- "Dierenrijk" (alle dieren = +10% DPS, vereist alle 4 synergieën)

### C3a - Dierentuin naam ✅
- Spelers geven hun dierentuin een naam (linker paneel, boven punten)
- Inline edit met ✏️ knop, validatie: letters/cijfers/emoji, 2-20 tekens
- Weergave: "Randal's Dierentuin" / "Thomas' Dierentuin"
- Naam blijft behouden na prestige
- Opgeslagen in savegame als `dierentuin_naam`
- Vereiste voor leaderboard

### C3b - Multiplayer scorebord ✅
- Tab "Scorebord" in middenpaneel met top 10 + eigen positie
- Vertrouwensindicator per score (🟢/🟠/🔴)
- Filter: "toon alleen betrouwbare scores" (trust >= 60)
- `POST /api/leaderboard` — submit score met gamestate payload
- `GET /api/leaderboard?pid=X&trusted=0|1` — top 10 + eigen ranking
- Spelers geïdentificeerd via persistent `pid` in localStorage (uniek, onafhankelijk van naam)
- Auto-submit bij prestige en elke 5 minuten
- Server-side anti-cheat: speeltijd/score ratio, kliksnelheid (max 15/s), progressielogica, scorecontroles
- Opslag: JSON-bestand in Docker named volume (`tobygames-data:/data`)

### C1+C2 - Wolkendierentuin ✅
- C1 (Hemel als speelbare wereld) en C2 (Dierentuin layout) gecombineerd
- Dierenhemel omgebouwd tot interactieve Wolkendierentuin
- Alle 12 geëvolueerde dieren wonen in verblijven in de wolken
- **Verblijven upgraden** (4 niveaus: Wolkenweitje → Wolkenverblijf → Wolkenpaleis → Gouden Paleis)
  - Hogere niveaus verlagen geluk-verval (10%/6%/3%/1% per uur)
  - Upgrades kosten sterren (0/1/2/4)
- **Aaien & voeren**: geeft geluk (+10% / +25%), met cooldowns (5s / 15s)
- **Sterren verdienen**: blije dieren produceren sterren op basis van geluksniveau
  - 90%+ → elke 20 min, 60%+ → elke 40 min, 30%+ → elke 60 min
  - Max 3 sterren per verblijf, sterren verdwijnen na 30s als je ze niet oogst
- **Twee toegangsmodi**: via prestige (evolutie) of via knop op evolutie-tab
- Aarde-gameloop pauzeert terwijl je in de zoo bent
- Tooltips op alle knoppen en interactieve elementen
- Zoo-status opgeslagen in savegame (`[wolkendierentuin]` sectie in INI-formaat)

## Geparkeerd

### B4 - Gouden/zeldzame dieren
- ~1% kans dat gekocht dier "gouden" is (2x DPS)
- Visuele feedback in shop
- Endgame jacht-doel
- Status: nog niet concreet genoeg, later uitwerken
