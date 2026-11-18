/* SimToren 2 — torenbouwspel voor TobyGames.nl
 * Eén bestand, geen afhankelijkheden. Indeling:
 *   1. Instellingen en kamertypes     5. Liften
 *   2. Spelstand, opslaan              6. Tekenen
 *   3. Bouwen en slopen                7. Bediening en schermen
 *   4. Mensen en routes                8. Spellus
 */
(() => {
'use strict';

// ───────────────────────── 1. Instellingen ─────────────────────────
// De wereld is W vakjes breed, verdeeld in kavels van PW vakjes. Je begint met kavels START_LO t/m START_HI
// en koopt de rest erbij (G.lo, G.hi).
const U = 16, FH = 36, W = 120, PW = 10, FMIN = -12, TOP = 60, START_LO = 4, START_HI = 7;
const MAXF = [12, 20, 30, 40, 50, 60, 60];                // bouwhoogte per ster
const MINF = [-6, -6, -8, -10, -12, -12, -12];           // kelderdiepte per ster
const STAR_POP = [0, 40, 120, 250, 450, 800, 1300];      // inwoners nodig per ster
const MAX_STARS = STAR_POP.length;
const MIN_PER_SEC = 2;                     // spelminuten per seconde op snelheid 1
const SPEEDS = [0, 1, 3, 8];
const SAVE_KEY = 'simtoren2_save';
const START_MONEY = 150000;

const T = {
  lobby:      { name: 'Lobby', w: 8, cost: 0, star: 1, pop: 0, desc: 'De ingang van je toren.' },
  office:     { name: 'Kantoor', w: 6, above: true, cost: 12000, star: 1, pop: 4, pay: 1800,
                desc: '4 werknemers. Betalen als ze ’s ochtends aankomen.' },
  apartment:  { name: 'Appartement', w: 4, above: true, cost: 10000, star: 1, pop: 3, pay: 1500,
                desc: '3 bewoners. Betalen als ze thuiskomen.' },
  shop:       { name: 'Winkel', w: 4, cost: 15000, star: 1, pop: 2, pay: 250, open: [9, 20],
                desc: 'Klanten verdelen zich over al je winkels. Meer inwoners = meer klanten.' },
  stairs:     { name: 'Trap', w: 2, cost: 1500, star: 1, pop: 0, transport: true,
                desc: 'Naar één verdieping hoger. Zet ze boven elkaar: sportieve mensen lopen zo een paar verdiepingen.' },
  lift:       { name: 'Lift', w: 2, cost: 2500, shaft: 5000, star: 1, pop: 0, transport: true, lift: true, speed: 4.5, cap: 8, upkeep: 400,
                desc: 'Sleep omhoog om hem langer te maken. Klik erop voor extra cabines.' },
  restaurant: { name: 'Restaurant', w: 8, cost: 40000, star: 2, pop: 4, pay: 300, open: [11, 22],
                desc: 'Druk met lunch en avondeten. Gasten verdelen zich over je restaurants.' },
  hotel:      { name: 'Hotelkamer', w: 3, above: true, cost: 14000, star: 3, pop: 2, pay: 4500,
                desc: 'Gasten komen ’s avonds en betalen per nacht.' },
  xlift:      { name: 'Snellift', w: 2, cost: 5000, shaft: 15000, star: 3, pop: 0, transport: true, lift: true, speed: 10, cap: 16, upkeep: 1200,
                desc: 'Ruim twee keer zo snel en twee keer zo groot.' },
  cinema:     { name: 'Bioscoop', w: 12, cost: 120000, star: 4, pop: 6, pay: 200, open: [13, 22],
                desc: 'Films om 14, 17 en 20 uur. Heel veel bezoekers tegelijk! Eén bioscoop is vaak genoeg.' },
  vend:       { name: 'Automaat', w: 1, cost: 2000, star: 1, pop: 0, util: true, hourly: 50,
                desc: 'Past in elk gaatje. Levert elk uur overdag een beetje op.' },
  garage:     { name: 'Parkeergarage', w: 8, cost: 30000, star: 2, pop: 0, util: true, under: true, spots: 12,
                desc: 'Alleen onder de grond. 12 mensen komen met de auto en betalen 25% meer.' },
  clean:      { name: 'Schoonmaak', w: 4, cost: 20000, star: 3, pop: 3,
                desc: '3 schoonmakers maken hotelkamers schoon. Een vieze kamer krijgt geen gasten.' },
  metro:      { name: 'Metrostation', w: 14, cost: 500000, star: 4, pop: 0, util: true, under: true, max: 1,
                desc: 'Alleen onder de grond. Brengt de helft meer bezoekers naar je winkels en restaurants.' },
  deck:       { name: 'Uitkijkpunt', w: 10, cost: 400000, star: 5, pop: 0, pay: 100, open: [10, 20], minF: 30,
                desc: 'Vanaf verdieping 30. Het hoogste uitzicht van Nederland!' },
  // ── later vrij te spelen. roof = alleen bovenop het dak, er kan niets meer boven. ──
  solar:      { name: 'Zonnepanelen', w: 4, cost: 8000, star: 2, pop: 0, util: true, roof: true, hourly: 120,
                desc: 'Op het dak. Levert elk uur overdag stroomgeld op.' },
  gym:        { name: 'Sportschool', w: 6, cost: 25000, star: 2, pop: 2, pay: 150, open: [7, 22],
                desc: 'Bewoners en werknemers komen sporten. Wie sport, loopt makkelijker trappen.' },
  pool:       { name: 'Zwembad', w: 10, cost: 80000, star: 3, pop: 3, pay: 250, open: [8, 21],
                desc: 'Spetteren! Trekt veel bezoekers, vooral als je toren groot is.' },
  heli:       { name: 'Helikopterplatform', w: 8, cost: 150000, star: 3, pop: 0, util: true, roof: true, minF: 10,
                desc: 'Op het dak, vanaf verdieping 10. Om de twee uur landt er een helikopter met een rijke gast.' },
  vault:      { name: 'Kluis', w: 6, cost: 250000, star: 4, pop: 0, util: true, under: true, max: 1,
                desc: 'Diep onder de grond. Elke nacht krijg je 2% rente over je geld (hoogstens €30.000).' },
  aquarium:   { name: 'Aquarium', w: 12, cost: 300000, star: 5, pop: 4, pay: 400, under: true, open: [10, 20],
                desc: 'Onder de grond. Haaien, vissen en heel veel bezoekers.' },
  coaster:    { name: 'Dakachtbaan', w: 16, cost: 1500000, star: 6, pop: 6, pay: 600, roof: true, minF: 20, open: [10, 22],
                desc: 'Een achtbaan bovenop je toren, vanaf verdieping 20. Gillen!' },
  airport:    { name: 'Vliegveld', w: 30, cost: 5000000, star: 7, pop: 0, roof: true, util: true, minF: 40, max: 1,
                desc: 'Een landingsbaan op het dak, vanaf verdieping 40! Elk uur landt er een vliegtuig. Ook komen er meer bezoekers.' },
};
const TOOLS = ['office', 'apartment', 'shop', 'stairs', 'lift', 'vend', 'restaurant', 'garage', 'hotel', 'clean', 'xlift', 'cinema', 'metro', 'deck',
               'solar', 'gym', 'pool', 'heli', 'vault', 'aquarium', 'coaster', 'airport'];
const LAND_BASE = 40000, LAND_GROW = 1.7;   // eerste kavel kost €40.000, elke volgende 1,7 keer zoveel

// Opdrachten hebben een vaste naam (id); G.done onthoudt welke gehaald zijn. Zo kunnen er later
// opdrachten tussen gezet worden zonder dat oude spelstanden in de war raken.
const MISSIONS = [
  { id: 'office', t: 'Bouw 2 kantoren', h: 'Kies Kantoor in de balk onderaan en klik naast de lobby.', tool: 'office', n: () => cnt('office'), g: 2, r: 5000 },
  { id: 'stairs', t: 'Bouw een trap', h: 'Zet een trap op de begane grond. Dan kunnen mensen naar verdieping 1.', tool: 'stairs', n: () => cnt('stairs'), g: 1, r: 3000 },
  { id: 'apartment', t: 'Bouw 3 appartementen op verdieping 1', h: 'Bouwen kan alleen bovenop iets anders. Sleep om er meer naast elkaar te zetten.', tool: 'apartment', n: () => cnt('apartment'), g: 3, r: 8000 },
  { id: 'lift', t: 'Bouw een lift van 4 verdiepingen', h: 'Kies Lift, klik op de begane grond en sleep omhoog.', tool: 'lift', n: () => maxShaft(), g: 4, r: 10000 },
  { id: 'shop', t: 'Bouw een winkel', h: 'Op de begane grond komen de meeste klanten. Te veel winkels heeft geen zin: ze delen de klanten.', tool: 'shop', n: () => cnt('shop'), g: 1, r: 5000 },
  { id: 'pop40', t: 'Haal 40 inwoners', h: 'Bouw meer kantoren en appartementen. Je krijgt dan je 2e ster.', n: () => pop, g: 40, r: 20000 },
  { id: 'restaurant', t: 'Bouw een restaurant', h: 'Werknemers en bewoners komen er eten.', tool: 'restaurant', n: () => cnt('restaurant'), g: 1, r: 15000 },
  { id: 'land', t: 'Koop een stuk grond erbij', h: 'Kies Grond kopen onderaan en klik naast je bouwterrein. Dan kun je breder bouwen.', tool: 'land', n: () => G.bought || 0, g: 1, r: 10000 },
  { id: 'solar', t: 'Leg zonnepanelen op een dak', h: 'Zonnepanelen kunnen alleen bovenop. Er kan daarna niets meer boven.', tool: 'solar', n: () => cnt('solar'), g: 1, r: 5000 },
  { id: 'garage', t: 'Bouw een parkeergarage in de kelder', h: 'Scroll omlaag en bouw onder de grond. Zet er een lift of trap naartoe.', tool: 'garage', n: () => G.rooms.some(r => r.type === 'garage' && ok(r)) ? 1 : 0, g: 1, r: 20000 },
  { id: 'mood85', t: 'Maak iedereen blij: 85% tevreden', h: 'Rode poppetjes wachten te lang. Klik op een lift en koop een extra cabine.', n: () => mood, g: 85, r: 20000 },
  { id: 'pop120', t: 'Haal 120 inwoners', h: 'Je mag nu tot verdieping 14 bouwen.', n: () => pop, g: 120, r: 40000 },
  { id: 'hotel', t: 'Bouw 5 hotelkamers', h: 'Hotelgasten betalen goed.', tool: 'hotel', n: () => cnt('hotel'), g: 5, r: 30000 },
  { id: 'clean', t: 'Bouw een schoonmaakdienst', h: 'Na elke gast is een hotelkamer vies. Schoonmakers lossen dat op.', tool: 'clean', n: () => cnt('clean'), g: 1, r: 20000 },
  { id: 'heli', t: 'Bouw een helikopterplatform op het dak', h: 'Vanaf verdieping 10, helemaal bovenop. Zet er een lift naartoe!', tool: 'heli', n: () => G.rooms.some(r => r.type === 'heli' && ok(r)) ? 1 : 0, g: 1, r: 40000 },
  { id: 'gym', t: 'Bouw een sportschool', h: 'Wie gesport heeft, neemt vaker de trap.', tool: 'gym', n: () => cnt('gym'), g: 1, r: 15000 },
  { id: 'xlift', t: 'Bouw een snellift van 10 verdiepingen', h: 'Een snellift is ideaal voor hoge torens.', tool: 'xlift', n: () => maxShaft('xlift'), g: 10, r: 40000 },
  { id: 'pop250', t: 'Haal 250 inwoners', h: 'Hoger en hoger! Vergeet de liften niet.', n: () => pop, g: 250, r: 80000 },
  { id: 'cinema', t: 'Bouw een bioscoop', h: 'Let op: er komen veel mensen tegelijk.', tool: 'cinema', n: () => cnt('cinema'), g: 1, r: 50000 },
  { id: 'metro', t: 'Bouw een metrostation', h: 'Diep onder de grond. Bezoekers komen dan ook met de metro.', tool: 'metro', n: () => cnt('metro'), g: 1, r: 100000 },
  { id: 'pop450', t: 'Haal 450 inwoners', h: 'Nog één ster te gaan.', n: () => pop, g: 450, r: 150000 },
  { id: 'deck', t: 'Bouw het Uitkijkpunt op verdieping 30', h: 'Het hoogste punt van Nederland! Hoger mag ook.', tool: 'deck', n: () => cnt('deck'), g: 1, r: 0 },
  { id: 'deep', t: 'Graaf tot in kelder 4', h: 'Wie weet wat je daar beneden vindt...', n: () => -Math.min(0, ...G.rooms.map(r => r.f)), g: 4, r: 50000 },
  { id: 'rich', t: 'Verdien €400.000 op één dag', h: 'Een goede mix van kamers, een metro en parkeerplekken helpen.', n: () => G.best || 0, g: 400000, r: 250000, euro: true },
  // ── verder spelen na het uitkijkpunt ──
  { id: 'land3', t: 'Maak je bouwterrein 3 stukken breder', h: 'Koop grond links en rechts van je toren.', tool: 'land', n: () => G.bought || 0, g: 3, r: 100000 },
  { id: 'pool', t: 'Bouw een zwembad', h: 'Een zwembad trekt veel bezoekers.', tool: 'pool', n: () => cnt('pool'), g: 1, r: 50000 },
  { id: 'vault', t: 'Bouw een kluis in de kelder', h: 'Elke nacht krijg je rente. Hoe meer geld, hoe meer rente.', tool: 'vault', n: () => G.rooms.some(r => r.type === 'vault' && ok(r)) ? 1 : 0, g: 1, r: 50000 },
  { id: 'aquarium', t: 'Bouw een aquarium onder de grond', h: 'Haaien in de kelder!', tool: 'aquarium', n: () => cnt('aquarium'), g: 1, r: 100000 },
  { id: 'pop800', t: 'Haal 800 inwoners', h: 'Dan krijg je je 6e ster en mag je tot verdieping 50.', n: () => pop, g: 800, r: 300000 },
  { id: 'coaster', t: 'Bouw een dakachtbaan', h: 'Vanaf verdieping 20, helemaal bovenop.', tool: 'coaster', n: () => cnt('coaster'), g: 1, r: 300000 },
  { id: 'deep10', t: 'Graaf tot in kelder 10', h: 'Ze zeggen dat er heel diep iets ouds begraven ligt...', n: () => -Math.min(0, ...G.rooms.map(r => r.f)), g: 10, r: 200000 },
  { id: 'pop1300', t: 'Haal 1300 inwoners', h: 'De 7e ster: dan mag je tot verdieping 60 en komt het vliegveld vrij.', n: () => pop, g: 1300, r: 1000000 },
  { id: 'airport', t: 'Bouw een vliegveld bovenop je toren', h: 'Vanaf verdieping 40. Je hebt flink wat breedte nodig!', tool: 'airport', n: () => cnt('airport'), g: 1, r: 0 },
  { id: 'rich2', t: 'Verdien €2.000.000 op één dag', h: 'De grootste toren van de wereld!', n: () => G.best || 0, g: 2000000, r: 0, euro: true },
];
const OLD_MISSIONS = ['office', 'stairs', 'apartment', 'lift', 'shop', 'pop40', 'restaurant', 'mood85', 'pop120', 'hotel', 'xlift', 'pop250', 'cinema', 'pop450', 'deck'];

const $ = id => document.getElementById(id);
const euro = n => '€' + Math.round(n).toLocaleString('nl-NL');
const key = (f, x) => f + ',' + x;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = Math.random;
const floorName = f => f === 0 ? 'begane grond' : f > 0 ? 'verdieping ' + f : 'kelder ' + (-f);
const stars = n => '⭐'.repeat(n);

// ───────────────────────── 2. Spelstand ─────────────────────────
let G = null;                    // wat wordt opgeslagen
// grid = kamers, tgrid = trappen en liften. Die laatste mogen over kamers heen staan.
let grid = new Map(), tgrid = new Map(), byId = new Map(), segs = new Map(), adj = [];
let shafts = [], reach = new Set(), distCache = new Map();
let people = [], floats = [];
let pop = 0, mood = 100, active = 0;
let tool = 'select', hover = null, selected = null, stroke = null, undo = [];
let speedIdx = 1, muted = false, running = false, lastWarn = -1e9;
const cam = { x: W * U / 2, y: -3 * FH, z: 1 };
// eigen bouwterrein in vakjes, en waar de straat begint en eindigt
const lx = () => G.lo * PW, rx = () => (G.hi + 1) * PW;
const XL = () => lx() - 6, XR = () => rx() + 6, XMID = () => (lx() + rx()) / 2;
const landCost = () => Math.round(LAND_BASE * Math.pow(LAND_GROW, G.bought || 0) / 1000) * 1000;
const plotOf = x => Math.floor(x / PW);

function newGame() {
  G = { v: 3, money: START_MONEY, day: 1, min: 7 * 60, stars: 1, done: [], won: false,
        nextId: 1, rooms: [], slabs: {}, today: 0, lo: START_LO, hi: START_HI, bought: 0 };
  people = []; shafts = []; floats = []; undo = []; selected = null;
  addRoom({ id: G.nextId++, type: 'lobby', f: 0, x: 56, rating: 100, earned: 0 });
  rebuild();
}

function save() {
  if (!G) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...G,
      rooms: G.rooms.map(r => ({ id: r.id, type: r.type, f: r.f, x: r.x, rating: Math.round(r.rating), earned: r.earned, cars: r.cars, dirty: r.dirty })),
      speedIdx, muted }));
  } catch (e) { /* opslag vol of geblokkeerd: spel werkt gewoon door */ }
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || (d.v !== 2 && d.v !== 3) || !Array.isArray(d.rooms)) return false;
    if (d.v === 2) {
      // oude toren (40 vakjes breed) schuift naar het midden van de nieuwe, bredere wereld
      const dx = START_LO * PW;
      for (const r of d.rooms) r.x += dx;
      const sl = {};
      for (const k in d.slabs) { const i = k.indexOf(','); sl[key(+k.slice(0, i), +k.slice(i + 1) + dx)] = 1; }
      d.slabs = sl; d.lo = START_LO; d.hi = START_HI; d.bought = 0; d.v = 3;
    }
    speedIdx = d.speedIdx || 1; muted = !!d.muted;
    delete d.speedIdx; delete d.muted;
    G = d;
    if (!G.done) { G.done = OLD_MISSIONS.slice(0, G.mission || 0); delete G.mission; }   // spelstand van vóór de vaste opdrachtnamen
    G.rooms = G.rooms.filter(r => T[r.type]);
    for (const r of G.rooms) { r.inside = 0; r.acc = 0; }
    people = []; shafts = []; floats = []; undo = []; selected = null;
    for (let f = FMIN; f <= TOP; f++) fillGaps(f);
    rebuild();
    for (const r of G.rooms) occupants(r, 'load');
    assignPark();
    return true;
  } catch (e) { return false; }
}
const hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };

