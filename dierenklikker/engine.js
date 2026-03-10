/* ================================================================
   SECTIE 5: BEREKENINGEN
   ================================================================ */

function hasPerk(id) { return !!(state.prestige.perks && state.prestige.perks[id]); }

function getZooStarsSpent() {
  if (!state.zoo || !state.zoo.enclosures) return 0;
  let spent = 0;
  Object.values(state.zoo.enclosures).forEach(enc => {
    for (let i = 1; i < (enc.level || 1); i++) {
      if (ZOO_LEVELS[i]) spent += ZOO_LEVELS[i].cost;
    }
  });
  return spent;
}

function getAvailableStars() {
  let spent = 0;
  STAR_SHOP.forEach(cat => cat.perks.forEach(p => { if (hasPerk(p.id)) spent += p.cost; }));
  spent += getZooStarsSpent();
  return state.prestige.stars - spent;
}

function getSynergyBonus(animalId) {
  let bonus = 0;
  STAR_SHOP.forEach(cat => {
    cat.perks.forEach(p => {
      if (!p.bonus || !hasPerk(p.id)) return;
      if (p.animals) {
        // Specific animal synergy: only boost those animals, and only if all are owned
        if (p.animals.indexOf(animalId) !== -1 && p.animals.every(a => (state.animals[a] || 0) > 0)) {
          bonus += p.bonus;
        }
      } else if (p.id === 'sp_syn5') {
        // Dierenrijk: all animals get bonus if all 4 synergies are active
        if (hasPerk('sp_syn1') && hasPerk('sp_syn2') && hasPerk('sp_syn3') && hasPerk('sp_syn4')) {
          bonus += p.bonus;
        }
      }
    });
  });
  return bonus;
}

function getCooldownMultiplier() {
  if (hasPerk('sp_cd2')) return 0.70;
  if (hasPerk('sp_cd1')) return 0.85;
  return 1;
}

function getBuffDuration() {
  return hasPerk('sp_buff1') ? 60000 : 30000;
}

function getBuffStrength() {
  return hasPerk('sp_buff2') ? 1.5 : 1;
}

function buyPerk(perkId) {
  const perk = findPerk(perkId);
  if (!perk) return;
  if (hasPerk(perkId)) return;
  if (getAvailableStars() < perk.cost) return;
  // Check prerequisite (must own previous perk in same category)
  const cat = STAR_SHOP.find(c => c.perks.some(p => p.id === perkId));
  if (cat) {
    const idx = cat.perks.findIndex(p => p.id === perkId);
    if (idx > 0 && !hasPerk(cat.perks[idx - 1].id)) return;
  }
  state.prestige.perks[perkId] = 1;
  sfxBuy();
  showToast('⭐ ' + perk.name + ' gekocht!');
}

function findPerk(id) {
  for (const cat of STAR_SHOP) {
    const p = cat.perks.find(p => p.id === id);
    if (p) return p;
  }
  return null;
}

function getAnimalPrice(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  let price = Math.ceil(a.basePrice * Math.pow(COST_MULTIPLIER, count));
  if (getActiveBuff('sale')) price = Math.ceil(price * (1 - 0.5 * getBuffStrength()));
  return price;
}

function getBulkPrice(animalId, qty) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  const saleMult = getActiveBuff('sale') ? (1 - 0.5 * getBuffStrength()) : 1;
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += Math.ceil(a.basePrice * Math.pow(COST_MULTIPLIER, count + i) * saleMult);
  }
  return total;
}

function getAnimalDps(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  let dps = a.baseDps;
  // Animal-specific upgrades
  a.upgrades.forEach(u => { if (state.upgrades[u.id]) dps *= u.mult; });
  // Milestone bonuses (auto, ×2 per milestone reached)
  const count = state.animals[animalId] || 0;
  MILESTONES.forEach(m => { if (count >= m) dps *= 2; });
  // Synergy bonus from star shop
  const synBonus = getSynergyBonus(animalId);
  if (synBonus > 0) dps *= (1 + synBonus);
  return dps;
}

function getTotalDps() {
  let total = 0;
  ANIMALS.forEach(a => {
    total += getAnimalDps(a.id) * (state.animals[a.id] || 0);
  });
  // Global upgrade multipliers
  let addPct = 0, mult = 1;
  GLOBAL_UPGRADES.forEach(u => {
    if (state.upgrades[u.id]) {
      if (u.addPercent) addPct += u.addPercent;
      if (u.multiply) mult *= u.multiply;
    }
  });
  total *= (1 + addPct/100) * mult;
  // Achievement bonus
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
  total *= (1 + achCount * ACHIEVEMENT_BONUS);
  // Prestige bonus (all stars count)
  total *= (1 + state.prestige.stars * PRESTIGE_BONUS);
  // Active buff: DPS ×4 (or ×5.5 with stronger buffs)
  if (getActiveBuff('dps2x')) total *= (1 + 3 * getBuffStrength());
  return total;
}

function getClickValue() {
  let base = 1;
  let dpsPct = 0;
  CLICK_UPGRADES.forEach(u => {
    if (state.upgrades[u.id]) {
      if (u.addClick) base += u.addClick;
      if (u.dpsPercent) dpsPct += u.dpsPercent;
    }
  });
  // Prestige bonus on clicks too (all stars count)
  base *= (1 + state.prestige.stars * PRESTIGE_BONUS);
  // Active buff effects on clicks
  if (getActiveBuff('clickdps')) dpsPct += 20 * getBuffStrength();
  return base + getTotalDps() * (dpsPct / 100);
}

