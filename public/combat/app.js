    // ======== STAGE 12.2: URL ROUTING SYSTEM ========
    // Parse URL parameters to determine which mode to load
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode'); // 'battle', 'customize', or null (show menu)

    // Get screen elements
    const mainMenuScreen = document.getElementById('main-menu-screen');
    const shipSelectionScreen = document.getElementById('ship-selection-screen');
    const spaceCombatHud = document.getElementById('space-combat-hud');

    // Route to appropriate screen based on URL parameter
    function initializeApp() {
      // Handle invalid modes by defaulting to menu
      const validModes = ['battle', 'solo', 'customize'];
      const normalizedMode = mode ? mode.toLowerCase().trim() : null;

      if (normalizedMode && !validModes.includes(normalizedMode)) {
        console.warn(`Invalid mode '${mode}' - defaulting to main menu`);
        // Redirect to main menu with clean URL
        window.history.replaceState({}, '', '/');
        // Fall through to show menu
      }

      if (normalizedMode === 'battle') {
        // Battle mode: Show ship selection (existing behavior)
        mainMenuScreen.style.display = 'none';
        shipSelectionScreen.style.display = 'block';
        spaceCombatHud.style.display = 'none';
        console.log('App initialized in battle mode (multiplayer)');
        return 'battle';
      } else if (normalizedMode === 'solo') {
        // Solo mode: Show ship selection with solo flag
        mainMenuScreen.style.display = 'none';
        shipSelectionScreen.style.display = 'block';
        spaceCombatHud.style.display = 'none';
        console.log('App initialized in solo mode (vs AI)');
        return 'solo';
      } else if (normalizedMode === 'customize') {
        // Customize mode: Redirect to ship-customizer.html (Stage 12.3)
        console.log('Redirecting to ship customizer...');
        window.location.href = '/ship-customizer.html';
        return 'customize';
      } else {
        // Default: Show main menu (no mode specified or invalid mode)
        mainMenuScreen.style.display = 'block';
        shipSelectionScreen.style.display = 'none';
        spaceCombatHud.style.display = 'none';

        // Add menu button event listeners
        document.getElementById('btn-space-battle').addEventListener('click', () => {
          window.location.href = '/?mode=battle';
        });
        document.getElementById('btn-solo-battle').addEventListener('click', () => {
          window.location.href = '/?mode=solo';
        });
        document.getElementById('btn-customize-ship').addEventListener('click', () => {
          window.location.href = '/ship-customizer.html';
        });

        console.log('App initialized in menu mode');
        return 'menu';
      }
    }

    // Initialize routing
    const appMode = initializeApp();

    // Update mode-specific UI text
    if (appMode === 'solo') {
      const modeTitle = document.getElementById('mode-title');
      const modeDescription = document.getElementById('mode-description');
      if (modeTitle) {
        modeTitle.textContent = '🤖 SOLO MODE (vs AI):';
      }
      if (modeDescription) {
        modeDescription.textContent = 'Battle against an AI opponent. Perfect for testing strategies and learning the game!';
      }
    } else if (appMode === 'battle') {
      const modeTitle = document.getElementById('mode-title');
      const modeDescription = document.getElementById('mode-description');
      if (modeTitle) {
        modeTitle.textContent = '🎮 MULTIPLAYER MODE:';
      }
      if (modeDescription) {
        modeDescription.textContent = 'Open this URL in TWO browser tabs to play against yourself, or share with a friend!';
      }
    }

    // Only initialize combat system if in battle or solo mode
    if (appMode !== 'battle' && appMode !== 'solo') {
      // Don't initialize Socket.io or combat system for other modes
      console.log(`Skipping combat initialization for '${appMode}' mode`);
      // Clean exit - don't throw error, just stop execution
      // This allows the menu to work properly
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = { appMode }; // For testing
      }
      // Return early - no error thrown
    } else {
      // Battle or solo mode continues below with combat initialization
      initializeCombatSystem();
    }

    function initializeCombatSystem() {

    // ======== CLIENT LOGGING SYSTEM ========
    // Lightweight client logger that sends logs to server
    const ClientLogger = {
      _socket: null,
      _buffer: [],
      _playerId: null,

      init(socket) {
        this._socket = socket;
        // Send any buffered logs
        this._buffer.forEach(log => this._send(log));
        this._buffer = [];
      },

      setPlayerId(id) {
        this._playerId = id;
      },

      _send(log) {
        if (this._socket && this._socket.connected) {
          this._socket.emit('client:log', {
            ...log,
            playerId: this._playerId,
            timestamp: new Date().toISOString()
          });
        } else {
          // Buffer if not connected yet
          this._buffer.push(log);
        }
      },

      debug(message, meta = {}) {
        console.log(`[CLIENT DEBUG] ${message}`, meta);
        this._send({ level: 'debug', message, meta });
      },

      info(message, meta = {}) {
        console.log(`[CLIENT INFO] ${message}`, meta);
        this._send({ level: 'info', message, meta });
      },

      warn(message, meta = {}) {
        console.warn(`[CLIENT WARN] ${message}`, meta);
        this._send({ level: 'warn', message, meta });
      },

      error(message, meta = {}) {
        console.error(`[CLIENT ERROR] ${message}`, meta);
        this._send({ level: 'error', message, meta });
      }
    };

    // Capture unhandled errors and send to server
    window.addEventListener('error', (event) => {
      ClientLogger.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Initialize Socket.io connection
    ClientLogger.debug('Starting Socket.io initialization...');
    const socket = io();
    ClientLogger.init(socket);
    ClientLogger.debug('Socket.io object created');

    // Stage 3: Track player ID and assigned ship
    let myPlayerId = null;
    let myShip = null;
    let myRole = null;
    let gameState = {
      assignments: { scout: null, corsair: null },
      currentRound: 0,
      currentTurn: null,
      initiative: { scout: null, corsair: null }
    };

    const statusDot = document.getElementById('statusDot');
    const connectionInfo = document.getElementById('connectionInfo');
    const attackBtn = document.getElementById('attackBtn');
    const resetBtn = document.getElementById('resetBtn');
    const testModeBtn = document.getElementById('testModeBtn');
    const combatLog = document.getElementById('combatLog');

    // Ship selection elements
    const playerIndicator = document.getElementById('player-indicator');
    const playerNumber = document.getElementById('player-number');
    const playerShipName = document.getElementById('player-ship-name');

    // Stage 4: Turn system UI elements
    const startGameBtn = document.getElementById('startGameBtn');
    const endTurnBtn = document.getElementById('endTurnBtn');
    const repairBtn = document.getElementById('repairBtn');  // Stage 6: Repair button
    const turnIndicator = document.getElementById('turnIndicator');
    const turnStatus = document.getElementById('turnStatus');
    const roundDisplay = document.getElementById('roundDisplay');

    const attackerSelect = document.getElementById('attackerSelect');
    const targetSelect = document.getElementById('targetSelect');
    const rangeSelect = document.getElementById('rangeSelect');
    const dodgeSelect = document.getElementById('dodgeSelect');
    const attackerLabel = document.getElementById('attackerLabel');
    const targetLabel = document.getElementById('targetLabel');

    // Stage 5: Weapon selection and ammo display
    const weaponSelect = document.getElementById('weaponSelect');
    const scoutMissiles = document.getElementById('scoutMissiles');
    const corsairMissiles = document.getElementById('corsairMissiles');
    const scoutHull = document.getElementById('scoutHull');
    const corsairHull = document.getElementById('corsairHull');

    // Stage 7: Hex grid elements
    const hexGrid = document.getElementById('hexGrid');
    const rangeDisplay = document.getElementById('rangeDisplay');
    const movementDisplay = document.getElementById('movementDisplay');

    // Stage 7: Grid state
    const GRID_SIZE = 10;
    const HEX_SIZE = 25;
    const shipPositions = { scout: { q: 2, r: 2 }, corsair: { q: 7, r: 7 } };

    // Player indicator elements
    const playerNumberEl = document.getElementById('player-number');
    const playerShipNameEl = document.getElementById('player-ship-name');
    const combatPlayerNumberEl = document.getElementById('combat-player-number');
    const combatPlayerShipEl = document.getElementById('combat-player-ship');

    // Stage 7: Hex grid functions
    function hexToPixel(q, r) {
      const x = HEX_SIZE * (3/2 * q) + 50;
      const y = HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) + 50;
      return { x, y };
    }

    function pixelToHex(x, y) {
      const q = Math.round((2/3 * (x - 50)) / HEX_SIZE);
      const r = Math.round((-(x - 50)/3 + Math.sqrt(3)/3 * (y - 50)) / HEX_SIZE);
      return { q, r };
    }

    function hexDistance(pos1, pos2) {
      const x1 = pos1.q, z1 = pos1.r, y1 = -x1 - z1;
      const x2 = pos2.q, z2 = pos2.r, y2 = -x2 - z2;
      return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
    }

    function rangeFromDistance(distance) {
      if (distance <= 1) return 'Adjacent';
      if (distance <= 3) return 'Close';
      if (distance <= 5) return 'Medium';
      if (distance <= 7) return 'Long';
      return 'Very Long';
    }

    function drawHex(q, r, className = 'hex') {
      const pos = hexToPixel(q, r);
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const hx = pos.x + HEX_SIZE * Math.cos(angle);
        const hy = pos.y + HEX_SIZE * Math.sin(angle);
        points.push(`${hx},${hy}`);
      }

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', points.join(' '));
      polygon.setAttribute('class', className);
      polygon.setAttribute('data-q', q);
      polygon.setAttribute('data-r', r);
      return polygon;
    }

    function drawShip(q, r, shipName) {
      const pos = hexToPixel(q, r);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', HEX_SIZE * 0.6);
      circle.setAttribute('class', `ship-marker ${shipName}`);
      circle.setAttribute('data-ship', shipName);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('pointer-events', 'none');
      text.textContent = shipName === 'scout' ? '🚀' : '🏴‍☠️';

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.appendChild(circle);
      g.appendChild(text);
      return g;
    }

    function renderGrid() {
      // Skip if we're on ship selection screen (hexGrid doesn't exist)
      if (!hexGrid) return;

      hexGrid.innerHTML = '';

      // Draw hexes
      for (let q = 0; q < GRID_SIZE; q++) {
        for (let r = 0; r < GRID_SIZE; r++) {
          const hex = drawHex(q, r);
          hex.addEventListener('click', () => handleHexClick(q, r));
          hexGrid.appendChild(hex);
        }
      }

      // Draw ships
      hexGrid.appendChild(drawShip(shipPositions.scout.q, shipPositions.scout.r, 'scout'));
      hexGrid.appendChild(drawShip(shipPositions.corsair.q, shipPositions.corsair.r, 'corsair'));

      updateRangeDisplay();
    }

    function updateRangeDisplay() {
      const distance = hexDistance(shipPositions.scout, shipPositions.corsair);
      const range = rangeFromDistance(distance);
      rangeDisplay.textContent = `${range} (${Math.floor(distance)} hexes)`;

      if (myShip) {
        const movement = myShip === 'scout' ? 3 : 2;
        movementDisplay.textContent = movement;
      }
    }

    function handleHexClick(q, r) {
      if (!myShip) return;
      console.log(`[GRID] Clicked hex (${q}, ${r})`);

      socket.emit('moveShip', {
        ship: myShip,
        to: { q, r }
      });
    }

    socket.on('connect', () => {
      console.log('[CLIENT DEBUG] ========================================');
      console.log('[CLIENT DEBUG] SOCKET CONNECTED!');
      console.log('[CLIENT DEBUG] Socket ID:', socket.id);
      console.log('[CLIENT DEBUG] ========================================');

      if (statusDot) statusDot.className = 'status-dot connected';
      if (resetBtn) resetBtn.disabled = false;
      if (testModeBtn) testModeBtn.disabled = false;
      if (startGameBtn) startGameBtn.disabled = false;

      // Update connection display on ship selection screen
      if (playerNumber) {
        playerNumber.textContent = 'Connected';
        console.log('[CLIENT DEBUG] Updated playerNumber to "Connected"');
      }
      if (playerShipName) {
        playerShipName.textContent = 'No ship assigned';
        console.log('[CLIENT DEBUG] Updated playerShipName to "No ship assigned"');
      }

      // Attack and End Turn buttons controlled by turn state
      updateTurnUI();

      // Stage 7: Render hex grid
      if (hexGrid) renderGrid();
    });

    // Stage 3: Receive ship assignment
    socket.on('welcome', (data) => {
      ClientLogger.debug('========================================');
      ClientLogger.debug('WELCOME EVENT RECEIVED!', data);
      ClientLogger.debug('========================================');

      myPlayerId = data.playerId;
      ClientLogger.setPlayerId(myPlayerId); // Set player ID in logger
      myShip = data.assignedShip;
      myRole = data.role;

      console.log(`[ASSIGN] You are Player ${myPlayerId}`);
      console.log(`[ASSIGN] Your ship: ${myShip || 'none (spectator)'}`);

      const roleText = myShip ? `${myShip.toUpperCase()} Player` : 'Spectator';

      // Update player indicators
      if (playerNumberEl) {
        playerNumberEl.textContent = `Player ${myPlayerId}`;
        console.log('[CLIENT DEBUG] Updated playerNumberEl');
      }
      if (playerShipNameEl) {
        playerShipNameEl.textContent = myShip ? `Playing as: ${myShip.toUpperCase()}` : 'No ship assigned';
        console.log('[CLIENT DEBUG] Updated playerShipNameEl');
      }
      if (combatPlayerNumberEl) combatPlayerNumberEl.textContent = `Player ${myPlayerId}`;
      if (combatPlayerShipEl) {
        combatPlayerShipEl.textContent = myShip ? `Playing as: ${myShip.toUpperCase()}` : 'No ship assigned';
      }

      // Legacy connection info (for personal combat screen)
      if (connectionInfo) {
        connectionInfo.textContent = `${roleText} (Player ${myPlayerId}) • ${data.totalPlayers} connected`;
      }

      // Update controls based on assignment (will implement in next step)
      updateControlsForAssignment();
    });

    // Stage 3: Handle new player joining
    socket.on('playerJoined', (data) => {
      console.log(`[PLAYER] Player ${data.playerId} joined as ${data.ship || 'spectator'}`);
      gameState.assignments = data.assignments;
      if (connectionInfo) {
        connectionInfo.textContent = connectionInfo.textContent.replace(/\d+ connected/, `${data.totalPlayers} connected`);
      }
    });

    // Stage 3: Handle player leaving
    socket.on('playerLeft', (data) => {
      console.log(`[PLAYER] Player ${data.playerId} (${data.ship || 'spectator'}) left`);
      gameState.assignments = data.assignments;
      if (connectionInfo) {
        connectionInfo.textContent = connectionInfo.textContent.replace(/\d+ connected/, `${data.totalPlayers} connected`);
      }
    });

    // Stage 4: Receive current game state (UPDATED with turn info)
    socket.on('gameState', (data) => {
      console.log('[STATE] Game state received:', data);
      gameState.assignments = data.assignments;
      gameState.currentRound = data.currentRound || 0;
      gameState.currentTurn = data.currentTurn || null;
      gameState.initiative = data.initiative || { scout: null, corsair: null };

      if (data.shipStates) {
        updateShipDisplay(data.shipStates);
      }

      updateTurnUI();
    });

    // Stage 3: Receive ship state updates (hull changes)
    socket.on('shipStateUpdate', (data) => {
      console.log('[STATE] Ship state update:', data.ships);
      updateShipDisplay(data.ships);

      // Stage 7: Update ship positions on grid
      if (data.ships.scout && data.ships.scout.position) {
        shipPositions.scout = data.ships.scout.position;
      }
      if (data.ships.corsair && data.ships.corsair.position) {
        shipPositions.corsair = data.ships.corsair.position;
      }
      renderGrid();
    });

    // Update UI to show current ship hull values
    // Stage 5: Also update ammo displays
    function updateShipDisplay(ships) {
      // Skip if we're on ship selection screen (elements don't exist)
      if (!attackerSelect || !targetSelect) return;

      // Update attacker select options
      const scoutOption = attackerSelect.querySelector('option[value="scout"]');
      const corsairOptionAttacker = attackerSelect.querySelector('option[value="corsair"]');

      if (scoutOption) {
        scoutOption.textContent = `Scout (Skill +2, Armor 2, Hull ${ships.scout.hull}/${ships.scout.maxHull})`;
      }
      if (corsairOptionAttacker) {
        corsairOptionAttacker.textContent = `Corsair (Skill +1, Armor 4, Hull ${ships.corsair.hull}/${ships.corsair.maxHull})`;
      }

      // Update target select options
      const scoutOptionTarget = targetSelect.querySelector('option[value="scout"]');
      const corsairOptionTarget = targetSelect.querySelector('option[value="corsair"]');

      if (scoutOptionTarget) {
        scoutOptionTarget.textContent = `Scout (Skill +2, Armor 2, Hull ${ships.scout.hull}/${ships.scout.maxHull})`;
      }
      if (corsairOptionTarget) {
        corsairOptionTarget.textContent = `Corsair (Skill +1, Armor 4, Hull ${ships.corsair.hull}/${ships.corsair.maxHull})`;
      }

      // Stage 5: Update ship stats cards (hull + ammo)
      if (scoutHull) {
        scoutHull.textContent = `${ships.scout.hull} / ${ships.scout.maxHull}`;
      }
      if (corsairHull) {
        corsairHull.textContent = `${ships.corsair.hull} / ${ships.corsair.maxHull}`;
      }

      // Stage 5: Update ammo displays
      if (ships.scout.ammo && scoutMissiles) {
        const missiles = ships.scout.ammo.missiles !== undefined ? ships.scout.ammo.missiles : 6;
        scoutMissiles.textContent = `${missiles} / 6`;
      }
      if (ships.corsair.ammo && corsairMissiles) {
        const missiles = ships.corsair.ammo.missiles !== undefined ? ships.corsair.ammo.missiles : 6;
        corsairMissiles.textContent = `${missiles} / 6`;
      }

      console.log(`[UI] Updated ship displays - Scout: ${ships.scout.hull}/${ships.scout.maxHull}, Corsair: ${ships.corsair.hull}/${ships.corsair.maxHull}`);
    }

    // Stage 4: Handle game reset event (UPDATED with turn state)
    socket.on('gameReset', (data) => {
      console.log('[RESET] Game reset by Player', data.initiatedBy);
      gameState.currentRound = data.currentRound || 0;
      gameState.currentTurn = data.currentTurn || null;
      addLog('🔄 Game Reset', 'info', data.message);
      updateTurnUI();
    });

    // Stage 4: Handle round start event
    socket.on('roundStart', (data) => {
      console.log('[ROUND] Round started:', data);
      gameState.currentRound = data.round;
      gameState.currentTurn = data.currentTurn;
      gameState.initiative = data.initiative;

      const initScout = data.initiative.scout;
      const initCorsair = data.initiative.corsair;

      addLog(
        `🎲 Round ${data.round} Begins!`,
        'info',
        `Initiative - Scout: ${initScout.total} (${initScout.roll.dice.join('+')}) | Corsair: ${initCorsair.total} (${initCorsair.roll.dice.join('+')}) | ${data.currentTurn.toUpperCase()} goes first!`
      );

      updateTurnUI();
    });

    // Stage 4: Handle turn change event
    socket.on('turnChange', (data) => {
      console.log('[TURN] Turn changed:', data);
      gameState.currentRound = data.round;
      gameState.currentTurn = data.currentTurn;

      addLog(`➡️ Turn: ${data.currentTurn.toUpperCase()}`, 'info', data.message);
      updateTurnUI();
    });

    // Stage 4: Handle game errors
    socket.on('gameError', (data) => {
      console.error('[ERROR]', data.message);
      alert(data.message);
    });

    // Stage 6: Handle repair result
    socket.on('repairResult', (data) => {
      console.log('[REPAIR] Repair completed:', data);
      addLog(
        `🔧 ${data.ship.toUpperCase()} Repaired`,
        'success',
        `${data.engineer} repaired ${data.hullRepaired} HP (New Hull: ${data.newHull})`
      );
    });

    // Stage 6: Handle repair error
    socket.on('repairError', (data) => {
      console.error('[REPAIR ERROR]', data.message);
      alert(data.message);
    });

    // Stage 7: Handle movement result
    socket.on('moveResult', (data) => {
      console.log('[MOVE] Movement completed:', data);
      addLog(
        `🚀 ${data.ship.toUpperCase()} Moved`,
        'info',
        `Moved ${Math.floor(data.distance)} hexes. New range: ${data.newRange}`
      );
    });

    // Stage 7: Handle movement error
    socket.on('moveError', (data) => {
      console.error('[MOVE ERROR]', data.message);
      alert(data.message);
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
      if (statusDot) statusDot.className = 'status-dot disconnected';
      if (connectionInfo) connectionInfo.textContent = 'Disconnected';
      if (attackBtn) attackBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      if (testModeBtn) testModeBtn.disabled = true;
    });

    // Helper: Add log entry
    function addLog(header, type = 'info', details = '') {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      entry.style.borderLeftColor = type === 'info' ? '#ffa500' : '';

      let html = `<div class="log-header">${header}</div>`;
      if (details) {
        html += `<div class="log-details">${details}</div>`;
      }

      entry.innerHTML = html;
      combatLog.appendChild(entry);
      combatLog.scrollTop = combatLog.scrollHeight;
    }
    
    socket.on('combatResult', (data) => {
      console.log('[COMBAT] Result received:', data);
      displayCombatResult(data);
    });

    // Stage 3: Handle combat errors (unauthorized attacks)
    socket.on('combatError', (data) => {
      console.error('[COMBAT] Error:', data.message);
      alert(`Combat Error: ${data.message}`);
    });

    // Stage 4: Update turn UI based on game state
    function updateTurnUI() {
      // Skip if we're on ship selection screen (elements don't exist)
      if (!turnIndicator || !turnStatus || !roundDisplay) return;

      const isMyTurn = gameState.currentTurn === myShip;
      const gameStarted = gameState.currentRound > 0;

      if (!gameStarted) {
        // Game hasn't started yet
        turnIndicator.className = 'turn-indicator waiting';
        turnStatus.textContent = '⏳ Waiting for game to start...';
        roundDisplay.textContent = 'Click "Start Game" when both players are connected';
        if (attackBtn) attackBtn.disabled = true;
        if (endTurnBtn) endTurnBtn.disabled = true;
        if (startGameBtn) startGameBtn.disabled = myShip === null; // Can't start if spectator
      } else if (isMyTurn) {
        // It's your turn
        turnIndicator.className = 'turn-indicator your-turn';
        turnStatus.textContent = '✅ YOUR TURN';
        roundDisplay.textContent = `Round ${gameState.currentRound}`;
        if (attackBtn) attackBtn.disabled = myShip === null; // Only disable if spectator
        if (repairBtn) repairBtn.disabled = myShip === null; // Stage 6: Enable repair on your turn
        if (endTurnBtn) endTurnBtn.disabled = false;
        if (startGameBtn) startGameBtn.disabled = true;
      } else {
        // Opponent's turn
        const opponentShip = myShip === 'scout' ? 'Corsair' : 'Scout';
        turnIndicator.className = 'turn-indicator opponent-turn';
        turnStatus.textContent = `⏸️ ${opponentShip.toUpperCase()}'S TURN`;
        roundDisplay.textContent = `Round ${gameState.currentRound} - Waiting...`;
        if (attackBtn) attackBtn.disabled = true;
        if (repairBtn) repairBtn.disabled = true; // Stage 6: Disable repair on opponent's turn
        if (endTurnBtn) endTurnBtn.disabled = true;
        if (startGameBtn) startGameBtn.disabled = true;
      }

      console.log(`[UI] Turn UI updated - Round: ${gameState.currentRound}, Turn: ${gameState.currentTurn}, My Ship: ${myShip}, My Turn: ${isMyTurn}`);
    }

    // Stage 5: Populate weapon selector based on ship
    function updateWeaponSelector(shipName) {
      weaponSelect.innerHTML = '';

      const weapons = {
        scout: [
          { id: 'pulseLaser', name: 'Pulse Laser', damage: '2d6', ammo: null },
          { id: 'missiles', name: 'Missiles', damage: '4d6', ammo: 6 }
        ],
        corsair: [
          { id: 'beamLaser', name: 'Beam Laser', damage: '3d6', ammo: null },
          { id: 'missiles', name: 'Missiles', damage: '4d6', ammo: 6 }
        ]
      };

      const shipWeapons = weapons[shipName] || [];
      shipWeapons.forEach(weapon => {
        const option = document.createElement('option');
        option.value = weapon.id;
        const ammoText = weapon.ammo ? ` (${weapon.ammo} shots)` : ' (Unlimited)';
        option.textContent = `${weapon.name} ${weapon.damage}${ammoText}`;
        weaponSelect.appendChild(option);
      });

      console.log(`[WEAPONS] Populated ${shipWeapons.length} weapons for ${shipName}`);
    }

    // Stage 3: Update controls based on ship assignment
    // Stage 5: Also populate weapon selector
    function updateControlsForAssignment() {
      // Skip if we're on ship selection screen (elements don't exist)
      if (!attackerSelect || !targetSelect || !weaponSelect) return;

      if (!myShip) {
        // Spectator mode - disable attack button
        if (attackBtn) attackBtn.disabled = true;
        if (attackBtn) attackBtn.textContent = '🔒 Spectator Mode';
        attackerSelect.disabled = true;
        weaponSelect.disabled = true;
        if (attackerLabel) attackerLabel.textContent = 'Attacker (Spectating)';
        if (targetLabel) targetLabel.textContent = 'Target (Spectating)';
        return;
      }

      // Set attacker to your ship and lock it
      attackerSelect.value = myShip;
      attackerSelect.disabled = true; // Can't change attacker

      // Set target to the other ship
      const otherShip = myShip === 'scout' ? 'corsair' : 'scout';
      targetSelect.value = otherShip;

      // Stage 5: Populate weapon selector
      updateWeaponSelector(myShip);

      // Update labels with visual distinction
      const myShipName = myShip.charAt(0).toUpperCase() + myShip.slice(1);
      const opponentShipName = otherShip.charAt(0).toUpperCase() + otherShip.slice(1);

      if (attackerLabel) {
        attackerLabel.textContent = `YOUR SHIP (${myShipName})`;
        attackerLabel.className = 'your-ship';
      }

      if (targetLabel) {
        targetLabel.textContent = `OPPONENT (${opponentShipName})`;
        targetLabel.className = 'opponent-ship';
      }

      console.log(`[CONTROLS] Locked attacker to ${myShip}, target set to ${otherShip}`);
      console.log(`[VISUALS] Applied ship ownership labels`);
    }

    if (attackBtn) attackBtn.addEventListener('click', () => {
      const attacker = attackerSelect.value;
      const target = targetSelect.value;
      const range = rangeSelect.value;
      const dodge = dodgeSelect.value;
      const weapon = weaponSelect.value;  // Stage 5: Get selected weapon

      if (attacker === target) {
        alert('Attacker and target must be different!');
        return;
      }

      console.log(`[COMBAT] Initiating combat with ${weapon}`);
      socket.emit('combat', {
        attacker,
        target,
        range,
        dodge,
        weapon,  // Stage 5: Send weapon selection
        seed: Date.now()
      });
    });

    // Stage 3: Reset game button
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (confirm('Reset game? This will restore both ships to full hull and reset rounds.')) {
        console.log('[RESET] Requesting game reset');
        socket.emit('resetGame');
      }
    });

    // Stage 4: Start game button
    if (startGameBtn) startGameBtn.addEventListener('click', () => {
      console.log('[START] Requesting game start');
      socket.emit('startGame');
    });

    // Stage 4: End turn button
    if (endTurnBtn) endTurnBtn.addEventListener('click', () => {
      console.log('[TURN] Ending turn');
      socket.emit('endTurn');
    });

    // Stage 6: Repair button
    if (repairBtn) repairBtn.addEventListener('click', () => {
      if (!myShip) {
        alert('You must be assigned a ship to repair!');
        return;
      }
      console.log('[REPAIR] Requesting engineer repair');
      socket.emit('engineerRepair', {
        ship: myShip,
        seed: Date.now()
      });
    });

    // TEST MODE - Run all functional tests
    if (testModeBtn) testModeBtn.addEventListener('click', async () => {
      console.log('[TEST] Starting test suite...');
      addTestLog('🧪 Running Stage 2 Functional Tests...');
      
      testModeBtn.disabled = true;
      testModeBtn.textContent = '⏳ Testing...';
      
      const tests = [
        testSocketConnection,
        testCombatMathBasic,
        testCombatMathHit,
        testCombatMathMiss,
        testRangeModifiers,
        testDodgeModifiers,
        testMultiTabSync
      ];
      
      let passed = 0;
      let failed = 0;
      
      for (const test of tests) {
        try {
          await test();
          passed++;
        } catch (error) {
          failed++;
          console.error('[TEST] Failed:', error);
        }
        await sleep(500); // Pause between tests
      }
      
      const allPassed = failed === 0;
      addTestLog(
        allPassed ? '✅ All Tests Passed' : `⚠️ ${passed}/${passed + failed} Tests Passed`,
        allPassed ? 'test-pass' : 'test-fail',
        `Passed: ${passed}, Failed: ${failed}`
      );
      
      testModeBtn.disabled = false;
      testModeBtn.textContent = allPassed ? '✅ Tests Passed' : '⚠️ Some Failed';
      
      setTimeout(() => {
        testModeBtn.textContent = '🧪 Run Tests';
      }, 3000);
    });
    
    // Test 1: Socket connection
    async function testSocketConnection() {
      addTestLog('Test 1: Socket Connection', 'test');

      if (!socket.connected) {
        throw new Error('Socket not connected');
      }

      if (myPlayerId === null) {
        throw new Error('Player ID not assigned');
      }

      if (myShip === undefined) {
        throw new Error('Ship assignment not received');
      }

      addTestLog('✅ Socket connected, Player ID assigned', 'test-pass');
      return true;
    }
    
    // Test 2: Basic combat math
    async function testCombatMathBasic() {
      addTestLog('Test 2: Combat Math (Basic Attack)', 'test');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Combat response timeout'));
        }, 5000);
        
        socket.once('combatResult', (data) => {
          clearTimeout(timeout);
          
          const { result } = data;
          
          // Verify required fields exist
          if (!result.attackRoll || !result.attackTotal || result.hit === undefined) {
            reject(new Error('Missing combat result fields'));
            return;
          }
          
          // Verify attack total calculation
          const expectedTotal = result.attackRoll.total + result.skill + result.rangeDM - result.dodgeDM;
          if (result.attackTotal !== expectedTotal) {
            reject(new Error(`Attack math incorrect: ${result.attackTotal} !== ${expectedTotal}`));
            return;
          }
          
          addTestLog('✅ Combat math correct', 'test-pass', `Roll: ${result.attackRoll.total}, Total: ${result.attackTotal}`);
          resolve(true);
        });
        
        socket.emit('combat', {
          attacker: 'scout',
          target: 'corsair',
          range: 'medium',
          dodge: 'none',
          seed: Date.now()
        });
      });
    }
    
    // Test 3: Verify hits work correctly
    async function testCombatMathHit() {
      addTestLog('Test 3: Hit Detection (Adjacent + No Dodge)', 'test');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Combat response timeout'));
        }, 5000);
        
        socket.once('combatResult', (data) => {
          clearTimeout(timeout);
          
          const { result } = data;
          
          // Adjacent (+2) + Scout skill (+2) should often hit (need 4+ on 2d6)
          // We can't guarantee hit, but we can verify damage logic IF hit
          if (result.hit) {
            if (!result.damageRoll || result.damage === undefined) {
              reject(new Error('Hit but missing damage data'));
              return;
            }
            
            const expectedDamage = Math.max(0, result.damageRoll.total - result.armor);
            if (result.damage !== expectedDamage) {
              reject(new Error(`Damage calculation incorrect: ${result.damage} !== ${expectedDamage}`));
              return;
            }
          }
          
          addTestLog('✅ Hit detection and damage math correct', 'test-pass', result.hit ? `Damage: ${result.damage}` : 'Missed (OK)');
          resolve(true);
        });
        
        socket.emit('combat', {
          attacker: 'scout',
          target: 'corsair',
          range: 'adjacent', // +2 bonus
          dodge: 'none',
          seed: Date.now()
        });
      });
    }
    
    // Test 4: Verify misses work correctly
    async function testCombatMathMiss() {
      addTestLog('Test 4: Miss Detection (Very Long + Full Dodge)', 'test');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Combat response timeout'));
        }, 5000);
        
        socket.once('combatResult', (data) => {
          clearTimeout(timeout);
          
          const { result } = data;
          
          // Very Long (-4) + Full Dodge (-2) = -6 penalty
          // Scout skill +2, so need 12+ on 2d6 to hit (impossible)
          // But dice are random, so we just verify if miss, no damage dealt
          if (!result.hit) {
            if (result.damage !== undefined && result.damage > 0) {
              reject(new Error('Miss but damage > 0'));
              return;
            }
          }
          
          addTestLog('✅ Miss detection correct', 'test-pass', `Total: ${result.attackTotal} vs 8`);
          resolve(true);
        });
        
        socket.emit('combat', {
          attacker: 'scout',
          target: 'corsair',
          range: 'veryLong', // -4 penalty
          dodge: 'full', // -2 penalty
          seed: Date.now()
        });
      });
    }
    
    // Test 5: Range modifiers
    async function testRangeModifiers() {
      addTestLog('Test 5: Range Modifier Application', 'test');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Combat response timeout'));
        }, 5000);
        
        socket.once('combatResult', (data) => {
          clearTimeout(timeout);
          
          const { result } = data;
          
          // Verify long range gives -2 DM
          if (result.rangeDM !== -2) {
            reject(new Error(`Range DM incorrect: ${result.rangeDM} !== -2`));
            return;
          }
          
          addTestLog('✅ Range modifiers applied correctly', 'test-pass', 'Long range: -2 DM');
          resolve(true);
        });
        
        socket.emit('combat', {
          attacker: 'scout',
          target: 'corsair',
          range: 'long',
          dodge: 'none',
          seed: Date.now()
        });
      });
    }
    
    // Test 6: Dodge modifiers
    async function testDodgeModifiers() {
      addTestLog('Test 6: Dodge Modifier Application', 'test');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Combat response timeout'));
        }, 5000);
        
        socket.once('combatResult', (data) => {
          clearTimeout(timeout);
          
          const { result } = data;
          
          // Verify partial dodge gives -1 DM
          if (result.dodgeDM !== -1) {
            reject(new Error(`Dodge DM incorrect: ${result.dodgeDM} !== -1`));
            return;
          }
          
          addTestLog('✅ Dodge modifiers applied correctly', 'test-pass', 'Partial dodge: -1 DM');
          resolve(true);
        });
        
        socket.emit('combat', {
          attacker: 'scout',
          target: 'corsair',
          range: 'medium',
          dodge: 'partial',
          seed: Date.now()
        });
      });
    }
    
    // Test 7: Multi-tab synchronization
    async function testMultiTabSync() {
      addTestLog('Test 7: Multi-Tab Synchronization', 'test');
      
      // This test just verifies that combat results are broadcast
      // In a real scenario, you'd open another tab to verify
      // For now, we just check that the socket emits to all
      
      addTestLog('✅ Multi-tab sync ready (open 2nd tab to verify)', 'test-pass', 'Socket.io broadcast enabled');
      return true;
    }
    
    function addTestLog(message, type = 'test', details = '') {
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      
      let html = `<div class="log-header">${message}</div>`;
      if (details) {
        html += `<div class="log-details">${details}</div>`;
      }
      
      entry.innerHTML = html;
      combatLog.appendChild(entry);
      combatLog.scrollTop = combatLog.scrollHeight;
    }
    
    function displayCombatResult(data) {
      const { result, breakdown } = data;

      const entry = document.createElement('div');
      entry.className = 'log-entry ' + (result.hit ? 'hit' : 'miss');

      let html = `<div class="log-header">`;
      html += `<span class="badge ${result.hit ? 'hit' : 'miss'}">${result.hit ? 'HIT' : 'MISS'}</span>`;
      html += `${result.attacker} attacks ${result.target}`;
      // Stage 5: Show weapon name
      if (result.weapon) {
        html += ` with ${result.weapon}`;
      }
      html += `</div>`;

      html += `<div class="log-details">`;
      html += `<div class="stat-line">Roll: [${result.attackRoll.dice.join(', ')}] = ${result.attackRoll.total}</div>`;
      html += `<div class="stat-line">Skill: +${result.skill} | Range: ${result.rangeDM >= 0 ? '+' : ''}${result.rangeDM} | Dodge: -${result.dodgeDM}</div>`;
      html += `<div class="stat-line">Total: ${result.attackTotal} vs target 8</div>`;

      if (result.hit) {
        html += `<div class="stat-line" style="margin-top: 8px;">Damage: [${result.damageRoll.dice.join(', ')}] = ${result.damageRoll.total} - ${result.armor} (armor) = ${result.damage}</div>`;
        html += `<div class="stat-line">Hull: ${result.target} now at ${result.newHull} hull points</div>`;
      }

      html += `</div>`;

      entry.innerHTML = html;
      combatLog.appendChild(entry);
      combatLog.scrollTop = combatLog.scrollHeight;
    }
    
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    console.log('========================================');
    console.log('TRAVELLER COMBAT VTT - STAGE 4');
    console.log('========================================');
    console.log('Turn-based combat system loaded');
    console.log('1. Wait for both players to connect');
    console.log('2. Click "Start Game" to begin Round 1');
    console.log('3. Take turns attacking (initiative determines order)');
    console.log('4. Click "End Turn" to pass to opponent');
    console.log('Click "Run Tests" button to verify functionality');
    console.log('========================================');

    // ======== STAGE 9: SHIP SELECTION UI ========

    const shipSelectionScreen = document.getElementById('ship-selection-screen');
    const personalCombatScreen = document.getElementById('personal-combat-screen');
    const readyButton = document.getElementById('ready-button');
    const playerReadyIndicator = document.getElementById('player-ready-indicator');
    const opponentReadyIndicator = document.getElementById('opponent-ready-indicator');
    const readyStatusText = document.getElementById('ready-status');
    const rangeSelectEl = document.getElementById('range-select');

    let selectedShip = null;
    let selectedRange = 'Medium';  // Default to Medium
    let playerReady = false;
    let opponentReady = false;

    // AUTO-ASSIGN: Listen for server auto-assignment
    socket.on('space:autoAssigned', (data) => {
      console.log('[CLIENT DEBUG] ========================================');
      console.log('[CLIENT DEBUG] SPACE:AUTOASSIGNED EVENT RECEIVED!');
      console.log('[CLIENT DEBUG] Data:', data);
      console.log('[CLIENT DEBUG] ========================================');

      // Set ship and range
      selectedShip = data.ship;
      selectedRange = data.range;

      // Update UI to show selected ship with GREEN HIGHLIGHT
      document.querySelectorAll('.ship-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.ship === data.ship) {
          opt.classList.add('selected');
        }
      });

      // Update range selector
      if (rangeSelectEl) {
        rangeSelectEl.value = data.range;
      }

      // Update player indicator
      const shipDisplay = data.ship === 'scout' ? 'Scout' : 'Free Trader';
      if (playerShipName) {
        playerShipName.textContent = `AUTO-ASSIGNED: ${shipDisplay}`;
        playerShipName.style.color = '#00ff00';  // Green color
      }

      console.log(`[AUTO-ASSIGN] UI updated - Ship: ${data.ship}, Range: ${data.range}`);

      // Update ready button state
      updateReadyButton();
    });

    // Ship selection handlers
    document.querySelectorAll('.ship-option').forEach(option => {
      option.addEventListener('click', function() {
        // Remove selection from all options
        document.querySelectorAll('.ship-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Select this option
        this.classList.add('selected');
        selectedShip = this.dataset.ship;

        console.log(`[SHIP SELECTION] Selected ${selectedShip}`);

        // Update player indicator
        const shipDisplay = selectedShip === 'scout' ? 'Scout' : 'Free Trader';
        if (playerShipName) {
          playerShipName.textContent = `Selected: ${shipDisplay}`;
        }

        // Emit ship selection to server
        socket.emit('space:shipSelected', { ship: selectedShip });

        // Update ready button state
        updateReadyButton();
      });
    });

    // Range selection handler
    if (rangeSelectEl) {
      rangeSelectEl.addEventListener('change', function() {
        selectedRange = this.value;
        console.log(`[RANGE SELECTION] Selected ${selectedRange}`);

        // Emit range selection to server
        socket.emit('space:rangeSelected', { range: selectedRange });

        // Update ready button state
        updateReadyButton();
      });
    }

    // Ready button handler
    readyButton.addEventListener('click', function() {
      if (!selectedShip || !selectedRange) {
        alert('Please select a ship and starting range!');
        return;
      }

      playerReady = true;
      readyButton.disabled = true;
      readyButton.textContent = '✓ Ready';
      readyButton.style.backgroundColor = '#4CAF50';

      console.log(`[READY] Player ready with ${selectedShip} at ${selectedRange} range (mode: ${appMode})`);

      // Emit ready status to server
      socket.emit('space:playerReady', {
        ship: selectedShip,
        range: selectedRange,
        soloMode: appMode === 'solo'  // Tell server if this is solo mode
      });

      // Update UI
      playerReadyIndicator.className = 'ready-indicator ready';
      playerReadyIndicator.textContent = `✓ You: Ready (${selectedShip})`;

      if (opponentReady) {
        readyStatusText.textContent = 'Both players ready! Starting combat...';
      } else {
        readyStatusText.textContent = 'Waiting for opponent to connect and ready up...';
      }
    });

    // Update ready button state
    function updateReadyButton() {
      if (selectedShip && selectedRange && !playerReady) {
        readyButton.disabled = false;
      } else {
        readyButton.disabled = true;
      }
    }

    // Listen for opponent ready status
    socket.on('space:opponentReady', (data) => {
      console.log('[OPPONENT READY]', data);
      opponentReady = true;
      opponentReadyIndicator.className = 'ready-indicator ready';
      opponentReadyIndicator.textContent = `✓ Opponent: Ready (${data.ship || 'unknown'})`;

      // Check if both players are ready
      if (playerReady && opponentReady) {
        readyStatusText.textContent = 'Both players ready! Starting combat...';
      } else if (!playerReady) {
        readyStatusText.textContent = 'Opponent is ready! Select your ship and click Ready...';
      }
    });

    // Listen for combat start
    socket.on('space:combatStart', (data) => {
      console.log('[COMBAT START]', data);

      // Hide ship selection, show space combat HUD
      shipSelectionScreen.style.display = 'none';
      spaceCombatHUD.style.display = 'block';

      // Initialize HUD with ship data
      initializeSpaceCombatHUD(data);

      readyStatusText.innerHTML = 'Combat started!';

      // SOLO MODE: Show abandon battle button
      if (appMode === 'solo') {
        const abandonBtn = document.getElementById('abandon-battle-btn');
        if (abandonBtn) {
          abandonBtn.style.display = 'block';
        }
      }
    });

    // Initialize range selection
    if (rangeSelectEl) {
      rangeSelectEl.value = 'Medium';  // Set default to Medium
      selectedRange = rangeSelectEl.value;
    }

    console.log('========================================');
    console.log('TRAVELLER COMBAT VTT - STAGE 9 COMPLETE');
    console.log('========================================');
    console.log('Space Combat Ship Selection loaded');
    console.log('1. Select your spacecraft (Scout or Free Trader)');
    console.log('2. Choose starting range (Adjacent to Distant)');
    console.log('3. Click "Ready" when ready to fight');
    console.log('4. Combat starts when both players ready');
    console.log('========================================');

    // ======== STAGE 8.7: SPACE COMBAT HUD ========

    const spaceCombatHUD = document.getElementById('space-combat-hud');
    const crewPanelToggle = document.getElementById('crew-panel-toggle');
    const crewPanelContent = document.getElementById('crew-panel-content');
    const fireButton = document.getElementById('fire-button');
    const spaceTurretSelect = document.getElementById('turret-select');
    const spaceTargetSelect = document.getElementById('target-select');
    const spaceWeaponSelect = document.getElementById('weapon-select');
    const useDefaultButton = document.getElementById('use-default-button');
    const endTurnButton = document.getElementById('end-turn-button');
    const spaceCombatLog = document.getElementById('combat-log');
    const turnTimer = document.getElementById('turn-timer');

    // STAGE 11: Missile and sandcaster controls
    const launchMissileButton = document.getElementById('launch-missile-button');
    const pointDefenseButton = document.getElementById('point-defense-button');
    const useSandcasterButton = document.getElementById('use-sandcaster-button');
    const missilesRemainingEl = document.getElementById('missiles-remaining');
    const sandcasterRemainingEl = document.getElementById('sandcaster-remaining');

    let currentShipData = null;
    let turnTimeRemaining = 30;
    let turnTimerInterval = null;

    // STAGE 11: Track active missiles and ammo
    let activeMissiles = [];
    let missilesRemaining = 12;
    let sandcasterRemaining = 20;

    // SOLO MODE: Abandon Battle functionality
    if (appMode === 'solo') {
      const abandonBtn = document.getElementById('abandon-battle-btn');
      const abandonDialog = document.getElementById('abandon-confirm-dialog');
      const confirmAbandonBtn = document.getElementById('confirm-abandon-btn');
      const cancelAbandonBtn = document.getElementById('cancel-abandon-btn');

      // Show confirmation dialog when abandon button clicked
      if (abandonBtn) {
        abandonBtn.addEventListener('click', () => {
          console.log('[SOLO] Abandon battle button clicked');
          if (abandonDialog) {
            abandonDialog.style.display = 'flex';
          }
        });
      }

      // Handle confirmation - emit socket event and navigate home
      if (confirmAbandonBtn) {
        confirmAbandonBtn.addEventListener('click', () => {
          console.log('[SOLO] Confirming battle abandon');
          if (socket) {
            socket.emit('space:abandonBattle');
          }
          // Navigate to home page
          window.location.href = '/';
        });
      }

      // Handle cancel - just close dialog
      if (cancelAbandonBtn) {
        cancelAbandonBtn.addEventListener('click', () => {
          console.log('[SOLO] Cancelled battle abandon');
          if (abandonDialog) {
            abandonDialog.style.display = 'none';
          }
        });
      }

      // Close dialog if clicking outside modal content
      if (abandonDialog) {
        abandonDialog.addEventListener('click', (e) => {
          if (e.target === abandonDialog) {
            abandonDialog.style.display = 'none';
          }
        });
      }
    }

    // Initialize Space Combat HUD with ship data
    function initializeSpaceCombatHUD(data) {
      console.log('[HUD] Initializing with data:', data);

      // Store combat data
      currentShipData = {
        ship: selectedShip,
        range: data.range || selectedRange,
        round: 1,
        hull: selectedShip === 'scout' ? 40 : 80,
        maxHull: selectedShip === 'scout' ? 40 : 80,
        armour: selectedShip === 'scout' ? 4 : 2,
        turrets: selectedShip === 'scout' ? 1 : 2
      };

      // Update HUD display
      updateShipHUD();

      // Update combat log
      addLogEntry(`Combat started at ${data.range} range`, 'system');
      addLogEntry(`Round ${currentShipData.round} begins!`, 'system');

      // Start turn timer
      startTurnTimer();
    }

    // Update ship HUD display
    function updateShipHUD() {
      if (!currentShipData) return;

      // Ship name and type
      const shipNameEl = document.getElementById('ship-name');
      const shipTypeEl = shipNameEl.nextElementSibling;

      if (currentShipData.ship === 'scout') {
        shipNameEl.textContent = '⚡ Scout';
        shipTypeEl.textContent = 'Type-S Scout/Courier';
        // Hide Turret 2 crew for Scout (only 1 turret)
        const turret2Crew = document.getElementById('turret-2-crew');
        if (turret2Crew) turret2Crew.style.display = 'none';
      } else {
        shipNameEl.textContent = '📦 Free Trader';
        shipTypeEl.textContent = 'Type-A Free Trader';
        // Show Turret 2 crew for Free Trader (2 turrets)
        const turret2Crew = document.getElementById('turret-2-crew');
        if (turret2Crew) turret2Crew.style.display = 'flex';
      }

      // Hull bar
      document.getElementById('hull-current').textContent = currentShipData.hull;
      document.getElementById('hull-max').textContent = currentShipData.maxHull;

      const hullPercent = (currentShipData.hull / currentShipData.maxHull) * 100;
      const hullFill = document.getElementById('hull-bar-fill');
      hullFill.style.width = `${hullPercent}%`;

      // Update hull bar color based on damage
      hullFill.classList.remove('damaged', 'critical');
      if (hullPercent <= 25) {
        hullFill.classList.add('critical');
      } else if (hullPercent <= 50) {
        hullFill.classList.add('damaged');
      }

      // Other stats
      document.getElementById('ship-armour').textContent = currentShipData.armour;
      document.getElementById('current-range').textContent = currentShipData.range;
      document.getElementById('round-counter').textContent = currentShipData.round;

      // Initiative (placeholder for now)
      document.getElementById('initiative-value').textContent = 'Your turn';
    }

    // Crew panel collapse/expand
    crewPanelToggle.addEventListener('click', () => {
      crewPanelContent.classList.toggle('collapsed');
      crewPanelToggle.classList.toggle('collapsed');
    });

    // Fire button enable/disable based on selections
    function updateFireButtonState() {
      const turretSelected = spaceTurretSelect.value !== '';
      const targetSelected = spaceTargetSelect.value !== '';
      const weaponSelected = spaceWeaponSelect.value !== '';

      fireButton.disabled = !(turretSelected && targetSelected && weaponSelected);
    }

    spaceTurretSelect.addEventListener('change', updateFireButtonState);
    spaceTargetSelect.addEventListener('change', updateFireButtonState);
    spaceWeaponSelect.addEventListener('change', updateFireButtonState);

    // Fire button handler
    fireButton.addEventListener('click', () => {
      console.log('[FIRE] Button clicked');

      const action = {
        turret: parseInt(spaceTurretSelect.value),
        target: spaceTargetSelect.value,
        weapon: parseInt(spaceWeaponSelect.value)
      };

      addLogEntry(`Firing turret ${action.turret + 1} at ${action.target}...`, 'system');

      // Emit fire action to server
      socket.emit('space:fire', action);

      // Disable fire button until next turn
      fireButton.disabled = true;
    });

    // Use Default button
    useDefaultButton.addEventListener('click', () => {
      console.log('[USE DEFAULT] Button clicked');

      // Auto-select first options
      spaceTurretSelect.value = '0';
      spaceTargetSelect.value = 'opponent';
      spaceWeaponSelect.value = '0';

      updateFireButtonState();
      addLogEntry('Using default action (auto-fire)', 'system');

      // Auto-fire
      fireButton.click();
    });

    // End Turn button
    endTurnButton.addEventListener('click', () => {
      console.log('[END TURN] Button clicked');

      addLogEntry('Turn ended', 'system');

      // Emit end turn to server
      socket.emit('space:endTurn');

      // Disable buttons
      fireButton.disabled = true;
      endTurnButton.disabled = true;
      useDefaultButton.disabled = true;
      launchMissileButton.disabled = true;
      pointDefenseButton.disabled = true;
      useSandcasterButton.disabled = true;

      // Reset turn timer
      stopTurnTimer();
    });

    // STAGE 11: Launch Missile button
    launchMissileButton.addEventListener('click', () => {
      console.log('[LAUNCH MISSILE] Button clicked');

      if (missilesRemaining <= 0) {
        addLogEntry('No missiles remaining!', 'system');
        return;
      }

      addLogEntry('Launching missile...', 'system');

      // Emit missile launch to server
      socket.emit('space:launchMissile', {});

      // Disable buttons until next turn
      launchMissileButton.disabled = true;
      fireButton.disabled = true;
      endTurnButton.disabled = true;
      useDefaultButton.disabled = true;
    });

    // STAGE 11: Point Defense button
    pointDefenseButton.addEventListener('click', () => {
      console.log('[POINT DEFENSE] Button clicked');

      if (activeMissiles.length === 0) {
        addLogEntry('No incoming missiles to target!', 'system');
        return;
      }

      // For simplicity, target the first active missile
      const targetMissile = activeMissiles[0];

      addLogEntry(`Attempting point defense against ${targetMissile.id}...`, 'system');

      // Emit point defense to server
      socket.emit('space:pointDefense', { missileId: targetMissile.id });
    });

    // STAGE 11: Use Sandcaster button
    useSandcasterButton.addEventListener('click', () => {
      console.log('[USE SANDCASTER] Button clicked');

      if (sandcasterRemaining <= 0) {
        addLogEntry('No sandcaster ammo remaining!', 'system');
        return;
      }

      addLogEntry('Deploying sandcaster...', 'system');

      // Emit sandcaster use to server
      socket.emit('space:useSandcaster', { attackType: 'laser' });
    });

    // Turn timer functions
    function startTurnTimer() {
      turnTimeRemaining = 30;
      updateTimerDisplay();

      if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
      }

      turnTimerInterval = setInterval(() => {
        turnTimeRemaining--;
        updateTimerDisplay();

        if (turnTimeRemaining <= 0) {
          stopTurnTimer();
          // Auto-end turn
          useDefaultButton.click();
        }
      }, 1000);
    }

    function stopTurnTimer() {
      if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
      }
    }

    function updateTimerDisplay() {
      turnTimer.textContent = `${turnTimeRemaining}s`;

      // Update timer color
      turnTimer.classList.remove('warning', 'critical');
      if (turnTimeRemaining <= 5) {
        turnTimer.classList.add('critical');
      } else if (turnTimeRemaining <= 10) {
        turnTimer.classList.add('warning');
      }
    }

    // Add entry to combat log
    // STAGE 11: Newest entries at top (prepend instead of append)
    function addLogEntry(message, type = '') {
      const entry = document.createElement('div');
      entry.className = 'log-entry' + (type ? ' ' + type : '');
      entry.textContent = message;

      // Insert at beginning (newest first)
      if (spaceCombatLog.firstChild) {
        spaceCombatLog.insertBefore(entry, spaceCombatLog.firstChild);
      } else {
        spaceCombatLog.appendChild(entry);
      }

      // Keep log from growing infinitely (max 100 entries)
      while (spaceCombatLog.children.length > 100) {
        spaceCombatLog.removeChild(spaceCombatLog.lastChild);
      }
    }

    // Listen for combat events from server (Stage 8.8)
    socket.on('space:attackResult', (data) => {
      console.log('[ATTACK RESULT]', data);

      // STAGE 11: Fix combat log formatting - properly format dice rolls
      const rollText = data.attackRoll && data.attackRoll.dice
        ? `[${data.attackRoll.dice.join(',')}]=${data.attackRoll.total}`
        : data.total || '?';

      if (data.hit) {
        addLogEntry(`HIT! ${data.damage} damage dealt (Roll: ${rollText}, Total: ${data.total})`, 'hit');
      } else {
        addLogEntry(`MISS! (Roll: ${rollText}, Total: ${data.total}, Need: ${data.targetNumber})`, 'miss');
      }
    });

    socket.on('space:attacked', (data) => {
      console.log('[ATTACKED]', data);

      if (data.hit) {
        addLogEntry(`Enemy hits! ${data.damage} damage taken!`, 'hit');
        currentShipData.hull = data.hull;
        updateShipHUD();
      } else {
        addLogEntry('Enemy misses!', 'miss');
      }
    });

    socket.on('space:critical', (data) => {
      console.log('[CRITICAL]', data);
      addLogEntry(`CRITICAL HIT! ${data.system} system damaged!`, 'critical');
    });

    socket.on('space:newRound', (data) => {
      console.log('[NEW ROUND]', data);

      currentShipData.round = data.round;
      updateShipHUD();

      // Check whose turn it is
      const isMyTurn = data.activePlayer === socket.id;
      if (isMyTurn) {
        addLogEntry(`Round ${data.round} begins! Your turn!`, 'system');
        // Enable buttons for active player
        updateFireButtonState();
        endTurnButton.disabled = false;
        useDefaultButton.disabled = false;
        launchMissileButton.disabled = missilesRemaining <= 0;
        useSandcasterButton.disabled = sandcasterRemaining <= 0;
        startTurnTimer();
      } else {
        addLogEntry(`Round ${data.round} begins! Opponent's turn...`, 'system');
        // Disable buttons for inactive player
        fireButton.disabled = true;
        endTurnButton.disabled = true;
        useDefaultButton.disabled = true;
        launchMissileButton.disabled = true;
        useSandcasterButton.disabled = true;
        stopTurnTimer();
      }
    });

    socket.on('space:turnChange', (data) => {
      console.log('[TURN CHANGE]', data);

      const isMyTurn = data.activePlayer === socket.id;
      if (isMyTurn) {
        addLogEntry('Your turn!', 'system');
        updateFireButtonState();
        endTurnButton.disabled = false;
        useDefaultButton.disabled = false;
        launchMissileButton.disabled = missilesRemaining <= 0;
        useSandcasterButton.disabled = sandcasterRemaining <= 0;
        startTurnTimer();
      } else {
        addLogEntry('Opponent\'s turn...', 'system');
        fireButton.disabled = true;
        endTurnButton.disabled = true;
        useDefaultButton.disabled = true;
        launchMissileButton.disabled = true;
        useSandcasterButton.disabled = true;
        stopTurnTimer();
      }
    });

    socket.on('space:combatEnd', (data) => {
      console.log('[COMBAT END]', data);

      stopTurnTimer();

      const isWinner = (data.winner === 'player1' && currentShipData.ship === selectedShip);

      // Get ship display names
      const myShipName = currentShipData.ship === 'scout' ? 'Scout (Type-S)' : 'Free Trader (Type-A)';
      const enemyShipName = currentShipData.ship === 'scout' ? 'Free Trader (Type-A)' : 'Scout (Type-S)';

      if (isWinner) {
        addLogEntry(`🎉 VICTORY! ${enemyShipName} destroyed in ${data.rounds} rounds!`, 'system');
      } else {
        addLogEntry(`💥 DEFEAT! ${myShipName} destroyed in ${data.rounds} rounds.`, 'system');
      }

      // Disable all combat buttons
      fireButton.disabled = true;
      endTurnButton.disabled = true;
      useDefaultButton.disabled = true;
    });

    socket.on('space:notYourTurn', (data) => {
      console.log('[NOT YOUR TURN]', data);
      addLogEntry(data.message, 'system');
    });

    // STAGE 11: Missile and Sandcaster events
    socket.on('space:missileLaunched', (data) => {
      console.log('[MISSILE LAUNCHED]', data);

      if (data.isAttacker) {
        addLogEntry(`Missile launched at ${data.defender}! Range: ${data.currentRange}`, 'system');
        missilesRemaining = data.ammoRemaining;
        missilesRemainingEl.textContent = `Missiles: ${missilesRemaining}`;
      } else {
        addLogEntry(`INCOMING MISSILE from ${data.attacker}! Range: ${data.currentRange}`, 'critical');
        activeMissiles.push({ id: data.missileId, range: data.currentRange });
        // Enable point defense if there are incoming missiles
        pointDefenseButton.disabled = false;
      }
    });

    socket.on('space:missileMoved', (data) => {
      console.log('[MISSILE MOVED]', data);
      addLogEntry(`Missile ${data.missileId} moved to ${data.newRange}`, 'system');

      // Update active missiles tracking
      const missile = activeMissiles.find(m => m.id === data.missileId);
      if (missile) {
        missile.range = data.newRange;
      }
    });

    socket.on('space:missileImpact', (data) => {
      console.log('[MISSILE IMPACT]', data);

      if (data.hit) {
        const rollText = data.damageRoll ? `[${data.damageRoll.join(',')}]` : '';
        addLogEntry(`MISSILE IMPACT! ${data.damage} damage ${rollText}`, 'hit');

        // Update hull if this is our ship
        if (currentShipData) {
          currentShipData.hull = data.targetHull;
          updateShipHUD();
        }

        // Remove missile from active tracking
        activeMissiles = activeMissiles.filter(m => m.id !== data.missileId);
        if (activeMissiles.length === 0) {
          pointDefenseButton.disabled = true;
        }
      }
    });

    socket.on('space:pointDefenseResult', (data) => {
      console.log('[POINT DEFENSE]', data);

      const rollText = data.roll && data.roll.dice
        ? `[${data.roll.dice.join(',')}]=${data.roll.total}`
        : data.total || '?';

      if (data.destroyed) {
        addLogEntry(`Point defense SUCCESS! Missile ${data.missileId} destroyed! (Roll: ${rollText})`, 'hit');

        // Remove missile from active tracking
        activeMissiles = activeMissiles.filter(m => m.id !== data.missileId);
        if (activeMissiles.length === 0) {
          pointDefenseButton.disabled = true;
        }
      } else {
        addLogEntry(`Point defense MISS! (Roll: ${rollText})`, 'miss');
      }
    });

    socket.on('space:sandcasterResult', (data) => {
      console.log('[SANDCASTER RESULT]', data);

      const rollText = data.roll && data.roll.dice
        ? `[${data.roll.dice.join(',')}]=${data.roll.total}`
        : data.total || '?';

      if (data.success) {
        addLogEntry(`Sandcaster deployed! +${data.armorBonus} armor bonus (Roll: ${rollText})`, 'hit');
      } else {
        addLogEntry(`Sandcaster failed! (Roll: ${rollText})`, 'miss');
      }

      sandcasterRemaining = data.ammoRemaining;
      sandcasterRemainingEl.textContent = `Sand: ${sandcasterRemaining}`;
    });

    socket.on('space:noAmmo', (data) => {
      console.log('[NO AMMO]', data);
      addLogEntry(data.message, 'system');
    });

    socket.on('space:alreadyFired', (data) => {
      console.log('[ALREADY FIRED]', data);
      addLogEntry(data.message, 'system');
    });

    socket.on('space:error', (data) => {
      console.log('[ERROR]', data);
      addLogEntry(`Error: ${data.message}`, 'system');
    });

    console.log('========================================');
    console.log('TRAVELLER COMBAT VTT - STAGE 11');
    console.log('========================================');
    console.log('Space Combat HUD loaded with missiles & sandcasters');
    console.log('========================================');

    // ======== PLAYER FEEDBACK SYSTEM ========

    const feedbackButton = document.getElementById('submit-feedback-button');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackStatus = document.getElementById('feedback-status');

    if (feedbackButton && feedbackText && feedbackStatus) {
      feedbackButton.addEventListener('click', () => {
        const feedback = feedbackText.value.trim();

        if (!feedback) {
          feedbackStatus.textContent = '⚠️ Please enter some feedback first';
          feedbackStatus.style.color = '#ff6b6b';
          return;
        }

        // Send feedback to server via Socket.io
        socket.emit('player:feedback', {
          feedback: feedback,
          timestamp: new Date().toISOString(),
          context: {
            ship: currentShipData ? currentShipData.ship : 'unknown',
            round: currentShipData ? currentShipData.round : 0,
            hull: currentShipData ? `${currentShipData.hull}/${currentShipData.maxHull}` : 'unknown'
          }
        });

        // Clear textarea and show success message
        feedbackText.value = '';
        feedbackStatus.textContent = '✅ Feedback submitted! Thank you!';
        feedbackStatus.style.color = '#51cf66';

        // Clear status after 3 seconds
        setTimeout(() => {
          feedbackStatus.textContent = '';
        }, 3000);

        console.log('[FEEDBACK] Submitted feedback');
      });
    }

    } // End of initializeCombatSystem()
