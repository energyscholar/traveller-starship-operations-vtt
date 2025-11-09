# Stage 10: Critical Hit Effects & Severity

**Est. 7,000 tokens | ~5 hours | ~700 LOC**

## Scope

### Features
- Full severity calculation: damage ÷ 10 (round up)
- Critical hit effects by location and severity (1-6)
- System damage impacts gameplay:
  - M-Drive: Thrust reduction, control penalties
  - Power Plant: Thrust/Power reduction
  - Sensors: Range penalties
  - Weapons: Bane/disabled/destroyed
  - Crew: Casualties
- Damage control actions (Engineer repairs crits)
- Jump safety checks (misjump on damage/proximity)

### Tests
- Unit tests: ~450 LOC
- Integration tests: ~100 LOC
- Test coverage: 90%+

## Sub-Stages

### 10.1: Severity System (2k tokens, ~150 LOC)
- Remove severity stub
- Implement: Math.ceil(damage / 10)
- Severity capping (max 6)
- Multiple severity hits stack

### 10.2: Critical Effects - Drives (2k tokens, ~200 LOC)
- M-Drive: Control DM, Thrust reduction
- J-Drive: Jump disabled
- Power Plant: Thrust/Power loss, cascading damage

### 10.3: Critical Effects - Systems (2k tokens, ~200 LOC)
- Sensors: Range penalties
- Computer: System failures
- Fuel: Leaks (tons per round/hour)
- Armour: Permanent reduction

### 10.4: Critical Effects - Weapons & Crew (1k tokens, ~150 LOC)
- Weapons: Bane, disabled, destroyed, explosion
- Crew: Casualties (character damage)
- Hull: Structural damage

### 10.5: Damage Control (1k tokens, ~100 LOC)
- Engineer repair action
- Repair checks vs severity
- Temporary vs permanent repairs
- Jump safety (misjump mechanics)

---

## Incremental Refactoring (Stage 10)

**While implementing critical hits, extract focused modules to reduce `combat.js` bloat:**

- **Create `lib/critical-hits.js`** - Critical hit resolution, severity calculation
- **Create `lib/damage-effects.js`** - System damage effects (M-Drive, PP, Sensors, Weapons, Crew)
- Keep modules single-purpose and testable
- Sets pattern for Stage 11-12 extractions
- **Goal:** Start paying down technical debt while adding features

---

## Acceptance Criteria
- [x] Severity scales with damage (1-6) ✅
- [x] All 11 crit locations have effects ✅
- [x] M-Drive hits reduce Thrust ✅
- [x] Sensor hits reduce range ✅
- [x] Weapon hits disable turrets ✅
- [x] Engineer can repair crits ✅
- [ ] Jump misjump on damage/proximity (DEFERRED to Stage 12 - Jump Drive mechanics)
- [x] Critical hits integrated into combat resolution ✅
- [x] Sustained damage triggers (every 10% hull lost) ✅
- [x] 83 unit tests passing ✅
- [x] Integration tests created and verified ✅
- [x] Incremental refactoring: lib/critical-hits.js and lib/damage-effects.js ✅