const cnt = type => G.rooms.reduce((n, r) => n + (r.type === type), 0);
const maxShaft = type => shafts.reduce((m, s) => (!type || s.type === type) ? Math.max(m, s.top - s.bot + 1) : m, 0);
const maxFloor = () => MAXF[G.stars - 1];
const minFloor = () => MINF[G.stars - 1];
// Iets met roof (zonnepanelen, helikopterplatform...) moet bovenop staan: daar kan niets meer op.
const roofAt = (f, x) => { const r = grid.get(key(f, x)); return r && T[r.type].roof ? r : null; };
const nextStar = (tab, cmp) => { for (let s = G.stars; s < MAX_STARS; s++) if (cmp(tab[s])) return s + 1; return 0; };
const absNow = () => G.day * 1440 + G.min;
// Elk aaneengesloten stuk vloer is een 'knoop'. De begane grond (overal bereikbaar) is knoop 0.
function nodeOf(f, x) {
  if (f === 0) return 0;
  x = clamp(Math.floor(x), 0, W - 1);
  const n = segs.get(key(f, x));
  return n !== undefined ? n : segs.get(key(f, x - 1)) !== undefined ? segs.get(key(f, x - 1)) : segs.get(key(f, x + 1));
}
const layer = type => T[type].transport ? tgrid : grid;
const pick = h => h ? (tgrid.get(key(h.f, h.u)) || grid.get(key(h.f, h.u))) : null;
const ok = r => reach.has(nodeOf(r.f, r.x));

// ───────────────────────── 3. Bouwen en slopen ─────────────────────────
function addRoom(r) {
  r.inside = 0; r.acc = 0;
  G.rooms.push(r);
  for (let i = 0; i < T[r.type].w; i++) G.slabs[key(r.f, r.x + i)] = 1;
  if (r.type === 'stairs') { G.slabs[key(r.f + 1, r.x)] = 1; G.slabs[key(r.f + 1, r.x + 1)] = 1; fillGaps(r.f + 1); }   // overloop boven de trap
  fillGaps(r.f);
}

// Restgaten van 1 tot 3 vakjes (te smal voor een kamer) worden vanzelf vloer,
// zodat je er gewoon bovenop kunt bouwen.
function fillGaps(f) {
  if (f === 0) return;
  const xe = rx();
  for (let x = lx(); x < xe;) {
    if (G.slabs[key(f, x)]) { x++; continue; }
    let e = x;
    while (e < xe && !G.slabs[key(f, e)]) e++;
    if (e - x <= 3) for (let i = x; i < e; i++) G.slabs[key(f, i)] = 1;
    x = e;
  }
}

function rebuild() {
  grid.clear(); tgrid.clear(); byId.clear(); segs.clear();
  for (const r of G.rooms) {
    byId.set(r.id, r);
    for (let i = 0; i < T[r.type].w; i++) layer(r.type).set(key(r.f, r.x + i), r);
  }
  rebuildShafts();
  let n = 1;
  for (let f = FMIN; f <= TOP + 1; f++) {
    if (f === 0) continue;
    let run = false;
    for (let x = 0; x < W; x++) {
      if (G.slabs[key(f, x)]) { if (!run) { run = true; n++; } segs.set(key(f, x), n - 1); } else run = false;
    }
  }
  adj = Array.from({ length: n }, () => []);
  for (const r of G.rooms) {
    if (r.type !== 'stairs') continue;
    const a = nodeOf(r.f, r.x), b = nodeOf(r.f + 1, r.x + 1);
    if (a === undefined || b === undefined) continue;
    adj[a].push({ k: 'stairs', to: r.f + 1, n: b, c: 12, x: r.x + 0.3, sx: r.x, up: true });
    adj[b].push({ k: 'stairs', to: r.f, n: a, c: 12, x: r.x + 1.7, sx: r.x, up: false });
  }
  for (const s of shafts) {
    if (s.top === s.bot) continue;
    for (let f = s.bot; f <= s.top; f++) for (let g = s.bot; g <= s.top; g++) {
      if (g !== f) adj[nodeOf(f, s.x)].push({ k: 'lift', to: g, n: nodeOf(g, s.x), c: 14 + 0.5 * Math.abs(g - f), x: s.x + 0.5, sh: s });
    }
  }
  distCache.clear();
  const d = distTo(0);
  reach = new Set();
  for (let i = 0; i < n; i++) if (d[i] < Infinity) reach.add(i);
  pop = 0;
  for (const r of G.rooms) if (ok(r)) pop += T[r.type].pop;
  for (const p of people) if (p.st === 'go' && !(p.climb > 0)) p.leg = null;
  metroRoom = G.rooms.find(r => r.type === 'metro') || null;
  assignPark();
}

function rebuildShafts() {
  const old = shafts, kept = new Set(), used = new Set();
  shafts = [];
  const cells = G.rooms.filter(r => T[r.type].lift)
    .sort((a, b) => a.x - b.x || a.type.localeCompare(b.type) || a.f - b.f);
  let cur = null;
  for (const c of cells) {
    if (cur && cur.x === c.x && cur.type === c.type && c.f === cur.top + 1) { cur.top = c.f; cur.cells.push(c); }
    else { cur = { x: c.x, type: c.type, bot: c.f, top: c.f, queue: [], cars: [], cells: [c] }; shafts.push(cur); }
  }
  for (const s of shafts) {
    const n = clamp(Math.max(...s.cells.map(c => c.cars || 1)), 1, maxCars(s));
    s.cells.forEach((c, i) => { if (i === 0 && n > 1) c.cars = n; else delete c.cars; });
    const inside = f => f >= s.bot && f <= s.top;
    const o = old.find(o => !used.has(o) && o.x === s.x && o.type === s.type && o.bot <= s.top && o.top >= s.bot);
    if (o) used.add(o);
    for (let i = 0; i < n; i++) {
      const oc = o && o.cars[i], car = { y: s.bot + Math.round(i * (s.top - s.bot) / n), dir: 0, door: 0, pass: [] };
      if (oc && oc.y >= s.bot && oc.y <= s.top) {
        // dezelfde cabine rijdt gewoon door, met iedereen die nog op zijn bestemming kan komen
        car.y = oc.y; car.dir = oc.dir; car.door = oc.door;
        for (const p of oc.pass) if (inside(p.leg.to)) { p.leg = { ...p.leg, sh: s }; car.pass.push(p); kept.add(p); }
      } else if (oc) car.y = clamp(Math.round(oc.y), s.bot, s.top);
      s.cars.push(car);
    }
    if (o && s.top > s.bot) for (const p of o.queue) if (inside(p.f) && inside(p.leg.to)) { p.leg = { ...p.leg, sh: s }; p.car = null; s.queue.push(p); kept.add(p); }
  }
  for (const s of old) {
    for (const c of s.cars) for (const p of c.pass) if (!kept.has(p)) { p.st = 'go'; p.leg = null; p.f = Math.round(c.y); p.x = s.x + 1; }
    for (const p of s.queue) if (!kept.has(p)) { p.st = 'go'; p.leg = null; p.car = null; }
  }
}

// Kosten van één stuk; een lift is duurder als het een nieuwe schacht begint.
function costOf(type, f, x) {
  const t = T[type];
  if (!t.lift) return t.cost;
  const joins = [f - 1, f + 1].some(g => { const r = tgrid.get(key(g, x)); return r && r.type === type && r.x === x; });
  return t.cost + (joins ? 0 : t.shaft);
}

// Geeft null als bouwen mag, anders de reden in gewone taal.
function whyNot(type, f, x) {
  const t = T[type];
  if (t.star > G.stars) return 'Dit komt vrij bij ' + stars(t.star);
  if (x < 0 || x + t.w > W) return 'Dit valt buiten de wereld';
  if (x < lx() || x + t.w > rx()) return 'Deze grond is nog niet van jou. Koop hem met 🏷️ Grond kopen (' + euro(landCost()) + ')';
  if (t.minF !== undefined && f < t.minF) return t.name + ' kan pas vanaf verdieping ' + t.minF;
  if (f < FMIN) return 'Dieper dan kelder ' + (-FMIN) + ' kan niet';
  if (f < minFloor()) { const s = nextStar(MINF, m => f >= m); return s ? 'Zo diep graven mag pas met ' + stars(s) : 'Dieper kan niet'; }
  if (t.under && f >= 0) return 'Dit kan alleen onder de grond';
  if (t.above && f < 0) return 'Dit heeft daglicht nodig: bouw het boven de grond';
  if (t.roof && f < 1) return 'Dit moet bovenop een dak';
  if (t.max && cnt(type) >= t.max) return 'Je hebt al een ' + t.name.toLowerCase();
  const top = type === 'stairs' ? f + 1 : f;
  if (top > maxFloor()) { const s = nextStar(MAXF, m => top <= m); return s ? 'Zo hoog mag pas met ' + stars(s) : 'Dit is de hoogste verdieping'; }
  for (let i = 0; i < t.w; i++) if (layer(type).has(key(f, x + i))) return t.transport ? 'Hier zit al een trap of lift' : 'Hier staat al iets';
  for (let i = 0; i < t.w; i++) if (roofAt(f - 1, x + i)) return 'Op ' + T[roofAt(f - 1, x + i).type].name.toLowerCase() + ' kun je niet verder bouwen';
  if (type === 'stairs') for (let i = 0; i < t.w; i++) if (roofAt(f, x + i)) return 'Vanaf het dak kan geen trap verder omhoog';
  if (t.roof) for (let i = 0; i < t.w; i++) if (G.slabs[key(f + 1, x + i)] || tgrid.has(key(f + 1, x + i))) return 'Dit moet helemaal bovenop: hier staat al iets boven';
  if (f > 0) { for (let i = 0; i < t.w; i++) if (!G.slabs[key(f - 1, x + i)]) return 'Bouw eerst iets op de verdieping eronder'; }
  if (f < -1) { for (let i = 0; i < t.w; i++) if (!G.slabs[key(f + 1, x + i)]) return 'Bouw eerst de kelder erboven'; }
  if (t.lift) {
    for (const g of [f - 1, f + 1]) {
      const r = tgrid.get(key(g, x)) || tgrid.get(key(g, x + 1));
      if (r && T[r.type].lift && (r.type !== type || r.x !== x)) return 'Hier zit al een andere lift tegenaan';
    }
  }
  const c = costOf(type, f, x);
  if (G.money < c) return 'Te weinig geld: dit kost ' + euro(c);
  return null;
}

function place(type, f, x) {
  const c = costOf(type, f, x);
  const r = { id: G.nextId++, type, f, x, rating: 100, earned: 0 };
  G.money -= c;
  addRoom(r); rebuild(); occupants(r, 'new');
  floatAt(r, '-' + euro(c), '#ffb3b3');
  sfx('build');
  if (f <= -4 && !G.gold) {
    G.gold = true; G.money += 100000; sfx('star');
    toast('💰 Bij het graven vind je een oude schatkist! +' + euro(100000), 'star');
  }
  if (f <= -10 && !G.dino) {
    G.dino = true; G.money += 500000; sfx('star');
    toast('🦖 Je vindt dinosaurusbotten! Een museum koopt ze voor ' + euro(500000), 'star');
  }
  if ((T[type].pop || T[type].pay || T[type].util) && !ok(r) && performance.now() - lastWarn > 8000) {
    lastWarn = performance.now();
    toast('⚠️ Hier kan nog niemand komen. Zet een trap of lift vast aan dit stuk vloer.', 'bad');
  }
  return { r, c };
}

function removeRoom(r) {
  G.rooms = G.rooms.filter(q => q !== r);
  const w = T[r.type].w;
  for (const p of people) {
    if (p.home === r.id) {
      if (p.st === 'in' && p.at !== r.id) { const q = byId.get(p.at); if (q) q.inside--; }
      p.dead = true;
    } else if (p.at === r.id) {
      p.at = null; p.stay = null; p.st = 'go'; p.tt = 0; p.f = r.f; p.x = r.x + w / 2; p.leg = null; p.climb = 0;
      p.dest = p.kind === 'visitor' ? { out: true } : { room: p.home };
      p.exitX = p.x < XMID() ? XL() : XR(); p.exit = null;
    } else if (p.dest && p.dest.room === r.id) { p.dest = { out: true }; p.exit = null; }
  }
  for (const s of shafts) { s.queue = s.queue.filter(p => !p.dead); for (const c of s.cars) c.pass = c.pass.filter(p => !p.dead); }
  people = people.filter(p => !p.dead);
  if (selected === r) select(null);
  rebuild();
}

