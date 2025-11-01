// Traveller Combat VTT - Stage 3
// Purpose: Add multiplayer ship assignment and control restrictions
// Time: 2 hours

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const { resolveAttack, formatAttackResult, getAttackBreakdown, SHIPS } = require('./lib/combat');

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

// Track connections and ship assignments
let connectionCount = 0;
const connections = new Map();

// Stage 3: Track persistent ship state (hull, etc.)
const shipState = {
  scout: {
    hull: SHIPS.scout.hull,
    maxHull: SHIPS.scout.maxHull,
    armor: SHIPS.scout.armor,
    pilotSkill: SHIPS.scout.pilotSkill
  },
  corsair: {
    hull: SHIPS.corsair.hull,
    maxHull: SHIPS.corsair.maxHull,
    armor: SHIPS.corsair.armor,
    pilotSkill: SHIPS.corsair.pilotSkill
  }
};

// Helper: Reset ship states to full hull
function resetShipStates() {
  shipState.scout.hull = SHIPS.scout.maxHull;
  shipState.corsair.hull = SHIPS.corsair.maxHull;
  console.log('[GAME] Ship states reset');
}

// Helper: Get available ship for new player
function getAvailableShip() {
  const assignedShips = Array.from(connections.values())
    .map(conn => conn.ship)
    .filter(ship => ship !== null);

  if (!assignedShips.includes('scout')) return 'scout';
  if (!assignedShips.includes('corsair')) return 'corsair';
  return null; // No ships available (spectator mode)
}

