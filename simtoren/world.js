const World = {
  canPlace(state, type, floor, x) {
    const def = ROOMS[type];
    if (!def) return false;
    if (floor < CONFIG.FLOOR_MIN || floor > CONFIG.FLOOR_MAX) return false;
    if (x < 0 || x + def.width > CONFIG.TOWER_WIDTH) return false;
    if (def.minStar > state.stars) return false;
    if (def.onlyFloor !== undefined && floor !== def.onlyFloor) return false;
    if (type !== 'elevator' && state.money < def.cost) return false;
    if (type !== 'lobby' && !state.hasLobby) return false;
    if (type === 'lobby' && state.hasLobby) return false;

    for (let u = x; u < x + def.width; u++) {
      const existing = state.grid[floor + ',' + u];
      if (existing !== undefined) {
        // Transport (stairs/elevators) may overlap the lobby
        if (def.isTransport && state.rooms[existing] && state.rooms[existing].type === 'lobby') continue;
        return false;
      }
    }
    return true;
  },

  placeRoom(state, type, floor, x) {
    if (!World.canPlace(state, type, floor, x)) return null;
    const def = ROOMS[type];
    const room = {
      id: state.nextId++,
      type: type,
      floor: floor,
      x: x,
      occupancy: 0,
      satisfaction: 100,
    };

    const idx = state.rooms.length;
    state.rooms.push(room);
    for (let u = x; u < x + def.width; u++) {
      state.grid[floor + ',' + u] = idx;
    }

    state.money -= def.cost;
    state.totalSpent += def.cost;
    if (type === 'lobby') state.hasLobby = true;
    if (floor > state.highestFloor) state.highestFloor = floor;
    if (floor < state.lowestFloor) state.lowestFloor = floor;

    state.connectedFloors = World.getConnectedFloors(state);
    state.population = People.getPopulation(state);
    return room;
  },

  removeRoom(state, roomIdx) {
    const room = state.rooms[roomIdx];
    if (!room || room.demolished) return false;
    const def = ROOMS[room.type];

    for (let u = room.x; u < room.x + def.width; u++) {
      delete state.grid[room.floor + ',' + u];
    }
    room.demolished = true;

    // Restore lobby grid cells underneath demolished transport
    if (def.isTransport && room.floor === 0 && state.hasLobby) {
      const lobbyIdx = state.rooms.findIndex(r => r.type === 'lobby' && !r.demolished);
      if (lobbyIdx >= 0) {
        for (let u = room.x; u < room.x + def.width; u++) {
          if (state.grid[room.floor + ',' + u] === undefined) {
            state.grid[room.floor + ',' + u] = lobbyIdx;
          }
        }
      }
    }

    if (room.type === 'lobby') state.hasLobby = false;
    state.money += Math.floor(def.cost * 0.5);

    state.connectedFloors = World.getConnectedFloors(state);
    state.population = People.getPopulation(state);
    return true;
  },

  getRoomAt(state, floor, x) {
    const idx = state.grid[floor + ',' + x];
    if (idx === undefined) return null;
    const room = state.rooms[idx];
    if (!room || room.demolished) return null;
    return { room, index: idx };
  },

  placeElevator(state, x, bottomFloor, topFloor) {
    const floors = topFloor - bottomFloor + 1;
    const totalCost = ROOMS.elevator.cost * floors;
    if (state.money < totalCost) return null;
    if (x < 0 || x + 2 > CONFIG.TOWER_WIDTH) return null;
    if (!state.hasLobby) return null;

    for (let f = bottomFloor; f <= topFloor; f++) {
      for (let u = x; u < x + 2; u++) {
        const existing = state.grid[f + ',' + u];
        if (existing !== undefined) {
          // Elevator may overlap the lobby
          if (state.rooms[existing] && state.rooms[existing].type === 'lobby') continue;
          return null;
        }
      }
    }

    for (let f = bottomFloor; f <= topFloor; f++) {
      const room = {
        id: state.nextId++,
        type: 'elevator',
        floor: f,
        x: x,
        occupancy: 0,
        satisfaction: 100,
      };
      const idx = state.rooms.length;
      state.rooms.push(room);
      for (let u = x; u < x + 2; u++) {
        state.grid[f + ',' + u] = idx;
      }
      if (f > state.highestFloor) state.highestFloor = f;
      if (f < state.lowestFloor) state.lowestFloor = f;
    }

    const elevator = {
      id: state.nextId++,
      x: x,
      topFloor: topFloor,
      bottomFloor: bottomFloor,
      cabinFloor: bottomFloor,
      direction: 0,
      passengers: 0,
      waitTimer: 0,
      calls: [],
    };
    state.elevators.push(elevator);
    state.money -= totalCost;
    state.totalSpent += totalCost;

    state.connectedFloors = World.getConnectedFloors(state);
    state.population = People.getPopulation(state);
    return elevator;
  },

  getConnectedFloors(state) {
    if (!state.hasLobby) return new Set();
    const connected = new Set([0]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const room of state.rooms) {
        if (room.demolished || room.type !== 'stairs') continue;
        const f1 = room.floor;
        const f2 = room.floor + 1;
        if (connected.has(f1) && !connected.has(f2)) {
          connected.add(f2); changed = true;
        }
        if (connected.has(f2) && !connected.has(f1)) {
          connected.add(f1); changed = true;
        }
      }
      for (const elev of state.elevators) {
        let any = false;
        for (let f = elev.bottomFloor; f <= elev.topFloor; f++) {
          if (connected.has(f)) { any = true; break; }
        }
        if (any) {
          for (let f = elev.bottomFloor; f <= elev.topFloor; f++) {
            if (!connected.has(f)) { connected.add(f); changed = true; }
          }
        }
      }
    }
    return connected;
  },
};
