# AUTORUN 9: Character Import & Player Features

**Created:** 2025-12-01
**Status:** READY
**Risk Level:** LOW
**Prerequisite:** AUTORUN-8 completed

## Execution Protocol
**Token Efficiency Mode:** Auto-adjust effort to minimize token use.
- `[65%]` BURST: Exploration, planning, debugging
- `[40%]` CRUISE: Sequential implementation, clear path
- Signal mode changes inline. Override with user instruction.

## Summary
Character import system (reduces new player friction) plus player-facing features. Organized into 5 stages with git commits between each.

---

## Stage 9.1: Character Data Layer
**Risk:** LOW | **LOC:** ~200 | **Commit after**

Database schema and parsing utilities.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 9.1.1 | Characters table in database.js | ~40 |
| 9.1.2 | Character CRUD module (lib/operations/characters.js) | ~80 |
| 9.1.3 | UPP parser function ("789A87" → stats object) | ~30 |
| 9.1.4 | Skills parser (freeform text → skill:level map) | ~50 |

**Deliverable:** Backend can store and parse characters.

---

## Stage 9.2: Character Import/Export UI
**Risk:** MEDIUM | **LOC:** ~250 | **Commit after**

User-facing character workflow.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 9.2.1 | Character import modal (paste JSON/text) | ~100 |
| 9.2.2 | Parse preview with field validation | ~80 |
| 9.2.3 | Manual override for uncertain fields | ~40 |
| 9.2.4 | Character export to JSON button | ~30 |

**Deliverable:** Players can import characters from various formats.

---

## Stage 9.3: Player Communication
**Risk:** LOW | **LOC:** ~260 | **Commit after**

Player-facing mail and content viewing.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 9.3.1 | Player mail inbox UI | ~120 |
| 9.3.2 | Read/archive mail actions | ~30 |
| 9.3.3 | Reply-to-sender compose | ~60 |
| 9.3.4 | Handout viewer modal (when GM shares) | ~50 |

**Deliverable:** Players can read mail, reply to senders, and view shared handouts.

---

## Stage 9.4: Role Enhancement
**Risk:** LOW | **LOC:** ~280 | **Commit after**

Enhanced role-specific panels.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 9.4.1 | Pilot detail panel (speed, course, ETA) | ~70 |
| 9.4.2 | Engineer detail panel (power, fuel, drives) | ~70 |
| 9.4.3 | Gunner detail panel (turrets, ammo, targets) | ~70 |
| 9.4.4 | Multiple identical roles (2+ gunners on stations) | ~70 |

**Deliverable:** Role panels show useful role-specific information.

---

## Stage 9.5: Data Integrity (JSON Schema)
**Risk:** LOW | **LOC:** ~180 | **Commit after**

Public validation schemas for adventure packages and characters.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 9.5.1 | Adventure JSON Schema (`schemas/adventure.schema.json`) | ~80 |
| 9.5.2 | Character JSON Schema (`schemas/character.schema.json`) | ~40 |
| 9.5.3 | Validation module using Ajv | ~40 |
| 9.5.4 | Validate on BOTH import AND export | ~20 |

**Deliverable:** Public schemas + bidirectional validation. Any tool can validate `.tvadv` files.

---

## Total: ~1170 LOC across 5 stages

---

## Risk Mitigations

| Stage | Original | Mitigation | Final |
|-------|----------|------------|-------|
| 9.1 | LOW | Store raw import text only if confidence < 80% | LOW |
| 9.2 | MEDIUM | Fail gracefully - parse what we can, user fills gaps, no blocked imports | LOW |
| 9.3 | LOW | Receive + reply-to-sender. Full compose as TODO. | LOW |
| 9.4 | LOW | Lazy calc with dirty flag + DB triggers. Combat hooks ready. | LOW |
| 9.5 | LOW | Block on errors - reject broken references | LOW |

## Design Decisions

### 9.1: Import Audit Trail
- Store `import_raw_text` column only when `import_confidence < 80`
- Allows debugging parser issues without bloating DB

### 9.3: Mail Scope
- **Now:** Receive mail + reply to sender
- **TODO (moderate priority):** Full compose to any known contact

### 9.4: Lazy Calculated Fields
```sql
-- Add dirty flag to ships table
ALTER TABLE ships ADD COLUMN calc_dirty INTEGER DEFAULT 1;

-- Trigger on relevant changes
CREATE TRIGGER ship_calc_dirty AFTER UPDATE OF fuel, position, destination ON ships
BEGIN
  UPDATE ships SET calc_dirty = 1 WHERE id = NEW.id;
END;
```

```javascript
// Lazy calculation pattern
function getShipWithCalcs(shipId) {
  const ship = getShip(shipId);
  if (ship.calc_dirty) {
    ship.eta = calculateETA(ship);
    ship.fuel_percent = (ship.fuel / ship.fuel_capacity) * 100;
    // ... other calcs
    updateShipCalcs(shipId, ship);
    clearDirtyFlag(shipId);
  }
  return ship;
}
```

