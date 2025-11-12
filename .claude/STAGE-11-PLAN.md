# Stage 11: Missiles, Sandcasters & Called Shots

**Est. 9,000 tokens | ~7 hours | ~900 LOC**

## Scope

### Features
- Missile mechanics: movement, tracking, point defense
- Sandcaster reactions: add 1D to armour
- Called shots: target specific location (attack penalty)
- Weapon linking (multiple same weapons in turret)
- Advanced targeting options
- Ammo tracking (missiles, sandcasters)

### Tests
- Unit tests: ~550 LOC
- Integration tests: ~150 LOC
- Test coverage: 90%+

## Sub-Stages

### 11.1: Missile Mechanics (3k tokens, ~300 LOC)
- Missile launch and tracking
- Missile movement (1 band per round)
- Point defense (laser vs missile)
- Missile impact (4D damage)
- Ammo tracking (12 per rack)
- Reload mechanics (1 round)

### 11.2: Sandcaster Reactions (2k tokens, ~200 LOC)
- Reaction timing (vs laser attack)
- Gunner check (adds to armour)
- Effect: 1D + Effect to armour
- Ammo tracking (20 canisters)
- Reload mechanics
- Anti-personnel mode (8D personal scale)

### 11.3: Called Shots (2k tokens, ~200 LOC)
- Location selection UI
- Attack penalty (DM-2 or similar)
- Override random location roll
- Strategic targeting (disable J-Drive, etc.)

### 11.4: Weapon Linking (2k tokens, ~200 LOC)
- Multi-turret linking rules
- Triple pulse laser: 2D+4 damage
- Attack bonus per extra weapon (+1/die)
- UI for linked fire

---

## Incremental Refactoring (Stage 11)

**While implementing missiles & sandcasters, extract weapon-specific modules:**

- **Create `lib/weapons/missiles.js`** - Missile launch, tracking, movement, point defense
- **Create `lib/weapons/sandcasters.js`** - Sandcaster reactions, countermeasures
- **Create `lib/weapons/index.js`** - Weapon type registry (consider factory pattern)
- **Create `lib/weapons/linking.js`** - Weapon linking and combined fire
- Continue reducing `combat.js` size
- Each weapon type becomes independently testable

---

## UI/UX Review (Incremental)

**Cross-reference UI against use cases:**
- Review current UI against primary use cases (Tuesday game, solo testing)
- Identify pain points and usability issues
- Make incremental improvements during Stage 11
- Document findings for Stage 21 (comprehensive UI/UX polish)

**Key Questions:**
- Does the turn indicator clearly show whose turn it is?
- Can players easily identify their ships and actions?
- Is the combat log readable and useful?
- Are missile/sandcaster actions intuitive?
- Does the UI support the primary use cases effectively?

## Acceptance Criteria
- [ ] Missiles launch and track targets
- [ ] Missiles move 1 band per round
- [ ] Point defense can destroy missiles
- [ ] Sandcasters react to laser attacks
- [ ] Called shots target specific systems
- [ ] Weapon linking increases damage
- [ ] Ammo tracked and reloads work
- [ ] UI reviewed against use cases
- [ ] Initiative/phase tracker implemented
- [ ] Version display added to client
