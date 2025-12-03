# AR-16: Security Hardening (Remaining)

**Created:** 2025-12-03
**Status:** COMPLETE (10/10 stages done)
**Est:** 3.5h | **Risk:** LOW | **Value:** HIGH | **Priority:** P1

## Overview
Complete remaining security hardening for production deployment.

---

## Stage 16.1: Gate Eval on NODE_ENV ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Gate puppetry:eval behind NODE_ENV | ✅ | Production safe |
| Keep functionality for test/dev | ✅ | Automation preserved |

---

## Stage 16.2: Error Sanitization ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Category hints in prod | ✅ | 'Campaign error', etc. |
| Full error.message in dev/test | ✅ | NODE_ENV gating |
| Audit ~60 locations | ✅ | operations.handlers.js |

---

## Stage 16.3: Console.log Cleanup ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Remove/gate debug logs in app.js | ✅ | ~15 locations |
| Gate server-side debug logs | ✅ | Production quiet |

---

## Stage 16.4: XSS onclick→data-attr ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Replace inline onclick | ✅ | Event delegation |
| ~20 locations converted | ✅ | UI tested |

---

## Stage 16.5: Input Validation Schema (1h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Create lib/operations/validators.js | 30m | Validation functions |
| UUID v4 strict validation | 15m | For all IDs |
| String sanitization | 15m | Remove dangerous chars |

---

## Stage 16.6: Apply Validators to Handlers (30m)

| Task | Est | Deliverable |
|------|-----|-------------|
| Import validators in operations.handlers.js | 10m | Module import |
| Validate campaignId, accountId, shipId | 10m | UUID checks |
| Validate string inputs | 10m | Name, description |

---

## Stage 16.7: SQL Template Hardening ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Replace dynamic field building | ✅ | Explicit field maps |
| accounts.js:97-102 fixed | ✅ | Parameterized |
| combat.js fixed | ✅ | Parameterized |

---

## Stage 16.8: Rate Limiting (30m)

| Task | Est | Deliverable |
|------|-----|-------------|
| Port from space.handlers.js | 15m | Reuse existing pattern |
| Apply to campaign create | 5m | 30/min limit |
| Apply to role assign/delete | 10m | 30/min limit |

---

## Stage 16.9: Escape IDs in Templates ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Ensure accountId escaped | ✅ | onclick handlers |
| Ensure contactId escaped | ✅ | onclick handlers |
| Complement to 16.4 | ✅ | All remaining handlers |

---

## Stage 16.10: Security Test Suite (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| XSS injection tests | 45m | Puppeteer attempts |
| SQL injection tests | 45m | Malformed inputs |
| Rate limit tests | 30m | Verify throttling |

---

## Dependencies
- None (security work is standalone)

## Acceptance Criteria
- [ ] All IDs validated as UUID v4
- [ ] Rate limiting active on destructive operations
- [ ] Puppeteer security tests passing
- [ ] No regressions in existing tests
