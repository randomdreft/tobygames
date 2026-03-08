/* ================================================================
   SECTIE 2: SPELSTATUS
   ================================================================ */

function defaultState() {
  const s = {
    version: SAVE_VERSION,
    currentPoints: 0,
    totalEarned: 0,
    totalClicks: 0,
    playTimeSeconds: 0,
    animals: {},
    upgrades: {},
    achievements: {},
    prestige: { stars: 0, timesReset: 0, theme: 'oerwoud', themeLocked: false, perks: {} },
    allTime: { totalClicks: 0, totalEarned: 0, totalAnimals: 0, playTimeSeconds: 0 },
    stats: {
      quizPlayed: 0, quizCorrect: 0, quizWrong: 0,
      catcherPlayed: 0, catcherCaught: 0,
      mathPlayed: 0, mathCorrect: 0, mathWrong: 0,
      buffPlayed: 0,
      sortPlayed: 0, sortCorrect: 0, sortBestStreak: 0,
      memoryPlayed: 0, memoryPairsFound: 0, memoryWon: 0,
      tellenPlayed: 0, tellenCorrect: 0, tellenWrong: 0,
      indringerPlayed: 0, indringerBest: 0,
      groterPlayed: 0, groterCorrect: 0, groterWrong: 0, groterPerfect: 0,
      voedselPlayed: 0, voedselCorrect: 0, voedselWrong: 0, voedselPerfect: 0,
      racePlayed: 0, raceWon: 0,
      puzzelPlayed: 0, puzzelWon: 0, puzzelBestMoves: 0,
      luckyClicked: 0, luckyMissed: 0, luckyDouble: 0, luckyJackpot: 0
    },
    minigames: { quizLast: 0, catcherLast: 0, mathLast: 0, buffLast: 0, sortLast: 0, memoryLast: 0, tellenLast: 0, indringerLast: 0, groterLast: 0, voedselLast: 0, raceLast: 0, puzzelLast: 0 },
    daily: {
      date: '', challenges: [], completed: [], bonusClaimed: false,
      streak: 0, lastCompletedDate: '',
      uniqueMinigames: [], upgradesBought: 0, memoryLowFaults: 0,
      snapshots: {}
    },
    lastTick: Date.now()
  };
  ANIMALS.forEach(a => s.animals[a.id] = 0);
  return s;
}

let state = defaultState();

/* ================================================================
   SECTIE 3: GETALLEN FORMATTEREN
   ================================================================ */

const NUM_NAMES = [
  {val:1e24, name:'quadriljoen'}, {val:1e21, name:'triljard'}, {val:1e18, name:'triljoen'},
  {val:1e15, name:'biljard'}, {val:1e12, name:'biljoen'}, {val:1e9, name:'miljard'},
  {val:1e6, name:'miljoen'}
];

function formatNumber(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (!isFinite(n)) return 'oneindig';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1 && n > 0) return n.toFixed(1).replace('.', ',');
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('nl-NL');
  for (const {val, name} of NUM_NAMES) {
    if (n >= val) {
      const d = n / val;
      if (d < 100) return d.toFixed(1).replace('.', ',') + ' ' + name;
      if (d < 1e6) return Math.floor(d).toLocaleString('nl-NL') + ' ' + name;
      break; // getal te groot voor naamnotatie, val door naar wetenschappelijk
    }
  }
  // thousands
  if (n >= 10000 && n < 1e6) return Math.floor(n).toLocaleString('nl-NL');
  // wetenschappelijke notatie als fallback voor astronomisch grote getallen
  const exp = Math.floor(Math.log10(n));
  const mantissa = (n / Math.pow(10, exp)).toFixed(1).replace('.', ',');
  return mantissa + '\u00d710^' + exp;
}

function formatDps(n) {
  if (n < 0.1) return '0';
  if (n < 10) return n.toFixed(1).replace('.', ',');
  return formatNumber(n);
}

const APPLE_EMOJI_BASE = 'emoji/';
const HIRES_EMOJI = {
  '🐜':'1f41c','🐌':'1f40c','🐸':'1f438','🐔':'1f414','🐱':'1f431',
  '🐕':'1f415','🦙':'1f999','🐴':'1f434','🐼':'1f43c','🐘':'1f418','🐋':'1f40b','🐉':'1f409'
};
function parseAppleEmoji(el) {
  if (typeof twemoji === 'undefined') return;
  twemoji.parse(el, {
    callback: function(icon) {
      return APPLE_EMOJI_BASE + icon + '.png';
    },
    ext: '.png'
  });
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds/60) + 'm ' + (seconds%60) + 's';
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  if (h < 24) return h + 'u ' + m + 'm';
  const d = Math.floor(h/24);
  return d + 'd ' + (h%24) + 'u';
}

