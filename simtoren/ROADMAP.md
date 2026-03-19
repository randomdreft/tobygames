# SimToren - Development Roadmap

## Architecture Overview

```
simtoren.html          HTML shell, loads all scripts
simtoren/
  config.js            Constants, room definitions, game balance (~75 lines)
  state.js             Game state create/save/load (~75 lines)
  world.js             Tower grid, room placement/removal, connectivity (~130 lines)
  people.js            Population, occupancy, income calculation (~45 lines)
  elevator.js          Elevator AI with SCAN algorithm (~95 lines)
  renderer.js          Canvas rendering - sky, rooms, people, UI (~280 lines)
  sound.js             Web Audio API synthesized sounds (~65 lines)
  ui.js                Game loop, input handling, HUD, build system (~280 lines)
  style.css            All CSS styling (~130 lines)
```

Files are split for **token efficiency**: each file has a single concern and can be
modified without loading the full codebase. Total: ~1175 lines.

## What's Built (v1 - MVP)

- **Tower building** on a 36-unit wide, 28-floor grid (floor -2 to 25)
- **9 room types**: lobby, office, apartment, shop, restaurant, hotel, cinema, stairs, elevator
- **Day/night cycle** with interpolated sky colors, sun, and stars
- **Financial system**: build costs + hourly income during operating hours
- **Elevator** with SCAN algorithm (two-click placement: click start floor, click end floor)
- **Floor connectivity**: rooms need stairs/elevator path to lobby to function
- **Star progression** (1-5 stars, unlock restaurant at 2★, hotel/cinema at 3★)
- **Save/load** to localStorage with auto-save every 30s
- **Build preview** with green/red validity indicator and cost display
- **Camera** scrolling via mouse wheel + drag (works on both desktop and mobile)
- **Mobile touch** support
- **Sound effects** (Web Audio API, no audio files)
- **Room info panel** with occupancy, income, operating hours
- **Disconnected room indicator** (red overlay + "Geen verbinding!" text)

## Key Data Structures

### Room (state.rooms[])
```javascript
{ id, type, floor, x, occupancy, satisfaction, demolished? }
```

### Elevator (state.elevators[])
```javascript
{ id, x, topFloor, bottomFloor, cabinFloor (float), direction (-1/0/1),
  passengers, waitTimer, calls[] }
```

### Grid (state.grid)
```javascript
"floor,unit" → index into state.rooms[]
```

### Connected Floors (state.connectedFloors)
```javascript
Set of floor numbers reachable from lobby via stairs/elevators
// Recalculated when rooms/elevators change (World.getConnectedFloors)
```

## Game Balance

| Room | Cost | Income/hr | Population | Operating Hours | Unlock |
|------|------|-----------|------------|-----------------|--------|
| Lobby | Free | - | - | - | 1★ |
| Kantoor | €20k | €400 | 6 | 9-17 | 1★ |
| Appartement | €30k | €200 | 3 | 24h | 1★ |
| Winkel | €25k | €300 | 6 | 8-20 | 1★ |
| Restaurant | €80k | €600 | 16 | 11-22 | 2★ |
| Hotel | €40k | €500 | 2 | 18-8 | 3★ |
| Bioscoop | €150k | €800 | 24 | 14-24 | 3★ |
| Trap | €5k | - | - | - | 1★ |
| Lift | €10k/verd | - | - | - | 1★ |

Stars: 0 pop → ⭐, 50 → ⭐⭐, 150 → ⭐⭐⭐, 300 → ⭐⭐⭐⭐, 500 → ⭐⭐⭐⭐⭐

## Priority Backlog

### P0 - High Impact, Reasonable Effort

1. **Individual People Simulation**
   Currently rooms have abstract occupancy numbers. Add person entities that walk
   between rooms, use stairs/elevators, and queue up. This is the heart of SimTower.
   - Files: new `people.js` (major rewrite), `renderer.js` (walking sprites)
   - Person: `{ id, x, floor, destFloor, home, work, schedule, satisfaction, state }`
   - States: walking, waiting_elevator, in_elevator, working, sleeping

2. **Satisfaction & Tenant Departure**
   Rooms should have satisfaction based on elevator wait times, noise proximity,
   and connectivity quality. Unhappy tenants leave (room goes vacant).
   - Files: `people.js`, `ui.js` (complaint notifications), `renderer.js` (indicators)

3. **Elevator Queue Visualization**
   Show people queuing at elevator doors. Cabin doors open/close animation.
   Wait time affects satisfaction.
   - Files: `elevator.js`, `renderer.js`

### P1 - Medium Priority

4. **More Room Types**
   - Parkeergarage (underground, large) - config.js + renderer.js
   - Kliniek (medical clinic) - same pattern
   - Fitnesscentrum - same pattern
   - Vergaderzaal (conference room) - same pattern
   Adding a room type: add entry to ROOMS + ROOM_TYPES in config.js,
   add drawRoomDetail case in renderer.js. That's it.

5. **Express Elevators**
   Elevators that skip floors (only stop at selected floors). Faster transport
   for tall towers. Config: add `expressStops[]` to elevator object.
   - Files: `elevator.js`, `ui.js` (floor selection UI)

6. **Events System**
   VIP visits (instant star upgrade chance), fires (evacuation, damage),
   bomb threats (everyone exits). Timed random events.
   - Files: new `events.js`, integrate in `ui.js` game loop

7. **Noise System**
   Cinema and restaurant create noise that affects adjacent apartments.
   Residential satisfaction drops near noisy rooms.
   - Files: `people.js` or new module

### P2 - Lower Priority

8. **Weekend/Weekday Cycle** - Different behavior patterns on weekends
9. **Weather & Seasons** - Rain, snow, holidays affect visitor count
10. **Multiple Elevator Cabins** - One shaft, multiple cabins (like real SimTower)
11. **Escalators** - Conveyor stairs connecting 2 floors, wider than stairs
12. **Metro Station** - Underground transport hub, massive population boost
13. **Recycling/Maintenance Rooms** - Reduce costs, improve satisfaction
14. **Leaderboard** - Submit tower stats to server.js (like dierenklikker)

## File Modification Guide

| Task | Files to Change |
|------|----------------|
| Add a room type | `config.js` (ROOMS + ROOM_TYPES), `renderer.js` (drawRoomDetail case) |
| Change game balance | `config.js` (ROOMS income/cost, STARS thresholds, SPEEDS) |
| Add UI element | `simtoren.html` + `style.css` + `ui.js` |
| Add simulation feature | `people.js` or new file + `ui.js` (game loop update call) |
| Add visual effect | `renderer.js` (add to render method) |
| Add sound | `sound.js` (add method), call via `Sound.play('name')` |
| Change save format | `state.js` (save/load), ensure backward compatibility |

## Design Notes

- All rendering on a single `<canvas>` element
- Camera: `Renderer.camera.y` controls vertical scroll (positive = see higher floors)
- Coordinate conversion: `Renderer.floorToY(floor)`, `Renderer.unitToX(unit)`,
  `Renderer.screenToFloor(y)`, `Renderer.screenToUnit(x)`
- Time: `CONFIG.SPEEDS[speedIdx]` = game minutes per real second
- Income calculated hourly in game loop (ui.js), not per-frame
- Population = sum of room populations on connected floors only
- Elevator uses two-click placement: first click = start floor, second = end floor
- Demolished rooms are marked `demolished: true` but kept in array (grid refs stay valid)
- `state.connectedFloors` (Set) recalculated only when rooms/elevators change
- Cache busting: bump `?v=N` in simtoren.html when modifying JS/CSS files
