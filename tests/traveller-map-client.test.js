/**
 * TravellerMap Client Tests
 * AR-120: Tests for TravellerMap API integration
 */

const assert = require('assert');

// Import the module
const travellerMapClient = require('../lib/traveller-map-client');

console.log('=== TravellerMap Client Tests ===\n');

// Test: parseSecFormat (Classic format)
console.log('SEC Format Parsing:');
{
  const secText = `Mora              3124 AA99AC7-F  Hi In Cp          A 112 Im K2 V M9 V
Regina            1910 A788899-C  Hi Ri Pa Ph        A 703 Im F7 V M8 V`;

  const result = travellerMapClient.parseSecFormat(secText);

  assert.strictEqual(result.systems.length, 2, 'Should parse 2 systems');
  assert.strictEqual(result.systems[0].name, 'Mora', 'First system should be Mora');
  assert.strictEqual(result.systems[0].hex, '3124', 'Mora hex should be 3124');
  assert.strictEqual(result.systems[0].uwp, 'AA99AC7-F', 'Mora UWP should match');
  assert.strictEqual(result.systems[1].name, 'Regina', 'Second system should be Regina');
  console.log('✓ parseSecFormat parses classic SEC format correctly');
}

// Test: parseSecFormat (T5 Second Survey format - API format)
{
  const t5Text = `Hex  Name                 UWP       Remarks                                     {Ix}   (Ex)    [Cx]   N     B  Z PBG W  A    Stellar
1910 Regina               A788899-C Ri Pa Ph An Cp (Amindii)2 Varg0 Asla0 Sa Ht { 4 }  (D7E+5) [9C6D] BcCeF NS - 703 9  ImDd F7 V BD M3 V
2110 Yori                 C560757-A De Ri An (Zhurphani)6 RsB                   { 2 }  (D6B+2) [795A] BC    -  - 713 15 ImDd F1 V`;

  const result = travellerMapClient.parseSecFormat(t5Text);

  assert.strictEqual(result.systems.length, 2, 'Should parse 2 T5 systems');
  assert.strictEqual(result.systems[0].hex, '1910', 'First system hex should be 1910');
  assert.strictEqual(result.systems[0].name, 'Regina', 'First system should be Regina');
  assert.strictEqual(result.systems[0].uwp, 'A788899-C', 'Regina UWP should match');
  assert.strictEqual(result.systems[1].hex, '2110', 'Second system hex should be 2110');
  assert.strictEqual(result.systems[1].name, 'Yori', 'Second system should be Yori');
  console.log('✓ parseSecFormat parses T5 Second Survey format correctly');
}

// Test: Cache toggle
console.log('\nCache Management:');
{
  // Start with cache enabled (default)
  assert.strictEqual(travellerMapClient.isCacheEnabled(), true, 'Cache should be enabled by default');
  console.log('✓ Cache enabled by default');

  // Disable cache
  travellerMapClient.setCacheEnabled(false);
  assert.strictEqual(travellerMapClient.isCacheEnabled(), false, 'Cache should be disabled');
  console.log('✓ Cache can be disabled');

  // Re-enable cache
  travellerMapClient.setCacheEnabled(true);
  assert.strictEqual(travellerMapClient.isCacheEnabled(), true, 'Cache should be re-enabled');
  console.log('✓ Cache can be re-enabled');
}

// Test: Clear cache
{
  travellerMapClient.clearCache();
  console.log('✓ Cache can be cleared without error');
}

console.log('\n==================================================');
console.log('TravellerMap Client: All tests passed ✓');
console.log('==================================================');
