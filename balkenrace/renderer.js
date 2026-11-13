// balkenrace/renderer.js - Canvas rendering: stadion, baan, balken, lopers, effecten

const BRC = {
    PXM: 50,        // wereld-eenheden per meter
    LANES: 5,
    LANE_H: 30,
    MIN_W: 470,     // minimaal zichtbare breedte (wereld-eenheden), staand scherm
    MIN_W_WIDE: 620, // idem, liggend scherm
    MIN_H: 400
};

const BR_BOARDS = [
    ['TOBYGAMES', '#1e88e5'], ['HUP HUP!', '#fdd835'], ['BALKENRACE', '#e53935'],
    ['ZET \'M OP!', '#43a047'], ['SPRING!', '#8e24aa'], ['GO GO GO', '#fb8c00']
];

class BRRenderer {
    constructor(canvas) {
        this.c = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.max(200, window.innerWidth);
        const ch = Math.max(200, window.innerHeight);
        this.c.width = Math.round(cw * dpr);
        this.c.height = Math.round(ch * dpr);
        const minW = cw > ch ? BRC.MIN_W_WIDE : BRC.MIN_W;
        this.scale = Math.min(cw / minW, ch / BRC.MIN_H);
        this.W = cw / this.scale;
        this.H = ch / this.scale;
        this.px = this.scale * dpr;

        this.baseY = Math.min(this.H - 64, this.H * 0.66 + 90);   // voeten van baan 0 (speler)
        this.trackBot = this.baseY + 12;
        this.trackTop = this.trackBot - BRC.LANES * BRC.LANE_H;
        this.boardTop = this.trackTop - 24;
        this.tribTop = Math.max(48, this.boardTop - 300);
        this.playerSX = Math.max(90, Math.min(220, this.W * 0.26));
        this.buildTribune();
    }

    // Tribune vooraf tekenen op losse canvassen (achtergrond + 2 lagen publiek)
    buildTribune() {
        const TW = 600;
        const TH = Math.ceil(this.boardTop - this.tribTop);
        this.TW = TW; this.TH = TH;
        const mk = () => {
            const cv = document.createElement('canvas');
            cv.width = Math.ceil(TW * this.px);
            cv.height = Math.ceil((TH + 8) * this.px);
            const c = cv.getContext('2d');
            c.scale(this.px, this.px);
            return [cv, c];
        };
        const [bg, cb] = mk();
        const [la, ca] = mk();
        const [lb, cl] = mk();
        let seed = 12345;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

        const g = cb.createLinearGradient(0, 0, 0, TH);
        g.addColorStop(0, '#263238');
        g.addColorStop(1, '#455a64');
        cb.fillStyle = g;
        cb.fillRect(0, 0, TW, TH + 8);
        cb.fillStyle = 'rgba(255,255,255,0.07)';
        for (let y = TH - 2; y > 0; y -= 16) cb.fillRect(0, y, TW, 2);
        // trap
        cb.fillStyle = '#607d8b';
        cb.fillRect(4, 0, 14, TH + 8);
        cb.fillStyle = '#fdd835';
        for (let y = TH - 2; y > 0; y -= 16) cb.fillRect(4, y, 14, 2);

        const shirts = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#ffffff', '#00acc1', '#ec407a', '#ff7043'];
        const skins = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
        let row = 0;
        for (let y = TH - 6; y > 12; y -= 16, row++) {
            const c = row % 2 === 0 ? ca : cl;
            for (let x = 28; x < TW - 6; x += 12) {
                if (rnd() < 0.07) continue;
                const jx = x + (rnd() - 0.5) * 3;
                c.fillStyle = shirts[Math.floor(rnd() * shirts.length)];
                c.beginPath();
                c.roundRect(jx - 4.5, y - 3, 9, 10, 3);
                c.fill();
                // armen omhoog bij sommigen
                if (rnd() < 0.3) {
                    c.fillRect(jx - 6, y - 9, 2, 8);
                    c.fillRect(jx + 4, y - 9, 2, 8);
                }
                c.fillStyle = skins[Math.floor(rnd() * skins.length)];
                c.beginPath();
                c.arc(jx, y - 6, 4, 0, Math.PI * 2);
                c.fill();
            }
        }
        this.tribBg = bg; this.tribA = la; this.tribB = lb;
    }

