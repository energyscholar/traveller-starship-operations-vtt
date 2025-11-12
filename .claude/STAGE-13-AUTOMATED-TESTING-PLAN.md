# TRAVELLER COMBAT VTT - STAGE 13: AUTOMATED TESTING

**Created:** 2025-11-12
**Status:** Ready to begin
**Priority:** HIGH - This will dramatically speed up development and debugging

---

## Motivation

### Why Automated Testing First?

Manual testing of the VTT is becoming too slow and error-prone:

1. **Manual workflow is tedious:**
   - Start server
   - Open browser tab
   - Change URL to `?mode=solo`
   - Click through ship selection
   - Manually fire weapons and observe
   - Refresh and repeat for each test

2. **Hard to debug AI issues:**
   - Can't easily inspect data structures during combat
   - Console logs scroll by too fast
   - Need to manually trigger specific scenarios

3. **Solo mode exposed the problem:**
   - Took many iterations to debug AI turn transitions
   - Each iteration required full manual test cycle
   - Would have been 10x faster with automated testing

4. **Stage 12 ship customization will be worse:**
   - Need to test each component panel
   - Need to test validation rules
   - Need to test cost calculations
   - Manual testing would take hours

### What We Need

A **remote-controlled browser testing system** that allows:
- Starting a combat session programmatically
- Selecting ships and weapons via code
- Clicking buttons and reading state
- Inspecting internal data structures
- Running scenarios end-to-end
- Automated page refresh/reload with setTimeout

---

## Architecture

### Option 1: Puppeteer (Recommended)

**Pros:**
- Industry standard for browser automation
- Full Chrome DevTools Protocol access
- Can inspect React/Vue state, network calls, console logs
- Perfect for integration testing
- Already familiar to most developers

**Cons:**
- Requires headless Chrome
- Slightly heavier weight

### Option 2: Playwright

**Pros:**
- Multi-browser support (Chrome, Firefox, Safari)
- Modern, excellent TypeScript support
- Similar to Puppeteer but newer

**Cons:**
- May be overkill for our needs

### Decision: Puppeteer

We'll use **Puppeteer** because:
1. Industry standard
2. Perfect for our single-browser use case
3. Excellent documentation
4. Easy to debug with `headless: false` mode

---

## Implementation Plan

### Sub-stage 13.1: Puppeteer Setup (1 hour)

**Goal:** Get Puppeteer running and launch the app

**Tasks:**
1. Install Puppeteer: `npm install --save-dev puppeteer`
2. Create `tests/automated/` directory
3. Create `tests/automated/setup.js` - Helper to start server and browser
4. Create `tests/automated/teardown.js` - Helper to stop everything
5. Write first test: `tests/automated/01-launch.test.js`
   - Start server on port 3000
   - Launch browser
   - Navigate to http://localhost:3000
   - Verify main menu appears
   - Take screenshot
   - Close browser

**Success Criteria:**
- Test runs via `npm run test:auto`
- Browser launches and loads app
- Screenshot saved to `tests/automated/screenshots/`

---

### Sub-stage 13.2: Element Registry System (2 hours)

**Goal:** Create a system to track and access all UI elements

**Why:** Dynamic elements (turrets, weapon dropdowns) need consistent selectors

**Implementation:**

1. **Create `public/test-registry.js`:**
   ```javascript
   // Element registry for automated testing
   window.TestRegistry = {
     elements: new Map(),

     // Register an element with a test ID
     register(testId, element) {
       this.elements.set(testId, element);
       element.setAttribute('data-test-id', testId);
     },

     // Get element by test ID
     get(testId) {
       return this.elements.get(testId);
     },

     // Query by test ID
     query(testId) {
       return document.querySelector(`[data-test-id="${testId}"]`);
     },

     // List all registered elements
     list() {
       return Array.from(this.elements.keys());
     }
   };
   ```

2. **Modify `public/app.js` to register elements:**
   ```javascript
   // Register key elements for testing
   if (window.TestRegistry) {
     TestRegistry.register('main-menu', document.getElementById('main-menu-screen'));
     TestRegistry.register('btn-space-battle', document.getElementById('btn-space-battle'));
     TestRegistry.register('btn-solo-battle', document.getElementById('btn-solo-battle'));
     TestRegistry.register('btn-customize-ship', document.getElementById('btn-customize-ship'));
     TestRegistry.register('ship-selection-screen', document.getElementById('ship-selection-screen'));
     TestRegistry.register('ready-button', document.getElementById('ready-button'));
     TestRegistry.register('fire-button', document.getElementById('fire-button'));
     // ... register all interactive elements
   }
   ```

