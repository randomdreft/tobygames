# SimToren - Complete Development Guide

> SimTower-inspired tower building game. Built 2026-03-19 as part of TobyGames.nl.
> This file is the primary reference for any AI continuing development.

---

## 1. Architecture Overview

```
simtoren.html              HTML shell, HUD, overlays, loads all scripts in order
simtoren/
  config.js     (77 lines)  Constants, room type definitions, game balance numbers
  state.js      (89 lines)  Game state creation, JSON save/load to localStorage
  world.js     (156 lines)  Tower grid operations, room/elevator placement, connectivity
  people.js     (53 lines)  Population count, operating hours, occupancy, income calc
  elevator.js  (100 lines)  Elevator cabin movement, SCAN algorithm, call generation
  renderer.js  (433 lines)  All canvas drawing: sky, ground, rooms, people, elevators, UI
  sound.js      (72 lines)  Web Audio API synthesized sounds (no audio files)
  ui.js        (398 lines)  Game loop, pointer/keyboard input, build menu, HUD, info panel
  style.css    (130 lines)  All CSS (HUD, build menu, info panel, overlays, mobile)
  ROADMAP.md               THIS FILE - development guide
```

**Script load order** (defined in simtoren.html):
config.js → state.js → world.js → people.js → elevator.js → renderer.js → sound.js → ui.js

All modules are global singleton objects (`CONFIG`, `ROOMS`, `State`, `World`, `People`,
`Elevator`, `Renderer`, `Sound`, `UI`). No imports/exports. Functions reference each other
at call time, not parse time, so load order only matters for constants.

**Cache busting**: Bump `?v=N` in simtoren.html when changing any JS/CSS file.
Current versions: all at v=1.

---

## 2. Coordinate System (CRITICAL)

The tower is rendered as a 2D cross-section on a `<canvas>`. Understanding the coordinate
system is essential for any rendering or input work.

### World coordinates
- **Units** (horizontal): 0 to CONFIG.TOWER_WIDTH-1 (0-35). Each unit = 16px.
- **Floors** (vertical): CONFIG.FLOOR_MIN to CONFIG.FLOOR_MAX (-2 to 25).
  - Floor 0 = begane grond (BG, ground floor) = where the lobby goes
  - Floor 1, 2, 3... = verdieping 1, 2, 3... (above ground)
  - Floor -1 = kelder 1 (K1), Floor -2 = kelder 2 (K2) (underground)
- **Tower width**: 36 units × 16px = 576px, horizontally centered on canvas.
- **Ground**: drawn below floor -2 (CONFIG.FLOOR_MIN). Green grass line + brown earth.

### Screen coordinate conversion

```javascript
// Renderer.groundY = canvas.height - CONFIG.GROUND_MARGIN  (100px from bottom)
// Renderer.towerLeft = (canvas.width - 576) / 2  (centered)
// Renderer.camera.y = vertical scroll offset (positive = scrolled up = see higher floors)

Renderer.floorToY(floor)  → screenY of the TOP edge of that floor
  = groundY - (floor + 1) * FLOOR_PX + camera.y

Renderer.unitToX(unit)    → screenX of the LEFT edge of that unit
  = towerLeft + unit * UNIT_PX

Renderer.screenToFloor(y) → floor number at screen position y
  = Math.floor((groundY + camera.y - y) / FLOOR_PX)

Renderer.screenToUnit(x)  → unit number at screen position x
  = Math.floor((x - towerLeft) / UNIT_PX)
```

### Camera scrolling
- `camera.y` increases when the user scrolls UP (or drags down)
- Clamped to: -GROUND_MARGIN ... FLOOR_MAX × FLOOR_PX
- Mouse wheel: `camera.y -= deltaY * 0.6` (deltaY positive = scroll down)
- Drag: `camera.y = dragStartCamY + (currentY - dragStartY)`

### HiDPI rendering
Canvas uses `devicePixelRatio` for sharp rendering. The canvas element is sized
in CSS pixels but its internal resolution is multiplied by dpr. A `setTransform`
call normalizes the drawing context so all drawing code uses CSS pixel coordinates.

