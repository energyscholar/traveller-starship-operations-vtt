# UI Redesign Plan - Stage 10+ (Future)

**Status**: Planning Phase - Questions and Design Options
**Screenshot Reference**: `exclude_from_git/Screenshot from 2025-11-08 19-22-00.png`
**Current State**: Zoomed to 50% to see entire UI, significant wasted space

---

## Core Requirements

1. **Screen Real Estate Optimization** - Design for desktop browser aspect ratio (not mobile)
2. **No Scrolling** - Entire UI visible on standard screens without scrolling (graceful degradation if needed)
3. **Space-Saving** - Hide/collapse non-essential components
4. **Prominence** - Initiative tracker and turn order highly visible
5. **Visual Feedback** - Ship images, mouseover help, intuitive phase display

---

## Specific Issues to Address

### Current Problems:
- Double titles (top green box + "Traveller Space Combat" heading) waste ~200px vertical
- Narrow centered column (~500px) with huge purple margins
- Combat Log requires scrolling
- Turn Timer at bottom, not prominent
- Crew section always expanded (only needed at start)
- Gunner Actions visible even when not relevant
- No ship images
- No helpful tooltips/mouseovers
- Initiative/Phase display not intuitive

---

## Questions to Answer

### 1. Screen Real Estate & Aspect Ratio

**Q1**: Target screen resolution?
- Modern widescreen (1920x1080 minimum)?
- Or support down to 1366x768?

**Q2**: Minimum viewport height assumption?
- 768px (standard laptop)?
- 900px?
- 1080px?

**Concern 1**: Double title headers take ~200px. Should we:
- Keep ONE title header at top (which one?)
- Move status info (Stage 9, Multiplayer, Player X, Ship) into compact top bar?

**Concern 4**: With all components visible (Crew expanded, Gunner Actions expanded, Log expanded), may not fit in 768px. Should we:
- Accept that some components must be collapsed by default?
- Use tabbed interface for some sections?
- Prioritize which components are "always visible"?

---

### 2. Initiative & Phase Display

**Current**: Shows "Corsair - Your Turn" but minimal phase info

**Q3**: Initiative tracker should show:
- Current actor's ship name + portrait/icon?
- Turn order queue (who goes next)?
- Both current phase AND upcoming phase?

**Q4**: Phase display format:
- Horizontal progress bar?
- Vertical list?
- Icon-based indicators?

**Phases Identified**:
1. Initiative phase (roll for turn order)
2. Movement phase
3. Combat/firing phase
4. End turn phase

**User Request**: Display should make it intuitive to see:
- WHICH SHIP is currently acting
- WHICH PHASE is occurring
- Helpful explanation on mouseover

---

### 3. Ship Component Compression

**Current**: "Scout" section with HP bar (87/20) takes vertical space

**Q5**: Compact ship display priority order:
1. Ship image/icon (how big? 64x64? 128x128?)
2. Ship name + HP bar (current layout is good?)
3. Critical damage indicators (later stage)?

**Q6**: Mouseover popup should show:
- Full stat block (Hull, Armor, Weapons, Movement, Pilot Skill)?
- Crew assignments?
- Damage history?
- How detailed?

**User Request**:
- More compressed, less screen real estate
- Should be at or near the top
- Image of the ship
- Complete stats in help popup on mouseover

---

### 4. Crew Component - Expand/Collapse

**Current**: Crew section quite tall, only changed at start

**Q7**: Default state should be:
- Collapsed (just show "Crew ▼" header)?
- Collapsed but show crew role icons (3 small portraits)?
- Expanded initially, then player collapses it?

**Concern 2**: If crew can take damage (later stage), should injured crew be highlighted even when collapsed?

**User Request**:
- Great component but should expand/contract
- Typically only set at beginning
- Keep as later stage feature but add expand/contract now

---

### 5. Gunner Actions - Role-Based Visibility

**Current**: Gunner Actions takes significant space

**Q8**: This component should:
- Auto-hide when NOT the gunner's phase?
- Show but be disabled/grayed out?
- Have manual expand/collapse control?

**Concern 3**: Relates to crew roles (later stage). Should we:
- Just add expand/collapse for now?
- Wait until role system is implemented?

