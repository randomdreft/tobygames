// Visvijver - alle soorten, plekken en winkelspullen

export const ZONES = {
  open:    { naam: 'Open water',            emoji: '🌊' },
  diep:    { naam: 'Diep water',            emoji: '🌀' },
  riet:    { naam: 'Bij het riet',          emoji: '🌾' },
  lelies:  { naam: 'Tussen de waterlelies', emoji: '🪷' },
  steiger: { naam: 'Onder de steiger',      emoji: '🪵' },
};

export const CATS = {
  gewoon:       { naam: 'Gewone vis',   kleur: '#43a047' },
  zeldzaam:     { naam: 'Zeldzaam',     kleur: '#1e88e5' },
  legendarisch: { naam: 'Legendarisch', kleur: '#ffb300' },
  rommel:       { naam: 'Raar ding',    kleur: '#8d6e63' },
  monster:      { naam: 'Monster!',     kleur: '#9c27b0' },
};

// kg/cm = [kleinste, grootste], w = kans per plek, f = hoe hard hij vecht, waarde = euro (kleinste exemplaar)
export const SPECIES = [
  // ---- gewone vissen ----
  { id: 'voorn', naam: 'Voorn', cat: 'gewoon', kg: [0.1, 0.5], cm: [12, 30], f: 0.5, waarde: 4,
    w: { open: 30, riet: 22, lelies: 10, steiger: 10, diep: 6 },
    info: 'Zilveren visje met rode vinnen. Zwemt overal!',
    model: { type: 'vis', kleur: 0xc9d6de, vin: 0xe8552d, hoog: 0.17, dik: 0.09 } },
  { id: 'stekelbaars', naam: 'Stekelbaarsje', cat: 'gewoon', kg: [0.01, 0.03], cm: [4, 8], f: 0.4, waarde: 2,
    w: { riet: 22, open: 8, lelies: 5 },
    info: 'Piepklein, maar met stoere stekels op zijn rug.',
    model: { type: 'vis', kleur: 0x4f9fb5, vin: 0xd9482b, hoog: 0.15, dik: 0.08, stekels: 3, buik: 0xe0503a } },
  { id: 'baars', naam: 'Baars', cat: 'gewoon', kg: [0.2, 1.5], cm: [15, 45], f: 0.7, waarde: 6,
    w: { steiger: 30, open: 12, riet: 8 },
    info: 'Groen met donkere strepen. Verstopt zich graag onder de steiger.',
    model: { type: 'vis', kleur: 0x8aa83e, vin: 0xe04a2a, hoog: 0.2, dik: 0.1, strepen: 0x3d4f1e } },
  { id: 'brasem', naam: 'Brasem', cat: 'gewoon', kg: [0.5, 3], cm: [25, 60], f: 0.8, waarde: 7,
    w: { diep: 25, open: 15 },
    info: 'Een platte, hoge vis die van diep water houdt.',
    model: { type: 'vis', kleur: 0xb39a62, vin: 0x6e6248, hoog: 0.27, dik: 0.07 } },
  { id: 'zeelt', naam: 'Zeelt', cat: 'gewoon', kg: [0.4, 2.5], cm: [20, 50], f: 0.8, waarde: 8,
    w: { lelies: 25, riet: 8 },
    info: 'Olijfgroen en glibberig. Woont tussen de waterlelies.',
    model: { type: 'vis', kleur: 0x64762c, vin: 0x4a5a22, hoog: 0.2, dik: 0.11, oog: 0xff5533 } },
  { id: 'karper', naam: 'Karper', cat: 'gewoon', kg: [2, 12], cm: [35, 90], f: 1.1, waarde: 12,
    w: { lelies: 18, diep: 15, open: 8 },
    info: 'Dikke, sterke vis met kleine snorretjes.',
    model: { type: 'vis', kleur: 0xb9812f, vin: 0x8a5a1c, hoog: 0.23, dik: 0.14, snor: 0.08 } },
  { id: 'paling', naam: 'Paling', cat: 'gewoon', kg: [0.3, 2], cm: [40, 100], f: 1.0, waarde: 14,
    w: { steiger: 18, diep: 10 },
    info: 'Lang en kronkelig, net een slang onder water.',
    model: { type: 'paling', kleur: 0x45563f } },
  { id: 'snoek', naam: 'Snoek', cat: 'gewoon', kg: [1.5, 10], cm: [45, 120], f: 1.3, waarde: 18,
    w: { riet: 14, steiger: 5, open: 4 },
    info: 'De rover van de vijver, met een lange bek vol tandjes.',
    model: { type: 'vis', kleur: 0x6f9440, vin: 0xb8622a, hoog: 0.14, dik: 0.09, snuit: true, stippen: 0xd8e08a } },

  // ---- zeldzaam ----
  { id: 'snoekbaars', naam: 'Snoekbaars', cat: 'zeldzaam', kg: [1, 8], cm: [40, 100], f: 1.4, waarde: 35,
    w: { diep: 3, open: 1.5 },
    info: 'Half snoek, half baars. Jaagt in het diepe water.',
    model: { type: 'vis', kleur: 0x9aa58a, vin: 0x6b7560, hoog: 0.16, dik: 0.09, strepen: 0x4f5a48, snuit: true } },
  { id: 'spiegelkarper', naam: 'Spiegelkarper', cat: 'zeldzaam', kg: [4, 18], cm: [50, 100], f: 1.5, waarde: 45,
    w: { lelies: 3, diep: 1.5 },
    info: 'Een karper met grote glimmende schubben als spiegeltjes.',
    model: { type: 'vis', kleur: 0xc8963a, vin: 0x8a5a1c, hoog: 0.25, dik: 0.15, snor: 0.08, stippen: 0xfff2b0, stipGroot: true } },
  { id: 'koi', naam: 'Koikarper', cat: 'zeldzaam', kg: [1, 6], cm: [30, 80], f: 1.3, waarde: 60,
    w: { lelies: 2.5, open: 1 },
    info: 'Wit met oranje vlekken. Ontsnapt uit een chique tuinvijver!',
    model: { type: 'vis', kleur: 0xfaf6ee, vin: 0xf5843c, hoog: 0.21, dik: 0.12, snor: 0.06, stippen: 0xf2681c, stipGroot: true } },
  { id: 'meerval', naam: 'Meerval', cat: 'zeldzaam', kg: [5, 30], cm: [80, 180], f: 1.7, waarde: 55,
    w: { diep: 2.5, steiger: 1.5 },
    info: 'Grote grijze vis met lange snorharen.',
    model: { type: 'vis', kleur: 0x626a78, vin: 0x4a505c, hoog: 0.18, dik: 0.16, snor: 0.22, bek: true } },

  // ---- legendarisch ----
  { id: 'goudvis', naam: 'De Gouden Vis', cat: 'legendarisch', kg: [0.2, 0.8], cm: [15, 30], f: 1.5, waarde: 120,
    w: { open: 0.5, lelies: 0.6, riet: 0.4, diep: 0.4, steiger: 0.4 },
    info: 'Glimt als echt goud. Bijna niemand heeft hem ooit gezien!',
    model: { type: 'vis', kleur: 0xffc91f, vin: 0xff9d00, hoog: 0.22, dik: 0.12, gloed: 0x8a5a00, sluier: true } },
  { id: 'regenboogvis', naam: 'Regenboogvis', cat: 'legendarisch', kg: [0.5, 3], cm: [25, 60], f: 1.6, waarde: 150,
    w: { open: 0.4, riet: 0.5 },
    info: 'Heeft alle kleuren van de regenboog op zijn buik.',
    model: { type: 'vis', kleur: 0x66c8ff, vin: 0xc45cff, hoog: 0.2, dik: 0.11, regenboog: true } },
  { id: 'maanvis', naam: 'Maanvis', cat: 'legendarisch', kg: [1, 5], cm: [30, 70], f: 1.7, waarde: 200, avond: true,
    w: { diep: 0.7, open: 0.35 },
    info: 'Geeft licht in het donker. Bijt bijna alleen ’s avonds!',
    model: { type: 'vis', kleur: 0xcfe6ff, vin: 0x9cc4ff, hoog: 0.34, dik: 0.08, gloed: 0x4a78c8 } },

  // ---- rare dingen ----
  { id: 'laars', naam: 'Oude laars', cat: 'rommel', kg: [0.5, 1.2], cm: [25, 35], f: 0.5, waarde: 1,
    w: { riet: 3, steiger: 3, open: 2, lelies: 2, diep: 1 },
    info: 'Wie is hier zijn laars verloren? Hij stinkt een beetje.',
    model: { type: 'laars' } },
  { id: 'blikje', naam: 'Roestig blikje', cat: 'rommel', kg: [0.05, 0.2], cm: [10, 14], f: 0.4, waarde: 1,
    w: { open: 2, steiger: 3, riet: 2 },
    info: 'Hoort niet in de vijver. Goed dat jij het opruimt!',
    model: { type: 'blikje' } },
  { id: 'badeend', naam: 'Badeendje', cat: 'rommel', kg: [0.05, 0.1], cm: [8, 12], f: 0.4, waarde: 6,
    w: { lelies: 2, open: 1.5, riet: 1.5 },
    info: 'Kwaak! Dit eendje is weggedreven uit een badkuip.',
    model: { type: 'badeend' } },
  { id: 'fles', naam: 'Fles met briefje', cat: 'rommel', kg: [0.3, 0.6], cm: [25, 32], f: 0.5, waarde: 15,
    w: { open: 1.5, diep: 1.5, riet: 1, steiger: 1, lelies: 1 },
    info: 'Er zit een geheim briefje in!',
    model: { type: 'fles' } },
  { id: 'schatkist', naam: 'Schatkist', cat: 'rommel', kg: [8, 20], cm: [40, 60], f: 1.4, waarde: 120,
    w: { diep: 0.7, steiger: 0.5 },
    info: 'Een echte piratenschat, vol gouden munten!',
    model: { type: 'schatkist' } },

  // ---- monsters ----
  { id: 'brulbaard', naam: 'Reuzenmeerval Brulbaard', cat: 'monster', kg: [60, 120], cm: [200, 300], f: 2.3, waarde: 300,
    w: { diep: 0.5, steiger: 0.2 },
    info: 'Zo groot als een roeiboot, met een snor als een walrus.',
    model: { type: 'vis', kleur: 0x5c6480, vin: 0x444a66, hoog: 0.24, dik: 0.22, snor: 0.34, bek: true, googly: true, buik: 0xd8d2c0 } },
  { id: 'blub', naam: 'Vijvermonster Blub', cat: 'monster', kg: [150, 400], cm: [300, 600], f: 2.6, waarde: 450, avond: 'bonus',
    w: { diep: 0.5, open: 0.15 },
    info: 'Het verre neefje van Nessie. Eet het liefst pannenkoeken.',
    model: { type: 'blub' } },
  { id: 'kriebelkraak', naam: 'Inktvis Kriebelkraak', cat: 'monster', kg: [20, 60], cm: [100, 250], f: 2.4, waarde: 350,
    w: { steiger: 0.5, lelies: 0.2, diep: 0.2 },
    info: 'Acht armen om mee te kietelen. Woont onder de steiger.',
    model: { type: 'kriebelkraak' } },
];

