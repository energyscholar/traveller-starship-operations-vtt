/**
 * Security Tests
 * AR-16.10: Security test suite for validators and rate limiter
 */

const {
  validateUUID,
  validateString,
  validateInteger,
  validateBoolean,
  validateEnum,
  validateObject,
  validators,
  UUID_V4_REGEX
} = require('../../lib/operations/validators');

const {
  createRateLimiter,
  checkRateLimit,
  DEFAULT_CONFIG
} = require('../../lib/operations/rate-limiter');

// Test helpers
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.log(`  [FAIL] ${name}: ${err.message}`);
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy value`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy value`);
  }
}

// ===========================================
// UUID Validator Tests
// ===========================================
console.log('\n=== UUID Validator Tests ===\n');

test('validateUUID accepts valid UUID v4', () => {
  const result = validateUUID('550e8400-e29b-41d4-a716-446655440000');
  assertTrue(result.valid);
});

test('validateUUID rejects null', () => {
  const result = validateUUID(null);
  assertFalse(result.valid);
  assertTrue(result.error.includes('required'));
});

test('validateUUID rejects empty string', () => {
  const result = validateUUID('');
  assertFalse(result.valid);
});

test('validateUUID rejects non-string', () => {
  const result = validateUUID(12345);
  assertFalse(result.valid);
  assertTrue(result.error.includes('string'));
});

test('validateUUID rejects malformed UUID', () => {
  const result = validateUUID('not-a-valid-uuid');
  assertFalse(result.valid);
});

test('validateUUID rejects UUID v1 format', () => {
  // UUID v1 has different version digit
  const result = validateUUID('550e8400-e29b-11d4-a716-446655440000');
  assertFalse(result.valid);
});

test('validateUUID rejects SQL injection attempt', () => {
  const result = validateUUID("'; DROP TABLE users; --");
  assertFalse(result.valid);
});

// ===========================================
// String Validator Tests
// ===========================================
console.log('\n=== String Validator Tests ===\n');

test('validateString accepts normal text', () => {
  const result = validateString('Hello World');
  assertTrue(result.valid);
  assertEqual(result.sanitized, 'Hello World');
});

test('validateString trims whitespace', () => {
  const result = validateString('  trimmed  ');
  assertTrue(result.valid);
  assertEqual(result.sanitized, 'trimmed');
});

test('validateString strips < and > characters', () => {
  const result = validateString('<script>alert("xss")</script>');
  assertTrue(result.valid);
  assertFalse(result.sanitized.includes('<'));
  assertFalse(result.sanitized.includes('>'));
});

test('validateString enforces maxLength', () => {
  const result = validateString('a'.repeat(1001));
  assertFalse(result.valid);
  assertTrue(result.error.includes('exceed'));
});

test('validateString enforces minLength', () => {
  const result = validateString('ab', { minLength: 5 });
  assertFalse(result.valid);
  assertTrue(result.error.includes('at least'));
});

test('validateString handles null when not required', () => {
  const result = validateString(null);
  assertTrue(result.valid);
  assertEqual(result.sanitized, '');
});

test('validateString rejects null when required', () => {
  const result = validateString(null, { required: true });
  assertFalse(result.valid);
});

// ===========================================
// Integer Validator Tests
// ===========================================
console.log('\n=== Integer Validator Tests ===\n');

test('validateInteger accepts valid integer', () => {
  const result = validateInteger(42);
  assertTrue(result.valid);
  assertEqual(result.value, 42);
});

test('validateInteger parses string integer', () => {
  const result = validateInteger('123');
  assertTrue(result.valid);
  assertEqual(result.value, 123);
});

test('validateInteger rejects float', () => {
  const result = validateInteger(3.14);
  assertFalse(result.valid);
});

test('validateInteger enforces min', () => {
  const result = validateInteger(5, { min: 10 });
  assertFalse(result.valid);
});

test('validateInteger enforces max', () => {
  const result = validateInteger(100, { max: 50 });
  assertFalse(result.valid);
});

test('validateInteger rejects NaN', () => {
  const result = validateInteger('not a number');
  assertFalse(result.valid);
});

// ===========================================
// Boolean Validator Tests
// ===========================================
console.log('\n=== Boolean Validator Tests ===\n');

test('validateBoolean accepts true', () => {
  const result = validateBoolean(true);
  assertTrue(result.valid);
  assertEqual(result.value, true);
});

test('validateBoolean accepts false', () => {
  const result = validateBoolean(false);
  assertTrue(result.valid);
  assertEqual(result.value, false);
});

