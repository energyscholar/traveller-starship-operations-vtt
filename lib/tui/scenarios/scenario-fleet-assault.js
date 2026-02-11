/**
 * Scenario 2: Fleet Assault (8v3 Interactive)
 *
 * Astral Dawn + 6 fighters + pinnace vs 3 pirate corsairs.
 * Distant range standoff → corsair approach → close combat.
 *
 * @module lib/tui/scenarios/scenario-fleet-assault
 */

const { roll2d6 } = require('../../engine/combat-engine');
const {
  createAstralDawn, createTlatlFighter, createArmedPinnace, createPirateCorsair
} = require('../../../tests/e2e/helpers/combat-demo-ships');

const FLEET_ASSAULT_CONFIG = {
  title: 'Fleet Assault',
  playerFleet: [
    createAstralDawn(),
    createTlatlFighter(1), createTlatlFighter(2), createTlatlFighter(3),
    createTlatlFighter(4), createTlatlFighter(5), createTlatlFighter(6),
    createArmedPinnace()
  ],
  enemyFleet: [
    createPirateCorsair(1),  // Black Widow
    createPirateCorsair(2),  // Black Fang
    createPirateCorsair(3)   // Black Serpent
  ],
  startRange: 'Distant',
  startStance: 'DEFENSIVE',
  maxRounds: 15,

  narrativePhases: [
    {
      id: 'standoff',
      trigger: (s) => s.round === 1,
      text: [
        'Three corsair signatures at Distant range, holding station near the pirate base.',
        'Von Sydo: "Positive ID — Black Widow, Black Fang, Black Serpent. All armed."',
        'Marina: "Particle barbette and missile racks standing by."',
        'James: "All fighters deployed. Defensive posture. Make them come to us."'
      ].join('\n')
    },
    {
      id: 'approach',
      trigger: (s) => s.corsairsApproaching,
      text: [
        'Von Sydo: "They\'re burning hard toward us. They can\'t take the missile fire."',
        'James: "Good. Let them come into our kill zone."'
      ].join('\n')
    },
    {
      id: 'close_combat',
      trigger: (s) => s.rangeIndex <= 3, // Medium or closer
      text: 'The corsairs finally close to weapons range. Full engagement.'
    },
    {
      id: 'first_kill',
      trigger: (s) => s.enemyFleet.some(e => e.destroyed),
      text: (s) => {
        const dead = s.enemyFleet.find(e => e.destroyed);
        return `${dead.name} breaks apart! Debris cloud expanding.`;
      }
    }
  ],

  decisionPoints: [
    // Opening stance
    {
      id: 'opening_stance',
      trigger: (s) => s.round === 1,
      once: true,
      prompt: 'Fleet at Distant range. Opening stance?',
      options: [
        { key: 'd', label: 'DEFENSIVE (Recommended)', action: 'stance_defensive',
          description: 'Max evasion + ECM. Nearly untouchable at this range. All weapons fire.' },
        { key: 's', label: 'STANDOFF', action: 'stance_standoff',
          description: 'Open range further, missiles + barbettes only' },
        { key: 'b', label: 'BALANCED', action: 'stance_balanced',
          description: 'Moderate evasion, all weapons, hold range' }
      ]
    },
    // Fighter target (when corsairs approach)
    {
      id: 'fighter_target',
      trigger: (s) => s.corsairsApproaching && !s.fighterTargetChosen,
      once: true,
      prompt: 'Corsairs closing! Fighter alpha strike target?',
      options: [
        { key: '1', label: 'Black Widow (lead)', action: 'target_widow',
          description: 'Eliminate biggest threat first' },
        { key: '2', label: 'Black Fang', action: 'target_fang',
          description: 'Second corsair' },
        { key: '3', label: 'Black Serpent', action: 'target_serpent',
          description: 'Third corsair' },
        { key: '4', label: 'Split fire', action: 'target_split',
          description: 'Spread damage across all three' }
      ]
    },
    // Per-round stance
    {
      id: 'combat_stance',
      trigger: (s) => s.round > 1,
      once: false,
      prompt: 'Tactical stance?',
      options: [
        { key: 'a', label: 'AGGRESSIVE', action: 'stance_aggressive', description: 'Close and destroy' },
        { key: 'b', label: 'BALANCED', action: 'stance_balanced', description: 'All weapons, moderate evasion' },
        { key: 'd', label: 'DEFENSIVE', action: 'stance_defensive', description: 'Max evasion + ECM, all weapons' },
        { key: 's', label: 'STANDOFF', action: 'stance_standoff', description: 'Open range, missiles + barbettes' }
      ]
    },
    // Corsair flee
    {
      id: 'corsair_flees',
      trigger: (s) => s.enemyFleet.some(e => e.fleeing && !e.fleeHandled),
      once: false,
      prompt: (s) => `${s.enemyFleet.find(e => e.fleeing && !e.fleeHandled).name} breaking off!`,
      options: [
        { key: '1', label: 'Fighters pursue', action: 'pursue_fleeing',
          description: 'Detach fighters to intercept' },
        { key: '2', label: 'Let them go', action: 'let_go_fleeing',
          description: 'Focus on remaining enemies' },
        { key: '3', label: 'Demand surrender', action: 'demand_surrender',
          description: 'Hail: surrender or be destroyed' }
      ]
    }
  ],

  actionHandlers: {
    stance_aggressive: (state) => { state.stance = 'AGGRESSIVE'; },
    stance_balanced: (state) => { state.stance = 'BALANCED'; },
    stance_defensive: (state) => { state.stance = 'DEFENSIVE'; },
    stance_standoff: (state) => { state.stance = 'STANDOFF'; },
    target_widow: (state) => { state.focusTarget = 0; state.fighterTargetChosen = true; state.fighterMode = 'alpha'; },
    target_fang: (state) => { state.focusTarget = 1; state.fighterTargetChosen = true; state.fighterMode = 'alpha'; },
    target_serpent: (state) => { state.focusTarget = 2; state.fighterTargetChosen = true; state.fighterMode = 'alpha'; },
    target_split: (state) => { state.focusTarget = -1; state.fighterTargetChosen = true; state.fighterMode = 'alpha'; },
    pursue_fleeing: (state) => {
      const fleeing = state.enemyFleet.find(e => e.fleeing && !e.fleeHandled);
      if (fleeing) { fleeing.fleeHandled = true; state.fightersPursuing = fleeing.name; }
    },
    let_go_fleeing: (state) => {
      const fleeing = state.enemyFleet.find(e => e.fleeing && !e.fleeHandled);
      if (fleeing) { fleeing.fled = true; fleeing.fleeHandled = true; }
    },
    demand_surrender: (state) => {
      const fleeing = state.enemyFleet.find(e => e.fleeing && !e.fleeHandled);
      if (fleeing) {
        const roll = roll2d6();
        fleeing.fleeHandled = true;
        if (roll.total >= 9 || fleeing.hull < fleeing.maxHull * 0.2) {
          fleeing.surrendered = true;
        }
      }
    }
  },

  corsairAI: {
    approachThreshold: 0.15,
    fleeHullPct: 0.30,
    surrenderHullPct: 0.15
  }
};

module.exports = { FLEET_ASSAULT_CONFIG };