// kans (in procent) dat de haak blijft zitten als je op tijd klikt; in het groen komt er 20 bij
const KANS = {
  voorn: 95, stekelbaars: 95, baars: 90, brasem: 90, zeelt: 85, karper: 80, paling: 80, snoek: 75,
  snoekbaars: 65, spiegelkarper: 60, koi: 60, meerval: 55,
  goudvis: 45, regenboogvis: 40, maanvis: 35,
  laars: 100, blikje: 100, badeend: 100, fles: 95, schatkist: 70,
  brulbaard: 30, blub: 25, kriebelkraak: 28,
};
for (const s of SPECIES) s.kans = KANS[s.id] ?? 80;

export const SOORT = Object.fromEntries(SPECIES.map(s => [s.id, s]));

export const BRIEFJES = [
  '“Help! Ik zit vast op een onbewoond eiland! Grapje, ik zit op de bank. Groetjes, opa.”',
  '“Wie dit leest is een supergoede visser.”',
  '“Schatkaart: loop 10 stappen, draai je om, en… de schat ligt in de vijver. Succes!”',
  '“Lieve vinder, wil je mijn badeendje terugsturen? Hij is weggezwommen.”',
  '“Geheim recept: pannenkoeken met stroop. Niet doorvertellen aan Blub!”',
  '“Hallo vanaf de overkant van de vijver! Het is hier ook nat.”',
];

