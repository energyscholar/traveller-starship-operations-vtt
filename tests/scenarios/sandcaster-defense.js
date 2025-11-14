// Sandcaster Defense Scenario - Defensive Tactics
// Purpose: Test sandcaster mechanics and defensive actions
// Duration: ~3-4 rounds
// Outcome: Tests sandcaster deployment and armor bonuses

module.exports = {
  name: 'Sandcaster Defense',
  description: 'Close-range combat with sandcaster defense',
  duration: '3-4 rounds',
  difficulty: 'medium',

  setup: {
    player1: {
      ship: 'scout', // Has sandcasters
      range: 'Close'
    },
    player2: {
      ship: 'free_trader',
      range: 'Close'
    }
  },

  expectedActions: [
    // Round 1: Fire and defend
    {
      round: 1,
      actions: [
        { player: 'player1', type: 'fire', weapon: 'pulse_laser' },
        { player: 'player2', type: 'useSandcaster' }, // Defensive
        { player: 'player1', type: 'endTurn' },
        { player: 'player2', type: 'endTurn' }
      ]
    }
  ],

  puppeteerSteps: [
    {
      description: 'Player 1 selects Scout',
      selector: '[data-test-id="ship-option-scout"]',
      action: 'click'
    },
    {
      description: 'Player 1 selects Close range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Close'
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      wait: { selector: '[data-test-id="use-sandcaster-button"]' }
    },
    {
      description: 'Player 1 uses sandcaster',
      selector: '[data-test-id="use-sandcaster-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    },
    {
      description: 'Check sandcaster ammo',
      selector: '[data-test-id="sandcaster-remaining"]',
      action: 'getText',
      expectedPattern: /\d+/
    },
    {
      description: 'Player 1 ends turn',
      selector: '[data-test-id="end-turn-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    }
  ],

  puppetrySteps: [
    {
      description: 'Player 1 selects Scout',
      selector: '[data-test-id="ship-option-scout"]',
      action: 'click',
      feedback: 'Selecting Scout with sandcaster turret...',
      delay: 1000
    },
    {
      description: 'Player 1 selects Close range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Close',
      feedback: 'Engaging at close range (defensive advantage)...',
      delay: 1000
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      feedback: 'Preparing defensive systems...',
      wait: { selector: '[data-test-id="use-sandcaster-button"]' },
      delay: 1500
    },
    {
      description: 'Player 1 uses sandcaster',
      selector: '[data-test-id="use-sandcaster-button"]',
      action: 'click',
      feedback: 'Deploying sandcaster cloud for defense!',
      highlight: '[data-test-id="ship-armour"]',
      wait: { timeout: 2000 },
      delay: 1500
    },
    {
      description: 'Check sandcaster ammo',
      selector: '[data-test-id="sandcaster-remaining"]',
      action: 'getText',
      feedback: 'Checking sandcaster canisters remaining...',
      delay: 800
    },
    {
      description: 'Player 1 ends turn',
      selector: '[data-test-id="end-turn-button"]',
      action: 'click',
      feedback: 'Defensive cloud active - ending turn...',
      wait: { timeout: 1500 },
      delay: 1000
    }
  ],

  validation: {
    preconditions: [
      { check: 'server_running', description: 'Server running' },
      { check: 'test_api_enabled', description: 'Test API enabled' },
      { check: 'scout_has_sandcasters', description: 'Scout has sandcasters' }
    ],
    postconditions: [
      { check: 'sandcaster_used', description: 'Sandcaster deployed' },
      { check: 'ammo_decreased', description: 'Sandcaster ammo decreased' },
      { check: 'armor_bonus_applied', description: 'Temporary armor bonus applied' },
      { check: 'combat_log_has_sandcaster_entry', description: 'Combat log shows sandcaster use' }
    ]
  },

  performanceMetrics: {
    maxRoundDuration: 5000, // ms
    maxTotalDuration: 20000, // ms
    maxLatency: 200, // ms
    maxMemory: 220 // MB
  }
};