function getOfflinePercent() {
  let pct = 0;
  OFFLINE_UPGRADES.forEach(u => { if (state.upgrades[u.id]) pct = u.offlinePct; });
  return pct;
}

function getDpsBreakdown() {
  const total = getTotalDps();
  if (total === 0) return [];
  const breakdown = [];
  let rawAnimalTotal = 0;
  ANIMALS.forEach(a => {
    const count = state.animals[a.id] || 0;
    if (count > 0) {
      const dps = getAnimalDps(a.id) * count;
      rawAnimalTotal += dps;
      breakdown.push({name: a.emoji + ' ' + a.name, dps: dps});
    }
  });
  // Keep ANIMALS array order (shop order)
  // Add bonus info
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
  const achPct = achCount * ACHIEVEMENT_BONUS * 100;
  const starPct = state.prestige.stars * PRESTIGE_BONUS * 100;
  const buffActive = !!getActiveBuff('dps2x');
  return {animals: breakdown, rawTotal: rawAnimalTotal, total: total, achPct: achPct, starPct: starPct, buffActive: buffActive};
}

function getMaxAffordable(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  const saleMult = getActiveBuff('sale') ? (1 - 0.5 * getBuffStrength()) : 1;
  let remaining = state.currentPoints;
  let qty = 0;
  while (qty < 10000) {
    const price = Math.ceil(a.basePrice * Math.pow(COST_MULTIPLIER, count + qty) * saleMult);
    if (remaining < price) break;
    remaining -= price;
    qty++;
  }
  return qty;
}

function getHighestAnimal() {
  for (let i = ANIMALS.length - 1; i >= 0; i--) {
    if ((state.animals[ANIMALS[i].id] || 0) > 0) return ANIMALS[i];
  }
  return ANIMALS[0];
}

function isAnimalVisible(animalId) {
  const idx = ANIMALS.findIndex(a => a.id === animalId);
  if (idx === 0) return true;
  return (state.animals[ANIMALS[idx-1].id] || 0) > 0;
}

function canPrestige() {
  return ANIMALS.every(a => (state.animals[a.id] || 0) > 0);
}

function getPrestigeStars() {
  if (state.totalEarned < 1e10) return 0;
  // Each star requires 10× more earnings, plus owned stars raise threshold
  // Penalty: +0.02 log10 per owned star (~5% harder per star)
  // At 0 stars: 1e10 for 1st. At 100: 1e12. At 300: 1e16. Ceiling ~400 stars.
  const threshold = 9 + state.prestige.stars * 0.02;
  return Math.max(0, Math.floor(Math.log10(state.totalEarned) - threshold));
}

function getNextStarInfo() {
  const threshold = 9 + state.prestige.stars * 0.02;
  const currentStars = getPrestigeStars();
  const nextTarget = Math.pow(10, threshold + currentStars + 1);
  const remaining = nextTarget - state.totalEarned;
  if (remaining <= 0) return { remaining: 0, seconds: 0 };
  let effectiveDps = getTotalDps();
  if (hasPerk('sp_auto')) effectiveDps += getClickValue();
  if (effectiveDps <= 0) return { remaining, seconds: Infinity };
  return { remaining, seconds: remaining / effectiveDps };
}

/* ================================================================
   SECTIE 5b: WOLKENDIERENTUIN
   ================================================================ */

function ensureZooEnclosures() {
  if (!state.zoo) state.zoo = { enclosures: {} };
  ANIMALS.forEach(a => {
    if (!state.zoo.enclosures[a.id]) {
      state.zoo.enclosures[a.id] = {
        level: 1,
        happiness: 50,
        food: ZOO_MAX_FOOD,
        lastDecay: Date.now()
      };
    }
  });
}

function updateZooHappiness() {
  if (!state.zoo || !state.zoo.enclosures) return;
  const now = Date.now();
  Object.values(state.zoo.enclosures).forEach(enc => {
    const elapsed = (now - (enc.lastDecay || now)) / 3600000;
    if (elapsed <= 0) return;
    const levelInfo = ZOO_LEVELS[(enc.level || 1) - 1];
    enc.happiness = Math.max(0, (enc.happiness || 0) - levelInfo.decayPerHour * elapsed);
    enc.lastDecay = now;
  });
}

function getZooSpawnInterval(happiness) {
  if (happiness >= 90) return 90;   // 1.5 min
  if (happiness >= 60) return 120;  // 2 min
  if (happiness >= 30) return 180;  // 3 min
  return Infinity;
}

function getZooStarChance(happiness) {
  if (happiness >= 90) return 0.10;  // 1 in 10
  if (happiness >= 60) return 0.075;
  if (happiness >= 30) return 0.05;  // 1 in 20
  return 0.05;
}

function getZooAvailableStars() {
  let total = (typeof prestigeCache !== 'undefined' && prestigeCache) ? prestigeCache.totalStars : state.prestige.stars;
  let spent = 0;
  STAR_SHOP.forEach(cat => cat.perks.forEach(p => { if (hasPerk(p.id)) spent += p.cost; }));
  spent += getZooStarsSpent();
  return total - spent;
}

