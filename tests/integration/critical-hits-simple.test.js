// Stage 10: Simple Critical Hits Integration Test
// Uses controlled scenarios to verify critical hit integration

const { resolveAttack } = require('../../lib/combat');
const { triggersCriticalHit, calculateSeverity } = require('../../lib/critical-hits');

console.log('========================================');
console.log('SIMPLE CRITICAL HITS TEST');
console.log('========================================\n');

// Test setup: High-skill attacker with high damage weapon
const attacker = {
  name: 'Scout',
  hull: 40,
  maxHull: 40,
  armor: 4,
  pilotSkill: 10, // Very high skill for guaranteed hit
  weapons: [{ name: 'Super Laser', damage: '10d6' }] // High damage
};

const target = {
  name: 'Free Trader',
  hull: 80,
  maxHull: 80,
  armor: 0 // No armor for maximum damage
};

console.log('Attacker:', attacker.name);
console.log('Target:', target.name);
console.log('Weapon:', attacker.weapons[0].name, attacker.weapons[0].damage);
console.log('');

// Run attack
const result = resolveAttack(attacker, target, {
  weapon: attacker.weapons[0],
  range: 'close',
  dodge: 'none'
});

console.log('--- ATTACK RESULT ---\n');
console.log('Hit:', result.hit);
console.log('Attack Total:', result.attackTotal);
console.log('Target Number:', 8);

if (result.hit) {
  console.log('\nDamage Roll:', result.damageRoll.dice);
  console.log('Damage Total:', result.damageRoll.total);
  console.log('Armor:', result.armor);
  console.log('Final Damage:', result.damage);
  console.log('Effect:', result.attackTotal - 8);

  const effect = result.attackTotal - 8;
  const shouldTrigger = triggersCriticalHit(effect, result.damage);
  const severity = calculateSeverity(result.damage);

  console.log('\n--- CRITICAL CHECK ---\n');
  console.log('Effect ≥6?', effect >= 6);
  console.log('Damage > 0?', result.damage > 0);
  console.log('Should trigger critical?', shouldTrigger);
  console.log('Expected severity:', severity);

  if (result.critical) {
    console.log('\n--- CRITICAL RESULT ---\n');
    console.log('Triggered:', result.critical.triggered);
    console.log('Severity:', result.critical.severity);
    console.log('Location:', result.critical.location);
    console.log('Total Severity:', result.critical.totalSeverity);
    console.log('Message:', result.critical.message);

    if (result.critical.effects) {
      console.log('\n--- CRITICAL EFFECTS ---\n');
      console.log(JSON.stringify(result.critical.effects, null, 2));
    }

    if (result.critical.sustainedDamage) {
      console.log('\n--- SUSTAINED DAMAGE ---\n');
      console.log('Triggered:', result.critical.sustainedDamage.triggered);
      console.log('Location:', result.critical.sustainedDamage.location);
      console.log('Severity:', result.critical.sustainedDamage.severity);
    }
  } else {
    console.log('\n❌ NO CRITICAL RESULT IN OUTPUT');
    console.log('This is unexpected given the high damage.');
  }

  console.log('\n--- TARGET STATE ---\n');
  console.log('Hull:', result.newHull);
  if (target.crits) {
    const critCount = Object.entries(target.crits)
      .filter(([k, v]) => v.length > 0)
      .map(([k, v]) => `${k}: ${v.length}`)
      .join(', ');
    console.log('Crits:', critCount || 'none');
  } else {
    console.log('Crits: (not initialized)');
  }
} else {
  console.log('\n❌ MISS - Cannot test critical hits');
}

console.log('\n========================================\n');

// Exit with success - this is a diagnostic test
process.exit(0);
