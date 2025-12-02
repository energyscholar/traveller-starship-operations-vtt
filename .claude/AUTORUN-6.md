# AUTORUN 6: Crew, Email, Popups & Menu Scaffold

**Created:** 2025-12-01
**Status:** IN PROGRESS
**Risk Level:** MEDIUM

## Summary
Enhance bridge interactivity with crew management, email system, sensor popups, and menu structure.

## Tasks

| # | Task | Est. LOC | Status |
|---|------|----------|--------|
| 1 | Configure Kimbly weapons (triple turret) | ~20 | Pending |
| 2 | Captain relieves crew → Role Selection | ~100 | Pending |
| 3 | Authorized target indicator (🎯) | ~30 | Pending |
| 4 | Mouseover popup system | ~150 | Pending |
| 5 | Star data from Traveller Wiki | ~120 | Pending |
| 6 | Scan log by level (passive/active/deep) | ~120 | Pending |
| 7 | Hamburger menu with stubs | ~60 | Pending |
| 8 | Mail backend (basic, no timing) | ~150 | Pending |
| 9 | Mail UI + NPC contacts | ~180 | Pending |
| 10 | Feedback DB + Ops UI | ~120 | Pending |

**Total: ~1050 LOC**

## Design Decisions

### Relieve Crew
- Relieved player returns to Role Selection screen
- Can pick new role immediately
- Log entry: "Captain has relieved [PC] from [role] duty"

### Star Data
- Source: Traveller Wiki (manual copy)
- Systems: Dorannia, Ator, Flammarion
- Fields: spectral class, temperature, luminosity, mass, description

### Scan Logging
- Track scan level per contact: UNKNOWN → PASSIVE → ACTIVE → DEEP
- Each level reveals more info and creates log entry
- State pattern (simple object, not over-engineered)

### Mail System
- Basic send/receive, NO delivery timing (deferred to Autorun 7)
- NPC contacts with visibility: `["*"]` = all, `["marina"]` = private
- Players can compose and send to known contacts
- GM sees all mail

### Patterns Used (lean)
- Factory function for popup content (switch statement, not class hierarchy)
- Simple state object for scan levels
- Visibility filter function for contacts

## Database Changes

```sql
-- Player feedback
CREATE TABLE IF NOT EXISTS player_feedback (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  pc_name TEXT NOT NULL,
  account_id TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'feedback',
  status TEXT DEFAULT 'submitted',
  gm_notes TEXT,
  seen_at TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- NPC Contacts (address book)
CREATE TABLE IF NOT EXISTS npc_contacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  relationship TEXT,
  starsystem TEXT,
  visible_to TEXT DEFAULT '["*"]',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Mail messages
CREATE TABLE IF NOT EXISTS mail (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  source_system TEXT,
  dest_system TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  is_from_pc INTEGER DEFAULT 0
);
```

## Deferred to Autorun 7
- Mail delivery timing (Traveller Map API)
- Mail route calculation (1 vs 4 parsec/week)
- AI compose for GM
- GM prep system for staged reveals