function demolish(list) {
  list = list.filter(r => r.type !== 'lobby');
  if (!list.length) return;
  let refund = 0;
  for (const r of list) {
    const v = Math.floor(T[r.type].cost / 2);
    refund += v; G.money += v;
    floatAt(r, '+' + euro(v), '#b9f5c8');
    removeRoom(r);
  }
  undo.push({ k: 'demo', rooms: list.map(r => ({ id: r.id, type: r.type, f: r.f, x: r.x, rating: r.rating, earned: r.earned, cars: r.cars })), refund });
  sfx('demo'); save();
}

function doUndo() {
  const u = undo.pop();
  if (!u) return;
  if (u.k === 'build') {
    let back = 0;
    for (const id of u.ids) { const r = byId.get(id); if (r) { removeRoom(r); back++; } }
    if (back) { G.money += u.cost; toast('↩️ Bouwen ongedaan gemaakt, ' + euro(u.cost) + ' terug'); }
  } else {
    let n = 0;
    for (const r of u.rooms) {
      let free = true;
      for (let i = 0; i < T[r.type].w; i++) if (layer(r.type).has(key(r.f, r.x + i))) free = false;
      if (!free) continue;
      addRoom(r); rebuild(); occupants(r, 'load'); n++;
    }
    if (n) { G.money -= u.refund; toast('↩️ Slopen ongedaan gemaakt'); }
  }
  sfx('click'); save();
}

// ───────────────────────── 4. Mensen en routes ─────────────────────────
// Niet iedereen is even dol op traplopen. fit 0 = neemt de trap alleen voor 1 verdieping,
// 1 = tot een verdieping of 3, 2 = sportief, tot een verdieping of 5. Daarboven kiezen ze de lift.
const STAIR_COST = [12, 6, 4], STAIR_OK = [2, 4, 6];
const ec = (e, fit) => e.k === 'stairs' ? STAIR_COST[fit] : e.c;

function distTo(dest, fit = 0) {
  const ck = dest * 3 + fit;
  let d = distCache.get(ck);
  if (d) return d;
  const n = adj.length;
  d = new Array(n).fill(Infinity); d[dest] = 0;
  const done = new Array(n).fill(false);
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    for (const e of adj[u]) { const c = ec(e, fit); if (d[u] + c < d[e.n]) d[e.n] = d[u] + c; }
  }
  distCache.set(ck, d);
  return d;
}

// Geschatte moeite van één stap: reistijd + loopafstand + drukte van de hele lift
// (wachtenden en meerijders, gedeeld door wat de cabines samen aankunnen).
function legCost(p, e, d) {
  let c = ec(e, p.fit) + d[e.n] + 0.2 * Math.abs(e.x - p.x);
  if (e.sh) {
    const s = e.sh, riders = s.cars.reduce((n, k) => n + k.pass.length, 0);
    c += 25 * (s.queue.length + 0.5 * riders) / (s.cars.length * T[s.type].cap);
  }
  return c;
}

function nextLeg(p, here, dest) {
  const d = distTo(dest, p.fit);
  let best = null, bc = Infinity;
  for (const e of adj[here]) {
    if (!(d[e.n] < d[here])) continue;
    const c = legCost(p, e, d);
    if (c < bc) { bc = c; best = e; }
  }
  if (best) best.cost = bc;
  return best;
}

// Wie al een tijd staat te wachten kijkt of een andere lift (of de trap) inmiddels veel sneller is.
function reconsider(p) {
  const here = nodeOf(p.f, p.x), room = p.dest.room && byId.get(p.dest.room);
  if (here === undefined) return;
  const destN = room ? nodeOf(room.f, room.x) : p.exit ? nodeOf(p.exit.f, p.exit.x) : 0, alt = nextLeg(p, here, destN);
  if (!alt || alt.sh === p.leg.sh) return;
  if (alt.cost + 5 < legCost(p, p.leg, distTo(destN, p.fit))) {
    p.leg.sh.queue = p.leg.sh.queue.filter(q => q !== p);
    p.car = null; p.st = 'go'; p.leg = alt;
  }
}

function mkPerson(kind, home) {
  const fr = rnd();
  const p = { kind, home, fit: fr < 0.4 ? 0 : fr < 0.8 ? 1 : 2, st: 'out', at: null, f: 0, x: XL(), dir: 1, stress: 0, sS: 0, flights: 0,
              dest: null, leg: null, climb: 0, tt: 0, plan: [], stay: null, slot: rnd(), exitX: XL() };
  people.push(p);
  return p;
}

// Parkeerplekken verdelen over vaste gebruikers (werknemers, bewoners, hotelgasten).
let metroRoom = null, warnedClean = false;
function assignPark() {
  const gs = [];
  for (const r of G.rooms) if (r.type === 'garage') { r.used = 0; if (ok(r)) gs.push(r); }
  let i = 0;
  for (const p of people) {
    if (p.kind === 'visitor' || p.kind === 'cleaner') continue;
    p.park = null;
    while (i < gs.length && gs[i].used >= T.garage.spots) i++;
    if (i < gs.length) { p.park = gs[i].id; gs[i].used++; }
  }
}

// Waar iemand het gebouw in of uit gaat: eigen parkeerplek, de metro, of (null) gewoon de straat.
function gate(p) {
  if (p.park) { const g = byId.get(p.park); if (g && ok(g)) return { f: g.f, x: g.x + 0.7 + p.slot * (T.garage.w - 1.4) }; }
  if (metroRoom && ok(metroRoom) && rnd() < 0.5) return { f: metroRoom.f, x: metroRoom.x + 1 + rnd() * (T.metro.w - 2) };
  return null;
}

function markDirty(r) {
  r.dirty = true;
  if (!warnedClean && !cnt('clean')) {
    warnedClean = true;
    toast('🧹 Hotelkamers zijn vies als de gast vertrekt. Bouw een Schoonmaak, anders komen er geen nieuwe gasten.', 'bad');
  }
}

function cleanerIdle(p) {
  const now = absNow();
  if (p.st === 'out') { go(p, { room: p.home }); return; }
  if (p.stay !== null) {
    if (now < p.stay) return;
    const r = byId.get(p.at);
    if (r && r.type === 'hotel') { r.dirty = false; r.claim = 0; floatAt(r, '✨', '#fff'); }
    p.stay = null;
  }
  const job = G.rooms.find(r => r.type === 'hotel' && r.dirty && ok(r) && !(r.claim && now - r.claim < 240));
  if (job) { job.claim = now; go(p, { room: job.id, stay: 25 }); }
  else if (p.at !== p.home) go(p, { room: p.home });
}

function putIn(p, r) { p.st = 'in'; p.at = r.id; r.inside++; }

// Vaste bewoners van een kamer aanmaken. mode: 'new' (net gebouwd) of 'load'.
function occupants(r, mode) {
  const who = { office: [4, 'worker'], apartment: [3, 'resident'], hotel: [1, 'guest'], clean: [3, 'cleaner'] }[r.type];
  if (!who) return;
  const [n, kind] = who;
  for (let i = 0; i < n; i++) {
    const p = mkPerson(kind, r.id);
    p.slot = (i + 0.5) / n;
    p.plan = dayPlan(p, mode);
  }
}

// Dagplanning: lijst van { t (absolute minuut), a ('home' | 'out' | 'visit') }.
function dayPlan(p, mode) {
  const now = G.min, base = G.day * 1440, ev = [], home = byId.get(p.home);
  const at = (m, a) => ev.push({ t: base + m, a });
  if (p.kind === 'cleaner') { if (mode !== 'day' && p.st === 'out') putIn(p, home); return ev; }
  if (p.kind === 'worker') {
    let arr = 450 + rnd() * 150;
    const leave = 1020 + rnd() * 90;
    if (mode === 'load') { if (now >= leave) return ev; if (now > arr) { putIn(p, home); arr = null; } }
    if (mode === 'new' && now > arr) { if (now < 930) arr = now; else return ev; }
    if (arr !== null) at(arr, 'home');
    const lunch = 720 + rnd() * 60;
    if (rnd() < 0.35 && lunch > Math.max(now, arr || 0) + 20) at(lunch, 'visit');
    at(leave, 'out');
  } else if (p.kind === 'resident') {
    const lv = 420 + rnd() * 120, ret = 990 + rnd() * 150, evn = 1170 + rnd() * 60;
    if (mode === 'new') at(now, 'home');
    else {
      if (mode === 'load' && (now < lv || now > ret)) putIn(p, home);
      if (now < lv) at(lv, 'out');
      if (now < ret) at(ret, 'home');
    }
    if (now < evn && rnd() < 0.3) at(evn, 'visit');
  } else {
    if (mode === 'load' && (now < 420 || now > 1260) && rnd() < 0.7) putIn(p, home);
    if (p.st === 'in' && now < 600) at(Math.max(now, 420 + rnd() * 180), 'out');
    const ci = Math.max(now, 900 + rnd() * 360);
    if (ci < 1320 && rnd() < 0.5 + home.rating / 200) at(ci, 'home');   // ook als de vorige gast er nog zit: die vertrekt 's ochtends
  }
  return ev.sort((a, b) => a.t - b.t);
}

const VENUES = ['restaurant', 'shop', 'gym', 'pool'];   // hier gaan eigen bewoners en werknemers ook heen
const isOpen = r => { const o = T[r.type].open, h = G.min / 60; return !o || (h >= o[0] && h < o[1]); };

function pickVenue() {
  const list = G.rooms.filter(r => VENUES.includes(r.type) && ok(r) && isOpen(r));
  return list.length ? list[Math.floor(rnd() * list.length)] : null;
}

function go(p, dest) {
  let f = 0, x = rnd() < 0.5 ? XL() : XR();
  if (p.st !== 'in') { const g = gate(p); if (g) { f = g.f; x = g.x; } }
  if (p.st === 'in') {
    const r = byId.get(p.at);
    if (r) { r.inside--; f = r.f; x = r.x + 0.5 + p.slot * (T[r.type].w - 1); }
    p.at = null;
  }
  const target = dest.room ? byId.get(dest.room) : null;
  if ((dest.room && !target) || !reach.has(nodeOf(f, x)) || (target && !ok(target))) {
    p.st = 'out'; if (p.kind === 'visitor') p.dead = true;
    return;
  }
  Object.assign(p, { st: 'go', dest, f, x, tt: 0, leg: null, climb: 0, stress: 0, sS: 0, flights: 0, stay: null,
                     exitX: x < XMID() ? XL() : XR(), exit: dest.out ? gate(p) : null });
}

function walk(p, tx, dt) {
  const s = 7 * dt, d = tx - p.x;
  if (Math.abs(d) <= s) { p.x = tx; return true; }
  p.dir = Math.sign(d); p.x += p.dir * s;
  return false;
}

const moodOf = p => p.stress < 10 ? 1 : p.stress < 22 ? 0.7 : 0.4;

function rate(r, p) {
  const m = moodOf(p);
  r.rating += ((m === 1 ? 100 : m === 0.7 ? 55 : 10) - r.rating) * 0.2;
  if (m < 1) r.cause = p.sS > p.stress / 2 ? 'stairs' : 'wait';
  return m;
}

function earn(r, p) {
  const v = Math.round(T[r.type].pay * rate(r, p) * (p.park && r.id === p.home ? 1.25 : 1));
  G.money += v; G.today += v; r.earned += v;
  floatAt(r, '+' + euro(v), moodOf(p) === 1 ? '#8df0a5' : moodOf(p) === 0.7 ? '#ffe08a' : '#ff9d9d');
  sfx('coin');
}

function arrive(p) {
  if (p.dest.out) { p.st = 'out'; if (p.kind === 'visitor') p.dead = true; return; }
  const r = byId.get(p.dest.room);
  putIn(p, r);
  if (r.type === 'gym') p.fit = 2;   // na het sporten loop je makkelijker trappen
  if (p.dest.pay) earn(r, p); else if (p.kind !== 'cleaner') rate(r, p);
  if (p.dest.stay) p.stay = absNow() + p.dest.stay;
}

function idle(p) {
  if (p.kind === 'cleaner') { cleanerIdle(p); return; }
  const now = absNow();
  if (p.st === 'in' && p.stay !== null && now >= p.stay) {
    go(p, p.kind === 'visitor' ? { out: true } : { room: p.home });
    return;
  }
  if (p.kind === 'visitor') return;
  if (p.plan.length && now >= p.plan[0].t) {
    const e = p.plan.shift();
    const home = byId.get(p.home);
    if (e.a === 'home') {
      if (p.kind === 'guest' && home && home.dirty) { if (G.min < 1320) p.plan.unshift({ t: now + 30, a: 'home' }); }   // kamer nog vies: straks opnieuw proberen
      else if (!(p.st === 'in' && p.at === p.home)) go(p, { room: p.home, pay: true });
    }
    else if (e.a === 'out') { if (p.st === 'in') { if (p.kind === 'guest' && home && p.at === p.home) markDirty(home); go(p, { out: true }); } }
    else if (p.st === 'in') { const v = pickVenue(); if (v) go(p, { room: v.id, pay: true, stay: 35 + rnd() * 20 }); }
  }
}

function updPerson(p, dt) {
  if (p.st === 'in' || p.st === 'out') { idle(p); return; }
  active++;
  p.tt += dt;
  if (p.tt > 90 && p.st !== 'ride' && !(p.climb > 0)) {   // te lang onderweg: geeft het op en gaat boos weg
    if (p.st === 'wait') p.leg.sh.queue = p.leg.sh.queue.filter(q => q !== p);
    const r = p.dest.room && byId.get(p.dest.room);
    if (r) { r.rating *= 0.8; r.cause = 'wait'; }
    p.st = 'out'; p.leg = null; if (p.kind === 'visitor') p.dead = true;
    return;
  }
  if (p.st === 'wait') {
    p.stress += dt; p.rw = (p.rw || 0) + dt;
    if (p.rw > 3) { p.rw = 0; reconsider(p); }
    return;
  }
  if (p.st === 'ride') { p.stress += dt * 0.15; return; }
  const leg = p.leg;
  if (leg && leg.k === 'stairs') {
    if (p.climb > 0 || walk(p, leg.x, dt)) {
      p.climb += dt / 1.2;
      p.x = leg.sx + (leg.up ? 0.3 + 1.4 * p.climb : 1.7 - 1.4 * p.climb);
      p.dir = leg.up ? 1 : -1;
      if (p.climb >= 1) {
        p.f = leg.to; p.climb = 0; p.leg = null; p.flights++;
        if (p.flights > STAIR_OK[p.fit]) { p.stress += 5; p.sS += 5; }
      }
    }
    return;
  }
  if (leg && leg.k === 'lift') {
    if (walk(p, leg.x, dt)) { p.st = 'wait'; leg.sh.queue.push(p); }
    return;
  }
  let room = null;
  if (p.dest.room) { room = byId.get(p.dest.room); if (!room) p.dest = { out: true }; }
  const ex = room ? null : p.exit;
  const here = nodeOf(p.f, p.x), destN = room ? nodeOf(room.f, room.x) : ex ? nodeOf(ex.f, ex.x) : 0;
  if (here === destN) {
    const tx = room ? room.x + 0.5 + p.slot * (T[room.type].w - 1) : ex ? ex.x : p.exitX;
    if (walk(p, tx, dt)) arrive(p);
    return;
  }
  p.leg = here === undefined ? null : nextLeg(p, here, destN);
  if (!p.leg) { p.st = 'out'; if (p.kind === 'visitor') p.dead = true; }   // route weggesloopt
}

