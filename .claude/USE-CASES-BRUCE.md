# Bruce's Live Game Use Cases

Created: 2025-11-30
Next Session: ~9 days (for development review)
Live Game: ~48 hours from creation

---

## Use Case Bruce1Dorania: Evasion Journey

### Scenario
Bruce is running a 3-hour Traveller session with 5 players. The party is evading bounty hunters, traveling from Raschev back to their fleet base at Flammarion via two jumps:

```
Raschev → [arrived] → Dorannia → Ator → Flammarion
                      (current)   (J2)    (J1)
                                  ↑        ↑
                              2 parsecs  1 parsec
                              ~1 week    ~1 week
```

### World Data (from TravellerMap API + Wiki)

| World | Hex | UWP | Key Features |
|-------|-----|-----|--------------|
| Dorannia | 0530 | E42158A-8 | "Atomic Dorannia" - nuclear exports, sealed habitats, extreme law |
| Ator | 0729 | D426258-7 | Ancient artifacts site, Darrian refueling stop, Telesco family rule |
| Flammarion | 0930 | A623514-B | LSP corporate world, naval base, Class A shipyard, Imperial Regency |

#### Dorannia (Current Location)
- **Starport:** E (frontier, no facilities)
- **Population:** ~500,000 in sealed habitats
- **Government:** Civil Service Bureaucracy (extreme law enforcement)
- **Economy:** Radioactive ore mining, nuclear tech exports
- **Known as:** "Atomic Dorannia" - nuclear missiles as defense
- **Atmosphere:** Vacuum (very thin, tainted with radiation)
- **Notes:** Naturally uninhabitable, strict gov control of mining/exports

#### Ator (Jump 1)
- **Starport:** D (poor, minor repair, unrefined fuel)
- **Population:** ~800 people
- **Government:** Feudal Technocracy (Telesco family)
- **Economy:** Refueling point on Darrian trade route, customs fees
- **Special:** Ancient artifacts archaeological site
- **Notes:** Contested history between Darrians and Sword Worlds

#### Flammarion (Destination)
- **Starport:** A (excellent, shipyard, naval base)
- **Population:** ~700,000
- **Government:** Corporate (Ling-Standard Products)
- **Military:** Naval base on moon, Scout X-boat way station
- **Tech Level:** 11 (high)
- **Notes:** Imperial Regency world, heavily fortified

### Setting
- **Current Location:** Atomic Dorannia - TL-8 Industrial world (TL-10 in atomics)
- **Ship:** Type S Scout with 5 PCs + 1 NPC Pilot
- **Situation:** Safe port currently, but bounty hunters pursuing
- **Time Pressure:** ~2 weeks travel time, want to minimize delays

### The Kimbly (Type S Scout)
Named after Von Sydo's 70kg Tenser Wolf pet.

### Player Roster (from Campaign Data)

| Player | Primary Role | Key Skills | Secrets/Notes |
|--------|-------------|------------|---------------|
| James | Captain | Tactics_Naval, Leadership | SECRET: Imperial Admiral, Naval Intel, Darrian (TL16) |
| Von Sydo | Sensors | Sensors, Pilot, Gunner | SECRET: Illegal psion (teleport, telekinesis) |
| Max | Engineer | Electronics, Mechanic, Medic | Mad scientist, has salvaged chamax tech |
| Marina | Gunner | Diplomat 3, Deception 2 | Social specialist, face of the party |
| Asao | Marine/DC | Melee combat devastating | Hairless Aslan, face on WANTED posters |

**NPC Pilot:** Chance Dax

### Campaign Context
- **Year:** 1115, Day 310
- **Situation:** Fleeing District 268 - falsely accused of assassination, secretly guilty of accidental genocide (Chamax Crisis)
- **Threat:** Agent Thale (HP fanatic) hunting them with 5-10 armed followers
- **Destination:** Flammarion (their fleet base with Q-Ship)

### GM Intent
- NOT blocking the journey - they WILL reach Flammarion
- Create obstacles and tension along the way
- Starship traffic could be interesting/dangerous
- Bounty hunter threat in background

### Integration Context
This VTT is ONE tool alongside:
- Roll20 VTT (maps, character sheets)
- Discord voice chat
- Multiple text chat channels

**Success criteria:** Fun, compelling, good Traveller representation

---

## Use Case Bruce2Flammarion: Q-Ship Anti-Piracy Fleet

