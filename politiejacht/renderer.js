// politiejacht/renderer.js - All canvas rendering
//
// The city is drawn in three layers:
//   1. ground  - cached per city cell (asphalt, markings, sidewalks, lots, parks)
//   2. things on the ground - skid marks, shadows, pedestrians, pickups, cars
//   3. volumes - buildings and tree canopies, projected from a camera above the
//      screen centre so they lean outwards and shift as you drive past

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

function _pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

function _canvas(w, h, scale) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale);
    cv.height = Math.ceil(h * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    return [cv, c];
}

const SIDEWALK = 10;
// How far a roof leans at the screen edge, per unit of building height
const HEIGHT_SCALE = 1.5;
// Shadow offset per unit of height (sun in the north-west)
const SUN_X = 0.8, SUN_Y = 1.0;

const BRICK = ['#b5694a', '#c98a5a', '#a8553f', '#d9b382', '#c7a07a', '#96604a', '#d6c3a1'];
const TILE = ['#cf6a3d', '#b4492f', '#8c4634', '#4d525c', '#6a4d44'];
const OFFICE = ['#ddd6c6', '#b9c6cf', '#e6d6b4', '#cdbba8', '#b2c0aa', '#d6bdb3'];
const GLASS = ['#4f8fb8', '#3f7f9f', '#4f9a94', '#6a86b8'];
const SHOP = ['#ecdcb4', '#f2e8d4', '#d9e4ea', '#f4d9c6'];
const SHED = ['#8f9aa5', '#a59c8c', '#7f95a8', '#b3a68b'];
const CONTAINER = ['#d9482b', '#2f7fc1', '#e0a526', '#3c9a5f', '#8a4fb0'];
const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1', '#e67e22', '#ff7eb6'];
const HAIR = ['#3b2a20', '#7a4a2a', '#d8b26a', '#1f1f1f', '#b8b8b8'];

