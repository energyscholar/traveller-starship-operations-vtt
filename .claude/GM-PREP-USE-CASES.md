# GM Prep Use Cases for Pirates of Drinax Campaign

**Created:** 2025-12-01
**Source:** Analysis of 8 Mongoose Traveller adventures
**Purpose:** Define what the GM needs to prep and deploy during 3-hour sessions

---

## The Theatrical Model

Bruce described GMing like being a theatrical director/orchestra conductor:
- **Prep Phase** (days/weeks before): Create all the "props" - NPCs, emails, reveals, locations
- **Performance Phase** (3-hour session): Deploy props on-demand as players ad-lib
- **Success Metric**: Players interact for long stretches without GM intervention

The VTT must support BOTH phases with minimal crunch.

---

## Content Types to Prep (from Adventure Analysis)

### 1. NPCs (Patrons, Contacts, Enemies)
**Examples from adventures:**
- Maris Enar (patron, anthropologist with quirky personality)
- Gera Hollis (revolutionary leader with complex motivations)
- Utea (Aslan lord, haughty but needs help)
- Baroness Lux (unreliable narrator, hidden agenda)
- Ftahkaiw (anxious father hiding behind lordly facade)
- Armandie Kern (anti-violence leader who breaks if pushed)

**Prep needs:**
- Name, title, role
- Stats (for when rolls matter)
- Personality summary (1-2 sentences)
- Motivation (public and hidden)
- Portrait/image
- Location (where they are now)
- Visibility (hidden from players, known to some, known to all)
- Associated emails they might send

### 2. Emails/Messages
**Examples from adventures:**
- Patron offering job
- Intelligence briefings
- Warning from ally
- Threat from enemy
- Information from contact
- System authority communications

**Prep needs:**
- From (NPC name)
- To (player, role, all crew, all)
- Subject
- Body (markdown supported)
- Sent date (game time)
- Delivery date (based on distance - 2 weeks/parsec for "fast mail")
- Priority (low, normal, high, urgent)
- Status (draft, ready to send, sent, read)
- Trigger condition (optional - "send when X happens")

### 3. Plot Reveals (Staged Information)
**Examples from adventures:**
- "The sea gods are actually benevolent" (reveal after rescue)
- "The patron is lying about the threat" (reveal if investigated)
- "Baron Halley is getting Zhodani support" (hidden truth)
- "The primitives worship the temple" (reveal on friendly contact)
- "The real reason for the crash" (discovered in wreckage)

**Prep needs:**
- Title/summary
- Full description (what players learn)
- Visibility state (hidden, revealed to X, revealed to all)
- Category (plot, lore, secret, discovery)
- Trigger condition (optional)
- Associated handout (optional - map, document, image)

### 4. Locations/Scenes
**Examples from adventures:**
- Marduk Lightfoot (fishing vessel with deck plans)
- The Temple (carved rock face with pool)
- Acrid Starport (turrets, tunnels, key installations)
- Kteiroa Ihatei Camp (frozen desert, strained resources)
- Cordan Disputed Territory (border zone between barons)
- Thebus Surface (thin atmosphere, lion hunting grounds)

**Prep needs:**
- Name
- Description (what players see/experience)
- Atmosphere/environment hazards
- Connected locations
- NPCs present
- Available actions
- Associated image/map
- Visibility (known, discovered, hidden)

### 5. Factions
**Examples from adventures:**
- PRQ Corporation (owns Acrid, will retaliate)
- The "Around a Thousand" citizens vs workers
- Three rival barons on Cordan
- Ihatei leaders competing for resources
- Free Sperle Society (serious members vs dilettantes)
- GeDeCo (megacorp controlling Sperle)

**Prep needs:**
- Name
- Description
- Resources/assets
- Goals
- Relationship to other factions (ally, neutral, enemy)
- Current state (stable, threatened, attacking, defeated)
- Key NPCs

### 6. Events/Triggers
**Examples from adventures:**
- Storm arrives during deep dive
- Revolution triggers (early or coordinated)
- Counter-revolution response (X days after takeover)
- Volcano eruption
- Contact with unknown ship

**Prep needs:**
- Name
- Description of what happens
- Trigger condition (time-based, player action, dice roll)
- Consequences
- Status (pending, triggered, resolved)
- Associated reveals, emails, NPC arrivals

### 7. Skill Checks (Pre-rolled or Defined)
**Examples from adventures:**
- Mechanics check to build submarine rig (Difficult 10+, 1D hours)
- Pilot check to dock at hazardous port
- Sensors check to identify contact
- Leadership check in crisis

**Prep needs:**
- Skill required
- Difficulty (Easy/Routine/Average/Difficult/Very Difficult/Formidable)
- Time required
- Success description
- Failure description
- Modifiers (can players help? equipment bonus?)

### 8. Handouts/Documents
**Examples from adventures:**
- Traveller's Aid Society Advisory Report (scanner data on unknown ship)
- Mysterious markings/numeral chart
- Ship deck plans
- Intelligence briefing
- Contract terms
- Map of location

