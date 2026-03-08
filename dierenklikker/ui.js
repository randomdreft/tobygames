/* ================================================================
   SECTIE 9: EVOLUTIE (PRESTIGE)
   ================================================================ */

function showPrestigeModal() {
  if (!canPrestige()) return;
  const stars = getPrestigeStars();
  const totalAfter = state.prestige.stars + stars;
  document.getElementById('prestige-stars-preview').textContent = '+' + stars + ' ⭐';
  document.getElementById('prestige-current-info').innerHTML =
    'Nu: ' + state.prestige.stars + '⭐ → Na evolutie: <b style="color:var(--gold)">' + totalAfter + '⭐</b> (+' + (totalAfter * 5) + '% DPS)';
  // Show which upgrades are kept
  let keepHtml = '';
  const hasOffline = OFFLINE_UPGRADES.some(u => state.upgrades[u.id]);
  const hasClick = CLICK_UPGRADES.some(u => state.upgrades[u.id]);
  const hasGlobal = GLOBAL_UPGRADES.some(u => state.upgrades[u.id]);
  if (hasOffline || hasClick || hasGlobal) {
    keepHtml += prestigeKeepLine(totalAfter, PRESTIGE_KEEP_OFFLINE, 'Offline upgrades', '🌙');
    keepHtml += prestigeKeepLine(totalAfter, PRESTIGE_KEEP_CLICK, 'Klik-upgrades', '👆');
    keepHtml += prestigeKeepLine(totalAfter, PRESTIGE_KEEP_GLOBAL, 'Globale upgrades', '🌍');
  }
  document.getElementById('prestige-keep-info').innerHTML = keepHtml;
  showModal('prestige-modal');
}

function applyTheme(themeId) {
  const theme = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--bg1', theme.bg1);
  r.setProperty('--bg2', theme.bg2);
  r.setProperty('--bg3', theme.bg3);
  r.setProperty('--text', theme.text);
  r.setProperty('--text-dim', theme.textDim);
  r.setProperty('--text-dark', theme.textDark);
  r.setProperty('--gold', theme.gold);
  r.setProperty('--green', theme.green);
  r.setProperty('--green-light', theme.greenLight);
  r.setProperty('--red', theme.red);
  r.setProperty('--orange', theme.orange);
  r.setProperty('--blue', theme.blue);
  r.setProperty('--purple', theme.purple);
  document.body.classList.toggle('rainbow-bg', themeId === 'regenboog');
}

function getHighestUnlockedTheme() {
  let best = COLOR_THEMES[0];
  COLOR_THEMES.forEach(t => { if (t.stars <= state.prestige.stars) best = t; });
  return best.id;
}

function selectTheme(themeId) {
  const theme = COLOR_THEMES.find(t => t.id === themeId);
  if (!theme || theme.stars > state.prestige.stars) return;
  state.prestige.theme = themeId;
  state.prestige.themeLocked = true;
  applyTheme(themeId);
  buildEvolution();
  saveGame();
}

function toggleThemeLock() {
  state.prestige.themeLocked = !state.prestige.themeLocked;
  if (!state.prestige.themeLocked) {
    // Reset to highest unlocked
    state.prestige.theme = getHighestUnlockedTheme();
    applyTheme(state.prestige.theme);
  }
  buildEvolution();
  saveGame();
}

const HEMEL_HABITATS = [
  {id:'mier', bg:'linear-gradient(180deg,#8B6914,#654a0e)', env:'🌱🍂🌿🍃🌱🍂🌿🍃🌱🍂', food:'🍞', desc:'Sjouwt vrolijk kruimels rond'},
  {id:'slak', bg:'linear-gradient(180deg,#4a7c3f,#2d5a27)', env:'🌿🌧️🍃🌱🍀🌿🌧️🍃🌱🍀', food:'🍃', desc:'Glijdt door de dauw'},
  {id:'kikker', bg:'linear-gradient(180deg,#2d6a4f,#1b4332)', env:'🌊💧🪷🌿🐚🌊💧🪷🌿🐚', food:'🐛', desc:'Springt bij de vijver'},
  {id:'kip', bg:'linear-gradient(180deg,#8B7355,#6b5a3e)', env:'🌾🌻🌾🌻🌾🌻🌾🌻🌾🌻', food:'🌾', desc:'Pikt graan op de boerderij'},
  {id:'kat', bg:'linear-gradient(180deg,#c2956a,#a07848)', env:'☀️🧶🛋️✨☀️🧶🛋️✨☀️🧶', food:'🐟', desc:'Snoept visjes in de zon'},
  {id:'hond', bg:'linear-gradient(180deg,#6aaa5a,#4a8a3a)', env:'🌳🌤️🌼🌳🌤️🌼🌳🌤️🌼🌳', food:'🦴', desc:'Kluift op een bot in het gras'},
  {id:'lama', bg:'linear-gradient(180deg,#7a9aa8,#5a7a88)', env:'🏔️⛰️🌄🏔️⛰️🌄🏔️⛰️🌄🏔️', food:'🌿', desc:'Kauwt gras in de bergen'},
  {id:'paard', bg:'linear-gradient(180deg,#7ab648,#5a9628)', env:'🌾🌻🌿🌼🌾🌻🌿🌼🌾🌻', food:'🥕', desc:'Galoppeert door de wei'},
  {id:'panda', bg:'linear-gradient(180deg,#2d7a3f,#1a5a2a)', env:'🎋🎋🎋🎋🎋🎋🎋🎋🎋🎋', food:'🎋', desc:'Smult van bamboe'},
  {id:'olifant', bg:'linear-gradient(180deg,#c4a35a,#a08040)', env:'🌴🌅🦒🌴🌅🦒🌴🌅🦒🌴', food:'🍃', desc:'Plukt bladeren op de savanne'},
  {id:'walvis', bg:'linear-gradient(180deg,#1a5a8a,#0d3a5a)', env:'🌊🐚🪸🫧🌊🐚🪸🫧🌊🐚', food:'🦐', desc:'Zwemt door de hemelse oceaan'},
  {id:'draak', bg:'linear-gradient(180deg,#5a2a6a,#3a1a4a)', env:'🌋✨🔮⭐🌋✨🔮⭐🌋✨', food:'🔥', desc:'Spuwt vuur op de bergtop'}
];

let prestigeCache = null;
let zooIsPrestige = false;
let zooCollectedStars = 0;
let zooInterval = null;
let zooRuntime = null;

function doPrestige() {
  const newStars = getPrestigeStars();
  const totalStars = state.prestige.stars + newStars;
  prestigeCache = { newStars, totalStars, zooStars: 0 };
  closeModal('prestige-modal');
  showDierenhemel(newStars);
}

function visitZoo() {
  showDierenhemel();
}

function zooHeartCount(happiness) {
  // Wider thresholds so hearts don't flicker from tiny decay
  return happiness >= 90 ? 5 : happiness >= 70 ? 4 : happiness >= 50 ? 3 : happiness >= 30 ? 2 : happiness >= 10 ? 1 : 0;
}

function showDierenhemel(newStars) {
  zooIsPrestige = (newStars !== undefined);
  zooCollectedStars = 0;

  if (zooIsPrestige) sfxHeaven();

  ensureZooEnclosures();
  updateZooHappiness();

  const el = document.getElementById('dierenhemel');
  const farm = document.getElementById('hemel-farm');
  const clouds = document.getElementById('hemel-clouds');

  // Build clouds
  let cloudHtml = '';
  for (let i = 0; i < 6; i++) {
    const top = 2 + Math.random() * 30;
    const dur = 25 + Math.random() * 30;
    const delay = -(Math.random() * dur);
    const size = 0.6 + Math.random() * 0.8;
    cloudHtml += '<div class="hemel-cloud" style="top:' + top + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's;transform:scale(' + size + ')">☁️</div>';
  }
  clouds.innerHTML = cloudHtml;

  // Update title & intro hint
  const titleEl = document.querySelector('.hemel-title h1');
  const subtitleEl = document.querySelector('.hemel-title p');
  if (titleEl) titleEl.textContent = 'De Wolkendierentuin';
  if (subtitleEl) subtitleEl.innerHTML = (zooIsPrestige
    ? 'Je dieren zijn naar de hemel gestuurd!'
    : 'Bezoek je dieren in de wolken') +
    '<span class="zoo-hint">Aai en voer je dieren om ze blij te maken \u2014 blije dieren produceren sterren! Klik op sterren om ze te verzamelen.</span>';

  // Build interactive enclosure cards
  let html = '';
  HEMEL_HABITATS.forEach(h => {
    const animal = ANIMALS.find(a => a.id === h.id);
    if (!animal) return;
    const enc = state.zoo.enclosures[h.id];
    if (!enc) return;
    const levelInfo = ZOO_LEVELS[(enc.level || 1) - 1];
    const filled = zooHeartCount(enc.happiness || 0);
    let hearts = '';
    for (let i = 0; i < 5; i++) hearts += i < filled ? '\u2764\ufe0f' : '\ud83e\udd0d';
    const happyPct = Math.round(enc.happiness || 0);

    html += '<div class="hemel-habitat zoo-enclosure" id="zoo-enc-' + h.id + '" style="background:' + h.bg + '">';
    html += '<div class="hemel-env">' + h.env + '</div>';
    html += '<div class="zoo-level-badge" id="zoo-level-' + h.id + '" data-tip="' + escHtml(levelInfo.name) + '|' + escHtml('Geluk-verval: ' + levelInfo.decayPerHour + '% per uur') + '">' + levelInfo.emoji + ' ' + levelInfo.name + '</div>';
    html += '<div class="zoo-animal-wrap" onclick="petZooAnimal(\'' + h.id + '\')" data-tip="' + escHtml(animal.name + ' aaien') + '|' + escHtml('Klik om te aaien (+' + ZOO_PET_AMOUNT + '% geluk)') + '">';
    html += '<div class="zoo-animal hemel-animal">' + animal.emoji + '</div>';
    html += '<div class="hemel-food zoo-food">' + h.food + '</div>';
    html += '</div>';
    html += '<div class="zoo-hearts" id="zoo-hearts-' + h.id + '" data-state="hearts-' + filled + '" data-tip="Geluk: ' + happyPct + '%|Blije dieren produceren sterren">' + hearts + '</div>';
    html += '<div class="hemel-label">' + animal.name + '</div>';
    html += '<div class="zoo-actions">';
    html += '<button class="zoo-btn" id="zoo-pet-' + h.id + '" onclick="event.stopPropagation();petZooAnimal(\'' + h.id + '\')" data-tip="Aai ' + escHtml(animal.name) + '|+' + ZOO_PET_AMOUNT + '% geluk (cooldown ' + (ZOO_PET_COOLDOWN/1000) + 's)">\ud83e\udd1a Aai</button>';
    html += '<button class="zoo-btn" id="zoo-feed-' + h.id + '" onclick="event.stopPropagation();feedZooAnimal(\'' + h.id + '\')" data-tip="Voer ' + escHtml(animal.name) + '|+' + ZOO_FEED_AMOUNT + '% geluk (cooldown ' + (ZOO_FEED_COOLDOWN/1000) + 's)">' + h.food + ' Voer</button>';
    html += '</div>';
    html += '<button class="zoo-upgrade-btn" id="zoo-upg-' + h.id + '" onclick="event.stopPropagation();upgradeZooEnclosure(\'' + h.id + '\')"></button>';
    html += '<div class="zoo-star-area" id="zoo-stars-' + h.id + '"></div>';
    html += '</div>';
  });
  farm.innerHTML = html;

  // Set initial button states
  ANIMALS.forEach(a => {
    const enc = state.zoo.enclosures[a.id];
    if (enc) {
      updateZooButtons(a.id, enc);
      updateZooUpgradeBtn(a.id, enc);
    }
  });

  // Update star counter
  updateZooStarCounter();

  el.classList.add('show');
  parseAppleEmoji(el);
  startZooTick();
}

