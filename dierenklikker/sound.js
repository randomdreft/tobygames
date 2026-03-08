/* ================================================================
   GELUIDSSYSTEEM - Web Audio API synthesized sounds
   ================================================================ */

let audioCtx = null;
let soundEnabled = true;

// Per-categorie volumes (0 tot 1)
const soundVol = {
  klik:   0.3,  // klikken op dier
  koop:   0.3,  // kopen, upgrades, level-up
  lucky:  0.3,  // lieveheersbeestje verschijnt/geklikt
  overig: 0.3,  // prestaties, prestige, hemel, aftellen, minigames
};

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { soundEnabled = false; }
  }
  return audioCtx;
}

function playTone(freq, duration, type, vol, ramp, cat) {
  const cv = soundVol[cat] ?? soundVol.overig;
  if (!soundEnabled || cv === 0) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.value = (vol || 0.15) * cv;
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChord(freqs, duration, type, vol, cat) {
  freqs.forEach(f => playTone(f, duration, type, vol, true, cat));
}

// === Geluidseffecten ===

function sfxClick() {
  const cv = soundVol.klik;
  if (!soundEnabled || cv === 0) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const bufSize = ctx.sampleRate * 0.03;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 10);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.15 * cv;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function sfxBuy() {
  const ctx = getAudioCtx();
  if (!ctx || !soundEnabled || soundVol.koop === 0) return;
  setTimeout(() => playTone(523, 0.08, 'sine', 0.12, true, 'koop'), 0);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.12, true, 'koop'), 60);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.12, true, 'koop'), 120);
}

function sfxCorrect() {
  playTone(660, 0.1, 'sine', 0.12, true, 'overig');
  setTimeout(() => playTone(880, 0.15, 'sine', 0.12, true, 'overig'), 80);
}

function sfxWrong() {
  playTone(200, 0.15, 'sawtooth', 0.08, true, 'overig');
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08, true, 'overig'), 100);
}

function sfxAchievement() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.1, true, 'overig'), i * 100));
}

function sfxLevelUp() {
  playChord([523, 659, 784], 0.3, 'sine', 0.08, 'koop');
}

function sfxGameStart() {
  playTone(440, 0.08, 'square', 0.06, true, 'koop');
  setTimeout(() => playTone(554, 0.08, 'square', 0.06, true, 'koop'), 80);
  setTimeout(() => playTone(660, 0.1, 'square', 0.06, true, 'koop'), 160);
}

function sfxGameEnd() {
  playChord([392, 494, 587], 0.4, 'sine', 0.1, 'koop');
}

function sfxPrestige() {
  const notes = [392, 494, 587, 784, 988];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1, true, 'overig'), i * 120));
}

function sfxLuckyAppear() {
  if (!soundEnabled || soundVol.lucky === 0) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  [1200, 1500, 1800].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, 'sine', 0.06, true, 'lucky'), i * 80);
  });
}

function sfxLuckyClick() {
  if (!soundEnabled || soundVol.lucky === 0) return;
  [800, 1000, 1200, 1600].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'sine', 0.1, true, 'lucky'), i * 50);
  });
}

function sfxHeaven() {
  if (!soundEnabled || soundVol.overig === 0) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [261, 329, 392, 523, 659];
  notes.forEach((f, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.value = 0.06 * soundVol.overig;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    }, i * 200);
  });
}

function sfxCooldownReady() {
  if (!soundEnabled || soundVol.overig === 0) return;
  playTone(1047, 0.12, 'sine', 0.06, true, 'overig');
  setTimeout(() => playTone(1319, 0.18, 'sine', 0.07, true, 'overig'), 100);
}

function sfxMemoryMatch() {
  playTone(600, 0.08, 'sine', 0.1, true, 'overig');
  setTimeout(() => playTone(900, 0.12, 'sine', 0.1, true, 'overig'), 70);
}

function sfxMemoryFail() {
  playTone(300, 0.12, 'triangle', 0.08, true, 'overig');
}

function sfxCountdown() {
  playTone(440, 0.05, 'square', 0.05, true, 'overig');
}

function setSoundCategoryVolume(cat, val) {
  const v = parseInt(val);
  soundVol[cat] = v / 100;
  localStorage.setItem('dierenklikker_vol_' + cat, v);
  const label = document.getElementById('vol-label-' + cat);
  if (label) label.textContent = v > 0 ? v + '%' : 'Uit';
}

function loadSoundSettings() {
  // Migreer oude instelling naar nieuwe categorieën
  const old = localStorage.getItem('dierenklikker_volume');
  Object.keys(soundVol).forEach(cat => {
    const saved = localStorage.getItem('dierenklikker_vol_' + cat);
    if (saved !== null) {
      soundVol[cat] = parseInt(saved) / 100;
    } else if (old !== null) {
      soundVol[cat] = parseInt(old) / 100;
    }
  });
}