**User Request**:
- Only relevant to gunner role (later stage)
- Implement EXPAND/CONTRACT control
- Hide when not needed to save screen real estate

---

### 6. Turn Timer Prominence

**Current**: Turn Timer at bottom, easy to miss

**Q9**: Turn Timer placement:
- Top bar (next to ship name/status)?
- Next to initiative tracker?
- Floating in corner?
- Integrated into initiative display?

**User Request**: Move to more prominent location

---

### 7. Combat Log Visibility

**Current**: Log requires scrolling, at bottom

**Q10**: Combat Log redesign:
- Sidebar (right side of screen)?
- Fixed height with internal scroll (how tall? 200px? 300px?)?
- Expand/collapse with default state expanded?
- Top/bottom placement?

**Q11**: Log entries should:
- Auto-scroll to latest?
- Highlight important events (hits, damage, victory)?
- Include timestamps?
- Color coding by event type?

**User Request**:
- More prominent (not require scrolling to see)
- Show/hide or Expand/Contract control
- Important for following combat action

---

## Layout Options for Discussion

### Option A - Two Column Layout:
```
┌─────────────────────────────────────────────┐
│ Top Bar: Title | Ship | Initiative | Timer │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  Ship Status     │   Combat Log             │
│  (compact)       │   (fixed height,         │
│                  │    scrollable)           │
│  Initiative      │                          │
│  Tracker         │                          │
│  (prominent)     │                          │
│                  │                          │
│  Crew ▼          ├──────────────────────────┤
│  (collapsed)     │                          │
│                  │   Gunner Actions         │
│  Movement/Grid?  │   (when relevant)        │
│  (later stage)   │                          │
│                  │                          │
└──────────────────┴──────────────────────────┘
```

**Pros**:
- Combat log always visible
- Clear separation of info vs actions
- Easy to scan vertically

**Cons**:
- May feel cramped on narrower screens
- Log competes for horizontal space

---

### Option B - Horizontal Layout:
```
┌─────────────────────────────────────────────┐
│ Top: Title | Ship+HP | Initiative | Timer   │
├─────────────────────────────────────────────┤
│ ┌────┐ ┌──────────────┐ ┌─────────────────┐│
│ │Ship│ │ Init Tracker │ │  Gunner Actions ││
│ │Img │ │ (prominent)  │ │  (collapsible)  ││
│ └────┘ └──────────────┘ └─────────────────┘│
├─────────────────────────────────────────────┤
│ Crew ▼ (collapsed)                          │
├─────────────────────────────────────────────┤
│ Combat Log (fixed height, auto-scroll)      │
└─────────────────────────────────────────────┘
```

**Pros**:
- Uses full width effectively
- Initiative very prominent in center
- Logical flow top-to-bottom

**Cons**:
- Log at bottom (less prominent?)
- More horizontal eye movement

---

### Option C - Dashboard Style (New Suggestion):
```
┌───────────────────────────────────────────────────────┐
│ Traveller Combat VTT | Round 3 | Your Turn | ⏱️ 0:45  │
├──────┬────────────────────────────┬───────────────────┤
│ SHIP │    INITIATIVE & PHASE      │   COMBAT LOG ▼    │
├──────┤   ┌────────────────────┐   ├───────────────────┤
│ [IMG]│   │    🎯 YOUR TURN    │   │ > Hit! 6 damage   │
│ Scout│   │                    │   │ > Corsair fires   │
│ HP:4 │   │ Phase: FIRING      │   │ > Miss!           │
│ ━━━━ │   │                    │   │ > Round 3 start   │
│      │   │ Next: Corsair      │   │   ...             │
│      │   └────────────────────┘   │   (scroll)        │
├──────┴────────────────────────────┤                   │
│ ▶ Crew (collapsed)                │                   │
├───────────────────────────────────┤                   │
│ GUNNER ACTIONS                    │                   │
│ [Target: Opponent ▼] [Weapon ▼]  │                   │
│         [🔥 FIRE!]                │                   │
└───────────────────────────────────┴───────────────────┘
```

**Pros**:
- Ship image prominent top-left
- Initiative center-stage
- Log persistently visible on right
- Compact horizontal use
- All key info in single eyeline

**Cons**:
- More complex to implement
- May need careful sizing for different resolutions

---

## Component Specifications

