# Step 1: Foundation & Type System

## Objective
Establish the TypeScript foundation, project structure, and type definitions for the entire React migration. This creates a safe development environment without touching production code.

## Prerequisites
- [x] Current work committed to `main` branch
- [x] Migration plan reviewed (all 3 planning documents)
- [ ] Terminal ready
- [ ] Server stopped (kill all node processes)

## Branch Strategy

### Create Migration Branch
```bash
# Ensure we're on main
git checkout main

# Verify clean working directory
git status

# Create and switch to react-refactor branch
git checkout -b react-refactor

# Verify we're on the new branch
git branch --show-current
# Should output: react-refactor
```

### Branch Protection
- **DO NOT** merge to main until all 8 steps complete
- **DO NOT** push to remote until working locally
- Can safely delete branch if this step fails

## Implementation Details

### 1.1 Stop Existing Servers
```bash
# Kill any running node processes
killall node 2>/dev/null || true

# Or find and kill specific processes
lsof -t -i:3000 | xargs kill -9 2>/dev/null || true
lsof -t -i:5173 | xargs kill -9 2>/dev/null || true
```

### 1.2 Create Audit of Existing Code
```bash
# Create audit directory
mkdir -p audit

# Socket events (server)
grep -rn "socket\.on\|socket\.emit" server.js lib/*.js | \
  sed -E "s/.*socket\.(on|emit)\('([^']+)'.*/\2/" | \
  sort -u > audit/socket-events-server.txt

# Socket events (client)
grep -rn "socket\.on\|socket\.emit" public/*.js | \
  sed -E "s/.*socket\.(on|emit)\('([^']+)'.*/\2/" | \
  sort -u > audit/socket-events-client.txt

# Compare for mismatches
comm -3 <(sort audit/socket-events-server.txt) \
        <(sort audit/socket-events-client.txt) \
        > audit/socket-event-mismatches.txt

# CSS classes
grep -rh 'class="[^"]*"' public/*.html | \
  sed -E 's/.*class="([^"]+)".*/\1/' | \
  tr ' ' '\n' | sort -u > audit/css-classes.txt

# Test IDs
grep -rh 'data-test-id="[^"]*"' public/*.html | \
  sed -E 's/.*data-test-id="([^"]+)".*/\1/' | \
  sort -u > audit/test-ids.txt

# Component count
echo "Screens to migrate: $(ls public/*.html | wc -l)" > audit/migration-scope.txt
echo "JS files: $(ls public/*.js | wc -l)" >> audit/migration-scope.txt
echo "Lines of JS: $(cat public/*.js | wc -l)" >> audit/migration-scope.txt
```

### 1.3 Create Migration Storehouse
```bash
# Create staging directory for safe development
mkdir -p migration-staging/{components,types,hooks,contexts,utils,tests}
```