function leaveZoo() {
  stopZooTick();
  document.querySelectorAll('.zoo-star').forEach(el => el.remove());

  if (zooIsPrestige) {
    completePrestige();
  } else {
    document.getElementById('dierenhemel').classList.remove('show');
    saveGame();
    buildShop();
  }
}

/* --- Zoo tick & star spawning --- */

function startZooTick() {
  zooRuntime = { pendingStars: {}, lastSpawn: {}, collected: 0 };
  ANIMALS.forEach(a => {
    zooRuntime.pendingStars[a.id] = [];
    // Random offset 0-60s so animals don't all spawn stars simultaneously
    zooRuntime.lastSpawn[a.id] = Date.now() + Math.floor(Math.random() * 60) * 1000;
  });
  zooInterval = setInterval(zooTick, 1000);
}

function stopZooTick() {
  if (zooInterval) { clearInterval(zooInterval); zooInterval = null; }
  zooRuntime = null;
}

function zooTick() {
  if (!zooRuntime || !state.zoo) return;
  const now = Date.now();
  updateZooHappiness();

  ANIMALS.forEach(a => {
    const enc = state.zoo.enclosures[a.id];
    if (!enc) return;

    updateZooHearts(a.id, enc.happiness);
    updateZooButtons(a.id, enc);

    // Star spawning
    const interval = getZooStarInterval(enc.happiness);
    if (interval < Infinity) {
      const elapsed = (now - (zooRuntime.lastSpawn[a.id] || now)) / 1000;
      if (elapsed >= interval && zooRuntime.pendingStars[a.id].length < ZOO_MAX_STARS) {
        spawnZooStar(a.id);
        zooRuntime.lastSpawn[a.id] = now;
      }
    }

    // Remove expired stars
    const stars = zooRuntime.pendingStars[a.id];
    for (let i = stars.length - 1; i >= 0; i--) {
      if (now - stars[i].time > ZOO_STAR_LIFETIME) {
        if (stars[i].el && stars[i].el.parentNode) {
          stars[i].el.classList.add('zoo-star-fade');
          const deadEl = stars[i].el;
          setTimeout(() => { if (deadEl.parentNode) deadEl.remove(); }, 500);
        }
        stars.splice(i, 1);
      }
    }
  });

  updateZooStarCounter();
}

function spawnZooStar(animalId) {
  const container = document.getElementById('zoo-stars-' + animalId);
  if (!container) return;
  const star = document.createElement('div');
  star.className = 'zoo-star';
  star.textContent = '\u2b50';
  star.style.left = (10 + Math.random() * 70) + '%';
  star.style.top = (10 + Math.random() * 50) + '%';
  star.onclick = function(e) { e.stopPropagation(); collectZooStar(animalId, star); };
  container.appendChild(star);
  parseAppleEmoji(star);
  zooRuntime.pendingStars[animalId].push({ time: Date.now(), el: star });
}

function collectZooStar(animalId, starEl) {
  if (zooRuntime) {
    const stars = zooRuntime.pendingStars[animalId];
    const idx = stars.findIndex(s => s.el === starEl);
    if (idx >= 0) stars.splice(idx, 1);
  }
  starEl.classList.add('zoo-star-collect');
  setTimeout(() => starEl.remove(), 400);

  if (prestigeCache) {
    prestigeCache.totalStars++;
    prestigeCache.zooStars = (prestigeCache.zooStars || 0) + 1;
  } else {
    state.prestige.stars++;
  }
  zooCollectedStars++;
  sfxLuckyClick();
  updateZooStarCounter();
}

/* --- Zoo interaction --- */

function petZooAnimal(animalId) {
  if (!state.zoo || !state.zoo.enclosures) return;
  const enc = state.zoo.enclosures[animalId];
  if (!enc) return;
  const now = Date.now();
  if (now - (enc.lastPet || 0) < ZOO_PET_COOLDOWN) return;
  enc.happiness = Math.min(100, (enc.happiness || 0) + ZOO_PET_AMOUNT);
  enc.lastPet = now;
  enc.lastDecay = now;
  sfxClick();

  const animalEl = document.querySelector('#zoo-enc-' + animalId + ' .zoo-animal');
  if (animalEl) {
    animalEl.style.animation = 'none';
    animalEl.offsetHeight;
    animalEl.style.animation = 'zoo-pet-bounce 0.3s ease-out';
    setTimeout(() => { animalEl.style.animation = 'hemel-bob 3s ease-in-out infinite'; }, 300);
  }
  showZooParticle(animalId, '+' + ZOO_PET_AMOUNT + '% \u2764\ufe0f');
  updateZooHearts(animalId, enc.happiness);
  updateZooButtons(animalId, enc);
}

function feedZooAnimal(animalId) {
  if (!state.zoo || !state.zoo.enclosures) return;
  const enc = state.zoo.enclosures[animalId];
  if (!enc) return;
  const now = Date.now();
  if (now - (enc.lastFed || 0) < ZOO_FEED_COOLDOWN) return;
  enc.happiness = Math.min(100, (enc.happiness || 0) + ZOO_FEED_AMOUNT);
  enc.lastFed = now;
  enc.lastDecay = now;
  sfxBuy();

  const foodEl = document.querySelector('#zoo-enc-' + animalId + ' .zoo-food');
  if (foodEl) {
    foodEl.style.animation = 'none';
    foodEl.offsetHeight;
    foodEl.style.animation = 'zoo-feed-bounce 0.4s ease-out';
    setTimeout(() => { foodEl.style.animation = 'hemel-munch 2s ease-in-out infinite'; }, 400);
  }
  showZooParticle(animalId, '+' + ZOO_FEED_AMOUNT + '% \u2764\ufe0f');
  updateZooHearts(animalId, enc.happiness);
  updateZooButtons(animalId, enc);
}

function upgradeZooEnclosure(animalId) {
  if (!state.zoo || !state.zoo.enclosures) return;
  const enc = state.zoo.enclosures[animalId];
  if (!enc || enc.level >= ZOO_LEVELS.length) return;
  const nextCost = ZOO_LEVELS[enc.level].cost;
  if (getZooAvailableStars() < nextCost) return;
  enc.level++;
  sfxLevelUp();

  const levelInfo = ZOO_LEVELS[enc.level - 1];
  const levelEl = document.getElementById('zoo-level-' + animalId);
  if (levelEl) { levelEl.textContent = levelInfo.emoji + ' ' + levelInfo.name; parseAppleEmoji(levelEl); }
  updateZooUpgradeBtn(animalId, enc);
  updateZooStarCounter();
  saveGame();

  const animal = ANIMALS.find(a => a.id === animalId);
  showToast('\u2b06\ufe0f ' + (animal ? animal.name : '') + ' \u2192 ' + levelInfo.name + '!');
}

/* --- Zoo UI updates --- */

function updateZooHearts(animalId, happiness) {
  const el = document.getElementById('zoo-hearts-' + animalId);
  if (!el) return;
  const filled = zooHeartCount(happiness);
  const key = 'hearts-' + filled;
  el.dataset.tip = 'Geluk: ' + Math.round(happiness) + '%|Blije dieren produceren sterren';
  if (el.dataset.state === key) return;
  el.dataset.state = key;
  let html = '';
  for (let i = 0; i < 5; i++) html += i < filled ? '\u2764\ufe0f' : '\ud83e\udd0d';
  el.innerHTML = html;
  parseAppleEmoji(el);
}

function updateZooButtons(animalId, enc) {
  const now = Date.now();
  const petBtn = document.getElementById('zoo-pet-' + animalId);
  const feedBtn = document.getElementById('zoo-feed-' + animalId);

  if (petBtn) {
    const cd = Math.max(0, ZOO_PET_COOLDOWN - (now - (enc.lastPet || 0)));
    petBtn.disabled = cd > 0;
    petBtn.textContent = cd > 0 ? '\ud83e\udd1a ' + Math.ceil(cd / 1000) + 's' : '\ud83e\udd1a Aai';
    parseAppleEmoji(petBtn);
  }
  if (feedBtn) {
    const cd = Math.max(0, ZOO_FEED_COOLDOWN - (now - (enc.lastFed || 0)));
    const h = HEMEL_HABITATS.find(x => x.id === animalId);
    const food = h ? h.food : '\ud83e\udd55';
    feedBtn.disabled = cd > 0;
    feedBtn.textContent = cd > 0 ? food + ' ' + Math.ceil(cd / 1000) + 's' : food + ' Voer';
    parseAppleEmoji(feedBtn);
  }
  updateZooUpgradeBtn(animalId, enc);
}

function updateZooUpgradeBtn(animalId, enc) {
  const btn = document.getElementById('zoo-upg-' + animalId);
  if (!btn) return;
  if (enc.level >= ZOO_LEVELS.length) {
    btn.textContent = '\u2728 Max';
    btn.disabled = true;
    btn.classList.add('zoo-upg-max');
    btn.dataset.tip = 'Maximaal level|Geluk-verval: ' + ZOO_LEVELS[enc.level - 1].decayPerHour + '% per uur';
  } else {
    const nextCost = ZOO_LEVELS[enc.level].cost;
    const next = ZOO_LEVELS[enc.level];
    btn.textContent = '\u2b06\ufe0f ' + next.name + ' (' + nextCost + '\u2b50)';
    btn.disabled = getZooAvailableStars() < nextCost;
    btn.dataset.tip = 'Upgrade naar ' + next.name + '|Verval daalt naar ' + next.decayPerHour + '% per uur (kost ' + nextCost + ' sterren)';
  }
  parseAppleEmoji(btn);
}

function updateZooStarCounter() {
  const el = document.getElementById('hemel-stars');
  if (!el) return;
  const available = getZooAvailableStars();
  let text = '';
  if (zooIsPrestige && prestigeCache) {
    text = '+' + prestigeCache.newStars + ' \u2b50 evolutiesterren';
    if (zooCollectedStars > 0) text += ' | +' + zooCollectedStars + ' \u2b50 uit dierentuin';
    text += ' | ' + available + ' beschikbaar';
  } else {
    text = '\u2b50 ' + available + ' beschikbaar';
    if (zooCollectedStars > 0) text += ' | +' + zooCollectedStars + ' verzameld';
  }
  el.textContent = text;
  el.dataset.tip = 'Sterren|Gebruik sterren voor verblijf-upgrades en perks in de sterrenwinkel';
}

function showZooParticle(animalId, text) {
  const enc = document.getElementById('zoo-enc-' + animalId);
  if (!enc) return;
  const p = document.createElement('div');
  p.className = 'zoo-particle';
  p.textContent = text;
  enc.appendChild(p);
  setTimeout(() => p.remove(), 800);
}

