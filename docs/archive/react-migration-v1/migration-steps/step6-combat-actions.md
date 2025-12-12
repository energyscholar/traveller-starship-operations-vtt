# Step 6: Combat Actions (Weapons & Turn Management)

## Objective
Add interactive combat actions: weapon firing, defensive maneuvers (dodge, point defense, sandcaster), and turn management. This completes the combat functionality.

## Prerequisites
- [x] Step 1 complete (foundation)
- [x] Step 2 complete (infrastructure)
- [x] Step 3 complete (main menu)
- [x] Step 4 complete (ship selection)
- [x] Step 5 complete (combat display)
- [x] On `react-refactor` branch
- [x] Combat screen displays ship info

## Branch Strategy
Continue on `react-refactor` branch. Commit after this step completes successfully.

## Implementation Details

### 6.1 Analyze Existing Combat Actions
**Source:** `public/client.js` - Look for weapon firing and action handlers

Key actions to migrate:
- Fire weapon (turret + weapon selection)
- Dodge maneuver
- Point defense
- Sandcaster defense
- End turn
- Action validation (only during player's turn)
- Action feedback (results in combat log)

### 6.2 Create Weapon Panel Component
**File:** `client/src/components/shared/WeaponPanel.tsx`

```typescript
import { useState } from 'react';

interface Weapon {
  name: string;
  type: string;
  damage?: string;
  range?: string;
}

interface Turret {
  name: string;
  weapons: Weapon[];
}

interface WeaponPanelProps {
  turrets: Turret[];
  onFire: (turretIndex: number, weaponIndex: number) => void;
  disabled: boolean;
}

export default function WeaponPanel({ turrets, onFire, disabled }: WeaponPanelProps) {
  const [selectedTurret, setSelectedTurret] = useState<number>(0);
  const [selectedWeapon, setSelectedWeapon] = useState<number>(0);

  const handleFire = () => {
    onFire(selectedTurret, selectedWeapon);
  };

  if (!turrets || turrets.length === 0) {
    return (
      <div className="weapon-panel">
        <p>No weapons available</p>
      </div>
    );
  }

  const currentTurret = turrets[selectedTurret];

  return (
    <div className="weapon-panel" data-test-id="weapon-panel">
      <h3>🔫 Weapons</h3>

      {/* Turret Selection */}
      {turrets.length > 1 && (
        <div className="turret-selection">
          <label>Turret:</label>
          <select
            value={selectedTurret}
            onChange={(e) => setSelectedTurret(Number(e.target.value))}
            disabled={disabled}
            data-test-id="turret-select"
          >
            {turrets.map((turret, index) => (
              <option key={index} value={index}>
                {turret.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Weapon Selection */}
      {currentTurret && currentTurret.weapons && (
        <div className="weapon-selection">
          <label>Weapon:</label>
          <select
            value={selectedWeapon}
            onChange={(e) => setSelectedWeapon(Number(e.target.value))}
            disabled={disabled}
            data-test-id="weapon-select"
          >
            {currentTurret.weapons.map((weapon, index) => (
              <option key={index} value={index}>
                {weapon.name}
                {weapon.damage && ` (${weapon.damage})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fire Button */}
      <button
        className="fire-button"
        onClick={handleFire}
        disabled={disabled}
        data-test-id="btn-fire"
      >
        🔥 FIRE
      </button>
    </div>
  );
}
```

### 6.3 Create Defensive Actions Component
**File:** `client/src/components/shared/DefensiveActions.tsx`

```typescript
interface DefensiveActionsProps {
  onDodge: () => void;
  onPointDefense: () => void;
  onSandcaster: () => void;
  disabled: boolean;
  hasPointDefense?: boolean;
  hasSandcaster?: boolean;
}

export default function DefensiveActions({
  onDodge,
  onPointDefense,
  onSandcaster,
  disabled,
  hasPointDefense = true,
  hasSandcaster = true,
}: DefensiveActionsProps) {
  return (
    <div className="defensive-actions" data-test-id="defensive-actions">
      <h3>🛡️ Defensive Maneuvers</h3>

      <div className="defense-buttons">
        <button
          className="defense-button dodge-button"
          onClick={onDodge}
          disabled={disabled}
          data-test-id="btn-dodge"
        >
          🔄 Dodge
        </button>

        {hasPointDefense && (
          <button
            className="defense-button point-defense-button"
            onClick={onPointDefense}
            disabled={disabled}
            data-test-id="btn-point-defense"
          >
            🎯 Point Defense
          </button>
        )}

        {hasSandcaster && (
          <button
            className="defense-button sandcaster-button"
            onClick={onSandcaster}
            disabled={disabled}
            data-test-id="btn-sandcaster"
          >
            ⚪ Sandcaster
          </button>
        )}
      </div>
    </div>
  );
}
```

### 6.4 Create Turn Management Component
**File:** `client/src/components/shared/TurnActions.tsx`

```typescript
interface TurnActionsProps {
  onEndTurn: () => void;
  disabled: boolean;
  turn: number;
  isPlayerTurn: boolean;
}

