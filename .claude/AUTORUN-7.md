# AUTORUN 7: Adventure Prep Data Foundation

**Created:** 2025-12-01
**Status:** READY FOR APPROVAL
**Risk Level:** LOW-MEDIUM
**Prerequisite:** AUTORUN-6 completed (or parallel)

## Summary
Build the **data foundation** for the future GM Prep App and Adventure Publishing Platform. This includes database schema, CRUD operations, and core reveal/deployment mechanics. NO new UI in this autorun - just the backend infrastructure.

## Vision Context
This is **Phase 0** of the Adventure Publishing Platform:
- Future: Separate GM Prep App for authoring adventures
- Future: Adventure packages as distributable archive files
- Future: Mongoose partnership, $5-10 prepared adventures
- **Now:** Build the data layer that supports all of this

## Architecture Notes

### Adventure Package File Format (Future)
```
adventure-name.tvadv (zip archive)
├── manifest.json         # Metadata, version, campaign settings
├── npcs.json             # All NPC dossiers
├── reveals.json          # Staged plot reveals
├── emails.json           # Prepped email queue
├── locations.json        # Scene/location definitions
├── events.json           # Triggers and events
├── handouts/             # Images, maps, documents
│   ├── temple-map.png
│   └── intelligence-briefing.pdf
└── timeline.json         # Event schedule
```

### What AUTORUN-7 Builds
The database tables and CRUD that will:
1. Store adventure prep content
2. Support import/export to .tvadv format (future)
3. Enable reveal mechanics during play
4. Queue emails for deployment

---

## Tasks

| # | Task | Est. LOC | Status |
|---|------|----------|--------|
| 1 | Staged Reveals table + module | ~120 | Pending |
| 2 | NPC Dossiers table + module | ~150 | Pending |
| 3 | Prepped Locations table + module | ~100 | Pending |
| 4 | Events/Triggers table + module | ~120 | Pending |
| 5 | Handouts table + module | ~80 | Pending |
| 6 | Email queue status (draft/queued/sent) | ~60 | Pending |
| 7 | Reveal mechanics (visibility, deployment) | ~100 | Pending |
| 8 | Socket handlers for prep operations | ~150 | Pending |
| 9 | Adventure export function (to JSON) | ~100 | Pending |
| 10 | Adventure import function (from JSON) | ~120 | Pending |

**Total: ~1100 LOC**

---

## Detailed Design

### Task 1: Staged Reveals Table + Module

**lib/operations/reveals.js**

```sql
CREATE TABLE staged_reveals (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'plot',      -- plot, lore, secret, discovery, item
  summary TEXT,                       -- Short teaser (players see this first)
  full_text TEXT,                     -- Full description (on reveal)
  handout_id TEXT,                    -- FK to handouts table
  visibility TEXT DEFAULT 'hidden',   -- hidden, partial, revealed
  visible_to TEXT DEFAULT '[]',       -- JSON array of player account IDs
  trigger_type TEXT,                  -- manual, time, event, condition
  trigger_value TEXT,                 -- Game date, event name, or condition text
  order_index INTEGER DEFAULT 0,      -- For sorting in lists
  tags TEXT DEFAULT '[]',             -- JSON array for categorization
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  revealed_at TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (handout_id) REFERENCES handouts(id)
);
```

**Module exports:**
```javascript
module.exports = {
  createReveal,
  getReveal,
  getRevealsByCampaign,
  getHiddenReveals,          // For GM prep view
  getRevealedForPlayer,      // What a specific player can see
  updateReveal,
  deleteReveal,
  revealToAll,               // Set visibility = 'revealed', broadcast
  revealToPlayer,            // Add to visible_to array
  hideReveal,                // Undo reveal (GM mistake correction)
  checkTriggers              // Called on time advance, checks conditions
};
```

### Task 2: NPC Dossiers Table + Module

**lib/operations/npc-dossiers.js**

