const State = {
  create() {
    return {
      money: CONFIG.START_MONEY,
      day: 1,
      hour: 8,
      minute: 0,
      speedIdx: CONFIG.DEFAULT_SPEED,
      stars: 1,
      population: 0,
      rooms: [],
      elevators: [],
      grid: {},
      nextId: 1,
      totalIncome: 0,
      totalSpent: 0,
      hasLobby: false,
      highestFloor: 0,
      lowestFloor: 0,
      connectedFloors: new Set([0]),
    };
  },

  save(state) {
    try {
      const data = {
        money: state.money,
        day: state.day,
        hour: state.hour,
        minute: state.minute,
        stars: state.stars,
        speedIdx: state.speedIdx,
        rooms: state.rooms,
        elevators: state.elevators,
        nextId: state.nextId,
        totalIncome: state.totalIncome,
        totalSpent: state.totalSpent,
        hasLobby: state.hasLobby,
      };
      localStorage.setItem('simtoren_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem('simtoren_save');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const state = State.create();
      Object.assign(state, data);

      // Rebuild grid
      state.grid = {};
      for (let i = 0; i < state.rooms.length; i++) {
        const room = state.rooms[i];
        if (room.demolished) continue;
        const def = ROOMS[room.type];
        if (!def) continue;
        for (let u = room.x; u < room.x + def.width; u++) {
          state.grid[room.floor + ',' + u] = i;
        }
      }

      // Rebuild floor bounds
      state.highestFloor = 0;
      state.lowestFloor = 0;
      for (const room of state.rooms) {
        if (room.demolished) continue;
        if (room.floor > state.highestFloor) state.highestFloor = room.floor;
        if (room.floor < state.lowestFloor) state.lowestFloor = room.floor;
      }

      return state;
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  },

  hasSave() {
    return localStorage.getItem('simtoren_save') !== null;
  },

  deleteSave() {
    localStorage.removeItem('simtoren_save');
  },
};
