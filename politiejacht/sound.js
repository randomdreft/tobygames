// politiejacht/sound.js - Web Audio API sound effects

class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.engineOsc = null;
        this.engineGain = null;
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
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) { /* silent fail */ }
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

    startEngine() {
        if (!this.initialized || this.engineOsc) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 40;
        g.gain.value = 0;
        o.connect(g);
        g.connect(this.masterGain);
        o.start();
        this.engineOsc = o;
        this.engineGain = g;
    }

    updateEngine(speedRatio) {
        if (!this.engineOsc) return;
        this.engineOsc.frequency.value = 40 + speedRatio * 80;
        this.engineGain.gain.value = 0.04 + speedRatio * 0.08;
    }

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
        const maxDist = 500;
        const vol = Math.max(0, 1 - closestDist / maxDist) * 0.12;
        this.sirenGain.gain.value = vol;
    }

    playPickup() {
        if (!this.initialized) return;
        this._osc('sine', 600, 0.15, 0.08);
        setTimeout(() => this._osc('sine', 900, 0.12, 0.1), 80);
        setTimeout(() => this._osc('sine', 1200, 0.1, 0.12), 160);
    }

    playWarningBeep() {
        if (!this.initialized) return;
        this._osc('square', 440, 0.08, 0.1);
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
        // Noise burst
        const bufSize = this.ctx.sampleRate * 0.3;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        src.buffer = buf;
        g.gain.value = 0.2;
        src.connect(g);
        g.connect(this.masterGain);
        src.start();
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    }

    playCountdown() {
        this._osc('sine', 440, 0.1, 0.15);
    }

    playGo() {
        this._osc('sine', 880, 0.12, 0.3);
    }

    stopAll() {
        if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc = null; this.engineGain = null; }
        if (this.sirenOsc1) { this.sirenOsc1.stop(); this.sirenOsc2.stop(); this.sirenOsc1 = null; this.sirenOsc2 = null; }
        if (this.sirenGain) this.sirenGain = null;
        if (this.sirenInterval) { clearInterval(this.sirenInterval); this.sirenInterval = null; }
        this.stopWarning();
    }
}
