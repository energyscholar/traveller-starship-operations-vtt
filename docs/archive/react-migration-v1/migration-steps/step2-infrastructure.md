# Step 2: Infrastructure (Context & Hooks)

## Objective
Create the core React infrastructure: GameContext for state management, and useSocket hook for Socket.IO communication. This establishes the foundation that all components will use.

## Prerequisites
- [x] Step 1 complete (foundation and types)
- [x] On `react-refactor` branch
- [x] Type definitions created in `client/src/types/`
- [x] Vite dev server tested and working

## Branch Strategy
Continue working on `react-refactor` branch. Commit after this step completes successfully.

## Implementation Details

### 2.1 Create Context Directory
```bash
mkdir -p client/src/context
```

### 2.2 Create GameContext
**File:** `client/src/context/GameContext.tsx`

```typescript
import { createContext, useState, useContext, ReactNode } from 'react';
import { GameState, LogEntry } from '../types/game-state';

interface GameContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
  addLogEntry: (message: string, type?: LogEntry['type']) => void;
  resetGameState: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hook to use game context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

// Initial game state
const initialGameState: GameState = {
  // Connection
  connected: false,
  socketId: null,

  // Player
  playerId: null,
  playerNumber: null,
  playerShip: null,

  // Opponent
  opponentShip: null,

  // Mode
  mode: null,

  // Combat
  combat: null,
  currentTurn: null,
  combatLog: [],

  // Range
  selectedRange: null,
};

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  const addLogEntry = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: Date.now(),
      message,
      type,
    };
    setGameState(prev => ({
      ...prev,
      combatLog: [...prev.combatLog, entry],
    }));
  };

  const resetGameState = () => {
    setGameState(initialGameState);
  };

  const value: GameContextType = {
    gameState,
    updateGameState,
    addLogEntry,
    resetGameState,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;
```

**Key Features:**
- Centralized game state
- Type-safe with TypeScript
- Helper functions for common operations
- Can be used from any component

### 2.3 Create Hooks Directory
```bash
mkdir -p client/src/hooks
```

### 2.4 Create useSocket Hook
**File:** `client/src/hooks/useSocket.ts`

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGame } from '../context/GameContext';

export function useSocket() {
  const { gameState, updateGameState, addLogEntry } = useGame();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to server
    socketRef.current = io('http://localhost:3000');
    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      updateGameState({ connected: true, socketId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      updateGameState({ connected: false });
    });

    // Game events
    socket.on('welcome', (data) => {
      console.log('[Socket] Welcome:', data);
      updateGameState({
        playerId: data.playerId,
        playerNumber: data.playerId,
        playerShip: data.assignedShip,
      });
    });

    socket.on('space:autoAssigned', (data) => {
      console.log('[Socket] Auto-assigned:', data);
      updateGameState({
        playerShip: data.ship,
        mode: data.mode,
      });
    });

    socket.on('space:combatStart', (data) => {
      console.log('[Socket] Combat started:', data);
      updateGameState({ combat: data });
      addLogEntry('Combat started!', 'info');
    });

    socket.on('space:turnChange', (data) => {
      console.log('[Socket] Turn change:', data);
      updateGameState({ currentTurn: data.activePlayer });
      addLogEntry(`Turn ${data.turn}: Player ${data.activePlayer}'s turn`, 'info');
    });

    socket.on('space:combatUpdate', (data) => {
      console.log('[Socket] Combat update:', data);
      updateGameState({ combat: data.combat });
      if (data.log && Array.isArray(data.log)) {
        data.log.forEach((msg: string) => addLogEntry(msg, 'success'));
      }
    });

    socket.on('space:combatEnd', (data) => {
      console.log('[Socket] Combat ended:', data);
      addLogEntry(`Combat ended! Winner: Player ${data.winner}`, 'success');
    });

    socket.on('space:rangeSelected', (data) => {
      console.log('[Socket] Range selected:', data);
      updateGameState({ selectedRange: data.range });
    });

    socket.on('space:playerReady', (data) => {
      console.log('[Socket] Player ready:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('welcome');
      socket.off('space:autoAssigned');
      socket.off('space:combatStart');
      socket.off('space:turnChange');
      socket.off('space:combatUpdate');
      socket.off('space:combatEnd');
      socket.off('space:rangeSelected');
      socket.off('space:playerReady');
      socket.disconnect();
    };
  }, [updateGameState, addLogEntry]);

  return socketRef.current;
}
```

**Key Features:**
- Manages Socket.IO connection lifecycle
- Handles all socket events
- Updates GameContext automatically
- Cleans up on unmount
- Returns socket reference for emitting events

### 2.5 Update App.tsx with Providers
**File:** `client/src/App.tsx`

```typescript
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import './App.css';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="app-container">
          <h1>React Migration - Step 2 Complete</h1>
          <p>Infrastructure ready. Next: Main Menu component.</p>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
