# Stage 14: Tutorial Wizard & Puppetry Showcase System
## Interactive Tutorials with Storytelling and Drama

**Document Version:** 1.0
**Session:** 6 Planning
**Date:** 2025-11-14
**Author:** Bruce Stephenson

---

## Executive Summary

Stage 14 introduces an **Interactive Tutorial Wizard** system that leverages the Puppetry automation framework to create engaging, story-driven demonstrations and tutorials for new players. This system combines visual automation, modal dialogs, text chat, and mouseover tooltips to create a cinematic, educational experience.

**Key Innovation:** Transform automated testing infrastructure (Puppetry) into an **interactive storytelling engine** that teaches players while entertaining them.

---

## Vision: Storytelling Through Automation

**Concept:** "Show, Don't Tell"

Instead of static documentation or boring step-by-step instructions, the Tutorial Wizard creates **dramatic, narrative-driven experiences** that:
1. **Tell a story** (e.g., "Your scout ship encounters a pirate corsair...")
2. **Show the UI** (automated mouse pointer, highlights, smooth animations)
3. **Explain mechanics** (combat rules, weapon choices, tactics)
4. **Engage the player** (modal dialogs asking "Are you ready?", choices)
5. **Create tension** (dramatic pauses, close-call battles, last-second victories)

---

## Core Components

### 1. Tutorial Mode Toggle
**Location:** Discreet link at page footer
**Appearance:** `🎓 Tutorial Mode` (same style as "About" links)

```html
<!-- Add to footer in index.html, about.html, etc. -->
<footer style="text-align: center; padding: 20px;">
  <a href="/about.html">About</a> •
  <a href="/about-author.html">About the Author</a> •
  <a href="#" id="tutorial-toggle" data-test-id="tutorial-toggle">🎓 Tutorial</a> •
  <a href="https://github.com/energyscholar/traveller-combat-vtt" target="_blank">GitHub</a>
</footer>
```

**Behavior:**
- Click opens Tutorial Selection Modal
- Remembers preference (localStorage)
- Can be disabled mid-tutorial
- Available on all pages

---

### 2. Tutorial Modal Dialog
**Purpose:** Display tutorial narration and prompt player for next steps

**Design:**
```
┌─────────────────────────────────────────────┐
│  🎓 TUTORIAL: First Combat                  │
│  ─────────────────────────────────────────  │
│                                             │
│  [Animated mouse pointer moving]            │
│                                             │
│  Your scout ship has detected a pirate      │
│  corsair at Short range. Your crew is       │
│  experienced, but the corsair has heavier   │
│  armor. This will be a tough fight!         │
│                                             │
│  Let's select our ship and prepare for      │
│  combat...                                  │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ ⏸️  Pause Tutorial                 │    │
│  │ ▶️  Continue (Space)               │    │
│  │ ⏭️  Skip Ahead                     │    │
│  └────────────────────────────────────┘    │
│                                             │
│  [Progress: Step 1 of 12]                  │
└─────────────────────────────────────────────┘
```

**Features:**
- Semi-transparent overlay (backdrop)
- Smooth fade-in/fade-out animations
- Keyboard shortcuts (Space = Continue, Esc = Pause)
- Progress indicator
- Voice-like narration text (readable, conversational)

---

### 3. Animated Mouse Pointer
**Purpose:** Show where the tutorial is "clicking" or "hovering"

**Design:**
```css
.tutorial-pointer {
  position: fixed;
  width: 32px;
  height: 32px;
  background: url('/images/pointer-cursor.svg');
  pointer-events: none;
  z-index: 9999;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.tutorial-pointer.clicking {
  transform: scale(0.9);
  transition: transform 0.1s;
}

.tutorial-pointer::after {
  content: '';
  position: absolute;
  width: 48px;
  height: 48px;
  border: 2px solid #fbbf24;
  border-radius: 50%;
  top: -8px;
  left: -8px;
  animation: pointer-pulse 1.5s infinite;
}

@keyframes pointer-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}
```

**Behavior:**
- Moves smoothly to elements (CSS transitions)
- "Clicks" with scale animation
- Pulse effect when hovering
- Hides when not in use

---

### 4. Mouseover Tooltips
**Purpose:** Explain UI elements as tutorial hovers over them

**Design:**
```
┌─────────────────────────────────────┐
│  [🎯 Fire Button]                   │
│  ───────────────────────────────    │
│  This button fires your selected    │
│  weapon at the target. You can only │
│  fire once per turn, so choose      │
│  wisely!                            │
│                                     │
│  Tip: Pulse lasers (2D6) are good   │
│  at Short range.                    │
└─────────────────────────────────────┘
```

**Features:**
- Appears when tutorial pointer hovers
- Arrow pointing to element
- Context-sensitive help
- Disappears when moving away

---

### 5. Text Chat Integration
**Purpose:** Send tutorial messages to player as "narrator" or "AI instructor"

