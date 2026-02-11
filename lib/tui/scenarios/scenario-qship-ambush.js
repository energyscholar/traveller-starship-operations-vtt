/**
 * Scenario 1: Q-Ship Ambush (1v1 Interactive)
 *
 * Astral Dawn (disguised Q-ship) vs Black Widow (pirate corsair).
 * Player chooses when and how to spring the trap.
 *
 * @module lib/tui/scenarios/scenario-qship-ambush
 */

const { roll2d6 } = require('../../engine/combat-engine');
const { createAstralDawn, createPirateCorsair } = require('../../../tests/e2e/helpers/combat-demo-ships');

const QSHIP_AMBUSH_CONFIG = {
  title: 'Q-Ship Ambush',
  playerFleet: [createAstralDawn()],
  enemyFleet: [createPirateCorsair(1)],
  startRange: 'Short',
  startStance: 'AMBUSH',
  maxRounds: 10,

  narrativePhases: [
    {
      id: 'approach',
      trigger: (s) => s.round === 1,
      text: [
        'The corsair Black Widow slides alongside, electromagnetic grapples warming up.',
        '"Merchant vessel, heave to and prepare for cargo inspection."',
        'Captain Delleron\'s eyes flick to the concealed weapons panel.',
        'The crew knows the drill. They\'ve practiced this a hundred times.'
      ].join('\n')
    },
    {
      id: 'reveal',
      trigger: (s) => s.revealed && s.round === s.revealRound,
      text: [
        '╔══════════════════════════════════════════════════════════════╗',
        '║  CONCEALED TURRET BAYS SLAM OPEN.                          ║',
        '║  Six fighters EJECT from launch tubes.                      ║',
        '║  Ion barbette charges with a rising whine.                  ║',
        '║  Particle beam swivels to track.                            ║',
        '║  "ALL HANDS — WEAPONS FREE."                                ║',
        '╚══════════════════════════════════════════════════════════════╝'
      ].join('\n')
    },
    {
      id: 'reeling',
      trigger: (s) => s.revealed && s.round === s.revealRound + 1,
      text: 'The Black Widow reels from the opening salvo. Her captain screams orders...'
    },
    {
      id: 'disabled',
      trigger: (s) => {
        const enemy = s.enemyFleet[0];
        return enemy && enemy.systems && enemy.systems.powerPlant === 'disabled';
      },
      text: 'The ion beam strikes true — Black Widow\'s power plant flickers and DIES. She goes dark.'
    }
  ],

  decisionPoints: [
    // Opening decision
    {
      id: 'spring_trap',
      trigger: (s) => s.round === 1 && !s.revealed,
      once: true,
      prompt: 'Corsair demands you heave to. Orders, Captain?',
      options: [
        { key: '1', label: 'SPRING THE TRAP — Ion first', action: 'reveal_ion',
          description: 'Ion barbette targets power plant, then all weapons. Best opening.' },
        { key: '2', label: 'SPRING THE TRAP — Alpha strike', action: 'reveal_alpha',
          description: 'Everything fires at once. Maximum damage.' },
        { key: '3', label: 'Demand THEY surrender', action: 'intimidate',
          description: 'Intimidation check before firing. Risky — gives them a moment.' },
        { key: '4', label: 'Comply (stall for closer)', action: 'stall',
          description: 'Delay 1 round, corsair closes to Adjacent. More devastating but take a hit.' }
      ]
    },
    // Per-round stance (after reveal)
    {
      id: 'combat_stance',
      trigger: (s) => s.revealed && s.round > s.revealRound,
      once: false,
      prompt: 'Tactical stance, Captain?',
      options: [
        { key: 'a', label: 'AGGRESSIVE', action: 'stance_aggressive', description: 'Close and finish them' },
        { key: 'b', label: 'BALANCED', action: 'stance_balanced', description: 'All weapons, moderate evasion' },
        { key: 'd', label: 'DEFENSIVE', action: 'stance_defensive', description: 'Max evasion + ECM, all weapons fire' },
        { key: 's', label: 'STANDOFF', action: 'stance_standoff', description: 'Open range, missiles + barbettes' }
      ]
    },
    // Flee decision
    {
      id: 'corsair_flees',
      trigger: (s) => s.enemyFleet[0] && s.enemyFleet[0].fleeing,
      once: true,
      prompt: 'Black Widow breaking off!',
      options: [
        { key: '1', label: 'Fighters pursue!', action: 'pursue',
          description: 'Send fighters to intercept' },
        { key: '2', label: 'Let them go', action: 'let_go',
          description: 'Battle won, save ammunition' },
        { key: '3', label: 'One more ion volley', action: 'parting_shot',
          description: 'Try to disable before they jump' }
      ]
    }
  ],

  actionHandlers: {
    reveal_ion: (state) => {
      state.revealed = true;
      state.revealRound = state.round;
      state.surpriseRound = true;
      state.stance = 'AGGRESSIVE';
      state.ionFirst = true;
    },
    reveal_alpha: (state) => {
      state.revealed = true;
      state.revealRound = state.round;
      state.surpriseRound = true;
      state.stance = 'AGGRESSIVE';
      state.ionFirst = false;
    },
    intimidate: (state) => {
      const roll = roll2d6().total + 3; // James's Leadership/Tactics
      state.intimidationRoll = roll;
      if (roll >= 10) {
        state.enemyFleet[0].surrendered = true;
      } else {
        state.revealed = true;
        state.revealRound = state.round;
        state.stance = 'AGGRESSIVE';
        state.enemyFreeAttack = true;
      }
    },
    stall: (state) => {
      state.rangeIndex = 0; // Adjacent
      state.enemyFreeAttack = true;
      state.stalled = true;
    },
    stance_aggressive: (state) => { state.stance = 'AGGRESSIVE'; },
    stance_balanced: (state) => { state.stance = 'BALANCED'; },
    stance_defensive: (state) => { state.stance = 'DEFENSIVE'; },
    stance_standoff: (state) => { state.stance = 'STANDOFF'; },
    pursue: (state) => { state.fightersPursuing = true; },
    let_go: (state) => { state.enemyFleet[0].fled = true; },
    parting_shot: (state) => { state.partingIonShot = true; }
  },

  corsairAI: {
    fleeHullPct: 0.30,
    surrenderHullPct: 0.15
  }
};

module.exports = { QSHIP_AMBUSH_CONFIG };
