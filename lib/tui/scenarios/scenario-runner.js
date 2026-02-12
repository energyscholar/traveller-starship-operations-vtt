/**
 * Interactive Scenario Runner
 * Generic combat loop for interactive battle scenarios.
 *
 * @module lib/tui/scenarios/scenario-runner
 */

const { CombatEngine, RANGE_DMS, roll2d6 } = require('../../engine/combat-engine');
const { STANCES, getEvasionDM, getEWBonus, getActiveWeapons, applyStanceToRound } = require('./stance-system');
const {
  formatScenarioHeader, formatNarrativeBeat, formatDecisionPrompt,
  formatRoundSummary, formatFleetStatus, formatCombatAnalysis, formatStanceBar
} = require('./scenario-formatter');
const { ANSI } = require('../ansi-utils');

// Range band progression (matches RANGE_DMS key order)
const RANGE_BANDS = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'];

// Max range index for weapon range properties
const WEAPON_MAX_RANGE = {
  'adjacent': 0, 'close': 1, 'short': 2, 'medium': 3,
  'long': 4, 'vlong': 5, 'very long': 5, 'distant': 6
};

function rangeIndex(range) {
  const idx = RANGE_BANDS.findIndex(r => r.toLowerCase() === (range || '').toLowerCase());
  return idx >= 0 ? idx : 3; // default Medium
}

function rangeFromIndex(idx) {
  return RANGE_BANDS[Math.max(0, Math.min(RANGE_BANDS.length - 1, idx))];
}

/**
 * Wait for a specific keypress
 */
async function waitForKeypress(session, validKeys) {
  return new Promise((resolve) => {
    if (session.isTTY()) session.setRawMode(true);
    session.resume();
    session.setEncoding('utf8');
    const onData = (key) => {
      if (key === '\u0003') { cleanup(); session.write('\n'); process.exit(); }
      const lower = key.toLowerCase();
      if (validKeys.includes(lower)) { cleanup(); resolve(lower); }
    };
    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) session.setRawMode(false);
      session.pause();
    };
    session.onInput(onData);
  });
}

/**
 * Wait for any key
 */
async function waitForAny(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) session.setRawMode(true);
    session.resume();
    session.setEncoding('utf8');
    const onData = () => { cleanup(); resolve(); };
    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) session.setRawMode(false);
      session.pause();
    };
    session.onInput(onData);
  });
}

/**
 * Check if combat is over
 */
function combatOver(state) {
  if (state.round >= state.maxRounds) return true;
  const activeEnemies = state.enemyFleet.filter(e => !e.destroyed && !e.fled && !e.surrendered && e.hull > 0);
  if (activeEnemies.length === 0) return true;
  const activeFriendlies = state.playerFleet.filter(p => !p.destroyed && p.hull > 0);
  if (activeFriendlies.length === 0) return true;
  return false;
}

/**
 * Resolve one weapon attack
 */