3. **Create Puppeteer helper:**
   ```javascript
   // tests/automated/helpers/registry.js
   async function getElement(page, testId) {
     return await page.$(`[data-test-id="${testId}"]`);
   }

   async function clickElement(page, testId) {
     const element = await getElement(page, testId);
     if (!element) throw new Error(`Element not found: ${testId}`);
     await element.click();
   }

   async function listRegistry(page) {
     return await page.evaluate(() => window.TestRegistry.list());
   }
   ```

**Success Criteria:**
- All buttons and inputs have test IDs
- Puppeteer can find elements reliably
- Dynamic elements (turrets) get registered on creation

---

### Sub-stage 13.3: Remote Control API (2 hours)

**Goal:** Create a server endpoint to control the app remotely

**Why:** Allows tests to trigger actions and inspect state without UI

**Implementation:**

1. **Create `server-test-api.js`:**
   ```javascript
   // Test API for remote control
   class TestAPI {
     constructor(io) {
       this.io = io;
       this.testSessions = new Map();
     }

     // Start a test session
     createSession(sessionId) {
       this.testSessions.set(sessionId, {
         id: sessionId,
         startTime: Date.now(),
         events: []
       });
     }

     // Execute an action
     executeAction(sessionId, action) {
       const session = this.testSessions.get(sessionId);
       if (!session) throw new Error('Session not found');

       switch (action.type) {
         case 'start_combat':
           // Programmatically start a combat
           return this.startCombat(action.params);

         case 'get_combat_state':
           // Return current combat state
           return this.getCombatState(action.params.combatId);

         case 'trigger_turn':
           // Force a turn to execute
           return this.triggerTurn(action.params.combatId, action.params.playerId);

         default:
           throw new Error(`Unknown action: ${action.type}`);
       }
     }

     // Get full state dump
     getState(combatId) {
       const combat = combatStates.get(combatId);
       return {
         combat: combat,
         player1: combat.player1,
         player2: combat.player2,
         missiles: combat.missileTracker.getState(),
         round: combat.round,
         activePlayer: combat.activePlayer
       };
     }
   }
   ```

2. **Add test routes to server.js:**
   ```javascript
   if (process.env.NODE_ENV !== 'production') {
     const testAPI = new TestAPI(io);

     app.post('/test/session', (req, res) => {
       const sessionId = req.body.sessionId || `test_${Date.now()}`;
       testAPI.createSession(sessionId);
       res.json({ sessionId });
     });

     app.post('/test/action', (req, res) => {
       const result = testAPI.executeAction(req.body.sessionId, req.body.action);
       res.json(result);
     });

     app.get('/test/state/:combatId', (req, res) => {
       const state = testAPI.getState(req.params.combatId);
       res.json(state);
     });
   }
   ```

**Success Criteria:**
- Tests can create sessions via HTTP
- Tests can trigger actions programmatically
- Tests can inspect full state including AI data
- Only available in development mode

---

### Sub-stage 13.4: Page Refresh with Timing (1 hour)

**Goal:** Implement automatic page refresh/redirect for testing cycles

**Implementation:**

1. **Add test mode to URL routing:**
   ```javascript
   // In app.js
   const urlParams = new URLSearchParams(window.location.search);
   const testMode = urlParams.get('test');

   if (testMode === 'auto-refresh') {
     const delay = parseInt(urlParams.get('delay') || '5000');
     const target = urlParams.get('target') || window.location.href;

     console.log(`[TEST MODE] Auto-refresh in ${delay}ms to ${target}`);

     setTimeout(() => {
       window.location.href = target;
     }, delay);
   }
   ```

2. **Create Puppeteer helper:**
   ```javascript
   // tests/automated/helpers/refresh.js
   async function waitForServerRestart(page, maxWait = 10000) {
     const startTime = Date.now();

     while (Date.now() - startTime < maxWait) {
       try {
         await page.goto('http://localhost:3000?test=ping');
         return true;
       } catch (err) {
         await new Promise(resolve => setTimeout(resolve, 500));
       }
     }

     return false;
   }

   async function restartServerAndReload(page, restartCommand) {
     // Kill server
     exec('pkill -f "node server.js"');

     // Wait a bit
     await new Promise(resolve => setTimeout(resolve, 1000));

     // Start server
     exec(restartCommand);

     // Wait for server to be ready
     const ready = await waitForServerRestart(page);
     if (!ready) throw new Error('Server failed to restart');

     // Reload page
     await page.reload();
   }
   ```

**Success Criteria:**
- Tests can trigger page refresh with configurable delay
- Tests can detect when server is ready after restart
- Timing is reliable (not flaky)

---

### Sub-stage 13.5: Solo Mode Test Suite (2 hours)

**Goal:** Write automated tests for solo mode to debug AI issues

**Tests:**

