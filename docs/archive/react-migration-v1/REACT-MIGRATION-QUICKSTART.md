# React Migration QUICKSTART
## Traveller Combat VTT - Step-by-Step Execution Guide

**Purpose:** Detailed execution commands for React migration
**Use:** Follow this exactly when executing the migration
**Branch:** `react-refactor`
**Fallback:** Can always return to `main` branch if it fails

## ⚠️ WARNING: This approach failed 4 times (2025-11-13/14)

**DO NOT EXECUTE THIS PLAN as-is.**

See `REACT-MIGRATION-SCOPE.md` for:
- Why it failed (big-bang approach)
- Lessons learned
- Recommended incremental strategy
- Tutorial de-prioritization

---

## Pre-Migration Checklist

- [x] Current work committed to `main`
- [x] Migration plan reviewed (REACT-MIGRATION-PLAN.md)
- [ ] Ready to start execution
- [ ] Terminal open and ready
- [ ] Server stopped (kill background processes)

---

## Phase 1: Branch & Setup

### 1.1 Create Migration Branch
```bash
# Ensure we're on main
git checkout main

# Create and switch to react-refactor branch
git checkout -b react-refactor

# Verify we're on the new branch
git branch --show-current
# Should output: react-refactor
```

### 1.2 Stop Existing Servers
```bash
# Kill any running node processes
killall node

# Or find and kill specific processes
lsof -t -i:3000 | xargs kill -9
lsof -t -i:5173 | xargs kill -9
```

### 1.3 Create Client Directory with Vite
```bash
# Create React app with Vite
npm create vite@latest client -- --template react

# Navigate to client directory
cd client

# Install dependencies
npm install

# Install React Router and Socket.IO client
npm install react-router-dom socket.io-client

# Return to root
cd ..
```

**Expected Result:**
- `client/` directory created
- React app ready at `client/`
- `client/package.json` exists
- `client/src/App.jsx` exists

---

## Phase 2: Configure Vite Proxy

### 2.1 Update Vite Config
**File:** `client/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3000',
      }
    }
  }
})
```

### 2.2 Test Vite Dev Server
```bash
cd client
npm run dev
```

**Expected Result:**
- Vite server starts on http://localhost:5173
- Default React app loads in browser
- No errors in console

**Stop server:** `Ctrl+C`

---

## Phase 3: Backend Integration

### 3.1 Update Express Server
**File:** `server.js` (at root)

Add this BEFORE the existing routes:

```js
// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}
```

### 3.2 Update package.json Scripts
**File:** `package.json` (at root)

Add new scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "client": "cd client && npm run dev",
    "client:build": "cd client && npm run build",
    "dev:all": "concurrently \"npm run dev\" \"npm run client\"",
    "build": "npm run client:build"
  }
}
```

### 3.3 Install Concurrently (optional, for dev)
```bash
npm install --save-dev concurrently
```

### 3.4 Test Backend + Frontend Together
```bash
# Terminal 1: Start Express server
npm run dev

# Terminal 2: Start Vite dev server
npm run client
```

**Expected Result:**
- Express on http://localhost:3000
- React on http://localhost:5173
- Both running simultaneously
- No errors

---

## Phase 4: Create Game Context

### 4.1 Create Context Directory
```bash
mkdir -p client/src/context
```

### 4.2 Create GameContext.jsx
**File:** `client/src/context/GameContext.jsx`

```jsx
import { createContext, useState, useContext } from 'react';

const GameContext = createContext();

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState({
    // Player info
    playerId: null,
    playerNumber: null,
    playerShip: null,

    // Opponent info
    opponentShip: null,

    // Game mode
    mode: null, // 'solo' or 'multiplayer'

    // Combat state
    combat: null,
    currentTurn: null,
    combatLog: [],

    // Connection state
    connected: false,
    socketId: null,
  });

  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  return (
    <GameContext.Provider value={{ gameState, updateGameState }}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;
```

---

## Phase 5: Create Socket Hook

### 5.1 Create Hooks Directory
```bash
mkdir -p client/src/hooks
```

### 5.2 Create useSocket.js
**File:** `client/src/hooks/useSocket.js`

```jsx
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGame } from '../context/GameContext';

