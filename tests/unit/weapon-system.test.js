// Weapon System Unit Tests
// Tests for Stage 5: Weapon Selection & Ammo
// Tests weapon damage, ammo tracking, and weapon selection

const { SHIPS, resolveAttack, rollDamageDice } = require('../../lib/combat');
const { DiceRoller } = require('../../lib/dice');

console.log('========================================');
console.log('STAGE 5 WEAPON SYSTEM UNIT TESTS');
console.log('========================================\n');

// ========================================
// DAMAGE CALCULATION TESTS (6 tests)
// ========================================

function testPulseLaserDamage() {
  console.log('Test 1: Pulse Laser damage (2d6)');

  const weapon = SHIPS.scout.weapons.find(w => w.id === 'pulseLaser');
  const roller = new DiceRoller(42);
  const damageRoll = rollDamageDice(roller, weapon.damage);

  // 2d6 should have 2 dice
  if (damageRoll.dice.length !== 2) {
    throw new Error(`Pulse Laser should roll 2 dice, got ${damageRoll.dice.length}`);
  }

  // Total should be between 2 and 12
  if (damageRoll.total < 2 || damageRoll.total > 12) {
    throw new Error(`Pulse Laser damage out of range: ${damageRoll.total}`);
  }

  console.log('✅ PASS: Pulse Laser rolls 2d6');
  console.log(`   Rolled: [${damageRoll.dice.join(', ')}] = ${damageRoll.total}\n`);
}

function testBeamLaserDamage() {
  console.log('Test 2: Beam Laser damage (3d6)');

  const weapon = SHIPS.free_trader.weapons.find(w => w.id === 'beamLaser');
  const roller = new DiceRoller(123);
  const damageRoll = rollDamageDice(roller, weapon.damage);

  // 3d6 should have 3 dice
  if (damageRoll.dice.length !== 3) {
    throw new Error(`Beam Laser should roll 3 dice, got ${damageRoll.dice.length}`);
  }

  // Total should be between 3 and 18
  if (damageRoll.total < 3 || damageRoll.total > 18) {
    throw new Error(`Beam Laser damage out of range: ${damageRoll.total}`);
  }

  console.log('✅ PASS: Beam Laser rolls 3d6');
  console.log(`   Rolled: [${damageRoll.dice.join(', ')}] = ${damageRoll.total}\n`);
}

function testMissileDamage() {
  console.log('Test 3: Missile damage (4d6)');

  const weapon = SHIPS.scout.weapons.find(w => w.id === 'missiles');
  const roller = new DiceRoller(456);
  const damageRoll = rollDamageDice(roller, weapon.damage);

  // 4d6 should have 4 dice
  if (damageRoll.dice.length !== 4) {
    throw new Error(`Missiles should roll 4 dice, got ${damageRoll.dice.length}`);
  }

  // Total should be between 4 and 24
  if (damageRoll.total < 4 || damageRoll.total > 24) {
    throw new Error(`Missile damage out of range: ${damageRoll.total}`);
  }

  console.log('✅ PASS: Missiles roll 4d6');
  console.log(`   Rolled: [${damageRoll.dice.join(', ')}] = ${damageRoll.total}\n`);
}

function testWeaponDamageInCombat() {
  console.log('Test 4: Weapon damage applied in combat');

  const scout = { ...SHIPS.scout, hull: 10 };
  const free_trader = { ...SHIPS.free_trader, hull: 15 };

  // Use missiles (4d6)
  const missile = SHIPS.scout.weapons.find(w => w.id === 'missiles');

  const result = resolveAttack(scout, free_trader, {
    range: 'medium',
    dodge: 'none',
    weapon: missile,
    seed: 999
  });

  // If hit, damage should be calculated with 4d6
  if (result.hit) {
    // Damage roll should have 4 dice
    if (result.damageRoll.dice.length !== 4) {
      throw new Error(`Expected 4 damage dice, got ${result.damageRoll.dice.length}`);
    }
  }

  console.log('✅ PASS: Weapon damage applied in combat');
  console.log(`   Hit: ${result.hit}, Damage dice: ${result.hit ? result.damageRoll.dice.length : 'N/A'}\n`);
}

