/* ================================================================
   SECTIE 1: SPELGEGEVENS
   ================================================================ */

const SAVE_VERSION = 3;
const COST_MULTIPLIER = 1.15;
const ACHIEVEMENT_BONUS = 0.02; // +2% DPS per achievement
const PRESTIGE_BONUS = 0.05;    // +5% DPS per star
const MAX_OFFLINE_SECONDS = 14 * 24 * 3600; // 14 days
const PRESTIGE_KEEP_OFFLINE = 3;  // stars needed to keep offline upgrades
const PRESTIGE_KEEP_CLICK = 7;    // stars needed to keep click upgrades
const PRESTIGE_KEEP_GLOBAL = 12;  // stars needed to keep global upgrades

// === Wolkendierentuin ===
const ZOO_LEVELS = [
  {name:'Wolkenweitje', emoji:'☁️', cost:0, decayPerHour:10},
  {name:'Wolkenverblijf', emoji:'🏠', cost:1, decayPerHour:6},
  {name:'Wolkenpaleis', emoji:'🏰', cost:2, decayPerHour:3},
  {name:'Gouden Paleis', emoji:'✨', cost:4, decayPerHour:1}
];
const ZOO_MAX_SPAWNS = 3;
const ZOO_PET_AMOUNT = 10;
const ZOO_PET_COOLDOWN = 5000;   // 5 sec
const ZOO_FEED_AMOUNT = 25;
const ZOO_FEED_COOLDOWN = 15000; // 15 sec

const COLOR_THEMES = [
  {id:'oerwoud', name:'Oerwoud', emoji:'🌿', stars:0,
   bg1:'#0f4c2a',bg2:'#1a6b3c',bg3:'#0d3b2e',text:'#e8f5e9',textDim:'#81c784',textDark:'#2e7d32',
   gold:'#ffd700',green:'#43a047',greenLight:'#66bb6a',red:'#ef5350',orange:'#ff9800',blue:'#42a5f5',purple:'#ab47bc'},
  {id:'oceaan', name:'Oceaan', emoji:'🌊', stars:10,
   bg1:'#0a2a4a',bg2:'#0d3d6b',bg3:'#061e3a',text:'#e0f0ff',textDim:'#64b5f6',textDark:'#1565c0',
   gold:'#00e5ff',green:'#26c6da',greenLight:'#4dd0e1',red:'#ef5350',orange:'#ffab40',blue:'#42a5f5',purple:'#7c4dff'},
  {id:'savanne', name:'Savanne', emoji:'🌅', stars:20,
   bg1:'#3e2316',bg2:'#5d3a1a',bg3:'#2c1a10',text:'#ffecd2',textDim:'#d4a76a',textDark:'#8d5524',
   gold:'#ffb300',green:'#8d6e63',greenLight:'#a1887f',red:'#e65100',orange:'#ff8f00',blue:'#90a4ae',purple:'#8d6e63'},
  {id:'bloesem', name:'Bloesem', emoji:'🌸', stars:30,
   bg1:'#2d132c',bg2:'#4a1942',bg3:'#1a0a1a',text:'#fce4ec',textDim:'#f48fb1',textDark:'#880e4f',
   gold:'#ff80ab',green:'#ec407a',greenLight:'#f48fb1',red:'#ff1744',orange:'#ff6090',blue:'#ce93d8',purple:'#ab47bc'},
  {id:'middernacht', name:'Middernacht', emoji:'🌑', stars:40,
   bg1:'#0a0e1a',bg2:'#141b2d',bg3:'#060a14',text:'#cfd8dc',textDim:'#78909c',textDark:'#37474f',
   gold:'#b0bec5',green:'#546e7a',greenLight:'#78909c',red:'#ef5350',orange:'#ff9800',blue:'#607d8b',purple:'#78909c'},
  {id:'vulkaan', name:'Vulkaan', emoji:'🌋', stars:50,
   bg1:'#1a0a0a',bg2:'#3b0f0f',bg3:'#0d0505',text:'#ffccbc',textDim:'#ff8a65',textDark:'#bf360c',
   gold:'#ff6d00',green:'#ff5722',greenLight:'#ff8a65',red:'#d50000',orange:'#ff9100',blue:'#ff6e40',purple:'#dd2c00'},
  {id:'arctisch', name:'Arctisch', emoji:'❄️', stars:60,
   bg1:'#0d1f2d',bg2:'#1a3a4a',bg3:'#071420',text:'#e1f5fe',textDim:'#81d4fa',textDark:'#0277bd',
   gold:'#80deea',green:'#4fc3f7',greenLight:'#81d4fa',red:'#ef5350',orange:'#ffab40',blue:'#29b6f6',purple:'#4fc3f7'},
  {id:'herfst', name:'Herfstbos', emoji:'🍂', stars:70,
   bg1:'#1a1208',bg2:'#332610',bg3:'#110c05',text:'#fff3e0',textDim:'#ffb74d',textDark:'#e65100',
   gold:'#ff9800',green:'#ef6c00',greenLight:'#ffa726',red:'#d84315',orange:'#ff6d00',blue:'#a1887f',purple:'#8d6e63'},
  {id:'koninklijk', name:'Koninklijk', emoji:'👑', stars:80,
   bg1:'#1a0a2e',bg2:'#2d1458',bg3:'#0f0620',text:'#ede7f6',textDim:'#b39ddb',textDark:'#4527a0',
   gold:'#ffd700',green:'#7e57c2',greenLight:'#b39ddb',red:'#ef5350',orange:'#ffab40',blue:'#9575cd',purple:'#6a1b9a'},
  {id:'kosmos', name:'Kosmos', emoji:'🌌', stars:90,
   bg1:'#0a0014',bg2:'#1a0033',bg3:'#05000a',text:'#f3e5f5',textDim:'#ea80fc',textDark:'#aa00ff',
   gold:'#e040fb',green:'#d500f9',greenLight:'#ea80fc',red:'#ff1744',orange:'#ff9100',blue:'#e040fb',purple:'#aa00ff'},
  {id:'regenboog', name:'Regenboog', emoji:'🌈', stars:100,
   bg1:'#1a1a2e',bg2:'#16213e',bg3:'#0f0f1a',text:'#ffffff',textDim:'#b0b0b0',textDark:'#555555',
   gold:'#ffd700',green:'#43a047',greenLight:'#66bb6a',red:'#ef5350',orange:'#ff9800',blue:'#42a5f5',purple:'#ab47bc'}
];
const AUTOSAVE_INTERVAL = 30000; // 30 sec
const TICK_INTERVAL = 100;       // 100ms
const RENDER_INTERVAL = 250;     // 250ms
const QUIZ_COOLDOWN = 180000;    // 3 min
const CATCHER_COOLDOWN = 300000; // 5 min
const MATH_COOLDOWN = 180000;    // 3 min
const BUFF_COOLDOWN = 240000;    // 4 min
const SORT_COOLDOWN = 300000;    // 5 min
const MEMORY_COOLDOWN = 300000;  // 5 min
const TELLEN_COOLDOWN = 180000;  // 3 min
const INDRINGER_COOLDOWN = 240000; // 4 min
const GROTER_COOLDOWN = 240000;  // 4 min
const VOEDSEL_COOLDOWN = 180000; // 3 min
const RACE_COOLDOWN = 300000;    // 5 min
const PUZZEL_COOLDOWN = 300000;  // 5 min
const BUFF_DURATION = 30000;     // 30 sec