// Bezoekers van buiten. Per soort is er één stroom bezoekers voor de hele toren (groeit met het aantal
// inwoners); die verdeelt zich over alle open zaken van die soort. Meer winkels = minder klanten per winkel.
const CAP = { shop: 4, restaurant: 10, cinema: 48, deck: 8, gym: 6, pool: 14, aquarium: 30, coaster: 40 };   // max bezoekers per uur per zaak
function demand(type) {
  const air = G.rooms.some(r => r.type === 'airport' && ok(r));
  return rawDemand(type) * (1 + (metroRoom && ok(metroRoom) ? 0.5 : 0) + (air ? 0.5 : 0));
}
function rawDemand(type) {
  const h = G.min / 60;
  switch (type) {
    case 'shop': return 2 + pop / 15;
    case 'restaurant': return (h >= 11.5 && h < 14) || (h >= 17 && h < 21) ? 4 + pop / 10 : 1 + pop / 100;
    case 'deck': return 8;
    case 'gym': return 1 + pop / 60;
    case 'pool': return 3 + pop / 25;
    case 'aquarium': return 6 + pop / 20;
    case 'coaster': return 10 + pop / 15;
    case 'cinema':
      for (const s of [14, 17, 20]) if (h >= s - 0.85 && h < s - 0.1) return (12 + pop / 4) / 0.75;
      return 0;
  }
  return 0;
}
const pull = r => (0.4 + 0.6 * r.rating / 100) * (r.type === 'shop' && r.f === 0 ? 1.6 : 1);

function spawnVisitors(dmin) {
  if (people.length > 2500) return;
  const open = G.rooms.filter(r => T[r.type].open && ok(r) && isOpen(r)), total = {};
  for (const r of open) total[r.type] = (total[r.type] || 0) + pull(r);
  for (const r of open) {
    r.acc += Math.min(CAP[r.type], demand(r.type) * pull(r) / total[r.type]) * dmin / 60;
    while (r.acc >= 1) {
      r.acc--;
      const p = mkPerson('visitor', null);
      let stay = 20 + rnd() * 25;
      if (r.type === 'restaurant') stay = 40 + rnd() * 20;
      if (r.type === 'cinema') { const h = G.min / 60, s = h < 14 ? 14 : h < 17 ? 17 : 20; stay = (s - h) * 60 + 100; }
      go(p, { room: r.id, pay: true, stay });
    }
  }
}

function newDay() {
  const upkeep = shafts.reduce((n, s) => n + s.cars.length * T[s.type].upkeep, 0);
  G.money -= upkeep;
  const vault = G.rooms.find(r => r.type === 'vault' && ok(r));
  let rente = 0;
  if (vault && G.money > 0) { rente = Math.round(Math.min(30000, G.money * 0.02)); G.money += rente; vault.rente = rente; floatAt(vault, '+' + euro(rente), '#ffe08a'); }
  if (G.today > 0 || upkeep) toast('🌙 Dag ' + (G.day - 1) + ' voorbij: ' + euro(G.today) + ' verdiend' + (upkeep ? ', ' + euro(upkeep) + ' liftonderhoud' : '') + (rente ? ', ' + euro(rente) + ' rente' : ''));
  G.today = 0;
  for (const r of G.rooms) r.earned = 0;
  for (const p of people) if (p.kind !== 'visitor') p.plan = dayPlan(p, 'day');
  assignPark();
  save();
}

// ───────────────────────── 5. Liften ─────────────────────────
// Een schacht kan meerdere cabines hebben. Elke wachtende krijgt de cabine die er het snelst kan zijn.
const MAX_CARS = 4;
const maxCars = s => clamp(s.top - s.bot, 1, MAX_CARS);

function assign(s) {
  const cap = T[s.type].cap;
  for (const p of s.queue) {
    let best = null, bc = Infinity;
    for (const c of s.cars) {
      const dy = p.f - c.y;
      let cost = Math.abs(dy) + c.pass.length * 0.5;
      if (c.pass.length >= cap) cost += 20;
      if (c.dir !== 0 && dy * c.dir < 0) cost += 10;
      if (c === p.car) cost -= 0.5;
      if (cost < bc) { bc = cost; best = c; }
    }
    p.car = best;
  }
}

function shouldStop(s, c, f) {
  const full = c.pass.length >= T[s.type].cap;
  if (c.pass.some(p => p.leg.to === f)) return true;
  const ahead = g => (g - f) * c.dir > 0;
  const more = c.pass.some(p => ahead(p.leg.to)) || (!full && s.queue.some(p => p.car === c && ahead(p.f)));
  if (!more) return true;
  return !full && s.queue.some(p => p.f === f && Math.sign(p.leg.to - f) === c.dir);
}

function doStop(s, c, f) {
  const cap = T[s.type].cap;
  let moved = false;
  c.y = f;
  for (const p of c.pass) if (p.leg.to === f) { p.f = f; p.x = s.x + 1; p.leg = null; p.st = 'go'; moved = true; }
  c.pass = c.pass.filter(p => p.st === 'ride');
  const ahead = g => (g - f) * c.dir > 0;
  const here = s.queue.filter(p => p.f === f), mine = s.queue.filter(p => p.car === c);
  const full = c.pass.length >= cap;
  const more = c.dir !== 0 && (c.pass.some(p => ahead(p.leg.to)) || (!full && mine.some(p => ahead(p.f))));
  if (!more) {
    if (c.pass.length) c.dir = Math.sign(c.pass[0].leg.to - f);
    else if (here.length) c.dir = Math.sign(here[0].leg.to - f);
    else if (mine.length) c.dir = Math.sign(mine[0].f - f);
    else c.dir = 0;
  }
  for (const p of here) {
    if (c.pass.length >= cap) break;
    if (Math.sign(p.leg.to - f) !== c.dir) continue;
    p.st = 'ride'; p.car = null; c.pass.push(p); moved = true;
  }
  s.queue = s.queue.filter(p => p.st === 'wait');
  if (moved) c.door = 0.8;
}

function updCar(s, c, dt) {
  if (c.door > 0) { c.door -= dt; if (c.door > 0) return; }
  if (c.dir === 0) {
    let best = null, bd = Infinity;
    for (const p of c.pass) { const d = Math.abs(p.leg.to - c.y); if (d < bd) { bd = d; best = p.leg.to; } }
    for (const p of s.queue) { if (p.car !== c) continue; const d = Math.abs(p.f - c.y); if (d < bd) { bd = d; best = p.f; } }
    if (best === null) return;
    if (bd < 1e-6) { doStop(s, c, Math.round(c.y)); if (c.dir === 0 || c.door > 0) return; }
    else c.dir = best > c.y ? 1 : -1;
  }
  const ny = c.y + c.dir * T[s.type].speed * dt;
  const nf = c.dir > 0 ? Math.floor(c.y + 1e-6) + 1 : Math.ceil(c.y - 1e-6) - 1;
  if (nf < s.bot || nf > s.top) { c.dir = 0; return; }
  if ((c.dir > 0 && ny >= nf) || (c.dir < 0 && ny <= nf)) {
    c.y = nf;
    if (shouldStop(s, c, nf)) doStop(s, c, nf);
  } else c.y = ny;
}

function updShaft(s, dt) {
  if (s.top === s.bot) return;
  if (s.cars.length > 1) assign(s); else for (const p of s.queue) p.car = s.cars[0];
  for (const c of s.cars) updCar(s, c, dt);
}

// Cabine erbij (d = 1) of eraf (d = -1). Het aantal staat op het onderste liftstuk.
function changeCars(s, d) {
  const cell = G.rooms.find(r => r.type === s.type && r.x === s.x && r.f === s.bot), price = T[s.type].shaft;
  const n = s.cars.length + d;
  if (n < 1 || n > maxCars(s)) return;
  if (d > 0) {
    if (G.money < price) { sfx('error'); toast('⛔ Te weinig geld: een cabine kost ' + euro(price), 'bad'); return; }
    G.money -= price; floatAt(cell, '-' + euro(price), '#ffb3b3'); sfx('build');
  } else { G.money += price / 2; floatAt(cell, '+' + euro(price / 2), '#b9f5c8'); sfx('demo'); }
  cell.cars = n;
  rebuild(); save();
}

// ───────────────────────── 6. Tekenen ─────────────────────────
const cv = $('cv'), ctx = cv.getContext('2d');
let cw = 0, ch = 0, dpr = 1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cw = window.innerWidth; ch = window.innerHeight;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}

const ZMIN = 0.15, ZMAX = 2.5;
function clampCam() {
  cam.z = clamp(cam.z, ZMIN, ZMAX);
  cam.x = clamp(cam.x, -150, W * U + 150);
  cam.y = clamp(cam.y, -(TOP + 3) * FH, (3 - FMIN) * FH);
}

function homeView() {
  let top = 3, bot = 0, x0 = 1e9, x1 = -1e9;
  for (const r of G.rooms) { top = Math.max(top, r.f + 1); bot = Math.min(bot, r.f); x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x + T[r.type].w); }
  x0 = Math.min(x0, XMID() - 20); x1 = Math.max(x1, XMID() + 20);
  const hpx = (top - bot + 3) * FH;
  cam.z = clamp(Math.min(cw / ((x1 - x0) * U + (cw < 720 ? 40 : 160)), (ch - (cw < 720 ? 340 : 230)) / hpx), ZMIN, 1.6);
  cam.x = (x0 + x1) / 2 * U;
  cam.y = -(top + 1 + bot) * FH / 2 + 30 / cam.z;
  clampCam();
}

const toScreen = (wx, wy) => [(wx - cam.x) * cam.z + cw / 2, (wy - cam.y) * cam.z + ch / 2];
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function mix(a, b, t) { return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; }
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function dayness() { const h = G.min / 60; return Math.min(smooth(5, 7.5, h), 1 - smooth(19, 21.5, h)); }

function base(c, col, x, y, w, h) {
  R(c, col, x, y, w, h);
  R(c, '#6b7280', x, y, w, 3);
  R(c, 'rgba(0,0,0,.12)', x, y + 3, 1, h - 3);
  R(c, 'rgba(0,0,0,.12)', x + w - 1, y + 3, 1, h - 3);
  R(c, 'rgba(0,0,0,.18)', x, y + h - 1, w, 1);
}
function windowAt(c, x, y, w, h, lit) {
  R(c, '#ffffff', x - 1, y - 1, w + 2, h + 2);
  R(c, lit === 2 ? '#ffe9a8' : lit === 1 ? '#2a3654' : '#bfe3ff', x, y, w, h);
}

