#!/usr/bin/env node
/**
 * AR-207 Weapons Test Demo
 * Tests Ion Cannon and Sandcaster mechanics
 * Run: node tests/e2e/helpers/weapons-test-demo.js
 */

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function colorBar(current, max, width = 20) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

// Simulate dice roll
function roll2d6() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { dice: [d1, d2], total: d1 + d2 };
}

function roll1d6() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollNd6(n) {
  let total = 0;
  const dice = [];
  for (let i = 0; i < n; i++) {
    const d = Math.floor(Math.random() * 6) + 1;
    dice.push(d);
    total += d;
  }
  return { dice, total };
}

console.log(`${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${CYAN}${BOLD}║           WEAPONS MECHANICS TEST - AR-207                      ║${RESET}`);
console.log(`${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════╝${RESET}`);

// ===========================================
// ION CANNON TESTS
// ===========================================

console.log(`\n${YELLOW}${BOLD}═══ ION CANNON POWER DRAIN ═══${RESET}\n`);

// Ship stats
const corsair = {
  name: 'Pirate Corsair',
  power: 100,
  maxPower: 100,
  hull: 80,
  maxHull: 80
};

// Marina's stats: FC/4 + Gunner-6 = +10 DM
// High Yield Ion Barbette: 3d6 damage
const marinaFC = 4;
const marinaGunner = 6;
const marinaDM = marinaFC + marinaGunner; // +10

console.log(`${GREEN}Marina's Ion Barbette:${RESET}`);
console.log(`  Fire Control: +${marinaFC}`);
console.log(`  Gunner Skill: +${marinaGunner}`);
console.log(`  Total DM: +${marinaDM}`);
console.log(`  Weapon: High Yield Ion Barbette (3d6)`);
console.log(`  Formula: powerDrain = (3d6 + Effect) × 10`);
console.log('');

console.log(`${CYAN}Simulating 10 Ion attacks:${RESET}\n`);

let totalDrain = 0;
const results = [];

for (let i = 0; i < 10; i++) {
  const attackRoll = roll2d6();
  const attackTotal = attackRoll.total + marinaDM;
  const hit = attackTotal >= 8;
  const effect = hit ? attackTotal - 8 : 0;

  let powerDrain = 0;
  let damageRoll = null;

  if (hit) {
    damageRoll = rollNd6(3); // High Yield = 3d6
    powerDrain = (damageRoll.total + effect) * 10;
    totalDrain += powerDrain;
  }

  results.push({ attackRoll, attackTotal, hit, effect, damageRoll, powerDrain });

  const hitStr = hit ? `${GREEN}HIT${RESET}` : `${RED}MISS${RESET}`;
  const rollStr = `2d6(${attackRoll.dice[0]},${attackRoll.dice[1]})+${marinaDM}=${attackTotal}`;

  if (hit) {
    const dmgStr = `3d6(${damageRoll.dice.join(',')})+${effect}eff=${damageRoll.total + effect}`;
    console.log(`  ${i+1}. ${rollStr} ${hitStr} | ${dmgStr} × 10 = ${MAGENTA}${powerDrain}${RESET} power`);
  } else {
    console.log(`  ${i+1}. ${rollStr} ${hitStr}`);
  }
}

const hits = results.filter(r => r.hit).length;
const avgDrain = hits > 0 ? Math.round(totalDrain / hits) : 0;

console.log(`\n${YELLOW}Ion Summary:${RESET}`);
console.log(`  Hits: ${hits}/10 (${hits * 10}%)`);
console.log(`  Total drain: ${totalDrain} power`);
console.log(`  Average per hit: ${avgDrain} power`);

// Calculate expected average
// Average 2d6 = 7, +10 = 17, Effect = 9
// Average 3d6 = 10.5
// Expected drain = (10.5 + 9) × 10 = 195
console.log(`\n${CYAN}Expected (theory):${RESET}`);
console.log(`  With +10 DM: avg roll 7+10=17, Effect=9`);
console.log(`  3d6 avg = 10.5`);
console.log(`  Expected drain = (10.5 + 9) × 10 = ${BOLD}195${RESET} per hit`);

