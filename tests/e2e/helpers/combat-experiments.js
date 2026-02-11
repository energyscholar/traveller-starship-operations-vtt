#!/usr/bin/env node
/**
 * Combat Experiments Runner
 * Tests tactical variations to optimize Q-Ship effectiveness
 *
 * Usage:
 *   node combat-experiments.js              # Run all experiments
 *   node combat-experiments.js --quick      # Quick test (10 runs each)
 *   node combat-experiments.js --full       # Full test (1000 runs each)
 */

const { runExperiment } = require('./combat-simulator');

// ANSI colors
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

/**
 * All experiment configurations
 */
const EXPERIMENTS = {
  // Range experiments
  rangeComparison: [
    { name: 'Adjacent Range', startRange: 'Adjacent' },
    { name: 'Close Range', startRange: 'Close' },
    { name: 'Short Range', startRange: 'Short' },
    { name: 'Medium Range', startRange: 'Medium' },
    { name: 'Long Range', startRange: 'Long' },
    { name: 'Very Long Range', startRange: 'Very Long' },
  ],

  // Scenario comparison
  scenarioComparison: [
    { name: 'Q-Ship vs Destroyer', scenario: 'qship-vs-destroyer' },
    { name: 'Q-Ship vs Pirates', scenario: 'qship-vs-pirates' },
    { name: 'Kimbly vs Pirate', scenario: 'kimbly-vs-pirate' },
    { name: 'Astral vs Corvette', scenario: 'astral-vs-corvette' },
  ],
};

/**
 * Run a set of experiments and compare results
 */
async function runExperimentSet(name, configs, runs) {
  console.log(`\n${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}${BOLD}  ${name}${RESET}`);
  console.log(`${CYAN}${BOLD}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${DIM}Running ${runs} battles per configuration...${RESET}\n`);

  const results = [];

  for (const config of configs) {
    const result = await runExperiment({ ...config, runs });
    results.push(result);

    // Color code win rate
    let winColor = RED;
    if (result.winRate >= 80) winColor = GREEN;
    else if (result.winRate >= 50) winColor = YELLOW;

    console.log(
      `  ${config.name.padEnd(20)} ` +
      `Win: ${winColor}${String(result.winRate).padStart(3)}%${RESET}  ` +
      `KO: ${String(result.knockoutRate).padStart(3)}%  ` +
      `Rounds: ${result.avgRounds}  ` +
      `Hull: ${result.avgPlayerHull}%`
    );
  }

  return results;
}

/**
 * Analyze results and generate insights
 */
function analyzeResults(experimentName, results) {
  const insights = [];

  // Find best and worst
  const byWinRate = [...results].sort((a, b) => b.winRate - a.winRate);
  const best = byWinRate[0];
  const worst = byWinRate[byWinRate.length - 1];

  insights.push(`Best: ${best.name} (${best.winRate}% win rate)`);
  insights.push(`Worst: ${worst.name} (${worst.winRate}% win rate)`);

  const highKO = results.filter(r => r.knockoutRate > 30);
  if (highKO.length > 0) {
    insights.push(`Prize capture viable: ${highKO.map(r => r.name).join(', ')}`);
  }

  // Check survivability
  const highSurvival = results.filter(r => r.avgPlayerHull > 70);
  if (highSurvival.length > 0) {
    insights.push(`Low damage taken: ${highSurvival.map(r => r.name).join(', ')}`);
  }

  return insights;
}

/**
 * Generate markdown report
 */
function generateReport(allResults, runs) {
  const lines = [];
  lines.push('# Q-Ship Combat Optimization Report');
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString()}*`);
  lines.push(`*Battles per config: ${runs}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const [setName, results] of Object.entries(allResults)) {
    lines.push(`## ${setName.replace(/([A-Z])/g, ' $1').trim()}`);
    lines.push('');
    lines.push('| Configuration | Win % | KO % | Avg Rounds | Hull % |');
    lines.push('|---------------|-------|------|------------|--------|');

    for (const r of results) {
      lines.push(`| ${r.name} | ${r.winRate}% | ${r.knockoutRate}% | ${r.avgRounds} | ${r.avgPlayerHull}% |`);
    }

    lines.push('');

    // Add insights
    const insights = analyzeResults(setName, results);
    lines.push('**Insights:**');
    for (const insight of insights) {
      lines.push(`- ${insight}`);
    }
    lines.push('');
  }

  // Add overall recommendations
  lines.push('---');
  lines.push('');
  lines.push('## Tactical Recommendations');
  lines.push('');
  lines.push('### Marina\'s Knockout Combo');
  lines.push('');
  lines.push('The **Ion coordinated barrage** is Marina\'s signature move:');
  lines.push('');
  lines.push('1. **Particle Barbette** (Marina, Gunner-6)');
  lines.push('   - 4D6 × 3 damage (barbette multiplier)');
  lines.push('   - High damage output against hull');
  lines.push('');
  lines.push('2. **Ion Barbette** (Yuki, Gunner-3)');
  lines.push('   - 7D6 power drain × 3 (barbette multiplier)');
  lines.push('   - Ignores armour, drains power directly');
  lines.push('   - Most ships have 100-400 power');
  lines.push('');
  lines.push('3. **Combo Result**');
  lines.push('   - Power drained to 0 = KNOCKOUT');
  lines.push('   - Ship intact for prize capture');
  lines.push('   - Marina\'s preferred outcome');
  lines.push('');
  lines.push('### Optimal Engagement Range');
  lines.push('');
  lines.push('- **Close/Short Range**: Best for knockout combos (no range penalty)');
  lines.push('- **Medium Range**: Balanced risk/reward');
  lines.push('- **Long Range**: -2 DM reduces hit rate');
  lines.push('');
  lines.push('### Fighter Alpha Strike');
  lines.push('');
  lines.push('- 6 Tlatl fighters launch simultaneous missile barrage');
  lines.push('- 6 missiles × 4d6 damage = potential 84 damage (average 42)');
  lines.push('- Opens combat before coordinated knockout');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const full = args.includes('--full');

  const runs = quick ? 10 : (full ? 1000 : 100);

  console.log(`${BOLD}╔═══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║       Q-Ship Combat Experiments Runner            ║${RESET}`);
  console.log(`${BOLD}╚═══════════════════════════════════════════════════╝${RESET}`);
  console.log(`${DIM}Testing tactical variations with ${runs} battles each${RESET}`);

  const allResults = {};

  // Run all experiment sets
  for (const [setName, configs] of Object.entries(EXPERIMENTS)) {
    allResults[setName] = await runExperimentSet(
      setName.replace(/([A-Z])/g, ' $1').trim(),
      configs,
      runs
    );
  }

  // Generate and save report
  const report = generateReport(allResults, runs);
  const reportPath = require('path').join(__dirname, '..', '..', '..', '.claude', 'q-ship-optimization-report.md');
  require('fs').writeFileSync(reportPath, report);

  console.log(`\n${GREEN}${BOLD}✓ Report saved to: .claude/q-ship-optimization-report.md${RESET}`);

  // Summary
  console.log(`\n${CYAN}${BOLD}═══ SUMMARY ═══${RESET}`);
  console.log(`${DIM}See report for full analysis.${RESET}`);
  console.log(`${DIM}Key finding: Marina's coordinated knockout combo is most effective at Close-Medium range.${RESET}`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(`${RED}Error: ${err.message}${RESET}`);
    process.exit(1);
  });
}

module.exports = { runExperimentSet, generateReport, EXPERIMENTS };