```

**Note:** We'll add routes in Step 3. For now, just verify providers work.

### 2.6 Configure Vite Proxy
**File:** `client/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      },
    },
  },
});
```

**Why needed?**
- Vite runs on port 5173
- Express runs on port 3000
- Proxy forwards Socket.IO and API requests

### 2.7 Update Root package.json Scripts
**File:** `package.json` (at project root)

Add/update scripts section:

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

### 2.8 Install Concurrently (Optional)
```bash
npm install --save-dev concurrently
```

Allows running both servers with one command: `npm run dev:all`

## Tests to Add

### Temporary Test 1: Context Works
Create temporary test file to verify context works.

**File:** `client/src/test-context.tsx` (temporary)

```typescript
import { useGame } from './context/GameContext';

export function TestContext() {
  const { gameState, updateGameState } = useGame();

  return (
    <div>
      <h2>Context Test</h2>
      <p>Connected: {gameState.connected ? 'Yes' : 'No'}</p>
      <p>Player ID: {gameState.playerId || 'None'}</p>
      <button onClick={() => updateGameState({ playerId: 1 })}>
        Set Player ID to 1
      </button>
    </div>
  );
}
```

Update App.tsx temporarily to include TestContext:

```typescript
import { TestContext } from './test-context';

// In App component JSX:
<div className="app-container">
  <TestContext />
</div>
```

### Temporary Test 2: Socket Connection
```bash
# Terminal 1: Start Express server
npm run dev

# Terminal 2: Start Vite dev server
cd client && npm run dev

# Open browser to http://localhost:5173
# Check console for: "[Socket] Connected: [socket-id]"
```

### Temporary Test 3: State Updates
In browser console:
```javascript
// Should see socket connection message
// Click "Set Player ID to 1" button
// Verify UI updates to show "Player ID: 1"
```

## Success Criteria

- [ ] `client/src/context/GameContext.tsx` created
- [ ] `client/src/hooks/useSocket.ts` created
- [ ] Vite config has proxy setup
- [ ] Both servers start without errors
- [ ] Socket connection established (check browser console)
- [ ] GameContext can be imported and used
- [ ] useSocket hook connects to backend
- [ ] No TypeScript compilation errors
- [ ] Test component shows connection status

## Cleanup Checklist

**During Step 2 (after tests pass):**
- [ ] Delete `client/src/test-context.tsx`
- [ ] Remove TestContext import from App.tsx
- [ ] Restore App.tsx to simple placeholder

**After entire migration (Step 8):**
- These files are permanent - do not delete

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix issues and continue
# Review error messages
# Check type errors with: cd client && npm run build

# Option 2: Rollback to Step 1
git reset --hard HEAD~1
# This undoes the Step 2 commit
# Step 1 state is restored

# Option 3: Abandon migration
git checkout main
git branch -D react-refactor
# Document failure in REACT-MIGRATION-FAILURES.txt
```

## Time Estimate

- **Minimum:** 30 minutes (if copying code directly)
- **Expected:** 45-60 minutes (with testing and verification)
- **Maximum:** 1.5 hours (if socket connection issues)

## Common Issues

### Issue 1: "useGame must be used within GameProvider"
**Error:** Context error when using useGame hook

**Fix:**
- Ensure `<GameProvider>` wraps all components in App.tsx
- Check that you're importing from correct path

### Issue 2: Socket.IO Connection Failed
**Error:** `WebSocket connection failed` in browser console

**Fix:**
```bash
# Verify Express server is running
lsof -i :3000

# Check Vite proxy configuration in vite.config.ts
# Ensure ws: true is set for socket.io proxy

# Try hardcoding socket URL for testing
io('http://localhost:3000', { transports: ['websocket'] })
```

### Issue 3: TypeScript Errors
**Error:** Type errors in useSocket or GameContext

**Fix:**
- Verify type imports are correct
- Check that game-state.ts exports all needed types
- Temporarily use `any` for complex types if stuck

### Issue 4: Module Not Found
**Error:** `Cannot find module 'socket.io-client'`

**Fix:**
```bash
cd client
npm install socket.io-client
npm install react-router-dom
```

### Issue 5: Proxy Not Working
**Error:** API calls return 404

**Fix:**
- Restart Vite dev server after changing vite.config.ts
- Check proxy target URL is correct
- Try accessing http://localhost:3000 directly

## Commit Message

```bash
git add -A
git commit -m "feat(step2): Core infrastructure - GameContext and useSocket

- Created GameContext for centralized state management
  - Type-safe state with TypeScript
  - Helper functions (updateGameState, addLogEntry, resetGameState)
  - Error handling for context usage outside provider

- Created useSocket hook for Socket.IO communication
  - Manages connection lifecycle
  - Handles all game-related socket events
  - Auto-updates GameContext on events
  - Proper cleanup on unmount

- Configured Vite proxy for Socket.IO and API
- Updated App.tsx with GameProvider wrapper
- Added dev scripts to root package.json
- Installed concurrently for parallel dev servers

Tested:
- Socket connection successful
- Context updates work
- Both servers run simultaneously
- No TypeScript errors

Next: Step 3 - Main Menu component

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 3: Main Menu** - Create the first screen component using our infrastructure.
