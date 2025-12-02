# AUTORUN 10: Adventure Packages + Combat Extraction

**Created:** 2025-12-01
**Status:** READY
**Risk Level:** LOW
**Prerequisite:** AUTORUN-9 completed (JSON Schema validation)

## Execution Protocol
**Token Efficiency Mode:** Auto-adjust effort to minimize token use.
- `[65%]` BURST: Exploration, planning, debugging
- `[40%]` CRUISE: Sequential implementation, clear path
- Signal mode changes inline. Override with user instruction.

## Summary
Two parallel tracks: (A) Complete adventure file format for distribution, (B) Extract combat handlers for code health. Mixed approach balances new features with technical debt reduction.

---

## Stage 10.1: .tvadv Zip Format
**Risk:** LOW | **LOC:** ~200 | **Commit after**

Adventure packages as distributable archives.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 10.1.1 | Define .tvadv structure (manifest + JSON + assets) | ~20 |
| 10.1.2 | Pack function (campaign → .tvadv zip) | ~80 |
| 10.1.3 | Unpack function (.tvadv → temp dir) | ~60 |
| 10.1.4 | Asset reference handling (handout files) | ~40 |

**Deliverable:** Export campaign as downloadable .tvadv file.

---

## Stage 10.2: Adventure File Utilities
**Risk:** LOW | **LOC:** ~150 | **Commit after**

Tools for working with adventure packages.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 10.2.1 | CLI validate command (`npm run validate-adventure`) | ~40 |
| 10.2.2 | Adventure preview (list contents without importing) | ~50 |
| 10.2.3 | Selective import (choose which entities to import) | ~60 |

**Deliverable:** Adventure files are first-class citizens with tooling.

---

## Stage 10.3: Combat AI Extraction (Facade Pattern)
**Risk:** LOW | **LOC:** ~300 | **Commit after**

Extract AI decision logic using facade pattern for safety.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 10.3.1 | Write behavior tests for current AI decisions | ~80 |
| 10.3.2 | Create `lib/combat/ai.js` facade (wraps existing) | ~60 |
| 10.3.3 | Migrate target selection into facade | ~50 |
| 10.3.4 | Migrate weapon choice into facade | ~50 |
| 10.3.5 | Internalize logic (remove server.js deps) | ~60 |

**Pattern:** Facade wraps old code → tests pass → internalize → tests pass → delete old

**Deliverable:** AI logic testable in isolation, behavior tests document decisions.

---

## Stage 10.4: Combat State Extraction (Facade Pattern)
**Risk:** LOW | **LOC:** ~260 | **Commit after**

Extract combat state management using facade pattern for safety.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 10.4.1 | Write behavior tests for state transitions | ~80 |
| 10.4.2 | Create `lib/combat/state.js` facade (wraps existing) | ~60 |
| 10.4.3 | Migrate round/phase management into facade | ~40 |
| 10.4.4 | Migrate damage application into facade | ~40 |
| 10.4.5 | Internalize logic (remove server.js deps) | ~40 |

**Pattern:** Same as 10.3 - facade first, internalize after tests green

**Deliverable:** Combat state logic testable in isolation, behavior tests document flow.

---

## Stage 10.5: Server.js Cleanup
**Risk:** LOW | **LOC:** ~-200 (reduction) | **Commit after**

Reduce server.js to routing only.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 10.5.1 | Replace inline AI calls with module | ~-100 |
| 10.5.2 | Replace inline state calls with module | ~-80 |
| 10.5.3 | Verify all 308+ tests pass | ~0 |
| 10.5.4 | Document new combat module structure | ~20 |

**Deliverable:** server.js under 500 LOC. Combat logic in dedicated modules.

---

## Total: ~910 LOC new + ~200 LOC reduction = ~710 net

---

## Risk Mitigations

| Stage | Original | Mitigation | Final |
|-------|----------|------------|-------|
| 10.1 | LOW | Build on AR-9 JSON Schema | LOW |
| 10.2 | LOW | Read-only operations | LOW |
| 10.3 | MED | Facade pattern + behavior tests first | **LOW** |
| 10.4 | MED | Facade pattern + behavior tests first | **LOW** |
| 10.5 | LOW | Only delete after tests pass | LOW |

**All stages now LOW risk.**

## Extraction Pattern Detail

```
Step 1: Write behavior tests (lock current behavior)
   ↓
Step 2: Create facade module (just imports/re-exports)
   ↓
Step 3: Tests still pass? → Migrate one function at a time
   ↓
Step 4: Tests still pass? → Internalize (remove old code deps)
   ↓
Step 5: Tests still pass? → Delete old code from server.js
```

---

## Stage Dependencies

```
10.1 (.tvadv format)
  ↓
10.2 (Utilities) ← needs pack/unpack

10.3 (AI Extraction)      ← independent track
  ↓
10.4 (State Extraction)   ← builds on 10.3
  ↓
10.5 (Cleanup)            ← requires 10.3 + 10.4
```

**Tracks can run in parallel:** 10.1-10.2 independent from 10.3-10.5

---

## File Structure

```
lib/combat/
├── ai.js           # NEW - AI decision logic
├── state.js        # NEW - Combat state management
└── index.js        # NEW - Module exports

schemas/
├── adventure.schema.json   # From AR-9
├── character.schema.json   # From AR-9
└── tvadv-manifest.json     # NEW - Package manifest schema
```

---

## .tvadv File Format

```
my-adventure.tvadv (zip archive)
├── manifest.json           # Version, metadata, checksums
├── adventure.json          # All prep content (validates against schema)
├── assets/
│   ├── handouts/
│   │   ├── map-001.png
│   │   └── briefing.pdf
│   └── portraits/
│       └── npc-webb.jpg
└── README.md               # Human-readable description
```

---

## Success Criteria

| Stage | Criterion |
|-------|-----------|
| 10.1 | Export → .tvadv → Import round-trip works |
| 10.2 | `npm run validate-adventure foo.tvadv` exits 0/1 correctly |
| 10.3 | AI module has 90%+ test coverage |
| 10.4 | State module has 90%+ test coverage |
| 10.5 | server.js < 500 LOC, all tests pass |

---

## Deferred to AUTORUN-11+

- Combat integration with bridge (Stage 5)
- Ship systems & damage (Stage 6)
- Full mail compose
- Adventure marketplace / DRM
- NPC crew automation
