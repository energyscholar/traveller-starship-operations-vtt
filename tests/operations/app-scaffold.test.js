/**
 * Operations App Scaffold Tests
 *
 * PURPOSE: Risk mitigation for app.js refactor (Stage 1)
 * These tests capture the current behavior of pure utility functions
 * so we can verify the refactor doesn't break functionality.
 *
 * After the refactor completes, these tests will import from the
 * extracted modules instead of redefining the functions.
 *
 * Run with: node tests/operations/app-scaffold.test.js
 */

// ==================== Test Utilities ====================

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected "${expected}", got "${actual}"`);
  }
}

function assertNull(value, msg = '') {
  if (value !== null) {
    throw new Error(`${msg} Expected null, got ${JSON.stringify(value)}`);
  }
}

function assertExists(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(`${msg} Value is null/undefined`);
  }
}

function assertContains(str, substring, msg = '') {
  if (!str.includes(substring)) {
    throw new Error(`${msg} Expected "${str}" to contain "${substring}"`);
  }
}

// ==================== Functions Under Test ====================
// These are copied from app.js to establish baseline behavior.
// After refactor, they'll be imported from modules.

function formatRoleName(role) {
  if (!role) return 'None';
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// escapeHtml for Node.js (DOM-free version)
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// UWP Data (subset for testing)
const UWP_DATA = {
  starport: {
    'A': { name: 'Excellent', desc: 'Excellent quality installation. Refined fuel, annual overhaul, shipyard (all sizes)' },
    'B': { name: 'Good', desc: 'Good quality installation. Refined fuel, annual overhaul, shipyard (spacecraft)' },
    'C': { name: 'Routine', desc: 'Routine quality installation. Unrefined fuel, reasonable repair facilities' },
    'D': { name: 'Poor', desc: 'Poor quality installation. Unrefined fuel, no repair facilities' },
    'E': { name: 'Frontier', desc: 'Frontier installation. No fuel, no facilities, just a marked spot' },
    'X': { name: 'None', desc: 'No starport. No provision for spacecraft' }
  },
  size: {
    '0': { name: 'Asteroid', desc: '< 1,000 km diameter, negligible gravity' },
    '8': { name: '12,800 km', desc: '~12,800 km (Earth-like), 1.0g' },
    'A': { name: '16,000 km', desc: '~16,000 km, 1.4g' }
  },
  atmosphere: {
    '0': { name: 'None', desc: 'No atmosphere. Vacc suit required' },
    '6': { name: 'Standard', desc: 'Standard breathable atmosphere' }
  },
  hydrographics: {
    '0': { name: '0-5%', desc: 'Desert world. Less than 5% surface water' },
    '7': { name: '66-75%', desc: 'Earth-like. 66-75% surface water' }
  },
  population: {
    '0': { name: 'None', desc: 'Unpopulated' },
    '9': { name: 'Billions', desc: 'Major world (1-9 billion)' }
  },
  government: {
    '0': { name: 'None', desc: 'No government structure. Family bonds or anarchy' },
    '4': { name: 'Representative Democracy', desc: 'Elected representatives make decisions' }
  },
  law: {
    '0': { name: 'No Law', desc: 'No restrictions' },
    '3': { name: 'Machine Guns', desc: 'Military weapons banned' }
  },
  tech: {
    '0': { name: 'Primitive', desc: 'Stone Age technology' },
    'D': { name: 'Average Imperial', desc: 'Average Imperial tech level (TL 13)' },
    'F': { name: 'Peak Imperial', desc: 'Peak Imperial tech level (TL 15)' }
  }
};

function decodeUWP(uwp) {
  if (!uwp || typeof uwp !== 'string') return null;

  // UWP format: XNNNNNN-N (starport + 6 digits + hyphen + tech)
  const match = uwp.toUpperCase().match(/^([A-EX])([0-9A])([0-9A-F])([0-9A])([0-9A-C])([0-9A-F])([0-9A-J])-([0-9A-G])$/);
  if (!match) return null;

  const [, starport, size, atmo, hydro, pop, gov, law, tech] = match;

  return {
    raw: uwp.toUpperCase(),
    starport: { code: starport, ...UWP_DATA.starport[starport] },
    size: { code: size, ...UWP_DATA.size[size] },
    atmosphere: { code: atmo, ...UWP_DATA.atmosphere[atmo] },
    hydrographics: { code: hydro, ...UWP_DATA.hydrographics[hydro] },
    population: { code: pop, ...UWP_DATA.population[pop] },
    government: { code: gov, ...UWP_DATA.government[gov] },
    law: { code: law, ...UWP_DATA.law[law] },
    tech: { code: tech, ...UWP_DATA.tech[tech] }
  };
}

function getUWPSummary(uwp) {
  const decoded = decodeUWP(uwp);
  if (!decoded) return uwp;
  return `${decoded.starport.name} Starport, TL${decoded.tech.code}, Pop: ${decoded.population.name}`;
}

const SHIP_ASCII_ART = {
  'light_fighter': `
    /\\
   /  \\
  |====|
   \\||/
    \\/`,
  'free_trader': `
     ___
   _/   \\_
  |==|  |==|
  |__|==|__|
    \\____/`,
  'unknown': `
    ????
   ?    ?
   ?    ?
    ????`,
  'star': `
    \\|/
   --*--
    /|\\`,
  'planet': `
    .--.
   (    )
    '--'`
};

function getShipAsciiArt(shipType) {
  if (!shipType) return '';
  const normalizedType = shipType.toLowerCase().replace(/[- ]/g, '_');
  return SHIP_ASCII_ART[normalizedType] || SHIP_ASCII_ART['unknown'] || '';
}

// ==================== Tests ====================

console.log('\n=== Operations App Scaffold Tests ===');
console.log('Purpose: Capture behavior before refactor\n');

// --- formatRoleName tests ---
console.log('--- formatRoleName ---\n');

test('formatRoleName: returns None for null', () => {
  assertEqual(formatRoleName(null), 'None');
});

test('formatRoleName: returns None for undefined', () => {
  assertEqual(formatRoleName(undefined), 'None');
});

test('formatRoleName: returns None for empty string', () => {
  assertEqual(formatRoleName(''), 'None');
});

test('formatRoleName: capitalizes single word', () => {
  assertEqual(formatRoleName('captain'), 'Captain');
});

test('formatRoleName: capitalizes multi-word with underscore', () => {
  assertEqual(formatRoleName('sensor_operator'), 'Sensor Operator');
});

test('formatRoleName: handles cargo_master', () => {
  assertEqual(formatRoleName('cargo_master'), 'Cargo Master');
});

test('formatRoleName: handles already capitalized', () => {
  assertEqual(formatRoleName('Captain'), 'Captain');
});

// --- escapeHtml tests ---
console.log('\n--- escapeHtml ---\n');

test('escapeHtml: returns empty string for null', () => {
  assertEqual(escapeHtml(null), '');
});

test('escapeHtml: returns empty string for undefined', () => {
  assertEqual(escapeHtml(undefined), '');
});

test('escapeHtml: returns empty string for empty string', () => {
  assertEqual(escapeHtml(''), '');
});

test('escapeHtml: passes through safe text', () => {
  assertEqual(escapeHtml('Hello World'), 'Hello World');
});

test('escapeHtml: escapes < and >', () => {
  assertEqual(escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapeHtml: escapes &', () => {
  assertEqual(escapeHtml('A & B'), 'A &amp; B');
});

test('escapeHtml: escapes quotes', () => {
  assertEqual(escapeHtml('"test"'), '&quot;test&quot;');
});

test('escapeHtml: escapes single quotes', () => {
  assertEqual(escapeHtml("it's"), 'it&#039;s');
});

test('escapeHtml: handles mixed XSS attempt', () => {
  const xss = '<script>alert("XSS")</script>';
  const escaped = escapeHtml(xss);
  assertContains(escaped, '&lt;script&gt;');
  assertContains(escaped, '&quot;');
});

// --- decodeUWP tests ---
console.log('\n--- decodeUWP ---\n');

test('decodeUWP: returns null for null', () => {
  assertNull(decodeUWP(null));
});

test('decodeUWP: returns null for empty string', () => {
  assertNull(decodeUWP(''));
});

test('decodeUWP: returns null for non-string', () => {
  assertNull(decodeUWP(12345));
});

test('decodeUWP: returns null for invalid format', () => {
  assertNull(decodeUWP('invalid'));
});

test('decodeUWP: returns null for short UWP', () => {
  assertNull(decodeUWP('A867'));
});

test('decodeUWP: returns null for UWP without hyphen', () => {
  assertNull(decodeUWP('A867943D'));
});

test('decodeUWP: parses valid UWP A867943-D', () => {
  const decoded = decodeUWP('A867943-D');
  assertExists(decoded);
  assertEqual(decoded.raw, 'A867943-D');
  assertEqual(decoded.starport.code, 'A');
  assertEqual(decoded.starport.name, 'Excellent');
  assertEqual(decoded.tech.code, 'D');
});

test('decodeUWP: parses lowercase uwp', () => {
  const decoded = decodeUWP('a867943-d');
  assertExists(decoded);
  assertEqual(decoded.raw, 'A867943-D');
});

test('decodeUWP: parses X starport', () => {
  const decoded = decodeUWP('X000000-0');
  assertExists(decoded);
  assertEqual(decoded.starport.code, 'X');
  assertEqual(decoded.starport.name, 'None');
});

test('decodeUWP: parses high tech F', () => {
  const decoded = decodeUWP('A867943-F');
  assertExists(decoded);
  assertEqual(decoded.tech.code, 'F');
});

// --- getUWPSummary tests ---
console.log('\n--- getUWPSummary ---\n');

test('getUWPSummary: returns uwp string for invalid', () => {
  assertEqual(getUWPSummary('invalid'), 'invalid');
});

test('getUWPSummary: formats valid UWP', () => {
  const summary = getUWPSummary('A867943-D');
  assertContains(summary, 'Excellent Starport');
  assertContains(summary, 'TLD');
  assertContains(summary, 'Pop:');
});

// --- getShipAsciiArt tests ---
console.log('\n--- getShipAsciiArt ---\n');

test('getShipAsciiArt: returns empty for null', () => {
  assertEqual(getShipAsciiArt(null), '');
});

test('getShipAsciiArt: returns empty for empty string', () => {
  assertEqual(getShipAsciiArt(''), '');
});

test('getShipAsciiArt: returns art for light_fighter', () => {
  const art = getShipAsciiArt('light_fighter');
  assertContains(art, '/\\');
});

test('getShipAsciiArt: returns art for Light Fighter (spaced)', () => {
  const art = getShipAsciiArt('Light Fighter');
  assertContains(art, '/\\');
});

test('getShipAsciiArt: returns art for light-fighter (hyphenated)', () => {
  const art = getShipAsciiArt('light-fighter');
  assertContains(art, '/\\');
});

test('getShipAsciiArt: returns unknown art for unrecognized type', () => {
  const art = getShipAsciiArt('mystery_vessel');
  assertContains(art, '????');
});

test('getShipAsciiArt: returns planet art', () => {
  const art = getShipAsciiArt('planet');
  assertContains(art, '--');
});

test('getShipAsciiArt: returns star art', () => {
  const art = getShipAsciiArt('star');
  assertContains(art, '--*--');
});

// ==================== Summary ====================

console.log('\n========================================');
console.log(`SCAFFOLD TESTS COMPLETE: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
