const Renderer = {
  canvas: null,
  ctx: null,
  camera: { y: 0 },
  width: 0,
  height: 0,
  towerLeft: 0,
  groundY: 0,

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const c = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.width = c.clientWidth;
    this.height = c.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.towerLeft = Math.round((this.width - CONFIG.TOWER_WIDTH * CONFIG.UNIT_PX) / 2);
    this.groundY = this.height - CONFIG.GROUND_MARGIN;
  },

  floorToY(floor) {
    return this.groundY - (floor + 1) * CONFIG.FLOOR_PX + this.camera.y;
  },

  unitToX(unit) {
    return this.towerLeft + unit * CONFIG.UNIT_PX;
  },

  screenToFloor(sy) {
    return Math.floor((this.groundY + this.camera.y - sy) / CONFIG.FLOOR_PX);
  },

  screenToUnit(sx) {
    return Math.floor((sx - this.towerLeft) / CONFIG.UNIT_PX);
  },

  render(state, ui) {
    const ctx = this.ctx;
    const hour = state.hour + state.minute / 60;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawSky(ctx, hour);
    this.drawGround(ctx);
    this.drawBuilding(ctx, state);
    this.drawRooms(ctx, state, hour);
    this.drawElevators(ctx, state);
    this.drawPeople(ctx, state, hour);
    this.drawFloorLabels(ctx, state);
    this.drawDisconnected(ctx, state);

    if (ui.tool) this.drawBuildPreview(ctx, state, ui);
    if (ui.selectedRoom !== null) this.drawSelection(ctx, state, ui.selectedRoom);
  },

  // --- Sky ---
  drawSky(ctx, hour) {
    const col = this.getSkyColor(hour);
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, this.width, this.height);

    if (hour < 6 || hour > 20) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 137.5 + 42) % this.width, (i * 83.3 + 17) % this.groundY, 1.5, 1.5);
      }
    }
    if (hour >= 7 && hour <= 18) {
      const p = (hour - 7) / 11;
      const sx = this.width * 0.1 + p * this.width * 0.8;
      const sy = 60 - Math.sin(p * Math.PI) * 40;
      ctx.fillStyle = '#ffe040';
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
    }
  },

  getSkyColor(hour) {
    const S = [
      [0,10,10,46],[5,10,10,46],[6,255,112,74],[7,255,160,112],
      [8,135,206,235],[17,135,206,235],[18,255,144,80],[19,255,112,48],
      [20,26,26,78],[21,10,10,46],[24,10,10,46],
    ];
    for (let i = 0; i < S.length - 1; i++) {
      if (hour >= S[i][0] && hour < S[i+1][0]) {
        const t = (hour - S[i][0]) / (S[i+1][0] - S[i][0]);
        const r = Math.round(S[i][1] + (S[i+1][1] - S[i][1]) * t);
        const g = Math.round(S[i][2] + (S[i+1][2] - S[i][2]) * t);
        const b = Math.round(S[i][3] + (S[i+1][3] - S[i][3]) * t);
        return `rgb(${r},${g},${b})`;
      }
    }
    return 'rgb(10,10,46)';
  },

  // --- Ground ---
  drawGround(ctx) {
    const gy = this.floorToY(-1) + CONFIG.FLOOR_PX;
    ctx.fillStyle = '#5a8a3a';
    ctx.fillRect(0, gy, this.width, 4);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, gy + 4, this.width, this.height - gy);
  },

  // --- Building shell ---
  drawBuilding(ctx, state) {
    if (!state.hasLobby) return;
    const l = this.unitToX(0) - 4;
    const r = this.unitToX(CONFIG.TOWER_WIDTH) + 4;
    const bot = this.floorToY(state.lowestFloor) + CONFIG.FLOOR_PX;
    const top = this.floorToY(state.highestFloor);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(r, top + 8, 16, bot - top);

    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(l, top, 4, bot - top);
    ctx.fillRect(r, top, 4, bot - top);

    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(l, top - 5, r - l + 4, 5);

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let f = state.lowestFloor; f <= state.highestFloor; f++) {
      const y = this.floorToY(f) + CONFIG.FLOOR_PX;
      ctx.beginPath(); ctx.moveTo(l + 4, y); ctx.lineTo(r, y); ctx.stroke();
    }
  },

  // --- Rooms ---
  drawRooms(ctx, state, hour) {
    for (const room of state.rooms) {
      if (room.demolished) continue;
      const def = ROOMS[room.type];
      const x = this.unitToX(room.x);
      const y = this.floorToY(room.floor);
      const w = def.width * CONFIG.UNIT_PX;
      const h = CONFIG.FLOOR_PX;
      if (y + h < 0 || y > this.height) continue;

      const op = People.isOperating(room, hour, state);
      ctx.fillStyle = op ? def.color : this.darken(def.color, 0.3);
      ctx.fillRect(x, y, w, h);
      this.drawRoomDetail(ctx, room, x, y, w, h, op, hour);

      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  },

  drawRoomDetail(ctx, room, x, y, w, h, op, hour) {
    switch (room.type) {
      case 'lobby':
        ctx.fillStyle = 'rgba(150,200,255,0.35)';
        for (let i = 0; i < 5; i++) ctx.fillRect(x + 30 + i * 100, y + 4, 40, h - 8);
        ctx.fillStyle = '#2a8a2a';
        for (let i = 0; i < 3; i++) {
          const px = x + 60 + i * 160;
          ctx.beginPath();
          ctx.moveTo(px, y + 8); ctx.lineTo(px - 6, y + h - 4); ctx.lineTo(px + 6, y + h - 4);
          ctx.fill();
        }
        break;
      case 'office':
        ctx.fillStyle = op ? 'rgba(200,220,255,0.5)' : 'rgba(100,120,150,0.25)';
        for (let i = 0; i < Math.floor(w / 20); i++) ctx.fillRect(x + 4 + i * 20, y + 4, 14, 15);
        if (op) {
          ctx.fillStyle = 'rgba(139,119,101,0.5)';
          for (let i = 0; i < 3; i++) ctx.fillRect(x + 8 + i * 40, y + h - 12, 24, 4);
        }
        break;
      case 'apartment':
        ctx.fillStyle = op ? 'rgba(255,240,200,0.5)' : 'rgba(100,100,120,0.25)';
        ctx.fillRect(x + 4, y + 4, 16, 15); ctx.fillRect(x + w - 20, y + 4, 16, 15);
        if (room.occupancy > 0 && (hour > 18 || hour < 7)) {
          ctx.fillStyle = 'rgba(255,200,100,0.12)'; ctx.fillRect(x, y, w, h);
        }
        break;
      case 'shop':
        ctx.fillStyle = '#e84040';
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < w; i += 8) ctx.fillRect(x + i, y, 4, 5);
        ctx.fillStyle = 'rgba(200,230,200,0.35)';
        ctx.fillRect(x + 2, y + 7, w - 4, 16);
        break;
      case 'restaurant':
        if (op) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(x + 20 + i * 36, y + h - 14, 5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = 'rgba(255,180,100,0.08)'; ctx.fillRect(x, y, w, h);
        }
        break;
      case 'hotel':
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 4, y + h - 14, w - 8, 8);
        ctx.fillStyle = 'rgba(200,200,230,0.35)';
        ctx.fillRect(x + 6, y + 4, 10, 10);
        break;
      case 'cinema':
        ctx.fillStyle = op ? '#e0e0e0' : '#606060';
        ctx.fillRect(x + 8, y + 4, 24, 14);
        ctx.fillStyle = 'rgba(160,50,50,0.5)';
        for (let r = 0; r < 2; r++)
          for (let s = 0; s < Math.floor(w / 12); s++)
            ctx.fillRect(x + 6 + s * 12, y + h - 16 + r * 8, 8, 5);
        break;
      case 'stairs':
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const sx = x + (i / 6) * w, sy = y + h - (i / 6) * h;
          ctx.beginPath();
          ctx.moveTo(sx, sy); ctx.lineTo(sx + w / 6, sy);
          ctx.lineTo(sx + w / 6, sy - h / 6); ctx.stroke();
        }
        ctx.lineWidth = 1;
        break;
      case 'elevator':
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x + 2, y, w - 4, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y + h);
        ctx.moveTo(x + w - 4, y); ctx.lineTo(x + w - 4, y + h);
        ctx.stroke();
        break;
    }
  },

  // --- Elevators ---
  drawElevators(ctx, state) {
    for (const elev of state.elevators) {
      const x = this.unitToX(elev.x);
      const y = this.floorToY(elev.cabinFloor);
      const w = 2 * CONFIG.UNIT_PX;

      const shaftTop = this.floorToY(elev.topFloor);
      ctx.strokeStyle = '#505050';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, shaftTop);
      ctx.lineTo(x + w / 2, y + 3);
      ctx.stroke();

      ctx.fillStyle = '#505868';
      ctx.fillRect(x + 3, y + 3, w - 6, CONFIG.FLOOR_PX - 6);
      ctx.fillStyle = '#707880';
      const half = (w - 10) / 2;
      ctx.fillRect(x + 5, y + 5, half - 1, CONFIG.FLOOR_PX - 10);
      ctx.fillRect(x + 5 + half + 2, y + 5, half - 1, CONFIG.FLOOR_PX - 10);

      if (elev.passengers > 0) {
        ctx.fillStyle = '#aaffaa';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('' + elev.passengers, x + w / 2, y + CONFIG.FLOOR_PX / 2 + 3);
        ctx.textAlign = 'left';
      }
    }
  },

  // --- People ---
  drawPeople(ctx, state, hour) {
    for (const room of state.rooms) {
      if (room.demolished || room.occupancy < 0.5) continue;
      const def = ROOMS[room.type];
      if (def.isTransport) continue;
      const x = this.unitToX(room.x);
      const y = this.floorToY(room.floor);
      const w = def.width * CONFIG.UNIT_PX;
      if (y + CONFIG.FLOOR_PX < 0 || y > this.height) continue;

      const count = Math.min(Math.round(room.occupancy), 8);
      const col = this.personColor(room.type);
      for (let i = 0; i < count; i++) {
        const px = x + 6 + ((i * 31 + room.id * 17) % Math.max(1, w - 12));
        const py = y + CONFIG.FLOOR_PX - 6;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py - 5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(px - 1, py - 3, 2, 5);
      }
    }
  },

  personColor(type) {
    const m = { office:'#2040a0', apartment:'#40a040', shop:'#a0a040',
      restaurant:'#a04040', hotel:'#8040a0', cinema:'#406080', lobby:'#606060' };
    return m[type] || '#444';
  },

  // --- Disconnected floors indicator ---
  drawDisconnected(ctx, state) {
    for (const room of state.rooms) {
      if (room.demolished) continue;
      const def = ROOMS[room.type];
      if (def.isTransport || room.floor === 0) continue;
      if (state.connectedFloors.has(room.floor)) continue;
      const x = this.unitToX(room.x);
      const y = this.floorToY(room.floor);
      const w = def.width * CONFIG.UNIT_PX;
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.fillRect(x, y, w, CONFIG.FLOOR_PX);
      ctx.fillStyle = 'rgba(255,80,80,0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Geen verbinding!', x + w / 2, y + CONFIG.FLOOR_PX / 2 + 3);
      ctx.textAlign = 'left';
    }
  },

  // --- Floor labels ---
  drawFloorLabels(ctx, state) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    const lx = this.unitToX(0) - 10;
    const maxF = Math.max(state.highestFloor + 2, 5);
    for (let f = CONFIG.FLOOR_MIN; f <= maxF; f++) {
      const y = this.floorToY(f);
      if (y < -20 || y > this.height + 20) continue;
      const label = f === 0 ? 'BG' : (f > 0 ? '' + f : 'K' + (-f));
      ctx.fillText(label, lx, y + CONFIG.FLOOR_PX / 2 + 3);
    }
    ctx.textAlign = 'left';
  },

  // --- Build preview ---
  drawBuildPreview(ctx, state, ui) {
    if (ui.hoverFloor === null || ui.hoverUnit === null) return;

    if (ui.tool === 'demolish') {
      const r = World.getRoomAt(state, ui.hoverFloor, ui.hoverUnit);
      if (r) {
        const d = ROOMS[r.room.type];
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.fillRect(this.unitToX(r.room.x), this.floorToY(r.room.floor),
          d.width * CONFIG.UNIT_PX, CONFIG.FLOOR_PX);
      }
      return;
    }

    if (ui.tool === 'elevator') {
      if (ui.elevDragStart !== null) {
        const bx = this.unitToX(ui.elevDragX);
        const bot = Math.min(ui.elevDragStart, ui.hoverFloor);
        const top = Math.max(ui.elevDragStart, ui.hoverFloor);
        const floors = top - bot + 1;
        const cost = ROOMS.elevator.cost * floors;
        const ok = state.money >= cost;
        // Check for overlaps
        let blocked = false;
        for (let f = bot; f <= top; f++) {
          for (let u = ui.elevDragX; u < ui.elevDragX + 2; u++) {
            if (state.grid[f + ',' + u] !== undefined) { blocked = true; break; }
          }
          if (blocked) break;
        }
        ctx.fillStyle = (!blocked && ok) ? 'rgba(0,200,0,0.25)' : 'rgba(200,0,0,0.25)';
        for (let f = bot; f <= top; f++) {
          ctx.fillRect(bx, this.floorToY(f), 2 * CONFIG.UNIT_PX, CONFIG.FLOOR_PX);
        }
        ctx.fillStyle = (!blocked && ok) ? '#0a0' : '#a00';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u20ac' + cost.toLocaleString('nl-NL'), bx + CONFIG.UNIT_PX, this.floorToY(top) - 4);
        ctx.textAlign = 'left';
      } else {
        // Show single-floor preview where elevator will start
        const bx = this.unitToX(ui.hoverUnit);
        ctx.fillStyle = 'rgba(100,100,200,0.2)';
        ctx.fillRect(bx, this.floorToY(ui.hoverFloor), 2 * CONFIG.UNIT_PX, CONFIG.FLOOR_PX);
        ctx.fillStyle = '#88a';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Klik start', bx + CONFIG.UNIT_PX, this.floorToY(ui.hoverFloor) + CONFIG.FLOOR_PX / 2);
        ctx.textAlign = 'left';
      }
      return;
    }

    const def = ROOMS[ui.tool];
    if (!def) return;
    const px = Math.max(0, Math.min(ui.hoverUnit, CONFIG.TOWER_WIDTH - def.width));
    const ok = World.canPlace(state, ui.tool, ui.hoverFloor, px);
    ctx.fillStyle = ok ? 'rgba(0,200,0,0.25)' : 'rgba(200,0,0,0.25)';
    ctx.fillRect(this.unitToX(px), this.floorToY(ui.hoverFloor),
      def.width * CONFIG.UNIT_PX, CONFIG.FLOOR_PX);
    if (def.cost > 0) {
      ctx.fillStyle = ok ? '#0a0' : '#a00';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u20ac' + def.cost.toLocaleString('nl-NL'),
        this.unitToX(px) + (def.width * CONFIG.UNIT_PX) / 2,
        this.floorToY(ui.hoverFloor) - 4);
      ctx.textAlign = 'left';
    }
  },

  // --- Selection highlight ---
  drawSelection(ctx, state, roomIdx) {
    const room = state.rooms[roomIdx];
    if (!room || room.demolished) return;
    const def = ROOMS[room.type];
    const x = this.unitToX(room.x), y = this.floorToY(room.floor);
    const w = def.width * CONFIG.UNIT_PX;
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x - 1, y - 1, w + 2, CONFIG.FLOOR_PX + 2);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  },

  darken(hex, amt) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r*(1-amt))},${Math.round(g*(1-amt))},${Math.round(b*(1-amt))})`;
  },
};
