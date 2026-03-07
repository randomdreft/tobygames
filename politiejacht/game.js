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
const PLAYER_DECEL = 120; // natural friction
const PLAYER_TURN = 2.8;

const FUEL_START = 60;
const FUEL_IDLE_DRAIN = 0.3;  // per second
const FUEL_MOVE_DRAIN = 3.0;  // per second at max speed
const FUEL_PICKUP = 22;

const BUILDING_COLORS = [
    '#7a6652', '#8d7b68', '#6b5b4f', // brown
    '#6a7a8a', '#7b8a96', '#5a6a7a', // blue-grey
    '#8a7060', '#7a6a5a', '#6a5a4a', // warm
    '#5a7a6a', '#6a8a7a', '#4a6a5a', // teal
];

// === HELPERS ===
function isRoad(x, y) {
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return false;
    const cx = ((x % CELL) + CELL) % CELL;
    const cy = ((y % CELL) + CELL) % CELL;
    return cx < ROAD_W || cy < ROAD_W;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function lerp(a, b, t) { return a + (b - a) * t; }

function nearestRoadCenter(x, y) {
    // Snap to the CENTER of the nearest intersection (safe for car-sized entities)
    const cellX = Math.round(x / CELL);
    const cellY = Math.round(y / CELL);
    return { x: cellX * CELL + ROAD_W / 2, y: cellY * CELL + ROAD_W / 2 };
}

function canDrive(x, y, radius) {
    // Circle-based road check: test center + 4 cardinal points at given radius
    if (!isRoad(x, y)) return false;
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
                // Darken for roof
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
        // Mode toggle
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
        this.particles = [];
        this.renderer.tireMarks = [];

        // Player start position: center of nearest intersection
        const center = WORLD / 2;
        const startPos = nearestRoadCenter(center, center);
        this.player = {
            x: startPos.x, y: startPos.y,
            angle: 0, speed: 0,
            w: 40, h: 24, r: 14 // r = collision radius
        };

        // Initial police car
        this.police = [];
        this._spawnPolice();

        // Initial jerrycans
        this.jerrycans = [];
        for (let i = 0; i < 3; i++) this._spawnJerrycan();

        this._updateHUD();
    }

    _spawnPolice() {
        // Spawn on road near edge of visible area
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

            // Not too close to player
            if (dist(x, y, this.player.x, this.player.y) < 300) continue;

            const angle = Math.atan2(this.player.y - y, this.player.x - x);
            this.police.push({
                x, y, angle,
                speed: 0,
                w: 42, h: 26,
                maxSpeed: 130 + this.police.length * 8,
                stuckTimer: 0
            });
            return;
        }
    }

    _spawnJerrycan() {
        for (let i = 0; i < 50; i++) {
            const x = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            const y = ROAD_W / 2 + Math.random() * (WORLD - ROAD_W);
            if (!isRoad(x, y)) continue;
            // Not too close to player
            if (this.player && dist(x, y, this.player.x, this.player.y) < 200) continue;
            // Not too close to existing jerrycans
            let tooClose = false;
            for (const j of this.jerrycans) {
                if (dist(x, y, j.x, j.y) < 150) { tooClose = true; break; }
            }
            if (tooClose) continue;
            this.jerrycans.push({ x, y });
            return;
        }
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
        document.getElementById('gameover-screen').style.display = 'flex';
        this.updateScoreboard();
    }

    restart() {
        document.getElementById('gameover-screen').style.display = 'none';
        this.startCountdown();
    }

    // === UPDATE ===

    update(dt) {
        if (this.state !== 'playing') return;
        dt = Math.min(dt, 0.05); // cap delta
        this.time += dt;

        this.updatePlayer(dt);
        this.updatePolice(dt);
        this.updateFuel(dt);
        this.checkCollisions();
        this.updateSpawns(dt);
        this.updateParticles(dt);
        this.updateCamera(dt);
        this.updateSound();
        this._updateHUD();
    }

    updatePlayer(dt) {
        const p = this.player;
        const k = this.keys;

        // Input
        let accelInput = 0;
        let turnInput = 0;

        if (k['ArrowUp'] || k['w'] || k['W']) accelInput = 1;
        if (k['ArrowDown'] || k['s'] || k['S']) accelInput = -1;
        if (k['ArrowLeft'] || k['a'] || k['A']) turnInput = -1;
        if (k['ArrowRight'] || k['d'] || k['D']) turnInput = 1;

        // Touch joystick input
        if (this.touch.active) {
            const threshold = 0.25;
            if (this.touch.dy < -threshold) accelInput = 1;
            if (this.touch.dy > threshold) accelInput = -1;
            if (this.touch.dx < -threshold) turnInput = -this.touch.dx;
            if (this.touch.dx > threshold) turnInput = -this.touch.dx;
            // Joystick: up = forward, not y-axis
            // Remap: treat joystick as direction
            const mag = Math.hypot(this.touch.dx, this.touch.dy);
            if (mag > threshold) {
                accelInput = 1; // Always drive forward when joystick is pushed
                // Turn toward joystick angle
                const targetAngle = Math.atan2(this.touch.dy, this.touch.dx);
                let angleDiff = targetAngle - p.angle;
                // Normalize
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
        p.speed = clamp(p.speed, -PLAYER_MAX_SPEED * 0.4, PLAYER_MAX_SPEED);

        // Turning (only when moving)
        const speedFactor = Math.min(Math.abs(p.speed) / 50, 1);
        const turnDir = p.speed >= 0 ? 1 : -1;
        p.angle += turnInput * PLAYER_TURN * speedFactor * turnDir * dt;

        // Movement with road collision (circle-based for smooth driving)
        const moveX = Math.cos(p.angle) * p.speed * dt;
        const moveY = Math.sin(p.angle) * p.speed * dt;
        const nx = p.x + moveX;
        const ny = p.y + moveY;

        if (canDrive(nx, ny, p.r)) {
            p.x = nx;
            p.y = ny;
        } else {
            // Try sliding: X only, then Y only
            const xOk = canDrive(p.x + moveX, p.y, p.r);
            const yOk = canDrive(p.x, p.y + moveY, p.r);
            if (xOk) p.x += moveX;
            if (yOk) p.y += moveY;
            if (!xOk && !yOk) p.speed *= 0.5;
        }

        // Clamp to world
        p.x = clamp(p.x, 20, WORLD - 20);
        p.y = clamp(p.y, 20, WORLD - 20);

        // Tire marks when turning fast
        if (Math.abs(turnInput) > 0.5 && Math.abs(p.speed) > 80) {
            this.renderer.addTireMarks(p.x, p.y, p.angle, p.w, p.h);
        }
    }

    // (collision is now circle-based via canDrive)

    updatePolice(dt) {
        for (const cop of this.police) {
            const p = this.player;
            const dx = p.x - cop.x;
            const dy = p.y - cop.y;
            const d = Math.hypot(dx, dy);

            // Target angle toward player
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - cop.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            cop.angle += clamp(angleDiff, -2.5 * dt, 2.5 * dt);

            // Speed: approach max, slow at turns
            const turnPenalty = 1 - Math.abs(angleDiff) / Math.PI * 0.5;
            const targetSpeed = cop.maxSpeed * turnPenalty;
            cop.speed = lerp(cop.speed, targetSpeed, 2 * dt);

            // Movement with building collision
            const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
            const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;

            const onRoadX = isRoad(nx, cop.y);
            const onRoadY = isRoad(cop.x, ny);
            const onRoadBoth = isRoad(nx, ny);

            if (onRoadBoth) {
                cop.x = nx;
                cop.y = ny;
                cop.stuckTimer = 0;
            } else if (onRoadX) {
                cop.x = nx;
                cop.stuckTimer = 0;
            } else if (onRoadY) {
                cop.y = ny;
                cop.stuckTimer = 0;
            } else {
                cop.stuckTimer += dt;
                // If stuck, snap toward nearest road center
                if (cop.stuckTimer > 0.5) {
                    const snap = nearestRoadCenter(cop.x, cop.y);
                    cop.x = lerp(cop.x, snap.x, 3 * dt);
                    cop.y = lerp(cop.y, snap.y, 3 * dt);
                }
            }

            cop.x = clamp(cop.x, 20, WORLD - 20);
            cop.y = clamp(cop.y, 20, WORLD - 20);
        }
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
            const d = dist(p.x, p.y, cop.x, cop.y);
            if (d < (p.w + cop.w) / 2 * 0.7) {
                // Crash particles
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
                // Pickup particles
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
    }

    updateSpawns(dt) {
        // Police spawning
        this.policeSpawnTimer += dt;
        const policeInterval = Math.max(12, 25 - this.time * 0.1);
        const maxPolice = Math.min(6, 1 + Math.floor(this.time / 25));
        if (this.policeSpawnTimer > policeInterval && this.police.length < maxPolice) {
            this._spawnPolice();
            this.policeSpawnTimer = 0;
        }

        // Increase police speed over time
        for (const cop of this.police) {
            cop.maxSpeed = Math.min(200, 130 + this.time * 0.4);
        }

        // Jerrycan spawning
        this.jerrycanTimer += dt;
        const jerryInterval = Math.min(8, 4 + this.time * 0.02);
        if (this.jerrycanTimer > jerryInterval && this.jerrycans.length < 3) {
            this._spawnJerrycan();
            this.jerrycanTimer = 0;
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
        // Look-ahead based on speed
        const lookAhead = Math.min(100, Math.abs(p.speed) * 0.3);
        const targetX = p.x + Math.cos(p.angle) * lookAhead - this.viewW / 2;
        const targetY = p.y + Math.sin(p.angle) * lookAhead - this.viewH / 2;
        this.camera.x = lerp(this.camera.x, targetX, 4 * dt);
        this.camera.y = lerp(this.camera.y, targetY, 4 * dt);
    }

    updateSound() {
        const speedRatio = Math.abs(this.player.speed) / PLAYER_MAX_SPEED;
        this.sound.updateEngine(speedRatio);

        // Siren volume based on closest police
        let closest = Infinity;
        for (const cop of this.police) {
            const d = dist(this.player.x, this.player.y, cop.x, cop.y);
            if (d < closest) closest = d;
        }
        this.sound.updateSiren(closest);

        // Low fuel warning
        if (this.fuel < 20) {
            this.sound.startWarning();
        } else {
            this.sound.stopWarning();
        }
    }

    _updateHUD() {
        const fuelPct = clamp(this.fuel / 100, 0, 1);
        const bar = document.getElementById('fuel-bar');
        bar.style.width = (fuelPct * 100) + '%';

        // Color: green > yellow > red
        if (fuelPct > 0.5) bar.style.background = `linear-gradient(90deg, #43a047, #66bb6a)`;
        else if (fuelPct > 0.25) bar.style.background = `linear-gradient(90deg, #f9a825, #fdd835)`;
        else bar.style.background = `linear-gradient(90deg, #e53935, #ef5350)`;

        document.getElementById('fuel-value').textContent = Math.ceil(this.fuel);
        document.getElementById('time-display').textContent = this._formatTime(this.time);
        document.getElementById('collected-display').textContent =
            this.collected + (this.evMode ? ' \u{1F50B}' : ' \u26FD');
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

// Start when loaded
window.addEventListener('load', () => new Game());
