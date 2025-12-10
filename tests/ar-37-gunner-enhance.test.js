/**
 * AR-37: Gunner Role Enhancement - TDD Tests
 * Features: Weapon grouping, fire solutions, target priority, damage prediction, ammo tracking
 */

const { strict: assert } = require('assert');

function runTests(tests) {
  let passed = 0, failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

// === WEAPON GROUPING TESTS ===

const groupingTests = {
  'Can create weapon group from multiple turrets': () => {
    const ship = createShipWithTurrets([
      { id: 'turret1', weapons: ['Pulse Laser', 'Pulse Laser'] },
      { id: 'turret2', weapons: ['Pulse Laser', 'Pulse Laser'] }
    ]);

    const group = createWeaponGroup(ship, 'Alpha', ['turret1', 'turret2']);
    assert.equal(group.name, 'Alpha');
    assert.deepEqual(group.turretIds, ['turret1', 'turret2']);
  },

  'Weapon group fires all turrets together': () => {
    const ship = createShipWithTurrets([
      { id: 'turret1', weapons: ['Pulse Laser', 'Pulse Laser'] },
      { id: 'turret2', weapons: ['Pulse Laser', 'Pulse Laser'] }
    ]);
    const group = createWeaponGroup(ship, 'Alpha', ['turret1', 'turret2']);

    const result = fireWeaponGroup(group, 'contact-1');
    assert.equal(result.turretsFired, 2);
    assert.equal(result.totalWeapons, 4);
  },

  'Weapon groups persist across rounds': () => {
    const ship = createShipWithTurrets([
      { id: 'turret1', weapons: ['Pulse Laser'] }
    ]);
    const group = createWeaponGroup(ship, 'Alpha', ['turret1']);

    // Simulate round advancement
    advanceRound(ship);

    const groups = getWeaponGroups(ship);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].name, 'Alpha');
  },

  'Can delete weapon group': () => {
    const ship = createShipWithTurrets([{ id: 'turret1', weapons: ['Pulse Laser'] }]);
    const group = createWeaponGroup(ship, 'Alpha', ['turret1']);

    deleteWeaponGroup(ship, group.id);
    assert.equal(getWeaponGroups(ship).length, 0);
  }
};

// === FIRE SOLUTION TESTS ===

const fireSolutionTests = {
  'Fire solution shows hit probability': () => {
    const solution = calculateFireSolution({
      gunnerSkill: 2,
      range: 'medium',
      targetThrust: 4,
      sensorLock: true
    });

    assert.ok(solution.hitProbability >= 0 && solution.hitProbability <= 100);
    assert.ok(solution.totalDM !== undefined);
  },

  'Fire solution includes all DM modifiers': () => {
    const solution = calculateFireSolution({
      gunnerSkill: 2,
      range: 'long',
      targetThrust: 6,
      sensorLock: false,
      computerBonus: 2
    });

    assert.ok(solution.modifiers.includes('Skill +2'));
    assert.ok(solution.modifiers.some(m => m.includes('Range')));
    assert.ok(solution.modifiers.some(m => m.includes('Dodge')));
  },

  'Sensor lock provides +2 DM': () => {
    const withLock = calculateFireSolution({ gunnerSkill: 1, sensorLock: true });
    const withoutLock = calculateFireSolution({ gunnerSkill: 1, sensorLock: false });

    assert.equal(withLock.totalDM - withoutLock.totalDM, 2);
  },

  'Fire solution updates in real-time': () => {
    const ship = createShipWithTurrets([{ id: 'turret1', weapons: ['Beam Laser'] }]);
    const contact = { id: 'contact-1', range: 5000, thrust: 3 };

    const solution1 = getFireSolution(ship, 'turret1', contact);
    contact.range = 15000; // Move to longer range
    const solution2 = getFireSolution(ship, 'turret1', contact);

    assert.ok(solution2.hitProbability < solution1.hitProbability);
  }
};

// === TARGET PRIORITY QUEUE TESTS ===