    draw(g) {
        const c = this.ctx;
        const W = this.W, H = this.H;
        c.setTransform(this.px, 0, 0, this.px, 0, 0);
        const cam = g.camX;
        const t = g.t;

        c.save();
        if (g.shake > 0) c.translate((Math.random() - 0.5) * g.shake * 10, (Math.random() - 0.5) * g.shake * 10);

        this.drawSky(c, cam, t);
        this.drawTribune(c, cam, t, g.cheer);
        this.drawBoards(c, cam);
        this.drawTrack(c, cam, g);

        // banen van achter naar voor
        for (let l = BRC.LANES - 1; l >= 0; l--) {
            const gy = this.baseY - l * BRC.LANE_H;
            const s = 1 - l * 0.055;
            for (const b of g.beams) {
                const sx = b.x - cam;
                if (sx > W + 20 || sx + b.w < -20 || b.down[l]) continue;
                for (const p of b.pieces) {
                    this.drawBeam(c, sx + p.dx * s, gy - (p.dy + p.h) * s, p.w * s, p.h * s, l);
                }
            }
            if (l === 0) this.drawPickups(c, g, cam, t);
            for (const d of g.debris) {
                if (d.lane !== l) continue;
                c.save();
                c.globalAlpha = Math.max(0, Math.min(1, d.life * 2));
                c.translate(d.x - cam + d.w * s / 2, gy - (d.y + d.h / 2) * s);
                c.rotate(d.rot);
                this.drawBeam(c, -d.w * s / 2, -d.h * s / 2, d.w * s, d.h * s, l);
                c.restore();
            }
            for (const r of g.runners) {
                if (r.lane !== l) continue;
                const sx = r.x - cam;
                if (sx < -60 || sx > W + 60) continue;
                // schaduw
                const sh = Math.max(0.35, 1 - r.y / 260);
                c.fillStyle = 'rgba(0,0,0,0.25)';
                c.beginPath();
                c.ellipse(sx, gy + 2, 15 * s * sh, 4 * s * sh, 0, 0, Math.PI * 2);
                c.fill();
                if (r.isPlayer) this.drawPlayerFx(c, g, r, sx, gy, t, false);
                this.drawRunner(c, r, sx, gy, s, t);
                if (r.isPlayer) this.drawPlayerFx(c, g, r, sx, gy, t, true);
            }
        }

        this.drawParticles(c, g, cam);
        c.restore();

        this.drawProgress(c, g);
    }

    drawSky(c, cam, t) {
        const g = c.createLinearGradient(0, 0, 0, this.tribTop + 20);
        g.addColorStop(0, '#29b6f6');
        g.addColorStop(1, '#b3e5fc');
        c.fillStyle = g;
        c.fillRect(-20, -20, this.W + 40, this.tribTop + 40);
        // wolken
        c.fillStyle = 'rgba(255,255,255,0.85)';
        const span = this.W + 400;
        for (let i = 0; i < 5; i++) {
            let x = (i * 290 + 80 - cam * 0.06 - t * 4) % span;
            if (x < 0) x += span;
            x -= 200;
            const y = 14 + ((i * 37) % 5) * Math.max(6, (this.tribTop - 60) / 6);
            c.beginPath();
            c.ellipse(x, y + 8, 46, 13, 0, 0, Math.PI * 2);
            c.ellipse(x - 20, y + 2, 22, 14, 0, 0, Math.PI * 2);
            c.ellipse(x + 16, y, 26, 17, 0, 0, Math.PI * 2);
            c.fill();
        }
        // lichtmasten
        const off = cam * 0.45;
        for (let wx = Math.floor(off / 420) * 420; wx < off + this.W + 60; wx += 420) {
            const x = wx - off + 60;
            c.fillStyle = '#546e7a';
            c.fillRect(x - 2, this.tribTop - 70, 4, 70);
            c.fillStyle = '#37474f';
            c.fillRect(x - 20, this.tribTop - 84, 40, 16);
            c.fillStyle = '#fff9c4';
            for (let k = 0; k < 4; k++) c.fillRect(x - 17 + k * 9, this.tribTop - 81, 6, 10);
        }
        // dakrand
        c.fillStyle = '#1c262b';
        c.fillRect(-20, this.tribTop - 8, this.W + 40, 10);
    }

