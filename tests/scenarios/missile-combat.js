// Missile Combat Scenario - Long Range Engagement
// Purpose: Test missile mechanics, ammo tracking, point defense
// Duration: ~4-5 rounds
// Outcome: Tests missile launch, tracking, and interception

module.exports = {
  name: 'Missile Combat (Long Range)',
  description: 'Long-range missile engagement with point defense',
  duration: '4-5 rounds',
  difficulty: 'medium',

  setup: {
    player1: {
      ship: 'scout', // Has missiles
      range: 'Long'
    },
    player2: {
      ship: 'free_trader',
      range: 'Long'
    }
  },

  expectedActions: [
    // Round 1: Launch missiles
    {
      round: 1,
      actions: [
        { player: 'player1', type: 'launchMissile', count: 2 },
        { player: 'player2', type: 'launchMissile', count: 2 },
        { player: 'player1', type: 'endTurn' },
        { player: 'player2', type: 'endTurn' }
      ]
    },
    // Round 2: Point defense
    {
      round: 2,
      actions: [
        { player: 'player1', type: 'pointDefense' },
        { player: 'player2', type: 'pointDefense' },
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
      description: 'Player 1 selects Long range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Long'
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      wait: { selector: '[data-test-id="launch-missile-button"]' }
    },
    {
      description: 'Player 1 selects missiles',
      selector: '[data-test-id="weapon-select"]',
      action: 'select',
      value: '2' // Missiles
    },
    {
      description: 'Player 1 launches missiles',
      selector: '[data-test-id="launch-missile-button"]',
      action: 'click',
      wait: { timeout: 1000 }
    },
    {
      description: 'Check missiles remaining',
      selector: '[data-test-id="missiles-remaining"]',
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
      feedback: 'Selecting Scout with missile capability...',
      delay: 1000
    },
    {
      description: 'Player 1 selects Long range',
      selector: '[data-test-id="range-select"]',
      action: 'select',
      value: 'Long',
      feedback: 'Setting long-range engagement distance...',
      delay: 1000
    },
    {
      description: 'Player 1 clicks Ready',
      selector: '[data-test-id="ready-button"]',
      action: 'click',
      feedback: 'Battle commencing at long range...',
      wait: { selector: '[data-test-id="launch-missile-button"]' },
      delay: 1500
    },
    {
      description: 'Player 1 selects missiles',
      selector: '[data-test-id="weapon-select"]',
      action: 'select',
      value: '2',
      feedback: 'Arming missile launcher...',
      delay: 1000
    },
    {
      description: 'Player 1 launches missiles',
      selector: '[data-test-id="launch-missile-button"]',
      action: 'click',
      feedback: 'Launching missiles at enemy ship!',
      highlight: '[data-test-id="missiles-remaining"]',
      wait: { timeout: 2000 },
      delay: 1500
    },
    {
      description: 'Check missiles remaining',
      selector: '[data-test-id="missiles-remaining"]',
      action: 'getText',
      feedback: 'Checking ammunition status...',
      delay: 800
    },
    {
      description: 'Player 1 ends turn',
      selector: '[data-test-id="end-turn-button"]',
      action: 'click',
      feedback: 'Missiles in flight - ending turn...',
      wait: { timeout: 1500 },
      delay: 1000
    }
  ],

  validation: {
    preconditions: [
      { check: 'server_running', description: 'Server must be running' },
      { check: 'test_api_enabled', description: 'Test API enabled' },
      { check: 'scout_has_missiles', description: 'Scout ship must have missiles' }
    ],
    postconditions: [
      { check: 'missiles_launched', description: 'At least one missile launched' },
      { check: 'ammo_decreased', description: 'Missile ammo count decreased' },
      { check: 'missiles_in_flight', description: 'Active missiles tracked' },
      { check: 'combat_log_has_missile_entries', description: 'Combat log shows missile launches' }
    ]
  },

  performanceMetrics: {
    maxRoundDuration: 6000, // ms (longer due to missile mechanics)
    maxTotalDuration: 30000, // ms
    maxLatency: 200, // ms
    maxMemory: 250 // MB
  }
};