const STAR_SHOP = [
  {cat:'Snelheid', emoji:'⚡', perks:[
    {id:'sp_cd1', name:'Snellere cooldowns I', desc:'Minigame cooldowns -15%', cost:3},
    {id:'sp_cd2', name:'Snellere cooldowns II', desc:'Minigame cooldowns -30%', cost:8},
    {id:'sp_auto', name:'Turbo-klik', desc:'Automatisch 1x per seconde klikken', cost:5},
  ]},
  {cat:'Geluk', emoji:'🍀', perks:[
    {id:'sp_lucky1', name:'Meer geluk', desc:'Lieveheersbeestjes verschijnen 50% vaker', cost:2},
    {id:'sp_lucky2', name:'Dubbel geluk', desc:'Lieveheersbeestjes geven 2x bonus', cost:5},
  ]},
  {cat:'Buffs', emoji:'✨', perks:[
    {id:'sp_buff1', name:'Langere buffs', desc:'Buffs duren 60s in plaats van 30s', cost:3},
    {id:'sp_buff2', name:'Sterkere buffs', desc:'Buff-effecten +50% sterker', cost:6},
  ]},
  {cat:'Evolutie', emoji:'🚀', perks:[
    {id:'sp_evo1', name:'Vliegende start', desc:'Start met 5 mieren en 2 slakken cadeau na evolutie', cost:2},
    {id:'sp_evo2', name:'Raketstart', desc:'Start met 10 mieren, 5 slakken en 1 kikker cadeau na evolutie', cost:6},
  ]},
  {cat:'Koop alles', emoji:'🛒', perks:[
    {id:'sp_ba_mier', name:'Koop alles: Mieren', desc:'Koop-alles knop bij mier-upgrades', cost:2},
    {id:'sp_ba_slak', name:'Koop alles: Slakken', desc:'Koop-alles knop bij slak-upgrades', cost:2},
    {id:'sp_ba_kikker', name:'Koop alles: Kikkers', desc:'Koop-alles knop bij kikker-upgrades', cost:2},
    {id:'sp_ba_kip', name:'Koop alles: Kippen', desc:'Koop-alles knop bij kip-upgrades', cost:2},
    {id:'sp_ba_kat', name:'Koop alles: Katten', desc:'Koop-alles knop bij kat-upgrades', cost:2},
    {id:'sp_ba_hond', name:'Koop alles: Honden', desc:'Koop-alles knop bij hond-upgrades', cost:2},
    {id:'sp_ba_lama', name:'Koop alles: Lamas', desc:'Koop-alles knop bij lama-upgrades', cost:2},
    {id:'sp_ba_paard', name:'Koop alles: Paarden', desc:'Koop-alles knop bij paard-upgrades', cost:2},
    {id:'sp_ba_panda', name:'Koop alles: Pandas', desc:'Koop-alles knop bij panda-upgrades', cost:2},
    {id:'sp_ba_olifant', name:'Koop alles: Olifanten', desc:'Koop-alles knop bij olifant-upgrades', cost:2},
    {id:'sp_ba_walvis', name:'Koop alles: Walvissen', desc:'Koop-alles knop bij walvis-upgrades', cost:2},
    {id:'sp_ba_draak', name:'Koop alles: Draken', desc:'Koop-alles knop bij draak-upgrades', cost:2},
  ]},
  {cat:'Synergieën', emoji:'🤝', perks:[
    {id:'sp_syn1', name:'Kruipertjes', desc:'Mier, Slak & Kikker krijgen +15% DPS', cost:2, animals:['mier','slak','kikker'], bonus:0.15},
    {id:'sp_syn2', name:'Boerderij', desc:'Kip, Hond & Lama krijgen +15% DPS', cost:3, animals:['kip','hond','lama'], bonus:0.15},
    {id:'sp_syn3', name:'Safari', desc:'Paard, Panda & Olifant krijgen +20% DPS', cost:5, animals:['paard','panda','olifant'], bonus:0.20},
    {id:'sp_syn4', name:'Mythisch verbond', desc:'Walvis & Draak krijgen +25% DPS', cost:8, animals:['walvis','draak'], bonus:0.25},
    {id:'sp_syn5', name:'Dierenrijk', desc:'Alle synergieën actief: alle dieren +10% DPS', cost:12, bonus:0.10},
  ]},
];

