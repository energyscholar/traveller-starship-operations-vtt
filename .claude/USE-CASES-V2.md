# Traveller Starship Operations VTT - Use Cases V2

**Last Updated:** 2025-11-30
**Purpose:** Document use cases for starship operations tool (combat is exception, not rule)

---

## Vision: Operations First, Combat Second

**Core Concept:** This is a **starship operations tool** that also handles combat. In most Traveller sessions, combat is rare. Ships come and go, crew performs duties, but actual combat is the exception.

**Target Users:**
- GM + 4-5 players (standard group)
- Variable session length support
- Online required (no offline mode)
- Desktop + tablet friendly (phone secondary)

---

## Requirements Summary

### Core Constraints

| Constraint | Decision |
|------------|----------|
| Multi-role per PC | **No** - One role per PC |
| Ship splitting | **No** - All PCs on same ship (but fleet mode supported) |
| Unfilled roles | NPC crew (meatspace or AI) with configurable skill |
| Custom roles | **Yes** - Support non-combat roles |
| Player visibility | **Full** - Everyone sees all rolls and results |

### System Complexity Decisions

| System | Level | Notes |
|--------|-------|-------|
| PC Import | Minimal → Full | Start minimal, add VTT plugin import later |
| NPC Crew | Full NPCs | Names, personalities, interactive |
| Time Flow | Hybrid | GM controls, structured turns via Initiative |
| GM Control | Observer + God Mode toggle | Normal: observe/inject; God: full control |
| Damage Effects | Full simulation | Affects everything realistically |
| Ship Log | Auto + manual | System logs events, players annotate |
| Fuel Tracking | Full simulation | Jump/maneuver/power plant fuel separate |
| Cargo/Passengers | Manifests | Named passengers, itemized cargo |
| Range Display | Context-based | Km in operations, bands in combat |
| Jump Travel | GM choice | Can skip or play out |
| Repairs | Full system | Field (temp), port (full), parts required |
| TravellerMap | Full embed | Embed views, import data |
| Ship AI | Crew replacement | Can fill any unfilled role |
| Skill Checks | Flexible | Auto-roll, player-roll, or external dice |
| Scenarios | Templates + Full | Quick templates and complete scenarios |
| Tutorial | Docs + tooltips + guided | All onboarding methods |

### Operations Decisions

| System | Level | Notes |
|--------|-------|-------|
| Communications | Hybrid | Text chat + presets + skill checks when needed |
| Location Tracking | Subsector map + in-system | 3D coordinates as advanced TODO |
| Time Display | Full calendar | Imperial date + ship time + relative |
| Alerts | Full system | Configurable urgency levels |
| Power Management | Detailed systems | Each system has power needs |
| Environmental | GM toggle | Can enable asteroids, radiation, etc. |
| Jump Plotting | Detailed | Route, fuel, time, misjump risk |
| Life Support | Not tracked (future) | Advanced feature for later |
| Save System | Continuous auto-save | Never lose progress, watch performance |
| Docking | Full sim | Alignment, airlock matching, etc. |

### Combat Decisions

| System | Level | Notes |
|--------|-------|-------|
| Initiative Trigger | GM + Auto | GM declares or system suggests |
| Turn Order | Traveller standard | Maneuver → Attack → Actions phases |
| Reactions | Traveller rules | Evasive action, point defense, sandcasters |
| Tactical Map | Range bands (detailed optional) | Hex grid as advanced feature |
| Boarding | Hybrid | Abstract default, deck map optional (advanced) |
| Ship Dashboard | Role-based views | Engineer sees more detail |
| Ammo Tracking | Traveller rules | Missiles/sand limited, lasers use power |
| Test Mode | What-if | Clone state, test, discard or keep |

### Sensors & Combat Detail

| System | Level | Notes |
|--------|-------|-------|
| Sensors | Traveller rules | Checks, DMs for range/stealth/emissions |
| Stealth | Full | Thermal management, active/passive, hiding |
| Small Craft | Individual units | Fighters as separate units (squadron rules later) |
| Electronic Warfare | Traveller rules | Follow book for EW |

### Fleet & AI

| System | Level | Notes |
|--------|-------|-------|
| Fleet Mode | Yes | Can control multiple ships |
| Party Split | Supported | Different players on different ships |
| Fleet Command | Mixed | Players control theirs, NPCs follow orders/AI |
| NPC Ship AI | Full AI | Independent goals, make decisions |
| Fog of War | Full visibility (initially) | Sensor-based/realistic fog later |
| Ship Finances | Ship account | Track operating funds |

