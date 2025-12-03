# AR-19: Character Import System

**Created:** 2025-12-03
**Status:** PLANNED
**Est:** 3-4h | **Risk:** MEDIUM | **Value:** HIGH | **Priority:** P1

## Overview
AI-assisted character import from various formats.
Quick win for player onboarding experience.

## Stages

### 19.1 Canonical Schema (1h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Define JSON schema | 30m | Stats, skills, equipment |
| Validation function | 30m | Verify imported data |

```javascript
// Character schema
{
  name: string,
  upp: { STR, DEX, END, INT, EDU, SOC },
  skills: { [skill]: level },
  equipment: [{ name, quantity }],
  credits: number,
  notes: string
}
```

### 19.2 Precise JSON Import (30m) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| File upload UI | 15m | Drag/drop or button |
| JSON parse + validate | 15m | Direct mapping |

### 19.3 Fuzzy AI Import (1.5h) - MEDIUM risk
| Task | Est | Notes |
|------|-----|-------|
| Text parser | 30m | Extract from paste |
| UPP notation parser | 30m | "777777" format |
| Skill extractor | 30m | Various formats |
| Preview + corrections | - | Show before save |

**Supported formats:**
- Traveller Character Generator outputs
- PDF copy-paste text
- UPP + skills plain text
- Roll20/Foundry exports (best effort)

### 19.4 Import UI (1h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Import modal | 30m | Paste or upload |
| Preview panel | 30m | Show parsed data |
| Field correction | - | Edit before save |

## Dependencies
- None (can run parallel)

## Acceptance Criteria
- [ ] JSON import works for canonical format
- [ ] Fuzzy import handles common text formats
- [ ] User can preview and correct before save
- [ ] Imported characters appear in player slot
