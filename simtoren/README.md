# SimToren 2

Torenbouwspel voor TobyGames.nl. Volledig herbouwd op 13 november 2026 (de eerste versie staat in git-historie).

- `../simtoren.html` — pagina met HUD, balken en overlay.
- `game.js` — het hele spel, één bestand zonder afhankelijkheden. Bovenaan staat de indeling.
- `style.css` — opmaak.

## Hoe het werkt

- **Raster:** 40 vakjes breed, verdieping -2 t/m 30. Bouwen kan alleen op de grond of bovenop iets (`G.slabs`).
- **Routes:** elk aaneengesloten stuk vloer is een knoop; trappen en liften zijn de verbindingen (`rebuild`, `distTo`, `nextLeg`).
- **Mensen:** echte poppetjes met een dagplanning (`dayPlan`). Ze betalen bij aankomst; lang wachten = minder geld en lagere tevredenheid.
- **Liften:** schachten ontstaan uit aaneengesloten liftstukken en hebben 1 tot 4 cabines (`updShaft`, `assign`). Het aantal staat als `cars` op het onderste liftstuk.
- **Lagen:** trappen en liften (`tgrid`) mogen over kamers (`grid`) heen staan.
- **Voortgang:** sterren via inwoners (`STAR_POP`), bouwhoogte via `MAXF`, opdrachten in `MISSIONS`.
- **Opslaan:** `localStorage`, sleutel `simtoren2_save`.

- **Bezoekers:** per soort (winkel, restaurant, bioscoop) één stroom voor de hele toren die zich over de zaken verdeelt (`demand`, `CAP`, `spawnVisitors`).

## Afstellen

Prijzen, inkomsten en liftsnelheden staan in de tabel `T` bovenaan `game.js`.

## Testen

In de browserconsole: `SimToren.ff(720)` spoelt één speldag door; `SimToren.G` is de spelstand.
Verhoog bij elke wijziging `?v=` in `simtoren.html`.