// Painters for flat roofs. Each draws into a canvas of w x d pixels.
const ROOF = {
    base(c, w, d, color, parapet) {
        const g = c.createLinearGradient(0, 0, w, d);
        g.addColorStop(0, _shade(color, 0.16));
        g.addColorStop(1, _shade(color, -0.1));
        c.fillStyle = g;
        c.fillRect(0, 0, w, d);
        if (!parapet) return;
        c.strokeStyle = parapet;
        c.lineWidth = 3;
        c.strokeRect(1.5, 1.5, w - 3, d - 3);
        c.strokeStyle = 'rgba(0,0,0,0.22)';
        c.lineWidth = 1;
        c.strokeRect(3.5, 3.5, w - 7, d - 7);
        c.strokeStyle = 'rgba(255,255,255,0.4)';
        c.beginPath();
        c.moveTo(0.5, d); c.lineTo(0.5, 0.5); c.lineTo(w, 0.5);
        c.stroke();
    },
    unit(c, x, y, w, h, fan) {
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(x + 2, y + 2, w + 1, h + 1);
        c.fillStyle = '#b9bcc2';
        c.fillRect(x, y, w, h);
        c.fillStyle = '#e0e2e6';
        c.fillRect(x, y, w, 2);
        if (fan) {
            c.fillStyle = '#5c5f66';
            c.beginPath(); c.arc(x + w / 2, y + h / 2 + 1, Math.min(w, h) * 0.32, 0, Math.PI * 2); c.fill();
        }
    },
    ac(c, w, d, rand) {
        ROOF.unit(c, 10, 10, 18, 14, true);
        if (w > 70) ROOF.unit(c, 34, 12, 12, 10, true);
        if (w > 60 && d > 60) {
            c.fillStyle = 'rgba(170,220,255,0.75)';
            c.fillRect(w - 38, d - 32, 24, 18);
            c.strokeStyle = 'rgba(255,255,255,0.6)';
            c.lineWidth = 1;
            c.strokeRect(w - 38, d - 32, 24, 18);
            c.beginPath(); c.moveTo(w - 26, d - 32); c.lineTo(w - 26, d - 14); c.stroke();
        }
        if (d > 50) {
            c.fillStyle = '#6b6e75';
            c.beginPath(); c.arc(18, d - 18, 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#3e4046';
            c.beginPath(); c.arc(18, d - 18, 2.5, 0, Math.PI * 2); c.fill();
        }
    },
    green(c, w, d, rand) {
        c.fillStyle = '#6aa84f';
        c.fillRect(7, 7, w - 14, d - 14);
        for (let i = 0; i < w * d / 60; i++) {
            c.fillStyle = rand() < 0.5 ? 'rgba(255,255,180,0.14)' : 'rgba(0,50,0,0.16)';
            c.fillRect(7 + rand() * (w - 17), 7 + rand() * (d - 17), 3, 3);
        }
        c.fillStyle = '#d8ceb4';
        c.fillRect(7, d / 2 - 3, w - 14, 6);
        c.fillRect(w / 2 - 3, 7, 6, d - 14);
        for (let i = 0; i < 6; i++) {
            c.fillStyle = _pick(['#3f8a3a', '#57a047', '#e96a8a', '#f2cf45'], rand);
            c.beginPath();
            c.arc(12 + rand() * (w - 24), 12 + rand() * (d - 24), 3 + rand() * 2, 0, Math.PI * 2);
            c.fill();
        }
    },
    solar(c, w, d, rand) {
        const cols = Math.max(1, Math.floor((w - 16) / 22)), rows = Math.max(1, Math.floor((d - 16) / 18));
        const pw = (w - 16 - (cols - 1) * 3) / cols, ph = (d - 16 - (rows - 1) * 3) / rows;
        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                if (rand() < 0.12) continue;
                const px = 8 + k * (pw + 3), py = 8 + r * (ph + 3);
                c.fillStyle = '#24407a';
                c.fillRect(px, py, pw, ph);
                c.strokeStyle = 'rgba(150,190,255,0.45)';
                c.lineWidth = 0.7;
                c.beginPath();
                c.moveTo(px + pw / 2, py); c.lineTo(px + pw / 2, py + ph);
                c.moveTo(px, py + ph / 2); c.lineTo(px + pw, py + ph / 2);
                c.stroke();
                c.fillStyle = 'rgba(255,255,255,0.16)';
                c.fillRect(px, py, pw * 0.4, ph * 0.3);
            }
        }
    },
    corrugated(c, w, d) {
        c.fillStyle = 'rgba(0,0,0,0.11)';
        for (let k = 5; k < w - 5; k += 6) c.fillRect(k, 4, 3, d - 8);
        c.fillStyle = 'rgba(180,225,255,0.7)';
        for (let k = 0; k < 4; k++) c.fillRect(w * 0.14 + k * w * 0.2, d * 0.3, 9, d * 0.4);
    },
    helipad(c, w, d) {
        const r = Math.min(w, d) * 0.34;
        c.fillStyle = '#454952';
        c.beginPath(); c.arc(w / 2, d / 2, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#f5c531'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff';
        c.font = `bold ${Math.round(r * 1.2)}px sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('H', w / 2, d / 2 + 1);
    },
    antenna(c, w, d) {
        ROOF.unit(c, 8, 8, 14, 10, true);
        c.strokeStyle = '#d5d8dd'; c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(w / 2 - 9, d / 2); c.lineTo(w / 2 + 9, d / 2);
        c.moveTo(w / 2, d / 2 - 9); c.lineTo(w / 2, d / 2 + 9);
        c.stroke();
        c.fillStyle = '#8b9098';
        c.beginPath(); c.arc(w / 2, d / 2, 4, 0, Math.PI * 2); c.fill();
    },
    terrace(c, w, d, rand) {
        // Roof garden around a tower: planters and parasols
        c.fillStyle = '#5f9f4a';
        c.fillRect(7, 7, w - 14, 5);
        c.fillRect(7, d - 12, w - 14, 5);
        const cols = ['#e8534a', '#f5c531', '#4aa3e8', '#ffffff'];
        for (const [px, py] of [[11, d / 2], [w - 11, d / 2], [w / 2, 12], [w / 2, d - 12]]) {
            if (rand() < 0.3) continue;
            c.fillStyle = 'rgba(0,0,0,0.25)';
            c.beginPath(); c.arc(px + 1.5, py + 1.5, 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = _pick(cols, rand);
            c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.beginPath(); c.arc(px, py, 1.2, 0, Math.PI * 2); c.fill();
        }
    },
    awning(c, w, d, rand, color) {
        const horizontal = w >= d;
        c.fillStyle = color;
        c.fillRect(0, 0, w, d);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        if (horizontal) for (let k = 0; k < w; k += 12) c.fillRect(k, 0, 6, d);
        else for (let k = 0; k < d; k += 12) c.fillRect(0, k, w, 6);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        if (horizontal) c.fillRect(0, d - 2, w, 2); else c.fillRect(w - 2, 0, 2, d);
    },
    container(c, w, d) {
        c.fillStyle = 'rgba(0,0,0,0.16)';
        for (let k = 3; k < w - 2; k += 4) c.fillRect(k, 1, 1.4, d - 2);
        c.strokeStyle = 'rgba(255,255,255,0.3)';
        c.lineWidth = 1;
        c.strokeRect(0.5, 0.5, w - 1, d - 1);
    },
    chimney(c, w, d) {
        c.fillStyle = '#2b2422';
        c.beginPath(); c.arc(w / 2, d / 2, Math.min(w, d) * 0.3, 0, Math.PI * 2); c.fill();
    },
};

class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.sirenTick = 0;
        this.frame = 0;
        this.t = 0;
        this.lastNow = 0;
        this.tireMarks = [];
        this.cellCache = new Map();
        this.carState = new WeakMap();
        this.smoke = [];
        this.texts = [];
        this.shake = 0;
        this.flock = null;
        this.flockTimer = 4;
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({ u: Math.random(), v: Math.random(), s: 0.8 + Math.random() * 0.7 });
        }
        this.treeSprites = [0, 1, 2, 3].map(i => this._makeTreeSprite(i));
        this.cloudSprite = this._makeCloudSprite();
    }

    render() {
        const g = this.game;
        const ctx = this.ctx;
        const vw = g.viewW, vh = g.viewH;
        const dpr = window.devicePixelRatio || 1;

        const now = performance.now();
        const dt = g.state === 'paused' ? 0 : Math.min(0.05, this.lastNow ? (now - this.lastNow) / 1000 : 0);
        this.lastNow = now;
        this.t += dt;
        this.frame++;
        this._detectEvents();

        let shakeX = 0, shakeY = 0;
        if (this.shake > 0.3) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
            this.shake = Math.max(0, this.shake - dt * 28);
        }
        // Snap camera to device pixels so cached city tiles line up without seams
        const camX = Math.round((g.camera.x + shakeX) * dpr) / dpr;
        const camY = Math.round((g.camera.y + shakeY) * dpr) / dpr;

        // Projection for everything that has height
        this.pcx = camX + vw / 2;
        this.pcy = camY + vh / 2;
        this.pk = HEIGHT_SCALE / (Math.max(vw, vh) / 2);

        // Visible cells (a little extra to the north-west, where shadows come from)
        this.cx0 = Math.max(0, Math.floor((camX - 50) / CELL));
        this.cx1 = Math.min(GRID_N - 1, Math.floor((camX + vw) / CELL));
        this.cy0 = Math.max(0, Math.floor((camY - 50) / CELL));
        this.cy1 = Math.min(GRID_N - 1, Math.floor((camY + vh) / CELL));
        this.cacheMax = (this.cx1 - this.cx0 + 3) * (this.cy1 - this.cy0 + 3) * 2;
        this.cells = [];
        for (let cy = this.cy0; cy <= this.cy1; cy++) {
            for (let cx = this.cx0; cx <= this.cx1; cx++) this.cells.push(this._getCell(cx, cy));
        }

        ctx.clearRect(0, 0, vw, vh);
        ctx.save();
        ctx.translate(-camX, -camY);

        this.drawGround(camX, camY);
        this.drawTireMarks(camX, camY);
        this.drawShadows();
        this.drawPonds();
        this.drawOilSlicks();
        this.drawSpikeStrips();
        this.drawRoadblocks();
        this.drawPedestrians();
        this.drawJerrycans();
        this.drawPowerups();
        this.drawTraffic();
        this.drawParticles();
        this.drawPlayer();
        this.drawPolice();
        this.drawVolumes();
        this.drawSmoke(dt);
        this.drawSirenGlow();
        this.drawClouds(camX, camY);
        this.drawBirds(dt);
        this.drawTexts(dt);

        ctx.restore();

        this.drawFuelArrow();
        this.drawVignette();
        this.drawMinimap();
        this.drawWaveAnnouncement();
        this.sirenTick += 0.05;
    }

    // Height-aware projection: points higher up move away from the screen centre
    _px(x, z) { return this.pcx + (x - this.pcx) * (1 + z * this.pk); }
    _py(y, z) { return this.pcy + (y - this.pcy) * (1 + z * this.pk); }

    // Things the game does not tell us about: watch its state for changes
    _detectEvents() {
        const g = this.game;
        const p = g.player;
        if (!p) return;
        const ev = this._ev || (this._ev = { collected: g.collected, inv: 0, slow: 0, boost: 0, held: null, state: g.state });
        const say = (text, color) => this.texts.push({ x: p.x, y: p.y - 22 - this.texts.length * 18, text, color, life: 1.1 });
        if (g.collected > ev.collected) say('+' + FUEL_PICKUP, g.evMode ? '#7dffa8' : '#ffe14d');
        if (g.invincibleTimer > ev.inv + 0.5) this.shake = 7;
        if (g.playerSlow > ev.slow + 0.5) { this.shake = 9; say('-' + SPIKE_FUEL_PENALTY, '#ff6b5e'); }
        if (g.speedBoostTimer > ev.boost + 0.5) say('TURBO!', '#8fd3ff');
        if (g.heldPowerup && !ev.held) say('OLIE!', '#f0c070');
        if (g.state === 'gameover' && ev.state === 'playing') this.shake = 16;
        ev.collected = g.collected;
        ev.inv = g.invincibleTimer;
        ev.slow = g.playerSlow;
        ev.boost = g.speedBoostTimer;
        ev.held = g.heldPowerup;
        ev.state = g.state;
    }

    // --- Ground (cached per city cell) ---

    drawGround(camX, camY) {
        const g = this.game;
        const ctx = this.ctx;

        // Grass outside the city
        ctx.fillStyle = '#4c7a3d';
        ctx.fillRect(camX, camY, g.viewW, g.viewH);

        for (const cell of this.cells) {
            ctx.drawImage(cell.ground, cell.ox, cell.oy, CELL, CELL);
        }

        // City wall
        ctx.save();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#9a9da3';
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
            return hit;
        }
        const seed = cy * 131 + cx * 7 + 1;
        const cell = this._buildLayout(cx, cy, bldg, _rng(seed), dpr);
        cell.bldg = bldg;
        cell.dpr = dpr;
        const [canvas, c] = _canvas(CELL, CELL, dpr);
        this._paintGround(c, cx, cy, cell, _rng(seed + 977));
        cell.ground = canvas;
        this.cellCache.set(idx, cell);
        if (this.cellCache.size > (this.cacheMax || 60)) {
            this.cellCache.delete(this.cellCache.keys().next().value);
        }
        return cell;
    }

    // Decide what stands on a block. Coordinates of parts are in world space.
    _buildLayout(cx, cy, bldg, rand, dpr) {
        const ox = cx * CELL, oy = cy * CELL;
        const bx = ox + ROAD_W, by = oy + ROAD_W;
        const lx = bx + SIDEWALK, ly = by + SIDEWALK;
        const S = BLOCK_SIZE - SIDEWALK * 2;
        const cell = { ox, oy, groups: [], emitters: [], beacons: [], peds: [], trees: [], pond: null, lot: null };
        if (!bldg) return cell;

        const roof = (w, d, color, parapet, style, extra) => {
            const [cv, c] = _canvas(w, d, dpr);
            if (style === 'awning') ROOF.awning(c, w, d, rand, extra);
            else {
                ROOF.base(c, w, d, color, parapet);
                if (style) ROOF[style](c, w, d, rand);
            }
            return cv;
        };
        const box = (x, y, w, d, z0, z1, wall, win, roofCanvas) => ({
            k: 0, x, y, w, d, z0, z1, win, roof: roofCanvas,
            // north, south, west, east
            walls: [_shade(wall, 0.1), _shade(wall, -0.3), _shade(wall, -0.04), _shade(wall, -0.2)],
        });
        const group = (...parts) => {
            const b = parts[0];
            const g = { x: b.x + (b.w || 0) / 2, y: b.y + (b.d || 0) / 2, parts };
            cell.groups.push(g);
            return g;
        };
        const tree = (x, y, r, fade) => {
            cell.trees.push({ x: x - ox, y: y - oy, r });
            group({ k: 2, x, y, r, z: 5 + r * 0.55, sprite: Math.floor(rand() * 4), fade, phase: rand() * 6 });
        };

        if (bldg.isPark) {
            cell.lot = { kind: 'park' };
            for (const t of bldg.trees) tree(lx + t.x * S, ly + t.y * S, 10 + rand() * 4, true);
            if (bldg.hasPond) cell.pond = { x: lx + bldg.pondX * S, y: ly + bldg.pondY * S };
            return cell;
        }

        const type = bldg.type || 'standard';
        const dark = { color: 'rgba(38,52,72,0.9)', rows: 3, dash: [5, 4] };

        if (type === 'standard' && rand() < 0.6) {
            // Two rows of terraced houses with back gardens in between
            const horiz = rand() < 0.5;
            const brick = _pick(BRICK, rand), tile = _pick(TILE, rand);
            cell.lot = { kind: 'houses', horiz };
            for (const far of [0, 1]) {
                const o = far ? S - 45 : 3;
                const x = horiz ? lx + 3 : lx + o, y = horiz ? ly + o : ly + 3;
                const w = horiz ? S - 6 : 42, d = horiz ? 42 : S - 6;
                const solar = [];
                for (let u = 0; u < 5; u++) if (rand() < 0.3) solar.push(u);
                const chimneys = [];
                for (let u = 0; u < 5; u++) if (rand() < 0.5) chimneys.push((u + 0.3) / 5);
                group(
                    box(x, y, w, d, 0, 8, brick, { color: 'rgba(40,54,74,0.9)', rows: 2, dash: [4, 5] }, null),
                    { k: 1, x, y, w, d, z0: 8, z1: 16, axis: horiz ? 'x' : 'y', units: 5, solar, chimneys,
                      lit: _shade(tile, 0.12), shade: _shade(tile, -0.2), ridge: _shade(tile, 0.3),
                      gable: [_shade(brick, -0.04), _shade(brick, -0.2)] }
                );
                if (chimneys.length && rand() < 0.5) {
                    const u = chimneys[0];
                    cell.emitters.push(horiz ? { x: x + u * w, y: y + d / 2, z: 19, rate: 1.2 } : { x: x + w / 2, y: y + u * d, z: 19, rate: 1.2 });
                }
            }
        } else if (type === 'standard') {
            const wall = _pick(OFFICE, rand);
            const w = S - 10, z = 13 + Math.floor(rand() * 7);
            const green = rand() < 0.4;
            cell.lot = { kind: 'paved' };
            group(box(lx + 5, ly + 5, w, w, 0, z, wall, dark,
                roof(w, w, green ? '#8c8f96' : _shade(wall, -0.35), _shade(wall, 0.2), green ? 'green' : 'ac')));
        } else if (type === 'tall') {
            const glass = _pick(GLASS, rand);
            const win = { color: 'rgba(255,255,255,0.4)', rows: 5, dash: [3, 3] };
            const frame = _shade(glass, 0.45);
            cell.lot = { kind: 'plaza' };
            const parts = [box(lx + 6, ly + 6, S - 12, S - 12, 0, 16, glass, win, roof(S - 12, S - 12, '#8d929b', frame, 'terrace'))];
            const three = rand() < 0.6;
            const top = bldg.hasAntenna ? 'antenna' : 'helipad';
            parts.push(box(lx + 26, ly + 26, S - 52, S - 52, 16, 30, glass, win,
                roof(S - 52, S - 52, '#7c828c', frame, three ? null : top)));
            let zTop = 30;
            if (three) {
                parts.push(box(lx + 44, ly + 44, S - 88, S - 88, 30, 40, glass, win, roof(S - 88, S - 88, '#7c828c', frame, top)));
                zTop = 40;
            }
            group(...parts);
            if (bldg.hasAntenna) cell.beacons.push({ x: lx + S / 2, y: ly + S / 2, z: zTop + 8, zBase: zTop, phase: rand() });
        } else if (type === 'shop') {
            const wall = _pick(SHOP, rand);
            const w = S - 8;
            cell.lot = { kind: 'paved' };
            group(
                box(lx + 4, ly + 4, w, w, 0, 10, wall, { color: 'rgba(120,200,240,0.95)', rows: 1, dash: [15, 5] },
                    roof(w, w, _pick(['#b9bcc2', '#c9b9a3', '#a9b7c0'], rand), _shade(wall, 0.3), 'ac')),
                box(lx + 30, ly + S - 20, 80, 5, 10, 18, bldg.awningColor, null, roof(80, 5, bldg.awningColor, null, null))
            );
            group(box(lx + 10, ly + S - 4, S - 20, 11, 5, 5.5, bldg.awningColor, null, roof(S - 20, 11, null, null, 'awning', bldg.awningColor)));
            if (rand() < 0.5) {
                group(box(lx + S - 4, ly + 10, 11, S - 30, 5, 5.5, bldg.awningColor, null, roof(11, S - 30, null, null, 'awning', bldg.awningColor)));
            }
        } else if (type === 'apartment') {
            const wall = _pick(rand() < 0.5 ? OFFICE : BRICK, rand);
            const z = 19 + Math.floor(rand() * 6);
            const win = { color: 'rgba(38,52,72,0.9)', rows: 4, dash: [6, 4] };
            const top = () => rand() < 0.6 ? 'solar' : 'ac';
            const par = _shade(wall, 0.25), rc = _shade(wall, -0.4);
            if (rand() < 0.6) {
                cell.lot = { kind: 'court', yard: rand() < 0.5 ? 'play' : 'parking', x: 58, y: 58 };
                group(box(lx + 4, ly + 4, S - 8, 50, 0, z, wall, win, roof(S - 8, 50, rc, par, top())));
                group(box(lx + 4, ly + 54, 50, S - 58, 0, z, wall, win, roof(50, S - 58, rc, par, top())));
            } else {
                cell.lot = { kind: 'court', yard: 'garden', x: 0, y: 50 };
                group(box(lx + 4, ly + 4, S - 8, 46, 0, z, wall, win, roof(S - 8, 46, rc, par, top())));
                group(box(lx + 4, ly + S - 50, S - 8, 46, 0, z, wall, win, roof(S - 8, 46, rc, par, top())));
            }
        } else {
            // Warehouse with a yard full of containers and a smoking chimney
            const wall = _pick(SHED, rand);
            cell.lot = { kind: 'yard' };
            group(
                box(lx + 3, ly + 3, S - 6, 92, 0, 12, wall, { color: 'rgba(70,78,90,0.95)', rows: 1, dash: [22, 14] },
                    roof(S - 6, 92, _shade(wall, 0.1), _shade(wall, 0.35), 'corrugated')),
                box(lx + S - 30, ly + 12, 10, 10, 12, 32, '#b0553f', null, roof(10, 10, '#8a4030', null, 'chimney'))
            );
            cell.emitters.push({ x: lx + S - 25, y: ly + 17, z: 33, rate: 5 });
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 4; i++) {
                    if (rand() < 0.3) continue;
                    const col = _pick(CONTAINER, rand);
                    const stack = rand() < 0.3 ? 12 : 6;
                    group(box(lx + 5 + i * 33, ly + 102 + row * 18, 30, 12, 0, stack, col, null, roof(30, 12, col, null, 'container')));
                }
            }
        }

        if (type !== 'warehouse') {
            for (const [tx, ty] of [[bx + 5, by + 5], [bx + BLOCK_SIZE - 5, by + BLOCK_SIZE - 5], [bx + BLOCK_SIZE - 5, by + 5], [bx + 5, by + BLOCK_SIZE - 5]]) {
                if (rand() < 0.55) tree(tx, ty, 6 + rand() * 2, false);
            }
        }

        const n = rand() < 0.3 ? 0 : 1 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) {
            cell.peds.push({
                off: rand() * 600, speed: (10 + rand() * 9) * (rand() < 0.5 ? 1 : -1),
                shirt: _pick(SHIRTS, rand), hair: _pick(HAIR, rand), phase: rand() * 6,
            });
        }
        return cell;
    }

    _paintGround(c, cx, cy, cell, rand) {
        const R = ROAD_W, L = BLOCK_SIZE;
        const lastX = cx === GRID_N - 1, lastY = cy === GRID_N - 1;

        // Asphalt with subtle grain
        c.fillStyle = '#4a4d55';
        c.fillRect(0, 0, CELL, CELL);
        for (let i = 0; i < 260; i++) {
            const x = rand() * CELL, y = rand() * CELL;
            if (x > R && y > R) continue;
            c.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
            c.fillRect(x, y, 2, 2);
        }
        for (let i = 0; i < 2; i++) {
            c.fillStyle = 'rgba(0,0,0,0.06)';
            c.beginPath();
            const horiz = rand() < 0.5;
            const px = horiz ? R + rand() * (L - 30) : rand() * (R - 30);
            const py = horiz ? rand() * (R - 30) : R + rand() * (L - 30);
            c.ellipse(px + 15, py + 15, 10 + rand() * 14, 6 + rand() * 8, rand() * 3, 0, Math.PI * 2);
            c.fill();
        }

        // Red cycle lanes along the kerbs
        const xe = lastX ? CELL : CELL - 20, ye = lastY ? CELL : CELL - 20;
        c.fillStyle = '#b5553f';
        c.fillRect(R + 20, 1.5, xe - R - 20, 7);
        c.fillRect(R + 20, R - 8.5, xe - R - 20, 7);
        c.fillRect(1.5, R + 20, 7, ye - R - 20);
        c.fillRect(R - 8.5, R + 20, 7, ye - R - 20);
        c.strokeStyle = 'rgba(255,255,255,0.55)';
        c.lineWidth = 1;
        c.setLineDash([6, 6]);
        c.beginPath();
        c.moveTo(R + 20, 9.5); c.lineTo(xe, 9.5);
        c.moveTo(R + 20, R - 9.5); c.lineTo(xe, R - 9.5);
        c.moveTo(9.5, R + 20); c.lineTo(9.5, ye);
        c.moveTo(R - 9.5, R + 20); c.lineTo(R - 9.5, ye);
        c.stroke();
        c.setLineDash([]);

        // Manhole in the intersection
        c.fillStyle = '#34363b';
        c.beginPath();
        c.arc(R * 0.3, R * 0.7, 6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.1)';
        c.lineWidth = 1;
        c.stroke();

        // Crosswalks next to the intersection
        c.fillStyle = 'rgba(240,240,240,0.9)';
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
        c.fillStyle = 'rgba(240,240,240,0.75)';
        c.fillRect(R + 20, R / 2 + 2, 3, R / 2 - 13);
        c.fillRect(11, R + 20, R / 2 - 13, 3);

        // Dashed centre lines
        c.strokeStyle = '#f5c531';
        c.lineWidth = 2.5;
        c.setLineDash([14, 10]);
        c.beginPath();
        c.moveTo(R + 26, R / 2);
        c.lineTo(xe, R / 2);
        c.moveTo(R / 2, R + 26);
        c.lineTo(R / 2, ye);
        c.stroke();
        c.setLineDash([]);

        // Block: sidewalk ring with kerb
        const bx = R, by = R;
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(bx - 2, by - 2, L + 2, L + 2);
        c.fillStyle = '#c9c4b8';
        c.fillRect(bx, by, L, L);
        c.strokeStyle = 'rgba(0,0,0,0.1)';
        c.lineWidth = 1;
        c.beginPath();
        for (let t = 12; t < L; t += 12) {
            c.moveTo(bx + t, by); c.lineTo(bx + t, by + SIDEWALK);
            c.moveTo(bx + t, by + L - SIDEWALK); c.lineTo(bx + t, by + L);
            c.moveTo(bx, by + t); c.lineTo(bx + SIDEWALK, by + t);
            c.moveTo(bx + L - SIDEWALK, by + t); c.lineTo(bx + L, by + t);
        }
        c.stroke();
        c.fillStyle = '#ece8df';
        c.fillRect(bx, by, L, 2);
        c.fillRect(bx, by, 2, L);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(bx, by + L - 2, L, 2);
        c.fillRect(bx + L - 2, by, 2, L);

        const lot = cell.lot;
        if (!lot) return;
        const lx = bx + SIDEWALK, ly = by + SIDEWALK, S = L - SIDEWALK * 2;
        c.save();
        c.translate(lx, ly);
        c.beginPath();
        c.rect(0, 0, S, S);
        c.clip();
        if (lot.kind === 'park') this._paintPark(c, S, cell.bldg || this.game.buildings[cy * GRID_N + cx], rand);
        else if (lot.kind === 'houses') this._paintGardens(c, S, lot.horiz, rand);
        else if (lot.kind === 'court') this._paintCourt(c, S, lot, rand);
        else if (lot.kind === 'yard') {
            c.fillStyle = '#62656c';
            c.fillRect(0, 0, S, S);
            c.strokeStyle = 'rgba(245,197,49,0.7)';
            c.lineWidth = 1.5;
            c.strokeRect(3, 99, S - 6, 38);
            c.setLineDash([5, 5]);
            c.beginPath(); c.moveTo(3, 118); c.lineTo(S - 3, 118); c.stroke();
            c.setLineDash([]);
        } else {
            // Paved lot or plaza with a tile pattern and a few planters
            c.fillStyle = lot.kind === 'plaza' ? '#d6d0c2' : '#bdb7a8';
            c.fillRect(0, 0, S, S);
            c.strokeStyle = 'rgba(0,0,0,0.07)';
            c.lineWidth = 1;
            c.beginPath();
            for (let t = 0; t <= S; t += 7) { c.moveTo(t, 0); c.lineTo(t, S); c.moveTo(0, t); c.lineTo(S, t); }
            c.stroke();
            c.fillStyle = '#5f9f4a';
            for (const [px, py] of [[1, 1], [S - 5, 1], [1, S - 5], [S - 5, S - 5]]) c.fillRect(px, py, 4, 4);
        }
        c.restore();

        // Soft shadows under trees
        c.fillStyle = 'rgba(10,20,10,0.25)';
        for (const t of cell.trees) {
            c.beginPath();
            c.ellipse(t.x + t.r * 0.55, t.y + t.r * 0.65, t.r, t.r * 0.85, 0, 0, Math.PI * 2);
            c.fill();
        }
    }

    _paintGrass(c, x, y, w, h, rand, a, b) {
        const grad = c.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, a);
        grad.addColorStop(1, b);
        c.fillStyle = grad;
        c.fillRect(x, y, w, h);
        for (let i = 0; i < w * h / 110; i++) {
            c.fillStyle = rand() < 0.5 ? 'rgba(255,255,200,0.08)' : 'rgba(0,40,0,0.12)';
            c.fillRect(x + rand() * w, y + rand() * h, 2, 3);
        }
    }

    _paintPark(c, s, bldg, rand) {
        this._paintGrass(c, 0, 0, s, s, rand, '#63b04a', '#4c9a3d');
        // Curvy path
        c.strokeStyle = '#e2d2a4';
        c.lineWidth = 9;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(0, s * (0.2 + rand() * 0.6));
        c.bezierCurveTo(s * 0.35, s * rand(), s * 0.65, s * rand(), s, s * (0.2 + rand() * 0.6));
        c.stroke();
        c.strokeStyle = 'rgba(120,100,60,0.25)';
        c.lineWidth = 1;
        c.stroke();
        c.lineCap = 'butt';
        // Flowers
        const flowerColors = ['#ff6b8a', '#ffd93b', '#ffffff', '#c58bff'];
        for (let i = 0; i < 26; i++) {
            c.fillStyle = flowerColors[Math.floor(rand() * flowerColors.length)];
            c.beginPath();
            c.arc(rand() * s, rand() * s, 1.6, 0, Math.PI * 2);
            c.fill();
        }
        // Benches
        for (let i = 0; i < 2; i++) {
            const bx = 12 + rand() * (s - 36), by = 12 + rand() * (s - 24);
            c.fillStyle = 'rgba(0,0,0,0.2)';
            c.fillRect(bx + 1.5, by + 1.5, 13, 5);
            c.fillStyle = '#9a6a3c';
            c.fillRect(bx, by, 13, 5);
            c.fillStyle = '#c08a52';
            c.fillRect(bx, by, 13, 1.5);
        }
        if (bldg && bldg.hasPond) {
            const px = bldg.pondX * s, py = bldg.pondY * s;
            c.fillStyle = '#d6c796';
            c.beginPath();
            c.ellipse(px, py, 27, 19, 0.4, 0, Math.PI * 2);
            c.fill();
            const wg = c.createRadialGradient(px - 6, py - 4, 2, px, py, 24);
            wg.addColorStop(0, '#6fd0f5');
            wg.addColorStop(1, '#2380bd');
            c.fillStyle = wg;
            c.beginPath();
            c.ellipse(px, py, 22, 14, 0.4, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#4caf50';
            c.beginPath();
            c.arc(px + 11, py + 4, 3, 0.4, Math.PI * 2 - 0.2);
            c.fill();
            c.beginPath();
            c.arc(px - 13, py + 1, 2.2, 1.4, Math.PI * 2 + 0.8);
            c.fill();
        }
    }

    // Back gardens between two rows of houses. Drawn for rows running east-west;
    // for north-south rows the axes are swapped.
    _paintGardens(c, s, horiz, rand) {
        c.save();
        if (!horiz) c.transform(0, 1, 1, 0, 0, 0);
        this._paintGrass(c, 0, 0, s, s, rand, '#74b85a', '#5ea348');
        const uw = (s - 6) / 5;
        for (let row = 0; row < 2; row++) {
            const y0 = row ? s / 2 + 1 : 45, y1 = row ? s - 45 : s / 2 - 1;
            const nearHouse = row ? y1 : y0, dir = row ? -1 : 1;
            for (let u = 0; u < 5; u++) {
                const x0 = 3 + u * uw;
                // Terrace against the house
                c.fillStyle = _pick(['#cfc6b2', '#b8b0a0', '#d8c8a8'], rand);
                c.fillRect(x0 + 2, Math.min(nearHouse, nearHouse + dir * 8), uw - 4, 8);
                const mid = nearHouse + dir * 16;
                const what = rand();
                const gx = x0 + uw / 2;
                if (what < 0.22) {
                    // Trampoline
                    c.fillStyle = '#2a6fd0';
                    c.beginPath(); c.arc(gx, mid, 6.5, 0, Math.PI * 2); c.fill();
                    c.fillStyle = '#1c1f26';
                    c.beginPath(); c.arc(gx, mid, 4.8, 0, Math.PI * 2); c.fill();
                } else if (what < 0.4) {
                    // Paddling pool
                    c.fillStyle = '#f2f6f8';
                    c.beginPath(); c.arc(gx, mid, 6, 0, Math.PI * 2); c.fill();
                    c.fillStyle = '#58c4f0';
                    c.beginPath(); c.arc(gx, mid, 4.6, 0, Math.PI * 2); c.fill();
                } else if (what < 0.6) {
                    // Shed
                    c.fillStyle = 'rgba(0,0,0,0.22)';
                    c.fillRect(gx - 5, mid - 3, 13, 10);
                    c.fillStyle = '#7b5a3c';
                    c.fillRect(gx - 7, mid - 5, 13, 10);
                    c.fillStyle = '#93704c';
                    c.fillRect(gx - 7, mid - 5, 13, 5);
                } else if (what < 0.8) {
                    // Flower bed
                    c.fillStyle = '#6b4a30';
                    c.fillRect(x0 + 3, mid - 3, uw - 6, 6);
                    for (let i = 0; i < 6; i++) {
                        c.fillStyle = _pick(['#ff6b8a', '#ffd93b', '#ffffff', '#c58bff', '#ff8a3c'], rand);
                        c.beginPath(); c.arc(x0 + 5 + rand() * (uw - 10), mid - 1.5 + rand() * 3, 1.5, 0, Math.PI * 2); c.fill();
                    }
                } else {
                    // Bush
                    c.fillStyle = '#3f8a3a';
                    c.beginPath(); c.arc(gx - 3, mid, 4.5, 0, Math.PI * 2); c.arc(gx + 3, mid + 1, 3.5, 0, Math.PI * 2); c.fill();
                }
                // Fence between neighbours
                if (u > 0) {
                    c.fillStyle = '#8a6a48';
                    c.fillRect(x0 - 0.75, y0, 1.5, y1 - y0);
                }
            }
        }
        // Hedge along the back
        c.fillStyle = '#3c7f38';
        c.fillRect(3, s / 2 - 2, s - 6, 4);
        c.fillStyle = 'rgba(255,255,255,0.12)';
        c.fillRect(3, s / 2 - 2, s - 6, 1.5);
        c.restore();
    }

    _paintCourt(c, s, lot, rand) {
        if (lot.yard === 'parking') {
            c.fillStyle = '#676a72';
            c.fillRect(0, 0, s, s);
            const x0 = lot.x + 4, y0 = lot.y + 6;
            c.strokeStyle = 'rgba(255,255,255,0.7)';
            c.lineWidth = 1;
            for (let row = 0; row < 2; row++) {
                const y = y0 + row * 44;
                for (let i = 0; i <= 5; i++) {
                    c.beginPath(); c.moveTo(x0 + i * 15, y); c.lineTo(x0 + i * 15, y + 24); c.stroke();
                }
                for (let i = 0; i < 5; i++) {
                    if (rand() < 0.35) continue;
                    const col = _pick(TRAFFIC_COLORS, rand);
                    const px = x0 + i * 15 + 2.5, py = y + 2;
                    c.fillStyle = 'rgba(0,0,0,0.3)';
                    c.fillRect(px + 1.5, py + 1.5, 10, 20);
                    c.fillStyle = col;
                    c.beginPath();
                    c.roundRect(px, py, 10, 20, 3);
                    c.fill();
                    c.fillStyle = '#2b3a4d';
                    c.fillRect(px + 1.5, py + 4, 7, 4);
                    c.fillRect(px + 1.5, py + 14, 7, 3);
                    c.fillStyle = _shade(col, 0.25);
                    c.fillRect(px + 1.5, py + 8, 7, 6);
                }
            }
            return;
        }
        this._paintGrass(c, 0, 0, s, s, rand, '#74b85a', '#5ea348');
        if (lot.yard === 'play') {
            const x0 = lot.x + 6, y0 = lot.y + 6;
            // Sandpit
            c.fillStyle = '#b08a55';
            c.fillRect(x0 - 1, y0 - 1, 34, 30);
            c.fillStyle = '#f0d890';
            c.fillRect(x0 + 1, y0 + 1, 30, 26);
            c.fillStyle = '#e8534a';
            c.beginPath(); c.arc(x0 + 9, y0 + 9, 2.5, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#4aa3e8';
            c.beginPath(); c.arc(x0 + 21, y0 + 17, 2, 0, Math.PI * 2); c.fill();
            // Slide
            c.fillStyle = 'rgba(0,0,0,0.22)';
            c.fillRect(x0 + 44, y0 + 5, 9, 30);
            c.fillStyle = '#f5c531';
            c.fillRect(x0 + 42, y0 + 3, 9, 30);
            c.fillStyle = '#e8534a';
            c.fillRect(x0 + 41, y0 + 1, 11, 8);
            // Swing set
            c.fillStyle = '#4a4f58';
            c.fillRect(x0 + 2, y0 + 48, 40, 2.5);
            c.fillStyle = '#3f86d8';
            c.fillRect(x0 + 9, y0 + 52, 7, 4);
            c.fillStyle = '#e8534a';
            c.fillRect(x0 + 27, y0 + 44, 7, 4);
            // Rubber tiles
            c.fillStyle = 'rgba(200,90,60,0.5)';
            c.fillRect(x0 + 2, y0 + 40, 40, 20);
            c.fillStyle = '#4a4f58';
            c.fillRect(x0 + 2, y0 + 48, 40, 2.5);
        } else {
            // Shared garden with a path and flower beds
            c.fillStyle = '#e2d2a4';
            c.fillRect(0, s / 2 - 3, s, 6);
            for (let i = 0; i < 4; i++) {
                const fx = 14 + i * 34, fy = s / 2 + (i % 2 ? 13 : -13);
                c.fillStyle = '#6b4a30';
                c.beginPath(); c.ellipse(fx, fy, 10, 5, 0, 0, Math.PI * 2); c.fill();
                for (let k = 0; k < 7; k++) {
                    c.fillStyle = _pick(['#ff6b8a', '#ffd93b', '#ffffff', '#c58bff'], rand);
                    c.beginPath(); c.arc(fx - 7 + rand() * 14, fy - 2 + rand() * 4, 1.5, 0, Math.PI * 2); c.fill();
                }
            }
        }
    }

    _makeTreeSprite(i) {
        const R = 20, size = R * 2.4;
        const [cv, c] = _canvas(size, size, 2);
        const rand = _rng(i * 53 + 11);
        const hue = 92 + i * 11;
        const x = size / 2, y = size / 2;
        c.fillStyle = `hsl(${hue},48%,24%)`;
        c.beginPath();
        c.arc(x, y, R, 0, Math.PI * 2);
        c.fill();
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + rand();
            c.fillStyle = `hsl(${hue},50%,${32 + rand() * 7}%)`;
            c.beginPath();
            c.arc(x + Math.cos(a) * R * 0.42, y + Math.sin(a) * R * 0.42, R * 0.56, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = `hsla(${hue},58%,58%,0.6)`;
        c.beginPath();
        c.arc(x - R * 0.3, y - R * 0.3, R * 0.36, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = `hsla(${hue},60%,70%,0.35)`;
        c.beginPath();
        c.arc(x - R * 0.4, y - R * 0.42, R * 0.16, 0, Math.PI * 2);
        c.fill();
        return cv;
    }

    _makeCloudSprite() {
        const [cv, c] = _canvas(256, 256, 1);
        const rand = _rng(4242);
        for (let i = 0; i < 9; i++) {
            const x = 70 + rand() * 116, y = 90 + rand() * 76, r = 40 + rand() * 30;
            const g = c.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(10,20,45,0.5)');
            g.addColorStop(1, 'rgba(10,20,45,0)');
            c.fillStyle = g;
            c.fillRect(0, 0, 256, 256);
        }
        return cv;
    }

    // --- Ground-level life ---

    // One fill for all building shadows, so overlapping ones do not darken twice
    drawShadows() {
        const ctx = this.ctx;
        ctx.beginPath();
        for (const cell of this.cells) {
            for (const grp of cell.groups) {
                for (const b of grp.parts) {
                    if (b.k === 2) continue;
                    const dx = b.z1 * SUN_X, dy = b.z1 * SUN_Y;
                    const x1 = b.x + b.w, y1 = b.y + b.d;
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(x1, b.y);
                    ctx.lineTo(x1 + dx, b.y + dy);
                    ctx.lineTo(x1 + dx, y1 + dy);
                    ctx.lineTo(b.x + dx, y1 + dy);
                    ctx.lineTo(b.x, y1);
                    ctx.closePath();
                }
            }
        }
        ctx.fillStyle = 'rgba(10,18,40,0.3)';
        ctx.fill();
    }

    drawPonds() {
        const ctx = this.ctx;
        const t = this.t;
        for (const cell of this.cells) {
            const p = cell.pond;
            if (!p) continue;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(0.4);
            ctx.lineWidth = 1;
            for (let i = 0; i < 2; i++) {
                const f = (t * 0.35 + i * 0.5 + p.x * 0.01) % 1;
                ctx.strokeStyle = `rgba(255,255,255,${0.45 * (1 - f)})`;
                ctx.beginPath();
                ctx.ellipse(-4 + i * 9, -1 + i * 3, 2 + f * 9, 1.2 + f * 5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Two ducks doing laps
            for (let i = 0; i < 2; i++) {
                const a = t * (0.5 - i * 0.15) + i * 3 + p.y;
                const dx = Math.cos(a) * (11 - i * 4), dy = Math.sin(a) * (6 - i * 2);
                ctx.save();
                ctx.translate(dx, dy);
                ctx.rotate(a + Math.PI / 2);
                ctx.fillStyle = i ? '#8a5a34' : '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = i ? '#1f6b3a' : '#ffffff';
                ctx.beginPath(); ctx.arc(2.4, 0, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f5a623';
                ctx.fillRect(3.3, -0.5, 1.3, 1);
                ctx.restore();
            }
            ctx.restore();
        }
    }

    drawPedestrians() {
        const ctx = this.ctx;
        const t = this.t;
        const side = BLOCK_SIZE - 10;
        for (const cell of this.cells) {
            const bx = cell.ox + ROAD_W + 5, by = cell.oy + ROAD_W + 5;
            for (const ped of cell.peds) {
                const s = (((ped.off + ped.speed * t) % (side * 4)) + side * 4) % (side * 4);
                let x, y, a;
                if (s < side) { x = bx + s; y = by; a = 0; }
                else if (s < side * 2) { x = bx + side; y = by + s - side; a = Math.PI / 2; }
                else if (s < side * 3) { x = bx + side - (s - side * 2); y = by + side; a = Math.PI; }
                else { x = bx; y = by + side - (s - side * 3); a = -Math.PI / 2; }
                if (ped.speed < 0) a += Math.PI;
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2, 3, 2.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(a);
                const step = Math.sin(t * 9 + ped.phase) * 1.8;
                ctx.fillStyle = '#2f3542';
                ctx.fillRect(step - 1, -2.1, 2.2, 1.5);
                ctx.fillRect(-step - 1, 0.6, 2.2, 1.5);
                ctx.fillStyle = ped.shirt;
                ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = ped.hair;
                ctx.beginPath(); ctx.arc(0.3, 0, 1.9, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }
    }

    // --- Volumes: buildings and trees ---

    drawVolumes() {
        const pcx = this.pcx, pcy = this.pcy;
        const far = g => (g.x - pcx) * (g.x - pcx) + (g.y - pcy) * (g.y - pcy);
        for (const cell of this.cells) {
            // Farthest from the screen centre first: nearer volumes lean over them
            for (const grp of cell.groups) grp.far = far(grp);
            cell.groups.sort((a, b) => b.far - a.far);
            for (const grp of cell.groups) {
                for (const part of grp.parts) {
                    if (part.k === 0) this._drawBox(part);
                    else if (part.k === 1) this._drawGable(part);
                    else this._drawTree(part);
                }
            }
            for (const b of cell.beacons) this._drawBeacon(b);
        }
    }

    _drawBox(b) {
        const ctx = this.ctx;
        const pcx = this.pcx, pcy = this.pcy;
        const s0 = 1 + b.z0 * this.pk, s1 = 1 + b.z1 * this.pk;
        const ax0 = pcx + (b.x - pcx) * s0, ax1 = pcx + (b.x + b.w - pcx) * s0;
        const ay0 = pcy + (b.y - pcy) * s0, ay1 = pcy + (b.y + b.d - pcy) * s0;
        const bx0 = pcx + (b.x - pcx) * s1, bx1 = pcx + (b.x + b.w - pcx) * s1;
        const by0 = pcy + (b.y - pcy) * s1, by1 = pcy + (b.y + b.d - pcy) * s1;

        // Only the walls facing the screen centre are visible
        if (b.y > pcy) this._wall(ax0, ay0, ax1, ay0, bx1, by0, bx0, by0, b.walls[0], b.win);
        else if (b.y + b.d < pcy) this._wall(ax0, ay1, ax1, ay1, bx1, by1, bx0, by1, b.walls[1], b.win);
        if (b.x > pcx) this._wall(ax0, ay0, ax0, ay1, bx0, by1, bx0, by0, b.walls[2], b.win);
        else if (b.x + b.w < pcx) this._wall(ax1, ay0, ax1, ay1, bx1, by1, bx1, by0, b.walls[3], b.win);

        if (b.roof) ctx.drawImage(b.roof, bx0, by0, bx1 - bx0, by1 - by0);
    }

    // Wall from ground edge (a → b) up to roof edge (d → c), with rows of windows
    _wall(ax, ay, bx, by, cx, cy, dx, dy, color, win) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.fill();
        if (!win) return;
        const height = Math.hypot(dx - ax, dy - ay);
        if (height < 2.5) return;
        ctx.strokeStyle = win.color;
        ctx.lineWidth = Math.max(0.8, height / win.rows * 0.5);
        ctx.setLineDash(win.dash);
        ctx.beginPath();
        for (let i = 0; i < win.rows; i++) {
            const t = (i + 0.5) / win.rows;
            let x0 = ax + (dx - ax) * t, y0 = ay + (dy - ay) * t;
            let x1 = bx + (cx - bx) * t, y1 = by + (cy - by) * t;
            const len = Math.hypot(x1 - x0, y1 - y0) || 1;
            const ux = (x1 - x0) / len * 4, uy = (y1 - y0) / len * 4;
            ctx.moveTo(x0 + ux, y0 + uy);
            ctx.lineTo(x1 - ux, y1 - uy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Pitched roof on a row of houses. u runs along the ridge, v from eave (0) to ridge (1).
    _drawGable(r) {
        const ctx = this.ctx;
        const alongX = r.axis === 'x';
        const P = (u, v, side) => {
            const z = r.z0 + v * (r.z1 - r.z0);
            let x, y;
            if (alongX) {
                x = r.x + u * r.w;
                y = side ? r.y + r.d - v * r.d / 2 : r.y + v * r.d / 2;
            } else {
                x = side ? r.x + r.w - v * r.w / 2 : r.x + v * r.w / 2;
                y = r.y + u * r.d;
            }
            return [this._px(x, z), this._py(y, z)];
        };
        const poly = (pts, fill) => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.closePath();
            ctx.fill();
        };
        // End walls under the ridge
        poly([P(0, 0, 0), P(0, 0, 1), P(0, 1, 0)], r.gable[0]);
        poly([P(1, 0, 0), P(1, 0, 1), P(1, 1, 0)], r.gable[1]);

        for (const side of [0, 1]) {
            const a = P(0, 0, side), b = P(1, 0, side), c = P(1, 1, side), d = P(0, 1, side);
            poly([a, b, c, d], side ? r.shade : r.lit);
            // Rows of tiles and the seams between houses
            ctx.strokeStyle = 'rgba(0,0,0,0.13)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const v of [0.33, 0.66]) {
                const p = P(0, v, side), q = P(1, v, side);
                ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
            }
            for (let i = 1; i < r.units; i++) {
                const p = P(i / r.units, 0, side), q = P(i / r.units, 1, side);
                ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
            }
            ctx.stroke();
            if (side === 1) {
                for (const u of r.solar) {
                    const u0 = (u + 0.2) / r.units, u1 = (u + 0.8) / r.units;
                    poly([P(u0, 0.2, 1), P(u1, 0.2, 1), P(u1, 0.8, 1), P(u0, 0.8, 1)], '#24407a');
                    const p = P((u0 + u1) / 2, 0.2, 1), q = P((u0 + u1) / 2, 0.8, 1);
                    ctx.strokeStyle = 'rgba(150,190,255,0.5)';
                    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
                }
            }
        }
        // Ridge
        const r0 = P(0, 1, 0), r1 = P(1, 1, 0);
        ctx.strokeStyle = r.ridge;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
        // Chimneys
        for (const u of r.chimneys) {
            const x = alongX ? r.x + u * r.w : r.x + r.w / 2;
            const y = alongX ? r.y + r.d / 2 : r.y + u * r.d;
            const bx = this._px(x, r.z1), by = this._py(y, r.z1);
            const tx = this._px(x, r.z1 + 3), ty = this._py(y, r.z1 + 3);
            ctx.fillStyle = '#6e3f31';
            ctx.fillRect(Math.min(bx, tx) - 2.5, Math.min(by, ty) - 2.5, Math.abs(tx - bx) + 5, Math.abs(ty - by) + 5);
            ctx.fillStyle = '#a5604a';
            ctx.fillRect(tx - 2.5, ty - 2.5, 5, 5);
            ctx.fillStyle = '#2b2422';
            ctx.fillRect(tx - 1.2, ty - 1.2, 2.4, 2.4);
        }
    }

    _drawTree(tr) {
        const ctx = this.ctx;
        const sway = Math.sin(this.t * 1.4 + tr.phase) * 0.9;
        const tx = this._px(tr.x, tr.z) + sway, ty = this._py(tr.y, tr.z) + sway * 0.5;
        let alpha = 1;
        if (tr.fade) {
            // Do not hide the player or a pickup under a park tree
            const g = this.game;
            const near = (o, d) => Math.abs(o.x - tr.x) < d && Math.abs(o.y - tr.y) < d;
            if (g.player && near(g.player, tr.r + 20)) alpha = 0.4;
            else if (g.jerrycans.some(j => near(j, tr.r + 8)) || g.powerups.some(j => near(j, tr.r + 8))) alpha = 0.45;
        }
        ctx.strokeStyle = '#5b4026';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tr.x, tr.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        const size = tr.r * 2.4;
        if (alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(this.treeSprites[tr.sprite], tx - size / 2, ty - size / 2, size, size);
        ctx.globalAlpha = 1;
    }

    // Blinking aircraft warning light on top of a mast
    _drawBeacon(b) {
        const ctx = this.ctx;
        const x0 = this._px(b.x, b.zBase), y0 = this._py(b.y, b.zBase);
        const x = this._px(b.x, b.z), y = this._py(b.y, b.z);
        ctx.strokeStyle = '#d5d8dd';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        const on = (this.t * 0.9 + b.phase) % 1 < 0.45;
        if (on) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(x, y, 0, x, y, 12);
            grad.addColorStop(0, 'rgba(255,60,50,0.8)');
            grad.addColorStop(1, 'rgba(255,60,50,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = on ? '#ff5a4d' : '#8a2a24';
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // --- Sky: smoke, clouds, birds ---

    drawSmoke(dt) {
        const ctx = this.ctx;
        for (const cell of this.cells) {
            for (const e of cell.emitters) {
                if (Math.random() < e.rate * dt && this.smoke.length < 160) {
                    this.smoke.push({
                        x: e.x, y: e.y, z: e.z,
                        vx: 9 + Math.random() * 6, vy: -3 + Math.random() * 6, vz: 5 + Math.random() * 3,
                        life: 1, size: 2.5 + Math.random() * 2,
                    });
                }
            }
        }
        for (let i = this.smoke.length - 1; i >= 0; i--) {
            const s = this.smoke[i];
            s.life -= dt * 0.38;
            if (s.life <= 0) { this.smoke.splice(i, 1); continue; }
            s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
            ctx.fillStyle = `rgba(240,240,240,${s.life * 0.4})`;
            ctx.beginPath();
            ctx.arc(this._px(s.x, s.z), this._py(s.y, s.z), s.size * (1 + (1 - s.life) * 2.6), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Slow cloud shadows drifting over the city
    drawClouds(camX, camY) {
        const g = this.game;
        const ctx = this.ctx;
        const W = g.viewW + 800, H = g.viewH + 800;
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (const c of this.clouds) {
            const size = 520 * c.s;
            const sx = ((((c.u * W + this.t * 16 - camX) % W) + W) % W) - 400 - size / 2;
            const sy = ((((c.v * H + this.t * 7 - camY) % H) + H) % H) - 400 - size / 2;
            ctx.drawImage(this.cloudSprite, camX + sx, camY + sy, size, size * 0.8);
        }
        ctx.restore();
    }

    drawBirds(dt) {
        const g = this.game;
        const ctx = this.ctx;
        const reach = Math.max(g.viewW, g.viewH);
        if (!this.flock) {
            this.flockTimer -= dt;
            if (this.flockTimer > 0) return;
            const a = Math.random() * Math.PI * 2;
            const side = (Math.random() - 0.5) * reach * 0.5;
            this.flock = {
                x: this.pcx - Math.cos(a) * reach * 0.75 - Math.sin(a) * side,
                y: this.pcy - Math.sin(a) * reach * 0.75 + Math.cos(a) * side,
                a, n: 3 + Math.floor(Math.random() * 4),
            };
        }
        const f = this.flock;
        f.x += Math.cos(f.a) * 85 * dt;
        f.y += Math.sin(f.a) * 85 * dt;
        const dx = f.x - this.pcx, dy = f.y - this.pcy;
        if (Math.hypot(dx, dy) > reach * 0.85 && dx * Math.cos(f.a) + dy * Math.sin(f.a) > 0) {
            this.flock = null;
            this.flockTimer = 8 + Math.random() * 14;
            return;
        }
        const cos = Math.cos(f.a), sin = Math.sin(f.a);
        ctx.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
            // pass 0: shadows on the ground, pass 1: the birds high above
            ctx.strokeStyle = pass ? '#262a31' : 'rgba(10,18,40,0.22)';
            ctx.lineWidth = pass ? 1.8 : 2.2;
            ctx.beginPath();
            for (let i = 0; i < f.n; i++) {
                const row = Math.ceil(i / 2), sgn = i % 2 ? 1 : -1;
                const wx = f.x - cos * row * 13 - sin * sgn * row * 10;
                const wy = f.y - sin * row * 13 + cos * sgn * row * 10;
                const x = pass ? this._px(wx, 55) : wx + 40;
                const y = pass ? this._py(wy, 55) : wy + 50;
                const flap = Math.sin(this.t * 9 + i * 1.7) * 3.5;
                const span = pass ? 6 : 5;
                // Wings: two strokes from the body, tips moving back and forth
                ctx.moveTo(x - sin * span - cos * flap, y + cos * span - sin * flap);
                ctx.lineTo(x + cos * 2, y + sin * 2);
                ctx.lineTo(x + sin * span - cos * flap, y - cos * span - sin * flap);
            }
            ctx.stroke();
        }
        ctx.lineCap = 'butt';
    }

    drawTexts(dt) {
        const ctx = this.ctx;
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const tx = this.texts[i];
            tx.life -= dt;
            if (tx.life <= 0) { this.texts.splice(i, 1); continue; }
            tx.y -= 34 * dt;
            ctx.globalAlpha = Math.min(1, tx.life * 2.5);
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(15,20,35,0.85)';
            ctx.strokeText(tx.text, tx.x, tx.y);
            ctx.fillStyle = tx.color;
            ctx.fillText(tx.text, tx.x, tx.y);
        }
        ctx.globalAlpha = 1;
    }

    // --- Entities ---

    drawPlayer() {
        const p = this.game.player;
        if (!p) return;
        const ctx = this.ctx;

        // Speed boost glow
        if (this.game.speedBoostTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(this.game.time * 10) * 0.1;
            const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 40);
            grad.addColorStop(0, '#b8e4ff');
            grad.addColorStop(1, 'rgba(93,173,226,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
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
        this._drawCar(p, playerColor, 'player', car.id);

        // Exhaust
        if (Math.abs(p.speed) > 20 && this.game.state === 'playing') {
            const ex = p.x - Math.cos(p.angle) * (p.w / 2 + 3);
            const ey = p.y - Math.sin(p.angle) * (p.h / 2 + 3);
            this.game.particles.push({
                x: ex + (Math.random() - 0.5) * 6,
                y: ey + (Math.random() - 0.5) * 6,
                vx: -Math.cos(p.angle) * 20 + (Math.random() - 0.5) * 15,
                vy: -Math.sin(p.angle) * 20 + (Math.random() - 0.5) * 15,
                life: 0.45, maxLife: 0.45,
                size: 3 + Math.random() * 3,
                color: this.game.evMode ? '120,210,255' : '170,170,170',
                smoke: true
            });
        }
    }

    drawPolice() {
        for (const cop of this.game.police) this._drawCar(cop, '#f4f6f8', 'police');
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
                const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 42);
                grad.addColorStop(0, `rgba(${col},0.6)`);
                grad.addColorStop(0.4, `rgba(${col},0.18)`);
                grad.addColorStop(1, `rgba(${col},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(gx, gy, 42, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    drawTraffic() {
        for (const npc of this.game.traffic) this._drawCar(npc, npc.color, 'traffic');
    }

    // Top-down car. Local space: +x = front, length w, width h.
    _drawCar(e, color, type, model) {
        const ctx = this.ctx;
        const { x, y, angle, w, h } = e;
        const hw = w / 2, hh = h / 2;

        // Steering and braking are derived from how the car moved since last frame
        let st = this.carState.get(e);
        if (!st) { st = { a: angle, s: e.speed || 0, steer: 0, brake: 0 }; this.carState.set(e, st); }
        const sp = e.speed || 0;
        let da = angle - st.a;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const steerTo = Math.max(-0.5, Math.min(0.5, da * 9 * (sp < 0 ? -1 : 1)));
        st.steer += (steerTo - st.steer) * 0.25;
        const braking = Math.abs(sp) < Math.abs(st.s) - 0.5 && Math.abs(sp) > 8;
        st.brake += ((braking ? 1 : 0) - st.brake) * 0.3;
        st.a = angle;
        st.s = sp;

        const taxi = type === 'traffic' && color === '#f4d03f';
        const van = type === 'traffic' && color === '#e6e6e6';

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Shadow (offset in world space towards bottom-right)
        ctx.save();
        ctx.rotate(-angle);
        ctx.translate(3, 4);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(10,18,40,0.35)';
        this._roundRect(-hw, -hh, w, h, h * 0.4);
        ctx.restore();

        // Wheels poking out; the front pair turns with the steering
        ctx.fillStyle = '#141414';
        const wl = w * 0.2, ww = 3.4;
        const rearX = -hw + w * 0.13;
        ctx.fillRect(rearX, -hh - 1.5, wl, ww);
        ctx.fillRect(rearX, hh - ww + 1.5, wl, ww);
        const frontX = hw - w * 0.13 - wl / 2;
        for (const sy of [-hh + 0.2, hh - 0.2]) {
            ctx.save();
            ctx.translate(frontX, sy);
            ctx.rotate(st.steer);
            ctx.fillRect(-wl / 2, -ww / 2, wl, ww);
            ctx.restore();
        }

        // Body with rounded-volume gradient across the width
        const bg = ctx.createLinearGradient(0, -hh, 0, hh);
        bg.addColorStop(0, _shade(color, -0.3));
        bg.addColorStop(0.3, _shade(color, 0.12));
        bg.addColorStop(0.5, _shade(color, 0.24));
        bg.addColorStop(0.7, _shade(color, 0.05));
        bg.addColorStop(1, _shade(color, -0.35));
        ctx.fillStyle = bg;
        this._roundRect(-hw, -hh, w, h, h * 0.4);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Bonnet crease and bumpers
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(hw * 0.5, -hh + 4); ctx.lineTo(hw - 3, -hh + 5.5);
        ctx.moveTo(hw * 0.5, hh - 4); ctx.lineTo(hw - 3, hh - 5.5);
        ctx.stroke();
        ctx.fillStyle = 'rgba(20,20,25,0.55)';
        ctx.fillRect(hw - 1.2, -hh + 5, 1.2, h - 10);
        ctx.fillRect(-hw, -hh + 6, 1, h - 12);

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
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.fillRect(-hw + 2, -2.8, w - 3, 2);
            ctx.fillRect(-hw + 2, 0.8, w - 3, 2);
        }

        // Cabin: windshield, roof, rear window
        const cabF = hw * 0.42, cabR = -hw * 0.55;
        const glass = ctx.createLinearGradient(0, -hh, 0, hh);
        glass.addColorStop(0, '#1b2735');
        glass.addColorStop(0.5, '#456a8c');
        glass.addColorStop(1, '#1b2735');
        ctx.fillStyle = glass;
        ctx.beginPath(); // windshield (trapezoid, wide at front)
        ctx.moveTo(cabF, -hh + 2.5);
        ctx.lineTo(cabF, hh - 2.5);
        ctx.lineTo(cabF - w * 0.17, hh - 4);
        ctx.lineTo(cabF - w * 0.17, -hh + 4);
        ctx.closePath();
        ctx.fill();
        if (!van) {
            ctx.beginPath(); // rear window
            ctx.moveTo(cabR, -hh + 3);
            ctx.lineTo(cabR, hh - 3);
            ctx.lineTo(cabR + w * 0.12, hh - 4);
            ctx.lineTo(cabR + w * 0.12, -hh + 4);
            ctx.closePath();
            ctx.fill();
        }
        // Side windows
        ctx.fillStyle = '#1b2735';
        ctx.fillRect(cabR + w * 0.13, -hh + 2.6, cabF - w * 0.18 - cabR - w * 0.13, 1.3);
        ctx.fillRect(cabR + w * 0.13, hh - 3.9, cabF - w * 0.18 - cabR - w * 0.13, 1.3);
        // Reflection on windshield
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        ctx.beginPath();
        ctx.moveTo(cabF - 1, -hh + 4);
        ctx.lineTo(cabF - 1, -hh + 7);
        ctx.lineTo(cabF - w * 0.15, -hh + 9);
        ctx.lineTo(cabF - w * 0.15, -hh + 5.5);
        ctx.closePath();
        ctx.fill();

        // Roof panel
        const roofX = van ? -hw + 2.5 : cabR + w * 0.12;
        const roofW = (cabF - w * 0.17) - roofX;
        const rg = ctx.createLinearGradient(0, -hh, 0, hh);
        rg.addColorStop(0, _shade(color, -0.1));
        rg.addColorStop(0.5, _shade(color, 0.32));
        rg.addColorStop(1, _shade(color, -0.15));
        ctx.fillStyle = rg;
        this._roundRect(roofX, -hh + 3.9, roofW, h - 7.8, 2.5);

        if (taxi) {
            ctx.fillStyle = '#1c1c1c';
            ctx.fillRect(roofX + roofW / 2 - 2, -4.5, 4, 9);
            ctx.fillStyle = '#fff6b0';
            ctx.fillRect(roofX + roofW / 2 - 1.2, -3.5, 2.4, 7);
        }

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
        ctx.fillStyle = st.brake > 0.3 ? '#ff4a3a' : '#c81e26';
        ctx.fillRect(-hw, -hh + 2, 1.8, 4);
        ctx.fillRect(-hw, hh - 6, 1.8, 4);

        // Brake light glow
        if (st.brake > 0.05) {
            ctx.globalCompositeOperation = 'lighter';
            for (const sy of [-hh + 4, hh - 4]) {
                const grad = ctx.createRadialGradient(-hw, sy, 0, -hw, sy, 9);
                grad.addColorStop(0, `rgba(255,50,30,${0.75 * st.brake})`);
                grad.addColorStop(1, 'rgba(255,50,30,0)');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(-hw, sy, 9, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Headlight beams for the player
        if (type === 'player') {
            ctx.globalCompositeOperation = 'lighter';
            const beam = ctx.createLinearGradient(hw, 0, hw + 46, 0);
            beam.addColorStop(0, 'rgba(255,245,200,0.14)');
            beam.addColorStop(1, 'rgba(255,245,200,0)');
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(hw, -hh + 1);
            ctx.lineTo(hw + 46, -hh - 14);
            ctx.lineTo(hw + 46, hh + 14);
            ctx.lineTo(hw, hh - 1);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
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
            // Smoke swells as it fades, sparks shrink
            const scale = p.smoke ? 0.6 + (1 - alpha) * 1.3 : 0.4 + alpha * 0.6;
            ctx.fillStyle = `rgba(${p.color},${alpha * (p.smoke ? 0.4 : 0.7)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawTireMarks(camX, camY) {
        const ctx = this.ctx;
        const g = this.game;
        const x0 = camX - 20, y0 = camY - 20, x1 = camX + g.viewW + 20, y1 = camY + g.viewH + 20;
        const fade = g.state === 'playing' ? 0.0015 : 0;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = this.tireMarks.length - 1; i >= 0; i--) {
            const m = this.tireMarks[i];
            m.life -= fade;
            if (m.life <= 0) { this.tireMarks.splice(i, 1); continue; }
            if (m.x2 < x0 || m.x2 > x1 || m.y2 < y0 || m.y2 > y1) continue;
            ctx.strokeStyle = `rgba(18,18,20,${m.life * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(m.x1, m.y1);
            ctx.lineTo(m.x2, m.y2);
            ctx.stroke();
        }
        ctx.lineCap = 'butt';
        if (this.tireMarks.length > 700) {
            this.tireMarks.splice(0, this.tireMarks.length - 700);
        }
    }

    // Called by the game every frame the player is skidding
    addTireMarks(x, y, angle, w, h) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const dx = -w / 2 + 4, dy = h / 2 - 1;
        const lx = x + cos * dx + sin * dy, ly = y + sin * dx - cos * dy;
        const rx = x + cos * dx - sin * dy, ry = y + sin * dx + cos * dy;
        const last = this._lastSkid;
        if (last && this.frame - last.frame <= 2) {
            this.tireMarks.push({ x1: last.lx, y1: last.ly, x2: lx, y2: ly, life: 1 });
            this.tireMarks.push({ x1: last.rx, y1: last.ry, x2: rx, y2: ry, life: 1 });
        }
        this._lastSkid = { frame: this.frame, lx, ly, rx, ry };
    }

    // --- HUD Overlays ---

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
            this._vig = ctx.createRadialGradient(vw / 2, vh / 2, r * 0.6, vw / 2, vh / 2, r);
            this._vig.addColorStop(0, 'rgba(10,15,40,0)');
            this._vig.addColorStop(1, 'rgba(10,15,40,0.3)');
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

        // Speed boost: blue tint and streaks rushing past
        if (g.speedBoostTimer > 0 && g.state === 'playing') {
            ctx.fillStyle = 'rgba(93,173,226,0.06)';
            ctx.fillRect(0, 0, vw, vh);
            const a = g.player.angle + Math.PI;
            const cos = Math.cos(a), sin = Math.sin(a);
            const reach = Math.hypot(vw, vh) / 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i < 14; i++) {
                const side = (((i * 0.6180339) % 1) - 0.5) * 2 * reach;
                const along = (((this.t * 2.2 + i * 0.37) % 1) - 0.5) * 2 * reach;
                if (Math.abs(side) < 60) continue;
                const x = vw / 2 + cos * along - sin * side, y = vh / 2 + sin * along + cos * side;
                ctx.moveTo(x, y);
                ctx.lineTo(x + cos * 46, y + sin * 46);
            }
            ctx.stroke();
            ctx.lineCap = 'butt';
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