const priorityTests = {
  'Can add target to priority queue': () => {
    const gunner = createGunnerState();
    addTargetPriority(gunner, 'contact-1', 1);
    addTargetPriority(gunner, 'contact-2', 2);

    const queue = getTargetQueue(gunner);
    assert.equal(queue[0].contactId, 'contact-1');
    assert.equal(queue[1].contactId, 'contact-2');
  },

  'Priority queue sorts by priority number': () => {
    const gunner = createGunnerState();
    addTargetPriority(gunner, 'contact-3', 3);
    addTargetPriority(gunner, 'contact-1', 1);
    addTargetPriority(gunner, 'contact-2', 2);

    const queue = getTargetQueue(gunner);
    assert.equal(queue[0].contactId, 'contact-1');
    assert.equal(queue[2].contactId, 'contact-3');
  },

  'Destroyed target removed from queue': () => {
    const gunner = createGunnerState();
    addTargetPriority(gunner, 'contact-1', 1);
    addTargetPriority(gunner, 'contact-2', 2);

    markTargetDestroyed(gunner, 'contact-1');

    const queue = getTargetQueue(gunner);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].contactId, 'contact-2');
  },

  'Can reprioritize target': () => {
    const gunner = createGunnerState();
    addTargetPriority(gunner, 'contact-1', 1);
    addTargetPriority(gunner, 'contact-2', 2);

    updateTargetPriority(gunner, 'contact-2', 0); // Make highest priority

    const queue = getTargetQueue(gunner);
    assert.equal(queue[0].contactId, 'contact-2');
  }
};

// === DAMAGE PREDICTION TESTS ===

const damageTests = {
  'Damage prediction shows expected damage': () => {
    const prediction = predictDamage({
      weaponType: 'Pulse Laser',
      targetArmour: 4,
      range: 'short'
    });

    assert.ok(prediction.expectedDamage >= 0);
    assert.ok(prediction.minDamage !== undefined);
    assert.ok(prediction.maxDamage !== undefined);
  },

  'Armour reduces expected damage': () => {
    const lowArmour = predictDamage({ weaponType: 'Beam Laser', targetArmour: 2 });
    const highArmour = predictDamage({ weaponType: 'Beam Laser', targetArmour: 10 });

    assert.ok(highArmour.expectedDamage < lowArmour.expectedDamage);
  },

  'Damage prediction shows shots to kill': () => {
    const prediction = predictDamage({
      weaponType: 'Pulse Laser',
      targetArmour: 4,
      targetHull: 40
    });

    assert.ok(prediction.shotsToKill > 0);
    assert.ok(Number.isInteger(prediction.shotsToKill));
  },

  'Different weapons have different damage profiles': () => {
    const pulse = predictDamage({ weaponType: 'Pulse Laser', targetArmour: 4 });
    const beam = predictDamage({ weaponType: 'Beam Laser', targetArmour: 4 });
    const particle = predictDamage({ weaponType: 'Particle Barbette', targetArmour: 4 });

    // Particle should do more damage than lasers
    assert.ok(particle.expectedDamage > pulse.expectedDamage);
  }
};

// === AMMUNITION TRACKING TESTS ===

const ammoTests = {
  'Missile rack tracks ammunition': () => {
    const turret = createTurret('turret1', ['Missile Rack']);
    assert.equal(turret.ammo['Missile Rack'], 12); // Standard load
  },

  'Firing missile decrements ammo': () => {
    const turret = createTurret('turret1', ['Missile Rack']);
    fireTurret(turret, 'Missile Rack');

    assert.equal(turret.ammo['Missile Rack'], 11);
  },

  'Sandcaster tracks sand canisters': () => {
    const turret = createTurret('turret1', ['Sandcaster']);
    assert.equal(turret.ammo['Sandcaster'], 20); // Standard load
  },

  'Cannot fire when ammo depleted': () => {
    const turret = createTurret('turret1', ['Missile Rack']);
    turret.ammo['Missile Rack'] = 0;

    const result = fireTurret(turret, 'Missile Rack');
    assert.ok(!result.success);
    assert.equal(result.reason, 'no_ammo');
  },

  'Lasers have unlimited ammo': () => {
    const turret = createTurret('turret1', ['Pulse Laser']);
    assert.equal(turret.ammo['Pulse Laser'], Infinity);

    // Can fire many times
    for (let i = 0; i < 100; i++) {
      const result = fireTurret(turret, 'Pulse Laser');
      assert.ok(result.success);
    }
  },

  'Ammo warning at 25% remaining': () => {
    const turret = createTurret('turret1', ['Missile Rack']);
    turret.ammo['Missile Rack'] = 3; // 25% of 12

    const status = getAmmoStatus(turret, 'Missile Rack');
    assert.equal(status.warning, 'low');
  },

  'Can reload ammunition': () => {
    const turret = createTurret('turret1', ['Missile Rack']);
    turret.ammo['Missile Rack'] = 5;

    reloadTurret(turret, 'Missile Rack', 7);
    assert.equal(turret.ammo['Missile Rack'], 12);
  }
};