// Show power depletion over rounds
console.log(`\n${YELLOW}${BOLD}═══ POWER DEPLETION SIMULATION ═══${RESET}\n`);

let simPower = 100;
console.log(`Corsair starting power: ${colorBar(simPower, 100, 30)} ${simPower}%\n`);

for (let round = 1; round <= 5 && simPower > 0; round++) {
  const attackRoll = roll2d6();
  const attackTotal = attackRoll.total + marinaDM;
  const hit = attackTotal >= 8;

  if (hit) {
    const effect = attackTotal - 8;
    const damageRoll = rollNd6(3);
    const drain = (damageRoll.total + effect) * 10;
    simPower = Math.max(0, simPower - drain);
    console.log(`Round ${round}: ${GREEN}HIT${RESET} - ${drain} drained → ${colorBar(simPower, 100, 20)} ${simPower}%`);
  } else {
    console.log(`Round ${round}: ${RED}MISS${RESET}`);
  }

  if (simPower <= 25) {
    console.log(`         ${RED}${BOLD}POWER CRITICAL - weapons at -4 DM!${RESET}`);
  } else if (simPower <= 50) {
    console.log(`         ${YELLOW}Power degraded - weapons at -2 DM${RESET}`);
  }
}

// ===========================================
// SANDCASTER TESTS
// ===========================================

console.log(`\n${YELLOW}${BOLD}═══ SANDCASTER DEFENSE ═══${RESET}\n`);

console.log(`${GREEN}Amishi's Sandcasters:${RESET}`);
console.log(`  2× Triple Turrets = 6 sandcasters`);
console.log(`  60 canisters per turret (20 each)`);
console.log(`  Operator: AI Gunner (skill: 0, uses FC only)`);
console.log(`  Formula: 2d6 + Gunner vs 8`);
console.log(`  Success: armor bonus = 1d6 + Effect`);
console.log(`  ${RED}RANGE LIMIT: Adjacent or Close ONLY!${RESET}`);
console.log('');

console.log(`${CYAN}Testing sandcaster at CLOSE range:${RESET}\n`);

const aiGunnerSkill = 0; // AI uses FC for attacks, but sandcasters use Gunner skill
const sandcasterSkill = 4; // Let's say AI has equivalent of +4 from FC

let sandSuccess = 0;
let totalArmorBonus = 0;

for (let i = 0; i < 10; i++) {
  const defRoll = roll2d6();
  const defTotal = defRoll.total + sandcasterSkill;
  const success = defTotal >= 8;

  let armorBonus = 0;
  if (success) {
    const effect = defTotal - 8;
    const bonusDie = roll1d6();
    armorBonus = bonusDie + effect;
    totalArmorBonus += armorBonus;
    sandSuccess++;
    console.log(`  ${i+1}. 2d6(${defRoll.dice[0]},${defRoll.dice[1]})+${sandcasterSkill}=${defTotal} ${GREEN}SUCCESS${RESET} | 1d6(${bonusDie})+${effect}eff = ${CYAN}+${armorBonus} armor${RESET}`);
  } else {
    console.log(`  ${i+1}. 2d6(${defRoll.dice[0]},${defRoll.dice[1]})+${sandcasterSkill}=${defTotal} ${RED}FAIL${RESET}`);
  }
}

const avgBonus = sandSuccess > 0 ? Math.round(totalArmorBonus / sandSuccess) : 0;
console.log(`\n${YELLOW}Sandcaster Summary:${RESET}`);
console.log(`  Success rate: ${sandSuccess}/10 (${sandSuccess * 10}%)`);
console.log(`  Average armor bonus: +${avgBonus}`);

// ===========================================
// LASER VS SANDCASTER COMBAT
// ===========================================

console.log(`\n${YELLOW}${BOLD}═══ LASER VS SANDCASTER COMBAT ═══${RESET}\n`);

// Pirate: Pulse Laser, 2d6 damage, Gunner-2 + FC/2 + DEX+1 = +5
// Amishi: Armor 1, Sandcasters

const pirateGunDM = 5;
const laserDamage = '2d6';
const amishiArmor = 1;

console.log(`${RED}Pirate Pulse Laser:${RESET}`);
console.log(`  DM: +${pirateGunDM} (FC/2 + Gunner-2 + DEX+1)`);
console.log(`  Damage: ${laserDamage}`);
console.log('');