---

## 3. Game Loop (ui.js:gameLoop)

Called via `requestAnimationFrame`, ~60fps. One frame does:

```
1. Calculate dt (real seconds since last frame, capped at 0.1s)
2. If not paused (speed > 0):
   a. Advance game clock: minute += speed × dt
   b. On each hour boundary: collect hourly income from all operating rooms
   c. Handle day rollover (hour >= 24 → new day)
   d. Calculate simDt = dt × speed / 5  (normalized simulation timestep)
   e. People.update(state, simDt)  — adjust room occupancy toward target
   f. Elevator.update(state, simDt) — move cabins, generate calls
   g. Check star progression
3. Renderer.render(state, uiState)  — draw everything
4. UI.updateHUD()  — update money/population/time/income DOM elements
5. Auto-save every 30s
```

### Time system
- `CONFIG.SPEEDS = [0, 2, 5, 15]` — game minutes per real second
- Speed index 0 = paused, 1 = slow (2 min/s), 2 = normal (5 min/s), 3 = fast (15 min/s)
- Default speed index: 2 (5 game minutes per real second)
- 1 game hour at default speed: 12 real seconds
- 1 game day at default speed: ~5 real minutes
- Keyboard 1-4 controls speed

### Income timing
- Income is collected once per game hour (not per frame)
- `UI.lastIncomeHour` prevents double-collection
- `People.getIncome(state)` sums ROOMS[type].income for all operating rooms

---

## 4. Module API Reference

### CONFIG (config.js)
Global constants. Read-only.
- `CONFIG.TOWER_WIDTH` = 36 units
- `CONFIG.FLOOR_MIN` = -2, `CONFIG.FLOOR_MAX` = 25
- `CONFIG.UNIT_PX` = 16, `CONFIG.FLOOR_PX` = 40
- `CONFIG.GROUND_MARGIN` = 100 (px from canvas bottom to ground floor base)
- `CONFIG.START_MONEY` = 500000
- `CONFIG.SPEEDS` = [0, 2, 5, 15]
- `CONFIG.STARS` = [{pop, label}, ...] — 5 star thresholds
- `CONFIG.ELEVATOR_SPEED` = 3 (floors/sec at simDt=1)
- `CONFIG.ELEVATOR_CAPACITY` = 8
- `CONFIG.ELEVATOR_STOP_TIME` = 1.5 (seconds cabin waits at a floor)

### ROOMS (config.js)
Room type definitions. Key = type string used throughout codebase.

Each room has: `name, emoji, width (units), cost (€), income (€/hr), hours ([open,close] or null),
minStar, color (hex), description, population, isTransport?, isElevator?, onlyFloor?`

**hours format**: `[open, close]` where open < close = daytime range, open > close = overnight
wrap (e.g. hotel [18, 8] = 6pm to 8am). `null` = always active (apartments).

### ROOM_TYPES (config.js)
Ordered array of room type keys. Determines build menu order.

### State (state.js)
- `State.create()` → fresh game state object
- `State.save(state)` → writes to localStorage key `simtoren_save`
- `State.load()` → reads + rebuilds grid + floor bounds. Returns state or null
- `State.hasSave()` → boolean
- `State.deleteSave()` → removes save

**State object shape:**
```javascript
{
  money: number,          // current balance in €
  day: number,            // game day (starts at 1)
  hour: number,           // 0-23
  minute: number,         // 0-59.999 (float, fractional for smooth time)
  speedIdx: number,       // index into CONFIG.SPEEDS
  stars: number,          // 1-5
  population: number,     // derived: sum of connected room populations
  rooms: Room[],          // all rooms ever placed (demolished ones stay with .demolished=true)
  elevators: Elevator[],  // elevator logic objects (one per shaft)
  grid: Object,           // "floor,unit" → index into rooms[]
  nextId: number,         // auto-increment ID counter
  totalIncome: number,    // lifetime income
  totalSpent: number,     // lifetime spending
  hasLobby: boolean,      // is there a lobby on floor 0?
  highestFloor: number,   // highest floor with a room
  lowestFloor: number,    // lowest floor with a room
  connectedFloors: Set,   // floors reachable from lobby (NOT serialized, rebuilt on load)
}
```

