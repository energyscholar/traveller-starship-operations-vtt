/**
 * Broadcast Helpers Tests
 * Tests for shared broadcast helper functions used by socket handlers and TUI
 */

const {
  broadcastStateChange,
  broadcastToVisible,
  notifySocket,
  broadcastToOthers
} = require('../../lib/socket-handlers/broadcast-helpers');

console.log('--- Broadcast Helpers Tests ---\n');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`✓ ${msg}`);
    passed++;
  } else {
    console.log(`✗ ${msg}`);
    failed++;
  }
}

// Mock io object
function createMockIo() {
  const emitted = [];
  return {
    emitted,
    to(room) {
      return {
        emit(event, payload) {
          emitted.push({ room, event, payload });
        }
      };
    },
    sockets: {
      adapter: {
        rooms: new Map()
      },
      sockets: new Map()
    }
  };
}

// Mock socket object
function createMockSocket() {
  const emitted = [];
  const broadcastEmitted = [];
  return {
    emitted,
    broadcastEmitted,
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    to(room) {
      return {
        emit(event, payload) {
          broadcastEmitted.push({ room, event, payload });
        }
      };
    }
  };
}

// --- broadcastStateChange ---

(function testBroadcastStateChangeEmitsToRoom() {
  const io = createMockIo();
  broadcastStateChange(io, 'ops:campaign:abc', 'ops:alertChanged', { level: 'red' });
  assert(io.emitted.length === 1, 'broadcastStateChange emits to room');
  assert(io.emitted[0].room === 'ops:campaign:abc', 'broadcastStateChange uses correct room');
  assert(io.emitted[0].event === 'ops:alertChanged', 'broadcastStateChange uses correct event');
  assert(io.emitted[0].payload.level === 'red', 'broadcastStateChange sends correct payload');
})();

(function testBroadcastStateChangeNullIo() {
  // Should not throw
  broadcastStateChange(null, 'ops:campaign:abc', 'ops:test', {});
  assert(true, 'broadcastStateChange handles null io without throwing');
})();

(function testBroadcastStateChangeNullRoom() {
  const io = createMockIo();
  broadcastStateChange(io, null, 'ops:test', {});
  assert(io.emitted.length === 0, 'broadcastStateChange skips emit when room is null');
})();

// --- broadcastToVisible ---

(function testBroadcastToVisibleWithoutFilter() {
  const io = createMockIo();
  broadcastToVisible(io, 'ops:campaign:abc', 'ops:contactsUpdated', { contacts: [] });
  assert(io.emitted.length === 1, 'broadcastToVisible without filter broadcasts to all');
  assert(io.emitted[0].event === 'ops:contactsUpdated', 'broadcastToVisible sends correct event');
})();

(function testBroadcastToVisibleWithFilter() {
  const io = createMockIo();
  // Set up room with sockets
  const socket1 = createMockSocket();
  socket1.role = 'sensors';
  const socket2 = createMockSocket();
  socket2.role = 'pilot';
  io.sockets.sockets.set('s1', socket1);
  io.sockets.sockets.set('s2', socket2);
  io.sockets.adapter.rooms.set('room1', new Set(['s1', 's2']));

  broadcastToVisible(io, 'room1', 'ops:scan', { data: 1 }, (s) => s.role === 'sensors');

  assert(socket1.emitted.length === 1, 'broadcastToVisible sends to matching socket');
  assert(socket2.emitted.length === 0, 'broadcastToVisible skips non-matching socket');
})();

(function testBroadcastToVisibleNullIo() {
  broadcastToVisible(null, 'room', 'event', {});
  assert(true, 'broadcastToVisible handles null io without throwing');
})();

// --- notifySocket ---

(function testNotifySocketEmits() {
  const socket = createMockSocket();
  notifySocket(socket, 'ops:error', { message: 'test error' });
  assert(socket.emitted.length === 1, 'notifySocket emits to socket');
  assert(socket.emitted[0].event === 'ops:error', 'notifySocket uses correct event');
  assert(socket.emitted[0].payload.message === 'test error', 'notifySocket sends correct payload');
})();

(function testNotifySocketNull() {
  notifySocket(null, 'ops:error', {});
  assert(true, 'notifySocket handles null socket without throwing');
})();

// --- broadcastToOthers ---

(function testBroadcastToOthersEmits() {
  const socket = createMockSocket();
  broadcastToOthers(socket, 'ops:campaign:abc', 'ops:crewUpdate', { crew: [] });
  assert(socket.broadcastEmitted.length === 1, 'broadcastToOthers emits via socket.to');
  assert(socket.broadcastEmitted[0].room === 'ops:campaign:abc', 'broadcastToOthers uses correct room');
  assert(socket.broadcastEmitted[0].event === 'ops:crewUpdate', 'broadcastToOthers uses correct event');
})();

(function testBroadcastToOthersNullSocket() {
  broadcastToOthers(null, 'room', 'event', {});
  assert(true, 'broadcastToOthers handles null socket without throwing');
})();

(function testBroadcastToOthersNullRoom() {
  const socket = createMockSocket();
  broadcastToOthers(socket, null, 'event', {});
  assert(socket.broadcastEmitted.length === 0, 'broadcastToOthers skips emit when room is null');
})();

// Summary
console.log(`\nBroadcast Helpers: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