```sql
CREATE TABLE npc_dossiers (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,                         -- "Anthropologist", "Baron", etc.
  role TEXT DEFAULT 'neutral',        -- patron, ally, contact, neutral, enemy
  portrait_url TEXT,                  -- URL or path to image

  -- Stats (optional, for when rolls matter)
  stats TEXT,                         -- JSON: {str:7, dex:8, end:6, int:10, edu:9, soc:8}
  skills TEXT,                        -- JSON: {pilot:2, gunnery:1, ...}

  -- Personality & Motivation
  personality TEXT,                   -- 1-2 sentence summary
  motivation_public TEXT,             -- What they tell the players
  motivation_hidden TEXT,             -- What they really want (GM only)
  background TEXT,                    -- Longer background (GM only)

  -- Location & Status
  location_id TEXT,                   -- FK to locations table
  location_text TEXT,                 -- Freeform location if no FK
  current_status TEXT,                -- alive, dead, missing, unknown

  -- Visibility
  visibility TEXT DEFAULT 'hidden',   -- hidden, known, revealed
  visible_to TEXT DEFAULT '[]',       -- JSON array of player account IDs
  known_as TEXT DEFAULT '[]',         -- JSON: alternate names/aliases known

  -- Metadata
  tags TEXT DEFAULT '[]',
  notes TEXT,                         -- GM notes
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

**Module exports:**
```javascript
module.exports = {
  createNPCDossier,
  getNPCDossier,
  getNPCDossiersByCampaign,
  getHiddenNPCs,              // For GM prep
  getVisibleNPCsForPlayer,    // What player sees in contacts
  updateNPCDossier,
  deleteNPCDossier,
  revealNPC,                  // Make visible to all
  revealNPCToPlayer,          // Add to visible_to
  hideNPC,                    // Undo reveal
  setNPCLocation,
  setNPCStatus
};
```

### Task 3: Prepped Locations Table + Module

**lib/operations/locations.js**

```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT DEFAULT 'scene', -- world, system, station, ship, scene, room
  parent_id TEXT,                      -- FK to parent location (for hierarchy)

  -- Description
  description_gm TEXT,                 -- Full GM description
  description_players TEXT,            -- What players see
  atmosphere TEXT,                     -- Environmental notes

  -- Connections
  connected_to TEXT DEFAULT '[]',      -- JSON array of location IDs

  -- Associated content
  map_url TEXT,                        -- Map image
  hazards TEXT,                        -- JSON array of hazard descriptions
  npcs_present TEXT DEFAULT '[]',      -- JSON array of NPC IDs

  -- Visibility
  visibility TEXT DEFAULT 'hidden',
  discovered_by TEXT DEFAULT '[]',     -- JSON array of player IDs

  -- Traveller-specific
  uwp TEXT,                            -- Universal World Profile if applicable
  trade_codes TEXT,                    -- Trade classification codes

  tags TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (parent_id) REFERENCES locations(id)
);
```

### Task 4: Events/Triggers Table + Module

**lib/operations/events.js**

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  event_type TEXT DEFAULT 'manual',   -- manual, timed, triggered

  -- Trigger conditions
  trigger_date TEXT,                  -- Game date for timed events
  trigger_condition TEXT,             -- Condition description
  trigger_event_id TEXT,              -- FK to another event (cascade)

  -- What happens
  description TEXT,                   -- What the GM reads/deploys
  player_text TEXT,                   -- What players see

  -- Cascading effects
  reveals_to_trigger TEXT DEFAULT '[]',  -- JSON array of reveal IDs
  emails_to_send TEXT DEFAULT '[]',      -- JSON array of email IDs
  npcs_to_reveal TEXT DEFAULT '[]',      -- JSON array of NPC IDs

  -- Status
  status TEXT DEFAULT 'pending',      -- pending, triggered, resolved, cancelled
  triggered_at TEXT,

  tags TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
```

### Task 5: Handouts Table + Module

**lib/operations/handouts.js**

```sql
CREATE TABLE handouts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handout_type TEXT DEFAULT 'document', -- document, image, map, statblock

  -- Content
  content_text TEXT,                  -- Markdown content for documents
  file_url TEXT,                      -- URL/path for images/PDFs

  -- Visibility
  visibility TEXT DEFAULT 'hidden',
  visible_to TEXT DEFAULT '[]',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
```

### Task 6: Email Queue Status Enhancement

**Modify existing mail table:**

```sql
ALTER TABLE mail ADD COLUMN status TEXT DEFAULT 'sent';
-- Values: draft, queued, sent, failed

ALTER TABLE mail ADD COLUMN queued_for_date TEXT;
-- Game date when email should be delivered

ALTER TABLE mail ADD COLUMN trigger_event_id TEXT;
-- FK to events table for triggered sending

ALTER TABLE mail ADD COLUMN template_vars TEXT;
-- JSON for placeholder substitution {{player_name}}, etc.
```