### Scenario
After reaching Flammarion, the party takes command of a disguised anti-piracy battle group. Think historical Barbary Pirates hunting.

### The Q-Ship
- **Type:** 600-ton Merchant (common type)
- **Actual:** Concealed military upgrade - Q-Ship + X-Carrier
- **Hangars:** Replace cargo space with small craft bays
- **Disguise:**
  - Authorized transponder changes
  - Exterior modifications possible
  - LOOKS like common merchant

### Fleet Composition
| Craft | Type | Quantity | Notes |
|-------|------|----------|-------|
| Q-Ship | 600t Merchant (disguised) | 1 | Mother ship |
| Tlatl Fighters | 10t Missile Fighters | 6 | Primary strike craft |
| Other Smallcraft | Various | Few | Support craft |

### Operational Concept
1. **Trickery Phase:** Appear as vulnerable merchant
2. **Surprise:** Pirates engage expecting easy prey
3. **Force:** Launch fighters, reveal true nature
4. **Engagement:** Coordinated strike with missile fighters

### Campaign Focus
This is a future campaign arc - the party has a trained crew awaiting them. The VTT should help tell this story.

---

## Infrastructure Analysis

### What We Have (Current)

| Feature | Status | Relevance |
|---------|--------|-----------|
| Campaign Management | ✅ | Multi-session tracking |
| Player Slots & Roles | ✅ | 5 PC + NPC assignment |
| Ship Management | ✅ | Type S Scout support |
| Jump Travel System | ✅ | Dorania→Ator→Flammarion |
| Contact Tracking | ✅ | Sensor contacts, traffic |
| Alert Status | ✅ | Tension building |
| Ship Log | ✅ | Narrative recording |
| Ship Systems | ✅ | Damage, repairs |
| Space Combat | ✅ | If bounty hunters catch up |
| Date/Time System | ✅ | Travel time tracking |

### What We Need (Bruce1Dorania)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Player-facing UI polish | HIGH | Medium | Each player needs clear role view |
| Sensor station UI | HIGH | Medium | Von Sydo's primary interface |
| Contact generation/management | HIGH | Low | GM creates traffic/threats |
| Jump planning display | MEDIUM | Low | Show route, fuel, time |
| Captain's overview | MEDIUM | Low | James sees big picture |
| Engineer station UI | MEDIUM | Medium | Max monitors systems |
| Mobile-friendly views | MEDIUM | High | Players may be on phones |
| Quick NPC assignment | LOW | Low | NPC pilot setup |

### What We Need (Bruce2Flammarion)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Multi-ship fleet management | HIGH | High | 7+ craft coordination |
| Small craft launch/recovery | HIGH | Medium | Fighter operations |
| Transponder/disguise system | MEDIUM | Low | Q-Ship identity |
| Squadron combat | HIGH | High | Multiple friendly ships |
| Carrier operations | MEDIUM | Medium | X-Carrier functionality |
| Fleet tactical display | MEDIUM | High | Coordinated view |

---

## Recommended Development Priority

### For Live Game in ~48 Hours (Bruce1Dorania)
**Realistic scope:** Polish what we have, not new features

1. **Test existing flow** - Can 5 players join and see their roles?
2. **Contact management** - GM can add sensor contacts easily
3. **Ship log entries** - Record narrative moments
4. **Alert status** - Build tension with yellow/red alerts

### For Future Sessions (Bruce2Flammarion)
This is a larger feature set requiring:
- Multi-ship data model
- Fleet coordination UI
- Small craft as separate entities
- Carrier mechanics

**Estimate:** Stage 6+ in design patterns, or separate feature branch

---

## Bruce1Dorania: Detailed Investigation (15% Thread)

### Scenario Flow Analysis

```
Session Start: Dorannia orbit (safe port)
│
├─ Phase 1: Departure Prep (~30 min real time)
│   ├─ Refueling (E starport = wilderness refueling only?)
│   ├─ Sensor sweep - what's in system?
│   ├─ Plot jump to Ator
│   └─ Tension: Are bounty hunters here? Tracking us?
│
├─ Phase 2: Jump to Ator (narrative skip, ~1 week game time)
│   └─ In-jump: ship maintenance, planning, character moments
│
├─ Phase 3: Ator Arrival (~1 hour real time)
│   ├─ Exit jump - sensor sweep
│   ├─ Approach D-class starport
│   ├─ Unrefined fuel only - potential misjump risk?
│   ├─ Tension: Bounty hunters waiting? Other ships?
│   ├─ Optional: Ancient artifacts subplot hook
│   └─ Refuel and jump to Flammarion
│
├─ Phase 4: Jump to Flammarion (narrative skip)
│   └─ Almost home...
│
└─ Phase 5: Flammarion Arrival (~30 min)
    ├─ Class A starport - naval base
    ├─ Safe arrival - reunite with fleet
    └─ Setup for Bruce2Flammarion arc
```

