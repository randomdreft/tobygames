# SimToren 2

Torenbouwspel voor TobyGames.nl. Volledig herbouwd op 13 november 2026 (de eerste versie staat in git-historie). Op 18 november 2026 uitgebreid met Toby's wensen: breder, hoger en dieper bouwen, grond kopen, zoomen met scroll, minikaart, helikopterplatform en vliegveld op het dak, en nieuwe gebouwen tot 7 sterren.

- `../simtoren.html` — pagina met HUD, balken en overlay.
- `game.js` — het hele spel, één bestand zonder afhankelijkheden. Bovenaan staat de indeling.
- `style.css` — opmaak.

## Hoe het werkt

- **Raster:** 120 vakjes breed, kelder 12 t/m verdieping 60. Bouwen kan alleen op de grond of bovenop iets (`G.slabs`).
- **Grond kopen:** de wereld is verdeeld in kavels van 10 vakjes (`PW`). Je begint met kavel 4 t/m 7 (`G.lo`, `G.hi`) en koopt er links of rechts bij (`buyLand`, prijs `landCost`). Mensen komen binnen aan de randen van je eigen terrein (`XL`, `XR`).
- **Hoogte en diepte per ster:** `MAXF` en `MINF`; zeven sterren (`STAR_POP`).
- **Dak-dingen** (`roof`): zonnepanelen, helikopterplatform, dakachtbaan, vliegveld. Er kan niets meer bovenop. `minF` = laagste verdieping.
- **Landingen:** helikopters om de twee uur, vliegtuigen elk uur (`r.land`, `LAND_T`, `drawFlyer`).
- **Camera:** scrollwiel zoomt, WASD/pijltjes/muis aan de rand/rechtermuisknop schuiven, minikaart rechtsonder (`drawMini`).
- **Oude spelstanden** (v2, 40 breed) schuiven bij laden 40 vakjes op naar het midden.
- **Routes:** elk aaneengesloten stuk vloer is een knoop; trappen en liften zijn de verbindingen (`rebuild`, `distTo`, `nextLeg`).
- **Mensen:** echte poppetjes met een dagplanning (`dayPlan`). Ze betalen bij aankomst; lang wachten = minder geld en lagere tevredenheid.
- **Liften:** schachten ontstaan uit aaneengesloten liftstukken en hebben 1 tot 4 cabines (`updShaft`, `assign`). Het aantal staat als `cars` op het onderste liftstuk.
- **Lagen:** trappen en liften (`tgrid`) mogen over kamers (`grid`) heen staan.
- **Voortgang:** sterren via inwoners (`STAR_POP`), bouwhoogte via `MAXF`, opdrachten in `MISSIONS`.
- **Opslaan:** `localStorage`, sleutel `simtoren2_save`.

- **Bezoekers:** per soort (winkel, restaurant, bioscoop) één stroom voor de hele toren die zich over de zaken verdeelt (`demand`, `CAP`, `spawnVisitors`).

- **Kelder:** verdieping -1 t/m -6. Parkeergarage en metro kunnen alleen daar; kantoor, appartement en hotel alleen boven de grond (`under`, `above`).
- **Parkeren en metro:** `assignPark` geeft vaste gebruikers een plek (+25% inkomsten); `gate` bepaalt waar iemand in en uit gaat.
- **Schoonmaak:** hotelkamers worden `dirty` bij vertrek; schoonmakers (`cleanerIdle`) maken ze schoon.
- **Onderhoud:** elke cabine kost per dag `upkeep` (`newDay`).
- **Opdrachten:** hebben een `id`; `G.done` onthoudt welke gehaald zijn.

## Afstellen

Prijzen, inkomsten en liftsnelheden staan in de tabel `T` bovenaan `game.js`.

## Testen

In de browserconsole: `SimToren.ff(720)` spoelt één speldag door; `SimToren.G` is de spelstand.
Verhoog bij elke wijziging `?v=` in `simtoren.html`.

## Wensen van Toby (18 november 2026)

Ingesproken via Randal. ✅ = gebouwd op 18 november 2026.

- ✅ Meer plek om te bouwen, breder.
- ✅ Met de muis rondgaan waar je wilt bouwen; in- en uitzoomen met scroll.
- ✅ Grond kost geld en wordt dan jouw territorium.
- ✅ Hoger en dieper bouwen, en al met meer verdiepingen beginnen (12 omhoog, 6 kelders).
- ✅ Minikaart.
- ✅ Helikopterplatform op het dak, en een vliegveld bovenop de toren.
- ✅ Nieuwe dingen om later vrij te spelen: zonnepanelen, sportschool, zwembad, kluis, aquarium, dakachtbaan, vliegveld (ster 6 en 7).

Nog niet gebouwd, ideeën voor later: brand of stroomstoring als gebeurtenis, VIP-bezoek dat een ster-beoordeling geeft, seizoenen (kerst, Koningsdag), een trein of zeppelin.
