// Test Scenario Registry
// Purpose: Central registry of all test scenarios for Puppeteer/Puppetry
// Usage: const scenarios = require('./tests/scenarios');

const basicCombat = require('./basic-combat');
const missileCombat = require('./missile-combat');
const sandcasterDefense = require('./sandcaster-defense');

// All available scenarios
const scenarios = {
  basicCombat,
  missileCombat,
  sandcasterDefense
};

// Get scenario by name
function getScenario(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const [key, scenario] of Object.entries(scenarios)) {
    const scenarioNormalized = scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (scenarioNormalized.includes(normalized) || normalized.includes(scenarioNormalized)) {
      return scenario;
    }
  }

  return null;
}

// List all scenarios
function listScenarios() {
  return Object.values(scenarios).map(s => ({
    name: s.name,
    description: s.description,
    duration: s.duration,
    difficulty: s.difficulty
  }));
}

// Filter scenarios by difficulty
function getScenariosByDifficulty(difficulty) {
  return Object.values(scenarios).filter(s => s.difficulty === difficulty);
}

module.exports = {
  // Individual scenarios
  ...scenarios,

  // Helper functions
  getScenario,
  listScenarios,
  getScenariosByDifficulty,

  // Arrays for iteration
  all: Object.values(scenarios)
};
