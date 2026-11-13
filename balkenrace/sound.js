// balkenrace/sound.js - Web Audio API geluidseffecten (geen audiobestanden)

class BRSound {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.initialized = false;
        this.muted = false;
        try { this.muted = localStorage.getItem('balkenrace_muted') === '1'; } catch (e) { /* stil */ }
    }

    init() {
        if (this.initialized) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.3;
            this.master.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) { /* stil */ }
    }

    setMuted(m) {
        this.muted = m;
        try { localStorage.setItem('balkenrace_muted', m ? '1' : '0'); } catch (e) { /* stil */ }
        if (this.initialized) this.master.gain.value = m ? 0 : 0.3;
    }

    // Toon met optionele glijdende frequentie
    tone(type, f1, dur, vol, delay, f2) {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime + (delay || 0);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    // Ruis door een filter (klappen, stof, publiek)
    noise(dur, vol, freq, delay, filterType, swell) {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime + (delay || 0);
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = filterType || 'lowpass';
        f.frequency.value = freq || 1000;
        const g = this.ctx.createGain();
        if (swell) {
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
            g.gain.linearRampToValueAtTime(0.001, t + dur);
        } else {
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        }
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start(t);
    }

    jump() { this.tone('square', 300, 0.14, 0.12, 0, 620); }
    jump2() { this.tone('square', 480, 0.16, 0.12, 0, 980); this.tone('sine', 960, 0.12, 0.08, 0.05, 1400); }
    land() { this.noise(0.08, 0.12, 500); }

    coin(streak) {
        const f = 880 * Math.pow(1.06, Math.min(streak || 0, 12));
        this.tone('square', f, 0.07, 0.09);
        this.tone('square', f * 1.5, 0.14, 0.09, 0.06);
    }

    stumble() {
        this.noise(0.3, 0.5, 900);
        this.tone('sawtooth', 220, 0.35, 0.2, 0, 60);
        this.tone('triangle', 140, 0.2, 0.25, 0.02, 50);
    }

    clang() {
        this.tone('square', 520, 0.25, 0.1, 0, 500);
        this.tone('square', 783, 0.3, 0.07, 0, 760);
        this.noise(0.1, 0.25, 3000, 0, 'highpass');
    }

    power() {
        [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, 0.14, 0.2, i * 0.06));
    }

    shieldBreak() {
        this.tone('sine', 1200, 0.3, 0.2, 0, 300);
        this.noise(0.2, 0.2, 4000, 0, 'highpass');
    }

    beep() { this.tone('sine', 440, 0.18, 0.3); }

    gun() {
        this.noise(0.35, 0.9, 2500);
        this.tone('square', 160, 0.2, 0.4, 0, 40);
        this.tone('sine', 880, 0.4, 0.2, 0.02);
    }

    cheer(dur, vol) {
        this.noise(dur || 1.6, vol || 0.25, 1400, 0, 'bandpass', true);
        this.noise(dur || 1.6, (vol || 0.25) * 0.6, 2600, 0.1, 'bandpass', true);
    }

    ooh() { this.noise(0.5, 0.12, 500, 0, 'bandpass', true); }

    overtake() { this.tone('triangle', 660, 0.1, 0.15); this.tone('triangle', 990, 0.16, 0.15, 0.08); }

    win() {
        const n = [523, 523, 523, 659, 784, 659, 784, 1047];
        const d = [0, 0.14, 0.28, 0.42, 0.6, 0.78, 0.92, 1.1];
        n.forEach((f, i) => {
            this.tone('square', f, i === 7 ? 0.6 : 0.16, 0.14, d[i]);
            this.tone('triangle', f / 2, i === 7 ? 0.6 : 0.16, 0.16, d[i]);
        });
        this.cheer(3, 0.35);
    }

    podium() {
        [523, 659, 784].forEach((f, i) => this.tone('triangle', f, 0.25, 0.2, i * 0.15));
        this.cheer(2, 0.22);
    }

    lose() {
        [392, 349, 330, 262].forEach((f, i) => this.tone('triangle', f, 0.28, 0.2, i * 0.2));
    }
}
