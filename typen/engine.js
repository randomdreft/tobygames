/* ═══════════════════════════════════════════════════════════════
   GAME ENGINE - TobyTypen
   State, save/load, XP, achievements, UI, keyboard, map,
   lesson flow, typing, falling words, boss fights, results
   ═══════════════════════════════════════════════════════════════ */

// ═══ GAME STATE ═══
let state = {
    xp: 0, level: 1,
    lessonStars: {},
    achievements: [],
    dailyDates: [],
    currentStreak: 0,
    stats: {
        totalLetters: 0, totalWords: 0,
        accuracy: 100, fastestWPM: 0,
        bestCombo: 0, perfectLessons: 0
    }
};

// Session vars (not saved)
let currentLesson = null;
let currentRound = 0;
let roundWords = [];
let wordIndex = 0;
let charIndex = 0;
let combo = 0;
let sessionCorrect = 0;
let sessionErrors = 0;
let sessionStartTime = 0;
let lessonXpGained = 0;
let bossHP = 0;
let bossMaxHP = 0;
let bossTimer = 0;
let bossInterval = null;
let fallingWords = [];
let fallingInterval = null;
let fallingAnimFrame = null;
let activefallingWord = null;
let fallingTypedChars = 0;
let soundEnabled = true;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;
const CORRECT_TO_RESET = 2;
let correctSinceLastError = 0;

// ═══ SAVE / LOAD ═══
const SAVE_KEY = 'tobygames_typen_save';

function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            state = {
                xp: saved.xp || 0,
                level: saved.level || 1,
                lessonStars: saved.lessonStars || {},
                achievements: saved.achievements || [],
                dailyDates: saved.dailyDates || [],
                currentStreak: saved.currentStreak || 0,
                stats: {
                    totalLetters: saved.stats?.totalLetters || 0,
                    totalWords: saved.stats?.totalWords || 0,
                    accuracy: saved.stats?.accuracy || 100,
                    fastestWPM: saved.stats?.fastestWPM || 0,
                    bestCombo: saved.stats?.bestCombo || 0,
                    perfectLessons: saved.stats?.perfectLessons || 0
                }
            };
        }
    } catch(e) {}
}

// ═══ DAILY STREAK ═══
function getTodayStr() { return new Date().toISOString().slice(0,10); }

function updateDailyStreak() {
    const today = getTodayStr();
    if (!state.dailyDates.includes(today)) {
        state.dailyDates.push(today);
        let streak = 1;
        const sorted = [...state.dailyDates].sort().reverse();
        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i-1]);
            const curr = new Date(sorted[i]);
            const diff = (prev - curr) / (1000*60*60*24);
            if (diff <= 1.5) streak++; else break;
        }
        state.currentStreak = streak;
        if (streak === 7) showToast("🔥 7 dagen streak! Weekstrijder!", "streak");
        if (streak === 30) showToast("🔥🔥 30 dagen streak! Maandkampioen!", "streak");
        saveGame();
    }
}

// ═══ XP & LEVELS ═══
function addXP(amount) {
    state.xp += amount;
    lessonXpGained += amount;
    const oldLevel = state.level;
    while (state.level < LEVEL_THRESHOLDS.length - 1 && state.xp >= LEVEL_THRESHOLDS[state.level]) {
        state.level++;
    }
    if (state.level > oldLevel) {
        showLevelUp(state.level);
        sndLevelUp();
    }
    updateXpBars();
}

function xpForCurrentLevel() {
    const prev = LEVEL_THRESHOLDS[state.level - 1] || 0;
    const next = LEVEL_THRESHOLDS[state.level] || prev + 1000;
    return { current: state.xp - prev, needed: next - prev };
}