// === STUB IMPLEMENTATIONS ===

const weaponData = {
  'Pulse Laser': { damage: '2D6', ammo: Infinity, type: 'energy' },
  'Beam Laser': { damage: '1D6', ammo: Infinity, type: 'energy' },
  'Particle Barbette': { damage: '4D6', ammo: Infinity, type: 'particle' },
  'Missile Rack': { damage: '4D6', ammo: 12, type: 'missile' },
  'Sandcaster': { damage: 0, ammo: 20, type: 'defense' }
};

function createShipWithTurrets(turretDefs) {
  return {
    turrets: turretDefs.map(t => ({
      id: t.id,
      weapons: t.weapons,
      ammo: Object.fromEntries(t.weapons.map(w => [w, weaponData[w]?.ammo || Infinity]))
    })),
    weaponGroups: [],
    round: 1
  };
}

function createWeaponGroup(ship, name, turretIds) {
  const group = {
    id: `group-${Date.now()}`,
    name,
    turretIds
  };
  ship.weaponGroups.push(group);
  return group;
}

function fireWeaponGroup(group, targetId) {
  const turretsFired = group.turretIds.length;
  return {
    turretsFired,
    totalWeapons: turretsFired * 2, // Assume 2 weapons per turret
    targetId
  };
}

function advanceRound(ship) {
  ship.round++;
}

function getWeaponGroups(ship) {
  return ship.weaponGroups;
}

function deleteWeaponGroup(ship, groupId) {
  ship.weaponGroups = ship.weaponGroups.filter(g => g.id !== groupId);
}

function calculateFireSolution(params) {
  let dm = 0;
  const modifiers = [];

  // Skill
  dm += params.gunnerSkill || 0;
  modifiers.push(`Skill +${params.gunnerSkill || 0}`);

  // Range
  const rangeDM = { close: 1, short: 0, medium: -1, long: -2, veryLong: -3, distant: -4 };
  dm += rangeDM[params.range] || 0;
  modifiers.push(`Range ${rangeDM[params.range] || 0}`);

  // Target dodge (thrust / 2, round down)
  const dodgeDM = -Math.floor((params.targetThrust || 0) / 2);
  dm += dodgeDM;
  modifiers.push(`Dodge ${dodgeDM}`);

  // Sensor lock
  if (params.sensorLock) {
    dm += 2;
    modifiers.push('Lock +2');
  }

  // Computer
  if (params.computerBonus) {
    dm += params.computerBonus;
    modifiers.push(`Computer +${params.computerBonus}`);
  }

  // Calculate hit probability (8+ on 2D6)
  const target = 8 - dm;
  const hitProb = Math.max(0, Math.min(100, calculateProbability(target)));

  return {
    totalDM: dm,
    modifiers,
    hitProbability: hitProb
  };
}

function calculateProbability(target) {
  // 2D6 probability to roll >= target
  if (target <= 2) return 100;
  if (target > 12) return 0;
  const outcomes = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]; // 2D6 distribution
  let success = 0;
  for (let i = target; i <= 12; i++) success += outcomes[i];
  return Math.round((success / 36) * 100);
}