/* ================================================================
   SECTIE 6: ACHIEVEMENTS
   ================================================================ */

function buildAchievementDefs() {
  const defs = [];
  // Per-animal milestones
  ANIMALS.forEach(a => {
    MILESTONES.forEach((m, mi) => {
      defs.push({
        id: a.id + '_' + m,
        emoji: a.emoji,
        name: m + ' ' + a.plural,
        desc: 'Je hebt ' + m + ' ' + a.plural + '!',
        group: a.name,
        check: () => (state.animals[a.id] || 0) >= m,
        progress: () => ({cur: state.animals[a.id] || 0, max: m})
      });
    });
  });
  // Total animals
  const totalMilestones = [
    [10, 'Mini dierentuin'], [50, 'Dierenverzamelaar'], [100, 'Dierentuin directeur'],
    [500, 'Dierenrijk'], [1000, 'Dierenwereld'], [3000, 'Dierenplaneet']
  ];
  totalMilestones.forEach(([n, name]) => {
    defs.push({
      id: 'totaal_' + n, emoji: '🏠', name: name,
      desc: n + ' dieren in totaal!', group: 'Totaal',
      check: () => ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0) >= n,
      progress: () => ({cur: ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0), max: n})
    });
  });
  // Click milestones
  const clickMilestones = [
    [100, 'Klik klik klik'], [1000, 'Doordrukker'], [5000, 'Klikkampioen'],
    [15000, 'Supersnelle vinger'], [35000, 'Kliklegende'],
    [50000, 'Klikmachine'], [100000, 'Klikgod']
  ];
  clickMilestones.forEach(([n, name]) => {
    defs.push({
      id: 'klik_' + n, emoji: '👆', name: name,
      desc: formatNumber(n) + ' keer geklikt!', group: 'Klikken',
      check: () => state.allTime.totalClicks >= n,
      progress: () => ({cur: state.allTime.totalClicks, max: n})
    });
  });
  // Points milestones
  const pointMilestones = [
    [1000, 'Eerste duizend', '🪙'], [1e6, 'Miljonair', '💰'],
    [1e9, 'Miljardair', '💎'], [1e12, 'Biljonair', '👑'], [1e15, 'Biljardair', '🌟']
  ];
  pointMilestones.forEach(([n, name, em]) => {
    defs.push({
      id: 'punten_' + n, emoji: em, name: name,
      desc: formatNumber(n) + ' punten verdiend!', group: 'Punten',
      check: () => state.totalEarned >= n,
      progress: () => ({cur: state.totalEarned, max: n})
    });
  });
  // Upgrade mastery (all upgrades for an animal)
  ANIMALS.forEach(a => {
    defs.push({
      id: 'upgmax_' + a.id, emoji: a.emoji, name: a.name + '-meester',
      desc: 'Alle ' + a.name.toLowerCase() + '-upgrades gekocht!', group: 'Upgrades',
      check: () => a.upgrades.every(u => !!state.upgrades[u.id])
    });
  });
  defs.push({
    id: 'upgmax_alle', emoji: '🏅', name: 'Volledig getraind!',
    desc: 'Alle dier-upgrades gekocht!', group: 'Upgrades',
    check: () => ANIMALS.every(a => a.upgrades.every(u => !!state.upgrades[u.id]))
  });

  // Balance milestones (current points)
  const balanceMilestones = [
    [1000, 'Spaarpotje', '🐷'],
    [100000, 'Volle portemonnee', '👛'],
    [10e6, 'Kluis vol', '🔐'],
    [1e9, 'Bankier', '🏦'],
    [100e9, 'Goudreserve', '🥇'],
    [10e12, 'Schatkamer', '💎'],
    [1e15, 'Fort Knox', '🏰'],
    [100e15, 'Drakenschat', '🐲'],
    [10e18, 'Sterrenkapitaal', '🌠'],
    [1e21, 'Universeelrijk', '🌌']
  ];
  balanceMilestones.forEach(([n, name, em]) => {
    defs.push({
      id: 'saldo_' + n, emoji: em, name: name,
      desc: formatNumber(n) + ' punten op je saldo!', group: 'Saldo',
      check: () => state.currentPoints >= n,
      progress: () => ({cur: state.currentPoints, max: n})
    });
  });

  // Lucky bug achievements
  defs.push({
    id: 'lucky_1', emoji: '🐞', name: 'Geluksvogel',
    desc: 'Je eerste lieveheersbeestje gevangen!', group: 'Geluk',
    check: () => (state.stats.luckyClicked || 0) >= 1,
    progress: () => ({cur: state.stats.luckyClicked || 0, max: 1})
  });
  defs.push({
    id: 'lucky_25', emoji: '🐞', name: 'Geluksjager',
    desc: '25 lieveheersbeestjes gevangen!', group: 'Geluk',
    check: () => (state.stats.luckyClicked || 0) >= 25,
    progress: () => ({cur: state.stats.luckyClicked || 0, max: 25})
  });
  defs.push({
    id: 'lucky_100', emoji: '🐞', name: 'Meester der fortuin',
    desc: '100 lieveheersbeestjes gevangen!', group: 'Geluk',
    check: () => (state.stats.luckyClicked || 0) >= 100,
    progress: () => ({cur: state.stats.luckyClicked || 0, max: 100})
  });
  defs.push({
    id: 'lucky_double', emoji: '🐞', name: 'Dubbel geluk!',
    desc: 'Twee lieveheersbeestjes tegelijk gevangen!', group: 'Geluk',
    check: () => (state.stats.luckyDouble || 0) >= 1
  });
  defs.push({
    id: 'lucky_jackpot', emoji: '🐞', name: 'Jackpot!',
    desc: 'Een jackpot-lieveheersbeestje gevangen!', group: 'Geluk',
    check: () => (state.stats.luckyJackpot || 0) >= 1
  });

  // Minigames — Overkoepelend
  const mgPlayedKeys = ['quizPlayed','catcherPlayed','mathPlayed','sortPlayed','memoryPlayed','tellenPlayed','indringerPlayed','groterPlayed','racePlayed','puzzelPlayed','voedselPlayed','buffPlayed'];
  defs.push({
    id: 'mg_alleskunner', emoji: '🎮', name: 'Alleskunner',
    desc: 'Elke minigame minstens 1 keer gespeeld!', group: 'Minigames',
    check: () => mgPlayedKeys.every(k => (state.stats[k] || 0) >= 1),
    progress: () => ({cur: mgPlayedKeys.filter(k => (state.stats[k] || 0) >= 1).length, max: mgPlayedKeys.length})
  });
  defs.push({
    id: 'mg_meester', emoji: '🎮', name: 'Minigame Meester',
    desc: '100 minigames gespeeld!', group: 'Minigames',
    check: () => mgPlayedKeys.reduce((s, k) => s + (state.stats[k] || 0), 0) >= 100,
    progress: () => ({cur: mgPlayedKeys.reduce((s, k) => s + (state.stats[k] || 0), 0), max: 100})
  });

  // Minigames — Quiz
  defs.push({
    id: 'mg_quiz_25', emoji: '❓', name: 'Slimmerik',
    desc: '25 quizvragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.quizCorrect || 0) >= 25,
    progress: () => ({cur: state.stats.quizCorrect || 0, max: 25})
  });
  defs.push({
    id: 'mg_quiz_100', emoji: '❓', name: 'Wandelende encyclopedie',
    desc: '100 quizvragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.quizCorrect || 0) >= 100,
    progress: () => ({cur: state.stats.quizCorrect || 0, max: 100})
  });

  // Minigames — Catcher
  defs.push({
    id: 'mg_catcher_100', emoji: '🪤', name: 'Dierenvanger',
    desc: '100 dieren gevangen!', group: 'Minigames',
    check: () => (state.stats.catcherCaught || 0) >= 100,
    progress: () => ({cur: state.stats.catcherCaught || 0, max: 100})
  });
  defs.push({
    id: 'mg_catcher_500', emoji: '🪤', name: 'Snelle handen',
    desc: '500 dieren gevangen!', group: 'Minigames',
    check: () => (state.stats.catcherCaught || 0) >= 500,
    progress: () => ({cur: state.stats.catcherCaught || 0, max: 500})
  });

  // Minigames — Wiskunde
  defs.push({
    id: 'mg_math_25', emoji: '🔢', name: 'Rekenwonder',
    desc: '25 rekenvragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.mathCorrect || 0) >= 25,
    progress: () => ({cur: state.stats.mathCorrect || 0, max: 25})
  });
  defs.push({
    id: 'mg_math_100', emoji: '🔢', name: 'Wiskunde kampioen',
    desc: '100 rekenvragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.mathCorrect || 0) >= 100,
    progress: () => ({cur: state.stats.mathCorrect || 0, max: 100})
  });

  // Minigames — Sorteren
  defs.push({
    id: 'mg_sort_50', emoji: '📦', name: 'Sorteerder',
    desc: '50 dieren goed gesorteerd!', group: 'Minigames',
    check: () => (state.stats.sortCorrect || 0) >= 50,
    progress: () => ({cur: state.stats.sortCorrect || 0, max: 50})
  });
  defs.push({
    id: 'mg_sort_streak', emoji: '📦', name: 'Sorteerkoning',
    desc: 'Een streak van 15 in één sorteer-potje!', group: 'Minigames',
    check: () => (state.stats.sortBestStreak || 0) >= 15,
    progress: () => ({cur: state.stats.sortBestStreak || 0, max: 15})
  });

  // Minigames — Memory
  defs.push({
    id: 'mg_memory_10', emoji: '🧠', name: 'Goed geheugen',
    desc: '10 memory potjes gewonnen!', group: 'Minigames',
    check: () => (state.stats.memoryPlayed || 0) >= 10,
    progress: () => ({cur: state.stats.memoryPlayed || 0, max: 10})
  });
  defs.push({
    id: 'mg_memory_perfect', emoji: '🧠', name: 'Fotografisch geheugen',
    desc: 'Memory gewonnen met 0 fouten!', group: 'Minigames',
    check: () => (state.stats.memoryWon || 0) >= 1
  });

  // Minigames — Tellen
  defs.push({
    id: 'mg_tellen_25', emoji: '🔍', name: 'Goed geteld!',
    desc: '25 telvragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.tellenCorrect || 0) >= 25,
    progress: () => ({cur: state.stats.tellenCorrect || 0, max: 25})
  });

  // Minigames — Indringer
  defs.push({
    id: 'mg_indringer_10', emoji: '🕵️', name: 'Speurder',
    desc: 'Score van 10 in één indringer-potje!', group: 'Minigames',
    check: () => (state.stats.indringerBest || 0) >= 10,
    progress: () => ({cur: state.stats.indringerBest || 0, max: 10})
  });
  defs.push({
    id: 'mg_indringer_20', emoji: '🕵️', name: 'Detective',
    desc: 'Score van 20 in één indringer-potje!', group: 'Minigames',
    check: () => (state.stats.indringerBest || 0) >= 20,
    progress: () => ({cur: state.stats.indringerBest || 0, max: 20})
  });

  // Minigames — Groter of Kleiner
  defs.push({
    id: 'mg_groter_50', emoji: '⚖️', name: 'Dierenkenner',
    desc: '50 groter/kleiner-vragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.groterCorrect || 0) >= 50,
    progress: () => ({cur: state.stats.groterCorrect || 0, max: 50})
  });
  defs.push({
    id: 'mg_groter_perfect', emoji: '⚖️', name: 'Gewichtsexpert',
    desc: '10/10 goed in één groter/kleiner-potje!', group: 'Minigames',
    check: () => (state.stats.groterPerfect || 0) >= 1,
    progress: () => ({cur: state.stats.groterPerfect || 0, max: 1})
  });

  // Minigames — Paardenrace
  defs.push({
    id: 'mg_race_10', emoji: '🏇', name: 'Gokker',
    desc: '10 races gewonnen!', group: 'Minigames',
    check: () => (state.stats.raceWon || 0) >= 10,
    progress: () => ({cur: state.stats.raceWon || 0, max: 10})
  });
  defs.push({
    id: 'mg_race_25', emoji: '🏇', name: 'Geluksvogel',
    desc: '25 races gewonnen!', group: 'Minigames',
    check: () => (state.stats.raceWon || 0) >= 25,
    progress: () => ({cur: state.stats.raceWon || 0, max: 25})
  });

  // Minigames — Puzzel
  defs.push({
    id: 'mg_puzzel_10', emoji: '🧩', name: 'Puzzelaar',
    desc: '10 puzzels opgelost!', group: 'Minigames',
    check: () => (state.stats.puzzelWon || 0) >= 10,
    progress: () => ({cur: state.stats.puzzelWon || 0, max: 10})
  });
  defs.push({
    id: 'mg_puzzel_fast', emoji: '🧩', name: 'Puzzel genie',
    desc: 'Puzzel opgelost in minder dan 30 zetten!', group: 'Minigames',
    check: () => (state.stats.puzzelBestMoves || 999) <= 30,
    progress: () => ({cur: Math.min(state.stats.puzzelBestMoves || 999, 999), max: 30, invert: true})
  });

  // Minigames — Voedsel
  defs.push({
    id: 'mg_voedsel_50', emoji: '🍽️', name: 'Voedselkenner',
    desc: '50 voedsel-vragen goed beantwoord!', group: 'Minigames',
    check: () => (state.stats.voedselCorrect || 0) >= 50,
    progress: () => ({cur: state.stats.voedselCorrect || 0, max: 50})
  });
  defs.push({
    id: 'mg_voedsel_perfect', emoji: '🍽️', name: 'Dierendiëtist',
    desc: '10/10 goed in één voedsel-potje!', group: 'Minigames',
    check: () => (state.stats.voedselPerfect || 0) >= 1,
    progress: () => ({cur: state.stats.voedselPerfect || 0, max: 1})
  });

  // Daily challenges
  defs.push({
    id: 'dc_streak_3', emoji: '📅', name: 'Trouwe speler',
    desc: '3 dagen op rij alle uitdagingen gehaald!', group: 'Dagelijks',
    check: () => (state.daily.streak || 0) >= 3,
    progress: () => ({cur: state.daily.streak || 0, max: 3})
  });
  defs.push({
    id: 'dc_streak_7', emoji: '📅', name: 'Weekkampioen',
    desc: '7 dagen op rij alle uitdagingen gehaald!', group: 'Dagelijks',
    check: () => (state.daily.streak || 0) >= 7,
    progress: () => ({cur: state.daily.streak || 0, max: 7})
  });
  defs.push({
    id: 'dc_streak_30', emoji: '📅', name: 'Maandlegende',
    desc: '30 dagen op rij alle uitdagingen gehaald!', group: 'Dagelijks',
    check: () => (state.daily.streak || 0) >= 30,
    progress: () => ({cur: state.daily.streak || 0, max: 30})
  });

  // Special
  defs.push({
    id: 'alle_dieren', emoji: '🌈', name: 'Alle dieren!',
    desc: 'Minstens 1 van elk dier!', group: 'Speciaal',
    check: () => ANIMALS.every(a => (state.animals[a.id]||0) > 0)
  });
  defs.push({
    id: 'eerste_evolutie', emoji: '⭐', name: 'Geëvolueerd!',
    desc: 'Je eerste evolutie!', group: 'Speciaal',
    check: () => state.prestige.timesReset > 0
  });
  defs.push({
    id: 'savegame_hacker', emoji: '💾', name: 'Savegame Hacker',
    desc: 'Een savegame geïmporteerd!', group: 'Speciaal',
    check: () => !!state.achievements['savegame_hacker']
  });
  return defs;
}

