# AR-151: Refactor app.js to <1,000 LOC (TODO)

**Status:** PLANNED - Do not execute until explicitly requested
**Risk:** HIGH initially, mitigated to LOW via phased approach
**Current:** 11,552 lines | **Target:** <1,000 lines

---

## Summary

Extract 54 sections from app.js into focused modules. Phased approach to keep risk LOW.

## Phases

| Phase | Difficulty | Lines to Extract | Result |
|-------|------------|------------------|--------|
| 1 | EASY | ~5,000 | app.js → 6,500 |
| 2 | MEDIUM | ~3,500 | app.js → 3,000 |
| 3 | HARD | ~2,000 | app.js → <1,000 |

## Key Extractions

- **Socket handlers** (1,534 lines) → `socket-handlers/*.js`
- **Screens** (1,400 lines) → `screens/*.js`
- **Modals** (710 lines) → `modals/*.js`
- **Role functions** (800+ lines) → `roles/*.js`
- **GM features** (900+ lines) → `gm/*.js`

## Risk Mitigation

- Phase 1: Zero-dependency extractions only
- Phase 2: Test each extraction before proceeding
- Phase 3: Socket handler registry pattern (careful)
- Run full test suite after each extraction

## Dependencies

- Detailed section breakdown in exploration notes
- 148 socket event handlers to categorize
- 291 functions to relocate

---

*This is a TODO for future AR execution. Do not start without explicit GO.*