**Save format quirk**: `connectedFloors` (Set) and `grid` (derived) are NOT saved.
They are rebuilt in `State.load()` (grid) and `UI.startGame()` (connectedFloors, population).

**Demolished rooms**: Rooms are never spliced from the array — they're marked
`demolished: true` and their grid entries are deleted. This is because the grid
stores indices into the rooms array; splicing would invalidate all indices.

### World (world.js)
- `World.canPlace(state, type, floor, x)` → boolean. Checks: bounds, cost, overlap,
  star req, lobby existence, lobby uniqueness, floor restriction.
- `World.placeRoom(state, type, floor, x)` → room object or null.
  Side effects: deducts money, updates grid, recalculates connectivity + population.
- `World.removeRoom(state, roomIdx)` → boolean. Refunds 50%. Marks demolished.
  Recalculates connectivity + population.
- `World.getRoomAt(state, floor, x)` → `{room, index}` or null. Skips demolished.
- `World.placeElevator(state, x, bottomFloor, topFloor)` → elevator object or null.
  Creates one room per floor in the shaft + one elevator logic object.
  Cost = ROOMS.elevator.cost × number of floors.
- `World.getConnectedFloors(state)` → Set of floor numbers reachable from lobby.
  Uses BFS: stairs connect floor F to F+1. Elevators connect all floors in their range.

### People (people.js)
- `People.getPopulation(state)` → total population (only rooms on connected floors)
- `People.isOperating(room, hour, state)` → boolean. Checks: not demolished, has income,
  connected floor, within operating hours.
- `People.update(state, dt)` → adjusts each room's `occupancy` toward target
  (population if operating, 0 if not). Speed: `dt * 3`.
- `People.getIncome(state)` → total €/hr from all currently operating rooms.

### Elevator (elevator.js)
- `Elevator.update(state, dt)` → for each elevator: generate calls, move cabin, stop at floors.
- `Elevator.generateCalls(state, elev)` → operating rooms randomly add their floor to
  `elev.calls[]`. Probability per frame: 0.003 per room. Lobby also added randomly.
- `Elevator.getNextStop(elev)` → next floor to stop at in current direction (SCAN).
- `Elevator.arriveAtFloor(elev, floor)` → stop, wait, remove call, set random passengers.
- `Elevator.pickNextTarget(elev)` → choose direction toward closest call.

**Elevator object:**
```javascript
{
  id, x,                    // shaft left unit position
  topFloor, bottomFloor,    // shaft range
  cabinFloor: float,        // current cabin position (fractional during movement)
  direction: -1|0|1,        // -1=down, 0=stopped, 1=up
  passengers: number,       // visual only (random on arrival)
  waitTimer: number,        // countdown while stopped at a floor
  calls: number[],          // floor numbers requesting service
}
```

### Renderer (renderer.js)
- `Renderer.init(canvasEl)` → setup canvas, resize listener
- `Renderer.resize()` → recalculate dimensions, handle HiDPI
- `Renderer.render(state, uiState)` → draw full frame
- `Renderer.floorToY(floor)` / `unitToX(unit)` → world-to-screen
- `Renderer.screenToFloor(y)` / `screenToUnit(x)` → screen-to-world