let achievementDefs = buildAchievementDefs();

/* ================================================================
   SECTIE 6b: DAGELIJKSE UITDAGINGEN
   ================================================================ */

const DAILY_CHALLENGE_POOL = [
  // Klikken
  {id:'dc_click_100', emoji:'👆', desc:'Klik 100 keer', stat:'totalClicks', target:100},
  {id:'dc_click_250', emoji:'👆', desc:'Klik 250 keer', stat:'totalClicks', target:250},
  {id:'dc_click_500', emoji:'👆', desc:'Klik 500 keer', stat:'totalClicks', target:500},
  // Kopen
  {id:'dc_buy_5', emoji:'🛒', desc:'Koop 5 dieren', stat:'totalAnimals', target:5},
  {id:'dc_buy_10', emoji:'🛒', desc:'Koop 10 dieren', stat:'totalAnimals', target:10},
  {id:'dc_buy_25', emoji:'🛒', desc:'Koop 25 dieren', stat:'totalAnimals', target:25},
  {id:'dc_upgrade', emoji:'⬆️', desc:'Koop een upgrade', daily:'upgradesBought', target:1},
  // Minigames — algemeen
  {id:'dc_mg_2', emoji:'🎮', desc:'Speel 2 verschillende minigames', daily:'uniqueMinigames', target:2},
  {id:'dc_mg_3', emoji:'🎮', desc:'Speel 3 verschillende minigames', daily:'uniqueMinigames', target:3},
  {id:'dc_mg_5', emoji:'🎮', desc:'Speel 5 minigames', stat:'mgTotal', target:5},
  // Minigames — specifiek
  {id:'dc_race', emoji:'🏇', desc:'Win een paardenrace', stat:'raceWon', target:1, req:'paard'},
  {id:'dc_catcher', emoji:'🎯', desc:'Vang 10 dieren in de Vanger', stat:'catcherCaught', target:10, req:'kikker'},
  {id:'dc_quiz', emoji:'🧠', desc:'Beantwoord 5 quizvragen goed', stat:'quizCorrect', target:5, req:'slak'},
  {id:'dc_puzzel', emoji:'🧩', desc:'Los een puzzel op', stat:'puzzelWon', target:1, req:'panda'},
  {id:'dc_sort', emoji:'📦', desc:'Sorteer 10 dieren goed', stat:'sortCorrect', target:10, req:'walvis'},
  {id:'dc_tellen', emoji:'🔢', desc:'Beantwoord 5 telvragen goed', stat:'tellenCorrect', target:5, req:'mier'},
  {id:'dc_math', emoji:'🔢', desc:'Beantwoord 5 rekenvragen goed', stat:'mathCorrect', target:5, req:'kat'},
  {id:'dc_voedsel', emoji:'🍽️', desc:'Beantwoord 5 voedsel-vragen goed', stat:'voedselCorrect', target:5, req:'olifant'},
  {id:'dc_indringer', emoji:'🕵️', desc:'Scoor 5+ bij de Indringer', stat:'indringerBest', target:5, req:'kip', best:true},
  // Geluk & buff
  {id:'dc_lucky', emoji:'🐞', desc:'Vang een lieveheersbeestje', stat:'luckyClicked', target:1},
  {id:'dc_buff', emoji:'✨', desc:'Gebruik een buff', stat:'buffPlayed', target:1, req:'lama'},
  // Speciaal
  {id:'dc_memory', emoji:'🃏', desc:'Win memory met max 1 fout', daily:'memoryLowFaults', target:1, req:'draak'},
  {id:'dc_groter_perfect', emoji:'⚖️', desc:'Haal 10/10 bij Groter/Kleiner', stat:'groterPerfect', target:1, req:'hond'},
];

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function dailySeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function takeDailySnapshots() {
  const snap = {};
  // allTime stats
  snap.totalClicks = state.allTime.totalClicks;
  snap.totalAnimals = state.allTime.totalAnimals;
  // minigame stats
  const mgKeys = ['quizCorrect','catcherCaught','mathCorrect','sortCorrect','memoryPlayed',
    'tellenCorrect','indringerBest','groterCorrect','groterPerfect','raceWon',
    'puzzelWon','voedselCorrect','voedselPerfect','luckyClicked','buffPlayed',
    'quizPlayed','catcherPlayed','mathPlayed','sortPlayed','tellenPlayed',
    'indringerPlayed','groterPlayed','racePlayed','puzzelPlayed','voedselPlayed',
    'memoryPlayed','buffPlayed'];
  mgKeys.forEach(k => { snap[k] = state.stats[k] || 0; });
  // Combined minigames total
  snap.mgTotal = ['quizPlayed','catcherPlayed','mathPlayed','sortPlayed','memoryPlayed',
    'tellenPlayed','indringerPlayed','groterPlayed','racePlayed','puzzelPlayed',
    'voedselPlayed','buffPlayed'].reduce((s,k) => s + (state.stats[k]||0), 0);
  return snap;
}

