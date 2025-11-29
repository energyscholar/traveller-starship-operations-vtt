// Space Combat Weapon Systems & Point Defense Tests
// Covers one-weapon-per-round rule and point defense reactions
// Based on USE CASES 3-6 from PHASE-SYSTEM-USE-CASES.md

const {
  canFireWeapon,
  fireWeapon,
  canUsePointDefense,
  usePointDefense,
  resetTurretFlags,
  getTurretStatus
} = require('../../lib/combat');

console.log('========================================');
console.log('WEAPON SYSTEMS & POINT DEFENSE TESTS');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
    failCount++;
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

// ============================================================
// USE CASE 3: ONE WEAPON FIRE PER ROUND (15 tests)
// ============================================================
console.log('--- USE CASE 3: One Weapon Per Round (15 tests) ---\n');

test('Weapon: Can fire unused pulse laser', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false }
    }
  };
  assertTrue(canFireWeapon(turret, 'pulse_laser'), 'Unused weapon should be available');
});

test('Weapon: Cannot fire already-used pulse laser', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true }
    }
  };
  assertEqual(canFireWeapon(turret, 'pulse_laser'), false, 'Used weapon should be blocked');
});

test('Weapon: Fire pulse laser sets usedThisRound flag', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false }
    }
  };
  fireWeapon(turret, 'pulse_laser');
  assertEqual(turret.weapons.pulse_laser.usedThisRound, true, 'Flag should be set after firing');
});

test('Weapon: Triple turret - fire first weapon', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false },
      sandcaster: { usedThisRound: false },
      missile_rack: { usedThisRound: false }
    }
  };
  const result = fireWeapon(turret, 'pulse_laser');
  assertTrue(result.success, 'Should fire pulse laser');
  assertEqual(turret.weapons.pulse_laser.usedThisRound, true);
});

test('Weapon: Triple turret - cannot fire second weapon same round', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true },
      sandcaster: { usedThisRound: false },
      missile_rack: { usedThisRound: false }
    },
    usedThisRound: true
  };
  const result = fireWeapon(turret, 'missile_rack');
  assertEqual(result.success, false, 'Should block second weapon fire');
  assertTrue(result.message.includes('already fired'), 'Error should mention turret already fired');
});

test('Weapon: Track turret-level usedThisRound flag', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false }
    },
    usedThisRound: false
  };
  fireWeapon(turret, 'pulse_laser');
  assertEqual(turret.usedThisRound, true, 'Turret should be marked as used');
});

test('Weapon: Different turrets can fire independently', () => {
  const turret1 = {
    id: 'turret_1',
    weapons: { pulse_laser: { usedThisRound: true } },
    usedThisRound: true
  };
  const turret2 = {
    id: 'turret_2',
    weapons: { beam_laser: { usedThisRound: false } },
    usedThisRound: false
  };
  assertTrue(canFireWeapon(turret2, 'beam_laser'), 'Second turret should be independent');
});

test('Weapon: Beam laser vs pulse laser (different weapons)', () => {
  const turret = {
    weapons: {
      beam_laser: { usedThisRound: false },
      pulse_laser: { usedThisRound: false }
    },
    usedThisRound: false
  };
  fireWeapon(turret, 'beam_laser');
  assertEqual(turret.weapons.beam_laser.usedThisRound, true);
  assertEqual(turret.weapons.pulse_laser.usedThisRound, false, 'Other weapon unaffected');
});

test('Weapon: Missile rack fires', () => {
  const turret = {
    weapons: {
      missile_rack: { usedThisRound: false, missilesRemaining: 3 }
    },
    usedThisRound: false
  };
  const result = fireWeapon(turret, 'missile_rack');
  assertTrue(result.success);
  assertEqual(turret.weapons.missile_rack.usedThisRound, true);
});

test('Weapon: Missile rack depletes ammo', () => {
  const turret = {
    weapons: {
      missile_rack: { usedThisRound: false, missilesRemaining: 3 }
    },
    usedThisRound: false
  };
  fireWeapon(turret, 'missile_rack');
  assertEqual(turret.weapons.missile_rack.missilesRemaining, 2, 'Missile count should decrement');
});

test('Weapon: Missile rack cannot fire when empty', () => {
  const turret = {
    weapons: {
      missile_rack: { usedThisRound: false, missilesRemaining: 0 }
    },
    usedThisRound: false
  };
  const result = fireWeapon(turret, 'missile_rack');
  assertEqual(result.success, false, 'Should block firing with no missiles');
  assertTrue(result.message.includes('No missiles'), 'Error should mention ammo');
});

test('Weapon: Get turret status (available)', () => {
  const turret = {
    weapons: { pulse_laser: { usedThisRound: false } },
    usedThisRound: false
  };
  const status = getTurretStatus(turret);
  assertEqual(status.available, true, 'Turret should be available');
  assertEqual(status.weaponsFired, 0);
});

test('Weapon: Get turret status (used)', () => {
  const turret = {
    weapons: { pulse_laser: { usedThisRound: true } },
    usedThisRound: true
  };
  const status = getTurretStatus(turret);
  assertEqual(status.available, false, 'Turret should be unavailable');
  assertEqual(status.weaponsFired, 1);
});

test('Weapon: Reset turret flags for new round', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true },
      missile_rack: { usedThisRound: true }
    },
    usedThisRound: true
  };
  resetTurretFlags(turret);
  assertEqual(turret.weapons.pulse_laser.usedThisRound, false, 'Weapon flags should reset');
  assertEqual(turret.weapons.missile_rack.usedThisRound, false);
  assertEqual(turret.usedThisRound, false, 'Turret flag should reset');
});

