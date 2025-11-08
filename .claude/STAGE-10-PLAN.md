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

## Acceptance Criteria
- [ ] Severity scales with damage (1-6)
- [ ] All 11 crit locations have effects
- [ ] M-Drive hits reduce Thrust
- [ ] Sensor hits reduce range
- [ ] Weapon hits disable turrets
- [ ] Engineer can repair crits
- [ ] Jump misjump on damage/proximity