const MINIGAME_UNLOCKS = [
  {id:'tellen', reqAnimal:'mier', label:'Koop een Mier'},
  {id:'quiz', reqAnimal:'slak', label:'Koop een Slak'},
  {id:'catcher', reqAnimal:'kikker', label:'Koop een Kikker'},
  {id:'indringer', reqAnimal:'kip', label:'Koop een Kip'},
  {id:'math', reqAnimal:'kat', label:'Koop een Kat'},
  {id:'groter', reqAnimal:'hond', label:'Koop een Hond'},
  {id:'buff', reqAnimal:'lama', label:'Koop een Lama'},
  {id:'race', reqAnimal:'paard', label:'Koop een Paard'},
  {id:'puzzel', reqAnimal:'panda', label:'Koop een Panda'},
  {id:'voedsel', reqAnimal:'olifant', label:'Koop een Olifant'},
  {id:'sort', reqAnimal:'walvis', label:'Koop een Walvis'},
  {id:'memory', reqAnimal:'draak', label:'Koop een Draak'}
];

const BUFF_TYPES = [
  {id:'dps2x', emoji:'🔥', name:'Vuurkracht', desc:() => 'DPS ×4 voor ' + (getBuffDuration()/1000) + ' seconden', color:'#ff6b35'},
  {id:'sale', emoji:'🏷️', name:'Uitverkoop', desc:() => 'Alle dieren halve prijs voor ' + (getBuffDuration()/1000) + ' sec', color:'#e91e63'},
  {id:'clickdps', emoji:'⭐', name:'Gouden Regen', desc:() => '+20% van DPS per klik voor ' + (getBuffDuration()/1000) + ' sec', color:'#ffd700'},
  {id:'jackpot', emoji:'💰', name:'Jackpot', desc:() => 'Direct ' + (getBuffDuration()/1000 * 3) + ' seconden DPS als bonus!', color:'#66bb6a'},
  {id:'lucky', emoji:'🍀', name:'Geluksregen', desc:() => 'Lieveheersbeestjes ×5 vaker voor ' + (getBuffDuration()/1000) + ' sec', color:'#4caf50'}
];

const SORT_ANIMALS = [
  {emoji:'🐔', name:'Kip', cat:'boerderij'}, {emoji:'🐷', name:'Varken', cat:'boerderij'},
  {emoji:'🐄', name:'Koe', cat:'boerderij'}, {emoji:'🐑', name:'Schaap', cat:'boerderij'},
  {emoji:'🐴', name:'Paard', cat:'boerderij'}, {emoji:'🐐', name:'Geit', cat:'boerderij'},
  {emoji:'🦊', name:'Vos', cat:'bos'}, {emoji:'🐻', name:'Beer', cat:'bos'},
  {emoji:'🦌', name:'Hert', cat:'bos'}, {emoji:'🐿️', name:'Eekhoorn', cat:'bos'},
  {emoji:'🦉', name:'Uil', cat:'bos'}, {emoji:'🐺', name:'Wolf', cat:'bos'},
  {emoji:'🐟', name:'Vis', cat:'water'}, {emoji:'🐬', name:'Dolfijn', cat:'water'},
  {emoji:'🐙', name:'Octopus', cat:'water'}, {emoji:'🦈', name:'Haai', cat:'water'},
  {emoji:'🐢', name:'Schildpad', cat:'water'}, {emoji:'🐊', name:'Krokodil', cat:'water'}
];

const MEMORY_POOL = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔',
  '🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞',
  '🐜','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊',
  '🐘','🦏','🦛','🐪','🐫','🦒','🐃','🐄','🐎','🐖','🐑','🐐','🦌','🐕','🐈','🐓',
  '🦃','🕊️','🐇','🦝','🦨','🦡','🐁','🐀','🐿️','🦔'
];

const ANIMAL_WEIGHTS = [
  {emoji:'🐜',name:'Mier',kg:0.000001},{emoji:'🐛',name:'Rups',kg:0.003},
  {emoji:'🐝',name:'Bij',kg:0.0001},{emoji:'🐌',name:'Slak',kg:0.01},
  {emoji:'🐸',name:'Kikker',kg:0.03},{emoji:'🐭',name:'Muis',kg:0.02},
  {emoji:'🐹',name:'Hamster',kg:0.035},{emoji:'🐔',name:'Kip',kg:3},
  {emoji:'🐰',name:'Konijn',kg:2},{emoji:'🐱',name:'Kat',kg:4.5},
  {emoji:'🐶',name:'Hond',kg:25},{emoji:'🦊',name:'Vos',kg:7},
  {emoji:'🐺',name:'Wolf',kg:45},{emoji:'🐐',name:'Geit',kg:55},
  {emoji:'🐑',name:'Schaap',kg:65},{emoji:'🦌',name:'Hert',kg:80},
  {emoji:'🐷',name:'Varken',kg:110},{emoji:'🦁',name:'Leeuw',kg:190},
  {emoji:'🐯',name:'Tijger',kg:220},{emoji:'🐬',name:'Dolfijn',kg:250},
  {emoji:'🐻',name:'Beer',kg:350},{emoji:'🐊',name:'Krokodil',kg:450},
  {emoji:'🐴',name:'Paard',kg:500},{emoji:'🐄',name:'Koe',kg:700},
  {emoji:'🦈',name:'Haai',kg:1100},{emoji:'🦒',name:'Giraffe',kg:1200},
  {emoji:'🦏',name:'Neushoorn',kg:2000},{emoji:'🐘',name:'Olifant',kg:5000},
  {emoji:'🐧',name:'Pinguïn',kg:33},{emoji:'🐋',name:'Walvis',kg:100000}
];

const FOOD_QUIZ = [
  {emoji:'🐸',name:'Kikker',food:'🐛 Insecten',wrong:['🥕 Wortels','🌾 Graan','🍌 Bananen']},
  {emoji:'🐱',name:'Kat',food:'🐟 Vis',wrong:['🌿 Gras','🍌 Bananen','🌾 Graan']},
  {emoji:'🐶',name:'Hond',food:'🥩 Vlees',wrong:['🌿 Gras','🌾 Graan','🍯 Honing']},
  {emoji:'🐰',name:'Konijn',food:'🥕 Wortels',wrong:['🥩 Vlees','🐟 Vis','🍯 Honing']},
  {emoji:'🐻',name:'Beer',food:'🍯 Honing',wrong:['🌾 Graan','🥕 Wortels','🍫 Chocolade']},
  {emoji:'🐼',name:'Panda',food:'🎋 Bamboe',wrong:['🥩 Vlees','🐟 Vis','🍯 Honing']},
  {emoji:'🐵',name:'Aap',food:'🍌 Bananen',wrong:['🐟 Vis','🥩 Vlees','🌾 Graan']},
  {emoji:'🐔',name:'Kip',food:'🌾 Graan',wrong:['🐟 Vis','🍯 Honing','🍌 Bananen']},
  {emoji:'🦊',name:'Vos',food:'🐭 Muizen',wrong:['🌿 Gras','🥕 Wortels','🌾 Graan']},
  {emoji:'🐴',name:'Paard',food:'🌿 Gras',wrong:['🥩 Vlees','🐟 Vis','🍯 Honing']},
  {emoji:'🐄',name:'Koe',food:'🌿 Gras',wrong:['🥩 Vlees','🐟 Vis','🐛 Insecten']},
  {emoji:'🐑',name:'Schaap',food:'🌿 Gras',wrong:['🐟 Vis','🥩 Vlees','🍯 Honing']},
  {emoji:'🐷',name:'Varken',food:'🥕 Groente',wrong:['🍯 Honing','🐭 Muizen','🎋 Bamboe']},
  {emoji:'🦉',name:'Uil',food:'🐭 Muizen',wrong:['🌿 Gras','🌾 Graan','🥕 Wortels']},
  {emoji:'🐧',name:'Pinguïn',food:'🐟 Vis',wrong:['🌿 Gras','🌾 Graan','🍌 Bananen']},
  {emoji:'🐬',name:'Dolfijn',food:'🐟 Vis',wrong:['🌿 Gras','🥕 Wortels','🍌 Bananen']},
  {emoji:'🐘',name:'Olifant',food:'🍃 Bladeren',wrong:['🥩 Vlees','🐟 Vis','🍯 Honing']},
  {emoji:'🐿️',name:'Eekhoorn',food:'🥜 Noten',wrong:['🐟 Vis','🥩 Vlees','🌾 Graan']},
  {emoji:'🐝',name:'Bij',food:'🌻 Nectar',wrong:['🥩 Vlees','🐟 Vis','🥕 Wortels']},
  {emoji:'🦈',name:'Haai',food:'🐟 Vis',wrong:['🌿 Gras','🌾 Graan','🥕 Wortels']},
  {emoji:'🐍',name:'Slang',food:'🐭 Muizen',wrong:['🌿 Gras','🌾 Graan','🍌 Bananen']},
  {emoji:'🐊',name:'Krokodil',food:'🥩 Vlees',wrong:['🌿 Gras','🥕 Wortels','🌾 Graan']},
  {emoji:'🐢',name:'Schildpad',food:'🍃 Bladeren',wrong:['🥩 Vlees','🐭 Muizen','🍯 Honing']},
  {emoji:'🐺',name:'Wolf',food:'🥩 Vlees',wrong:['🌿 Gras','🌾 Graan','🥕 Wortels']}
];

const INTRUDER_GROUPS = [
  {name:'Vogels',animals:['🐔','🦅','🦉','🐧','🦆','🕊️','🦃','🐦','🦜','🦢']},
  {name:'Waterdieren',animals:['🐟','🐬','🐳','🦈','🐙','🐠','🦐','🐋','🦑','🐡']},
  {name:'Insecten',animals:['🐛','🐝','🐜','🦋','🐞','🦗','🪲','🪳','🦟','🪰']},
  {name:'Reptielen',animals:['🐊','🐢','🐍','🦎','🐉','🦕']},
  {name:'Zoogdieren',animals:['🐱','🐶','🐭','🐹','🐰','🐷','🐄','🐑','🐐','🐴','🦁','🐯','🐻','🐺','🦊','🐘','🦏','🦒','🐒','🦌']}
];

const ANIMALS = [
  {id:'mier', emoji:'🐜', name:'Mier', plural:'mieren', flavor:'Sjouwt kruimels voor je',
   baseDps:0.1, basePrice:15, upgrades:[
     {id:'mier_1', name:'Sterkere kaakjes', desc:'Mieren bijten harder', req:10, cost:1e3, mult:2},
     {id:'mier_2', name:'Mierenkolonie', desc:'Samen staan we sterk!', req:25, cost:8e3, mult:2},
     {id:'mier_3', name:'Vliegende mieren', desc:'Mieren met vleugels!', req:50, cost:5e4, mult:3},
     {id:'mier_4', name:'Vuurmieren', desc:'Au au au!', req:100, cost:5e5, mult:3},
     {id:'mier_5', name:'Robotmieren', desc:'Bleep bloop kruip kruip', req:250, cost:1e7, mult:5}
   ]},
  {id:'slak', emoji:'🐌', name:'Slak', plural:'slakken', flavor:'Langzaam maar zeker',
   baseDps:0.5, basePrice:100, upgrades:[
     {id:'slak_1', name:'Turbo slijmspoor', desc:'Sneller glijden!', req:10, cost:5e3, mult:2},
     {id:'slak_2', name:'Schelpschild', desc:'Extra bescherming!', req:25, cost:4e4, mult:2},
     {id:'slak_3', name:'Racehelm', desc:'Vroom vroom slak', req:50, cost:2.5e5, mult:3},
     {id:'slak_4', name:'Slakkenturbo', desc:'Nitro boost!', req:100, cost:2.5e6, mult:3},
     {id:'slak_5', name:'Raketslakken', desc:'3... 2... 1... Lancering!', req:250, cost:5e7, mult:5}
   ]},
  {id:'kikker', emoji:'🐸', name:'Kikker', plural:'kikkers', flavor:'Vangt punten met zijn tong',
   baseDps:4, basePrice:1100, upgrades:[
     {id:'kikker_1', name:'Plakkerige tong', desc:'Vangt twee keer zoveel', req:10, cost:5e4, mult:2},
     {id:'kikker_2', name:'Springkracht', desc:'Hoger springen!', req:25, cost:4e5, mult:2},
     {id:'kikker_3', name:'Ninja kikker', desc:'Onzichtbaar en dodelijk', req:50, cost:2.5e6, mult:3},
     {id:'kikker_4', name:'Kikkerkoning', desc:'Alle kikkers gehoorzamen!', req:100, cost:2.5e7, mult:3},
     {id:'kikker_5', name:'Gifkikker', desc:'Mooi maar gevaarlijk!', req:250, cost:5e8, mult:5}
   ]},
  {id:'kip', emoji:'🐔', name:'Kip', plural:'kippen', flavor:'Legt gouden eieren',
   baseDps:10, basePrice:12000, upgrades:[
     {id:'kip_1', name:'Gouden eieren', desc:'Elk ei is goud waard', req:10, cost:5e5, mult:2},
     {id:'kip_2', name:'Dubbele dooiers', desc:'Twee keer zoveel per ei!', req:25, cost:4e6, mult:2},
     {id:'kip_3', name:'Turbo kip', desc:'Rent sneller dan je denkt', req:50, cost:2.5e7, mult:3},
     {id:'kip_4', name:'Kippenbrigade', desc:'Een leger van kippen!', req:100, cost:2.5e8, mult:3},
     {id:'kip_5', name:'Dino-kip', desc:'T-Rex maar dan met veren', req:250, cost:5e9, mult:5}
   ]},
  {id:'kat', emoji:'🐱', name:'Kat', plural:'katten', flavor:'Slaapt 18u per dag, maar die 6u...',
   baseDps:40, basePrice:130000, upgrades:[
     {id:'kat_1', name:'Kattenkruid', desc:'Extra gemotiveerd!', req:10, cost:5e6, mult:2},
     {id:'kat_2', name:'Negen levens', desc:'Nooit meer stoppen!', req:25, cost:4e7, mult:2},
     {id:'kat_3', name:'Laserkat', desc:'Pew pew pew!', req:50, cost:2.5e8, mult:3},
     {id:'kat_4', name:'Kattenopperhoofd', desc:'Alle katten volgen mij!', req:100, cost:2.5e9, mult:3},
     {id:'kat_5', name:'Superkat', desc:'Met cape en masker', req:250, cost:5e10, mult:5}
   ]},
  {id:'hond', emoji:'🐕', name:'Hond', plural:'honden', flavor:'Brave boy! Apporteert punten',
   baseDps:100, basePrice:1400000, upgrades:[
     {id:'hond_1', name:'Bot van goud', desc:'Het beste speeltje', req:10, cost:5e7, mult:2},
     {id:'hond_2', name:'Speurhond', desc:'Vindt verborgen schatten!', req:25, cost:4e8, mult:2},
     {id:'hond_3', name:'Politiehond', desc:'Pakt de boeven!', req:50, cost:2.5e9, mult:3},
     {id:'hond_4', name:'Reddingshond', desc:'Redt iedereen!', req:100, cost:2.5e10, mult:3},
     {id:'hond_5', name:'Robothond', desc:'Woef. Woef. Systeem actief.', req:250, cost:5e11, mult:5}
   ]},
  {id:'lama', emoji:'🦙', name:'Lama', plural:"lama's", flavor:'Spuugt punten in het rond',
   baseDps:200, basePrice:5000000, upgrades:[
     {id:'lama_1', name:'Zachte wol', desc:'Warme wol = meer kracht', req:10, cost:2e8, mult:2},
     {id:'lama_2', name:'Bergbeklimmer', desc:'Klautert overal omhoog!', req:25, cost:1.5e9, mult:2},
     {id:'lama_3', name:'Spuugkanon', desc:'Ptoe ptoe ptoe!', req:50, cost:1e10, mult:3},
     {id:'lama_4', name:'Lamaleider', desc:'De baas van de kudde!', req:100, cost:1e11, mult:3},
     {id:'lama_5', name:'Alpaca leger', desc:'Een heel leger pluizige soldaten', req:250, cost:2e12, mult:5}
   ]},
  {id:'paard', emoji:'🐴', name:'Paard', plural:'paarden', flavor:'Galoppeert door je puntenteller',
   baseDps:400, basePrice:20000000, upgrades:[
     {id:'paard_1', name:'Gouden hoefijzers', desc:'Brengt extra geluk!', req:10, cost:7.5e8, mult:2},
     {id:'paard_2', name:'Renpaard', desc:'Snelste van de stal!', req:25, cost:6e9, mult:2},
     {id:'paard_3', name:'Eenhoorn', desc:'Magisch en glitterig', req:50, cost:4e10, mult:3},
     {id:'paard_4', name:'Nachtmerrie', desc:'Angstaanjagend sterk!', req:100, cost:4e11, mult:3},
     {id:'paard_5', name:'Pegasus', desc:'Vliegt door de wolken', req:250, cost:8e12, mult:5}
   ]},
  {id:'panda', emoji:'🐼', name:'Panda', plural:"panda's", flavor:'Eet bamboe, verdient punten',
   baseDps:2000, basePrice:80000000, upgrades:[
     {id:'panda_1', name:'Bamboe buffet', desc:'Eet meer bamboe!', req:10, cost:3e9, mult:2},
     {id:'panda_2', name:'Pandakracht', desc:'Sterker dan je denkt!', req:25, cost:2.5e10, mult:2},
     {id:'panda_3', name:'Kung Fu Panda', desc:'Skadoosh!', req:50, cost:1.5e11, mult:3},
     {id:'panda_4', name:'Pandameester', desc:'De ultieme strijder!', req:100, cost:1.5e12, mult:3},
     {id:'panda_5', name:'Rode panda', desc:'Schattig maar dodelijk', req:250, cost:3e13, mult:5}
   ]},
  {id:'olifant', emoji:'🐘', name:'Olifant', plural:'olifanten', flavor:'Vergeet nooit een punt',
   baseDps:6666, basePrice:330000000, upgrades:[
     {id:'olifant_1', name:'Geheugentraining', desc:'Onthoudt nog meer punten', req:10, cost:1.2e10, mult:2},
     {id:'olifant_2', name:'Slurf-upgrade', desc:'Extra lange slurf!', req:25, cost:1e11, mult:2},
     {id:'olifant_3', name:'Mammoet', desc:'IJstijd editie!', req:50, cost:6e11, mult:3},
     {id:'olifant_4', name:'Oorlogsolifant', desc:'Niets houdt hem tegen!', req:100, cost:6e12, mult:3},
     {id:'olifant_5', name:'Mecha-olifant', desc:'Groter. Sterker. Metaler.', req:250, cost:1.2e14, mult:5}
   ]},
  {id:'walvis', emoji:'🐋', name:'Walvis', plural:'walvissen', flavor:'Slurpt oceanen vol punten',
   baseDps:98765, basePrice:5100000000, upgrades:[
     {id:'walvis_1', name:'Krillfeest', desc:'All-you-can-eat buffet', req:10, cost:1.8e11, mult:2},
     {id:'walvis_2', name:'Sonar', desc:'Vindt overal punten!', req:25, cost:1.4e12, mult:2},
     {id:'walvis_3', name:'Narwal', desc:'De eenhoorn van de zee', req:50, cost:9e12, mult:3},
     {id:'walvis_4', name:'Blauwe vinvis', desc:'De allergrootste!', req:100, cost:9e13, mult:3},
     {id:'walvis_5', name:'Megalodon', desc:'De grootste ooit!', req:250, cost:2e15, mult:5}
   ]},
  {id:'draak', emoji:'🐉', name:'Draak', plural:'draken', flavor:'Mythisch. Legendarisch. Duur.',
   baseDps:999999, basePrice:75000000000, upgrades:[
     {id:'draak_1', name:'Vuurspuwen', desc:'Alles brandt!', req:10, cost:2.7e12, mult:2},
     {id:'draak_2', name:'Drakenei', desc:'Nog meer draken!', req:25, cost:2e13, mult:2},
     {id:'draak_3', name:'IJsdraak', desc:'Bevriest de concurrentie', req:50, cost:1.35e14, mult:3},
     {id:'draak_4', name:'Drakenkoning', desc:'Alle draken buigen!', req:100, cost:1.35e15, mult:3},
     {id:'draak_5', name:'Kosmische draak', desc:'Heerser van het universum', req:250, cost:2.7e16, mult:5}
   ]}
];