/* ================================================================
   SECTIE 4: SAVEGAME (INI formaat)
   ================================================================ */

function stateToIni() {
  let lines = [];
  lines.push('# === DIERENKLIKKER SAVEGAME ===');
  lines.push('# Je mag dit bestand aanpassen!');
  lines.push('# Tip: verander je punten of voeg dieren toe ;)');
  lines.push('');
  lines.push('[meta]');
  lines.push('versie=' + SAVE_VERSION);
  lines.push('opgeslagen=' + new Date().toISOString());
  lines.push('');
  lines.push('[speler]');
  lines.push('punten=' + Math.floor(state.currentPoints));
  lines.push('totaal_verdiend=' + Math.floor(state.totalEarned));
  lines.push('totaal_klikken=' + state.totalClicks);
  lines.push('speeltijd=' + Math.floor(state.playTimeSeconds));
  lines.push('');
  lines.push('[dieren]');
  ANIMALS.forEach(a => lines.push(a.id + '=' + (state.animals[a.id] || 0)));
  lines.push('');
  lines.push('[upgrades]');
  const allUpgrades = getAllUpgradeIds();
  allUpgrades.forEach(id => { if (state.upgrades[id]) lines.push(id + '=1'); });
  lines.push('');
  lines.push('[prestaties]');
  Object.keys(state.achievements).forEach(id => { if (state.achievements[id]) lines.push(id + '=1'); });
  lines.push('');
  lines.push('[evolutie]');
  lines.push('sterren=' + state.prestige.stars);
  lines.push('keer_geevolueerd=' + state.prestige.timesReset);
  lines.push('thema=' + (state.prestige.theme || 'oerwoud'));
  lines.push('thema_vast=' + (state.prestige.themeLocked ? '1' : '0'));
  lines.push('');
  lines.push('[sterrenwinkel]');
  Object.keys(state.prestige.perks || {}).forEach(id => { if (state.prestige.perks[id]) lines.push(id + '=1'); });
  lines.push('');
  lines.push('[allertijden]');
  lines.push('totaal_klikken=' + state.allTime.totalClicks);
  lines.push('totaal_verdiend=' + Math.floor(state.allTime.totalEarned));
  lines.push('totaal_dieren=' + state.allTime.totalAnimals);
  lines.push('speeltijd=' + Math.floor(state.allTime.playTimeSeconds));
  lines.push('');
  lines.push('[statistieken]');
  Object.keys(state.stats).forEach(k => lines.push(k + '=' + state.stats[k]));
  lines.push('');
  lines.push('[dagelijks]');
  lines.push('datum=' + (state.daily.date || ''));
  lines.push('uitdagingen=' + (state.daily.challenges || []).join(','));
  lines.push('voltooid=' + (state.daily.completed || []).map(v => v ? '1' : '0').join(','));
  lines.push('bonus_geclaimd=' + (state.daily.bonusClaimed ? '1' : '0'));
  lines.push('streak=' + (state.daily.streak || 0));
  lines.push('laatste_voltooid=' + (state.daily.lastCompletedDate || ''));
  lines.push('unieke_minigames=' + (state.daily.uniqueMinigames || []).join(','));
  lines.push('upgrades_gekocht=' + (state.daily.upgradesBought || 0));
  lines.push('memory_low_faults=' + (state.daily.memoryLowFaults || 0));
  lines.push('snapshots=' + JSON.stringify(state.daily.snapshots || {}));
  lines.push('');
  lines.push('[minispellen]');
  lines.push('quiz_laatst=' + state.minigames.quizLast);
  lines.push('vanger_laatst=' + state.minigames.catcherLast);
  lines.push('wiskunde_laatst=' + state.minigames.mathLast);
  lines.push('buff_laatst=' + state.minigames.buffLast);
  lines.push('sorteren_laatst=' + state.minigames.sortLast);
  lines.push('memory_laatst=' + state.minigames.memoryLast);
  lines.push('tellen_laatst=' + state.minigames.tellenLast);
  lines.push('indringer_laatst=' + state.minigames.indringerLast);
  lines.push('groter_laatst=' + state.minigames.groterLast);
  lines.push('voedsel_laatst=' + state.minigames.voedselLast);
  lines.push('race_laatst=' + state.minigames.raceLast);
  lines.push('puzzel_laatst=' + state.minigames.puzzelLast);
  return lines.join('\n');
}

