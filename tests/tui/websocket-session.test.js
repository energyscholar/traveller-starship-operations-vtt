/**
 * WebSocket Session Tests
 *
 * Tests for WebSocketSession and WebSocketReadline:
 * - Socket event emission
 * - Question/answer flow
 * - Backspace handling
 * - Cleanup
 */

const { EventEmitter } = require('events');
const { WebSocketSession, WebSocketReadline } = require('../../lib/tui/websocket-session');

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
    throw new Error(`${msg} Expected truthy, got "${value}"`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy, got "${value}"`);
  }
}

/**
 * Mock Socket for testing WebSocketSession
 */
class MockSocket extends EventEmitter {
  constructor() {
    super();
    this.emitted = [];
  }

  emit(event, ...args) {
    this.emitted.push({ event, args });
    // Also trigger actual emit for listeners
    return super.emit(event, ...args);
  }

  getEmitted(event) {
    return this.emitted.filter(e => e.event === event);
  }

  getLastEmitted(event) {
    const events = this.getEmitted(event);
    return events[events.length - 1];
  }

  clearEmitted() {
    this.emitted = [];
  }

  off(event, listener) {
    this.removeListener(event, listener);
  }
}

console.log('\n=== WebSocket Session Tests ===\n');

// ============================================
// WebSocketSession Tests
// ============================================

console.log('--- WebSocketSession ---\n');

test('WebSocketSession write emits tui:output', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  session.write('Hello, World!');

  const emitted = socket.getLastEmitted('tui:output');
  assertTrue(emitted, 'Should emit tui:output');
  assertEqual(emitted.args[0], 'Hello, World!');
});

test('WebSocketSession setRawMode emits tui:mode', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  session.setRawMode(true);

  const emitted = socket.getLastEmitted('tui:mode');
  assertTrue(emitted, 'Should emit tui:mode');
  assertTrue(emitted.args[0].raw, 'Should set raw=true');
});

test('WebSocketSession isTTY returns true', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  assertTrue(session.isTTY(), 'Should always be TTY');
});

test('WebSocketSession close emits tui:closed', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  session.close();

  const emitted = socket.getLastEmitted('tui:closed');
  assertTrue(emitted, 'Should emit tui:closed');
});

test('WebSocketSession exposes socket getter', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  assertEqual(session.socket, socket, 'Should expose socket');
});

// ============================================
// WebSocketReadline Tests
// ============================================

console.log('\n--- WebSocketReadline ---\n');

test('WebSocketReadline question writes prompt', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);
  const readline = session.createReadline();

  readline.question('Enter name: ', () => {});

  const emitted = socket.getLastEmitted('tui:output');
  assertTrue(emitted, 'Should emit output');
  assertEqual(emitted.args[0], 'Enter name: ');
});

test('WebSocketReadline question/answer flow works', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);
  const readline = session.createReadline();

  let answer = null;
  readline.question('Name: ', (a) => {
    answer = a;
  });

  // Simulate typing "John" then Enter
  readline.handleInput('John\n');

  assertEqual(answer, 'John', 'Should receive answer');
});

test('WebSocketReadline handles backspace', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);
  const readline = session.createReadline();

  let answer = null;
  readline.question('Name: ', (a) => {
    answer = a;
  });

  // Simulate typing "Johnx" then backspace then Enter
  readline.handleInput('Johnx\x7f\n'); // \x7f is backspace

  assertEqual(answer, 'John', 'Should handle backspace');
});

test('WebSocketReadline emits line event', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);
  const readline = session.createReadline();

  let lineReceived = null;
  readline.on('line', (line) => {
    lineReceived = line;
  });

  readline.handleInput('test line\n');

  assertEqual(lineReceived, 'test line', 'Should emit line');
});

test('WebSocketReadline close prevents further input', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);
  const readline = session.createReadline();

  let answer = null;
  readline.question('Name: ', (a) => {
    answer = a;
  });

  readline.close();
  readline.handleInput('John\n');

  assertEqual(answer, null, 'Should not process input after close');
});

test('WebSocketSession createReadline cleans up previous', () => {
  const socket = new MockSocket();
  const session = new WebSocketSession(socket);

  const rl1 = session.createReadline();
  let closeCalled = false;
  rl1.close = () => { closeCalled = true; };

  session.createReadline();

  assertTrue(closeCalled, 'Should close previous readline');
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
