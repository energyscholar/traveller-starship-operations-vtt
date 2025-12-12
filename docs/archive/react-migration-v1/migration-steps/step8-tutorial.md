# Step 8: Tutorial System (Final Migration Step)

## Objective
Migrate the interactive tutorial system from vanilla JS to React. This is the most complex step as tutorials must persist across screen navigation and interact with combat state. **This was the original reason for the React migration** - to prevent tutorial modal from disappearing during screen changes.

## Prerequisites
- [x] Step 1 complete (foundation)
- [x] Step 2 complete (infrastructure)
- [x] Step 3 complete (main menu)
- [x] Step 4 complete (ship selection)
- [x] Step 5 complete (combat display)
- [x] Step 6 complete (combat actions)
- [x] On `react-refactor` branch

**Note:** Step 7 (customizer) is optional and not required for tutorial migration.

## Branch Strategy
Continue on `react-refactor` branch. This is the FINAL step before merging to main.

## Implementation Details

### 8.1 Analyze Existing Tutorial System
**Source:** `public/tutorial-*.js` files

Key components:
- **TutorialModal**: Main modal overlay
- **TutorialPointer**: Animated pointer to UI elements
- **TutorialTooltip**: Tooltip near pointer
- **TutorialChat**: Chat-style instruction display
- **TutorialPlayer**: Orchestrates tutorial steps
- **TutorialScenarios**: Tutorial step definitions

**Critical requirement:** Tutorial must stay mounted during navigation (main menu → ship selection → combat).

### 8.2 Create Tutorial Context
**File:** `client/src/context/TutorialContext.tsx`

```typescript
import { createContext, useState, useContext, ReactNode } from 'react';

interface TutorialStep {
  message: string;
  pointer?: {
    target: string; // CSS selector
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  action?: 'click' | 'wait' | 'navigate';
  waitFor?: string; // Event or condition
  nextRoute?: string; // Navigate to this route
}

interface TutorialScenario {
  id: string;
  name: string;
  steps: TutorialStep[];
}

interface TutorialContextType {
  isActive: boolean;
  currentScenario: string | null;
  currentStep: number;
  startTutorial: (scenarioId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  exitTutorial: () => void;
  getCurrentStep: () => TutorialStep | null;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

// Tutorial scenarios
const SCENARIOS: Record<string, TutorialScenario> = {
  'first-blood': {
    id: 'first-blood',
    name: 'First Blood Tutorial',
    steps: [
      {
        message: 'Welcome to Traveller Combat VTT! This tutorial will guide you through your first space battle.',
        action: 'wait',
      },
      {
        message: 'First, let\'s start a solo battle against the AI.',
        pointer: {
          target: '[data-test-id="btn-solo-battle"]',
          position: 'bottom',
        },
        action: 'click',
        nextRoute: '/ship-selection',
      },
      {
        message: 'Now, select a ship for combat. The Scout Ship is a good choice for beginners.',
        pointer: {
          target: '[data-test-id^="ship-card"]',
          position: 'top',
        },
        action: 'click',
      },
      {
        message: 'Click the Ready button when you\'re ready to begin combat.',
        pointer: {
          target: '[data-test-id="btn-ready"]',
          position: 'top',
        },
        action: 'click',
        nextRoute: '/combat',
      },
      {
        message: 'Welcome to the combat screen! This is where the battle takes place.',
        action: 'wait',
      },
      {
        message: 'When it\'s your turn, you can fire weapons, dodge, or use defensive systems.',
        pointer: {
          target: '[data-test-id="weapon-panel"]',
          position: 'top',
        },
        action: 'wait',
      },
      {
        message: 'Let\'s fire a weapon! Click the FIRE button.',
        pointer: {
          target: '[data-test-id="btn-fire"]',
          position: 'top',
        },
        action: 'click',
      },
      {
        message: 'Great shot! Now end your turn so the opponent can act.',
        pointer: {
          target: '[data-test-id="btn-end-turn"]',
          position: 'top',
        },
        action: 'click',
      },
      {
        message: 'Tutorial complete! You now know the basics of space combat. Continue fighting to victory!',
        action: 'wait',
      },
    ],
  },
};

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const startTutorial = (scenarioId: string) => {
    if (SCENARIOS[scenarioId]) {
      setCurrentScenario(scenarioId);
      setCurrentStep(0);
      setIsActive(true);
    }
  };

  const nextStep = () => {
    if (!currentScenario) return;
    const scenario = SCENARIOS[currentScenario];
    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      exitTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const exitTutorial = () => {
    setIsActive(false);
    setCurrentScenario(null);
    setCurrentStep(0);
  };

  const getCurrentStep = (): TutorialStep | null => {
    if (!currentScenario) return null;
    return SCENARIOS[currentScenario].steps[currentStep] || null;
  };

  const value: TutorialContextType = {
    isActive,
    currentScenario,
    currentStep,
    startTutorial,
    nextStep,
    previousStep,
    exitTutorial,
    getCurrentStep,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export default TutorialContext;
```

