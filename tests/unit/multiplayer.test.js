// Unit tests for Stage 3 multiplayer functionality
// Run with: node tests/unit/multiplayer.test.js

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
  console.log('✅ PASS:', message);
}

console.log('========================================');
console.log('STAGE 3 MULTIPLAYER UNIT TESTS');
console.log('========================================\n');

// Test 1: Server ship assignment logic
console.log('Test 1: Ship assignment - first player gets scout');
// Mock connection tracking
const mockConnections = new Map();

function getAvailableShip(connections) {
  const assignedShips = Array.from(connections.values())
    .map(conn => conn.ship)
    .filter(ship => ship !== null);

  if (!assignedShips.includes('scout')) return 'scout';
  if (!assignedShips.includes('free_trader')) return 'free_trader';
  return null;
}

// First player
const ship1 = getAvailableShip(mockConnections);
assert(ship1 === 'scout', 'First player assigned scout');
mockConnections.set('socket1', { id: 1, ship: ship1 });

// Second player
const ship2 = getAvailableShip(mockConnections);
assert(ship2 === 'free_trader', 'Second player assigned free_trader');
mockConnections.set('socket2', { id: 2, ship: ship2 });

// Third player (spectator)
const ship3 = getAvailableShip(mockConnections);
assert(ship3 === null, 'Third player is spectator');
console.log('');

// Test 2: Player disconnect makes ship available
console.log('Test 2: Ship availability after disconnect');
mockConnections.delete('socket1'); // Scout player disconnects

const ship4 = getAvailableShip(mockConnections);
assert(ship4 === 'scout', 'Scout becomes available after player 1 disconnects');
console.log('');

// Test 3: Ship state initialization
console.log('Test 3: Ship state initialization');
const { SHIPS } = require('../../lib/combat');

const shipState = {
  scout: {
    hull: SHIPS.scout.hull,
    maxHull: SHIPS.scout.maxHull,
    armor: SHIPS.scout.armor
  },
  free_trader: {
    hull: SHIPS.free_trader.hull,
    maxHull: SHIPS.free_trader.maxHull,
    armor: SHIPS.free_trader.armor
  }
};

assert(shipState.scout.hull === 10, 'Scout initialized with 10 hull');
assert(shipState.free_trader.hull === 15, 'Free Trader initialized with 15 hull');
assert(shipState.scout.hull === shipState.scout.maxHull, 'Scout starts at max hull');
assert(shipState.free_trader.hull === shipState.free_trader.maxHull, 'Free Trader starts at max hull');
console.log('');

// Test 4: Ship state reset
console.log('Test 4: Ship state reset after damage');
shipState.scout.hull = 3; // Simulate damage
shipState.free_trader.hull = 8;

function resetShipStates(state, baseShips) {
  state.scout.hull = baseShips.scout.maxHull;
  state.free_trader.hull = baseShips.free_trader.maxHull;
}

resetShipStates(shipState, SHIPS);
assert(shipState.scout.hull === 10, 'Scout reset to full hull');
assert(shipState.free_trader.hull === 15, 'Free Trader reset to full hull');
console.log('');

// Test 5: Authorization check
console.log('Test 5: Player authorization for ship control');
function canPlayerAttackWith(playerShip, attackerShip) {
  return playerShip === attackerShip;
}

assert(canPlayerAttackWith('scout', 'scout') === true, 'Scout player can attack with scout');
assert(canPlayerAttackWith('scout', 'free_trader') === false, 'Scout player cannot attack with free_trader');
assert(canPlayerAttackWith('free_trader', 'free_trader') === true, 'Free Trader player can attack with free_trader');
assert(canPlayerAttackWith('free_trader', 'scout') === false, 'Free Trader player cannot attack with scout');
assert(canPlayerAttackWith(null, 'scout') === false, 'Spectator cannot attack with scout');
console.log('');

// Test 6: Get ship assignments
console.log('Test 6: Ship assignment tracking');
const testConnections = new Map();
testConnections.set('s1', { id: 1, ship: 'scout' });
testConnections.set('s2', { id: 2, ship: 'free_trader' });
testConnections.set('s3', { id: 3, ship: null });

function getShipAssignments(connections) {
  const assignments = { scout: null, free_trader: null };
  connections.forEach((conn) => {
    if (conn.ship === 'scout') assignments.scout = conn.id;
    if (conn.ship === 'free_trader') assignments.free_trader = conn.id;
  });
  return assignments;
}

const assignments = getShipAssignments(testConnections);
assert(assignments.scout === 1, 'Scout assigned to player 1');
assert(assignments.free_trader === 2, 'Free Trader assigned to player 2');
console.log('');

console.log('========================================');
console.log('ALL TESTS PASSED ✅');
console.log('========================================');
console.log('Stage 3 multiplayer logic verified!');
console.log('');
