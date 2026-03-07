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

function doPrestige() {
  const newStars = getPrestigeStars();
  const totalStars = state.prestige.stars + newStars;
  prestigeCache = { newStars, totalStars };
  closeModal('prestige-modal');
  showDierenhemel(newStars);
}

function showDierenhemel(newStars) {
  sfxHeaven();
  const el = document.getElementById('dierenhemel');
  const farm = document.getElementById('hemel-farm');
  const clouds = document.getElementById('hemel-clouds');
  const starsEl = document.getElementById('hemel-stars');

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

  // Build habitat cards for owned animals
  let html = '';
  HEMEL_HABITATS.forEach(h => {
    const count = state.animals[h.id] || 0;
    if (count === 0) return;
    const animal = ANIMALS.find(a => a.id === h.id);
    if (!animal) return;
    html += '<div class="hemel-habitat" style="background:' + h.bg + '">';
    html += '<div class="hemel-env">' + h.env + '</div>';
    html += '<div class="hemel-halo">😇</div>';
    html += '<div class="hemel-animal">' + animal.emoji + '</div>';
    html += '<div class="hemel-food">' + h.food + '</div>';
    html += '<div class="hemel-label">' + animal.name + ' <span style="opacity:.6">\u00d7' + count + '</span></div>';
    html += '<div class="hemel-desc">' + h.desc + '</div>';
    html += '</div>';
  });
  farm.innerHTML = html;

  starsEl.textContent = '+' + newStars + ' \u2b50 evolutiesterren verdiend!';

  el.classList.add('show');
  parseAppleEmoji(el);
}

