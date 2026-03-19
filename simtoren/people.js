const People = {
  getPopulation(state) {
    let pop = 0;
    for (const room of state.rooms) {
      if (room.demolished) continue;
      const def = ROOMS[room.type];
      if (def.population > 0 && state.connectedFloors.has(room.floor)) {
        pop += def.population;
      }
    }
    return pop;
  },

  isOperating(room, hour, state) {
    if (room.demolished) return false;
    const def = ROOMS[room.type];
    if (def.income <= 0) return false;
    if (state && !state.connectedFloors.has(room.floor)) return false;
    if (!def.hours) return true;
    const [open, close] = def.hours;
    if (open < close) return hour >= open && hour < close;
    return hour >= open || hour < close;
  },

  update(state, dt) {
    const hour = state.hour + state.minute / 60;
    for (const room of state.rooms) {
      if (room.demolished) continue;
      const def = ROOMS[room.type];
      if (def.isTransport) continue;

      const target = People.isOperating(room, hour, state) ? (def.population || 1) : 0;
      const speed = dt * 3;
      if (room.occupancy < target) {
        room.occupancy = Math.min(room.occupancy + speed, target);
      } else if (room.occupancy > target) {
        room.occupancy = Math.max(room.occupancy - speed, target);
      }
    }
  },

  getIncome(state) {
    let income = 0;
    const hour = state.hour + state.minute / 60;
    for (const room of state.rooms) {
      if (room.demolished) continue;
      if (People.isOperating(room, hour, state)) {
        income += ROOMS[room.type].income;
      }
    }
    return income;
  },
};
