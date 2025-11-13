# Stage 13: Puppetry System - Design Document

**Purpose:** Remote browser control system for testing and gameplay
**Key Feature:** **VISIBLE automation** - interface "dances like a puppet"
**Use Cases:** Testing, debugging, AI gameplay, demonstrations

---

## CORE CONCEPT: VISIBLE PUPPETRY

**User Requirement:** "I'd like it if claude can actively change screens and visibly click buttons via puppetry such that a human user will see the interface dance like a puppet."

**Implementation:**
- **NOT headless:** Browser window is visible
- **Slow, deliberate actions:** Human-speed clicks and typing
- **Visual feedback:** Highlight elements before clicking
- **Smooth transitions:** Animated movements
- **Status overlay:** Show what puppetry is doing

**Why This Is Valuable:**
1. **Testing:** Watch tests execute in real-time
2. **Debugging:** See exactly what's happening
3. **Demonstration:** Show features to stakeholders
4. **AI Gameplay:** Watch AI opponent make decisions
5. **Training:** New users can watch gameplay

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER (Visible)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Game UI (Combat, Ship Customizer, etc.)    │  │
│  │  ↑                                           │  │
│  │  │ DOM Manipulation                          │  │
│  │  │                                           │  │
│  │  ▼                                           │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  Puppetry Client (puppetry-client.js) │ │  │
│  │  │  • Receives commands                   │ │  │
│  │  │  • Animates actions                    │ │  │
│  │  │  • Highlights elements                 │ │  │
│  │  │  • Logs events                         │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────┘
                   │ WebSocket / HTTP
                   │
┌──────────────────▼───────────────────────────────────┐
│                    SERVER                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Puppetry API (lib/puppetry/puppetry-api.js) │  │
│  │  • Command endpoint: POST /api/puppetry       │  │
│  │  • Status endpoint: GET /api/puppetry/status  │  │
│  │  • Log endpoint: GET /api/puppetry/logs       │  │
│  │  • Dynamic log level: POST /api/puppetry/log-level │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Puppetry Engine (lib/puppetry/engine.js)    │  │
│  │  • Command queue                              │  │
│  │  • Action executor                            │  │
│  │  • State manager                              │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Puppetry Logger (lib/puppetry/logger.js)    │  │
│  │  • Event logging                              │  │
│  │  • Dynamic log levels                         │  │
│  │  • Winston integration                        │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│              PUPPETEER (Test Runner)                  │
│  • Launches visible browser                           │
│  • Sends puppetry commands                            │
│  • Watches interface "dance"                          │
│  • Validates results                                  │
└───────────────────────────────────────────────────────┘
```

---

## PUPPETRY COMMANDS

### Navigation Commands
```javascript
{
  action: 'navigate',
  target: 'shipSelection',  // or 'combat', 'customizer', 'menu'
  options: { animated: true, speed: 'human' }
}
```

### Click Commands
```javascript
{
  action: 'click',
  selector: '#fire-button',
  options: {
    highlight: true,      // Highlight before clicking
    duration: 500,        // Hover duration (ms)
    speed: 'human'        // Click at human speed
  }
}
```

### Input Commands
```javascript
{
  action: 'type',
  selector: '#ship-name-input',
  text: 'Potemkin',
  options: {
    speed: 80,           // Characters per minute
    clearFirst: true
  }
}
```

### Selection Commands
```javascript
{
  action: 'select',
  selector: '#ship-dropdown',
  value: 'scout',
  options: { animated: true }
}
```

### Wait Commands
```javascript
{
  action: 'wait',
  condition: 'selector',   // or 'navigation', 'timeout'
  target: '.combat-ready',
  timeout: 5000
}
```

### Sequence Commands
```javascript
{
  action: 'sequence',
  commands: [
    { action: 'click', selector: '#menu-customize' },
    { action: 'wait', condition: 'navigation' },
    { action: 'click', selector: '.ship-scout' },
    { action: 'type', selector: '#ship-name', text: 'Test Ship' }
  ]
}
```

---

## VISUAL FEEDBACK SYSTEM

### 1. Element Highlighting
```javascript
// Before clicking, highlight element
function highlightElement(selector) {
  const el = document.querySelector(selector);
  el.style.outline = '3px solid #00ff00';
  el.style.boxShadow = '0 0 20px #00ff00';
  // Remove after action
  setTimeout(() => {
    el.style.outline = '';
    el.style.boxShadow = '';
  }, 1000);
}
```

### 2. Mouse Pointer Animation
```javascript
// Show animated cursor moving to element
function animateMouseTo(selector, duration = 500) {
  const cursor = document.getElementById('puppetry-cursor');
  const target = document.querySelector(selector);
  const rect = target.getBoundingClientRect();

  cursor.style.transition = `all ${duration}ms ease-in-out`;
  cursor.style.left = `${rect.left + rect.width/2}px`;
  cursor.style.top = `${rect.top + rect.height/2}px`;
}
```

### 3. Status Overlay
```javascript
// Show what puppetry is doing
<div id="puppetry-status">
  🎭 Puppetry Active
  <div class="current-action">Clicking: Fire Button</div>
  <div class="queue">Next: Select Target</div>
