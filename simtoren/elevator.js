const Elevator = {
  update(state, dt) {
    for (const elev of state.elevators) {
      Elevator.generateCalls(state, elev);

      if (elev.waitTimer > 0) {
        elev.waitTimer -= dt;
        if (elev.waitTimer <= 0) {
          elev.waitTimer = 0;
          Elevator.pickNextTarget(elev);
        }
        continue;
      }

      if (elev.direction !== 0) {
        elev.cabinFloor += elev.direction * CONFIG.ELEVATOR_SPEED * dt;

        const target = Elevator.getNextStop(elev);
        if (target !== null) {
          if (elev.direction > 0 && elev.cabinFloor >= target) {
            elev.cabinFloor = target;
            Elevator.arriveAtFloor(elev, target);
          } else if (elev.direction < 0 && elev.cabinFloor <= target) {
            elev.cabinFloor = target;
            Elevator.arriveAtFloor(elev, target);
          }
        }

        if (elev.cabinFloor <= elev.bottomFloor) {
          elev.cabinFloor = elev.bottomFloor;
          if (elev.direction < 0) Elevator.pickNextTarget(elev);
        }
        if (elev.cabinFloor >= elev.topFloor) {
          elev.cabinFloor = elev.topFloor;
          if (elev.direction > 0) Elevator.pickNextTarget(elev);
        }
      } else {
        Elevator.pickNextTarget(elev);
      }
    }
  },

  generateCalls(state, elev) {
    const hour = state.hour + state.minute / 60;
    for (const room of state.rooms) {
      if (room.demolished) continue;
      const def = ROOMS[room.type];
      if (def.isTransport || def.income <= 0) continue;
      if (!People.isOperating(room, hour, state)) continue;
      if (room.floor < elev.bottomFloor || room.floor > elev.topFloor) continue;
      if (Math.random() < 0.003 && !elev.calls.includes(room.floor)) {
        elev.calls.push(room.floor);
      }
    }
    if (elev.calls.length > 0 && !elev.calls.includes(0) &&
        0 >= elev.bottomFloor && 0 <= elev.topFloor && Math.random() < 0.01) {
      elev.calls.push(0);
    }
  },

  getNextStop(elev) {
    if (elev.calls.length === 0) return null;
    const sorted = [...elev.calls].sort((a, b) => a - b);
    if (elev.direction > 0) {
      for (const f of sorted) {
        if (f >= Math.ceil(elev.cabinFloor)) return f;
      }
    } else if (elev.direction < 0) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i] <= Math.floor(elev.cabinFloor)) return sorted[i];
      }
    }
    return sorted[0];
  },

  arriveAtFloor(elev, floor) {
    elev.direction = 0;
    elev.waitTimer = CONFIG.ELEVATOR_STOP_TIME;
    const idx = elev.calls.indexOf(floor);
    if (idx >= 0) elev.calls.splice(idx, 1);
    elev.passengers = Math.floor(Math.random() * CONFIG.ELEVATOR_CAPACITY);
  },

  pickNextTarget(elev) {
    if (elev.calls.length === 0) {
      elev.direction = 0;
      return;
    }
    const cur = Math.round(elev.cabinFloor);
    let closest = elev.calls[0];
    let minDist = Math.abs(closest - cur);
    for (const f of elev.calls) {
      const d = Math.abs(f - cur);
      if (d < minDist) { closest = f; minDist = d; }
    }
    if (closest > cur) elev.direction = 1;
    else if (closest < cur) elev.direction = -1;
    else Elevator.arriveAtFloor(elev, cur);
  },
};
