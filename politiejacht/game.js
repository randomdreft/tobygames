// politiejacht/game.js - Core game logic

// === CONSTANTS ===
const ROAD_W = 80;
const BLOCK_SIZE = 160;
const CELL = ROAD_W + BLOCK_SIZE; // 240
const GRID_N = 14;
const WORLD = GRID_N * CELL; // 3360

const PLAYER_MAX_SPEED = 220;
const PLAYER_ACCEL = 280;
const PLAYER_BRAKE = 350;
const PLAYER_DECEL = 120;
const PLAYER_TURN = 2.8;

const FUEL_START = 60;
const FUEL_IDLE_DRAIN = 0.3;
const FUEL_MOVE_DRAIN = 3.0;
const FUEL_PICKUP = 22;

const BUILDING_COLORS = [
    '#7a6652', '#8d7b68', '#6b5b4f',
    '#6a7a8a', '#7b8a96', '#5a6a7a',
    '#8a7060', '#7a6a5a', '#6a5a4a',
    '#5a7a6a', '#6a8a7a', '#4a6a5a',
];

// NPC Traffic
const TRAFFIC_COUNT = 10;
const TRAFFIC_COLORS = [
    '#f4d03f', '#5dade2', '#eb984e', '#a569bd',
    '#58d68d', '#85929e', '#e6e6e6', '#d35400',
];

// Power-ups
const POWERUP_SPAWN_TIME = 20;
const SPEED_BOOST_DURATION = 5;
const SPEED_BOOST_MULT = 1.5;
const OIL_SLICK_LIFE = 15;

// Hazards
const SPIKE_START_TIME = 45;
const SPIKE_SPAWN_INTERVAL = 25;
const SPIKE_FUEL_PENALTY = 15;
const SPIKE_SLOW_TIME = 2.5;
const MAX_SPIKES = 3;

const ROADBLOCK_START_TIME = 75;
const ROADBLOCK_SPAWN_INTERVAL = 35;
const ROADBLOCK_LIFE = 30;
const MAX_ROADBLOCKS = 2;

// === HELPERS ===
let _buildings = null;
let _roadblocks = [];

function isRoad(x, y) {
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return false;
    const cx = ((x % CELL) + CELL) % CELL;
    const cy = ((y % CELL) + CELL) % CELL;
    if (cx < ROAD_W || cy < ROAD_W) return true;
    if (_buildings) {
        const gx = Math.floor(x / CELL);
        const gy = Math.floor(y / CELL);
        if (gx >= 0 && gx < GRID_N && gy >= 0 && gy < GRID_N) {
            const bldg = _buildings[gy * GRID_N + gx];
            if (bldg && bldg.isPark) return true;
        }
    }
    return false;
}