---

## Crew Roles

### Combat Roles
| Role | Primary Duties | Key Skills |
|------|---------------|------------|
| **Pilot** | Maneuver ship, evasive action, docking | Pilot |
| **Captain** | Leadership, Tactics, command decisions | Leadership, Tactics |
| **Astrogator** | Jump calculations, plotting courses | Astrogation |
| **Engineer** | Power plant, drives, repairs | Engineer |
| **Sensor Operator** | Detect contacts, comms, EW | Sensors, Comms |
| **Gunner** | Turret operations (one per turret) | Gunnery |
| **Damage Control Officer** | Coordinate repairs during combat | Engineer, Leadership |

### Support Roles
| Role | Primary Duties | Key Skills |
|------|---------------|------------|
| **Marines** | Security, boarding actions | Gun Combat, Tactics |
| **Medic** | Crew injuries, medical bay | Medic |
| **Steward** | Passenger care, morale, supplies | Steward |
| **Cargo Master** | Cargo management, loading | Admin, Broker |
| **Custom Role** | Player/GM defined | Variable |

### Role Rules
1. Each PC holds exactly ONE role
2. Unfilled roles → NPC crew (configurable skill, default 0)
3. NPC crew can be meatspace NPCs or ship AI
4. GM can configure NPC skill levels
5. Role persists between sessions (saved to player account)
6. Player can change role, but defaults to last used

---

## Account System

### Player Account Structure
```json
{
  "id": "player-uuid",
  "name": "Alice",
  "character": {
    "name": "Alice Thornton",
    "skills": { "pilot": 2, "gunnery": 1 },
    "stats": { "DEX": 9, "INT": 10 }
  },
  "shipId": "wandering-star-uuid",
  "role": "Pilot",
  "lastLogin": "2025-11-30T19:00:00Z",
  "preferences": { "theme": "dark" }
}
```

### GM Account Structure
```json
{
  "id": "gm-uuid",
  "name": "Bruce",
  "campaign": {
    "name": "Spinward Marches Campaign",
    "currentDate": "1105-127",
    "currentSystem": "Glisten"
  },
  "ships": ["wandering-star-uuid", "lazy-susan-uuid"],
  "players": ["alice-uuid", "bob-uuid", "carol-uuid"],
  "npcs": [{
    "name": "Chief Martinez",
    "role": "Engineer",
    "skill": 1,
    "personality": "Gruff but reliable"
  }],
  "godMode": false
}
```

### Session Flow
1. GM creates/opens campaign
2. GM prepares player accounts (named slots)
3. GM configures available ships
4. Players log into prepared accounts
5. Players import/confirm PC (minimal: name + primary skill)
6. Players select ship (defaults to last used)
7. Players select crew role (defaults to last used)
8. Session begins - operations mode

---

## Primary Use Cases

### UC1: Session Start - Player Login

**Actor:** Player
**Frequency:** Every session

**Precondition:** GM has prepared account slot

**Flow:**
1. Player opens VTT URL
2. Sees login screen with player name slots
3. Clicks their name (e.g., "Alice")
4. Sees their PC info (or imports if first time)
5. Confirms ship assignment (defaults to last used)
6. Selects crew role (defaults to last used)
7. Enters ship bridge view
8. Sees current ship status and sensor display

**Success Criteria:**
- Returning player: 2-3 clicks to enter session
- New player: <2 minutes to import PC and join
- Clear indication of role and responsibilities

---

### UC2: Session Start - GM Preparation

**Actor:** GM
**Frequency:** Before each session or campaign start

**Flow:**
1. GM opens VTT, logs in
2. Creates/selects campaign
3. Creates player account slots (Alice, Bob, Carol, Dave, Eve)
4. Makes ships available:
   - "The Wandering Star" (party ship - visible)
   - "ISS Patrol Cutter" (NPC - visible when appropriate)
   - "Pirate Corsair" (enemy - hidden until encounter)
5. Assigns default ships to players
6. Configures NPC crew:
   - Chief Martinez: Engineer 1, "Gruff but reliable"
   - Ship AI: Gunner 0, "Monotone, efficient"
