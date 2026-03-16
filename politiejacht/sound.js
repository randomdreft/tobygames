// politiejacht/sound.js - Web Audio API sound effects

class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.masterGain = null;
        this.engineNodes = null;
        this.sirenOsc1 = null;
        this.sirenOsc2 = null;
        this.sirenGain = null;
        this.sirenPhase = 0;
        this.sirenInterval = null;
        this.warningInterval = null;
        this.muted = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) { /* silent */ }
    }

    _osc(type, freq, gain, duration) {
        if (!this.initialized) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g);
        g.connect(this.masterGain);
        o.start();
        if (duration) {
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            o.stop(this.ctx.currentTime + duration + 0.05);
        }
        return { osc: o, gain: g };
    }

    // --- Engine: layered oscillators with LFO for natural variation ---

    startEngine() {
        if (!this.initialized || this.engineNodes) return;

        // Main engine tone through lowpass filter
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 55;
        gain1.gain.value = 0;

        // Sub-bass rumble
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.value = 27.5;
        gain2.gain.value = 0;

        // LFO adds slight frequency wobble so it never sounds static
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 4.5;
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);

        // Lowpass tames harsh sawtooth harmonics
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        filter.Q.value = 0.7;

        osc1.connect(filter);
        filter.connect(gain1);
        gain1.connect(this.masterGain);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);

        osc1.start();
        osc2.start();
        lfo.start();

        this.engineNodes = { osc1, osc2, lfo, lfoGain, gain1, gain2, filter };
    }

    updateEngine(speedRatio) {
        if (!this.engineNodes) return;
        const { osc1, osc2, lfoGain, gain1, gain2, filter } = this.engineNodes;

        // Frequency rises with speed (55-185 Hz)
        const freq = 55 + speedRatio * 130;
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 0.5;

        // LFO wobble fades at high speed (engine steadies)
        lfoGain.gain.value = 3 - speedRatio * 2;

        // Filter opens with speed for more bite
        filter.frequency.value = 300 + speedRatio * 700;

        // Volume: subtle at idle, moderate at speed
        gain1.gain.value = 0.015 + speedRatio * 0.035;
        gain2.gain.value = 0.01 + speedRatio * 0.02;
    }

    // --- Siren (unchanged logic, slightly lower volume) ---

    startSiren() {
        if (!this.initialized || this.sirenOsc1) return;
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.value = 800;
        o2.frequency.value = 600;
        g.gain.value = 0;
        o1.connect(g);
        o2.connect(g);
        g.connect(this.masterGain);
        o1.start();
        o2.start();
        this.sirenOsc1 = o1;
        this.sirenOsc2 = o2;
        this.sirenGain = g;
        this.sirenPhase = 0;
        this.sirenInterval = setInterval(() => {
            this.sirenPhase = 1 - this.sirenPhase;
            if (this.sirenOsc1) {
                this.sirenOsc1.frequency.value = this.sirenPhase ? 800 : 600;
                this.sirenOsc2.frequency.value = this.sirenPhase ? 600 : 800;
            }
        }, 400);
    }

    updateSiren(closestDist) {
        if (!this.sirenGain) return;
        const vol = Math.max(0, 1 - closestDist / 500) * 0.10;
        this.sirenGain.gain.value = vol;
    }

    // --- SFX ---

    playPickup() {
        if (!this.initialized) return;
        this._osc('sine', 600, 0.12, 0.08);
        setTimeout(() => this._osc('sine', 900, 0.1, 0.1), 80);
        setTimeout(() => this._osc('sine', 1200, 0.08, 0.12), 160);
    }

    playPowerup() {
        if (!this.initialized) return;
        this._osc('sine', 523, 0.10, 0.1);
        setTimeout(() => this._osc('sine', 659, 0.09, 0.1), 100);
        setTimeout(() => this._osc('sine', 784, 0.09, 0.1), 200);
        setTimeout(() => this._osc('sine', 1047, 0.10, 0.15), 300);
    }

    playBoostStart() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, t);
        o.frequency.linearRampToValueAtTime(800, t + 0.3);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 500;
        f.Q.value = 2;
        o.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        o.start(t);
        o.stop(t + 0.5);
    }

    playOilDeploy() {
        if (!this.initialized) return;
        const sr = this.ctx.sampleRate;
        const len = sr * 0.2;
        const buf = this.ctx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.15));
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        src.buffer = buf;
        f.type = 'lowpass';
        f.frequency.value = 300;
        g.gain.value = 0.12;
        src.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        src.start();
    }

    playSpikeHit() {
        if (!this.initialized) return;
        const sr = this.ctx.sampleRate;
        const len = sr * 0.15;
        const buf = this.ctx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.05));
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        src.buffer = buf;
        f.type = 'highpass';
        f.frequency.value = 2000;
        g.gain.value = 0.15;
        src.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        src.start();
        this._osc('sine', 150, 0.1, 0.08);
    }

    playBump() {
        if (!this.initialized) return;
        this._osc('triangle', 100, 0.08, 0.1);
        this._osc('sine', 200, 0.04, 0.08);
    }

    playWarningBeep() {
        if (!this.initialized) return;
        this._osc('square', 440, 0.06, 0.1);
    }

    startWarning() {
        if (this.warningInterval) return;
        this.warningInterval = setInterval(() => this.playWarningBeep(), 600);
    }

    stopWarning() {
        if (this.warningInterval) {
            clearInterval(this.warningInterval);
            this.warningInterval = null;
        }
    }

    playCrash() {
        if (!this.initialized) return;
        const sr = this.ctx.sampleRate;
        const len = sr * 0.3;
        const buf = this.ctx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        src.buffer = buf;
        g.gain.value = 0.18;
        src.connect(g);
        g.connect(this.masterGain);
        src.start();
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    }

    playCountdown() {
        this._osc('sine', 440, 0.08, 0.15);
    }

    playGo() {
        this._osc('sine', 880, 0.1, 0.3);
    }

    stopAll() {
        if (this.engineNodes) {
            this.engineNodes.osc1.stop();
            this.engineNodes.osc2.stop();
            this.engineNodes.lfo.stop();
            this.engineNodes = null;
        }
        if (this.sirenOsc1) {
            this.sirenOsc1.stop();
            this.sirenOsc2.stop();
            this.sirenOsc1 = null;
            this.sirenOsc2 = null;
        }
        if (this.sirenGain) this.sirenGain = null;
        if (this.sirenInterval) {
            clearInterval(this.sirenInterval);
            this.sirenInterval = null;
        }
        this.stopWarning();
    }
}
