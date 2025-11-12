# Stage 23: Interactive System Map with TravellerMap Integration

**Priority:** LOW (Nice-to-have, late-stage feature)
**Estimated:** ~20k tokens, 6-8 weeks hobby pace, ~1,500 LOC production, ~500 LOC test
**Dependencies:** Stages 1-22 complete (all core features done)

---

## User Vision

> "I also have a vision, for later stages, to show an interactive top-down view of the current solar system. Ideally I'd like a clean transition from travellermap.com that includes system data on each system. As in, a top-down solar system view showing the PC ship and whatever is going on in the starsystem. Accurate to astrophysics maybe even to the point of animation. This is a late-stage nice-to-have"

---

## Vision Summary

**Goal:** Create an immersive strategic layer above tactical space combat
- Top-down 2D view of entire star system
- Physics-accurate orbital mechanics (optional)
- Seamless zoom between system map → tactical combat
- Integration with TravellerMap.com for system data
- Animated planetary orbits
- Multiple ships, stations, jump points visible
- Time acceleration (hours/days)
- Random encounters during in-system travel

**Inspiration:** Elite Dangerous system map, Kerbal Space Program orbital mechanics, Star Citizen planetary approach

**Value:**
- Strategic gameplay (where to refuel, patrol routes)
- Immersion (see the whole system, not just combat)
- Educational (astrophysics, orbital mechanics)
- Unique feature (no other Traveller VTT has this)

---

## Acceptance Criteria

### System Map Core
- [ ] Top-down 2D view of star system
- [ ] System bodies rendered (star, planets, moons, stations, jump points)
- [ ] PC ship visible and controllable
- [ ] Real-time position updates
- [ ] Pan/zoom controls (mouse wheel, touch gestures)

### TravellerMap Integration
- [ ] Fetch system data from TravellerMap.com API
- [ ] Parse UWP (Universal World Profile) data
- [ ] Display system information (starport, tech level, population, etc.)
- [ ] Clickable planets/stations (show details panel)
- [ ] Handle API errors gracefully (offline mode)

### Physics Engine
- [ ] Physics-accurate orbital mechanics (optional toggle)
- [ ] Orbital periods calculated from mass/distance
- [ ] Ship thrust vectors displayed
- [ ] Hohmann transfer orbits (efficient travel)
- [ ] Gravity wells affect ship trajectory
- [ ] Time acceleration (1x, 10x, 100x, 1000x)

### Navigation System
- [ ] Plot course between bodies
- [ ] Fuel consumption calculation
- [ ] Travel time estimation
- [ ] Autopilot (automatic course execution)
- [ ] Manual control (thrust vector adjustment)
- [ ] Waypoint system

### Combat Integration
- [ ] Encounter detection (pirates, patrols, etc.)
- [ ] Zoom from system map → tactical combat
- [ ] Range determined by relative positions
- [ ] After combat, return to system map
- [ ] Damage persists across transitions

### Visual Polish
- [ ] Animated planetary orbits (optional)
- [ ] Scale adjustable (realistic vs. gamey)
- [ ] Body icons/sprites (planets, ships, stations)
- [ ] Orbit paths visible (ellipses)
- [ ] Throttle indicator (ship thrust level)
- [ ] Fuel gauge
- [ ] Time display (current system time)

### Multiplayer
- [ ] All players see system map
- [ ] Ship positions synchronized
- [ ] Course changes broadcast
- [ ] Encounters triggered for all players

### Testing
- [ ] 50+ unit tests (physics, calculations)
- [ ] 20+ integration tests (UI, TravellerMap API)
- [ ] Performance tests (render 1000+ objects at 60fps)

---

## Implementation Plan

### Sub-stage 23.1: TravellerMap API Integration (3-5 days)

**Scope:**
- Research TravellerMap.com API endpoints
- Fetch system data (UWP, coordinates, bodies)
- Parse and validate data
- Cache system data (localStorage)
- Handle API errors (fallback to local data)