**Appearance:**
```
┌─────────────────────────────────────┐
│  💬 Tutorial Chat                   │
│  ───────────────────────────────    │
│                                     │
│  🎓 Instructor: Welcome to your     │
│     first space combat!             │
│                                     │
│  🎓 Instructor: The enemy corsair   │
│     has 80 hull points. Your scout  │
│     only has 40. Speed will be      │
│     your advantage!                 │
│                                     │
│  You: [Tutorial mode - chat input   │
│       disabled]                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Tutorial messages appear as "Instructor" or "Narrator"
- Real chat input disabled during tutorial
- Messages timed to match tutorial actions
- Persistent (scrollable history)

**Note:** This feature will be visible but non-functional until Stage 16 (Chat System) is implemented. For now, show placeholder: "Chat coming in Stage 16!"

---

## Tutorial Use Cases

### Use Case 1: "First Blood" - Basic Combat Tutorial
**Story:** Your first encounter with a pirate corsair
**Duration:** 5-7 minutes
**Difficulty:** Beginner

**Narrative:**
```
🎬 ACT 1: ENCOUNTER
──────────────────
Captain, we've detected a pirate corsair at Short range!
Your crew is green, but they're ready for their first fight.

Let's select your ship and prepare for combat...

[Puppetry clicks "Space Battle" button]
[Modal: "Your ship is a Type-S Scout. Fast, but lightly armed."]

🎬 ACT 2: PREPARATION
────────────────────
Now, let's choose our ship. The Scout is perfect for beginners
- it's fast, maneuverable, and has a deadly pulse laser.

[Puppetry highlights Scout card]
[Mouseover tooltip explains: Hull 40, Armor 4, Thrust 2]
[Puppetry clicks Scout]

Starting range is crucial. Let's go with Short - close enough
to use our pulse laser effectively, but not too close.

[Puppetry selects "Short" range]
[Modal: "At Short range, our pulse laser gets +0 DM. Perfect."]

🎬 ACT 3: INITIATIVE
───────────────────
Both players are ready. Rolling initiative...

[Dramatic pause - 2 seconds]
[Dice rolling animation in modal]

You rolled 9! The enemy rolled 7. You act first!

[Modal: "Going first is a huge advantage. Let's make it count!"]

🎬 ACT 4: FIRST STRIKE
─────────────────────
Your gunner, Chen, is ready at the trigger. Let's fire our
pulse laser before the enemy can react!

[Puppetry highlights Fire button]
[Mouseover: "Pulse Laser: 2D6 damage, -1 DM per armor"]

FIRE!