function initDailyChallenges() {
  const today = getTodayStr();
  if (state.daily.date === today) {
    // Fix stale saves from old code: bonus was claimed but streak/lastCompletedDate weren't updated
    if (state.daily.bonusClaimed && state.daily.lastCompletedDate !== today) {
      state.daily.streak++;
      state.daily.lastCompletedDate = today;
    }
    return;
  }

  // Mark previous day as completed if all challenges were done
  if (state.daily.date && state.daily.completed.every(v => v)) {
    state.daily.lastCompletedDate = state.daily.date;
  }
  // Check if streak is broken (gap of 2+ days since last completed day)
  if (state.daily.lastCompletedDate) {
    const last = new Date(state.daily.lastCompletedDate);
    const now = new Date(today);
    const diff = Math.round((now - last) / 86400000);
    if (diff > 1) {
      state.daily.streak = 0;
    }
  }

  // Pick 3 challenges based on date seed
  const available = DAILY_CHALLENGE_POOL.filter(c => {
    if (c.req && !(state.animals[c.req] > 0)) return false;
    return true;
  });

  const seed = dailySeed(today);
  const picked = [];
  const pool = available.slice();
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = (seed * (i + 7) + i * 13) % pool.length;
    picked.push(pool[idx].id);
    pool.splice(idx, 1);
  }

  state.daily.date = today;
  state.daily.challenges = picked;
  state.daily.completed = [false, false, false];
  state.daily.bonusClaimed = false;
  state.daily.uniqueMinigames = [];
  state.daily.upgradesBought = 0;
  state.daily.memoryLowFaults = 0;
  state.daily.snapshots = takeDailySnapshots();
}

