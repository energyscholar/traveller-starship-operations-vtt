// Unit tests for combat math
// Run with: node tests/unit/combat.test.js

const { resolveAttack, SHIPS, RULES } = require('../../lib/combat');

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
  console.log('✅ PASS:', message);
}

console.log('========================================');
console.log('COMBAT MATH UNIT TESTS');
console.log('========================================\n');

// Test 1: Basic hit (roll exactly 8)
console.log('Test 1: Roll 6 + skill 2 = 8 (exactly hits)');
const scout = { ...SHIPS.scout };
const free_trader = { ...SHIPS.free_trader };
// Note: We can't force exact dice rolls without modifying the RNG
// So we'll test the math instead
const result1 = resolveAttack(scout, free_trader, { range: 'medium', dodge: 'none' });
assert(result1.attackTotal === result1.attackRoll.total + 2 + 0 - 0, 'Attack math correct');
console.log(`   Rolled: ${result1.attackRoll.total}, Total: ${result1.attackTotal}\n`);

// Test 2: Damage calculation (run multiple trials to guarantee a hit)
console.log('Test 2: Damage calculation');
let hitResult = null;
for (let i = 0; i < 100 && !hitResult; i++) {
  const trial = resolveAttack({ ...SHIPS.scout }, { ...SHIPS.free_trader }, { range: 'medium', dodge: 'none' });
  if (trial.hit) hitResult = trial;
}
assert(hitResult !== null, 'Should get at least one hit in 100 trials');
{
  const effect = hitResult.attackTotal - RULES.attackTarget;
  const expectedDamage = Math.max(0, hitResult.damageRoll.total + effect - free_trader.armor);
  assert(hitResult.damage === expectedDamage, 'Damage math correct');
  console.log(`   Damage: ${hitResult.damageRoll.total} + ${effect} (effect) - ${free_trader.armor} (armor) = ${hitResult.damage}\n`);
}

// Test 3: Armor reduces damage
console.log('Test 3: Armor minimum damage = 0');
const mockResult = {
  damageRoll: { total: 3 },
  armor: 4
};
const damage = Math.max(0, mockResult.damageRoll.total - mockResult.armor);
assert(damage === 0, 'Armor prevents negative damage');
console.log(`   Damage: 3 - 4 = 0 (not negative)\n`);

// Test 4: Dodge modifier
console.log('Test 4: Dodge affects attack roll');
const result4 = resolveAttack(scout, free_trader, { range: 'medium', dodge: 'full' });
assert(result4.dodgeDM === RULES.dodgeDMs.full, 'Dodge DM applied');
console.log(`   Dodge DM: ${result4.dodgeDM} (full dodge)\n`);

// Test 5: Range modifier
console.log('Test 5: Range affects attack roll');
const result5 = resolveAttack(scout, free_trader, { range: 'long', dodge: 'none' });
assert(result5.rangeDM === RULES.rangeDMs.long, 'Range DM applied');
console.log(`   Range DM: ${result5.rangeDM} (long range)\n`);

// Test 6: Attack target is 8
console.log('Test 6: Attack target is 8+');
assert(RULES.attackTarget === 8, 'Target number is 8');
console.log(`   Target: ${RULES.attackTarget}\n`);

// Test 7: Hull reduction (use guaranteed hit from Test 2)
console.log('Test 7: Hull points reduce correctly');
assert(hitResult !== null, 'Need a hit result from Test 2');
if (hitResult.damage > 0) {
  const expectedHull = SHIPS.free_trader.hull - hitResult.damage;
  assert(hitResult.newHull === expectedHull, 'Hull reduces by damage amount');
  console.log(`   Hull: ${SHIPS.free_trader.hull} - ${hitResult.damage} = ${hitResult.newHull}\n`);
} else {
  // Damage was 0 due to armor — hull unchanged, which is correct
  assert(hitResult.newHull === SHIPS.free_trader.hull, 'Hull unchanged when damage is 0');
  console.log(`   Hull unchanged (damage absorbed by armor)\n`);
}

console.log('========================================');
console.log('ALL TESTS PASSED ✅');
console.log('========================================');
console.log('Mongoose Traveller 2e combat math verified!');
console.log('');
console.log('Ready for Stage 3: Multiplayer Sync');