### 8.3 Create Tutorial Components
**File:** `client/src/components/tutorial/TutorialModal.tsx`

```typescript
import { useTutorial } from '../../context/TutorialContext';
import { useNavigate } from 'react-router-dom';

export default function TutorialModal() {
  const { isActive, getCurrentStep, nextStep, exitTutorial } = useTutorial();
  const navigate = useNavigate();

  if (!isActive) return null;

  const step = getCurrentStep();
  if (!step) return null;

  const handleNext = () => {
    if (step.nextRoute) {
      navigate(step.nextRoute);
    }
    nextStep();
  };

  return (
    <div className="tutorial-modal-overlay" data-test-id="tutorial-modal">
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <h3>Tutorial</h3>
          <button
            className="tutorial-close"
            onClick={exitTutorial}
            data-test-id="btn-tutorial-exit"
          >
            ✕
          </button>
        </div>

        <div className="tutorial-content">
          <p>{step.message}</p>
        </div>

        <div className="tutorial-footer">
          <button
            className="tutorial-button"
            onClick={handleNext}
            data-test-id="btn-tutorial-next"
          >
            {step.action === 'click' ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**File:** `client/src/components/tutorial/TutorialPointer.tsx`

```typescript
import { useEffect, useState, useRef } from 'react';
import { useTutorial } from '../../context/TutorialContext';

export default function TutorialPointer() {
  const { isActive, getCurrentStep } = useTutorial();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const pointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      return;
    }

    const step = getCurrentStep();
    if (!step || !step.pointer) {
      setVisible(false);
      return;
    }

    // Find target element
    const targetElement = document.querySelector(step.pointer.target);
    if (!targetElement) {
      setVisible(false);
      return;
    }

    // Calculate position
    const rect = targetElement.getBoundingClientRect();
    const pointerPosition = step.pointer.position || 'top';

    let top = 0;
    let left = 0;

    switch (pointerPosition) {
      case 'top':
        top = rect.top - 60;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 60;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 20;
        break;
    }

    setPosition({ top, left });
    setVisible(true);
  }, [isActive, getCurrentStep]);

  if (!visible) return null;

  return (
    <div
      ref={pointerRef}
      className="tutorial-pointer"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10001,
      }}
      data-test-id="tutorial-pointer"
    >
      <div className="pointer-arrow">👆</div>
      <div className="pointer-ring" />
    </div>
  );
}
```

**File:** `client/src/components/tutorial/TutorialOverlay.tsx`

```typescript
import TutorialModal from './TutorialModal';
import TutorialPointer from './TutorialPointer';
import { useTutorial } from '../../context/TutorialContext';

export default function TutorialOverlay() {
  const { isActive } = useTutorial();

  if (!isActive) return null;

  return (
    <>
      <TutorialModal />
      <TutorialPointer />
    </>
  );
}
```

### 8.4 Update App.tsx to Include Tutorial
**File:** `client/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { TutorialProvider } from './context/TutorialContext';
import TutorialOverlay from './components/tutorial/TutorialOverlay';
import MainMenu from './components/MainMenu';
import ShipSelection from './components/ShipSelection';
import CombatScreen from './components/CombatScreen';
import Customizer from './components/Customizer';
import './App.css';