export const HENGELS = [
  { naam: 'Takkenhengel',    prijs: 0,   bereik: 9,  kracht: 1.0,  kleur: 0x8b5a2b, info: 'Een stok met een touwtje. Het begin!' },
  { naam: 'Bamboehengel',    prijs: 60,  bereik: 12, kracht: 1.2,  kleur: 0xd9b25f, info: 'Gooit verder en haalt sneller in.' },
  { naam: 'Glasvezelhengel', prijs: 250, bereik: 15, kracht: 1.45, kleur: 0x2e7bd6, info: 'Licht en sterk. Tot midden in de vijver!' },
  { naam: 'Superhengel 3000', prijs: 900, bereik: 19, kracht: 1.8, kleur: 0xd63a8e, info: 'De allerbeste. Monsters, pas op!' },
];
export const LIJNEN = [
  { naam: 'Touwtje',     prijs: 0,   sterkte: 1.0, info: 'Breekt snel bij zware vissen.' },
  { naam: 'Nylonlijn',   prijs: 50,  sterkte: 1.35, info: 'Een stuk sterker.' },
  { naam: 'Sterke lijn', prijs: 220, sterkte: 1.8, info: 'Voor de grote jongens.' },
  { naam: 'Staaldraad',  prijs: 800, sterkte: 2.5, info: 'Bijna niet kapot te krijgen.' },
];
export const AAS = [
  { naam: 'Stukje brood', prijs: 0,   geluk: 0, tijd: 1.0,  info: 'Elke vis lust wel brood.' },
  { naam: 'Wormen',       prijs: 40,  geluk: 1, tijd: 0.8,  info: 'Sneller beet, iets vaker iets bijzonders.' },
  { naam: 'Supermaïs',    prijs: 180, geluk: 2, tijd: 0.65, info: 'Zeldzame vissen zijn er dol op.' },
  { naam: 'Glitteraas',   prijs: 700, geluk: 3, tijd: 0.5,  info: 'Lokt legendarische vissen en monsters!' },
];

export const EMMERS = [
  { naam: 'Emmertje',    prijs: 0,    plek: 12, info: 'Je eerste emmer.' },
  { naam: 'Grote emmer', prijs: 120,  plek: 16, info: 'Past meer in.' },
  { naam: 'Viston',      prijs: 450,  plek: 22, info: 'Een hele ton vol vis!' },
  { naam: 'Kruiwagen',   prijs: 1200, plek: 30, info: 'Voor de echte grootvanger.' },
];
export const AQUARIUM_MAX = 8;