// lit: 0 = dag, 1 = nacht en leeg, 2 = nacht en licht aan
const ART = {
  empty(c, x, y, w, h) { R(c, '#c5c9d1', x, y, w, h); R(c, '#8e949f', x, y, w, 3); R(c, 'rgba(0,0,0,.1)', x, y + h - 1, w, 1); },
  lobby(c, x, y, w, h, lit) {
    base(c, '#efe3c8', x, y, w, h);
    for (let i = 0; i < 2; i++) { const dx = i ? x + w - 16 : x + 4; R(c, '#7c8794', dx, y + 8, 12, h - 9); R(c, lit === 1 ? '#3a4a6b' : '#cdeaff', dx + 1, y + 9, 4.5, h - 11); R(c, lit === 1 ? '#3a4a6b' : '#cdeaff', dx + 6.5, y + 9, 4.5, h - 11); }
    R(c, '#8a5a3c', x + w / 2 - 14, y + h - 11, 28, 10); R(c, '#a8734f', x + w / 2 - 15, y + h - 12, 30, 2);
    R(c, '#b45f3c', x + w / 2 + 24, y + h - 7, 6, 6); c.fillStyle = '#3f9b52'; c.beginPath(); c.arc(x + w / 2 + 27, y + h - 11, 5, 0, 7); c.fill();
    R(c, '#c9a227', x + w / 2 - 20, y + 7, 40, 5);
  },
  office(c, x, y, w, h, lit) {
    base(c, '#dbe7f3', x, y, w, h);
    for (let i = 0; i < 3; i++) {
      const dx = x + 6 + i * 32;
      windowAt(c, dx, y + 8, 20, 10, lit);
      R(c, '#8a5a3c', dx, y + h - 11, 20, 2.5); R(c, '#6d4630', dx + 1, y + h - 9, 2, 8); R(c, '#6d4630', dx + 17, y + h - 9, 2, 8);
      R(c, '#2d3748', dx + 7, y + h - 17, 7, 5); R(c, '#2d3748', dx + 10, y + h - 12, 1.5, 1.5);
    }
  },
  apartment(c, x, y, w, h, lit) {
    base(c, '#f3e3cf', x, y, w, h);
    windowAt(c, x + 8, y + 8, 14, 11, lit);
    R(c, '#c96f4a', x + 30, y + 9, 10, 8); R(c, '#f7d9a0', x + 32, y + 11, 6, 4);
    R(c, '#7a5237', x + 6, y + h - 12, 3, 11); R(c, '#ffffff', x + 9, y + h - 8, 26, 4); R(c, '#e07a5f', x + 17, y + h - 9, 18, 5); R(c, '#7a5237', x + 9, y + h - 4, 26, 3);
    R(c, '#555', x + 50, y + h - 15, 1.5, 14); R(c, '#ffd166', x + 46, y + h - 19, 9, 5);
  },
  shop(c, x, y, w, h, lit) {
    base(c, '#e2f4e0', x, y, w, h);
    for (let i = 0; i < w / 8; i++) R(c, i % 2 ? '#fff' : '#e5484d', x + i * 8, y + 3, 8, 5);
    const cols = ['#f4a261', '#2a9d8f', '#e76f51', '#457b9d', '#e9c46a', '#8ecae6'];
    for (let row = 0; row < 2; row++) {
      R(c, '#8a5a3c', x + 5, y + 20 + row * 9, 34, 1.5);
      for (let i = 0; i < 6; i++) R(c, cols[(i + row * 2) % 6], x + 6 + i * 5.5, y + 14 + row * 9, 4, 6);
    }
    R(c, '#5b6b7d', x + 44, y + h - 11, 15, 10); R(c, '#2d3748', x + 48, y + h - 15, 6, 4);
  },
  restaurant(c, x, y, w, h, lit) {
    base(c, '#f6dcd6', x, y, w, h);
    for (let i = 0; i < 4; i++) {
      const dx = x + 8 + i * 30;
      R(c, '#555', dx + 8.5, y + 3, 1, 6); R(c, '#ffd166', dx + 5, y + 9, 8, 4);
      R(c, '#fff', dx, y + h - 10, 18, 3); R(c, '#9a9a9a', dx + 8, y + h - 7, 2, 6);
      R(c, '#7a4b2a', dx - 5, y + h - 12, 3, 11); R(c, '#7a4b2a', dx - 5, y + h - 7, 6, 2);
      R(c, '#7a4b2a', dx + 20, y + h - 12, 3, 11); R(c, '#7a4b2a', dx + 17, y + h - 7, 6, 2);
    }
  },
  hotel(c, x, y, w, h, lit) {
    base(c, '#e6dcf5', x, y, w, h);
    R(c, '#7a5237', x + 4, y + 11, 9, h - 12); R(c, '#e9c46a', x + 10.5, y + 23, 1.5, 1.5);
    windowAt(c, x + 20, y + 8, 12, 9, lit);
    R(c, '#5b3d8a', x + 16, y + h - 13, 3, 12); R(c, '#fff', x + 19, y + h - 8, 24, 4); R(c, '#8e6cc9', x + 26, y + h - 9, 17, 5); R(c, '#5b3d8a', x + 19, y + h - 4, 24, 3);
  },
  cinema(c, x, y, w, h, lit) {
    base(c, '#2d2a3e', x, y, w, h);
    R(c, '#f1f5f9', x + 6, y + 7, 4, h - 14);
    c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(x + w - 10, y + 9); c.lineTo(x + 10, y + 7); c.lineTo(x + 10, y + h - 7); c.fill();
    for (let i = 0; i < 9; i++) { const dx = x + 30 + i * 17, dy = y + h - 9 - i * 1.6; R(c, '#c1272d', dx, dy, 11, 7); R(c, '#8f1d22', dx + 9, dy - 4, 3, 11); R(c, '#1f1d2b', dx - 2, dy + 7, 17, 9); }
    R(c, '#555', x + w - 12, y + 7, 7, 4);
  },
  stairs(c, x, y, w, h, lit, over) {
    if (over) R(c, 'rgba(255,255,255,.45)', x, y + 3, w, h - 3); else base(c, '#dedee6', x, y, w, h);
    c.fillStyle = '#8d99ae'; c.beginPath(); c.moveTo(x + 2, y + h);
    for (let i = 0; i < 6; i++) { c.lineTo(x + 2 + i * 4.6, y + h - (i + 1) * 6); c.lineTo(x + 2 + (i + 1) * 4.6, y + h - (i + 1) * 6); }
    c.lineTo(x + w - 2, y + h); c.fill();
    c.strokeStyle = '#4a5568'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 2, y + h - 14); c.lineTo(x + w - 3, y - 8 + 6); c.stroke();
  },
  lift(c, x, y, w, h, lit, over) { R(c, over ? 'rgba(75,85,99,.22)' : '#4b5563', x, y, w, h); R(c, '#6b7280', x + 4, y, 1.5, h); R(c, '#6b7280', x + w - 5.5, y, 1.5, h); if (!over) R(c, '#374151', x, y, w, 2); },
  xlift(c, x, y, w, h, lit, over) { R(c, over ? 'rgba(59,63,115,.22)' : '#3b3f73', x, y, w, h); R(c, '#d4a72c', x + 4, y, 1.5, h); R(c, '#d4a72c', x + w - 5.5, y, 1.5, h); if (!over) R(c, '#2b2e57', x, y, w, 2); },
  vend(c, x, y, w, h) {
    base(c, '#eef1f4', x, y, w, h);
    R(c, '#c92a2a', x + 3, y + 9, w - 6, h - 10); R(c, '#ffe3e3', x + 4.5, y + 11, w - 9, 9); R(c, '#222', x + 4.5, y + h - 9, w - 9, 3);
  },
  garage(c, x, y, w, h, lit, over, r) {
    base(c, '#7b8190', x, y, w, h);
    R(c, '#f1c40f', x, y + 3, w, 2);
    for (let i = 0; i <= 6; i++) R(c, 'rgba(255,255,255,.5)', x + 3 + i * 20.3, y + h - 3, 1, 2);
    const n = r ? Math.ceil((r.used || 0) / 2) : 4, cols = ['#e03131', '#1c7ed6', '#f8f9fa', '#2f9e44', '#f59f00', '#495057'];
    for (let i = 0; i < n; i++) {
      const dx = x + 5 + i * 20.3;
      R(c, cols[i % 6], dx, y + h - 10, 16, 6); R(c, cols[i % 6], dx + 3, y + h - 14, 9, 4); R(c, '#cfe8ff', dx + 4, y + h - 13, 7, 3);
      R(c, '#111', dx + 2, y + h - 5, 3.5, 3.5); R(c, '#111', dx + 10.5, y + h - 5, 3.5, 3.5);
    }
    R(c, '#1c7ed6', x + w - 14, y + 8, 10, 10); c.fillStyle = '#fff'; c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.fillText('P', x + w - 9, y + 16.5);
  },
  clean(c, x, y, w, h) {
    base(c, '#e3f6f5', x, y, w, h);
    R(c, '#fff', x + 5, y + h - 17, 13, 16); c.fillStyle = '#74c0fc'; c.beginPath(); c.arc(x + 11.5, y + h - 8, 4, 0, 7); c.fill();
    R(c, '#fff', x + 20, y + h - 17, 13, 16); c.fillStyle = '#74c0fc'; c.beginPath(); c.arc(x + 26.5, y + h - 8, 4, 0, 7); c.fill();
    R(c, '#8a5a3c', x + 46, y + 9, 1.5, h - 14); R(c, '#adb5bd', x + 43, y + h - 6, 8, 4);
    R(c, '#1c7ed6', x + 53, y + h - 9, 7, 8);
    R(c, '#8a5a3c', x + 37, y + 12, 22, 1.5); for (let i = 0; i < 4; i++) R(c, ['#ffd43b', '#ff8787', '#69db7c', '#74c0fc'][i], x + 38 + i * 5, y + 8, 3.5, 4);
  },
  metro(c, x, y, w, h) {
    R(c, '#2f3542', x, y, w, h); R(c, '#6b7280', x, y, w, 3);
    for (let i = 0; i < w / 8; i++) R(c, i % 2 ? '#dfe6ee' : '#cfd8e3', x + i * 8, y + 3, 8, 9);
    R(c, '#f1c40f', x, y + h - 7, w, 1.5); R(c, '#9aa3b2', x, y + h - 5, w, 5);
    R(c, '#e8590c', x + 26, y + 14, w - 52, h - 20); R(c, '#fff', x + 26, y + 22, w - 52, 2);
    for (let i = 0; i < 9; i++) R(c, '#cfe8ff', x + 32 + i * 18, y + 16, 11, 5);
    R(c, '#1c7ed6', x + 6, y + 14, 12, 12); c.fillStyle = '#fff'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('M', x + 12, y + 24);
  },
  deck(c, x, y, w, h, lit) {
    base(c, lit === 1 ? '#3a4a6b' : '#cfefff', x, y, w, h);
    for (let i = 1; i < 5; i++) R(c, '#7c8794', x + i * w / 5, y + 3, 2, h - 3);
    R(c, '#7c8794', x, y + h - 12, w, 2);
    R(c, '#333', x + w / 2 - 1, y + h - 16, 2, 15); R(c, '#e5484d', x + w / 2 - 8, y + h - 21, 16, 6); R(c, '#111', x + w / 2 + 7, y + h - 20, 3, 4);
    R(c, '#666', x + w - 20, y - 30, 2, 30); R(c, '#ae1c28', x + w - 18, y - 30, 20, 4); R(c, '#fff', x + w - 18, y - 26, 20, 4); R(c, '#21468b', x + w - 18, y - 22, 20, 4);
  },
  // dak-dingen staan in de open lucht: geen muren, wel een vloer
  solar(c, x, y, w, h) {
    R(c, '#9aa3b2', x, y + h - 4, w, 4);
    for (let i = 0; i < 3; i++) {
      const dx = x + 3 + i * 20;
      c.fillStyle = '#1e3a8a'; c.beginPath(); c.moveTo(dx, y + h - 6); c.lineTo(dx + 6, y + h - 24); c.lineTo(dx + 19, y + h - 24); c.lineTo(dx + 15, y + h - 6); c.fill();
      c.strokeStyle = '#93c5fd'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(dx + 3, y + h - 15); c.lineTo(dx + 17, y + h - 15); c.moveTo(dx + 10, y + h - 24); c.lineTo(dx + 8, y + h - 6); c.stroke();
      R(c, '#555', dx + 8, y + h - 6, 2, 3);
    }
  },
  gym(c, x, y, w, h, lit) {
    base(c, '#fde2e4', x, y, w, h);
    windowAt(c, x + 6, y + 8, 18, 9, lit);
    R(c, '#333', x + 32, y + h - 6, 26, 4); R(c, '#555', x + 36, y + h - 14, 3, 8); R(c, '#555', x + 51, y + h - 14, 3, 8); R(c, '#e03131', x + 34, y + h - 15, 22, 2);
    R(c, '#444', x + 66, y + h - 20, 3, 19); R(c, '#666', x + 62, y + h - 21, 11, 3); R(c, '#e03131', x + 68, y + h - 11, 14, 4);
    R(c, '#222', x + 80, y + 14, 2, 8); R(c, '#222', x + 89, y + 14, 2, 8); R(c, '#777', x + 78, y + 17, 15, 2);
  },
  pool(c, x, y, w, h, lit) {
    base(c, '#e7f5ff', x, y, w, h);
    windowAt(c, x + 8, y + 7, 20, 9, lit);
    windowAt(c, x + w - 28, y + 7, 20, 9, lit);
    R(c, '#4dabf7', x + 6, y + h - 14, w - 12, 13); R(c, '#a5d8ff', x + 6, y + h - 14, w - 12, 2);
    for (let i = 0; i < 4; i++) R(c, '#fff', x + 20 + i * 34, y + h - 9, 10, 1.5);
    R(c, '#adb5bd', x + w - 12, y + h - 24, 2, 12); R(c, '#adb5bd', x + w - 17, y + h - 24, 2, 12);
    R(c, '#ffd43b', x + 40, y + 20, 22, 3);
  },
  heli(c, x, y, w, h) {
    R(c, '#4b5563', x, y + h - 6, w, 6);
    R(c, '#6b7280', x + 6, y + h - 8, w - 12, 2);
    c.strokeStyle = '#facc15'; c.lineWidth = 2; c.beginPath(); c.ellipse(x + w / 2, y + h - 7, 40, 3, 0, 0, 7); c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('H', x + w / 2, y + h - 10);
    for (const dx of [4, w - 6]) { R(c, '#999', x + dx, y + h - 16, 2, 10); R(c, '#ef4444', x + dx - 1, y + h - 18, 4, 3); }
  },
  vault(c, x, y, w, h) {
    base(c, '#495057', x, y, w, h);
    R(c, '#868e96', x + 8, y + 6, 26, h - 7); c.fillStyle = '#adb5bd'; c.beginPath(); c.arc(x + 21, y + 20, 9, 0, 7); c.fill();
    c.strokeStyle = '#495057'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 15, y + 20); c.lineTo(x + 27, y + 20); c.moveTo(x + 21, y + 14); c.lineTo(x + 21, y + 26); c.stroke();
    for (let i = 0; i < 4; i++) { R(c, '#fcc419', x + 44 + i * 11, y + h - 7, 9, 5); R(c, '#f59f00', x + 44 + i * 11, y + h - 7, 9, 1); }
    for (let i = 0; i < 3; i++) R(c, '#fcc419', x + 49 + i * 11, y + h - 12, 9, 5);
    R(c, '#fcc419', x + 55, y + h - 17, 9, 5);
  },
  aquarium(c, x, y, w, h) {
    base(c, '#1c3d5a', x, y, w, h);
    R(c, '#1971c2', x + 4, y + 5, w - 8, h - 7); R(c, '#4dabf7', x + 4, y + 5, w - 8, 3);
    R(c, '#e9c46a', x + 4, y + h - 6, w - 8, 4);
    const t = performance.now() / 1000;
    const fish = (fx, fy, col, s) => { c.fillStyle = col; c.beginPath(); c.ellipse(fx, fy, 5 * s, 2.5 * s, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(fx - 4 * s, fy); c.lineTo(fx - 8 * s, fy - 3 * s); c.lineTo(fx - 8 * s, fy + 3 * s); c.fill(); };
    for (let i = 0; i < 6; i++) fish(x + 12 + ((i * 47 + t * (8 + i * 3)) % (w - 24)), y + 13 + (i % 3) * 6, ['#ff922b', '#ffd43b', '#f06595'][i % 3], 1);
    fish(x + 20 + ((t * 14) % (w - 40)), y + 17, '#adb5bd', 2.2);   // haai
    for (let i = 0; i < 5; i++) R(c, '#2b8a3e', x + 10 + i * 40, y + h - 14, 2, 9);
  },
  coaster(c, x, y, w, h) {
    R(c, '#9aa3b2', x, y + h - 4, w, 4);
    c.strokeStyle = '#e03131'; c.lineWidth = 3; c.beginPath();
    const yy = i => y + h - 8 - 26 * Math.abs(Math.sin(i / w * Math.PI * 2.5));
    for (let i = 0; i <= w; i += 4) i ? c.lineTo(x + i, yy(i)) : c.moveTo(x + i, yy(i));
    c.stroke();
    c.strokeStyle = '#868e96'; c.lineWidth = 1;
    for (let i = 8; i < w; i += 16) { c.beginPath(); c.moveTo(x + i, yy(i)); c.lineTo(x + i, y + h - 4); c.stroke(); }
    const t = (performance.now() / 1000 * 50) % w;
    for (let k = 0; k < 3; k++) { const q = (t + k * 9) % w; R(c, ['#ffd43b', '#4dabf7', '#69db7c'][k], x + q - 3, yy(q) - 6, 7, 5); }
  },
  airport(c, x, y, w, h) {
    R(c, '#4b5563', x, y + h - 8, w, 8);
    R(c, '#374151', x, y + h - 10, w, 2);
    for (let i = 10; i < w - 10; i += 24) R(c, '#f8f9fa', x + i, y + h - 6, 12, 1.5);
    for (let i = 0; i < w; i += 30) R(c, (Math.floor(performance.now() / 400) + i / 30) % 2 ? '#ffd43b' : '#868e96', x + i + 2, y + h - 12, 3, 2);
    // verkeerstoren
    R(c, '#adb5bd', x + w - 30, y - 10, 6, h); R(c, '#495057', x + w - 34, y - 18, 14, 8); R(c, '#a5d8ff', x + w - 33, y - 17, 12, 5);
    c.fillStyle = '#fff'; c.font = 'bold 9px system-ui'; c.textAlign = 'left'; c.fillText('✈ TOBY AIRPORT', x + 8, y + h - 14);
  },
};

// Helikopter of vliegtuig dat landt en weer vertrekt. t = spelminuten sinds het begin van de landing.
function drawFlyer(c, r) {
  const t = absNow() - (r.land || -1e9), x = r.x * U, y = -(r.f + 1) * FH, w = T[r.type].w * U;
  const rotor = Math.sin(performance.now() / 30);
  if (r.type === 'heli') {
    if (t < 0 || t > 30) return;
    const lift = t < 8 ? (8 - t) / 8 : t > 22 ? (t - 22) / 8 : 0;
    const hx = x + w / 2 + (t < 8 ? -lift * 160 : t > 22 ? lift * 160 : 0), hy = y + FH - 9 - lift * 200;
    c.fillStyle = '#1c7ed6'; c.beginPath(); c.ellipse(hx, hy - 7, 16, 8, 0, 0, 7); c.fill();
    R(c, '#1c7ed6', hx + 12, hy - 10, 26, 4); R(c, '#1864ab', hx + 34, hy - 16, 4, 10);
    c.fillStyle = '#a5d8ff'; c.beginPath(); c.ellipse(hx - 7, hy - 9, 7, 4.5, 0, 0, 7); c.fill();
    R(c, '#333', hx - 12, hy, 24, 2); R(c, '#333', hx - 8, hy - 2, 2, 3); R(c, '#333', hx + 6, hy - 2, 2, 3);
    R(c, '#333', hx - 1, hy - 18, 2, 4);
    const rw = 30 * Math.abs(rotor) + 6; R(c, '#222', hx - rw, hy - 19, rw * 2, 1.5);
  } else if (r.type === 'airport') {
    if (t < 0 || t > 40) return;
    let px, alt;
    if (t < 10) { px = x + w + (10 - t) * 60; alt = (10 - t) * 22; }        // aanvliegen van rechts
    else if (t < 16) { px = x + w - (t - 10) / 6 * (w * 0.55); alt = 0; }   // uitrollen
    else if (t < 28) { px = x + w * 0.45; alt = 0; }                      // passagiers in en uit
    else { const k = t - 28; px = x + w * 0.45 - k * k * 6; alt = Math.max(0, (k - 3) * 25); }   // opstijgen naar links
    const py = y + FH - 10 - alt;
    c.fillStyle = '#f8f9fa'; c.beginPath(); c.ellipse(px, py - 6, 34, 6, 0, 0, 7); c.fill();
    c.fillStyle = '#ae1c28'; c.beginPath(); c.moveTo(px + 26, py - 8); c.lineTo(px + 38, py - 24); c.lineTo(px + 40, py - 8); c.fill();
    c.fillStyle = '#21468b'; c.beginPath(); c.moveTo(px - 4, py - 5); c.lineTo(px + 10, py + 4); c.lineTo(px + 16, py + 4); c.lineTo(px + 8, py - 5); c.fill();
    for (let i = 0; i < 7; i++) R(c, '#1c7ed6', px - 20 + i * 6, py - 9, 3, 2.5);
    c.fillStyle = '#a5d8ff'; c.beginPath(); c.ellipse(px - 29, py - 7, 4, 2.5, 0, 0, 7); c.fill();
    if (alt === 0) { R(c, '#333', px - 22, py - 1, 2, 4); R(c, '#333', px + 6, py - 1, 2, 4); }
  }
}

