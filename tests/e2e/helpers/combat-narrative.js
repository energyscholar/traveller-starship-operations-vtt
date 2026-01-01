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
  ],
  laserMiss: [
    '{attacker}\'s shot goes wide.',
    '{defender} evades {attacker}\'s fire.',
    'Laser fire from {attacker} misses the mark.',
  ],
  missileHit: [
    'Missile impact! {defender} shudders from the explosion!',
    '{attacker}\'s missile finds its mark!',
    'Direct hit! The missile tears into {defender}!',
  ],
  missileMiss: [
    'The missile streaks past {defender}.',
    '{defender} outmaneuvers the incoming missile.',
  ],
  ionHit: [
    '{defender}\'s systems flicker as ion energy surges through!',
    'Ion discharge! {defender}\'s power grid destabilizes!',
    'Crackling ion energy envelops {defender}!',
  ],
  particleHit: [
    'Particle beam strikes {defender} with devastating force!',
    '{attacker}\'s particle weapon tears through armor!',
    'High-energy particles rip into {defender}!',
  ],
  pointDefenseSuccess: [
    '{defender}\'s point defense swats the missile from space!',
    'Incoming missile destroyed by point defense fire!',
    'Point defense intercept! The missile explodes harmlessly!',
  ],
  pointDefenseFail: [
    'Point defense misses! The missile gets through!',
    '{defender}\'s defensive fire fails to connect!',
  ],
  calledShotHit: [
    'Precision shot! {system} takes a direct hit!',
    '{attacker} targets the {system} - hit!',
    'Called shot connects! {system} damaged!',
  ],
  destroyed: [
    '{ship} breaks apart in a bloom of fire and debris!',
    '{ship} is destroyed! Hull breach catastrophic!',
    'Critical damage! {ship} explodes!',
  ],
  powerCritical: [
    '{ship}\'s power plant sputters and fails!',
    'Power critical! {ship} goes dark!',
    '{ship} loses main power!',
  ],
  fighterLaunch: [
    'Fighters break from the Q-Ship\'s hidden bays!',
    'Fighter wing deploys in attack formation!',
  ],
  alphaStrike: [
    'All fighters fire! Missiles streak toward the target!',
    'Coordinated missile barrage incoming!',
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
 * Generate narrative for called shot
 */
function calledShotNarrative(attacker, target, system, hit) {
  if (!hit) {
    return `${MAGENTA}Called shot on ${system} - missed!${RESET}`;
  }
  const template = pickTemplate('calledShotHit');
  const text = format(template, { attacker: attacker.name, system });
  return `${MAGENTA}${BOLD}★ ${text} ★${RESET}`;
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

module.exports = {
  // Narrative generators
  attackNarrative,
  pointDefenseNarrative,
  damageNarrative,
  destroyedNarrative,
  ionDrainNarrative,
  calledShotNarrative,

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
