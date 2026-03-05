/* ================================================================
   GELUIDSSYSTEEM - Web Audio API synthesized sounds
   ================================================================ */

let audioCtx = null;
let soundVolume = 0.3; // 0 to 1
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { soundEnabled = false; }
  }
  return audioCtx;
}

function playTone(freq, duration, type, vol, ramp) {
  if (!soundEnabled || soundVolume === 0) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.value = (vol || 0.15) * soundVolume;
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChord(freqs, duration, type, vol) {
  freqs.forEach(f => playTone(f, duration, type, vol, true));
}

// === Sound effects ===

function sfxClick() {
  playTone(800, 0.06, 'square', 0.08, true);
}

function sfxBuy() {
  const ctx = getAudioCtx();
  if (!ctx || !soundEnabled || soundVolume === 0) return;
  setTimeout(() => playTone(523, 0.08, 'sine', 0.12, true), 0);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.12, true), 60);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.12, true), 120);
}

function sfxCorrect() {
  playTone(660, 0.1, 'sine', 0.12, true);
  setTimeout(() => playTone(880, 0.15, 'sine', 0.12, true), 80);
}

function sfxWrong() {
  playTone(200, 0.15, 'sawtooth', 0.08, true);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08, true), 100);
}

function sfxAchievement() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.1, true), i * 100));
}

function sfxLevelUp() {
  playChord([523, 659, 784], 0.3, 'sine', 0.08);
}

function sfxGameStart() {
  playTone(440, 0.08, 'square', 0.06, true);
  setTimeout(() => playTone(554, 0.08, 'square', 0.06, true), 80);
  setTimeout(() => playTone(660, 0.1, 'square', 0.06, true), 160);
}

function sfxGameEnd() {
  playChord([392, 494, 587], 0.4, 'sine', 0.1);
}

function sfxPrestige() {
  const notes = [392, 494, 587, 784, 988];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1, true), i * 120));
}

function sfxMemoryMatch() {
  playTone(600, 0.08, 'sine', 0.1, true);
  setTimeout(() => playTone(900, 0.12, 'sine', 0.1, true), 70);
}

function sfxMemoryFail() {
  playTone(300, 0.12, 'triangle', 0.08, true);
}

function sfxCountdown() {
  playTone(440, 0.05, 'square', 0.05, true);
}

function setSoundVolume(val) {
  const v = parseInt(val);
  soundVolume = v / 100;
  soundEnabled = v > 0;
  localStorage.setItem('dierenklikker_volume', v);
  buildOptions();
  if (soundEnabled) sfxClick(); // preview
}

function loadSoundSettings() {
  const saved = localStorage.getItem('dierenklikker_volume');
  if (saved !== null) {
    const v = parseInt(saved);
    soundVolume = v / 100;
    soundEnabled = v > 0;
  }
}
