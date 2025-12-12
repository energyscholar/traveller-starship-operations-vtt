# Step 5: Combat Display (HUD & Ship Info)

## Objective
Migrate the combat screen display elements: HUD, ship information panels, range display, and turn indicators. This step focuses on the READ-ONLY display parts of combat (not actions yet - those come in Step 6).

## Prerequisites
- [x] Step 1 complete (foundation)
- [x] Step 2 complete (infrastructure)
- [x] Step 3 complete (main menu)
- [x] Step 4 complete (ship selection)
- [x] On `react-refactor` branch
- [x] Can navigate to combat screen

## Branch Strategy
Continue on `react-refactor` branch. Commit after this step completes successfully.

## Implementation Details

### 5.1 Analyze Existing Combat Screen
**Source:** `public/index.html` - Look for `space-combat-screen` div
**Source:** `public/client.js` - Look for combat update logic

Key display elements:
- Combat HUD (header, turn info, player info)
- Player ship panel (hull, armor, weapons status)
- Opponent ship panel
- Range display
- Turn indicator (whose turn it is)
- Combat log display
- Range selection buttons (before combat starts)

### 5.2 Create Ship Display Component
**File:** `client/src/components/shared/ShipDisplay.tsx`

```typescript
import { PlayerInfo } from '../../types/game-state';

interface ShipDisplayProps {
  ship: PlayerInfo | null;
  isPlayer: boolean;
  isActive?: boolean;
}

export default function ShipDisplay({ ship, isPlayer, isActive = false }: ShipDisplayProps) {
  if (!ship) {
    return (
      <div className="ship-display ship-display-empty">
        <p>Waiting for ship data...</p>
      </div>
    );
  }

  const hullPercent = ship.maxHull ? (ship.hull! / ship.maxHull) * 100 : 100;

  return (
    <div
      className={`ship-display ${isPlayer ? 'player-ship' : 'opponent-ship'} ${
        isActive ? 'active-turn' : ''
      }`}
      data-test-id={isPlayer ? 'player-ship-display' : 'opponent-ship-display'}
    >
      <div className="ship-header">
        <h3>
          {isPlayer ? '🚀 Your Ship' : '💀 Opponent'}
          {isActive && <span className="active-indicator">⚡ ACTIVE</span>}
        </h3>
        <div className="ship-name">{ship.ship}</div>
      </div>

      <div className="ship-stats">
        <div className="stat-row">
          <span className="stat-label">Hull:</span>
          <div className="stat-bar-container">
            <div
              className="stat-bar hull-bar"
              style={{ width: `${hullPercent}%` }}
            />
            <span className="stat-value">
              {ship.hull}/{ship.maxHull}
            </span>
          </div>
        </div>

        {ship.armor !== undefined && (
          <div className="stat-row">
            <span className="stat-label">Armor:</span>
            <span className="stat-value">{ship.armor}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.3 Create Combat Log Component
**File:** `client/src/components/shared/CombatLog.tsx`

```typescript
import { useEffect, useRef } from 'react';
import { LogEntry } from '../../types/game-state';

interface CombatLogProps {
  entries: LogEntry[];
  maxEntries?: number;
}

