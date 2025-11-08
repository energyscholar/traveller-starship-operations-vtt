# Stage 14: API Integration & VTT Interoperability

**Est. 6,000 tokens | ~10 hours | ~600 LOC**

## Scope

### Features
- Universal state import/export (JSON)
- Roll20 API integration
- Fantasy Grounds API integration
- Foundry VTT API integration
- Bidirectional sync protocol
- Character/ship data mapping

### Tests
- Unit tests: ~350 LOC
- Integration tests: ~150 LOC
- API compatibility tests: ~100 LOC

## Sub-Stages

### 14.1: State Export/Import (2k tokens, ~200 LOC)
- Export full battle state (JSON)
- Export character roster (JSON)
- Export ship roster (JSON)
- Import validation
- Schema versioning
- Migration utilities

### 14.2: Roll20 Integration (1.5k tokens, ~150 LOC)
- Roll20 character sheet mapping
- Roll20 API authentication
- Push updates to Roll20
- Pull character data from Roll20
- Dice roller integration

### 14.3: Fantasy Grounds Integration (1.5k tokens, ~150 LOC)
- Fantasy Grounds character mapping
- FG API authentication
- Bidirectional sync
- Combat tracker integration

### 14.4: Foundry VTT Integration (1k tokens, ~100 LOC)
- Foundry module structure
- Foundry API integration
- Socket communication
- Data synchronization

## Acceptance Criteria
- [ ] Export battle state to JSON
- [ ] Import battle state from JSON
- [ ] Roll20 characters sync
- [ ] Fantasy Grounds characters sync
- [ ] Foundry VTT integration works
- [ ] No data loss in round-trip import/export