### What VTT Can Provide Per Phase

| Phase | VTT Feature | Player Engagement |
|-------|-------------|-------------------|
| 1. Departure | Sensor contacts, alert status | Von Sydo scans, James decides |
| 2. Jump | Ship log, date advance | Log entries, time skip |
| 3. Ator | Contacts, fuel status, alerts | Full crew engagement |
| 4. Jump | Ship log | Log entries |
| 5. Arrival | Contacts, safe status | Resolution |

### MVP Feature Set (48 Hours)

**Must Have (Critical Path):**
1. Campaign with Type S Scout configured
2. 5 player accounts with roles assigned
3. GM can add/edit sensor contacts
4. Alert status visible to all players
5. Basic role-based views work

**Should Have (Enhanced Experience):**
1. Ship log entries (GM or player-written)
2. Jump status display (fuel, time, destination)
3. Contact details (range, type, threat level)

**Nice to Have (If Time):**
1. Player actions (scan, hail, etc.)
2. Time advancement controls
3. Map integration (link to TravellerMap)

### Test Data Structure

```javascript
// Campaign: Dorannia Escape
{
  name: "Dorannia Escape",
  currentLocation: "Dorannia",
  currentDate: "310-1115",
  alertStatus: "normal",
  ship: {
    name: "Kimbly",
    type: "scout",
    fuel: { current: 40, max: 40 }, // Full tank (Jump-2 capable)
    hull: { current: 40, max: 40 }
  }
}

// Player Accounts
[
  { name: "James", role: "captain", skills: { tactics_naval: 3, leadership: 2 } },
  { name: "Von Sydo", role: "sensors", skills: { sensors: 2, gunner: 1, pilot: 1 } },
  { name: "Max", role: "engineer", skills: { electronics: 2, mechanic: 2, medic: 1 } },
  { name: "Marina", role: "gunner", skills: { diplomat: 3, deception: 2, gunner: 1 } },
  { name: "Asao", role: "marine", skills: { melee: 3, vacc_suit: 2 } }
]

// NPC Crew
{ name: "Chance Dax", role: "pilot", skills: { pilot: 2 } }

// Sample Contacts for GM (Dorannia System)
[
  { type: "Free Trader", name: "Beowulf-class", range: "Long", bearing: 45, status: "departing", threat: "none" },
  { type: "System Defense Boat", name: "Atomic Guard", range: "Very Long", bearing: 180, status: "patrol", threat: "none" },
  { type: "Far Trader", name: "Unknown", range: "Distant", bearing: 90, status: "arriving", threat: "none" },
  { type: "Unknown Contact", name: "???", range: "Long", bearing: 270, status: "closing", threat: "unknown" }
]

// Tension Contacts (for GM to introduce)
[
  { type: "Scout/Courier", name: "Suspicious Scout", range: "Very Long", bearing: 315, status: "matching course", threat: "possible", note: "Could be Agent Thale's pursuit ship" },
  { type: "Corsair", name: "Raider", range: "Distant", bearing: 180, status: "lurking", threat: "high", note: "Opportunistic pirates" }
]
```

### Agent Thale Tension Ideas

**Agent Thale** - HP Fanatic, TL10 equipment, 5-10 armed followers, hunting Asao specifically.

The pursuit doesn't need to APPEAR in session - the tension of "are they out there?" is enough:

1. **False Alarm:** A scout/courier matching pursuit profile appears on sensors - just a mail run
2. **Near Miss:** Hear X-boat traffic about HP agents asking questions at Ator
3. **Shadow:** One contact at extreme range seems to match course - paranoia or real?
4. **Intel:** James uses Naval Intel contacts - "Thale chartered a Fast Courier from Raschev"
5. **Close Call:** At Ator, a patron mentions "some armed types asking about an Aslan"

### Role Engagement Matrix