const CLICK_UPGRADES = [
  {id:'click_1', name:'Stevige vinger', desc:'+1 per klik', cost:100, addClick:1},
  {id:'click_2', name:'Twee vingers', desc:'+5 per klik', cost:500, addClick:5},
  {id:'click_3', name:'Hele hand', desc:'+25 per klik', cost:5000, addClick:25},
  {id:'click_4', name:'Twee handen', desc:'+100 per klik', cost:50000, addClick:100},
  {id:'click_5', name:'Dierenmagneet', desc:'+1% van je DPS per klik', cost:500000, dpsPercent:1},
  {id:'click_6', name:'Supermagneet', desc:'+5% van je DPS per klik', cost:5000000, dpsPercent:5},
  {id:'click_7', name:'Ultramagneet', desc:'+10% van je DPS per klik', cost:50000000, dpsPercent:10}
];

const GLOBAL_UPGRADES = [
  {id:'global_1', name:'Dierenvoer', desc:'Alle DPS +10%', cost:1000, addPercent:10},
  {id:'global_2', name:'Beter voer', desc:'Alle DPS +25%', cost:10000, addPercent:25},
  {id:'global_3', name:'Premium voer', desc:'Alle DPS +50%', cost:100000, addPercent:50},
  {id:'global_4', name:'Dierenfluisteraar', desc:'Alle DPS ×2', cost:1000000, multiply:2},
  {id:'global_5', name:'Dierentrainer', desc:'Alle DPS ×2', cost:10000000, multiply:2},
  {id:'global_6', name:'Dierentovenaar', desc:'Alle DPS ×2', cost:100000000, multiply:2},
  {id:'global_7', name:'Dierenmeester', desc:'Alle DPS ×2', cost:10000000000, multiply:2}
];

