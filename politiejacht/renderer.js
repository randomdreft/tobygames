// politiejacht/renderer.js - All canvas rendering

// Small deterministic RNG so each city block looks the same every frame
function _rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

function _rgb(color) {
    if (color[0] === '#') {
        return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    }
    const m = color.match(/\d+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
}

// amt > 0 lightens towards white, amt < 0 darkens towards black
function _shade(color, amt) {
    const [r, g, b] = _rgb(color);
    const f = c => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const SIDEWALK = 10;
const LOT_PAD = 13;
const BUILDING_HEIGHT = { tall: 26, apartment: 19, standard: 15, shop: 11, warehouse: 11 };

class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.sirenTick = 0;
        this.tireMarks = [];
        this.cellCache = new Map();
    }

    render() {
        const g = this.game;
        const ctx = this.ctx;
        const vw = g.viewW, vh = g.viewH;
        const dpr = window.devicePixelRatio || 1;
        // Snap camera to device pixels so cached city tiles line up without seams
        const camX = Math.round(g.camera.x * dpr) / dpr;
        const camY = Math.round(g.camera.y * dpr) / dpr;

        ctx.clearRect(0, 0, vw, vh);
        ctx.save();
        ctx.translate(-camX, -camY);

        this.drawWorld(camX, camY);
        this.drawTireMarks();
        this.drawOilSlicks();
        this.drawSpikeStrips();
        this.drawRoadblocks();
        this.drawJerrycans();
        this.drawPowerups();
        this.drawTraffic();
        this.drawParticles();
        this.drawPlayer();
        this.drawPolice();
        this.drawSirenGlow();

        ctx.restore();

        this.drawFuelArrow();
        this.drawVignette();
        this.drawMinimap();
        this.drawWaveAnnouncement();
        this.sirenTick += 0.05;
    }

    // --- World (cached per city cell) ---

    drawWorld(camX, camY) {
        const g = this.game;
        const ctx = this.ctx;
        const vw = g.viewW, vh = g.viewH;

        // Grass outside the city
        ctx.fillStyle = '#26361f';
        ctx.fillRect(camX, camY, vw, vh);

        const cx0 = Math.max(0, Math.floor(camX / CELL));
        const cx1 = Math.min(GRID_N - 1, Math.floor((camX + vw) / CELL));
        const cy0 = Math.max(0, Math.floor(camY / CELL));
        const cy1 = Math.min(GRID_N - 1, Math.floor((camY + vh) / CELL));

        this.cacheMax = (cx1 - cx0 + 2) * (cy1 - cy0 + 2) * 2;
        for (let cy = cy0; cy <= cy1; cy++) {
            for (let cx = cx0; cx <= cx1; cx++) {
                ctx.drawImage(this._getCell(cx, cy), cx * CELL, cy * CELL, CELL, CELL);
            }
        }

        // City wall
        ctx.save();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#8a8d93';
        ctx.strokeRect(-4, -4, WORLD + 8, WORLD + 8);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#d63a2f';
        ctx.setLineDash([18, 18]);
        ctx.strokeRect(-4, -4, WORLD + 8, WORLD + 8);
        ctx.restore();
    }

    _getCell(cx, cy) {
        const idx = cy * GRID_N + cx;
        const bldg = this.game.buildings[idx];
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const hit = this.cellCache.get(idx);
        if (hit && hit.bldg === bldg && hit.dpr === dpr) {
            this.cellCache.delete(idx);
            this.cellCache.set(idx, hit);
            return hit.canvas;
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = Math.ceil(CELL * dpr);
        const c = canvas.getContext('2d');
        c.scale(dpr, dpr);
        this._paintCell(c, cx, cy, bldg);
        this.cellCache.set(idx, { bldg, dpr, canvas });
        if (this.cellCache.size > (this.cacheMax || 60)) {
            this.cellCache.delete(this.cellCache.keys().next().value);
        }
        return canvas;
    }

    _paintCell(c, cx, cy, bldg) {
        const rand = _rng(cy * 131 + cx * 7 + 1);
        const R = ROAD_W, L = BLOCK_SIZE;

        // Asphalt with subtle grain
        c.fillStyle = '#3b3d42';
        c.fillRect(0, 0, CELL, CELL);
        for (let i = 0; i < 260; i++) {
            const x = rand() * CELL, y = rand() * CELL;
            if (x > R && y > R) continue;
            c.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
            c.fillRect(x, y, 2, 2);
        }
        // A few darker asphalt patches
        for (let i = 0; i < 2; i++) {
            c.fillStyle = 'rgba(0,0,0,0.07)';
            c.beginPath();
            const horiz = rand() < 0.5;
            const px = horiz ? R + rand() * (L - 30) : rand() * (R - 30);
            const py = horiz ? rand() * (R - 30) : R + rand() * (L - 30);
            c.ellipse(px + 15, py + 15, 10 + rand() * 14, 6 + rand() * 8, rand() * 3, 0, Math.PI * 2);
            c.fill();
        }

        // Manhole in the intersection
        c.fillStyle = '#2c2e32';
        c.beginPath();
        c.arc(R * 0.3, R * 0.7, 6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.08)';
        c.lineWidth = 1;
        c.stroke();

        const lastX = cx === GRID_N - 1, lastY = cy === GRID_N - 1;

        // Crosswalks next to the intersection
        c.fillStyle = 'rgba(235,235,235,0.85)';
        const zebra = (x, y, horizontalRoad) => {
            for (let k = 6; k < R - 4; k += 9) {
                if (horizontalRoad) c.fillRect(x, y + k, 12, 5);
                else c.fillRect(x + k, y, 5, 12);
            }
        };
        zebra(R + 4, 0, true);
        zebra(0, R + 4, false);
        if (!lastX) zebra(CELL - 16, 0, true);
        if (!lastY) zebra(0, CELL - 16, false);

        // Stop lines
        c.fillStyle = 'rgba(235,235,235,0.7)';
        c.fillRect(R + 20, R / 2 + 2, 3, R / 2 - 6);
        c.fillRect(2, R + 20, R / 2 - 4, 3);

        // Dashed centre lines
        c.strokeStyle = '#f2c230';
        c.lineWidth = 2.5;
        c.setLineDash([14, 10]);
        c.beginPath();
        c.moveTo(R + 26, R / 2);
        c.lineTo(lastX ? CELL : CELL - 20, R / 2);
        c.moveTo(R / 2, R + 26);
        c.lineTo(R / 2, lastY ? CELL : CELL - 20);
        c.stroke();
        c.setLineDash([]);

        // Block: sidewalk ring with curb
        const lx = R, ly = R;
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(lx - 2, ly - 2, L + 2, L + 2);
        c.fillStyle = '#9a9ca2';
        c.fillRect(lx, ly, L, L);
        c.strokeStyle = 'rgba(0,0,0,0.12)';
        c.lineWidth = 1;
        c.beginPath();
        for (let t = 12; t < L; t += 12) {
            c.moveTo(lx + t, ly); c.lineTo(lx + t, ly + SIDEWALK);
            c.moveTo(lx + t, ly + L - SIDEWALK); c.lineTo(lx + t, ly + L);
            c.moveTo(lx, ly + t); c.lineTo(lx + SIDEWALK, ly + t);
            c.moveTo(lx + L - SIDEWALK, ly + t); c.lineTo(lx + L, ly + t);
        }
        c.stroke();
        c.fillStyle = '#c4c6cb';
        c.fillRect(lx, ly, L, 2);
        c.fillRect(lx, ly, 2, L);

        if (!bldg) return;
        if (bldg.isPark) {
            this._paintPark(c, lx + SIDEWALK, ly + SIDEWALK, L - SIDEWALK * 2, bldg, rand);
        } else {
            // Inner lot (paving / small yard)
            c.fillStyle = bldg.type === 'warehouse' ? '#55575c' : '#7d8a6a';
            c.fillRect(lx + SIDEWALK, ly + SIDEWALK, L - SIDEWALK * 2, L - SIDEWALK * 2);
            if (bldg.type !== 'warehouse') {
                // Street trees on the sidewalk
                for (const [tx, ty] of [[lx + 5, ly + 5], [lx + L - 5, ly + L - 5], [lx + L - 5, ly + 5], [lx + 5, ly + L - 5]]) {
                    if (rand() < 0.5) this._paintTree(c, tx, ty, 6 + rand() * 2, rand);
                }
            }
            this._paintBuilding(c, lx + LOT_PAD, ly + LOT_PAD, L - LOT_PAD * 2, bldg, rand);
        }
    }

    _paintPark(c, x, y, s, bldg, rand) {
        const grad = c.createLinearGradient(x, y, x + s, y + s);
        grad.addColorStop(0, '#4f9a3f');
        grad.addColorStop(1, '#3c7f33');
        c.fillStyle = grad;
        c.fillRect(x, y, s, s);
        // Grass texture
        for (let i = 0; i < 180; i++) {
            c.fillStyle = rand() < 0.5 ? 'rgba(255,255,200,0.07)' : 'rgba(0,40,0,0.12)';
            c.fillRect(x + rand() * s, y + rand() * s, 2, 3);
        }
        // Curvy path
        c.strokeStyle = '#d8c79a';
        c.lineWidth = 9;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y + s * (0.2 + rand() * 0.6));
        c.bezierCurveTo(x + s * 0.35, y + s * rand(), x + s * 0.65, y + s * rand(), x + s, y + s * (0.2 + rand() * 0.6));
        c.stroke();
        c.strokeStyle = 'rgba(120,100,60,0.25)';
        c.lineWidth = 1;
        c.stroke();
        c.lineCap = 'butt';
        // Flowers
        const flowerColors = ['#ff6b8a', '#ffd93b', '#ffffff', '#c58bff'];
        for (let i = 0; i < 18; i++) {
            c.fillStyle = flowerColors[Math.floor(rand() * flowerColors.length)];
            c.beginPath();
            c.arc(x + rand() * s, y + rand() * s, 1.6, 0, Math.PI * 2);
            c.fill();
        }
        // Pond
        if (bldg.hasPond) {
            const px = x + bldg.pondX * s, py = y + bldg.pondY * s;
            c.fillStyle = '#c9b98a';
            c.beginPath();
            c.ellipse(px, py, 26, 18, 0.4, 0, Math.PI * 2);
            c.fill();
            const wg = c.createRadialGradient(px - 6, py - 4, 2, px, py, 24);
            wg.addColorStop(0, '#5fc3f0');
            wg.addColorStop(1, '#1d6fa8');
            c.fillStyle = wg;
            c.beginPath();
            c.ellipse(px, py, 22, 14, 0.4, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.35)';
            c.lineWidth = 1.2;
            c.beginPath();
            c.ellipse(px - 4, py - 3, 9, 4, 0.4, Math.PI * 1.1, Math.PI * 1.7);
            c.stroke();
            c.fillStyle = '#4caf50';
            c.beginPath();
            c.arc(px + 9, py + 3, 3, 0.4, Math.PI * 2 - 0.2);
            c.fill();
        }
        // Trees (sorted so lower ones overlap upper ones)
        const trees = [...bldg.trees].sort((a, b) => a.y - b.y);
        for (const t of trees) this._paintTree(c, x + t.x * s, y + t.y * s, 10 + rand() * 4, rand);
    }

    _paintTree(c, x, y, r, rand) {
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.beginPath();
        c.ellipse(x + r * 0.45, y + r * 0.5, r, r * 0.85, 0, 0, Math.PI * 2);
        c.fill();
        const hue = 95 + rand() * 30;
        c.fillStyle = `hsl(${hue},45%,22%)`;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        // Lumpy canopy
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rand();
            c.fillStyle = `hsl(${hue},45%,${30 + rand() * 6}%)`;
            c.beginPath();
            c.arc(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, r * 0.55, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = `hsla(${hue},55%,55%,0.55)`;
        c.beginPath();
        c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        c.fill();
    }

    _paintBuilding(c, x, y, s, bldg, rand) {
        const type = bldg.type || 'standard';
        const H = BUILDING_HEIGHT[type] || 8;
        const base = bldg.color;
        const roof = bldg.roofColor;
        // Roof sits H px "above" the footprint: we see the south and east walls
        const rx = x, ry = y, rw = s - H * 0.6, rh = s - H;

        // Cast shadow
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath();
        c.moveTo(rx + rw, ry + 4);
        c.lineTo(rx + rw + H * 1.1, ry + 4 + H);
        c.lineTo(rx + rw + H * 1.1, ry + rh + H * 1.6);
        c.lineTo(rx + 4, ry + rh + H * 1.6);
        c.lineTo(rx + 4, ry + rh);
        c.closePath();
        c.fill();

        // East wall
        c.fillStyle = _shade(base, -0.35);
        c.beginPath();
        c.moveTo(rx + rw, ry);
        c.lineTo(rx + rw + H * 0.6, ry + H);
        c.lineTo(rx + rw + H * 0.6, ry + rh + H);
        c.lineTo(rx + rw, ry + rh);
        c.closePath();
        c.fill();
        // South wall
        c.fillStyle = _shade(base, -0.18);
        c.beginPath();
        c.moveTo(rx, ry + rh);
        c.lineTo(rx + rw, ry + rh);
        c.lineTo(rx + rw + H * 0.6, ry + rh + H);
        c.lineTo(rx + H * 0.6, ry + rh + H);
        c.closePath();
        c.fill();

        // Windows / doors on the south wall
        const lit = bldg.lit;
        if (type === 'warehouse') {
            c.fillStyle = '#4b4e54';
            const dw = rw * 0.28;
            for (const fx of [0.12, 0.55]) {
                const dx = rx + rw * fx + H * 0.3;
                c.fillRect(dx, ry + rh + 1, dw, H - 1);
                c.fillStyle = 'rgba(0,0,0,0.25)';
                for (let k = 2; k < H; k += 2) c.fillRect(dx, ry + rh + k, dw, 0.7);
                c.fillStyle = '#4b4e54';
            }
        } else if (type === 'shop') {
            c.fillStyle = lit ? '#fff4c8' : '#5b6b7d';
            c.fillRect(rx + 10 + H * 0.3, ry + rh + 1.5, rw - 20, H - 2.5);
        } else {
            const rows = Math.max(1, Math.floor(H / 5));
            for (let r = 0; r < rows; r++) {
                for (let wx = rx + 6; wx < rx + rw - 6; wx += 10) {
                    const on = lit && rand() < 0.75;
                    c.fillStyle = on ? '#ffe590' : '#4d5d72';
                    const oy = ry + rh + 1.5 + r * 5;
                    c.fillRect(wx + (oy - ry - rh) * 0.6, oy, 5, 3);
                }
            }
        }

        // Roof
        const rg = c.createLinearGradient(rx, ry, rx + rw, ry + rh);
        rg.addColorStop(0, _shade(roof, 0.18));
        rg.addColorStop(1, _shade(roof, -0.08));
        c.fillStyle = rg;
        c.fillRect(rx, ry, rw, rh);
        // Parapet
        c.strokeStyle = _shade(base, 0.15);
        c.lineWidth = 3;
        c.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);
        c.strokeStyle = 'rgba(0,0,0,0.2)';
        c.lineWidth = 1;
        c.strokeRect(rx + 3.5, ry + 3.5, rw - 7, rh - 7);

        if (type === 'tall') {
            // Setback tower on top
            const tx = rx + rw * 0.18, ty = ry + rh * 0.18, tw = rw * 0.6, th = rh * 0.6, h2 = 7;
            c.fillStyle = 'rgba(0,0,0,0.3)';
            c.fillRect(tx + 4, ty + 4, tw + h2, th + h2);
            c.fillStyle = _shade(base, -0.25);
            c.fillRect(tx, ty + th - h2, tw, h2);
            c.fillStyle = _shade(roof, 0.25);
            c.fillRect(tx, ty - h2, tw, th);
            c.strokeStyle = _shade(base, 0.25);
            c.lineWidth = 2;
            c.strokeRect(tx + 1, ty - h2 + 1, tw - 2, th - 2);
            if (bldg.hasAntenna) {
                const ax = tx + tw * 0.7, ay = ty - h2 + th * 0.3;
                c.strokeStyle = '#c9ccd2';
                c.lineWidth = 2;
                c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 8, ay + 8); c.stroke();
                c.fillStyle = '#ff3b30';
                c.beginPath(); c.arc(ax, ay, 2.5, 0, Math.PI * 2); c.fill();
            } else {
                // Helipad
                const hx = tx + tw / 2, hy = ty - h2 + th / 2, hr = Math.min(tw, th) * 0.32;
                c.fillStyle = '#3a3d44';
                c.beginPath(); c.arc(hx, hy, hr, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#f2c230'; c.lineWidth = 1.5; c.stroke();
                c.fillStyle = '#fff';
                c.font = `bold ${Math.round(hr)}px sans-serif`;
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText('H', hx, hy + 1);
            }
        } else if (type === 'apartment') {
            // Solar panels
            const cols = 3, rows = 2;
            const pw = (rw - 26) / cols, ph = (rh - 40) / rows;
            for (let r = 0; r < rows; r++) {
                for (let k = 0; k < cols; k++) {
                    const px = rx + 10 + k * (pw + 3), py = ry + 10 + r * (ph + 3);
                    c.fillStyle = '#23365c';
                    c.fillRect(px, py, pw, ph);
                    c.strokeStyle = 'rgba(140,180,255,0.35)';
                    c.lineWidth = 0.7;
                    c.beginPath();
                    for (let q = 1; q < 3; q++) { c.moveTo(px + pw * q / 3, py); c.lineTo(px + pw * q / 3, py + ph); }
                    c.moveTo(px, py + ph / 2); c.lineTo(px + pw, py + ph / 2);
                    c.stroke();
                    c.fillStyle = 'rgba(255,255,255,0.12)';
                    c.fillRect(px, py, pw * 0.4, ph * 0.3);
                }
            }
            this._paintRoofBox(c, rx + rw - 26, ry + rh - 24, 16, 12);
        } else if (type === 'warehouse') {
            // Corrugated roof + skylights
            c.fillStyle = 'rgba(0,0,0,0.12)';
            for (let k = rx + 5; k < rx + rw - 5; k += 6) c.fillRect(k, ry + 4, 3, rh - 8);
            c.fillStyle = 'rgba(190,225,255,0.55)';
            for (let k = 0; k < 3; k++) c.fillRect(rx + rw * 0.2 + k * rw * 0.22, ry + rh * 0.3, 8, rh * 0.4);
        } else if (type === 'shop') {
            // Rooftop unit + sign, awning over the sidewalk
            this._paintRoofBox(c, rx + 12, ry + 12, 20, 14);
            this._paintRoofBox(c, rx + rw - 30, ry + 14, 14, 10);
            c.fillStyle = bldg.awningColor;
            const ay = ry + rh + H, aw = rw - 8;
            c.fillRect(rx + 4 + H * 0.6, ay, aw, 9);
            c.fillStyle = 'rgba(255,255,255,0.45)';
            for (let k = 0; k < aw; k += 10) c.fillRect(rx + 4 + H * 0.6 + k, ay, 5, 9);
            c.fillStyle = 'rgba(0,0,0,0.25)';
            c.fillRect(rx + 4 + H * 0.6, ay + 9, aw, 2);
        } else {
            // Standard: AC units, vent, skylight
            this._paintRoofBox(c, rx + 12, ry + 12, 18, 14, true);
            this._paintRoofBox(c, rx + 36, ry + 14, 12, 10, true);
            c.fillStyle = 'rgba(190,225,255,0.5)';
            c.fillRect(rx + rw - 40, ry + rh - 34, 24, 18);
            c.strokeStyle = 'rgba(255,255,255,0.4)';
            c.lineWidth = 1;
            c.strokeRect(rx + rw - 40, ry + rh - 34, 24, 18);
            c.fillStyle = '#6b6e75';
            c.beginPath(); c.arc(rx + 20, ry + rh - 20, 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#3e4046';
            c.beginPath(); c.arc(rx + 20, ry + rh - 20, 2.5, 0, Math.PI * 2); c.fill();
        }
    }

    _paintRoofBox(c, x, y, w, h, fan) {
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(x + 2, y + 2, w + 1, h + 1);
        c.fillStyle = '#b4b7bd';
        c.fillRect(x, y, w, h);
        c.fillStyle = '#d6d8dc';
        c.fillRect(x, y, w, 2);
        if (fan) {
            c.fillStyle = '#5c5f66';
            c.beginPath(); c.arc(x + w / 2, y + h / 2 + 1, Math.min(w, h) * 0.32, 0, Math.PI * 2); c.fill();
        }
    }

    // --- Entities ---

    drawPlayer() {
        const p = this.game.player;
        if (!p) return;
        const ctx = this.ctx;

        // Speed boost glow
        if (this.game.speedBoostTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.25 + Math.sin(this.game.time * 10) * 0.1;
            const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 36);
            grad.addColorStop(0, '#9fd8ff');
            grad.addColorStop(1, 'rgba(93,173,226,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Slow effect indicator
        if (this.game.playerSlow > 0) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const car = CARS[this.game.selectedCar];
        const playerColor = car.color || (this.game.evMode ? '#2ecc71' : '#e74c3c');
        this._drawCar(p.x, p.y, p.angle, p.w, p.h, playerColor, 'player', car.id);

        // Exhaust
        if (Math.abs(p.speed) > 20) {
            const ex = p.x - Math.cos(p.angle) * (p.w / 2 + 3);
            const ey = p.y - Math.sin(p.angle) * (p.h / 2 + 3);
            this.game.particles.push({
                x: ex + (Math.random() - 0.5) * 6,
                y: ey + (Math.random() - 0.5) * 6,
                vx: -Math.cos(p.angle) * 20 + (Math.random() - 0.5) * 15,
                vy: -Math.sin(p.angle) * 20 + (Math.random() - 0.5) * 15,
                life: 0.4, maxLife: 0.4,
                size: 3 + Math.random() * 3,
                color: this.game.evMode ? '100,200,255' : '150,150,150'
            });
        }
    }

    drawPolice() {
        for (const cop of this.game.police) {
            this._drawCar(cop.x, cop.y, cop.angle, cop.w, cop.h, '#f4f6f8', 'police');
        }
    }

    // Additive light from the light bars, drawn over everything
    drawSirenGlow() {
        const ctx = this.ctx;
        const on = Math.sin(this.sirenTick * 8) > 0;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const cop of this.game.police) {
            const cos = Math.cos(cop.angle), sin = Math.sin(cop.angle);
            const side = cop.h * 0.3;
            for (const [s, col] of [[-1, on ? '255,40,40' : '40,90,255'], [1, on ? '40,90,255' : '255,40,40']]) {
                const gx = cop.x - cos * 1 - sin * s * side;
                const gy = cop.y - sin * 1 + cos * s * side;
                const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 30);
                grad.addColorStop(0, `rgba(${col},0.55)`);
                grad.addColorStop(1, `rgba(${col},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(gx, gy, 30, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    drawTraffic() {
        for (const npc of this.game.traffic) {
            this._drawCar(npc.x, npc.y, npc.angle, npc.w, npc.h, npc.color, 'traffic');
        }
    }

    // Top-down car. Local space: +x = front, length w, width h.
    _drawCar(x, y, angle, w, h, color, type, model) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const hw = w / 2, hh = h / 2;

        // Shadow (offset in world space towards bottom-right)
        ctx.save();
        ctx.rotate(-angle);
        ctx.translate(3, 4);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this._roundRect(-hw, -hh, w, h, h * 0.4);
        ctx.restore();

        // Wheels poking out
        ctx.fillStyle = '#141414';
        const wl = w * 0.2, ww = 3;
        for (const fx of [-hw + w * 0.13, hw - w * 0.13 - wl]) {
            ctx.fillRect(fx, -hh - 1.5, wl, ww);
            ctx.fillRect(fx, hh - ww + 1.5, wl, ww);
        }

        // Body with rounded-volume gradient across the width
        const bg = ctx.createLinearGradient(0, -hh, 0, hh);
        bg.addColorStop(0, _shade(color, -0.3));
        bg.addColorStop(0.3, _shade(color, 0.12));
        bg.addColorStop(0.5, _shade(color, 0.22));
        bg.addColorStop(0.7, _shade(color, 0.05));
        bg.addColorStop(1, _shade(color, -0.35));
        ctx.fillStyle = bg;
        this._roundRect(-hw, -hh, w, h, h * 0.4);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Police livery: Dutch-style blue + orange side stripes
        if (type === 'police') {
            ctx.fillStyle = '#1d4fb8';
            ctx.fillRect(-hw + 3, -hh + 0.5, w - 6, 3);
            ctx.fillRect(-hw + 3, hh - 3.5, w - 6, 3);
            ctx.fillStyle = '#ff7a1a';
            for (let k = -hw + 4; k < hw - 6; k += 6) {
                ctx.fillRect(k, -hh + 3.5, 3, 1.5);
                ctx.fillRect(k, hh - 5, 3, 1.5);
            }
        }

        // Player racing stripes
        if (type === 'player') {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(-hw + 2, -2.8, w - 3, 2);
            ctx.fillRect(-hw + 2, 0.8, w - 3, 2);
        }

        // Cabin: windshield, roof, rear window
        const cabF = hw * 0.42, cabR = -hw * 0.55;
        const glass = ctx.createLinearGradient(0, -hh, 0, hh);
        glass.addColorStop(0, '#1b2735');
        glass.addColorStop(0.5, '#3b5875');
        glass.addColorStop(1, '#1b2735');
        ctx.fillStyle = glass;
        ctx.beginPath(); // windshield (trapezoid, wide at front)
        ctx.moveTo(cabF, -hh + 2.5);
        ctx.lineTo(cabF, hh - 2.5);
        ctx.lineTo(cabF - w * 0.17, hh - 4);
        ctx.lineTo(cabF - w * 0.17, -hh + 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath(); // rear window
        ctx.moveTo(cabR, -hh + 3);
        ctx.lineTo(cabR, hh - 3);
        ctx.lineTo(cabR + w * 0.12, hh - 4);
        ctx.lineTo(cabR + w * 0.12, -hh + 4);
        ctx.closePath();
        ctx.fill();
        // Reflection on windshield
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.moveTo(cabF - 1, -hh + 4);
        ctx.lineTo(cabF - 1, -hh + 7);
        ctx.lineTo(cabF - w * 0.15, -hh + 9);
        ctx.lineTo(cabF - w * 0.15, -hh + 5.5);
        ctx.closePath();
        ctx.fill();

        // Roof panel
        const roofX = cabR + w * 0.12, roofW = (cabF - w * 0.17) - roofX;
        const rg = ctx.createLinearGradient(0, -hh, 0, hh);
        rg.addColorStop(0, _shade(color, -0.1));
        rg.addColorStop(0.5, _shade(color, 0.3));
        rg.addColorStop(1, _shade(color, -0.15));
        ctx.fillStyle = rg;
        this._roundRect(roofX, -hh + 3.5, roofW, h - 7, 2.5);

        if (type === 'police') {
            // Light bar across the roof
            const on = Math.sin(this.sirenTick * 8) > 0;
            const lbx = roofX + roofW * 0.35;
            ctx.fillStyle = '#222';
            ctx.fillRect(lbx - 0.5, -hh + 2.5, 5, h - 5);
            ctx.fillStyle = on ? '#ff3030' : '#7a1010';
            ctx.fillRect(lbx, -hh + 3, 4, hh - 3.5);
            ctx.fillStyle = on ? '#10206a' : '#3a7bff';
            ctx.fillRect(lbx, 0.5, 4, hh - 3.5);
            // "POLITIE" on the bonnet
            ctx.save();
            ctx.translate(hw * 0.72, 0);
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#1d4fb8';
            ctx.font = 'bold 4px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('POLITIE', 0, 0);
            ctx.restore();
        } else if (type === 'player') {
            if (model === 'racer') {
                // Rear spoiler
                ctx.fillStyle = _shade(color, -0.45);
                ctx.fillRect(-hw - 1, -hh - 1, 3.5, h + 2);
            } else if (model === 'suv' || model === 'tank') {
                // Roof rack
                ctx.strokeStyle = 'rgba(200,200,200,0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let k = 2; k < roofW - 1; k += 4) {
                    ctx.moveTo(roofX + k, -hh + 4.5);
                    ctx.lineTo(roofX + k, hh - 4.5);
                }
                ctx.stroke();
            }
            if (this.game.evMode) {
                // Small lightning bolt on the roof
                ctx.fillStyle = '#f9e79f';
                const lx = roofX + roofW / 2;
                ctx.beginPath();
                ctx.moveTo(lx + 3, -3); ctx.lineTo(lx - 1, 0.5); ctx.lineTo(lx + 1, 0.5);
                ctx.lineTo(lx - 3, 3.5); ctx.lineTo(lx + 2, -0.5); ctx.lineTo(lx, -0.5);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Mirrors
        ctx.fillStyle = _shade(color, -0.4);
        ctx.fillRect(cabF - 2, -hh - 2, 2.5, 2);
        ctx.fillRect(cabF - 2, hh, 2.5, 2);

        // Headlights & taillights
        ctx.fillStyle = '#fffbe0';
        ctx.beginPath();
        ctx.ellipse(hw - 1.5, -hh + 3.5, 1.6, 2.4, 0, 0, Math.PI * 2);
        ctx.ellipse(hw - 1.5, hh - 3.5, 1.6, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8202a';
        ctx.fillRect(-hw, -hh + 2, 1.8, 4);
        ctx.fillRect(-hw, hh - 6, 1.8, 4);

        ctx.restore();

        // Headlight beams for player (world space, additive)
        if (type === 'player') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.globalCompositeOperation = 'lighter';
            const beam = ctx.createLinearGradient(hw, 0, hw + 46, 0);
            beam.addColorStop(0, 'rgba(255,245,200,0.16)');
            beam.addColorStop(1, 'rgba(255,245,200,0)');
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(hw, -hh + 1);
            ctx.lineTo(hw + 46, -hh - 14);
            ctx.lineTo(hw + 46, hh + 14);
            ctx.lineTo(hw, hh - 1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // --- Pickups ---

    drawJerrycans() {
        const ctx = this.ctx;
        const g = this.game;
        const time = g.time;
        for (const j of g.jerrycans) {
            ctx.save();
            ctx.translate(j.x, j.y);
            const bob = Math.sin(time * 3 + j.x) * 3;

            // Ground shadow shrinks as the item bobs up
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 12, 9 - bob * 0.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing ring
            const pulse = (time * 0.8 + j.x * 0.01) % 1;
            ctx.strokeStyle = g.evMode ? `rgba(46,204,113,${0.6 * (1 - pulse)})` : `rgba(255,200,0,${0.6 * (1 - pulse)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 2, 10 + pulse * 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.translate(0, bob - 2);
            const glow = 0.22 + Math.sin(time * 4 + j.x) * 0.1;
            const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
            gg.addColorStop(0, g.evMode ? `rgba(46,204,113,${glow * 2})` : `rgba(255,210,0,${glow * 2})`);
            gg.addColorStop(1, 'rgba(255,210,0,0)');
            ctx.fillStyle = gg;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();

            if (g.evMode) {
                const bgr = ctx.createLinearGradient(-8, 0, 8, 0);
                bgr.addColorStop(0, '#1e8f4e');
                bgr.addColorStop(0.45, '#4be38b');
                bgr.addColorStop(1, '#1e8f4e');
                ctx.fillStyle = bgr;
                this._roundRect(-8, -10, 16, 20, 3);
                ctx.fillStyle = '#d0d4da';
                this._roundRect(-3.5, -13, 7, 4, 1);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(2, -6); ctx.lineTo(-3, 1); ctx.lineTo(1, 1);
                ctx.lineTo(-2, 7); ctx.lineTo(4, 0); ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                // Classic jerrycan: body, embossed X, handle, spout
                const jg = ctx.createLinearGradient(-8, 0, 8, 0);
                jg.addColorStop(0, '#a8231a');
                jg.addColorStop(0.4, '#ef4b3c');
                jg.addColorStop(1, '#9a1f17');
                ctx.fillStyle = jg;
                this._roundRect(-8, -9, 16, 20, 3);
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-5, -4); ctx.lineTo(5, 8);
                ctx.moveTo(5, -4); ctx.lineTo(-5, 8);
                ctx.stroke();
                ctx.fillStyle = '#7d1913';
                ctx.fillRect(-6, -13, 7, 3);
                ctx.fillStyle = '#f1c40f';
                this._roundRect(2.5, -14, 4, 5, 1.5);
            }
            ctx.restore();
        }
    }

    drawPowerups() {
        const ctx = this.ctx;
        const g = this.game;
        for (const pu of g.powerups) {
            ctx.save();
            ctx.translate(pu.x, pu.y);
            const bob = Math.sin(pu.time * 4) * 4;

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 14, 10 - bob * 0.4, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(0, bob);

            const glow = 0.3 + Math.sin(pu.time * 5) * 0.12;
            const col = pu.type === 'speed' ? '93,173,226' : '214,160,40';
            const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
            gg.addColorStop(0, `rgba(${col},${glow * 2})`);
            gg.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = gg;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();

            if (pu.type === 'speed') {
                const sg = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13);
                sg.addColorStop(0, '#7cc7ff');
                sg.addColorStop(1, '#1f5f9e');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#ffe766';
                ctx.beginPath();
                ctx.moveTo(3, -9); ctx.lineTo(-2, -1); ctx.lineTo(2, -1);
                ctx.lineTo(-3, 9); ctx.lineTo(4, 1); ctx.lineTo(0, 1);
                ctx.closePath();
                ctx.fill();
            } else {
                // Oil barrel
                const bg = ctx.createLinearGradient(-8, 0, 8, 0);
                bg.addColorStop(0, '#4a3112');
                bg.addColorStop(0.45, '#9a6a2c');
                bg.addColorStop(1, '#4a3112');
                ctx.fillStyle = bg;
                this._roundRect(-8, -10, 16, 20, 4);
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(-8, -5, 16, 1.5);
                ctx.fillRect(-8, 4, 16, 1.5);
                ctx.fillStyle = '#ffd34d';
                ctx.font = 'bold 7px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('OIL', 0, 0);
            }
            ctx.restore();
        }
    }

    // --- Hazards ---

    drawOilSlicks() {
        const ctx = this.ctx;
        for (const oil of this.game.oilSlicks) {
            ctx.save();
            ctx.translate(oil.x, oil.y);
            const alpha = Math.min(1, oil.life / 3) * 0.6;
            // Dark puddle
            ctx.fillStyle = `rgba(30,20,10,${alpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, oil.r, oil.r * 0.7, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Sheen
            ctx.fillStyle = `rgba(80,60,30,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(-2, -2, oil.r * 0.5, oil.r * 0.35, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawSpikeStrips() {
        const ctx = this.ctx;
        for (const sp of this.game.spikeStrips) {
            if (sp.hit) continue;
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.angle);

            // Yellow-black striped bar
            const hw = sp.w / 2, hh = sp.h / 2;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-hw, -hh, sp.w, sp.h);
            // Yellow stripes
            ctx.fillStyle = '#f1c40f';
            const stripeW = 6;
            for (let sx = -hw; sx < hw; sx += stripeW * 2) {
                ctx.fillRect(sx, -hh, stripeW, sp.h);
            }
            // Spikes (triangles along the top)
            ctx.fillStyle = '#888';
            for (let sx = -hw + 3; sx < hw - 3; sx += 7) {
                ctx.beginPath();
                ctx.moveTo(sx, -hh - 4);
                ctx.lineTo(sx + 3, -hh);
                ctx.lineTo(sx - 3, -hh);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }

    drawRoadblocks() {
        const ctx = this.ctx;
        for (const rb of this.game.roadblocks) {
            ctx.save();
            ctx.translate(rb.x, rb.y);

            // Fading when about to expire
            const fadeAlpha = Math.min(1, rb.life / 5);
            ctx.globalAlpha = fadeAlpha;

            // Orange-white striped barrier
            const w = rb.hw * 2, h = rb.hh * 2;
            ctx.fillStyle = '#d35400';
            this._roundRect(-rb.hw, -rb.hh, w, h, 2);
            // White stripes
            ctx.fillStyle = '#ecf0f1';
            const stripeW = 8;
            for (let sx = -rb.hw; sx < rb.hw; sx += stripeW * 2) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(-rb.hw, -rb.hh, w, h);
                ctx.clip();
                ctx.fillRect(sx, -rb.hh, stripeW, h);
                ctx.restore();
            }
            // Warning light
            const flash = Math.sin(this.sirenTick * 6) > 0;
            ctx.fillStyle = flash ? '#f39c12' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(-rb.hw + 5, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rb.hw - 5, 0, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    // --- Effects ---

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.game.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `rgba(${p.color},${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Effects ---

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.game.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `rgba(${p.color},${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawTireMarks() {
        const ctx = this.ctx;
        for (let i = this.tireMarks.length - 1; i >= 0; i--) {
            const m = this.tireMarks[i];
            m.life -= 0.002;
            if (m.life <= 0) { this.tireMarks.splice(i, 1); continue; }
            ctx.fillStyle = `rgba(15,15,15,${m.life * 0.35})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.tireMarks.length > 500) {
            this.tireMarks.splice(0, this.tireMarks.length - 500);
        }
    }

    addTireMarks(x, y, angle, w, h) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const offsets = [
            { dx: -w / 2 + 4, dy: -h / 2 },
            { dx: -w / 2 + 4, dy: h / 2 }
        ];
        for (const o of offsets) {
            this.tireMarks.push({
                x: x + cos * o.dx - sin * o.dy,
                y: y + sin * o.dx + cos * o.dy,
                life: 1
            });
        }
    }

    // --- HUD Overlays ---

    drawFuelArrow() {
        const g = this.game;
        if (g.state !== 'playing' || g.jerrycans.length === 0) return;
        const ctx = this.ctx;
        const p = g.player;
        const vw = g.viewW, vh = g.viewH;
        const cam = g.camera;
        const margin = 50;

        let nearest = null, nearDist = Infinity;
        for (const j of g.jerrycans) {
            const d = dist(p.x, p.y, j.x, j.y);
            if (d < nearDist) { nearDist = d; nearest = j; }
        }
        if (!nearest) return;

        const sx = nearest.x - cam.x;
        const sy = nearest.y - cam.y;
        if (sx > 30 && sx < vw - 30 && sy > 30 && sy < vh - 30) return;

        const cx = vw / 2, cy = vh / 2;
        const angle = Math.atan2(sy - cy, sx - cx);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const edgeX = clamp(cx + cos * (vw / 2 - margin), margin, vw - margin);
        const edgeY = clamp(cy + sin * (vh / 2 - margin), margin, vh - margin);

        const pulse = 0.6 + Math.sin(g.time * 5) * 0.2;
        const arrowColor = g.evMode ? `rgba(46,204,113,${pulse})` : `rgba(241,196,0,${pulse})`;

        ctx.save();
        ctx.translate(edgeX, edgeY);
        ctx.rotate(angle);

        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-8, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.rotate(-angle);
        const distM = Math.round(nearDist / 10);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.fillText(distM + 'm', 0, -16);

        ctx.restore();
    }

    drawVignette() {
        const ctx = this.ctx;
        const g = this.game;
        const vw = g.viewW, vh = g.viewH;

        // Soft permanent vignette for depth
        if (!this._vig || this._vigW !== vw || this._vigH !== vh) {
            const r = Math.hypot(vw, vh) / 2;
            this._vig = ctx.createRadialGradient(vw / 2, vh / 2, r * 0.55, vw / 2, vh / 2, r);
            this._vig.addColorStop(0, 'rgba(0,0,0,0)');
            this._vig.addColorStop(1, 'rgba(0,0,0,0.35)');
            this._vigW = vw; this._vigH = vh;
        }
        ctx.fillStyle = this._vig;
        ctx.fillRect(0, 0, vw, vh);

        // Red vignette: low fuel
        if (g.fuel < 25 && g.state === 'playing') {
            const intensity = (1 - g.fuel / 25) * (0.3 + Math.sin(g.time * 4) * 0.1);
            const grad = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.3, vw / 2, vh / 2, vw * 0.7);
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${intensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, vw, vh);
        }

        // Red/blue flash: police nearby
        if (g.state === 'playing' && g.police.length > 0) {
            let closest = Infinity;
            for (const c of g.police) {
                const d = dist(g.player.x, g.player.y, c.x, c.y);
                if (d < closest) closest = d;
            }
            if (closest < 150) {
                const on = Math.sin(this.sirenTick * 8) > 0;
                const flash = (1 - closest / 150) * 0.14;
                ctx.fillStyle = on ? `rgba(0,60,255,${flash})` : `rgba(255,0,30,${flash * 0.7})`;
                ctx.fillRect(0, 0, vw, vh);
            }
        }

        // Speed boost tint
        if (g.speedBoostTimer > 0 && g.state === 'playing') {
            ctx.fillStyle = 'rgba(93,173,226,0.06)';
            ctx.fillRect(0, 0, vw, vh);
        }

        // Slow tint
        if (g.playerSlow > 0 && g.state === 'playing') {
            ctx.fillStyle = `rgba(231,76,60,${0.08 * (g.playerSlow / SPIKE_SLOW_TIME)})`;
            ctx.fillRect(0, 0, vw, vh);
        }
    }

    drawMinimap() {
        const g = this.game;
        if (g.state !== 'playing') return;
        const ctx = this.ctx;
        const size = 120;
        const margin = 12;
        const mx = g.viewW - size - margin;
        const my = margin;
        const scale = size / WORLD;

        ctx.save();
        ctx.fillStyle = 'rgba(10,14,24,0.7)';
        this._roundRect(mx - 3, my - 3, size + 6, size + 6, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(mx, my, size, size);
        ctx.clip();

        // Roads
        ctx.fillStyle = 'rgba(120,124,132,0.75)';
        ctx.fillRect(mx, my, size, size);
        // Blocks
        const bs = BLOCK_SIZE * scale;
        for (let gy = 0; gy < GRID_N; gy++) {
            for (let gx = 0; gx < GRID_N; gx++) {
                const b = g.buildings[gy * GRID_N + gx];
                ctx.fillStyle = b && b.isPark ? '#3f7f36' : '#2a2f3a';
                ctx.fillRect(mx + (gx * CELL + ROAD_W) * scale, my + (gy * CELL + ROAD_W) * scale, bs, bs);
            }
        }

        // Viewport
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mx + g.camera.x * scale,
            my + g.camera.y * scale,
            g.viewW * scale,
            g.viewH * scale
        );

        const dot = (x, y, r, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(mx + x * scale, my + y * scale, r, 0, Math.PI * 2);
            ctx.fill();
        };

        ctx.fillStyle = '#d35400';
        for (const rb of g.roadblocks) {
            ctx.fillRect(mx + rb.x * scale - 2, my + rb.y * scale - 1, 4, 2);
        }
        for (const sp of g.spikeStrips) if (!sp.hit) dot(sp.x, sp.y, 1.5, '#f1c40f');
        for (const oil of g.oilSlicks) dot(oil.x, oil.y, 1.2, 'rgba(80,50,20,0.9)');
        for (const j of g.jerrycans) dot(j.x, j.y, 2, g.evMode ? '#2ecc71' : '#ffd000');
        for (const pu of g.powerups) dot(pu.x, pu.y, 2, '#00d4ff');
        for (const npc of g.traffic) dot(npc.x, npc.y, 1, 'rgba(220,220,220,0.7)');
        const on = Math.sin(this.sirenTick * 8) > 0;
        for (const c of g.police) dot(c.x, c.y, 2.5, on ? '#4f8bff' : '#ff4d4d');

        // Player
        dot(g.player.x, g.player.y, 4, 'rgba(255,255,255,0.9)');
        dot(g.player.x, g.player.y, 2.8, g.evMode ? '#2ecc71' : '#e74c3c');
        ctx.restore();
    }

    drawWaveAnnouncement() {
        const wa = this.game.waveAnnouncement;
        if (!wa) return;
        const ctx = this.ctx;
        const vw = this.game.viewW, vh = this.game.viewH;

        const fadeIn = Math.min(1, (2.5 - wa.timer) / 0.4);
        const fadeOut = Math.min(1, wa.timer / 0.4);
        const a = Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.globalAlpha = a;

        // Backdrop
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, vh * 0.32, vw, vh * 0.18);

        // Wave name
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(36, vw * 0.06)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(wa.name, vw / 2, vh * 0.38);

        // Subtitle
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#a0b0c0';
        ctx.font = `${Math.min(18, vw * 0.03)}px sans-serif`;
        ctx.fillText(wa.sub, vw / 2, vh * 0.44);

        ctx.restore();
    }

    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }
}