1. **`tests/automated/solo-mode.test.js`:**
   ```javascript
   describe('Solo Mode', () => {
     let browser, page;

     beforeAll(async () => {
       browser = await puppeteer.launch({ headless: false });
       page = await browser.newPage();
     });

     afterAll(async () => {
       await browser.close();
     });

     test('Can start solo battle', async () => {
       await page.goto('http://localhost:3000?mode=solo');

       // Select scout
       await clickElement(page, 'ship-option-scout');

       // Select range
       await page.select('#range-select', 'Short');

       // Click ready
       await clickElement(page, 'ready-button');

       // Wait for combat to start
       await page.waitForSelector('[data-test-id="fire-button"]', { timeout: 5000 });

       // Verify we're in combat
       const hud = await page.$('#space-combat-hud');
       expect(hud).toBeTruthy();
     });

     test('AI makes decisions', async () => {
       // Start solo combat (same as above)
       // ...

       // Fire our weapon to end our turn
       await clickElement(page, 'fire-button');

       // Wait for AI turn
       await page.waitForTimeout(2000);

       // Get combat state via test API
       const response = await fetch('http://localhost:3000/test/state/test_combat_1');
       const state = await response.json();

       // Verify AI has weapons
       console.log('AI weapons:', state.player2.weapons);

       // Verify AI made a decision
       expect(state.round).toBeGreaterThan(1);
     });

     test('AI can fire weapons', async () => {
       // ... similar setup

       // Let AI take 5 turns
       for (let i = 0; i < 5; i++) {
         await clickElement(page, 'end-turn-button');
         await page.waitForTimeout(2000);
       }

       // Check combat log for AI attacks
       const log = await page.evaluate(() => {
         return document.getElementById('combat-log').innerText;
       });

       // Verify AI fired at least once
       expect(log).toContain('Free Trader fires');
     });
   });
   ```

**Success Criteria:**
- Tests can start solo mode programmatically
- Tests can inspect AI state
- Tests verify AI fires weapons (when weapon detection is fixed)
- Tests run in <10 seconds

---

### Sub-stage 13.6: Ship Customization Test Suite (2 hours)

**Goal:** Write automated tests for ship customizer

**Tests:**

1. **`tests/automated/ship-customizer.test.js`:**
   ```javascript
   describe('Ship Customizer', () => {
     test('Can load customizer', async () => {
       await page.goto('http://localhost:3000?mode=customize');
       // ...
     });

     test('Can change turret type', async () => {
       // Click turret component
       await page.click('[data-component-type="turret"][data-component-id="turret1"]');

       // Change turret type
       await page.select('#turret-type', 'triple');

       // Verify cost updates
       const cost = await page.evaluate(() => {
         return document.getElementById('turret-cost').textContent;
       });

       expect(cost).toBe('MCr 1.00');
     });

     test('Validates armor limits', async () => {
       // Set armor to 10 (invalid)
       await page.evaluate(() => {
         document.getElementById('armor-slider').value = 10;
       });

       // Try to save
       await clickElement(page, 'save-ship-button');

       // Verify error message
       const alert = await page.$('#validation-alert');
       expect(alert).toBeTruthy();
     });
   });
   ```

---

### Sub-stage 13.7: Cross-Index with Puppeteer (1 hour)

**Goal:** Ensure all elements are findable by both test registry and Puppeteer selectors

**Implementation:**

1. **Create validation script:**
   ```javascript
   // tests/automated/validate-registry.js
   async function validateRegistry(page) {
     const registered = await page.evaluate(() => window.TestRegistry.list());

     const results = {
       total: registered.length,
       found: 0,
       missing: []
     };

     for (const testId of registered) {
       const element = await page.$(`[data-test-id="${testId}"]`);
       if (element) {
         results.found++;
       } else {
         results.missing.push(testId);
       }
     }

     return results;
   }
   ```

2. **Run validation in CI:**
   ```json
   // package.json
   {
     "scripts": {
       "test:auto": "jest tests/automated",
       "test:validate-registry": "node tests/automated/validate-registry.js"
     }
   }
   ```

---

## Testing Strategy

### What to Automate

**High Priority:**
- Solo mode combat flow
- Ship customization validation
- Multiplayer connection setup
- Weapon firing and damage calculation

**Medium Priority:**
- Menu navigation
- Ship selection
- Turn management
- Combat log updates

**Low Priority:**
- CSS styling
- Animations
- Mobile responsiveness

### What to Keep Manual

- Visual appearance
- UX feel
- Performance under load (use separate load testing)

---

## Success Criteria

### Stage 13 Complete When:

1. ✅ Puppeteer installed and working
2. ✅ Element registry system in place
3. ✅ Test API endpoints functional
4. ✅ Page refresh/reload mechanism working
5. ✅ Solo mode test suite written
6. ✅ Ship customizer test suite written
7. ✅ Tests run via `npm run test:auto`
8. ✅ All tests pass
9. ✅ Documentation updated

### Performance Targets:

- Full test suite runs in <60 seconds
- Individual tests run in <10 seconds
- Tests are reliable (not flaky)

---

## File Structure

```
tests/
├── automated/                    # NEW: Automated browser tests
│   ├── setup.js                 # Start server and browser
│   ├── teardown.js              # Stop everything
│   ├── helpers/
│   │   ├── registry.js          # Element registry helpers
│   │   ├── refresh.js           # Page refresh helpers
│   │   └── combat.js            # Combat scenario helpers
│   ├── 01-launch.test.js        # Basic launch test
│   ├── solo-mode.test.js        # Solo mode tests
│   ├── ship-customizer.test.js  # Customizer tests
│   ├── multiplayer.test.js      # Multiplayer tests
│   └── screenshots/             # Test screenshots
├── integration/                  # EXISTING: Integration tests
├── unit/                        # EXISTING: Unit tests
└── performance/                 # FUTURE: Load testing
```

---

## Benefits

### Immediate Benefits:

1. **Debug AI faster:** Can inspect data structures during combat
2. **Test ship customizer:** Automate panel interactions
3. **Catch regressions:** Tests prevent bugs from returning
4. **Development speed:** 10x faster iteration

### Long-term Benefits:

1. **Confidence:** Can refactor without fear
2. **Documentation:** Tests show how features work
3. **Onboarding:** New developers see examples
4. **CI/CD:** Can run tests on every commit

---

## Estimated Time

| Sub-stage | Task | Hours | Notes |
|-----------|------|-------|-------|
| 13.1 | Puppeteer Setup + Verification | 1.5 | Added installation verification step |
| 13.2 | Element Registry + Auto-register | 2.5 | Added auto-registration helpers |
| 13.3 | Remote Control API + Security | 2.5 | Added security checks for production |
| 13.4 | Health Checks + Server Management | 1.5 | Replaced setTimeout with health polling |
| 13.5 | Solo Mode Tests + Wait Strategies | 2.5 | Emphasis on proper wait patterns |
| 13.6 | Ship Customizer Tests | 2 | No change |
| 13.7 | Automated Registry Validation | 2 | Enhanced with CI validation |
| 13.8 | Cleanup + Documentation | 1 | NEW: Security docs, troubleshooting |
| **Total** | | **15.5 hours** | |

**Target:** Complete in 2-3 sessions (5-6 hours each)

**Risk Analysis:** See STAGE-13-RISK-ANALYSIS.md for detailed risk assessment
**Extra Time Justification:** Reduces risk of flaky tests, adds security, automated validation saves time long-term

---

## Next Steps

1. **Session 1 (5-6 hours):**
   - Sub-stages 13.1-13.4 (infrastructure)
   - Get Puppeteer working
   - Build element registry
   - Create test API

2. **Session 2 (5-6 hours):**
   - Sub-stages 13.5-13.7 (tests)
   - Write solo mode tests
   - Write ship customizer tests
   - Validate everything

3. **After Stage 13:**
   - Use automated tests to debug AI weapon detection
   - Resume Stage 12 ship customization
   - Write tests for every new feature

---

## Commands

```bash
# Install Puppeteer
npm install --save-dev puppeteer jest

# Run automated tests
npm run test:auto

# Run specific test file
npx jest tests/automated/solo-mode.test.js

# Run with visible browser (debug mode)
HEADLESS=false npm run test:auto

# Validate element registry
npm run test:validate-registry
```

---

**Ready to begin?**

Start with: *"Begin Stage 13.1: Install Puppeteer and create first test"*

---

## Code Review Checklist (End of Stage 13)

**REMINDER:** Schedule code review session after Stage 13 completion:

1. **Solo Mode Review (from Stage 12.8):**
   - Review AI decision-making implementation
   - Discuss weapon detection bug and solution
   - Evaluate AI turn automation approach
   - Consider future AI improvements

2. **Automated Testing Review:**
   - Review test patterns for best practices
   - Discuss flaky test prevention strategies
   - Evaluate element registry approach
   - Review security implementation for test API

3. **Technical Debt Assessment:**
   - Identify any shortcuts that need revisiting
   - Discuss areas for refactoring
   - Plan improvements for Stage 14+

**User Request:** Ask for code review near end of Stage 13

---

**Last Updated:** 2025-11-12
**Status:** Ready to implement (risk analysis complete)
**Priority:** HIGH - Will accelerate all future development
**Risk Level:** ACCEPTABLE (see STAGE-13-RISK-ANALYSIS.md)
