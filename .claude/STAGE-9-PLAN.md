# Stage 9: Movement & Advanced Initiative

**Est. 8,000 tokens | ~6 hours | ~800 LOC**

## Scope

### Features
- Thrust allocation and range band movement
- Proper initiative: 2D + Pilot skill + Ship Thrust
- Captain Tactics (naval) bonus to initiative
- Combat manoeuvres: Aid Gunners, Evasive Action
- Jump Away mechanic (1-turn delay)
- Multi-player crewing (multiple players on one ship)

### Tests
- Unit tests: ~500 LOC
- Integration tests: ~150 LOC
- Test coverage: 90%+

### Technical Debt Addressed
- Remove fixed initiative stub
- Implement proper turn sequencing
- Add player-to-role assignments

## Sub-Stages

### 9.1: Movement & Thrust (2k tokens, ~120 LOC)
- Thrust allocation to movement
- Range band changes (cost = distance)
- Remaining Thrust tracking
- Movement validation

### 9.2: Proper Initiative System (2k tokens, ~150 LOC)
- Initiative: 2D + Pilot + Thrust
- Captain Tactics (naval) check
- Effect adds to initiative
- Initiative sorting and display

### 9.3: Combat Manoeuvres (2k tokens, ~180 LOC)
- Aid Gunners (Pilot check → task chain)
- Evasive Action (spend Thrust as reactions)
- Docking manoeuvre (stubbed)

### 9.4: Jump Away Mechanic (1k tokens, ~100 LOC)
- Jump charging (1 turn delay)
- Jump execution (flee stance)
- Jump interruption (damage prevents)
- Jump safety (stubbed for Stage 10)

### 9.5: Multi-Player Crewing (1k tokens, ~250 LOC)
- Player-to-role assignments
- Role permissions (gunner can't move ship)
- Captain override system
- Turn coordination UI

## Acceptance Criteria
- [ ] Ships can move between range bands
- [ ] Thrust cost enforced
- [ ] Initiative properly calculated
- [ ] Captain Tactics bonus works
- [ ] Multiple players can crew one ship
- [ ] Jump Away takes 1 turn, then flees
