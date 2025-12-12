# Step 3: Main Menu Component

## Objective
Migrate the main menu screen from vanilla HTML/JS to a React component. This is the simplest screen (just navigation buttons), making it ideal as the first complete component migration.

## Prerequisites
- [x] Step 1 complete (foundation and types)
- [x] Step 2 complete (infrastructure)
- [x] On `react-refactor` branch
- [x] GameContext and useSocket hook working
- [x] Both servers can run simultaneously

## Branch Strategy
Continue on `react-refactor` branch. Commit after this step completes successfully.

## Implementation Details

### 3.1 Analyze Existing Main Menu
**Source:** `public/index.html` - Look for `main-menu-screen` div

Key elements to migrate:
- Welcome header
- Space Battle (Multiplayer) button
- Solo Battle (vs AI) button
- Ship Templates button
- Ship Customizer button
- Tutorial buttons
- Session/Stage info display

### 3.2 Create Components Directory Structure
```bash
mkdir -p client/src/components
mkdir -p client/src/components/shared
```

### 3.3 Create MainMenu Component
**File:** `client/src/components/MainMenu.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../context/GameContext';

export default function MainMenu() {
  const navigate = useNavigate();
  const socket = useSocket();
  const { gameState } = useGame();

  const handleSpaceBattle = () => {
    navigate('/ship-selection?mode=multiplayer');
  };

  const handleSoloBattle = () => {
    navigate('/ship-selection?mode=solo');
  };

  const handleShipTemplates = () => {
    // TODO: Migrate ship templates page (later step)
    window.location.href = '/ship-templates.html';
  };

  const handleCustomizer = () => {
    // Will implement in Step 7
    navigate('/customizer');
  };

  const handleTutorial = (scenario: string) => {
    // Will implement in Step 8
    console.log('Tutorial:', scenario);
  };

  return (
    <div className="main-menu-screen" data-screen="main-menu">
      {/* Header */}
      <div className="header">
        <h1>⚔️ Traveller Combat VTT</h1>
        <div className="stage">
          React Migration - Session 8, Stage 14
        </div>
        {gameState.connected && (
          <div className="connection-status">
            Connected: {gameState.socketId?.substring(0, 8)}
          </div>
        )}
      </div>

      {/* Main Menu Card */}
      <div className="card main-menu-card">
        <h2>🚀 Choose Your Mission</h2>

        <div className="menu-buttons">
          <button
            className="menu-button space-battle-btn"
            onClick={handleSpaceBattle}
            data-test-id="btn-space-battle"
          >
            ⚔️ Space Battle (Multiplayer)
          </button>

          <button
            className="menu-button solo-battle-btn"
            onClick={handleSoloBattle}
            data-test-id="btn-solo-battle"
          >
            🤖 Solo Battle (vs AI)
          </button>

          <button
            className="menu-button ship-templates-btn"
            onClick={handleShipTemplates}
            data-test-id="btn-ship-templates"
          >
            📋 Ship Templates
          </button>

          <button
            className="menu-button ship-customizer-btn"
            onClick={handleCustomizer}
            data-test-id="btn-ship-customizer"
          >
            🛠️ Ship Customizer
          </button>
        </div>
      </div>

      {/* Tutorial Card */}
      <div className="card tutorial-card">
        <h2>📚 Interactive Tutorials</h2>

        <div className="menu-buttons">
          <button
            className="menu-button tutorial-btn"
            onClick={() => handleTutorial('first-blood')}
            data-test-id="btn-tutorial-first-blood"
          >
            🎯 First Blood Tutorial
          </button>

          <button
            className="menu-button tutorial-btn"
            onClick={() => handleTutorial('advanced-combat')}
            data-test-id="btn-tutorial-advanced"
          >
            ⚡ Advanced Combat
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="footer-info">
        <p>Traveller Combat VTT - React Edition</p>
        <p>Migration in Progress</p>
      </div>
    </div>
  );
}
```

**Key Features:**
- Uses React Router for navigation (no page reloads!)
- Maintains all `data-test-id` attributes for tests
- Uses same CSS classes as original
- Socket connection status display
- Placeholder handlers for future steps

### 3.4 Update App.tsx with Routes
**File:** `client/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import MainMenu from './components/MainMenu';
import './App.css';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<MainMenu />} />
            {/* More routes will be added in next steps */}
            <Route path="*" element={<div>Page not found - Migration in progress</div>} />
          </Routes>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
```

### 3.5 Create Placeholder Components for Navigation
Create stub components so navigation doesn't break:

**File:** `client/src/components/ShipSelection.tsx`

```typescript
export default function ShipSelection() {
  return (
    <div className="ship-selection-screen">
      <h1>Ship Selection</h1>
      <p>Coming in Step 4...</p>
    </div>
  );
}
```

**File:** `client/src/components/Customizer.tsx`

```typescript
export default function Customizer() {
  return (
    <div className="customizer-screen">
      <h1>Ship Customizer</h1>
      <p>Coming in Step 7...</p>
    </div>
  );
}
```

Add these to App.tsx routes:

```typescript
import ShipSelection from './components/ShipSelection';
import Customizer from './components/Customizer';

// In Routes:
<Route path="/ship-selection" element={<ShipSelection />} />
<Route path="/customizer" element={<Customizer />} />
```

### 3.6 Verify CSS Classes Match
Compare original HTML classes with React component:

```bash
# Extract classes from original HTML
grep -o 'class="[^"]*"' public/index.html | grep "main-menu" > /tmp/original-classes.txt

# Check React component has same classes
grep -o 'className="[^"]*"' client/src/components/MainMenu.tsx > /tmp/react-classes.txt

# Compare
diff /tmp/original-classes.txt /tmp/react-classes.txt
```

If differences found, update React component to match.

### 3.7 Update Express Server to Serve React App
**File:** `server.js`

Add AFTER existing static file serving, BEFORE socket.io setup:

```javascript
// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}
```

**Note:** In development, we use two servers (Express + Vite). In production, Express serves the built React app.

## Tests to Add

### Temporary Test 1: Manual Navigation Test
```bash
# Start both servers
# Terminal 1:
npm run dev

# Terminal 2:
cd client && npm run dev

# In browser: http://localhost:5173
# Verify:
# 1. Main menu loads
# 2. Click "Space Battle" -> navigates to /ship-selection (no page reload!)
# 3. Click "Solo Battle" -> navigates to /ship-selection?mode=solo
# 4. Click "Ship Customizer" -> navigates to /customizer
# 5. Browser back button works
```

### Temporary Test 2: Socket Connection Test
In browser console, verify:
```javascript
// Should see:
// "[Socket] Connected: [socket-id]"

// Main menu should show:
// "Connected: [first 8 chars of socket ID]"
```

### Temporary Test 3: No Page Reload Test
```javascript
// In browser console:
let reloadCount = 0;
window.addEventListener('beforeunload', () => reloadCount++);

// Click buttons
// After clicking several navigation buttons:
console.log('Reload count:', reloadCount); // Should be 0
```

### Temporary Test 4: CSS Styling Test
Visual inspection:
- [ ] Main menu looks identical to original
- [ ] Buttons have correct styling
- [ ] Header displays correctly
- [ ] Cards have proper spacing
- [ ] Footer displays

## Success Criteria

- [ ] MainMenu component created
- [ ] Component renders without errors
- [ ] All buttons present and clickable
- [ ] Navigation works (React Router, no page reloads)
- [ ] Socket connection displays in UI
- [ ] All `data-test-id` attributes preserved
- [ ] CSS classes match original
- [ ] Styling looks identical to original
- [ ] Browser back button works
- [ ] No TypeScript compilation errors
- [ ] No console errors

## Cleanup Checklist

**During Step 3:**
- No temporary files to delete yet
- Keep placeholder components (needed for Step 4)

**After entire migration (Step 8):**
- Remove placeholder text from ShipSelection and Customizer
- Remove "Migration in Progress" footer

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix issues and continue
# Common fixes:
# - Check imports are correct
# - Verify CSS files imported in App.css
# - Check all data-test-id attributes present

# Option 2: Rollback to Step 2
git reset --hard HEAD~1

# Option 3: Abandon and restart
git checkout main
git branch -D react-refactor
```

## Time Estimate

- **Minimum:** 30 minutes (straightforward migration)
- **Expected:** 45-60 minutes (with testing and styling tweaks)
- **Maximum:** 1.5 hours (if CSS issues or routing problems)

## Common Issues

### Issue 1: Routes Not Working
**Error:** Clicking buttons doesn't navigate

**Fix:**
- Ensure `<BrowserRouter>` wraps `<Routes>`
- Check route paths match navigate() calls
- Verify `react-router-dom` installed

### Issue 2: Styles Not Applied
**Error:** Main menu looks unstyled

**Fix:**
```bash
# Verify CSS imported in App.css
cat client/src/App.css | grep "import.*styles.css"

# Check CSS files exist
ls client/src/styles.css
ls client/src/tutorial.css

# Restart Vite dev server
cd client
npm run dev
```

### Issue 3: Socket Not Connecting
**Error:** "Connected: " shows null

**Fix:**
- Verify Express server running on port 3000
- Check Vite proxy configuration
- Try accessing http://localhost:3000 directly
- Check browser console for socket errors

### Issue 4: TypeScript Errors
**Error:** Type errors in MainMenu component

**Fix:**
- Verify imports from correct paths
- Check useNavigate, useSocket, useGame imported
- Temporarily add `// @ts-ignore` above errors if stuck

### Issue 5: Page Reloads on Navigation
**Error:** Full page reload when clicking buttons

**Fix:**
- Don't use `<a href>` tags - use navigate() function
- Ensure onClick handlers call navigate(), not window.location
- Check that buttons are inside `<BrowserRouter>`

## Commit Message

```bash
git add -A
git commit -m "feat(step3): Migrate main menu to React component

- Created MainMenu.tsx component
  - All navigation buttons functional
  - Socket connection status display
  - Maintains all data-test-id attributes for tests
  - Uses same CSS classes as original

- Updated App.tsx with React Router
  - Route for main menu (/)
  - Placeholder routes for ship-selection and customizer
  - 404 fallback route

- Created placeholder components
  - ShipSelection.tsx (will implement in Step 4)
  - Customizer.tsx (will implement in Step 7)

- Updated Express server for production mode
  - Serves built React app in production
  - Dev mode uses separate Vite server

Tested:
- Main menu renders correctly
- Navigation works (no page reloads)
- Socket connection established
- Styling matches original
- Browser back button works
- All test IDs preserved

Next: Step 4 - Ship Selection component

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 4: Ship Selection** - Migrate the ship selection screen with Socket.IO interactions.
