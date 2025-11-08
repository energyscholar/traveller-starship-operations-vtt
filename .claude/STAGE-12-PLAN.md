# Stage 12: Boarding Actions

**Est. 6,000 tokens | ~5 hours | ~600 LOC**

## Scope

### Features
- Docking manoeuvres (Pilot check, opposed if unwilling)
- Marine deployment
- Boarding combat (abstract system)
- Repel boarders actions
- Ship capture mechanics
- Casualties and retreat

### Tests
- Unit tests: ~400 LOC
- Integration tests: ~100 LOC
- Test coverage: 90%+

## Sub-Stages

### 12.1: Docking & Deployment (2k tokens, ~200 LOC)
- Docking manoeuvre (Pilot check)
- Adjacent range requirement
- Opposed check (defender has Bane)
- Marine deployment timing

### 12.2: Boarding Combat (Abstract) (2k tokens, ~250 LOC)
- Boarding strength calculation
- Defender strength calculation
- Opposed checks per round
- Modifiers: armour, weapons, numbers, tactics
- Casualties (both sides)

### 12.3: Capture & Repel (2k tokens, ~150 LOC)
- Ship capture conditions
- Surrender mechanics
- Repel boarders success
- Escape pod options
- Crew casualties to personal combat characters

## Acceptance Criteria
- [ ] Ships can dock at Adjacent range
- [ ] Marines can board enemy ships
- [ ] Boarding combat resolves each round
- [ ] Ships can be captured
- [ ] Defenders can repel boarders
- [ ] Casualties affect crew roster