function completePrestige() {
  if (!prestigeCache) return;
  const { newStars, totalStars } = prestigeCache;
  const zooStarsEarned = prestigeCache.zooStars || 0;
  prestigeCache = null;

  sfxPrestige();
  cancelAllMinigames();

  const keepAch = {...state.achievements};
  const keepPrestige = {
    stars: totalStars,
    timesReset: state.prestige.timesReset + 1,
    theme: state.prestige.theme || 'oerwoud',
    themeLocked: state.prestige.themeLocked,
    perks: {...(state.prestige.perks || {})}
  };

  const keepUpgrades = {};
  if (totalStars >= PRESTIGE_KEEP_OFFLINE) {
    OFFLINE_UPGRADES.forEach(u => { if (state.upgrades[u.id]) keepUpgrades[u.id] = 1; });
  }
  if (totalStars >= PRESTIGE_KEEP_CLICK) {
    CLICK_UPGRADES.forEach(u => { if (state.upgrades[u.id]) keepUpgrades[u.id] = 1; });
  }
  if (totalStars >= PRESTIGE_KEEP_GLOBAL) {
    GLOBAL_UPGRADES.forEach(u => { if (state.upgrades[u.id]) keepUpgrades[u.id] = 1; });
  }

  const keepAllTime = {...state.allTime};
  const keepStats = {...state.stats};
  const keepDaily = {...state.daily};
  const keepZooName = state.zooName;
  const keepZoo = state.zoo ? JSON.parse(JSON.stringify(state.zoo)) : { enclosures: {} };
  const dpsBeforeReset = getTotalDps();

  state = defaultState();
  state.achievements = keepAch;
  state.prestige = keepPrestige;
  state.upgrades = keepUpgrades;
  state.allTime = keepAllTime;
  state.stats = keepStats;
  state.daily = keepDaily;
  state.zooName = keepZooName;
  state.zoo = keepZoo;

  if (!state.achievements['eerste_evolutie']) {
    state.achievements['eerste_evolutie'] = 1;
  }

  // Evolution start bonus from star shop perks (use DPS from before reset)
  // Only adds to currentPoints (spending power), NOT totalEarned (prestige progress)
  // to prevent instant star farming when DPS is high enough
  if (hasPerk('sp_evo2')) {
    const bonus = dpsBeforeReset * 600; // 10 min DPS
    state.currentPoints += bonus;
  } else if (hasPerk('sp_evo1')) {
    const bonus = dpsBeforeReset * 60; // 1 min DPS
    state.currentPoints += bonus;
  }

  if (!state.prestige.themeLocked) {
    state.prestige.theme = getHighestUnlockedTheme();
  }
  applyTheme(state.prestige.theme);

  document.getElementById('dierenhemel').classList.remove('show');
  saveGame();
  buildShop();
  parseAppleEmoji(document.body);
  const totalNew = newStars + zooStarsEarned;
  showToast('\u2b50 Ge\u00ebvolueerd! +' + totalNew + ' sterren!');
  // Auto-submit score to leaderboard after prestige
  _lastLeaderboardSubmit = 0; // reset throttle
  submitLeaderboard();
}

/* ================================================================
   SECTIE 10: UI RENDERING
   ================================================================ */

function buildShop() {
  buildAnimalShop();
  buildUpgradeShop();
  buildAchievements();
  buildEvolution();
  buildOptions();
}

function buildAnimalShop() {
  const container = document.getElementById('tab-animals');
  let html = '';
  if (state.prestige.stars >= 1) {
    html += '<div id="buy-amount-bar">';
    [1, 10, 100].forEach(n => {
      html += '<button class="buy-amt-btn' + (buyMultiplier === n && !buyMax ? ' active' : '') + '" onclick="setBuyAmount(' + n + ')">' + n + '×</button>';
    });
    html += '<button class="buy-amt-btn' + (buyMax ? ' active' : '') + '" onclick="setBuyMax()">Max</button>';
    html += '</div>';
  }
  ANIMALS.forEach(a => {
    const tip = escHtml(a.name) + '|' + escHtml(a.flavor);
    html += '<div class="shop-item" id="shop-' + a.id + '" onclick="buyAnimal(\'' + a.id + '\')" data-tip="' + tip + '">';
    html += '<div class="shop-emoji">' + a.emoji + '</div>';
    html += '<div class="shop-info">';
    html += '<div class="shop-name">' + a.name + ' <span class="count" id="count-' + a.id + '">×0</span></div>';
    html += '<div class="shop-flavor">' + a.flavor + '</div>';
    html += '<div class="shop-milestone" id="milestone-' + a.id + '"></div>';
    html += '</div>';
    html += '<div class="shop-price" id="price-' + a.id + '"></div>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function setBuyAmount(n) {
  buyMultiplier = n;
  buyMax = false;
  document.querySelectorAll('.buy-amt-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === n + '×');
  });
}

function setBuyMax() {
  buyMax = true;
  document.querySelectorAll('.buy-amt-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === 'Max');
  });
}

function buildUpgradeCategory(title, upgrades, animal, buyAllPerk) {
  const bought = upgrades.filter(u => state.upgrades[u.id]).length;
  const total = upgrades.length;
  const allDone = bought === total;
  const progress = total > 1 ? ' <span style="color:var(--text-dim);font-size:12px">(' + bought + '/' + total + ')</span>' : '';
  const collapsed = allDone ? ' collapsed' : '';
  const dimmed = allDone ? ' style="opacity:0.5"' : '';
  const check = allDone ? ' ✓' : '';
  let html = '<div class="upgrade-category' + collapsed + '">';
  html += '<h3' + dimmed + ' onclick="this.parentElement.classList.toggle(\'collapsed\')"><span class="toggle-arrow">▼</span> ' + title + progress + check + '</h3>';
  html += '<div class="upg-items">';
  if (buyAllPerk && hasPerk(buyAllPerk) && !allDone) {
    const catKey = buyAllPerk.replace('sp_ba_', '');
    html += '<div style="text-align:center;margin-bottom:6px"><button class="buy-all-btn" onclick="buyAllCategory(\'' + catKey + '\')">Koop alles</button></div>';
  }
  // Always sorted in original order (small to large)
  upgrades.forEach(u => { html += upgradeItemHtml(u, animal); });
  html += '</div></div>';
  return html;
}

function buildUpgradeShop() {
  const container = document.getElementById('tab-upgrades');
  const allUpgrades = [CLICK_UPGRADES, GLOBAL_UPGRADES, OFFLINE_UPGRADES, ...ANIMALS.map(a => a.upgrades)].flat();
  const bought = allUpgrades.filter(u => state.upgrades[u.id]).length;
  const total = allUpgrades.length;
  const pct = total ? Math.floor(bought / total * 100) : 0;
  let html = '<div class="upg-summary">' + bought + '/' + total + ' upgrades (' + pct + '%)</div>';
  html += buildUpgradeCategory('👆 Klik-upgrades', CLICK_UPGRADES);
  html += buildUpgradeCategory('🌍 Globale upgrades', GLOBAL_UPGRADES);
  html += buildUpgradeCategory('🌙 Offline upgrades', OFFLINE_UPGRADES);
  ANIMALS.forEach(a => {
    html += buildUpgradeCategory(a.emoji + ' ' + a.name + '-upgrades', a.upgrades, a, 'sp_ba_' + a.id);
  });
  container.innerHTML = html;
}

function upgradeEffect(u) {
  if (u.mult) return 'DPS ×' + u.mult;
  if (u.addClick) return '+' + u.addClick + ' per klik';
  if (u.dpsPercent) return '+' + u.dpsPercent + '% van DPS per klik';
  if (u.addPercent) return 'Alle DPS +' + u.addPercent + '%';
  if (u.multiply) return 'Alle DPS ×' + u.multiply;
  if (u.offlinePct) return u.offlinePct + '% DPS offline';
  return '';
}