**Prep needs:**
- Title
- Type (briefing, map, document, image, stat block)
- Content (text, image, or both)
- Visibility (GM only, shared with specific players, shared with all)
- Associated plot reveal

---

## GM Workflow: Before Session

### Days/Weeks Before
1. **Adventure Import** (future feature: parse PDF, extract key elements)
2. **NPC Creation**
   - Create all NPCs with stats, personality, portrait
   - Set initial visibility (most are hidden)
   - Draft initial contact emails

3. **Email Queue**
   - Write all emails NPCs might send
   - Set trigger conditions or "ready to send" state
   - Calculate delivery dates for distant senders

4. **Plot Reveals**
   - Define all secrets and discoveries
   - Tag with trigger conditions
   - Link to handouts

5. **Location Prep**
   - Enter all locations with descriptions
   - Upload maps/images
   - Link NPCs to locations

6. **Event Timeline**
   - Define time-based events
   - Define trigger-based events
   - Set up cascade chains

### Night Before Session
1. Review prep, ensure all content is ready
2. Set "session start" game date
3. Check which emails are ready to deliver
4. Review current faction states
5. Mark current plot status

---

## GM Workflow: During Session (The Performance)

### On-Demand Deployment
1. **Quick NPC Deploy**
   - Search prep by name/tag
   - One-click reveal to players
   - Show portrait, read description

2. **Send Prepped Email**
   - Browse email queue
   - Click "Send Now"
   - Email appears in player mailboxes

3. **Reveal Information**
   - Browse staged reveals
   - Click "Reveal to All" or "Reveal to [Player]"
   - Players see new information in their view

4. **Trigger Event**
   - Browse pending events
   - Click "Trigger" to activate
   - Cascade effects fire automatically

5. **Quick Skill Check**
   - Select skill
   - Set difficulty
   - Roll or let player roll
   - Record outcome

### State Tracking (Automatic)
- Time advances, triggering scheduled events
- Faction states update based on player actions
- Resources track (fuel, ammo, credits)
- Contact scan levels track (unknown → passive → active → deep)

---

## UI Requirements Summary

### Prep Mode (GM Only)
- **Content Library**: All prepped NPCs, emails, reveals, locations, events
- **Draft Status**: Clear indicators of what's ready vs in-progress
- **Organization**: Tags, folders, search
- **Bulk Operations**: Copy, duplicate, template

### Play Mode (GM View)
- **Quick Actions Bar**: Deploy NPC, Send Email, Reveal Info, Trigger Event
- **State Dashboard**: Current game date, faction states, pending events
- **Player View Toggle**: See what players see
- **Search Prep**: Find prepped content fast

### Play Mode (Player View)
- **Inbox**: Received emails with unread count
- **Contacts**: Known NPCs with portraits
- **Information Panel**: Revealed plot info, handouts
- **Current Location**: Description and available actions

---

## Business Model: Adventure Publishing Platform

### Vision
The VTT becomes a **platform for selling prepared digital adventures**:
- Partner with Mongoose Publishing
- $5-10 per prepared adventure (bundled with PDF purchase)
- Royalties to Mongoose
- Adventures are "ready to run" - all prep done by Claude/professional preparer

### What a "Prepared Adventure Package" Contains
```
adventure-package/
├── manifest.json         # Metadata, version, dependencies
├── npcs/                 # All NPC dossiers with portraits
├── emails/               # All prepped emails with triggers
├── reveals/              # Staged plot information
├── locations/            # Scene descriptions with maps
├── events/               # Trigger-based events
├── factions/             # Faction definitions and states
├── handouts/             # Images, maps, documents
├── skill-checks/         # Pre-defined checks with DCs
├── timeline/             # Event schedule
└── session-notes/        # GM guidance per chapter
```

### Adventure Package Features
1. **Import/Export** - Standard format, works on any VTT instance
2. **Versioning** - Update adventures, notify users
3. **Customization** - GM can edit imported content
4. **Progress Tracking** - Resume across sessions
5. **Spoiler Protection** - Players can't peek at unrevealed content

### Who Creates Adventures?
1. **Claude + Bruce** - Primary production workflow (see below)
2. **Professional Preparers** - Human editors for quality control
3. **GMs** - Create and share their own content
4. **Mongoose** - Official prepared versions of their adventures

### Claude + Bruce Collaborative Prep Workflow (~3 months out)

**The Process:**
1. Bruce provides PDF of published adventure (e.g., "Gods of Marduk")
2. Claude reads PDF using `pdftotext` (safe extraction)
3. Claude extracts and creates:
   - NPCs with stats, personality, motivations
   - Staged reveals (plot secrets, discoveries)
   - Email drafts (job offers, warnings, NPC communications)
   - Locations with descriptions
   - Events with triggers
   - Skill checks with DCs
   - Handout references (maps, briefings)
4. Claude outputs structured JSON or uses prep API directly
5. Bruce reviews, edits, enhances (adds portraits, tweaks text)
6. Package exported as .tvadv file
7. Quality check: Bruce runs adventure solo to verify flow
8. Publish to marketplace

