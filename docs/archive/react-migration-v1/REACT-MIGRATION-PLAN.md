# React Migration Plan - Traveller Combat VTT
## Session 8, Stage 14+ Refactor

**Date:** 2025-11-14
**Objective:** Migrate from vanilla JS/HTML to React + Vite for proper MVC architecture
**Branch Strategy:** Create `react-refactor` branch, merge only when fully working

---

## ⚠️ SCOPE UPDATE (2025-11-14)

**This plan attempted and failed 4 times (night of 2025-11-13/14).**

**New approach required:**
- ✅ See `REACT-MIGRATION-SCOPE.md` for lessons learned
- ✅ Tutorial system de-prioritized (migrate LAST)
- ✅ Incremental migration strategy recommended
- ❌ Big-bang approach (this plan) does not work

---

## Why React?

### Current Problems
1. **Tutorial modal disappears** - Screen navigation causes page reloads
2. **No proper routing** - URL changes reload entire page
3. **State scattered** - Game state across multiple files, hard to track
4. **Screen switching fragile** - Manual show/hide of divs, error-prone
5. **Code duplication** - Similar UI patterns repeated

### React Solutions
1. **Single Page App** - No page reloads, tutorial stays mounted
2. **React Router** - Proper client-side routing
3. **Centralized state** - Context API or props for game state
4. **Component reuse** - Ship cards, weapon panels, etc. as components
5. **Hot reload** - Instant feedback during development

---

## Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool (faster than Create React App)
- **React Router 6** - Client-side routing
- **Socket.IO Client** - Real-time communication (keep existing)

### Backend (No Changes)
- **Express** - HTTP server
- **Socket.IO** - WebSocket server
- **Winston** - Logging
- All existing game logic stays the same

### File Structure
```
traveller-combat-vtt/
├── server.js                 # Backend (NO CHANGES)
├── lib/                      # Backend libs (NO CHANGES)
├── config.js                 # Backend config (NO CHANGES)
├── data/                     # Game data (NO CHANGES)
├── client/                   # NEW: React app
│   ├── src/
│   │   ├── App.jsx           # Main React app
│   │   ├── main.jsx          # React entry point
│   │   ├── components/       # React components
│   │   │   ├── MainMenu.jsx
│   │   │   ├── ShipSelection.jsx
│   │   │   ├── CombatScreen.jsx
│   │   │   ├── Tutorial/
│   │   │   │   ├── TutorialModal.jsx
│   │   │   │   ├── TutorialPointer.jsx
│   │   │   │   ├── TutorialPlayer.jsx
│   │   │   │   └── TutorialScenarios.js
│   │   │   └── shared/
│   │   │       ├── ShipCard.jsx
│   │   │       ├── WeaponPanel.jsx
│   │   │       └── CombatLog.jsx
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useSocket.js  # Socket.IO hook
│   │   │   └── useGameState.js
│   │   ├── context/          # React Context for state
│   │   │   └── GameContext.jsx
│   │   └── styles/           # CSS modules or styled-components
│   ├── index.html            # Vite entry HTML
│   ├── vite.config.js        # Vite configuration
│   └── package.json          # Client dependencies
├── public/                   # KEEP: Static assets served by Express
│   ├── ship-templates.html   # KEEP for now (migrate later)
│   └── assets/               # Images, fonts, etc.
└── package.json              # Server dependencies
```

---

## Migration Steps - Detailed Plan

### Phase 1: Setup & Scaffold (30 min)
**Branch:** `react-refactor`

1. **Create Vite React project**
   ```bash
   npm create vite@latest client -- --template react
   cd client
   npm install
   npm install react-router-dom socket.io-client
   ```

2. **Configure Vite proxy** (vite.config.js)
   - Proxy API calls to Express server (port 3000)
   - Proxy Socket.IO to Express server

3. **Update Express** (server.js)
   - Serve Vite dev server in development
   - Serve built React app in production
   - Keep all existing Socket.IO logic

4. **Test basic setup**
   - React app loads at localhost:5173
   - Can connect to backend at localhost:3000
   - Socket.IO connection works

**Deliverable:** React app running alongside Express backend

---

### Phase 2: Core Components (1 hour)

#### 2.1 Game Context & State Management
**File:** `client/src/context/GameContext.jsx`

```jsx
// Centralized game state
export const GameContext = createContext();

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState({
    playerId: null,
    playerShip: null,
    opponentShip: null,
    combat: null,
    turn: null,
    // ... all game state
  });

  return (
    <GameContext.Provider value={{ gameState, setGameState }}>
      {children}
    </GameContext.Provider>
  );
}
```

#### 2.2 Socket.IO Hook
**File:** `client/src/hooks/useSocket.js`

```jsx
// Custom hook for Socket.IO
export function useSocket() {
  const { gameState, setGameState } = useContext(GameContext);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io('http://localhost:3000');

    // All socket event listeners here
    socket.current.on('welcome', (data) => {
      setGameState(prev => ({ ...prev, playerId: data.playerId }));
    });

    // ... all other listeners

    return () => socket.current.disconnect();
  }, []);

  return socket.current;
}
```

#### 2.3 Main App & Routing
**File:** `client/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import ShipSelection from './components/ShipSelection';
import CombatScreen from './components/CombatScreen';
import { GameProvider } from './context/GameContext';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/ship-selection" element={<ShipSelection />} />
          <Route path="/combat" element={<CombatScreen />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
```