// slot/of: meerdere cabines staan naast elkaar in dezelfde schacht
function drawCar(c, x, y, type, n, open, slot = 0, of = 1) {
  const w = (2 * U - 6 - (of - 1)) / of, cx = x + 3 + slot * (w + 1);
  R(c, type === 'xlift' ? '#fde68a' : '#e5e7eb', cx, y + 6, w, FH - 7);
  R(c, 'rgba(0,0,0,.25)', cx, y + 6, w, 2);
  if (open) R(c, '#1f2937', cx + 1.5, y + 10, w - 3, FH - 12);
  else if (of === 1) R(c, 'rgba(0,0,0,.3)', cx + w / 2 - 0.5, y + 8, 1, FH - 9);
  if (n && of <= 2) { c.fillStyle = open ? '#fff' : '#111'; c.font = 'bold ' + (of === 1 ? 11 : 9) + 'px system-ui'; c.textAlign = 'center'; c.fillText(n, cx + w / 2, y + FH - 9); }
  else if (n && !open) R(c, '#111', cx + w / 2 - 1, y + FH - 14, 2, 6);
}

function drawPerson(c, px, py, col) {
  c.fillStyle = col;
  c.fillRect(px - 2, py - 9, 4, 9);
  c.beginPath(); c.arc(px, py - 11.5, 2.7, 0, 7); c.fill();
}
const stressCol = s => mix([43, 52, 64], [230, 40, 40], clamp(s / 22, 0, 1));

function floatAt(r, txt, col) {
  floats.push({ x: (r.x + T[r.type].w / 2) * U + (rnd() - 0.5) * 16, y: -(r.f + 1) * FH + 12, txt, col, t: 0 });
  if (floats.length > 60) floats.shift();
}

const BG = Array.from({ length: 80 }, (_, i) => ({ x: -2500 + i * 87 + ((i * 37) % 23), w: 50 + (i * 53) % 40, h: 50 + (i * 97) % 190 }));
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (i * 0.618) % 1, y: ((i * 0.377) % 1) * 0.7, s: 1 + (i % 3) * 0.5 }));

function ghostFor(h) {
  if (!h || !T[tool]) return null;
  const t = T[tool], f = h.f;
  let x = clamp(h.u - Math.floor(t.w / 2), 0, W - t.w);
  if (t.lift) {
    if (stroke && stroke.x !== null) x = stroke.x;
    else for (const g of [f - 1, f + 1]) for (const dx of [0, -1, 1]) {
      const r = tgrid.get(key(g, x + dx)); if (r && r.type === tool && r.x === x + dx) { x = r.x; break; }
    }
  } else if (!(stroke && stroke.ids.length)) {
    // klik je net naast een vrije plek, dan schuift het stuk er vanzelf in
    for (let d = 0; d <= Math.ceil(t.w / 2); d++) for (const s of d ? [-d, d] : [0]) {
      const nx = x + s;
      if (nx >= 0 && nx + t.w <= W && !whyNot(tool, f, nx)) return { type: tool, f, x: nx, why: null };
    }
  }
  return { type: tool, f, x, why: whyNot(tool, f, x) };
}

function draw() {
  const d = dayness(), night = d < 0.35;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, mix([10, 14, 44], [86, 170, 236], d));
  sky.addColorStop(1, mix([40, 44, 90], d > 0.05 && d < 0.95 ? [255, 190, 140] : [190, 228, 250], d));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
  if (d < 0.6) { ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - d / 0.6)) + ')'; for (const s of STARS) ctx.fillRect(s.x * cw, s.y * ch, s.s, s.s); }
  const h = G.min / 60, sunT = (h - 6) / 14;
  if (sunT > 0 && sunT < 1) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(cw * (0.1 + 0.8 * sunT), ch * (0.55 - 0.4 * Math.sin(sunT * Math.PI)), 26, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(cw * 0.8, ch * 0.16, 18, 0, 7); ctx.fill(); }

  const z = cam.z * dpr;
  ctx.setTransform(z, 0, 0, z, (cw / 2 - cam.x * cam.z) * dpr, (ch / 2 - cam.y * cam.z) * dpr);
  const vx0 = cam.x - cw / 2 / cam.z, vx1 = cam.x + cw / 2 / cam.z, vy0 = cam.y - ch / 2 / cam.z, vy1 = cam.y + ch / 2 / cam.z;

  // skyline, grond
  ctx.fillStyle = mix([24, 30, 64], [168, 205, 232], d);
  for (const b of BG) ctx.fillRect(b.x, -b.h, b.w, b.h);
  R(ctx, mix([30, 70, 45], [96, 176, 96], d), vx0, 0, vx1 - vx0, 7);
  R(ctx, mix([40, 30, 26], [110, 82, 60], d), vx0, 7, vx1 - vx0, vy1);
  R(ctx, mix([70, 72, 80], [176, 180, 188], d), -6 * U, 0, (W + 12) * U, 4);

  // bouwgrens en verdiepingsnummers
  const mf = maxFloor(), nf = minFloor(), L = lx() * U, Rr = rx() * U;
  // grond die nog niet van jou is: donkerder, met bordjes 'Te koop' op de kavels ernaast
  for (let pl = 0; pl < W / PW; pl++) {
    if (pl >= G.lo && pl <= G.hi) continue;
    const px = pl * PW * U;
    if (px + PW * U < vx0 || px > vx1) continue;
    R(ctx, 'rgba(10,20,40,.10)', px, -(mf + 1) * FH, PW * U, (mf + 1) * FH);
    R(ctx, 'rgba(0,0,0,.28)', px, 7, PW * U, (-nf) * FH);
    if (pl === G.lo - 1 || pl === G.hi + 1) {
      const cx = px + PW * U / 2, hot = hover && plotOf(hover.u) === pl && tool === 'land';
      R(ctx, '#7a5237', cx - 2, -34, 4, 34);
      R(ctx, hot ? '#ffd24a' : '#fff7e0', cx - 42, -62, 84, 32); ctx.strokeStyle = '#7a5237'; ctx.lineWidth = 2; ctx.strokeRect(cx - 42, -62, 84, 32);
      ctx.fillStyle = '#c92a2a'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TE KOOP', cx, -49);
      ctx.fillStyle = '#2b2b2b'; ctx.font = 'bold 11px system-ui'; ctx.fillText(euro(landCost()), cx, -36);
    }
  }
  if (cam.z > 0.4) {
    ctx.font = '10px system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = night ? 'rgba(255,255,255,.6)' : 'rgba(20,30,50,.6)';
    for (let f = nf; f <= mf; f++) if (f % (cam.z > 0.7 ? 1 : 5) === 0 || f === mf) ctx.fillText(f === 0 ? 'BG' : f > 0 ? f : 'K' + (-f), L - 8, -f * FH - 13);
  }
  ctx.strokeStyle = night ? 'rgba(255,255,255,.45)' : 'rgba(20,30,50,.4)'; ctx.lineWidth = 1.5 / Math.min(1, cam.z); ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(L, -(mf + 1) * FH); ctx.lineTo(Rr, -(mf + 1) * FH); ctx.moveTo(L, -nf * FH); ctx.lineTo(L, -(mf + 1) * FH); ctx.moveTo(Rr, -nf * FH); ctx.lineTo(Rr, -(mf + 1) * FH);
  ctx.moveTo(L, -nf * FH); ctx.lineTo(Rr, -nf * FH); ctx.stroke();
  ctx.setLineDash([]);
  const up = nextStar(MAXF, m => m > mf);
  if (up) { ctx.textAlign = 'center'; ctx.font = '11px system-ui'; ctx.fillStyle = night ? 'rgba(255,255,255,.7)' : 'rgba(20,30,50,.6)'; ctx.fillText('Hoger bouwen mag met ' + stars(up), (L + Rr) / 2, -(mf + 1) * FH - 6); }
  const down = nextStar(MINF, m => m < nf);
  if (down) { ctx.textAlign = 'center'; ctx.font = '11px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('Dieper graven mag met ' + stars(down), (L + Rr) / 2, -nf * FH + 14); }

  // lege vloeren, kamers
  const lo = Math.floor(-vy1 / FH) - 1, hi = Math.floor(-vy0 / FH) + 1;
  for (const k in G.slabs) {
    if (grid.has(k) || tgrid.has(k)) continue;
    const i = k.indexOf(','), f = +k.slice(0, i), x = +k.slice(i + 1);
    if (f < lo || f > hi) continue;
    ART.empty(ctx, x * U, -(f + 1) * FH, U, FH);
  }
  const vis = G.rooms.filter(r => r.f >= lo && r.f <= hi).sort((a, b) => !!T[a.type].transport - !!T[b.type].transport);
  for (const r of vis) {
    const t = T[r.type], x = r.x * U, y = -(r.f + 1) * FH, w = t.w * U;
    ART[r.type](ctx, x, y, w, FH, night ? (r.inside > 0 || r.type === 'lobby' ? 2 : 1) : 0, grid.has(key(r.f, r.x)) || grid.has(key(r.f, r.x + 1)), r);
    if (r.dirty) { R(ctx, 'rgba(120,85,30,.4)', x, y + 3, w, FH - 3); ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🧹', x + w / 2, y + 22); }
    if (!t.transport) {
      const n = Math.min(r.inside, Math.floor(w / 9));
      for (let i = 0; i < n; i++) drawPerson(ctx, x + (i + 0.5) * w / n + ((i * 7) % 5) - 2, y + FH - 1, '#3b4252');
      if (night && r.inside === 0 && r.type !== 'lobby' && !t.util) R(ctx, 'rgba(8,12,40,.38)', x, y, w, FH);
      if (t.pop || t.pay || t.util) {
        if (!ok(r)) {
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x + w - 9, y + 11, 6.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', x + w - 9, y + 15);
        } else if (t.pop || t.pay) {
          ctx.fillStyle = r.rating >= 75 ? '#37b24d' : r.rating >= 45 ? '#f59f00' : '#e03131';
          ctx.beginPath(); ctx.arc(x + w - 6, y + 8, 3, 0, 7); ctx.fill();
        }
      }
    }
    if (r === selected) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1, y + 1, w - 2, FH - 2); }
  }
  for (const s of shafts) {
    if (s.top === s.bot) {
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(s.x * U + U, -(s.bot + 1) * FH + 12, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', s.x * U + U, -(s.bot + 1) * FH + 16);
    } else s.cars.forEach((c, i) => drawCar(ctx, s.x * U, -(c.y + 1) * FH, s.type, c.pass.length, c.door > 0, i, s.cars.length));
  }

  // mensen
  const qn = new Map();
  for (const p of people) {
    if (p.st === 'in' || p.st === 'out' || p.st === 'ride') continue;
    let px = p.x * U, fy = p.f;
    if (p.climb > 0) fy = p.f + (p.leg.to - p.f) * p.climb;
    if (p.st === 'wait') { const k = p.leg.sh.x + ':' + p.f, i = qn.get(k) || 0; qn.set(k, i + 1); px -= Math.min(i, 14) * 5; }
    if (px < vx0 - 10 || px > vx1 + 10) continue;
    drawPerson(ctx, px, -fy * FH - 1, p.kind === 'cleaner' ? '#1c7ed6' : stressCol(p.stress));
  }

  for (const r of vis) if (r.type === 'heli' || r.type === 'airport') drawFlyer(ctx, r);

  // schaduwstuk onder de muis
  const g = (running && hover) ? ghostFor(hover) : null;
  if (g) {
    const t = T[g.type], x = g.x * U, y = -(g.f + 1) * FH, w = t.w * U;
    ctx.globalAlpha = 0.75; ART[g.type](ctx, x, y, w, FH, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = g.why ? 'rgba(224,49,49,.4)' : 'rgba(55,178,77,.25)'; ctx.fillRect(x, y, w, FH);
    ctx.strokeStyle = g.why ? '#e03131' : '#2b8a3e'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, FH);
  }
  if (tool === 'demolish' && hover) {
    const r = pick(hover);
    if (r && r.type !== 'lobby') { ctx.fillStyle = 'rgba(224,49,49,.45)'; ctx.fillRect(r.x * U, -(r.f + 1) * FH, T[r.type].w * U, FH); }
  }

  for (const f of floats) {
    ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.strokeText(f.txt, f.x, f.y - f.t * 26);
    ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y - f.t * 26);
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── 7. Bediening en schermen ─────────────────────────
let audioCtx = null, lastCoin = 0;
function sfx(name) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    if (name === 'coin') { if (now - lastCoin < 0.12) return; lastCoin = now; }
    const notes = { build: [[330, 0, .08], [494, .07, .1]], demo: [[160, 0, .15]], error: [[140, 0, .16]], click: [[520, 0, .04]],
                    coin: [[1175, 0, .05]], star: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[name];
    for (const [fq, at, len] of notes) {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = name === 'error' || name === 'demo' ? 'sawtooth' : 'triangle'; o.frequency.value = fq;
      const v = name === 'coin' ? 0.035 : 0.09;
      gn.gain.setValueAtTime(v, now + at); gn.gain.exponentialRampToValueAtTime(0.001, now + at + len);
      o.connect(gn); gn.connect(audioCtx.destination); o.start(now + at); o.stop(now + at + len + 0.02);
    }
  } catch (e) { /* geen geluid beschikbaar */ }
}

function toast(txt, cls) {
  const el = document.createElement('div');
  el.className = 'toast ' + (cls || ''); el.textContent = txt;
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, cls === 'star' ? 5000 : 3000);
}

function setTool(t) {
  if (T[t] && T[t].star > G.stars) { toast('🔒 ' + T[t].name + ' komt vrij bij ' + stars(T[t].star)); sfx('error'); return; }
  tool = t; stroke = null;
  if (t !== 'select') select(null);
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.tool === t);
  cv.style.cursor = t === 'select' ? 'grab' : 'crosshair';
  updHint();
}

function buildToolbar() {
  const box = $('tools'); box.innerHTML = '';
  const add = (id, name, sub, icon, k) => {
    const b = document.createElement('button');
    b.className = 'tool'; b.dataset.tool = id;
    b.innerHTML = '<span class="key">' + k + '</span>';
    if (typeof icon === 'string') { const s = document.createElement('span'); s.className = 'ic'; s.textContent = icon; b.appendChild(s); }
    else b.appendChild(icon);
    b.insertAdjacentHTML('beforeend', '<span class="n">' + name + '</span><span class="c">' + sub + '</span>');
    b.addEventListener('click', () => { sfx('click'); setTool(id); });
    box.appendChild(b);
    return b;
  };
  add('select', 'Kijken', 'info', '👆', 'Esc');
  TOOLS.forEach((id, i) => {
    const t = T[id], ic = document.createElement('canvas');
    ic.width = 128; ic.height = 72;
    const c = ic.getContext('2d'), w = t.w * U, s = Math.min(120 / w, 64 / FH);
    c.translate(64 - w * s / 2, 36 - FH * s / 2); c.scale(s, s);
    ART[id](c, 0, 0, w, FH, 0);
    if (t.lift) drawCar(c, 0, 0, id, 0, false);
    const locked = t.star > G.stars;
    const b = add(id, t.name, locked ? '🔒 ' + stars(t.star) : euro(t.cost), ic, i < 9 ? i + 1 : i === 9 ? '0' : '');
    b.title = t.desc; b.classList.toggle('locked', locked);
    if (i === 0) b.classList.add('sep');
  });
  add('land', 'Grond kopen', euro(landCost()), '🏷️', 'G').classList.add('sep');
  add('demolish', 'Slopen', 'helft terug', '🔨', 'X');
  setTool(tool);
}

