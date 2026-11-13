// balkenrace/game.js - spelregels, input, tegenstanders, levels, opslag, schermen

(function () {
    'use strict';

    const PXM = BRC.PXM, LANES = BRC.LANES;
    const GRAV = 2300, JUMP1 = 780, JUMP2 = 700;
    const STUMBLE = 1.1;
    const SHIELD_T = 12, MAGNET_T = 9, SPRINT_T = 3;
    const SAVE_KEY = 'balkenrace_save';
    // snelheid van de snelste tegenstander per race (1 = even snel als jij zonder struikelen)
    const OPP_TOP = [0.84, 0.92, 0.945, 0.97, 0.985, 0.995, 1.005, 1.02];

    const RACES = [
        { dist: 100, name: 'Schoolsprint' },
        { dist: 150, name: 'Buurtrace' },
        { dist: 200, name: 'Clubwedstrijd' },
        { dist: 300, name: 'Stadsloop' },
        { dist: 400, name: 'Rondje stadion' },
        { dist: 500, name: 'Kampioenschap' },
        { dist: 600, name: 'Europa Cup' },
        { dist: 800, name: 'Wereldfinale' }
    ];

    const OPPS = [
        { name: 'Flits Fenna', color: '#1e88e5', hair: '#f9a825', skin: '#ffdbac' },
        { name: 'Turbo Tim', color: '#43a047', hair: '#4e342e', skin: '#e0ac69' },
        { name: 'Raket Roos', color: '#fb8c00', hair: '#b71c1c', skin: '#f1c27d' },
        { name: 'Bliksem Bas', color: '#8e24aa', hair: '#212121', skin: '#8d5524' }
    ];

    // shirts speel je vrij met je totale aantal munten
    const SHIRTS = [
        { c: '#e53935', need: 0 },
        { c: '#00bcd4', need: 25 },
        { c: '#ec407a', need: 60 },
        { c: '#c0ca33', need: 120 },
        { c: '#263238', need: 250 },
        { c: '#ffd600', need: 500 }
    ];

    const $ = (id) => document.getElementById(id);
    const canvas = $('gameCanvas');
    const fx = $('fxCanvas');
    const fxc = fx.getContext('2d');
    const R = new BRRenderer(canvas);
    const sound = new BRSound();

    // ---------- opslag ----------
    let save = { unlocked: 0, coins: 0, best: {}, shirt: 0 };
    function loadSave() {
        try {
            const s = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (s && typeof s === 'object') {
                save.unlocked = Math.max(0, Math.min(RACES.length - 1, s.unlocked | 0));
                save.coins = Math.max(0, s.coins | 0);
                save.best = s.best && typeof s.best === 'object' ? s.best : {};
                save.shirt = Math.max(0, Math.min(SHIRTS.length - 1, s.shirt | 0));
            }
        } catch (e) { /* geen opslag */ }
    }
    function writeSave() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* geen opslag */ }
    }

    // ---------- spelstaat ----------
    const G = {
        state: 'menu',      // menu | countdown | race | finished | results
        paused: false,
        t: 0, raceT: 0, afterT: 0, cd: 0, cdStep: -1,
        raceIdx: 0, speed: 300, finishX: 5000, camX: -150,
        beams: [], coins: [], items: [], debris: [], particles: [], runners: [],
        player: null,
        shieldT: 0, magnetT: 0, sprintT: 0,
        raceCoins: 0, stumbles: 0, coinStreak: 0, lastCoinT: 0,
        jumpBuf: 0, pos: 1, cheer: 0.2, shake: 0
    };

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ---------- level bouwen (vaste indeling per race, zodat tijden eerlijk zijn) ----------
    function buildLevel(i) {
        const rnd = mulberry32(4242 + i * 101);
        const finish = RACES[i].dist * PXM;
        const beams = [], coins = [], items = [];
        const gapMin = Math.max(440, 560 - i * 20), gapMax = Math.max(580, 780 - i * 32);
        const kinds = ['low', 'low', 'wide'];
        if (i >= 1) kinds.push('high', 'low');
        if (i >= 2) kinds.push('stack2', 'pair');
        if (i >= 3) kinds.push('high', 'stack2');
        if (i >= 4) kinds.push('stack3', 'pair');
        if (i >= 6) kinds.push('stack3', 'stack2');

        const shuffle = (a) => {
            for (let k = a.length - 1; k > 0; k--) {
                const j = Math.floor(rnd() * (k + 1));
                [a[k], a[j]] = [a[j], a[k]];
            }
            return a;
        };
        let order = shuffle(['magnet', 'shield', 'sprint']);
        let itemN = 0, nextItem = 850;

        const addBeam = (bx, w, h, n, diff) => {
            const pieces = [];
            const ph = h / n;
            for (let k = 0; k < n; k++) pieces.push({ dx: 0, dy: k * ph, w: w, h: ph });
            beams.push({ x: bx, w: w, h: h, pieces: pieces, down: new Array(LANES).fill(false), diff: diff });
            const cx = bx + w / 2;
            for (let k = -2; k <= 2; k++) {
                coins.push({ x: cx + k * 42, h: Math.max(38, h + 52 - k * k * 11), got: false });
            }
            return bx + w;
        };

        let x = 700;
        while (x < finish - 500) {
            const kind = (i === 0 && beams.length < 2) ? 'low' : kinds[Math.floor(rnd() * kinds.length)];
            let end;
            if (kind === 'low') end = addBeam(x, 44 + Math.floor(rnd() * 30), 30 + Math.floor(rnd() * 12), 1, 0.8);
            else if (kind === 'wide') end = addBeam(x, 120 + Math.floor(rnd() * 50), 34, 1, 0.8);
            else if (kind === 'high') end = addBeam(x, 30 + Math.floor(rnd() * 8), 64 + Math.floor(rnd() * 20), 1, 1.1);
            else if (kind === 'stack2') end = addBeam(x, 56, 100, 2, 1.3);
            else if (kind === 'stack3') end = addBeam(x, 60, 144, 3, 1.5);
            else {
                const e1 = addBeam(x, 42, 34, 1, 0.9);
                end = addBeam(e1 + 200, 42, 34, 1, 0.9);
            }
            const gap = gapMin + rnd() * (gapMax - gapMin);
            const mid = end + gap / 2;
            if (mid > nextItem && mid < finish - 350) {
                const type = order[itemN % 3];
                itemN++;
                if (itemN % 3 === 0) order = shuffle(order);
                const high = i >= 1 && rnd() < 0.3;
                items.push({ x: mid, h: high ? 130 : 50, type: type, got: false });
                nextItem = mid + 1000 + i * 80 + rnd() * 300;
            } else {
                const r = rnd();
                if (r < 0.45) {
                    for (let k = 0; k < 4; k++) coins.push({ x: mid - 75 + k * 50, h: 34, got: false });
                } else if (r < 0.8) {
                    // hoge munten: alleen met de dubbele sprong te pakken
                    for (let k = 0; k < 3; k++) coins.push({ x: mid - 45 + k * 45, h: 232 + (k === 1 ? 14 : 0), got: false });
                }
            }
            x = end + gap;
        }
        G.beams = beams; G.coins = coins; G.items = items; G.finishX = finish;
    }

    function setupRace(i) {
        G.raceIdx = i;
        G.speed = 300 + i * 12;
        buildLevel(i);
        G.debris = []; G.particles = [];
        G.raceT = 0; G.afterT = 0;
        G.shieldT = 0; G.magnetT = 0; G.sprintT = 0;
        G.raceCoins = 0; G.stumbles = 0; G.coinStreak = 0; G.jumpBuf = 0;
        G.pos = 1; G.shake = 0;

        const sh = SHIRTS[save.shirt] || SHIRTS[0];
        G.player = {
            isPlayer: true, name: 'Jij', lane: 0, number: 7,
            color: sh.c, shorts: '#1a237e', skin: '#ffdbac', hair: '#6d4c41',
            x: 0, y: 0, vy: 0, phase: 0, speedN: 0, air: false,
            onGround: true, jumps: 0, stumbleT: 0, stumbleDur: STUMBLE, finT: null, bi: 0
        };
        const hi = OPP_TOP[i], lo = hi - 0.09;
        const ps = Math.max(0.08, 0.34 - i * 0.035);
        const ranks = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        G.runners = [G.player];
        OPPS.forEach((o, k) => {
            const q = ranks[k] / 3;
            G.runners.push({
                isPlayer: false, name: o.name, lane: k + 1, number: k + 2,
                color: o.color, shorts: '#263238', skin: o.skin, hair: o.hair,
                x: 0, y: 0, phase: Math.random() * 6, speedN: 0, air: false,
                stumbleT: 0, stumbleDur: 1.0, finT: null,
                f: lo + (hi - lo) * q, ps: ps * (1.2 - 0.4 * q),
                delay: 0.08 + Math.random() * 0.3, ph: Math.random() * 6, bi: 0, plan: null
            });
        });
        G.camX = -R.playerSX;
    }

    // ---------- deeltjes ----------
    function particle(kind, x, y, o) {
        G.particles.push(Object.assign({ kind: kind, x: x, y: y, vx: 0, vy: 0, r: 4, life: 0.5, max: 0.5, color: '#fff' }, o));
    }
    function dust(x, h, n, spread) {
        for (let k = 0; k < n; k++) {
            const l = 0.3 + Math.random() * 0.3;
            particle('dust', x + (Math.random() - 0.5) * 14, R.baseY - h - Math.random() * 4, {
                vx: (Math.random() - 0.7) * (spread || 60), vy: -10 - Math.random() * 30,
                r: 3 + Math.random() * 4, life: l, max: l
            });
        }
    }
    function sparks(x, h, n, color) {
        for (let k = 0; k < n; k++) {
            const l = 0.3 + Math.random() * 0.4;
            particle('spark', x, R.baseY - h, {
                vx: (Math.random() - 0.3) * 320, vy: -80 - Math.random() * 260,
                r: 2 + Math.random() * 3, life: l, max: l, color: color || '#ffeb3b'
            });
        }
    }
    function floatText(text, x, h, color, size) {
        particle('text', x, R.baseY - h, { text: text, color: color || '#fff', r: size || 18, vx: G.speed * 0.8, vy: -45, life: 1, max: 1 });
    }

    function knock(b, lane, v) {
        if (b.down[lane]) return;
        b.down[lane] = true;
        for (const p of b.pieces) {
            G.debris.push({
                lane: lane, x: b.x + p.dx, y: p.dy, w: p.w, h: p.h,
                vx: v * (0.5 + Math.random() * 0.4), vy: 220 + Math.random() * 200 + p.dy * 2,
                rot: 0, vr: (Math.random() - 0.3) * 9, life: 1.3
            });
        }
    }

    // ---------- speler ----------
    function tryJump() {
        const p = G.player;
        if (p.onGround) {
            p.vy = JUMP1; p.onGround = false; p.jumps = 1; p.air = true;
            sound.jump();
            dust(p.x - 6, p.y, 4, 80);
            return true;
        }
        if (p.jumps < 2) {
            p.vy = JUMP2; p.jumps = 2;
            sound.jump2();
            particle('ring', p.x, R.baseY - p.y + 2, { life: 0.35, max: 0.35 });
            sparks(p.x, p.y, 5, '#ffffff');
            return true;
        }
        return false;
    }

    function press() {
        sound.init();
        if (G.paused) return;
        if (G.state === 'race') {
            if (!tryJump()) G.jumpBuf = 0.15;
        }
    }

    function hitBeam(b, v) {
        const p = G.player;
        knock(b, 0, v);
        sparks(b.x, Math.min(b.h, p.y + 30), 10);
        if (G.sprintT > 0) {
            sound.clang();
            floatText('BAM!', b.x, b.h + 40, '#ffca28', 22);
            G.shake = Math.max(G.shake, 0.4);
            return;
        }
        if (G.shieldT > 0) {
            G.shieldT = 0;
            sound.shieldBreak();
            sound.clang();
            floatText('Schild gebruikt!', p.x + 30, p.y + 90, '#81d4fa', 17);
            sparks(p.x, p.y + 30, 14, '#81d4fa');
            return;
        }
        p.stumbleT = STUMBLE;
        p.vy = Math.min(p.vy, 80);
        G.stumbles++;
        G.shake = 1;
        G.cheer = Math.min(G.cheer, 0.1);
        sound.stumble();
        sound.ooh();
        dust(p.x, p.y, 8, 140);
        const lost = Math.min(G.raceCoins, 3);
        if (lost > 0) {
            G.raceCoins -= lost;
            for (let k = 0; k < lost; k++) {
                particle('coin', p.x, R.baseY - p.y - 30, {
                    vx: 100 + Math.random() * 260, vy: -250 - Math.random() * 200, life: 0.9, max: 0.9
                });
            }
            floatText('-' + lost + ' 🪙', p.x + 10, p.y + 80, '#ff8a80', 18);
        } else {
            floatText('Au!', p.x + 10, p.y + 80, '#ff8a80', 18);
        }
    }

    function updatePlayer(dt) {
        const p = G.player;
        if (G.jumpBuf > 0) {
            G.jumpBuf -= dt;
            if (G.state === 'race' && tryJump()) G.jumpBuf = 0;
        }
        let mult = G.sprintT > 0 ? 1.5 : 1;
        if (p.stumbleT > 0) {
            p.stumbleT = Math.max(0, p.stumbleT - dt);
            const q = 1 - p.stumbleT / STUMBLE;
            mult *= 0.25 + 0.75 * q * q;
        }
        let v = G.speed * mult * Math.min(1, G.raceT / 0.7);
        if (G.state === 'finished') v *= Math.max(0.15, 1 - G.afterT / 1.6);
        p.speedN = v / G.speed;

        const prevY = p.y;
        const prevPhase = p.phase;
        p.x += v * dt;
        p.phase += v * dt * 0.05;
        p.vy -= GRAV * dt;
        p.y += p.vy * dt;

        let floor = 0;
        while (p.bi < G.beams.length && G.beams[p.bi].x + G.beams[p.bi].w < p.x - 40) p.bi++;
        for (let k = p.bi; k < G.beams.length; k++) {
            const b = G.beams[k];
            if (b.x > p.x + 60) break;
            if (b.down[0]) continue;
            if (p.x + 12 > b.x && p.x - 12 < b.x + b.w) {
                if (prevY >= b.h - 10) floor = Math.max(floor, b.h);
                else if (p.y < b.h) hitBeam(b, v);
            }
        }
        if (p.y <= floor) {
            if (!p.onGround) {
                sound.land();
                dust(p.x, floor, 6, 110);
            }
            p.y = floor; p.vy = 0; p.onGround = true; p.jumps = 0; p.air = false;
        } else {
            if (p.onGround) { p.onGround = false; p.jumps = 1; }   // van een balk af gelopen
            p.air = true;
        }
        // stofwolkje per stap
        if (p.onGround && v > 60 && Math.floor(p.phase / Math.PI) !== Math.floor(prevPhase / Math.PI)) {
            dust(p.x - 10, p.y, G.sprintT > 0 ? 3 : 1, 50);
        }

        // munten
        const cy = p.y + 30;
        for (const c of G.coins) {
            if (c.got) continue;
            const dx = c.x - p.x;
            if (dx < -60) continue;
            if (dx > 260) continue;
            const dy = c.h - cy;
            if (G.magnetT > 0 && dx * dx + dy * dy < 230 * 230) {
                const a = Math.min(1, 10 * dt);
                c.x += (p.x - c.x) * a + v * dt;
                c.h += (cy - c.h) * a;
            }
            if (Math.abs(c.x - p.x) < 26 && Math.abs(c.h - cy) < 42) {
                c.got = true;
                G.raceCoins++;
                if (G.t - G.lastCoinT > 0.8) G.coinStreak = 0;
                G.lastCoinT = G.t;
                sound.coin(G.coinStreak++);
                sparks(c.x, c.h, 4, '#ffd54f');
            }
        }
        // power-ups
        for (const it of G.items) {
            if (it.got) continue;
            if (Math.abs(it.x - p.x) < 34 && Math.abs(it.h - cy) < 50) {
                it.got = true;
                sound.power();
                G.cheer = Math.max(G.cheer, 0.7);
                sparks(it.x, it.h, 12, '#ffffff');
                if (it.type === 'shield') { G.shieldT = SHIELD_T; floatText('🛡️ Schild!', p.x + 20, p.y + 95, '#81d4fa', 20); }
                else if (it.type === 'magnet') { G.magnetT = MAGNET_T; floatText('🧲 Magneet!', p.x + 20, p.y + 95, '#ff8a80', 20); }
                else { G.sprintT = SPRINT_T; floatText('⚡ Supersnel!', p.x + 20, p.y + 95, '#ffca28', 20); }
            }
        }

        if (p.finT === null && p.x >= G.finishX) {
            p.finT = G.raceT - (p.x - G.finishX) / Math.max(1, v);
            G.state = 'finished';
            G.afterT = 0;
            G.cheer = 1;
            G.sprintT = 0; G.magnetT = 0;
            sound.cheer(2, 0.3);
            $('pause-btn').style.display = 'none';
        }
    }

    // ---------- tegenstanders ----------
    function updateOpp(o, dt) {
        if (G.raceT < o.delay) return;
        let mult = 1;
        if (o.stumbleT > 0) {
            o.stumbleT = Math.max(0, o.stumbleT - dt);
            const q = 1 - o.stumbleT / o.stumbleDur;
            mult = 0.3 + 0.7 * q * q;
        }
        let v = G.speed * o.f * (1 + 0.04 * Math.sin(G.raceT * 0.7 + o.ph)) * Math.min(1, (G.raceT - o.delay) / 0.8) * mult;
        // elastiekje: achterblijvers haken aan (maar halen je zo niet in), koplopers houden in de eerste race iets in
        const gapP = G.player.x - o.x;
        if (gapP > 80 && o.f < 0.97) v *= 1 + (0.97 / o.f - 1) * Math.min(1, (gapP - 80) / 220);
        if (gapP > 250) v *= 1 + 0.05 * Math.min(1, (gapP - 250) / 500);
        else if (gapP < -200 && G.raceIdx === 0) v *= 1 - 0.1 * Math.min(1, (-gapP - 200) / 400);
        if (o.finT !== null) v *= Math.max(0.15, 1 - (G.raceT - o.finT) / 1.6);
        o.x += v * dt;
        o.phase += v * dt * 0.05;
        o.speedN = v / G.speed;
        o.y = 0; o.air = false;

        const D = 95;
        while (o.bi < G.beams.length && o.x > G.beams[o.bi].x + G.beams[o.bi].w + D) { o.bi++; o.plan = null; }
        const b = G.beams[o.bi];
        if (b && o.x > b.x - D) {
            if (o.plan === null) o.plan = Math.random() < o.ps * b.diff ? 'hit' : 'jump';
            if (o.plan === 'jump') {
                const u = (o.x - (b.x - D)) / (b.w + 2 * D);
                o.y = (b.h + 34) * Math.sin(Math.PI * u);
                o.air = o.y > 4;
            } else if (o.plan === 'hit' && o.x + 10 >= b.x) {
                knock(b, o.lane, v);
                o.stumbleT = o.stumbleDur;
                o.plan = 'done';
            }
        }
        if (o.finT === null && o.x >= G.finishX) {
            o.finT = G.raceT - (o.x - G.finishX) / Math.max(1, v);
        }
    }

    // ---------- hoofdstap ----------
    function step(dt) {
        G.t += dt;
        G.cheer += (0.22 - G.cheer) * Math.min(1, dt * 0.6);
        G.shake = Math.max(0, G.shake - dt * 3);

        if (G.state === 'countdown') {
            G.cd += dt;
            const s = Math.floor(G.cd / 0.8);
            if (s !== G.cdStep) {
                G.cdStep = s;
                const el = $('countdown-text');
                el.classList.remove('pop');
                void el.offsetWidth;
                el.classList.add('pop');
                if (s < 3) { el.textContent = String(3 - s); sound.beep(); }
                else {
                    el.textContent = 'PANG! 💥';
                    sound.gun();
                    sound.cheer(1.5, 0.22);
                    G.cheer = 1;
                    G.state = 'race';
                    G.raceT = 0;
                    $('pause-btn').style.display = '';
                    sparks(G.player.x - 60, 110, 14, '#ffffff');
                }
            }
        } else if (G.state === 'race' || G.state === 'finished') {
            G.raceT += dt;
            if (G.raceT > 0.8) $('countdown').style.display = 'none';
            if (G.shieldT > 0) G.shieldT = Math.max(0, G.shieldT - dt);
            if (G.magnetT > 0) G.magnetT = Math.max(0, G.magnetT - dt);
            if (G.sprintT > 0) G.sprintT = Math.max(0, G.sprintT - dt);
            updatePlayer(dt);
            for (let k = 1; k < G.runners.length; k++) updateOpp(G.runners[k], dt);

            // positie
            const p = G.player;
            let pos = 1;
            for (let k = 1; k < G.runners.length; k++) {
                const o = G.runners[k];
                if (p.finT !== null) { if (o.finT !== null && o.finT < p.finT) pos++; }
                else if (o.finT !== null || o.x > p.x) pos++;
            }
            if (pos !== G.pos) {
                if (pos < G.pos && G.raceT > 1) { sound.overtake(); G.cheer = Math.max(G.cheer, 0.8); }
                G.pos = pos;
                const el = $('hud-pos');
                el.classList.remove('bump');
                void el.offsetWidth;
                el.classList.add('bump');
            }
            if (G.state === 'finished') {
                G.afterT += dt;
                G.cheer = Math.max(G.cheer, 0.8);
                if (G.afterT > 1.7) showResults();
            }
            G.camX = p.x - R.playerSX;
            updateHud();
        }

        // brokstukken en deeltjes
        for (const d of G.debris) {
            d.vy -= GRAV * dt;
            d.y += d.vy * dt;
            d.x += d.vx * dt;
            d.rot += d.vr * dt;
            if (d.y < 0) { d.y = 0; d.vy *= -0.35; d.vx *= 0.6; d.vr *= 0.5; }
            d.life -= dt;
        }
        if (G.debris.length) G.debris = G.debris.filter((d) => d.life > 0);
        for (const q of G.particles) {
            q.life -= dt;
            q.x += q.vx * dt;
            q.y += q.vy * dt;
            if (q.kind === 'spark' || q.kind === 'coin') q.vy += 900 * dt;
        }
        if (G.particles.length) G.particles = G.particles.filter((q) => q.life > 0);
    }

    // ---------- HUD ----------
    const fmtTime = (t, dec) => t.toFixed(dec === undefined ? 2 : dec).replace('.', ',') + ' s';
    const hudCache = {};
    function setText(id, txt) {
        if (hudCache[id] !== txt) { hudCache[id] = txt; $(id).textContent = txt; }
    }
    function setPu(id, tLeft, tMax) {
        const el = $(id);
        const on = tLeft > 0;
        if (el.classList.contains('on') !== on) el.classList.toggle('on', on);
        if (on) el.querySelector('.pu-bar > div').style.width = Math.round(tLeft / tMax * 100) + '%';
    }
    function updateHud() {
        const p = G.player;
        setText('hud-pos', G.pos + 'e');
        const left = Math.max(0, Math.ceil((G.finishX - p.x) / PXM));
        setText('hud-dist', left > 0 ? 'nog ' + left + ' m' : 'FINISH!');
        setText('hud-coins', '🪙 ' + G.raceCoins);
        setText('hud-time', fmtTime(p.finT !== null ? p.finT : G.raceT, 1));
        setPu('pu-shield', G.shieldT, SHIELD_T);
        setPu('pu-magnet', G.magnetT, MAGNET_T);
        setPu('pu-sprint', G.sprintT, SPRINT_T);
    }

    // ---------- schermen ----------
    const MEDALS = ['', '🥇', '🥈', '🥉'];

    function show(id, on) { $(id).style.display = on ? '' : 'none'; }

    function showMenu() {
        G.state = 'menu';
        G.paused = false;
        show('menu-screen', true);
        show('result-screen', false);
        show('pause-screen', false);
        show('hud', false);
        show('countdown', false);
        show('pause-btn', false);
        confetti.length = 0;
        $('coin-total-value').textContent = save.coins;

        const list = $('race-list');
        list.innerHTML = '';
        RACES.forEach((r, i) => {
            const b = document.createElement('button');
            const locked = i > save.unlocked;
            const best = save.best[i];
            b.className = 'race-btn' + (i === save.unlocked && !(best && best.pos === 1) ? ' next' : '');
            b.disabled = locked;
            b.innerHTML =
                '<span class="race-dist">' + r.dist + ' m</span>' +
                '<span class="race-name">' + r.name + '</span>' +
                '<span class="race-medal">' + (locked ? '🔒' : best ? (MEDALS[best.pos] || best.pos + 'e') : '▶️') + '</span>' +
                '<span class="race-best">' + (best ? fmtTime(best.time) : '') + '</span>';
            b.addEventListener('click', () => startRace(i));
            list.appendChild(b);
        });

        const sl = $('shirt-list');
        sl.innerHTML = '';
        SHIRTS.forEach((s, i) => {
            const b = document.createElement('button');
            const locked = save.coins < s.need;
            b.className = 'shirt-btn' + (i === save.shirt ? ' active' : '');
            b.style.background = s.c;
            b.disabled = locked;
            b.textContent = locked ? s.need : '';
            b.title = locked ? 'Verzamel ' + s.need + ' munten' : 'Kies dit shirt';
            b.addEventListener('click', () => {
                save.shirt = i;
                writeSave();
                showMenu();
            });
            sl.appendChild(b);
        });
        setupRace(Math.min(save.unlocked, RACES.length - 1));
    }

    function startRace(i) {
        sound.init();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        setupRace(i);
        confetti.length = 0;
        G.state = 'countdown';
        G.paused = false;
        G.cd = 0; G.cdStep = -1;
        show('menu-screen', false);
        show('result-screen', false);
        show('pause-screen', false);
        show('hud', true);
        show('countdown', true);
        $('countdown-text').textContent = '';
        updateHud();
    }

    function showResults() {
        G.state = 'results';
        const i = G.raceIdx;
        const p = G.player;
        const rows = G.runners.map((r) => {
            let time = r.finT;
            if (time === null) time = G.raceT + (G.finishX - r.x) / (G.speed * Math.max(r.f, 0.9)) + 0.05;
            return { r: r, time: time };
        }).sort((a, b) => a.time - b.time);
        const pos = rows.findIndex((x) => x.r === p) + 1;

        const posBonus = [0, 20, 10, 5][pos] || 0;
        const cleanBonus = G.stumbles === 0 ? 10 : 0;
        const earned = G.raceCoins + posBonus + cleanBonus;
        const old = save.best[i];
        const record = !old || p.finT < old.time;
        save.best[i] = {
            time: old ? Math.min(old.time, p.finT) : p.finT,
            pos: old ? Math.min(old.pos, pos) : pos
        };
        save.coins += earned;
        const hadNext = save.unlocked > i;
        if (pos <= 3 && i + 1 < RACES.length) save.unlocked = Math.max(save.unlocked, i + 1);
        writeSave();

        $('result-title').textContent =
            pos === 1 ? '🥇 Gewonnen!' : pos === 2 ? '🥈 Tweede!' : pos === 3 ? '🥉 Derde!' : pos + 'e plaats';

        const pod = $('podium');
        pod.innerHTML = '';
        [1, 0, 2].forEach((k) => {
            const row = rows[k];
            const d = document.createElement('div');
            d.className = 'pod pod-' + (k + 1);
            const nm = document.createElement('div');
            nm.className = 'pod-name' + (row.r.isPlayer ? ' me' : '');
            nm.textContent = row.r.name;
            const shirt = document.createElement('div');
            shirt.className = 'pod-shirt';
            shirt.style.background = row.r.color;
            shirt.textContent = row.r.number;
            const bl = document.createElement('div');
            bl.className = 'pod-block';
            bl.textContent = MEDALS[k + 1];
            d.appendChild(nm); d.appendChild(shirt); d.appendChild(bl);
            pod.appendChild(d);
        });

        const rl = $('result-list');
        rl.innerHTML = '';
        rows.forEach((row, k) => {
            const d = document.createElement('div');
            d.className = 'res-row' + (row.r.isPlayer ? ' me' : '');
            const a = document.createElement('span');
            a.textContent = (k + 1) + 'e  ' + row.r.name;
            const b = document.createElement('span');
            b.textContent = fmtTime(row.time);
            d.appendChild(a); d.appendChild(b);
            rl.appendChild(d);
        });

        let html = RACES[i].dist + ' m in <b>' + fmtTime(p.finT) + '</b>' +
            (record ? ' <span class="record">Nieuw record!</span>' : ' (record: ' + fmtTime(save.best[i].time) + ')') +
            '<br>🪙 ' + G.raceCoins + ' gepakt' +
            (posBonus ? ' + ' + posBonus + ' bonus' : '') +
            (cleanBonus ? ' + ' + cleanBonus + ' voor geen enkele struikeling ⭐' : '') +
            ' = <b>' + earned + '</b>';
        const canNext = i + 1 < RACES.length && save.unlocked > i;
        if (pos > 3) html += '<br>Word 1e, 2e of 3e om de volgende race te openen. Jij kunt het!';
        else if (i + 1 >= RACES.length) html += '<br>🏆 Je hebt de Wereldfinale gehaald. Kampioen!';
        else if (!hadNext) html += '<br>🔓 Nieuwe race open: ' + RACES[i + 1].dist + ' m ' + RACES[i + 1].name + '!';
        $('result-stats').innerHTML = html;

        show('next-btn', canNext);
        show('hud', false);
        show('pause-btn', false);
        show('result-screen', true);

        if (pos === 1) { sound.win(); burstConfetti(170); G.cheer = 1; }
        else if (pos <= 3) { sound.podium(); burstConfetti(50); }
        else sound.lose();
    }

    function setPaused(on) {
        if (G.state !== 'race' && G.state !== 'countdown') on = false;
        G.paused = on;
        show('pause-screen', on);
    }

    // ---------- confetti (eigen canvas boven de schermen) ----------
    const confetti = [];
    const CONF_COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00', '#ffffff'];
    function burstConfetti(n) {
        const w = window.innerWidth, h = window.innerHeight;
        for (let k = 0; k < n; k++) {
            confetti.push({
                x: Math.random() * w, y: -20 - Math.random() * h * 0.6,
                vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 220,
                w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
                rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
                color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
                sway: Math.random() * 6
            });
        }
    }
    let fxDirty = false;
    function drawFx(dt) {
        if (!confetti.length && !fxDirty) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
        fxc.clearRect(0, 0, window.innerWidth, window.innerHeight);
        fxDirty = confetti.length > 0;
        const h = window.innerHeight;
        for (let k = confetti.length - 1; k >= 0; k--) {
            const q = confetti[k];
            q.y += q.vy * dt;
            q.x += (q.vx + Math.sin(G.t * 3 + q.sway) * 40) * dt;
            q.rot += q.vr * dt;
            if (q.y > h + 20) { confetti.splice(k, 1); continue; }
            fxc.save();
            fxc.translate(q.x, q.y);
            fxc.rotate(q.rot);
            fxc.fillStyle = q.color;
            fxc.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.rot * 1.3)) + 1);
            fxc.restore();
        }
    }

    function resize() {
        R.resize();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        fx.width = Math.round(window.innerWidth * dpr);
        fx.height = Math.round(window.innerHeight * dpr);
        if (G.player) G.camX = G.player.x - R.playerSX;
    }

    // ---------- input ----------
    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        press();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
        const jumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
        const playing = G.state === 'race' || G.state === 'countdown' || G.state === 'finished';
        if (jumpKey && playing) {
            e.preventDefault();
            if (!e.repeat) press();
            return;
        }
        if (e.repeat) return;
        if ((e.code === 'KeyP' || e.code === 'Escape') && (G.state === 'race' || G.state === 'countdown')) {
            setPaused(!G.paused);
        } else if (e.code === 'KeyM') {
            toggleMute();
        } else if (e.code === 'Enter' && G.state === 'results') {
            e.preventDefault();
            if ($('next-btn').style.display !== 'none') $('next-btn').click();
            else $('retry-btn').click();
        }
    });

    function toggleMute() {
        sound.init();
        sound.setMuted(!sound.muted);
        $('mute-btn').textContent = sound.muted ? '🔇' : '🔊';
    }
    $('mute-btn').addEventListener('click', (e) => { toggleMute(); e.currentTarget.blur(); });
    $('pause-btn').addEventListener('click', (e) => { setPaused(!G.paused); e.currentTarget.blur(); });
    $('resume-btn').addEventListener('click', () => setPaused(false));
    $('quit-btn').addEventListener('click', showMenu);
    $('next-btn').addEventListener('click', () => startRace(Math.min(G.raceIdx + 1, RACES.length - 1)));
    $('retry-btn').addEventListener('click', () => startRace(G.raceIdx));
    $('menu-btn').addEventListener('click', showMenu);

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && G.state === 'race') setPaused(true);
    });

    // ---------- lus ----------
    let last = performance.now();
    function frame(now) {
        // bij een trage beeldverversing in kleine stapjes rekenen, zodat het spel even snel blijft
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        if (!G.paused) {
            let left = dt;
            while (left > 0.0005) {
                const h = Math.min(left, 1 / 60);
                step(h);
                left -= h;
            }
        }
        R.draw(G);
        drawFx(dt);
        requestAnimationFrame(frame);
    }

    loadSave();
    $('mute-btn').textContent = sound.muted ? '🔇' : '🔊';
    resize();
    showMenu();
    requestAnimationFrame(frame);

    // voor testen/debuggen in de console
    window.BR = { G: G, R: R, step: step, press: press, startRace: startRace, showMenu: showMenu, getSave: () => save };
})();
