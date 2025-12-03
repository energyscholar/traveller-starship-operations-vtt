# AR-16: Security Hardening (Remaining)

**Created:** 2025-12-03
**Status:** 70% COMPLETE (7/10 stages done)
**Est:** 3.5h | **Risk:** LOW | **Value:** HIGH | **Priority:** P1

## Overview
Complete remaining security hardening for production deployment.

## Completed Stages ✅
- 16.1 Gate eval on NODE_ENV ✅
- 16.2 Error sanitization ✅
- 16.3 Console.log cleanup ✅
- 16.4 XSS onclick→data-attr ✅
- 16.7 SQL template hardening ✅
- 16.8 Seed script safety ✅
- 16.9 Escape IDs in templates ✅

## Remaining Stages

### 16.5 Input Validation Schema (1h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Create lib/operations/validators.js | 30m | Validation functions |
| UUID v4 strict validation | 15m | For all IDs |
| String sanitization | 15m | Remove dangerous chars |
| Apply to socket handlers | - | Use in operations.handlers.js |

**Decision:** UUID strict format (security best practice)

### 16.6 Rate Limiting (30m) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Port from space.handlers.js | 15m | Reuse existing pattern |
| Apply to ops handlers | 15m | Campaign create, role assign, delete |

**Decision:** 30/min moderate throttle per-socket

### 16.10 Security Test Suite (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| XSS injection tests | 45m | Puppeteer attempts |
| SQL injection tests | 45m | Malformed inputs |
| Rate limit tests | 30m | Verify throttling |

**Decision:** Full pen-test style with Puppeteer

## Acceptance Criteria
- [ ] All IDs validated as UUID v4
- [ ] Rate limiting active on destructive operations
- [ ] Puppeteer security tests passing
- [ ] No regressions in existing tests