export default function TurnActions({ onEndTurn, disabled, turn, isPlayerTurn }: TurnActionsProps) {
  return (
    <div className="turn-actions" data-test-id="turn-actions">
      <div className="turn-info-panel">
        <h3>Turn {turn}</h3>
        <p className={isPlayerTurn ? 'your-turn-text' : 'opponent-turn-text'}>
          {isPlayerTurn ? '⚡ Your Turn - Take Action!' : '⏳ Opponent is taking their turn...'}
        </p>
      </div>

      <button
        className="end-turn-button"
        onClick={onEndTurn}
        disabled={disabled || !isPlayerTurn}
        data-test-id="btn-end-turn"
      >
        {isPlayerTurn ? '✓ End Turn' : '⏳ Waiting...'}
      </button>
    </div>
  );
}
```

### 6.5 Update CombatScreen with Actions
**File:** `client/src/components/CombatScreen.tsx`

Replace the "Action Panel Placeholder" section with:

```typescript
import WeaponPanel from './shared/WeaponPanel';
import DefensiveActions from './shared/DefensiveActions';
import TurnActions from './shared/TurnActions';

// ... inside CombatScreen component ...

// Mock weapon data (TODO: get from combat state)
const mockTurrets = [
  {
    name: 'Turret 1',
    weapons: [
      { name: 'Pulse Laser', type: 'beam', damage: '2D6' },
      { name: 'Missile Rack', type: 'missile', damage: '4D6' },
    ],
  },
  {
    name: 'Turret 2',
    weapons: [
      { name: 'Beam Laser', type: 'beam', damage: '1D6' },
    ],
  },
];

// Action handlers
const handleFire = (turretIndex: number, weaponIndex: number) => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }

  if (socket) {
    socket.emit('space:fire', { turret: turretIndex, weapon: weaponIndex });
    addLogEntry(`Firing weapon from turret ${turretIndex + 1}...`, 'info');
  }
};

const handleDodge = () => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }

  if (socket) {
    socket.emit('space:dodge', {});
    addLogEntry('Attempting evasive maneuvers...', 'info');
  }
};

const handlePointDefense = () => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }

  if (socket) {
    socket.emit('space:pointDefense', {});
    addLogEntry('Activating point defense systems...', 'info');
  }
};

const handleSandcaster = () => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }

  if (socket) {
    socket.emit('space:sandcaster', {});
    addLogEntry('Deploying sandcaster...', 'info');
  }
};

const handleEndTurn = () => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }

  if (socket) {
    socket.emit('space:endTurn', {});
    addLogEntry('Ending turn...', 'info');
  }
};

// Replace placeholder with actual actions panel:
{combatStarted && (
  <>
    {/* ... existing combat display code ... */}

    {/* Combat Actions */}
    <div className="combat-actions-container">
      <div className="card actions-card">
        <WeaponPanel
          turrets={mockTurrets}
          onFire={handleFire}
          disabled={!isPlayerTurn}
        />
      </div>

      <div className="card actions-card">
        <DefensiveActions
          onDodge={handleDodge}
          onPointDefense={handlePointDefense}
          onSandcaster={handleSandcaster}
          disabled={!isPlayerTurn}
        />
      </div>

      <div className="card actions-card">
        <TurnActions
          onEndTurn={handleEndTurn}
          disabled={!isPlayerTurn}
          turn={gameState.combat?.turn || 0}
          isPlayerTurn={isPlayerTurn}
        />
      </div>
    </div>
  </>
)}
```

### 6.6 Add Combat Actions CSS
Add to `client/src/combat.css`:

```css
/* Combat Actions Container */
.combat-actions-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

/* Weapon Panel */
.weapon-panel {
  padding: 1rem;
}

.turret-selection,
.weapon-selection {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.turret-selection label,
.weapon-selection label {
  font-weight: bold;
  color: #888;
}

.turret-selection select,
.weapon-selection select {
  padding: 0.5rem;
  font-size: 1rem;
  background: #2a2a2a;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
}

.fire-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  background: linear-gradient(135deg, #ff4400, #ff6600);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.fire-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff6600, #ff8800);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 68, 0, 0.5);
}

.fire-button:disabled {
  background: #444;
  cursor: not-allowed;
  opacity: 0.5;
}

/* Defensive Actions */
.defensive-actions {
  padding: 1rem;
}

.defense-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.defense-button {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background: #2a5a8a;
  color: white;
  border: 1px solid #3a6a9a;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.defense-button:hover:not(:disabled) {
  background: #3a6a9a;
  transform: translateX(5px);
}

.defense-button:disabled {
  background: #444;
  border-color: #555;
  cursor: not-allowed;
  opacity: 0.5;
}

.dodge-button {
  background: #2a8a5a;
  border-color: #3a9a6a;
}

.dodge-button:hover:not(:disabled) {
  background: #3a9a6a;
}

/* Turn Actions */
.turn-actions {
  padding: 1rem;
}

.turn-info-panel {
  margin-bottom: 1rem;
  text-align: center;
}

.your-turn-text {
  color: #00ff00;
  font-weight: bold;
}

.opponent-turn-text {
  color: #ff6600;
}

.end-turn-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: bold;
  background: #4488ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.end-turn-button:hover:not(:disabled) {
  background: #5599ff;
}