7. Sets current date/time and location
8. Session ready for players

**God Mode Uses:**
- Override any ship position
- Modify any roll result
- Add/remove ships instantly
- Change any game state

---

### UC3: Normal Operations - No Combat (PRIMARY)

**Actor:** Crew (all players)
**Frequency:** 80%+ of play time

**Scenario: System Arrival**

**Flow:**
1. **Jump Arrival**
   - System announces: "Jump complete. Arrived: Glisten System"
   - Ship appears at 100D limit on subsector map
   - Astrogator confirms position
   - Automatic passive sensor sweep begins

2. **Initial Scan**
   - Sensor Operator sees contacts populate:
     - Mainworld (Glisten) - highport detected
     - Gas giant - refineries detected
     - Contact Alpha: Free Trader, 45,000 km, transponder "Lazy Susan"
     - Contact Bravo: SDB, 120,000 km, transponder "Guardian"
     - Contact Charlie: Unknown, 200,000 km, no transponder
   - Each contact shows: type (if known), range (km), bearing, transponder

3. **Information Gathering**
   - Sensor Op: Active scan on Contact Charlie
   - Roll Sensors skill
   - Result determines info: ship type, weapons, cargo, intentions
   - "Contact Charlie: Corsair-class, no warrants on file, armed"

4. **Captain Decision**
   - Captain: "Set course for Glisten Highport, avoid Contact Charlie"
   - Pilot: Plots course
   - System shows: ETA 6 hours, fuel cost 2 tons

5. **Transit**
   - GM choice: Skip ahead or play out
   - If played: Random events possible
   - Contacts move on sensors (ships passing, new arrivals)
   - Free Trader "Lazy Susan" hails with greeting
   - SDB "Guardian" changes course (routine patrol)

6. **Arrival Procedures**
   - Approaching highport
   - Comms: Request docking clearance (preset or text)
   - Port Authority responds (GM or scripted)
   - Pilot: Docking sequence (skill check for difficult ports)
   - Docked successfully

**Throughout:**
- Ships come and go on sensors
- Most contacts are neutral
- Crew performs role-appropriate actions
- No combat (typical session)

---

### UC4: Ship Encounter - Non-Hostile

**Actor:** Crew
**Frequency:** Multiple per session

**Flow:**
1. **Detection**
   - New contact appears: "Contact Delta, bearing 270, range Long"
   - Alert level: Normal (no threat indicators)

2. **Identification** (Sensor Op)
   - Passive: Ship type, transponder (if broadcasting)
   - Active scan: More details (cargo, weapons, crew size)
   - Deep scan: Full analysis (registry, warrants, history)

3. **Approach Dynamics**
   - System tracks relative motion
   - Range changes over time
   - "Contact Delta closing. Range now Medium. ETA intercept: 45 minutes"

4. **Communication**
   - Either ship may hail
   - Preset options: "Greetings", "Request info", "Warning", "Trade offer"
   - Free text for custom messages
   - GM plays NPC responses

5. **Resolution Options**
   - Pass peacefully (most common)
   - Exchange information
   - Dock for trade
   - Travel together (convoy)
   - One ship diverts/flees
   - (Rarely) Hostilities begin → UC5

---

### UC5: Combat Encounter (Exception)

**Actor:** Crew
**Frequency:** 1-2 per session maximum (often less)

**Trigger:** Hostile action declared (by any party)

**Flow:**
1. **Combat Transition**
   - GM or system triggers: "Contact Charlie has armed weapons. Combat initiated."
   - Display switches to combat mode (range bands)
   - Initiative rolled: 2D + Pilot skill + ship Thrust
   - Turn order established

2. **Combat Round Structure** (Traveller Standard)

   **Maneuver Phase:**
   - All Pilots declare movement intentions
   - Thrust allocated (movement vs combat maneuvers)
   - Range bands change
   - Evasive action declared

   **Attack Phase:**
   - Gunners fire weapons (in initiative order)
   - Point defense reactions
   - Sandcaster reactions
   - Damage resolved

   **Actions Phase:**
   - Engineer: Repairs, power allocation
   - Astrogator: Emergency jump prep
   - Other crew actions

3. **Combat Resolution**
   - Ship destroyed/disabled
   - Ship surrenders
   - Ship flees (pursuit possible)
   - Boarding action (UC-ADV-1)