**Why Storehouse?**
- Safe experimentation without breaking client/
- Easy rollback (just don't copy files)
- Test components in isolation
- Compare versions side-by-side

### 1.4 Create Vite React TypeScript Project
```bash
# Create React app with TypeScript
npm create vite@latest client -- --template react-ts

# Navigate to client directory
cd client

# Install dependencies
npm install

# Install React Router and Socket.IO client
npm install react-router-dom socket.io-client

# Install dev dependencies
npm install -D @types/node

# Return to root
cd ..
```

**Expected Result:**
- `client/` directory created
- React app ready at `client/`
- `client/package.json` exists
- `client/src/App.tsx` exists
- `client/tsconfig.json` exists

### 1.5 Configure TypeScript (Lenient Mode)
**File:** `client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Why lenient?**
- Start permissive, tighten later
- Avoid getting stuck on type errors during migration
- Can add strictness after everything works

### 1.6 Create TypeScript Type Definitions

**File:** `migration-staging/types/socket-events.ts`

```typescript
// Socket Event Names (String Literals for Type Safety)
export type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'welcome'
  | 'space:autoAssigned'
  | 'space:ready'
  | 'space:combatStart'
  | 'space:fire'
  | 'space:combatUpdate'
  | 'space:turnChange'
  | 'space:endTurn'
  | 'space:dodge'
  | 'space:pointDefense'
  | 'space:sandcaster'
  | 'space:combatEnd'
  | 'space:rangeSelected'
  | 'space:playerReady';

// Event Payloads
export interface WelcomeEvent {
  playerId: number;
  assignedShip: string | null;
  role: string;
  totalPlayers: number;
}

export interface AutoAssignedEvent {
  ship: string;
  mode: 'solo' | 'multiplayer';
}

export interface CombatStartEvent {
  combatId: string;
  player1: {
    id: number;
    ship: string;
  };
  player2: {
    id: number;
    ship: string;
  };
  range: string;
  turn: number;
  activePlayer: number;
}

export interface CombatUpdateEvent {
  combat: any; // Detailed type TBD
  log?: string[];
}

export interface TurnChangeEvent {
  activePlayer: number;
  turn: number;
}

export interface CombatEndEvent {
  winner: number;
  reason: string;
}
```

**File:** `migration-staging/types/game-state.ts`

```typescript
export interface GameState {
  // Connection
  connected: boolean;
  socketId: string | null;

  // Player
  playerId: number | null;
  playerNumber: number | null;
  playerShip: string | null;

  // Opponent
  opponentShip: string | null;

  // Mode
  mode: 'solo' | 'multiplayer' | null;

  // Combat
  combat: CombatState | null;
  currentTurn: number | null;
  combatLog: LogEntry[];

  // Range
  selectedRange: string | null;
}

export interface CombatState {
  combatId: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  range: string;
  turn: number;
  activePlayer: number;
}

export interface PlayerInfo {
  id: number;
  ship: string;
  hull?: number;
  maxHull?: number;
  armor?: number;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}
```

**File:** `migration-staging/types/components.ts`

```typescript
import { ReactNode } from 'react';

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface ShipCardProps extends BaseComponentProps {
  shipName: string;
  selected: boolean;
  onSelect: (shipName: string) => void;
  disabled?: boolean;
}

export interface WeaponPanelProps extends BaseComponentProps {
  weapons: Weapon[];
  onFire: (turretIndex: number, weaponIndex: number) => void;
  disabled: boolean;
}

export interface Weapon {
  name: string;
  type: string;
  damage?: string;
  range?: string;
}
```

### 1.7 Copy Existing Styles
```bash
# Copy existing CSS to client
cp public/styles.css client/src/
cp public/tutorial.css client/src/

# Update App.css to import
cat > client/src/App.css << 'EOF'
/* Import existing styles */
@import './styles.css';
@import './tutorial.css';

/* React-specific overrides */
.app-container {
  min-height: 100vh;
}
EOF
```

### 1.8 Validate Type Definitions
```bash
# Install TypeScript in staging
cd migration-staging
npm init -y
npm install -D typescript @types/node @types/react

# Validate types compile
npx tsc --noEmit types/*.ts

# If successful, copy to client
cd ..
mkdir -p client/src/types
cp migration-staging/types/*.ts client/src/types/
```

## Tests to Add

### Temporary Test 1: Basic Vite Server
```bash
# Test that Vite starts
cd client
npm run dev &
VITE_PID=$!
sleep 3
curl -s http://localhost:5173 > /dev/null && echo "✓ Vite running" || echo "✗ Vite failed"
kill $VITE_PID
cd ..
```

### Temporary Test 2: TypeScript Compilation
```bash
# Test that types compile
cd client
npm run build 2>&1 | grep -q "error" && echo "✗ Build failed" || echo "✓ Build successful"
cd ..
```

### Temporary Test 3: Audit Files Generated
```bash
# Verify audit files exist
test -f audit/socket-events-server.txt && echo "✓ Server events audited" || echo "✗ Missing"
test -f audit/socket-events-client.txt && echo "✓ Client events audited" || echo "✗ Missing"
test -f audit/css-classes.txt && echo "✓ CSS classes audited" || echo "✗ Missing"
```

## Success Criteria

- [ ] `react-refactor` branch created and checked out
- [ ] `client/` directory exists with TypeScript React app
- [ ] Vite dev server starts without errors
- [ ] Type definitions created and compile successfully
- [ ] Audit files generated (socket events, CSS classes, test IDs)
- [ ] Migration storehouse created
- [ ] Existing CSS files copied
- [ ] No TypeScript compilation errors
- [ ] `client/package.json` has react-router-dom and socket.io-client

## Cleanup Checklist

**After entire migration (Step 8) is complete:**
- [ ] Delete `migration-staging/` directory
- [ ] Delete `audit/` directory
- [ ] Remove temporary test scripts

**DO NOT delete during Step 1** - these are needed for remaining steps.

## Rollback Procedure

If this step fails:

```bash
# Return to main branch
git checkout main

# Delete the react-refactor branch
git branch -D react-refactor

# Clean up created directories
rm -rf client/
rm -rf migration-staging/
rm -rf audit/

# Document the failure
echo "Step 1 failed on $(date)" >> docs/REACT-MIGRATION-FAILURES.txt
echo "Reason: [describe what went wrong]" >> docs/REACT-MIGRATION-FAILURES.txt
```

Then review what went wrong before retrying.

## Time Estimate

- **Minimum:** 45 minutes (if everything works perfectly)
- **Expected:** 1-1.5 hours (with minor troubleshooting)
- **Maximum:** 2 hours (if dependencies or audit scripts have issues)

## Common Issues

### Issue 1: Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Fix:**
```bash
lsof -t -i:3000 | xargs kill -9
lsof -t -i:5173 | xargs kill -9
```

### Issue 2: npm create vite fails
**Error:** `Command not found: create-vite`

**Fix:**
```bash
# Update npm
npm install -g npm@latest

# Try again
npm create vite@latest client -- --template react-ts
```

### Issue 3: TypeScript compilation fails
**Error:** Type errors in generated files

**Fix:**
- This is okay for Step 1
- Types may need refinement in later steps
- Set `strict: false` in tsconfig.json

### Issue 4: grep/sed commands fail
**Error:** Audit scripts don't work

**Fix:**
- These are Unix commands (may fail on Windows)
- Manually create audit files by reviewing code
- Or skip audit (optional, but recommended)

## Commit Message

```bash
git add -A
git commit -m "feat(step1): Foundation and type system setup

- Created react-refactor branch
- Set up Vite + React + TypeScript
- Created migration storehouse for safe development
- Generated audit files (socket events, CSS, test IDs)
- Created TypeScript type definitions:
  - socket-events.ts (event names and payloads)
  - game-state.ts (GameState, CombatState, etc.)
  - components.ts (component prop types)
- Copied existing CSS files to client/
- Configured TypeScript (lenient mode for migration)
- Validated types compile successfully

Next: Step 2 - Infrastructure (GameContext, useSocket hook)

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Next Step

Proceed to **Step 2: Infrastructure** - Create GameContext and useSocket hook.