### 9.5: JSON Schema Validation

**Why JSON Schema:**
- Industry standard (draft-07)
- Language-agnostic - anyone can validate
- Self-documenting for adventure authors
- Tooling exists everywhere (Ajv for Node.js)

**Schema Files (public):**
```
schemas/
├── adventure.schema.json    # Full .tvadv validation
├── character.schema.json    # Character import validation
└── README.md                # Schema documentation
```

**Bidirectional Validation:**
```javascript
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

// Load schemas
const adventureSchema = require('./schemas/adventure.schema.json');
const validateAdventure = ajv.compile(adventureSchema);

// Validate on IMPORT
function importAdventure(data) {
  if (!validateAdventure(data)) {
    throw new ValidationError(validateAdventure.errors);
  }
  // ... proceed with import
}

// Validate on EXPORT (catches bugs in our code)
function exportAdventure(campaignId) {
  const data = buildExportData(campaignId);
  if (!validateAdventure(data)) {
    console.error('Export validation failed:', validateAdventure.errors);
    throw new Error('Internal export error - please report');
  }
  return data;
}
```

**Validation Strictness:**
- **Block on:** Schema violations, missing required fields, broken refs
- **Warn on:** Empty optional fields, unusual values
- Clear error messages with JSON path + expected type

## Testing Strategy
- Unit tests for parsers (UPP, skills) in Stage 9.1
- Socket handler tests for character events
- Manual UI testing for import flow
- **TODO:** E2E tests (Playwright) for character import in future autorun

## Stage Dependencies
```
9.1 (Data Layer)
  ↓
9.2 (Import UI) ← uses parsers from 9.1
  ↓
9.3 (Player Comms) ← independent, can parallel with 9.2
  ↓
9.4 (Role Enhancement) ← independent
  ↓
9.5 (Validation) ← validates all prior work
```

---

## Success Criteria

Per stage:
- **9.1:** Parse UPP "789A87" → correct stats, skills extracted
- **9.2:** Paste character text, see preview, import successfully
- **9.3:** Player receives mail notification, can read messages
- **9.4:** Each role sees relevant ship data in their panel
- **9.5:** Invalid adventure JSON rejected with clear errors

---

## Character Schema

```javascript
const CHARACTER_SCHEMA = {
  // Identity
  name: String,           // Required
  species: String,        // "Human", "Vargr", etc.
  homeworld: String,
  age: Number,

  // UPP Stats (hex display: 789A87)
  stats: {
    str: Number,  // 2-15
    dex: Number,
    end: Number,
    int: Number,
    edu: Number,
    soc: Number,
    psi: Number   // Optional
  },

  // Career history
  careers: [{
    name: String,
    specialty: String,
    terms: Number,
    rank: Number,
    rankTitle: String
  }],

  // Skills
  skills: Object,  // {Pilot: 2, Gunnery: 1}

  // Equipment & Finances
  equipment: [String],
  weapons: [String],
  armor: String,
  credits: Number,
  shipShares: Number
};
```

---

## UI Wireframes

### Character Import (9.2.1)
```
+----------------------------------+
| Import Character                  |
+----------------------------------+
| Paste JSON or text:              |
| +------------------------------+ |
| | Marcus Cole                  | |
| | UPP: 789A87                  | |
| | Skills: Pilot-2, Gunnery-1,  | |
| | Vacc Suit-1                  | |
| +------------------------------+ |
|                                  |
| [Parse]                          |
+----------------------------------+
| Preview:                         |
| Name: Marcus Cole         [OK]   |
| UPP: 789A87               [OK]   |
|   STR:7 DEX:8 END:9              |
|   INT:10 EDU:8 SOC:7             |
| Skills:                   [OK]   |
|   Pilot: 2                       |
|   Gunnery: 1                     |
|   Vacc Suit: 1                   |
| Age: [Not found]          [!]    |
|      [___] ← manual entry        |
|                                  |
| [Cancel]              [Import]   |
+----------------------------------+
```

### Player Mail Inbox (9.3.1)
```
+----------------------------------+
| MAIL                        [3]  |
+----------------------------------+
| * Marcus Webb   Job Offer   045  |
|   Starport      Clearance   044  |
|   Dr. Kerensky  Results     042  |
+----------------------------------+
| [Compose]           [Archive]    |
+----------------------------------+
```

### Role Panel - Pilot (9.4.1)
```
+------------------+
| HELM CONTROL     |
+------------------+
| Speed: 4G        |
| Course: 045°     |
| Dest: Ator       |
| ETA: 3d 14h      |
+------------------+
| [Set Course]     |
| [Evasive]        |
+------------------+
```