function upgradeItemHtml(u, animal) {
  const bought = !!state.upgrades[u.id];
  const reqText = animal ? ' (nodig: ' + u.req + ' ' + animal.plural + ')' : '';
  const effect = upgradeEffect(u);
  const tipDesc = bought
    ? escHtml(u.desc + (effect ? ' — Effect: ' + effect : ''))
    : escHtml(u.desc + reqText);
  const tip = escHtml(u.name) + '|' + tipDesc;
  const cls = 'shop-item' + (bought ? ' bought' : '');
  return '<div class="' + cls + '" id="upg-' + u.id + '" onclick="buyUpgrade(\'' + u.id + '\')" data-tip="' + tip + '">' +
    '<div class="shop-info">' +
    '<div class="shop-name">' + u.name + '</div>' +
    '<div class="shop-flavor">' + u.desc + reqText + '</div>' +
    '</div>' +
    '<div class="shop-price" id="upgprice-' + u.id + '">' + (bought ? 'Gekocht!' : formatNumber(u.cost)) + '</div>' +
    '</div>';
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function prestigeKeepLine(currentStars, required, label, emoji) {
  if (currentStars >= required) {
    return '<span style="color:var(--green-light)">' + emoji + ' ' + required + '⭐ ' + label + ' behouden ✓</span><br>';
  } else {
    return '<span style="color:var(--text-dim)">' + emoji + ' ' + required + '⭐ ' + label + ' behouden (nog ' + (required - currentStars) + ' sterren nodig)</span><br>';
  }
}

let achSpoilerActive = false;

function toggleAchSpoiler() {
  if (!achSpoilerActive) {
    if (!confirm('Weet je het zeker? Dit laat zien welke prestaties je nog kunt halen!')) return;
  }
  achSpoilerActive = !achSpoilerActive;
  buildAchievements();
}

function buildAchievements() {
  const container = document.getElementById('tab-achievements');
  const earned = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
  const total = achievementDefs.length;
  const pct = total ? Math.floor(earned / total * 100) : 0;
  let html = '<div class="ach-summary">' + earned + '/' + total + ' prestaties (' + pct + '%) — elke prestatie geeft +2% DPS!</div>';

  // Group by animal, then specials
  const groups = {};
  achievementDefs.forEach(a => {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  });
  Object.keys(groups).forEach(g => {
    html += '<div class="ach-section"><h4>' + g + '</h4><div class="ach-grid">';
    groups[g].forEach(a => {
      const e = state.achievements[a.id];
      let achTip, progressHtml = '';
      if (e) {
        achTip = escHtml(a.name) + '|' + escHtml(a.desc);
      } else {
        // Progress bar for unearned achievements (always visible)
        if (a.progress) {
          const p = a.progress();
          const pct = p.invert
            ? (p.cur >= 999 ? 0 : Math.min(100, Math.max(0, (1 - (p.cur - p.max) / (999 - p.max)) * 100)))
            : Math.min(100, Math.floor(p.cur / p.max * 100));
          if (pct > 0 && pct < 100) {
            progressHtml = '<div class="ach-progress" style="height:' + pct + '%"></div>';
          }
        }
        if (achSpoilerActive) {
          let tipDesc = escHtml(a.desc);
          if (a.progress) {
            const p = a.progress();
            if (p.invert) {
              tipDesc += ' (beste: ' + (p.cur >= 999 ? '-' : p.cur) + ' zetten)';
            } else {
              tipDesc += ' (' + formatNumber(Math.min(p.cur, p.max)) + '/' + formatNumber(p.max) + ')';
            }
          }
          achTip = escHtml(a.name) + '|' + tipDesc;
        } else {
          achTip = '???|Nog niet ontgrendeld';
        }
      }
      html += '<div class="ach-item ' + (e ? 'earned' : 'unearned') + '" id="ach-' + a.id + '" data-tip="' + achTip + '">' +
        progressHtml + a.emoji +
        '</div>';
    });
    html += '</div></div>';
  });

  // Spoiler toggle
  html += '<div class="ach-spoiler-toggle' + (achSpoilerActive ? ' active' : '') + '" onclick="toggleAchSpoiler()">';
  html += '<div class="toggle-switch"></div>';
  html += '<span>Toon hints voor verborgen prestaties</span>';
  html += '</div>';

  container.innerHTML = html;
}

function buildEvolution() {
  const container = document.getElementById('tab-evolution');
  let html = '<div class="opt-section">';

  if (state.prestige.stars > 0) {
    html += '<div style="text-align:center;font-size:20px;margin-bottom:12px">';
    html += '⭐'.repeat(Math.min(state.prestige.stars, 20)) + '<br>';
    html += '<b>' + state.prestige.stars + ' sterren</b> (+' + (state.prestige.stars * 5) + '% op alles)';
    html += '</div>';
  }

  html += '<div class="prestige-info">';
  html += '<b>Hoe werkt Evolutie?</b><br>';
  html += 'Als je van elk dier minstens eentje hebt (tot en met de Draak!), mag je je dierentuin laten <b>evolueren</b>.<br><br>';
  html += 'Dat betekent: je begint opnieuw, maar je krijgt er <b>evolutiesterren ⭐</b> voor!<br>';
  html += 'Elke ster maakt al je dieren <b>+5% sterker</b>, voor altijd.<br><br>';

  html += '<b>Hoeveel sterren krijg je?</b><br>';
  html += 'Dat hangt af van hoeveel punten je hebt verdiend:<br>';
  html += '<span style="color:var(--gold)">10 miljard = 1⭐ · 100 miljard = 2⭐ · 1 biljoen = 3⭐</span><br>';
  html += 'Steeds ×10 meer punten = weer een ster erbij!<br><br>';

  const previewStars = getPrestigeStars();
  if (state.totalEarned > 0) {
    html += '<b>Jouw score:</b> ' + formatNumber(Math.floor(state.totalEarned)) + ' verdiend';
    if (previewStars > 0) {
      html += ' → <span style="color:var(--gold)">' + previewStars + ' nieuwe ⭐</span>';
    }
    html += '<br><br>';
  }

  html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
  html += '<div style="flex:1;padding:8px 10px;border-radius:8px;background:rgba(67,160,71,0.1);border:1px solid rgba(67,160,71,0.3)">';
  html += '<div style="color:var(--green-light);font-weight:700;font-size:12px;margin-bottom:4px">✓ Dit houd je</div>';
  html += '<div style="font-size:12px;line-height:1.6">⭐ Sterren<br>🏆 Prestaties</div>';
  html += '</div>';
  html += '<div style="flex:1;padding:8px 10px;border-radius:8px;background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.3)">';
  html += '<div style="color:var(--red);font-weight:700;font-size:12px;margin-bottom:4px">✗ Dit raak je kwijt</div>';
  html += '<div style="font-size:12px;line-height:1.6">🐾 Dieren<br>🪙 Punten<br>🐾 Dier-upgrades</div>';
  html += '</div></div>';

  // Bonuses progress
  html += '<div style="margin-bottom:12px">';
  html += '<b style="font-size:13px">Vrijspelbare bonussen:</b>';
  const bonuses = [
    {stars: PRESTIGE_KEEP_OFFLINE, emoji:'🌙', label:'Offline upgrades bewaren'},
    {stars: PRESTIGE_KEEP_CLICK, emoji:'👆', label:'Klik-upgrades bewaren'},
    {stars: PRESTIGE_KEEP_GLOBAL, emoji:'🌍', label:'Globale upgrades bewaren'}
  ];
  bonuses.forEach(b => {
    const unlocked = state.prestige.stars >= b.stars;
    const pct = Math.min(100, Math.round(state.prestige.stars / b.stars * 100));
    html += '<div style="margin-top:8px">';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">';
    html += '<span>' + b.emoji + ' ' + b.label + '</span>';
    html += unlocked
      ? '<span style="color:var(--green-light)">✓ Vrijgespeeld</span>'
      : '<span style="color:var(--text-dim)">' + state.prestige.stars + '/' + b.stars + ' ⭐</span>';
    html += '</div>';
    html += '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.1);overflow:hidden">';
    html += '<div style="height:100%;width:' + pct + '%;border-radius:3px;background:' + (unlocked ? 'var(--green-light)' : 'var(--gold)') + ';transition:width 0.3s"></div>';
    html += '</div></div>';
  });
  html += '</div>';

  if (previewStars > 0 && state.prestige.stars + previewStars > state.prestige.stars) {
    const afterStars = state.prestige.stars + previewStars;
    const gained = [];
    if (afterStars >= PRESTIGE_KEEP_OFFLINE && state.prestige.stars < PRESTIGE_KEEP_OFFLINE) gained.push('🌙 Offline');
    if (afterStars >= PRESTIGE_KEEP_CLICK && state.prestige.stars < PRESTIGE_KEEP_CLICK) gained.push('👆 Klik');
    if (afterStars >= PRESTIGE_KEEP_GLOBAL && state.prestige.stars < PRESTIGE_KEEP_GLOBAL) gained.push('🌍 Globaal');
    if (gained.length > 0) {
      html += '<div style="padding:6px 10px;border-radius:8px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);font-size:12px;color:var(--gold);margin-bottom:12px">';
      html += '🎉 Na evolutie unlock je: ' + gained.join(', ');
      html += '</div>';
    }
  }

  html += '<span style="color:var(--text-dim);font-size:12px">Tip: na evolutie ga je veel sneller! Elke keer verdien je meer sterren.</span>';
  html += '</div>';
  html += '<button class="opt-btn prestige-btn" id="prestige-btn" onclick="showPrestigeModal()">⭐ Evolueer!</button>';

  if (state.prestige.timesReset > 0) {
    html += '<button class="opt-btn zoo-visit-btn" onclick="visitZoo()">☁️ Bezoek Wolkendierentuin</button>';
  }

  // Theme picker — only show if at least one unlockable theme is available
  const unlockedThemes = COLOR_THEMES.filter(t => t.stars <= state.prestige.stars);
  if (unlockedThemes.length > 1) {
    html += '<div class="theme-picker">';
    html += '<h4>🎨 Kleurstellingen</h4>';
    html += '<div class="theme-swatches">';
    unlockedThemes.forEach(t => {
      const isActive = (state.prestige.theme || 'oerwoud') === t.id;
      html += '<div class="theme-swatch' + (isActive ? ' active' : '') + '" ' +
        'onclick="selectTheme(\'' + t.id + '\')" ' +
        'style="background:linear-gradient(135deg,' + t.bg1 + ',' + t.bg2 + ');border-color:' + (isActive ? t.gold : 'rgba(255,255,255,0.15)') + '" ' +
        'data-tip="' + escHtml(t.name) + '|' + escHtml(t.stars + ' sterren') + '">' +
        t.emoji + '</div>';
    });
    html += '</div>';
    // Theme lock toggle
    html += '<div class="ach-spoiler-toggle' + (state.prestige.themeLocked ? ' active' : '') + '" onclick="toggleThemeLock()" style="margin-top:10px">';
    html += '<div class="toggle-switch"></div>';
    html += '<span>Onthoud deze kleurstelling</span>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';

  container.innerHTML = html;
}

function buildOptions() {
  const container = document.getElementById('tab-options');
  let html = '';

  // Sound
  html += '<div class="opt-section"><h3>🔊 Geluid</h3>';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
  html += '<span id="volume-label" style="font-size:13px;min-width:35px;text-align:right">' + (soundEnabled ? Math.round(soundVolume * 100) + '%' : 'Uit') + '</span>';
  html += '<input id="volume-slider" type="range" min="0" max="100" value="' + (soundEnabled ? Math.round(soundVolume * 100) : 0) + '" ';
  html += 'style="flex:1;accent-color:var(--gold)" oninput="setSoundVolume(this.value)">';
  html += '</div></div>';

  // Save/load
  html += '<div class="opt-section"><h3>💾 Savegame</h3>';
  html += '<button class="opt-btn" onclick="saveGame(); showToast(\'Opgeslagen!\')">Opslaan</button>';
  html += '<button class="opt-btn" onclick="exportSave()">Downloaden als bestand</button>';
  html += '<button class="opt-btn" onclick="showImportModal()">Importeer savegame</button>';
  html += '<button class="opt-btn danger" onclick="resetGame()">Spel resetten</button>';
  html += '</div>';

  container.innerHTML = html;
}

function render() {
  // Points
  const pts = document.getElementById('points-display');
  pts.textContent = formatNumber(Math.floor(state.currentPoints)) + ' dierenpunten';

  // DPS
  const dps = getTotalDps();
  document.getElementById('dps-display').textContent = formatDps(dps) + ' per seconde';

  // Big animal (hires image, no twemoji)
  const highest = getHighestAnimal();
  const bigEl = document.getElementById('big-animal');
  const hiresCode = HIRES_EMOJI[highest.emoji];
  if (hiresCode) {
    const src = 'emoji-hires/' + hiresCode + '.png';
    if (!bigEl.querySelector('img') || bigEl.querySelector('img').src.indexOf(hiresCode) === -1) {
      bigEl.innerHTML = '<img src="' + src + '" alt="' + highest.name + '" style="width:1em;height:1em">';
    }
  } else {
    bigEl.textContent = highest.emoji;
    parseAppleEmoji(bigEl);
  }
  document.getElementById('animal-name').textContent = highest.name;
  document.getElementById('click-info').textContent = '+' + formatNumber(Math.floor(getClickValue())) + ' per klik';

  // Orbiters
  updateOrbiters();

  // Animal shop
  const totalDps = getTotalDps();
  ANIMALS.forEach(a => {
    const el = document.getElementById('shop-' + a.id);
    if (!el) return;
    const count = state.animals[a.id] || 0;
    const qty = buyMax ? Math.max(1, getMaxAffordable(a.id)) : buyMultiplier;
    const totalPrice = getBulkPrice(a.id, qty);
    const canAffordAll = state.currentPoints >= totalPrice;
    const visible = isAnimalVisible(a.id);
    el.classList.toggle('affordable', canAffordAll);
    el.classList.toggle('locked', !visible);
    document.getElementById('count-' + a.id).textContent = '×' + count;
    const priceEl = document.getElementById('price-' + a.id);
    const saleBuff = getActiveBuff();
    if (saleBuff && saleBuff.type === 'sale') {
      const unsaledTotal = (() => { let t = 0; for (let i = 0; i < qty; i++) t += Math.ceil(a.basePrice * Math.pow(COST_MULTIPLIER, count + i)); return t; })();
      const priceColor = canAffordAll ? 'var(--green-light)' : 'var(--red)';
      priceEl.innerHTML = (buyMax ? '<span style="font-size:10px;opacity:.6">' + qty + '×</span> ' : '') + '<s style="color:#ffa726;opacity:.6;font-size:.85em">' + formatNumber(unsaledTotal) + '</s> <span style="color:' + priceColor + '">' + formatNumber(totalPrice) + '</span>';
    } else {
      priceEl.innerHTML = (buyMax && qty > 1 ? '<span style="font-size:10px;opacity:.6">' + qty + '×</span> ' : '') + formatNumber(totalPrice);
    }
    // Tooltip with DPS info and milestone
    const animalDps = getAnimalDps(a.id);
    const animalTotalDps = animalDps * count;
    const pct = totalDps > 0 && count > 0 ? (animalTotalDps / totalDps * 100) : 0;
    if (count > 0) {
      const nextMs = MILESTONES.find(m => count < m);
      let tip = escHtml(a.name) + '|';
      tip += escHtml(count + ' ' + (count === 1 ? a.name.toLowerCase() : a.plural));
      tip += '<br>' + escHtml('+' + formatDps(animalDps) + '/s per stuk');
      tip += '<br>' + escHtml(formatDps(animalTotalDps) + '/s totaal (' + pct.toFixed(1) + '%)');
      if (nextMs) tip += '<br>' + escHtml('Volgende bonus bij ' + nextMs);
      el.setAttribute('data-tip', tip);
    } else {
      el.setAttribute('data-tip', escHtml(a.name) + '|' + escHtml(a.flavor));
    }
    // Milestone progress bar
    const msEl = document.getElementById('milestone-' + a.id);
    if (msEl) {
      const nextMs = MILESTONES.find(m => count < m);
      if (nextMs && visible && state.prestige.timesReset > 0) {
        const prevMs = MILESTONES[MILESTONES.indexOf(nextMs) - 1] || 0;
        const pctMs = Math.min(100, Math.round((count - prevMs) / (nextMs - prevMs) * 100));
        msEl.innerHTML = '<div class="milestone-bar"><div class="milestone-bar-fill" style="width:' + pctMs + '%"></div></div>';
      } else {
        msEl.innerHTML = '';
      }
    }
  });

  // Upgrades
  const allUpgradeSets = [CLICK_UPGRADES, GLOBAL_UPGRADES, OFFLINE_UPGRADES, ...ANIMALS.map(a => a.upgrades)];
  allUpgradeSets.flat().forEach(u => {
    const el = document.getElementById('upg-' + u.id);
    if (!el) return;
    const bought = !!state.upgrades[u.id];
    el.classList.toggle('bought', bought);
    el.classList.toggle('affordable', !bought && state.currentPoints >= u.cost);
    // Check requirements
    if (u.req !== undefined) {
      const animal = ANIMALS.find(a => a.upgrades.some(au => au.id === u.id));
      if (animal) {
        const locked = (state.animals[animal.id] || 0) < u.req;
        el.classList.toggle('locked', locked && !bought);
      }
    }
    const priceEl = document.getElementById('upgprice-' + u.id);
    if (priceEl) priceEl.textContent = bought ? 'Gekocht!' : formatNumber(u.cost);
  });
  const upgSummary = document.querySelector('.upg-summary');
  if (upgSummary) {
    const allUpgrades = allUpgradeSets.flat();
    const boughtCount = allUpgrades.filter(u => state.upgrades[u.id]).length;
    const totalCount = allUpgrades.length;
    const pctUpg = totalCount ? Math.floor(boughtCount / totalCount * 100) : 0;
    upgSummary.textContent = boughtCount + '/' + totalCount + ' upgrades (' + pctUpg + '%)';
  }

  // Achievements (update earned status)
  achievementDefs.forEach(a => {
    const el = document.getElementById('ach-' + a.id);
    if (!el) return;
    const e = !!state.achievements[a.id];
    el.classList.toggle('earned', e);
    el.classList.toggle('unearned', !e);
    el.setAttribute('data-tip', e || achSpoilerActive ? escHtml(a.name) + '|' + escHtml(a.desc) : '???|Nog niet ontgrendeld');
  });

  // Achievement summary
  const achSummary = document.querySelector('.ach-summary');
  if (achSummary) {
    const earned = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
    const pct = achievementDefs.length ? Math.floor(earned / achievementDefs.length * 100) : 0;
    achSummary.textContent = earned + '/' + achievementDefs.length + ' prestaties (' + pct + '%) — elke prestatie geeft +2% DPS!';
  }

  // Prestige button
  const pBtn = document.getElementById('prestige-btn');
  if (pBtn) {
    pBtn.disabled = !canPrestige();
    if (canPrestige()) {
      pBtn.textContent = '⭐ Evolueer! (+' + getPrestigeStars() + ' sterren)';
    } else {
      pBtn.textContent = '⭐ Evolueer (nodig: alle dieren)';
    }
    parseAppleEmoji(pBtn);
  }

  // Mini-game locks & cooldowns
  MINIGAME_UNLOCKS.forEach(mg => {
    const box = document.getElementById('mg-' + mg.id);
    const lock = document.getElementById('lock-' + mg.id);
    if (!box || !lock) return;
    const unlocked = isMinigameUnlocked(mg.id);
    box.classList.toggle('locked', !unlocked);
    lock.textContent = unlocked ? '' : '🔒 ' + mg.label + ' om te spelen!';
    lock.style.display = unlocked ? 'none' : 'block';
  });
  const cdm = getCooldownMultiplier();
  updateCooldown('quiz-btn', 'quiz-cooldown', state.minigames.quizLast, QUIZ_COOLDOWN * cdm, quizActive);
  updateCooldown('catcher-btn', 'catcher-cooldown', state.minigames.catcherLast, CATCHER_COOLDOWN * cdm, catcherActive);
  updateCooldown('math-btn', 'math-cooldown', state.minigames.mathLast, MATH_COOLDOWN * cdm, mathActive);
  updateCooldown('buff-btn', 'buff-cooldown', state.minigames.buffLast, BUFF_COOLDOWN * cdm, false);
  updateCooldown('sort-btn', 'sort-cooldown', state.minigames.sortLast, SORT_COOLDOWN * cdm, sortActive);
  updateCooldown('memory-btn', 'memory-cooldown', state.minigames.memoryLast, MEMORY_COOLDOWN * cdm, memoryActive);
  updateCooldown('tellen-btn', 'tellen-cooldown', state.minigames.tellenLast, TELLEN_COOLDOWN * cdm, tellenActive);
  updateCooldown('indringer-btn', 'indringer-cooldown', state.minigames.indringerLast, INDRINGER_COOLDOWN * cdm, indringerActive);
  updateCooldown('groter-btn', 'groter-cooldown', state.minigames.groterLast, GROTER_COOLDOWN * cdm, groterActive);
  updateCooldown('voedsel-btn', 'voedsel-cooldown', state.minigames.voedselLast, VOEDSEL_COOLDOWN * cdm, voedselActive);
  updateCooldown('race-btn', 'race-cooldown', state.minigames.raceLast, RACE_COOLDOWN * cdm, raceActive);
  updateCooldown('puzzel-btn', 'puzzel-cooldown', state.minigames.puzzelLast, PUZZEL_COOLDOWN * cdm, puzzelActive);

  // Buff indicator (multiple buffs)
  const buffInd = document.getElementById('buff-indicator');
  const curBuffs = getActiveBuffs();
  if (curBuffs.length > 0 && buffInd) {
    buffInd.style.visibility = 'visible';
    buffInd.style.background = curBuffs[0].color + '30';
    buffInd.style.color = curBuffs[0].color;
    buffInd.innerHTML = curBuffs.map(b => {
      const remaining = Math.ceil((b.endsAt - Date.now()) / 1000);
      return '<span style="color:' + b.color + '">' + b.emoji + ' ' + b.name + ' — ' + remaining + 's</span>';
    }).join(' &nbsp;·&nbsp; ');
  } else if (buffInd) {
    buffInd.style.visibility = 'hidden';
    buffInd.innerHTML = '';
  }

  // Star shop tab visibility
  const ssTab = document.getElementById('starshop-tab');
  if (ssTab) ssTab.style.display = state.prestige.timesReset > 0 ? '' : 'none';

  // Daily challenges
  renderDailyChallenges();

  // Stats
  renderStats();

  // Notification badges on shop tabs
  updateTabBadges();

  // Parse only dynamic emoji elements (buff indicator)
  if (curBuffs.length > 0 && buffInd) parseAppleEmoji(buffInd);
}

const _cooldownActive = {};
function updateCooldown(btnId, textId, lastPlayed, cooldown, active) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  if (!btn || !text) return;
  const remaining = cooldown - (Date.now() - lastPlayed);
  if (remaining > 0 && !active) {
    _cooldownActive[btnId] = true;
    btn.disabled = true;
    const pct = Math.round((1 - remaining / cooldown) * 100);
    const fill = text.querySelector('.cooldown-bar-fill');
    if (fill) {
      // Update existing bar without rebuilding DOM (preserves CSS animation)
      fill.style.width = pct + '%';
      fill.classList.toggle('cooldown-pulse', remaining <= 5000);
      text.childNodes[0].textContent = 'Wacht ' + Math.ceil(remaining / 1000) + 's...';
    } else {
      text.innerHTML = 'Wacht ' + Math.ceil(remaining / 1000) + 's...<div class="cooldown-bar"><div class="cooldown-bar-fill" style="width:' + pct + '%"></div></div>';
    }
  } else if (!active) {
    if (_cooldownActive[btnId]) {
      _cooldownActive[btnId] = false;
      sfxCooldownReady();
    }
    btn.disabled = false;
    if (text.innerHTML) text.innerHTML = '';
  }
}

function buildStarShop() {
  const el = document.getElementById('starshop-list');
  if (!el) return;
  const available = getAvailableStars();
  let html = '<div class="ss-header">';
  html += '<div class="ss-stars">⭐ ' + available + ' sterren beschikbaar</div>';
  html += '<div class="ss-hint">Elke ster geeft +5% DPS. Besteed ze verstandig!</div>';
  html += '</div>';

  STAR_SHOP.forEach(cat => {
    html += '<div class="ss-category">';
    html += '<h4>' + cat.emoji + ' ' + cat.cat + '</h4>';
    cat.perks.forEach((p, i) => {
      const owned = hasPerk(p.id);
      const prevOwned = i === 0 || hasPerk(cat.perks[i-1].id);
      const canBuy = !owned && prevOwned && available >= p.cost;
      const locked = !owned && !prevOwned;
      let cls = 'ss-perk';
      if (owned) cls += ' ss-owned';
      else if (canBuy) cls += ' ss-buyable';
      else if (locked) cls += ' ss-locked';
      else cls += ' ss-expensive';
      html += '<div class="' + cls + '"' + (canBuy ? ' onclick="buyPerk(\'' + p.id + '\');buildStarShop()"' : '') + '>';
      html += '<div class="ss-perk-top">';
      html += '<span class="ss-perk-name">' + p.name + '</span>';
      const costCls = owned ? '' : canBuy ? ' ss-affordable' : locked ? '' : ' ss-toodear';
      html += '<span class="ss-perk-cost' + costCls + '">' + (owned ? '✓' : p.cost + '⭐') + '</span>';
      html += '</div>';
      html += '<div class="ss-perk-desc">' + p.desc + '</div>';
      html += '</div>';
    });
    html += '</div>';
  });
  el.innerHTML = html;
}

let _dcCollapsed = window.innerWidth <= 900; // collapsed by default on mobile
function toggleDcCollapse() {
  _dcCollapsed = !_dcCollapsed;
  renderDailyChallenges();
}

function renderDailyChallenges() {
  const el = document.getElementById('daily-challenges');
  if (!el) return;
  if (!state.daily.date || !state.daily.challenges.length || state.prestige.timesReset < 1) {
    el.innerHTML = '';
    return;
  }
  const isMobile = window.innerWidth <= 900;
  const allDone = state.daily.completed.every(v => v);
  const doneCount = state.daily.completed.filter(v => v).length;
  let html = '';
  if (allDone) {
    html = '<div class="dc-card dc-done dc-compact">🌟 Alle uitdagingen voltooid!';
    if (state.daily.streak > 0) html += ' <span class="dc-streak">🔥 ' + state.daily.streak + 'd</span>';
    html += '</div>';
  } else {
    html = '<div class="dc-card">';
    html += '<div class="dc-header"' + (isMobile ? ' onclick="toggleDcCollapse()"' : '') + '>';
    html += '📋 Dagelijkse uitdagingen';
    if (isMobile) html += ' <span style="font-weight:400;font-size:11px;color:var(--text-dim)">(' + doneCount + '/' + state.daily.challenges.length + ')</span>';
    if (state.daily.streak > 0) html += '<span class="dc-streak">🔥 ' + state.daily.streak + 'd</span>';
    if (isMobile) html += '<span class="dc-toggle-arrow' + (_dcCollapsed ? '' : ' dc-open') + '">▼</span>';
    html += '</div>';
    html += '<div class="dc-items' + (isMobile && _dcCollapsed ? ' dc-collapsed' : '') + '">';
    state.daily.challenges.forEach((cid, i) => {
      const c = DAILY_CHALLENGE_POOL.find(x => x.id === cid);
      if (!c) return;
      const done = state.daily.completed[i];
      const p = getDailyChallengeProgress(c);
      const pct = Math.min(100, Math.floor(Math.min(p.cur, p.max) / p.max * 100));
      html += '<div class="dc-item' + (done ? ' dc-item-done' : '') + '">';
      html += '<span class="dc-emoji">' + (done ? '✅' : c.emoji) + '</span>';
      html += '<div class="dc-info">';
      html += '<span class="dc-desc">' + c.desc + '</span>';
      if (!done) {
        html += '<div class="dc-bar"><div class="dc-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<span class="dc-progress">' + formatNumber(Math.min(p.cur, p.max)) + '/' + formatNumber(p.max) + '</span>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}

let _onlineCount = null;
let _heartbeatSid = sessionStorage.getItem('hb_sid') || '';
function pollOnlineCount() {
  const q = _heartbeatSid ? '?sid=' + _heartbeatSid : '';
  fetch('/api/heartbeat' + q, {method:'POST'}).then(r => r.json()).then(d => {
    _onlineCount = d.online;
    if (d.sid && !_heartbeatSid) { _heartbeatSid = d.sid; sessionStorage.setItem('hb_sid', d.sid); }
  }).catch(() => {});
}
setInterval(pollOnlineCount, 30000);
setTimeout(pollOnlineCount, 2000);

function renderStats() {
  const list = document.getElementById('stats-list');
  if (!list) return;
  const totalAnimals = ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0);
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;

  const row = (l, v) => '<div class="stat-row"><span class="stat-label">' + l + '</span><span>' + v + '</span></div>';
  const heading = (t) => '<div class="stat-heading">' + t + '</div>';
  const bigStat = (emoji, val, label) => '<div class="stat-big"><span class="stat-big-val">' + emoji + ' ' + val + '</span><span class="stat-big-label">' + label + '</span></div>';
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

  // Highlight dashboard
  const s = state.stats;
  const totalMgPlayed = s.quizPlayed + s.catcherPlayed + s.mathPlayed + s.buffPlayed + s.sortPlayed + s.memoryPlayed + s.tellenPlayed + s.indringerPlayed + s.groterPlayed + s.voedselPlayed + s.racePlayed + s.puzzelPlayed;
  const bd = getDpsBreakdown();
  let html = '<div class="stat-dashboard">';
  html += bigStat('', formatDps(bd.total || 0) + '/s', 'DPS');
  html += bigStat('', formatNumber(state.allTime.totalClicks), 'Klikken');
  html += bigStat('', totalMgPlayed + 'x', 'Minigames');
  if (_onlineCount !== null) html += bigStat('', _onlineCount, 'Spelers online');
  else html += bigStat('', state.prestige.timesReset + 'x', 'Evoluties');
  html += '</div>';

  // Favoriete minigame
  const mgNames = {quizPlayed:'Quiz', catcherPlayed:'Vanger', mathPlayed:'Wiskunde', buffPlayed:'Buffs', sortPlayed:'Sorteren', memoryPlayed:'Memory', tellenPlayed:'Tellen', indringerPlayed:'Indringer', groterPlayed:'Groter/Kleiner', voedselPlayed:'Wat Eet Ik?', racePlayed:'Paardenrace', puzzelPlayed:'Puzzel'};
  let favMg = '', favMgCount = 0;
  Object.keys(mgNames).forEach(k => {
    if ((s[k] || 0) > favMgCount) { favMgCount = s[k]; favMg = mgNames[k]; }
  });

  html += heading('Deze evolutie');
  html += row('Totaal geklikt', formatNumber(state.totalClicks));
  html += row('Totaal verdiend', formatNumber(Math.floor(state.totalEarned)));
  html += row('Totaal dieren', formatNumber(totalAnimals));
  html += row('Speeltijd', formatTime(state.playTimeSeconds));

  html += heading('Allertijden');
  html += row('Totaal geklikt', formatNumber(state.allTime.totalClicks));
  html += row('Totaal verdiend', formatNumber(Math.floor(state.allTime.totalEarned)));
  html += row('Totaal dieren', formatNumber(state.allTime.totalAnimals));
  html += row('Speeltijd', formatTime(state.allTime.playTimeSeconds));

  html += heading('Algemeen');
  html += row('Dieren per klik', formatNumber(Math.floor(getClickValue())));
  html += row('Prestaties', achCount + '/' + achievementDefs.length + ' (+' + (achCount * 2) + '% DPS)');
  html += row('Evolutiesterren', state.prestige.stars + ' ⭐ (+' + (state.prestige.stars * 5) + '%)');
  html += row('Offline bonus', getOfflinePercent() + '%');
  html += row('Evoluties', state.prestige.timesReset + 'x');
  if (_onlineCount !== null) html += row('Spelers online', _onlineCount);

  // DPS breakdown
  if (bd.total > 0) {
    html += heading('DPS Uitsplitsing');
    bd.animals.forEach(a => {
      const p = (a.dps / bd.rawTotal * 100).toFixed(1);
      html += row(a.name, formatDps(a.dps) + '/s (' + p + '%)');
    });
    if (bd.achPct > 0) html += row('🏆 Prestatiebonus', '+' + bd.achPct.toFixed(0) + '%');
    if (bd.starPct > 0) html += row('⭐ Sterrenbonus', '+' + bd.starPct.toFixed(0) + '%');
    if (bd.buffActive) html += row('🔥 Buff', '×2');
    html += row('<b>Totaal</b>', '<b>' + formatDps(bd.total) + '/s</b>');
  }

  // Minigame stats with accuracy percentages
  html += heading('Minigames');
  html += row('Totaal gespeeld', totalMgPlayed + 'x');
  if (favMg) html += row('Favoriete game', favMg + ' (' + favMgCount + 'x)');
  if (s.tellenPlayed) html += row('🔢 Tellen', s.tellenCorrect + '/' + s.tellenPlayed + ' goed (' + pct(s.tellenCorrect, s.tellenPlayed) + '%)');
  if (s.quizPlayed) html += row('🧠 Quiz', s.quizCorrect + '/' + s.quizPlayed + ' goed (' + pct(s.quizCorrect, s.quizPlayed) + '%)');
  if (s.catcherPlayed) html += row('🎯 Vanger', s.catcherCaught + ' gevangen (' + s.catcherPlayed + 'x)');
  if (s.indringerPlayed) html += row('🚫 Indringer', 'beste: ' + s.indringerBest + ' (' + s.indringerPlayed + 'x)');
  if (s.mathPlayed) html += row('🔢 Wiskunde', s.mathCorrect + '/' + s.mathPlayed + ' goed (' + pct(s.mathCorrect, s.mathPlayed) + '%)');
  if (s.groterPlayed) {
    const groterTotal = s.groterCorrect + s.groterWrong;
    html += row('⚖️ Groter/Kleiner', s.groterCorrect + '/' + groterTotal + ' goed (' + pct(s.groterCorrect, groterTotal) + '%)');
  }
  if (s.buffPlayed) html += row('✨ Buffs', s.buffPlayed + 'x gekozen');
  if (s.voedselPlayed) {
    const voedselTotal = s.voedselCorrect + s.voedselWrong;
    html += row('🍽️ Wat Eet Ik?', s.voedselCorrect + '/' + voedselTotal + ' goed (' + pct(s.voedselCorrect, voedselTotal) + '%)');
  }
  if (s.sortPlayed) html += row('🗂️ Sorteren', s.sortCorrect + ' goed (beste streak: ' + s.sortBestStreak + ')');
  if (s.racePlayed) html += row('🏇 Paardenrace', s.raceWon + '/' + s.racePlayed + ' gewonnen (' + pct(s.raceWon, s.racePlayed) + '%)');
  if (s.puzzelPlayed) html += row('🧩 Puzzel', s.puzzelWon + 'x opgelost (beste: ' + (s.puzzelBestMoves || '-') + ' zetten)');
  if (s.memoryPlayed) html += row('🃏 Memory', s.memoryWon + '/' + s.memoryPlayed + ' perfect (' + pct(s.memoryWon, s.memoryPlayed) + '%)');

  // Perfect scores summary
  const perfects = [];
  if (s.groterPerfect) perfects.push('⚖️ ' + s.groterPerfect + 'x');
  if (s.voedselPerfect) perfects.push('🍽️ ' + s.voedselPerfect + 'x');
  if (s.memoryWon) perfects.push('🃏 ' + s.memoryWon + 'x');
  if (perfects.length) html += row('Perfect scores', perfects.join(' · '));

  if (s.luckyClicked || s.luckyMissed) {
    const luckyTotal = (s.luckyClicked || 0) + (s.luckyMissed || 0);
    const luckyPct = pct(s.luckyClicked || 0, luckyTotal);
    html += heading('Geluksbeestjes');
    html += row('🐞 Gevangen', (s.luckyClicked || 0) + '/' + luckyTotal + ' (' + luckyPct + '%)');
    if (s.luckyDouble) html += row('🐞🐞 Dubbel', s.luckyDouble + 'x');
    if (s.luckyJackpot) html += row('💰 Jackpots', s.luckyJackpot + 'x');
  }

  list.innerHTML = html;
}

// --- Leaderboard ---
let _leaderboardData = null;
let _leaderboardTrustedOnly = true;
let _lastLeaderboardSubmit = 0;

function getPlayerPid() {
  // Persistent player ID (survives session, unlike heartbeat sid)
  let pid = localStorage.getItem('dk_pid');
  if (!pid) {
    pid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('dk_pid', pid);
  }
  return pid;
}

function submitLeaderboard() {
  if (!state.zooName) return;
  // Throttle: max once per 60s
  const now = Date.now();
  if (now - _lastLeaderboardSubmit < 60000) return;
  _lastLeaderboardSubmit = now;

  const totalAnimals = ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0);
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;
  const animalCounts = {};
  ANIMALS.forEach(a => { animalCounts[a.id] = state.animals[a.id] || 0; });

  fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pid: getPlayerPid(),
      zooName: state.zooName,
      score: Math.floor(state.allTime.totalEarned),
      stars: Math.floor(state.prestige.stars),
      playTimeSeconds: Math.floor(state.allTime.playTimeSeconds),
      totalClicks: Math.floor(state.allTime.totalClicks),
      totalAnimals: Math.floor(state.allTime.totalAnimals),
      achievements: achCount,
      timesReset: state.prestige.timesReset,
      animals: animalCounts,
    }),
  }).catch(() => {});
}

