// Integration tests for space combat using socket.io-client
// Tests full combat flow without browser automation

const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Helper to create a socket client
function createClient() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
}

// Helper to wait for an event
function waitForEvent(socket, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper to emit and wait for response
function emitAndWait(socket, emitEvent, emitData, waitEvent, timeout = 5000) {
  const promise = waitForEvent(socket, waitEvent, timeout);
  socket.emit(emitEvent, emitData);
  return promise;
}

// Test: Full combat scenario
async function testFullCombatScenario() {
  console.log('\n========================================');
  console.log('TEST: Full Combat Scenario');
  console.log('========================================\n');

  const player1 = createClient();
  const player2 = createClient();

  try {
    // Wait for both players to connect
    console.log('Connecting players...');
    const welcome1 = await waitForEvent(player1, 'welcome');
    const welcome2 = await waitForEvent(player2, 'welcome');

    console.log(`✓ Player 1 connected: ${welcome1.assignedShip}`);
    console.log(`✓ Player 2 connected: ${welcome2.assignedShip}`);

    // Both players ready up
    console.log('\nPlayers readying up...');
    player1.emit('space:playerReady', { ship: 'scout', range: 'Medium' });
    player2.emit('space:playerReady', { ship: 'free_trader', range: 'Medium' });

    // Wait for combat to start
    const combatStart = await waitForEvent(player1, 'space:combatStart');
    console.log(`✓ Combat started: ${combatStart.ships.player1} vs ${combatStart.ships.player2}`);
    console.log(`  Range: ${combatStart.range}`);

    // Wait for turn notification
    const turnChange1 = await waitForEvent(player1, 'space:turnChange');
    console.log(`✓ Turn system initialized`);

    // Track combat state
    let round = 1;
    let player1Hull = 10; // scout hull
    let player2Hull = 20; // free_trader hull
    let attackCount = 0;
    let hitCount = 0;

    // Set up event listeners for combat results
    player1.on('space:attackResult', (result) => {
      attackCount++;
      if (result.hit) {
        hitCount++;
        console.log(`  → Player 1 HIT! Damage: ${result.damage}`);
        player2Hull -= result.damage;
      } else {
        console.log(`  → Player 1 missed`);
      }
    });

    player2.on('space:attackResult', (result) => {
      attackCount++;
      if (result.hit) {
        hitCount++;
        console.log(`  → Player 2 HIT! Damage: ${result.damage}`);
        player1Hull -= result.damage;
      } else {
        console.log(`  → Player 2 missed`);
      }
    });

    player1.on('space:roundStart', (data) => {
      round = data.round;
      console.log(`\n--- Round ${round} ---`);
    });

    player2.on('space:roundStart', (data) => {
      round = data.round;
    });

    // Simulate 5 rounds of combat
    console.log('\n--- Round 1 ---');

    for (let i = 0; i < 10; i++) {
      // Wait a bit for turn notifications
      await new Promise(resolve => setTimeout(resolve, 200));

      // Player 1 attacks
      player1.emit('space:fire', { turret: 0, target: 'opponent', weapon: 0 });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Player 2 attacks
      player2.emit('space:fire', { turret: 0, target: 'opponent', weapon: 0 });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if combat ended
      if (player1Hull <= 0 || player2Hull <= 0) {
        break;
      }
    }

    // Wait for potential victory message
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n--- Combat Summary ---');
    console.log(`Total attacks: ${attackCount}`);
    console.log(`Total hits: ${hitCount}`);
    console.log(`Hit rate: ${attackCount > 0 ? ((hitCount / attackCount) * 100).toFixed(1) : 0}%`);
    console.log(`Player 1 (Scout) final hull: ${Math.max(0, player1Hull)}/10`);
    console.log(`Player 2 (Free Trader) final hull: ${Math.max(0, player2Hull)}/20`);

    // Verify combat actually happened
    if (attackCount === 0) {
      throw new Error('No attacks were made during combat');
    }

    console.log('\n✓ TEST PASSED: Full combat scenario completed');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    throw error;
  } finally {
    player1.disconnect();
    player2.disconnect();
  }
}

// Test: Connection and auto-assignment
async function testConnectionAndAssignment() {
  console.log('\n========================================');
  console.log('TEST: Connection and Auto-Assignment');
  console.log('========================================\n');

  const client = createClient();

  try {
    console.log('Connecting to server...');
    const welcome = await waitForEvent(client, 'welcome', 3000);

    console.log(`✓ Connected successfully`);
    console.log(`  Player ID: ${welcome.playerId}`);
    console.log(`  Assigned Ship: ${welcome.assignedShip}`);

    if (!welcome.playerId || !welcome.assignedShip) {
      throw new Error('Welcome event missing required fields');
    }

    // Wait for auto-assignment
    const autoAssigned = await waitForEvent(client, 'space:autoAssigned', 3000);
    console.log(`✓ Auto-assigned: ${autoAssigned.ship} at ${autoAssigned.range} range`);

    console.log('\n✓ TEST PASSED: Connection and assignment working');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    throw error;
  } finally {
    client.disconnect();
  }
}

// Test: Attack resolution
async function testAttackResolution() {
  console.log('\n========================================');
  console.log('TEST: Attack Resolution');
  console.log('========================================\n');

  const player1 = createClient();
  const player2 = createClient();

  try {
    // Connect and ready up
    console.log('Setting up combat...');
    await waitForEvent(player1, 'welcome');
    await waitForEvent(player2, 'welcome');

    player1.emit('space:playerReady', { ship: 'scout', range: 'Medium' });
    player2.emit('space:playerReady', { ship: 'free_trader', range: 'Medium' });

    await waitForEvent(player1, 'space:combatStart');
    await waitForEvent(player1, 'space:turnChange');

    console.log('✓ Combat initialized');

    // Make a single attack and verify response
    console.log('\nPlayer 1 attacking...');

    const attackPromise = new Promise((resolve) => {
      player1.once('space:attackResult', resolve);
      player2.once('space:hitByAttack', resolve);
    });

    player1.emit('space:fire', { turret: 0, target: 'opponent', weapon: 0 });

    const result = await Promise.race([
      attackPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('No attack result received')), 3000)
      )
    ]);

    console.log(`✓ Attack processed`);
    console.log(`  Result: ${result.hit ? 'HIT' : 'MISS'}`);
    if (result.hit) {
      console.log(`  Damage: ${result.damage}`);
    }

    console.log('\n✓ TEST PASSED: Attack resolution working');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    throw error;
  } finally {
    player1.disconnect();
    player2.disconnect();
  }
}

// Main test runner
async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Space Combat Integration Tests       ║');
  console.log('╚════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'Connection and Assignment', fn: testConnectionAndAssignment },
    { name: 'Attack Resolution', fn: testAttackResolution },
    { name: 'Full Combat Scenario', fn: testFullCombatScenario }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failed++;
      console.error(`\nTest "${test.name}" failed:`, error.message);
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Test Results                          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\nTotal: ${tests.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