4. **Return to Operations**
   - Combat ends
   - Damage persists (full simulation)
   - Return to operations mode
   - Deal with aftermath (salvage, rescue, repairs)

---

### UC6: Role-Specific Operations

**Actor:** Individual crew member
**Frequency:** Throughout session

#### Pilot Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Set course | Destination selected | Calculate time/fuel, begin transit |
| Emergency maneuver | Collision/threat | Pilot check, consume thrust |
| Dock at station | Arrival at port | Docking sequence (skill check) |
| Dock with ship | Ship-to-ship | Full docking sim (alignment, airlock) |
| Land on planet | Atmospheric entry | Pilot check, weather factors |
| Evasive action | Combat | Use thrust as dodge DM |

#### Captain Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Set alert status | Situation change | Normal/Yellow/Red affects crew readiness |
| Issue orders | Task chains | Provide DM to subordinate tasks |
| Negotiate | Comms with ships | Leadership/Diplomat checks |
| Authorize weapons | Threat assessment | Unlock weapon controls |
| Command decision | Critical moment | Leadership check, affects morale |

#### Astrogator Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Plot jump route | Jump requested | Calculate destination, fuel, time, risk |
| Verify position | Post-jump | Confirm arrival location |
| Calculate intercept | Target ship | Time/fuel to reach contact |
| Emergency jump | Combat escape | Rush calculation with misjump risk |
| Navigation hazard | Approaching hazard | Identify and plot avoidance |

#### Engineer Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Monitor power plant | Continuous | View power budget, allocation |
| Allocate power | Priorities change | Shift power between systems |
| Field repair | System damaged | Engineer check, temporary fix |
| Overload system | Extra power needed | Risk check, possible damage |
| Fuel management | Low fuel | Monitor consumption, recommend actions |

#### Sensor Operator Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Passive scan | Continuous | Detect nearby emissions |
| Active scan | Target contact | Get detailed info (reveals position) |
| Deep scan | Investigate | Full analysis of target |
| Comms - hail | Initiate contact | Open channel to target |
| Comms - broadcast | General message | Announce to all in range |
| Electronic warfare | Combat/stealth | Jam sensors, spoof missiles |
| Monitor channel | Listen | Intercept communications |

#### Gunner Operations (Combat)
| Action | Trigger | Resolution |
|--------|---------|------------|
| Fire weapon | Attack phase | Gunnery check vs target |
| Point defense | Incoming missiles | Reaction, destroy missiles |
| Sandcaster | Incoming laser | Reaction, reduce damage |
| Reload | Ammo expended | Takes one round |
| Target selection | Multiple enemies | Choose priority target |

#### Damage Control Officer Operations
| Action | Trigger | Resolution |
|--------|---------|------------|
| Damage assessment | Ship hit | Full status report |
| Coordinate repairs | Multiple damage | Prioritize repair teams |
| Emergency procedures | Critical damage | Activate emergency protocols |
| Fire suppression | Fire detected | Contain/extinguish |
| Casualty management | Crew injuries | Direct medic/evacuate |

#### Support Role Operations
**Marines:** Security patrol, boarding prep, repel boarders, prisoner handling
**Medic:** Treat injuries, medical bay operations, triage
**Steward:** Passenger management, supplies, morale, life support
**Cargo Master:** Inventory, loading ops, cargo security, manifests

---

### UC7: Travel Montage

**Actor:** GM + Crew
**Frequency:** When skipping routine travel

**Flow:**
1. **GM initiates skip**
   - "Two weeks to reach Mora. Anything to do during transit?"

2. **Crew declarations**
   - Players declare any special activities
   - Engineer: "Running maintenance checks"
   - Astrogator: "Verifying course daily"
   - Steward: "Keeping passengers happy"

3. **Event checks** (optional)
   - System or GM generates events:
   - Day 3: "Ship malfunction - Engineer check to prevent breakdown"
   - Day 7: "Passing trader hails with news of pirate activity"
   - Day 12: "Passenger conflict - Steward intervention needed"

4. **Resolution**
   - Events resolved
   - Arrival at destination
   - Return to normal operations

---

### UC8: Emergency Situations (Non-Combat)

**Examples:**

#### Engineering Emergency
- Power plant fluctuation
- Engineer must diagnose and fix
- Consequences: Lose power, drift, life support failure

#### Navigation Emergency
- Misjump detected
- Unknown location
- Astrogator must determine position
- Decision: Where to go? Enough fuel?

