#!/usr/bin/env node
/**
 * Lunion Subsector (K) Journey E2E Test
 *
 * Tests complete journey through all 25 systems in Lunion subsector
 * with fuel management using the shared subsector-journey module.
 *
 * Run with: npm run test:e2e tests/e2e/lunion-journey.e2e.js
 */

const { runSubsectorJourney, parseSubsectorData } = require('./helpers/subsector-journey');
const fs = require('fs');
const path = require('path');

// Load subsector data
const subsectorPath = path.join(__dirname, '../../data/star-systems/spinward-marches/subsector-k-lunion.json');
const subsectorData = JSON.parse(fs.readFileSync(subsectorPath, 'utf8'));

// Filter out Deep Space waypoints (not real systems)
const realSystems = subsectorData.systems.filter(s => !s.name.startsWith('Deep Space'));

// Convert to system tuples: [name, hex, starportClass, gasGiants]
const LUNION_SYSTEMS = realSystems.map(sys => {
  const starport = sys.uwp?.[0] || 'X';
  const gasGiants = sys.gasGiants || 0;
  return [sys.name, sys.hex, starport, gasGiants];
});

// Entry/exit hexes for combined sector tour
const ENTRY_HEX = '2124'; // Derchon - connects to Mora subsector
const EXIT_HEX = '1721';  // Arba - connects to Sword Worlds subsector

async function run() {
  const result = await runSubsectorJourney({
    name: 'Lunion',
    letter: 'K',
    systems: LUNION_SYSTEMS,
    startHex: ENTRY_HEX,
    headless: process.env.HEADED !== '1',
    timeout: 600000
  });

  process.exit(result.tests.failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