function getDailyChallengeProgress(c) {
  const snap = state.daily.snapshots || {};
  if (c.daily === 'uniqueMinigames') {
    return {cur: (state.daily.uniqueMinigames || []).length, max: c.target};
  }
  if (c.daily === 'upgradesBought') {
    return {cur: state.daily.upgradesBought || 0, max: c.target};
  }
  if (c.daily === 'memoryLowFaults') {
    return {cur: state.daily.memoryLowFaults || 0, max: c.target};
  }
  if (c.stat === 'totalClicks') {
    return {cur: state.allTime.totalClicks - (snap.totalClicks || 0), max: c.target};
  }
  if (c.stat === 'totalAnimals') {
    return {cur: state.allTime.totalAnimals - (snap.totalAnimals || 0), max: c.target};
  }
  if (c.stat === 'mgTotal') {
    const curTotal = ['quizPlayed','catcherPlayed','mathPlayed','sortPlayed','memoryPlayed',
      'tellenPlayed','indringerPlayed','groterPlayed','racePlayed','puzzelPlayed',
      'voedselPlayed','buffPlayed'].reduce((s,k) => s + (state.stats[k]||0), 0);
    return {cur: curTotal - (snap.mgTotal || 0), max: c.target};
  }
  if (c.best) {
    // "best" stats: check if current best meets target (not delta-based)
    return {cur: state.stats[c.stat] || 0, max: c.target};
  }
  // Default: delta from snapshot
  return {cur: (state.stats[c.stat] || 0) - (snap[c.stat] || 0), max: c.target};
}