**Deliverable:** Basic app structure with routing

---

### Phase 3: Migrate Screens (2 hours)

#### 3.1 Main Menu
**Source:** `public/index.html` (main-menu-screen div)
**Target:** `client/src/components/MainMenu.jsx`

```jsx
export default function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="main-menu">
      <h1>⚔️ Traveller Combat VTT</h1>
      <button onClick={() => navigate('/ship-selection?mode=multiplayer')}>
        ⚔️ Space Battle (Multiplayer)
      </button>
      <button onClick={() => navigate('/ship-selection?mode=solo')}>
        🤖 Solo Battle (vs AI)
      </button>
      {/* ... other buttons */}
    </div>
  );
}
```

#### 3.2 Ship Selection
**Source:** `public/index.html` (ship-selection-screen div)
**Target:** `client/src/components/ShipSelection.jsx`

- Extract ship cards to `ShipCard.jsx` component
- Read mode from URL params
- Socket.IO selection logic via `useSocket` hook
- Navigate to `/combat` when ready

#### 3.3 Combat Screen
**Source:** `public/index.html` (space-combat-screen div)
**Target:** `client/src/components/CombatScreen.jsx`

- Extract weapon panel to `WeaponPanel.jsx`
- Extract combat log to `CombatLog.jsx`
- All combat logic via Socket.IO

**Deliverable:** All main screens working in React

---

### Phase 4: Migrate Tutorial System (2 hours)

#### 4.1 Tutorial Components
**Source:** `public/tutorial-*.js`
**Target:** `client/src/components/Tutorial/`

**Convert to React:**
- `TutorialModal.jsx` - React component with props
- `TutorialPointer.jsx` - React component with absolute positioning
- `TutorialTooltip.jsx` - React component
- `TutorialChat.jsx` - React component
- `TutorialPlayer.jsx` - React hook or context
- `TutorialScenarios.js` - Keep as data file

#### 4.2 Tutorial Integration
**Key advantage:** Tutorial components mount ONCE at app level, stay mounted during all route changes!

```jsx
// In App.jsx
export default function App() {
  const [tutorialActive, setTutorialActive] = useState(false);

  return (
    <GameProvider>
      {tutorialActive && <TutorialPlayer scenario="first-blood" />}
      <BrowserRouter>
        <Routes>
          {/* ... routes */}
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
```

**Deliverable:** Tutorial works seamlessly across all screens

---

### Phase 5: Styling (1 hour)

**Options:**
1. **Keep existing CSS** - Import `styles.css` and `tutorial.css`
2. **CSS Modules** - Scope CSS to components
3. **Styled Components** - CSS-in-JS
4. **Tailwind CSS** - Utility classes

**Recommendation:** Start with existing CSS, refine later

---

### Phase 6: Testing (1 hour)

**Test Matrix:**
- [ ] Main menu loads
- [ ] Solo mode flow works end-to-end
- [ ] Multiplayer mode works (2 tabs)
- [ ] Combat actions (fire, dodge, end turn)
- [ ] Tutorial works in solo mode
- [ ] Tutorial modal persists across screens
- [ ] Pointer positioning correct
- [ ] Socket.IO events working
- [ ] Ship selection
- [ ] Range selection
- [ ] Combat log updates
- [ ] Damage calculation
- [ ] Turn order
- [ ] AI opponent works

---

## Migration Tracking Document

**File:** `docs/REACT-MIGRATION-LOG.md`

Track in real-time:
- What worked
- What broke
- How we fixed it
- Time spent on each phase
- Gotchas for next time

---

## Rollback Plan

If React migration fails:
1. Switch back to `main` branch
2. Current vanilla JS code still works
3. No data loss (backend unchanged)
4. Can retry migration anytime

---

## Success Criteria

**Merge `react-refactor` → `main` ONLY if:**
- ✅ All screens work identically to vanilla version
- ✅ Solo mode works end-to-end
- ✅ Multiplayer works (2 tabs)
- ✅ Tutorial completes without errors
- ✅ Tutorial modal stays visible across all screens
- ✅ Socket.IO events working
- ✅ No console errors
- ✅ Performance acceptable (no lag)

---

## Estimated Timeline

- **Phase 1:** 30 min - Setup
- **Phase 2:** 1 hour - Core components
- **Phase 3:** 2 hours - Migrate screens
- **Phase 4:** 2 hours - Migrate tutorial
- **Phase 5:** 1 hour - Styling
- **Phase 6:** 1 hour - Testing

**Total:** ~7-8 hours of focused work

**Realistic:** 2-3 sessions with breaks and debugging

---

## Next Steps

1. **Review this plan** - User approval
2. **Create branch** - `git checkout -b react-refactor`
3. **Start Phase 1** - Vite setup
4. **Document issues** - Real-time in REACT-MIGRATION-LOG.md
5. **Test frequently** - After each phase
6. **Merge when perfect** - No compromises

---

## Questions for User

1. **Styling approach?** Keep existing CSS or try CSS Modules/Tailwind?
2. **State management?** Context API (simple) or Redux (overkill)?
3. **TypeScript?** Convert to TS now or later?
4. **Ship templates page?** Migrate now or leave as separate HTML?

---

*Generated: 2025-11-14*
*Branch: main → react-refactor*
*Session: 8, Stage 14 refactor*