function App() {
  return (
    <GameProvider>
      <TutorialProvider>
        <BrowserRouter>
          {/* Tutorial overlay stays mounted across all routes */}
          <TutorialOverlay />

          <div className="app-container">
            <Routes>
              <Route path="/" element={<MainMenu />} />
              <Route path="/ship-selection" element={<ShipSelection />} />
              <Route path="/combat" element={<CombatScreen />} />
              <Route path="/customizer" element={<Customizer />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Routes>
          </div>
        </BrowserRouter>
      </TutorialProvider>
    </GameProvider>
  );
}

export default App;
```

**KEY FEATURE:** `<TutorialOverlay />` is mounted ONCE at app level, outside `<Routes>`. It persists across all navigation!

### 8.5 Update MainMenu to Start Tutorial
**File:** `client/src/components/MainMenu.tsx`

Add tutorial functionality:

```typescript
import { useTutorial } from '../context/TutorialContext';

// Inside MainMenu component:
const { startTutorial } = useTutorial();

const handleTutorial = (scenario: string) => {
  startTutorial(scenario);
};

// Tutorial buttons already have onClick handlers from Step 3
```

### 8.6 Add Tutorial CSS
**File:** `client/src/tutorial.css` (update existing or create)

```css
/* Tutorial Modal Overlay */
.tutorial-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.tutorial-modal {
  background: #1a1a1a;
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #00ff00;
}

.tutorial-header h3 {
  color: #00ff00;
  margin: 0;
}

.tutorial-close {
  background: none;
  border: none;
  color: #ff0000;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  line-height: 1;
}

.tutorial-close:hover {
  color: #ff4444;
}

.tutorial-content {
  margin: 1.5rem 0;
  font-size: 1.1rem;
  line-height: 1.6;
  color: #ddd;
}

.tutorial-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.tutorial-button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: #00aa00;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.tutorial-button:hover {
  background: #00cc00;
}

/* Tutorial Pointer */
.tutorial-pointer {
  pointer-events: none;
  animation: tutorial-bounce 1s ease-in-out infinite;
}

.pointer-arrow {
  font-size: 3rem;
  text-align: center;
  filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.8));
}

.pointer-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 3px solid #ffff00;
  border-radius: 50%;
  animation: tutorial-pulse 2s ease-in-out infinite;
}

@keyframes tutorial-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes tutorial-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}
```

## Tests to Add

### Test 1: Tutorial Starts
```bash
# Main menu → Click "First Blood Tutorial"
# Should show tutorial modal
# Should show first message
```

### Test 2: Tutorial Persists During Navigation
```bash
# Start tutorial
# Click "Next" to navigate to ship selection
# Tutorial modal should STAY VISIBLE
# No page reload
# Tutorial pointer should update to new target
```

### Test 3: Tutorial Steps Through Combat
```bash
# Follow entire tutorial flow:
# 1. Main menu → Solo battle
# 2. Ship selection → Select ship → Ready
# 3. Combat → Fire weapon → End turn
# Tutorial should guide through all steps
# Modal should never disappear
```

### Test 4: Tutorial Exit
```bash
# Start tutorial
# Click X (exit button)
# Tutorial should close
# Should be able to use app normally
```

### Test 5: Tutorial Pointer Positioning
```bash
# Tutorial points to UI element
# Pointer should appear near element
# Pointer should be visible (not off-screen)
# Pointer should animate (bounce + pulse)
```

## Success Criteria

- [ ] TutorialContext created
- [ ] TutorialModal component created
- [ ] TutorialPointer component created
- [ ] TutorialOverlay integrated in App.tsx
- [ ] Tutorial starts from main menu
- [ ] Tutorial modal persists across navigation
- [ ] Tutorial pointer updates to target elements
- [ ] Tutorial can be exited
- [ ] Tutorial steps advance correctly
- [ ] Tutorial completes successfully
- [ ] All animations work (bounce, pulse)
- [ ] No TypeScript errors
- [ ] No console errors

## Cleanup Checklist

**After Step 8 completes:**
- [ ] Delete `migration-staging/` directory
- [ ] Delete `audit/` directory
- [ ] Remove any debug logging
- [ ] Clean up temporary test code

**This is the FINAL migration step!**

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix and continue
# This is the final step - worth debugging

# Option 2: Rollback to Step 6
git reset --hard HEAD~2  # Undo Step 7 and 8

# Option 3: Abandon entire migration
git checkout main
git branch -D react-refactor
# Document lessons in REACT-MIGRATION-FAILURES.txt
```

## Time Estimate

- **Minimum:** 2 hours (basic tutorial)
- **Expected:** 3-4 hours (with pointer positioning and testing)
- **Maximum:** 5 hours (if pointer positioning issues or step orchestration problems)

## Common Issues

### Issue 1: Tutorial Modal Disappears on Navigation
**Error:** Modal vanishes when route changes