export default function CombatLog({ entries, maxEntries = 50 }: CombatLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Limit entries to prevent performance issues
  const displayEntries = entries.slice(-maxEntries);

  return (
    <div className="combat-log" data-test-id="combat-log">
      <div className="combat-log-header">
        <h3>📜 Combat Log</h3>
        <span className="log-count">{entries.length} events</span>
      </div>

      <div className="combat-log-entries">
        {displayEntries.length === 0 ? (
          <div className="log-entry log-empty">
            <em>No combat events yet...</em>
          </div>
        ) : (
          displayEntries.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className={`log-entry log-${entry.type || 'info'}`}
            >
              <span className="log-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-message">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
```

### 5.4 Create Range Selection Component
**File:** `client/src/components/shared/RangeSelection.tsx`

```typescript
interface RangeSelectionProps {
  onSelectRange: (range: string) => void;
  disabled?: boolean;
}

const RANGES = ['Close', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'];

export default function RangeSelection({ onSelectRange, disabled = false }: RangeSelectionProps) {
  return (
    <div className="range-selection" data-test-id="range-selection">
      <h3>Select Starting Range</h3>
      <div className="range-buttons">
        {RANGES.map((range) => (
          <button
            key={range}
            className="range-button"
            onClick={() => onSelectRange(range)}
            disabled={disabled}
            data-test-id={`range-${range.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 5.5 Create Main Combat Screen Component
**File:** `client/src/components/CombatScreen.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import ShipDisplay from './shared/ShipDisplay';
import CombatLog from './shared/CombatLog';
import RangeSelection from './shared/RangeSelection';

export default function CombatScreen() {
  const navigate = useNavigate();
  const { gameState, updateGameState, addLogEntry } = useGame();
  const socket = useSocket();

  const [rangeSelected, setRangeSelected] = useState(false);
  const [combatStarted, setCombatStarted] = useState(false);

  // Check if combat has started
  useEffect(() => {
    if (gameState.combat) {
      setCombatStarted(true);
      setRangeSelected(true);
    }
  }, [gameState.combat]);

  // Handle range selection
  const handleRangeSelect = (range: string) => {
    if (socket) {
      socket.emit('space:selectRange', { range });
      updateGameState({ selectedRange: range });
      setRangeSelected(true);
      addLogEntry(`Selected range: ${range}`, 'info');
    }
  };

  // Check whose turn it is
  const isPlayerTurn = gameState.currentTurn === gameState.playerNumber;

  // Get ship info from combat state
  const playerShip = gameState.combat?.player1?.id === gameState.playerNumber
    ? gameState.combat?.player1
    : gameState.combat?.player2;

  const opponentShip = gameState.combat?.player1?.id === gameState.playerNumber
    ? gameState.combat?.player2
    : gameState.combat?.player1;

  return (
    <div className="combat-screen" data-screen="combat">
      {/* Header */}
      <div className="header">
        <h1>⚔️ Space Combat</h1>
        {combatStarted && gameState.combat && (
          <div className="combat-info">
            <span className="turn-info">
              Turn {gameState.combat.turn}
            </span>
            <span className="range-info">
              Range: {gameState.combat.range || gameState.selectedRange || 'Unknown'}
            </span>
            <span className="mode-info">
              Mode: {gameState.mode === 'solo' ? '🤖 Solo' : '👥 Multiplayer'}
            </span>
          </div>
        )}
      </div>

      {/* Range Selection (before combat starts) */}
      {!combatStarted && !rangeSelected && (
        <div className="card range-card">
          <RangeSelection
            onSelectRange={handleRangeSelect}
            disabled={rangeSelected}
          />
        </div>
      )}

      {/* Waiting for Combat */}
      {rangeSelected && !combatStarted && (
        <div className="card waiting-card">
          <p>⏳ Waiting for combat to start...</p>
          <p>Range selected: {gameState.selectedRange}</p>
        </div>
      )}

      {/* Combat Display */}
      {combatStarted && (
        <>
          {/* Turn Indicator */}
          <div className="card turn-indicator-card">
            <div className={`turn-indicator ${isPlayerTurn ? 'your-turn' : 'opponent-turn'}`}>
              {isPlayerTurn ? '⚡ YOUR TURN' : '⏳ Opponent\'s Turn'}
            </div>
          </div>

          {/* Ship Displays */}
          <div className="ships-container">
            <div className="ship-panel">
              <ShipDisplay
                ship={playerShip || null}
                isPlayer={true}
                isActive={isPlayerTurn}
              />
            </div>

            <div className="ship-panel">
              <ShipDisplay
                ship={opponentShip || null}
                isPlayer={false}
                isActive={!isPlayerTurn}
              />
            </div>
          </div>

          {/* Combat Log */}
          <div className="card log-card">
            <CombatLog entries={gameState.combatLog} />
          </div>

          {/* Action Panel Placeholder */}
          <div className="card actions-card">
            <h3>Combat Actions</h3>
            <p>Actions will be added in Step 6...</p>
            <button
              onClick={() => navigate('/')}
              data-test-id="btn-exit-combat"
            >
              Exit Combat (Debug)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 5.6 Add Combat CSS
**File:** `client/src/combat.css`

```css
.combat-screen {
  padding: 2rem;
}

.combat-info {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 1rem;
  font-size: 1.1rem;
}

.turn-info,
.range-info,
.mode-info {
  padding: 0.5rem 1rem;
  background: #2a2a2a;
  border-radius: 4px;
}

/* Range Selection */
.range-selection {
  text-align: center;
  padding: 2rem;
}

.range-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.range-button {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  background: #444;
  color: white;
  border: 2px solid #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.range-button:hover:not(:disabled) {
  background: #555;
  border-color: #888;
  transform: translateY(-2px);
}

.range-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Turn Indicator */
.turn-indicator-card {
  text-align: center;
  padding: 1rem;
  font-size: 1.5rem;
  font-weight: bold;
}

.turn-indicator.your-turn {
  color: #00ff00;
  animation: pulse 2s ease-in-out infinite;
}

.turn-indicator.opponent-turn {
  color: #ff6600;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Ships Container */
.ships-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .ships-container {
    grid-template-columns: 1fr;
  }
}

/* Ship Display */
.ship-display {
  padding: 1.5rem;
  border: 2px solid #444;
  border-radius: 8px;
  background: #1a1a1a;
}

.ship-display.active-turn {
  border-color: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.ship-header {
  margin-bottom: 1rem;
}

.ship-name {
  font-size: 1.3rem;
  color: #aaa;
  margin-top: 0.5rem;
}

.active-indicator {
  color: #00ff00;
  font-size: 0.9rem;
  margin-left: 1rem;
  animation: pulse 1s ease-in-out infinite;
}

.ship-stats {
  margin-top: 1rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;
}

.stat-label {
  min-width: 80px;
  font-weight: bold;
  color: #888;
}

.stat-bar-container {
  flex: 1;
  position: relative;
  height: 24px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.stat-bar {
  height: 100%;
  transition: width 0.5s ease;
}

.hull-bar {
  background: linear-gradient(90deg, #ff0000, #00ff00);
}

.stat-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px black;
}

/* Combat Log */
.combat-log {
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.combat-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #444;
}

.log-count {
  color: #888;
  font-size: 0.9rem;
}

.combat-log-entries {
  flex: 1;
  overflow-y: auto;
  max-height: 250px;
}

.log-entry {
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-left: 3px solid #444;
  background: #1a1a1a;
}

.log-entry.log-info {
  border-left-color: #4488ff;
}

.log-entry.log-success {
  border-left-color: #00ff00;
}

.log-entry.log-warning {
  border-left-color: #ffaa00;
}

.log-entry.log-error {
  border-left-color: #ff0000;
}

.log-time {
  color: #888;
  font-size: 0.85rem;
  margin-right: 1rem;
}

.log-message {
  color: #ddd;
}

.log-empty {
  color: #666;
  font-style: italic;
  text-align: center;
}
```

Import in App.css:

```css
@import './combat.css';
```

## Tests to Add

### Temporary Test 1: Navigate to Combat
```bash
# Start both servers
# Navigate: Main Menu → Ship Selection → Combat
# Should display range selection
```

### Temporary Test 2: Range Selection
```bash
# In combat screen (before combat starts)
# Should see range buttons
# Click "Medium"
# Should emit space:selectRange event
# Should show "Waiting for combat to start..."
```

### Temporary Test 3: Combat Display
```bash
# After combat starts (may need to trigger via server)
# Should show:
# - Turn indicator
# - Player ship display
# - Opponent ship display
# - Combat log
# - Hull bars with percentages
```

### Temporary Test 4: Combat Log Auto-Scroll
```javascript
// Add many log entries
for (let i = 0; i < 20; i++) {
  addLogEntry(`Test message ${i}`, 'info');
}
// Log should auto-scroll to bottom
```

## Success Criteria

- [ ] CombatScreen component created
- [ ] ShipDisplay component created
- [ ] CombatLog component created
- [ ] RangeSelection component created
- [ ] Range selection works
- [ ] Combat display shows ship info
- [ ] Hull bars display with correct percentages
- [ ] Turn indicator shows correct player
- [ ] Combat log displays entries
- [ ] Combat log auto-scrolls
- [ ] Active turn highlighting works
- [ ] CSS styling looks good
- [ ] All `data-test-id` attributes preserved
- [ ] No TypeScript errors

## Cleanup Checklist

**During Step 5:**
- No temporary files to delete

**After entire migration (Step 8):**
- Remove debug "Exit Combat" button
- May need to adjust ship data structure based on server

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix and continue
# Check combat state structure matches server
# Verify socket events

# Option 2: Rollback to Step 4
git reset --hard HEAD~1

# Option 3: Abandon
git checkout main
git branch -D react-refactor
```

## Time Estimate

- **Minimum:** 1.5 hours (straightforward display components)
- **Expected:** 2-2.5 hours (with CSS and testing)
- **Maximum:** 3 hours (if combat state structure issues)

## Common Issues

### Issue 1: Ship Data Not Displaying
**Error:** "Waiting for ship data..." shows even during combat

**Fix:**
```typescript
// Debug combat state structure
console.log('Combat state:', gameState.combat);
console.log('Player number:', gameState.playerNumber);

// Check player matching logic
const playerShip = gameState.combat?.player1?.id === gameState.playerNumber
  ? gameState.combat?.player1
  : gameState.combat?.player2;
```

### Issue 2: Hull Bar Not Showing
**Error:** Hull bar is empty or 100% when it shouldn't be

**Fix:**
```typescript
// Check hull values
console.log('Hull:', ship.hull, 'Max:', ship.maxHull);

// Ensure maxHull is set
const hullPercent = ship.maxHull ? (ship.hull! / ship.maxHull) * 100 : 0;
```

### Issue 3: Turn Indicator Wrong
**Error:** Shows wrong player's turn

**Fix:**
```typescript
// Debug turn logic
console.log('Current turn:', gameState.currentTurn);
console.log('Player number:', gameState.playerNumber);
console.log('Is player turn?', isPlayerTurn);
```

### Issue 4: Combat Log Not Scrolling
**Error:** Log doesn't auto-scroll to bottom

**Fix:**
- Verify ref is attached to element
- Check useEffect dependency array
- Try `scrollIntoView({ behavior: 'auto' })` instead of 'smooth'

## Commit Message

```bash
git add -A
git commit -m "feat(step5): Combat display - HUD, ships, and combat log

- Created CombatScreen.tsx with full display
  - Range selection before combat
  - Turn indicator with visual feedback
  - Combat info header (turn, range, mode)
  - Waiting states between phases

- Created ShipDisplay.tsx component
  - Hull bar with percentage visual
  - Armor display
  - Active turn highlighting
  - Player vs opponent differentiation

- Created CombatLog.tsx component
  - Auto-scrolling to latest entries
  - Color-coded entry types (info/success/warning/error)
  - Timestamps for each entry
  - Entry count display

- Created RangeSelection.tsx component
  - All range options
  - Disabled state after selection
  - Socket.IO integration

- Added combat.css with responsive design
  - Ship panel grid layout
  - Hull bar animations
  - Turn indicator pulse effect
  - Combat log styling

Tested:
- Range selection and socket emission
- Combat display shows correct data
- Hull bars display correctly
- Turn indicator updates
- Combat log auto-scrolls
- Styling looks professional
- No TypeScript errors

Next: Step 6 - Combat actions (fire, dodge, end turn)

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 6: Combat Actions** - Add weapon panels, fire buttons, defensive actions, and turn management.