function resolveWeaponAttack(attacker, defender, turret, stance, state) {
  const weaponType = turret.weapons?.[0] || turret.type || 'pulse_laser';
  const { WEAPON_DAMAGE, WEAPON_ATTACK_DMS } = require('../../engine/combat-engine');

  // Attack roll
  const attackRoll = roll2d6();
  const gunnerSkill = turret.gunnerSkill || 0;
  const fc = attacker.fireControl || 0;
  const rIdx = state.rangeIndex;
  const rangeName = rangeFromIndex(rIdx);
  const rangeDM = RANGE_DMS[rangeName] || 0;
  // TODO: Evasive DM is -Thrust. RAW: -Pilot skill per dodge (each costs 1 Thrust)
  const evasionDM = defender.evasive ? -(defender.thrust || 0) : 0;
  const weaponAttackDM = WEAPON_ATTACK_DMS[weaponType] || 0;

  // EW bonuses
  const isPlayer = state.playerFleet.includes(attacker);
  const stanceObj = isPlayer ? (STANCES[state.stance] || STANCES.BALANCED) : STANCES.BALANCED;
  const ew = getEWBonus(attacker, stanceObj);
  const enemyEw = isPlayer ? 0 : (getEWBonus(state.playerFleet[0], STANCES[state.stance] || STANCES.BALANCED).enemyAttackPenalty || 0);

  const totalDM = gunnerSkill + fc + rangeDM + evasionDM + weaponAttackDM + ew.ownAttackBonus + enemyEw;
  const total = attackRoll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  const result = {
    attacker: attacker.name || attacker.id,
    target: defender.name || defender.id,
    weapon: weaponType,
    hit,
    roll: attackRoll.total,
    totalDM,
    total,
    effect,
    damage: 0,
    ionDrain: 0,
    round: state.round
  };

  if (!hit) return result;

  // Damage
  const damageDice = WEAPON_DAMAGE[weaponType] || 2;
  let damageTotal = 0;
  for (let i = 0; i < damageDice; i++) damageTotal += Math.floor(Math.random() * 6) + 1;

  const isIon = weaponType === 'ion' || weaponType === 'ion_barbette';
  const damageMultiple = turret.damageMultiple || (turret.mount === 'barbette' ? 3 : 1);
  const isMissile = weaponType.includes('missile');

  if (isIon) {
    const drain = (damageTotal + effect) * damageMultiple;
    result.ionDrain = drain;
    result.damage = 0;
    // Actually drain power
    defender.power = Math.max(0, (defender.power || 0) - drain);
    result.targetPowerRemaining = defender.power;
    result.targetMaxPower = defender.maxPower || 0;
    // Power plant disable check: power fully drained to zero
    if (defender.power <= 0) {
      defender.systems = defender.systems || {};
      defender.systems.powerPlant = 'disabled';
      defender.powerPlantDisabledRounds = Math.floor(Math.random() * 3) + 1;
    }
  } else {
    const armor = defender.armour || defender.armor || 0;
    const mult = isMissile ? 1 : damageMultiple;
    const finalDamage = Math.max(0, damageTotal + effect - armor) * mult;
    result.damage = finalDamage;
    defender.hull = Math.max(0, defender.hull - finalDamage);
    if (defender.hull <= 0) defender.destroyed = true;
  }

  // Missile consumption
  if (isMissile && attacker.missiles > 0) {
    attacker.missiles--;
  }

  return result;
}

/**
 * Run corsair AI evaluation
 */
function runCorsairAI(state, corsairConfig) {
  if (!corsairConfig) return;
  for (const enemy of state.enemyFleet) {
    if (enemy.destroyed || enemy.fled || enemy.surrendered || enemy.fleeing) continue;
    const hpPct = enemy.hull / enemy.maxHull;

    // Surrender check: hull < 15% and power plant disabled
    if (hpPct < (corsairConfig.surrenderHullPct || 0.15)) {
      if (enemy.systems && enemy.systems.powerPlant === 'disabled') {
        enemy.surrendered = true;
        continue;
      }
    }

    // Flee check: hull < 30%
    if (hpPct < (corsairConfig.fleeHullPct || 0.30)) {
      enemy.fleeing = true;
      continue;
    }

    // Approach logic for fleet scenario
    if (corsairConfig.approachThreshold && !state.corsairsApproaching) {
      // Estimate hit rate at current range
      const rangeDM = RANGE_DMS[rangeFromIndex(state.rangeIndex)] || 0;
      const evasionPenalty = state.playerFleet[0]?.evasive ? -(state.playerFleet[0].thrust || 0) : 0;
      const estimatedDM = (enemy.fireControl || 0) + (enemy.pilotSkill || 0) + rangeDM + evasionPenalty;
      // 2d6+DM >= 8: rough hit rate estimate
      const targetRoll = 8 - estimatedDM;
      const hitRate = Math.max(0, Math.min(1, (36 - Math.max(0, (targetRoll - 2) * (targetRoll - 1) / 2)) / 36));
      if (hitRate < corsairConfig.approachThreshold) {
        state.corsairsApproaching = true;
      }
    }
  }
}

/**
 * Update range based on stance and enemy approach
 */
function updateRange(state, stance) {
  let delta = 0;

  // Player stance direction
  if (stance.rangeDirection === 'close') delta--;
  else if (stance.rangeDirection === 'open') delta++;

  // Corsairs approaching overrides: they close 1 band
  if (state.corsairsApproaching) delta--;

  state.rangeIndex = Math.max(0, Math.min(RANGE_BANDS.length - 1, state.rangeIndex + delta));
}

/**
 * Run one combat round
 */
