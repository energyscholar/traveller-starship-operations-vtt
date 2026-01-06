#!/usr/bin/env node
/**
 * Cronor Subsector (A) Journey E2E Test
 *
 * Run with: npm run test:e2e tests/e2e/cronor-journey.e2e.js
 */

const { runSubsectorJourney } = require('./helpers/subsector-journey');
const fs = require('fs');
const path = require('path');

const subsectorPath = path.join(__dirname, '../../data/star-systems/spinward-marches/subsector-a-cronor.json');
const subsectorData = JSON.parse(fs.readFileSync(subsectorPath, 'utf8'));

const realSystems = subsectorData.systems.filter(s => !s.name.startsWith('Deep Space'));
const SYSTEMS = realSystems.map(sys => [
  sys.name, sys.hex, sys.uwp?.[0] || 'X', sys.gasGiants || 0
]);

async function run() {
  const result = await runSubsectorJourney({
    name: 'Cronor',
    letter: 'A',
    systems: SYSTEMS,
    headless: process.env.HEADED !== '1',
    timeout: 600000
  });
  process.exit(result.tests.failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Test crashed:', err); process.exit(1); });
