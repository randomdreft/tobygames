// politiejacht/renderer.js - All canvas rendering

class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.sirenTick = 0;
        this.tireMarks = []; // persistent tire marks on road
    }

    render() {
        const g = this.game;
        const ctx = this.ctx;
        const vw = g.viewW, vh = g.viewH;

        ctx.clearRect(0, 0, vw, vh);
        ctx.save();
        ctx.translate(-g.camera.x, -g.camera.y);

        this.drawWorld();
        this.drawTireMarks();
        this.drawJerrycans();
        this.drawParticles();
        this.drawPlayer();
        this.drawPolice();

        ctx.restore();

        this.drawVignette();
        this.drawMinimap();
        this.sirenTick += 0.05;
    }

    drawWorld() {
        const g = this.game;
        const ctx = this.ctx;
        const cam = g.camera;
        const vw = g.viewW, vh = g.viewH;

        // Visible range in world coords
        const x0 = cam.x, y0 = cam.y;
        const x1 = cam.x + vw, y1 = cam.y + vh;

        // Background (grass/dirt around city)
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(x0, y0, vw, vh);

        // Draw buildings (blocks between roads)
        const cellStart = Math.floor(x0 / CELL) - 1;
        const cellEndX = Math.ceil(x1 / CELL) + 1;
        const cellStartY = Math.floor(y0 / CELL) - 1;
        const cellEndY = Math.ceil(y1 / CELL) + 1;

        for (let cy = cellStartY; cy <= cellEndY; cy++) {
            for (let cx = cellStart; cx <= cellEndX; cx++) {
                if (cx < 0 || cx >= GRID_N || cy < 0 || cy >= GRID_N) continue;
                // Road segments
                const rx = cx * CELL;
                const ry = cy * CELL;

                // Horizontal road
                ctx.fillStyle = '#3a3a3a';
                ctx.fillRect(rx, ry, CELL, ROAD_W);
                // Vertical road
                ctx.fillRect(rx, ry, ROAD_W, CELL);

                // Center line horizontal
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.setLineDash([12, 8]);
                ctx.beginPath();
                ctx.moveTo(rx + ROAD_W, ry + ROAD_W / 2);
                ctx.lineTo(rx + CELL, ry + ROAD_W / 2);
                ctx.stroke();
                // Center line vertical
                ctx.beginPath();
                ctx.moveTo(rx + ROAD_W / 2, ry + ROAD_W);
                ctx.lineTo(rx + ROAD_W / 2, ry + CELL);
                ctx.stroke();
                ctx.setLineDash([]);

                // Intersection fill
                ctx.fillStyle = '#3a3a3a';
                ctx.fillRect(rx, ry, ROAD_W, ROAD_W);

                // Building block
                const bldg = g.buildings[cy * GRID_N + cx];
                if (bldg) {
                    const bx = rx + ROAD_W + 4;
                    const by = ry + ROAD_W + 4;
                    const bw = BLOCK_SIZE - 8;
                    const bh = BLOCK_SIZE - 8;

                    if (bldg.isPark) {
                        // Park
                        ctx.fillStyle = '#2d5a2d';
                        this._roundRect(bx, by, bw, bh, 6);
                        ctx.fillStyle = '#1e4a1e';
                        for (const t of bldg.trees) {
                            ctx.beginPath();
                            ctx.arc(bx + t.x * bw, by + t.y * bh, 10, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.fillStyle = '#3a7a3a';
                        for (const t of bldg.trees) {
                            ctx.beginPath();
                            ctx.arc(bx + t.x * bw, by + t.y * bh, 7, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        // Building shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.25)';
                        this._roundRect(bx + 3, by + 3, bw, bh, 4);
                        // Building body
                        ctx.fillStyle = bldg.color;
                        this._roundRect(bx, by, bw, bh, 4);
                        // Roof
                        ctx.fillStyle = bldg.roofColor;
                        this._roundRect(bx + 6, by + 6, bw - 12, bh - 12, 2);
                        // Windows
                        const winColor = bldg.lit ? '#ffe87a' : '#556680';
                        ctx.fillStyle = winColor;
                        const cols = 3, rows = 3;
                        const wx = (bw - 24) / cols, wy = (bh - 24) / rows;
                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                ctx.fillRect(
                                    bx + 14 + c * wx,
                                    by + 14 + r * wy,
                                    wx * 0.5, wy * 0.5
                                );
                            }
                        }
                    }
                }
            }
        }

        // World border
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, WORLD, WORLD);
    }

    drawPlayer() {
        const p = this.game.player;
        if (!p) return;
        this._drawCar(p.x, p.y, p.angle, p.w, p.h, this.game.evMode ? '#2ecc71' : '#e74c3c', false);

        // Exhaust particles when moving
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
            this._drawCar(cop.x, cop.y, cop.angle, cop.w, cop.h, '#ffffff', true);
        }
    }

    _drawCar(x, y, angle, w, h, color, isPolice) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this._roundRect(-w / 2 + 2, -h / 2 + 2, w, h, 5);

        // Main body
        ctx.fillStyle = color;
        this._roundRect(-w / 2, -h / 2, w, h, 5);

        if (isPolice) {
            // Blue stripe
            ctx.fillStyle = '#2155a8';
            ctx.fillRect(-w / 2 + 4, -h / 2, w - 8, 4);
            ctx.fillRect(-w / 2 + 4, h / 2 - 4, w - 8, 4);
            // POLITIE stripe
            ctx.fillStyle = '#1a4080';
            ctx.fillRect(-w * 0.15, -h / 2 + 1, w * 0.3, h - 2);

            // Light bar
            const siren = Math.sin(this.sirenTick * 8) > 0;
            ctx.fillStyle = siren ? '#ff0000' : '#0044ff';
            ctx.fillRect(-6, -h / 2 + 2, 5, 5);
            ctx.fillStyle = siren ? '#0044ff' : '#ff0000';
            ctx.fillRect(1, -h / 2 + 2, 5, 5);
            // Glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = siren ? '#ff0000' : '#0044ff';
            ctx.beginPath();
            ctx.arc(-3.5, -h / 2 + 4.5, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = siren ? '#0044ff' : '#ff0000';
            ctx.beginPath();
            ctx.arc(3.5, -h / 2 + 4.5, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else {
            // Windshield
            ctx.fillStyle = 'rgba(120,180,230,0.7)';
            this._roundRect(w / 2 - 14, -h / 2 + 3, 11, h - 6, 2);
            // Rear window
            ctx.fillStyle = 'rgba(100,150,200,0.5)';
            this._roundRect(-w / 2 + 3, -h / 2 + 4, 8, h - 8, 2);
            // Accent stripe
            ctx.fillStyle = this.game.evMode ? '#27ae60' : '#c0392b';
            ctx.fillRect(-w * 0.1, -h / 2, w * 0.2, h);
        }

        // Wheels
        ctx.fillStyle = '#1a1a1a';
        const ww = 8, wh = 4;
        ctx.fillRect(-w / 2 + 2, -h / 2 - 2, ww, wh);
        ctx.fillRect(-w / 2 + 2, h / 2 - 2, ww, wh);
        ctx.fillRect(w / 2 - ww - 2, -h / 2 - 2, ww, wh);
        ctx.fillRect(w / 2 - ww - 2, h / 2 - 2, ww, wh);

        // Headlights
        ctx.fillStyle = '#ffee66';
        ctx.fillRect(w / 2 - 2, -h / 2 + 3, 3, 4);
        ctx.fillRect(w / 2 - 2, h / 2 - 7, 3, 4);
        // Taillights
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(-w / 2 - 1, -h / 2 + 3, 3, 4);
        ctx.fillRect(-w / 2 - 1, h / 2 - 7, 3, 4);

        ctx.restore();
    }

    drawJerrycans() {
        const ctx = this.ctx;
        const g = this.game;
        const time = g.time;
        for (const j of g.jerrycans) {
            ctx.save();
            ctx.translate(j.x, j.y);

            // Floating animation
            const bob = Math.sin(time * 3 + j.x) * 3;
            ctx.translate(0, bob);

            // Glow
            const glow = 0.2 + Math.sin(time * 4 + j.x) * 0.1;
            ctx.fillStyle = g.evMode
                ? `rgba(46,204,113,${glow})`
                : `rgba(255,200,0,${glow})`;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();

            if (g.evMode) {
                // Battery icon
                ctx.fillStyle = '#2ecc71';
                this._roundRect(-8, -10, 16, 20, 3);
                ctx.fillStyle = '#27ae60';
                ctx.fillRect(-3, -13, 6, 4);
                // Lightning bolt
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(2, -6); ctx.lineTo(-3, 1); ctx.lineTo(1, 1);
                ctx.lineTo(-2, 7); ctx.lineTo(4, 0); ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                // Jerrycan
                ctx.fillStyle = '#e74c3c';
                this._roundRect(-7, -8, 14, 18, 3);
                // Cap
                ctx.fillStyle = '#f1c40f';
                this._roundRect(-3, -12, 6, 5, 2);
                // Handle
                ctx.strokeStyle = '#c0392b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-5, -9);
                ctx.lineTo(-5, -14);
                ctx.lineTo(5, -14);
                ctx.lineTo(5, -9);
                ctx.stroke();
                // Label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('F', 0, 5);
            }

            ctx.restore();
        }
    }

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

    drawTireMarks() {
        const ctx = this.ctx;
        for (let i = this.tireMarks.length - 1; i >= 0; i--) {
            const m = this.tireMarks[i];
            m.life -= 0.002;
            if (m.life <= 0) { this.tireMarks.splice(i, 1); continue; }
            ctx.fillStyle = `rgba(30,30,30,${m.life * 0.3})`;
            ctx.fillRect(m.x - 1, m.y - 1, 3, 3);
        }
        // Cap tire marks
        if (this.tireMarks.length > 500) {
            this.tireMarks.splice(0, this.tireMarks.length - 500);
        }
    }

    addTireMarks(x, y, angle, w, h) {
        // Add marks at rear wheel positions
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

    drawVignette() {
        const ctx = this.ctx;
        const g = this.game;
        const vw = g.viewW, vh = g.viewH;

        // Red vignette when low fuel
        if (g.fuel < 25 && g.state === 'playing') {
            const intensity = (1 - g.fuel / 25) * (0.3 + Math.sin(g.time * 4) * 0.1);
            const grad = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.3, vw / 2, vh / 2, vw * 0.7);
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${intensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, vw, vh);
        }

        // Police nearby blue flash
        if (g.state === 'playing' && g.police.length > 0) {
            let closest = Infinity;
            for (const c of g.police) {
                const d = dist(g.player.x, g.player.y, c.x, c.y);
                if (d < closest) closest = d;
            }
            if (closest < 150) {
                const flash = (1 - closest / 150) * 0.15 * (Math.sin(this.sirenTick * 8) > 0 ? 1 : 0);
                ctx.fillStyle = `rgba(0,50,255,${flash})`;
                ctx.fillRect(0, 0, vw, vh);
            }
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

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        this._roundRect(mx, my, size, size, 6);
        ctx.strokeRect(mx, my, size, size);

        // Roads
        ctx.fillStyle = 'rgba(100,100,100,0.6)';
        for (let i = 0; i < GRID_N; i++) {
            const pos = i * CELL * scale;
            ctx.fillRect(mx + pos, my, ROAD_W * scale + 1, size);
            ctx.fillRect(mx, my + pos, size, ROAD_W * scale + 1);
        }

        // Viewport
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mx + g.camera.x * scale,
            my + g.camera.y * scale,
            g.viewW * scale,
            g.viewH * scale
        );

        // Jerrycans
        ctx.fillStyle = g.evMode ? '#2ecc71' : '#f1c40f';
        for (const j of g.jerrycans) {
            ctx.fillRect(mx + j.x * scale - 1, my + j.y * scale - 1, 3, 3);
        }

        // Police
        ctx.fillStyle = '#4488ff';
        for (const c of g.police) {
            ctx.fillRect(mx + c.x * scale - 2, my + c.y * scale - 2, 4, 4);
        }

        // Player
        ctx.fillStyle = g.evMode ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(mx + g.player.x * scale - 2, my + g.player.y * scale - 2, 5, 5);
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