| Role | Phase 1 | Phase 3 | Key Moment |
|------|---------|---------|------------|
| Von Sydo (Sensors) | Scan system | Scan on arrival | "Unknown contact, bearing 270, closing" |
| James (Captain) | Decide departure | Handle Ator port | "All hands, we're jumping in 10" |
| Max (Engineer) | Check jump drive | Monitor fuel quality | "Unrefined fuel - 5% misjump chance" |
| Marina (Gunner) | Ready weapons | Stay alert | "Turret tracking unknown contact" |
| Asao (Marine) | Security prep | Ready for boarding | "Airlock secured, sir" |

### Interstellar Mail System

When PCs check in at a starport, they receive queued messages:
- **Periodicals:** News from across known space (worldbuilding/hooks)
- **Personal mail:** Messages from NPCs delivered via X-boat network

#### X-Boat Latency
- Messages travel ~4 parsecs/week via X-boat routes
- Dorannia is off the main routes - mail may be delayed
- Messages queued at starports until recipient arrives

#### Potential Correspondents (from Campaign Data)

| Sender | Relationship | Possible Content |
|--------|--------------|------------------|
| **Marta** | Ally, Raschev official | Encrypted update, uses one-time pad |
| **Vince** | Ally, Raschev leader | Political situation, resources offered |
| **Kira Denholm** | Von Sydo's girlfriend | "When are you coming home?" - dramatic |
| **Eric & Signe** | Aslan allies | Compound status, security updates |
| **Thomas** | SIC resistance | Intel on Thale's movements |
| **Dr. Heiyoao** | Knows genocide secret | Cryptic warning? Moral crisis? |
| **Horaz Sutyn** | New Garoo dictator | Unexpected olive branch |

#### Sample Mail Queue (Dorannia Arrival)

```javascript
// Mail waiting at Dorannia starport
[
  {
    to: "Von Sydo",
    from: "Kira Denholm",
    subject: "Missing you",
    date: "295-1115", // Sent 15 days ago
    encrypted: false,
    preview: "I know you're busy with work, but...",
    tone: "worried",
    gmNote: "She doesn't know he's a fugitive"
  },
  {
    to: "James",
    from: "Marta",
    subject: "[ENCRYPTED]",
    date: "302-1115",
    encrypted: true, // Requires one-time pad
    content: "Thale left Raschev 3 days after you. Fast courier.",
    gmNote: "Warning about pursuit"
  },
  {
    to: "ALL CREW",
    from: "Spinward News Service",
    subject: "Weekly Digest 309-1115",
    date: "309-1115",
    type: "periodical",
    headlines: [
      "Sword Worlds Tensions Rise",
      "Darrian Confederation Trade Summit",
      "Garoo: New Government Eases Travel Restrictions"
    ]
  }
]
```

#### Implementation Approach

**Phase 1 (MVP):** GM prepares mail in advance, reads it aloud when PCs check in
**Phase 2:** VTT displays mail queue, players can "open" messages
**Phase 3:** In-game encryption system (JavaScrypt one-time pads already exist!)

### Recommendations

1. **Keep it simple** - The VTT should SUPPORT the game, not dominate it
2. **GM control** - You drive the contacts and tension, VTT displays it
3. **Passive beauty** - Players see their ship status, that's compelling enough
4. **Optional actions** - If a player WANTS to push a button, they can
5. **Fallback plan** - If VTT has issues, the game continues without it

---

## Questions for Bruce

### Bruce1Dorania
1. Do players need to take actions in VTT, or mostly observe/track?
2. Should sensor contacts be "discovered" or pre-populated?
3. How much time tracking matters? (exact hours vs narrative beats)
4. What's the NPC pilot's name?

### Bruce2Flammarion
1. Are the Tlatl fighters pre-defined or need creation?
2. Do PCs crew the fighters or NPCs?
3. How detailed should carrier ops be? (launch/recovery times?)
4. Should pirates be AI-controlled or GM-run?

---

## Session Notes Space

### Pre-Session Checklist
- [ ] Campaign created for Dorania scenario
- [ ] Type S Scout configured
- [ ] 5 player accounts set up
- [ ] NPC pilot assigned
- [ ] Test login flow with one player
- [ ] Contact examples ready for GM

### Post-Session Feedback
_(To be filled after live game)_

- What worked:
- What didn't:
- Player feedback:
- Technical issues:
- Feature requests:
