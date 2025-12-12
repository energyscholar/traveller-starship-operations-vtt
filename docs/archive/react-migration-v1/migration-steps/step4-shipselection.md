# Step 4: Ship Selection Component

## Objective
Migrate the ship selection screen from vanilla HTML/JS to React. This includes ship cards, selection logic, mode detection (solo/multiplayer), and Socket.IO ready event handling.

## Prerequisites
- [x] Step 1 complete (foundation)
- [x] Step 2 complete (infrastructure)
- [x] Step 3 complete (main menu)
- [x] On `react-refactor` branch
- [x] Main menu navigation working

## Branch Strategy
Continue on `react-refactor` branch. Commit after this step completes successfully.

## Implementation Details

### 4.1 Analyze Existing Ship Selection
**Source:** `public/index.html` - Look for `ship-selection-screen` div
**Source:** `public/client.js` - Look for ship selection logic

Key elements to migrate:
- Mode detection from URL params (solo vs multiplayer)
- Ship card display (multiple ship options)
- Ship selection logic
- Ready button
- Socket.IO events: `space:selectShip`, `space:ready`, `space:autoAssigned`
- Auto-navigation to combat when ready

### 4.2 Create Shared ShipCard Component
**File:** `client/src/components/shared/ShipCard.tsx`

```typescript
interface ShipCardProps {
  shipName: string;
  selected: boolean;
  onSelect: (shipName: string) => void;
  disabled?: boolean;
  description?: string;
}

export default function ShipCard({
  shipName,
  selected,
  onSelect,
  disabled = false,
  description,
}: ShipCardProps) {
  const handleClick = () => {
    if (!disabled) {
      onSelect(shipName);
    }
  };

  return (
    <div
      className={`ship-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      data-test-id={`ship-card-${shipName.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="ship-card-header">
        <h3>{shipName}</h3>
        {selected && <span className="selected-badge">✓ Selected</span>}
      </div>
      {description && (
        <div className="ship-card-description">
          <p>{description}</p>
        </div>
      )}
    </div>
  );
}
```

**Why a shared component?**
- Reusable for multiple ships
- Consistent styling
- Easy to test
- Can use in customizer (Step 7)

### 4.3 Create ShipSelection Component
**File:** `client/src/components/ShipSelection.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import ShipCard from './shared/ShipCard';

// Available ships (from data/ships.json or hardcoded for now)
const AVAILABLE_SHIPS = [
  { name: 'Scout Ship', description: 'Fast and maneuverable, light armament' },
  { name: 'Free Trader', description: 'Balanced ship with moderate firepower' },
  { name: 'Patrol Corvette', description: 'Military vessel, heavy weapons' },
  { name: 'Corsair', description: 'Pirate ship, aggressive loadout' },
];

export default function ShipSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gameState, updateGameState } = useGame();
  const socket = useSocket();

  const mode = searchParams.get('mode') || 'multiplayer';
  const [selectedShip, setSelectedShip] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Update game mode
  useEffect(() => {
    updateGameState({ mode: mode as 'solo' | 'multiplayer' });
  }, [mode, updateGameState]);

  // Handle ship selection
  const handleShipSelect = (shipName: string) => {
    setSelectedShip(shipName);
    updateGameState({ playerShip: shipName });

    // Emit to server
    if (socket) {
      socket.emit('space:selectShip', { ship: shipName });
    }
  };

  // Handle ready button
  const handleReady = () => {
    if (!selectedShip) {
      alert('Please select a ship first!');
      return;
    }

    setIsReady(true);

    // Emit ready to server
    if (socket) {
      socket.emit('space:ready', { ship: selectedShip, mode });
    }

    // Navigate to combat
    // In multiplayer, wait for server confirmation
    // In solo, immediate navigation
    if (mode === 'solo') {
      setTimeout(() => {
        navigate('/combat');
      }, 500);
    }
  };

  // Listen for auto-assignment (multiplayer)
  useEffect(() => {
    if (gameState.playerShip && !selectedShip) {
      setSelectedShip(gameState.playerShip);
    }
  }, [gameState.playerShip, selectedShip]);

  // Listen for combat start (navigate)
  useEffect(() => {
    if (gameState.combat) {
      navigate('/combat');
    }
  }, [gameState.combat, navigate]);

  return (
    <div className="ship-selection-screen" data-screen="ship-selection">
      {/* Header */}
      <div className="header">
        <h1>🚀 Select Your Spacecraft</h1>
        <div className="mode-info">
          Mode: {mode === 'solo' ? '🤖 Solo (vs AI)' : '👥 Multiplayer'}
        </div>
      </div>

      {/* Ship Cards */}
      <div className="card ship-selection-card">
        <h2>Choose Your Ship</h2>

        <div className="ship-grid">
          {AVAILABLE_SHIPS.map((ship) => (
            <ShipCard
              key={ship.name}
              shipName={ship.name}
              description={ship.description}
              selected={selectedShip === ship.name}
              onSelect={handleShipSelect}
              disabled={isReady}
            />
          ))}
        </div>

        {/* Ready Button */}
        <div className="selection-actions">
          <button
            className="ready-button"
            onClick={handleReady}
            disabled={!selectedShip || isReady}
            data-test-id="btn-ready"
          >
            {isReady ? '⏳ Waiting...' : '✓ Ready for Combat'}
          </button>

          <button
            className="back-button"
            onClick={() => navigate('/')}
            data-test-id="btn-back"
          >
            ← Back to Menu
          </button>
        </div>
      </div>

      {/* Status Display */}
      {isReady && (
        <div className="card status-card">
          <p>
            {mode === 'multiplayer'
              ? 'Waiting for opponent...'
              : 'Starting combat...'}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Key Features:**
- Reads mode from URL params
- Socket.IO ship selection
- Ready event handling
- Auto-navigation when combat starts
- Disabled state after ready
- Back button for navigation

### 4.4 Add CSS for Ship Selection
**File:** `client/src/ship-selection.css`

```css
.ship-selection-screen {
  padding: 2rem;
}

.mode-info {
  text-align: center;
  font-size: 1.2rem;
  color: #888;
  margin-top: 0.5rem;
}

.ship-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.ship-card {
  border: 2px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #1a1a1a;
}

.ship-card:hover {
  border-color: #666;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.ship-card.selected {
  border-color: #00ff00;
  background: #002200;
}

.ship-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ship-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.selected-badge {
  color: #00ff00;
  font-weight: bold;
}

.ship-card-description {
  font-size: 0.9rem;
  color: #aaa;
}

.selection-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.ready-button {
  background: #00aa00;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.ready-button:hover:not(:disabled) {
  background: #00cc00;
}

.ready-button:disabled {
  background: #444;
  cursor: not-allowed;
}

.back-button {
  background: #555;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.back-button:hover {
  background: #666;
}

.status-card {
  text-align: center;
  font-size: 1.2rem;
  color: #888;
}
```

Import in App.css:

```css
@import './ship-selection.css';
```

### 4.5 Update App.tsx Routes
Replace placeholder ShipSelection route:

```typescript
import ShipSelection from './components/ShipSelection';

// Routes already added in Step 3, just verify:
<Route path="/ship-selection" element={<ShipSelection />} />
```

### 4.6 Handle Socket.IO Auto-Assignment
The server may auto-assign ships in multiplayer mode. The useSocket hook already handles `space:autoAssigned` event, which updates gameState.playerShip.

The ShipSelection component listens for this via the useEffect that watches `gameState.playerShip`.

## Tests to Add

### Temporary Test 1: Solo Mode Flow
```bash
# Start both servers
npm run dev
cd client && npm run dev

# Browser: http://localhost:5173
# 1. Click "Solo Battle (vs AI)"
# 2. Should navigate to /ship-selection?mode=solo
# 3. Should show "Mode: 🤖 Solo (vs AI)"
# 4. Click a ship card
# 5. Card should show "✓ Selected"
# 6. Click "Ready for Combat"
# 7. Should navigate to /combat after brief delay
```

### Temporary Test 2: Multiplayer Mode
```bash
# Browser Tab 1: http://localhost:5173
# Click "Space Battle (Multiplayer)"
# Select ship
# Click Ready

# Browser Tab 2: http://localhost:5173
# Click "Space Battle (Multiplayer)"
# Select ship
# Click Ready

# Both tabs should navigate to /combat when both ready
```

### Temporary Test 3: Ship Selection Socket Events
In browser console:
```javascript
// After clicking ship, should see:
// [Socket] emitting space:selectShip with { ship: "Scout Ship" }

// After clicking ready:
// [Socket] emitting space:ready with { ship: "Scout Ship", mode: "solo" }
```

### Temporary Test 4: Back Button
```bash
# Navigate to ship selection
# Click "Back to Menu"
# Should return to main menu
# No page reload
```

## Success Criteria

- [ ] ShipSelection component created
- [ ] ShipCard reusable component created
- [ ] Component renders without errors
- [ ] Mode detection works (URL params)
- [ ] Ship cards display correctly
- [ ] Ship selection updates UI
- [ ] Socket.IO events emitted correctly
- [ ] Ready button works
- [ ] Auto-navigation to combat
- [ ] Back button returns to main menu
- [ ] Multiplayer: waits for both players
- [ ] Solo: immediate combat start
- [ ] All `data-test-id` attributes preserved
- [ ] CSS styling looks good
- [ ] No TypeScript errors

## Cleanup Checklist

**During Step 4:**
- No temporary files to delete

**After entire migration (Step 8):**
- May need to load ships from data/ships.json instead of hardcoded array
- Remove placeholder combat component

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix and continue
# Common fixes:
# - Check socket events match server expectations
# - Verify URL params parsing
# - Check navigation logic

# Option 2: Rollback to Step 3
git reset --hard HEAD~1

# Option 3: Abandon
git checkout main
git branch -D react-refactor
```

## Time Estimate

- **Minimum:** 1 hour (straightforward migration)
- **Expected:** 1.5-2 hours (with socket testing)
- **Maximum:** 3 hours (if socket event issues)

## Common Issues

### Issue 1: Ships Not Loading
**Error:** No ship cards appear

**Fix:**
- Check AVAILABLE_SHIPS array is defined
- Verify map() function has correct syntax
- Check CSS grid styling

### Issue 2: Socket Events Not Firing
**Error:** Server doesn't receive selectShip or ready events

**Fix:**
```typescript
// Verify socket exists before emitting
if (socket && socket.connected) {
  socket.emit('space:selectShip', { ship: shipName });
}

// Check server.js handles these events
grep "space:selectShip" server.js
grep "space:ready" server.js
```

### Issue 3: Mode Not Detected
**Error:** Mode shows null or wrong value

**Fix:**
```typescript
// Debug URL params
const mode = searchParams.get('mode');
console.log('Mode from URL:', mode);

// Ensure navigate includes mode:
navigate('/ship-selection?mode=solo');
```

### Issue 4: Auto-Navigation Not Working
**Error:** Doesn't navigate to combat after ready

**Fix:**
```typescript
// Check gameState.combat is being set
useEffect(() => {
  console.log('Combat state:', gameState.combat);
  if (gameState.combat) {
    navigate('/combat');
  }
}, [gameState.combat, navigate]);
```

### Issue 5: Ship Cards Not Clickable
**Error:** Clicking ship doesn't select it

**Fix:**
- Verify onClick handler in ShipCard component
- Check disabled prop is not always true
- Verify CSS cursor: pointer is set

## Commit Message

```bash
git add -A
git commit -m "feat(step4): Migrate ship selection screen to React

- Created ShipSelection.tsx component
  - Mode detection from URL params (solo/multiplayer)
  - Ship selection logic with visual feedback
  - Ready button with Socket.IO integration
  - Auto-navigation to combat when ready
  - Back button to main menu

- Created ShipCard.tsx reusable component
  - Selected state visual indicator
  - Disabled state support
  - Click handling
  - Maintains test IDs

- Socket.IO integration
  - Emits space:selectShip on ship selection
  - Emits space:ready when ready button clicked
  - Listens for space:autoAssigned (multiplayer)
  - Listens for combat start to navigate

- Added ship-selection.css for styling
  - Responsive grid layout
  - Ship card hover effects
  - Selected state styling
  - Button states

Tested:
- Solo mode: ship selection → ready → combat
- Multiplayer mode: both players ready → combat
- Back button returns to menu
- Socket events emitted correctly
- Styling looks good
- No TypeScript errors

Next: Step 5 - Combat display (HUD and ship info)

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 5: Combat Display** - Migrate combat screen HUD, ship displays, and range selection.