export function useSocket() {
  const { updateGameState } = useGame();
  const socket = useRef(null);

  useEffect(() => {
    // Connect to server
    socket.current = io('http://localhost:3000');

    // Connection events
    socket.current.on('connect', () => {
      console.log('[Socket] Connected:', socket.current.id);
      updateGameState({ connected: true, socketId: socket.current.id });
    });

    socket.current.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      updateGameState({ connected: false });
    });

    // Game events
    socket.current.on('welcome', (data) => {
      console.log('[Socket] Welcome:', data);
      updateGameState({
        playerId: data.playerId,
        playerNumber: data.playerId,
        playerShip: data.assignedShip,
      });
    });

    socket.current.on('space:autoAssigned', (data) => {
      console.log('[Socket] Auto-assigned:', data);
      updateGameState({
        playerShip: data.ship,
        mode: data.mode,
      });
    });

    socket.current.on('space:combatStart', (data) => {
      console.log('[Socket] Combat started:', data);
      updateGameState({ combat: data });
    });

    socket.current.on('space:turnChange', (data) => {
      console.log('[Socket] Turn change:', data);
      updateGameState({ currentTurn: data.activePlayer });
    });

    socket.current.on('space:combatUpdate', (data) => {
      console.log('[Socket] Combat update:', data);
      updateGameState({ combat: data });
    });

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [updateGameState]);

  return socket.current;
}
```

---

## Phase 6: Create Main App Structure

### 6.1 Update App.jsx
**File:** `client/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import MainMenu from './components/MainMenu';
import ShipSelection from './components/ShipSelection';
import CombatScreen from './components/CombatScreen';
import './App.css';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/ship-selection" element={<ShipSelection />} />
            <Route path="/combat" element={<CombatScreen />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
```

### 6.2 Create Components Directory
```bash
mkdir -p client/src/components
```

---

## Phase 7: Create Component Placeholders

### 7.1 MainMenu Component
**File:** `client/src/components/MainMenu.jsx`

```jsx
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function MainMenu() {
  const navigate = useNavigate();
  useSocket(); // Initialize socket connection

  const handleSpaceBattle = () => {
    navigate('/ship-selection?mode=multiplayer');
  };

  const handleSoloBattle = () => {
    navigate('/ship-selection?mode=solo');
  };

  return (
    <div className="main-menu">
      <div className="header">
        <h1>⚔️ Traveller Combat VTT</h1>
        <div className="stage">REACT VERSION - MIGRATION IN PROGRESS</div>
      </div>

      <div className="card">
        <h2>🚀 Choose Your Mission</h2>
        <div className="menu-buttons">
          <button
            className="menu-button"
            onClick={handleSpaceBattle}
            data-test-id="btn-space-battle"
          >
            ⚔️ Space Battle (Multiplayer)
          </button>

          <button
            className="menu-button"
            onClick={handleSoloBattle}
            data-test-id="btn-solo-battle"
          >
            🤖 Solo Battle (vs AI)
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 7.2 ShipSelection Component
**File:** `client/src/components/ShipSelection.jsx`

```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';

export default function ShipSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gameState } = useGame();
  const socket = useSocket();

  const mode = searchParams.get('mode') || 'multiplayer';

  const handleReady = () => {
    // Send ready event to server
    if (socket) {
      socket.emit('space:ready');
    }

    // Navigate to combat
    navigate('/combat');
  };

  return (
    <div className="ship-selection">
      <div className="header">
        <h1>🚀 Select Your Spacecraft</h1>
        <div className="mode-info">
          Mode: {mode === 'solo' ? '🤖 Solo (vs AI)' : '👥 Multiplayer'}
        </div>
      </div>

      <div className="card">
        <h2>Choose Your Ship</h2>
        <p>Ship selection UI coming soon...</p>
        <button onClick={handleReady} data-test-id="ready-button">
          Ready for Combat
        </button>
      </div>
    </div>
  );
}
```

### 7.3 CombatScreen Component
**File:** `client/src/components/CombatScreen.jsx`

```jsx
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';

export default function CombatScreen() {
  const { gameState } = useGame();
  const socket = useSocket();

  const handleFire = () => {
    if (socket) {
      socket.emit('space:fire', { turret: 0, weapon: 0 });
    }
  };

  return (
    <div className="combat-screen">
      <div className="header">
        <h1>⚔️ Space Combat</h1>
      </div>

      <div className="card">
        <h2>Combat HUD</h2>
        <p>Player: {gameState.playerNumber}</p>
        <p>Ship: {gameState.playerShip || 'None'}</p>
        <p>Mode: {gameState.mode || 'Unknown'}</p>

        <button onClick={handleFire} data-test-id="fire-button">
          🔥 FIRE
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 8: Copy Styles

### 8.1 Copy Existing CSS
```bash
# Copy existing styles to client
cp public/styles.css client/src/
cp public/tutorial.css client/src/

# Import in App.jsx (already done above)
```

### 8.2 Update App.css
**File:** `client/src/App.css`

```css
/* Import existing styles */
@import './styles.css';
@import './tutorial.css';

/* React-specific overrides */
.app-container {
  min-height: 100vh;
}
```

---

## Phase 9: Test Basic Flow

### 9.1 Start Both Servers
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run client
```

### 9.2 Test Navigation
1. Open http://localhost:5173
2. Click "Solo Battle (vs AI)"
3. Should navigate to /ship-selection?mode=solo
4. Click "Ready for Combat"
5. Should navigate to /combat

**Expected Result:**
- ✅ Navigation works (no page reloads!)
- ✅ Socket connection established
- ✅ No console errors

---

## Phase 10: Commit Progress

### 10.1 Commit Basic Structure
```bash
git add -A
git commit -m "feat: React migration - basic structure and routing

- Set up Vite + React + React Router
- Created GameContext for state management
- Created useSocket hook for Socket.IO
- Implemented basic components (MainMenu, ShipSelection, CombatScreen)
- Configured Vite proxy for backend
- Client-side routing working (no page reloads)

Next: Migrate full UI and tutorial system

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## What Could Go Wrong - Common Issues

### Issue 1: Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Fix:**
```bash
lsof -t -i:3000 | xargs kill -9
```

### Issue 2: Socket.IO Connection Failed
**Error:** `WebSocket connection failed`

**Fix:** Check Vite proxy configuration in `vite.config.js`

### Issue 3: Module Not Found
**Error:** `Cannot find module 'react-router-dom'`

**Fix:**
```bash
cd client
npm install react-router-dom socket.io-client
```

### Issue 4: Styles Not Loading
**Fix:** Ensure imports in `App.css` are correct and files copied

### Issue 5: Context Error
**Error:** `useGame must be used within GameProvider`

**Fix:** Ensure `<GameProvider>` wraps `<BrowserRouter>` in App.jsx

---

## Migration Log Template

**File:** `docs/REACT-MIGRATION-LOG.md`

Create this file and log EVERYTHING:

```markdown
# React Migration Log - Attempt 1

## Date: 2025-11-14

### Phase 1: Setup ✅ | ❌ | ⏳
**Started:** [time]
**Completed:** [time]
**Duration:** [duration]

**What worked:**
-

**What broke:**
-

**How we fixed it:**
-

**Gotchas:**
-

---

### Phase 2: [Next Phase]
...
```

---

## Success Checklist

Before considering the migration complete:

- [ ] Main menu loads
- [ ] Can navigate to ship selection (solo mode)
- [ ] Can navigate to combat screen
- [ ] Socket.IO connects successfully
- [ ] Socket events trigger state updates
- [ ] No console errors
- [ ] No page reloads during navigation
- [ ] Styles look correct
- [ ] Back button works
- [ ] Can open in 2 tabs for multiplayer

---

## When to Stop and Reassess

**STOP if:**
- ❌ Spent >30 minutes on a single error
- ❌ Can't get basic routing working
- ❌ Socket.IO won't connect
- ❌ Dependencies conflict

**Then:**
1. Document the blocker in migration log
2. Research the issue
3. Ask for help if needed
4. Consider alternative approach

---

## Ready to Execute?

**Checklist before starting:**
- [ ] Read entire quickstart
- [ ] Understand each phase
- [ ] Have terminal ready
- [ ] Have browser ready
- [ ] Ready to take notes
- [ ] Committed to seeing it through

**When ready:**
```bash
# Start with Phase 1, Step 1.1
git checkout -b react-refactor
```

---

*Generated: 2025-11-14*
*For: Session 8, React Migration*
*Status: READY FOR EXECUTION*
