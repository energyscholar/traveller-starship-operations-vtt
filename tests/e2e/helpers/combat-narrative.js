/**
 * Combat Narrative System
 * Color-coded narrative that tells the story without dice crunch
 *
 * Narrative Types:
 *   STORY   - Main action (colored, dramatic) - always visible
 *   CRUNCH  - Dice details (dimmed) - for those who want mechanics
 *   IMPACT  - Damage/effects (yellow/red) - consequences
 *   VICTORY - Major events (bold, bright) - climactic moments
 */

// ANSI codes
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const ITALIC = `${ESC}[3m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;
const BLUE = `${ESC}[34m`;

// Narrative templates for different events
const TEMPLATES = {
  // Attack narratives (variations for flavor)
  laserHit: [
    '{attacker} scores a direct hit on {defender}!',
    '{attacker}\'s laser burns through {defender}\'s hull!',
    'Laser fire from {attacker} rakes across {defender}!',
    'Brilliant beam slashes across {defender}\'s flank!',
    '{attacker} lands a clean hit - sparks fly from {defender}!',
  ],
  laserMiss: [
    '{attacker}\'s shot goes wide.',
    '{defender} evades {attacker}\'s fire.',
    'Laser fire from {attacker} misses the mark.',
    'The beam passes harmlessly through empty space.',
    '{attacker}\'s shot grazes {defender}\'s shields.',
  ],
  missileHit: [
    'Missile impact! {defender} shudders from the explosion!',
    '{attacker}\'s missile finds its mark!',
    'Direct hit! The missile tears into {defender}!',
    'Warhead detonation! {defender} rocks from the blast!',
    'The missile slams home - debris fountains from {defender}!',
  ],
  missileMiss: [
    'The missile streaks past {defender}.',
    '{defender} outmaneuvers the incoming missile.',
    'Point defense intercepts - the warhead detonates harmlessly.',
    'The missile loses lock and tumbles away.',
  ],
  ionHit: [
    '{defender}\'s systems flicker as ion energy surges through!',
    'Ion discharge! {defender}\'s power grid destabilizes!',
    'Crackling ion energy envelops {defender}!',
    'Blue lightning crawls across {defender}\'s hull!',
    'Power fluctuation! {defender}\'s lights dim momentarily!',
  ],
  particleHit: [
    'Particle beam strikes {defender} with devastating force!',
    '{attacker}\'s particle weapon tears through armor!',
    'High-energy particles rip into {defender}!',
    'The particle beam burns a molten scar across {defender}!',
    'Armor vaporizes under the particle onslaught!',
  ],
  pointDefenseSuccess: [
    '{defender}\'s point defense swats the missile from space!',
    'Incoming missile destroyed by point defense fire!',
    'Point defense intercept! The missile explodes harmlessly!',
    'Sandcaster cloud engulfs the missile - threat neutralized!',
    'Defensive laser burns the missile out of the sky!',
  ],
  pointDefenseFail: [
    'Point defense misses! The missile gets through!',
    '{defender}\'s defensive fire fails to connect!',
    'Too fast! The missile evades point defense!',
    'Sand cloud disperses too late - missile inbound!',
  ],
  destroyed: [
    '{ship} breaks apart in a bloom of fire and debris!',
    '{ship} is destroyed! Hull breach catastrophic!',
    'Critical damage! {ship} explodes!',
    '{ship} disintegrates in a brilliant flash!',
    'Hull failure! {ship} comes apart at the seams!',
  ],
  powerCritical: [
    '{ship}\'s power plant sputters and fails!',
    'Power critical! {ship} goes dark!',
    '{ship} loses main power!',
    'Reactor shutdown! {ship} drifts powerless!',
    'Emergency lights only - {ship}\'s power plant is dead!',
  ],
  fighterLaunch: [
    'Fighters break from the Q-Ship\'s hidden bays!',
    'Fighter wing deploys in attack formation!',
    'Concealed hangars open - fighters swarm out!',
    'The "merchant" reveals its teeth - fighters away!',
  ],
  alphaStrike: [
    'All fighters fire! Missiles streak toward the target!',
    'Coordinated missile barrage incoming!',
    'Fighter wing unleashes synchronized salvo!',
    'Six missiles launch as one - coordinated alpha strike!',
  ],
  // Marina-specific combat quotes
  marinaQuotes: [
    'I want that ship intact. Target their power plant.',
    'Yuki, coordinate on my mark.',
    'Prize money beats debris fields.',
    'Disable, don\'t destroy. We can sell that.',
    'Power plant first. They can\'t run without power.',
    'Target their power plant. Yuki, ion on my mark.',
  ],
  // Yuki responses
  yukiQuotes: [
    'Ion barbette charged and ready!',
    'Targeting solution locked.',
    'Ready to fire on your mark.',
    'Systems optimal. Awaiting your command.',
  ],
  // Combat phase headers
  phases: [
    'The void erupts into violence!',
    'Space lights up with weapons fire!',
    'Combat joined!',
    'Battle is met!',
  ],
};

/**
 * Pick a random template
 */
function pickTemplate(key) {
  const templates = TEMPLATES[key];
  if (!templates) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Format a narrative template with variables
 */
function format(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
}

/**
 * Generate narrative for an attack
 */
function attackNarrative(attacker, defender, weapon, hit, options = {}) {
  const vars = { attacker: attacker.name, defender: defender.name };

  let weaponType = 'laser';
  if (weapon?.includes('missile')) weaponType = 'missile';
  else if (weapon?.includes('ion')) weaponType = 'ion';
  else if (weapon?.includes('particle')) weaponType = 'particle';

  const key = hit ? `${weaponType}Hit` : `${weaponType}Miss`;
  const template = pickTemplate(key);
  const text = format(template, vars);

  // Color based on attacker faction
  const color = options.isPlayer ? GREEN : RED;
  return `${color}${text}${RESET}`;
}

/**
 * Generate narrative for point defense
 */
function pointDefenseNarrative(defender, success) {
  const vars = { defender: defender.name };
  const key = success ? 'pointDefenseSuccess' : 'pointDefenseFail';
  const template = pickTemplate(key);
  const text = format(template, vars);
  return `${CYAN}${text}${RESET}`;
}

/**
 * Generate narrative for damage
 */
function damageNarrative(target, damage, armor) {
  if (damage <= 0) {
    return `${DIM}Armor absorbs the impact.${RESET}`;
  }
  if (damage < 10) {
    return `${YELLOW}${target.name} takes ${damage} damage.${RESET}`;
  }
  if (damage < 25) {
    return `${YELLOW}${BOLD}${target.name} reels from ${damage} damage!${RESET}`;
  }
  return `${RED}${BOLD}${target.name} takes massive damage - ${damage} points!${RESET}`;
}

/**
 * Generate narrative for destruction
 */
function destroyedNarrative(ship) {
  const template = pickTemplate('destroyed');
  const text = format(template, { ship: ship.name });
  return `${RED}${BOLD}>>> ${text} <<<${RESET}`;
}

/**
 * Generate narrative for power drain
 */
function ionDrainNarrative(target, drain, remaining) {
  if (remaining <= 0) {
    const template = pickTemplate('powerCritical');
    const text = format(template, { ship: target.name });
    return `${YELLOW}${BOLD}${text}${RESET}`;
  }
  return `${CYAN}${target.name} loses ${drain} power! (${remaining} remaining)${RESET}`;
}

/**
 * Format dice roll as crunch (dimmed)
 */
function crunch(text) {
  return `${DIM}  ${text}${RESET}`;
}

/**
 * Format phase header
 */
function phaseHeader(text) {
  return `${CYAN}${BOLD}═══ ${text} ═══${RESET}`;
}

/**
 * Format victory/defeat
 */
function victoryBanner(text, isVictory = true) {
  const color = isVictory ? GREEN : RED;
  return `${color}${BOLD}*** ${text} ***${RESET}`;
}

/**
 * Character quote (for personality)
 */
function quote(character, text) {
  return `${MAGENTA}${BOLD}${character}:${RESET} ${WHITE}"${text}"${RESET}`;
}

// ════════════════════════════════════════════════════════════════════
// CONSOLIDATED LINE FUNCTIONS (AR-233)
// Single-line attack results for easier reading at speed
// ════════════════════════════════════════════════════════════════════

/**
 * Generate single-line attack result with inline crunch
 * @param {Object} attacker - Attacking ship
 * @param {Object} defender - Defending ship
 * @param {string} weapon - Weapon name
 * @param {boolean} hit - Whether attack hit
 * @param {Object} roll - Roll object with total
 * @param {number} damage - Damage dealt (after armor)
 * @param {Object} options - { isPlayer, mods, rawDamage, armor }
 */
function attackLine(attacker, defender, weapon, hit, roll, damage, options = {}) {
  const color = options.isPlayer ? GREEN : RED;
  const action = hit ? `${GREEN}HIT${RESET}` : `${DIM}MISS${RESET}`;
  const weaponShort = weapon.replace('_', ' ').replace('pulse ', '').replace('beam ', '');

  let impact = '';
  if (hit && damage > 0) {
    impact = ` ${defender.name} ${YELLOW}-${damage} hull${RESET}`;
  } else if (hit && damage === 0) {
    impact = ` ${DIM}(absorbed)${RESET}`;
  }

  const total = roll.total + (options.mods || 0);
  const crunchText = options.showCrunch !== false ?
    ` ${DIM}[${roll.total}+${options.mods || 0}=${total} vs 8]${RESET}` : '';

  return `${color}${attacker.name}${RESET} ${weaponShort} → ${action}!${impact}${crunchText}`;
}

/**
 * Generate single-line ion drain result
 */
function ionDrainLine(attacker, defender, hit, roll, drain, remaining, options = {}) {
  const color = options.isPlayer ? GREEN : RED;
  const action = hit ? `${GREEN}HIT${RESET}` : `${DIM}MISS${RESET}`;

  let impact = '';
  if (hit) {
    if (remaining <= 0) {
      impact = ` ${RED}${BOLD}POWER DEAD!${RESET}`;
    } else {
      impact = ` ${CYAN}-${drain} power${RESET} ${DIM}(${remaining} left)${RESET}`;
    }
  }

  const total = roll.total + (options.mods || 0);
  const crunchText = ` ${DIM}[${roll.total}+${options.mods || 0}=${total} vs 8]${RESET}`;

  return `${color}${attacker.name}${RESET} ion → ${action}!${impact}${crunchText}`;
}

/**
 * Generate alpha strike summary line
 * @param {Array} results - Array of { fighter, hit, damage }
 */
function alphaStrikeSummary(results, totalDamage, target) {
  const hits = results.filter(r => r.hit).length;
  const misses = results.length - hits;
  const rolls = results.map(r => r.roll?.total || '?').join(',');

  return `${GREEN}${results.length} fighters${RESET}: ${hits} HIT, ${misses} MISS → ` +
    `${YELLOW}${totalDamage} damage${RESET} to ${target.name} ${DIM}[${rolls} vs 8]${RESET}`;
}

/**
 * Generate coordinated barrage summary (Marina + Yuki)
 */
function barrageSummary(particleResult, ionResult, defender) {
  const lines = [];

  // Particle result
  if (particleResult.hit) {
    const ppStatus = particleResult.ppHits >= 3 ?
      `${RED}${BOLD}PP DISABLED!${RESET}` :
      `${YELLOW}PP ${particleResult.ppHits}/3${RESET}`;
    lines.push(`${GREEN}Marina${RESET} particle → ${GREEN}HIT${RESET}! ${ppStatus} ${YELLOW}-${particleResult.damage} hull${RESET}`);
  } else {
    lines.push(`${GREEN}Marina${RESET} particle → ${DIM}MISS${RESET}`);
  }

  // Ion result
  if (ionResult.hit) {
    const powerStatus = ionResult.remaining <= 0 ?
      `${RED}${BOLD}POWER DEAD!${RESET}` :
      `${CYAN}-${ionResult.drain} power${RESET}`;
    lines.push(`${GREEN}Yuki${RESET} ion → ${GREEN}HIT${RESET}! ${powerStatus}`);
  } else {
    lines.push(`${GREEN}Yuki${RESET} ion → ${DIM}MISS${RESET}`);
  }

  // Knockout check
  if (particleResult.ppHits >= 3 && ionResult.remaining <= 0) {
    lines.push(`${MAGENTA}${BOLD}★★★ KNOCKOUT! ${defender.name} disabled for capture! ★★★${RESET}`);
  }

  return lines;
}

module.exports = {
  // Narrative generators
  attackNarrative,
  pointDefenseNarrative,
  damageNarrative,
  destroyedNarrative,
  ionDrainNarrative,
  // Consolidated line functions (AR-233)
  attackLine,
  ionDrainLine,
  alphaStrikeSummary,
  barrageSummary,

  // Formatting helpers
  crunch,
  phaseHeader,
  victoryBanner,
  quote,

  // Direct access
  pickTemplate,
  format,
  TEMPLATES,

  // Colors for direct use
  COLORS: { GREEN, RED, YELLOW, CYAN, MAGENTA, WHITE, BLUE, BOLD, DIM, RESET }
};
