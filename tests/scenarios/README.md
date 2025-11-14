# Test Scenario Framework
**Created:** 2025-11-14
**Purpose:** Reusable test scenarios for Puppeteer (headless) and Puppetry (visible) automation
**Version:** 1.0.0 (Session 6, Phase 1.4)

---

## Overview

The Test Scenario Framework provides reusable battle scenarios that work with both Puppeteer (fast, headless) and Puppetry (slow, visible) automation modes. Each scenario defines:

1. **Setup** - Ship selections and initial conditions
2. **Expected Actions** - Round-by-round action sequence
3. **Puppeteer Steps** - Fast execution steps (no delays)
4. **Puppetry Steps** - Slow execution steps (with feedback and highlights)
5. **Validation** - Pre/post-conditions to verify
6. **Performance Metrics** - Expected performance targets

---

## 📋 Available Scenarios

### 1. Basic Combat (Scout vs Free Trader)
**File:** `basic-combat.js`
**Difficulty:** Easy
**Duration:** 2-3 rounds
**Purpose:** Test core fire/endTurn workflow

**Key Features:**
- Simple 1v1 combat at short range
- Pulse laser vs beam laser
- Tests basic combat mechanics
- Minimal complexity

**Use Case:** Smoke tests, basic functionality validation

---

### 2. Missile Combat (Long Range)
**File:** `missile-combat.js`
**Difficulty:** Medium
**Duration:** 4-5 rounds
**Purpose:** Test missile mechanics

**Key Features:**
- Long-range engagement
- Missile launches and tracking
- Point defense mechanics
- Ammo consumption

**Use Case:** Stage 11 missile mechanics validation

---

### 3. Sandcaster Defense
**File:** `sandcaster-defense.js`
**Difficulty:** Medium
**Duration:** 3-4 rounds
**Purpose:** Test defensive sandcaster mechanics

**Key Features:**
- Close-range combat
- Sandcaster deployment
- Armor bonuses
- Defensive tactics

**Use Case:** Stage 11 sandcaster mechanics validation

---

## 🎯 Scenario Structure

### Scenario Object Format

```javascript
module.exports = {
  // Metadata
  name: 'Scenario Name',
  description: 'Brief description',
  duration: '2-3 rounds',
  difficulty: 'easy|medium|hard',

  // Initial setup
  setup: {
    player1: {
      ship: 'scout',
      range: 'Short'
    },
    player2: {
      ship: 'free_trader',
      range: 'Short'
    }
  },

  // Expected actions (for validation)
  expectedActions: [
    {
      round: 1,
      actions: [
        { player: 'player1', type: 'fire', weapon: 'pulse_laser' },
        { player: 'player1', type: 'endTurn' }
      ]
    }
  ],

  // Puppeteer steps (fast, headless)
  puppeteerSteps: [
    {
      description: 'Click fire button',
      selector: '[data-test-id="fire-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    }
  ],

  // Puppetry steps (slow, visible)
  puppetrySteps: [
    {
      description: 'Click fire button',
      selector: '[data-test-id="fire-button"]',
      action: 'click',
      feedback: 'Firing weapon!',
      delay: 1000,
      highlight: '[data-test-id="fire-button"]'
    }
  ],

  // Validation
  validation: {
    preconditions: [
      { check: 'server_running', description: 'Server must be running' }
    ],
    postconditions: [
      { check: 'combat_started', description: 'Combat must have started' }
    ]
  },

  // Performance metrics (Puppeteer mode)
  performanceMetrics: {
    maxRoundDuration: 5000, // ms
    maxTotalDuration: 15000, // ms
    maxLatency: 200, // ms
    maxMemory: 200 // MB
  }
};
```

---

## 🚀 Usage

### Import Scenarios

```javascript
const scenarios = require('./tests/scenarios');

// Get specific scenario
const basicCombat = scenarios.basicCombat;

// Get by name
const scenario = scenarios.getScenario('basic combat');

// List all
const allScenarios = scenarios.listScenarios();

// Filter by difficulty
const easyScenarios = scenarios.getScenariosByDifficulty('easy');
```

### Run with Puppeteer (Headless)

```javascript
const puppeteer = require('puppeteer');
const { basicCombat } = require('./tests/scenarios');

async function runHeadless() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // Execute Puppeteer steps
  for (const step of basicCombat.puppeteerSteps) {
    if (step.action === 'click') {
      await page.click(step.selector);
    } else if (step.action === 'select') {
      await page.select(step.selector, step.value);
    }

    if (step.wait) {
      if (step.wait.selector) {
        await page.waitForSelector(step.wait.selector);
      } else if (step.wait.timeout) {
        await page.waitForTimeout(step.wait.timeout);
      }
    }
  }

  await browser.close();
}
```

### Run with Puppetry (Visible)