test('validateBoolean coerces string "true"', () => {
  const result = validateBoolean('true');
  assertTrue(result.valid);
  assertEqual(result.value, true);
});

test('validateBoolean coerces string "false"', () => {
  const result = validateBoolean('false');
  assertTrue(result.valid);
  assertEqual(result.value, false);
});

test('validateBoolean rejects other strings', () => {
  const result = validateBoolean('yes');
  assertFalse(result.valid);
});

// ===========================================
// Enum Validator Tests
// ===========================================
console.log('\n=== Enum Validator Tests ===\n');

test('validateEnum accepts valid value', () => {
  const result = validateEnum('pilot', ['pilot', 'captain', 'engineer']);
  assertTrue(result.valid);
  assertEqual(result.value, 'pilot');
});

test('validateEnum rejects invalid value', () => {
  const result = validateEnum('hacker', ['pilot', 'captain', 'engineer']);
  assertFalse(result.valid);
  assertTrue(result.error.includes('must be one of'));
});

// ===========================================
// Convenience Validators Tests
// ===========================================
console.log('\n=== Convenience Validators Tests ===\n');

test('validators.campaignId validates UUID', () => {
  const result = validators.campaignId('550e8400-e29b-41d4-a716-446655440000');
  assertTrue(result.valid);
});

test('validators.campaignName validates string', () => {
  const result = validators.campaignName('My Campaign');
  assertTrue(result.valid);
});

test('validators.campaignName requires non-empty', () => {
  const result = validators.campaignName('');
  assertFalse(result.valid);
});

test('validators.playerName validates string', () => {
  const result = validators.playerName('Player One');
  assertTrue(result.valid);
});

test('validators.role validates enum', () => {
  const result = validators.role('captain');
  assertTrue(result.valid);
});

test('validators.role rejects invalid role', () => {
  const result = validators.role('hacker');
  assertFalse(result.valid);
});

// ===========================================
// Rate Limiter Tests
// ===========================================
console.log('\n=== Rate Limiter Tests ===\n');

test('rate limiter allows initial requests', () => {
  const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
  const result = limiter.check('socket1');
  assertTrue(result.allowed);
  assertEqual(result.remaining, 4);
});

test('rate limiter tracks request count', () => {
  const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
  limiter.check('socket2');
  limiter.check('socket2');
  const result = limiter.check('socket2');
  assertTrue(result.allowed);
  assertEqual(result.remaining, 2);
});

test('rate limiter blocks after exceeding limit', () => {
  const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000, blockDurationMs: 1000 });
  limiter.check('socket3');
  limiter.check('socket3');
  limiter.check('socket3');
  const result = limiter.check('socket3');
  assertFalse(result.allowed);
  assertTrue(result.retryAfter > 0);
});

test('rate limiter tracks separate sockets independently', () => {
  const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
  limiter.check('socketA');
  limiter.check('socketA');
  limiter.check('socketA');
  limiter.check('socketA'); // Over limit

  const result = limiter.check('socketB'); // Different socket
  assertTrue(result.allowed);
  assertEqual(result.remaining, 2);
});

test('rate limiter clear removes tracking', () => {
  const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
  limiter.check('socket4');
  limiter.check('socket4');
  limiter.clear('socket4');

  const result = limiter.check('socket4');
  assertTrue(result.allowed);
  assertEqual(result.remaining, 2);
});

test('rate limiter reset clears all', () => {
  const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
  limiter.check('socket5');
  limiter.check('socket6');
  limiter.reset();

  const stats = limiter.getStats();
  assertEqual(stats.trackedSockets, 0);
  assertEqual(stats.blockedIPs, 0);
});

// ===========================================
// Object Validator Tests
// ===========================================
console.log('\n=== Object Validator Tests ===\n');

test('validateObject validates multiple fields', () => {
  const data = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Campaign',
    active: true
  };

  const schema = {
    id: { type: 'uuid' },
    name: { type: 'string', required: true, minLength: 1 },
    active: { type: 'boolean' }
  };

  const result = validateObject(data, schema);
  assertTrue(result.valid);
  assertEqual(Object.keys(result.errors).length, 0);
});

test('validateObject collects all errors', () => {
  const data = {
    id: 'invalid',
    name: '',
    count: 'not a number'
  };

  const schema = {
    id: { type: 'uuid' },
    name: { type: 'string', required: true, minLength: 1 },
    count: { type: 'integer' }
  };

  const result = validateObject(data, schema);
  assertFalse(result.valid);
  assertTrue(Object.keys(result.errors).length >= 2);
});

// ===========================================
// Summary
// ===========================================
console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================\n');

process.exit(failed > 0 ? 1 : 0);