function runCombatRound(state, weaponFilter = null) {
  const stance = STANCES[state.stance] || STANCES.BALANCED;
  const roundAttacks = [];

  // Apply stance
  applyStanceToRound(state, stance);

  // Build initiative order: 2d6 + tacticsBonus for each side
  const playerInit = roll2d6().total + (state.playerFleet[0]?.captain?.skill_tactics_naval || 0);
  const enemyInit = roll2d6().total + (state.enemyFleet[0]?.captain?.skill_tactics_naval || 0);
  const playerFirst = playerInit >= enemyInit;

  const sides = playerFirst
    ? [{ fleet: state.playerFleet, targets: state.enemyFleet, isPlayer: true },
       { fleet: state.enemyFleet, targets: state.playerFleet, isPlayer: false }]
    : [{ fleet: state.enemyFleet, targets: state.playerFleet, isPlayer: false },
       { fleet: state.playerFleet, targets: state.enemyFleet, isPlayer: true }];

  for (const side of sides) {
    // Skip enemy attacks on surprise round
    if (!side.isPlayer && state.surpriseRound) continue;

    for (const ship of side.fleet) {
      if (ship.destroyed || ship.fled || ship.surrendered || ship.hull <= 0) continue;
      // Skip non-Q-Ship player vessels before reveal (fighters/pinnace hidden)
      if (side.isPlayer && !state.revealed && ship.shipType !== 'Q-Ship') continue;

      // Get weapons based on stance (player) or all (enemy)
      const shipStance = side.isPlayer ? stance : STANCES.AGGRESSIVE;
      const turrets = getActiveWeapons(ship, shipStance);

      // Select target
      const activeTargets = side.targets.filter(t => !t.destroyed && !t.fled && !t.surrendered && t.hull > 0);
      if (activeTargets.length === 0) continue;

      // Focus target or nearest active
      let target;
      if (side.isPlayer && state.focusTarget !== undefined && state.focusTarget >= 0) {
        target = side.targets[state.focusTarget];
        if (!target || target.destroyed || target.fled || target.surrendered || target.hull <= 0) {
          target = activeTargets[0];
        }
      } else if (side.isPlayer && state.focusTarget === -1) {
        // Split fire: round-robin
        target = activeTargets[ship._targetIdx % activeTargets.length || 0];
        ship._targetIdx = ((ship._targetIdx || 0) + 1);
      } else {
        target = activeTargets[0];
      }

      // Fire each turret
      for (const turret of turrets) {
        // Apply weapon filter if provided (for phased surprise rounds)
        if (weaponFilter && !weaponFilter(turret)) continue;

        // Skip weapons out of range
        if (turret.range) {
          const maxRange = WEAPON_MAX_RANGE[turret.range.toLowerCase()] ?? 6;
          if (state.rangeIndex > maxRange) continue;
        }
        // Skip missiles if out
        const weaponType = turret.weapons?.[0] || turret.type;
        if (weaponType?.includes('missile') && (ship.missiles || 0) <= 0) continue;

        const result = resolveWeaponAttack(ship, target, turret, shipStance, state);
        roundAttacks.push(result);
      }
    }
  }

  // Only clear surprise after unfiltered round (normal) or explicitly
  if (!weaponFilter) {
    state.surpriseRound = false;
  }

  // Update range
  updateRange(state, stance);

  // Corsair AI
  runCorsairAI(state, state.corsairAI);

  // Handle fleeing ships — remove from combat next round
  for (const enemy of state.enemyFleet) {
    if (enemy.fleeing && !enemy.fled && !enemy.fleeHandled) {
      // Will be handled by decision point or auto-flee
    }
  }

  return roundAttacks;
}

