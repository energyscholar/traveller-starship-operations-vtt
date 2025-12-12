# Step 7: Ship Customizer (Optional Feature)

## Objective
Migrate the ship customizer interface from vanilla HTML to React. This allows players to create custom ships with weapons, armor, and other components. Lower priority than core combat features.

## Prerequisites
- [x] Step 1 complete (foundation)
- [x] Step 2 complete (infrastructure)
- [x] Step 3 complete (main menu)
- [x] Step 4 complete (ship selection)
- [x] Step 5 complete (combat display)
- [x] Step 6 complete (combat actions)
- [x] On `react-refactor` branch

## Branch Strategy
Continue on `react-refactor` branch. Commit after this step completes successfully.

**Note:** This step is OPTIONAL. If time is limited, skip to Step 8 (Tutorial). Customizer can be migrated later.

## Implementation Details

### 7.1 Analyze Existing Customizer
**Source:** Look for ship customizer HTML/JS files

Key features to migrate:
- Ship template selection
- Hull type selection
- Armor level adjustment
- Turret configuration
- Weapon selection per turret
- Save custom ship
- Load saved ships
- Export/import ship data
- Tonnage/cost calculations

### 7.2 Create Customizer Component Structure
```bash
mkdir -p client/src/components/customizer
```

### 7.3 Create Main Customizer Component
**File:** `client/src/components/Customizer.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HullSelector from './customizer/HullSelector';
import ArmorSelector from './customizer/ArmorSelector';
import TurretConfigurator from './customizer/TurretConfigurator';
import ShipPreview from './customizer/ShipPreview';

interface CustomShip {
  name: string;
  hull: string;
  armor: number;
  turrets: Array<{
    name: string;
    weapons: string[];
  }>;
  tonnage: number;
  cost: number;
}

export default function Customizer() {
  const navigate = useNavigate();

  const [shipName, setShipName] = useState('My Custom Ship');
  const [hull, setHull] = useState('scout');
  const [armor, setArmor] = useState(0);
  const [turrets, setTurrets] = useState<Array<{ name: string; weapons: string[] }>>([
    { name: 'Turret 1', weapons: [] },
  ]);

  // Calculate tonnage and cost (simplified)
  const tonnage = 100; // TODO: Calculate based on hull + components
  const cost = 10000000; // TODO: Calculate based on components

  const handleSave = () => {
    const customShip: CustomShip = {
      name: shipName,
      hull,
      armor,
      turrets,
      tonnage,
      cost,
    };

    // Save to localStorage for now
    localStorage.setItem('customShip', JSON.stringify(customShip));
    alert('Ship saved successfully!');
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('customShip');
    if (saved) {
      const ship = JSON.parse(saved);
      setShipName(ship.name);
      setHull(ship.hull);
      setArmor(ship.armor);
      setTurrets(ship.turrets);
      alert('Ship loaded successfully!');
    } else {
      alert('No saved ship found!');
    }
  };

  const handleExport = () => {
    const customShip: CustomShip = {
      name: shipName,
      hull,
      armor,
      turrets,
      tonnage,
      cost,
    };
    const json = JSON.stringify(customShip, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shipName.replace(/\s+/g, '-')}.json`;
    a.click();
  };

  const handleAddTurret = () => {
    setTurrets([...turrets, { name: `Turret ${turrets.length + 1}`, weapons: [] }]);
  };

  const handleRemoveTurret = (index: number) => {
    setTurrets(turrets.filter((_, i) => i !== index));
  };

  return (
    <div className="customizer-screen" data-screen="customizer">
      {/* Header */}
      <div className="header">
        <h1>🛠️ Ship Customizer</h1>
        <button
          className="back-button"
          onClick={() => navigate('/')}
          data-test-id="btn-back"
        >
          ← Back to Menu
        </button>
      </div>

      {/* Customizer Grid */}
      <div className="customizer-grid">
        {/* Left Panel: Ship Name & Hull */}
        <div className="card customizer-panel">
          <h2>Ship Configuration</h2>

          <div className="form-group">
            <label>Ship Name:</label>
            <input
              type="text"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              data-test-id="input-ship-name"
            />
          </div>

          <HullSelector selected={hull} onSelect={setHull} />
          <ArmorSelector value={armor} onChange={setArmor} max={10} />

          <div className="ship-stats">
            <p>Tonnage: {tonnage} tons</p>
            <p>Cost: ${cost.toLocaleString()} Cr</p>
          </div>
        </div>

        {/* Middle Panel: Turrets */}
        <div className="card customizer-panel">
          <h2>Turret Configuration</h2>

          {turrets.map((turret, index) => (
            <TurretConfigurator
              key={index}
              turret={turret}
              index={index}
              onUpdate={(updated) => {
                const newTurrets = [...turrets];
                newTurrets[index] = updated;
                setTurrets(newTurrets);
              }}
              onRemove={() => handleRemoveTurret(index)}
            />
          ))}

          <button
            className="add-turret-button"
            onClick={handleAddTurret}
            data-test-id="btn-add-turret"
          >
            + Add Turret
          </button>
        </div>

        {/* Right Panel: Preview & Actions */}
        <div className="card customizer-panel">
          <h2>Ship Preview</h2>
          <ShipPreview
            name={shipName}
            hull={hull}
            armor={armor}
            turrets={turrets}
          />

          <div className="customizer-actions">
            <button
              className="action-button save-button"
              onClick={handleSave}
              data-test-id="btn-save-ship"
            >
              💾 Save Ship
            </button>

            <button
              className="action-button load-button"
              onClick={handleLoad}
              data-test-id="btn-load-ship"
            >
              📂 Load Ship
            </button>

            <button
              className="action-button export-button"
              onClick={handleExport}
              data-test-id="btn-export-ship"
            >
              📤 Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 7.4 Create Sub-Components
**File:** `client/src/components/customizer/HullSelector.tsx`

```typescript
interface HullSelectorProps {
  selected: string;
  onSelect: (hull: string) => void;
}

const HULLS = [
  { id: 'scout', name: 'Scout Ship', tons: 100 },
  { id: 'trader', name: 'Free Trader', tons: 200 },
  { id: 'corvette', name: 'Patrol Corvette', tons: 400 },
  { id: 'corsair', name: 'Corsair', tons: 400 },
];

export default function HullSelector({ selected, onSelect }: HullSelectorProps) {
  return (
    <div className="hull-selector">
      <label>Hull Type:</label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        data-test-id="select-hull"
      >
        {HULLS.map((hull) => (
          <option key={hull.id} value={hull.id}>
            {hull.name} ({hull.tons} tons)
          </option>
        ))}
      </select>
    </div>
  );
}
```

**File:** `client/src/components/customizer/ArmorSelector.tsx`

```typescript
interface ArmorSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
}

export default function ArmorSelector({ value, onChange, max }: ArmorSelectorProps) {
  return (
    <div className="armor-selector">
      <label>Armor Rating: {value}</label>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-test-id="slider-armor"
      />
      <div className="armor-levels">
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
```

**File:** `client/src/components/customizer/TurretConfigurator.tsx`

```typescript
interface Turret {
  name: string;
  weapons: string[];
}

interface TurretConfiguratorProps {
  turret: Turret;
  index: number;
  onUpdate: (turret: Turret) => void;
  onRemove: () => void;
}

const AVAILABLE_WEAPONS = [
  'Pulse Laser',
  'Beam Laser',
  'Particle Beam',
  'Missile Rack',
  'Sandcaster',
  'Point Defense',
];

export default function TurretConfigurator({ turret, index, onUpdate, onRemove }: TurretConfiguratorProps) {
  const handleAddWeapon = (weapon: string) => {
    if (turret.weapons.length < 3) {
      onUpdate({ ...turret, weapons: [...turret.weapons, weapon] });
    }
  };

  const handleRemoveWeapon = (weaponIndex: number) => {
    onUpdate({
      ...turret,
      weapons: turret.weapons.filter((_, i) => i !== weaponIndex),
    });
  };

  return (
    <div className="turret-configurator" data-test-id={`turret-${index}`}>
      <div className="turret-header">
        <h4>{turret.name}</h4>
        <button
          className="remove-turret-button"
          onClick={onRemove}
          data-test-id={`btn-remove-turret-${index}`}
        >
          ✕
        </button>
      </div>

      <div className="turret-weapons">
        {turret.weapons.map((weapon, weaponIndex) => (
          <div key={weaponIndex} className="weapon-slot">
            <span>{weapon}</span>
            <button
              className="remove-weapon-button"
              onClick={() => handleRemoveWeapon(weaponIndex)}
            >
              ✕
            </button>
          </div>
        ))}

        {turret.weapons.length < 3 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddWeapon(e.target.value);
                e.target.value = '';
              }
            }}
            data-test-id={`select-weapon-${index}`}
          >
            <option value="">+ Add Weapon</option>
            {AVAILABLE_WEAPONS.map((weapon) => (
              <option key={weapon} value={weapon}>
                {weapon}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
```

**File:** `client/src/components/customizer/ShipPreview.tsx`

```typescript
interface ShipPreviewProps {
  name: string;
  hull: string;
  armor: number;
  turrets: Array<{ name: string; weapons: string[] }>;
}

export default function ShipPreview({ name, hull, armor, turrets }: ShipPreviewProps) {
  return (
    <div className="ship-preview" data-test-id="ship-preview">
      <h3>{name}</h3>
      <div className="preview-stats">
        <p><strong>Hull:</strong> {hull}</p>
        <p><strong>Armor:</strong> {armor}</p>
        <p><strong>Turrets:</strong> {turrets.length}</p>
      </div>

      <div className="preview-turrets">
        <h4>Armament:</h4>
        {turrets.map((turret, index) => (
          <div key={index} className="preview-turret">
            <strong>{turret.name}:</strong>
            <ul>
              {turret.weapons.map((weapon, wIndex) => (
                <li key={wIndex}>{weapon}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7.5 Add Customizer CSS
**File:** `client/src/customizer.css`

```css
.customizer-screen {
  padding: 2rem;
}

.customizer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.customizer-panel {
  padding: 1.5rem;
}

/* Form Elements */
.form-group {
  margin: 1rem 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #888;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  background: #2a2a2a;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
}

/* Hull Selector */
.hull-selector {
  margin: 1rem 0;
}

.hull-selector select {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  background: #2a2a2a;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
}

/* Armor Selector */
.armor-selector {
  margin: 1rem 0;
}

.armor-selector input[type="range"] {
  width: 100%;
  margin: 0.5rem 0;
}

.armor-levels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #888;
}