**Render order** (painter's algorithm, back to front):
1. `drawSky` — gradient background, stars at night, sun arc
2. `drawGround` — grass line + brown earth below FLOOR_MIN
3. `drawBuilding` — exterior walls, roof, floor lines (only if lobby exists)
4. `drawRooms` — colored rectangles + room-specific details per type
5. `drawElevators` — shaft cables + cabin rectangles with door details
6. `drawPeople` — small colored figures in occupied rooms
7. `drawFloorLabels` — "BG", "1", "2", "K1", "K2" labels left of tower
8. `drawDisconnected` — red overlay + "Geen verbinding!" on unconnected rooms
9. `drawBuildPreview` — green/red ghost rectangle following cursor
10. `drawSelection` — yellow dashed border on selected room

**Room-specific visuals** (`drawRoomDetail` switch):
- lobby: glass doors + plant triangles
- office: window grid + desk rectangles (visible when operating)
- apartment: curtained windows + warm glow at night
- shop: red/white striped awning + display window
- restaurant: circular tables + warm ambiance overlay
- hotel: bed rectangle + small window
- cinema: white screen + red seat rows
- stairs: step pattern (6 diagonal steps)
- elevator: faint shaft background + rail lines

### Sound (sound.js)
- `Sound.init()` → create AudioContext
- `Sound.resume()` → resume if suspended (needed for autoplay policy)
- `Sound.play('name')` → play named sound
- Available sounds: `build`, `demolish`, `cash`, `error`, `ding`, `star`
- `Sound._tone(freq, freq2, dur, type, vol)` — helper for simple tones

### UI (ui.js)
- `UI.init()` → check for save, bind start screen buttons
- `UI.startGame()` → hide overlay, init systems, rebuild derived state, start game loop
- `UI.gameLoop(now)` → main loop (see section 3)
- `UI.buildMenu()` → regenerate build buttons from ROOM_TYPES
- `UI.selectTool(type)` → set active tool (toggle off if same)
- `UI.bindEvents()` → all event listeners (pointer, keyboard, speed, info panel)
- `UI.onDown/onMove/onUp` → unified pointer handling (mouse + touch)
- `UI.showRoomInfo(room)` → populate and show info panel
- `UI.showNotification(text)` → floating banner, auto-removes after 3s
- `UI.checkStars()` → check population against star thresholds

**UI state:**
```javascript
UI.tool          // null | room type string | 'demolish'
UI.hoverFloor    // floor under cursor (or null)
UI.hoverUnit     // unit under cursor (or null)
UI.selectedRoom  // index into state.rooms (or null)
UI.elevDragStart // floor of first elevator click (or null)
UI.elevDragX     // unit of first elevator click (or null)
UI.isDragging    // true during pointer drag
UI.dragMoved     // true if drag exceeded 4px threshold (distinguishes click from drag)
```

---

## 5. Input Handling Model

All pointer input (mouse + touch) is unified through `onDown`, `onMove`, `onUp`.

### Click vs drag detection
Every `onDown` starts a potential drag (`isDragging=true, dragMoved=false`).
If the pointer moves >4px, `dragMoved` becomes true and camera scrolls.
On `onUp`: if `dragMoved` was true → it was a scroll, ignore. If false → it was a click.

### Click actions (by tool state)
| UI.tool | Click behavior |
|---------|---------------|
| `null` | Select room at cursor → show info panel. Or deselect. |
| `'lobby'`/`'office'`/etc. | Place room at cursor (snapped to grid, clamped to tower width). Sound: build or error. |
| `'elevator'` | **Two-click**: 1st click sets start floor. 2nd click completes shaft. |
| `'demolish'` | Remove room at cursor. 50% refund. |

### Elevator two-click flow
1. Select elevator tool from build menu
2. Click on tower → `elevDragStart = floor, elevDragX = unit`
3. Move cursor → preview shows shaft from start to cursor floor
4. Click again → `World.placeElevator(state, elevDragX, min, max)`
5. Reset: `elevDragStart = null`
6. Escape or tool change cancels the partial placement

### Keyboard
- `1-4` → set game speed
- `Escape` → deselect tool, cancel elevator placement, close info panel

### Build preview snapping
For non-elevator rooms, the cursor unit is clamped: `Math.max(0, Math.min(unit, TOWER_WIDTH - def.width))`
so the preview never hangs off the tower edge.

---

## 6. Game Balance

| Room | Cost | Income/hr | Pop | Hours | Unlock | ROI (days) |
|------|------|-----------|-----|-------|--------|------------|
| Lobby | Free | - | - | - | 1★ | - |
| Kantoor | €20k | €400 | 6 | 9-17 (8h) | 1★ | ~6 |
| Appartement | €30k | €200 | 3 | 24h | 1★ | ~6 |
| Winkel | €25k | €300 | 6 | 8-20 (12h) | 1★ | ~7 |
| Restaurant | €80k | €600 | 16 | 11-22 (11h) | 2★ | ~12 |
| Hotel | €40k | €500 | 2 | 18-8 (14h) | 3★ | ~6 |
| Bioscoop | €150k | €800 | 24 | 14-24 (10h) | 3★ | ~19 |
| Trap | €5k | - | - | - | 1★ | - |
| Lift | €10k/verd | - | - | - | 1★ | - |

**Stars**: 0→⭐, 50→⭐⭐, 150→⭐⭐⭐, 300→⭐⭐⭐⭐, 500→⭐⭐⭐⭐⭐

**Demolish refund**: 50% of build cost.

**Starting strategy**: €500k → lobby (free) + 5 offices (€100k, 30 pop) +
5 apartments (€150k, 15 pop) + stairs (€5k) = €255k spent, 45 pop.
One more office → 51 pop → 2★ → restaurants unlock.

---

## 7. Known Limitations & Edge Cases

### Functional limitations (things that DON'T work yet)
- **No elevator demolition**: elevators can't be removed once placed. The elevator
  shaft rooms are in state.rooms but there's no logic to remove the shaft + elevator
  object together. Demolishing individual shaft floors would corrupt the elevator.
- **No room upgrading**: rooms can't be upgraded or changed in-place.
- **Abstract people**: occupancy is a number, not individual entities. No pathfinding,
  no walking animation, no elevator queueing. People are visual-only dots.
- **No maintenance costs**: rooms have no ongoing expenses beyond build cost.
- **Stairs only connect F and F+1**: a stair on floor 3 connects floor 3 to floor 4.
  You need one stair per floor-gap. This is correct SimTower behavior.
- **No undo**: there's no way to undo a placement besides demolishing (losing 50%).

### Edge cases in current code
- **Demolished rooms stay in array**: `state.rooms` grows forever. For very long games
  with lots of demolition, this could slow down iteration. Fix: periodic compaction
  (rebuild array + reindex grid).
- **connectedFloors is a Set**: not serialized to JSON. Rebuilt on load and on any
  room/elevator change. If you add a new transport type, update `World.getConnectedFloors`.
- **Hotel hours wrap**: [18, 8] means 6pm-8am. `People.isOperating` handles this with:
  `if (open > close) return hour >= open || hour < close;`
- **Grid key format**: `"floor,unit"` string. Floor can be negative: `"-1,5"`.
- **Room placement on floor 0**: lobby must be placed first (canPlace checks hasLobby).
  Lobby has `onlyFloor: 0` and width 36 (full tower width).

---

## 8. Step-by-Step: Common Development Tasks

### Adding a new room type
1. **config.js**: Add entry to `ROOMS` object with all required fields
   (name, emoji, width, cost, income, hours, minStar, color, description, population).
   Add key to `ROOM_TYPES` array at desired menu position.
2. **renderer.js**: Add `case 'newtype':` to `drawRoomDetail` switch (line ~162).
   Draw furniture/details using canvas primitives. Also add to `personColor` map.
3. That's it. Build menu, placement, income, save/load all work automatically.

### Changing game balance
Edit values in `ROOMS` (config.js): `cost`, `income`, `population`, `hours`, `minStar`.
Edit `CONFIG.STARS` thresholds. Edit `CONFIG.SPEEDS` for time scaling.
No other files need changes.

### Adding a new sound
1. **sound.js**: Add a method (e.g. `alarm() { this._tone(800, 200, 0.5, 'sawtooth', 0.1); }`)
2. Call it anywhere via `Sound.play('alarm')`.

### Adding a new UI element
1. **simtoren.html**: Add HTML element inside `#game-container`.
2. **style.css**: Style it with `position: absolute` and `z-index: 50+`.
3. **ui.js**: Add event listener in `bindEvents()`, update in `updateHUD()` or `gameLoop()`.

### Adding a simulation feature
1. Create new module file or extend `people.js`.
2. **ui.js**: Call the update function in `gameLoop()` between People.update and render.
3. **simtoren.html**: Add `<script>` tag in correct load order.

### Implementing individual people (the big one)
This is the highest-priority upgrade. Approach:
1. Rewrite `people.js` to maintain a `state.people[]` array of person entities.
2. Each person: `{ id, floor, x (float), destFloor, homeRoom, workRoom, state, satisfaction }`.
3. States: `idle`, `walking`, `waiting_elevator`, `in_elevator`, `working`, `sleeping`.
4. Movement: people walk along floors at ~2 units/sec. They use the nearest transport
   (stairs or elevator) to change floors.
5. For elevators: people queue at the shaft. When cabin arrives, board up to capacity.
   Track `elevator.queue[floor] = [person, ...]`.
6. Satisfaction: decreases while waiting for elevator. Rooms get avg satisfaction of occupants.
7. Renderer: draw walking sprites instead of static dots. Sprite = head circle + body line,
   moving along the floor.
8. **Keep the abstract occupancy system as fallback** until individual people are stable.

---

## 9. Design Decisions & Rationale

| Decision | Why |
|----------|-----|
| Singleton objects, not classes | Matches tobygames convention (politiejacht, dierenklikker). Simple, no build step. |
| Grid as string-keyed object | `"floor,unit"` → index. Simpler than 2D array with negative indices. Fast enough for 36×28 grid. |
| Demolished rooms stay in array | Grid stores indices. Splicing would invalidate all indices above the splice point. Trade-off: slight memory waste vs. correctness. |
| Connectivity recalc on place/remove only | BFS is O(rooms + elevators), not per-frame. Caching in `state.connectedFloors` avoids repeated work. |
| Elevator two-click (not drag) | Drag conflicts with camera scroll on mobile. Two clicks are unambiguous. |
| Income per hour (not per frame) | Avoids floating-point accumulation errors. Clean €/hr display. |
| Abstract occupancy (not individual people) | MVP trade-off. Gets the game playable. Individual people is the #1 upgrade. |
| All rendering on one canvas | No DOM manipulation per frame. Smooth 60fps even with many rooms. |
| No external dependencies | TobyGames convention. Everything works offline. No CDN, no npm. |

---

## 10. Priority Backlog

### P0 — High Impact
1. **Individual People Simulation** (see section 8)
2. **Elevator Queue & Wait Times** — visible queues, satisfaction impact
3. **Satisfaction & Tenant Departure** — unhappy rooms go vacant
4. **Elevator Demolition** — allow removing elevator shafts

### P1 — Medium Priority
5. **More Room Types**: parkeergarage (underground), kliniek, fitnesscentrum, vergaderzaal
6. **Express Elevators**: skip floors, faster for tall towers
7. **Events**: VIP visits, fires, bomb threats
8. **Noise System**: cinema/restaurant noise affects nearby apartments
9. **Tutorial/Onboarding**: guided first few rooms for new players

### P2 — Lower Priority
10. Weekend/weekday cycle
11. Weather & seasons
12. Multiple elevator cabins per shaft
13. Escalators (wide stairs, auto-movement)
14. Metro station (underground, massive population)
15. Maintenance rooms (reduce costs)
16. Leaderboard integration (server.js)

---

## 11. File Modification Quick Reference

| I want to... | Read | Edit |
|--------------|------|------|
| Add a room type | config.js | config.js, renderer.js |
| Change costs/income | config.js | config.js |
| Fix rendering bug | renderer.js | renderer.js |
| Change input behavior | ui.js | ui.js |
| Fix save/load issue | state.js | state.js |
| Add transport type | world.js | world.js (getConnectedFloors), config.js |
| Change placement rules | world.js | world.js (canPlace) |
| Change time/speed | config.js, ui.js | config.js (SPEEDS), ui.js (gameLoop) |
| Add UI element | simtoren.html, style.css, ui.js | all three |
| Add sound effect | sound.js | sound.js |
| Change operating hours | config.js | config.js (ROOMS.*.hours) |