function checkDailyChallenges() {
  if (!state.daily.date || !state.daily.challenges.length) return;
  let anyNew = false;
  state.daily.challenges.forEach((cid, i) => {
    if (state.daily.completed[i]) return;
    const c = DAILY_CHALLENGE_POOL.find(x => x.id === cid);
    if (!c) return;
    const p = getDailyChallengeProgress(c);
    if (p.cur >= p.max) {
      state.daily.completed[i] = true;
      anyNew = true;
      // Reward: 10 min DPS
      const reward = getTotalDps() * 60 * 10;
      state.currentPoints += reward;
      state.totalEarned += reward;
      state.allTime.totalEarned += reward;
      showToast('⭐ Uitdaging voltooid: ' + c.desc + ' (+' + formatNumber(Math.floor(reward)) + ')');
      sfxAchievement();
    }
  });
  // All 3 done bonus
  if (anyNew && state.daily.completed.every(v => v) && !state.daily.bonusClaimed) {
    state.daily.bonusClaimed = true;
    // Update streak: count today as a completed day
    state.daily.streak++;
    state.daily.lastCompletedDate = state.daily.date;
    const bonus = getTotalDps() * 60 * 30;
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    showToast('🌟 Alle uitdagingen voltooid! Bonus: +' + formatNumber(Math.floor(bonus)));
  }
}

function dailyTrackMinigame(mgId) {
  if (!state.daily.date) return;
  if (state.daily.uniqueMinigames.indexOf(mgId) === -1) {
    state.daily.uniqueMinigames.push(mgId);
  }
}

function checkAchievements() {
  let newOnes = [];
  achievementDefs.forEach(a => {
    if (!state.achievements[a.id] && a.check()) {
      state.achievements[a.id] = 1;
      newOnes.push(a);
    }
  });
  newOnes.forEach(a => { showToast('🏆 ' + a.name); sfxAchievement(); celebrateAchievement(a.emoji); });
}

/* ================================================================
   SECTIE 7: KLIKKEN & KOPEN
   ================================================================ */