#### Medical Emergency
- Crew member injured (accident, illness)
- Medic provides care
- Possible diversion to port

#### Customs/Inspection
- Authority ship demands inspection
- Papers in order?
- Cargo scan
- Hidden items?

#### Passenger Problem
- Passenger causing issues
- Steward de-escalates
- Captain decides action

---

## Fleet Operations Use Cases

### UC-FLEET-1: Multi-Ship Control

**Actor:** GM + Players
**Context:** Party controls multiple ships

**Flow:**
1. **Ship Assignment**
   - Player A: Captain of "Wandering Star"
   - Player B: Captain of "Lucky Strike" (prize ship)
   - Player C, D, E: Crew on "Wandering Star"

2. **Fleet View**
   - GM sees all ships
   - Each player sees their ship's bridge
   - Can switch between ships (if permitted)

3. **Coordination**
   - Text/voice for inter-ship communication
   - Fleet orders from flagship
   - NPC-crewed ships follow AI behavior or orders

4. **Combat**
   - Each ship acts in initiative order
   - Players control their assigned ship
   - Fleet tactics matter

---

### UC-FLEET-2: Party Split

**Actor:** Players on different ships
**Context:** Party temporarily separated

**Flow:**
1. Prize crew takes captured ship
2. Main party continues on original ship
3. Each group has their own operations
4. GM manages both simultaneously
5. Eventually reunite

---

## Advanced Feature TODOs

### TODO: Full Character Sheet Import
- Import from Roll20/Foundry via plugin
- Parse full character data
- Map all skills and equipment

### TODO: 3D Coordinates in System
- Full positional tracking
- Realistic travel times
- Orbital mechanics (optional)

### TODO: Hex Grid Tactical Map
- Detailed combat positioning
- Facing and arcs
- Terrain (asteroids, etc.)

### TODO: Deck Plan Boarding
- Interior ship maps
- Room-by-room combat
- Security systems

### TODO: Life Support Tracking
- Consumables per person
- Recycling efficiency
- Emergency rationing

### TODO: Squadron Rules
- Group fighters into units
- Simplified mass combat
- Carrier operations

### TODO: Sensor-Based Fog of War
- Players only see detected contacts
- Hidden enemy ships
- Realistic information limits

---

## UI Concepts

