# React Migration - Scope Decisions

**Date:** 2025-11-14
**Status:** Planning phase - lessons from previous attempts

---

## Scope Reduction Decision: De-prioritize Tutorial System

### Decision
**Tutorial system will be migrated LAST**, after all core screens are working.

### Rationale
1. **Tutorial is complex** - 7 interconnected files with DOM manipulation
2. **Tutorial is non-essential** - Core combat functionality works without it
3. **Tutorial will break** - 100% certain to fail during initial React migration
4. **Reduce scope** - Focus on core screens first (MainMenu, ShipSelection, CombatScreen)

### Tutorial Files (NOT migrating initially)
```
public/tutorial-chat.js
public/tutorial-modal.js
public/tutorial-player.js
public/tutorial-pointer.js
public/tutorial-scenarios.js
public/tutorial-tooltip.js
public/tutorial.css
```

### Current State
- ✅ **No tutorial tests exist** - nothing to comment out
- ✅ Tutorial functionality works in vanilla JS
- ⏸️ Tutorial migration deferred until after core migration complete

### Migration Order
1. **Phase 1:** Core screens (MainMenu, ShipSelection, CombatScreen)
2. **Phase 2:** Socket.IO integration and state management
3. **Phase 3:** Ship customizer and templates
4. **Phase 4:** Tutorial system (LAST)

---

## Previous Migration Attempts - Lessons Learned

### Attempt Summary (Night of 2025-11-13/14)
- **Attempts:** 4 failed attempts
- **Approach:** Big-bang rewrite (entire app at once)
- **Success rate:** 0% (as predicted)
- **User estimate:** <10% chance of success
- **Claude estimate:** >50% chance of success (overly optimistic)

### What Went Wrong
1. **Too much scope** - Tried to migrate everything simultaneously
2. **Big-bang approach** - All-or-nothing strategy
3. **Dependency hell** - Everything needed everything else
4. **No incremental testing** - Couldn't validate progress
5. **Tutorial complexity** - Included in initial scope

### Key Lesson
> "Over-planning is not a substitute for incremental execution."

### Process Improvement
- ❌ **Previous:** No execution log preserved during branch cleanup
- ✅ **Next time:** Keep migration logs in separate branch/location
- ✅ **Next time:** Incremental migration with parallel running systems

---

## Next Migration Strategy (When/If Attempted)

### Incremental Approach
1. **Run React alongside vanilla** - Both systems running simultaneously
2. **Migrate one screen at a time** - Test each independently
3. **Keep vanilla as fallback** - Don't break what works
4. **Tutorial comes LAST** - Only after core screens proven working

### Success Criteria (Before Migrating Tutorial)
- [ ] MainMenu works in React
- [ ] ShipSelection works in React
- [ ] CombatScreen works in React
- [ ] Socket.IO integration working
- [ ] State management solid
- [ ] All core tests passing
- [ ] Feature parity with vanilla version

**Only THEN** consider migrating tutorial system.

---

## Documentation Status

**Planning docs preserved:**
- ✅ `docs/REACT-MIGRATION-PLAN.md` - Original big-bang plan
- ✅ `docs/REACT-MIGRATION-QUICKSTART.md` - Step-by-step guide
- ✅ `docs/REACT-MIGRATION-RISK-ANALYSIS.md` - Risk analysis
- ✅ `docs/REACT-MIGRATION-SCOPE.md` - This document

**Execution logs:**
- ❌ No logs preserved from 4 failed attempts (lesson learned)

---

**Last Updated:** 2025-11-14
**Next Review:** Before any future React migration attempt