function doClick(event) {
  sfxClick();
  const value = getClickValue();
  state.currentPoints += value;
  state.totalEarned += value;
  state.totalClicks++;
  state.allTime.totalEarned += value;
  state.allTime.totalClicks++;

  // Particle
  const area = document.getElementById('click-area');
  const rect = area.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const p = document.createElement('div');
  p.className = 'click-particle';
  p.textContent = '+' + formatNumber(Math.floor(value));
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  area.appendChild(p);
  setTimeout(() => p.remove(), 900);

  // Bounce
  const el = document.getElementById('big-animal');
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'click-bounce 0.15s ease-out';
  setTimeout(() => el.style.animation = 'idle-pulse 3s ease-in-out infinite', 150);

  // Bump points display
  const pd = document.getElementById('points-display');
  pd.classList.add('bump');
  setTimeout(() => pd.classList.remove('bump'), 100);
}

function buyAnimal(animalId) {
  // Buy as many as affordable, up to buyMultiplier (or max affordable)
  const limit = buyMax ? getMaxAffordable(animalId) : buyMultiplier;
  let bought = 0;
  for (let i = 0; i < limit; i++) {
    const price = getAnimalPrice(animalId);
    if (state.currentPoints < price) break;
    state.currentPoints -= price;
    state.animals[animalId] = (state.animals[animalId] || 0) + 1;
    state.allTime.totalAnimals++;
    bought++;
  }
  if (bought > 0) sfxBuy();
}

function buyUpgrade(upgradeId) {
  if (state.upgrades[upgradeId]) return;
  const u = findUpgrade(upgradeId);
  if (!u) return;
  if (state.currentPoints < u.cost) return;
  // Check requirements for animal upgrades
  if (u.req !== undefined) {
    const animalId = upgradeId.split('_')[0];
    // Handle multi-word animal ids
    const animal = ANIMALS.find(a => a.upgrades.some(au => au.id === upgradeId));
    if (animal && (state.animals[animal.id] || 0) < u.req) return;
  }
  state.currentPoints -= u.cost;
  state.upgrades[upgradeId] = 1;
  if (state.daily.date) state.daily.upgradesBought++;
  sfxBuy();
  // Update only the purchased item instead of rebuilding the whole list
  const el = document.getElementById('upg-' + upgradeId);
  if (el) {
    el.className = 'shop-item bought';
    el.removeAttribute('onclick');
    const nameDiv = el.querySelector('.shop-name');
    if (nameDiv) nameDiv.textContent = u.name;
    const flavorDiv = el.querySelector('.shop-flavor');
    if (flavorDiv) flavorDiv.style.display = 'none';
    const priceDiv = el.querySelector('.shop-price');
    if (priceDiv) { priceDiv.textContent = 'Gekocht!'; priceDiv.id = 'upgprice-' + upgradeId; }
    const effect = upgradeEffect(u);
    const tipDesc = escHtml(u.desc + (effect ? ' — Effect: ' + effect : ''));
    el.dataset.tip = escHtml(u.name) + '|' + tipDesc;
  }
  // Update the category header (progress count + collapse if all done)
  if (el) {
    const cat = el.closest('.upgrade-category');
    if (cat) {
      const items = cat.querySelectorAll('.shop-item');
      const boughtCount = cat.querySelectorAll('.shop-item.bought').length;
      const total = items.length;
      const h3 = cat.querySelector('h3');
      if (h3) {
        const progress = total > 1 ? ' <span style="color:var(--text-dim);font-size:12px">(' + boughtCount + '/' + total + ')</span>' : '';
        const arrow = '<span class="toggle-arrow">▼</span> ';
        const titleText = h3.textContent.replace(/▼\s*/, '').replace(/\s*\(\d+\/\d+\)/, '').replace(/\s*✓$/, '');
        if (boughtCount === total) {
          h3.innerHTML = arrow + titleText + progress + ' ✓';
          h3.style.opacity = '0.5';
          cat.classList.add('collapsed');
          const btn = cat.querySelector('.buy-all-btn');
          if (btn) btn.remove();
        } else {
          h3.innerHTML = arrow + titleText + progress;
        }
      }
    }
  }
}

function buyAllCategory(catKey) {
  const animal = ANIMALS.find(a => a.id === catKey);
  if (!animal) return 0;
  const catUpgrades = animal.upgrades;
  const available = catUpgrades.filter(u => {
    if (state.upgrades[u.id]) return false;
    if (state.currentPoints < u.cost) return false;
    if (u.req !== undefined) {
      const animal = ANIMALS.find(a => a.upgrades.some(au => au.id === u.id));
      if (animal && (state.animals[animal.id] || 0) < u.req) return false;
    }
    return true;
  }).sort((a, b) => a.cost - b.cost);
  let count = 0;
  for (const u of available) {
    if (state.currentPoints < u.cost) continue;
    state.currentPoints -= u.cost;
    state.upgrades[u.id] = 1;
    if (state.daily.date) state.daily.upgradesBought++;
    count++;
  }
  if (count > 0) {
    sfxBuy();
    buildUpgradeShop();
  }
  return count;
}

function findUpgrade(id) {
  for (const a of ANIMALS) {
    const u = a.upgrades.find(u => u.id === id);
    if (u) return u;
  }
  let u = CLICK_UPGRADES.find(u => u.id === id);
  if (u) return u;
  u = GLOBAL_UPGRADES.find(u => u.id === id);
  if (u) return u;
  u = OFFLINE_UPGRADES.find(u => u.id === id);
  return u;
}