**Extend mail.js:**
```javascript
// New exports
module.exports = {
  ...existingExports,
  saveDraft,
  getDrafts,
  queueEmail,
  getQueuedEmails,
  sendQueuedEmail,
  checkEmailQueue,          // Called on time advance
  sendTriggeredEmails       // Called when event triggers
};
```

### Task 7: Reveal Mechanics

**Core visibility logic:**
```javascript
// Visibility states
const VISIBILITY = {
  HIDDEN: 'hidden',        // Only GM sees
  PARTIAL: 'partial',      // Some players see (check visible_to)
  REVEALED: 'revealed'     // All players see
};

// Check if player can see content
function canPlayerSee(content, playerId) {
  if (content.visibility === 'revealed') return true;
  if (content.visibility === 'partial') {
    const visibleTo = JSON.parse(content.visible_to || '[]');
    return visibleTo.includes(playerId) || visibleTo.includes('all');
  }
  return false;
}

// Reveal content
function revealContent(table, id, toPlayerId = null) {
  if (toPlayerId) {
    // Add to visible_to, set visibility to partial
    const current = getVisibleTo(table, id);
    if (!current.includes(toPlayerId)) {
      current.push(toPlayerId);
      updateVisibleTo(table, id, current);
      setVisibility(table, id, 'partial');
    }
  } else {
    // Reveal to all
    setVisibility(table, id, 'revealed');
    setRevealedAt(table, id, getCurrentGameDate());
  }
  // Broadcast to affected players
  broadcastReveal(table, id, toPlayerId);
}
```

### Task 8: Socket Handlers for Prep Operations

**lib/socket-handlers/prep.handlers.js**

```javascript
// Reveals
socket.on('prep:createReveal', (data, callback) => {...});
socket.on('prep:updateReveal', (data, callback) => {...});
socket.on('prep:deleteReveal', (id, callback) => {...});
socket.on('prep:revealToAll', (id, callback) => {...});
socket.on('prep:revealToPlayer', ({id, playerId}, callback) => {...});

// NPCs
socket.on('prep:createNPC', (data, callback) => {...});
socket.on('prep:updateNPC', (data, callback) => {...});
socket.on('prep:deleteNPC', (id, callback) => {...});
socket.on('prep:revealNPC', (id, callback) => {...});

// Locations
socket.on('prep:createLocation', (data, callback) => {...});
socket.on('prep:updateLocation', (data, callback) => {...});
socket.on('prep:deleteLocation', (id, callback) => {...});

// Events
socket.on('prep:createEvent', (data, callback) => {...});
socket.on('prep:triggerEvent', (id, callback) => {...});

// Handouts
socket.on('prep:createHandout', (data, callback) => {...});
socket.on('prep:shareHandout', ({id, playerId}, callback) => {...});

// Email queue
socket.on('prep:saveDraft', (data, callback) => {...});
socket.on('prep:queueEmail', (data, callback) => {...});
socket.on('prep:sendNow', (id, callback) => {...});

// Bulk operations (for import)
socket.on('prep:importAdventure', (adventureData, callback) => {...});
socket.on('prep:exportAdventure', (campaignId, callback) => {...});
```

### Task 9: Adventure Export Function

**lib/operations/adventure-io.js**

```javascript
/**
 * Export all prep content for a campaign to JSON
 * This is the precursor to .tvadv file format
 */
function exportAdventure(campaignId) {
  return {
    manifest: {
      version: '1.0',
      format: 'tvadv-json',
      campaignName: getCampaign(campaignId).name,
      exportedAt: new Date().toISOString(),
      contentCounts: {
        npcs: getNPCDossiersByCampaign(campaignId).length,
        reveals: getRevealsByCampaign(campaignId).length,
        locations: getLocationsByCampaign(campaignId).length,
        events: getEventsByCampaign(campaignId).length,
        emails: getDraftsByCampaign(campaignId).length,
        handouts: getHandoutsByCampaign(campaignId).length
      }
    },
    npcs: getNPCDossiersByCampaign(campaignId),
    reveals: getRevealsByCampaign(campaignId),
    locations: getLocationsByCampaign(campaignId),
    events: getEventsByCampaign(campaignId),
    emails: getDraftsByCampaign(campaignId),
    handouts: getHandoutsByCampaign(campaignId).map(h => ({
      ...h,
      // Note: actual files not included in JSON export
      // Full .tvadv format will include file references
    }))
  };
}
```

