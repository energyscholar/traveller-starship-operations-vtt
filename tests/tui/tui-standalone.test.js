/**
 * TUI Standalone Page + Role-Aware Connect + GM Handlers Tests
 * Phase 9 / C4: Standalone TUI, role-aware tui:connect, GM narration/note
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    if (!process.env.TEST_QUIET) console.log(`  PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('TUI Standalone + Role-Aware + GM Handlers Tests');
console.log('='.repeat(50));

// ─── TASK 1: Standalone page tests ─────────────────────────────

console.log('\n--- Standalone Page ---');

const htmlPath = path.join(__dirname, '../../public/tui/index.html');

test('public/tui/index.html exists', () => {
  assert(fs.existsSync(htmlPath), 'File should exist');
});

test('page loads xterm.js CDN', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('@xterm/xterm@5.5.0'), 'Should load xterm 5.5.0');
  assert(html.includes('@xterm/addon-fit@0.10.0'), 'Should load fit addon 0.10.0');
});

test('page loads socket.io client', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('/socket.io/socket.io.js'), 'Should load socket.io');
});

test('page has terminal container', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('id="terminal-container"'), 'Should have terminal container');
});

test('page has connection status indicator', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('id="status-dot"'), 'Should have status dot');
  assert(html.includes('id="status-text"'), 'Should have status text');
});

test('page has CRT dark background', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('#0a0a1a'), 'Should use CRT background color');
});

test('page has ISS Astral Dawn title', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('ISS Astral Dawn'), 'Should have ship name in title');
});

test('page parses URL params for role', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("params.get('role')"), 'Should parse role param');
});

test('page parses URL params for player', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("params.get('player')"), 'Should parse player param');
});

test('page sends role/player in tui:connect', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("socket.emit('tui:connect', payload)"), 'Should send payload with connect');
});

test('page has back button to operations', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("'/operations'"), 'Should link back to operations');
  assert(html.includes('btn-back'), 'Should have back button');
});

test('page has Escape key handler', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("e.key === 'Escape'"), 'Should handle Escape key');
});

test('page has mobile warning', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('mobile-warning'), 'Should have mobile warning');
});

test('page uses matching terminal theme', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  // Verify key theme colors match web-tui.js
  assert(html.includes("cursor: '#00d4ff'"), 'Should use cyan cursor');
  assert(html.includes("green: '#00ff88'"), 'Should use green accent');
  assert(html.includes("yellow: '#ffdd00'"), 'Should use yellow');
});

test('page handles tui:narration event', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes("'tui:narration'"), 'Should listen for narration events');
  assert(html.includes('NARRATION'), 'Should display narration header');
});

// ─── TASK 2: Navigation link tests ────────────────────────────

console.log('\n--- Navigation Link ---');

const indexPath = path.join(__dirname, '../../public/operations-v2/index.html');

test('operations-v2 has standalone terminal link', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  assert(html.includes('href="/tui"'), 'Should have /tui link');
  assert(html.includes('Standalone Terminal'), 'Should label it Standalone Terminal');
});

test('operations-v2 keeps TUI overlay option', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  assert(html.includes('data-action="openTUI"'), 'Should keep overlay action');
  assert(html.includes('TUI Overlay'), 'Should label overlay option');
});

// ─── TASK 3: Role-aware tui:connect tests ─────────────────────

console.log('\n--- Role-Aware Connect ---');

const { WebSocketSession, WebSocketReadline } = require('../../lib/tui/websocket-session');

test('WebSocketSession accepts player option', () => {
  const mockSocket = { on: () => {}, emit: () => {}, off: () => {} };
  const session = new WebSocketSession(mockSocket, { player: 'Marina' });
  assertEqual(session.player, 'Marina', 'Player should be set');
});

test('WebSocketSession accepts role option', () => {
  const mockSocket = { on: () => {}, emit: () => {}, off: () => {} };
  const session = new WebSocketSession(mockSocket, { role: 'pilot' });
  assertEqual(session.role, 'pilot', 'Role should be set');
});

test('WebSocketSession defaults to null identity', () => {
  const mockSocket = { on: () => {}, emit: () => {}, off: () => {} };
  const session = new WebSocketSession(mockSocket);
  assertEqual(session.player, null, 'Player should default to null');
  assertEqual(session.role, null, 'Role should default to null');
});

test('tui:connect handler accepts payload with role', () => {
  // Verify the handler code parses role from payload
  const handlerCode = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(handlerCode.includes("data.role"), 'Should read role from payload');
  assert(handlerCode.includes("data.player"), 'Should read player from payload');
});

test('tui:connect passes role to main() as menuOptions', () => {
  const handlerCode = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(handlerCode.includes('menuOptions'), 'Should create menuOptions');
  assert(handlerCode.includes('main(session, menuOptions)'), 'Should pass options to main');
});

test('tui-menu main() accepts options parameter', () => {
  const menuCode = fs.readFileSync(
    path.join(__dirname, '../../bin/tui-menu.js'), 'utf8'
  );
  assert(menuCode.includes('async function main(session, options'), 'Should accept options');
  assert(menuCode.includes('options.role'), 'Should check options.role');
});

test('role-aware connect validates role against ROLES list', () => {
  const menuCode = fs.readFileSync(
    path.join(__dirname, '../../bin/tui-menu.js'), 'utf8'
  );
  assert(menuCode.includes("ROLES.find(r => r.id === options.role)"), 'Should validate role ID');
});

// ─── TASK 4: GM handler tests ─────────────────────────────────

console.log('\n--- GM Handlers ---');

test('gm:narration handler exists in tui.js', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes("'gm:narration'"), 'Should have gm:narration handler');
});

test('gm:narration checks isGM', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  // Check for GM gate in narration handler
  assert(code.includes('opsSession.isGM'), 'Should check isGM');
});

test('gm:narration broadcasts to all TUI sessions', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes('for (const [socketId, session] of tuiSessions'), 'Should iterate sessions');
  assert(code.includes("'tui:narration'"), 'Should emit tui:narration');
});

test('gm:narration requires text', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes("'Narration text required'"), 'Should validate text presence');
});

test('gm:note handler exists in tui.js', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes("'gm:note'"), 'Should have gm:note handler');
});

test('gm:note stores privately (not broadcast)', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes('addLogEntry'), 'Should store via addLogEntry');
  assert(code.includes("'gm:note:ack'"), 'Should ack to sender only');
});

test('gm:note checks isGM', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  // The code has two isGM checks — one for narration, one for note
  const matches = code.match(/opsSession\.isGM/g);
  assert(matches && matches.length >= 2, 'Should check isGM for both handlers');
});

test('gm:note accepts category', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes("data.category"), 'Should read category from payload');
  assert(code.includes("'general'"), 'Should default category to general');
});

test('gm:note guards FK with shipId/campaignId check', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/tui.js'), 'utf8'
  );
  assert(code.includes('opsSession.shipId && opsSession.campaignId'), 'Should check IDs before logging');
});

test('ops:alertStatusChanged event is broadcast-capable', () => {
  // Verify the alert status event exists and can be triggered externally
  const bridgeCode = fs.readFileSync(
    path.join(__dirname, '../../lib/socket-handlers/ops/bridge.js'), 'utf8'
  );
  assert(bridgeCode.includes("'ops:alertStatusChanged'"), 'Should emit alertStatusChanged');
});

// ─── Summary ──────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
if (testsFailed > 0) {
  console.log(`FAILED: ${testsFailed}`);
  process.exit(1);
}
