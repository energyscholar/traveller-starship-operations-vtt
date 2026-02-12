/**
 * Scenario 1: Q-Ship Ambush (1v1 Interactive)
 *
 * Astral Dawn (disguised Q-ship) vs Black Widow (pirate corsair).
 * Player chooses when and how to spring the trap.
 *
 * @module lib/tui/scenarios/scenario-qship-ambush
 */

const { roll2d6 } = require('../../engine/combat-engine');
const { resolveSurrenderNegotiation } = require('./scenario-runner');
const { createAstralDawn, createPirateCorsair, createTlatlFighter, createArmedPinnace } = require('../../../tests/e2e/helpers/combat-demo-ships');

const QSHIP_AMBUSH_CONFIG = {
  title: 'Q-Ship Ambush',
  playerFleet: [
    createAstralDawn(),
    createTlatlFighter(1), createTlatlFighter(2), createTlatlFighter(3),
    createTlatlFighter(4), createTlatlFighter(5), createTlatlFighter(6),
    createArmedPinnace()
  ],
  enemyFleet: [createPirateCorsair(1)],
  startRange: 'Short',
  startStance: 'AMBUSH',
  maxRounds: 10,

  introText: [
    'The Astral Dawn cruises the Forine trade lane disguised as a fat merchant.',
    'Intel says Black Widow hunts this corridor. The crew is ready.',
    '',
    'FAST PLAY: Crew roles (Gunner, Sensors, Engineer, Pilot) are automated.',
    'You make command decisions. Manual role control is a planned feature.'
  ].join('\n'),

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
        '║  Armed launch deploys to port.                              ║',
        '║  Particle barbette fires — BLINDING FLASH.                  ║',
        '║  Ion cannon discharges into her engineering section.         ║',
        '║  Fighters ripple-fire six missiles.                         ║',
        '║  Every turret opens up.                                     ║',
        '║                                                              ║',
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
        { key: '1', label: 'SPRING THE TRAP!', action: 'reveal_ambush',
          description: 'Pop turrets, launch fighters, ALL weapons fire. Maximum violence.' },
        { key: '2', label: 'Demand THEY surrender', action: 'intimidate',
          description: 'Intimidation check before firing. Risky — gives them a moment.' },
        { key: '3', label: 'Comply (stall for closer)', action: 'stall',
          description: 'Delay 1 round, corsair closes to Adjacent. Take a hit but even more devastating.' }
      ]
    },
    // Ion disable decision
    {
      id: 'ion_disable',
      trigger: (s) => s.ionDisabledTarget && !s.ionDisableHandled,
      once: true,
      prompt: 'Ion cannon strikes true — her power plant DIES. She\'s drifting dark. Orders?',
      options: [
        { key: '1', label: 'DEMAND SURRENDER', action: 'negotiate_surrender_disabled',
          description: 'Open negotiations — outcome depends on your offer.' },
        { key: '2', label: 'FINISH HER', action: 'finish_disabled',
          description: 'All weapons, point blank. No quarter.' }
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
    reveal_ambush: (state) => {
      state.revealed = true;
      state.revealRound = state.round;
      state.surpriseRound = true;
      state.stance = 'AGGRESSIVE';
    },
    intimidate: async (state, session) => {
      const target = state.enemyFleet[0];
      const accepted = await resolveSurrenderNegotiation(session, state, target);
      if (!accepted) {
        // Failed negotiation — corsair gets a free shot, THEN you reveal
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
    parting_shot: (state) => { state.partingIonShot = true; },
    negotiate_surrender_disabled: async (state, session) => {
      const target = state.enemyFleet[0];
      await resolveSurrenderNegotiation(session, state, target);
      state.ionDisableHandled = true;
    },
    finish_disabled: (state) => {
      state.ionDisableHandled = true;
    }
  },

  surpriseSequence: [
    {
      id: 'ion_strike',
      weaponFilter: (turret) => turret.id === 'ion',
      narrative: [
        'Marina\'s hand moves to the ion cannon firing stud.',
        'A crackling blue discharge lances into Black Widow\'s engineering section.',
        'The bridge lights flicker from the power draw.'
      ].join('\n'),
      checkAfter: (state) => {
        const enemy = state.enemyFleet[0];
        if (enemy && enemy.systems?.powerPlant === 'disabled' && !enemy.destroyed) {
          state.ionDisabledTarget = true;
          return true;   // pause for decision
        }
        if (enemy && enemy.destroyed) {
          return true;    // ion alone destroyed her (unlikely but possible)
        }
        return false;     // continue to next phase
      }
    },
    {
      id: 'full_volley',
      weaponFilter: (turret) => turret.id !== 'ion',
      narrative: 'The rest of the fleet opens fire. Particle beam, lasers, missiles — everything.',
      checkAfter: null
    }
  ],

  corsairAI: {
    fleeHullPct: 0.30,
    surrenderHullPct: 0.15
  }
};

module.exports = { QSHIP_AMBUSH_CONFIG };