// Helper: Get all current assignments
function getShipAssignments() {
  const assignments = { scout: null, corsair: null };
  connections.forEach((conn, socketId) => {
    if (conn.ship === 'scout') assignments.scout = conn.id;
    if (conn.ship === 'corsair') assignments.corsair = conn.id;
  });
  return assignments;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  connectionCount++;
  const connectionId = connectionCount;
  const assignedShip = getAvailableShip();

  connections.set(socket.id, {
    id: connectionId,
    ship: assignedShip,
    connected: Date.now()
  });

  console.log(`[CONNECT] Player ${connectionId} connected (socket: ${socket.id})`);
  console.log(`[ASSIGN] Player ${connectionId} assigned: ${assignedShip || 'spectator'}`);
  console.log(`[STATUS] ${connections.size} players connected`);

  // Send welcome with ship assignment
  socket.emit('welcome', {
    message: `You are Player ${connectionId}`,
    playerId: connectionId,
    assignedShip: assignedShip,
    role: assignedShip || 'spectator',
    totalPlayers: connections.size
  });

  // Broadcast to others that a new player joined
  socket.broadcast.emit('playerJoined', {
    playerId: connectionId,
    ship: assignedShip,
    totalPlayers: connections.size,
    assignments: getShipAssignments()
  });

  // Send current game state to new player
  socket.emit('gameState', {
    assignments: getShipAssignments(),
    totalPlayers: connections.size,
    shipStates: shipState
  });

  // Broadcast updated ship states to all players
  io.emit('shipStateUpdate', {
    ships: shipState
  });
  
  // Handle "hello" messages (Stage 1)
  socket.on('hello', (data) => {
    const timestamp = Date.now();
    console.log(`[HELLO] Tab ${connectionId} says hello`);
    
    io.emit('helloReceived', {
      fromTab: connectionId,
      message: data.message || 'Hello!',
      timestamp: timestamp,
      serverTime: timestamp
    });
  });
  
  // Handle combat action (Stage 3 - UPDATED with authorization)
  socket.on('combat', (data) => {
    const conn = connections.get(socket.id);

    console.log(`[COMBAT] Player ${connectionId} (${conn.ship}) initiates combat`);
    console.log(`[COMBAT] Attacker: ${data.attacker}, Target: ${data.target}`);
    console.log(`[COMBAT] Range: ${data.range}, Dodge: ${data.dodge}`);

    // Stage 3: Validate player can only control their assigned ship
    if (conn.ship !== data.attacker) {
      console.log(`[COMBAT] REJECTED: Player ${connectionId} tried to attack with ${data.attacker} but controls ${conn.ship}`);
      socket.emit('combatError', {
        message: `You can only attack with your assigned ship (${conn.ship || 'none'})`,
        yourShip: conn.ship,
        attemptedShip: data.attacker
      });
      return;
    }

    // Get base ships for stats
    const attackerBase = SHIPS[data.attacker];
    const targetBase = SHIPS[data.target];

    if (!attackerBase || !targetBase) {
      socket.emit('combatError', { message: 'Invalid ship' });
      return;
    }

    // Use current ship state (with current hull values)
    const attackerShip = {
      ...attackerBase,
      hull: shipState[data.attacker].hull
    };
    const targetShip = {
      ...targetBase,
      hull: shipState[data.target].hull
    };

    // Check if target is already destroyed
    if (targetShip.hull <= 0) {
      socket.emit('combatError', {
        message: `${targetBase.name} is already destroyed!`
      });
      return;
    }

    // Resolve combat
    const result = resolveAttack(attackerShip, targetShip, {
      range: data.range,
      dodge: data.dodge,
      seed: data.seed
    });

    const breakdown = getAttackBreakdown(result);

    console.log(`[COMBAT] Result: ${result.hit ? 'HIT' : 'MISS'}`);
    if (result.hit) {
      console.log(`[COMBAT] Damage: ${result.damage} (${targetShip.hull} → ${result.newHull} hull)`);

      // Update persistent ship state
      const oldHull = shipState[data.target].hull;
      shipState[data.target].hull = result.newHull;

      console.log(`[STATE] ${targetBase.name} hull: ${oldHull} → ${shipState[data.target].hull}`);

      // Check for victory
      if (shipState[data.target].hull <= 0) {
        console.log(`[VICTORY] ${attackerBase.name} has destroyed ${targetBase.name}!`);
      }
    }

    // Broadcast result to all tabs
    io.emit('combatResult', {
      fromPlayer: connectionId,
      result: result,
      breakdown: breakdown,
      timestamp: Date.now()
    });

    // Broadcast updated ship states
    io.emit('shipStateUpdate', {
      ships: shipState
    });
  });
  
  // Handle "ping" for latency measurement
  socket.on('ping', (data) => {
    socket.emit('pong', {
      clientTimestamp: data.timestamp,
      serverTimestamp: Date.now()
    });
  });
  
  socket.on('disconnect', () => {
    const conn = connections.get(socket.id);
    const duration = Date.now() - conn.connected;
    const disconnectedShip = conn.ship;

    console.log(`[DISCONNECT] Player ${connectionId} (${disconnectedShip || 'spectator'}) disconnected after ${duration}ms`);
    connections.delete(socket.id);
    console.log(`[STATUS] ${connections.size} players remaining`);

    // Broadcast updated game state to remaining players
    socket.broadcast.emit('playerLeft', {
      playerId: connectionId,
      ship: disconnectedShip,
      totalPlayers: connections.size,
      assignments: getShipAssignments()
    });
  });
});

// REST API endpoint for combat (for testing)
app.post('/api/combat', (req, res) => {
  const { attacker, target, range, dodge } = req.body;
  
  const attackerShip = SHIPS[attacker];
  const targetShip = SHIPS[target];
  
  if (!attackerShip || !targetShip) {
    return res.status(400).json({ error: 'Invalid ship' });
  }
  
  const result = resolveAttack(attackerShip, targetShip, { range, dodge });
  const breakdown = getAttackBreakdown(result);
  
  res.json({
    result,
    breakdown,
    formatted: formatAttackResult(result)
  });
});

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    stage: 3,
    players: connections.size,
    assignments: getShipAssignments(),
    uptime: process.uptime()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('========================================');
  console.log('TRAVELLER COMBAT VTT - STAGE 3');
  console.log('========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('New in Stage 3:');
  console.log('- Ship assignment (1st player = Scout, 2nd = Corsair)');
  console.log('- Control restrictions (can only attack with YOUR ship)');
  console.log('- Real-time player state synchronization');
  console.log('- Connection management for disconnects');
  console.log('');
  console.log('Instructions:');
  console.log('1. Open FIRST tab → You get Scout');
  console.log('2. Open SECOND tab → You get Corsair');
  console.log('3. Each player can only control their ship');
  console.log('4. Combat results sync to both players');
  console.log('========================================');
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
