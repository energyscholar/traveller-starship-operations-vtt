# Staged AR Queue - All LOW Risk (2025-12-15)

All ARs mitigated to LOW risk through scope reduction, testing, and phasing.

---

## LOW RISK ARs - Complete List

### Quick Wins (~1h total)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| AR-142 | Server startup test commands | 10min | +10 | Dev UX | Manual |
| CLEAN-3 | Fix `--text-dim` CSS var | 5min | ~0 | Bug fix | Visual |
| CLEAN-4 | Fix `--accent-gold` CSS var | 5min | ~0 | Bug fix | Visual |
| CLEAN-5 | Remove unused helpers.js | 10min | -391 | Cleanup | `npm test` |
| CLEAN-6 | Remove debug/puppetry code | 10min | -30 | Security | `npm test` |
| CLEAN-7 | Remove .combat-placeholder | 5min | -5 | Cleanup | Visual |
| CLEAN-8 | Remove .legacy-link CSS | 5min | -7 | Cleanup | Visual |
| AR-146 | Remove district268.json | 15min | -500 | Cleanup | `npm test` |

**Subtotal:** ~1h | **LOC Delta:** -923

---

### AR-150: UI Status System (~2h)

| Stage | Title | Time | LOC | Value | Test |
|-------|-------|------|-----|-------|------|
| 150.1 | Create ui-status-registry.js | 30min | +150 | Infrastructure | Manual |
| 150.2 | Add CSS status classes | 15min | +40 | Visual feedback | Visual |
| 150.3 | Add data-control attrs | 30min | +50 | Tracking | Manual |
| 150.4 | Apply indicators on load | 15min | +10 | Integration | Visual |
| 150.5 | AR-127L: Sensor filter/sort | 30min | +40 | Fix broken UI | Manual |
| 150.6 | AR-128L: Observer selector | 20min | +30 | New feature | Manual |
| 150.7 | v81.6L: Tactical map stub | 15min | +20 | Placeholder | Visual |
| 150.8 | AR-131L: Captain command UI | 30min | +50 | Placeholder | Visual |

**Subtotal:** ~2h | **LOC Delta:** +390

---

### AR-127: Sensor Display Fix - 5 Micro-ARs (~1.5h)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| AR-127a | Sensor filter dropdown handler | 15min | +20 | Fix YELLOW→GREEN | Manual: filter contacts |
| AR-127b | Sensor sort dropdown handler | 15min | +20 | Fix YELLOW→GREEN | Manual: sort contacts |
| AR-127c | Fix ECM socket (ops:setEW) | 20min | +15 | Fix YELLOW→GREEN | Manual: toggle ECM |
| AR-127d | Fix ECCM socket (ops:setEW) | 15min | +10 | Fix YELLOW→GREEN | Manual: toggle ECCM |
| AR-127e | Fix Break Lock handler | 20min | +15 | Fix YELLOW→GREEN | Manual: break lock |

**Subtotal:** ~1.5h | **LOC Delta:** +80

---

### CLEAN-1/2: Duplicate Handler Investigation (~30min)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| CLEAN-1a | Investigate ops:scanResult dups | 10min | 0 | Analysis | Read-only |
| CLEAN-1b | Remove duplicate handler | 10min | -20 | Bug fix | `npm test` + manual scan |
| CLEAN-2a | Investigate ops:timeAdvanced dups | 5min | 0 | Analysis | Read-only |
| CLEAN-2b | Remove duplicate handler | 5min | -15 | Bug fix | `npm test` + manual time |

**Subtotal:** ~30min | **LOC Delta:** -35

---

### AR-128: Observer Enhancement (~30min)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| AR-128a | Add role selector dropdown UI | 15min | +25 | New feature | Visual |
| AR-128b | Store selection in state | 15min | +15 | State mgmt | Manual: switch roles |

**Subtotal:** ~30min | **LOC Delta:** +40

---

### AR-130L: NPC Personae Schema (~45min)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| AR-130a | Create npc_personae table | 20min | +30 | Schema | `npm test` (db init) |
| AR-130b | Create npc_pc_connections table | 15min | +20 | Schema | `npm test` |
| AR-130c | Add empty CRUD handlers | 10min | +40 | API stubs | `npm test` |

**Subtotal:** ~45min | **LOC Delta:** +90

---

### EMAIL: AI Email System - LOW Risk Parts (~1h)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| EMAIL-1 | Email inbox UI (mock data) | 30min | +100 | New feature | Visual |
| EMAIL-2 | Email compose modal | 30min | +80 | New feature | Manual: compose |