### Top Bar (Consolidated Header)
- **Remove**: Double headers
- **Include**:
  - Game title (smaller)
  - Current round
  - Current ship/player
  - Turn timer (prominent)
  - Stage/mode info (smaller)

### Ship Status Component
- **Ship Image**: 64x64 or 128x128 icon/portrait
- **Ship Name**: Bold, clear
- **HP Bar**: Visual with numbers (4/10)
- **Hover Tooltip**: Full stats popup
  - Hull, Armor, Movement
  - Pilot Skill
  - Weapons list
  - Current crew assignments
  - Recent damage history

### Initiative Tracker (PROMINENT)
- **Current Actor**: Large, clear
- **Ship portrait/icon**
- **Phase Indicator**: Visual (progress bar or icon)
- **Turn Order**: Preview who's next
- **Hover Tooltip**: Explain initiative and phases

### Phase Display
- Visual indicator of current phase
- Show phase sequence/progress
- Mouseover explains what each phase means

### Crew Component
- **Default**: Collapsed with ▼ indicator
- **Collapsed View**: Show "Crew ▼" or mini icons
- **Expanded**: Current full view
- **Future**: Highlight injured crew even when collapsed

### Gunner Actions
- **Expand/Collapse Control**: Manual toggle
- **Default State**: Expanded when player is gunner?
- **Future**: Auto-hide when not relevant role/phase

### Combat Log
- **Fixed height**: 200-300px with internal scroll
- **Auto-scroll**: Jump to latest entry
- **Highlighting**: Different colors for hits/misses/damage
- **Expand/Collapse**: User control
- **Default**: Expanded

### Turn Timer
- **Placement**: Top bar or near initiative
- **Size**: Large enough to glance at
- **Visual**: Color changes as time runs low?

---

## Implementation Priorities (When Started)

1. **Phase 1 - Layout Restructure**
   - Consolidate headers into single top bar
   - Implement two-column or dashboard layout
   - Make UI full-width responsive

2. **Phase 2 - Expand/Collapse Controls**
   - Add to Crew component
   - Add to Gunner Actions
   - Add to Combat Log
   - Save state to localStorage

3. **Phase 3 - Ship Images**
   - Find/create ship icons (scout, corsair, free_trader)
   - Add image component to ship status
   - Size appropriately

4. **Phase 4 - Tooltips/Mouseovers**
   - Ship stats tooltip
   - Initiative explanation tooltip
   - Phase explanation tooltip
   - Implement with CSS or library

5. **Phase 5 - Initiative/Phase Enhancement**
   - Prominent display
   - Visual phase indicators
   - Turn order preview

6. **Phase 6 - Combat Log Enhancement**
   - Fixed height with scroll
   - Event highlighting
   - Auto-scroll to latest

7. **Phase 7 - Responsive Testing**
   - Test at various resolutions
   - Ensure no scrolling needed
   - Graceful degradation

---

## Technical Considerations

### CSS Framework
- Current: Custom CSS
- Consider: CSS Grid for layout?
- Flexbox for component internals?

### Collapse/Expand Mechanism
- Pure CSS (checkbox hack)?
- JavaScript toggle?
- Store state in localStorage?

### Ship Images
- Format: PNG with transparency?
- Source: Find free icons or commission?
- Fallback: Colored shapes if no images?

### Tooltips
- Pure CSS on hover?
- JavaScript library (Tippy.js, Popper.js)?
- Accessible (keyboard navigation)?

### Responsive Breakpoints
- 1920px+ (full layout)
- 1366px (compact layout)
- < 1366px (graceful degradation, minimal scrolling)

---

## Next Steps (When Resuming)

1. **Get Answers**: User answers questions above
2. **Choose Layout**: Pick Option A, B, C, or hybrid
3. **Create Mockup**: Design visual mockup/wireframe
4. **Prototype**: Build HTML/CSS prototype
5. **Iterate**: Test and refine
6. **Implement**: Full integration into app
7. **Test**: User testing and feedback

---

## Related Files

- Current UI: `public/index.html`
- Current CSS: `public/styles.css`
- Screenshot: `exclude_from_git/Screenshot from 2025-11-08 19-22-00.png`

---

**Last Updated**: 2025-11-08
**Session**: UI Redesign Planning
**Stage**: Future (10+)