**API Endpoints (Hypothetical):**
```javascript
// Fetch system data
GET https://travellermap.com/api/system?sector=Spinward+Marches&hex=1910
// Returns JSON with UWP, bodies, orbits, etc.

// Fetch system image (optional background)
GET https://travellermap.com/api/image?sector=Spinward+Marches&hex=1910
```

**Data Model:**
```javascript
{
  "name": "Regina",
  "sector": "Spinward Marches",
  "hex": "1910",
  "uwp": "A788899-A",
  "starport": "A",
  "size": 7,
  "atmosphere": 8,
  "hydrographics": 8,
  "population": 8,
  "government": 9,
  "lawLevel": 9,
  "techLevel": 10,
  "star": {
    "type": "F7 V",
    "mass": 1.2,
    "luminosity": 1.8
  },
  "bodies": [
    {
      "name": "Regina",
      "type": "planet",
      "orbit": 3,
      "distance": 1.5, // AU
      "period": 687, // days
      "size": 11200, // km diameter
      "moons": 2
    },
    {
      "name": "Gas Giant",
      "type": "gas-giant",
      "orbit": 8,
      "distance": 5.2, // AU
      "period": 4333, // days
      "size": 140000, // km
      "moons": 16
    }
  ],
  "stations": [
    {
      "name": "Regina Highport",
      "orbit": 3,
      "altitude": 35786 // km (geosynchronous)
    }
  ],
  "jumpPoints": [
    { "name": "Jump Point 100D", "distance": 1120000 } // km
  ]
}
```

**Files:**
- `lib/travellermap-api.js` - API wrapper (~200 LOC)
- `tests/unit/travellermap-api.test.js` - API tests (~100 LOC)

### Sub-stage 23.2: Physics Engine (5-7 days)

