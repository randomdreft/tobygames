const Sound = {
  ctx: null,
  enabled: true,

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    if (this[name]) this[name]();
  },

  _tone(freq, freq2, dur, type, vol) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (freq2) o.frequency.linearRampToValueAtTime(freq2, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur);
  },

  build() {
    this._tone(440, 880, 0.12, 'sine', 0.12);
  },

  demolish() {
    this._tone(200, 80, 0.2, 'sawtooth', 0.08);
  },

  cash() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, t);
    o.frequency.setValueAtTime(1000, t + 0.04);
    o.frequency.setValueAtTime(1200, t + 0.08);
    g.gain.setValueAtTime(0.08, t);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.12);
  },

  error() {
    this._tone(200, 150, 0.15, 'square', 0.06);
  },

  ding() {
    this._tone(1500, null, 0.3, 'sine', 0.04);
  },

  star() {
    const c = this.ctx, t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.1, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0, t + i * 0.12 + 0.3);
      o.connect(g).connect(c.destination);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.3);
    });
  },
};