function updHint() {
  const el = $('hint'); let txt, bad = false;
  if (tool === 'select') {
    const r = pick(hover);
    txt = r ? T[r.type].name + ' · ' + floorName(r.f) + ' · klik voor info' : 'Sleep om rond te kijken · scroll om te zoomen · klik op een kamer voor info';
  } else if (tool === 'land') {
    const pl = hover ? plotOf(hover.u) : -1, why = landWhy(pl);
    if (hover && why) { txt = '⛔ ' + why; bad = true; }
    else txt = hover ? '🏷️ Klik om dit stuk grond te kopen voor ' + euro(landCost()) : '🏷️ Klik op een bordje TE KOOP naast je toren. Elk stuk maakt je bouwterrein ' + PW + ' vakjes breder.';
  } else if (tool === 'demolish') {
    const r = pick(hover);
    if (r && r.type === 'lobby') { txt = 'De lobby kun je niet slopen'; bad = true; }
    else txt = r ? '🔨 ' + T[r.type].name + ' slopen: je krijgt ' + euro(T[r.type].cost / 2) + ' terug' : '🔨 Klik op iets om het te slopen. Vergist? Druk op ↩️';
  } else {
    const t = T[tool], g = ghostFor(hover);
    if (g && g.why) { txt = '⛔ ' + g.why; bad = true; }
    else txt = t.name + ' · ' + (g ? euro(costOf(tool, g.f, g.x)) : euro(t.cost)) + ' · ' + t.desc;
  }
  el.textContent = txt; el.classList.toggle('bad', bad);
}

// Grond kopen: alleen het kavel direct links of rechts van je terrein.
function landWhy(pl) {
  if (pl < 0 || pl >= W / PW) return 'Verder kun je niet kopen: dit is het eind van de stad';
  if (pl >= G.lo && pl <= G.hi) return 'Deze grond is al van jou';
  if (pl !== G.lo - 1 && pl !== G.hi + 1) return 'Koop eerst de grond die ertussen ligt';
  if (G.money < landCost()) return 'Te weinig geld: dit stuk grond kost ' + euro(landCost());
  return null;
}
function buyLand(pl) {
  const why = landWhy(pl);
  if (why) { sfx('error'); toast('⛔ ' + why, 'bad'); return; }
  const c = landCost();
  G.money -= c; G.bought = (G.bought || 0) + 1;
  if (pl < G.lo) G.lo = pl; else G.hi = pl;
  floats.push({ x: (pl + 0.5) * PW * U, y: -40, txt: '-' + euro(c), col: '#ffb3b3', t: 0 });
  for (let f = FMIN; f <= TOP; f++) fillGaps(f);
  rebuild(); sfx('star'); save();
  toast('🏷️ Gekocht! Je bouwterrein is nu ' + (rx() - lx()) + ' vakjes breed.', 'good');
  buildToolbar();
}

function select(r) {
  selected = r;
  $('info').classList.toggle('hidden', !r);
  if (r) updInfo();
}

// Tijdens het indrukken van een knop het paneel niet opnieuw opbouwen: anders verdwijnt de knop
// onder de vinger en gaat de klik verloren.
let infoHold = false;
function updInfo() {
  const r = selected; if (!r || infoHold) return;
  if (!byId.has(r.id)) { select(null); return; }
  const t = T[r.type], el = $('info');
  let h = '<button class="x" data-a="close">✕</button><h3>' + t.name + '</h3><div class="sub">' + floorName(r.f) + '</div>';
  if (t.lift) {
    const s = shafts.find(s => s.x === r.x && s.type === r.type && r.f >= s.bot && r.f <= s.top);
    if (s.top === s.bot) h += '<p class="warn">⚠️ Deze lift is maar 1 verdieping hoog en gaat dus nergens heen. Kies ' + t.name + ' en klik erboven of eronder.</p>';
    else {
      const n = s.cars.length, mx = maxCars(s);
      h += '<p>Rijdt van ' + floorName(s.bot) + ' tot ' + floorName(s.top) + '.</p><p>🛗 Cabines: <b>' + n + '</b> van ' + mx + ' (elk ' + t.cap + ' mensen)</p><p>🔧 Onderhoud: ' + euro(n * t.upkeep) + ' per dag</p>' +
        '<p>👥 In de lift: ' + s.cars.reduce((a, c) => a + c.pass.length, 0) + '</p><p>⏳ Wachtend: ' + s.queue.length + '</p>' +
        (s.queue.length > t.cap * n * 2 ? '<p class="warn">Het is hier te druk. ' + (n < mx ? 'Koop een extra cabine.' : 'Bouw er een lift naast.') + '</p>' : '') +
        '<div class="act">' + (n < mx ? '<button class="btn green" data-a="car+">➕ Extra cabine (' + euro(t.shaft) + ')</button>' : mx < MAX_CARS ? '<p>Maak de lift langer voor meer cabines.</p>' : '') +
        (n > 1 ? '<button class="btn" data-a="car-">➖ Cabine weghalen (+' + euro(t.shaft / 2) + ')</button>' : '') + '</div>';
    }
    h += '<div class="act"><button class="btn red" data-a="demo">🔨 Dit stuk slopen</button><button class="btn red" data-a="demoall">🔨 Hele lift slopen</button></div>';
  } else {
    if (r.type === 'stairs') h += '<p>Verbindt ' + floorName(r.f) + ' met ' + floorName(r.f + 1) + '.</p>';
    else if (r.type === 'lobby') h += '<p>' + t.desc + ' Hier komen alle mensen binnen.</p>';
    else if (!ok(r)) h += '<p class="warn">⚠️ Niemand kan hier komen. Zet een trap of lift vast aan dit stuk vloer.</p>';
    else if (t.util) {
      h += '<p>' + t.desc + '</p>';
      if (r.type === 'garage') h += '<p>🚗 Bezet: ' + (r.used || 0) + ' van ' + t.spots + ' plekken</p>';
      if (t.hourly || LAND_T[r.type]) h += '<p>💰 Vandaag verdiend: ' + euro(r.earned) + '</p>';
      if (r.type === 'vault') h += '<p>💰 Rente vannacht: ' + euro(r.rente || 0) + '</p>';
    } else {
      const face = r.rating >= 75 ? '😀' : r.rating >= 45 ? '😐' : '😡';
      h += '<p>' + face + ' Tevreden: <b>' + Math.round(r.rating) + '%</b></p>';
      if (r.rating < 75) h += '<p class="warn">' + (r.cause === 'stairs' ? 'Mensen moeten te veel trappen lopen. Bouw een lift.' : 'Mensen wachten te lang op de lift. Klik op de lift voor een extra cabine, of bouw een lift erbij.') + '</p>';
      if (r.dirty) h += '<p class="warn">🧹 Deze kamer is vies. Er komt pas een nieuwe gast als hij is schoongemaakt' + (cnt('clean') ? '.' : ': bouw een Schoonmaak.') + '</p>';
      h += '<p>' + t.desc + '</p>';
      if (t.open) h += '<p>🕗 Open van ' + t.open[0] + ' tot ' + t.open[1] + ' uur' + (isOpen(r) ? '' : ' (nu dicht)') + '</p>';
      h += '<p>👥 Nu binnen: ' + r.inside + '</p><p>💰 Vandaag verdiend: ' + euro(r.earned) + '</p>';
    }
    if (r.type !== 'lobby') h += '<div class="act"><button class="btn red" data-a="demo">🔨 Slopen (+' + euro(t.cost / 2) + ')</button></div>';
  }
  if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
}

$('info').addEventListener('pointerdown', () => { infoHold = true; });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => setTimeout(() => { infoHold = false; }, 0));
$('info').addEventListener('click', e => {
  const a = e.target.dataset.a, r = selected;
  if (!a || !r) return;
  if (a === 'close') select(null);
  if (a === 'demo') demolish([r]);
  if (a === 'car+' || a === 'car-') { const s = shafts.find(s => s.x === r.x && s.type === r.type && r.f >= s.bot && r.f <= s.top); if (s) changeCars(s, a === 'car+' ? 1 : -1); }
  if (a === 'demoall') demolish(G.rooms.filter(q => q.type === r.type && q.x === r.x && shafts.some(s => s.x === r.x && s.type === r.type && r.f >= s.bot && r.f <= s.top && q.f >= s.bot && q.f <= s.top)));
});

function updHud() {
  $('s-money').textContent = euro(G.money);
  $('s-today').textContent = G.today ? '+' + euro(G.today) + ' vandaag' : '';
  const m = Math.floor(G.min);
  $('s-time').textContent = 'Dag ' + G.day + ' · ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  $('s-stars').textContent = stars(G.stars);
  if (G.stars < MAX_STARS) {
    const a = STAR_POP[G.stars - 1], b = STAR_POP[G.stars];
    $('s-bar').style.width = clamp((pop - a) / (b - a) * 100, 0, 100) + '%';
    $('s-pop').textContent = '👥 ' + pop + '/' + b;
  } else { $('s-bar').style.width = '100%'; $('s-pop').textContent = '👥 ' + pop; }
  $('s-mood').textContent = Math.round(mood) + '%';
  $('s-face').textContent = mood >= 75 ? '😀' : mood >= 45 ? '😐' : '😡';
  $('b-undo').disabled = !undo.length;
  for (const b of document.querySelectorAll('.tool')) {
    const t = T[b.dataset.tool];
    if (t) b.classList.toggle('poor', t.star <= G.stars && G.money < t.cost);
  }
  updMission(); updInfo(); updHint();
}

function updMission() {
  const el = $('mission'), m = MISSIONS.find(m => !G.done.includes(m.id));
  let want = null, h;
  if (!m) h = '<div class="k">Alle opdrachten gehaald</div><div class="t">🏆 Jij bent de beste torenbouwer!</div><div class="h">Bouw gerust verder.</div>';
  else {
    const n = Math.min(m.g, Math.floor(m.n()));
    if (n >= m.g) {
      G.done.push(m.id);
      if (m.r) { G.money += m.r; toast('✅ Opdracht gehaald! Beloning: ' + euro(m.r), 'good'); } else toast('✅ Opdracht gehaald!', 'good');
      sfx('star'); save();
      return updMission();
    }
    want = m.tool;
    const k = MISSIONS.filter(q => G.done.includes(q.id)).length + 1;
    h = '<div class="k">🎯 Opdracht ' + k + ' van ' + MISSIONS.length + '</div><div class="t">' + m.t + '</div><div class="h">' + m.h + '</div>' +
        '<div class="p"><span class="bar"><i style="width:' + (n / m.g * 100) + '%"></i></span><span>' + (m.euro ? euro(n) : n + '/' + m.g) + (m.r ? ' · 🎁 ' + euro(m.r) : '') + '</span></div>';
  }
  if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('want', b.dataset.tool === want && tool !== want);
}

function setSpeed(i) {
  speedIdx = i;
  for (const b of document.querySelectorAll('.speed button')) b.classList.toggle('on', +b.dataset.speed === i);
}

function modal(html) { $('modal').innerHTML = html; $('overlay').classList.remove('hidden'); }
function closeModal() { $('overlay').classList.add('hidden'); }

const HELP = '<ul>' +
  '<li>🏗️ <b>Bouwen:</b> kies iets in de balk onderaan en klik in de toren. Sleep om meer achter elkaar te bouwen.</li>' +
  '<li>🪜 <b>Omhoog:</b> elke verdieping heeft een trap of lift nodig. Een lift maak je langer door omhoog te slepen. Trappen en liften mogen over kamers heen.</li>' +
  '<li>💰 <b>Geld:</b> mensen betalen als ze aankomen. Blije mensen betalen het meest.</li>' +
  '<li>🔴 <b>Rode poppetjes</b> wachten te lang. Klik op de lift voor een extra cabine, of bouw een lift erbij.</li>' +
  '<li>⭐ <b>Sterren:</b> meer inwoners geeft sterren. Daarmee mag je hoger bouwen en krijg je nieuwe kamers.</li>' +
  '<li>🚇 <b>Onder de grond</b> passen winkels, een parkeergarage en een metrostation. Kantoren en woningen hebben daglicht nodig.</li>' +
  '<li>🏷️ <b>Grond kopen:</b> klik op een bordje TE KOOP naast je toren. Dan kun je breder bouwen.</li>' +
  '<li>🚁 <b>Op het dak</b> passen zonnepanelen, een helikopterplatform en later zelfs een vliegveld. Daarboven kan niets meer.</li>' +
  '<li>🔍 <b>Rondkijken:</b> scroll om in en uit te zoomen. Schuiven: slepen met de rechtermuisknop, WASD of pijltjes, de muis tegen de rand, of klik op de minikaart.</li>' +
  '<li>↩️ <b>Vergist?</b> Druk op de pijl of Ctrl+Z.</li></ul>';

function showStart() {
  modal('<h1>🏗️ SimToren</h1><p>Bouw de hoogste toren van Nederland!</p>' + HELP +
    '<div class="row">' + (hasSave() ? '<button class="btn green big" data-a="continue">▶ Verder spelen</button>' : '') +
    '<button class="btn big ' + (hasSave() ? '' : 'green') + '" data-a="new">✨ Nieuw spel</button></div>');
}

$('overlay').addEventListener('click', e => {
  const a = e.target.dataset.a;
  if (!a) return;
  sfx('click');
  if (a === 'continue') { if (!load()) newGame(); start(); }
  if (a === 'new') { if (hasSave() && !e.target.dataset.sure) return modal('<h2>Nieuw spel beginnen?</h2><p>Je oude toren wordt dan weggegooid.</p><div class="row"><button class="btn red big" data-a="new" data-sure="1">Ja, opnieuw</button><button class="btn big" data-a="back">Nee, terug</button></div>'); newGame(); start(); }
  if (a === 'back') { if (running) closeModal(); else showStart(); }
  if (a === 'close') closeModal();
});

function start() {
  closeModal();
  running = true;
  tool = 'select';
  buildToolbar(); setSpeed(speedIdx || 1);
  $('b-sound').textContent = muted ? '🔇' : '🔊';
  homeView(); updHud();
}

// ── muis, vinger, toetsen ──
const ptrs = new Map();
let drag = null, spaceDown = false;

function setHover(e) {
  const wx = (e.clientX - cw / 2) / cam.z + cam.x, wy = (e.clientY - ch / 2) / cam.z + cam.y;
  hover = { u: Math.floor(wx / U), f: Math.floor(-wy / FH) };
}

function tryPlace(loud) {
  const g = ghostFor(hover);
  if (!g) return;
  if (g.why) { if (loud) { sfx('error'); toast('⛔ ' + g.why, 'bad'); } return; }
  const { r, c } = place(g.type, g.f, g.x);
  stroke.ids.push(r.id); stroke.cost += c;
  if (T[g.type].lift) { stroke.x = g.x; stroke.lastF = g.f; }
}

function endStroke() {
  if (stroke && stroke.ids.length) { undo.push({ k: 'build', ids: stroke.ids, cost: stroke.cost }); if (undo.length > 30) undo.shift(); save(); }
  stroke = null;
}

function clickAt() {
  if (!hover) return;
  if (tool === 'land') buyLand(plotOf(hover.u));
  else if (tool === 'demolish') {
    const r = pick(hover);
    if (r && r.type === 'lobby') { sfx('error'); toast('De lobby kun je niet slopen', 'bad'); }
    else if (r) demolish([r]);
  } else if (tool === 'select') {
    const r = pick(hover), pl = plotOf(hover.u);
    select(r || null); if (r) sfx('click');
    else if ((pl === G.lo - 1 || pl === G.hi + 1) && hover.f >= -1 && hover.f <= 2) buyLand(pl);   // klik op een bordje TE KOOP
  } else { stroke = { ids: [], cost: 0, x: null, lastF: 0 }; tryPlace(true); endStroke(); }
}

