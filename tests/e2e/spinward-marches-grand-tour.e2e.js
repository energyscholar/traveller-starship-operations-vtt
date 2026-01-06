#!/usr/bin/env node
/**
 * Spinward Marches Grand Tour E2E Test
 *
 * Visits all ~439 systems in the sector with full fuel management.
 * Combines all 16 subsector routes into one epic journey.
 *
 * Route: L(Mora) → K → J → I → E → F → G → H → D → C → B → A → M → N → O → P
 *
 * Run with: npm run test:e2e tests/e2e/spinward-marches-grand-tour.e2e.js
 */

const { runSubsectorJourney, aggregateMetrics, resetSoloDemo, hexDistance } = require('./helpers/subsector-journey');
const fs = require('fs');
const path = require('path');

// Subsector order (snake pattern from Mora)
const SUBSECTOR_ORDER = [
  { letter: 'L', name: 'Mora', file: 'subsector-l-mora.json' },
  { letter: 'K', name: 'Lunion', file: 'subsector-k-lunion.json' },
  { letter: 'J', name: 'Sword Worlds', file: 'subsector-j-sword-worlds.json' },
  { letter: 'I', name: 'Darrian', file: 'subsector-i-darrian.json' },
  { letter: 'E', name: 'Querion', file: 'subsector-e-querion.json' },
  { letter: 'F', name: 'Regina', file: 'subsector-f-regina.json' },
  { letter: 'G', name: 'Lanth', file: 'subsector-g-lanth.json' },
  { letter: 'H', name: 'Aramis', file: 'subsector-h-aramis.json' },
  { letter: 'D', name: 'Rhylanor', file: 'subsector-d-rhylanor.json' },
  { letter: 'C', name: 'Vilis', file: 'subsector-c-vilis.json' },
  { letter: 'B', name: 'Jewell', file: 'subsector-b-jewell.json' },
  { letter: 'A', name: 'Cronor', file: 'subsector-a-cronor.json' },
  { letter: 'M', name: 'Five Sisters', file: 'subsector-m-five-sisters.json' },
  { letter: 'N', name: 'District 268', file: 'subsector-n-district-268.json' },
  { letter: 'O', name: 'Glisten', file: 'subsector-o-glisten.json' },
  { letter: 'P', name: "Trin's Veil", file: 'subsector-p-trins-veil.json' }
];

function loadSubsectorSystems(filename) {
  const subsectorPath = path.join(__dirname, '../../data/star-systems/spinward-marches', filename);
  const data = JSON.parse(fs.readFileSync(subsectorPath, 'utf8'));
  return data.systems
    .filter(s => !s.name.startsWith('Deep Space'))
    .map(sys => [sys.name, sys.hex, sys.uwp?.[0] || 'X', sys.gasGiants || 0]);
}