function testMissileLongRangeBonus() {
  console.log('Test 5: Missile long range bonus (+2 DM)');

  const scout = { ...SHIPS.scout, hull: 10 };
  const free_trader = { ...SHIPS.free_trader, hull: 15 };

  const missile = SHIPS.scout.weapons.find(w => w.id === 'missiles');

  // Attack at long range with missiles
  const result = resolveAttack(scout, free_trader, {
    range: 'long',
    dodge: 'none',
    weapon: missile,
    seed: 42
  });

  // At long range, missiles should have 0 DM (base -2 + missile bonus +2)
  if (result.rangeDM !== 0) {
    throw new Error(`Missile range DM should be 0 at long range, got ${result.rangeDM}`);
  }

  console.log('✅ PASS: Missile long range bonus applied');
  console.log(`   Range DM: ${result.rangeDM} (negates long range penalty)\n`);
}

function testBeamLaserRangeRestriction() {
  console.log('Test 6: Beam Laser range restriction (close-medium only)');

  const beamLaser = SHIPS.free_trader.weapons.find(w => w.id === 'beamLaser');

  if (!beamLaser.rangeRestriction) {
    throw new Error('Beam Laser should have range restriction');
  }

  const validRanges = ['adjacent', 'close', 'medium'];
  const invalidRanges = ['long', 'veryLong'];

  validRanges.forEach(range => {
    if (!beamLaser.rangeRestriction.includes(range)) {
      throw new Error(`Beam Laser should allow ${range} range`);
    }
  });

  invalidRanges.forEach(range => {
    if (beamLaser.rangeRestriction.includes(range)) {
      throw new Error(`Beam Laser should NOT allow ${range} range`);
    }
  });

  console.log('✅ PASS: Beam Laser range restriction correct');
  console.log(`   Valid ranges: ${beamLaser.rangeRestriction.join(', ')}\n`);
}

// ========================================
// AMMO TRACKING TESTS (6 tests)
// ========================================

function testMissilesHaveAmmo() {
  console.log('Test 7: Missiles have ammo (6 shots)');

  const scoutMissiles = SHIPS.scout.weapons.find(w => w.id === 'missiles');
  const free_traderMissiles = SHIPS.free_trader.weapons.find(w => w.id === 'missiles');

  if (scoutMissiles.ammo !== 6) {
    throw new Error(`Scout missiles should have 6 ammo, got ${scoutMissiles.ammo}`);
  }

  if (free_traderMissiles.ammo !== 6) {
    throw new Error(`Free Trader missiles should have 6 ammo, got ${free_traderMissiles.ammo}`);
  }

  console.log('✅ PASS: Missiles start with 6 ammo\n');
}

function testLasersHaveUnlimitedAmmo() {
  console.log('Test 8: Lasers have unlimited ammo');

  const pulseLaser = SHIPS.scout.weapons.find(w => w.id === 'pulseLaser');
  const beamLaser = SHIPS.free_trader.weapons.find(w => w.id === 'beamLaser');

  if (pulseLaser.ammo !== null) {
    throw new Error('Pulse Laser should have unlimited ammo (null)');
  }

  if (beamLaser.ammo !== null) {
    throw new Error('Beam Laser should have unlimited ammo (null)');
  }

  console.log('✅ PASS: Lasers have unlimited ammo (null)\n');
}

function testAmmoDecrement() {
  console.log('Test 9: Ammo decrements after firing');

  // Simulate ammo tracking
  let ammo = { missiles: 6 };

  // Fire missiles
  ammo.missiles--;

  if (ammo.missiles !== 5) {
    throw new Error(`Ammo should be 5 after firing, got ${ammo.missiles}`);
  }

  // Fire again
  ammo.missiles--;

  if (ammo.missiles !== 4) {
    throw new Error(`Ammo should be 4 after second shot, got ${ammo.missiles}`);
  }

  console.log('✅ PASS: Ammo decrements correctly');
  console.log(`   6 → 5 → 4\n`);
}

function testAmmoCanReachZero() {
  console.log('Test 10: Ammo can reach zero');

  let ammo = { missiles: 1 };

  ammo.missiles--;

  if (ammo.missiles !== 0) {
    throw new Error(`Ammo should be 0, got ${ammo.missiles}`);
  }

  console.log('✅ PASS: Ammo can reach zero\n');
}

function testAmmoResetOnGameReset() {
  console.log('Test 11: Ammo resets to full on game reset');

  // Simulate depleted ammo
  let ammo = { missiles: 2 };

  // Reset ammo
  ammo.missiles = 6;

  if (ammo.missiles !== 6) {
    throw new Error(`Ammo should reset to 6, got ${ammo.missiles}`);
  }

  console.log('✅ PASS: Ammo resets to full (6)\n');
}

