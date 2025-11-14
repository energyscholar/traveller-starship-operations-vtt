#!/usr/bin/env node
// Unified Performance Test Runner
// Purpose: Single CLI for both Puppeteer (headless) and Puppetry (visible) modes
// Usage: node tests/performance/run.js [options]
// Session: 6, Phase 4

const { runScenario: runPuppeteer } = require('./puppeteer-runner');
const { runPuppetryScenario: runPuppetry } = require('./puppetry-runner');
const { runLoadTest, runProgressiveLoadTest } = require('./load-test');

// Available scenarios
const scenarios = {
  basic: require('../scenarios/basic-combat'),
  missile: require('../scenarios/missile-combat'),
  sandcaster: require('../scenarios/sandcaster-defense')
};

/**
 * Parse command-line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'headless',        // headless, visible, load
    scenario: 'all',         // basic, missile, sandcaster, all
    baseUrl: 'http://localhost:3000',
    verbose: false,
    slowMo: 300,
    keepOpen: 5000,
    concurrency: 2,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--mode' || arg === '-m') {
      options.mode = args[++i];
    } else if (arg === '--scenario' || arg === '-s') {
      options.scenario = args[++i];
    } else if (arg === '--url' || arg === '-u') {
      options.baseUrl = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--slow') {
      options.slowMo = parseInt(args[++i], 10);
    } else if (arg === '--keep-open') {
      options.keepOpen = parseInt(args[++i], 10);
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Traveller Combat VTT - Performance Test Runner       ║
║                         Session 6 - Stage 13                   ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  node tests/performance/run.js [options]

MODES:
  --mode, -m <mode>         Test mode (default: headless)
    headless                  Fast, headless Puppeteer testing
    visible                   Slow, visible Puppetry with feedback
    load                      Multi-client load testing

SCENARIOS:
  --scenario, -s <name>     Scenario to run (default: all)
    basic                     Basic combat (Scout vs Free Trader)
    missile                   Missile combat scenario
    sandcaster                Sandcaster defense scenario
    all                       Run all scenarios

OPTIONS:
  --url, -u <url>           Base URL (default: http://localhost:3000)
  --verbose, -v             Verbose output
  --slow <ms>               Slow motion delay (visible mode, default: 300)
  --keep-open <ms>          Keep browser open (visible mode, default: 5000)
  --concurrency, -c <n>     Concurrent clients (load mode, default: 2)
  --help, -h                Display this help

EXAMPLES:
  # Run all scenarios in headless mode
  node tests/performance/run.js

  # Run basic scenario in visible mode
  node tests/performance/run.js --mode visible --scenario basic

  # Run load test with 5 concurrent clients
  node tests/performance/run.js --mode load --concurrency 5

  # Run visible demo with 1 second delays
  node tests/performance/run.js -m visible -s basic --slow 1000 --keep-open 10000

REQUIREMENTS:
  - Server must be running on port 3000
  - Test API must be enabled (ENABLE_TEST_API=true)
  - Chrome/Chromium must be installed

MORE INFO:
  - Puppeteer (headless): Fast performance testing, CI/CD
  - Puppetry (visible): Demonstrations, debugging, showcases
  - Load testing: Multi-client concurrency testing
`);
}

/**
 * Run headless mode tests
 * @param {Object} options - CLI options
 * @returns {Promise<Object>} Test results
 */
async function runHeadlessMode(options) {
  const results = { scenarios: [], summary: {} };
  const scenarioNames = options.scenario === 'all'
    ? Object.keys(scenarios)
    : [options.scenario];

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                  HEADLESS MODE (Puppeteer)                     ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  for (const name of scenarioNames) {
    const scenario = scenarios[name];
    if (!scenario) {
      console.error(`❌ Unknown scenario: ${name}`);
      continue;
    }

    console.log(`Running: ${scenario.name}...`);
    const result = await runPuppeteer(scenario, {
      baseUrl: options.baseUrl,
      verbose: options.verbose
    });

    results.scenarios.push({
      name,
      ...result
    });

    // Display summary
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const duration = Math.round(result.metrics.totalDuration);
    const steps = `${result.steps.filter(s => s.success).length}/${result.steps.length}`;
    console.log(`  ${status} | Steps: ${steps} | Duration: ${duration}ms\n`);
  }

  // Overall summary
  const passed = results.scenarios.filter(s => s.success).length;
  const total = results.scenarios.length;
  results.summary = {
    passed,
    failed: total - passed,
    total,
    successRate: (passed / total) * 100
  };

  return results;
}

