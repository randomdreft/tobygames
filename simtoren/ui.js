const UI = {
  state: null,
  tool: null,
  hoverFloor: null,
  hoverUnit: null,
  selectedRoom: null,
  elevDragStart: null,
  elevDragX: null,
  isDragging: false,
  dragStartY: 0,
  dragStartCamY: 0,
  dragMoved: false,
  lastTime: 0,
  running: false,
  saveTimer: 0,
  lastIncomeHour: -1,
  lastTouchX: 0,
  lastTouchY: 0,

  init() {
    if (State.hasSave()) {
      document.getElementById('continue-btn').classList.remove('hidden');
    }
    document.getElementById('new-game-btn').addEventListener('click', () => {
      UI.state = State.create();
      UI.startGame();
    });
    document.getElementById('continue-btn').addEventListener('click', () => {
      UI.state = State.load() || State.create();
      UI.startGame();
    });
  },

  startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    Sound.init();
    Renderer.init(document.getElementById('gameCanvas'));

    UI.state.connectedFloors = World.getConnectedFloors(UI.state);
    UI.state.population = People.getPopulation(UI.state);
    UI.lastIncomeHour = UI.state.hour;

    UI.buildMenu();
    UI.bindEvents();
    UI.updateSpeedButtons();

    if (!UI.state.hasLobby) {
      UI.selectTool('lobby');
      UI.showNotification('Plaats eerst de lobby op de begane grond!');
    }

    UI.running = true;
    UI.lastTime = performance.now();
    requestAnimationFrame(UI.gameLoop);
  },

  gameLoop(now) {
    if (!UI.running) return;
    const dt = Math.min((now - UI.lastTime) / 1000, 0.1);
    UI.lastTime = now;

    const state = UI.state;
    const speed = CONFIG.SPEEDS[state.speedIdx];

    if (speed > 0) {
      state.minute += speed * dt;
      while (state.minute >= 60) {
        state.minute -= 60;
        state.hour++;

        if (state.hour !== UI.lastIncomeHour) {
          const inc = People.getIncome(state);
          if (inc > 0) {
            state.money += inc;
            state.totalIncome += inc;
          }
          UI.lastIncomeHour = state.hour;
        }
      }
      while (state.hour >= 24) {
        state.hour -= 24;
        state.day++;
      }

      const simDt = dt * speed / 5;
      People.update(state, simDt);
      Elevator.update(state, simDt);
      UI.checkStars();
    }

    Renderer.render(state, {
      tool: UI.tool,
      hoverFloor: UI.hoverFloor,
      hoverUnit: UI.hoverUnit,
      selectedRoom: UI.selectedRoom,
      elevDragStart: UI.elevDragStart,
      elevDragX: UI.elevDragX,
    });

    UI.updateHUD();

    UI.saveTimer += dt;
    if (UI.saveTimer >= CONFIG.SAVE_INTERVAL / 1000) {
      UI.saveTimer = 0;
      State.save(state);
    }

    requestAnimationFrame(UI.gameLoop);
  },

  updateHUD() {
    const s = UI.state;
    document.getElementById('money-display').textContent =
      '\u20ac' + Math.floor(s.money).toLocaleString('nl-NL');
    document.getElementById('population-display').textContent =
      '\ud83d\udc65 ' + s.population;
    document.getElementById('star-display').textContent =
      CONFIG.STARS[s.stars - 1].label;

    const hh = String(s.hour).padStart(2, '0');
    const mm = String(Math.floor(s.minute)).padStart(2, '0');
    document.getElementById('time-display').textContent =
      'Dag ' + s.day + ' - ' + hh + ':' + mm;

    if (UI.hoverFloor !== null) {
      const f = UI.hoverFloor;
      document.getElementById('floor-indicator').textContent =
        f === 0 ? 'Begane grond' : (f > 0 ? 'Verdieping ' + f : 'Kelder ' + (-f));
    }

    const incEl = document.getElementById('income-display');
    if (incEl) {
      const inc = People.getIncome(UI.state);
      incEl.textContent = '+\u20ac' + inc.toLocaleString('nl-NL') + '/u';
    }
  },

  checkStars() {
    const s = UI.state;
    for (let i = CONFIG.STARS.length - 1; i >= 0; i--) {
      if (s.population >= CONFIG.STARS[i].pop && i + 1 > s.stars) {
        s.stars = i + 1;
        Sound.play('star');
        UI.showNotification('Gefeliciteerd! ' + CONFIG.STARS[i].label + ' bereikt!');
        UI.buildMenu();
        break;
      }
    }
  },

  buildMenu() {
    const c = document.getElementById('build-buttons');
    c.innerHTML = '';
    for (const type of ROOM_TYPES) {
      const def = ROOMS[type];
      const btn = document.createElement('button');
      const locked = def.minStar > UI.state.stars;
      btn.className = 'tool-btn' + (locked ? ' locked' : '') + (UI.tool === type ? ' active' : '');
      btn.dataset.type = type;

      const cost = type === 'elevator'
        ? '\u20ac' + def.cost.toLocaleString('nl-NL') + '/verd.'
        : (def.cost > 0 ? '\u20ac' + def.cost.toLocaleString('nl-NL') : 'Gratis');
      btn.innerHTML = '<span class="tool-emoji">' + def.emoji + '</span> ' + def.name +
        '<br><small>' + cost + '</small>';

      if (locked) {
        btn.title = 'Vereist: ' + CONFIG.STARS[def.minStar - 1].label;
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => UI.selectTool(type));
      }
      c.appendChild(btn);
    }
  },

  selectTool(type) {
    UI.elevDragStart = null;
    UI.elevDragX = null;
    UI.selectedRoom = null;
    document.getElementById('info-panel').classList.add('hidden');

    if (UI.tool === type) {
      UI.tool = null;
    } else {
      UI.tool = type;
    }
    UI.refreshToolButtons();
  },

  refreshToolButtons() {
    document.querySelectorAll('#build-buttons .tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === UI.tool);
    });
    document.getElementById('demolish-btn').classList.toggle('active', UI.tool === 'demolish');
  },

  updateSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === UI.state.speedIdx);
    });
  },

  bindEvents() {
    const cv = Renderer.canvas;

    cv.addEventListener('mousedown', e => UI.onDown(e.offsetX, e.offsetY));
    cv.addEventListener('mousemove', e => UI.onMove(e.offsetX, e.offsetY));
    cv.addEventListener('mouseup', e => UI.onUp(e.offsetX, e.offsetY));
    cv.addEventListener('mouseleave', () => { UI.hoverFloor = null; UI.hoverUnit = null; });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      Renderer.camera.y -= e.deltaY * 0.6;
      Renderer.camera.y = Math.max(-CONFIG.GROUND_MARGIN,
        Math.min(CONFIG.FLOOR_MAX * CONFIG.FLOOR_PX, Renderer.camera.y));
    }, { passive: false });

    cv.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0], r = cv.getBoundingClientRect();
      UI.onDown(t.clientX - r.left, t.clientY - r.top);
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0], r = cv.getBoundingClientRect();
      UI.onMove(t.clientX - r.left, t.clientY - r.top);
    }, { passive: false });
    cv.addEventListener('touchend', e => {
      e.preventDefault();
      UI.onUp(UI.lastTouchX, UI.lastTouchY);
    }, { passive: false });

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.state.speedIdx = parseInt(btn.dataset.speed);
        UI.updateSpeedButtons();
      });
    });

    document.getElementById('demolish-btn').addEventListener('click', () => UI.selectTool('demolish'));

    document.getElementById('info-close').addEventListener('click', () => {
      document.getElementById('info-panel').classList.add('hidden');
      UI.selectedRoom = null;
    });

    document.getElementById('info-demolish').addEventListener('click', () => {
      if (UI.selectedRoom !== null) {
        const room = UI.state.rooms[UI.selectedRoom];
        if (room && !room.demolished) {
          World.removeRoom(UI.state, UI.selectedRoom);
          Sound.play('demolish');
          document.getElementById('info-panel').classList.add('hidden');
          UI.selectedRoom = null;
        }
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        UI.tool = null;
        UI.elevDragStart = null;
        UI.elevDragX = null;
        UI.selectedRoom = null;
        UI.refreshToolButtons();
        document.getElementById('info-panel').classList.add('hidden');
      }
      if (e.key >= '1' && e.key <= '4') {
        UI.state.speedIdx = parseInt(e.key) - 1;
        UI.updateSpeedButtons();
      }
    });
  },

  onDown(x, y) {
    Sound.resume();
    UI.isDragging = true;
    UI.dragStartY = y;
    UI.dragStartCamY = Renderer.camera.y;
    UI.dragMoved = false;
  },

  onMove(x, y) {
    UI.lastTouchX = x;
    UI.lastTouchY = y;
    UI.hoverFloor = Renderer.screenToFloor(y);
    UI.hoverUnit = Renderer.screenToUnit(x);

    if (UI.isDragging) {
      const dy = y - UI.dragStartY;
      if (Math.abs(dy) > 4) UI.dragMoved = true;
      Renderer.camera.y = UI.dragStartCamY + dy;
      Renderer.camera.y = Math.max(-CONFIG.GROUND_MARGIN,
        Math.min(CONFIG.FLOOR_MAX * CONFIG.FLOOR_PX, Renderer.camera.y));
    }
  },

  onUp(x, y) {
    const wasDrag = UI.isDragging && UI.dragMoved;
    UI.isDragging = false;
    if (wasDrag) return;

    const floor = Renderer.screenToFloor(y);
    const unit = Renderer.screenToUnit(x);

    // Elevator two-click
    if (UI.tool === 'elevator') {
      if (UI.elevDragStart === null) {
        UI.elevDragStart = floor;
        UI.elevDragX = unit;
      } else {
        const bot = Math.min(UI.elevDragStart, floor);
        const top = Math.max(UI.elevDragStart, floor);
        if (top > bot) {
          if (World.placeElevator(UI.state, UI.elevDragX, bot, top)) {
            Sound.play('build');
          } else {
            Sound.play('error');
          }
        }
        UI.elevDragStart = null;
        UI.elevDragX = null;
      }
      return;
    }

    // Demolish
    if (UI.tool === 'demolish') {
      const r = World.getRoomAt(UI.state, floor, unit);
      if (r) { World.removeRoom(UI.state, r.index); Sound.play('demolish'); }
      return;
    }

    // Place room
    if (UI.tool) {
      const def = ROOMS[UI.tool];
      const px = def ? Math.max(0, Math.min(unit, CONFIG.TOWER_WIDTH - def.width)) : unit;
      if (World.canPlace(UI.state, UI.tool, floor, px)) {
        World.placeRoom(UI.state, UI.tool, floor, px);
        Sound.play('build');
      } else {
        Sound.play('error');
      }
      return;
    }

    // Select room
    const r = World.getRoomAt(UI.state, floor, unit);
    if (r) {
      UI.selectedRoom = r.index;
      UI.showRoomInfo(r.room);
    } else {
      UI.selectedRoom = null;
      document.getElementById('info-panel').classList.add('hidden');
    }
  },

  showRoomInfo(room) {
    const def = ROOMS[room.type];
    const panel = document.getElementById('info-panel');
    panel.classList.remove('hidden');
    document.getElementById('info-title').textContent = def.emoji + ' ' + def.name;

    const hour = UI.state.hour + UI.state.minute / 60;
    const op = People.isOperating(room, hour, UI.state);
    const connected = UI.state.connectedFloors.has(room.floor);

    let html = '<p>' + def.description + '</p>';
    html += '<p>Verdieping: ' + (room.floor === 0 ? 'BG' : room.floor) + '</p>';
    if (!connected && room.floor !== 0) {
      html += '<p style="color:#ff6060">Niet verbonden met lobby!</p>';
    }
    if (def.income > 0) {
      html += '<p>Inkomen: \u20ac' + def.income + '/uur</p>';
      html += '<p>Status: ' + (op ? '\u2705 Open' : '\u274c Gesloten') + '</p>';
      if (def.hours) {
        html += '<p>Open: ' + def.hours[0] + ':00 - ' + def.hours[1] + ':00</p>';
      }
    }
    if (def.population > 0) {
      html += '<p>Bezetting: ' + Math.round(room.occupancy) + '/' + def.population + '</p>';
    }

    document.getElementById('info-content').innerHTML = html;
    document.getElementById('info-demolish').style.display =
      room.type === 'lobby' ? 'none' : 'block';
  },

  showNotification(text) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = text;
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
};

document.addEventListener('DOMContentLoaded', () => UI.init());