// Surrender negotiation offers
const SURRENDER_OFFERS = [
  { key: '1', label: 'Walk away (lifeboats)',
    target: 6, action: 'walk_away',
    description: 'They leave in lifeboats, you take the ship. Best deal for them.',
    success: [
      '"...Long pause. \'Fine. We\'re launching lifeboats. Don\'t shoot.\'"',
      '"The corsair captain\'s voice cracks: \'Deal. Just let us go.\'"'
    ],
    failure: [
      '"\'Walk away to WHAT? We\'ll take our chances.\'"',
      '"Derisive laughter over the comm. They\'re not buying it."'
    ]
  },
  { key: '2', label: 'Marooned on a rock',
    target: 7, action: 'marooned',
    description: 'Confiscate ship, dump crew on nearest world with air.',
    success: [
      '"\'Marooned beats dead. Powering down weapons.\'"',
      '"Grudging silence, then: \'Where?\' \'Anywhere with air,\' James replies."'
    ],
    failure: [
      '"\'Rot on a rock? I\'d rather go down fighting.\'"',
      '"\'Maroon THIS.\' The corsair\'s turrets swivel toward you."'
    ]
  },
  { key: '3', label: 'Imperial justice (trial)',
    target: 10, action: 'imperial_justice',
    description: 'Hand them to authorities. Pirates know this means prison or worse.',
    success: [
      '"A long silence. \'...We want lawyers. GOOD lawyers.\' They power down."',
      '"The captain\'s voice is flat: \'Imperial courts. Fine. Just stop shooting.\'"'
    ],
    failure: [
      '"\'Imperial justice? That\'s a death sentence and you know it. Come and TAKE us.\'"',
      '"\'I\'ll see you in HELL before I see an Imperial courtroom.\'"'
    ]
  },
  { key: '4', label: 'Surrender or DIE',
    target: 8, action: 'or_die',
    description: 'Pure intimidation. No terms, just threat.',
    success: [
      '"The threat hangs in the void. \'...Powering down. Don\'t shoot.\'"',
      '"\'Alright. ALRIGHT. Weapons cold. Just... stop.\'"'
    ],
    failure: [
      '"\'Then we die FIGHTING.\' Weapons hot."',
      '"The only answer is a missile lock."'
    ]
  }
];

function getSurrenderDMs(state, target) {
  let dm = 0;
  const reasons = [];
  // Power plant disabled
  if (target.systems?.powerPlant === 'disabled') {
    dm += 2; reasons.push('power plant offline +2');
  }
  // Hull damage
  const hpPct = target.hull / target.maxHull;
  if (hpPct < 0.30) {
    dm += 2; reasons.push('hull critical +2');
  } else if (hpPct < 0.50) {
    dm += 1; reasons.push('hull damaged +1');
  }
  // Outnumbered
  const activePlayer = state.playerFleet.filter(s => !s.destroyed && s.hull > 0).length;
  const activeEnemy = state.enemyFleet.filter(s => !s.destroyed && !s.fled && !s.surrendered && s.hull > 0).length;
  if (activeEnemy > 0) {
    const ratio = activePlayer / activeEnemy;
    if (ratio >= 3) {
      dm += 2; reasons.push('outnumbered 3:1 +2');
    } else if (ratio >= 2) {
      dm += 1; reasons.push('outnumbered 2:1 +1');
    }
  }
  // Surprise
  if (state.surpriseRound || state.round === state.revealRound) {
    dm += 1; reasons.push('shock +1');
  }
  // James's Leadership
  dm += 1; reasons.push('Captain Delleron +1');
  return { dm, reasons };
}

async function resolveSurrenderNegotiation(session, state, targetShip) {
  // Show offer menu
  session.write(`\n${ANSI.BRIGHT_CYAN}${ANSI.BOLD}  SURRENDER TERMS — What do you offer ${targetShip.name}?${ANSI.RESET}\n\n`);
  for (const offer of SURRENDER_OFFERS) {
    session.write(`  ${ANSI.BOLD}[${offer.key}]${ANSI.RESET} ${offer.label}\n`);
    session.write(`      ${ANSI.DIM}${offer.description}${ANSI.RESET}\n`);
  }
  session.write(`  ${ANSI.BOLD}[x]${ANSI.RESET} ${ANSI.DIM}Cancel — keep fighting${ANSI.RESET}\n`);
  session.write(`\n${ANSI.DIM}  Choose offer...${ANSI.RESET}`);

  const validKeys = [...SURRENDER_OFFERS.map(o => o.key), 'x'];
  const key = await waitForKeypress(session, validKeys);
  if (key === 'x') return false;

  const offer = SURRENDER_OFFERS.find(o => o.key === key);
  const { dm, reasons } = getSurrenderDMs(state, targetShip);
  const roll = roll2d6();
  const total = roll.total + dm;
  const success = total >= offer.target;

  // Pick random narrative
  const lines = success ? offer.success : offer.failure;
  const narrative = lines[Math.floor(Math.random() * lines.length)];

  // Display roll result
  session.write(`\n\n  ${ANSI.BOLD}Roll: ${roll.total}${ANSI.RESET} (${roll.dice[0]}+${roll.dice[1]}) + ${dm} DMs = ${ANSI.BOLD}${total}${ANSI.RESET} vs target ${offer.target}\n`);
  session.write(`  ${ANSI.DIM}DMs: ${reasons.join(', ')}${ANSI.RESET}\n\n`);

  if (success) {
    session.write(`  ${ANSI.BRIGHT_GREEN}${ANSI.BOLD}SURRENDER ACCEPTED${ANSI.RESET}\n`);
    session.write(`  ${narrative}\n`);
    targetShip.surrendered = true;
    targetShip.surrenderTerms = offer.action;
  } else {
    session.write(`  ${ANSI.BRIGHT_RED}${ANSI.BOLD}SURRENDER REFUSED${ANSI.RESET}\n`);
    session.write(`  ${narrative}\n`);
  }

  session.write(`\n${ANSI.DIM}  Press any key...${ANSI.RESET}`);
  await waitForAny(session);
  return success;
}