/**
 * Run visible mode tests
 * @param {Object} options - CLI options
 * @returns {Promise<Object>} Test results
 */
async function runVisibleMode(options) {
  const results = { scenarios: [], summary: {} };
  const scenarioNames = options.scenario === 'all'
    ? Object.keys(scenarios)
    : [options.scenario];

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                  VISIBLE MODE (Puppetry)                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  for (const name of scenarioNames) {
    const scenario = scenarios[name];
    if (!scenario) {
      console.error(`❌ Unknown scenario: ${name}`);
      continue;
    }

    const result = await runPuppetry(scenario, {
      baseUrl: options.baseUrl,
      slowMo: options.slowMo,
      verbose: options.verbose,
      keepOpen: options.keepOpen
    });

    results.scenarios.push({
      name,
      ...result
    });

    // Display summary
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const duration = Math.round(result.metrics.totalDuration);
    const steps = `${result.steps.filter(s => s.success).length}/${result.steps.length}`;
    console.log(`  ${status} | Steps: ${steps} | Duration: ${duration}ms\n`);
  }

  // Overall summary
  const passed = results.scenarios.filter(s => s.success).length;
  const total = results.scenarios.length;
  results.summary = {
    passed,
    failed: total - passed,
    total,
    successRate: (passed / total) * 100
  };

  return results;
}

/**
 * Run load test mode
 * @param {Object} options - CLI options
 * @returns {Promise<Object>} Test results
 */
async function runLoadMode(options) {
  const scenario = scenarios[options.scenario === 'all' ? 'basic' : options.scenario];

  if (!scenario) {
    throw new Error(`Unknown scenario: ${options.scenario}`);
  }

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                    LOAD TEST MODE                              ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  console.log(`Scenario: ${scenario.name}`);
  console.log(`Concurrency: ${options.concurrency} clients\n`);

  const result = await runLoadTest(scenario, options.concurrency, {
    baseUrl: options.baseUrl,
    verbose: options.verbose
  });

  // Display summary
  const success = result.metrics.successfulClients === options.concurrency;
  const status = success ? '✅ PASSED' : '⚠️  PARTIAL';
  console.log(`\n${status}`);
  console.log(`Successful: ${result.metrics.successfulClients}/${result.clients.length}`);
  console.log(`Duration: ${Math.round(result.metrics.totalDuration)}ms`);
  console.log(`Avg Memory: ${result.metrics.averageMemory}MB\n`);

  return result;
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Validate mode
  if (!['headless', 'visible', 'load'].includes(options.mode)) {
    console.error(`❌ Invalid mode: ${options.mode}`);
    console.log(`Use --help for usage information`);
    process.exit(1);
  }

  // Validate scenario
  if (options.scenario !== 'all' && !scenarios[options.scenario]) {
    console.error(`❌ Invalid scenario: ${options.scenario}`);
    console.log(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  try {
    let results;

    switch (options.mode) {
      case 'headless':
        results = await runHeadlessMode(options);
        break;
      case 'visible':
        results = await runVisibleMode(options);
        break;
      case 'load':
        results = await runLoadMode(options);
        break;
    }

    // Final summary
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                      TEST SUMMARY                              ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    if (results.summary) {
      console.log(`Mode: ${options.mode}`);
      console.log(`Passed: ${results.summary.passed}/${results.summary.total}`);
      console.log(`Success Rate: ${results.summary.successRate.toFixed(1)}%`);
    } else if (results.metrics) {
      console.log(`Mode: load`);
      console.log(`Concurrency: ${options.concurrency}`);
      console.log(`Success Rate: ${((results.metrics.successfulClients / results.clients.length) * 100).toFixed(1)}%`);
    }

    console.log('');

    // Exit code based on success
    const allPassed = results.summary
      ? results.summary.successRate === 100
      : results.metrics.successfulClients === results.clients.length;

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runHeadlessMode,
  runVisibleMode,
  runLoadMode
};