    drawTribune(c, cam, t, cheer) {
        const TW = this.TW, TH = this.TH;
        const off = (cam * 0.6) % TW;
        const amp = 0.6 + cheer * 3.6;
        const sp = 5 + cheer * 7;
        const dyA = Math.sin(t * sp) * amp - amp;
        const dyB = Math.sin(t * sp + 2.1) * amp - amp;
        for (let x = -off; x < this.W + 20; x += TW) {
            c.drawImage(this.tribBg, x - 0.5, this.tribTop, TW + 1, TH + 8);
            c.drawImage(this.tribA, x, this.tribTop + dyA, TW, TH + 8);
            c.drawImage(this.tribB, x, this.tribTop + dyB, TW, TH + 8);
        }
    }

    drawBoards(c, cam) {
        const bw = 180;
        const y = this.boardTop, h = this.trackTop - this.boardTop;
        c.font = 'bold 13px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (let i = Math.floor(cam / bw); i * bw < cam + this.W + 20; i++) {
            const b = BR_BOARDS[((i % BR_BOARDS.length) + BR_BOARDS.length) % BR_BOARDS.length];
            const x = i * bw - cam;
            c.fillStyle = b[1];
            c.fillRect(x, y, bw, h);
            c.fillStyle = 'rgba(0,0,0,0.25)';
            c.fillRect(x + bw - 2, y, 2, h);
            c.fillRect(x, y + h - 3, bw, 3);
            c.fillStyle = b[1] === '#fdd835' ? '#333' : '#fff';
            c.fillText(b[0], x + bw / 2, y + h / 2 - 1);
        }
    }

    drawTrack(c, cam, g) {
        const W = this.W;
        // gras
        c.fillStyle = '#43a047';
        c.fillRect(-20, this.trackBot, W + 40, this.H - this.trackBot + 20);
        c.fillStyle = '#3b9340';
        for (let wx = Math.floor(cam / 240) * 240; wx < cam + W + 20; wx += 240) {
            if (Math.floor(wx / 240) % 2 === 0) c.fillRect(wx - cam, this.trackBot, 240, this.H - this.trackBot + 20);
        }
        // baan
        c.fillStyle = '#c9573c';
        c.fillRect(-20, this.trackTop, W + 40, this.trackBot - this.trackTop);
        c.fillStyle = 'rgba(0,0,0,0.06)';
        for (let l = 0; l < BRC.LANES; l += 2) c.fillRect(-20, this.trackBot - (l + 1) * BRC.LANE_H, W + 40, BRC.LANE_H);
        // 10 m-streepjes
        c.fillStyle = 'rgba(255,255,255,0.22)';
        const m10 = BRC.PXM * 10;
        for (let wx = Math.ceil((cam - 10) / m10) * m10; wx < cam + W + 10; wx += m10) {
            if (wx <= 0 || wx >= g.finishX) continue;
            c.fillRect(wx - cam - 1, this.trackTop, 2, this.trackBot - this.trackTop);
        }
        // baanlijnen
        c.fillStyle = 'rgba(255,255,255,0.85)';
        for (let l = 0; l <= BRC.LANES; l++) c.fillRect(-20, this.trackBot - l * BRC.LANE_H - 1, W + 40, 2);
        c.fillStyle = '#2e7d32';
        c.fillRect(-20, this.trackBot + 1, W + 40, 3);

        // afstandsbordjes
        const stepM = g.finishX / BRC.PXM <= 200 ? 25 : 50;
        const step = stepM * BRC.PXM;
        c.font = 'bold 11px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (let wx = Math.ceil((cam - 40) / step) * step; wx < cam + W + 40; wx += step) {
            if (wx <= 0 || wx >= g.finishX) continue;
            const x = wx - cam;
            c.fillStyle = '#fff';
            c.beginPath();
            c.roundRect(x - 22, this.trackBot + 5, 44, 15, 5);
            c.fill();
            c.fillStyle = '#c9573c';
            c.fillText(Math.round(wx / BRC.PXM) + ' m', x, this.trackBot + 13);
        }

        // startlijn
        let x = -cam;
        if (x > -20 && x < W + 20) {
            c.fillStyle = '#fff';
            c.fillRect(x + 14, this.trackTop, 6, this.trackBot - this.trackTop);
        }
        // finish
        x = g.finishX - cam;
        if (x > -120 && x < W + 120) {
            const th = this.trackBot - this.trackTop;
            const q = th / 20;
            for (let r = 0; r < 20; r++) {
                for (let k = 0; k < 2; k++) {
                    c.fillStyle = (r + k) % 2 === 0 ? '#fff' : '#212121';
                    c.fillRect(x + k * 8, this.trackTop + r * q, 8, q + 0.5);
                }
            }
            // vlag achter de baan
            c.fillStyle = '#eceff1';
            c.fillRect(x + 6, this.boardTop - 96, 4, 96);
            const fw = 64, fh = 40, fy = this.boardTop - 96;
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 5; j++) {
                    c.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#212121';
                    const wy = Math.sin(g.t * 5 + i * 0.7) * 3 * (i / 8);
                    c.fillRect(x + 10 + i * (fw / 8), fy + j * (fh / 5) + wy, fw / 8 + 0.5, fh / 5 + 0.5);
                }
            }
            c.fillStyle = '#e53935';
            c.beginPath();
            c.roundRect(x - 26, this.boardTop - 4, 70, 20, 5);
            c.fill();
            c.fillStyle = '#fff';
            c.font = 'bold 13px "Segoe UI", sans-serif';
            c.fillText('FINISH', x + 9, this.boardTop + 6);
        }
    }

    drawBeam(c, x, y, w, h, lane) {
        const upright = h > w * 1.25;
        const g = upright ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#cfd8dc');
        g.addColorStop(0.5, '#90a4ae');
        g.addColorStop(1, '#607d8b');
        c.fillStyle = g;
        c.fillRect(x, y, w, h);
        // lijf van de I-balk (donkerder) en flenzen
        c.fillStyle = 'rgba(38,50,56,0.38)';
        if (upright) {
            const f = Math.max(4, w * 0.2);
            c.fillRect(x + f, y, w - 2 * f, h);
            c.fillStyle = 'rgba(255,255,255,0.35)';
            c.fillRect(x, y, 2, h);
            c.fillStyle = '#455a64';
            for (let ry = y + 7; ry < y + h - 4; ry += 14) {
                c.beginPath(); c.arc(x + f / 2, ry, 1.4, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(x + w - f / 2, ry, 1.4, 0, Math.PI * 2); c.fill();
            }
        } else {
            const f = Math.max(4, h * 0.2);
            c.fillRect(x, y + f, w, h - 2 * f);
            c.fillStyle = 'rgba(255,255,255,0.4)';
            c.fillRect(x, y, w, 2);
            c.fillStyle = '#455a64';
            for (let rx = x + 7; rx < x + w - 4; rx += 14) {
                c.beginPath(); c.arc(rx, y + f / 2, 1.4, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(rx, y + h - f / 2, 1.4, 0, Math.PI * 2); c.fill();
            }
        }
        c.strokeStyle = '#37474f';
        c.lineWidth = 1.5;
        c.strokeRect(x, y, w, h);
        // balken in de banen erachter iets wegdrukken, zodat jouw eigen balk opvalt
        if (lane > 0) {
            c.fillStyle = 'rgba(150,66,46,' + Math.min(0.6, 0.2 + lane * 0.09) + ')';
            c.fillRect(x - 1, y - 1, w + 2, h + 2);
        }
    }

    drawPickups(c, g, cam, t) {
        const W = this.W;
        for (const k of g.coins) {
            if (k.got) continue;
            const sx = k.x - cam;
            if (sx < -20 || sx > W + 20) continue;
            const sy = this.baseY - k.h;
            const sq = Math.abs(Math.cos(t * 4 + k.x * 0.013)) * 0.75 + 0.25;
            c.fillStyle = '#f9a825';
            c.beginPath();
            c.ellipse(sx, sy, 10 * sq, 10, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#ffd54f';
            c.beginPath();
            c.ellipse(sx, sy, 7.5 * sq, 7.5, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = 'rgba(255,255,255,0.8)';
            c.beginPath();
            c.ellipse(sx - 2.5 * sq, sy - 3, 1.6 * sq, 3, 0, 0, Math.PI * 2);
            c.fill();
        }
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (const it of g.items) {
            if (it.got) continue;
            const sx = it.x - cam;
            if (sx < -40 || sx > W + 40) continue;
            const sy = this.baseY - it.h + Math.sin(t * 4 + it.x) * 4;
            const col = it.type === 'shield' ? '79,195,247' : it.type === 'magnet' ? '239,83,80' : '255,202,40';
            const rg = c.createRadialGradient(sx, sy, 6, sx, sy, 30);
            rg.addColorStop(0, 'rgba(' + col + ',0.9)');
            rg.addColorStop(1, 'rgba(' + col + ',0)');
            c.fillStyle = rg;
            c.beginPath();
            c.arc(sx, sy, 30 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = 'rgba(255,255,255,0.92)';
            c.beginPath();
            c.arc(sx, sy, 16, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = 'rgb(' + col + ')';
            c.lineWidth = 3;
            c.stroke();
            c.font = '18px serif';
            c.fillStyle = '#000';
            c.fillText(it.type === 'shield' ? '🛡️' : it.type === 'magnet' ? '🧲' : '⚡', sx, sy + 1);
        }
    }

    drawPlayerFx(c, g, r, sx, gy, t, front) {
        const cy = gy - r.y - 30;
        if (!front) {
            if (g.sprintT > 0) {
                // snelheidsstrepen
                c.lineCap = 'round';
                for (let i = 0; i < 6; i++) {
                    const yy = cy - 26 + i * 10 + Math.sin(t * 30 + i) * 2;
                    const len = 40 + ((i * 53 + Math.floor(t * 20) * 17) % 40);
                    c.strokeStyle = i % 2 ? 'rgba(255,202,40,0.8)' : 'rgba(255,255,255,0.7)';
                    c.lineWidth = 3;
                    c.beginPath();
                    c.moveTo(sx - 16, yy);
                    c.lineTo(sx - 16 - len, yy);
                    c.stroke();
                }
            }
            if (g.magnetT > 0) {
                for (let i = 0; i < 2; i++) {
                    const p = ((t * 1.2 + i * 0.5) % 1);
                    c.strokeStyle = 'rgba(239,83,80,' + (0.5 * p) + ')';
                    c.lineWidth = 2;
                    c.beginPath();
                    c.arc(sx, cy, 150 * (1 - p) + 20, 0, Math.PI * 2);
                    c.stroke();
                }
            }
            return;
        }
        if (g.shieldT > 0 && (g.shieldT > 2 || Math.floor(t * 8) % 2 === 0)) {
            c.fillStyle = 'rgba(79,195,247,0.2)';
            c.strokeStyle = 'rgba(129,212,250,0.95)';
            c.lineWidth = 3;
            c.beginPath();
            c.arc(sx, cy, 42 + Math.sin(t * 8) * 1.5, 0, Math.PI * 2);
            c.fill();
            c.stroke();
            c.strokeStyle = 'rgba(255,255,255,0.7)';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(sx, cy, 36, -2.2, -1.3);
            c.stroke();
        }
        if (g.state === 'countdown') {
            c.fillStyle = '#fff';
            c.font = 'bold 13px "Segoe UI", sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            const by = gy - 84 + Math.sin(t * 6) * 3;
            c.fillText('JIJ', sx, by - 10);
            c.beginPath();
            c.moveTo(sx - 7, by);
            c.lineTo(sx + 7, by);
            c.lineTo(sx, by + 9);
            c.fill();
        }
    }

    drawRunner(c, r, sx, gy, s, t) {
        c.save();
        c.translate(sx, gy - r.y * s);
        c.scale(s, s);
        let tilt = 0;
        const stumbling = r.stumbleT > 0;
        if (stumbling) {
            const p = 1 - r.stumbleT / r.stumbleDur;
            tilt = Math.sin(p * Math.PI) * 0.9;
        }
        c.rotate(tilt);
        const ph = r.phase;
        const air = r.air;
        const idle = !air && r.speedN < 0.05;
        const lean = idle ? 0.05 : air ? 0.12 : 0.1 + 0.16 * Math.min(1.3, r.speedN);
        const hipY = -27 - (air || idle ? 0 : Math.abs(Math.sin(ph)) * 2);
        const shX = Math.sin(lean) * 22, shY = hipY - Math.cos(lean) * 22;
        const skin = r.skin;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        const leg = (p, frontLeg) => {
            let ta, kb;
            if (air) { ta = frontLeg ? 1.05 : -0.45; kb = frontLeg ? 1.5 : 1.0; }
            else if (idle) { ta = frontLeg ? 0.14 : -0.14; kb = 0.05; }
            else { ta = Math.sin(p) * 0.85; kb = 0.2 + Math.max(0, Math.cos(p)) * 1.25; }
            const kx = Math.sin(ta) * 14, ky = hipY + Math.cos(ta) * 14;
            const sa = ta - kb;
            const fx = kx + Math.sin(sa) * 14, fy = ky + Math.cos(sa) * 14;
            c.strokeStyle = skin;
            c.lineWidth = 6;
            c.beginPath();
            c.moveTo(0, hipY); c.lineTo(kx, ky); c.lineTo(fx, fy);
            c.stroke();
            c.fillStyle = frontLeg ? '#fafafa' : '#cfd8dc';
            c.beginPath();
            c.ellipse(fx + 2.5, fy, 5.5, 3.2, sa * 0.4, 0, Math.PI * 2);
            c.fill();
        };
        const arm = (p, frontArm) => {
            let ua, fa;
            if (stumbling) { ua = frontArm ? 1.9 : 1.2; fa = ua + 0.3; }
            else if (air) { ua = frontArm ? 2.5 : -1.1; fa = ua + (frontArm ? 0.3 : 0.6); }
            else if (idle) { ua = frontArm ? 0.2 : -0.2; fa = ua + 0.5; }
            else { ua = Math.sin(p) * 0.95; fa = ua + 1.35; }
            const ex = shX + Math.sin(ua) * 10, ey = shY + 2 + Math.cos(ua) * 10;
            const hx = ex + Math.sin(fa) * 10, hy = ey + Math.cos(fa) * 10;
            c.strokeStyle = skin;
            c.lineWidth = 5;
            c.beginPath();
            c.moveTo(shX, shY + 2); c.lineTo(ex, ey); c.lineTo(hx, hy);
            c.stroke();
        };

        arm(ph, false);
        leg(ph + Math.PI, false);
        // broek
        c.fillStyle = r.shorts;
        c.beginPath();
        c.arc(0, hipY, 7.5, 0, Math.PI * 2);
        c.fill();
        // romp
        c.strokeStyle = r.color;
        c.lineWidth = 14;
        c.beginPath();
        c.moveTo(Math.sin(lean) * 5, hipY - 5); c.lineTo(shX, shY + 3);
        c.stroke();
        // rugnummer
        const nx = (Math.sin(lean) * 5 + shX) / 2, ny = (hipY - 5 + shY + 3) / 2;
        c.save();
        c.translate(nx, ny);
        c.rotate(lean);
        c.fillStyle = '#fff';
        c.beginPath();
        c.roundRect(-6, -5, 12, 10, 2);
        c.fill();
        c.fillStyle = '#111';
        c.font = 'bold 8px "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(r.number), 0, 0.5);
        c.restore();
        leg(ph, true);
        // hoofd
        const hx = shX + Math.sin(lean) * 12, hy = shY - Math.cos(lean) * 12 + 2;
        c.fillStyle = skin;
        c.beginPath();
        c.arc(hx, hy, 8.5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = r.hair;
        c.beginPath();
        c.arc(hx - 1, hy - 1.5, 8.6, Math.PI * 0.75, Math.PI * 1.85);
        c.closePath();
        c.fill();
        if (r.isPlayer) {
            // zweetbandje
            c.strokeStyle = '#fff';
            c.lineWidth = 2.2;
            c.beginPath();
            c.arc(hx, hy, 8.3, Math.PI * 1.12, Math.PI * 1.9);
            c.stroke();
        }
        c.fillStyle = '#222';
        if (stumbling) {
            c.font = 'bold 7px sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('x', hx + 4, hy);
        } else {
            c.beginPath();
            c.arc(hx + 4.2, hy - 0.5, 1.3, 0, Math.PI * 2);
            c.fill();
        }
        arm(ph + Math.PI, true);
        c.restore();

        if (stumbling) {
            c.font = (14 * s) + 'px serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            for (let i = 0; i < 3; i++) {
                const a = t * 7 + i * 2.1;
                c.fillText('⭐', sx + 18 * s + Math.cos(a) * 14 * s, gy - (r.y + 62) * s + Math.sin(a) * 5 * s);
            }
        }
    }

    drawParticles(c, g, cam) {
        for (const p of g.particles) {
            const a = Math.max(0, p.life / p.max);
            const x = p.x - cam;
            if (p.kind === 'dust') {
                c.fillStyle = 'rgba(236,214,190,' + (a * 0.7) + ')';
                c.beginPath();
                c.arc(x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2);
                c.fill();
            } else if (p.kind === 'spark') {
                c.fillStyle = p.color;
                c.globalAlpha = a;
                c.fillRect(x - p.r / 2, p.y - p.r / 2, p.r, p.r);
                c.globalAlpha = 1;
            } else if (p.kind === 'coin') {
                c.globalAlpha = Math.min(1, a * 2);
                c.fillStyle = '#ffd54f';
                c.beginPath();
                c.arc(x, p.y, 6, 0, Math.PI * 2);
                c.fill();
                c.strokeStyle = '#f9a825';
                c.lineWidth = 1.5;
                c.stroke();
                c.globalAlpha = 1;
            } else if (p.kind === 'ring') {
                c.strokeStyle = 'rgba(255,255,255,' + a + ')';
                c.lineWidth = 3;
                c.beginPath();
                c.ellipse(x, p.y, 10 + (1 - a) * 26, 3 + (1 - a) * 8, 0, 0, Math.PI * 2);
                c.stroke();
            } else if (p.kind === 'text') {
                c.globalAlpha = Math.min(1, a * 2);
                c.font = 'bold ' + p.r + 'px "Segoe UI", sans-serif';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.lineWidth = 4;
                c.strokeStyle = 'rgba(0,0,0,0.7)';
                c.strokeText(p.text, x, p.y);
                c.fillStyle = p.color;
                c.fillText(p.text, x, p.y);
                c.globalAlpha = 1;
            }
        }
    }

    // voortgangsbalk onderin: alle lopers op weg naar de finish
    drawProgress(c, g) {
        if (g.state === 'menu' || !g.runners.length) return;
        const w = Math.min(this.W - 60, 520);
        const x0 = (this.W - w) / 2 - 8;
        const y = this.H - 17;
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.beginPath();
        c.roundRect(x0 - 14, y - 11, w + 44, 22, 11);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.fillRect(x0, y - 1.5, w, 3);
        c.font = '15px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('🏁', x0 + w + 14, y + 1);
        const list = g.runners.slice().reverse();
        for (const r of list) {
            const p = Math.max(0, Math.min(1, r.x / g.finishX));
            const x = x0 + p * w;
            c.fillStyle = r.color;
            c.beginPath();
            c.arc(x, y, r.isPlayer ? 7.5 : 5, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = r.isPlayer ? '#fff' : 'rgba(0,0,0,0.5)';
            c.lineWidth = r.isPlayer ? 2.5 : 1;
            c.stroke();
        }
    }
}