console.log(`${GREEN}Amishi Defense:${RESET}`);
console.log(`  Base Armor: ${amishiArmor}`);
console.log(`  Sandcasters: +4 skill (AI operator)`);
console.log('');

console.log(`${CYAN}Combat at CLOSE range (sandcasters effective):${RESET}\n`);

let amishiHull = 100;
for (let round = 1; round <= 5 && amishiHull > 0; round++) {
  // Pirate attacks
  const attackRoll = roll2d6();
  const attackTotal = attackRoll.total + pirateGunDM;
  const hit = attackTotal >= 8;

  if (!hit) {
    console.log(`R${round}: Pirate fires... ${RED}MISS${RESET} (${attackTotal} vs 8)`);
    continue;
  }

  // Sandcaster reaction
  const sandRoll = roll2d6();
  const sandTotal = sandRoll.total + sandcasterSkill;
  const sandSuccess = sandTotal >= 8;

  let totalArmor = amishiArmor;
  let sandMsg = '';

  if (sandSuccess) {
    const effect = sandTotal - 8;
    const bonusDie = roll1d6();
    const sandBonus = bonusDie + effect;
    totalArmor += sandBonus;
    sandMsg = `${GREEN}Sandcaster +${sandBonus}${RESET}`;
  } else {
    sandMsg = `${RED}Sandcaster failed${RESET}`;
  }

  // Calculate damage
  const damageRoll = rollNd6(2);
  const rawDamage = damageRoll.total;
  const actualDamage = Math.max(0, rawDamage - totalArmor);
  amishiHull = Math.max(0, amishiHull - actualDamage);

  console.log(`R${round}: Pirate ${GREEN}HIT${RESET} (${attackTotal}) | ${sandMsg} | ${rawDamage}-${totalArmor}armor = ${actualDamage}dmg → ${colorBar(amishiHull, 100, 15)} ${amishiHull}%`);
}

console.log(`\n${CYAN}Combat at MEDIUM range (sandcasters INEFFECTIVE):${RESET}\n`);

amishiHull = 100;
for (let round = 1; round <= 5 && amishiHull > 0; round++) {
  const attackRoll = roll2d6();
  const attackTotal = attackRoll.total + pirateGunDM;
  const hit = attackTotal >= 8;

  if (!hit) {
    console.log(`R${round}: Pirate fires... ${RED}MISS${RESET} (${attackTotal} vs 8)`);
    continue;
  }

  // NO sandcaster at medium range!
  const totalArmor = amishiArmor;
  const damageRoll = rollNd6(2);
  const rawDamage = damageRoll.total;
  const actualDamage = Math.max(0, rawDamage - totalArmor);
  amishiHull = Math.max(0, amishiHull - actualDamage);

  console.log(`R${round}: Pirate ${GREEN}HIT${RESET} (${attackTotal}) | ${RED}No sandcaster (Medium)${RESET} | ${rawDamage}-${totalArmor}armor = ${actualDamage}dmg → ${colorBar(amishiHull, 100, 15)} ${amishiHull}%`);
}

console.log(`\n${YELLOW}${BOLD}═══ KEY FINDINGS ═══${RESET}\n`);
console.log(`${CYAN}Ion Cannon:${RESET}`);
console.log(`  • Marina's +10 DM makes hits almost guaranteed`);
console.log(`  • Expected ~195 power drain per hit`);
console.log(`  • Can disable ship power in 2-3 hits`);
console.log('');
console.log(`${CYAN}Sandcasters:${RESET}`);
console.log(`  • ${RED}ONLY work at Adjacent/Close range!${RESET}`);
console.log(`  • At Close: adds ~5-8 armor on success`);
console.log(`  • At Medium: ${RED}COMPLETELY USELESS${RESET}`);
console.log(`  • Triple sandcasters = lots of ammo, but still 1 reaction`);
console.log('');
console.log(`${CYAN}Tactical Implications:${RESET}`);
console.log(`  • Pirates should stay at Medium to bypass sandcasters`);
console.log(`  • Amishi should close to Close range to use sandcasters`);
console.log(`  • Ion disables power before hull damage kills`);
