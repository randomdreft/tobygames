/* ═══════════════════════════════════════════════════════════════
   AUDIO ENGINE - TobyTypen
   Web Audio API procedurele geluiden
   ═══════════════════════════════════════════════════════════════ */

let audioCtx = null;
function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(freq, dur, type='sine', vol=0.15) {
    try {
        const ctx = getAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + dur);
    } catch(e) {}
}

function sndCorrect() {
    const base = 600 + Math.min(combo, 30) * 10;
    playTone(base, 0.08, 'sine', 0.12);
}
function sndWrong() { playTone(200, 0.15, 'triangle', 0.06); }
function sndWordComplete() {
    playTone(523, 0.1); setTimeout(()=>playTone(659, 0.1), 80); setTimeout(()=>playTone(784, 0.15), 160);
}
function sndStreakMilestone() {
    [523,659,784,1047].forEach((f,i) => setTimeout(()=>playTone(f, 0.12, 'sine', 0.15), i*80));
}
function sndLessonComplete() {
    [523,659,784,1047,1319].forEach((f,i) => setTimeout(()=>playTone(f, 0.15, 'sine', 0.18), i*120));
}
function sndLevelUp() {
    [392,523,659,784,1047,1319,1568].forEach((f,i) => setTimeout(()=>playTone(f, 0.2, 'sine', 0.2), i*100));
}
function sndAchievement() {
    [880,1047,1319].forEach((f,i) => setTimeout(()=>playTone(f, 0.15, 'square', 0.1), i*100));
}
function sndBossHit() { playTone(300, 0.1, 'sawtooth', 0.12); playTone(400, 0.08, 'sine', 0.1); }
function sndBossDefeat() {
    [262,330,392,523,659,784,1047].forEach((f,i) => setTimeout(()=>playTone(f, 0.25, 'sine', 0.2), i*120));
}
function sndStar() { playTone(1047, 0.2, 'sine', 0.15); setTimeout(()=>playTone(1319, 0.3, 'sine', 0.18), 150); }
function sndBossDrum() {
    for(let i=0;i<6;i++) setTimeout(()=>playTone(80+i*10, 0.1, 'sawtooth', 0.15), i*100);
}