**Fix:**
- Ensure `<TutorialOverlay />` is OUTSIDE `<Routes>`
- Verify TutorialProvider wraps BrowserRouter
- Check tutorial state persists across renders

### Issue 2: Pointer Not Positioning Correctly
**Error:** Pointer appears in wrong location or not at all

**Fix:**
```typescript
// Add error handling for missing elements
const targetElement = document.querySelector(step.pointer.target);
if (!targetElement) {
  console.warn('Tutorial target not found:', step.pointer.target);
  setVisible(false);
  return;
}

// Add delay for elements to render
setTimeout(() => {
  const rect = targetElement.getBoundingClientRect();
  // ... position calculation
}, 100);
```

### Issue 3: Tutorial Steps Don't Advance
**Error:** Clicking next doesn't move to next step

**Fix:**
- Verify nextStep() is called
- Check scenario has more steps
- Debug currentStep state value

### Issue 4: Tutorial Pointer Off-Screen
**Error:** Pointer appears outside viewport

**Fix:**
```typescript
// Add viewport bounds checking
let top = Math.max(20, Math.min(window.innerHeight - 80, calculatedTop));
let left = Math.max(20, Math.min(window.innerWidth - 80, calculatedLeft));
```

### Issue 5: Tutorial Context Not Available
**Error:** "useTutorial must be used within TutorialProvider"

**Fix:**
- Ensure TutorialProvider wraps all components in App.tsx
- Check import paths are correct

## Commit Message

```bash
git add -A
git commit -m "feat(step8): Tutorial system migration - FINAL STEP

- Created TutorialContext for state management
  - Tutorial scenarios with step definitions
  - Start/stop/next/previous step functions
  - First Blood tutorial scenario
  - Support for pointer targeting and navigation

- Created tutorial components
  - TutorialModal: Main tutorial UI
  - TutorialPointer: Animated pointer to UI elements
  - TutorialOverlay: Container that persists across routes

- Key feature: Tutorial persists during navigation!
  - TutorialOverlay mounted at app level (outside Routes)
  - Modal stays visible across all screen changes
  - Pointer updates to new targets on route changes
  - THIS WAS THE ORIGINAL GOAL OF REACT MIGRATION

- Updated App.tsx with TutorialProvider
  - Wraps entire app
  - TutorialOverlay outside Routes (critical!)
  - Tutorial state persists across navigation

- Updated MainMenu to start tutorials
  - Tutorial buttons call startTutorial()
  - Supports multiple tutorial scenarios

- Added tutorial CSS
  - Modal overlay styling
  - Pointer animations (bounce + pulse)
  - Professional appearance
  - Animations enhance user experience

Tested:
- Tutorial starts from main menu
- Modal persists through main menu → ship selection → combat
- No page reloads during tutorial
- Pointer positions correctly
- Animations work smoothly
- Tutorial can be completed end-to-end
- Tutorial can be exited anytime
- No TypeScript errors
- No console errors

MIGRATION COMPLETE! All 8 steps finished.

Next: Final testing and merge to main

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Final Steps Before Merge

After Step 8 completes successfully:

1. **Comprehensive Testing**
   - Test solo mode end-to-end
   - Test multiplayer mode (2 tabs)
   - Test all tutorials
   - Test ship customizer
   - Verify no console errors

2. **Performance Check**
   - Check bundle size: `cd client && npm run build`
   - Test load times
   - Verify no memory leaks

3. **Code Cleanup**
   - Remove debug logging
   - Delete temporary files
   - Clean up comments
   - Format code

4. **Documentation Update**
   - Update main README
   - Document new React architecture
   - Update deployment instructions

5. **Final Commit**
   ```bash
   git add -A
   git commit -m "chore: Final cleanup and documentation for React migration"
   ```

6. **Merge to Main**
   ```bash
   git checkout main
   git merge react-refactor
   git branch -d react-refactor
   ```

7. **Celebrate!**
   - React migration complete
   - Tutorial system now works perfectly
   - No more disappearing modals
   - Proper SPA architecture

## Success! Migration Complete!

All 8 steps finished. The app is now:
- ✅ Fully React-based
- ✅ Proper SPA (no page reloads)
- ✅ Tutorial persists across navigation
- ✅ Type-safe with TypeScript
- ✅ Well-structured components
- ✅ Maintainable and scalable

**The original problem (tutorial modal disappearing) is now SOLVED!**