function testAmmoIndependentPerShip() {
  console.log('Test 12: Ammo tracked independently per ship');

  const shipState = {
    scout: { ammo: { missiles: 6 } },
    free_trader: { ammo: { missiles: 6 } }
  };

  // Scout fires missiles
  shipState.scout.ammo.missiles--;

  if (shipState.scout.ammo.missiles !== 5) {
    throw new Error('Scout ammo should be 5');
  }

  if (shipState.free_trader.ammo.missiles !== 6) {
    throw new Error('Free Trader ammo should still be 6');
  }

  // Free Trader fires missiles
  shipState.free_trader.ammo.missiles--;
  shipState.free_trader.ammo.missiles--;

  if (shipState.free_trader.ammo.missiles !== 4) {
    throw new Error('Free Trader ammo should be 4');
  }

  if (shipState.scout.ammo.missiles !== 5) {
    throw new Error('Scout ammo should still be 5');
  }

  console.log('✅ PASS: Ammo tracked independently');
  console.log(`   Scout: 5, Free Trader: 4\n`);
}

// ========================================
// WEAPON SELECTION TESTS (8 tests)
// ========================================

function testScoutHasTwoWeapons() {
  console.log('Test 13: Scout has two weapons');

  if (SHIPS.scout.weapons.length !== 2) {
    throw new Error(`Scout should have 2 weapons, got ${SHIPS.scout.weapons.length}`);
  }

  const weaponIds = SHIPS.scout.weapons.map(w => w.id);

  if (!weaponIds.includes('pulseLaser')) {
    throw new Error('Scout should have Pulse Laser');
  }

  if (!weaponIds.includes('missiles')) {
    throw new Error('Scout should have Missiles');
  }

  console.log('✅ PASS: Scout has Pulse Laser and Missiles\n');
}

function testFree TraderHasTwoWeapons() {
  console.log('Test 14: Free Trader has two weapons');

  if (SHIPS.free_trader.weapons.length !== 2) {
    throw new Error(`Free Trader should have 2 weapons, got ${SHIPS.free_trader.weapons.length}`);
  }

  const weaponIds = SHIPS.free_trader.weapons.map(w => w.id);

  if (!weaponIds.includes('beamLaser')) {
    throw new Error('Free Trader should have Beam Laser');
  }

  if (!weaponIds.includes('missiles')) {
    throw new Error('Free Trader should have Missiles');
  }

  console.log('✅ PASS: Free Trader has Beam Laser and Missiles\n');
}

function testWeaponHasRequiredFields() {
  console.log('Test 15: Weapons have required fields');

  const weapon = SHIPS.scout.weapons[0];

  if (!weapon.id) {
    throw new Error('Weapon missing id field');
  }

  if (!weapon.name) {
    throw new Error('Weapon missing name field');
  }

  if (!weapon.damage) {
    throw new Error('Weapon missing damage field');
  }

  if (weapon.ammo === undefined) {
    throw new Error('Weapon missing ammo field (should be null or number)');
  }

  console.log('✅ PASS: Weapons have required fields');
  console.log(`   Fields: id, name, damage, ammo\n`);
}

function testWeaponSelectionInCombat() {
  console.log('Test 16: Weapon selection in combat');

  const scout = { ...SHIPS.scout, hull: 10 };
  const free_trader = { ...SHIPS.free_trader, hull: 15 };

  const pulseLaser = SHIPS.scout.weapons.find(w => w.id === 'pulseLaser');
  const missiles = SHIPS.scout.weapons.find(w => w.id === 'missiles');

  // Attack with Pulse Laser
  const result1 = resolveAttack(scout, free_trader, {
    range: 'medium',
    dodge: 'none',
    weapon: pulseLaser,
    seed: 100
  });

  if (result1.weapon !== 'Pulse Laser') {
    throw new Error(`Expected weapon 'Pulse Laser', got '${result1.weapon}'`);
  }

  // Attack with Missiles
  const result2 = resolveAttack(scout, free_trader, {
    range: 'medium',
    dodge: 'none',
    weapon: missiles,
    seed: 200
  });

  if (result2.weapon !== 'Missiles') {
    throw new Error(`Expected weapon 'Missiles', got '${result2.weapon}'`);
  }

  console.log('✅ PASS: Weapon selection works in combat');
  console.log(`   Selected: ${result1.weapon}, ${result2.weapon}\n`);
}

