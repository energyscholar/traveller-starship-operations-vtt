# AUTORUN 8: GM Prep UI & Bridge Polish

**Created:** 2025-12-01
**Status:** READY
**Risk Level:** LOW
**Prerequisite:** AUTORUN-7 completed (data foundation)

## Execution Protocol
**Token Efficiency Mode:** Auto-adjust effort to minimize token use.
- `[65%]` BURST: Exploration, planning, debugging
- `[40%]` CRUISE: Sequential implementation, clear path
- Signal mode changes inline. Override with user instruction.

## Summary
Build the **GM-facing UI** for managing adventure prep content. Organized into 4 stages with git commits between each for risk mitigation.

---

## Stage 8.1: Prep Panel Foundation + Reveals
**Risk:** LOW | **LOC:** ~350 | **Commit after**

Core GM prep workflow - the most important feature.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 8.1.1 | GM Prep Panel scaffold (collapsible sidebar) | ~120 |
| 8.1.2 | Reveals tab with list view | ~100 |
| 8.1.3 | Quick reveal modal (deploy to players) | ~80 |
| 8.1.4 | Reveal to specific player option | ~50 |

**Deliverable:** GM can view hidden reveals and deploy them to players.

---

## Stage 8.2: Entity Management (NPCs, Locations, Events)
**Risk:** LOW | **LOC:** ~350 | **Commit after**

Content browsing and management for prep entities.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 8.2.1 | NPCs tab with list/detail view | ~120 |
| 8.2.2 | NPC reveal button (make visible to players) | ~30 |
| 8.2.3 | Locations tab with tree view | ~100 |
| 8.2.4 | Events tab with timeline view | ~80 |
| 8.2.5 | Event trigger button (execute cascade) | ~20 |

**Deliverable:** GM can browse and manage all prep entities.

---

## Stage 8.3: Communication & Assets
**Risk:** LOW | **LOC:** ~280 | **Commit after**

Email queue and handout management.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 8.3.1 | Email Queue tab (drafts/queued/sent) | ~100 |
| 8.3.2 | Send Now / Queue for Date buttons | ~40 |
| 8.3.3 | Handouts tab with gallery view | ~80 |
| 8.3.4 | Share handout button | ~30 |
| 8.3.5 | Import/Export adventure buttons | ~30 |

**Deliverable:** GM can manage email queue and share handouts.

---

## Stage 8.4: Bridge Polish
**Risk:** LOW | **LOC:** ~160 | **Commit after**

Deferred bridge features.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 8.4.1 | Captain "Relieve from Duty" action | ~80 |
| 8.4.2 | Relieved player returns to Role Selection | ~50 |
| 8.4.3 | Ship log entry for relief | ~30 |

**Deliverable:** Captain can relieve crew members from duty.

---

## Stage 8.5: Branding & Legal
**Risk:** LOW | **LOC:** ~80 | **Commit after**

Professional presentation on entry page.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 8.5.1 | App title + version on login screen | ~20 |
| 8.5.2 | Copyright notice + author credit | ~20 |
| 8.5.3 | Mongoose Traveller attribution | ~20 |
| 8.5.4 | Fair use / fan project disclaimer | ~20 |

**App Info:**
- **Name:** Traveller VTT for Starship Operations
- **Version:** 0.31
- **Author:** Bruce Stephenson
- **Attribution:** "Traveller is a registered trademark of Far Future Enterprises. This is an unofficial fan project and is not affiliated with or endorsed by Far Future Enterprises or Mongoose Publishing."

**Deliverable:** Entry page looks professional with proper legal notices.

---

## Total: ~1220 LOC across 5 stages

---

## Risk Mitigations

| Stage | Mitigation |
|-------|------------|
| 8.1 | Mobile: bottom drawer pattern for narrow screens |
| 8.4 | Graceful transition: modal "You have been relieved", player clicks OK |

## Testing Strategy
- Socket handler tests for prep events (prep:revealToAll, etc.)
- Manual UI testing during development
- **TODO:** E2E tests (Playwright) for critical flows in future autorun

## Stage Dependencies
```
8.1 (Panel + Reveals)
  ↓
8.2 (Entities) ← builds on panel scaffold
  ↓
8.3 (Comms & Assets) ← adds more tabs
  ↓
8.4 (Bridge Polish) ← independent feature
  ↓
8.5 (Branding) ← independent, can run anytime
```

---

## Success Criteria

Per stage:
- **8.1:** Deploy reveal → players see it in real-time
- **8.2:** Browse NPCs/Locations/Events, trigger events
- **8.3:** Email workflow works, handouts shareable
- **8.4:** Captain can relieve crew, they return to role selection
- **8.5:** Entry page shows app name, version 0.31, copyright, Mongoose attribution

---

## UI Wireframes

### Prep Panel (8.1)
```
+----------------------------------------+--------+
| Bridge View                            | [Prep] |
|                                        +--------+
|                                        | Reveals|
| Sensors   Ship Status   Alerts         | NPCs   |
|                                        | Locs   |
|                                        | Events |
|                                        | Email  |
|                                        | Assets |
+----------------------------------------+--------+
```

### Reveal Deploy Modal (8.1.3)
```
+--------------------------------+
| Deploy: Secret Cargo           |
+--------------------------------+
| "The cargo contains illegal    |
| weapons bound for..."          |
|                                |
| (*) All players                |
| ( ) Specific: [Marina ▼]       |
|                                |
| [Cancel]         [Deploy]      |
+--------------------------------+
```

### Email Queue (8.3.1)
```
+------------------+
| EMAIL QUEUE      |
+------------------+
| Drafts (2)       |
|  > Job offer     |
|  > Warning       |
+------------------+
| Queued (1)       |
|  > [1107-050]    |
|    News bulletin |
+------------------+
| Sent (3)         |
|  > Welcome...    |
+------------------+
```