function updateXpBars() {
    const {current, needed} = xpForCurrentLevel();
    const pct = Math.min(100, (current/needed)*100);
    ['mapXpFill','lessonXpFill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = pct + '%';
    });
    ['mapXpText','lessonXpText'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${current}/${needed} XP`;
    });
    ['mapLevel','lessonLevel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `⭐ Level ${state.level}`;
    });
    ['mapStreak','lessonStreakStat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `🔥 ${state.currentStreak}`;
    });
}

// ═══ ACHIEVEMENTS ═══
function checkAchievements() {
    ACHIEVEMENT_DEFS.forEach(def => {
        if (!state.achievements.includes(def.id) && def.check(state)) {
            state.achievements.push(def.id);
            showToast(`🏅 ${def.name}`, 'achievement');
            sndAchievement();
        }
    });
    saveGame();
}

function renderAchievements() {
    const grid = document.getElementById('achGrid');
    grid.innerHTML = '';
    ACHIEVEMENT_DEFS.forEach(def => {
        const earned = state.achievements.includes(def.id);
        const card = document.createElement('div');
        card.className = 'ach-card' + (earned ? ' earned' : ' locked');
        card.innerHTML = `<div class="ach-icon">${def.icon}</div><div class="ach-info"><h4>${def.name}</h4><p>${def.desc}</p></div>`;
        grid.appendChild(card);
    });
}

// ═══ UI HELPERS ═══
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showToast(msg, cls='') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast' + (cls ? ' '+cls : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function showLevelUp(lvl) {
    const o = document.getElementById('levelupOverlay');
    document.getElementById('levelupNum').textContent = lvl;
    o.classList.add('active');
    spawnConfetti();
    setTimeout(() => o.classList.remove('active'), 3000);
}

function spawnConfetti(count=40) {
    const colors = ['#e84393','#00b894','#0984e3','#fdcb6e','#6c5ce7','#e17055','#d63031','#00cec9'];
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random()*100 + 'vw';
        el.style.top = '-10px';
        el.style.background = colors[Math.floor(Math.random()*colors.length)];
        el.style.animationDuration = (1.5 + Math.random()*2) + 's';
        el.style.animationDelay = Math.random()*0.5 + 's';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.width = (6 + Math.random()*8) + 'px';
        el.style.height = (6 + Math.random()*8) + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

function updateComboDisplay() {
    const el = document.getElementById('comboDisplay');
    if (combo < 3) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    let mult = 'x1';
    el.className = 'combo-display';
    if (combo >= 50) { mult = 'x5'; el.classList.add('x5'); }
    else if (combo >= 25) { mult = 'x3'; el.classList.add('x3'); }
    else if (combo >= 10) { mult = 'x2'; el.classList.add('x2'); }
    el.textContent = `${combo} ${mult}`;
}

function getComboMultiplier() {
    if (combo >= 50) return 5;
    if (combo >= 25) return 3;
    if (combo >= 10) return 2;
    return 1;
}

// ═══ KEYBOARD RENDERING ═══
function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const allRows = [...KB_ROWS];

    allRows.forEach((row, ri) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'kb-row';
        if (ri === 3) {
            const sh = document.createElement('div');
            sh.className = 'kb-key shift-key finger-pinky';
            sh.textContent = 'Shift';
            sh.dataset.key = 'shift';
            rowEl.appendChild(sh);
        }
        row.forEach(({k,f}) => {
            const key = document.createElement('div');
            key.className = `kb-key finger-${f}`;
            key.textContent = k;
            key.dataset.key = k.toLowerCase();
            if (currentLesson) {
                const learned = currentLesson.allLetters.map(l=>l.toLowerCase());
                if (!learned.includes(k.toLowerCase()) && !['shift'].includes(k.toLowerCase())) {
                    key.classList.add('inactive');
                }
            }
            rowEl.appendChild(key);
        });
        if (ri === 3) {
            const sh2 = document.createElement('div');
            sh2.className = 'kb-key shift-key finger-pinky';
            sh2.textContent = 'Shift';
            sh2.dataset.key = 'shift';
            rowEl.appendChild(sh2);
        }
        kb.appendChild(rowEl);
    });
    const spaceRow = document.createElement('div');
    spaceRow.className = 'kb-row';
    const space = document.createElement('div');
    space.className = 'kb-key space finger-thumb';
    space.textContent = 'spatie';
    space.dataset.key = ' ';
    spaceRow.appendChild(space);
    kb.appendChild(spaceRow);
}

function highlightKey(char) {
    document.querySelectorAll('.kb-key').forEach(k => k.classList.remove('highlight'));
    if (!char) return;
    const lower = char.toLowerCase();
    const needsShift = char !== lower || '!@#$%^&*()_+{}|:"<>?~'.includes(char);
    document.querySelectorAll('.kb-key').forEach(k => {
        if (k.dataset.key === lower || k.dataset.key === char) k.classList.add('highlight');
        if (needsShift && k.dataset.key === 'shift') k.classList.add('highlight');
    });
    if (char === ' ') {
        document.querySelectorAll('.kb-key').forEach(k => {
            if (k.dataset.key === ' ') k.classList.add('highlight');
        });
    }
}

function flashKey(char, correct) {
    const lower = char.toLowerCase();
    document.querySelectorAll('.kb-key').forEach(k => {
        if (k.dataset.key === lower) {
            k.classList.add('pressed');
            setTimeout(() => k.classList.remove('pressed'), 150);
        }
    });
}

// ═══ LEVEL MAP ═══
function renderMap() {
    updateXpBars();
    const container = document.getElementById('mapContainer');
    container.innerHTML = '';

    let totalEarned = 0;
    Object.values(state.lessonStars).forEach(s => totalEarned += s);
    document.getElementById('totalStars').textContent = `⭐ ${totalEarned} / 84`;

    let currentNum = 1;
    for (let i = 1; i <= 28; i++) {
        if (!state.lessonStars[i] || state.lessonStars[i] < 1) { currentNum = i; break; }
        if (i === 28) currentNum = 28;
    }

    const phases = [
        {name:"Fase 1: Thuisrij", lessons:[1,2,3,4,5], color:"#00b894"},
        {name:"Fase 2: Klinkers", lessons:[6,7,8,9], color:"#0984e3"},
        {name:"Fase 3: Bovenrij", lessons:[10,11,12,13,14], color:"#6c5ce7"},
        {name:"Fase 4: Onderrij", lessons:[15,16,17,18,19,20,21], color:"#e17055"},
        {name:"Fase 5: Hoofdletters", lessons:[22,23,24], color:"#e84393"},
        {name:"Fase 6: Snelheid", lessons:[25,26,27,28], color:"#fdcb6e"},
    ];

    phases.forEach(phase => {
        const group = document.createElement('div');
        group.className = 'phase-group';
        const title = document.createElement('div');
        title.className = 'phase-title';
        title.textContent = phase.name;
        title.style.color = phase.color;
        group.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'level-grid';

        phase.lessons.forEach(num => {
            const lesson = LESSONS[num-1];
            const stars = state.lessonStars[num] || 0;
            const node = document.createElement('div');
            node.className = 'level-node';
            if (stars > 0) node.classList.add('completed');
            else if (num !== currentNum) node.classList.add('not-started');
            if (num === currentNum) node.classList.add('current');
            if (lesson.boss) node.classList.add('boss');
            if (lesson.bigBoss) node.classList.add('big-boss');
            node.style.borderColor = phase.color;
            if (stars > 0) node.style.background = `rgba(${hexToRgb(phase.color)},0.25)`;

            const numEl = document.createElement('div');
            numEl.className = 'level-num';
            numEl.textContent = num;
            node.appendChild(numEl);

            const starsEl = document.createElement('div');
            starsEl.className = 'level-stars';
            if (stars > 0) {
                for (let i = 1; i <= 3; i++) {
                    const s = document.createElement('span');
                    s.className = 'star' + (i <= stars ? ' earned' : '');
                    s.textContent = '⭐';
                    starsEl.appendChild(s);
                }
            } else {
                starsEl.innerHTML = '<span style="opacity:0.3;font-size:0.65rem;">· · ·</span>';
            }
            node.appendChild(starsEl);

            if (lesson.bigBoss) {
                const badge = document.createElement('div');
                badge.className = 'level-badge';
                badge.textContent = '💀';
                node.appendChild(badge);
            }

            node.onclick = () => startLesson(num);
            grid.appendChild(node);
        });

        group.appendChild(grid);
        container.appendChild(group);
    });

    // Streak panel
    const streakPanel = document.createElement('div');
    streakPanel.className = 'streak-panel';
    streakPanel.innerHTML = `<h3>🔥 Dagelijkse Streak: ${state.currentStreak} dagen</h3>`;
    const days = document.createElement('div');
    days.className = 'streak-days';
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0,10);
        const dayEl = document.createElement('div');
        dayEl.className = 'streak-day';
        if (state.dailyDates.includes(ds)) dayEl.classList.add('active');
        if (i === 0) dayEl.classList.add('today');
        dayEl.textContent = ['Zo','Ma','Di','Wo','Do','Vr','Za'][d.getDay()];
        days.appendChild(dayEl);
    }
    streakPanel.appendChild(days);
    container.appendChild(streakPanel);

    // Achievements button
    const achBtn = document.createElement('button');
    achBtn.className = 'achievements-btn';
    achBtn.textContent = `🏅 Prestaties (${state.achievements.length}/${ACHIEVEMENT_DEFS.length})`;
    achBtn.onclick = () => { renderAchievements(); document.getElementById('achievementOverlay').classList.add('active'); };
    container.appendChild(achBtn);
}

function hexToRgb(hex) {
    hex = hex.replace('#','');
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)].join(',');
}

// ═══ LESSON FLOW ═══
function startLesson(num) {
    currentLesson = LESSONS[num-1];
    currentRound = 0;
    combo = 0;
    sessionCorrect = 0;
    sessionErrors = 0;
    lessonXpGained = 0;
    sessionStartTime = Date.now();

    showScreen('lesson-screen');
    document.getElementById('lessonTitle').textContent = currentLesson.title;
    buildKeyboard();
    updateXpBars();
    showIntro();
}

function showIntro() {
    const o = document.getElementById('introOverlay');
    document.getElementById('introTitle').textContent = currentLesson.title;
    const nl = currentLesson.newLetters;
    document.getElementById('introLetters').textContent = nl.length > 0 ? nl.join('  ') : '🏁';
    document.getElementById('introHint').textContent = currentLesson.fingerHint;
    o.classList.add('active');
}

function closeIntro() {
    document.getElementById('introOverlay').classList.remove('active');
    stopFalling(); stopBoss();
    showScreen('map-screen');
    renderMap();
}

document.getElementById('introStartBtn').onclick = () => {
    document.getElementById('introOverlay').classList.remove('active');
    startRound(1);
};

document.getElementById('introCloseBtn').onclick = closeIntro;

document.getElementById('introOverlay').onclick = (e) => {
    if (e.target === document.getElementById('introOverlay')) closeIntro();
};

function startRound(round) {
    currentRound = round;
    wordIndex = 0;
    charIndex = 0;
    combo = 0;
    consecutiveErrors = 0;
    correctSinceLastError = 0;
    updateComboDisplay();

    stopFalling();
    stopBoss();

    const area = document.getElementById('typingArea');

    if (round === 1) {
        document.getElementById('roundInfo').textContent = 'Ronde 1 — Kennismaking';
        roundWords = [...currentLesson.words1];
        renderStaticTyping(area);
    } else if (round === 2) {
        document.getElementById('roundInfo').textContent = 'Ronde 2 — Woordjes';
        roundWords = [...currentLesson.words2];
        renderWordQueueTyping(area);
    } else if (round === 3) {
        document.getElementById('roundInfo').textContent = 'Ronde 3 — Vallende Woorden!';
        roundWords = [...currentLesson.words3];
        renderFallingWords(area);
    } else if (round === 4) {
        document.getElementById('roundInfo').textContent = currentLesson.bigBoss ? '💀 EINDBAAS!' : '👾 Mini-Boss!';
        startBossFight(area);
    }

    if (round <= 2 && roundWords.length > 0) {
        highlightKey(roundWords[0][0]);
    }
    updateProgress();
}

// ── Round 1 & 2: Static word typing ──
function renderStaticTyping(area) {
    area.innerHTML = '<div class="word-display" id="wordDisplay"></div>';
    renderCurrentWord();
}

function renderWordQueueTyping(area) {
    area.innerHTML = '<div class="word-display" id="wordDisplay"></div><div class="word-queue" id="wordQueue"></div>';
    renderWordQueue();
    renderCurrentWord();
}

function renderCurrentWord() {
    const display = document.getElementById('wordDisplay');
    if (!display || wordIndex >= roundWords.length) return;
    const word = roundWords[wordIndex];
    display.innerHTML = '';
    // Scale font for long words/sentences
    if (word.length > 30) { display.style.fontSize = '1.2rem'; display.style.letterSpacing = '0.1rem'; }
    else if (word.length > 15) { display.style.fontSize = '1.8rem'; display.style.letterSpacing = '0.15rem'; }
    else { display.style.fontSize = ''; display.style.letterSpacing = ''; }
    for (let i = 0; i < word.length; i++) {
        const span = document.createElement('span');
        span.className = 'char';
        if (i < charIndex) span.classList.add('correct');
        else if (i === charIndex) span.classList.add('current');
        else span.classList.add('pending');
        span.textContent = word[i] === ' ' ? '\u00A0' : word[i];
        if (word[i] === ' ') span.style.minWidth = '0.6em';
        display.appendChild(span);
    }
    if (charIndex < word.length) highlightKey(word[charIndex]);
}

function renderWordQueue() {
    const queue = document.getElementById('wordQueue');
    if (!queue) return;
    queue.innerHTML = '';
    roundWords.forEach((w, i) => {
        const el = document.createElement('span');
        el.className = 'queue-word';
        if (i < wordIndex) el.classList.add('done');
        if (i === wordIndex) el.classList.add('active');
        el.textContent = w;
        queue.appendChild(el);
    });
}

// ── Round 3: Falling words ──
function renderFallingWords(area) {
    area.innerHTML = '<div class="falling-zone" id="fallingZone"></div><div class="word-display" id="wordDisplay" style="min-height:2rem;font-size:1.8rem;"></div>';
    fallingWords = [];
    fallingTypedChars = 0;
    activefallingWord = null;
    wordIndex = 0;

    const zone = document.getElementById('fallingZone');
    let spawnIndex = 0;

    const avgLen = roundWords.reduce((s,w) => s+w.length, 0) / roundWords.length;
    const spawnDelay = Math.max(2200, avgLen * 200);
    fallingInterval = setInterval(() => {
        if (spawnIndex >= roundWords.length) {
            clearInterval(fallingInterval);
            fallingInterval = null;
            return;
        }
        spawnFallingWord(zone, roundWords[spawnIndex], spawnIndex);
        spawnIndex++;
    }, spawnDelay);

    spawnFallingWord(zone, roundWords[0], 0);
    spawnIndex = 1;

    fallingAnimFrame = requestAnimationFrame(updateFalling);
}

function spawnFallingWord(zone, text, idx) {
    const el = document.createElement('div');
    el.className = 'falling-word';
    el.textContent = text;
    el.style.left = (10 + Math.random() * 60) + '%';
    el.style.top = '-40px';
    zone.appendChild(el);
    const baseSpeed = 0.35 + (currentLesson.num / 28) * 0.15;
    const lengthFactor = Math.max(0.4, 1 - (text.length - 5) * 0.04);
    fallingWords.push({
        el, text, idx, y: -40, typed: 0, done: false, missed: false,
        speed: baseSpeed * lengthFactor
    });
}

function updateFalling() {
    const zone = document.getElementById('fallingZone');
    if (!zone) return;
    const zoneH = zone.offsetHeight;

    fallingWords.forEach(fw => {
        if (fw.done || fw.missed) return;
        fw.y += fw.speed;
        fw.el.style.top = fw.y + 'px';
        if (fw.y > zoneH - 30) {
            fw.missed = true;
            fw.el.classList.add('missed');
            sessionErrors++;
            combo = 0;
            updateComboDisplay();
            if (activefallingWord === fw) {
                activefallingWord = null;
                fallingTypedChars = 0;
            }
        }
    });

    if (fallingInterval === null && fallingWords.every(fw => fw.done || fw.missed)) {
        setTimeout(() => advanceRound(), 500);
        return;
    }

    fallingAnimFrame = requestAnimationFrame(updateFalling);
}

function stopFalling() {
    if (fallingInterval) { clearInterval(fallingInterval); fallingInterval = null; }
    if (fallingAnimFrame) { cancelAnimationFrame(fallingAnimFrame); fallingAnimFrame = null; }
    fallingWords = [];
}

// ── Round 4: Boss Fight ──
function startBossFight(area) {
    const boss = currentLesson.boss;
    bossMaxHP = boss.hp;
    bossHP = boss.hp;
    // Scale timer: ~15s per HP for early lessons, ~12s for later, max 5 minutes
    const secsPerHP = currentLesson.num <= 9 ? 15 : currentLesson.num <= 21 ? 13 : 12;
    bossTimer = Math.min(300, boss.hp * secsPerHP);

    const bossWords = generateBossWords();
    roundWords = bossWords;
    wordIndex = 0;
    charIndex = 0;

    area.innerHTML = `
        <div class="boss-area">
            <div class="boss-timer" id="bossTimerEl">⏱️ ${bossTimer}s</div>
            <div class="boss-monster${currentLesson.bigBoss ? ' big' : ''}" id="bossMonster">${boss.emoji}</div>
            <div style="color:white;font-size:1.1rem;font-weight:700;margin:0.3rem 0">${boss.name}</div>
            <div class="boss-hp-bar">
                <div class="boss-hp-fill" id="bossHpFill" style="width:100%"></div>
                <div class="boss-hp-text" id="bossHpText">${bossHP}/${bossMaxHP}</div>
            </div>
        </div>
        <div class="word-display" id="wordDisplay" style="margin-top:1rem;"></div>
    `;

    sndBossDrum();
    renderCurrentWord();

    bossInterval = setInterval(() => {
        bossTimer--;
        const el = document.getElementById('bossTimerEl');
        if (el) el.textContent = `⏱️ ${bossTimer}s`;
        if (bossTimer <= 0) {
            stopBoss();
            finishLesson(true); // timer ran out, boss not defeated
        }
    }, 1000);
}

function generateBossWords() {
    const pool = [...currentLesson.words2, ...currentLesson.words3];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(20, shuffled.length));
}

function hitBoss() {
    bossHP--;
    const fill = document.getElementById('bossHpFill');
    const text = document.getElementById('bossHpText');
    if (fill) fill.style.width = (bossHP/bossMaxHP*100) + '%';
    if (text) text.textContent = `${bossHP}/${bossMaxHP}`;

    const monster = document.getElementById('bossMonster');
    if (monster) {
        monster.classList.add('shake');
        setTimeout(() => monster.classList.remove('shake'), 150);
        const scale = 0.5 + (bossHP/bossMaxHP) * 0.5;
        monster.style.transform = `scale(${scale})`;
    }
    sndBossHit();

    if (bossHP <= 0) {
        stopBoss();
        sndBossDefeat();
        showToast(`💀 ${currentLesson.boss.name} verslagen!`);
        addXP(currentLesson.bigBoss ? 1000 : 500);
        setTimeout(() => finishLesson(), 1000);
    }
}

function stopBoss() {
    if (bossInterval) { clearInterval(bossInterval); bossInterval = null; }
}

// ═══ TYPING INPUT HANDLER ═══
function handleKeyPress(e) {
    if (!document.getElementById('lesson-screen').classList.contains('active')) return;
    if (document.getElementById('introOverlay').classList.contains('active')) return;
    if (currentRound === 0) return;

    // Ignore non-character keys
    if (['Shift','Control','Alt','Meta','Tab','Escape','CapsLock',
         'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
         'Backspace','Delete','Enter','Home','End','PageUp','PageDown',
         'Insert','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
         'NumLock','ScrollLock','Pause','ContextMenu','PrintScreen'].includes(e.key)) return;
    if (e.key.length > 1 && !e.key.startsWith('Dead')) return;

    e.preventDefault();

    if (currentRound === 3) {
        handleFallingInput(e.key);
        return;
    }

    // Rounds 1, 2, 4
    if (wordIndex >= roundWords.length) return;
    const word = roundWords[wordIndex];
    const expected = word[charIndex];

    if (e.key === expected) {
        charIndex++;
        combo++;
        sessionCorrect++;
        state.stats.totalLetters++;
        onCorrectKey();
        if (combo > state.stats.bestCombo) state.stats.bestCombo = combo;
        updateComboDisplay();

        const mult = getComboMultiplier();
        addXP(10 * mult);

        sndCorrect();
        flashKey(expected, true);

        if ([10,25,50,100].includes(combo)) {
            sndStreakMilestone();
            showToast(`🔥 ${combo} combo! x${getComboMultiplier()}`);
        }

        if (charIndex >= word.length) {
            state.stats.totalWords++;
            sndWordComplete();
            wordIndex++;
            charIndex = 0;

            if (currentRound === 4) {
                hitBoss();
                if (bossHP <= 0) return;
                if (wordIndex >= roundWords.length) {
                    roundWords = generateBossWords();
                    wordIndex = 0;
                }
            }

            if (wordIndex >= roundWords.length && currentRound !== 4) {
                const d = document.getElementById('wordDisplay');
                if (d) d.innerHTML = '<span style="color:var(--green);font-size:1.5rem;">✓ Ronde klaar!</span>';
                setTimeout(() => advanceRound(), 600);
                return;
            }
        }
        renderCurrentWord();
        if (currentRound === 2) renderWordQueue();
    } else {
        sessionErrors++;
        combo = 0;
        updateComboDisplay();
        sndWrong();
        flashKey(e.key, false);
        if (checkErrorLimit()) return;
        const display = document.getElementById('wordDisplay');
        if (display && display.children[charIndex]) {
            display.children[charIndex].classList.add('wrong');
            setTimeout(() => {
                if (display.children[charIndex]) display.children[charIndex].classList.remove('wrong');
            }, 300);
        }
    }

    updateProgress();
}

function handleFallingInput(key) {
    if (!activefallingWord) {
        for (const fw of fallingWords) {
            if (!fw.done && !fw.missed && fw.text[0].toLowerCase() === key.toLowerCase()) {
                activefallingWord = fw;
                fallingTypedChars = 0;
                fw.el.classList.add('active');
                break;
            }
        }
        if (!activefallingWord) {
            sessionErrors++;
            combo = 0;
            updateComboDisplay();
            sndWrong();
            checkErrorLimit();
            return;
        }
    }

    const expected = activefallingWord.text[fallingTypedChars];
    if (key === expected || key.toLowerCase() === expected.toLowerCase()) {
        fallingTypedChars++;
        combo++;
        sessionCorrect++;
        state.stats.totalLetters++;
        onCorrectKey();
        if (combo > state.stats.bestCombo) state.stats.bestCombo = combo;
        updateComboDisplay();
        addXP(10 * getComboMultiplier());
        sndCorrect();

        if ([10,25,50,100].includes(combo)) {
            sndStreakMilestone();
            showToast(`🔥 ${combo} combo! x${getComboMultiplier()}`);
        }

        activefallingWord.el.innerHTML =
            `<span class="typed-part">${activefallingWord.text.slice(0,fallingTypedChars)}</span>${activefallingWord.text.slice(fallingTypedChars)}`;

        highlightKey(activefallingWord.text[fallingTypedChars] || '');

        if (fallingTypedChars >= activefallingWord.text.length) {
            activefallingWord.done = true;
            activefallingWord.el.classList.add('hit');
            state.stats.totalWords++;
            sndWordComplete();
            wordIndex++;
            activefallingWord = null;
            fallingTypedChars = 0;
        }
    } else {
        sessionErrors++;
        combo = 0;
        updateComboDisplay();
        sndWrong();
        if (checkErrorLimit()) return;
    }

    const display = document.getElementById('wordDisplay');
    if (display && activefallingWord) {
        display.innerHTML = '';
        const t = activefallingWord.text;
        for (let i = 0; i < t.length; i++) {
            const s = document.createElement('span');
            s.className = 'char';
            if (i < fallingTypedChars) s.classList.add('correct');
            else if (i === fallingTypedChars) s.classList.add('current');
            else s.classList.add('pending');
            s.textContent = t[i] === ' ' ? '\u00A0' : t[i];
            if (t[i] === ' ') s.style.minWidth = '0.6em';
            display.appendChild(s);
        }
    } else if (display && !activefallingWord) {
        display.innerHTML = '<span style="color:rgba(255,255,255,0.3)">Typ het volgende woord...</span>';
    }

    updateProgress();
}

function checkErrorLimit() {
    consecutiveErrors++;
    correctSinceLastError = 0;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        stopFalling();
        stopBoss();
        showToast("❌ Te veel fouten achter elkaar!", "");
        setTimeout(() => {
            finishLesson(false, true);
        }, 1000);
        return true;
    }
    return false;
}

function onCorrectKey() {
    correctSinceLastError++;
    if (correctSinceLastError >= CORRECT_TO_RESET) {
        consecutiveErrors = 0;
    }
}

function advanceRound() {
    if (currentRound < 4) {
        startRound(currentRound + 1);
    } else {
        finishLesson();
    }
}

function updateProgress() {
    const total = roundWords.length;
    const done = currentRound === 3 ? fallingWords.filter(f => f.done).length : wordIndex;
    const pct = total > 0 ? (done/total*100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = `Woord ${done}/${total}`;
}

// ═══ LESSON FINISH ═══
function finishLesson(bossTimedOut = false, tooManyErrors = false) {
    stopFalling();
    stopBoss();

    const elapsed = (Date.now() - sessionStartTime) / 1000;
    const totalChars = sessionCorrect + sessionErrors;
    const accuracy = totalChars > 0 ? Math.round((sessionCorrect / totalChars) * 100) : 100;
    const wpm = elapsed > 0 ? Math.round((sessionCorrect / 5) / (elapsed / 60)) : 0;

    if (wpm > state.stats.fastestWPM) state.stats.fastestWPM = wpm;
    state.stats.accuracy = Math.round((state.stats.accuracy + accuracy) / 2);
    if (sessionErrors === 0 && sessionCorrect > 10) state.stats.perfectLessons++;

    let stars;
    if (tooManyErrors) {
        stars = 0;
    } else if (bossTimedOut && bossHP > 0) {
        stars = 0;
    } else {
        stars = 1;
        if (accuracy >= 90) stars = 2;
        if (accuracy >= 95 && wpm >= 15 + currentLesson.num) stars = 3;
    }

    const prevStars = state.lessonStars[currentLesson.num] || 0;
    if (stars > prevStars) state.lessonStars[currentLesson.num] = stars;

    if (!bossTimedOut && !tooManyErrors) addXP(500);
    updateDailyStreak();
    checkAchievements();
    saveGame();

    showResults(stars, accuracy, wpm, elapsed, bossTimedOut, tooManyErrors);
}

function showResults(stars, accuracy, wpm, elapsed, bossTimedOut = false, tooManyErrors = false) {
    showScreen('results-screen');

    let title;
    if (tooManyErrors) {
        title = `❌ Te veel fouten! Probeer het opnieuw.`;
    } else if (bossTimedOut && bossHP > 0) {
        title = `⏱️ Tijd op! ${currentLesson.boss.name} heeft gewonnen...`;
    } else if (currentLesson.bigBoss) {
        title = `💀 ${currentLesson.boss.name} Verslagen!`;
    } else {
        title = `${currentLesson.title} Voltooid!`;
    }
    document.getElementById('resultsTitle').textContent = title;

    const starsEl = document.getElementById('resultsStars');
    starsEl.innerHTML = '';
    if (stars === 0) {
        starsEl.textContent = '😢 Geen sterren';
        starsEl.style.fontSize = '1.5rem';
    } else {
        starsEl.style.fontSize = '';
        for (let i = 1; i <= 3; i++) {
            const delay = i * 0.3;
            setTimeout(() => {
                starsEl.textContent += i <= stars ? '⭐' : '☆';
                if (i <= stars) sndStar();
            }, delay * 1000);
        }
    }

    document.getElementById('resultsStats').innerHTML = `
        ✅ Correct: ${sessionCorrect} letters<br>
        ❌ Fouten: ${sessionErrors}<br>
        🎯 Nauwkeurigheid: ${accuracy}%<br>
        ⚡ Snelheid: ${wpm} WPM<br>
        ⏱️ Tijd: ${Math.round(elapsed)}s<br>
        🔥 Beste combo: ${state.stats.bestCombo}
    `;

    document.getElementById('resultsXp').textContent = `+${lessonXpGained} XP verdiend!`;

    if (stars >= 2) spawnConfetti(30);
    if (stars >= 3) { setTimeout(()=>spawnConfetti(50), 500); }
    sndLessonComplete();

    document.getElementById('retryBtn').onclick = () => startLesson(currentLesson.num);
    document.getElementById('nextBtn').onclick = () => {
        if (currentLesson.num < 28) startLesson(currentLesson.num + 1);
        else { showScreen('map-screen'); renderMap(); }
    };
    document.getElementById('mapBtn').onclick = () => { showScreen('map-screen'); renderMap(); };
}

// ═══ EVENT LISTENERS ═══
document.addEventListener('keydown', handleKeyPress);

document.getElementById('lessonBackBtn').onclick = () => {
    stopFalling();
    stopBoss();
    showScreen('map-screen');
    renderMap();
};

document.addEventListener('keydown', e => {
    if (e.key === ' ' && document.getElementById('lesson-screen').classList.contains('active')) {
        e.preventDefault();
    }
});

// Autosave
setInterval(saveGame, 30000);
window.addEventListener('beforeunload', saveGame);

// ═══ INIT ═══
loadGame();
renderMap();