**What Claude Needs:**
- Access to prep API (socket handlers or direct DB calls)
- Adventure template/schema to follow
- PDF reading capability (already have pdftotext)
- Understanding of Traveller adventure structure

**What Bruce Does:**
- Curates which adventures to prep
- Reviews Claude's output for accuracy
- Adds visual assets (portraits, maps)
- Tests the packaged adventure
- Handles licensing/business with Mongoose

**Target Output Quality:**
- Every NPC has portrait, personality, public/hidden motivation
- Every plot beat has a staged reveal
- Key communications are pre-drafted as emails
- Skill checks have clear DCs and consequences
- Timeline of events is mapped
- GM can run with minimal additional prep

**Timeline:** ~3 months (hobby project pace)

### Revenue Model
- $5-10 per adventure (roughly half to Mongoose)
- Subscription option for all-access
- Free adventures for community building
- GM-created content marketplace (future)

---

## Two GM User Types

### Super-GMs (Software engineers, lifetime GMs like Bruce)
- Create adventures from scratch or PDFs
- Build reusable templates
- Package adventures for sale/sharing
- Deep customization

### Regular GMs (Most users)
**Primary Use Case 1: Prep Custom Adventures**
- Create their own adventures using the Prep App
- Start from blank or from templates
- Mix original content with imported published adventures
- Optionally package and share good ones with community

**Primary Use Case 2: Load & Run Published Adventures**
- Purchase/download prepared adventure packages (.tvadv)
- Load into their campaign
- Run the adventure with minimal additional prep
- **Save status/progress** as they play:
  - Which reveals have been deployed
  - Which NPCs have been revealed
  - Which emails have been sent
  - Which events have triggered
  - Player notes and modifications
- Resume across multiple sessions
- Ability to reset adventure to "fresh" state for replay

### Adventure Status Tracking
When running a loaded adventure, the VTT tracks:
```
{
  adventureId: "gods-of-marduk",
  campaignId: "bruces-campaign",
  loadedAt: "2025-12-01",
  status: "in-progress",

  // Per-entity status
  reveals: {
    "sea-gods-benevolent": "revealed",
    "temple-location": "revealed",
    "primitives-worship": "hidden"
  },
  npcs: {
    "maris-enar": "revealed",
    "fishing-crew": "revealed",
    "islander-chief": "hidden"
  },
  emails: {
    "job-offer": "sent",
    "warning-from-port": "draft"
  },
  events: {
    "storm-arrives": "triggered",
    "sea-god-rescue": "pending"
  },

  // GM customizations
  modifications: [],
  notes: "Party decided to fight the islanders, will need to improvise consequences"
}
```

---

## Priority Features for AUTORUN-7

Based on this analysis, the highest-impact features for GM prep are:

### Tier 1: Core Prep System
1. **GM Prep Mode** - Separate interface for content creation
2. **NPC Dossier System** - Full profiles with visibility control
3. **Staged Reveals** - Hidden content with one-click deployment

### Tier 2: Communication & Events
4. **Email System Enhancement** - Draft queue, scheduled delivery, triggers
5. **Event/Trigger System** - Define conditions, manual or auto-trigger

### Tier 3: Session Execution
6. **Quick Deploy Bar** - Fast access during session
7. **Player View Toggle** - GM sees what players see

### Tier 4: Adventure Packages (Future)
8. **Adventure Export/Import** - Standard package format
9. **Adventure Marketplace** - Browse, purchase, download
10. **Claude Adventure Prep** - Automated PDF → package conversion

These directly support the "theatrical performance" model where prep happens before and deployment happens during the 3-hour session window.

---

## Story Elements to Mediate Through VTT

From the 8 adventures, these story elements should flow through the VTT:

| Element | How It's Prepped | How It's Deployed | Player Experience |
|---------|------------------|-------------------|-------------------|
| Job Offer | Email from patron | GM sends when appropriate | Inbox notification |
| NPC Meeting | NPC dossier + dialog | GM reveals NPC | Portrait + description |
| Location Arrival | Location description | GM sets current scene | Scene panel updates |
| Discovery | Staged reveal | GM clicks "reveal" | Information popup |
| Intelligence | Handout document | GM shares | Document viewer |
| Faction Shift | Event with consequences | Triggered by action | News/update |
| Combat Start | Contact → combatant | GM transitions | Combat mode |
| Skill Challenge | Pre-defined check | GM or player rolls | Roll result + narrative |
| Time Passage | Timeline events | Auto or GM advance | Date updates, events fire |
| Email from NPC | Drafted message | Scheduled or triggered | Inbox notification |
| Secret Info | Player-specific reveal | Reveal to individual | Private info panel |

### The Flow
```
GM Preps (before) → Adventure Package → GM Deploys (during) → Players Experience
      ↓                    ↓                   ↓                    ↓
   Claude helps      Stored in DB       Quick actions bar      Minimal crunch
   NPC creation      Portable format    One-click reveals      Focus on story
   Email drafting    Versioned          State tracking         Fun interactions
```