function isBlockedByBarrier(x, y, r) {
    for (const rb of _roadblocks) {
        const cx = clamp(x, rb.x - rb.hw, rb.x + rb.hw);
        const cy = clamp(y, rb.y - rb.hh, rb.y + rb.hh);
        if (dist(x, y, cx, cy) < r) return true;
    }
    return false;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function lerp(a, b, t) { return a + (b - a) * t; }

function nearestRoadCenter(x, y) {
    const cellX = Math.round(x / CELL);
    const cellY = Math.round(y / CELL);
    return { x: cellX * CELL + ROAD_W / 2, y: cellY * CELL + ROAD_W / 2 };
}

function canDrive(x, y, radius) {
    if (!isRoad(x, y)) return false;
    if (isBlockedByBarrier(x, y, radius)) return false;
    return isRoad(x + radius, y) && isRoad(x - radius, y)
        && isRoad(x, y + radius) && isRoad(x, y - radius);
}

// === GAME CLASS ===
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewW = 0;
        this.viewH = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.evMode = false;
        this.state = 'menu';
        this.fuel = FUEL_START;
        this.time = 0;
        this.collected = 0;

        this.player = null;
        this.police = [];
        this.jerrycans = [];
        this.particles = [];
        this.buildings = [];
        this.camera = { x: 0, y: 0 };

        // New entity arrays
        this.traffic = [];
        this.powerups = [];
        this.oilSlicks = [];
        this.spikeStrips = [];
        this.roadblocks = [];

        // Power-up state
        this.speedBoostTimer = 0;
        this.heldPowerup = null;
        this.playerSlow = 0;
        this.invincibleTimer = 0;

        // Spawn timers
        this.powerupTimer = 0;
        this.spikeTimer = 0;
        this.roadblockTimer = 0;

        this.keys = {};
        this.touch = { active: false, dx: 0, dy: 0 };
        this.joystickCenter = null;

        this.policeSpawnTimer = 0;
        this.jerrycanTimer = 0;
        this.countdownVal = 3;

        this.highScores = this.loadHighScores();
        this.sound = new SoundManager();
        this.renderer = new Renderer(this);

        this.lastTime = 0;

        this.generateWorld();
        this.setupInput();
        this.setupUI();

        requestAnimationFrame(t => this.loop(t));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.viewW = w;
        this.viewH = h;
    }

    generateWorld() {
        this.buildings = [];
        _buildings = this.buildings;
        for (let i = 0; i < GRID_N * GRID_N; i++) {
            const isPark = Math.random() < 0.12;
            if (isPark) {
                const trees = [];
                const n = 4 + Math.floor(Math.random() * 5);
                for (let t = 0; t < n; t++) {
                    trees.push({ x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7 });
                }
                this.buildings.push({ isPark: true, trees });
            } else {
                const base = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
                const r = parseInt(base.slice(1, 3), 16);
                const g = parseInt(base.slice(3, 5), 16);
                const b = parseInt(base.slice(5, 7), 16);
                const roofColor = `rgb(${Math.floor(r * 0.75)},${Math.floor(g * 0.75)},${Math.floor(b * 0.75)})`;
                this.buildings.push({
                    isPark: false,
                    color: base,
                    roofColor,
                    lit: Math.random() > 0.4
                });
            }
        }
    }

    setupInput() {
        document.addEventListener('keydown', e => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key] = true;

            if (e.key === 'Enter') {
                if (this.state === 'menu') this.startCountdown();
                else if (this.state === 'gameover') this.restart();
            }
            if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                if (this.state === 'playing') this.pause();
                else if (this.state === 'paused') this.unpause();
            }
            // Space: pause when no powerup held, deploy when holding oil
            if (e.key === ' ') {
                if (this.state === 'playing') {
                    if (this.heldPowerup) this.deployPowerup();
                    else this.pause();
                } else if (this.state === 'paused') {
                    this.unpause();
                }
            }
            // E key: deploy power-up
            if ((e.key === 'e' || e.key === 'E') && this.state === 'playing') {
                this.deployPowerup();
            }
        });
        document.addEventListener('keyup', e => { this.keys[e.key] = false; });

        // Touch: floating joystick
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'gameover') return;
            const t = e.touches[0];
            this.touch.active = true;
            this.joystickCenter = { x: t.clientX, y: t.clientY };
            this._showJoystick(t.clientX, t.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!this.touch.active || !this.joystickCenter) return;
            const t = e.touches[0];
            const dx = t.clientX - this.joystickCenter.x;
            const dy = t.clientY - this.joystickCenter.y;
            const maxR = 40;
            const d = Math.hypot(dx, dy);
            const limitD = Math.min(d, maxR);
            const nx = d > 0 ? dx / d : 0;
            const ny = d > 0 ? dy / d : 0;
            this.touch.dx = nx * (limitD / maxR);
            this.touch.dy = ny * (limitD / maxR);
            this._moveJoystickKnob(nx * limitD, ny * limitD);
        }, { passive: false });

        const endTouch = e => {
            this.touch.active = false;
            this.touch.dx = 0;
            this.touch.dy = 0;
            this.joystickCenter = null;
            this._hideJoystick();
        };
        this.canvas.addEventListener('touchend', endTouch);
        this.canvas.addEventListener('touchcancel', endTouch);
    }

    _showJoystick(cx, cy) {
        const base = document.getElementById('joystick-base');
        if (!base) return;
        base.style.display = 'block';
        base.style.left = (cx - 50) + 'px';
        base.style.top = (cy - 50) + 'px';
        const knob = document.getElementById('joystick-knob');
        knob.style.transform = 'translate(-50%, -50%)';
    }

    _moveJoystickKnob(dx, dy) {
        const knob = document.getElementById('joystick-knob');
        if (!knob) return;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    _hideJoystick() {
        const base = document.getElementById('joystick-base');
        if (base) base.style.display = 'none';
    }

    setupUI() {
        document.getElementById('mode-fuel').addEventListener('click', () => {
            this.evMode = false;
            document.getElementById('mode-fuel').classList.add('active');
            document.getElementById('mode-ev').classList.remove('active');
            this._updateModeLabels();
        });
        document.getElementById('mode-ev').addEventListener('click', () => {
            this.evMode = true;
            document.getElementById('mode-ev').classList.add('active');
            document.getElementById('mode-fuel').classList.remove('active');
            this._updateModeLabels();
        });

        document.getElementById('start-btn').addEventListener('click', () => this.startCountdown());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('resume-btn').addEventListener('click', () => this.unpause());

        const pBtn = document.getElementById('powerup-btn');
        if (pBtn) pBtn.addEventListener('click', () => this.deployPowerup());

        this._updateModeLabels();
        this.updateScoreboard();
    }

    _updateModeLabels() {
        document.getElementById('fuel-icon').textContent = this.evMode ? '\u{1F50B}' : '\u26FD';
    }

    // === GAME FLOW ===

    startCountdown() {
        this.sound.init();
        this.state = 'countdown';
        this.countdownVal = 3;
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'none';
        const cdEl = document.getElementById('countdown');
        const cdText = document.getElementById('countdown-text');
        cdEl.style.display = 'flex';

        this._resetState();

        let count = 3;
        cdText.textContent = count;
        this.sound.playCountdown();

        const iv = setInterval(() => {
            count--;
            if (count > 0) {
                cdText.textContent = count;
                this.sound.playCountdown();
            } else {
                cdText.textContent = 'GO!';
                this.sound.playGo();
                setTimeout(() => {
                    cdEl.style.display = 'none';
                    this.state = 'playing';
                    this.sound.startEngine();
                    this.sound.startSiren();
                }, 500);
                clearInterval(iv);
            }
        }, 800);
    }

    _resetState() {
        this.fuel = FUEL_START;
        this.time = 0;
        this.collected = 0;
        this.policeSpawnTimer = 0;
        this.jerrycanTimer = 0;
        this.powerupTimer = 0;
        this.spikeTimer = 0;
        this.roadblockTimer = 0;
        this.particles = [];
        this.renderer.tireMarks = [];

        // Power-up state
        this.speedBoostTimer = 0;
        this.heldPowerup = null;
        this.playerSlow = 0;
        this.invincibleTimer = 0;

        // Clear hazards
        this.oilSlicks = [];
        this.spikeStrips = [];
        this.roadblocks = [];
        _roadblocks = this.roadblocks;
        this.powerups = [];

        // Player start position
        const center = WORLD / 2;
        const startPos = nearestRoadCenter(center, center);
        this.player = {
            x: startPos.x, y: startPos.y,
            angle: 0, speed: 0,
            w: 40, h: 24, r: 14
        };

        // Initial police
        this.police = [];
        this._spawnPolice();

        // Initial jerrycans
        this.jerrycans = [];
        for (let i = 0; i < 5; i++) this._spawnJerrycan();

        // NPC traffic
        this.traffic = [];
        for (let i = 0; i < TRAFFIC_COUNT; i++) this._spawnTrafficCar();

        this._updateHUD();
    }

    // --- Spawning ---

    _spawnPolice() {
        const attempts = 30;
        for (let i = 0; i < attempts; i++) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            if (side === 0) { x = this.camera.x - 100; y = this.camera.y + Math.random() * this.viewH; }
            else if (side === 1) { x = this.camera.x + this.viewW + 100; y = this.camera.y + Math.random() * this.viewH; }
            else if (side === 2) { x = this.camera.x + Math.random() * this.viewW; y = this.camera.y - 100; }
            else { x = this.camera.x + Math.random() * this.viewW; y = this.camera.y + this.viewH + 100; }

            x = clamp(x, ROAD_W / 2, WORLD - ROAD_W / 2);
            y = clamp(y, ROAD_W / 2, WORLD - ROAD_W / 2);
            const snap = nearestRoadCenter(x, y);
            x = snap.x; y = snap.y;

            if (dist(x, y, this.player.x, this.player.y) < 300) continue;

            const angle = Math.atan2(this.player.y - y, this.player.x - x);
            this.police.push({
                x, y, angle,
                speed: 0,
                w: 42, h: 26,
                maxSpeed: 130 + this.police.length * 8,
                randomBias: (Math.random() - 0.5) * 60,
                chosenAngle: angle,
                spinning: 0
            });
            return;
        }
    }

    _spawnJerrycan() {
        for (let i = 0; i < 50; i++) {
            const x = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            const y = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            if (!isRoad(x, y)) continue;
            if (this.player && dist(x, y, this.player.x, this.player.y) < 200) continue;
            let tooClose = false;
            for (const j of this.jerrycans) {
                if (dist(x, y, j.x, j.y) < 100) { tooClose = true; break; }
            }
            if (tooClose) continue;
            this.jerrycans.push({ x, y });
            return;
        }
    }

    _spawnTrafficCar() {
        for (let a = 0; a < 50; a++) {
            const horiz = Math.random() < 0.5;
            let x, y, angle;
            if (horiz) {
                const cellY = Math.floor(Math.random() * GRID_N);
                const goingRight = Math.random() < 0.5;
                y = cellY * CELL + ROAD_W / 2 + (goingRight ? 15 : -15);
                x = ROAD_W + Math.random() * (WORLD - ROAD_W * 2);
                angle = goingRight ? 0 : Math.PI;
            } else {
                const cellX = Math.floor(Math.random() * GRID_N);
                const goingDown = Math.random() < 0.5;
                x = cellX * CELL + ROAD_W / 2 + (goingDown ? 15 : -15);
                y = ROAD_W + Math.random() * (WORLD - ROAD_W * 2);
                angle = goingDown ? Math.PI / 2 : -Math.PI / 2;
            }
            if (!isRoad(x, y)) continue;
            if (this.player && dist(x, y, this.player.x, this.player.y) < 250) continue;
            // Not too close to other traffic
            let tooClose = false;
            for (const t of this.traffic) {
                if (dist(x, y, t.x, t.y) < 80) { tooClose = true; break; }
            }
            if (tooClose) continue;

            const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
            this.traffic.push({
                x, y, angle,
                speed: 60 + Math.random() * 50,
                w: 36, h: 22, r: 12,
                color,
                maxSpeed: 60 + Math.random() * 50,
                chosenAngle: angle,
                decided: false,
                spinning: 0
            });
            return;
        }
    }

    _spawnPowerup() {
        for (let i = 0; i < 50; i++) {
            const x = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            const y = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            if (!isRoad(x, y)) continue;
            if (this.player && dist(x, y, this.player.x, this.player.y) < 200) continue;
            const type = Math.random() < 0.5 ? 'speed' : 'oil';
            this.powerups.push({ x, y, type, time: 0 });
            return;
        }
    }

    _spawnSpikeStrip() {
        for (let i = 0; i < 50; i++) {
            // Place on a road segment (not intersection)
            const cellX = Math.floor(Math.random() * GRID_N);
            const cellY = Math.floor(Math.random() * GRID_N);
            const horiz = Math.random() < 0.5;
            let x, y, angle;
            if (horiz) {
                x = cellX * CELL + ROAD_W + BLOCK_SIZE / 2;
                y = cellY * CELL + ROAD_W / 2;
                angle = 0;
            } else {
                x = cellX * CELL + ROAD_W / 2;
                y = cellY * CELL + ROAD_W + BLOCK_SIZE / 2;
                angle = Math.PI / 2;
            }
            if (!isRoad(x, y)) continue;
            if (this.player && dist(x, y, this.player.x, this.player.y) < 400) continue;
            // Not too close to other spikes
            let tooClose = false;
            for (const s of this.spikeStrips) {
                if (dist(x, y, s.x, s.y) < 200) { tooClose = true; break; }
            }
            if (tooClose) continue;
            this.spikeStrips.push({ x, y, angle, w: 50, h: 8, hit: false });
            return;
        }
    }

    _spawnRoadblock() {
        for (let i = 0; i < 50; i++) {
            // Place at an intersection
            const cellX = 1 + Math.floor(Math.random() * (GRID_N - 2));
            const cellY = 1 + Math.floor(Math.random() * (GRID_N - 2));
            const x = cellX * CELL + ROAD_W / 2;
            const y = cellY * CELL + ROAD_W / 2;
            if (this.player && dist(x, y, this.player.x, this.player.y) < 500) continue;
            // Not too close to other roadblocks
            let tooClose = false;
            for (const rb of this.roadblocks) {
                if (dist(x, y, rb.x, rb.y) < CELL * 2) { tooClose = true; break; }
            }
            if (tooClose) continue;
            // Create two barriers forming an L-shape that narrows the intersection
            const hw = 35, hh = 6;
            this.roadblocks.push({ x, y: y - 20, hw, hh, life: ROADBLOCK_LIFE, cx: cellX, cy: cellY });
            this.roadblocks.push({ x, y: y + 20, hw, hh, life: ROADBLOCK_LIFE, cx: cellX, cy: cellY });
            return;
        }
    }

    deployPowerup() {
        if (this.state !== 'playing') return;
        if (this.heldPowerup === 'oil') {
            this.heldPowerup = null;
            this.sound.playOilDeploy();
            // Drop oil puddles behind the car
            const p = this.player;
            for (let i = 0; i < 5; i++) {
                const offset = 25 + i * 22;
                this.oilSlicks.push({
                    x: p.x - Math.cos(p.angle) * offset + (Math.random() - 0.5) * 10,
                    y: p.y - Math.sin(p.angle) * offset + (Math.random() - 0.5) * 10,
                    life: OIL_SLICK_LIFE,
                    r: 12 + Math.random() * 5
                });
            }
            this._updatePowerupBtn();
        }
    }

    _updatePowerupBtn() {
        const btn = document.getElementById('powerup-btn');
        if (!btn) return;
        btn.style.display = this.heldPowerup ? 'flex' : 'none';
    }

    endGame(reason) {
        this.state = 'gameover';
        this.sound.stopAll();
        if (reason === 'caught') this.sound.playCrash();

        const score = Math.max(0, Math.round(this.fuel));
        this.saveScore(score);

        document.getElementById('gameover-title').textContent =
            reason === 'caught' ? '\u{1F4A5} Gepakt!' : (this.evMode ? '\u{1F50B} Batterij leeg!' : '\u26FD Tank leeg!');
        document.getElementById('gameover-reason').textContent =
            reason === 'caught'
                ? 'De politie heeft je te pakken!'
                : (this.evMode ? 'Je batterij is helemaal leeg...' : 'Je brandstoftank is leeg...');
        document.getElementById('score-value').textContent = score;

        // Stats line
        const statsEl = document.getElementById('gameover-stats');
        if (statsEl) {
            const timeStr = this._formatTime(this.time);
            statsEl.textContent = `${timeStr} gereden \u2022 ${this.collected} ${this.evMode ? '\u{1F50B}' : '\u26FD'} verzameld`;
        }

        document.getElementById('gameover-screen').style.display = 'flex';
        this._updatePowerupBtn();
        this.updateScoreboard();
    }

    restart() {
        document.getElementById('gameover-screen').style.display = 'none';
        this.startCountdown();
    }

    pause() {
        this.state = 'paused';
        this.sound.stopAll();
        document.getElementById('pause-screen').style.display = 'flex';
    }

    unpause() {
        this.state = 'playing';
        this.lastTime = 0;
        this.sound.startEngine();
        this.sound.startSiren();
        document.getElementById('pause-screen').style.display = 'none';
    }

    // === UPDATE ===

    update(dt) {
        if (this.state !== 'playing') return;
        dt = Math.min(dt, 0.05);
        this.time += dt;

        this.updatePlayer(dt);
        this.updatePolice(dt);
        this.updateTraffic(dt);
        this.updateFuel(dt);
        this.checkCollisions();
        this.updateSpawns(dt);
        this.updatePowerups(dt);
        this.updateHazards(dt);
        this.updateParticles(dt);
        this.updateCamera(dt);
        this.updateSound();
        this._updateHUD();
    }

    updatePlayer(dt) {
        const p = this.player;
        const k = this.keys;

        // Effective max speed (boost / slow)
        let maxSpeed = PLAYER_MAX_SPEED;
        if (this.speedBoostTimer > 0) maxSpeed *= SPEED_BOOST_MULT;
        if (this.playerSlow > 0) maxSpeed *= 0.5;

        // Input
        let accelInput = 0;
        let turnInput = 0;

        if (k['ArrowUp'] || k['w'] || k['W']) accelInput = 1;
        if (k['ArrowDown'] || k['s'] || k['S']) accelInput = -1;
        if (k['ArrowLeft'] || k['a'] || k['A']) turnInput = -1;
        if (k['ArrowRight'] || k['d'] || k['D']) turnInput = 1;

        // Touch joystick
        if (this.touch.active) {
            const threshold = 0.25;
            const mag = Math.hypot(this.touch.dx, this.touch.dy);
            if (mag > threshold) {
                accelInput = 1;
                const targetAngle = Math.atan2(this.touch.dy, this.touch.dx);
                let angleDiff = targetAngle - p.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                turnInput = clamp(angleDiff * 2, -1, 1);
            }
        }

        // Acceleration
        if (accelInput > 0) {
            p.speed += PLAYER_ACCEL * dt;
        } else if (accelInput < 0) {
            p.speed -= PLAYER_BRAKE * dt;
        } else {
            if (p.speed > 0) p.speed = Math.max(0, p.speed - PLAYER_DECEL * dt);
            else if (p.speed < 0) p.speed = Math.min(0, p.speed + PLAYER_DECEL * dt);
        }
        p.speed = clamp(p.speed, -maxSpeed * 0.4, maxSpeed);

        // Turning
        const speedFactor = Math.min(Math.abs(p.speed) / 50, 1);
        const turnDir = p.speed >= 0 ? 1 : -1;
        p.angle += turnInput * PLAYER_TURN * speedFactor * turnDir * dt;

        // Movement with collision
        const moveX = Math.cos(p.angle) * p.speed * dt;
        const moveY = Math.sin(p.angle) * p.speed * dt;
        const nx = p.x + moveX;
        const ny = p.y + moveY;

        if (canDrive(nx, ny, p.r)) {
            p.x = nx;
            p.y = ny;
        } else {
            const xOk = canDrive(p.x + moveX, p.y, p.r);
            const yOk = canDrive(p.x, p.y + moveY, p.r);
            if (xOk) p.x += moveX;
            if (yOk) p.y += moveY;
            if (!xOk && !yOk) p.speed *= 0.5;
        }

        p.x = clamp(p.x, 20, WORLD - 20);
        p.y = clamp(p.y, 20, WORLD - 20);

        // Tire marks
        if (Math.abs(turnInput) > 0.5 && Math.abs(p.speed) > 80) {
            this.renderer.addTireMarks(p.x, p.y, p.angle, p.w, p.h);
        }

        // Speed boost trail particles
        if (this.speedBoostTimer > 0 && Math.abs(p.speed) > 50) {
            this.particles.push({
                x: p.x - Math.cos(p.angle) * 20 + (Math.random() - 0.5) * 10,
                y: p.y - Math.sin(p.angle) * 20 + (Math.random() - 0.5) * 10,
                vx: -Math.cos(p.angle) * 30 + (Math.random() - 0.5) * 20,
                vy: -Math.sin(p.angle) * 30 + (Math.random() - 0.5) * 20,
                life: 0.3, maxLife: 0.3,
                size: 5 + Math.random() * 4,
                color: '80,160,255'
            });
        }

        // Slow effect timer
        if (this.playerSlow > 0) this.playerSlow -= dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    }

    updatePolice(dt) {
        for (let ci = 0; ci < this.police.length; ci++) {
            const cop = this.police[ci];

            // Spinning from oil slick
            if (cop.spinning > 0) {
                cop.spinning -= dt;
                cop.angle += 8 * dt;
                cop.speed = lerp(cop.speed, 0, 5 * dt);
                cop.x += Math.cos(cop.angle) * cop.speed * dt * 0.3;
                cop.y += Math.sin(cop.angle) * cop.speed * dt * 0.3;
                cop.x = clamp(cop.x, ROAD_W / 2, WORLD - ROAD_W / 2);
                cop.y = clamp(cop.y, ROAD_W / 2, WORLD - ROAD_W / 2);
                continue;
            }

            const p = this.player;
            const dx = p.x - cop.x;
            const dy = p.y - cop.y;

            const cx = ((cop.x % CELL) + CELL) % CELL;
            const cy = ((cop.y % CELL) + CELL) % CELL;
            const onVRoad = cx < ROAD_W;
            const onHRoad = cy < ROAD_W;
            const atIntersection = onVRoad && onHRoad;

            const gx = Math.floor(cop.x / CELL);
            const gy = Math.floor(cop.y / CELL);
            const inPark = gx >= 0 && gx < GRID_N && gy >= 0 && gy < GRID_N
                && _buildings[gy * GRID_N + gx] && _buildings[gy * GRID_N + gx].isPark;

            let targetAngle;

            if (inPark && !onVRoad && !onHRoad) {
                targetAngle = Math.atan2(dy, dx);
            } else if (atIntersection) {
                const absDx = Math.abs(dx), absDy = Math.abs(dy);
                const preferX = absDx > absDy + cop.randomBias;
                if (!cop.decided) {
                    cop.decided = true;
                    if (Math.random() < 0.1) {
                        if (preferX) targetAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
                        else targetAngle = dx > 0 ? 0 : Math.PI;
                    } else if (preferX) {
                        targetAngle = dx > 0 ? 0 : Math.PI;
                    } else {
                        targetAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
                    }
                    cop.chosenAngle = targetAngle;
                }
                targetAngle = cop.chosenAngle;
            } else {
                cop.decided = false;
                if (onHRoad) {
                    if (Math.abs(dx) < ROAD_W) {
                        const nearestVRoad = Math.round(cop.x / CELL) * CELL + ROAD_W / 2;
                        targetAngle = nearestVRoad > cop.x ? 0 : Math.PI;
                    } else {
                        targetAngle = dx > 0 ? 0 : Math.PI;
                    }
                    const laneOffset = (ci % 2 === 0 ? -1 : 1) * 10;
                    const roadCenterY = Math.round(cop.y / CELL) * CELL + ROAD_W / 2 + laneOffset;
                    cop.y = lerp(cop.y, roadCenterY, 8 * dt);
                } else if (onVRoad) {
                    if (Math.abs(dy) < ROAD_W) {
                        const nearestHRoad = Math.round(cop.y / CELL) * CELL + ROAD_W / 2;
                        targetAngle = nearestHRoad > cop.y ? Math.PI / 2 : -Math.PI / 2;
                    } else {
                        targetAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
                    }
                    const laneOffset = (ci % 2 === 0 ? -1 : 1) * 10;
                    const roadCenterX = Math.round(cop.x / CELL) * CELL + ROAD_W / 2 + laneOffset;
                    cop.x = lerp(cop.x, roadCenterX, 8 * dt);
                } else {
                    const snap = nearestRoadCenter(cop.x, cop.y);
                    targetAngle = Math.atan2(snap.y - cop.y, snap.x - cop.x);
                }
            }

            let angleDiff = targetAngle - cop.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            cop.angle += clamp(angleDiff, -5 * dt, 5 * dt);

            const turnPenalty = 1 - Math.min(Math.abs(angleDiff) / Math.PI, 0.6);
            const speedVar = 1 + cop.randomBias * 0.003;
            const targetSpeed = cop.maxSpeed * turnPenalty * speedVar;
            cop.speed = lerp(cop.speed, targetSpeed, 3 * dt);

            cop.x += Math.cos(cop.angle) * cop.speed * dt;
            cop.y += Math.sin(cop.angle) * cop.speed * dt;
            cop.x = clamp(cop.x, ROAD_W / 2, WORLD - ROAD_W / 2);
            cop.y = clamp(cop.y, ROAD_W / 2, WORLD - ROAD_W / 2);
        }

        // Cop-vs-cop collision
        for (let i = 0; i < this.police.length; i++) {
            for (let j = i + 1; j < this.police.length; j++) {
                const a = this.police[i], b = this.police[j];
                const d = dist(a.x, a.y, b.x, b.y);
                const minDist = (a.w + b.w) / 2;
                if (d < minDist && d > 0.1) {
                    const overlap = (minDist - d) / 2;
                    const nx = (b.x - a.x) / d;
                    const ny = (b.y - a.y) / d;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    if (a.speed < b.speed) a.speed *= 0.7;
                    else b.speed *= 0.7;
                }
            }
        }

        // Police vs oil slicks
        for (const cop of this.police) {
            if (cop.spinning > 0) continue;
            for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
                const oil = this.oilSlicks[i];
                if (dist(cop.x, cop.y, oil.x, oil.y) < oil.r + 15) {
                    cop.spinning = 2;
                    cop.speed *= 0.3;
                    // Particles
                    for (let k = 0; k < 8; k++) {
                        this.particles.push({
                            x: cop.x, y: cop.y,
                            vx: (Math.random() - 0.5) * 80,
                            vy: (Math.random() - 0.5) * 80,
                            life: 0.5, maxLife: 0.5,
                            size: 3 + Math.random() * 3,
                            color: '60,40,20'
                        });
                    }
                    this.oilSlicks.splice(i, 1);
                    break;
                }
            }
        }
    }

    updateTraffic(dt) {
        for (const npc of this.traffic) {
            // Spinning from collision
            if (npc.spinning > 0) {
                npc.spinning -= dt;
                npc.angle += 5 * dt;
                npc.speed = lerp(npc.speed, 0, 4 * dt);
                npc.x += Math.cos(npc.angle) * npc.speed * dt * 0.2;
                npc.y += Math.sin(npc.angle) * npc.speed * dt * 0.2;
                continue;
            }

            const cx = ((npc.x % CELL) + CELL) % CELL;
            const cy = ((npc.y % CELL) + CELL) % CELL;
            const onVRoad = cx < ROAD_W;
            const onHRoad = cy < ROAD_W;
            const atIntersection = onVRoad && onHRoad;

            if (atIntersection) {
                if (!npc.decided) {
                    npc.decided = true;
                    const r = Math.random();
                    if (r < 0.6) {
                        // Continue straight
                    } else if (r < 0.8) {
                        npc.chosenAngle += Math.PI / 2;
                    } else {
                        npc.chosenAngle -= Math.PI / 2;
                    }
                    // Snap to cardinal direction
                    npc.chosenAngle = Math.round(npc.chosenAngle / (Math.PI / 2)) * (Math.PI / 2);
                }
            } else {
                npc.decided = false;
                // Lane centering
                if (onHRoad) {
                    const roadCY = Math.round(npc.y / CELL) * CELL + ROAD_W / 2;
                    const goingRight = Math.cos(npc.chosenAngle) > 0.5;
                    npc.y = lerp(npc.y, roadCY + (goingRight ? 15 : -15), 5 * dt);
                } else if (onVRoad) {
                    const roadCX = Math.round(npc.x / CELL) * CELL + ROAD_W / 2;
                    const goingDown = Math.sin(npc.chosenAngle) > 0.5;
                    npc.x = lerp(npc.x, roadCX + (goingDown ? 15 : -15), 5 * dt);
                }
            }

            // Smooth turning
            let diff = npc.chosenAngle - npc.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            npc.angle += clamp(diff, -4 * dt, 4 * dt);

            // Slow down for cars ahead
            let slowFactor = 1;
            const allCars = [...this.traffic, ...this.police];
            for (const other of allCars) {
                if (other === npc) continue;
                const ahead = Math.cos(npc.angle) * (other.x - npc.x) + Math.sin(npc.angle) * (other.y - npc.y);
                if (ahead > 0 && ahead < 60) {
                    const lateral = Math.abs(-Math.sin(npc.angle) * (other.x - npc.x) + Math.cos(npc.angle) * (other.y - npc.y));
                    if (lateral < 20) slowFactor = 0.2;
                }
            }
            // Slow for roadblocks
            for (const rb of this.roadblocks) {
                if (dist(npc.x, npc.y, rb.x, rb.y) < 80) slowFactor = 0.1;
            }

            npc.speed = lerp(npc.speed, npc.maxSpeed * slowFactor, 3 * dt);

            npc.x += Math.cos(npc.angle) * npc.speed * dt;
            npc.y += Math.sin(npc.angle) * npc.speed * dt;

            // Respawn if out of world
            if (npc.x < -50 || npc.x > WORLD + 50 || npc.y < -50 || npc.y > WORLD + 50) {
                this._respawnTrafficCar(npc);
            }
        }
    }

    _respawnTrafficCar(npc) {
        const horiz = Math.random() < 0.5;
        if (horiz) {
            const cellY = Math.floor(Math.random() * GRID_N);
            const goingRight = Math.random() < 0.5;
            npc.y = cellY * CELL + ROAD_W / 2 + (goingRight ? 15 : -15);
            npc.x = goingRight ? -20 : WORLD + 20;
            npc.angle = goingRight ? 0 : Math.PI;
        } else {
            const cellX = Math.floor(Math.random() * GRID_N);
            const goingDown = Math.random() < 0.5;
            npc.x = cellX * CELL + ROAD_W / 2 + (goingDown ? 15 : -15);
            npc.y = goingDown ? -20 : WORLD + 20;
            npc.angle = goingDown ? Math.PI / 2 : -Math.PI / 2;
        }
        npc.chosenAngle = npc.angle;
        npc.speed = npc.maxSpeed;
        npc.spinning = 0;
        npc.decided = false;
        npc.color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
    }

    updateFuel(dt) {
        const speedRatio = Math.abs(this.player.speed) / PLAYER_MAX_SPEED;
        const drain = FUEL_IDLE_DRAIN + speedRatio * FUEL_MOVE_DRAIN;
        this.fuel -= drain * dt;
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.endGame('empty');
        }
    }

    checkCollisions() {
        const p = this.player;

        // Player vs police
        for (const cop of this.police) {
            if (cop.spinning > 0) continue;
            const d = dist(p.x, p.y, cop.x, cop.y);
            if (d < (p.w + cop.w) / 2 * 0.7) {
                for (let i = 0; i < 20; i++) {
                    this.particles.push({
                        x: (p.x + cop.x) / 2, y: (p.y + cop.y) / 2,
                        vx: (Math.random() - 0.5) * 200,
                        vy: (Math.random() - 0.5) * 200,
                        life: 0.5 + Math.random() * 0.5, maxLife: 1,
                        size: 3 + Math.random() * 5,
                        color: '255,150,50'
                    });
                }
                this.endGame('caught');
                return;
            }
        }

        // Player vs jerrycans
        for (let i = this.jerrycans.length - 1; i >= 0; i--) {
            const j = this.jerrycans[i];
            if (dist(p.x, p.y, j.x, j.y) < 30) {
                this.fuel += FUEL_PICKUP;
                this.collected++;
                this.sound.playPickup();
                for (let k = 0; k < 10; k++) {
                    this.particles.push({
                        x: j.x, y: j.y,
                        vx: (Math.random() - 0.5) * 100,
                        vy: (Math.random() - 0.5) * 100,
                        life: 0.4, maxLife: 0.4,
                        size: 4 + Math.random() * 3,
                        color: this.evMode ? '46,204,113' : '255,200,0'
                    });
                }
                this.jerrycans.splice(i, 1);
            }
        }

        // Player vs power-ups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            if (dist(p.x, p.y, pu.x, pu.y) < 28) {
                if (pu.type === 'speed') {
                    this.speedBoostTimer = SPEED_BOOST_DURATION;
                    this.sound.playBoostStart();
                } else if (pu.type === 'oil') {
                    this.heldPowerup = 'oil';
                    this.sound.playPowerup();
                    this._updatePowerupBtn();
                }
                // Pickup particles
                for (let k = 0; k < 10; k++) {
                    this.particles.push({
                        x: pu.x, y: pu.y,
                        vx: (Math.random() - 0.5) * 100,
                        vy: (Math.random() - 0.5) * 100,
                        life: 0.4, maxLife: 0.4,
                        size: 4 + Math.random() * 3,
                        color: pu.type === 'speed' ? '80,160,255' : '139,90,43'
                    });
                }
                this.powerups.splice(i, 1);
            }
        }

        // Player vs NPC traffic (bump, not game over)
        if (this.invincibleTimer <= 0) {
            for (const npc of this.traffic) {
                if (npc.spinning > 0) continue;
                const d = dist(p.x, p.y, npc.x, npc.y);
                if (d < (p.w + npc.w) / 2 * 0.7) {
                    // Bump: push apart, slow player, spin NPC
                    this.sound.playBump();
                    const pushAngle = Math.atan2(p.y - npc.y, p.x - npc.x);
                    p.x += Math.cos(pushAngle) * 15;
                    p.y += Math.sin(pushAngle) * 15;
                    p.speed *= 0.4;
                    npc.spinning = 1.5;
                    this.invincibleTimer = 1;
                    // Spark particles
                    for (let k = 0; k < 8; k++) {
                        this.particles.push({
                            x: (p.x + npc.x) / 2, y: (p.y + npc.y) / 2,
                            vx: (Math.random() - 0.5) * 120,
                            vy: (Math.random() - 0.5) * 120,
                            life: 0.3, maxLife: 0.3,
                            size: 2 + Math.random() * 3,
                            color: '255,220,80'
                        });
                    }
                    break;
                }
            }
        }

        // Player vs spike strips
        for (let i = this.spikeStrips.length - 1; i >= 0; i--) {
            const sp = this.spikeStrips[i];
            if (sp.hit) continue;
            if (dist(p.x, p.y, sp.x, sp.y) < 30) {
                sp.hit = true;
                this.fuel -= SPIKE_FUEL_PENALTY;
                this.playerSlow = SPIKE_SLOW_TIME;
                p.speed *= 0.3;
                this.sound.playSpikeHit();
                for (let k = 0; k < 12; k++) {
                    this.particles.push({
                        x: sp.x, y: sp.y,
                        vx: (Math.random() - 0.5) * 150,
                        vy: (Math.random() - 0.5) * 150,
                        life: 0.4, maxLife: 0.4,
                        size: 2 + Math.random() * 3,
                        color: '255,200,0'
                    });
                }
                // Remove after short delay
                setTimeout(() => {
                    const idx = this.spikeStrips.indexOf(sp);
                    if (idx !== -1) this.spikeStrips.splice(idx, 1);
                }, 500);
                if (this.fuel <= 0) {
                    this.fuel = 0;
                    this.endGame('empty');
                    return;
                }
            }
        }
    }

    updateSpawns(dt) {
        // Police
        this.policeSpawnTimer += dt;
        const policeInterval = Math.max(12, 25 - this.time * 0.1);
        const maxPolice = Math.min(6, 1 + Math.floor(this.time / 25));
        if (this.policeSpawnTimer > policeInterval && this.police.length < maxPolice) {
            this._spawnPolice();
            this.policeSpawnTimer = 0;
        }
        for (const cop of this.police) {
            cop.maxSpeed = Math.min(200, 130 + this.time * 0.4);
        }

        // Jerrycans
        this.jerrycanTimer += dt;
        const jerryInterval = Math.min(5, 2 + this.time * 0.015);
        if (this.jerrycanTimer > jerryInterval && this.jerrycans.length < 6) {
            this._spawnJerrycan();
            this.jerrycanTimer = 0;
        }

        // Power-ups
        this.powerupTimer += dt;
        if (this.time > 15 && this.powerupTimer > POWERUP_SPAWN_TIME && this.powerups.length < 3) {
            this._spawnPowerup();
            this.powerupTimer = 0;
        }

        // Spike strips
        this.spikeTimer += dt;
        if (this.time > SPIKE_START_TIME && this.spikeTimer > SPIKE_SPAWN_INTERVAL
            && this.spikeStrips.filter(s => !s.hit).length < MAX_SPIKES) {
            this._spawnSpikeStrip();
            this.spikeTimer = 0;
        }

        // Roadblocks
        this.roadblockTimer += dt;
        if (this.time > ROADBLOCK_START_TIME && this.roadblockTimer > ROADBLOCK_SPAWN_INTERVAL
            && this.roadblocks.length < MAX_ROADBLOCKS * 2) {
            this._spawnRoadblock();
            this.roadblockTimer = 0;
        }

        // Respawn traffic if too few
        if (this.traffic.length < TRAFFIC_COUNT) {
            this._spawnTrafficCar();
        }
    }

    updatePowerups(dt) {
        // Speed boost timer
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) this.speedBoostTimer = 0;
        }

        // Animate power-up items
        for (const pu of this.powerups) {
            pu.time += dt;
        }
    }

    updateHazards(dt) {
        // Oil slick lifetime
        for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
            this.oilSlicks[i].life -= dt;
            if (this.oilSlicks[i].life <= 0) this.oilSlicks.splice(i, 1);
        }

        // Roadblock lifetime
        for (let i = this.roadblocks.length - 1; i >= 0; i--) {
            this.roadblocks[i].life -= dt;
            if (this.roadblocks[i].life <= 0) this.roadblocks.splice(i, 1);
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    updateCamera(dt) {
        const p = this.player;
        const lookAhead = Math.min(100, Math.abs(p.speed) * 0.3);
        const targetX = p.x + Math.cos(p.angle) * lookAhead - this.viewW / 2;
        const targetY = p.y + Math.sin(p.angle) * lookAhead - this.viewH / 2;
        this.camera.x = lerp(this.camera.x, targetX, 4 * dt);
        this.camera.y = lerp(this.camera.y, targetY, 4 * dt);
    }

    updateSound() {
        const speedRatio = Math.abs(this.player.speed) / PLAYER_MAX_SPEED;
        this.sound.updateEngine(speedRatio);

        let closest = Infinity;
        for (const cop of this.police) {
            const d = dist(this.player.x, this.player.y, cop.x, cop.y);
            if (d < closest) closest = d;
        }
        this.sound.updateSiren(closest);

        if (this.fuel < 20) this.sound.startWarning();
        else this.sound.stopWarning();
    }

    _updateHUD() {
        const fuelPct = clamp(this.fuel / 100, 0, 1);
        const bar = document.getElementById('fuel-bar');
        bar.style.width = (fuelPct * 100) + '%';

        if (fuelPct > 0.5) bar.style.background = 'linear-gradient(90deg, #43a047, #66bb6a)';
        else if (fuelPct > 0.25) bar.style.background = 'linear-gradient(90deg, #f9a825, #fdd835)';
        else bar.style.background = 'linear-gradient(90deg, #e53935, #ef5350)';

        document.getElementById('fuel-value').textContent = Math.ceil(this.fuel);
        document.getElementById('time-display').textContent = this._formatTime(this.time);
        document.getElementById('collected-display').textContent =
            this.collected + (this.evMode ? ' \u{1F50B}' : ' \u26FD');

        // Power-up display
        const puDisplay = document.getElementById('powerup-display');
        if (puDisplay) {
            if (this.speedBoostTimer > 0) {
                puDisplay.style.display = 'flex';
                puDisplay.textContent = '\u26A1 ' + this.speedBoostTimer.toFixed(1) + 's';
                puDisplay.style.color = '#5dade2';
            } else if (this.heldPowerup === 'oil') {
                puDisplay.style.display = 'flex';
                puDisplay.textContent = '\u{1F6E2}\uFE0F [E/Spatie]';
                puDisplay.style.color = '#b8860b';
            } else {
                puDisplay.style.display = 'none';
            }
        }
    }

    _formatTime(t) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // === HIGH SCORES ===

    loadHighScores() {
        try {
            const data = localStorage.getItem('politiejacht_scores');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    saveScore(score) {
        if (score <= 0) return;
        this.highScores.push({
            score,
            time: Math.floor(this.time),
            collected: this.collected,
            ev: this.evMode,
            date: new Date().toLocaleDateString('nl-NL')
        });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
        try {
            localStorage.setItem('politiejacht_scores', JSON.stringify(this.highScores));
        } catch (e) { /* silent */ }
    }

    updateScoreboard() {
        const list = document.getElementById('score-list');
        if (!list) return;
        if (this.highScores.length === 0) {
            list.innerHTML = '<div class="score-empty">Nog geen scores</div>';
            return;
        }
        list.innerHTML = this.highScores.map((s, i) =>
            `<div class="score-item">
                <span class="score-rank">#${i + 1}</span>
                <span class="score-val">${s.score} ${s.ev ? '\u{1F50B}' : '\u26FD'}</span>
                <span class="score-time">${Math.floor(s.time / 60)}:${(s.time % 60 < 10 ? '0' : '') + s.time % 60}</span>
                <span class="score-date">${s.date}</span>
            </div>`
        ).join('');
    }

    // === MAIN LOOP ===

    loop(time) {
        const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
        this.lastTime = time;

        this.update(dt);
        this.renderer.render();

        requestAnimationFrame(t => this.loop(t));
    }
}

// Start
window.addEventListener('load', () => new Game());
