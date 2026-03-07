/* ================================================================
   SECTIE 5: BEREKENINGEN
   ================================================================ */

function getAnimalPrice(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  let price = Math.ceil(a.basePrice * Math.pow(COST_MULTIPLIER, count));
  const buff = getActiveBuff();
  if (buff && buff.type === 'sale') price = Math.ceil(price * 0.5);
  return price;
}

function getBulkPrice(animalId, qty) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  const buff = getActiveBuff();
  const saleMult = (buff && buff.type === 'sale') ? 0.5 : 1;
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
  // Prestige bonus
  total *= (1 + state.prestige.stars * PRESTIGE_BONUS);
  // Active buff: DPS ×2
  const buff = getActiveBuff();
  if (buff && buff.type === 'dps2x') total *= 2;
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
  // Prestige bonus on clicks too
  base *= (1 + state.prestige.stars * PRESTIGE_BONUS);
  // Active buff effects on clicks
  const buff = getActiveBuff();
  if (buff && buff.type === 'clickdps') dpsPct += 5;
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
  // Apply global multipliers to get proportional share
  breakdown.sort((a, b) => b.dps - a.dps);
  // Add bonus info
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
  const achPct = achCount * ACHIEVEMENT_BONUS * 100;
  const starPct = state.prestige.stars * PRESTIGE_BONUS * 100;
  const buff = getActiveBuff();
  const buffActive = buff && buff.type === 'dps2x';
  return {animals: breakdown, rawTotal: rawAnimalTotal, total: total, achPct: achPct, starPct: starPct, buffActive: buffActive};
}

function getMaxAffordable(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  const count = state.animals[animalId] || 0;
  const buff = getActiveBuff();
  const saleMult = (buff && buff.type === 'sale') ? 0.5 : 1;
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
  return Math.max(1, Math.floor(Math.log10(state.totalEarned) - 9));
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
        check: () => (state.animals[a.id] || 0) >= m
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
      check: () => ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0) >= n
    });
  });
  // Click milestones
  const clickMilestones = [
    [100, 'Klik klik klik'], [1000, 'Doordrukker'], [5000, 'Klikkampioen'],
    [15000, 'Supersnelle vinger'], [35000, 'Kliklegende']
  ];
  clickMilestones.forEach(([n, name]) => {
    defs.push({
      id: 'klik_' + n, emoji: '👆', name: name,
      desc: formatNumber(n) + ' keer geklikt!', group: 'Klikken',
      check: () => state.allTime.totalClicks >= n
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
      check: () => state.totalEarned >= n
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
        } else {
          h3.innerHTML = arrow + titleText + progress;
        }
      }
    }
  }
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