**Scope:**
- Implement orbital mechanics (Kepler's laws)
- Calculate orbital periods, velocities
- Ship thrust and trajectory
- Gravity well effects
- Efficient course calculation (Hohmann transfers)

**Physics Calculations:**
```javascript
// Orbital period (Kepler's third law)
function calculateOrbitalPeriod(semiMajorAxis, starMass) {
  const G = 6.674e-11; // gravitational constant
  const M = starMass * 1.989e30; // solar masses to kg
  const a = semiMajorAxis * 1.496e11; // AU to meters
  const T = 2 * Math.PI * Math.sqrt(a**3 / (G * M));
  return T / 86400; // seconds to days
}

// Orbital velocity
function calculateOrbitalVelocity(distance, starMass) {
  const G = 6.674e-11;
  const M = starMass * 1.989e30;
  const r = distance * 1.496e11;
  return Math.sqrt(G * M / r); // m/s
}

// Ship acceleration (Traveller M-drives)
function calculateShipAcceleration(thrust, tonnage) {
  // Thrust rating (1-6) = G's of acceleration
  return thrust * 9.8; // m/s²
}

// Hohmann transfer time
function calculateTransferTime(r1, r2, starMass) {
  const G = 6.674e-11;
  const M = starMass * 1.989e30;
  const a = (r1 + r2) / 2; // semi-major axis of transfer orbit
  const T = Math.PI * Math.sqrt(a**3 / (G * M));
  return T / 86400; // seconds to days
}
```

**Simplified Mode (Toggle):**
- Ignore orbital mechanics
- Straight-line travel between bodies
- Fixed travel time (tonnage-dependent)
- Easier for casual play

**Files:**
- `lib/orbital-mechanics.js` - Physics engine (~400 LOC)
- `tests/unit/orbital-mechanics.test.js` - Physics tests (~200 LOC)

### Sub-stage 23.3: System Map Renderer (7-10 days)

**Scope:**
- Canvas-based rendering (HTML5 Canvas or WebGL)
- Top-down 2D view
- Render star, planets, moons, stations, ships
- Orbit paths (ellipses)
- Pan/zoom controls
- Scale adjustment (realistic vs. compressed)
- Level of detail (LOD) system for performance

**Rendering Strategy:**
```javascript
class SystemMapRenderer {
  constructor(canvas, systemData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.systemData = systemData;
    this.camera = { x: 0, y: 0, zoom: 1.0 };
  }

  render(timestamp) {
    this.clear();
    this.renderOrbits();
    this.renderBodies(timestamp);
    this.renderShips();
    this.renderUI();
  }

  renderOrbits() {
    // Draw elliptical orbit paths
    this.systemData.bodies.forEach(body => {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.drawEllipse(body.orbit);
    });
  }

  renderBodies(timestamp) {
    // Calculate body positions based on orbital mechanics
    this.systemData.bodies.forEach(body => {
      const angle = this.calculateOrbitalAngle(body, timestamp);
      const pos = this.orbitToScreenCoords(body.distance, angle);
      this.drawBody(pos, body);
    });
  }

  renderShips() {
    // Draw player/NPC ships
    this.ships.forEach(ship => {
      const pos = this.worldToScreenCoords(ship.position);
      this.drawShip(pos, ship);
    });
  }
}
```

**Scale System:**
- **Realistic:** 1 AU = 1000 pixels (too large)
- **Compressed:** Logarithmic scale (inner system visible)
- **Toggle:** User can switch between realistic/gamey

**LOD System:**
- Close zoom: Render moons, stations, ship details
- Medium zoom: Render planets, ships (no moons)
- Far zoom: Render major bodies only (no stations)

**Files:**
- `public/system-map.html` - System map page
- `public/system-map.js` - System map client logic (~600 LOC)
- `public/css/system-map.css` - System map styles (~150 LOC)
- `lib/system-map-renderer.js` - Canvas rendering (~400 LOC)

### Sub-stage 23.4: Navigation System (5-7 days)

**Scope:**
- Plot course UI (click destination)
- Autopilot mode (automatic navigation)
- Manual control mode (thrust vector adjustment)
- Fuel consumption tracking
- Travel time estimation
- Waypoint system (multi-stop routes)

**Navigation UI:**
```
┌────────────────────────────────────────────────────┐
│ SYSTEM MAP - Regina System                        │
├────────────────────────────────────────────────────┤
│                                                    │
│         ☀️ Regina (F7 V)                           │
│                                                    │
│     ⬤ Planet 1        🚀 Your Ship                │
│                                                    │
│            ⬤ Regina (mainworld)                   │
│                 🏭 Highport                        │
│                                                    │
│                        ⭕ Gas Giant               │
│                                                    │
│  [⚡ Thrust: 3G] [⏱️ Time: 2.5 days] [⛽ Fuel: 70%] │
│                                                    │
│  Destination: Regina Highport                     │
│  Course: Hohmann Transfer                         │
│  [Autopilot: ON] [Time Accel: 100x]              │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Autopilot Algorithm:**
1. Calculate Hohmann transfer orbit
2. Wait for optimal launch window
3. Execute burn (consume fuel)
4. Coast along transfer orbit
5. Execute arrival burn (consume fuel)
6. Match velocity with destination

**Manual Control:**
- Arrow keys or joystick: Adjust thrust vector
- Throttle slider: Adjust thrust magnitude
- "Prograde/Retrograde" buttons: Common maneuvers

**Files:**
- Update `public/system-map.js` - Navigation UI (~200 LOC)
- `lib/navigation.js` - Course plotting (~250 LOC)
- `tests/unit/navigation.test.js` - Navigation tests (~100 LOC)

### Sub-stage 23.5: Combat Integration (5-7 days)

**Scope:**
- Encounter system (random or scripted)
- Zoom transition (system map → tactical combat)
- Range calculation from relative positions
- Return to system map after combat
- Damage/fuel persistence

**Encounter System:**
```javascript
// Random encounter based on location
function checkForEncounter(ship, systemData) {
  const location = ship.currentBody;
  const encounterChance = getEncounterChance(location);

  if (Math.random() < encounterChance) {
    const encounterType = rollEncounterType(location);
    return {
      type: encounterType, // 'pirate', 'patrol', 'trader'
      range: calculateRange(ship.position, encounter.position),
      enemyShip: generateEnemyShip(encounterType)
    };
  }

  return null;
}

// Encounter chances by location
function getEncounterChance(location) {
  if (location.type === 'jump-point') return 0.10; // 10% per day
  if (location.type === 'gas-giant') return 0.05; // 5% per day
  if (location.type === 'planet') return 0.02; // 2% per day
  if (location.type === 'deep-space') return 0.001; // 0.1% per day
  return 0;
}
```

**Zoom Transition:**
1. Encounter detected
2. Pause system map
3. Show encounter dialog (flee or fight?)
4. If fight: Zoom in with animation
5. Load tactical combat (Stages 8-11)
6. Combat resolves
7. Zoom out with animation
8. Update system map (damage, fuel, position)

**Files:**
- Update `public/system-map.js` - Encounter UI (~100 LOC)
- `lib/encounters.js` - Encounter system (~200 LOC)
- Update `server.js` - Encounter events (~100 LOC)
- `tests/unit/encounters.test.js` - Encounter tests (~50 LOC)

### Sub-stage 23.6: Animation & Polish (3-5 days)

**Scope:**
- Animated planetary orbits
- Ship thrust plumes
- Smooth zoom transitions
- Time acceleration UI
- Fuel consumption visualization
- Sound effects (optional)

**Animation:**
```javascript
function animate(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  const gameTime = deltaTime * timeAcceleration;

  // Update body positions
  systemData.bodies.forEach(body => {
    body.angle += (2 * Math.PI / body.period) * gameTime;
  });

  // Update ship position
  updateShipPosition(ship, gameTime);

  // Render
  renderer.render(timestamp);

  requestAnimationFrame(animate);
}
```

**Files:**
- Update `public/system-map.js` - Animation (~100 LOC)
- `public/css/system-map.css` - Visual polish (~50 LOC)

### Sub-stage 23.7: Testing & Optimization (5-7 days)

**Scope:**
- Performance optimization (60fps target)
- Memory profiling (no leaks)
- Physics accuracy validation
- TravellerMap API integration testing
- Cross-browser compatibility
- Mobile testing (touch controls)

**Performance Targets:**
- Render 1000+ objects at 60fps
- Smooth zoom/pan (no stuttering)
- Low memory footprint (<100MB)

**Files:**
- `tests/unit/orbital-mechanics.test.js` - 50+ physics tests
- `tests/integration/system-map.test.js` - 20+ integration tests
- `tests/performance/system-map-perf.test.js` - Performance benchmarks

---

## Technical Specifications

### Coordinate Systems

**World Space (Physics):**
- Origin: Star (0, 0)
- Units: Kilometers
- X-axis: Right (positive)
- Y-axis: Up (positive)

**Screen Space (Rendering):**
- Origin: Canvas center
- Units: Pixels
- X-axis: Right (positive)
- Y-axis: Down (positive)

**Transformations:**
```javascript
function worldToScreen(worldPos, camera) {
  const screenX = (worldPos.x - camera.x) * camera.zoom + canvas.width / 2;
  const screenY = (worldPos.y - camera.y) * camera.zoom + canvas.height / 2;
  return { x: screenX, y: screenY };
}

function screenToWorld(screenPos, camera) {
  const worldX = (screenPos.x - canvas.width / 2) / camera.zoom + camera.x;
  const worldY = (screenPos.y - canvas.height / 2) / camera.zoom + camera.y;
  return { x: worldX, y: worldY };
}
```

### Scale System

**Realistic Scale (Toggle: OFF):**
- 1 AU = 1000 pixels
- Problem: Inner system takes up entire screen, outer system not visible

**Logarithmic Scale (Toggle: ON):**
```javascript
function logScale(distance) {
  // Compress large distances, preserve small ones
  const compressed = Math.log(distance + 1) * 100;
  return compressed;
}
```

**Result:** Inner planets visible, outer planets not too far away

### Performance Optimization

**Level of Detail (LOD):**
```javascript
function getLOD(body, camera) {
  const screenSize = body.size * camera.zoom;

  if (screenSize > 100) return 'high'; // Render details, moons
  if (screenSize > 10) return 'medium'; // Render body, no details
  if (screenSize > 1) return 'low'; // Render dot
  return 'none'; // Don't render
}
```

**Culling:**
- Don't render objects outside viewport
- Use spatial partitioning (quadtree) for large systems

**Batching:**
- Group similar objects (planets, ships)
- Single draw call for each group

---

## UI/UX Design

### System Map Interface

**Main View:**
- Full-screen canvas (no distractions)
- Overlay UI (transparent panels)
- Minimap (corner, shows entire system)

**Control Panel (Bottom):**
```
┌────────────────────────────────────────────────────┐
│ [⚡ Thrust: 3G] [⛽ Fuel: 245/400 tons]             │
│ [⏱️ Time: Day 125, 14:35] [⏩ Accel: 100x]          │
│ [🎯 Destination: Regina Highport (2.3 days)]       │
│ [Autopilot: ON] [Physics: Realistic ✓]            │
└────────────────────────────────────────────────────┘
```

**Info Panel (Right, collapsible):**
```
┌──────────────────────────┐
│ REGINA SYSTEM            │
├──────────────────────────┤
│ Star: F7 V (1.2 M☉)      │
│ Bodies: 8 planets        │
│ Mainworld: Regina (1910) │
│ Starport: A              │
│ Tech Level: 10           │
│                          │
│ Selected: Regina         │
│ Type: Terrestrial        │
│ Size: 11,200 km          │
│ Orbit: 1.5 AU            │
│ Period: 687 days         │
│ Moons: 2                 │
│                          │
│ [Plot Course]            │
│ [View Details]           │
└──────────────────────────┘
```

**Minimap (Top-Right):**
- Shows entire system at once
- Highlights PC ship position
- Click to recenter view

### Interaction Design

**Mouse Controls:**
- Left-click drag: Pan view
- Mouse wheel: Zoom in/out
- Right-click: Context menu (plot course, etc.)
- Hover: Show body name/info

**Keyboard Shortcuts:**
- Arrow keys: Pan view
- +/- keys: Zoom in/out
- Space: Pause/resume
- T: Cycle time acceleration
- A: Toggle autopilot
- P: Toggle physics mode
- M: Toggle minimap

**Touch Controls (Mobile):**
- One-finger drag: Pan view
- Two-finger pinch: Zoom
- Tap: Select body
- Long-press: Context menu

---

## Risk Assessment

### High Risks 🔴

**1. Physics Complexity**
- Orbital mechanics are mathematically complex
- Edge cases (escape velocity, slingshot maneuvers)
- *Mitigation:* Start with simplified mode, add realism later

**2. Performance (1000+ Objects)**
- Rendering many objects at 60fps is challenging
- Canvas vs. WebGL decision
- *Mitigation:* LOD system, culling, batching, performance testing

**3. TravellerMap API Availability**
- API might not exist or have rate limits
- Data format might be incompatible
- *Mitigation:* Fallback to local data, cache aggressively

### Medium Risks ⚠️

**4. UI Complexity**
- Many controls, information overload
- Mobile usability challenging
- *Mitigation:* Iterative design, user testing

**5. User Interest**
- Niche feature, might not be widely used
- Complex mechanics might deter casual players
- *Mitigation:* Make it optional, not required for combat

### Low Risks ✅

**6. Integration with Existing System**
- Well-defined interface (zoom to combat)
- *Mitigation:* Clear boundaries between map and combat

---

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] System map renders (star, planets, PC ship)
- [ ] Basic navigation (click destination, autopilot)
- [ ] Zoom to combat on encounter
- [ ] Simplified physics (straight-line travel)

### Complete Implementation
- [ ] All acceptance criteria met
- [ ] TravellerMap integration working
- [ ] Realistic physics mode (optional)
- [ ] Animated orbits
- [ ] 60+ tests passing
- [ ] 60fps performance (1000+ objects)

### Stretch Goals (Optional)
- [ ] 3D system map (WebGL)
- [ ] Multiple star systems (jump between them)
- [ ] Fleet management (multiple player ships)
- [ ] Trade route optimization
- [ ] Gas giant refueling (skimming animation)

---

## Estimated Effort

### Time Breakdown (Hobby Pace)
- Sub-stage 23.1 (TravellerMap): 3-5 days
- Sub-stage 23.2 (Physics): 5-7 days
- Sub-stage 23.3 (Renderer): 7-10 days
- Sub-stage 23.4 (Navigation): 5-7 days
- Sub-stage 23.5 (Combat integration): 5-7 days
- Sub-stage 23.6 (Animation/polish): 3-5 days
- Sub-stage 23.7 (Testing/optimization): 5-7 days
- **Total:** 33-48 days = 6-8 weeks

### Token Budget
- Planning/design: 3k tokens
- Implementation: 15k tokens
- Testing/optimization: 2k tokens
- **Total:** ~20k tokens

### Lines of Code
- Production: ~1,500 LOC
- Tests: ~500 LOC
- **Total:** ~2,000 LOC

---

## Dependencies

### Prerequisites
- Stages 1-22 complete (all core features)
- Combat system stable
- Ship builder working
- Fleet battles implemented (Stage 17)
- Campaign persistence (Stage 18)

### External Dependencies
- TravellerMap.com API (may not exist as described)
- Canvas or WebGL support (all modern browsers)
- Astrophysics knowledge (orbital mechanics)

---

## Questions for User

1. **Physics Realism Level?**
   - Simplified (straight-line travel, fixed times)
   - Realistic (orbital mechanics, Hohmann transfers)
   - Toggle (user chooses)
   - **Recommendation:** Toggle (best of both worlds)

2. **TravellerMap Integration Priority?**
   - Critical (must have system data)
   - Nice-to-have (local data is fine)
   - **Recommendation:** Nice-to-have, fallback to local

3. **Animation Complexity?**
   - Static (no animation, fixed positions)
   - Animated orbits (planets move)
   - Real-time simulation (everything moves based on physics)
   - **Recommendation:** Animated orbits (visual appeal without complexity)

4. **Rendering Technology?**
   - HTML5 Canvas (simpler, compatible)
   - WebGL (faster, more complex)
   - **Recommendation:** Canvas initially, WebGL if performance issues

---

## Related Use Cases

- **Use Case 10:** System Map Navigation (see USE-CASES.md)
- **Use Case 1:** Tuesday Game Session (strategic layer enhances gameplay)
- **Use Case 4:** Community Contribution (unique feature attracts users)

---

## Next Steps

1. User approval of vision/plan
2. Complete Stages 11-22 first (18-24 months)
3. Research TravellerMap API (verify it exists)
4. Prototype physics engine (validate performance)
5. Build MVP (simplified mode first)
6. Iterate based on feedback (add realism incrementally)

---

**Status:** 📋 PLANNED (Late-stage, nice-to-have)
**Priority:** LOW (After all core features complete)
**Estimated Completion:** 18-24 months from now
**User Enthusiasm:** HIGH (unique, immersive feature)

---

**Notes:**
- This is an AMBITIOUS feature (mini-game within the game)
- Requires significant astrophysics knowledge
- High risk, high reward (unique selling point)
- Should be built AFTER core features proven successful
- Consider making this a separate "Exploration Mode" toggle