function fetchLeaderboard() {
  const pid = getPlayerPid();
  const trusted = _leaderboardTrustedOnly ? '1' : '0';
  fetch('/api/leaderboard?pid=' + pid + '&trusted=' + trusted)
    .then(r => r.json())
    .then(data => { _leaderboardData = data; renderLeaderboard(); })
    .catch(() => {});
}

function renderLeaderboard() {
  const el = document.getElementById('leaderboard-list');
  if (!el) return;

  let html = '';

  // Zoo name requirement
  if (!state.zooName) {
    html += '<div style="text-align:center;padding:20px;color:var(--text-dim)">';
    html += '<p>Geef je dierentuin een naam om mee te doen!</p>';
    html += '<p style="font-size:12px">Klik op de ✏️ knop linksboven.</p>';
    html += '</div>';
    el.innerHTML = html;
    return;
  }

  // Filter toggle
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<span style="font-size:12px;color:var(--text-dim)">' + (_leaderboardData ? _leaderboardData.total + ' spelers' : '') + '</span>';
  html += '<label style="font-size:12px;color:var(--text-dim);cursor:pointer"><input type="checkbox" id="lb-trusted" ' + (_leaderboardTrustedOnly ? 'checked' : '') + ' onchange="toggleLeaderboardFilter()" style="margin-right:4px">Alleen betrouwbaar</label>';
  html += '</div>';

  if (!_leaderboardData) {
    html += '<div style="text-align:center;padding:20px;color:var(--text-dim)">Laden...</div>';
    el.innerHTML = html;
    return;
  }

  // Top 10
  html += '<div class="stat-heading">🏆 Top 10</div>';
  if (_leaderboardData.top.length === 0) {
    html += '<div style="text-align:center;padding:12px;color:var(--text-dim)">Nog geen scores!</div>';
  } else {
    html += '<div class="lb-table">';
    html += '<div class="lb-header"><span>#</span><span>Dierentuin</span><span>Score</span><span>⭐</span><span></span></div>';
    _leaderboardData.top.forEach(function(e) {
      var isMe = _leaderboardData.me && e.rank === _leaderboardData.me.rank;
      html += '<div class="lb-row' + (isMe ? ' lb-me' : '') + '">';
      html += '<span class="lb-rank">' + e.rank + '</span>';
      html += '<span class="lb-name">' + escapeHtml(e.zooName) + '</span>';
      html += '<span class="lb-score">' + formatNumber(e.score) + '</span>';
      html += '<span class="lb-stars">' + e.stars + '</span>';
      html += trustBadge(e.trust);
      html += '</div>';
    });
    html += '</div>';
  }

  // My position (if not in top 10)
  if (_leaderboardData.me && _leaderboardData.me.rank > 10) {
    html += '<div class="stat-heading">Jouw positie</div>';
    var e = _leaderboardData.me;
    html += '<div class="lb-table">';
    html += '<div class="lb-row lb-me">';
    html += '<span class="lb-rank">' + e.rank + '</span>';
    html += '<span class="lb-name">' + escapeHtml(e.zooName) + '</span>';
    html += '<span class="lb-score">' + formatNumber(e.score) + '</span>';
    html += '<span class="lb-stars">' + e.stars + '</span>';
    html += trustBadge(e.trust);
    html += '</div>';
    html += '</div>';
  }

  // Info text
  html += '<div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-dim)">Score wordt automatisch bijgewerkt</div>';

  el.innerHTML = html;
}

