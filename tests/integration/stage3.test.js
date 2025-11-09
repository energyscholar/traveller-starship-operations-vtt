// Stage 3 browser integration tests
// Tests ship assignment, control restrictions, and state sync
// Run with: node tests/integration/stage3.test.js

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

let server;
let browser;

async function startServer() {
  return new Promise((resolve) => {
    console.log(`${BLUE}Starting server...${RESET}`);
    server = spawn('node', ['server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running')) {
        resolve();
      }
    });
    setTimeout(resolve, 3000);
  });
}

async function stopServer() {
  if (server) {
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('STAGE 3 MULTIPLAYER INTEGRATION TESTS');
  console.log('========================================\n');

  try {
    await startServer();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`${BLUE}Launching browser...${RESET}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 180000
    });
    console.log(`${GREEN}✓ Browser launched${RESET}`);

    // Test 1: Ship assignment
    console.log(`\n${YELLOW}Test 1: Ship Assignment${RESET}`);
    const page1 = await browser.newPage();
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const assignment1 = await page1.evaluate(() => {
      return { myShip, myPlayerId, myRole };
    });

    console.log(`${BLUE}  Player 1: ${assignment1.myShip} (ID: ${assignment1.myPlayerId})${RESET}`);
    if (assignment1.myShip === 'scout' && assignment1.myPlayerId === 1) {
      console.log(`${GREEN}  ✅ Player 1 assigned Scout${RESET}`);
    } else {
      throw new Error(`Player 1 assignment failed: ${JSON.stringify(assignment1)}`);
    }

    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const assignment2 = await page2.evaluate(() => {
      return { myShip, myPlayerId, myRole };
    });

    console.log(`${BLUE}  Player 2: ${assignment2.myShip} (ID: ${assignment2.myPlayerId})${RESET}`);
    if (assignment2.myShip === 'free_trader' && assignment2.myPlayerId === 2) {
      console.log(`${GREEN}  ✅ Player 2 assigned Free Trader${RESET}`);
    } else {
      throw new Error(`Player 2 assignment failed: ${JSON.stringify(assignment2)}`);
    }

    // Test 2: Control restrictions
    console.log(`\n${YELLOW}Test 2: Control Restrictions${RESET}`);
    const controls1 = await page1.evaluate(() => {
      const attackerSelect = document.getElementById('attackerSelect');
      return {
        attackerValue: attackerSelect.value,
        attackerDisabled: attackerSelect.disabled,
        attackerLabel: document.getElementById('attackerLabel').textContent
      };
    });

    if (controls1.attackerValue === 'scout' && controls1.attackerDisabled === true) {
      console.log(`${GREEN}  ✅ Player 1 locked to Scout${RESET}`);
    } else {
      throw new Error(`Control restriction failed for Player 1`);
    }

    const controls2 = await page2.evaluate(() => {
      const attackerSelect = document.getElementById('attackerSelect');
      return {
        attackerValue: attackerSelect.value,
        attackerDisabled: attackerSelect.disabled
      };
    });

    if (controls2.attackerValue === 'free_trader' && controls2.attackerDisabled === true) {
      console.log(`${GREEN}  ✅ Player 2 locked to Free Trader${RESET}`);
    } else {
      throw new Error(`Control restriction failed for Player 2`);
    }

    // Test 3: Ship state synchronization
    console.log(`\n${YELLOW}Test 3: Ship State Synchronization${RESET}`);

    // Player 1 (Scout) attacks
    await page1.evaluate(() => {
      socket.emit('combat', {
        attacker: 'scout',
        target: 'free_trader',
        range: 'medium',
        dodge: 'none',
        seed: Date.now()
      });
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check both players see updated hull
    const hull1 = await page1.evaluate(() => {
      const free_traderOption = document.querySelector('#targetSelect option[value="free_trader"]');
      return free_traderOption ? free_traderOption.textContent : null;
    });

    const hull2 = await page2.evaluate(() => {
      const free_traderOption = document.querySelector('#targetSelect option[value="free_trader"]');
      return free_traderOption ? free_traderOption.textContent : null;
    });

    console.log(`${BLUE}  Player 1 sees: ${hull1}${RESET}`);
    console.log(`${BLUE}  Player 2 sees: ${hull2}${RESET}`);

    if (hull1 === hull2 && hull1.includes('Hull')) {
      console.log(`${GREEN}  ✅ Ship state synchronized across players${RESET}`);
    } else {
      throw new Error(`State sync failed: "${hull1}" !== "${hull2}"`);
    }

    // Test 4: Game reset
    console.log(`\n${YELLOW}Test 4: Game Reset${RESET}`);

    await page1.evaluate(() => {
      socket.emit('resetGame');
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const resetHull = await page1.evaluate(() => {
      const scoutOption = document.querySelector('#attackerSelect option[value="scout"]');
      const free_traderOption = document.querySelector('#targetSelect option[value="free_trader"]');
      return {
        scout: scoutOption ? scoutOption.textContent : null,
        free_trader: free_traderOption ? free_traderOption.textContent : null
      };
    });

    if (resetHull.scout.includes('10/10') && resetHull.free_trader.includes('15/15')) {
      console.log(`${GREEN}  ✅ Ships reset to full hull${RESET}`);
    } else {
      throw new Error(`Reset failed: ${JSON.stringify(resetHull)}`);
    }

    console.log('\n========================================');
    console.log(`${GREEN}ALL STAGE 3 TESTS PASSED ✅${RESET}`);
    console.log('========================================\n');

    await browser.close();
    await stopServer();
    process.exit(0);

  } catch (error) {
    console.error(`${RED}Error during tests:${RESET}`, error);
    if (browser) await browser.close();
    await stopServer();
    process.exit(1);
  }
}

runTests();