/* Turret Configurator */
.turret-configurator {
  margin: 1rem 0;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 4px;
}

.turret-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.remove-turret-button {
  background: #aa0000;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.turret-weapons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weapon-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 4px;
}

.remove-weapon-button {
  background: #aa0000;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.turret-weapons select {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
}

/* Add Turret Button */
.add-turret-button {
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  background: #2a8a5a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.add-turret-button:hover {
  background: #3a9a6a;
}

/* Ship Preview */
.ship-preview {
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 4px;
}

.preview-stats {
  margin: 1rem 0;
}

.preview-stats p {
  margin: 0.5rem 0;
}

.preview-turrets {
  margin-top: 1rem;
}

.preview-turret {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 4px;
}

.preview-turret ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.preview-turret li {
  margin: 0.25rem 0;
}

/* Actions */
.customizer-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 2rem;
}

.action-button {
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  transition: opacity 0.3s ease;
}

.action-button:hover {
  opacity: 0.8;
}

.save-button {
  background: #2a8a5a;
}

.load-button {
  background: #2a5a8a;
}

.export-button {
  background: #8a5a2a;
}

/* Ship Stats */
.ship-stats {
  margin-top: 1rem;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 4px;
}

.ship-stats p {
  margin: 0.5rem 0;
  font-weight: bold;
}
```

Import in App.css:

```css
@import './customizer.css';
```

## Tests to Add

### Temporary Test 1: Basic Customizer
```bash
# Navigate to customizer from main menu
# Should display customizer interface
# Should have ship name input
# Should have hull selector
# Should have armor slider
```

### Temporary Test 2: Turret Configuration
```bash
# Click "Add Turret"
# Should add new turret
# Select weapon from dropdown
# Should add weapon to turret
# Click remove weapon
# Should remove weapon
# Click remove turret
# Should remove entire turret
```

### Temporary Test 3: Save/Load
```bash
# Configure a ship
# Click "Save Ship"
# Refresh page
# Click "Load Ship"
# Should restore configuration
```

### Temporary Test 4: Export
```bash
# Configure a ship
# Click "Export JSON"
# Should download JSON file
# File should contain ship configuration
```

## Success Criteria

- [ ] Customizer component created
- [ ] Hull selection works
- [ ] Armor adjustment works
- [ ] Can add/remove turrets
- [ ] Can add/remove weapons from turrets
- [ ] Ship preview updates in real-time
- [ ] Save to localStorage works
- [ ] Load from localStorage works
- [ ] Export to JSON works
- [ ] CSS styling looks good
- [ ] No TypeScript errors

## Cleanup Checklist

**After migration complete:**
- Consider adding import from JSON
- Add tonnage/cost calculations
- Add validation (max turrets, tonnage limits)
- Connect to backend for persistence

## Rollback Procedure

If this step fails (or you want to skip it):

```bash
# This step is OPTIONAL
# Can skip and go straight to Step 8