**Subtotal:** ~1h | **LOC Delta:** +180

---

### AR-151: app.js Refactor Phase 1 - Zero-Dependency Extractions (~2h)

| AR | Title | Time | LOC | Value | Test |
|----|-------|------|-----|-------|------|
| AR-151a | Extract debug-config.js | 10min | 0 (move) | Modular | `npm test` |
| AR-151b | Extract constants.js | 10min | 0 (move) | Modular | `npm test` |
| AR-151c | Extract bridge-clock.js | 15min | 0 (move) | Modular | `npm test` |
| AR-151d | Extract ai-queue.js | 15min | 0 (move) | Modular | `npm test` |
| AR-151e | Extract transit-calc.js | 15min | 0 (move) | Modular | `npm test` |
| AR-151f | Extract news-mail.js | 15min | 0 (move) | Modular | `npm test` |
| AR-151g | Extract weapons.js | 15min | 0 (move) | Modular | `npm test` |
| AR-151h | Extract chat.js | 10min | 0 (move) | Modular | `npm test` |
| AR-151i | Extract library-computer.js | 15min | 0 (move) | Modular | `npm test` |

**Subtotal:** ~2h | **LOC Delta:** 0 (reorganization) | **app.js reduction:** -800 lines

---

## Summary: All LOW Risk ARs

| Category | AR Count | Time | LOC Change | Value |
|----------|----------|------|------------|-------|
| Quick Wins | 8 | 1h | -923 | Cleanup |
| AR-150 UI Status | 8 stages | 2h | +390 | Feature + Fixes |
| AR-127 Sensors | 5 micro | 1.5h | +80 | Fix broken UI |
| CLEAN-1/2 Dups | 4 micro | 30min | -35 | Bug fixes |
| AR-128 Observer | 2 micro | 30min | +40 | Feature |
| AR-130L NPC Schema | 3 micro | 45min | +90 | Infrastructure |
| EMAIL-1/2 | 2 | 1h | +180 | Feature |
| AR-151 Phase 1 | 9 micro | 2h | 0 (reorg) | Maintainability |

---

## Totals

| Metric | Value |
|--------|-------|
| **Total ARs** | 41 micro-ARs |
| **Total Time** | ~9.25 hours |
| **Net LOC Change** | -178 (cleanup wins!) |
| **app.js Reduction** | -800 lines (from 11,552 to ~10,750) |
| **Features Added** | 4 (UI Status, Observer, Email UI, NPC Schema) |
| **Bugs Fixed** | 9 (sensors, duplicates, CSS vars) |
| **Dead Code Removed** | ~930 lines |

---

## Recommended Execution Order

```
Batch 1: Quick Wins (1h)
  AR-142 → CLEAN-3 → CLEAN-4 → CLEAN-5 → CLEAN-6 → CLEAN-7 → CLEAN-8 → AR-146

Batch 2: AR-150 UI Status (2h)
  150.1 → 150.2 → 150.3 → 150.4 → 150.5 → 150.6 → 150.7 → 150.8

Batch 3: Sensor Fixes (1.5h)
  AR-127a → AR-127b → AR-127c → AR-127d → AR-127e

Batch 4: Duplicate Handlers (30min)
  CLEAN-1a → CLEAN-1b → CLEAN-2a → CLEAN-2b

Batch 5: Enhancements (2.25h)
  AR-128a → AR-128b → AR-130a → AR-130b → AR-130c → EMAIL-1 → EMAIL-2

Batch 6: Refactor Phase 1 (2h)
  AR-151a → AR-151b → AR-151c → AR-151d → AR-151e → AR-151f → AR-151g → AR-151h → AR-151i
```

---

## Risk Mitigation Applied

| Original | Mitigation | New Risk |
|----------|-----------|----------|
| AR-127 (MEDIUM) | Split into 5 micro-ARs | LOW |
| AR-128 (MEDIUM) | UI only, no rendering | LOW |
| AR-130 (MEDIUM) | Schema only, no API | LOW |
| AR-131 (MEDIUM) | UI wireframe only | LOW (in AR-150.8) |
| CLEAN-1/2 (MEDIUM) | Investigate before fix | LOW |
| AR-151 (HIGH) | Phase 1 only, zero-deps | LOW |
| AI-EMAIL (HIGH) | Frontend only (1-2) | LOW |

**All 41 ARs now LOW risk.**