function trustBadge(trust) {
  var icon, label, tip;
  if (trust >= 80) {
    icon = '🟢'; label = 'Betrouwbaar'; tip = 'Betrouwbaar|Score lijkt legitiem (' + trust + '/100)';
  } else if (trust >= 60) {
    icon = '🟠'; label = 'Twijfelachtig'; tip = 'Twijfelachtig|Score is mogelijk verdacht (' + trust + '/100)';
  } else {
    icon = '🔴'; label = 'Onbetrouwbaar'; tip = 'Onbetrouwbaar|Score lijkt vals of gemanipuleerd (' + trust + '/100)';
  }
  return '<span class="lb-trust" data-tip="' + tip + '">' + icon + '</span>';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toggleLeaderboardFilter() {
  _leaderboardTrustedOnly = !_leaderboardTrustedOnly;
  fetchLeaderboard();
}

let orbiters = [];
function updateOrbiters() {
  const area = document.getElementById('click-area');
  const owned = ANIMALS.filter(a => (state.animals[a.id]||0) > 0);

  // Only rebuild if set changed
  const key = owned.map(a => a.id).join(',');
  if (key === updateOrbiters._lastKey) return;
  updateOrbiters._lastKey = key;

  // Remove old
  document.querySelectorAll('.orbiter').forEach(el => el.remove());

  // Add new
  owned.forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'orbiter';
    el.textContent = a.emoji;
    parseAppleEmoji(el);
    const radius = Math.min(area.offsetWidth, area.offsetHeight) * 0.35;
    el.style.setProperty('--radius', radius + 'px');
    el.style.setProperty('--dur', (8 + i * 2) + 's');
    el.style.setProperty('--delay', (-i * 1.5) + 's');
    el.style.left = '50%';
    el.style.top = '50%';
    area.appendChild(el);
  });
}
updateOrbiters._lastKey = '';

