/**
 * AR-250: Role State Tests
 *
 * Tests for pure state functions (no display dependencies).
 * Add tests here as roles are refactored in Phase 1.
 *
 * Run with: node tests/engine/role-state.test.js
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('  FAIL:', message);
    failed++;
    return false;
  }
  console.log('  PASS:', message);
  passed++;
  return true;
}

// =============================================================================
// TEST SETUP
// =============================================================================

console.log('========================================');
console.log('AR-250 ROLE STATE TESTS');
console.log('========================================\n');

// Sample ship for testing
const testShip = {
  id: 'test_ship',
  name: 'Test Vessel',
  hull: 100,
  maxHull: 100,
  armour: 4,
  thrust: 4,
  power: 100,
  maxPower: 100,
  turrets: [
    { id: 1, weapons: ['pulse_laser', 'beam_laser'], gunnerSkill: 2 }
  ],
  systems: {
    powerPlant: { operational: true },
    mDrive: { operational: true },
    jDrive: { operational: true },
    sensors: { operational: true },
    computer: { operational: true }
  }
};

// =============================================================================
// PHASE 0: INFRASTRUCTURE TESTS
// =============================================================================

console.log('--- Phase 0: Infrastructure ---\n');

// Test: OperationEvents exports correctly
{
  console.log('Test: OperationEvents module loads');
  try {
    const { OperationEvents } = require('../../lib/engine/operations-event-types');
    assert(OperationEvents !== undefined, 'OperationEvents exported');
    assert(OperationEvents.SCAN_COMPLETE !== undefined, 'Sensor events exist');
    assert(OperationEvents.POWER_ALLOCATED !== undefined, 'Engineering events exist');
    assert(OperationEvents.ORDER_ISSUED !== undefined, 'Command events exist');
  } catch (err) {
    assert(false, `Module load failed: ${err.message}`);
  }
}

// Test: EventBus integrates with OperationEvents
{
  console.log('\nTest: EventBus + OperationEvents integration');
  try {
    const { EventBus } = require('../../lib/engine/event-bus');
    const { OperationEvents } = require('../../lib/engine/operations-event-types');

    const bus = new EventBus();
    let received = false;

    bus.subscribe(OperationEvents.SCAN_COMPLETE, (evt) => {
      received = true;
    });

    bus.publish(OperationEvents.SCAN_COMPLETE, { targets: 3 });

    assert(received === true, 'Event received via OperationEvents');
  } catch (err) {
    assert(false, `Integration failed: ${err.message}`);
  }
}

// =============================================================================
// PHASE 1a: SHARED STATE TESTS
// =============================================================================

console.log('\n--- Phase 1a: Shared State Functions ---\n');

// Test: getSystemState returns pure data
{
  console.log('Test: getSystemState - operational system');
  const { getSystemState } = require('../../lib/engine/roles/shared-state');

  const state = getSystemState('mDrive', null);

  assert(state.name === 'mDrive', 'Has name');
  assert(state.severity === 0, 'Severity is 0');
  assert(state.operational === true, 'Is operational');
  assert(state.disabled === false, 'Not disabled');
}

{
  console.log('\nTest: getSystemState - damaged system');
  const { getSystemState } = require('../../lib/engine/roles/shared-state');

  const damageStatus = {
    totalSeverity: 3,
    disabled: false,
    crits: [{ repaired: false, failureReason: { name: 'Power Surge' } }]
  };

  const state = getSystemState('powerPlant', damageStatus);

  assert(state.severity === 3, 'Has severity 3');
  assert(state.operational === false, 'Not operational');
  assert(state.failureReason?.name === 'Power Surge', 'Has failure reason');
}

{
  console.log('\nTest: getSystemMeta - mDrive');
  const { getSystemMeta } = require('../../lib/engine/roles/shared-state');

  const template = { thrust: 4, tonnage: 200 };
  const meta = getSystemMeta('mDrive', template);

  assert(meta.type === 'mDrive', 'Has type');
  assert(meta.thrust === 4, 'Has thrust');
  assert(meta.tonnage === 200, 'Has tonnage');
}

{
  console.log('\nTest: getStatusClass');
  const { getStatusClass } = require('../../lib/engine/roles/shared-state');

  assert(getStatusClass(0, false) === 'operational', '0 severity = operational');
  assert(getStatusClass(1, false) === 'damaged', '1 severity = damaged');
  assert(getStatusClass(3, false) === 'critical', '3 severity = critical');
  assert(getStatusClass(1, true) === 'critical', 'disabled = critical');
}

{
  console.log('\nTest: getStatusText');
  const { getSystemState, getStatusText } = require('../../lib/engine/roles/shared-state');

  const operational = getSystemState('mDrive', null);
  assert(getStatusText(operational) === 'Operational', 'Operational text');

  const disabled = getSystemState('mDrive', { disabled: true, totalSeverity: 4 });
  assert(getStatusText(disabled) === 'DISABLED', 'Disabled text');
}

// =============================================================================
// PHASE 1b: SIMPLE ROLE STATE TESTS
// =============================================================================

console.log('\n--- Phase 1b: Pilot, Engineer, Astrogator ---\n');

// Pilot State Tests
{
  console.log('Test: getPilotState returns structured data');
  const { getPilotState } = require('../../lib/engine/roles/pilot-state');

  const shipState = {
    location: 'Highport',
    destination: 'Downport',
    eta: '2h',
    evasive: true,
    positionVerified: true
  };
  const template = { thrust: 4 };
  const campaign = { sensorContacts: [{ id: 'c1', name: 'Unknown' }] };

  const state = getPilotState(shipState, template, campaign);

  assert(state.navigation.location === 'Highport', 'Pilot has location');
  assert(state.navigation.destination === 'Downport', 'Pilot has destination');
  assert(state.maneuvers.evasive === true, 'Pilot tracks evasive');
  assert(state.maneuvers.hasContacts === true, 'Pilot tracks contacts');
  assert(state.drive.maxThrust === 4, 'Pilot has thrust');
}

{
  console.log('\nTest: calculateTransitTime');
  const { calculateTransitTime } = require('../../lib/engine/roles/pilot-state');

  const transit = calculateTransitTime(100000, 2); // 100,000 km at 2G

  assert(typeof transit.timeHours === 'number', 'Has time in hours');
  assert(typeof transit.turnoverKm === 'number', 'Has turnover distance');
  assert(transit.turnoverKm === 50000, 'Turnover at midpoint');
  assert(transit.timeHours > 0, 'Time is positive');
}

// Engineer State Tests
{
  console.log('\nTest: getEngineerState returns structured data');
  const { getEngineerState } = require('../../lib/engine/roles/engineer-state');

  const shipState = {
    fuel: 30,
    power: { mDrive: 100, weapons: 50, sensors: 75, lifeSupport: 75, computer: 75 },
    powerEffects: { weaponsDM: -1, sensorsDM: 0, thrustMultiplier: 1.0 }
  };
  const template = { fuel: 40 };

  const state = getEngineerState(shipState, template, {}, [], {});

  assert(state.power.percentUsed > 0, 'Has power percentage');
  assert(state.fuel.total === 30, 'Has fuel total');
  assert(state.fuel.percentFull === 75, 'Has fuel percent');
  assert(state.warnings.length === 1, 'Has one warning (weapons)');
}

{
  console.log('\nTest: getPowerPreset');
  const { getPowerPreset, POWER_PRESETS } = require('../../lib/engine/roles/engineer-state');

  const combat = getPowerPreset('combat');
  const silent = getPowerPreset('silent');

  assert(combat.weapons === 100, 'Combat preset has max weapons');
  assert(silent.weapons === 0, 'Silent preset has no weapons');
  assert(POWER_PRESETS.standard !== undefined, 'Standard preset exists');
}

// Astrogator State Tests
{
  console.log('\nTest: getAstrogatorState returns structured data');
  const { getAstrogatorState } = require('../../lib/engine/roles/astrogator-state');

  const shipState = { fuel: 40, positionVerified: true };
  const template = { jumpRating: 2, tonnage: 100, fuel: 40 };
  const campaign = { current_system: 'Regina' };

  const state = getAstrogatorState(shipState, template, {}, campaign, {});

  assert(state.jump.rating === 2, 'Has jump rating');
  assert(state.navigation.currentSystem === 'Regina', 'Has current system');
  assert(state.mode === 'ready', 'Mode is ready');
  assert(state.canJump === true, 'Can jump');
}

{
  console.log('\nTest: canExecuteJump validation');
  const { getAstrogatorState, canExecuteJump } = require('../../lib/engine/roles/astrogator-state');

  const shipState = { fuel: 10, positionVerified: true };
  const template = { jumpRating: 2, tonnage: 100, fuel: 40 };

  const state = getAstrogatorState(shipState, template, {}, {}, {});
  const check = canExecuteJump(state, 2);

  assert(check.possible === false, 'Cannot jump with low fuel');
  assert(check.reason.includes('fuel'), 'Reason mentions fuel');
}

// =============================================================================
// PHASE 1c: COMPLEX ROLE STATE TESTS
// =============================================================================

console.log('\n--- Phase 1c: Captain, Gunner, Sensors ---\n');

// Gunner State Tests
{
  console.log('Test: getGunnerState returns structured data');
  const { getGunnerState, RANGE_DMS } = require('../../lib/engine/roles/gunner-state');

  const shipState = { gunnerySkill: 2, selectedWeapon: 0 };
  const template = {
    weapons: [{ id: 0, weapon_type: 'pulse_laser', mount: 'turret' }]
  };
  const contacts = [
    { id: 'c1', name: 'Raider', marking: 'hostile', range_band: 'medium', is_targetable: true }
  ];

  const state = getGunnerState(shipState, template, contacts, 1);

  assert(state.weapons.hasWeapons === true, 'Gunner has weapons');
  assert(state.targeting.hasTargets === true, 'Gunner has targets');
  assert(state.targeting.hitChance !== null, 'Has hit chance');
  assert(state.gunnerySkill === 2, 'Has gunnery skill');
  assert(RANGE_DMS.medium === -1, 'Range DM for medium is -1');
}

{
  console.log('\nTest: calculateHitChance');
  const { calculateHitChance, calculateHitProbability2D6 } = require('../../lib/engine/roles/gunner-state');

  const weapon = { weapon_type: 'pulse_laser' };
  const target = { range_band: 'short' };

  const chance = calculateHitChance(weapon, target, 2);
  assert(typeof chance === 'number', 'Returns number');
  assert(chance >= 0 && chance <= 100, 'Percentage between 0-100');

  // DM +2 at short (DM 0) means 58% to hit (need 6+ on 2d6)
  const prob = calculateHitProbability2D6(2);
  assert(prob === 72, '2D6 with +2 DM gives 72% (need 6+)');
}

// Captain State Tests
{
  console.log('\nTest: getCaptainState returns structured data');
  const { getCaptainState, ALERT_COLORS } = require('../../lib/engine/roles/captain-state');

  const shipState = { alertStatus: 'YELLOW' };
  const template = { name: 'Test Ship' };
  const contacts = [
    { id: 'c1', marking: 'hostile' },
    { id: 'c2', marking: 'unknown' }
  ];
  const crewOnline = [{ name: 'Smith', role: 'Pilot' }];

  const state = getCaptainState(shipState, template, {}, crewOnline, contacts, [], 'captain');

  assert(state.alert.status === 'YELLOW', 'Alert status is YELLOW');
  assert(state.contacts.byMarking.hostile.count === 1, 'One hostile');
  assert(state.contacts.byMarking.unknown.count === 1, 'One unknown');
  assert(state.crew.count === 1, 'One crew member');
  assert(ALERT_COLORS.RED === '#dc3545', 'Alert colors defined');
}

{
  console.log('\nTest: getRecommendedAlertStatus');
  const { getCaptainState, getRecommendedAlertStatus } = require('../../lib/engine/roles/captain-state');

  const stateWithHostile = getCaptainState({}, {}, {}, [], [{ marking: 'hostile' }]);
  const rec = getRecommendedAlertStatus(stateWithHostile);
  assert(rec.recommended === 'RED', 'Recommends RED with hostile');
}

// Sensors State Tests
{
  console.log('\nTest: getSensorsState returns structured data');
  const { getSensorsState, SCAN_LEVELS } = require('../../lib/engine/roles/sensors-state');

  const shipState = { ecm: true, eccm: false };
  const contacts = [
    { id: 'c1', type: 'Ship', marking: 'hostile' },
    { id: 'c2', type: 'Station' },
    { id: 'c3', celestial: true, type: 'Planet' }
  ];

  const state = getSensorsState(shipState, contacts, null, 'expanded');

  assert(state.contacts.counts.ships === 1, 'One ship');
  assert(state.contacts.counts.stations === 1, 'One station');
  assert(state.contacts.counts.celestials === 1, 'One celestial');
  assert(state.ew.ecm === true, 'ECM active');
  assert(state.ew.eccm === false, 'ECCM inactive');
  assert(state.threats.hasThreats === true, 'Has threats');
  assert(SCAN_LEVELS.length === 4, 'Four scan levels');
}

{
  console.log('\nTest: getContactDisplayInfo');
  const { getContactDisplayInfo } = require('../../lib/engine/roles/sensors-state');

  const contact = { id: 'abc123', name: 'ISS Victory', type: 'Ship', scan_level: 2, range_band: 'Medium' };
  const info = getContactDisplayInfo(contact);

  assert(info.name === 'ISS Victory', 'Shows name at scan level 2');
  assert(info.type === 'Ship', 'Shows type');
  assert(info.canScanDeeper === true, 'Can scan deeper');

  const lowScan = { id: 'xyz789', scan_level: 0 };
  const lowInfo = getContactDisplayInfo(lowScan);
  assert(lowInfo.name === 'C-xyz7', 'Shows truncated ID at scan level 0');
  assert(lowInfo.type === '???', 'Type hidden at low scan');
}

// =============================================================================
// PHASE 1d: OBSERVER STATE TESTS
// =============================================================================

console.log('\n--- Phase 1d: Observer State ---\n');

{
  console.log('Test: getObserverState returns structured data');
  const { getObserverState, OBSERVABLE_ROLES } = require('../../lib/engine/roles/observer-state');

  const context = {
    shipState: { location: 'Highport' },
    template: { thrust: 4 },
    campaign: {}
  };

  const state = getObserverState('pilot', context);

  assert(state.watchRole === 'pilot', 'Watching pilot');
  assert(state.watchRoleName === 'Pilot', 'Has role name');
  assert(state.isReadOnly === true, 'Is read-only');
  assert(state.availableRoles.length > 0, 'Has available roles');
  assert(OBSERVABLE_ROLES.length === 7, 'Seven observable roles');
}

{
  console.log('\nTest: getWatchedRoleState returns role state');
  const { getWatchedRoleState } = require('../../lib/engine/roles/observer-state');

  const context = {
    shipState: { fuel: 40, positionVerified: true },
    template: { jumpRating: 2, tonnage: 100, fuel: 40 },
    campaign: { current_system: 'Regina' }
  };

  const astroState = getWatchedRoleState('astrogator', context);
  assert(astroState !== null, 'Returns astrogator state');
  assert(astroState.jump?.rating === 2, 'Has jump rating');

  const unknownState = getWatchedRoleState('unknown_role', context);
  assert(unknownState === null, 'Returns null for unknown role');
}

{
  console.log('\nTest: getBasicObserverInfo fallback');
  const { getBasicObserverInfo } = require('../../lib/engine/roles/observer-state');

  const info = getBasicObserverInfo(
    { alertStatus: 'RED', fuel: 30 },
    { name: 'Test Ship', hull: 100 },
    { current_system: 'Regina' }
  );

  assert(info.shipName === 'Test Ship', 'Has ship name');
  assert(info.alertStatus === 'RED', 'Has alert status');
  assert(info.fuel === 30, 'Has fuel');
}

// =============================================================================
// AR-255: ECM/ECCM COMBAT MECHANICS
// =============================================================================

{
  console.log('\n--- AR-255 ECM/ECCM Tests ---\n');
  const {
    calculateECMPenalty,
    calculateECCMBonus,
    calculateSensorAttackModifiers,
    calculateSensorLockBonus,
    canUseECM,
    getSensorAttackDM,
    SENSOR_GRADE_DMS
  } = require('../../lib/engine/roles/sensors-state');

  // ECM penalty tests
  console.log('Test: ECM penalty calculations');
  assert(calculateECMPenalty({ ecm: true }, { eccm: false }) === -2, 'Full ECM gives -2 DM');
  assert(calculateECMPenalty({ ecm: true }, { eccm: true }) === -1, 'ECM vs ECCM gives -1 DM');
  assert(calculateECMPenalty({ ecm: false }, { eccm: false }) === 0, 'No ECM gives 0 DM');
  assert(calculateECMPenalty({ ecm: false }, { eccm: true }) === 0, 'ECCM alone gives 0 DM');

  // ECCM bonus tests
  console.log('Test: ECCM bonus calculations');
  assert(calculateECCMBonus({ eccm: true }, { ecm: true }) === 1, 'ECCM vs ECM gives +1');
  assert(calculateECCMBonus({ eccm: true }, { ecm: false }) === 0, 'ECCM vs no ECM gives 0');
  assert(calculateECCMBonus({ eccm: false }, { ecm: true }) === 0, 'No ECCM gives 0');

  // Sensor grade DM tests (RAW: Basic=-4, Civilian=-2, Military=0, Improved=+1, Advanced=+2)
  console.log('Test: Sensor grade DMs');
  assert(getSensorAttackDM('Basic') === -4, 'Basic gives -4');
  assert(getSensorAttackDM('Civilian') === -2, 'Civilian gives -2');
  assert(getSensorAttackDM('Military') === 0, 'Military gives 0');
  assert(getSensorAttackDM('Improved') === 1, 'Improved gives +1');
  assert(getSensorAttackDM('Advanced') === 2, 'Advanced gives +2');
  assert(getSensorAttackDM('Very Advanced') === 3, 'Very Advanced gives +3');
  assert(getSensorAttackDM('Unknown') === 0, 'Unknown defaults to 0');

  // ECM capability tests
  console.log('Test: ECM capability by sensor grade');
  assert(canUseECM('Military') === true, 'Military can use ECM');
  assert(canUseECM('Advanced') === true, 'Advanced can use ECM');
  assert(canUseECM('Civilian') === false, 'Civilian cannot use ECM');
  assert(canUseECM('Basic') === false, 'Basic cannot use ECM');

  // Sensor lock Boon tests (RAW: locked target → 3D6 keep best 2)
  console.log('Test: Sensor lock Boon');
  assert(calculateSensorLockBonus({ sensorLock: 'target1' }, 'target1', true).isBoon === true, 'Locked guided gets Boon');
  assert(calculateSensorLockBonus({ sensorLock: 'target1' }, 'target2', true).isBoon === false, 'Wrong target no Boon');
  assert(calculateSensorLockBonus({ sensorLock: 'target1' }, 'target1', false).isBoon === false, 'Non-guided no Boon');
  assert(calculateSensorLockBonus({}, 'target1', true).isBoon === false, 'No lock no Boon');

  // Combined modifier tests
  console.log('Test: Combined attack modifiers');
  const mods1 = calculateSensorAttackModifiers(
    { eccm: true },
    { ecm: true },
    'Military'
  );
  assert(mods1.sensorDM === 0, 'Military sensor DM is 0');
  assert(mods1.ecmPenalty === -1, 'ECCM partially counters ECM');
  assert(mods1.eccmBonus === 1, 'ECCM provides bonus vs ECM');
  assert(mods1.total === 0, 'Total is 0 (0 - 1 + 1)');

  const mods2 = calculateSensorAttackModifiers(
    { eccm: false },
    { ecm: true },
    'Civilian'
  );
  assert(mods2.sensorDM === -2, 'Civilian sensor DM is -2');
  assert(mods2.ecmPenalty === -2, 'Full ECM penalty without ECCM');
  assert(mods2.total === -4, 'Total is -4');

  const mods3 = calculateSensorAttackModifiers(
    { eccm: false },
    { ecm: false },
    'Advanced'
  );
  assert(mods3.total === 2, 'Advanced sensors with no EW gives +2');
}

// =============================================================================
// SUMMARY
// =============================================================================

// Template for future tests:
/*
// Test: Gunner state returns pure data
{
  console.log('Test: getGunnerState returns pure data');
  const { getGunnerState } = require('../../lib/engine/roles/gunner-state');

  const state = getGunnerState(testShip, { range: 'Medium', targets: [] });

  assert(typeof state === 'object', 'Returns object');
  assert(typeof state.hitProbability === 'number', 'Has hitProbability');
  assert(Array.isArray(state.targets), 'Has targets array');
  assert(typeof state.toString === 'undefined' || state.toString === Object.prototype.toString,
    'No custom toString (pure data)');
}
*/

// =============================================================================
// SUMMARY
// =============================================================================

console.log('========================================');
console.log('ROLE STATE TEST SUMMARY');
console.log('========================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
