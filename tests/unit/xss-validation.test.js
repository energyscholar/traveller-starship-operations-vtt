// XSS Validation Tests
// Comprehensive security testing for input sanitization
// Run with: node tests/unit/xss-validation.test.js

const { validateShipName } = require('../../lib/combat');

console.log('========================================');
console.log('XSS VALIDATION & INPUT SANITIZATION');
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

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: "${expected}"\nActual: "${actual}"`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertThrows(fn, expectedMessage = null) {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}", got "${error.message}"`);
    }
  }
}

console.log('--- BASIC SANITIZATION (5 tests) ---\n');

test('Allow valid alphanumeric names', () => {
  assertEqual(validateShipName('Scout Ship'), 'Scout Ship');
  assertEqual(validateShipName('Free Trader123'), 'Free Trader123');
  assertEqual(validateShipName('The Wanderer'), 'The Wanderer');
});

test('Trim leading/trailing whitespace', () => {
  assertEqual(validateShipName('  Scout  '), 'Scout');
  assertEqual(validateShipName('\tFree Trader\n'), 'Free Trader');
});

test('Enforce 50 character limit', () => {
  const longName = 'A'.repeat(100);
  const result = validateShipName(longName);
  assertEqual(result.length, 50);
  assertEqual(result, 'A'.repeat(50));
});

test('Reject non-string input', () => {
  assertThrows(() => validateShipName(123), 'Ship name must be a string');
  assertThrows(() => validateShipName(null), 'Ship name must be a string');
  assertThrows(() => validateShipName(undefined), 'Ship name must be a string');
  assertThrows(() => validateShipName({}), 'Ship name must be a string');
});

test('Handle empty string', () => {
  assertEqual(validateShipName(''), '');
  assertEqual(validateShipName('   '), '');
});

console.log('\n--- XSS ATTACK VECTORS (15 tests) ---\n');

test('Block basic script tag', () => {
  const result = validateShipName('<script>alert(1)</script>');
  // Tags are fully removed (not just <>), then parens stripped
  assertEqual(result, 'alert1');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('script'));
});