### Task 10: Adventure Import Function

```javascript
/**
 * Import adventure content from JSON into a campaign
 * Handles ID remapping for references between entities
 */
function importAdventure(campaignId, adventureData) {
  const idMap = new Map();  // Old ID -> New ID

  // Import in dependency order

  // 1. Locations first (NPCs reference them)
  for (const loc of adventureData.locations) {
    const newId = createLocation(campaignId, {...loc, id: undefined});
    idMap.set(loc.id, newId);
  }

  // 2. Handouts (reveals reference them)
  for (const handout of adventureData.handouts) {
    const newId = createHandout(campaignId, {...handout, id: undefined});
    idMap.set(handout.id, newId);
  }

  // 3. NPCs (with location remapping)
  for (const npc of adventureData.npcs) {
    const newId = createNPCDossier(campaignId, {
      ...npc,
      id: undefined,
      location_id: idMap.get(npc.location_id) || null
    });
    idMap.set(npc.id, newId);
  }

  // 4. Reveals (with handout remapping)
  for (const reveal of adventureData.reveals) {
    const newId = createReveal(campaignId, {
      ...reveal,
      id: undefined,
      handout_id: idMap.get(reveal.handout_id) || null
    });
    idMap.set(reveal.id, newId);
  }

  // 5. Events (with cascade remapping)
  for (const event of adventureData.events) {
    const newId = createEvent(campaignId, {
      ...event,
      id: undefined,
      reveals_to_trigger: remapIdArray(event.reveals_to_trigger, idMap),
      emails_to_send: remapIdArray(event.emails_to_send, idMap),
      npcs_to_reveal: remapIdArray(event.npcs_to_reveal, idMap)
    });
    idMap.set(event.id, newId);
  }

  // 6. Emails
  for (const email of adventureData.emails) {
    const newId = saveDraft(campaignId, {
      ...email,
      id: undefined,
      trigger_event_id: idMap.get(email.trigger_event_id) || null
    });
    idMap.set(email.id, newId);
  }

  return {
    success: true,
    imported: {
      locations: adventureData.locations.length,
      handouts: adventureData.handouts.length,
      npcs: adventureData.npcs.length,
      reveals: adventureData.reveals.length,
      events: adventureData.events.length,
      emails: adventureData.emails.length
    },
    idMap: Object.fromEntries(idMap)
  };
}
```

---

## File Structure

```
lib/operations/
├── database.js           # Add new tables in initDatabase()
├── reveals.js            # NEW
├── npc-dossiers.js       # NEW (rename from npc-contacts.js?)
├── locations.js          # NEW
├── events.js             # NEW
├── handouts.js           # NEW
├── mail.js               # MODIFIED (add draft/queue)
├── adventure-io.js       # NEW (import/export)
└── index.js              # Updated exports

lib/socket-handlers/
├── operations.handlers.js
└── prep.handlers.js      # NEW
```

---

## Success Criteria

1. All 6 new tables created and populated on startup
2. CRUD operations work for all entity types
3. Visibility logic correctly filters content per player
4. Email draft/queue status works
5. Export produces valid JSON matching schema
6. Import correctly remaps IDs and creates entities
7. Socket handlers respond to all prep operations
8. No breaking changes to existing functionality

---

## Deferred to Future Autoruns

- **AUTORUN-8:** GM Prep UI within VTT (basic)
- **AUTORUN-9+:** Separate GM Prep App
- **AUTORUN-9+:** .tvadv file format (zip with files)
- **AUTORUN-9+:** Handout file upload/storage
- **AUTORUN-9+:** Adventure marketplace integration
- **AUTORUN-9+:** Watermarking/DRM for paid content
- **AUTORUN-9+:** Claude-assisted adventure prep

---

## Testing Notes

1. Create campaign, add prep content via socket calls
2. Export adventure, verify JSON structure
3. Create new campaign, import adventure
4. Verify all content imported with new IDs
5. Verify cross-references work (NPC → location)
6. Test reveal mechanics:
   - Hide content, verify player can't see
   - Reveal to one player, verify only they see
   - Reveal to all, verify everyone sees
7. Test email queue:
   - Save draft, verify not sent
   - Queue for date, advance time, verify sent