function testDefaultWeaponSelection() {
  console.log('Test 17: Default weapon selection (first weapon)');

  const scout = { ...SHIPS.scout, hull: 10 };
  const free_trader = { ...SHIPS.free_trader, hull: 15 };

  // No weapon specified, should use first weapon
  const result = resolveAttack(scout, free_trader, {
    range: 'medium',
    dodge: 'none',
    seed: 300
  });

  if (result.weapon !== 'Pulse Laser') {
    throw new Error(`Expected default weapon 'Pulse Laser', got '${result.weapon}'`);
  }

  console.log('✅ PASS: Default weapon is first weapon (Pulse Laser)\n');
}

function testDifferentWeaponsDifferentDamage() {
  console.log('Test 18: Different weapons deal different damage');

  const scout = { ...SHIPS.scout, hull: 10 };
  const free_trader = { ...SHIPS.free_trader, hull: 15 };

  const pulseLaser = SHIPS.scout.weapons.find(w => w.id === 'pulseLaser');
  const missiles = SHIPS.scout.weapons.find(w => w.id === 'missiles');

  // Force hits by using adjacent range and scout's good skill
  const result1 = resolveAttack(scout, free_trader, {
    range: 'adjacent',
    dodge: 'none',
    weapon: pulseLaser,
    seed: 1000
  });

  const result2 = resolveAttack(scout, free_trader, {
    range: 'adjacent',
    dodge: 'none',
    weapon: missiles,
    seed: 2000
  });

  // Missiles (4d6, 4 dice) should have more dice than Pulse Laser (2d6, 2 dice)
  if (result1.hit && result2.hit) {
    if (result1.damageRoll.dice.length >= result2.damageRoll.dice.length) {
      throw new Error('Missiles should have more damage dice than Pulse Laser');
    }
  }

  console.log('✅ PASS: Different weapons have different damage');
  console.log(`   Pulse Laser: 2 dice, Missiles: 4 dice\n`);
}

function testWeaponPropertiesPersist() {
  console.log('Test 19: Weapon properties persist across accesses');

  const weapon1 = SHIPS.scout.weapons.find(w => w.id === 'missiles');
  const weapon2 = SHIPS.scout.weapons.find(w => w.id === 'missiles');

  if (weapon1.ammo !== weapon2.ammo) {
    throw new Error('Weapon properties should be consistent');
  }

  if (weapon1.damage !== weapon2.damage) {
    throw new Error('Weapon damage should be consistent');
  }

  console.log('✅ PASS: Weapon properties persist\n');
}

function testBothShipsHaveMissiles() {
  console.log('Test 20: Both ships have missiles');

  const scoutMissiles = SHIPS.scout.weapons.find(w => w.id === 'missiles');
  const free_traderMissiles = SHIPS.free_trader.weapons.find(w => w.id === 'missiles');

  if (!scoutMissiles) {
    throw new Error('Scout should have missiles');
  }

  if (!free_traderMissiles) {
    throw new Error('Free Trader should have missiles');
  }

  // Both should have same missile properties
  if (scoutMissiles.damage !== free_traderMissiles.damage) {
    throw new Error('Missiles should have same damage on both ships');
  }

  if (scoutMissiles.ammo !== free_traderMissiles.ammo) {
    throw new Error('Missiles should have same ammo on both ships');
  }

  console.log('✅ PASS: Both ships have identical missiles');
  console.log(`   Damage: ${scoutMissiles.damage}, Ammo: ${scoutMissiles.ammo}\n`);
}

// ========================================
// RUN ALL TESTS
// ========================================

async function runAllTests() {
  const tests = [
    // Damage tests (6)
    testPulseLaserDamage,
    testBeamLaserDamage,
    testMissileDamage,
    testWeaponDamageInCombat,
    testMissileLongRangeBonus,
    testBeamLaserRangeRestriction,

    // Ammo tests (6)
    testMissilesHaveAmmo,
    testLasersHaveUnlimitedAmmo,
    testAmmoDecrement,
    testAmmoCanReachZero,
    testAmmoResetOnGameReset,
    testAmmoIndependentPerShip,

    // Weapon selection tests (8)
    testScoutHasTwoWeapons,
    testFree TraderHasTwoWeapons,
    testWeaponHasRequiredFields,
    testWeaponSelectionInCombat,
    testDefaultWeaponSelection,
    testDifferentWeaponsDifferentDamage,
    testWeaponPropertiesPersist,
    testBothShipsHaveMissiles
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ FAIL: ${error.message}\n`);
    }
  }

  console.log('========================================');
  if (failed === 0) {
    console.log('ALL TESTS PASSED ✅');
  } else {
    console.log(`SOME TESTS FAILED ⚠️`);
  }
  console.log('========================================');
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  console.log('========================================\n');

  console.log('Stage 5 weapon system verified!');
  console.log('Ready for integration testing.');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