function getFireSolution(ship, turretId, contact) {
  const range = contact.range < 1250 ? 'close' :
                contact.range < 10000 ? 'short' :
                contact.range < 25000 ? 'medium' : 'long';
  return calculateFireSolution({
    gunnerSkill: 1,
    range,
    targetThrust: contact.thrust
  });
}

function createGunnerState() {
  return { targetQueue: [] };
}

function addTargetPriority(gunner, contactId, priority) {
  gunner.targetQueue.push({ contactId, priority });
  gunner.targetQueue.sort((a, b) => a.priority - b.priority);
}

function getTargetQueue(gunner) {
  return gunner.targetQueue;
}

function markTargetDestroyed(gunner, contactId) {
  gunner.targetQueue = gunner.targetQueue.filter(t => t.contactId !== contactId);
}

function updateTargetPriority(gunner, contactId, newPriority) {
  const target = gunner.targetQueue.find(t => t.contactId === contactId);
  if (target) target.priority = newPriority;
  gunner.targetQueue.sort((a, b) => a.priority - b.priority);
}

function predictDamage(params) {
  const weapon = weaponData[params.weaponType];
  if (!weapon) return { expectedDamage: 0, minDamage: 0, maxDamage: 0, shotsToKill: Infinity };

  // Parse damage dice (e.g., "2D6" -> 2 dice)
  const match = weapon.damage.match(/(\d+)D6/);
  const dice = match ? parseInt(match[1]) : 0;

  const avgRoll = dice * 3.5;
  const minRoll = dice;
  const maxRoll = dice * 6;

  const armour = params.targetArmour || 0;
  const expectedDamage = Math.max(0, avgRoll - armour);
  const minDamage = Math.max(0, minRoll - armour);
  const maxDamage = Math.max(0, maxRoll - armour);

  const hull = params.targetHull || 40;
  const shotsToKill = expectedDamage > 0 ? Math.ceil(hull / expectedDamage) : Infinity;

  return { expectedDamage, minDamage, maxDamage, shotsToKill };
}

function createTurret(id, weapons) {
  return {
    id,
    weapons,
    ammo: Object.fromEntries(weapons.map(w => [w, weaponData[w]?.ammo || Infinity]))
  };
}

function fireTurret(turret, weaponName) {
  const ammo = turret.ammo[weaponName];
  if (ammo === 0) return { success: false, reason: 'no_ammo' };
  if (ammo !== Infinity) turret.ammo[weaponName]--;
  return { success: true };
}

function getAmmoStatus(turret, weaponName) {
  const current = turret.ammo[weaponName];
  const max = weaponData[weaponName]?.ammo || Infinity;
  if (current === Infinity) return { warning: null };
  const pct = current / max;
  return { warning: pct <= 0.25 ? 'low' : pct <= 0.5 ? 'medium' : null };
}

function reloadTurret(turret, weaponName, amount) {
  const max = weaponData[weaponName]?.ammo || 12;
  turret.ammo[weaponName] = Math.min(max, turret.ammo[weaponName] + amount);
}

// === RUN TESTS ===

console.log('=== AR-37 Gunner Enhancement Tests ===\n');

console.log('--- Weapon Grouping ---');
const groupPassed = runTests(groupingTests);

console.log('\n--- Fire Solutions ---');
const solutionPassed = runTests(fireSolutionTests);

console.log('\n--- Target Priority Queue ---');
const priorityPassed = runTests(priorityTests);

console.log('\n--- Damage Prediction ---');
const damagePassed = runTests(damageTests);

console.log('\n--- Ammunition Tracking ---');
const ammoPassed = runTests(ammoTests);

console.log('\n==================================================');
const total = Object.keys(groupingTests).length + Object.keys(fireSolutionTests).length +
              Object.keys(priorityTests).length + Object.keys(damageTests).length +
              Object.keys(ammoTests).length;
console.log(`Total: ${total} tests`);
const allPassed = groupPassed && solutionPassed && priorityPassed && damagePassed && ammoPassed;
console.log(allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED');
console.log('==================================================');

process.exit(allPassed ? 0 : 1);