test('Weapon: Sandcaster fires', () => {
  const turret = {
    weapons: {
      sandcaster: { usedThisRound: false, canistersRemaining: 20 }
    },
    usedThisRound: false
  };
  const result = fireWeapon(turret, 'sandcaster');
  assertTrue(result.success);
  assertEqual(turret.weapons.sandcaster.canistersRemaining, 19, 'Canister count should decrement');
});

// ============================================================
// USE CASE 4-5: POINT DEFENSE REACTIONS (15 tests)
// ============================================================
console.log('\n--- USE CASES 4-5: Point Defense Reactions (15 tests) ---\n');

test('PD: Laser can intercept missile (unused)', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false, usedForPointDefense: false }
    },
    usedThisRound: false
  };
  assertTrue(canUsePointDefense(turret, 'pulse_laser', 'missile'), 'Unused laser can intercept');
});

test('PD: Laser cannot intercept if already used', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: false }
    },
    usedThisRound: true
  };
  assertEqual(canUsePointDefense(turret, 'pulse_laser', 'missile'), false, 'Used laser blocked');
});

test('PD: Laser cannot intercept if already used for PD', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: true }
    },
    usedThisRound: true
  };
  assertEqual(canUsePointDefense(turret, 'pulse_laser', 'missile'), false, 'Already used for PD');
});

test('PD: Using laser sets both flags', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false, usedForPointDefense: false }
    },
    usedThisRound: false
  };
  usePointDefense(turret, 'pulse_laser', 'missile');
  assertEqual(turret.weapons.pulse_laser.usedThisRound, true);
  assertEqual(turret.weapons.pulse_laser.usedForPointDefense, true);
  assertEqual(turret.usedThisRound, true);
});

test('PD: Mutual exclusion - attack blocks PD', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: false }
    },
    usedThisRound: true
  };
  const result = usePointDefense(turret, 'pulse_laser', 'missile');
  assertEqual(result.success, false, 'Attack should block point defense');
});

test('PD: Mutual exclusion - PD blocks attack', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: true }
    },
    usedThisRound: true
  };
  const result = fireWeapon(turret, 'pulse_laser');
  assertEqual(result.success, false, 'Point defense should block attack');
});

test('PD: Sandcaster can intercept beam weapon', () => {
  const turret = {
    weapons: {
      sandcaster: { usedThisRound: false, canistersRemaining: 20 }
    },
    usedThisRound: false
  };
  assertTrue(canUsePointDefense(turret, 'sandcaster', 'laser'), 'Sandcaster can intercept lasers');
});

test('PD: Sandcaster depletes canister', () => {
  const turret = {
    weapons: {
      sandcaster: { usedThisRound: false, canistersRemaining: 20 }
    },
    usedThisRound: false
  };
  usePointDefense(turret, 'sandcaster', 'laser');
  assertEqual(turret.weapons.sandcaster.canistersRemaining, 19, 'Canister should be consumed');
});

test('PD: Sandcaster cannot fire when empty', () => {
  const turret = {
    weapons: {
      sandcaster: { usedThisRound: false, canistersRemaining: 0 }
    },
    usedThisRound: false
  };
  const result = usePointDefense(turret, 'sandcaster', 'laser');
  assertEqual(result.success, false, 'Should block with no canisters');
});

test('PD: Sandcaster vs missile (invalid target)', () => {
  const turret = {
    weapons: {
      sandcaster: { usedThisRound: false, canistersRemaining: 20 }
    },
    usedThisRound: false
  };
  // Sandcasters work against beam weapons, not missiles
  assertEqual(canUsePointDefense(turret, 'sandcaster', 'missile'), false, 'Sandcaster ineffective vs missiles');
});

test('PD: Laser vs laser (invalid - lasers intercept missiles)', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false }
    },
    usedThisRound: false
  };
  // Lasers intercept missiles, not other lasers
  assertEqual(canUsePointDefense(turret, 'pulse_laser', 'laser'), false, 'Laser ineffective vs lasers');
});

test('PD: One reaction per turn limit', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: true }
    },
    usedThisRound: true
  };
  const result = usePointDefense(turret, 'pulse_laser', 'missile');
  assertEqual(result.success, false, 'Only one PD reaction per turn');
});

test('PD: Multiple turrets can each use PD once', () => {
  const turret1 = {
    id: 'turret_1',
    weapons: { pulse_laser: { usedThisRound: true, usedForPointDefense: true } },
    usedThisRound: true
  };
  const turret2 = {
    id: 'turret_2',
    weapons: { pulse_laser: { usedThisRound: false, usedForPointDefense: false } },
    usedThisRound: false
  };
  assertTrue(canUsePointDefense(turret2, 'pulse_laser', 'missile'), 'Each turret gets one PD');
});

test('PD: Reset clears point defense flags', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: true, usedForPointDefense: true }
    },
    usedThisRound: true
  };
  resetTurretFlags(turret);
  assertEqual(turret.weapons.pulse_laser.usedForPointDefense, false, 'PD flag should reset');
});

test('PD: Beam laser can also do point defense', () => {
  const turret = {
    weapons: {
      beam_laser: { usedThisRound: false, usedForPointDefense: false }
    },
    usedThisRound: false
  };
  assertTrue(canUsePointDefense(turret, 'beam_laser', 'missile'), 'Beam laser can intercept missiles');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('WEAPON SYSTEMS TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/30`);
console.log(`FAILED: ${failCount}/30`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log(`\n❌ ${failCount} TEST(S) FAILED`);
  process.exit(1);
}
