// Visvijver - geluid via Web Audio (geen audiobestanden)

const MUTE_KEY = 'visvijver_mute';
let ctx = null, master = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* geen opslag */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol = 0.2, ftype = 'lowpass', f0 = 1000, f1 = 0, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + when;
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = ftype;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
}

export const Sound = {
  unlock() { ac(); },
  isMuted() { return muted; },
  setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* geen opslag */ }
    if (master) master.gain.value = muted ? 0 : 0.5;
  },
  werp()    { noise(0.35, 0.12, 'bandpass', 600, 2600); },
  plons(k = 1) { noise(0.35 * k, 0.3, 'lowpass', 1400, 250); tone(260, 0.16, 'sine', 0.2, 0, 90); },
  spetter() { noise(0.14, 0.12, 'highpass', 1800); },
  knabbel() { tone(520, 0.07, 'sine', 0.12, 0, 340); },
  beet()    { tone(660, 0.1, 'square', 0.12); tone(880, 0.1, 'square', 0.12, 0.11); tone(1100, 0.16, 'square', 0.12, 0.22); noise(0.3, 0.25, 'lowpass', 1200, 300); },
  klik(sp = 0.5) { tone(500 + sp * 900, 0.03, 'square', 0.05); },
  knap()    { noise(0.12, 0.4, 'highpass', 1500); tone(900, 0.3, 'sawtooth', 0.2, 0, 80); },
  ontsnapt() { tone(500, 0.18, 'triangle', 0.18, 0, 300); tone(320, 0.3, 'triangle', 0.18, 0.18, 150); },
  vangst()  { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.2, i * 0.09)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.5 : 0.14, 'square', 0.12, i * 0.12)); [262, 330, 392].forEach(f => tone(f, 0.6, 'triangle', 0.1, 0.72)); },
  monster() { tone(110, 0.5, 'sawtooth', 0.2, 0, 60); tone(80, 0.5, 'sawtooth', 0.15, 0.1, 50); },
  munt()    { tone(1318, 0.07, 'square', 0.1); tone(1760, 0.22, 'square', 0.1, 0.07); },
  koop()    { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.18, i * 0.07)); },
  fout()    { tone(200, 0.18, 'sawtooth', 0.12, 0, 140); },
  tik()     { tone(700, 0.04, 'sine', 0.08); },
  regen(k = 1) { noise(0.6, 0.03 * k, 'highpass', 2600); },
  kwaak(hard) { const v = hard ? 0.09 : 0.04; tone(430, 0.09, 'sawtooth', v, 0, 320); tone(410, 0.13, 'sawtooth', v, 0.13, 290); if (hard) tone(400, 0.13, 'sawtooth', v, 0.3, 280); },
  stap()    { noise(0.06, 0.05, 'lowpass', 500); },
  vogel()   { const b = 2200 + Math.random() * 1200; tone(b, 0.08, 'sine', 0.05, 0, b * 1.3); tone(b * 1.2, 0.08, 'sine', 0.05, 0.12, b * 0.9); tone(b, 0.1, 'sine', 0.05, 0.24, b * 1.4); },
  krekel()  { for (let i = 0; i < 4; i++) tone(4200, 0.03, 'square', 0.015, i * 0.06); },
};
