/**
 * TUI Session Tests
 *
 * Tests for TUI session abstraction:
 * - TUISession single listener enforcement
 * - ProcessSession I/O with mock streams
 * - sanitizeUserString escape sequence stripping
 */

const { EventEmitter } = require('events');
const { TUISession } = require('../../lib/tui/session');
const { ProcessSession } = require('../../lib/tui/process-session');
const { sanitizeUserString } = require('../../lib/tui/ansi-utils');

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

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy value, got "${value}"`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy value, got "${value}"`);
  }
}

function assertThrows(fn, expectedMsg, msg = '') {
  let threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
    if (expectedMsg && !err.message.includes(expectedMsg)) {
      throw new Error(`${msg} Expected error containing "${expectedMsg}", got "${err.message}"`);
    }
  }
  if (!threw) {
    throw new Error(`${msg} Expected function to throw`);
  }
}

/**
 * Mock stdin for testing ProcessSession
 */
class MockReadable extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this._rawMode = false;
    this._paused = false;
    this._encoding = null;
  }

  setRawMode(on) {
    this._rawMode = on;
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  setEncoding(enc) {
    this._encoding = enc;
  }
}

/**
 * Mock stdout for testing ProcessSession
 */
class MockWritable {
  constructor() {
    this.data = '';
  }

  write(str) {
    this.data += str;
  }

  clear() {
    this.data = '';
  }
}

/**
 * Concrete TUISession for testing base class
 */
class TestSession extends TUISession {
  constructor() {
    super();
    this._registered = [];
    this._output = '';
  }

  write(str) {
    this._output += str;
  }

  _registerInput(callback) {
    this._registered.push(callback);
  }

  _unregisterInput(callback) {
    const idx = this._registered.indexOf(callback);
    if (idx !== -1) {
      this._registered.splice(idx, 1);
    }
  }
}

// ============================================
// TUISession Base Class Tests
// ============================================

console.log('\n=== TUI Session Tests ===\n');
console.log('--- TUISession Base Class ---\n');

test('TUISession enforces single listener', () => {
  const session = new TestSession();
  const cb1 = () => {};
  const cb2 = () => {};

  session.onInput(cb1);
  assertTrue(session.hasInputListener(), 'Should have listener after first registration');

  assertThrows(
    () => session.onInput(cb2),
    'Input listener already registered',
    'Should throw when registering second listener'
  );
});

test('TUISession allows listener after removal', () => {
  const session = new TestSession();
  const cb1 = () => {};
  const cb2 = () => {};

  session.onInput(cb1);
  session.removeInput(cb1);
  assertFalse(session.hasInputListener(), 'Should not have listener after removal');

  // Should not throw
  session.onInput(cb2);
  assertTrue(session.hasInputListener(), 'Should have listener after second registration');
});

test('TUISession.close() removes listener', () => {
  const session = new TestSession();
  const cb = () => {};

  session.onInput(cb);
  assertTrue(session.hasInputListener());

  session.close();
  assertFalse(session.hasInputListener(), 'Should not have listener after close');
});

test('TUISession ignores removal of wrong callback', () => {
  const session = new TestSession();
  const cb1 = () => {};
  const cb2 = () => {};

  session.onInput(cb1);
  session.removeInput(cb2); // Wrong callback
  assertTrue(session.hasInputListener(), 'Should still have listener');
});

// ============================================
// ProcessSession Tests
// ============================================

console.log('\n--- ProcessSession I/O ---\n');

test('ProcessSession writes to stdout', () => {
  const mockStdin = new MockReadable();
  const mockStdout = new MockWritable();
  const session = new ProcessSession(mockStdin, mockStdout);

  session.write('Hello, World!');
  assertEqual(mockStdout.data, 'Hello, World!', 'Output mismatch');
});

test('ProcessSession receives input from stdin', () => {
  const mockStdin = new MockReadable();
  const mockStdout = new MockWritable();
  const session = new ProcessSession(mockStdin, mockStdout);

  let received = null;
  session.onInput((data) => {
    received = data;
  });

  mockStdin.emit('data', 'test input');
  assertEqual(received, 'test input', 'Input mismatch');
});

test('ProcessSession setRawMode passes through', () => {
  const mockStdin = new MockReadable();
  const mockStdout = new MockWritable();
  const session = new ProcessSession(mockStdin, mockStdout);

  session.setRawMode(true);
  assertTrue(mockStdin._rawMode, 'Raw mode should be enabled');

  session.setRawMode(false);
  assertFalse(mockStdin._rawMode, 'Raw mode should be disabled');
});

test('ProcessSession pause/resume passes through', () => {
  const mockStdin = new MockReadable();
  const mockStdout = new MockWritable();
  const session = new ProcessSession(mockStdin, mockStdout);

  session.pause();
  assertTrue(mockStdin._paused, 'Should be paused');

  session.resume();
  assertFalse(mockStdin._paused, 'Should be resumed');
});

test('ProcessSession isTTY returns stdin.isTTY', () => {
  const mockStdin = new MockReadable();
  mockStdin.isTTY = true;
  const session = new ProcessSession(mockStdin, new MockWritable());

  assertTrue(session.isTTY(), 'Should return true for TTY');

  mockStdin.isTTY = false;
  assertFalse(session.isTTY(), 'Should return false for non-TTY');
});

test('ProcessSession exposes stdin/stdout getters', () => {
  const mockStdin = new MockReadable();
  const mockStdout = new MockWritable();
  const session = new ProcessSession(mockStdin, mockStdout);

  assertEqual(session.stdin, mockStdin, 'stdin getter mismatch');
  assertEqual(session.stdout, mockStdout, 'stdout getter mismatch');
});

// ============================================
// sanitizeUserString Tests
// ============================================

console.log('\n--- sanitizeUserString ---\n');

test('sanitizeUserString strips CSI sequences', () => {
  const input = 'Hello\x1b[31mRed\x1b[0mWorld';
  const expected = 'HelloRedWorld';
  assertEqual(sanitizeUserString(input), expected);
});

test('sanitizeUserString strips OSC sequences', () => {
  const input = 'Before\x1b]0;Title\x07After';
  const expected = 'BeforeAfter';
  assertEqual(sanitizeUserString(input), expected);
});

test('sanitizeUserString strips raw ESC', () => {
  const input = 'Test\x1bString';
  const expected = 'TestString';
  assertEqual(sanitizeUserString(input), expected);
});

test('sanitizeUserString strips control characters', () => {
  const input = 'Hello\x00\x01\x02World';
  const expected = 'HelloWorld';
  assertEqual(sanitizeUserString(input), expected);
});

test('sanitizeUserString preserves newlines and tabs', () => {
  const input = 'Line1\nLine2\tTabbed';
  const expected = 'Line1\nLine2\tTabbed';
  assertEqual(sanitizeUserString(input), expected);
});

test('sanitizeUserString handles non-string input', () => {
  assertEqual(sanitizeUserString(null), '', 'null should return empty');
  assertEqual(sanitizeUserString(undefined), '', 'undefined should return empty');
  assertEqual(sanitizeUserString(123), '', 'number should return empty');
  assertEqual(sanitizeUserString({}), '', 'object should return empty');
});

test('sanitizeUserString handles empty string', () => {
  assertEqual(sanitizeUserString(''), '');
});

test('sanitizeUserString handles normal text', () => {
  const input = 'Normal text with spaces and punctuation!';
  assertEqual(sanitizeUserString(input), input);
});

// ============================================
// Summary
// ============================================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