# To remove customizer work:
rm -rf client/src/components/customizer/
rm client/src/customizer.css
# Remove customizer route from App.tsx
# Remove import from App.css
```

## Time Estimate

- **Minimum:** 2 hours (basic customizer)
- **Expected:** 3-4 hours (with all features)
- **Maximum:** 5 hours (with calculations and validation)

**Note:** This step is OPTIONAL. Consider skipping if time-constrained.

## Common Issues

### Issue 1: State Not Updating
**Error:** Changes don't reflect in preview

**Fix:**
- Verify state updates in parent component
- Check onUpdate callbacks pass correct data

### Issue 2: localStorage Not Persisting
**Error:** Load doesn't restore ship

**Fix:**
```typescript
// Check localStorage is available
if (typeof localStorage !== 'undefined') {
  localStorage.setItem('customShip', JSON.stringify(customShip));
}
```

### Issue 3: Export Not Working
**Error:** JSON doesn't download

**Fix:**
- Verify Blob API is supported
- Check browser allows downloads
- Try different approach:
```typescript
const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customShip));
const downloadAnchorNode = document.createElement('a');
downloadAnchorNode.setAttribute("href", dataStr);
downloadAnchorNode.setAttribute("download", "ship.json");
downloadAnchorNode.click();
```

## Commit Message

```bash
git add -A
git commit -m "feat(step7): Ship customizer interface

- Created Customizer.tsx main component
  - Ship name input
  - Hull type selection
  - Armor level slider
  - Turret management
  - Save/Load/Export functionality

- Created customizer sub-components
  - HullSelector: Choose hull type
  - ArmorSelector: Adjust armor rating
  - TurretConfigurator: Add/remove weapons
  - ShipPreview: Real-time preview

- Added customizer.css styling
  - Responsive grid layout
  - Form styling
  - Turret configuration UI
  - Action buttons

- Features implemented:
  - Add/remove turrets
  - Add/remove weapons per turret (max 3)
  - Save to localStorage
  - Load from localStorage
  - Export to JSON file
  - Real-time preview updates

Tested:
- Ship configuration saves and loads
- Turret management works
- Export generates valid JSON
- Preview updates correctly
- Styling looks professional
- No TypeScript errors

Next: Step 8 - Tutorial system (final step)

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 8: Tutorial System** - Migrate the interactive tutorial (final step, most complex).
