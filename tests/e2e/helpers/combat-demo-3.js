#!/usr/bin/env node
/**
 * Combat Demo 3: Q-Ship Fleet vs Destroyer Escort
 * Fleet combat with 8 player ships vs 1 heavy warship
 * Run: node tests/e2e/helpers/combat-demo-3.js
 *
 * Scenario: Astral Dawn reveals hidden weapons and launches fighters.
 * Player Fleet:
 *   - ISS Astral Dawn (600t Q-Ship) - command ship, ion barbette
 *   - 6 x Tlatl Missile Fighters (10t each) - alpha strike
 *   - 1 x Armed Fast Pinnace (40t) - escort/pursuit
 * Enemy:
 *   - INS Vigilant (1000t Destroyer Escort) - 400 HP, Armor 8, 10 turrets
 *
 * Tactical Challenge: Destroyer outguns Q-Ship. Requires coordinated
 * fighter alpha strike + ion suppression to defeat.
 */

const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');
const {
  narratePhaseChange,
  narrateAttack
} = require('./combat-display');
const { showFleetSummary } = require('./battle-summary');
const narrative = require('./combat-narrative');

// ANSI codes
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;
const BLUE = `${ESC}[34m`;

// Load demo config
const config = DEMO_CONFIGS.demo3;

// State object
let state = {};
let returnToMenuCallback = null;