cv.addEventListener('pointerdown', e => {
  if (!running) return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    endStroke();
    const [a, b] = [...ptrs.values()];
    drag = { k: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: cam.x, cy: cam.y };
    hover = null; return;
  }
  setHover(e);
  if (e.button !== 0 || spaceDown || tool === 'select') {
    drag = { k: 'pan', x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, btn: e.button };
    if (tool === 'select') cv.style.cursor = 'grabbing';
  } else if (e.pointerType === 'touch' || tool === 'demolish' || tool === 'land') drag = { k: 'tap' };
  else { drag = { k: 'stroke' }; stroke = { ids: [], cost: 0, x: null, lastF: 0 }; tryPlace(true); }
});

let mouse = null;   // muispositie op het speelveld, voor schuiven aan de rand
cv.addEventListener('pointermove', e => {
  if (!running) return;
  mouse = e.pointerType === 'mouse' ? { x: e.clientX, y: e.clientY } : null;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (drag && drag.k === 'pinch' && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.z = clamp(drag.z * d / drag.d, ZMIN, ZMAX);
    cam.x = drag.cx + (drag.mx - cw / 2) / drag.z - (mx - cw / 2) / cam.z;
    cam.y = drag.cy + (drag.my - ch / 2) / drag.z - (my - ch / 2) / cam.z;
    clampCam(); return;
  }
  if (drag && drag.k === 'pan') {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); }
    return;
  }
  if (drag && drag.k === 'none') return;
  setHover(e);
  if (drag && drag.k === 'stroke' && stroke) {
    if (stroke.x !== null) {
      // lift: vul alle verdiepingen tussen de vorige en de muis
      const step = Math.sign(hover.f - stroke.lastF);
      while (step && stroke.lastF !== hover.f) {
        const f = stroke.lastF + step;
        if (whyNot(tool, f, stroke.x)) break;
        const { r, c } = place(tool, f, stroke.x);
        stroke.ids.push(r.id); stroke.cost += c; stroke.lastF = f;
      }
    } else tryPlace(false);
  }
});

function pointerEnd(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  const d = drag;
  if (d && d.k === 'pinch') { drag = ptrs.size ? { k: 'none' } : null; return; }
  drag = ptrs.size ? drag : null;
  if (!d || e.type === 'pointercancel') { endStroke(); return; }
  if (d.k === 'pan') {
    if (tool === 'select') cv.style.cursor = 'grab';
    if (!d.moved) { if (d.btn === 2) setTool('select'); else if (d.btn === 0 && !spaceDown) clickAt(); }
  } else if (d.k === 'tap') clickAt();
  else if (d.k === 'stroke') endStroke();
  if (e.pointerType === 'touch') hover = null;
}
cv.addEventListener('pointerup', pointerEnd);
cv.addEventListener('pointercancel', pointerEnd);
cv.addEventListener('pointerleave', () => { mouse = null; if (!drag) hover = null; });
cv.addEventListener('contextmenu', e => e.preventDefault());

function zoomAt(f, sx, sy) {
  const wx = (sx - cw / 2) / cam.z + cam.x, wy = (sy - ch / 2) / cam.z + cam.y;
  cam.z = clamp(cam.z * f, ZMIN, ZMAX);
  cam.x = wx - (sx - cw / 2) / cam.z; cam.y = wy - (sy - ch / 2) / cam.z;
  clampCam();
}
cv.addEventListener('wheel', e => {
  e.preventDefault();
  if (!running) return;
  // scrollwiel = in- en uitzoomen bij de muis; shift + scroll of zijwaarts vegen = opzij schuiven
  const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY, dx = e.deltaMode === 1 ? e.deltaX * 33 : e.deltaX;
  if (e.shiftKey) { cam.x += (dx || dy) / cam.z; clampCam(); }
  else {
    if (dx) { cam.x += dx / cam.z; clampCam(); }
    if (dy) zoomAt(Math.exp(-clamp(dy, -120, 120) * (e.ctrlKey ? 0.01 : 0.004)), e.clientX, e.clientY);
  }
}, { passive: false });

document.addEventListener('keydown', e => {
  if (!running || !$('overlay').classList.contains('hidden')) { if (e.key === 'Escape' && running) closeModal(); return; }
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'escape') setTool('select');
  else if (k === ' ') { e.preventDefault(); if (!e.repeat) { spaceDown = true; } }
  else if (k === 'p') setSpeed(speedIdx ? 0 : 1);
  else if (k === 'x') setTool('demolish');
  else if (k === 'g') setTool('land');
  else if ('wasd'.includes(k)) keysDown.add(k);
  else if (k >= '0' && k <= '9') setTool(TOOLS[k === '0' ? 9 : +k - 1]);
  else if (k === 'h') homeView();
  else if (k === '+' || k === '=') zoomAt(1.25, cw / 2, ch / 2);
  else if (k === '-') zoomAt(0.8, cw / 2, ch / 2);
  else if (k.startsWith('arrow')) { keysDown.add(k); e.preventDefault(); }
  else if ((k === 'delete' || k === 'backspace') && selected) demolish([selected]);
});
let spaceAt = 0;
document.addEventListener('keydown', e => { if (e.key === ' ' && !e.repeat) spaceAt = performance.now(); });
const keysDown = new Set();
window.addEventListener('blur', () => keysDown.clear());
document.addEventListener('keyup', e => {
  keysDown.delete(e.key.toLowerCase());
  if (e.key !== ' ') return;
  spaceDown = false;
  // kort tikken op spatie = pauze, ingedrukt houden = slepen
  if (running && performance.now() - spaceAt < 250 && !drag) setSpeed(speedIdx ? 0 : 1);
});

for (const b of document.querySelectorAll('.speed button')) b.addEventListener('click', () => { sfx('click'); setSpeed(+b.dataset.speed); });
$('b-undo').addEventListener('click', doUndo);
$('b-sound').addEventListener('click', () => { muted = !muted; $('b-sound').textContent = muted ? '🔇' : '🔊'; sfx('click'); save(); });
$('b-help').addEventListener('click', () => modal('<h2>Zo werkt het</h2>' + HELP + '<div class="row"><button class="btn green big" data-a="close">Oké!</button></div>'));
$('b-menu').addEventListener('click', () => modal('<h2>Menu</h2><p>Je spel wordt vanzelf opgeslagen.</p><div class="row"><button class="btn green big" data-a="close">▶ Verder spelen</button><button class="btn big" data-a="new">✨ Nieuw spel</button></div><div class="row"><a class="btn" href="index.html">← Terug naar TobyGames</a></div>'));
$('z-in').addEventListener('click', () => zoomAt(1.25, cw / 2, ch / 2));
$('z-out').addEventListener('click', () => zoomAt(0.8, cw / 2, ch / 2));
$('z-home').addEventListener('click', homeView);
window.addEventListener('resize', () => { const old = cw; resize(); if (G && Math.abs(cw - old) > 100) homeView(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && running) save(); });
window.addEventListener('pagehide', () => { if (running) save(); });

// ── minikaart: de hele stad in het klein. Klik of sleep om er naartoe te gaan. ──
const mini = $('mini'), mctx = mini.getContext('2d'), MW = 220, MH = 132;
const WY0 = -(TOP + 1) * FH, WY1 = -FMIN * FH;
const mX = wx => wx / (W * U) * MW, mY = wy => (wy - WY0) / (WY1 - WY0) * MH;
const MCOL = { lobby: '#c9a227', office: '#74c0fc', apartment: '#ffa94d', shop: '#69db7c', restaurant: '#ff8787', hotel: '#b197fc',
  cinema: '#868e96', garage: '#adb5bd', metro: '#e8590c', clean: '#63e6be', deck: '#e7f5ff', vend: '#fa5252', solar: '#364fc7',
  gym: '#f783ac', pool: '#4dabf7', heli: '#fcc419', vault: '#ffd43b', aquarium: '#1971c2', coaster: '#e03131', airport: '#f8f9fa' };
function setupMini() {
  const d = Math.min(2, window.devicePixelRatio || 1);
  mini.width = MW * d; mini.height = MH * d; mini.style.width = MW + 'px'; mini.style.height = MH + 'px';
  mctx.setTransform(d, 0, 0, d, 0, 0);
}
function drawMini() {
  if (cw < 720) return;   // op een telefoon is de minikaart verborgen
  const c = mctx, gy = mY(0);
  R(c, '#5aa9e6', 0, 0, MW, gy); R(c, '#6e523c', 0, gy, MW, MH - gy);
  R(c, 'rgba(255,255,255,.18)', mX(lx() * U), mY(-(maxFloor() + 1) * FH), mX((rx() - lx()) * U), mY(-minFloor() * FH) - mY(-(maxFloor() + 1) * FH));
  R(c, '#3f9b52', 0, gy - 1, MW, 2);
  for (const r of G.rooms) {
    const t = T[r.type];
    if (t.transport) continue;
    const x = mX(r.x * U), y = mY(-(r.f + 1) * FH);
    R(c, MCOL[r.type] || '#ccc', x, y, Math.max(1, mX(t.w * U) - 0.3), Math.max(1, mY(FH) - mY(0) - 0.3));
  }
  for (const sh of shafts) R(c, sh.type === 'xlift' ? '#ffd24a' : '#343a40', mX(sh.x * U), mY(-(sh.top + 1) * FH), Math.max(1, mX(2 * U)), mY(-sh.bot * FH) - mY(-(sh.top + 1) * FH));
  const vx0 = cam.x - cw / 2 / cam.z, vy0 = cam.y - ch / 2 / cam.z;
  c.strokeStyle = '#fff'; c.lineWidth = 1.5;
  c.strokeRect(mX(vx0), mY(vy0), mX(cw / cam.z), mY(vy0 + ch / cam.z) - mY(vy0));
}
let miniDrag = false;
function miniGo(e) {
  const b = mini.getBoundingClientRect(), fx = (e.clientX - b.left) / b.width, fy = (e.clientY - b.top) / b.height;
  cam.x = fx * W * U; cam.y = WY0 + fy * (WY1 - WY0); clampCam();
}
mini.addEventListener('pointerdown', e => { if (!running) return; miniDrag = true; try { mini.setPointerCapture(e.pointerId); } catch (err) { } miniGo(e); });
mini.addEventListener('pointermove', e => { if (miniDrag) miniGo(e); });
for (const ev of ['pointerup', 'pointercancel']) mini.addEventListener(ev, () => { miniDrag = false; });
mini.addEventListener('wheel', e => { e.preventDefault(); }, { passive: false });

// ───────────────────────── 8. Spellus ─────────────────────────
let lastHour = -1;
const LAND_T = { heli: 8, airport: 10 };   // spelminuten tot het toestel aan de grond staat
function step(dt) {
  const h = G.min / 60;
  const quiet = active === 0 && (h >= 22.5 || h < 5.5);   // 's nachts doorspoelen als iedereen slaapt
  const dmin = dt * MIN_PER_SEC * (quiet ? 10 : 1);
  G.min += dmin;
  if (G.min >= 1440) { G.min -= 1440; G.day++; newDay(); }
  const hr = Math.floor(G.min / 60);
  if (hr !== lastHour) {
    lastHour = hr;
    if (hr >= 8 && hr < 20) for (const r of G.rooms) if (T[r.type].hourly && ok(r)) {
      const v = T[r.type].hourly; G.money += v; G.today += v; r.earned += v;
      if (rnd() < 0.25) floatAt(r, '+' + euro(v), '#8df0a5');
    }
    // helikopters om de twee uur, vliegtuigen elk uur
    for (const r of G.rooms) {
      if (!ok(r)) continue;
      let v = 0;
      if (r.type === 'heli' && hr >= 8 && hr <= 20 && (hr + r.id) % 2 === 0) v = Math.round(4000 * (0.5 + mood / 200));
      if (r.type === 'airport' && hr >= 7 && hr <= 22) v = Math.round(30000 * (0.5 + mood / 200));
      if (!v) continue;
      r.land = absNow(); r.landPay = v;
    }
  }
  for (const r of G.rooms) if (r.landPay && absNow() - r.land >= LAND_T[r.type]) {   // geld bij het neerkomen
    const v = r.landPay; r.landPay = 0;
    G.money += v; G.today += v; r.earned += v; floatAt(r, '+' + euro(v), '#8df0a5'); sfx('coin');
  }
  if (G.today > (G.best || 0)) G.best = G.today;
  spawnVisitors(dmin);
  active = 0;
  for (let i = 0; i < people.length; i++) updPerson(people[i], dt);
  for (const s of shafts) updShaft(s, dt);
}

function checkProgress() {
  let sum = 0, n = 0;
  for (const r of G.rooms) if (T[r.type].pop && r.type !== 'lobby') { sum += ok(r) ? r.rating : 0; n++; }
  mood = n ? sum / n : 100;
  while (G.stars < MAX_STARS && pop >= STAR_POP[G.stars]) {
    G.stars++;
    const fresh = TOOLS.filter(t => T[t].star === G.stars).map(t => T[t].name);
    toast(stars(G.stars) + ' Nieuwe ster!' + (fresh.length ? ' Nieuw: ' + fresh.join(', ') + '.' : '') + ' Je mag nu bouwen van ' + floorName(minFloor()) + ' tot verdieping ' + maxFloor() + '.', 'star');
    sfx('star'); buildToolbar(); save();
  }
  if (!G.won && cnt('deck')) {
    G.won = true; save(); sfx('star');
    modal('<h1>🏆 Gefeliciteerd!</h1><p>Je hebt de hoogste toren van Nederland gebouwd, in ' + G.day + ' dagen.</p><p>Er wonen en werken ' + pop + ' mensen.</p><p>Maar het kan nóg groter: koop grond, haal ⭐⭐⭐⭐⭐⭐⭐ en bouw een vliegveld op het dak!</p><div class="row"><button class="btn green big" data-a="close">Verder bouwen</button></div>');
  }
}

// Schuiven met WASD/pijltjes, of door de muis tegen de rand van het scherm te houden.
const EDGE = 18;
function panCam(dt) {
  let vx = 0, vy = 0;
  if (keysDown.has('a') || keysDown.has('arrowleft')) vx--;
  if (keysDown.has('d') || keysDown.has('arrowright')) vx++;
  if (keysDown.has('w') || keysDown.has('arrowup')) vy--;
  if (keysDown.has('s') || keysDown.has('arrowdown')) vy++;
  if (mouse && !drag && document.hasFocus()) {
    if (mouse.x < EDGE) vx--; else if (mouse.x > cw - EDGE) vx++;
    if (mouse.y < EDGE) vy--; else if (mouse.y > ch - EDGE) vy++;
  }
  if (!vx && !vy) return;
  cam.x += clamp(vx, -1, 1) * 700 * dt / cam.z; cam.y += clamp(vy, -1, 1) * 700 * dt / cam.z; clampCam();
}

let last = 0, hudT = 0, saveT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (!running) return;
  const sim = real * SPEEDS[speedIdx], n = Math.ceil(sim / 0.034);
  for (let i = 0; i < n; i++) step(sim / n);
  if (people.some(p => p.dead)) people = people.filter(p => !p.dead);
  panCam(real);
  for (const f of floats) f.t += real;
  floats = floats.filter(f => f.t < 1.4);
  hudT += real; saveT += real;
  if (hudT > 0.15) { hudT = 0; checkProgress(); updHud(); }
  if (saveT > 10) { saveT = 0; save(); }
  draw(); drawMini();
}

resize(); setupMini();
newGame();          // lege toren als achtergrond achter het startscherm
homeView(); draw();
showStart();
requestAnimationFrame(frame);
window.SimToren = { get G() { return G; }, get people() { return people; }, get shafts() { return shafts; }, T, place, whyNot, at: (f, u) => toScreen((u + 0.5) * U, -(f + 0.5) * FH),
  ff(sec) { for (let i = 0; i < sec / 0.033; i++) step(0.033); people = people.filter(p => !p.dead); checkProgress(); } };
})();
