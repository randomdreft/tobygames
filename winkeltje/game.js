// ============================================================
//  Winkeltje - Game Engine
// ============================================================

const Game = (() => {
    // State
    let state;
    let shelves = [];
    let customers = [];
    let floatingTexts = [];
    let keys = {};
    let spaceJustPressed = false;
    let spaceHeld = false;
    let animFrame = null;
    let lastTime = 0;
    let dayTimer = 0;
    let running = false;
    let paused = false;
    let lastSpawn = 0;
    let totalEarned = 0;
    let dayNumber = 1;
    let dayActive = true;
    let interactionTarget = null;

    // DOM
    let canvas;

    function defaultState() {
        return {
            player: {
                x: 380, y: 320,
                speed: 3.6,
                maxCarry: 5,
                carrying: [],
                direction: 'down',
            },
            money: 0,
            customersServed: 0,
            level: 1,
            patienceBonus: 1.0,
            incomeMultiplier: 1.0,
            upgrades: [],
            cashRegister: { x: 620, y: 350 },
            trashCan: { x: 720, y: 350 },
        };
    }

    function init() {
        canvas = document.getElementById('gameCanvas');
        Renderer.init(canvas);

        state = defaultState();
        setupShelves();
        setupInput();
        updateUI();
        updateCarrySlots();

        running = true;
        paused = false;
        dayTimer = 0;
        dayNumber = 1;
        dayActive = true;
        totalEarned = 0;
        lastSpawn = performance.now();
        lastTime = performance.now();

        requestAnimationFrame(loop);
    }

    function setupShelves() {
        const layout = getShelfLayout();
        shelves = layout.map(s => ({
            x: s.x,
            y: s.y,
            product: s.product,
        }));
    }

    function getShelfLayout() {
        const maxLayout = Math.min(state.level, 6);
        return SHELF_LAYOUTS[maxLayout] || SHELF_LAYOUTS[6];
    }

    // --- Input ---
    function setupInput() {
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();
                if (!spaceHeld) {
                    spaceJustPressed = true;
                    spaceHeld = true;
                }
            }
            if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                togglePause();
            }
            if (e.key === 'u' || e.key === 'U') {
                toggleUpgradePanel();
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            if (e.key === ' ') {
                spaceHeld = false;
            }
        });
    }

    // --- Main Loop ---
    function loop(timestamp) {
        if (!running) return;

        const dt = Math.min(timestamp - lastTime, 50); // cap delta
        lastTime = timestamp;

        Renderer.tick();

        if (!paused) {
            update(dt, timestamp);
        }

        render();
        animFrame = requestAnimationFrame(loop);
    }

    function update(dt, now) {
        if (state.money <= -50) {
            gameOver();
            return;
        }

        // Day timer
        if (dayActive) {
            dayTimer += dt;
            if (dayTimer >= DAY_LENGTH) {
                endDay();
                return;
            }
        }

        updatePlayer(dt);
        updateCustomers(dt);
        spawnCustomer(now);
        updateFloatingTexts(dt);
        checkInteractions();
        checkLevelUp();
        updateUI();
    }

    // --- Player ---
    function updatePlayer(dt) {
        const p = state.player;
        let dx = 0, dy = 0;

        if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Direction
        if (dx < 0) p.direction = 'left';
        else if (dx > 0) p.direction = 'right';
        else if (dy < 0) p.direction = 'up';
        else if (dy > 0) p.direction = 'down';

        const speed = p.speed * (dt / 16.67);
        const nx = p.x + dx * speed;
        const ny = p.y + dy * speed;

        // Bounds
        if (nx >= 5 && nx <= canvas.width - 33) p.x = nx;
        if (ny >= 56 && ny <= canvas.height - 33) p.y = ny;
    }

    // --- Interactions ---
    function checkInteractions() {
        interactionTarget = null;
        const p = state.player;
        const pcx = p.x + 14;
        const pcy = p.y + 14;

        // Check shelves
        for (const shelf of shelves) {
            const scx = shelf.x + 50;
            const scy = shelf.y + 27;
            if (dist(pcx, pcy, scx, scy) < 55) {
                interactionTarget = { type: 'shelf', obj: shelf };
                if (spaceJustPressed && p.carrying.length < p.maxCarry) {
                    p.carrying.push(shelf.product);
                    addFloatingText(pcx, pcy - 20, PRODUCTS[shelf.product].emoji, '#fff', 18);
                    spaceJustPressed = false;
                    updateCarrySlots();
                }
                break;
            }
        }

        // Check trash can
        if (interactionTarget === null) {
            const tcx = state.trashCan.x + 18;
            const tcy = state.trashCan.y + 20;
            if (dist(pcx, pcy, tcx, tcy) < 50) {
                interactionTarget = { type: 'trash' };
                if (spaceJustPressed && p.carrying.length > 0) {
                    p.carrying = [];
                    addFloatingText(pcx, pcy - 20, 'Weggegooid!', '#FF5722', 14);
                    spaceJustPressed = false;
                    updateCarrySlots();
                }
            }
        }

        // Check cash register
        if (interactionTarget === null) {
            const rcx = state.cashRegister.x + 35;
            const rcy = state.cashRegister.y + 25;
            if (dist(pcx, pcy, rcx, rcy) < 55) {
                interactionTarget = { type: 'register' };
                if (spaceJustPressed && p.carrying.length > 0) {
                    deliverItems();
                    spaceJustPressed = false;
                }
            }
        }

        // Consume space
        spaceJustPressed = false;
    }

    function deliverItems() {
        const p = state.player;
        const first = customers.find(c => c.queuePosition === 0 && !c.served);
        if (!first) return;

        let delivered = false;
        for (let i = p.carrying.length - 1; i >= 0; i--) {
            const item = p.carrying[i];
            const orderItem = first.order.find(o => o.item === item && o.received < o.quantity);
            if (orderItem) {
                orderItem.received++;
                p.carrying.splice(i, 1);
                delivered = true;

                // Patience boost for correct delivery
                first.patience = Math.min(first.maxPatience, first.patience + first.maxPatience * 0.25);

                // Check if order complete
                if (first.order.every(o => o.received >= o.quantity)) {
                    completeOrder(first);
                }
                break;
            }
        }

        if (!delivered) {
            addFloatingText(p.x + 14, p.y - 10, 'Niet nodig!', '#FF9800', 12);
        }

        updateCarrySlots();
    }

    function completeOrder(customer) {
        customer.served = true;
        let total = 0;
        customer.order.forEach(o => {
            total += PRODUCTS[o.item].price * o.quantity;
        });
        total = Math.round(total * state.incomeMultiplier);

        state.money += total;
        totalEarned += total;
        state.customersServed++;

        addFloatingText(state.player.x + 14, state.player.y - 30, `+\u20AC${total}`, '#4CAF50', 20);

        // Remove after short delay
        setTimeout(() => {
            const idx = customers.indexOf(customer);
            if (idx !== -1) {
                customers.splice(idx, 1);
                reorderQueue();
            }
        }, 400);
    }

    // --- Customers ---
    function spawnCustomer(now) {
        if (!dayActive) return;
        if (customers.length >= MAX_QUEUE) return;

        const interval = Math.max(
            MIN_SPAWN_INTERVAL,
            BASE_SPAWN_INTERVAL + SPAWN_INTERVAL_PER_LEVEL * (state.level - 1)
        );

        // During a day, spawn faster toward end
        const dayProgress = dayTimer / DAY_LENGTH;
        const modifier = 1 - dayProgress * 0.3;

        if (now - lastSpawn < interval * modifier) return;
        lastSpawn = now;

        // Available products for this level
        const available = Object.keys(PRODUCTS).filter(p => PRODUCTS[p].unlockLevel <= state.level);

        // Order: 1-3 items
        const numTypes = Math.min(1 + Math.floor(Math.random() * Math.min(3, available.length)), available.length);
        const order = [];
        const used = [];
        for (let i = 0; i < numTypes; i++) {
            const remaining = available.filter(p => !used.includes(p));
            if (remaining.length === 0) break;
            const item = remaining[Math.floor(Math.random() * remaining.length)];
            used.push(item);
            order.push({
                item,
                quantity: 1 + Math.floor(Math.random() * 2),
                received: 0,
            });
        }

        const patience = Math.max(6000, (BASE_PATIENCE + PATIENCE_PER_LEVEL * (state.level - 1)) * state.patienceBonus);
        const queuePos = customers.length;

        customers.push({
            x: state.cashRegister.x - 50 - queuePos * 32,
            y: state.cashRegister.y + 5,
            color: CUSTOMER_COLORS[Math.floor(Math.random() * CUSTOMER_COLORS.length)],
            hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
            name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
            order,
            patience,
            maxPatience: patience,
            served: false,
            queuePosition: queuePos,
        });
    }

    function updateCustomers(dt) {
        for (let i = customers.length - 1; i >= 0; i--) {
            const c = customers[i];

            // Smoothly move to queue position
            const targetX = state.cashRegister.x - 50 - c.queuePosition * 32;
            c.x += (targetX - c.x) * 0.1;

            // Only first in queue loses patience
            if (!c.served && c.queuePosition === 0) {
                c.patience -= dt;
                if (c.patience <= 0) {
                    // Penalty
                    let penalty = 0;
                    c.order.forEach(o => {
                        penalty += PRODUCTS[o.item].price * o.quantity;
                    });
                    state.money -= Math.round(penalty * 0.5);
                    addFloatingText(c.x + 12, c.y - 20, `-\u20AC${Math.round(penalty * 0.5)}`, '#F44336', 18);
                    customers.splice(i, 1);
                    reorderQueue();
                }
            }
        }
    }

    function reorderQueue() {
        customers.forEach((c, i) => {
            c.queuePosition = i;
        });
    }

    // --- Day System ---
    function endDay() {
        dayActive = false;

        // Show day complete overlay
        showDaySummary();
    }

    function showDaySummary() {
        const overlay = document.getElementById('dayOverlay');
        const content = overlay.querySelector('.overlay-content');

        content.innerHTML = `
            <h2>Dag ${dayNumber} Klaar!</h2>
            <div class="stat-line"><span>Klanten bediend</span><span class="stat-val">${state.customersServed}</span></div>
            <div class="stat-line"><span>Geld verdiend</span><span class="stat-val">\u20AC${state.money}</span></div>
            <div class="stat-line"><span>Level</span><span class="stat-val">${state.level}</span></div>
            <p style="margin-top:16px;font-size:0.9rem">De volgende dag wordt drukker...</p>
            <button class="overlay-btn" onclick="Game.nextDay()">Volgende Dag</button>
        `;
        overlay.classList.add('visible');
    }

    function nextDay() {
        dayNumber++;
        dayTimer = 0;
        dayActive = true;
        customers = [];

        // Clear remaining carried items
        state.player.carrying = [];
        state.player.x = 380;
        state.player.y = 320;
        updateCarrySlots();

        document.getElementById('dayOverlay').classList.remove('visible');
        lastSpawn = performance.now();
    }

    // --- Level ---
    function checkLevelUp() {
        const newLevel = LEVEL_THRESHOLDS.findIndex((t, i) =>
            i < LEVEL_THRESHOLDS.length - 1 ? totalEarned < LEVEL_THRESHOLDS[i + 1] : true
        ) + 1;

        const clampedLevel = Math.min(newLevel, 6);
        if (clampedLevel > state.level) {
            state.level = clampedLevel;
            setupShelves();
            showLevelUp(clampedLevel);
        }
    }

    function showLevelUp(level) {
        const banner = document.getElementById('levelBanner');
        banner.textContent = `Level ${level}! Nieuw product ontgrendeld!`;
        banner.classList.add('show');
        setTimeout(() => banner.classList.remove('show'), 2500);
    }

    // --- Game Over ---
    function gameOver() {
        running = false;
        const overlay = document.getElementById('gameOverOverlay');
        const content = overlay.querySelector('.overlay-content');
        content.innerHTML = `
            <h2>Game Over!</h2>
            <p>Je winkel is failliet gegaan.</p>
            <div class="stat-line"><span>Dagen overleefd</span><span class="stat-val">${dayNumber}</span></div>
            <div class="stat-line"><span>Klanten bediend</span><span class="stat-val">${state.customersServed}</span></div>
            <div class="stat-line"><span>Totaal verdiend</span><span class="stat-val">\u20AC${totalEarned}</span></div>
            <button class="overlay-btn" onclick="Game.restart()">Opnieuw Spelen</button>
        `;
        overlay.classList.add('visible');
    }

    // --- Upgrades ---
    function buildUpgradePanel() {
        const panel = document.getElementById('upgradePanel');
        const container = panel.querySelector('.upgrade-list');
        container.innerHTML = '';

        UPGRADES.forEach(up => {
            const owned = state.upgrades.includes(up.id);
            const div = document.createElement('div');
            div.className = 'upgrade-item' + (owned ? ' owned' : '');
            div.innerHTML = `
                <span class="up-icon">${up.icon}</span>
                <div class="up-info">
                    <div class="up-name">${up.name}</div>
                    <div class="up-desc">${up.desc}</div>
                </div>
                <span class="up-cost">${owned ? '\u2714' : '\u20AC' + up.cost}</span>
            `;
            if (!owned) {
                div.addEventListener('click', () => buyUpgrade(up));
            }
            container.appendChild(div);
        });
    }

    function buyUpgrade(upgrade) {
        if (state.upgrades.includes(upgrade.id)) return;
        if (state.money < upgrade.cost) {
            addFloatingText(400, 300, 'Niet genoeg geld!', '#F44336', 16);
            return;
        }

        state.money -= upgrade.cost;
        state.upgrades.push(upgrade.id);
        upgrade.apply(state);
        updateCarrySlots();
        buildUpgradePanel();
        updateUI();
        addFloatingText(400, 250, `${upgrade.icon} ${upgrade.name}!`, '#4CAF50', 18);
    }

    function toggleUpgradePanel() {
        const panel = document.getElementById('upgradePanel');
        panel.classList.toggle('visible');
        if (panel.classList.contains('visible')) {
            buildUpgradePanel();
        }
    }

    // --- Floating Text ---
    function addFloatingText(x, y, text, color = '#4CAF50', size = 16) {
        floatingTexts.push({ x, y, text, color, size, opacity: 1, speed: 1.2 });
    }

    function updateFloatingTexts(dt) {
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y -= ft.speed * (dt / 16.67);
            ft.opacity -= 0.015 * (dt / 16.67);
            if (ft.opacity <= 0) floatingTexts.splice(i, 1);
        }
    }

    // --- Pause ---
    function togglePause() {
        if (!running) return;
        paused = !paused;
        const overlay = document.getElementById('pauseOverlay');
        overlay.classList.toggle('visible', paused);
        updatePauseBtn();
    }

    function updatePauseBtn() {
        const btn = document.getElementById('pauseBtn');
        if (btn) {
            btn.textContent = paused ? 'Hervat' : 'Pauze';
            btn.classList.toggle('active', paused);
        }
    }

    // --- Restart ---
    function restart() {
        if (animFrame) cancelAnimationFrame(animFrame);
        customers = [];
        floatingTexts = [];
        state = defaultState();
        totalEarned = 0;
        dayNumber = 1;
        dayTimer = 0;
        dayActive = true;
        paused = false;
        running = true;

        setupShelves();
        updateUI();
        updateCarrySlots();

        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('visible'));
        updatePauseBtn();

        lastTime = performance.now();
        lastSpawn = performance.now();
        requestAnimationFrame(loop);
    }

    // --- Render ---
    function render() {
        const ctx = Renderer.getCtx();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        Renderer.drawFloor();
        Renderer.drawWalls();

        // Shelves
        shelves.forEach(s => Renderer.drawShelf(s));

        // Cash register & trash
        Renderer.drawCashRegister(state.cashRegister);
        Renderer.drawTrashCan(state.trashCan);

        // Customers
        customers.forEach(c => Renderer.drawCustomer(c));

        // Player
        Renderer.drawPlayer(state.player);

        // Interaction hints
        if (interactionTarget) {
            const p = state.player;
            const hint = interactionTarget.type === 'shelf' ? 'SPATIE: Oppakken'
                : interactionTarget.type === 'trash' ? 'SPATIE: Weggooien'
                : interactionTarget.type === 'register' ? 'SPATIE: Afrekenen'
                : '';
            if (hint) {
                Renderer.drawInteractionHint(p.x + 14, p.y + 40, hint);
            }
        }

        // Floating texts
        Renderer.drawFloatingTexts(floatingTexts);

        // Day timer bar at top
        drawDayTimerBar(ctx);

        // Queue count
        drawQueueCount(ctx);
    }

    function drawDayTimerBar(ctx) {
        if (!dayActive) return;
        const progress = dayTimer / DAY_LENGTH;
        const w = canvas.width - 20;
        const h = 4;
        const x = 10, y = canvas.height - 8;

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x, y, w, h);

        // Gradient from green to orange to red
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, '#4CAF50');
        grad.addColorStop(0.7, '#FF9800');
        grad.addColorStop(1, '#F44336');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w * progress, h);
    }

    function drawQueueCount(ctx) {
        const waiting = customers.filter(c => !c.served).length;
        if (waiting === 0) return;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        Renderer.roundRect(ctx, canvas.width - 90, canvas.height - 30, 80, 22, 6, true, false);
        ctx.fillStyle = '#fff';
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Wachtrij: ${waiting}`, canvas.width - 50, canvas.height - 19);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // --- UI Updates ---
    function updateUI() {
        const moneyEl = document.getElementById('hudMoney');
        const servedEl = document.getElementById('hudServed');
        const levelEl = document.getElementById('hudLevel');
        const dayEl = document.getElementById('hudDay');

        if (moneyEl) moneyEl.textContent = `\u20AC${state.money}`;
        if (servedEl) servedEl.textContent = state.customersServed;
        if (levelEl) levelEl.textContent = state.level;
        if (dayEl) dayEl.textContent = dayNumber;
    }

    function updateCarrySlots() {
        const bar = document.getElementById('carryBar');
        if (!bar) return;
        bar.innerHTML = '';
        for (let i = 0; i < state.player.maxCarry; i++) {
            const slot = document.createElement('div');
            if (i < state.player.carrying.length) {
                slot.className = 'carry-slot filled';
                slot.textContent = PRODUCTS[state.player.carrying[i]].emoji;
            } else {
                slot.className = 'carry-slot empty';
            }
            bar.appendChild(slot);
        }
    }

    // --- Helpers ---
    function dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    return {
        init,
        restart,
        nextDay,
        togglePause,
        toggleUpgradePanel,
    };
})();

// Global access for inline handlers
window.Game = Game;