### Ship Bridge View (Operations)
```
┌─────────────────────────────────────────────────────────────────┐
│  THE WANDERING STAR    [1105-127 14:32]    [NORMAL]    [≡ Menu] │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐│
│ │                    SENSOR DISPLAY                            ││
│ │                                                              ││
│ │  [◇] Free Trader "Lazy Susan"     12,450 km    Bearing: 045 ││
│ │  [△] SDB "Guardian"               45,200 km    Bearing: 180 ││
│ │  [?] Unknown Contact              82,000 km    Bearing: 270 ││
│ │                                                              ││
│ │                    ★ Glisten Highport                        ││
│ │                       ETA: 2h 15m                            ││
│ │                                                              ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ YOUR ROLE: Pilot (Alice)              SHIP: Nominal            │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Set Course] [Evasive] [Dock] [Land] [Emergency Maneuver]   │ │
│ │                                                             │ │
│ │ Status: In transit to Glisten Highport                      │ │
│ │ Thrust Available: 4/4    Fuel: 85%                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ CREW                                    SHIP LOG (Recent)       │
│ ├ Captain: Bob (●)                      14:30 - Course set      │
│ ├ Pilot: Alice (●) [YOU]                14:28 - Jump complete   │
│ ├ Astrogator: Carol (●)                 14:25 - Contact detected│
│ ├ Sensors: Dave (●)                                             │
│ ├ Engineer: NPC Martinez (1)                                    │
│ └ Gunner: NPC Ship AI (0)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Combat View (Range Bands)
```
┌─────────────────────────────────────────────────────────────────┐
│  COMBAT: Round 3    Initiative: Wandering Star → Pirate Corsair │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DISTANT │ V.LONG │  LONG  │ MEDIUM │ SHORT │ CLOSE │ ADJACENT │
│          │        │        │   ◆    │       │  ★    │          │
│          │        │        │Corsair │       │ YOU   │          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ PHASE: MANEUVER                          [End Phase]            │
├─────────────────────────────────────────────────────────────────┤
│ Pilot Actions:                                                  │
│ [Close Range] [Open Range] [Hold Position] [Evasive Action]     │
│                                                                 │
│ Thrust: 2/4 remaining    Evasive: Not declared                  │
├─────────────────────────────────────────────────────────────────┤
│ WANDERING STAR          │ PIRATE CORSAIR                        │
│ Hull: 72/80 (90%)       │ Hull: ??/??                           │
│ Armor: 4                │ Armor: ??                             │
│ M-Drive: Operational    │ Weapons: Pulse Laser, Missiles        │
│ Weapons: Ready          │ Status: Hostile                       │
└─────────────────────────────────────────────────────────────────┘
```

### Engineer View (Detailed Systems)
```
┌─────────────────────────────────────────────────────────────────┐
│  ENGINEERING STATUS                    Chief Martinez (Eng 1)   │
├─────────────────────────────────────────────────────────────────┤
│ POWER BUDGET                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Power Plant Output:    150 / 150 MW   [████████████████] ✓  │ │
│ │ Current Draw:          142 / 150 MW   [██████████████░░]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ SYSTEM STATUS                          POWER    STATUS          │
│ ├ M-Drive (Thrust 4)                   40 MW    [Operational]   │
│ ├ J-Drive                              60 MW    [Standby]       │
│ ├ Life Support                         10 MW    [Operational]   │
│ ├ Sensors (Military)                   8 MW     [Operational]   │
│ ├ Computer                             4 MW     [Operational]   │
│ ├ Turret 1 (Pulse Laser)              10 MW    [Armed]         │
│ └ Turret 2 (Sandcaster)               10 MW    [Armed]         │
│                                                                 │
│ FUEL STATUS                                                     │
│ ├ Jump Fuel:     40 / 40 tons  [████████████████████]          │
│ ├ Maneuver Fuel: 15 / 20 tons  [███████████████░░░░░]          │
│ └ Reserve:        5 / 5 tons   [████████████████████]          │
│                                                                 │
│ ACTIONS: [Allocate Power] [Start Repairs] [Overload System]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Account & Role System)
1. Player account system (named slots, no auth)
2. GM account with campaign management
3. Role selection UI
4. PC import (minimal: name + primary skill)
5. Persistent state (continuous auto-save)
6. Basic ship bridge view

### Phase 2: Operations Core
1. Sensor display (contacts with range/bearing)
2. Ship movement (course setting, transit)
3. Contact detection and identification
4. Communications (presets + text)
5. Time management (GM-controlled advance)
6. Ship log (auto + manual)

### Phase 3: Full Operations
1. Docking procedures (full sim)
2. Role-specific action panels
3. NPC crew with personalities
4. Alert system (configurable notifications)
5. Power management (detailed systems)
6. Fuel tracking (full simulation)

### Phase 4: Combat Integration
1. Combat mode transition
2. Initiative system (Traveller standard)
3. Maneuver/Attack/Action phases
4. Reactions (Traveller rules)
5. Damage system (full simulation)
6. Return to operations

### Phase 5: Advanced Features
1. Fleet mode (multiple ships)
2. Party split support
3. TravellerMap.com integration
4. Scenario templates
5. Ship finances (operating account)
6. What-if testing mode

### Phase 6: Polish & Extended
1. Tablet-optimized UI
2. Full tutorial system
3. Environmental effects (GM toggle)
4. Small craft support
5. Full stealth/EW system
6. Guided scenarios

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Session start time | <2 minutes (returning players) |
| Operations engagement | Players actively use role actions |
| Combat frequency | Feels like exception, not routine |
| GM prep time | <10 minutes for standard session |
| System learning curve | New player productive in 1 session |
| Auto-save reliability | Zero data loss |

---

## Relationship to V1 Use Cases

**Preserved from V1:**
- Combat mechanics (UC5 compatible)
- Ship builder integration
- Portfolio demo goals
- Community adoption goals
- Solo learning mode
- VTT integration plans

**Superseded by V2:**
- Combat-first design → Operations-first
- Anonymous play → Account system
- Ad-hoc roles → Persistent roles
- Simple damage → Full simulation
- Basic tracking → Detailed systems

---

**Document Status:** COMPLETE (Requirements Gathered)
**Next Steps:** Architecture planning, implementation prioritization
**Author:** Claude (based on extensive user requirements)