async function run() {
  console.log('\n' + '='.repeat(70));
  console.log('  SPINWARD MARCHES GRAND TOUR');
  console.log('  16 Subsectors - ~439 Systems - Full Fuel Management');
  console.log('='.repeat(70) + '\n');

  const grandStartTime = Date.now();
  const allResults = [];

  // Reset Solo Demo once at start
  await resetSoloDemo();

  for (let i = 0; i < SUBSECTOR_ORDER.length; i++) {
    const subsector = SUBSECTOR_ORDER[i];

    console.log(`\n${'#'.repeat(70)}`);
    console.log(`  SUBSECTOR ${i + 1}/16: ${subsector.name} (${subsector.letter})`);
    console.log(`${'#'.repeat(70)}\n`);

    try {
      const systems = loadSubsectorSystems(subsector.file);

      const result = await runSubsectorJourney({
        name: subsector.name,
        letter: subsector.letter,
        systems: systems,
        skipReset: true, // Only reset once at start
        headless: process.env.HEADED !== '1',
        timeout: 600000
      });

      allResults.push(result);

    } catch (err) {
      console.error(`  ERROR in ${subsector.name}:`, err.message);
      allResults.push({
        subsector: subsector.name,
        duration: '0',
        systems: { visited: 0, total: 0 },
        destinations: 0,
        jumps: { completed: 0, parsecs: 0 },
        distance: { km: 0, parsecs: 0 },
        refuel: { starportRefined: 0, starportUnrefined: 0, gasGiant: 0, wilderness: 0 },
        time: { realSeconds: 0, gameHours: 0, gameDays: 0 },
        maintenance: { jumpsDue: 0 },
        tests: { passed: 0, failed: 1 },
        unreachable: [],
        errors: [{ msg: 'Subsector failed', error: err.message }]
      });
    }
  }

  // Aggregate all results
  const grandTotal = aggregateMetrics(allResults);
  const grandDuration = ((Date.now() - grandStartTime) / 1000).toFixed(1);

  // Print grand summary
  console.log('\n' + '='.repeat(70));
  console.log('  SPINWARD MARCHES GRAND TOUR COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Total Duration: ${grandDuration}s (${(parseFloat(grandDuration)/60).toFixed(1)} minutes)`);
  console.log(`  Subsectors: ${grandTotal.subsectors}/16`);
  console.log(`  Systems: ${grandTotal.systems.visited}/${grandTotal.systems.total}`);
  console.log(`  Destinations: ${grandTotal.destinations}`);
  console.log(`  Jumps: ${grandTotal.jumps.completed} (${grandTotal.jumps.parsecs} parsecs)`);
  console.log(`  In-System Travel: ${grandTotal.distance.km.toLocaleString()} km`);
  console.log(`  Game Time: ${grandTotal.time.gameDays} days (${grandTotal.time.gameHours} hours)`);
  console.log('');
  console.log('  Refuel Operations:');
  console.log(`    - Starport Refined: ${grandTotal.refuel.starportRefined}`);
  console.log(`    - Starport Unrefined: ${grandTotal.refuel.starportUnrefined}`);
  console.log(`    - Gas Giant Skim: ${grandTotal.refuel.gasGiant}`);
  console.log(`    - Wilderness: ${grandTotal.refuel.wilderness}`);
  console.log('');
  console.log(`  J-Drive Maintenance Due: ${grandTotal.maintenance.jumpsDue} times`);
  console.log(`  Tests: ${grandTotal.tests.passed} passed, ${grandTotal.tests.failed} failed`);

  if (grandTotal.unreachable.length > 0) {
    console.log(`\n  Unreachable Systems: ${grandTotal.unreachable.length}`);
    grandTotal.unreachable.slice(0, 10).forEach(s => {
      console.log(`    - ${s.systemName} (${s.hex}) in ${s.subsector}: ${s.reason}`);
    });
    if (grandTotal.unreachable.length > 10) {
      console.log(`    ... and ${grandTotal.unreachable.length - 10} more`);
    }
  }

  console.log('='.repeat(70) + '\n');

  // Write detailed summary to file
  const summaryPath = path.join(__dirname, '../../docs/SPINWARD-MARCHES-SUMMARY.md');
  writeSummaryFile(summaryPath, grandTotal, allResults, grandDuration);

  process.exit(grandTotal.tests.failed > 0 ? 1 : 0);
}

function writeSummaryFile(filepath, grandTotal, subsectorResults, duration) {
  const now = new Date().toISOString().split('T')[0];

  let content = `# Spinward Marches Grand Tour Summary

**Generated:** ${now}
**Duration:** ${duration}s (${(parseFloat(duration)/60).toFixed(1)} minutes)

## Overview

| Metric | Value |
|--------|-------|
| Subsectors Visited | ${grandTotal.subsectors}/16 |
| Systems Visited | ${grandTotal.systems.visited}/${grandTotal.systems.total} |
| Destinations Visited | ${grandTotal.destinations} |
| Jumps Completed | ${grandTotal.jumps.completed} |
| Total Parsecs | ${grandTotal.jumps.parsecs} |
| In-System Distance | ${grandTotal.distance.km.toLocaleString()} km |
| Game Time | ${grandTotal.time.gameDays} days (${grandTotal.time.gameHours} hours) |
| Real Time | ${duration}s |

## Refueling Operations

| Type | Count |
|------|-------|
| Starport Refined | ${grandTotal.refuel.starportRefined} |
| Starport Unrefined | ${grandTotal.refuel.starportUnrefined} |
| Gas Giant Skim | ${grandTotal.refuel.gasGiant} |
| Wilderness | ${grandTotal.refuel.wilderness} |
| **Total** | ${grandTotal.refuel.starportRefined + grandTotal.refuel.starportUnrefined + grandTotal.refuel.gasGiant + grandTotal.refuel.wilderness} |

## J-Drive Maintenance

Per Traveller rules, jump drives require maintenance every 6 jumps.

- **Maintenance checks due:** ${grandTotal.maintenance.jumpsDue}
- **Note:** This implementation tracks but does not enforce maintenance requirements

## Traveller Rules Gaps

### NOT IMPLEMENTED
1. **Jump Maintenance** - Every 6 jumps needs maintenance check (tracked but not enforced)
2. **Maneuver Fuel** - ~1% hull per G-hour of thrust
3. **Life Support Consumables** - Food/water per person per day
4. **Crew Fatigue** - Watch rotations, rest requirements
5. **Operational Costs** - Docking fees, fuel costs in credits

### IMPLEMENTED
- Jump fuel consumption (10% hull per parsec)
- Fuel types (refined/unrefined/processed)
- Four refuel sources
- Position verification after jump
- Gas giant skimming

## Per-Subsector Results

| Subsector | Systems | Destinations | Jumps | Parsecs | Refuels | Tests |
|-----------|---------|--------------|-------|---------|---------|-------|
`;

  for (const r of subsectorResults) {
    const totalRefuel = r.refuel.starportRefined + r.refuel.starportUnrefined + r.refuel.gasGiant + r.refuel.wilderness;
    content += `| ${r.subsector} | ${r.systems.visited}/${r.systems.total} | ${r.destinations} | ${r.jumps.completed} | ${r.distance.parsecs} | ${totalRefuel} | ${r.tests.passed}/${r.tests.passed + r.tests.failed} |\n`;
  }

  if (grandTotal.unreachable.length > 0) {
    content += `\n## Unreachable Systems\n\n`;
    content += `| System | Hex | Subsector | Reason |\n`;
    content += `|--------|-----|-----------|--------|\n`;
    for (const u of grandTotal.unreachable) {
      content += `| ${u.systemName} | ${u.hex} | ${u.subsector} | ${u.reason} |\n`;
    }
  }

  if (grandTotal.errors.length > 0) {
    content += `\n## Errors\n\n`;
    for (const e of grandTotal.errors) {
      content += `- **${e.subsector || 'Unknown'}:** ${e.msg} - ${e.error}\n`;
    }
  }

  content += `\n---\n\n*Generated by spinward-marches-grand-tour.e2e.js*\n`;

  fs.writeFileSync(filepath, content);
  console.log(`  Summary written to: ${filepath}`);
}

run().catch(err => {
  console.error('Grand Tour crashed:', err);
  process.exit(1);
});
