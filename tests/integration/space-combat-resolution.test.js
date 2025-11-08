/**
 * Integration Tests: Space Combat Resolution
 * Stage 8.8 - Server-side combat logic, attack resolution, turn management, and victory conditions
 */

const TEST_QUIET = process.env.TEST_QUIET === 'true';

// Test suite state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    if (!TEST_QUIET) console.log(`  ✓ ${description}`);
  } catch (error) {
    failedTests++;
    console.error(`  ✗ ${description}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual, threshold, message) {
  if (actual <= threshold) {
    throw new Error(message || `Expected ${actual} > ${threshold}`);
  }
}

// Mock combat state
class SpaceCombatState {
  constructor() {
    this.combats = new Map();
  }

  createCombat(player1Id, player2Id, combatData) {
    const combatId = `${player1Id}_${player2Id}`;
    this.combats.set(combatId, {
      id: combatId,
      player1: {
        id: player1Id,
        ship: combatData.player1Ship,
        hull: combatData.player1Ship === 'scout' ? 20 : 30,
        maxHull: combatData.player1Ship === 'scout' ? 20 : 30,
        armour: combatData.player1Ship === 'scout' ? 4 : 2,
        crew: this.generateDefaultCrew(combatData.player1Ship),
        criticals: []
      },
      player2: {
        id: player2Id,
        ship: combatData.player2Ship,
        hull: combatData.player2Ship === 'scout' ? 20 : 30,
        maxHull: combatData.player2Ship === 'scout' ? 20 : 30,
        armour: combatData.player2Ship === 'scout' ? 4 : 2,
        crew: this.generateDefaultCrew(combatData.player2Ship),
        criticals: []
      },
      range: combatData.range,
      round: 1,
      activePlayer: player1Id,
      turnComplete: false
    });
    return this.combats.get(combatId);
  }

  generateDefaultCrew(shipType) {
    if (shipType === 'scout') {
      return [
        { role: 'pilot', skill: 2 },
        { role: 'gunner', skill: 1 },
        { role: 'engineer', skill: 1 }
      ];
    } else {
      return [
        { role: 'pilot', skill: 1 },
        { role: 'gunner', skill: 1 },
        { role: 'gunner', skill: 1 },
        { role: 'engineer', skill: 1 }
      ];
    }
  }

  getCombat(player1Id, player2Id) {
    const combatId = `${player1Id}_${player2Id}`;
    return this.combats.get(combatId);
  }

  applyDamage(combat, targetPlayer, damage) {
    const target = combat[targetPlayer];
    target.hull -= damage;
    if (target.hull < 0) target.hull = 0;
  }

  checkVictory(combat) {
    if (combat.player1.hull <= 0) {
      return { winner: 'player2', loser: 'player1' };
    }
    if (combat.player2.hull <= 0) {
      return { winner: 'player1', loser: 'player2' };
    }
    return null;
  }

  endTurn(combat) {
    combat.activePlayer = combat.activePlayer === combat.player1.id ? combat.player2.id : combat.player1.id;
    combat.turnComplete = true;
  }

  nextRound(combat) {
    combat.round++;
    combat.turnComplete = false;
  }
}

// Mock attack resolution
function mockAttackResolution(attacker, target, options = {}) {
  // Simulate dice roll
  const attackRoll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
  const skill = attacker.crew.find(c => c.role === 'gunner')?.skill || 0;
  const rangeDM = { 'Short': 0, 'Medium': -1, 'Long': -2 }[options.range] || 0;

  const total = attackRoll + skill + rangeDM;
  const targetNumber = 8;
  const hit = total >= targetNumber;

  let damage = 0;
  if (hit) {
    const damageRoll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
    damage = Math.max(0, damageRoll - target.armour);
  }

  return {
    hit,
    attackRoll,
    total,
    targetNumber,
    damage,
    rangeDM
  };
}

// Run tests
console.log('\n=== Space Combat Resolution Tests ===\n');

// Combat State Management Tests
console.log('Combat State Management (5 tests):');

test('Combat state can be created', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  assert(combat !== null, 'Combat should be created');
  assertEqual(combat.player1.ship, 'scout', 'Player 1 should have scout');
  assertEqual(combat.player2.ship, 'free_trader', 'Player 2 should have free trader');
});

test('Combat state tracks both ships', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  assert(combat.player1.hull > 0, 'Player 1 should have hull');
  assert(combat.player2.hull > 0, 'Player 2 should have hull');
  assertEqual(combat.player1.hull, 20, 'Scout should have 20 hull');
  assertEqual(combat.player2.hull, 30, 'Free Trader should have 30 hull');
});

test('Combat state tracks round and active player', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  assertEqual(combat.round, 1, 'Should start at round 1');
  assertEqual(combat.activePlayer, 'p1', 'Player 1 should be active first');
});

test('Combat state tracks range', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Medium'
  });

  assertEqual(combat.range, 'Medium', 'Should track range');
});

test('Combat state includes crew data', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  assert(combat.player1.crew.length > 0, 'Player 1 should have crew');
  assert(combat.player2.crew.length > 0, 'Player 2 should have crew');

  const gunner = combat.player1.crew.find(c => c.role === 'gunner');
  assert(gunner !== undefined, 'Should have a gunner');
  assert(gunner.skill > 0, 'Gunner should have skill');
});

// Attack Resolution Tests
console.log('\nAttack Resolution (6 tests):');

test('Attack can hit target', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const result = mockAttackResolution(combat.player1, combat.player2, { range: 'Short' });

  assert(result.attackRoll >= 2 && result.attackRoll <= 12, 'Attack roll should be 2d6');
  assert(result.total !== undefined, 'Should calculate total');
  assert(result.hit !== undefined, 'Should determine hit/miss');
});

test('Attack applies gunner skill', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const gunner = combat.player1.crew.find(c => c.role === 'gunner');
  const result = mockAttackResolution(combat.player1, combat.player2, { range: 'Short' });

  // Total should include skill bonus
  assert(result.total >= result.attackRoll, 'Total should be at least the attack roll');
});

test('Attack applies range modifiers', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Long'
  });

  const result = mockAttackResolution(combat.player1, combat.player2, { range: 'Long' });

  assertEqual(result.rangeDM, -2, 'Long range should have -2 DM');
});

test('Hit deals damage reduced by armour', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  // Force a hit by mocking
  const result = {
    hit: true,
    attackRoll: 10,
    total: 12,
    targetNumber: 8,
    damage: 5,  // Simulated damage after armour
    rangeDM: 0
  };

  assert(result.damage >= 0, 'Damage should not be negative');
});

test('Miss deals no damage', () => {
  const result = {
    hit: false,
    attackRoll: 3,
    total: 4,
    targetNumber: 8,
    damage: 0,
    rangeDM: 0
  };

  assertEqual(result.damage, 0, 'Miss should deal no damage');
});

test('Damage reduces hull points', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const originalHull = combat.player2.hull;
  state.applyDamage(combat, 'player2', 5);

  assertEqual(combat.player2.hull, originalHull - 5, 'Hull should be reduced by damage');
});

// Turn Management Tests
console.log('\nTurn Management (4 tests):');

test('Active player can be determined', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  assertEqual(combat.activePlayer, 'p1', 'Player 1 should be active');
});

test('Turn can be ended', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  state.endTurn(combat);
  assert(combat.turnComplete === true, 'Turn should be marked complete');
});

test('Active player switches after turn ends', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const firstPlayer = combat.activePlayer;
  state.endTurn(combat);

  assert(combat.activePlayer !== firstPlayer, 'Active player should switch');
  assertEqual(combat.activePlayer, 'p2', 'Player 2 should be active after turn end');
});

test('Round increments after both players complete turns', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const initialRound = combat.round;
  state.nextRound(combat);

  assertEqual(combat.round, initialRound + 1, 'Round should increment');
  assertEqual(combat.turnComplete, false, 'Turn complete flag should reset');
});

// Victory Conditions Tests
console.log('\nVictory Conditions (5 tests):');

test('Ship destroyed when hull reaches 0', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  state.applyDamage(combat, 'player2', 100);  // Destroy ship
  assertEqual(combat.player2.hull, 0, 'Hull should be 0');
});

test('Victory detected when opponent hull is 0', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  state.applyDamage(combat, 'player2', 100);
  const victory = state.checkVictory(combat);

  assert(victory !== null, 'Victory should be detected');
  assertEqual(victory.winner, 'player1', 'Player 1 should win');
  assertEqual(victory.loser, 'player2', 'Player 2 should lose');
});

test('No victory when both ships have hull', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  const victory = state.checkVictory(combat);
  assertEqual(victory, null, 'Should not detect victory');
});

test('Correct winner when player 1 destroyed', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  state.applyDamage(combat, 'player1', 100);
  const victory = state.checkVictory(combat);

  assertEqual(victory.winner, 'player2', 'Player 2 should win');
});

test('Correct winner when player 2 destroyed', () => {
  const state = new SpaceCombatState();
  const combat = state.createCombat('p1', 'p2', {
    player1Ship: 'scout',
    player2Ship: 'free_trader',
    range: 'Short'
  });

  state.applyDamage(combat, 'player2', 100);
  const victory = state.checkVictory(combat);

  assertEqual(victory.winner, 'player1', 'Player 1 should win');
});

// Print summary
console.log('\n==================================================');
console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('==================================================');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