function getAllUpgradeIds() {
  const ids = [];
  ANIMALS.forEach(a => a.upgrades.forEach(u => ids.push(u.id)));
  CLICK_UPGRADES.forEach(u => ids.push(u.id));
  GLOBAL_UPGRADES.forEach(u => ids.push(u.id));
  OFFLINE_UPGRADES.forEach(u => ids.push(u.id));
  return ids;
}

function parseIni(text) {
  const result = {};
  let section = null;
  text.split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith(';')) return;
    const sm = t.match(/^\[([^\]]+)\]$/);
    if (sm) { section = sm[1].toLowerCase(); result[section] = result[section] || {}; return; }
    if (section) {
      const eq = t.indexOf('=');
      if (eq > 0) {
        result[section][t.substring(0, eq).trim().toLowerCase()] = t.substring(eq + 1).trim();
      }
    }
  });
  return result;
}

function safeInt(val, def, min, max) {
  if (def === undefined) def = 0;
  if (min === undefined) min = 0;
  if (max === undefined) max = Number.MAX_SAFE_INTEGER;
  const n = parseInt(val);
  if (isNaN(n) || !isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function safeFloat(val, def, min) {
  if (def === undefined) def = 0;
  if (min === undefined) min = 0;
  const n = parseFloat(val);
  if (isNaN(n) || !isFinite(n)) return def;
  return Math.max(min, n);
}

function iniToState(text) {
  let ini;
  try { ini = parseIni(text); } catch(e) { return null; }
  if (!ini || typeof ini !== 'object') return null;

  const s = defaultState();

  // Player
  const sp = ini.speler || ini.player || {};
  s.currentPoints = safeFloat(sp.punten || sp.current_points, 0, 0);
  s.totalEarned = safeFloat(sp.totaal_verdiend || sp.total_earned, 0, 0);
  s.totalClicks = safeInt(sp.totaal_klikken || sp.total_clicks, 0, 0);
  s.playTimeSeconds = safeFloat(sp.speeltijd || sp.play_time_seconds, 0, 0);

  // Animals
  const da = ini.dieren || ini.animals || {};
  ANIMALS.forEach(a => {
    if (da[a.id] !== undefined) s.animals[a.id] = safeInt(da[a.id], 0, 0);
  });

  // Upgrades
  const du = ini.upgrades || {};
  const validUpgrades = new Set(getAllUpgradeIds());
  Object.keys(du).forEach(id => {
    if (validUpgrades.has(id) && safeInt(du[id], 0) > 0) s.upgrades[id] = 1;
  });

  // Achievements
  const dp = ini.prestaties || ini.achievements || {};
  Object.keys(dp).forEach(id => {
    if (safeInt(dp[id], 0) > 0) s.achievements[id] = 1;
  });

  // Prestige
  const de = ini.evolutie || ini.prestige || {};
  s.prestige.stars = safeInt(de.sterren || de.stars, 0, 0);
  s.prestige.timesReset = safeInt(de.keer_geevolueerd || de.times_reset, 0, 0);
  s.prestige.theme = (de.thema || de.theme || 'oerwoud').toString();
  s.prestige.themeLocked = (de.thema_vast === '1');

  // Star shop perks
  const sw = ini.sterrenwinkel || {};
  const validPerks = new Set();
  STAR_SHOP.forEach(cat => cat.perks.forEach(p => validPerks.add(p.id)));
  Object.keys(sw).forEach(id => {
    if (validPerks.has(id) && safeInt(sw[id], 0) > 0) s.prestige.perks[id] = 1;
  });

  // All-time stats
  const at = ini.allertijden || {};
  s.allTime.totalClicks = safeInt(at.totaal_klikken, 0, 0);
  s.allTime.totalEarned = safeFloat(at.totaal_verdiend, 0, 0);
  s.allTime.totalAnimals = safeInt(at.totaal_dieren, 0, 0);
  s.allTime.playTimeSeconds = safeFloat(at.speeltijd, 0, 0);

  // Stats
  const st = ini.statistieken || {};
  Object.keys(s.stats).forEach(k => {
    if (st[k.toLowerCase()] !== undefined) s.stats[k] = safeInt(st[k.toLowerCase()], 0, 0);
  });

  // Minigames
  const dm = ini.minispellen || ini.minigames || {};
  s.minigames.quizLast = safeInt(dm.quiz_laatst || dm.quiz_last_played, 0, 0);
  s.minigames.catcherLast = safeInt(dm.vanger_laatst || dm.vanger_last_played || dm.catcher_last_played, 0, 0);
  s.minigames.mathLast = safeInt(dm.wiskunde_laatst, 0, 0);
  s.minigames.buffLast = safeInt(dm.buff_laatst, 0, 0);
  s.minigames.sortLast = safeInt(dm.sorteren_laatst, 0, 0);
  s.minigames.memoryLast = safeInt(dm.memory_laatst, 0, 0);
  s.minigames.tellenLast = safeInt(dm.tellen_laatst, 0, 0);
  s.minigames.indringerLast = safeInt(dm.indringer_laatst, 0, 0);
  s.minigames.groterLast = safeInt(dm.groter_laatst, 0, 0);
  s.minigames.voedselLast = safeInt(dm.voedsel_laatst, 0, 0);
  s.minigames.raceLast = safeInt(dm.race_laatst, 0, 0);
  s.minigames.puzzelLast = safeInt(dm.puzzel_laatst, 0, 0);

  // Daily challenges
  const dd = ini.dagelijks || {};
  s.daily.date = (dd.datum || '').toString();
  s.daily.challenges = (dd.uitdagingen || '').split(',').filter(x => x);
  s.daily.completed = (dd.voltooid || '').split(',').map(v => v === '1');
  s.daily.bonusClaimed = dd.bonus_geclaimd === '1';
  s.daily.streak = safeInt(dd.streak, 0, 0);
  s.daily.lastCompletedDate = (dd.laatste_voltooid || '').toString();
  s.daily.uniqueMinigames = (dd.unieke_minigames || '').split(',').filter(x => x);
  s.daily.upgradesBought = safeInt(dd.upgrades_gekocht, 0, 0);
  s.daily.memoryLowFaults = safeInt(dd.memory_low_faults, 0, 0);
  try { s.daily.snapshots = JSON.parse(dd.snapshots || '{}'); } catch(e) { s.daily.snapshots = {}; }

  // === Save migration ===
  const saveVersion = safeInt((ini.meta || {}).versie, 1, 1);
  const da2 = ini.dieren || ini.animals || {};
  const du2 = ini.upgrades || {};

  if (saveVersion < 2) {
    // v1 (10 dieren) → v3 (12 dieren met lama+panda)
    // v1 had: mier,slak,kikker,kip,kat,hond,paard,olifant,walvis,draak
    // v3 heeft: mier,slak,kikker,kip,kat,hond,LAMA,paard,PANDA,olifant,walvis,draak
    // Shift: paard→lama, olifant→paard, walvis→panda, draak→olifant, walvis+draak=0
    // Read all originals first to avoid overwriting
    const origPaard = s.animals['paard'] || 0;
    const origOlifant = s.animals['olifant'] || 0;
    const origWalvis = s.animals['walvis'] || 0;
    const origDraak = s.animals['draak'] || 0;
    s.animals['lama'] = origPaard;
    s.animals['paard'] = origOlifant;
    s.animals['panda'] = origWalvis;
    s.animals['olifant'] = origDraak;
    s.animals['walvis'] = 0;
    s.animals['draak'] = 0;
    // Same for upgrades
    const upgRemap = [['paard','lama'],['olifant','paard'],['walvis','panda'],['draak','olifant']];
    const savedUpg = {};
    upgRemap.forEach(([from]) => {
      for (let i = 1; i <= 5; i++) {
        const key = from + '_' + i;
        if (s.upgrades[key]) { savedUpg[key] = 1; delete s.upgrades[key]; }
      }
    });
    upgRemap.forEach(([from, to]) => {
      for (let i = 1; i <= 5; i++) {
        if (savedUpg[from + '_' + i]) s.upgrades[to + '_' + i] = 1;
      }
    });
  } else if (saveVersion < 3) {
    // v2 (12 dieren met pinguïn) → v3 (pinguïn wordt lama)
    // Read pinguin data from raw INI since it's not in ANIMALS anymore
    if (da2.pinguin !== undefined) {
      s.animals['lama'] = safeInt(da2.pinguin, 0, 0);
    }
    for (let i = 1; i <= 5; i++) {
      if (safeInt(du2['pinguin_' + i], 0) > 0) {
        s.upgrades['lama_' + i] = 1;
      }
    }
  }

  // Ensure totalEarned >= currentPoints
  if (s.totalEarned < s.currentPoints) s.totalEarned = s.currentPoints;

  // Ensure allTime >= current run values (migration for existing saves)
  if (s.allTime.totalClicks < s.totalClicks) s.allTime.totalClicks = s.totalClicks;
  if (s.allTime.totalEarned < s.totalEarned) s.allTime.totalEarned = s.totalEarned;
  if (s.allTime.playTimeSeconds < s.playTimeSeconds) s.allTime.playTimeSeconds = s.playTimeSeconds;
  const curTotalAnimals = ANIMALS.reduce((sum, a) => sum + (s.animals[a.id]||0), 0);
  if (s.allTime.totalAnimals < curTotalAnimals) s.allTime.totalAnimals = curTotalAnimals;

  s.lastTick = Date.now();
  return s;
}

function saveGame() {
  try {
    state.lastTick = Date.now();
    localStorage.setItem('dierenklikker_save', stateToIni());
  } catch(e) {}
}

function cleanupObsoleteAchievements() {
  const validIds = new Set(achievementDefs.map(a => a.id));
  Object.keys(state.achievements).forEach(k => {
    if (!validIds.has(k)) delete state.achievements[k];
  });
}

function loadGame() {
  try {
    const data = localStorage.getItem('dierenklikker_save');
    if (!data) return false;
    const loaded = iniToState(data);
    if (!loaded) return false;
    const oldTick = loaded.lastTick;
    loaded.lastTick = Date.now();

    // Calculate offline earnings
    const saved = parseIni(data);
    const meta = saved.meta || {};
    let savedTime = 0;
    if (meta.opgeslagen || meta.last_saved) {
      const d = new Date(meta.opgeslagen || meta.last_saved);
      if (!isNaN(d.getTime())) savedTime = d.getTime();
    }
    if (savedTime > 0) {
      const elapsed = Math.min((Date.now() - savedTime) / 1000, MAX_OFFLINE_SECONDS);
      if (elapsed > 60) {
        state = loaded;
        const offlinePct = getOfflinePercent();
        if (offlinePct > 0) {
          const dps = getTotalDps();
          const earnings = dps * elapsed * (offlinePct / 100);
          if (earnings > 0) {
            state.currentPoints += earnings;
            state.totalEarned += earnings;
            state.allTime.totalEarned += earnings;
            showOfflineModal(earnings, elapsed);
          }
        }
        cleanupObsoleteAchievements();
        return true;
      }
    }
    state = loaded;
    cleanupObsoleteAchievements();
    return true;
  } catch(e) { return false; }
}

function exportSave() {
  const text = stateToIni();
  const blob = new Blob([text], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dierenklikker-savegame.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Savegame gedownload!');
}

function showImportModal() {
  document.getElementById('import-text').value = stateToIni();
  showModal('import-modal');
}

function doImport() {
  const text = document.getElementById('import-text').value;
  const loaded = iniToState(text);
  if (!loaded) {
    closeModal('import-modal');
    document.getElementById('error-text').textContent =
      'Je savegame kon niet gelezen worden. Controleer of het formaat klopt!';
    showModal('error-modal');
    return;
  }
  loaded.lastTick = Date.now();
  state = loaded;
  // Award the hacker achievement
  if (!state.achievements['savegame_hacker']) {
    state.achievements['savegame_hacker'] = 1;
    showToast('🏆 Prestatie: Savegame Hacker!');
  }
  closeModal('import-modal');
  saveGame();
  buildShop();
  parseAppleEmoji(document.body);
  showToast('Savegame geladen!');
}

function resetGame() {
  if (!confirm('Weet je het zeker? Je verliest ALLES!')) return;
  state = defaultState();
  localStorage.removeItem('dierenklikker_save');
  buildShop();
  parseAppleEmoji(document.body);
  showToast('Spel gereset!');
}