test('Block script tag with attributes', () => {
  const result = validateShipName('<script src="evil.js"></script>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('"'));
});

test('Block img tag with onerror', () => {
  const result = validateShipName('<img src=x onerror=alert(1)>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('='));
});

test('Block iframe injection', () => {
  const result = validateShipName('<iframe src="evil.com"></iframe>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
});

test('Block SVG with script', () => {
  const result = validateShipName('<svg onload=alert(1)>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('='));
});

test('Block event handlers', () => {
  const result = validateShipName('"><img src=x onerror=alert(1)>');
  assertTrue(!result.includes('"'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('<'));
});

test('Block javascript: protocol', () => {
  const result = validateShipName('javascript:alert(1)');
  // Colons and parens should be stripped
  assertTrue(!result.includes(':'));
  assertTrue(!result.includes('('));
  assertTrue(!result.includes(')'));
});

test('Block data: URI', () => {
  const result = validateShipName('data:text/html,<script>alert(1)</script>');
  assertTrue(!result.includes(':'));
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
});

test('Block HTML entities (encoded tags)', () => {
  const result = validateShipName('&lt;script&gt;alert(1)&lt;/script&gt;');
  // Ampersands and semicolons should be stripped
  assertTrue(!result.includes('&'));
  assertTrue(!result.includes(';'));
});

test('Block mixed case script tag', () => {
  const result = validateShipName('<ScRiPt>alert(1)</sCrIpT>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
});

test('Block nested tags', () => {
  const result = validateShipName('<<script>alert(1)//<</script>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('/'));
});

test('Block style tag with CSS injection', () => {
  const result = validateShipName('<style>body{background:url(javascript:alert(1))}</style>');
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('{'));
  assertTrue(!result.includes(':'));
});

test('Block null byte injection', () => {
  const result = validateShipName('Scout\x00<script>alert(1)</script>');
  assertTrue(!result.includes('\x00'));
  assertTrue(!result.includes('<'));
});

test('Block Unicode homograph attack', () => {
  // Cyrillic 'а' looks like Latin 'a' but different char code
  const result = validateShipName('Sсout'); // 'с' is Cyrillic
  // Should strip non-ASCII characters
  assertTrue(result === 'Sout' || result === 'Scout');
});

test('Block special characters that could break parsing', () => {
  const result = validateShipName('Scout"; DROP TABLE ships; --');
  // Should strip quotes, semicolons, dashes
  assertTrue(!result.includes('"'));
  assertTrue(!result.includes(';'));
  assertTrue(!result.includes('-'));
});

console.log('\n--- EDGE CASES (8 tests) ---\n');

test('Preserve spaces between words', () => {
  assertEqual(validateShipName('The Dark Star'), 'The Dark Star');
});

test('Collapse to empty string when only special chars', () => {
  assertEqual(validateShipName('!@#$%^&*()'), '');
  assertEqual(validateShipName('<script></script>'), ''); // Tags fully removed
});

test('Handle very long malicious input', () => {
  // Create attack with lots of content that survives sanitization
  const attack = '<script>' + 'AAAAA'.repeat(1000) + '</script>';
  const result = validateShipName(attack);
  assertEqual(result.length, 50); // Should be truncated after tag removal
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('script'));
});

test('Strip quotes (single and double)', () => {
  const result = validateShipName('The "Wanderer"');
  assertEqual(result, 'The Wanderer');

  const result2 = validateShipName("The 'Explorer'");
  assertEqual(result2, 'The Explorer');
});

test('Strip backslashes and forward slashes', () => {
  const result = validateShipName('Scout\\Ship/Destroyer');
  assertEqual(result, 'ScoutShipDestroyer');
});

test('Strip parentheses and brackets', () => {
  const result = validateShipName('Scout (Class A) [Armed]');
  assertEqual(result, 'Scout Class A Armed');
});

test('Handle multiple consecutive spaces', () => {
  const result = validateShipName('Scout    Ship');
  // Current implementation preserves spaces, then trims edges
  assertEqual(result, 'Scout    Ship');
});

test('Handle numbers in names', () => {
  assertEqual(validateShipName('Apollo 13'), 'Apollo 13');
  assertEqual(validateShipName('X-Wing 2000'), 'XWing 2000');
});

console.log('\n--- DEFENSE IN DEPTH (5 tests) ---\n');

test('Tag stripping + alphanumeric filter (two layers)', () => {
  // Tags fully removed by first layer, content preserved
  const result = validateShipName('<img src=x>Scout<img src=y>');
  assertEqual(result, 'Scout'); // Tags removed, only Scout remains
});

test('Length limit prevents buffer overflow attempts', () => {
  const overflow = 'A'.repeat(10000);
  const result = validateShipName(overflow);
  assertEqual(result.length, 50);
});

test('Type validation prevents object injection', () => {
  assertThrows(() => validateShipName({ toString: () => '<script>alert(1)</script>' }));
});

test('All dangerous characters stripped', () => {
  const dangerous = '<>"\'`&;=()[]{}|\\/:*?!@#$%^~';
  const result = validateShipName('Scout' + dangerous + 'Ship');
  assertEqual(result, 'ScoutShip');
});

test('Combined attack vectors neutralized', () => {
  const combined = '"><script src="//evil.com"></script><img onerror=alert(1)>';
  const result = validateShipName(combined);
  assertTrue(!result.includes('<'));
  assertTrue(!result.includes('>'));
  assertTrue(!result.includes('"'));
  assertTrue(!result.includes('='));
  assertTrue(!result.includes('/'));
});

console.log('\n========================================');
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n⚠️  SECURITY VULNERABILITIES DETECTED');
  process.exit(1);
} else {
  console.log('\n✅ All XSS attack vectors blocked');
  console.log('✅ Input sanitization working correctly');
}