function completePrestige() {
  if (!prestigeCache) return;
  const { newStars, totalStars } = prestigeCache;
  prestigeCache = null;

  sfxPrestige();
  cancelAllMinigames();

  const keepAch = {...state.achievements};
  const keepPrestige = {
    stars: totalStars,
    timesReset: state.prestige.timesReset + 1,
    theme: state.prestige.theme || 'oerwoud',
    themeLocked: state.prestige.themeLocked
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

  state = defaultState();
  state.achievements = keepAch;
  state.prestige = keepPrestige;
  state.upgrades = keepUpgrades;
  state.allTime = keepAllTime;
  state.stats = keepStats;

  if (!state.achievements['eerste_evolutie']) {
    state.achievements['eerste_evolutie'] = 1;
  }

  if (!state.prestige.themeLocked) {
    state.prestige.theme = getHighestUnlockedTheme();
  }
  applyTheme(state.prestige.theme);

  document.getElementById('dierenhemel').classList.remove('show');
  saveGame();
  buildShop();
  parseAppleEmoji(document.body);
  showToast('\u2b50 Ge\u00ebvolueerd! +' + newStars + ' sterren!');
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

function buildUpgradeCategory(title, upgrades, animal) {
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
    html += buildUpgradeCategory(a.emoji + ' ' + a.name + '-upgrades', a.upgrades, a);
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
      const achTip = e
        ? escHtml(a.name) + '|' + escHtml(a.desc)
        : achSpoilerActive
          ? escHtml(a.name) + '|' + escHtml(a.desc)
          : '???|Nog niet ontgrendeld';
      html += '<div class="ach-item ' + (e ? 'earned' : 'unearned') + '" id="ach-' + a.id + '" data-tip="' + achTip + '">' +
        a.emoji +
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
  updateCooldown('quiz-btn', 'quiz-cooldown', state.minigames.quizLast, QUIZ_COOLDOWN, quizActive);
  updateCooldown('catcher-btn', 'catcher-cooldown', state.minigames.catcherLast, CATCHER_COOLDOWN, catcherActive);
  updateCooldown('math-btn', 'math-cooldown', state.minigames.mathLast, MATH_COOLDOWN, mathActive);
  updateCooldown('buff-btn', 'buff-cooldown', state.minigames.buffLast, BUFF_COOLDOWN, false);
  updateCooldown('sort-btn', 'sort-cooldown', state.minigames.sortLast, SORT_COOLDOWN, sortActive);
  updateCooldown('memory-btn', 'memory-cooldown', state.minigames.memoryLast, MEMORY_COOLDOWN, memoryActive);
  updateCooldown('tellen-btn', 'tellen-cooldown', state.minigames.tellenLast, TELLEN_COOLDOWN, tellenActive);
  updateCooldown('indringer-btn', 'indringer-cooldown', state.minigames.indringerLast, INDRINGER_COOLDOWN, indringerActive);
  updateCooldown('groter-btn', 'groter-cooldown', state.minigames.groterLast, GROTER_COOLDOWN, groterActive);
  updateCooldown('voedsel-btn', 'voedsel-cooldown', state.minigames.voedselLast, VOEDSEL_COOLDOWN, voedselActive);
  updateCooldown('race-btn', 'race-cooldown', state.minigames.raceLast, RACE_COOLDOWN, raceActive);
  updateCooldown('puzzel-btn', 'puzzel-cooldown', state.minigames.puzzelLast, PUZZEL_COOLDOWN, puzzelActive);

  // Buff indicator
  const buffInd = document.getElementById('buff-indicator');
  const curBuff = getActiveBuff();
  if (curBuff && buffInd) {
    const remaining = Math.ceil((curBuff.endsAt - Date.now()) / 1000);
    buffInd.style.visibility = 'visible';
    buffInd.style.background = curBuff.color + '30';
    buffInd.style.color = curBuff.color;
    buffInd.innerHTML = curBuff.emoji + ' ' + curBuff.name + ' — ' + remaining + 's';
  } else if (buffInd) {
    buffInd.style.visibility = 'hidden';
    buffInd.innerHTML = '';
  }

  // Stats
  renderStats();

  // Notification badges on shop tabs
  updateTabBadges();

  // Parse only dynamic emoji elements (buff indicator)
  if (curBuff && buffInd) parseAppleEmoji(buffInd);
}

function updateCooldown(btnId, textId, lastPlayed, cooldown, active) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  if (!btn || !text) return;
  const remaining = cooldown - (Date.now() - lastPlayed);
  if (remaining > 0 && !active) {
    btn.disabled = true;
    const pct = Math.round((1 - remaining / cooldown) * 100);
    text.innerHTML = 'Wacht ' + Math.ceil(remaining / 1000) + 's...<div class="cooldown-bar"><div class="cooldown-bar-fill" style="width:' + pct + '%"></div></div>';
  } else if (!active) {
    btn.disabled = false;
    text.innerHTML = '';
  }
}

function renderStats() {
  const list = document.getElementById('stats-list');
  if (!list) return;
  const totalAnimals = ANIMALS.reduce((s, a) => s + (state.animals[a.id]||0), 0);
  const achCount = Object.keys(state.achievements).filter(k => state.achievements[k]).length;

  const row = (l, v) => '<div class="stat-row"><span class="stat-label">' + l + '</span><span>' + v + '</span></div>';
  const heading = (t) => '<div class="stat-heading">' + t + '</div>';

  let html = heading('Deze evolutie');
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

  // DPS breakdown
  const bd = getDpsBreakdown();
  if (bd.total > 0) {
    html += heading('DPS Uitsplitsing');
    bd.animals.forEach(a => {
      const pct = (a.dps / bd.rawTotal * 100).toFixed(1);
      html += row(a.name, formatDps(a.dps) + '/s (' + pct + '%)');
    });
    if (bd.achPct > 0) html += row('🏆 Prestatiebonus', '+' + bd.achPct.toFixed(0) + '%');
    if (bd.starPct > 0) html += row('⭐ Sterrenbonus', '+' + bd.starPct.toFixed(0) + '%');
    if (bd.buffActive) html += row('🔥 Buff', '×2');
    html += row('<b>Totaal</b>', '<b>' + formatDps(bd.total) + '/s</b>');
  }

  const s = state.stats;
  const totalMgPlayed = s.quizPlayed + s.catcherPlayed + s.mathPlayed + s.buffPlayed + s.sortPlayed + s.memoryPlayed + s.tellenPlayed + s.indringerPlayed + s.groterPlayed + s.voedselPlayed + s.racePlayed + s.puzzelPlayed;
  html += heading('Minigames');
  html += row('Totaal gespeeld', totalMgPlayed + 'x');
  if (s.tellenPlayed) html += row('🔢 Tellen', s.tellenCorrect + '/' + s.tellenPlayed + ' goed');
  if (s.quizPlayed) html += row('🧠 Quiz', s.quizCorrect + '/' + s.quizPlayed + ' goed');
  if (s.catcherPlayed) html += row('🎯 Vanger', s.catcherCaught + ' gevangen (' + s.catcherPlayed + 'x)');
  if (s.indringerPlayed) html += row('🚫 Indringer', 'beste: ' + s.indringerBest + ' (' + s.indringerPlayed + 'x)');
  if (s.mathPlayed) html += row('🔢 Wiskunde', s.mathCorrect + '/' + s.mathPlayed + ' goed');
  if (s.groterPlayed) html += row('⚖️ Groter/Kleiner', s.groterCorrect + ' goed, ' + s.groterWrong + ' fout');
  if (s.buffPlayed) html += row('✨ Buffs', s.buffPlayed + 'x gekozen');
  if (s.voedselPlayed) html += row('🍽️ Wat Eet Ik?', s.voedselCorrect + '/' + (s.voedselCorrect+s.voedselWrong) + ' goed');
  if (s.sortPlayed) html += row('🗂️ Sorteren', s.sortCorrect + ' goed (beste: ' + s.sortBestStreak + ')');
  if (s.racePlayed) html += row('🏇 Paardenrace', s.raceWon + '/' + s.racePlayed + ' gewonnen');
  if (s.puzzelPlayed) html += row('🧩 Puzzel', s.puzzelWon + 'x opgelost (beste: ' + (s.puzzelBestMoves || '-') + ' zetten)');
  if (s.memoryPlayed) html += row('🃏 Memory', s.memoryWon + '/' + s.memoryPlayed + ' perfect');

  if (s.luckyClicked || s.luckyMissed) {
    html += heading('Geluksbeestjes');
    html += row('🐞 Gevangen', s.luckyClicked || 0);
    html += row('🐞 Gemist', s.luckyMissed || 0);
  }

  list.innerHTML = html;
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
  document.querySelectorAll('.mid-tab').forEach((t, i) =>
    t.classList.toggle('active', (tabId === 'games' && i === 0) || (tabId === 'stats' && i === 1))
  );
  document.getElementById('mid-games').classList.toggle('active', tabId === 'games');
  document.getElementById('mid-stats').classList.toggle('active', tabId === 'stats');
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
   SECTIE 11b: GELUKSBEESTJE
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
  const base = LUCKY_BASE_INTERVAL * (1 - speedBonus);
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

  // Double catch: clicked 2 bugs within 10 seconds
  if (luckyRecentCatch > 0) state.stats.luckyDouble++;
  luckyRecentCatch++;
  setTimeout(() => luckyRecentCatch--, 10000);

  // Determine reward
  const roll = Math.random();
  const dps = getTotalDps();

  if (roll < LUCKY_JACKPOT_CHANCE) {
    // Jackpot! 15 min DPS
    const bonus = dps * 900;
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
  } else if (roll < LUCKY_JACKPOT_CHANCE + LUCKY_BUFF_CHANCE * 4) {
    // Buff (20% total)
    const buff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
    if (buff.id === 'jackpot') {
      const bonus = dps * 30;
      state.currentPoints += bonus;
      state.totalEarned += bonus;
      state.allTime.totalEarned += bonus;
      showToast('\uD83D\uDC1E ' + buff.emoji + ' ' + buff.name + '! +' + formatNumber(bonus) + ' punten!');
    } else {
      activeBuff = { type: buff.id, endsAt: Date.now() + BUFF_DURATION, emoji: buff.emoji, name: buff.name, color: buff.color };
      showToast('\uD83D\uDC1E ' + buff.emoji + ' ' + buff.name + ' actief voor 30 seconden!');
    }
  } else {
    // Points: 5 min DPS
    const bonus = dps * 300;
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
}

let lastAchCheck = 0;

function gameLoop() {
  tick();

  const now = Date.now();
  if (now - lastAchCheck > 1000) {
    checkAchievements();
    checkLuckySpawn();
    lastAchCheck = now;
  }
}

/* ================================================================
   SECTIE 13: INITIALISATIE
   ================================================================ */

function init() {
  loadSoundSettings();
  loadGame();
  if (!state.prestige.themeLocked) state.prestige.theme = getHighestUnlockedTheme();
  applyTheme(state.prestige.theme || 'oerwoud');
  buildShop();
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
