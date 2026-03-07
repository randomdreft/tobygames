// ============================================================
//  Winkeltje - Game Data & Configuration
// ============================================================

const PRODUCTS = {
    champignon: { name: 'Champignon', emoji: '\u{1F344}', price: 2, color: '#F5E6CA', unlockLevel: 1 },
    tomaat:     { name: 'Tomaat',      emoji: '\u{1F345}', price: 5, color: '#FF6347', unlockLevel: 1 },
    broccoli:   { name: 'Broccoli',    emoji: '\u{1F966}', price: 8, color: '#7CB342', unlockLevel: 2 },
    wortel:     { name: 'Wortel',      emoji: '\u{1F955}', price: 4, color: '#FF9800', unlockLevel: 3 },
    kaas:       { name: 'Kaas',        emoji: '\u{1F9C0}', price: 12, color: '#FDD835', unlockLevel: 4 },
    vis:        { name: 'Vis',         emoji: '\u{1F41F}', price: 15, color: '#4FC3F7', unlockLevel: 5 },
    taart:      { name: 'Taart',       emoji: '\u{1F370}', price: 20, color: '#F48FB1', unlockLevel: 6 },
    watermeloen:{ name: 'Watermeloen', emoji: '\u{1F349}', price: 10, color: '#66BB6A', unlockLevel: 4 },
};

// Shelves: starter products (champignon, tomaat) always closest to the register (right side)
const SHELF_LAYOUTS = {
    1: [
        { x: 400, y: 80, product: 'tomaat' },
        { x: 570, y: 80, product: 'champignon' },
    ],
    2: [
        { x: 200, y: 80, product: 'broccoli' },
        { x: 400, y: 80, product: 'tomaat' },
        { x: 570, y: 80, product: 'champignon' },
    ],
    3: [
        { x: 80,  y: 80, product: 'wortel' },
        { x: 250, y: 80, product: 'broccoli' },
        { x: 430, y: 80, product: 'tomaat' },
        { x: 590, y: 80, product: 'champignon' },
    ],
    4: [
        { x: 60,  y: 80, product: 'watermeloen' },
        { x: 190, y: 80, product: 'kaas' },
        { x: 330, y: 80, product: 'wortel' },
        { x: 460, y: 80, product: 'broccoli' },
        { x: 590, y: 80, product: 'tomaat' },
        { x: 690, y: 80, product: 'champignon' },
    ],
    5: [
        { x: 50,  y: 70, product: 'vis' },
        { x: 170, y: 70, product: 'watermeloen' },
        { x: 290, y: 70, product: 'kaas' },
        { x: 400, y: 70, product: 'wortel' },
        { x: 510, y: 70, product: 'broccoli' },
        { x: 610, y: 70, product: 'tomaat' },
        { x: 700, y: 70, product: 'champignon' },
    ],
    6: [
        { x: 30,  y: 70, product: 'taart' },
        { x: 130, y: 70, product: 'vis' },
        { x: 230, y: 70, product: 'watermeloen' },
        { x: 330, y: 70, product: 'kaas' },
        { x: 430, y: 70, product: 'wortel' },
        { x: 530, y: 70, product: 'broccoli' },
        { x: 620, y: 70, product: 'tomaat' },
        { x: 700, y: 70, product: 'champignon' },
    ],
};

// Level thresholds: total money earned to reach each level
const LEVEL_THRESHOLDS = [
    0,      // Level 1 (start)
    100,    // Level 2
    350,    // Level 3
    750,    // Level 4
    1500,   // Level 5
    3000,   // Level 6
];

// Day length in ms
const DAY_LENGTH = 120000; // 120 seconds per day

// Customer patience base (ms) - decreases slightly each level
const BASE_PATIENCE = 15000;
const PATIENCE_PER_LEVEL = -500;

// Customer spawn interval
const BASE_SPAWN_INTERVAL = 5000;
const SPAWN_INTERVAL_PER_LEVEL = -300;
const MIN_SPAWN_INTERVAL = 1800;

// Max queue size
const MAX_QUEUE = 6;

const UPGRADES = [
    {
        id: 'speed1',
        name: 'Snelle Schoenen',
        desc: 'Loop 25% sneller',
        icon: '\u{1F45F}',
        cost: 50,
        apply: (state) => { state.player.speed = 4.5; },
    },
    {
        id: 'carry1',
        name: 'Grotere Tas',
        desc: 'Draag 6 items',
        icon: '\u{1F6CD}',
        cost: 80,
        apply: (state) => { state.player.maxCarry = 6; },
    },
    {
        id: 'speed2',
        name: 'Rolschaatsen',
        desc: 'Loop 50% sneller',
        icon: '\u{26F8}',
        cost: 200,
        apply: (state) => { state.player.speed = 5.4; },
    },
    {
        id: 'carry2',
        name: 'Winkelwagen',
        desc: 'Draag 8 items',
        icon: '\u{1F6D2}',
        cost: 300,
        apply: (state) => { state.player.maxCarry = 8; },
    },
    {
        id: 'patience1',
        name: 'Gratis Koffie',
        desc: 'Klanten +30% geduld',
        icon: '\u{2615}',
        cost: 150,
        apply: (state) => { state.patienceBonus = 1.3; },
    },
    {
        id: 'tips',
        name: 'Fooienpot',
        desc: '+20% inkomsten',
        icon: '\u{1F4B0}',
        cost: 400,
        apply: (state) => { state.incomeMultiplier = 1.2; },
    },
    {
        id: 'speed3',
        name: 'Turbo Boost',
        desc: 'Loop 80% sneller',
        icon: '\u{26A1}',
        cost: 600,
        apply: (state) => { state.player.speed = 6.5; },
    },
    {
        id: 'carry3',
        name: 'Magazijnkar',
        desc: 'Draag 10 items',
        icon: '\u{1F4E6}',
        cost: 800,
        apply: (state) => { state.player.maxCarry = 10; },
    },
];

// Customer name pool (for fun)
const CUSTOMER_NAMES = [
    'Jan', 'Piet', 'Klaas', 'Marie', 'Sophie', 'Daan', 'Emma', 'Liam',
    'Tessa', 'Lucas', 'Mila', 'Noah', 'Julia', 'Sem', 'Sara', 'Tim',
    'Fleur', 'Luuk', 'Anna', 'Finn', 'Eva', 'Bram', 'Lisa', 'Jesse',
];

const CUSTOMER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#D7BDE2',
];

const HAIR_COLORS = [
    '#2C1810', '#4A2C17', '#8B6914', '#D4A534', '#C75B2A',
    '#1A1A1A', '#6B3A2A', '#A0522D', '#DEB887', '#CD853F',
];