/* ================================================================
   SECTIE 11: UI HELPERS
   ================================================================ */

/* Tooltip system */
const tooltipEl = document.getElementById('tooltip');
const _isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

// Desktop: hover tooltips
if (!_isTouchDevice) {
  document.addEventListener('mouseover', function(e) {
    const item = e.target.closest('[data-tip]');
    if (!item) return;
    const parts = item.dataset.tip.split('|');
    tooltipEl.innerHTML = '<div class="tip-title">' + parts[0] + '</div>' +
      (parts[1] ? '<div class="tip-desc">' + parts[1] + '</div>' : '');
    tooltipEl.style.display = 'block';
    positionTooltip(e);
  });
  document.addEventListener('mousemove', function(e) {
    if (tooltipEl.style.display === 'block') positionTooltip(e);
  });
  document.addEventListener('mouseout', function(e) {
    const item = e.target.closest('[data-tip]');
    if (item) tooltipEl.style.display = 'none';
  });
}

// Mobile: tap to show tooltip as toast
if (_isTouchDevice) {
  let _touchTipTimer = null;
  document.addEventListener('click', function(e) {
    const item = e.target.closest('[data-tip]');
    if (!item) return;
    const parts = item.dataset.tip.split('|');
    const text = parts[0] + (parts[1] ? ' — ' + parts[1] : '');
    // Show as toast
    const existing = document.querySelector('.touch-tip-toast');
    if (existing) existing.remove();
    clearTimeout(_touchTipTimer);
    const toast = document.createElement('div');
    toast.className = 'toast touch-tip-toast';
    toast.innerHTML = text;
    toast.style.animation = 'toast-in 0.3s ease-out, toast-out 0.3s ease-in 2.2s forwards';
    document.body.appendChild(toast);
    _touchTipTimer = setTimeout(() => toast.remove(), 2500);
  });
}

function positionTooltip(e) {
  const tw = tooltipEl.offsetWidth || 200;
  const th = tooltipEl.offsetHeight || 60;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + tw > window.innerWidth) x = e.clientX - tw - 14;
  if (y + th > window.innerHeight) y = e.clientY - th - 14;
  if (x < 4) x = 4;
  if (y < 4) y = 4;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}

function showMidTab(tabId) {
  const tabIds = ['games', 'stats', 'starshop', 'leaderboard'];
  document.querySelectorAll('.mid-tab').forEach((t, i) =>
    t.classList.toggle('active', tabId === tabIds[i])
  );
  tabIds.forEach(id => {
    const el = document.getElementById('mid-' + id);
    if (el) el.classList.toggle('active', tabId === id);
  });
  if (tabId === 'starshop') buildStarShop();
  if (tabId === 'leaderboard') { submitLeaderboard(); setTimeout(fetchLeaderboard, 500); }
  try { localStorage.setItem('dk_midtab', tabId); } catch(e) {}
}

function showShopTab(tabId) {
  const labels = {animals:'Dieren', upgrades:'Upgrades', achievements:'Prestaties', evolution:'Evolutie', options:'Opties'};
  document.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.textContent.includes(labels[tabId] || '')));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  if (tabId === 'achievements') buildAchievements();
  if (tabId === 'evolution') buildEvolution();
  try { localStorage.setItem('dk_shoptab', tabId); } catch(e) {}
}

function showMobilePanel(panel) {
  document.querySelectorAll('#mobile-nav .tab').forEach(t => t.classList.remove('active'));
  document.getElementById('mob-' + panel).classList.add('active');
  ['left', 'middle', 'right'].forEach(p => {
    document.getElementById(p + '-panel').classList.toggle('hidden-mobile', p !== panel);
  });
  try { localStorage.setItem('dk_mobilepanel', panel); } catch(e) {}
}

/* Notification badges */
function updateTabBadges() {
  const tabs = document.querySelectorAll('.shop-tab');
  // Animals tab: can afford any visible animal
  const canBuyAnimal = ANIMALS.some(a => isAnimalVisible(a.id) && state.currentPoints >= getAnimalPrice(a.id));
  // Upgrades tab: can afford any unbought upgrade meeting requirements
  const canBuyUpgrade = [CLICK_UPGRADES, GLOBAL_UPGRADES, OFFLINE_UPGRADES, ...ANIMALS.map(a => a.upgrades)].flat().some(u => {
    if (state.upgrades[u.id]) return false;
    if (state.currentPoints < u.cost) return false;
    if (u.req !== undefined) {
      const animal = ANIMALS.find(a => a.upgrades.some(au => au.id === u.id));
      if (animal && (state.animals[animal.id] || 0) < u.req) return false;
    }
    return true;
  });
  // Evolution tab: can prestige
  const canEvolve = canPrestige() && getPrestigeStars() > 0;

  tabs.forEach(t => {
    // Remove existing badges
    const old = t.querySelector('.tab-badge');
    if (old) old.remove();
    const text = t.textContent;
    let show = false;
    if (text.includes('Dieren') && canBuyAnimal && !t.classList.contains('active')) show = true;
    if (text.includes('Upgrades') && canBuyUpgrade && !t.classList.contains('active')) show = true;
    if (text.includes('Evolutie') && canEvolve && !t.classList.contains('active')) show = true;
    if (show) {
      const badge = document.createElement('span');
      badge.className = 'tab-badge';
      if (text.includes('Evolutie')) badge.style.background = 'var(--gold)';
      t.appendChild(badge);
    }
  });
}

/* Achievement celebration */
function celebrateAchievement(emoji) {
  const el = document.createElement('div');
  el.className = 'ach-celebrate';
  el.textContent = emoji;
  el.style.left = (40 + Math.random() * 20) + '%';
  el.style.top = (30 + Math.random() * 20) + '%';
  document.body.appendChild(el);
  parseAppleEmoji(el);
  setTimeout(() => el.remove(), 1200);
}