/**
 * Run an interactive scenario
 * @param {Object} session - TUI session for I/O
 * @param {Object} config - Scenario configuration
 */
async function runInteractiveScenario(session, config) {
  const state = {
    round: 0,
    rangeIndex: rangeIndex(config.startRange),
    stance: config.startStance || 'BALANCED',
    playerFleet: config.playerFleet.map(s => ({ ...s, systems: s.systems || {} })),
    enemyFleet: config.enemyFleet.map(s => ({ ...s, systems: s.systems || {} })),
    maxRounds: config.maxRounds || 12,
    log: [],
    fullLog: [],
    revealed: false,
    corsairAI: config.corsairAI || null,
    triggeredDecisions: new Set(),
    triggeredNarratives: new Set()
  };

  session.write(`${ANSI.CLEAR}${ANSI.HOME}`);

  // Show intro blurb if provided
  if (config.introText) {
    session.write(formatScenarioHeader(config.title, 0, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
    session.write(formatNarrativeBeat(config.introText) + '\n');
    session.write(`\n${ANSI.DIM}  Press any key to begin...${ANSI.RESET}`);
    await waitForAny(session);
    session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
  }

  while (!combatOver(state)) {
    state.round++;

    // 1. Narrative phases
    for (const phase of (config.narrativePhases || [])) {
      if (state.triggeredNarratives.has(phase.id)) continue;
      let shouldTrigger = false;
      try { shouldTrigger = phase.trigger(state); } catch(e) { /* skip */ }
      if (shouldTrigger) {
        state.triggeredNarratives.add(phase.id);
        const text = typeof phase.text === 'function' ? phase.text(state) : phase.text;
        session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
        session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
        session.write(formatNarrativeBeat(text) + '\n');
        session.write(`\n${ANSI.DIM}  Press any key...${ANSI.RESET}`);
        await waitForAny(session);
      }
    }

    // Handle stalled state (Q-ship: auto-reveal next round after stall)
    if (state.stalled && !state.revealed) {
      state.revealed = true;
      state.revealRound = state.round;
      state.surpriseRound = true;
      state.stance = 'AGGRESSIVE';
      state.stalled = false;
    }

    // 2. Decision points
    for (const dp of (config.decisionPoints || [])) {
      if (dp.once && state.triggeredDecisions.has(dp.id)) continue;
      let shouldTrigger = false;
      try { shouldTrigger = dp.trigger(state); } catch(e) { /* skip */ }
      if (shouldTrigger) {
        state.triggeredDecisions.add(dp.id);
        const promptText = typeof dp.prompt === 'function' ? dp.prompt(state) : dp.prompt;
        session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
        session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
        session.write(formatFleetStatus(state.playerFleet, state.enemyFleet) + '\n');
        session.write(formatDecisionPrompt(promptText, dp.options) + '\n');

        const validKeys = dp.options.map(o => o.key.toLowerCase());
        const key = await waitForKeypress(session, validKeys);
        const chosen = dp.options.find(o => o.key.toLowerCase() === key);

        if (chosen && config.actionHandlers && config.actionHandlers[chosen.action]) {
          await config.actionHandlers[chosen.action](state, session);
        }

        // Check if combat ended by decision (e.g. intimidation → surrender)
        if (combatOver(state)) break;
      }
    }

    if (combatOver(state)) break;

    // 3. Run combat round
    let roundAttacks = [];

    if (state.surpriseRound && config.surpriseSequence) {
      // Phased surprise round — fire weapons in sequence with pauses
      for (const phase of config.surpriseSequence) {
        // Show phase narrative
        if (phase.narrative) {
          session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
          session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
          session.write(formatNarrativeBeat(phase.narrative) + '\n');
          session.write(`\n${ANSI.DIM}  Press any key...${ANSI.RESET}`);
          await waitForAny(session);
        }

        // Fire this phase's weapons
        const phaseAttacks = runCombatRound(state, phase.weaponFilter);
        roundAttacks.push(...phaseAttacks);

        // Display phase results
        session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
        session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
        session.write(formatFleetStatus(state.playerFleet, state.enemyFleet) + '\n\n');
        session.write(formatRoundSummary({ attacks: phaseAttacks, round: state.round }) + '\n');

        // Check phase result
        if (phase.checkAfter) {
          const shouldPause = phase.checkAfter(state);
          if (shouldPause) {
            // Run decision points that may have been triggered (ion_disable)
            for (const dp of (config.decisionPoints || [])) {
              if (dp.once && state.triggeredDecisions.has(dp.id)) continue;
              let shouldTrigger = false;
              try { shouldTrigger = dp.trigger(state); } catch(e) { /* skip */ }
              if (shouldTrigger) {
                state.triggeredDecisions.add(dp.id);
                const promptText = typeof dp.prompt === 'function' ? dp.prompt(state) : dp.prompt;
                session.write('\n');
                session.write(formatDecisionPrompt(promptText, dp.options) + '\n');
                const validKeys = dp.options.map(o => o.key.toLowerCase());
                const key = await waitForKeypress(session, validKeys);
                const chosen = dp.options.find(o => o.key.toLowerCase() === key);
                if (chosen && config.actionHandlers?.[chosen.action]) {
                  await config.actionHandlers[chosen.action](state, session);
                }
                if (combatOver(state)) break;
              }
            }
            // If combat ended (surrender), skip remaining phases
            if (combatOver(state)) break;
          }
        }

        // If combat ended (destruction), skip remaining phases
        if (combatOver(state)) break;
      }

      // Clear surprise flag after all phases complete
      state.surpriseRound = false;

    } else {
      // Normal round — all weapons fire at once
      roundAttacks = runCombatRound(state);
    }

    state.log = roundAttacks;
    state.fullLog.push(...roundAttacks);

    // Detect ion disable for decision point (normal rounds)
    for (const enemy of state.enemyFleet) {
      if (enemy.systems?.powerPlant === 'disabled' && !enemy.destroyed && !enemy.fled && !enemy.surrendered && !state.ionDisableHandled) {
        state.ionDisabledTarget = true;
      }
    }

    if (!(config.surpriseSequence && state.round === state.revealRound)) {
      // 4. Render round results (non-surprise rounds)
      session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
      session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), state.stance) + '\n');
      session.write(formatStanceBar(state.stance) + '\n\n');
      session.write(formatFleetStatus(state.playerFleet, state.enemyFleet) + '\n\n');
      session.write(formatRoundSummary({ attacks: roundAttacks, round: state.round }) + '\n');
    }
    session.write(`\n${ANSI.DIM}  Press any key for next round...${ANSI.RESET}`);
    await waitForAny(session);
  }

  // Post-battle analysis
  session.write(`${ANSI.CLEAR}${ANSI.HOME}`);
  session.write(formatScenarioHeader(config.title, state.round, rangeFromIndex(state.rangeIndex), 'COMPLETE') + '\n');
  session.write(formatFleetStatus(state.playerFleet, state.enemyFleet) + '\n');
  session.write(formatCombatAnalysis(state.fullLog) + '\n');

  // Victory check
  const activeEnemies = state.enemyFleet.filter(e => !e.destroyed && !e.fled && !e.surrendered && e.hull > 0);
  const activeFriendlies = state.playerFleet.filter(p => !p.destroyed && p.hull > 0);
  if (activeEnemies.length === 0 && activeFriendlies.length > 0) {
    session.write(`\n${ANSI.BRIGHT_GREEN}${ANSI.BOLD}  ★ VICTORY ★${ANSI.RESET}\n`);
  } else if (activeFriendlies.length === 0) {
    session.write(`\n${ANSI.BRIGHT_RED}${ANSI.BOLD}  DEFEAT${ANSI.RESET}\n`);
  } else {
    session.write(`\n${ANSI.YELLOW}  Battle inconclusive (max rounds reached)${ANSI.RESET}\n`);
  }

  if (config.onComplete) config.onComplete(state.fullLog);

  session.write(`\n${ANSI.DIM}  Press any key to return...${ANSI.RESET}`);
  await waitForAny(session);
}

module.exports = { runInteractiveScenario, resolveSurrenderNegotiation };