</div>
```

### 4. Action Trail
```javascript
// Visual breadcrumb of actions taken
<div id="puppetry-trail">
  ✓ Navigated to Combat
  ✓ Selected Scout Ship
  → Firing Weapons...
</div>
```

---

## CONTROL MAPPING

### Main Menu Controls
```javascript
const MENU_CONTROLS = {
  'menu.customize': '#menu-customize-button',
  'menu.battle': '#menu-battle-button',
  'menu.settings': '#menu-settings-button'
};
```

### Ship Selection Controls
```javascript
const SHIP_SELECTION_CONTROLS = {
  'ship.select': '.ship-card[data-ship="{{shipId}}"]',
  'ship.ready': '#ready-button',
  'ship.range': '#range-selector',
  'ship.crew.assign': '.crew-slot[data-role="{{role}}"]'
};
```

### Combat Controls
```javascript
const COMBAT_CONTROLS = {
  'combat.fire': '#fire-button',
  'combat.dodge': '#dodge-button',
  'combat.manoeuvre': '#manoeuvre-button',
  'combat.endTurn': '#end-turn-button',
  'combat.weapon.select': '.weapon-button[data-weapon="{{weaponId}}"]',
  'combat.target.select': '.target-ship',
  'combat.crew.action': '.crew-action[data-action="{{action}}"]'
};
```

### Ship Customizer Controls
```javascript
const CUSTOMIZER_CONTROLS = {
  'customize.component.click': '.ship-component[data-component="{{component}}"]',
  'customize.turret.type': '#turret-type-selector',
  'customize.weapon.add': '#add-weapon-button',
  'customize.weapon.remove': '.weapon-slot .remove-button',
  'customize.save': '#save-ship-button',
  'customize.load': '#load-ship-button',
  'customize.reset': '#reset-button'
};
```

---

## PUPPETEER INTEGRATION (VISIBLE MODE)

### Configuration
```javascript
// tests/automated/setup.js
const PUPPETRY_CONFIG = {
  headless: false,              // MUST be false for visible puppetry
  slowMo: 100,                  // Slow down by 100ms per action
  devtools: true,               // Open devtools
  args: [
    '--window-size=1920,1080',
    '--window-position=0,0'
  ]
};

async function setupPuppetryBrowser() {
  const browser = await puppeteer.launch(PUPPETRY_CONFIG);
  const page = await browser.newPage();

  // Inject puppetry client
  await page.addScriptTag({ path: './public/js/puppetry-client.js' });

  return { browser, page };
}
```

### Test Example
```javascript
test('Puppetry: Complete combat sequence (VISIBLE)', async () => {
  const { browser, page } = await setupPuppetryBrowser();

  // Navigate to game
  await puppetry.navigate(page, 'menu');
  await puppetry.waitForVisible(page, '#menu-battle-button');

  // Start battle (watch interface dance!)
  await puppetry.click(page, '#menu-battle-button', {
    highlight: true,
    duration: 1000
  });

  // Select ships
  await puppetry.selectShip(page, 'scout');
  await puppetry.selectShip(page, 'free_trader', { isOpponent: true });

  // Start combat
  await puppetry.click(page, '#ready-button');

  // Fire weapons
  await puppetry.selectWeapon(page, 'pulseLaser');
  await puppetry.click(page, '#fire-button');

  // Verify results
  const combatLog = await page.$eval('#combat-log', el => el.textContent);
  expect(combatLog).toContain('Weapon fired');

  // Don't close browser - keep visible for inspection
  // await browser.close();
});
```

---

## LOGGING SYSTEM

### Log Levels (Dynamic)
```javascript
const LOG_LEVELS = {
  ERROR: 0,   // Errors only
  WARN: 1,    // Warnings and errors
  INFO: 2,    // Info, warnings, errors
  DEBUG: 3,   // Everything including debug
  TRACE: 4    // Ultra-verbose (every DOM interaction)
};

// Change log level at runtime
POST /api/puppetry/log-level
{ level: 'DEBUG' }
```

### Puppetry Event Logging
```javascript
// Log every puppetry action
function logPuppetryEvent(event) {
  logger.info('[PUPPETRY]', {
    timestamp: Date.now(),
    action: event.action,
    selector: event.selector,
    options: event.options,
    result: event.result,
    duration: event.duration
  });
}

// Example log output:
[2025-11-13 14:30:45] [INFO] [PUPPETRY] {
  action: 'click',
  selector: '#fire-button',
  options: { highlight: true, duration: 500 },
  result: 'success',
  duration: 523
}
```

### Log File Rotation
```javascript
// lib/puppetry/logger.js
const winston = require('winston');

const puppetryLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/puppetry-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/puppetry-all.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Dynamic level change
function setLogLevel(level) {
  puppetryLogger.level = level;
  puppetryLogger.info(`Log level changed to: ${level}`);
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (2 days)
- [ ] Create `lib/puppetry/` directory structure
- [ ] Implement `puppetry-api.js` (HTTP endpoints)
- [ ] Implement `engine.js` (command queue)
- [ ] Implement `logger.js` (Winston integration)
- [ ] Create `public/js/puppetry-client.js`

### Phase 2: Visual Feedback (1 day)
- [ ] Element highlighting system
- [ ] Mouse pointer animation
- [ ] Status overlay UI
- [ ] Action trail display
- [ ] CSS animations

### Phase 3: Control Mapping (3 days)
- [ ] Map menu controls
- [ ] Map ship selection controls
- [ ] Map combat controls
- [ ] Map ship customizer controls
- [ ] Test all mappings

### Phase 4: Puppeteer Integration (2 days)
- [ ] Update `tests/automated/setup.js` for visible mode
- [ ] Refactor existing tests to use puppetry
- [ ] Add new puppetry-specific tests
- [ ] Create demo test showcase

### Phase 5: Logging Enhancement (1 day)
- [ ] Implement dynamic log levels
- [ ] Add puppetry event logging
- [ ] Log file rotation
- [ ] Log viewing endpoint

---

## USE CASES

### 1. Automated Testing (Primary)
```javascript
// Watch tests execute in real browser
npm run test:puppetry

// Browser window opens, you watch:
// - Menu appears
// - "Space Battle" button highlights and clicks
// - Ship selection screen loads
// - Scout card highlights and clicks
// - Combat starts
// - Weapons fire
// - Turn ends
// - Results validated
```

### 2. AI Opponent Gameplay
```javascript
// AI opponent uses puppetry to take actions
function aiOpponentTurn(gameState) {
  // AI decides to fire weapons
  puppetry.selectWeapon('pulseLaser');
  puppetry.click('#fire-button');

  // Human player watches AI's actions in real-time!
}
```

### 3. Feature Demonstration
```javascript
// Demo mode: Show off all features
async function runDemo() {
  await puppetry.sequence([
    { action: 'navigate', target: 'menu' },
    { action: 'wait', duration: 1000 },
    { action: 'click', selector: '#menu-customize' },
    { action: 'wait', condition: 'navigation' },
    // ... show ship customization
    { action: 'navigate', target: 'combat' },
    // ... show combat system
  ]);
}
```

### 4. Debugging
```javascript
// Replay user actions to reproduce bug
const bugReport = loadBugReport('issue-123');
await puppetry.replay(bugReport.actions);
// Watch exactly what user did
```

---

## API ENDPOINTS

### Command Endpoint
```
POST /api/puppetry/command
{
  "action": "click",
  "selector": "#fire-button",
  "options": { "highlight": true }
}

Response: { "success": true, "duration": 523 }
```

### Status Endpoint
```
GET /api/puppetry/status

Response: {
  "active": true,
  "currentAction": "clicking #fire-button",
  "queueLength": 3,
  "lastAction": { ... }
}
```

### Log Level Endpoint
```
POST /api/puppetry/log-level
{ "level": "DEBUG" }

Response: { "success": true, "level": "DEBUG" }
```

### Logs Endpoint
```
GET /api/puppetry/logs?last=100

Response: {
  "logs": [
    {
      "timestamp": "2025-11-13T14:30:45.123Z",
      "level": "info",
      "action": "click",
      "selector": "#fire-button"
    },
    ...
  ]
}
```

---

## TESTING STRATEGY

### 1. Puppetry System Tests
- [ ] Test command queue
- [ ] Test action execution
- [ ] Test error handling
- [ ] Test log levels

### 2. Visual Feedback Tests
- [ ] Test element highlighting
- [ ] Test mouse animation
- [ ] Test status overlay
- [ ] Test action trail

### 3. Integration Tests
- [ ] Test with menu
- [ ] Test with ship selection
- [ ] Test with combat
- [ ] Test with ship customizer

### 4. E2E Tests (Visible)
- [ ] Complete game flow
- [ ] AI opponent gameplay
- [ ] Ship customization flow
- [ ] Error scenarios

---

## CONFIGURATION

### Environment Variables
```bash
# Enable puppetry system
PUPPETRY_ENABLED=true

# Puppetry mode (visible vs headless)
PUPPETRY_HEADLESS=false

# Default log level
PUPPETRY_LOG_LEVEL=info

# Action speed (ms delay between actions)
PUPPETRY_SPEED=100

# Highlight duration (ms)
PUPPETRY_HIGHLIGHT_DURATION=500
```

---

## SUCCESS CRITERIA

**Stage 13 Complete When:**
- [ ] Puppetry API implemented
- [ ] All controls mapped
- [ ] Visual feedback working
- [ ] Logging system enhanced
- [ ] Dynamic log levels working
- [ ] Existing E2E tests converted to puppetry
- [ ] New puppetry demo tests added
- [ ] Documentation complete
- [ ] **Can watch interface "dance like a puppet"** ✅

---

**Status:** DESIGN COMPLETE
**Next:** Implementation (9 days estimated)
**Key Feature:** VISIBLE browser automation - watch the magic happen!

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
