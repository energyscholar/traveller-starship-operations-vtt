// Basic Combat Scenario - Scout vs Free Trader
// Purpose: Simple 1v1 combat for testing core mechanics
// Duration: ~2-3 rounds
// Outcome: Tests basic fire/endTurn workflow

module.exports = {
  name: 'Basic Combat (Scout vs Free Trader)',
  description: 'Simple 1v1 combat at short range with pulse lasers',
  duration: '2-3 rounds',
  difficulty: 'easy',

  setup: {
    player1: {
      ship: 'scout',
      range: 'Short'
    },
    player2: {
      ship: 'free_trader',
      range: 'Short'
    }
  },

  // Expected actions per round (for validation)
  expectedActions: [
    // Round 1
    {
      round: 1,
      actions: [
        { player: 'player1', type: 'fire', weapon: 'pulse_laser' },
        { player: 'player2', type: 'fire', weapon: 'beam_laser' },
        { player: 'player1', type: 'endTurn' },
        { player: 'player2', type: 'endTurn' }
      ]
    },
    // Round 2
    {
      round: 2,
      actions: [
        { player: 'player1', type: 'fire', weapon: 'pulse_laser' },
        { player: 'player2', type: 'fire', weapon: 'beam_laser' },
        { player: 'player1', type: 'endTurn' },
        { player: 'player2', type: 'endTurn' }
      ]
    }
  ],

  // Puppeteer steps (headless, fast)
  puppeteerSteps: [
    {
      description: 'Player 1 selects Scout',
      selector: '[data-test-id="ship-option-scout"]',
      action: 'click'
    },
    {
      description: 'Player 1 selects Short range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Short'
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      wait: { selector: '[data-test-id="fire-button"]' }
    },
    {
      description: 'Player 1 fires pulse laser',
      selector: '[data-test-id="fire-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    },
    {
      description: 'Player 1 ends turn',
      selector: '[data-test-id="end-turn-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    }
  ],

  // Puppetry steps (visible, slow, with feedback)
  puppetrySteps: [
    {
      description: 'Player 1 selects Scout',
      selector: '[data-test-id="ship-option-scout"]',
      action: 'click',
      feedback: 'Selecting Scout spacecraft...',
      delay: 800
    },
    {
      description: 'Player 1 selects Short range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Short',
      feedback: 'Setting starting range to Short...',
      delay: 800
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      feedback: 'Confirming ship selection...',
      wait: { selector: '[data-test-id="fire-button"]' },
      delay: 1000
    },
    {
      description: 'Player 1 fires pulse laser',
      selector: '[data-test-id="fire-button"]',
      action: 'click',
      feedback: 'Firing pulse laser at enemy ship!',
      wait: { timeout: 1500 },
      delay: 1000
    },
    {
      description: 'Player 1 ends turn',
      selector: '[data-test-id="end-turn-button"]',
      action: 'click',
      feedback: 'Ending turn...',
      wait: { timeout: 1500 },
      delay: 800
    }
  ],

  // Validation checks
  validation: {
    preconditions: [
      { check: 'server_running', description: 'Server must be running on port 3000' },
      { check: 'test_api_enabled', description: 'Test API must be enabled (ENABLE_TEST_API=true)' }
    ],
    postconditions: [
      { check: 'combat_started', description: 'Combat must have started' },
      { check: 'at_least_one_shot_fired', description: 'At least one weapon fired' },
      { check: 'combat_log_not_empty', description: 'Combat log must have entries' }
    ]
  },

  // Performance metrics (for Puppeteer mode)
  performanceMetrics: {
    maxRoundDuration: 5000, // ms
    maxTotalDuration: 15000, // ms
    maxLatency: 200, // ms (WebSocket)
    maxMemory: 200 // MB
  }
};