.end-turn-button:disabled {
  background: #444;
  cursor: not-allowed;
  opacity: 0.5;
}
```

## Tests to Add

### Temporary Test 1: Weapon Firing
```bash
# Start solo combat
# Wait for your turn
# Select weapon
# Click Fire
# Should:
# - Emit space:fire event
# - Add log entry
# - Show result from server
```

### Temporary Test 2: Defensive Actions
```bash
# During your turn
# Click Dodge
# Should emit space:dodge event
# Try Point Defense
# Try Sandcaster
# All should emit respective events
```

### Temporary Test 3: Turn Management
```bash
# During your turn:
# - All action buttons enabled
# - Click End Turn
# Should emit space:endTurn

# During opponent's turn:
# - All action buttons disabled
# - Can't click Fire, Dodge, etc.
# - Shows "Waiting..." message
```

### Temporary Test 4: Action Validation
```javascript
// Try clicking Fire during opponent's turn
// Should show warning: "Not your turn!"
// Should NOT emit event
```

## Success Criteria

- [ ] WeaponPanel component created and functional
- [ ] DefensiveActions component created and functional
- [ ] TurnActions component created and functional
- [ ] CombatScreen updated with all action handlers
- [ ] Fire weapon works (emits correct socket event)
- [ ] Dodge works
- [ ] Point defense works
- [ ] Sandcaster works
- [ ] End turn works
- [ ] Actions only work during player's turn
- [ ] Action buttons disabled during opponent's turn
- [ ] All actions add log entries
- [ ] All `data-test-id` attributes preserved
- [ ] CSS styling looks good
- [ ] No TypeScript errors

## Cleanup Checklist

**During Step 6:**
- TODO: Replace mockTurrets with actual data from combat state

**After entire migration (Step 8):**
- Load turret/weapon data from server combat state
- May need to adjust weapon data structure

## Rollback Procedure

If this step fails:

```bash
# Option 1: Fix and continue
# Debug socket events
# Check server handlers exist

# Option 2: Rollback to Step 5
git reset --hard HEAD~1

# Option 3: Abandon
git checkout main
git branch -D react-refactor
```

## Time Estimate

- **Minimum:** 1.5 hours (straightforward action components)
- **Expected:** 2-2.5 hours (with testing and socket integration)
- **Maximum:** 3 hours (if socket event issues or turn validation problems)

## Common Issues

### Issue 1: Actions Fire During Opponent's Turn
**Error:** Can click buttons during opponent's turn

**Fix:**
```typescript
// Always check isPlayerTurn before emitting
const handleFire = () => {
  if (!isPlayerTurn) {
    addLogEntry('Not your turn!', 'warning');
    return;
  }
  // ... rest of logic
};
```

### Issue 2: Socket Events Not Received
**Error:** Server doesn't respond to fire/dodge/etc.

**Fix:**
```bash
# Check server.js has handlers for these events
grep "space:fire" server.js
grep "space:dodge" server.js
grep "space:endTurn" server.js

# Check event payload structure matches server expectations
```

### Issue 3: Weapon Data Not Loading
**Error:** "No weapons available" shows

**Fix:**
```typescript
// For now, use mock data
// Later, extract from combat state:
const turrets = gameState.combat?.playerShip?.turrets || mockTurrets;
```

### Issue 4: Turn Not Ending
**Error:** Click End Turn, nothing happens

**Fix:**
- Verify socket.emit('space:endTurn') is called
- Check server response
- Ensure currentTurn updates in GameContext

## Commit Message

```bash
git add -A
git commit -m "feat(step6): Combat actions - weapons and turn management

- Created WeaponPanel.tsx component
  - Turret selection dropdown
  - Weapon selection dropdown
  - Fire button with validation
  - Disabled state when not player's turn

- Created DefensiveActions.tsx component
  - Dodge maneuver button
  - Point defense button
  - Sandcaster button
  - Conditional rendering based on ship capabilities

- Created TurnActions.tsx component
  - Turn counter display
  - Turn status message
  - End turn button
  - Auto-disable when not player's turn

- Updated CombatScreen.tsx with action handlers
  - handleFire: emits space:fire event
  - handleDodge: emits space:dodge event
  - handlePointDefense: emits space:pointDefense event
  - handleSandcaster: emits space:sandcaster event
  - handleEndTurn: emits space:endTurn event
  - Turn validation on all actions
  - Combat log feedback for all actions

- Added comprehensive action CSS
  - Fire button with gradient and hover effects
  - Defense buttons with color coding
  - Turn button states
  - Disabled states for all actions
  - Responsive grid layout

Tested:
- All actions work during player's turn
- All actions blocked during opponent's turn
- Socket events emitted correctly
- Combat log shows action feedback
- Button states update properly
- Styling looks professional
- No TypeScript errors

Next: Step 7 - Ship Customizer (optional feature)

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 7: Ship Customizer** - Migrate the ship customizer feature (optional, lower priority).
