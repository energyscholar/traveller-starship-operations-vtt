# Tutorial System - Temporarily Decoupled for React Migration

**Date:** 2025-11-14
**Status:** Tutorial disabled in vanilla app
**Reason:** Prevent tutorial from interfering with React migration

---

## What Was Changed

### Files Modified
- `public/index.html` - Commented out tutorial CSS, link, and scripts

### Specific Changes

**1. Tutorial CSS (Line ~8)**
```html
<!-- TUTORIAL DISABLED FOR REACT MIGRATION - Restore after migration complete -->
<!-- <link rel="stylesheet" href="tutorial.css"> -->
```

**2. Tutorial Link in Footer (Line ~315)**
```html
<!-- TUTORIAL DISABLED FOR REACT MIGRATION - Restore after migration complete -->
<!-- <a href="#" id="tutorial-toggle" ... >🎓 Tutorial</a> • -->
```

**3. Tutorial Scripts (Lines ~320-325)**
```html
<!-- TUTORIAL DISABLED FOR REACT MIGRATION - Restore after migration complete -->
<!-- Tutorial System Scripts - Session 8, Stage 14 -->
<!-- <script src="tutorial-modal.js"></script> -->
<!-- <script src="tutorial-pointer.js"></script> -->
<!-- <script src="tutorial-tooltip.js"></script> -->
<!-- <script src="tutorial-chat.js"></script> -->
<!-- <script src="tutorial-scenarios.js"></script> -->
<!-- <script src="tutorial-player.js"></script> -->
```

---

## Tutorial Files (NOT DELETED - Just Disabled)

These files remain in `public/` but are not loaded:

```
public/tutorial-modal.js        - Tutorial modal component
public/tutorial-pointer.js      - DOM pointer positioning
public/tutorial-tooltip.js      - Tooltip display
public/tutorial-chat.js         - Tutorial chat interface
public/tutorial-scenarios.js    - Tutorial scenario definitions
public/tutorial-player.js       - Tutorial playback engine
public/tutorial.css             - Tutorial styling
```

**Total:** 7 files (~2000+ lines of code)

---

## Why Decoupled?

1. **Tutorial breaks during migration** - 100% certain to fail when switching to React
2. **Reduce scope** - Focus on core combat functionality first
3. **DOM manipulation complexity** - Tutorial does direct DOM manipulation (incompatible with React)
4. **State persistence** - Tutorial needs to persist across route changes (complex in React)
5. **Not critical** - Core app works fine without tutorial

---

## Migration Strategy for Tutorial (Step 8)

**LAST** thing to migrate, after all core screens working:

### Phase 1: Convert to React Components
- `TutorialModal.jsx` - React modal component
- `TutorialPointer.jsx` - React pointer with useRef for positioning
- `TutorialTooltip.jsx` - React tooltip
- `TutorialChat.jsx` - React chat interface
- `TutorialPlayer.jsx` - React playback hook/component

### Phase 2: State Management
- Create `TutorialContext` separate from `GameContext`
- Use React refs for DOM manipulation (pointer positioning)
- Persist tutorial state across route changes

### Phase 3: Integration
- Mount tutorial at app level (above Router)
- Ensure tutorial survives route changes
- Test across all screens

---

## Restoration Checklist (After React Migration Complete)

When ready to restore tutorial in React app:

1. [ ] Uncomment tutorial CSS in React app
2. [ ] Create React tutorial components
3. [ ] Implement TutorialContext
4. [ ] Port tutorial scenarios.js
5. [ ] Test tutorial across all screens
6. [ ] Verify pointer positioning
7. [ ] Verify tutorial persistence

**DO NOT restore tutorial in vanilla app** - it will be part of React app only.

---

## Testing

**Current status:**
- ✅ All 197 tests pass with tutorial disabled
- ✅ App loads without errors
- ✅ No console errors about missing tutorial functions
- ✅ Footer displays correctly without tutorial link

**Before re-enabling:**
- [ ] All React screens working
- [ ] State management solid
- [ ] Ready to tackle complex tutorial migration

---

**Last Updated:** 2025-11-14
**Next Review:** After React migration Step 7 complete
