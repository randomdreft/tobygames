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

## Gepland (volgende sessies)

### C1 - Hemel als speelbare wereld
- Dierenhemel is nu een visueel scherm (wolken, animaties, gepensioneerde dieren)
- Nog te bouwen:
  - Exclusieve hemel-minigame (bijv. "Engelen-vangst" in de wolken)
  - Gepensioneerde dieren bezoeken voor bonus
  - Interactie met dieren (niet alleen bekijken)

### C2 - Dierentuin / Boerderij layout
- Eigen tab in middenpaneel
- Visueel grid met stalletjes/verblijven per diersoort
- Verblijven upgraden (cosmetisch + kleine DPS-bonus)
- Vervangt uiteindelijk Dierenhemel als los scherm
- De hemel IS je dierentuin in de wolken

## Geparkeerd

### B4 - Gouden/zeldzame dieren
- ~1% kans dat gekocht dier "gouden" is (2x DPS)
- Visuele feedback in shop
- Endgame jacht-doel
- Status: nog niet concreet genoeg, later uitwerken