```javascript
const puppeteer = require('puppeteer');
const { basicCombat } = require('./tests/scenarios');

async function runVisible() {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // Execute Puppetry steps with visual feedback
  for (const step of basicCombat.puppetrySteps) {
    // Show feedback overlay
    if (step.feedback) {
      await showFeedback(page, step.feedback);
    }

    // Highlight element
    if (step.highlight) {
      await highlightElement(page, step.highlight);
    }

    // Delay before action
    if (step.delay) {
      await page.waitForTimeout(step.delay);
    }

    // Execute action
    if (step.action === 'click') {
      await page.click(step.selector);
    } else if (step.action === 'select') {
      await page.select(step.selector, step.value);
    }

    // Wait after action
    if (step.wait) {
      if (step.wait.selector) {
        await page.waitForSelector(step.wait.selector);
      } else if (step.wait.timeout) {
        await page.waitForTimeout(step.wait.timeout);
      }
    }
  }

  // Don't close browser immediately (human-watchable)
  await page.waitForTimeout(5000);
  await browser.close();
}
```

---

## 📊 Step Action Types

### Supported Actions

| Action | Purpose | Parameters |
|--------|---------|------------|
| `click` | Click element | `selector` |
| `select` | Select dropdown option | `selector`, `value` |
| `type` | Type text | `selector`, `text` |
| `getText` | Get element text | `selector`, `expectedPattern` (optional) |
| `waitForSelector` | Wait for element | `selector`, `timeout` (optional) |
| `waitForTimeout` | Wait fixed time | `timeout` |

### Puppetry-Specific Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `feedback` | Status overlay text | `'Firing weapon!'` |
| `highlight` | Yellow border element | `'[data-test-id="fire-button"]'` |
| `delay` | Delay before action (ms) | `1000` |

---

## ✅ Validation Checks

### Precondition Checks

- `server_running` - Server accessible on port 3000
- `test_api_enabled` - Test API endpoints active
- `scout_has_missiles` - Scout ship has missile capability
- `scout_has_sandcasters` - Scout ship has sandcasters

### Postcondition Checks

- `combat_started` - Combat session initiated
- `at_least_one_shot_fired` - Weapon fired successfully
- `combat_log_not_empty` - Combat log has entries
- `missiles_launched` - Missile launch detected
- `ammo_decreased` - Ammunition count decreased
- `missiles_in_flight` - Active missiles tracked
- `sandcaster_used` - Sandcaster deployed
- `armor_bonus_applied` - Armor bonus active

---

## 🎨 Creating New Scenarios

### Step 1: Create Scenario File

```bash
# Create new scenario file
touch tests/scenarios/your-scenario.js
```

### Step 2: Define Scenario Object

```javascript
module.exports = {
  name: 'Your Scenario Name',
  description: 'What this tests',
  duration: 'X-Y rounds',
  difficulty: 'easy',

  setup: {
    player1: { ship: 'scout', range: 'Short' },
    player2: { ship: 'free_trader', range: 'Short' }
  },

  puppeteerSteps: [/* ... */],
  puppetrySteps: [/* ... */],

  validation: { preconditions: [], postconditions: [] },
  performanceMetrics: { maxRoundDuration: 5000 }
};
```

### Step 3: Add to Index

```javascript
// tests/scenarios/index.js
const yourScenario = require('./your-scenario');

const scenarios = {
  basicCombat,
  missileCombat,
  sandcasterDefense,
  yourScenario // Add here
};
```

---

## 📈 Performance Metrics

### Puppeteer Mode (Headless)

Scenarios define expected performance targets:

- **maxRoundDuration:** Maximum time per combat round (ms)
- **maxTotalDuration:** Maximum total scenario duration (ms)
- **maxLatency:** Maximum WebSocket round-trip time (ms)
- **maxMemory:** Maximum memory usage (MB)

### Example Targets

| Scenario | Round | Total | Latency | Memory |
|----------|-------|-------|---------|--------|
| Basic Combat | 5s | 15s | 200ms | 200MB |
| Missile Combat | 6s | 30s | 200ms | 250MB |
| Sandcaster Defense | 5s | 20s | 200ms | 220MB |

---

## 🔄 Maintenance

### When to Update Scenarios

- [ ] UI changes (new elements, changed selectors)
- [ ] New game mechanics added
- [ ] Performance targets change
- [ ] New validation checks needed

### Scenario Review Checklist

- [ ] All selectors use data-test-id attributes
- [ ] Puppeteer steps work (fast, no delays)
- [ ] Puppetry steps work (slow, with feedback)
- [ ] Validation checks pass
- [ ] Performance metrics reasonable
- [ ] Documentation accurate

---

## 📝 Next Steps

### Phase 2: Puppeteer Runner (Headless)
Create headless runner that executes scenarios at full speed:
- Fast execution (no delays)
- Performance metrics collection
- Load testing (multiple concurrent scenarios)
- CI/CD integration

### Phase 3: Puppetry Runner (Visible)
Create visible runner with visual feedback:
- Slow, deliberate execution
- Element highlighting
- Status overlay
- Human-watchable demonstrations

---

**Document Status:** ✅ Complete (Phase 1.4)
**Total Scenarios:** 3 (Basic, Missile, Sandcaster)
**Version:** 1.0.0
**Last Updated:** 2025-11-14

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