// Dice helpers
function roll1d6() { return Math.floor(Math.random() * 6) + 1; }
function roll2d6() {
  const d1 = roll1d6(), d2 = roll1d6();
  return { dice: [d1, d2], total: d1 + d2 };
}
function rollNd6(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += roll1d6();
  return sum;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Random starting ranges for varied combat scenarios
const COMBAT_RANGES = ['Close', 'Short', 'Medium', 'Long', 'Very Long'];

function getRandomRange() {
  return COMBAT_RANGES[Math.floor(Math.random() * COMBAT_RANGES.length)];
}

// Combat outcome tracking for tactical analysis
let combatStats = {
  battlesRun: 0,
  victories: 0,
  defeats: 0,
  calledShotsAttempted: 0,
  calledShotsHit: 0,
  powerPlantsDisabled: 0
};

// Reset state for new demo run
function resetState(options = {}) {
  // Deep copy fleet arrays
  const playerFleet = config.playerFleet.map(ship => ({
    ...ship,
    systems: createDefaultSystems(),
    destroyed: false,
    thrustUsed: 0,
    evasive: false
  }));

  const enemyFleet = config.enemyFleet.map(ship => ({
    ...ship,
    systems: createDefaultSystems(),
    destroyed: false,
    thrustUsed: 0,
    evasive: false
  }));

  // Use random range if option set, otherwise config or specified
  const startRange = options.randomRange ? getRandomRange() :
    (options.startRange || config.startRange);

  state = {
    round: 1,
    phase: 'initiative',
    range: startRange,
    playerFleet,
    enemyFleet,
    narrative: [],
    maxNarrative: 12,  // Reduced for cleaner display
    manualMode: options.manualMode || false,
    initiativeOrder: [],  // Sorted by initiative roll
    actingShip: null      // Currently acting ship ID
  };
}

// Roll initiative for a ship
function rollShipInitiative(ship) {
  let tacticsBonus = 0;
  if (ship.captain?.skill_tactics_naval) {
    const tacticsRoll = roll2d6();
    const tacticsTotal = tacticsRoll.total + ship.captain.skill_tactics_naval;
    if (tacticsTotal >= 8) {
      tacticsBonus = tacticsTotal - 8;
    }
  }

  const initRoll = roll2d6();
  const pilotSkill = ship.pilotSkill || 0;
  const thrust = ship.thrust || 0;
  const total = initRoll.total + pilotSkill + thrust + tacticsBonus;

  return {
    roll: initRoll.total,
    pilot: pilotSkill,
    thrust: thrust,
    tactics: tacticsBonus,
    total: total
  };
}

function addNarrative(text) {
  state.narrative.push(text);
  while (state.narrative.length > state.maxNarrative) state.narrative.shift();
}

function colorBar(current, max, width = 10) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

// Range DM
function getRangeDM(range) {
  const DMs = {
    'Adjacent': 0, 'Close': 0, 'Short': 1,
    'Medium': 0, 'Long': -2, 'Very Long': -4, 'Distant': -6
  };
  return DMs[range] || 0;
}

// Get alive ships from fleet
function getAliveShips(fleet) {
  return fleet.filter(s => !s.destroyed && s.hull > 0);
}

// Check if fleet is defeated
function isFleetDefeated(fleet) {
  return getAliveShips(fleet).length === 0;
}

// Get fleet hull summary
function getFleetSummary(fleet, color) {
  const alive = getAliveShips(fleet);
  const totalHull = fleet.reduce((sum, s) => sum + s.hull, 0);
  const maxHull = fleet.reduce((sum, s) => sum + s.maxHull, 0);
  return `${color}${alive.length}/${fleet.length} ships, ${totalHull}/${maxHull} hull${RESET}`;
}

// Strip ANSI codes for length calculation
const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;

function render() {
  const termWidth = process.stdout.columns || 120;
  const w = Math.min(100, termWidth - 4);

  let out = CLEAR + HOME;

  // Header
  out += `${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}\n`;
  const title = `DEMO 3: ${config.description}`;
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}${title}${RESET}${' '.repeat(Math.max(1, w - title.length - 4))}${CYAN}${BOLD}║${RESET}\n`;
  const roundPhase = `ROUND ${state.round} * ${state.phase.toUpperCase()} * Range: ${state.range}`;
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${roundPhase}${RESET}${' '.repeat(Math.max(1, w - roundPhase.length - 4))}${CYAN}${BOLD}║${RESET}\n`;

  // Initiative order display
  if (state.initiativeOrder && state.initiativeOrder.length > 0) {
    const initStr = state.initiativeOrder.slice(0, 6).map((s, i) =>
      i === 0 ? `${GREEN}▶${s.name.slice(0, 8)}${RESET}` : `${DIM}${s.name.slice(0, 8)}${RESET}`
    ).join(' → ');
    const initLine = `Initiative: ${initStr}`;
    out += `${CYAN}║${RESET} ${initLine}${' '.repeat(Math.max(1, w - visLen(initLine) - 4))}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Fleet status - two columns
  const col = Math.floor((w - 6) / 2);

  // Player fleet header
  const pSummary = getFleetSummary(state.playerFleet, GREEN);
  const eSummary = getFleetSummary(state.enemyFleet, RED);
  out += `${CYAN}║${RESET} ${GREEN}${BOLD}PLAYER FLEET${RESET}${' '.repeat(col - 12)}${CYAN}│${RESET} ${RED}${BOLD}ENEMY FLEET${RESET}${' '.repeat(col - 11)}${CYAN}║${RESET}\n`;
  out += `${CYAN}║${RESET} ${pSummary}${' '.repeat(Math.max(1, col - visLen(pSummary)))}${CYAN}│${RESET} ${eSummary}${' '.repeat(Math.max(1, col - visLen(eSummary)))}${CYAN}║${RESET}\n`;
  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // List ships
  const maxShips = Math.max(state.playerFleet.length, state.enemyFleet.length);
  for (let i = 0; i < maxShips; i++) {
    const pShip = state.playerFleet[i];
    const eShip = state.enemyFleet[i];

    let pLine = '';
    if (pShip) {
      const isActing = state.actingShip === pShip.id;
      const marker = isActing ? `${WHITE}${BOLD}▶${RESET}` : ' ';
      const status = pShip.destroyed ? `${RED}DESTROYED${RESET}` :
        colorBar(pShip.hull, pShip.maxHull, 8) + ` ${pShip.hull}/${pShip.maxHull}`;
      const name = pShip.name.slice(0, 12);
      const shipType = pShip.shipType?.slice(0, 8) || '';
      const nameColor = isActing ? `${WHITE}${BOLD}` : (pShip.destroyed ? DIM : GREEN);
      pLine = `${marker}${nameColor}${name}${RESET} ${DIM}${shipType}${RESET} ${status}`;
    }

    let eLine = '';
    if (eShip) {
      const isActing = state.actingShip === eShip.id;
      const marker = isActing ? `${WHITE}${BOLD}▶${RESET}` : ' ';
      const status = eShip.destroyed ? `${RED}DESTROYED${RESET}` :
        colorBar(eShip.hull, eShip.maxHull, 8) + ` ${eShip.hull}/${eShip.maxHull}`;
      const name = eShip.name.slice(0, 12);
      const shipType = eShip.shipType?.slice(0, 8) || '';
      const nameColor = isActing ? `${WHITE}${BOLD}` : (eShip.destroyed ? DIM : RED);
      eLine = `${marker}${nameColor}${name}${RESET} ${DIM}${shipType}${RESET} ${status}`;
    }

    const pPad = Math.max(1, col - visLen(pLine));
    const ePad = Math.max(1, col - visLen(eLine));
    out += `${CYAN}║${RESET} ${pLine}${' '.repeat(pPad)}${CYAN}│${RESET} ${eLine}${' '.repeat(ePad)}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Narrative log
  out += `${CYAN}║${RESET} ${WHITE}${BOLD}COMBAT LOG${RESET}${' '.repeat(w - 14)}${CYAN}║${RESET}\n`;
  const logLines = state.narrative.slice(-12);
  for (const line of logLines) {
    const linePad = Math.max(1, w - visLen(line) - 4);
    out += `${CYAN}║${RESET} ${line}${' '.repeat(linePad)}${CYAN}║${RESET}\n`;
  }

  // Pad remaining log space
  for (let i = logLines.length; i < 12; i++) {
    out += `${CYAN}║${RESET}${' '.repeat(w - 2)}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Footer
  const modeText = state.manualMode ? `${YELLOW}MANUAL${RESET}` : `${GREEN}AUTO${RESET}`;
  out += `${CYAN}║${RESET} Mode: ${modeText}  ${DIM}[h]elp [m]ode [b]ack [r]estart [q]uit${RESET}${' '.repeat(Math.max(1, w - 52))}${CYAN}║${RESET}\n`;
  out += `${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}\n`;

  process.stdout.write(out);
}

// Called shot targets for random selection (10% chance)
const CALLED_SHOT_TARGETS = ['mDrive', 'sensors', 'fuel', 'turret'];

// Resolve attack between ships
async function resolveAttack(attacker, defender, weapon) {
  state.actingShip = attacker.id;
  render();

  const turret = weapon || attacker.turrets?.[0];
  if (!turret) {
    addNarrative(`${RED}${attacker.name} has no weapons!${RESET}`);
    return { hit: false };
  }

  const fc = attacker.fireControl || 0;
  const gunner = turret.gunnerSkill || 0;
  const rangeDM = getRangeDM(state.range);

  // 10% chance of called shot for regular gunners (not missiles)
  const canCalledShot = !['missile_rack'].includes(turret.weapons?.[0]);
  const useCalledShot = canCalledShot && Math.random() < 0.1;
  const calledShotTarget = useCalledShot ? CALLED_SHOT_TARGETS[Math.floor(Math.random() * CALLED_SHOT_TARGETS.length)] : null;
  const calledShotDM = useCalledShot ? -2 : 0;  // Standard called shot penalty

  const totalDM = fc + gunner + rangeDM + calledShotDM;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  const attackerColor = state.playerFleet.includes(attacker) ? GREEN : RED;

  // Weapon selection: use missiles at long range or 30% at medium
  let weaponName = turret.weapons?.[0] || 'weapon';
  const isLongRange = ['long', 'very long', 'distant'].includes(state.range?.toLowerCase());
  const hasMissiles = (attacker.missiles || 0) > 0 && turret.weapons?.includes('missile_rack');
  const shouldFireMissile = hasMissiles && (isLongRange || (state.range?.toLowerCase() === 'medium' && Math.random() < 0.3));

  if (shouldFireMissile) {
    weaponName = 'missile_rack';
    attacker.missiles--;
    addNarrative(`${attackerColor}${BOLD}MISSILE LAUNCH!${RESET} ${attackerColor}(${attacker.missiles} remaining)${RESET}`);
    render();
    await delay(400);
  }

  // Narrative: Story first, crunch second
  const isPlayer = state.playerFleet.includes(attacker);
  if (useCalledShot && !shouldFireMissile) {
    combatStats.calledShotsAttempted++;
    addNarrative(narrative.attackNarrative(attacker, defender, weaponName, hit, { isPlayer }));
    if (hit) {
      addNarrative(narrative.calledShotNarrative(attacker, defender, calledShotTarget, true));
    }
  } else {
    addNarrative(narrative.attackNarrative(attacker, defender, weaponName, hit, { isPlayer }));
  }
  addNarrative(narrative.crunch(`Roll: ${roll.total}+${totalDM}=${total} vs 8`));

  if (hit) {
    // Calculate damage
    let damageRoll;
    if (weaponName === 'missile_rack') {
      damageRoll = rollNd6(4);  // Missiles: 4d6

      // Point Defense: Defender attempts to shoot down missile if player ship
      const isPlayerDefending = state.playerFleet.includes(defender);
      if (isPlayerDefending && defender.turrets?.length > 0) {
        const pdTurret = defender.turrets.find(t => t.weapons?.includes('pulse_laser') || t.weapons?.includes('beam_laser'));
        if (pdTurret) {
          // Track cumulative penalty per ship
          defender.pdAttempts = (defender.pdAttempts || 0) + 1;
          const pdPenalty = -(defender.pdAttempts - 1);
          const pdGunnerSkill = pdTurret.gunnerSkill || 0;
          const pdRoll = roll2d6();
          const pdTotal = pdRoll.total + pdGunnerSkill + pdPenalty;
          const pdSuccess = pdTotal >= 8;

          if (pdSuccess) {
            addNarrative(narrative.pointDefenseNarrative(defender, true));
            addNarrative(narrative.crunch(`PD: ${pdRoll.total}+${pdGunnerSkill}${pdPenalty < 0 ? pdPenalty : ''}=${pdTotal} vs 8`));
            return { hit: false, pointDefense: true };
          } else {
            addNarrative(narrative.pointDefenseNarrative(defender, false));
            addNarrative(narrative.crunch(`PD: ${pdTotal} vs 8`));
          }
        }
      }
    } else if (weaponName === 'beam_laser') {
      damageRoll = rollNd6(3);  // Beam laser: 3d6
    } else {
      damageRoll = rollNd6(2);  // Default: 2d6
    }

    const armor = defender.armour || 0;
    const damage = Math.max(0, damageRoll - armor);

    defender.hull = Math.max(0, defender.hull - damage);

    addNarrative(narrative.damageNarrative(defender, damage, armor));
    addNarrative(narrative.crunch(`${damageRoll} - ${armor} armor = ${damage}`));

    if (defender.hull <= 0) {
      defender.destroyed = true;
      addNarrative(narrative.destroyedNarrative(defender));
    }

    return { hit: true, damage, effect };
  }

  return { hit: false };
}

// Fighter alpha strike - all fighters fire missiles at target
async function fighterAlphaStrike(fighters, target) {
  addNarrative(narrative.phaseHeader('FIGHTER ALPHA STRIKE'));
  render();
  await delay(800);

  let totalDamage = 0;

  for (const fighter of fighters) {
    if (fighter.destroyed || fighter.hull <= 0) continue;
    if ((fighter.missiles || 0) <= 0) {
      addNarrative(`${DIM}${fighter.name} - out of missiles${RESET}`);
      continue;
    }

    fighter.missiles = (fighter.missiles || 6) - 1;
    await resolveAttack(fighter, target, fighter.turrets?.[0]);
    render();
    await delay(400);

    if (target.destroyed) break;
  }

  addNarrative(narrative.phaseHeader('ALPHA STRIKE COMPLETE'));
  render();
  await delay(600);
}

// Ion cannon attack (power drain)
async function ionAttack(attacker, defender) {
  state.actingShip = attacker.id;
  render();

  const barbette = attacker.barbettes?.find(b => b.id === 'ion');
  if (!barbette) return { hit: false };

  const fc = attacker.fireControl || 0;
  const gunner = barbette.gunnerSkill || 0;
  const rangeDM = getRangeDM(state.range);
  const totalDM = fc + gunner + rangeDM;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  addNarrative(narrative.attackNarrative(attacker, defender, 'ion', hit, { isPlayer: true }));
  addNarrative(narrative.crunch(`Roll: ${roll.total}+${totalDM}=${total} vs 8`));

  if (hit) {
    // Ion damage: (3d6 + Effect) × 10 power drain
    const ionDice = rollNd6(3);
    const powerDrain = (ionDice + effect) * 10;

    defender.power = Math.max(0, (defender.power || defender.maxPower || 100) - powerDrain);

    addNarrative(narrative.ionDrainNarrative(defender, powerDrain, defender.power));
    addNarrative(narrative.crunch(`(${ionDice}+${effect})×10 = ${powerDrain} power`));

    return { hit: true, powerDrain };
  }

  return { hit: false };
}

// Marina's particle barbette attack with called shots
async function particleAttack(attacker, defender) {
  state.actingShip = attacker.id;
  render();

  const barbette = attacker.barbettes?.find(b => b.id === 'particle');
  if (!barbette) return { hit: false };

  const fc = attacker.fireControl || 0;
  const gunner = barbette.gunnerSkill || 0;
  const rangeDM = getRangeDM(state.range);

  // Marina uses called shots 80% of the time targeting Power Plant
  const useCalledShot = barbette.calledShot && Math.random() < 0.8;
  const calledShotTarget = useCalledShot ? 'powerPlant' : null;
  const calledShotDM = useCalledShot ? -4 : 0;  // Power Plant penalty

  if (useCalledShot) combatStats.calledShotsAttempted++;

  const totalDM = fc + gunner + rangeDM + calledShotDM;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  if (useCalledShot) {
    addNarrative(narrative.quote('MARINA', 'Targeting power plant!'));
    addNarrative(narrative.attackNarrative(attacker, defender, 'particle', hit, { isPlayer: true }));
    addNarrative(narrative.crunch(`Roll: ${roll.total}+${gunner}${rangeDM < 0 ? rangeDM : '+' + rangeDM}${calledShotDM}=${total} vs 8`));
  } else {
    addNarrative(narrative.attackNarrative(attacker, defender, 'particle', hit, { isPlayer: true }));
    addNarrative(narrative.crunch(`Roll: ${roll.total}+${totalDM}=${total} vs 8`));
  }

  if (hit) {
    // Particle Barbette: 6d6 damage
    const damageRoll = rollNd6(6);
    const armor = defender.armour || 0;
    const damage = Math.max(0, damageRoll - armor);

    defender.hull = Math.max(0, defender.hull - damage);

    if (useCalledShot && damage > 0) {
      // Called shot hit - damage power plant system
      if (!defender.systems) defender.systems = {};
      if (!defender.systems.powerPlant) defender.systems.powerPlant = { hits: 0 };
      defender.systems.powerPlant.hits = (defender.systems.powerPlant.hits || 0) + 1;

      combatStats.calledShotsHit++;
      const status = defender.systems.powerPlant.hits >= 3 ? 'DISABLED!' : `${defender.systems.powerPlant.hits}/3 hits`;
      addNarrative(narrative.calledShotNarrative(attacker, defender, 'Power Plant', true));
      addNarrative(narrative.damageNarrative(defender, damage, armor));
      addNarrative(narrative.crunch(`${damageRoll} - ${armor} armor = ${damage} | PP: ${status}`));

      if (defender.systems.powerPlant.hits >= 3) {
        defender.systems.powerPlant.disabled = true;
        combatStats.powerPlantsDisabled++;
        addNarrative(narrative.victoryBanner(`${defender.name} POWER PLANT DISABLED!`, true));
      }
    } else {
      addNarrative(narrative.damageNarrative(defender, damage, armor));
      addNarrative(narrative.crunch(`${damageRoll} - ${armor} armor = ${damage}`));
    }

    if (defender.hull <= 0) {
      defender.destroyed = true;
      addNarrative(narrative.destroyedNarrative(defender));
    }

    return { hit: true, damage, effect, calledShot: calledShotTarget };
  }

  return { hit: false };
}

// Enemy capital ship attacks player fleet (targets weakest)
async function capitalShipAttack(capitalShip, playerFleet) {
  state.actingShip = capitalShip.id;

  const targets = getAliveShips(playerFleet);
  if (targets.length === 0) return;

  // Priority: Fighters first (easy kills), then pinnace, then Q-Ship
  const fighters = targets.filter(s => s.shipType?.includes('Fighter'));
  const target = fighters.length > 0 ? fighters[0] : targets[0];

  addNarrative(narrative.phaseHeader('ENEMY COUNTERATTACK'));
  render();
  await delay(600);

  // Fire multiple turrets
  for (const turret of capitalShip.turrets.slice(0, 3)) {  // First 3 turrets
    if (target.destroyed) break;
    await resolveAttack(capitalShip, target, turret);
    render();
    await delay(400);
  }

  addNarrative(narrative.phaseHeader('COUNTERATTACK COMPLETE'));
  render();
  await delay(600);
}

async function runDemo() {
  addNarrative(narrative.phaseHeader('FLEET ENGAGEMENT!'));
  addNarrative(`Q-Ship Fleet reveals hidden weapons!`);
  addNarrative(`${GREEN}8 vessels${RESET} vs ${RED}INS Vigilant${RESET} at ${YELLOW}${state.range}${RESET} range`);
  render();
  await delay(2000);

  // === INITIATIVE PHASE ===
  state.phase = 'initiative';
  addNarrative(`${WHITE}${BOLD}─── INITIATIVE ───${RESET}`);
  render();
  await delay(800);

  // Roll initiative for all ships
  const allShips = [...state.playerFleet, ...state.enemyFleet];
  for (const ship of allShips) {
    ship.initiative = rollShipInitiative(ship);
  }

  // Sort by initiative (highest first)
  state.initiativeOrder = allShips.sort((a, b) => b.initiative.total - a.initiative.total);

  // Show top initiatives
  const qship = state.playerFleet.find(s => s.shipType === 'Q-Ship');
  const enemy = state.enemyFleet[0];
  addNarrative(`${GREEN}${qship.name}: ${qship.initiative.total}${RESET} vs ${RED}${enemy.name}: ${enemy.initiative.total}${RESET}`);

  const playerFirst = qship.initiative.total >= enemy.initiative.total;
  addNarrative(playerFirst ?
    `${GREEN}${BOLD}Q-SHIP FLEET ACTS FIRST!${RESET}` :
    `${RED}${BOLD}ENEMY ACTS FIRST!${RESET}`);
  render();
  await delay(1500);

  // === ROUND 1: FIGHTER ALPHA STRIKE ===
  state.round = 1;
  state.phase = 'attack';
  addNarrative(narrative.phaseHeader('ROUND 1: ATTACK'));
  render();
  await delay(1000);

  const fighters = state.playerFleet.filter(s => s.shipType?.includes('Fighter'));
  const pinnace = state.playerFleet.find(s => s.shipType?.includes('Pinnace'));

  if (playerFirst) {
    // Fighters alpha strike
    await fighterAlphaStrike(fighters, enemy);

    // Q-Ship barbette attacks (Ion + Marina's Particle)
    if (!enemy.destroyed) {
      addNarrative(`${GREEN}${BOLD}─── Q-SHIP ATTACK ───${RESET}`);
      render();
      await delay(600);
      await ionAttack(qship, enemy);
      render();
      await delay(400);
      // Marina fires particle barbette with called shots
      if (!enemy.destroyed) {
        await particleAttack(qship, enemy);
        render();
        await delay(600);
      }
    }

    // Enemy counterattack
    if (!enemy.destroyed && enemy.hull > 0) {
      await capitalShipAttack(enemy, state.playerFleet);
    }
  } else {
    // Enemy attacks first
    await capitalShipAttack(enemy, state.playerFleet);

    // Fighters retaliate
    if (!isFleetDefeated(state.playerFleet)) {
      await fighterAlphaStrike(getAliveShips(fighters), enemy);
    }

    // Q-Ship barbette attacks
    if (!enemy.destroyed && !qship.destroyed) {
      await ionAttack(qship, enemy);
      render();
      await delay(400);
      if (!enemy.destroyed) {
        await particleAttack(qship, enemy);
        render();
        await delay(600);
      }
    }
  }

  // Check victory conditions
  if (enemy.destroyed) {
    addNarrative(`${GREEN}${BOLD}*** ENEMY DESTROYED! VICTORY! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  }

  if (isFleetDefeated(state.playerFleet)) {
    addNarrative(`${RED}${BOLD}*** FLEET DESTROYED! DEFEAT! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  }

  // === ROUND 2 ===
  state.round = 2;
  state.phase = 'manoeuvre';
  addNarrative(narrative.phaseHeader('ROUND 2'));
  render();
  await delay(1500);

  // Enemy tries to disengage if heavily damaged
  if (enemy.hull < enemy.maxHull * 0.5) {
    addNarrative(`${YELLOW}${enemy.name} is badly damaged - attempting to disengage!${RESET}`);
    render();
    await delay(800);

    // Check if enemy has enough power for M-Drive (need at least 20% power)
    const powerPct = (enemy.power || enemy.maxPower || 100) / (enemy.maxPower || 100);
    if (powerPct < 0.2) {
      addNarrative(`${CYAN}${BOLD}⚡ M-DRIVE OFFLINE - insufficient power! (${Math.round(powerPct * 100)}%)${RESET}`);
      addNarrative(`${GREEN}${enemy.name} cannot escape!${RESET}`);
      render();
      await delay(1000);
    } else {
      const escapeRoll = roll2d6().total + (enemy.pilotSkill || 0);
      const blockRoll = roll2d6().total + (qship.pilotSkill || 0);

      if (escapeRoll > blockRoll + 2) {
        addNarrative(`${RED}${BOLD}${enemy.name} ESCAPES! (${escapeRoll} vs ${blockRoll})${RESET}`);
        render();
        await delay(3000);
        return;
      } else {
        addNarrative(`${GREEN}Escape blocked! (${escapeRoll} vs ${blockRoll})${RESET}`);
        render();
        await delay(800);
      }
    }
  }

  // Attack phase round 2
  state.phase = 'attack';
  addNarrative(`${WHITE}${BOLD}─── ROUND 2: ATTACK ───${RESET}`);
  render();
  await delay(800);

  // Remaining fighters continue attack
  const aliveFighters = getAliveShips(fighters);
  if (aliveFighters.length > 0 && !enemy.destroyed) {
    await fighterAlphaStrike(aliveFighters, enemy);
  }

  // Q-Ship continues barbette bombardment
  if (!enemy.destroyed && !qship.destroyed) {
    await ionAttack(qship, enemy);
    render();
    await delay(400);
    if (!enemy.destroyed) {
      await particleAttack(qship, enemy);
      render();
      await delay(600);
    }
  }

  // Pinnace attacks
  if (!enemy.destroyed && pinnace && !pinnace.destroyed) {
    await resolveAttack(pinnace, enemy, pinnace.turrets?.[0]);
    render();
    await delay(600);
  }

  // Enemy counterattack
  if (!enemy.destroyed && enemy.hull > 0) {
    await capitalShipAttack(enemy, state.playerFleet);
  }

  // Final check
  if (enemy.destroyed || enemy.hull <= 0) {
    addNarrative(`${GREEN}${BOLD}*** ENEMY DESTROYED! VICTORY! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  } else if (isFleetDefeated(state.playerFleet)) {
    addNarrative(`${RED}${BOLD}*** FLEET DESTROYED! DEFEAT! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  }

  // Both sides still fighting - offer continue
  addNarrative(narrative.phaseHeader(`ROUND ${state.round} COMPLETE`));
  addNarrative(`${enemy.name}: ${enemy.hull}/${enemy.maxHull} hull`);
  addNarrative(`Player fleet: ${getAliveShips(state.playerFleet).length}/${state.playerFleet.length} ships`);
  render();
  await delay(2000);

  const result = await showFleetSummary(state, { allowContinue: true });
  if (result.continue) {
    await runExtraRound();
  }
}

/**
 * Run an extra round of fleet combat
 */
async function runExtraRound() {
  state.round++;
  const enemy = state.enemyFleet[0];

  addNarrative(narrative.phaseHeader(`ROUND ${state.round}`));
  render();
  await delay(600);

  // Fighters attack
  const aliveFighters = getAliveShips(state.playerFleet).filter(s => s.shipType === 'Fighter');
  if (aliveFighters.length > 0) {
    await fighterAlphaStrike(aliveFighters, enemy);
    if (enemy.destroyed || enemy.hull <= 0) {
      addNarrative(`${GREEN}${BOLD}*** ENEMY DESTROYED! VICTORY! ***${RESET}`);
      render();
      await delay(2000);
      await showFleetSummary(state);
      return;
    }
  }

  // Capital ships attack
  const aliveCapitals = getAliveShips(state.playerFleet).filter(s => s.shipType !== 'Fighter');
  for (const ship of aliveCapitals) {
    if (ship.turrets?.length > 0) {
      for (const turret of ship.turrets) {
        await resolveAttack(ship, enemy, turret);
        if (enemy.destroyed || enemy.hull <= 0) break;
      }
    }
    if (enemy.destroyed || enemy.hull <= 0) break;
  }

  if (enemy.destroyed || enemy.hull <= 0) {
    addNarrative(`${GREEN}${BOLD}*** ENEMY DESTROYED! VICTORY! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  }

  // Enemy attacks
  await capitalShipAttack(enemy, state.playerFleet);

  if (isFleetDefeated(state.playerFleet)) {
    addNarrative(`${RED}${BOLD}*** FLEET DESTROYED! DEFEAT! ***${RESET}`);
    render();
    await delay(2000);
    await showFleetSummary(state);
    return;
  }

  // Still fighting - offer continue
  addNarrative(narrative.phaseHeader(`ROUND ${state.round} COMPLETE`));
  addNarrative(`${enemy.name}: ${enemy.hull}/${enemy.maxHull} hull`);
  addNarrative(`Player fleet: ${getAliveShips(state.playerFleet).length}/${state.playerFleet.length} ships`);
  render();
  await delay(1500);

  const result = await showFleetSummary(state, { allowContinue: true });
  if (result.continue) {
    await runExtraRound();
  }
}

// === KEYBOARD HANDLING ===
let showingHelp = false;

function renderHelp() {
  const w = 50;
  let out = CLEAR + HOME;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}${BOLD}DEMO 3: FLEET COMBAT HELP${RESET}${' '.repeat(w - 29)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}CONTROLS${RESET}${' '.repeat(w - 12)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}h${RESET}  - Show this help${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}b${RESET}  - Back to menu${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}r${RESET}  - Restart demo${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}q${RESET}  - Quit program${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}SCENARIO${RESET}${' '.repeat(w - 12)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  Q-Ship Fleet (8 ships) vs Destroyer${' '.repeat(w - 41)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  Destroyer: 1000t, 400HP, Armor 8${' '.repeat(w - 37)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  Fighters alpha strike + ion suppression${' '.repeat(w - 45)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${DIM}Press any key to continue...${RESET}${' '.repeat(w - 32)}${CYAN}|${RESET}\n`;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  process.stdout.write(out);
}

function setupKeyboardInput() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '\u0003') {
      process.stdout.write(CLEAR + HOME);
      process.exit(0);
    }

    if (showingHelp) {
      showingHelp = false;
      render();
      return;
    }

    if (key === 'h' || key === 'H') {
      showingHelp = true;
      renderHelp();
      return;
    }

    if (key === 'b' || key === 'B') {
      cleanupKeyboard();
      if (returnToMenuCallback) {
        returnToMenuCallback();
      } else {
        process.stdout.write(CLEAR + HOME);
        process.exit(0);
      }
      return;
    }

    if (key === 'q' || key === 'Q') {
      process.stdout.write(CLEAR + HOME + 'Goodbye!\n');
      process.exit(0);
    }

    if (key === 'r' || key === 'R') {
      process.stdout.write(CLEAR + HOME + `${YELLOW}Restarting...${RESET}\n`);
      resetState({ manualMode: state.manualMode });
      runDemo().catch(console.error);
    }
  });
}

function cleanupKeyboard() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdin.removeAllListeners('data');
}

// === EXPORTED ENTRY POINT ===
async function runDemo3(options = {}) {
  return new Promise((resolve) => {
    returnToMenuCallback = resolve;
    resetState(options);
    setupKeyboardInput();
    runDemo().then(() => {
      setTimeout(() => {
        cleanupKeyboard();
        resolve();
      }, 3000);
    }).catch(console.error);
  });
}

module.exports = { runDemo3 };

// Run directly if executed as main
if (require.main === module) {
  resetState({ randomRange: true });  // Random starting range for variety
  setupKeyboardInput();
  runDemo().catch(console.error);
}