function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function showOfflineModal(amount, seconds) {
  document.getElementById('offline-amount').textContent = '+' + formatNumber(Math.floor(amount)) + ' punten';
  document.getElementById('offline-detail').textContent = 'Je dieren werkten ' + formatTime(seconds) + ' voor je!';
  showModal('offline-modal');
}

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ================================================================
   SECTIE 11b: DIERENTUIN NAAM
   ================================================================ */

function getZooDisplayName() {
  if (!state.zooName) return 'Mijn Dierentuin';
  const name = state.zooName;
  const suffix = name.endsWith('s') || name.endsWith('S') ? "' Dierentuin" : "'s Dierentuin";
  return name + suffix;
}

function renderZooName() {
  const el = document.getElementById('zoo-name-text');
  if (el) el.textContent = getZooDisplayName();
}

function startEditZooName() {
  const bar = document.getElementById('zoo-name-bar');
  const current = state.zooName || '';
  bar.innerHTML =
    '<input id="zoo-name-input" type="text" maxlength="20" value="' +
    current.replace(/"/g, '&quot;') +
    '" placeholder="Jouw naam" autocomplete="off" spellcheck="false">' +
    '<button id="zoo-name-save-btn" onclick="saveZooName()">✓</button>';
  const inp = document.getElementById('zoo-name-input');
  inp.focus();
  inp.select();
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveZooName();
    if (e.key === 'Escape') cancelEditZooName();
  });
}

function saveZooName() {
  const inp = document.getElementById('zoo-name-input');
  if (!inp) return;
  const cleaned = sanitizeZooName(inp.value);
  if (cleaned.length > 0 && cleaned.length < 2) {
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 400);
    return;
  }
  state.zooName = cleaned;
  cancelEditZooName();
  saveGame();
}

function cancelEditZooName() {
  const bar = document.getElementById('zoo-name-bar');
  bar.innerHTML =
    '<span id="zoo-name-text">' + getZooDisplayName() + '</span>' +
    '<button id="zoo-name-edit-btn" onclick="startEditZooName()" title="Naam wijzigen">✏️</button>';
  parseAppleEmoji(bar);
}

/* ================================================================
   SECTIE 11c: GELUKSBEESTJE
   ================================================================ */

const LUCKY_BASE_INTERVAL = 120000; // 120 sec average
const LUCKY_VARIANCE = 40000;       // ±40 sec
const LUCKY_DURATION = 8000;        // 8 sec visible
const LUCKY_DOUBLE_CHANCE = 0.03;   // 3% double
const LUCKY_BUFF_CHANCE = 0.05;     // 5% per buff type (20% total)
const LUCKY_JACKPOT_CHANCE = 0.05;  // 5% jackpot

let luckyNextSpawn = 0;
let luckyActive = [];
let luckyRecentCatch = 0;

function getLuckyInterval() {
  // Faster spawns with more prestige stars (10% faster per 5 stars, max 40%)
  const speedBonus = Math.min(0.4, Math.floor(state.prestige.stars / 5) * 0.1);
  let base = LUCKY_BASE_INTERVAL * (1 - speedBonus);
  if (hasPerk('sp_lucky1')) base *= 0.667; // 50% more frequent = 2/3 interval
  if (getActiveBuff('lucky')) base *= 0.2; // Geluksregen: 5× more frequent
  return base + (Math.random() * 2 - 1) * LUCKY_VARIANCE;
}

function scheduleLucky() {
  luckyNextSpawn = Date.now() + getLuckyInterval();
}

function checkLuckySpawn() {
  if (Date.now() < luckyNextSpawn) return;
  if (document.hidden) { scheduleLucky(); return; }
  // Need at least some DPS to spawn
  if (getTotalDps() <= 0) { scheduleLucky(); return; }

  spawnLucky();
  // Small chance of double
  if (Math.random() < LUCKY_DOUBLE_CHANCE) {
    setTimeout(() => spawnLucky(), 300);
  }
  scheduleLucky();
}

function spawnLucky() {
  sfxLuckyAppear();
  const el = document.createElement('div');
  el.className = 'lucky-bug';
  el.textContent = '\uD83D\uDC1E'; // 🐞
  // Random position (avoid edges)
  const x = 10 + Math.random() * 75; // 10-85% of screen width
  const y = 10 + Math.random() * 70; // 10-80% of screen height
  el.style.left = x + 'vw';
  el.style.top = y + 'vh';
  el.onclick = function() { clickLucky(el); };
  document.body.appendChild(el);
  parseAppleEmoji(el);
  luckyActive.push(el);

  // Auto-remove after duration
  setTimeout(() => {
    if (!el.parentNode || el.classList.contains('lucky-caught')) return;
    el.classList.add('lucky-fade');
    // Show "Gemist!" text
    const miss = document.createElement('div');
    miss.className = 'lucky-miss';
    miss.textContent = 'Gemist!';
    miss.style.left = el.style.left;
    miss.style.top = el.style.top;
    document.body.appendChild(miss);
    setTimeout(() => miss.remove(), 1000);
    state.stats.luckyMissed++;
    setTimeout(() => {
      el.remove();
      luckyActive = luckyActive.filter(e => e !== el);
    }, 500);
  }, LUCKY_DURATION);
}

function clickLucky(el) {
  if (el.classList.contains('lucky-caught') || el.classList.contains('lucky-fade')) return;
  el.classList.add('lucky-caught');
  sfxLuckyClick();
  state.stats.luckyClicked++;

  // Double catch: clicked 2 bugs within 10 seconds (only count once per pair)
  if (luckyRecentCatch === 1) state.stats.luckyDouble++;
  luckyRecentCatch++;
  setTimeout(() => { if (luckyRecentCatch > 0) luckyRecentCatch--; }, 10000);

  // Determine reward
  const roll = Math.random();
  const dps = getTotalDps();
  const luckyMult = hasPerk('sp_lucky2') ? 2 : 1;

  if (roll < LUCKY_JACKPOT_CHANCE) {
    // Jackpot! 15 min DPS
    const bonus = dps * 900 * luckyMult;
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    state.stats.luckyJackpot++;
    showToast('\uD83D\uDC1E\uD83C\uDF1F Jackpot! +' + formatNumber(bonus) + ' punten!');
    // Gold confetti
    for (let i = 0; i < 12; i++) {
      const c = document.createElement('div');
      c.className = 'ach-celebrate';
      c.textContent = '\u2B50';
      c.style.left = (30 + Math.random() * 40) + '%';
      c.style.top = (20 + Math.random() * 40) + '%';
      document.body.appendChild(c);
      parseAppleEmoji(c);
      setTimeout(() => c.remove(), 1200);
    }
  } else if (roll < LUCKY_JACKPOT_CHANCE + LUCKY_BUFF_CHANCE * BUFF_TYPES.length) {
    // Buff (5% per buff type)
    const buff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
    if (buff.id === 'jackpot') {
      const bonus = dps * (getBuffDuration() / 1000) * 3 * luckyMult;
      state.currentPoints += bonus;
      state.totalEarned += bonus;
      state.allTime.totalEarned += bonus;
      showToast('\uD83D\uDC1E ' + buff.emoji + ' ' + buff.name + '! +' + formatNumber(bonus) + ' punten!');
    } else {
      activeBuffs = activeBuffs.filter(b => Date.now() < b.endsAt && b.type !== buff.id);
      activeBuffs.push({ type: buff.id, endsAt: Date.now() + getBuffDuration(), emoji: buff.emoji, name: buff.name, color: buff.color, desc: typeof buff.desc === 'function' ? buff.desc() : buff.desc });
      showToast('\uD83D\uDC1E ' + buff.emoji + ' ' + buff.name + ' actief voor ' + (getBuffDuration()/1000) + ' seconden!');
    }
  } else {
    // Points: 5 min DPS
    const bonus = dps * 300 * luckyMult;
    state.currentPoints += bonus;
    state.totalEarned += bonus;
    state.allTime.totalEarned += bonus;
    showToast('\uD83D\uDC1E +' + formatNumber(bonus) + ' punten!');
  }

  setTimeout(() => {
    el.remove();
    luckyActive = luckyActive.filter(e => e !== el);
  }, 300);
}

/* ================================================================
   SECTIE 12: GAME LOOP
   ================================================================ */

let autoClickAccum = 0;
function tick() {
  const now = Date.now();
  const dt = Math.min((now - state.lastTick) / 1000, 1); // cap at 1 second per tick
  state.lastTick = now;

  const dps = getTotalDps();
  const earned = dps * dt;
  state.currentPoints += earned;
  state.totalEarned += earned;
  state.playTimeSeconds += dt;
  state.allTime.totalEarned += earned;
  state.allTime.playTimeSeconds += dt;

  // Auto-click perk (1x per second)
  if (hasPerk('sp_auto')) {
    autoClickAccum += dt;
    if (autoClickAccum >= 1) {
      autoClickAccum -= 1;
      const value = getClickValue();
      state.currentPoints += value;
      state.totalEarned += value;
      state.totalClicks++;
      state.allTime.totalEarned += value;
      state.allTime.totalClicks++;
    }
  }
}

let lastAchCheck = 0;

function gameLoop() {
  tick();

  const now = Date.now();
  if (now - lastAchCheck > 1000) {
    checkAchievements();
    checkDailyChallenges();
    checkLuckySpawn();
    // Check if day changed
    if (getTodayStr() !== state.daily.date) initDailyChallenges();
    lastAchCheck = now;
  }
}

/* ================================================================
   SECTIE 13: INITIALISATIE
   ================================================================ */

function init() {
  loadSoundSettings();
  loadGame();
  initDailyChallenges();
  if (!state.prestige.themeLocked) state.prestige.theme = getHighestUnlockedTheme();
  applyTheme(state.prestige.theme || 'oerwoud');
  buildShop();
  renderZooName();
  render();

  // Schedule first lucky bug
  scheduleLucky();

  // One-time Apple emoji parse for all static UI elements
  parseAppleEmoji(document.body);

  // Game tick (100ms)
  setInterval(gameLoop, TICK_INTERVAL);

  // Render (250ms)
  setInterval(render, RENDER_INTERVAL);

  // Autosave (30s)
  setInterval(saveGame, AUTOSAVE_INTERVAL);

  // Leaderboard auto-submit (every 5 min)
  setInterval(submitLeaderboard, 300000);
  setTimeout(submitLeaderboard, 10000); // first submit after 10s

  // Save on close
  window.addEventListener('beforeunload', saveGame);

  // Restore remembered tabs
  try {
    const savedShopTab = localStorage.getItem('dk_shoptab');
    if (savedShopTab) showShopTab(savedShopTab);
    const savedMidTab = localStorage.getItem('dk_midtab');
    if (savedMidTab) showMidTab(savedMidTab);
  } catch(e) {}

  // Mobile: restore or default to left
  if (window.innerWidth <= 900) {
    const savedPanel = localStorage.getItem('dk_mobilepanel');
    showMobilePanel(savedPanel || 'left');
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Don't capture if typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Space = click (no repeat — must release and press again)
    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      const area = document.getElementById('click-area');
      const rect = area.getBoundingClientRect();
      doClick({clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2});
    }
    // 1-5 = shop tabs
    const shopTabs = ['animals', 'upgrades', 'achievements', 'evolution', 'options'];
    if (e.key >= '1' && e.key <= '5') showShopTab(shopTabs[e.key - 1]);
    // G = games tab, S = stats tab
    if (e.key === 'g' || e.key === 'G') showMidTab('games');
    if (e.key === 's' || e.key === 'S') showMidTab('stats');
  });
}

init();