[Puppetry clicks Fire button]
[Combat log: "Pulse laser hits! 8 damage - 4 armor = 4 hull damage!"]
[Modal: "Direct hit! The enemy hull is damaged, but they're still
        fighting..."]

🎬 ACT 5: ENEMY RESPONSE
───────────────────────
The corsair fires back with twin beam lasers!

[Enemy turn animation]
[Combat log: "Enemy beam laser hits! 7 damage - 4 armor = 3 hull damage!"]
[Modal: "We took some damage. Hull at 37/40. This is going to be
        a slugfest!"]

🎬 ACT 6: VICTORY OR DEFEAT
──────────────────────────
[Continue for 3-4 more rounds until one ship is destroyed]

[If player wins:]
🎉 VICTORY! The pirate corsair is destroyed!

Your crew celebrates their first kill. You've earned 2,000 credits
in salvage and the respect of your crew.

[Modal: "Congratulations, Captain! You've completed your first
        combat. Ready for more?"]

[If player loses:]
💥 DEFEAT! Your ship is destroyed...

But don't worry - in the real game, you can eject and try again.
This was just a training exercise!

[Modal: "Every captain loses a battle eventually. Learn from your
        mistakes and try again!"]
```

**Key Learning Objectives:**
1. Ship selection UI
2. Range selection mechanics
3. Initiative system (2D6 + Pilot skill)
4. Firing weapons
5. Damage calculation (weapon damage - armor)
6. Turn-based combat flow

---

### Use Case 2: "Missile Mayhem" - Advanced Weapons Tutorial
**Story:** Defend against a missile-armed patrol corvette
**Duration:** 7-10 minutes
**Difficulty:** Intermediate

**Narrative:**
```
🎬 ACT 1: RED ALERT
──────────────────
PROXIMITY ALERT! Patrol corvette detected at Medium range!

Sensors detect... missile launch! Incoming missile at high speed!

Captain, we need to learn defensive tactics - FAST!

[Modal: "This tutorial teaches missile combat and point defense.
        Missiles are deadly but can be shot down!"]

🎬 ACT 2: POINT DEFENSE
──────────────────────
Your gunner spots the incoming missile. Quick, activate
point defense systems!

[Puppetry highlights "Point Defense" button]
[Mouseover: "Point Defense: 2D6+Gunner ≥ 8 to destroy missile"]

[Dramatic pause - missile getting closer animation]

FIRE!

[Puppetry clicks Point Defense]
[Combat log: "Point defense roll: 9! Missile destroyed!"]
[Modal: "💥 Brilliant! You just saved the ship!"]

🎬 ACT 3: COUNTERATTACK
──────────────────────
Now it's our turn. Let's return fire - with missiles of our own!

[Puppetry clicks "Launch Missile"]
[Modal: "Missiles move 1 range band per round. This one will hit
        next round if they don't shoot it down!"]

🎬 ACT 4: CAT AND MOUSE
──────────────────────
[Continue with missile vs point defense exchanges]
[Show ammo counts decreasing]
[Build tension as both sides run low on missiles]

🎬 ACT 5: OUT OF AMMO
────────────────────
We're out of missiles! But so are they...

Time to close the distance and use our pulse laser!

[Modal: "When missiles run out, switch to energy weapons.
        This is why versatile loadouts matter!"]

[Final climactic close-range laser battle]

🎉 VICTORY!
```

**Key Learning Objectives:**
1. Missile launching mechanics
2. Point defense systems
3. Ammo tracking (missiles & sandcaster)
4. Multi-round combat (missile travel time)
5. Weapon switching strategies
6. Resource management

---

### Use Case 3: "Sandstorm" - Defensive Tactics Tutorial
**Story:** Survive against a heavily-armed close escort
**Duration:** 6-8 minutes
**Difficulty:** Intermediate

**Narrative:**
```
🎬 ACT 1: OUTGUNNED
──────────────────
Captain, we've got a problem. That's a System Defense Boat -
HEAVILY armed with particle beams!

We can't win a straight fight. We need to be clever...

[Modal: "This tutorial teaches sandcaster defense - your best
        friend against superior firepower!"]

🎬 ACT 2: SAND CLOUD
───────────────────
When they fire, deploy sandcasters! The sand cloud will
absorb some of the damage.

[Enemy fires]
[Puppetry clicks "Use Sandcaster"]
[Combat log: "Sandcaster deployed! +2 armor bonus!"]
[Modal: "The sand cloud absorbs the particle beam! Only 3 damage
        taken instead of 8!"]

🎬 ACT 3: HIT AND RUN
────────────────────
Now, while they're recharging, fire back and MOVE!

[Puppetry fires weapon]
[Puppetry clicks movement action - not implemented yet]
[Modal: "Movement coming in Stage 15! For now, just remember:
        speed and defense beat raw firepower!"]

🎬 ACT 4: SURVIVAL
─────────────────
[Continue defensive tactics]
[Show player outlasting enemy through superior defense]
[Close-range finale when enemy's weapons are depleted]

🎉 VICTORY THROUGH TACTICS!
```

**Key Learning Objectives:**
1. Sandcaster defensive use
2. Armor bonus calculation
3. Defensive vs offensive strategies
4. Resource management (sand canisters)
5. Tactical thinking (when to defend, when to attack)

---

### Use Case 4: "The Gauntlet" - Multi-Opponent Scenario
**Story:** Fight through a pirate ambush (3 enemies, waves)
**Duration:** 10-15 minutes
**Difficulty:** Advanced

**Narrative:**
```
🎬 ACT 1: AMBUSH!
────────────────
IT'S A TRAP! Three pirate scouts jump in from hyperspace!

[Modal shows tactical situation: 3 enemies at different ranges]

Captain, we need to prioritize targets. Take out the closest
threat first!

🎬 ACT 2: FIRST BLOOD
────────────────────
[Focus fire on nearest enemy]
[Dramatic combat with running commentary]
[First enemy destroyed]

🎉 One down, two to go!

🎬 ACT 3: DIVIDE AND CONQUER
───────────────────────────
The other two are closing in. We need to keep them separated!

[Use movement and range management - explained in modal]

🎬 ACT 4: FINAL SHOWDOWN
───────────────────────
[Last enemy, low on ammo, low on hull]
[Tense back-and-forth]
[Victory or honorable defeat]

🎉 YOU SURVIVED THE GAUNTLET!
```

**Key Learning Objectives:**
1. Target prioritization
2. Multi-opponent tactics
3. Resource management across multiple fights
4. Movement and positioning (when implemented)
5. Adapting to changing battlefield conditions

---

### Use Case 5: "Showcase Mode" - Feature Demonstration
**Story:** Cinematic demonstration of all features for demos/videos
**Duration:** 3-5 minutes
**Difficulty:** N/A (watch only)

**Purpose:** Marketing, YouTube demos, conference presentations

**Narrative:**
```
🎬 TRAVELLER COMBAT VTT - FULL FEATURE SHOWCASE
──────────────────────────────────────────────

[Ultra-fast puppetry with dramatic music timing]
[Show every feature in rapid succession]

✨ Real-time Multiplayer Combat
  [Two browser windows, synchronized]

⚔️ Multiple Ship Classes
  [Rapid cycling through all 7 ships]

🚀 Advanced Weapons
  [Missiles launching, point defense shooting them down, sandcasters
   deflecting beams]

🎲 Authentic Traveller Rules
  [Dice rolls, armor calculations, damage effects]

📊 Professional UI
  [Smooth animations, status overlays, combat log]

🧪 Fully Tested
  [Quick flash of test results: 197/197 passing]

🚀 PLAY NOW: traveller-vtt.example.com
```

**Use:** Trade shows, YouTube trailers, GitHub README header

---

### Use Case 6: "Easter Egg Hunt" - Hidden Features Tour
**Story:** Fun, whimsical tour of UI details and shortcuts
**Duration:** 5-7 minutes
**Difficulty:** N/A

**Narrative:**
```
🎬 SECRETS OF THE VTT
────────────────────

Welcome, Commander, to the Secret Features Tour!

Did you know you can:

🔍 EASTER EGG #1: KEYBOARD SHORTCUTS
  [Puppetry demonstrates Space = Continue, F = Fire, E = End Turn]

🔍 EASTER EGG #2: HIDDEN STATS
  [Puppetry hovers over ship cards, shows detailed stats]

🔍 EASTER EGG #3: COMBAT LOG TRICKS
  [Puppetry shows how to scroll, filter, export combat log]

🔍 EASTER EGG #4: CREW CUSTOMIZATION
  [Coming in Stage 12!]

🔍 EASTER EGG #5: SHIP TEMPLATES
  [Puppetry navigates to ship template editor]

🔍 EASTER EGG #6: DEVELOPER CONSOLE
  [Puppetry opens browser console, shows debug commands]

🎉 YOU'VE DISCOVERED ALL THE SECRETS!
   (For now...)
```

**Use:** Community engagement, player retention, fun content

---

## Technical Implementation

### Phase 1: Core Infrastructure (6-8h)

#### 1.1: Tutorial Mode Toggle (1h)
```javascript
// public/tutorial.js
class TutorialManager {
  constructor() {
    this.active = false;
    this.currentScenario = null;
    this.currentStep = 0;
    this.paused = false;
  }

  start(scenarioName) {
    this.active = true;
    this.currentScenario = TUTORIAL_SCENARIOS[scenarioName];
    this.currentStep = 0;
    this.showModal(this.currentScenario.steps[0]);
  }

  pause() {
    this.paused = true;
    this.showPauseModal();
  }

  resume() {
    this.paused = false;
    this.hidePauseModal();
  }

  next() {
    if (this.currentStep < this.currentScenario.steps.length - 1) {
      this.currentStep++;
      this.executeStep(this.currentScenario.steps[this.currentStep]);
    } else {
      this.complete();
    }
  }

  executeStep(step) {
    // Show narrative modal
    this.showModal(step);

    // Move animated pointer
    if (step.pointer) {
      this.movePointer(step.pointer.target, step.pointer.duration);
    }

    // Show tooltip
    if (step.tooltip) {
      this.showTooltip(step.tooltip.element, step.tooltip.text);
    }

    // Execute action (if automated)
    if (step.action) {
      setTimeout(() => {
        this.performAction(step.action);
      }, step.action.delay || 2000);
    }

    // Send chat message
    if (step.chatMessage) {
      this.sendTutorialChat(step.chatMessage);
    }
  }

  complete() {
    this.active = false;
    this.showCompletionModal();
  }
}

// Initialize on page load
const tutorialManager = new TutorialManager();
```

#### 1.2: Tutorial Modal Component (2h)
```javascript
// public/components/TutorialModal.js
class TutorialModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
  }

  create() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      display: none;
      animation: fade-in 0.3s;
    `;

    // Create modal
    this.modal = document.createElement('div');
    this.modal.id = 'tutorial-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-height: 80vh;
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border: 2px solid #667eea;
      border-radius: 12px;
      padding: 30px;
      z-index: 9999;
      display: none;
      animation: slide-in 0.3s;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);
  }

  show(step) {
    this.overlay.style.display = 'block';
    this.modal.style.display = 'block';

    this.modal.innerHTML = `
      <div class="tutorial-header">
        <h2>🎓 ${step.title}</h2>
      </div>
      <div class="tutorial-content">
        <p>${step.narration}</p>
        ${step.image ? `<img src="${step.image}" alt="Tutorial step" />` : ''}
      </div>
      <div class="tutorial-controls">
        <button id="tutorial-pause" class="tutorial-btn secondary">⏸️ Pause</button>
        <button id="tutorial-continue" class="tutorial-btn primary">▶️ Continue (Space)</button>
        <button id="tutorial-skip" class="tutorial-btn secondary">⏭️ Skip</button>
      </div>
      <div class="tutorial-progress">
        Step ${step.index + 1} of ${step.total}
      </div>
    `;

    // Attach event listeners
    document.getElementById('tutorial-pause').onclick = () => tutorialManager.pause();
    document.getElementById('tutorial-continue').onclick = () => tutorialManager.next();
    document.getElementById('tutorial-skip').onclick = () => tutorialManager.complete();

    // Keyboard shortcuts
    document.onkeydown = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        tutorialManager.next();
      } else if (e.key === 'Escape') {
        tutorialManager.pause();
      }
    };
  }

  hide() {
    this.overlay.style.display = 'none';
    this.modal.style.display = 'none';
  }
}
```

#### 1.3: Animated Pointer Component (2h)
```javascript
// public/components/AnimatedPointer.js
class AnimatedPointer {
  constructor() {
    this.pointer = null;
    this.create();
  }

  create() {
    this.pointer = document.createElement('div');
    this.pointer.className = 'tutorial-pointer';
    this.pointer.style.cssText = `
      position: fixed;
      width: 32px;
      height: 32px;
      background: url('/images/pointer.svg') no-repeat center;
      background-size: contain;
      pointer-events: none;
      z-index: 10000;
      display: none;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
    `;

    // Add pulse ring
    this.pointer.innerHTML = '<div class="pointer-ring"></div>';

    document.body.appendChild(this.pointer);
  }

  show() {
    this.pointer.style.display = 'block';
  }

  hide() {
    this.pointer.style.display = 'none';
  }

  moveTo(element, duration = 500) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    this.pointer.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    this.pointer.style.left = `${x}px`;
    this.pointer.style.top = `${y}px`;
  }

  click() {
    this.pointer.classList.add('clicking');
    setTimeout(() => {
      this.pointer.classList.remove('clicking');
    }, 150);
  }

  async moveAndClick(element, { moveDuration = 500, clickDelay = 300 } = {}) {
    this.show();
    await this.moveTo(element, moveDuration);
    await new Promise(resolve => setTimeout(resolve, clickDelay));
    this.click();
    await new Promise(resolve => setTimeout(resolve, 200));
    element.click(); // Actual click
  }
}
```

#### 1.4: Mouseover Tooltip Component (1h)
```javascript
// public/components/TutorialTooltip.js
class TutorialTooltip {
  constructor() {
    this.tooltip = null;
    this.create();
  }

  create() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tutorial-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      max-width: 300px;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 15px;
      font-size: 14px;
      color: #fff;
      z-index: 9999;
      display: none;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    document.body.appendChild(this.tooltip);
  }

  show(element, text) {
    const rect = element.getBoundingClientRect();

    this.tooltip.innerHTML = text;
    this.tooltip.style.display = 'block';

    // Position above element
    this.tooltip.style.left = `${rect.left + rect.width / 2 - 150}px`;
    this.tooltip.style.top = `${rect.top - this.tooltip.offsetHeight - 10}px`;

    // Add arrow
    this.tooltip.innerHTML += '<div class="tooltip-arrow"></div>';
  }

  hide() {
    this.tooltip.style.display = 'none';
  }
}
```

#### 1.5: Tutorial Chat Integration (1-2h)
```javascript
// public/components/TutorialChat.js
class TutorialChat {
  constructor() {
    this.chatBox = null;
    this.messageQueue = [];
  }

  initialize() {
    // Create chat box (Stage 16 placeholder)
    this.chatBox = document.createElement('div');
    this.chatBox.id = 'tutorial-chat';
    this.chatBox.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      height: 200px;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 15px;
      z-index: 9997;
      display: none;
      overflow-y: auto;
    `;

    this.chatBox.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #888;">
        <p>💬 Tutorial Chat</p>
        <p style="font-size: 0.9em;">Coming in Stage 16!</p>
      </div>
    `;

    document.body.appendChild(this.chatBox);
  }

  show() {
    this.chatBox.style.display = 'block';
  }

  hide() {
    this.chatBox.style.display = 'none';
  }

  sendMessage(sender, text, { delay = 0, typing = true } = {}) {
    setTimeout(() => {
      if (typing) {
        this.showTypingIndicator(sender);
        setTimeout(() => {
          this.addMessage(sender, text);
        }, 1000 + text.length * 30); // Typing speed
      } else {
        this.addMessage(sender, text);
      }
    }, delay);
  }

  showTypingIndicator(sender) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <strong>${sender}:</strong> <span class="dots">...</span>
    `;
    this.chatBox.appendChild(indicator);
  }

  addMessage(sender, text) {
    // Remove typing indicator
    const indicator = this.chatBox.querySelector('.typing-indicator');
    if (indicator) indicator.remove();

    // Add message
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>${sender}:</strong> ${text}
      </div>
    `;
    this.chatBox.appendChild(message);

    // Auto-scroll
    this.chatBox.scrollTop = this.chatBox.scrollHeight;
  }
}
```

---

### Phase 2: Tutorial Scenarios (4-6h)

#### 2.1: Scenario Definition Format
```javascript
// public/tutorial-scenarios.js
const TUTORIAL_SCENARIOS = {
  'first-blood': {
    id: 'first-blood',
    title: 'First Blood - Basic Combat',
    description: 'Your first encounter with a pirate corsair',
    duration: '5-7 minutes',
    difficulty: 'beginner',
    prerequisites: [],

    steps: [
      {
        index: 0,
        total: 12,
        title: 'ACT 1: ENCOUNTER',
        narration: `
          Captain, we've detected a pirate corsair at Short range!
          Your crew is green, but they're ready for their first fight.

          Let's select your ship and prepare for combat...
        `,
        pointer: {
          target: '[data-test-id="btn-space-battle"]',
          duration: 800
        },
        tooltip: null,
        action: {
          type: 'click',
          target: '[data-test-id="btn-space-battle"]',
          delay: 2000
        },
        chatMessage: {
          sender: 'Instructor',
          text: 'Welcome to your first space combat!',
          delay: 500
        },
        wait: {
          selector: '[data-test-id="ship-option-scout"]'
        }
      },

      {
        index: 1,
        total: 12,
        title: 'ACT 1: SHIP SELECTION',
        narration: `
          Now, let's choose our ship. The Scout is perfect for beginners -
          it's fast, maneuverable, and has a deadly pulse laser.
        `,
        pointer: {
          target: '[data-test-id="ship-option-scout"]',
          duration: 600
        },
        tooltip: {
          element: '[data-test-id="ship-option-scout"]',
          text: `
            <strong>Type-S Scout/Courier</strong><br>
            Hull: 40<br>
            Armor: 4<br>
            Thrust: 2<br>
            Weapons: Pulse Laser, Sandcaster, Missiles
            <br><br>
            <em>Tip: Fast ships can choose their engagement range!</em>
          `
        },
        action: {
          type: 'click',
          target: '[data-test-id="ship-option-scout"]',
          delay: 3000
        },
        chatMessage: {
          sender: 'Instructor',
          text: 'The Scout is the perfect ship for learning the ropes.',
          delay: 1000
        }
      },

      // ... more steps ...

      {
        index: 11,
        total: 12,
        title: 'VICTORY!',
        narration: `
          🎉 VICTORY! The pirate corsair is destroyed!

          Your crew celebrates their first kill. You've earned 2,000 credits
          in salvage and the respect of your crew.

          Congratulations, Captain! You've completed your first combat.
          Ready for more challenging battles?
        `,
        pointer: null,
        action: null,
        chatMessage: {
          sender: 'Crew',
          text: '🎉 We did it, Captain! First blood!',
          delay: 500
        }
      }
    ]
  },

  'missile-mayhem': {
    // ... similar structure ...
  },

  'sandstorm': {
    // ... similar structure ...
  }
};
```

#### 2.2: Scenario Player (2h)
```javascript
// public/tutorial-player.js
class TutorialPlayer {
  constructor(scenario) {
    this.scenario = scenario;
    this.currentStep = 0;
    this.modal = new TutorialModal();
    this.pointer = new AnimatedPointer();
    this.tooltip = new TutorialTooltip();
    this.chat = new TutorialChat();
  }

  async start() {
    this.modal.create();
    this.chat.initialize();
    this.chat.show();

    await this.playStep(0);
  }

  async playStep(index) {
    if (index >= this.scenario.steps.length) {
      this.complete();
      return;
    }

    const step = this.scenario.steps[index];
    step.index = index;
    step.total = this.scenario.steps.length;

    // Show modal with narration
    this.modal.show(step);

    // Show tooltip if specified
    if (step.tooltip) {
      const element = document.querySelector(step.tooltip.element);
      if (element) {
        this.tooltip.show(element, step.tooltip.text);
      }
    }

    // Move pointer if specified
    if (step.pointer) {
      const element = document.querySelector(step.pointer.target);
      if (element) {
        await this.pointer.moveTo(element, step.pointer.duration);
      }
    }

    // Send chat message if specified
    if (step.chatMessage) {
      this.chat.sendMessage(
        step.chatMessage.sender,
        step.chatMessage.text,
        { delay: step.chatMessage.delay }
      );
    }

    // Execute action if specified (automated)
    if (step.action) {
      setTimeout(async () => {
        const element = document.querySelector(step.action.target);
        if (element) {
          await this.pointer.moveAndClick(element);

          // Wait for any specified conditions
          if (step.wait) {
            await this.waitFor(step.wait);
          }

          // Auto-advance to next step
          this.currentStep++;
          await this.playStep(this.currentStep);
        }
      }, step.action.delay || 2000);
    }
  }

  async waitFor(condition) {
    if (condition.selector) {
      return new Promise((resolve) => {
        const checkElement = () => {
          if (document.querySelector(condition.selector)) {
            resolve();
          } else {
            setTimeout(checkElement, 100);
          }
        };
        checkElement();
      });
    } else if (condition.timeout) {
      return new Promise(resolve => setTimeout(resolve, condition.timeout));
    }
  }

  complete() {
    this.modal.show({
      title: '🎉 Tutorial Complete!',
      narration: `
        Congratulations! You've completed the "${this.scenario.title}" tutorial.

        You've learned:
        ${this.scenario.learningObjectives.map(obj => `• ${obj}`).join('\n')}

        Ready for more? Try another tutorial or jump into a real battle!
      `,
      controls: [
        { label: 'More Tutorials', action: () => this.showTutorialMenu() },
        { label: 'Start Battle', action: () => window.location.href = '/' }
      ]
    });

    this.pointer.hide();
    this.tooltip.hide();
    this.chat.hide();
  }
}
```

---

### Phase 3: Integration & Polish (2-3h)

#### 3.1: Add Tutorial Toggle to All Pages (30min)
```html
<!-- Update footer in index.html, about.html, ship-templates.html, etc. -->
<footer style="text-align: center; padding: 20px; margin-top: 20px; border-top: 1px solid #333;">
  <a href="/about.html">About</a> •
  <a href="/about-author.html">About the Author</a> •
  <a href="#" id="tutorial-toggle" onclick="showTutorialMenu()">🎓 Tutorial</a> •
  <a href="https://github.com/energyscholar/traveller-combat-vtt" target="_blank">GitHub</a>
</footer>

<script>
function showTutorialMenu() {
  const modal = new TutorialSelectionModal();
  modal.show(TUTORIAL_SCENARIOS);
}
</script>
```

#### 3.2: Tutorial Selection Menu (1h)
```javascript
// public/tutorial-selection.js
class TutorialSelectionModal {
  show(scenarios) {
    const modal = document.createElement('div');
    modal.id = 'tutorial-selection-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      max-height: 80vh;
      background: #1a1a1a;
      border: 2px solid #667eea;
      border-radius: 12px;
      padding: 30px;
      z-index: 9999;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <h2>🎓 Choose Your Tutorial</h2>
      <div class="tutorial-grid">
        ${Object.values(scenarios).map(scenario => `
          <div class="tutorial-card" onclick="startTutorial('${scenario.id}')">
            <h3>${scenario.title}</h3>
            <p>${scenario.description}</p>
            <div class="tutorial-meta">
              <span>⏱️ ${scenario.duration}</span>
              <span>📊 ${scenario.difficulty}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <button onclick="this.parentElement.remove()">Close</button>
    `;

    document.body.appendChild(modal);
  }
}

function startTutorial(scenarioId) {
  const scenario = TUTORIAL_SCENARIOS[scenarioId];
  const player = new TutorialPlayer(scenario);
  player.start();
}
```

#### 3.3: CSS Styling & Animations (1h)
```css
/* public/tutorial.css */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

@keyframes pointer-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.tutorial-pointer {
  position: fixed;
  width: 32px;
  height: 32px;
  background: url('/images/pointer.svg') no-repeat center;
  background-size: contain;
  pointer-events: none;
  z-index: 10000;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.tutorial-pointer.clicking {
  transform: scale(0.9);
  transition: transform 0.1s;
}

.pointer-ring {
  position: absolute;
  width: 48px;
  height: 48px;
  border: 2px solid #fbbf24;
  border-radius: 50%;
  top: -8px;
  left: -8px;
  animation: pointer-pulse 1.5s infinite;
}

.tutorial-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.tutorial-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tutorial-meta {
  display: flex;
  gap: 15px;
  margin-top: 10px;
  font-size: 0.9em;
  color: #888;
}

.tutorial-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s;
}

.tutorial-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tutorial-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.tutorial-btn.secondary {
  background: #333;
  color: #ccc;
}

.tutorial-btn.secondary:hover {
  background: #444;
}
```

---

## Testing & Validation

### Manual Testing Checklist
- [ ] Tutorial toggle appears in footer
- [ ] Tutorial selection modal opens correctly
- [ ] Animated pointer moves smoothly
- [ ] Pointer clicks at correct positions
- [ ] Tooltips appear and disappear correctly
- [ ] Modal narration displays properly
- [ ] Keyboard shortcuts work (Space, Esc)
- [ ] Progress indicator updates
- [ ] Chat messages appear (placeholder)
- [ ] Tutorial can be paused and resumed
- [ ] Tutorial can be skipped
- [ ] Tutorial completes successfully
- [ ] Multiple tutorials can be run sequentially
- [ ] No conflicts with regular game UI
- [ ] Works on desktop and mobile

### Automated Testing
```javascript
// tests/tutorial/tutorial.test.js
describe('Tutorial System', () => {
  it('should load tutorial scenarios', () => {
    expect(TUTORIAL_SCENARIOS).toBeDefined();
    expect(TUTORIAL_SCENARIOS['first-blood']).toBeDefined();
  });

  it('should create tutorial components', () => {
    const modal = new TutorialModal();
    const pointer = new AnimatedPointer();
    const tooltip = new TutorialTooltip();
    const chat = new TutorialChat();

    expect(modal).toBeDefined();
    expect(pointer).toBeDefined();
    expect(tooltip).toBeDefined();
    expect(chat).toBeDefined();
  });

  it('should play tutorial scenario', async () => {
    const scenario = TUTORIAL_SCENARIOS['first-blood'];
    const player = new TutorialPlayer(scenario);

    await player.start();
    expect(player.currentStep).toBe(0);
  });

  it('should advance to next step', async () => {
    const player = new TutorialPlayer(TUTORIAL_SCENARIOS['first-blood']);
    await player.start();
    await player.playStep(1);

    expect(player.currentStep).toBe(1);
  });

  it('should complete tutorial', async () => {
    const player = new TutorialPlayer(TUTORIAL_SCENARIOS['first-blood']);
    await player.start();

    // Fast-forward to completion
    player.currentStep = player.scenario.steps.length - 1;
    await player.complete();

    expect(player.completed).toBe(true);
  });
});
```

---

## Future Enhancements (Stage 16+)

### Stage 16: Chat Integration
- Full text chat implementation
- Tutorial messages in real chat system
- Player can ask questions to AI instructor
- Context-aware help based on tutorial progress

### Stage 17: Voice Narration
- Text-to-speech for tutorial narration
- Adjustable voice speed and volume
- Multiple narrator voices (male/female, accents)
- Optional background music

### Stage 18: Multiplayer Tutorials
- 2-player co-op tutorials
- Instructor mode (experienced player teaches new player)
- Synchronized puppetry for both players
- Competitive training scenarios

### Stage 19: Community Tutorials
- User-generated tutorial scenarios
- Tutorial editor UI
- Share tutorials via JSON export
- Tutorial marketplace / gallery

### Stage 20: Analytics & A/B Testing
- Track tutorial completion rates
- Identify drop-off points
- A/B test different narration styles
- Optimize tutorial flow based on data

---

## Success Metrics

### Player Engagement
- ✅ 80%+ players complete "First Blood" tutorial
- ✅ 50%+ players try "Missile Mayhem" after completing first tutorial
- ✅ Average tutorial watch time: 5-7 minutes (full completion)
- ✅ <10% skip rate (players enjoy the experience)

### Educational Effectiveness
- ✅ 90%+ players understand basic combat after tutorial
- ✅ 70%+ players can explain missile mechanics after "Missile Mayhem"
- ✅ 60%+ players use sandcasters effectively after "Sandstorm"

### Technical Performance
- ✅ Tutorial loads in <2 seconds
- ✅ Smooth 60fps animations
- ✅ No crashes during tutorial playback
- ✅ Works on 95%+ of browsers (Chrome, Firefox, Safari, Edge)

### Marketing Impact
- ✅ Showcase video gets 10,000+ views on YouTube
- ✅ 50%+ increase in GitHub stars after showcase release
- ✅ Featured on /r/traveller subreddit
- ✅ Positive feedback from Mongoose Publishing community

---

## Timeline & Resource Estimate

### Phase 1: Core Infrastructure (6-8h)
- Week 1, Session 7
- Components: Modal, Pointer, Tooltip, Chat

### Phase 2: Tutorial Scenarios (4-6h)
- Week 2, Session 8
- Scenarios: First Blood, Missile Mayhem, Sandstorm

### Phase 3: Integration & Polish (2-3h)
- Week 2, Session 8 (continued)
- Footer toggle, CSS, testing

### Phase 4: Additional Use Cases (2-3h)
- Week 3, Session 9
- Showcase mode, Easter egg hunt, Gauntlet

**Total Estimated Time:** 14-20 hours over 3 sessions

**Recommended Staging:**
- Session 7: Core infrastructure
- Session 8: First 3 tutorials + integration
- Session 9: Advanced use cases + marketing content

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pointer animation jank | Medium | Low | Use CSS transforms, 60fps target |
| Modal blocks game UI | Low | Medium | Proper z-index, escape key to close |
| Tutorial desync from UI | Medium | High | Robust wait conditions, error handling |
| Player boredom (long tutorials) | Medium | High | Keep tutorials 5-7 min, skippable |
| Mobile compatibility | High | Medium | Responsive design, touch events |
| Chat placeholder confusing | Low | Low | Clear "Coming in Stage 16" message |

---

## Next Steps

1. **Session 7:** Implement core infrastructure (modal, pointer, tooltip)
2. **Session 8:** Create first 3 tutorial scenarios
3. **Session 9:** Polish and add marketing use cases
4. **Session 10+:** Iterate based on user feedback

**Priority:** High (enhances player onboarding and provides marketing content)

---

**Document End**

🎓 Tutorial Wizard System - Transforming automation into education and entertainment!