const OFFLINE_UPGRADES = [
  {id:'offline_1', name:'Nachtwaker', desc:'10% DPS terwijl je weg bent', cost:10000, offlinePct:10},
  {id:'offline_2', name:'Nachtploeg', desc:'25% DPS offline', cost:100000, offlinePct:25},
  {id:'offline_3', name:'Bewaker', desc:'50% DPS offline', cost:1000000, offlinePct:50},
  {id:'offline_4', name:'Nachtmanager', desc:'75% DPS offline', cost:50000000, offlinePct:75},
  {id:'offline_5', name:'24/7 Dierentuin', desc:'100% DPS offline', cost:1000000000, offlinePct:100}
];

const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];
const MILESTONE_LABELS = ['Eerste','10','25','50','100','250','500','1000'];

const QUIZ_QUESTIONS = [
  {q:"Hoeveel poten heeft een spin?", a:["8","6","10","4"], c:0},
  {q:"Welk dier is het grootste op aarde?", a:["Blauwe vinvis","Olifant","Giraffe","Walvishaai"], c:0},
  {q:"Wat eet een panda het liefst?", a:["Bamboe","Vis","Vlees","Bananen"], c:0},
  {q:"Hoeveel poten heeft een mier?", a:["6","8","4","10"], c:0},
  {q:"Welk dier kan het hardst rennen?", a:["Cheetah","Leeuw","Paard","Hond"], c:0},
  {q:"Hoe heet een baby kat?", a:["Kitten","Puppy","Kuiken","Veulen"], c:0},
  {q:"Welk dier heeft de langste nek?", a:["Giraffe","Struisvogel","Kameel","Lama"], c:0},
  {q:"Hoeveel armen heeft een octopus?", a:["8","6","10","12"], c:0},
  {q:"Welk dier maakt honing?", a:["Bij","Wesp","Vlinder","Mug"], c:0},
  {q:"Hoe noem je een groep wolven?", a:["Roedel","Kudde","Zwerm","School"], c:0},
  {q:"Welk dier slaapt ondersteboven?", a:["Vleermuis","Luiaard","Koala","Uil"], c:0},
  {q:"Hoeveel harten heeft een octopus?", a:["3","1","2","8"], c:0},
  {q:"Welk dier kan zijn kleur veranderen?", a:["Kameleon","Gekko","Leguaan","Kikker"], c:0},
  {q:"Hoeveel tanden heeft een slak?", a:["Duizenden!","Geen","32","100"], c:0},
  {q:"Hoe heet een baby hond?", a:["Puppy","Kitten","Veulen","Welp"], c:0},
  {q:"Welk dier heeft zwart-witte strepen?", a:["Zebra","Tijger","Panda","Stinkdier"], c:0},
  {q:"Hoeveel ogen heeft een spin meestal?", a:["8","2","6","4"], c:0},
  {q:"Wat eet een koala?", a:["Eucalyptus","Bamboe","Gras","Insecten"], c:0},
  {q:"Welk dier legt eieren maar is geen vogel?", a:["Schildpad","Dolfijn","Konijn","Muis"], c:0},
  {q:"Hoe heet een baby paard?", a:["Veulen","Kalf","Lam","Puppy"], c:0},
  {q:"Welk dier bouwt dammen?", a:["Bever","Otter","Eend","Muskusrat"], c:0},
  {q:"Welk dier heeft de grootste oren?", a:["Afrikaanse olifant","Konijn","Vos","Ezel"], c:0},
  {q:"Hoe noem je een groep vissen?", a:["School","Kudde","Roedel","Kolonie"], c:0},
  {q:"Welk dier kan zijn staart laten afvallen?", a:["Hagedis","Slang","Schildpad","Kikker"], c:0},
  {q:"Hoeveel maanden is een olifant zwanger?", a:["22 maanden","9 maanden","12 maanden","6 maanden"], c:0},
  {q:"Welk dier is het snelste in het water?", a:["Zeilvis","Dolfijn","Haai","Tonijn"], c:0},
  {q:"Hoe heet een baby koe?", a:["Kalf","Veulen","Lam","Big"], c:0},
  {q:"Welk dier maakt een web?", a:["Spin","Rups","Vlinder","Mier"], c:0},
  {q:"Hoeveel kamers heeft het hart van een vis?", a:["2","4","1","3"], c:0},
  {q:"Welk dier kan achteruit vliegen?", a:["Kolibrie","Papegaai","Uil","Mees"], c:0},
  {q:"Hoe ademen vissen?", a:["Met kieuwen","Met longen","Door hun huid","Met hun bek"], c:0},
  {q:"Welk dier is het langste?", a:["Giraffe","Olifant","Slang","Krokodil"], c:0},
  {q:"Wat is een dolfijn?", a:["Een zoogdier","Een vis","Een haai","Een reptiel"], c:0},
  {q:"Hoeveel poten heeft een kreeft?", a:["10","8","6","12"], c:0},
  {q:"Welk dier heeft de scherpste ogen?", a:["Arend","Uil","Kat","Havik"], c:0},
  {q:"Hoe noem je een baby schaap?", a:["Lam","Kalf","Big","Kuiken"], c:0},
  {q:"Welk dier kan het langst zonder water?", a:["Kameel","Olifant","Slang","Schildpad"], c:0},
  {q:"Wat eet een flamingo?", a:["Garnalen en algen","Vis","Gras","Insecten"], c:0},
  {q:"Waarom is een flamingo roze?", a:["Door zijn eten","Zonnebrand","Zo geboren","Door het water"], c:0},
  {q:"Welk dier heeft geen botten?", a:["Kwal","Slak","Slang","Worm"], c:0},
  {q:"Welk dier kan het langst slapen?", a:["Luiaard","Kat","Koala","Beer"], c:0},
  {q:"Hoeveel kleuren kan een kameleon worden?", a:["Heel veel!","2","3","Alleen groen"], c:0},
  {q:"Welk dier heeft de grootste tanden?", a:["Olifant","Nijlpaard","Walrus","Haai"], c:0},
  {q:"Hoe noem je een baby geit?", a:["Geitje","Lam","Kalf","Veulen"], c:0},
  {q:"Welk dier kan over water lopen?", a:["Basilisk hagedis","Kikker","Spin","Muis"], c:0},
  {q:"Hoeveel nieren heeft een mens?", a:["2","1","4","3"], c:0},
  {q:"Welk dier is het giftigste ter wereld?", a:["Pijlgifkikker","Cobra","Schorpioen","Spin"], c:0},
  {q:"Hoe oud kan een schildpad worden?", a:["Meer dan 150 jaar","50 jaar","20 jaar","80 jaar"], c:0},
  {q:"Welk dier heeft de langste tong?", a:["Kameleon","Kikker","Miereneter","Giraffe"], c:0},
  {q:"Hoeveel botten heeft een haai?", a:["Nul!","200","100","50"], c:0},
  {q:"Welk dier kan het hardst bijten?", a:["Krokodil","Haai","Leeuw","Hyena"], c:0},
  {q:"Hoe noem je een baby eend?", a:["Pulletje","Kuiken","Welp","Kalf"], c:0},
  {q:"Welk dier heeft strepen die uniek zijn, net als vingerafdrukken?", a:["Zebra","Tijger","Giraf","Cheetah"], c:0},
  {q:"Wat is het zwaarste insect?", a:["Goliathkever","Vliegend hert","Bidsprinkhaan","Mestkever"], c:0},
  {q:"Welk dier kan zijn kop bijna helemaal omdraaien?", a:["Uil","Papegaai","Arend","Flamingo"], c:0},
  {q:"Hoeveel magen heeft een koe?", a:["4","1","2","3"], c:0},
  {q:"Welk dier heeft het beste geheugen?", a:["Olifant","Dolfijn","Hond","Papegaai"], c:0},
  {q:"Wat eet een egel?", a:["Insecten","Gras","Noten","Vis"], c:0},
  {q:"Welk dier kan elektriciteit maken?", a:["Sidderaal","Octopus","Kwal","Rog"], c:0},
  {q:"Hoeveel soorten mieren bestaan er?", a:["Meer dan 12.000","100","500","50"], c:0},
  {q:"Welk dier heeft blauwe tong?", a:["Giraf","Koe","Hond","Paard"], c:0},
  {q:"Hoe ademt een dolfijn?", a:["Met longen","Met kieuwen","Door zijn huid","Met zijn bek"], c:0},
  {q:"Welk dier is het luidste?", a:["Bultrugwalvis","Leeuw","Papegaai","Brulkikker"], c:0},
  {q:"Hoeveel eieren legt een octopus?", a:["Duizenden","10","100","1"], c:0},
  {q:"Welk dier heeft de dikste vacht?", a:["Zeeotter","IJsbeer","Poolvos","Husky"], c:0},
  {q:"Wat is een groep leeuwen?", a:["Troep","Roedel","Kudde","School"], c:0},
  {q:"Welk dier kan het diepst duiken?", a:["Potvis","Dolfijn","Pinguïn","Zeehond"], c:0},
  {q:"Hoeveel poten heeft een duizendpoot echt?", a:["30 tot 354","Precies 1000","500","100"], c:0},
  {q:"Welk dier heeft vingerafdrukken die lijken op die van mensen?", a:["Koala","Chimpansee","Gorilla","Orang-oetan"], c:0},
  {q:"Hoe noem je een baby konijn?", a:["Kit","Puppy","Kuiken","Lam"], c:0},
  {q:"Welk dier is het oudste nog levende soort?", a:["Degenkrab","Krokodil","Haai","Schildpad"], c:0},
  {q:"Hoeveel liter water kan een kameel drinken in 10 minuten?", a:["100 liter","10 liter","30 liter","5 liter"], c:0},
  {q:"Welk dier heeft de meeste poten?", a:["Miljoenpoot","Duizendpoot","Kreeft","Spin"], c:0},
  {q:"Wat is bijzonder aan een platypus?", a:["Het legt eieren én zoogt","Het kan vliegen","Het heeft schubben","Het leeft 200 jaar"], c:0},
  {q:"Welk dier maakt het grootste nest?", a:["Wevervogel","Arend","Ooievaar","Zwaluw"], c:0},
  {q:"Hoeveel uur per dag slaapt een kat gemiddeld?", a:["12 tot 16 uur","8 uur","5 uur","20 uur"], c:0},
  {q:"Welk dier heeft het grootste oog?", a:["Kolossale inktvis","Walvis","Struisvogel","Olifant"], c:0},
  {q:"Hoe snel kan een struisvogel rennen?", a:["70 km/u","30 km/u","50 km/u","20 km/u"], c:0},
  {q:"Welk dier gebruikt gereedschap?", a:["Chimpansee","Hond","Kat","Paard"], c:0},
  {q:"Hoeveel soorten pinguïns bestaan er?", a:["18","2","5","50"], c:0},
  {q:"Welk dier kan het langst onder water blijven?", a:["Lederschildpad","Dolfijn","Walvis","Krokodil"], c:0},
  {q:"Wat is het kleinste vogeltje?", a:["Bijkolibrie","Winterkoning","Pimpelmees","Goudhaantje"], c:0}
];

