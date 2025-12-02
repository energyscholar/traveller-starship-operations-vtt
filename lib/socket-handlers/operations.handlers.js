/**
 * Operations Socket Handlers
 * Handles all operations-related socket events:
 * - Campaign management (ops:getCampaigns, ops:createCampaign, etc.)
 * - Player accounts (ops:joinCampaignAsPlayer, ops:selectPlayerSlot, etc.)
 * - Bridge operations (ops:joinBridge, ops:addLogEntry, etc.)
 * - Ship management (ops:selectShip, ops:addShip, etc.)
 */

const operations = require('../operations');
const { socket: socketLog } = require('../logger');
const { updateConnectionActivity } = require('../services/connection-manager');

// Connection tracking for slot reservations and live status
// Maps socketId -> { campaignId, accountId, shipId, role }
const connectedSockets = new Map();
// Maps accountId -> socketId (for slot reservation)
const slotReservations = new Map();

/**
 * Register operations handlers
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 * @param {Object} state - Shared application state (not used currently)
 */
function register(socket, io, state) {
  // Track operations session state for this socket
  let opsSession = {
    campaignId: null,
    accountId: null,
    isGM: false,
    isGuest: false,
    shipId: null,
    role: null
  };

  // Helper: update activity on every event to prevent idle disconnect
  const keepAlive = () => updateConnectionActivity(socket.id);

  // Update activity on any ops: event (use onAny for catch-all)
  socket.onAny((eventName) => {
    if (eventName.startsWith('ops:')) {
      keepAlive();
    }
  });

  // Heartbeat to keep connection alive
  socket.on('ops:ping', () => {
    keepAlive();
    socket.emit('ops:pong');
  });

  // --- PUP-A1: Puppeteer Authentication Handler ---
  // Allows Puppeteer automated tests to authenticate and get test capabilities
  socket.on('ops:puppeteerAuth', (data, callback) => {
    try {
      const { testKey, testMode } = data || {};

      // In development/test mode, accept any testKey that starts with 'test_'
      // In production, this should validate against a secure token
      const isValidKey = testKey && (
        testKey.startsWith('test_') ||
        testKey === process.env.PUPPETEER_TEST_KEY
      );

      if (!isValidKey) {
        socketLog.warn(`[OPS] Puppeteer auth failed: invalid test key from ${socket.id}`);
        if (callback) callback({ success: false, error: 'Invalid test key' });
        return;
      }

      // Mark this socket as a Puppeteer/test connection
      opsSession.isPuppeteer = true;
      opsSession.testMode = testMode || 'standard';

      socketLog.info(`[OPS] Puppeteer authenticated: ${socket.id} (mode: ${opsSession.testMode})`);

      // Return test capabilities
      if (callback) {
        callback({
          success: true,
          capabilities: {
            canResetDb: true,
            canSimulateTime: true,
            canInjectContacts: true,
            canBypassAuth: true
          },
          socketId: socket.id
        });
      }
    } catch (err) {
      socketLog.error('[OPS] Puppeteer auth error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Puppeteer test utility: Get current server state for assertions
  socket.on('ops:puppeteerGetState', (data, callback) => {
    if (!opsSession.isPuppeteer) {
      if (callback) callback({ success: false, error: 'Not authenticated as Puppeteer' });
      return;
    }

    try {
      const { campaignId } = data || {};
      const result = {
        success: true,
        session: { ...opsSession },
        connectedSockets: connectedSockets.size
      };

      if (campaignId) {
        result.campaign = operations.getCampaign(campaignId);
        result.players = operations.getPlayerAccountsByCampaign(campaignId);
        result.ships = operations.getShipsByCampaign(campaignId, true);
      }

      if (callback) callback(result);
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // --- Session Reconnect (Stage 3.5.5) ---
  socket.on('ops:reconnect', (data) => {
    try {
      const { campaignId, accountId, shipId, role, isGM } = data;

      // Validate campaign exists
      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:reconnectFailed', { reason: 'Campaign not found' });
        return;
      }

      if (isGM) {
        // GM reconnect
        opsSession.campaignId = campaignId;
        opsSession.isGM = true;
        socket.join(`ops:campaign:${campaignId}`);
        const players = operations.getPlayerAccountsByCampaign(campaignId);
        const ships = operations.getShipsByCampaign(campaignId, true);
        socket.emit('ops:reconnected', {
          screen: 'gm-setup',
          campaign,
          players,
          ships
        });
        socketLog.info(`[OPS] GM reconnected to campaign: ${campaignId}`);
      } else if (accountId) {
        // Player reconnect
        const account = operations.getPlayerAccount(accountId);
        if (!account) {
          socket.emit('ops:reconnectFailed', { reason: 'Player slot not found' });
          return;
        }

        // Check if slot is reserved by another socket
        if (slotReservations.has(accountId) && slotReservations.get(accountId) !== socket.id) {
          socket.emit('ops:reconnectFailed', { reason: 'Slot in use by another connection' });
          return;
        }

        // Reserve slot and track connection
        slotReservations.set(accountId, socket.id);
        connectedSockets.set(socket.id, {
          campaignId,
          accountId,
          shipId: shipId || null,
          role: role || null
        });

        opsSession.campaignId = campaignId;
        opsSession.accountId = accountId;
        opsSession.shipId = shipId || null;
        opsSession.role = role || null;
        socket.join(`ops:campaign:${campaignId}`);

        if (shipId && role) {
          // Full reconnect to bridge
          const ship = operations.getShip(shipId);
          if (ship) {
            socket.join(`ops:bridge:${shipId}`);
            const crew = operations.getPlayersByShip(shipId);
            const logs = operations.getShipLog(shipId, 50);
            socket.emit('ops:reconnected', {
              screen: 'bridge',
              campaign,
              ship,
              crew,
              role,
              logs
            });
            socketLog.info(`[OPS] Player reconnected to bridge: ${accountId} as ${role}`);
          } else {
            socket.emit('ops:reconnectFailed', { reason: 'Ship not found' });
          }
        } else {
          // Partial reconnect - back to player setup
          const ships = operations.getPartyShips(campaignId);
          socket.emit('ops:reconnected', {
            screen: 'player-setup',
            campaign,
            account,
            ships,
            availableRoles: operations.ALL_ROLES
          });
          socketLog.info(`[OPS] Player reconnected to setup: ${accountId}`);
        }
      } else {
        socket.emit('ops:reconnectFailed', { reason: 'Invalid reconnect data' });
      }
    } catch (error) {
      socket.emit('ops:reconnectFailed', { reason: error.message });
      socketLog.error('[OPS] Error reconnecting:', error);
    }
  });

  // --- Campaign Management (GM) ---

  // Get all campaigns (GM login)
  socket.on('ops:getCampaigns', () => {
    try {
      const campaigns = operations.getAllCampaigns();
      socket.emit('ops:campaigns', { campaigns });
      socketLog.info(`[OPS] Retrieved ${campaigns.length} campaigns`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get campaigns', error: error.message });
      socketLog.error('[OPS] Error getting campaigns:', error);
    }
  });

  // Create new campaign
  socket.on('ops:createCampaign', (data) => {
    try {
      const { name, gmName } = data;
      if (!name || !gmName) {
        socket.emit('ops:error', { message: 'Campaign name and GM name are required' });
        return;
      }
      const campaign = operations.createCampaign(name, gmName);
      socket.emit('ops:campaignCreated', { campaign });
      socketLog.info(`[OPS] Campaign created: ${campaign.id} "${name}" by ${gmName}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to create campaign', error: error.message });
      socketLog.error('[OPS] Error creating campaign:', error);
    }
  });

  // Select campaign (GM loads campaign data)
  socket.on('ops:selectCampaign', (data) => {
    try {
      const { campaignId } = data;
      const fullData = operations.getFullCampaignData(campaignId);
      if (!fullData) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      opsSession.campaignId = campaignId;
      opsSession.isGM = true;
      socket.join(`ops:campaign:${campaignId}`);
      socket.emit('ops:campaignData', fullData);
      socketLog.info(`[OPS] GM selected campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to load campaign', error: error.message });
      socketLog.error('[OPS] Error loading campaign:', error);
    }
  });

  // Update campaign settings
  socket.on('ops:updateCampaign', (data) => {
    try {
      const { campaignId, updates } = data;
      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized to update this campaign' });
        return;
      }
      const campaign = operations.updateCampaign(campaignId, updates);
      io.to(`ops:campaign:${campaignId}`).emit('ops:campaignUpdated', { campaign });
      socketLog.info(`[OPS] Campaign updated: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update campaign', error: error.message });
      socketLog.error('[OPS] Error updating campaign:', error);
    }
  });

  // Stage 5: Set current system from TravellerMap lookup
  socket.on('ops:setCurrentSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set current system' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }
      const { system, uwp, sector, hex } = data;
      if (!system) {
        socket.emit('ops:error', { message: 'System name is required' });
        return;
      }
      // Build display string: "System Name (Sector Hex) UWP"
      const locationDisplay = sector && hex
        ? `${system} (${sector} ${hex})`
        : system;

      // Update campaign with new current_system and sector/hex for jump map
      operations.updateCampaign(opsSession.campaignId, {
        current_system: locationDisplay,
        current_sector: sector || null,
        current_hex: hex || null
      });

      // Log the location change on all party ships
      const campaign = operations.getCampaign(opsSession.campaignId);
      const ships = operations.getPartyShips(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'location',
          message: `Current location set to ${locationDisplay}`,
          actor: 'GM'
        });
      });

      // Broadcast to all in campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:currentSystemUpdated', {
        system,
        uwp,
        sector,
        hex,
        locationDisplay
      });
      socketLog.info(`[OPS] Current system set to: ${locationDisplay}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to set current system', error: error.message });
      socketLog.error('[OPS] Error setting current system:', error);
    }
  });

  // Delete campaign
  socket.on('ops:deleteCampaign', (data) => {
    try {
      const { campaignId } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete campaigns' });
        return;
      }
      operations.deleteCampaign(campaignId);
      socket.emit('ops:campaignDeleted', { campaignId });
      socketLog.info(`[OPS] Campaign deleted: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete campaign', error: error.message });
      socketLog.error('[OPS] Error deleting campaign:', error);
    }
  });

  // --- Player Slot Management (GM) ---

  // Create player slot
  socket.on('ops:createPlayerSlot', (data) => {
    try {
      const { campaignId, slotName } = data;
      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized' });
        return;
      }
      const account = operations.createPlayerSlot(campaignId, slotName);
      io.to(`ops:campaign:${campaignId}`).emit('ops:playerSlotCreated', { account });
      socketLog.info(`[OPS] Player slot created: ${account.id} "${slotName}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to create player slot', error: error.message });
      socketLog.error('[OPS] Error creating player slot:', error);
    }
  });

  // Delete player slot
  socket.on('ops:deletePlayerSlot', (data) => {
    try {
      const { accountId } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete player slots' });
        return;
      }
      operations.deletePlayerSlot(accountId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:playerSlotDeleted', { accountId });
      socketLog.info(`[OPS] Player slot deleted: ${accountId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete player slot', error: error.message });
      socketLog.error('[OPS] Error deleting player slot:', error);
    }
  });

  // --- Player Join Flow ---

  // Player joins campaign by code/ID
  socket.on('ops:joinCampaignAsPlayer', (data) => {
    try {
      const { campaignId } = data;
      // Try full ID first, then partial code
      let campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        // Try as partial code (first 8 chars)
        campaign = operations.getCampaignByCode(campaignId);
      }
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found. Check the code and try again.' });
        return;
      }
      // Use the actual campaign ID (may differ from input if partial code was used)
      const actualCampaignId = campaign.id;
      const players = operations.getPlayerAccountsByCampaign(actualCampaignId);
      opsSession.campaignId = actualCampaignId;
      socket.join(`ops:campaign:${actualCampaignId}`);
      socket.emit('ops:campaignJoined', {
        campaign,
        availableSlots: players.filter(p => !p.last_login || Date.now() - new Date(p.last_login).getTime() > 300000)
      });
      socketLog.info(`[OPS] Player viewing campaign: ${actualCampaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join campaign', error: error.message });
      socketLog.error('[OPS] Error joining campaign:', error);
    }
  });

  // Player selects their slot
  socket.on('ops:selectPlayerSlot', (data) => {
    try {
      const { accountId } = data;
      const account = operations.getPlayerAccount(accountId);
      if (!account) {
        socket.emit('ops:error', { message: 'Player slot not found' });
        return;
      }
      // Check if slot is already reserved by another socket (Stage 3.5.6)
      if (slotReservations.has(accountId) && slotReservations.get(accountId) !== socket.id) {
        socket.emit('ops:error', { message: 'This slot is already in use by another player' });
        return;
      }
      // Reserve the slot for this socket
      slotReservations.set(accountId, socket.id);
      // Track this connection
      connectedSockets.set(socket.id, {
        campaignId: account.campaign_id,
        accountId: accountId,
        shipId: null,
        role: null
      });
      operations.recordPlayerLogin(accountId);
      opsSession.accountId = accountId;
      opsSession.campaignId = account.campaign_id;
      opsSession.isGuest = false;
      // Get ships available for this campaign
      const ships = operations.getPartyShips(account.campaign_id);
      socket.emit('ops:playerSlotSelected', {
        account,
        ships,
        availableRoles: operations.ALL_ROLES
      });
      // Notify others in campaign about slot status change (Stage 3.5.3)
      socket.to(`ops:campaign:${account.campaign_id}`).emit('ops:slotStatusUpdate', {
        accountId,
        status: 'in-use',
        slotName: account.slot_name
      });
      socket.to(`ops:campaign:${account.campaign_id}`).emit('ops:playerJoined', {
        accountId,
        slotName: account.slot_name
      });
      socketLog.info(`[OPS] Player selected slot: ${accountId} "${account.slot_name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to select player slot', error: error.message });
      socketLog.error('[OPS] Error selecting player slot:', error);
    }
  });

  // Guest joins campaign (any role, skill 0)
  socket.on('ops:joinAsGuest', (data) => {
    try {
      const { campaignId, guestName } = data;
      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      // Guest doesn't get a database account, just session state
      opsSession.campaignId = campaignId;
      opsSession.isGuest = true;
      opsSession.guestName = guestName || 'Guest';
      socket.join(`ops:campaign:${campaignId}`);
      // Get ships available
      const ships = operations.getPartyShips(campaignId);
      socket.emit('ops:guestJoined', {
        campaign,
        ships,
        availableRoles: operations.ALL_ROLES,
        guestName: opsSession.guestName,
        defaultSkill: 0  // Guests always start with skill 0
      });
      socketLog.info(`[OPS] Guest "${opsSession.guestName}" joined campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join as guest', error: error.message });
      socketLog.error('[OPS] Error joining as guest:', error);
    }
  });

  // GM overrides guest skill level
  socket.on('ops:setGuestSkill', (data) => {
    try {
      const { targetSocketId, role, skillLevel } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set guest skill levels' });
        return;
      }
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('ops:skillOverride', { role, skillLevel });
        socketLog.info(`[OPS] GM set guest skill: ${role} = ${skillLevel}`);
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to set guest skill', error: error.message });
    }
  });

  // --- Character Import ---

  // Import character data
  socket.on('ops:importCharacter', (data) => {
    try {
      const { characterData } = data;
      if (!opsSession.accountId && !opsSession.isGuest) {
        socket.emit('ops:error', { message: 'Must select a player slot first' });
        return;
      }
      if (opsSession.isGuest) {
        // For guests, just store in session
        opsSession.character = characterData;
        socket.emit('ops:characterImported', { character: characterData });
        socketLog.info(`[OPS] Guest character set: ${characterData.name}`);
      } else {
        const account = operations.importCharacter(opsSession.accountId, characterData);
        socket.emit('ops:characterImported', { character: account.character_data });
        socketLog.info(`[OPS] Character imported: ${characterData.name}`);
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to import character', error: error.message });
      socketLog.error('[OPS] Error importing character:', error);
    }
  });

  // Stage 2: Update role personality (quirk/title)
  socket.on('ops:updateRolePersonality', (data) => {
    try {
      const { playerId, roleTitle, quirkText, quirkIcon } = data;
      if (!playerId) {
        socket.emit('ops:error', { message: 'No player ID provided' });
        return;
      }

      // Update player account with personality data
      const account = operations.updatePlayerAccount(playerId, {
        role_title: roleTitle,
        quirk_text: quirkText,
        quirk_icon: quirkIcon
      });

      // Emit back to client with updated data
      socket.emit('ops:rolePersonalityUpdated', {
        playerId,
        roleTitle: account.role_title,
        quirkText: account.quirk_text,
        quirkIcon: account.quirk_icon
      });

      // Broadcast crew update to all in campaign room
      if (opsSession.campaignId) {
        const crew = operations.getPlayersByCampaign(opsSession.campaignId);
        io.to(`ops:${opsSession.campaignId}`).emit('ops:crewUpdate', { crew });
      }

      socketLog.info(`[OPS] Role personality updated for player ${playerId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update role personality', error: error.message });
      socketLog.error('[OPS] Error updating role personality:', error);
    }
  });

  // --- Ship & Role Selection ---

  // Select ship
  socket.on('ops:selectShip', (data) => {
    try {
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      opsSession.shipId = shipId;
      if (opsSession.accountId) {
        operations.updatePlayerAccount(opsSession.accountId, { ship_id: shipId });
      }
      // Get crew already on this ship
      const crew = operations.getPlayersByShip(shipId);
      const npcCrew = operations.getNPCCrewByShip(shipId);
      socket.emit('ops:shipSelected', {
        ship,
        crew,
        npcCrew,
        takenRoles: crew.map(c => c.role).filter(r => r)
      });
      socketLog.info(`[OPS] Ship selected: ${shipId} "${ship.name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to select ship', error: error.message });
      socketLog.error('[OPS] Error selecting ship:', error);
    }
  });

  // Assign role (with validation for multiple identical roles)
  socket.on('ops:assignRole', (data) => {
    try {
      const { role, roleInstance = 1 } = data;
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Must select a ship first' });
        return;
      }
      // Check role config for unlimited slots (observer role)
      const roleConfig = operations.ROLE_VIEWS[role];
      const hasUnlimitedSlots = roleConfig?.unlimitedSlots === true;

      // Check if this specific role instance is available (skip for unlimited slot roles)
      if (!opsSession.isGuest && !hasUnlimitedSlots) {
        const isAvailable = operations.isRoleInstanceAvailable(
          opsSession.shipId,
          role,
          roleInstance,
          opsSession.accountId
        );
        if (!isAvailable) {
          const roleName = roleInstance > 1 ? `${role} ${roleInstance}` : role;
          socket.emit('ops:error', { message: `Role "${roleName}" is already taken on this ship` });
          return;
        }
        operations.assignRole(opsSession.accountId, role, roleInstance);
      } else if (!opsSession.isGuest && hasUnlimitedSlots) {
        // For unlimited slot roles (observer), assign without conflict checking
        operations.assignRole(opsSession.accountId, role, roleInstance);
      }
      opsSession.role = role;
      opsSession.roleInstance = roleInstance;
      // Update connection tracking
      const connInfo = connectedSockets.get(socket.id);
      if (connInfo) {
        connInfo.role = role;
        connInfo.shipId = opsSession.shipId;
      }
      socket.emit('ops:roleAssigned', { role, roleInstance });
      // Notify others in campaign (Stage 3.5.4 - real-time role updates)
      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: opsSession.shipId,
        accountId: opsSession.accountId,
        slotName: opsSession.isGuest ? opsSession.guestName : null,
        role,
        roleInstance
      });
      socketLog.info(`[OPS] Role assigned: ${role}${roleInstance > 1 ? ' ' + roleInstance : ''}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to assign role', error: error.message });
      socketLog.error('[OPS] Error assigning role:', error);
    }
  });

  // NAV-4: Leave role (go off-duty)
  socket.on('ops:leaveRole', () => {
    try {
      const previousRole = opsSession.role;
      if (!previousRole) {
        socket.emit('ops:error', { message: 'No role to leave' });
        return;
      }

      // Clear role in database (non-guests only)
      if (!opsSession.isGuest && opsSession.accountId) {
        operations.clearRole(opsSession.accountId);
      }

      // Clear session role
      opsSession.role = null;
      opsSession.roleInstance = null;

      // Update connection tracking
      const connInfo = connectedSockets.get(socket.id);
      if (connInfo) {
        connInfo.role = null;
      }

      socket.emit('ops:roleCleared', { previousRole });

      // Notify others in campaign
      if (opsSession.campaignId) {
        socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
          shipId: opsSession.shipId,
          accountId: opsSession.accountId,
          slotName: opsSession.isGuest ? opsSession.guestName : null,
          role: null,
          action: 'left'
        });
      }

      socketLog.info(`[OPS] Role cleared: ${previousRole}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to leave role', error: error.message });
      socketLog.error('[OPS] Error leaving role:', error);
    }
  });

  // Captain or Medic relieves crew member - sends them back to role selection
  // Medic can relieve anyone (including Captain) - medical authority
  // Captain can relieve anyone except themselves
  socket.on('ops:relieveCrewMember', (data) => {
    try {
      const { accountId, reason } = data;

      // Verify caller is Captain, Medic, or GM
      const isCaptain = opsSession.role === 'captain';
      const isMedic = opsSession.role === 'medic';
      if (!isCaptain && !isMedic && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Captain or Medical Officer can relieve crew members' });
        return;
      }

      if (!accountId) {
        socket.emit('ops:error', { message: 'Must specify crew member to relieve' });
        return;
      }

      // Get the target player's account info
      const targetAccount = operations.getPlayerAccount(accountId);
      if (!targetAccount) {
        socket.emit('ops:error', { message: 'Crew member not found' });
        return;
      }

      const targetRole = targetAccount.current_role;
      const targetName = targetAccount.slot_name;

      if (!targetRole) {
        socket.emit('ops:error', { message: `${targetName} has no role to be relieved from` });
        return;
      }

      // Can't relieve yourself
      if (accountId === opsSession.accountId) {
        socket.emit('ops:error', { message: 'Cannot relieve yourself from duty' });
        return;
      }

      // Determine authority type for log message
      const authorityType = isMedic ? 'Medical Officer' : 'Captain';

      // Clear role in database
      operations.clearRole(accountId);

      // Find target player's socket and update their session
      const targetSocketId = slotReservations.get(accountId);
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          // Notify the relieved player
          targetSocket.emit('ops:relievedFromDuty', {
            byCaption: opsSession.slotName || 'Captain',
            previousRole: targetRole,
            reason: reason || 'Captain\'s discretion'
          });
        }
        // Update connection tracking for target
        const targetConnInfo = connectedSockets.get(targetSocketId);
        if (targetConnInfo) {
          targetConnInfo.role = null;
        }
      }

      // Add log entry
      if (opsSession.shipId) {
        operations.addShipLogEntry(opsSession.shipId, {
          type: 'crew',
          source: authorityType,
          message: `${targetName} has been relieved of ${targetRole} duty${reason ? ': ' + reason : ''}`
        });
      }

      // Notify all in campaign
      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: opsSession.shipId,
        accountId: accountId,
        slotName: targetName,
        role: null,
        action: 'relieved',
        byCaptain: opsSession.slotName || 'Captain',
        reason: reason || null
      });

      // Confirm to captain
      socket.emit('ops:crewMemberRelieved', {
        accountId,
        slotName: targetName,
        previousRole: targetRole
      });

      socketLog.info(`[OPS] Captain relieved ${targetName} from ${targetRole} duty`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to relieve crew member', error: error.message });
      socketLog.error('[OPS] Error relieving crew member:', error);
    }
  });

  // --- Bridge Operations ---

  // Join bridge (player ready to operate)
  socket.on('ops:joinBridge', (data = {}) => {
    try {
      // GM can pass ship/role directly, players use session state
      const shipId = data.shipId || opsSession.shipId;
      const role = data.role || opsSession.role;
      const isGM = data.isGM || opsSession.isGM;

      // GM override - set session state if passed in data
      if (data.shipId) opsSession.shipId = data.shipId;
      if (data.role) opsSession.role = data.role;

      if (!shipId || !role) {
        socket.emit('ops:error', { message: 'Must select ship and role before joining bridge' });
        return;
      }
      socket.join(`ops:bridge:${shipId}`);
      // Get current bridge state
      const ship = operations.getShip(shipId);
      const crew = operations.getPlayersByShip(shipId);
      const npcCrew = operations.getNPCCrewByShip(shipId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      const logs = operations.getShipLog(shipId, { limit: 50 });
      // Get contacts - GM sees all including GM notes, players see only visible ones
      let contacts;
      if (isGM) {
        contacts = operations.getContactsByCampaign(opsSession.campaignId);
      } else {
        contacts = operations.getVisibleContacts(opsSession.campaignId, shipId);
      }
      const roleView = isGM ? operations.ROLE_VIEWS.gm : (operations.ROLE_VIEWS[role] || operations.ROLE_VIEWS.pilot);
      socket.emit('ops:bridgeJoined', {
        ship,
        crew,
        npcCrew,
        campaign,
        logs,
        contacts,  // Include contacts in bridge data
        role,
        roleView,
        alertStatus: ship?.current_state?.alertStatus || 'NORMAL',
        isGM
      });
      // Notify bridge
      io.to(`ops:bridge:${shipId}`).emit('ops:crewOnBridge', {
        accountId: opsSession.accountId,
        role,
        name: isGM ? 'GM' : (opsSession.isGuest ? opsSession.guestName : null)
      });
      // Notify campaign for crew status updates
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        action: 'joined',
        accountId: opsSession.accountId,
        role,
        roleInstance: opsSession.roleInstance,
        slotName: opsSession.slotName,
        playerName: isGM ? 'GM' : (opsSession.isGuest ? opsSession.guestName : opsSession.slotName),
        shipId
      });
      socketLog.info(`[OPS] Joined bridge: ${shipId} as ${role}${isGM ? ' (GM)' : ''}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join bridge', error: error.message });
      socketLog.error('[OPS] Error joining bridge:', error);
    }
  });

  // GM starts session
  socket.on('ops:startSession', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can start session' });
        return;
      }
      // Add log entry
      const ships = operations.getPartyShips(opsSession.campaignId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'session',
          message: 'Session started',
          actor: 'GM'
        });
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:sessionStarted', {
        gameDate: campaign.current_date,
        currentSystem: campaign.current_system
      });
      socketLog.info(`[OPS] Session started for campaign: ${opsSession.campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to start session', error: error.message });
      socketLog.error('[OPS] Error starting session:', error);
    }
  });

  // Add ship log entry
  socket.on('ops:addLogEntry', (data) => {
    try {
      const { message, entryType } = data;
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const entry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: entryType || 'note',
        message,
        actor: opsSession.isGuest ? opsSession.guestName : opsSession.role
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry });
      socketLog.info(`[OPS] Log entry added: ${message.substring(0, 50)}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add log entry', error: error.message });
      socketLog.error('[OPS] Error adding log entry:', error);
    }
  });

  // GM advances time
  socket.on('ops:advanceTime', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can advance time' });
        return;
      }
      const { hours = 0, minutes = 0 } = data;
      const campaign = operations.getCampaign(opsSession.campaignId);
      // Parse current date (format: YYYY-DDD HH:MM)
      const [datePart, timePart] = campaign.current_date.split(' ');
      const [year, day] = datePart.split('-').map(Number);
      const [currentHours, currentMinutes] = (timePart || '00:00').split(':').map(Number);

      let newMinutes = currentMinutes + minutes;
      let newHours = currentHours + hours + Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
      let newDay = day + Math.floor(newHours / 24);
      newHours = newHours % 24;
      let newYear = year + Math.floor((newDay - 1) / 365);
      newDay = ((newDay - 1) % 365) + 1;

      const newDate = `${newYear}-${String(newDay).padStart(3, '0')} ${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      operations.updateCampaign(opsSession.campaignId, { current_date: newDate });

      // Log time advance
      const ships = operations.getPartyShips(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: newDate,
          entryType: 'time',
          message: `Time advanced: +${hours}h ${minutes}m`,
          actor: 'GM'
        });
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeAdvanced', {
        previousDate: campaign.current_date,
        newDate,
        hoursAdvanced: hours,
        minutesAdvanced: minutes
      });
      socketLog.info(`[OPS] Time advanced to: ${newDate}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to advance time', error: error.message });
      socketLog.error('[OPS] Error advancing time:', error);
    }
  });

  // Set alert status (Captain or GM)
  socket.on('ops:setAlertStatus', (data) => {
    try {
      const { status } = data;
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can change alert status' });
        return;
      }
      if (!['NORMAL', 'YELLOW', 'RED'].includes(status)) {
        socket.emit('ops:error', { message: 'Invalid alert status' });
        return;
      }
      operations.updateShipState(opsSession.shipId, { alertStatus: status });
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'alert',
        message: `Alert status changed to ${status}`,
        actor: opsSession.isGM ? 'GM' : 'Captain'
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:alertStatusChanged', {
        status,
        alertInfo: operations.ALERT_STATUS[status]
      });
      socketLog.info(`[OPS] Alert status changed: ${status}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to set alert status', error: error.message });
      socketLog.error('[OPS] Error setting alert status:', error);
    }
  });

  // --- Contact Management ---

  // Get contacts (respects visibility)
  socket.on('ops:getContacts', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      let contacts;
      if (opsSession.isGM) {
        // GM sees all contacts
        contacts = operations.getContactsByCampaign(opsSession.campaignId);
      } else {
        // Players only see visible contacts
        contacts = operations.getVisibleContacts(opsSession.campaignId, opsSession.shipId);
      }
      socket.emit('ops:contacts', { contacts });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get contacts', error: error.message });
      socketLog.error('[OPS] Error getting contacts:', error);
    }
  });

  // Add contact (GM only)
  socket.on('ops:addContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add contacts' });
        return;
      }
      const contact = operations.addContact(opsSession.campaignId, data);
      // Notify all players in campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactAdded', { contact });
      socketLog.info(`[OPS] Contact added: ${contact.id} "${contact.name || contact.type}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add contact', error: error.message });
      socketLog.error('[OPS] Error adding contact:', error);
    }
  });

  // Update contact (GM only)
  socket.on('ops:updateContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update contacts' });
        return;
      }
      const { contactId, ...updates } = data;
      const contact = operations.updateContact(contactId, updates);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactUpdated', { contact });
      socketLog.info(`[OPS] Contact updated: ${contactId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update contact', error: error.message });
      socketLog.error('[OPS] Error updating contact:', error);
    }
  });

  // Delete contact (GM only)
  socket.on('ops:deleteContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete contacts' });
        return;
      }
      const { contactId } = data;
      const deleted = operations.deleteContact(contactId);
      if (deleted) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactDeleted', { contactId });
        socketLog.info(`[OPS] Contact deleted: ${contactId}`);
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete contact', error: error.message });
      socketLog.error('[OPS] Error deleting contact:', error);
    }
  });

  // Sensor scan (sensor operator action) - Autorun 5: Enhanced with scan types
  socket.on('ops:sensorScan', (data) => {
    try {
      if (opsSession.role !== 'sensor_operator' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Sensor Operator can perform scans' });
        return;
      }
      const { scanType = 'passive' } = data;

      // Map scan type to scan level (Autorun 6)
      const scanLevelMap = { passive: 1, active: 2, deep: 3 };
      const scanLevel = scanLevelMap[scanType] || 1;

      // Get all contacts (GM gets all, players get visible)
      let allContacts = opsSession.isGM
        ? operations.getContactsByCampaign(opsSession.campaignId)
        : operations.getVisibleContacts(opsSession.campaignId, opsSession.shipId);

      // Filter based on scan type
      let contacts;
      let scanDescription;

      switch (scanType) {
        case 'passive':
          // Passive: celestials + objects with active transponders
          contacts = allContacts.filter(c =>
            c.celestial ||
            (c.transponder && c.transponder !== 'NONE')
          );
          scanDescription = 'Passive scan: Celestial objects and transponder signals detected';
          break;

        case 'active':
          // Active: all visible contacts - BUT this reveals our position!
          contacts = allContacts;
          scanDescription = 'Active scan: Full sweep complete. Warning: Our position may be revealed.';
          break;

        case 'deep':
          // Deep: GM only - includes hidden contacts and GM notes
          if (!opsSession.isGM) {
            socket.emit('ops:error', { message: 'Deep scan requires GM override' });
            return;
          }
          contacts = operations.getContactsByCampaign(opsSession.campaignId);
          scanDescription = 'Deep scan: All contacts with full sensor data';
          break;

        default:
          contacts = allContacts.filter(c => c.celestial || (c.transponder && c.transponder !== 'NONE'));
          scanDescription = 'Passive scan complete';
      }

      // Upgrade scan levels for detected contacts and get discoveries (Autorun 6)
      const contactIds = contacts.map(c => c.id);
      const discoveries = operations.upgradeScanLevel(contactIds, scanLevel);

      // Categorize contacts for display
      const categorized = {
        celestial: contacts.filter(c => c.celestial),
        stations: contacts.filter(c => !c.celestial && c.type && ['Station', 'Starport', 'Base'].includes(c.type)),
        ships: contacts.filter(c => !c.celestial && c.type && ['Ship', 'Patrol'].includes(c.type)),
        unknown: contacts.filter(c => !c.celestial && (!c.type || !['Station', 'Starport', 'Base', 'Ship', 'Patrol'].includes(c.type)))
      };

      socket.emit('ops:scanResult', {
        scanType,
        contacts,
        categorized,
        totalCount: contacts.length,
        description: scanDescription,
        discoveries, // Include what was newly learned
        timestamp: new Date().toISOString(),
        // Show player their skill matters
        skillNote: opsSession.role === 'sensor_operator'
          ? 'Your Electronics (sensors) skill affects detection range and accuracy'
          : null
      });

      // Log the scan
      const campaign = operations.getCampaign(opsSession.campaignId);
      const scanTypeLabel = scanType === 'active' ? 'Active' : scanType === 'deep' ? 'Deep' : 'Passive';
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'sensor',
        message: `${scanTypeLabel} sensor scan: ${contacts.length} contacts detected`,
        actor: opsSession.isGuest ? opsSession.guestName : 'Sensors'
      });

      // Log discoveries for contacts that gained new info (Autorun 6)
      for (const disc of discoveries) {
        const contactName = disc.contact.name || disc.contact.transponder || disc.contact.type || 'Contact';
        const oldLabel = operations.getScanLevelLabel(disc.oldLevel);
        const newLabel = operations.getScanLevelLabel(disc.newLevel);
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'sensor',
          message: `${contactName}: Upgraded from ${oldLabel} to ${newLabel} scan. Revealed: ${disc.discoveries.join(', ')}`,
          actor: opsSession.isGuest ? opsSession.guestName : 'Sensors'
        });
      }

      socketLog.info(`[OPS] Sensor scan (${scanType}): ${contacts.length} contacts, ${discoveries.length} upgraded`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to perform scan', error: error.message });
      socketLog.error('[OPS] Error performing scan:', error);
    }
  });

  // --- Weapons Authorization (Autorun 5) ---

  // Get targetable contacts (for Captain/Gunner)
  socket.on('ops:getTargetableContacts', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      const contacts = operations.getContactsByCampaign(opsSession.campaignId);
      const targetable = contacts.filter(c => c.is_targetable);
      socket.emit('ops:targetableContacts', {
        contacts: targetable,
        canAuthorize: opsSession.role === 'captain' || opsSession.isGM
      });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get targetable contacts', error: error.message });
      socketLog.error('[OPS] Error getting targetable contacts:', error);
    }
  });

  // Captain authorizes weapons on a contact
  socket.on('ops:authorizeWeapons', (data) => {
    try {
      // Only Captain or GM can authorize weapons
      if (opsSession.role !== 'captain' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only the Captain can authorize weapons' });
        return;
      }
      const { contactId, authorize = true } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Contact ID required' });
        return;
      }

      // Update contact weapons_free status
      const contact = operations.updateContact(contactId, {
        weapons_free: authorize ? 1 : 0
      });

      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      // Log the authorization
      const campaign = operations.getCampaign(opsSession.campaignId);
      const action = authorize ? 'authorized' : 'revoked';
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'tactical',
        message: `Captain ${action} weapons on ${contact.name || contact.transponder || 'Contact'}`,
        actor: opsSession.isGM ? 'GM' : 'Captain'
      });

      // Broadcast to all on bridge
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:weaponsAuthorizationChanged', {
        contactId,
        contactName: contact.name || contact.transponder || 'Contact',
        authorized: authorize,
        authorizedBy: opsSession.isGM ? 'GM' : 'Captain'
      });

      socketLog.info(`[OPS] Weapons ${action} on contact ${contactId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to authorize weapons', error: error.message });
      socketLog.error('[OPS] Error authorizing weapons:', error);
    }
  });

  // Gunner fires at a contact
  socket.on('ops:fireAtContact', (data) => {
    try {
      // Only Gunner or GM can fire
      if (opsSession.role !== 'gunner' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only the Gunner can fire weapons' });
        return;
      }
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const { contactId, weaponIndex = 0 } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Target contact required' });
        return;
      }

      // Get the contact
      const contacts = operations.getContactsByCampaign(opsSession.campaignId);
      const target = contacts.find(c => c.id === contactId);
      if (!target) {
        socket.emit('ops:error', { message: 'Target contact not found' });
        return;
      }

      // Check if targetable
      if (!target.is_targetable) {
        socket.emit('ops:error', { message: 'Contact is not targetable' });
        return;
      }

      // Check weapons authorization (unless GM)
      if (!opsSession.isGM && !target.weapons_free) {
        // Log the unauthorized attempt
        const campaign = operations.getCampaign(opsSession.campaignId);
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'tactical',
          message: `BLOCKED: Gunner attempted fire on ${target.name || 'Contact'} - NOT AUTHORIZED`,
          actor: 'System'
        });
        socket.emit('ops:error', { message: 'Weapons not authorized on this target. Request authorization from Captain.' });
        return;
      }

      // Get ship and weapon data
      const ship = operations.getShip(opsSession.shipId);
      const weapons = ship?.ship_data?.weapons || [];
      const weapon = weapons[weaponIndex] || { name: 'Pulse Laser', damage: '2d6' };

      // Roll attack (2d6 + gunnery skill vs 8)
      const dice = require('../../dice');
      const roller = new dice.DiceRoller();
      const attackRoll = roller.roll2d6();
      const gunnerySkill = 0; // Would come from character data
      const targetNumber = 8;
      const totalAttack = attackRoll.total + gunnerySkill;
      const hit = totalAttack >= targetNumber;

      let damage = 0;
      let damageRoll = null;
      if (hit) {
        // Roll damage
        damageRoll = roller.rollNotation(weapon.damage || '2d6');
        damage = damageRoll.total;

        // Apply damage to target
        const newHealth = Math.max(0, (target.health || 20) - damage);
        operations.updateContact(contactId, { health: newHealth });

        // Check for destruction
        if (newHealth <= 0) {
          operations.deleteContact(contactId);
        }
      }

      // Build result
      const result = {
        hit,
        attackRoll: attackRoll.dice,
        attackTotal: totalAttack,
        targetNumber,
        gunnerySkill,
        weapon: weapon.name || 'Pulse Laser',
        target: target.name || target.transponder || 'Contact',
        damage: hit ? damage : 0,
        damageRoll: hit ? damageRoll?.dice : null,
        targetDestroyed: hit && (target.health || 20) - damage <= 0,
        message: hit
          ? `HIT! ${weapon.name || 'Pulse Laser'} deals ${damage} damage to ${target.name || 'Contact'}`
          : `MISS! Attack roll ${totalAttack} vs target ${targetNumber}`
      };

      // Log the attack
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: result.message + (result.targetDestroyed ? ' - TARGET DESTROYED!' : ''),
        actor: opsSession.isGM ? 'GM' : 'Gunner'
      });

      // Emit result to gunner
      socket.emit('ops:fireResult', result);

      // Broadcast to bridge
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:weaponFired', {
        gunner: opsSession.isGM ? 'GM' : 'Gunner',
        weapon: weapon.name || 'Pulse Laser',
        target: target.name || target.transponder || 'Contact',
        hit,
        damage: hit ? damage : 0,
        destroyed: result.targetDestroyed
      });

      // If target destroyed, notify campaign
      if (result.targetDestroyed) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactDeleted', { contactId });
      }

      socketLog.info(`[OPS] Fire at contact: ${hit ? 'HIT' : 'MISS'} (${attackRoll.total}+${gunnerySkill} vs ${targetNumber})`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to fire weapon', error: error.message });
      socketLog.error('[OPS] Error firing weapon:', error);
    }
  });

  // --- Ship Management (GM) ---

  // Get available ship templates
  socket.on('ops:getShipTemplates', () => {
    try {
      const templates = operations.getShipTemplates();
      socket.emit('ops:shipTemplates', { templates });
      socketLog.info(`[OPS] Ship templates requested: ${templates.length} available`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get ship templates', error: error.message });
      socketLog.error('[OPS] Error getting ship templates:', error);
    }
  });

  // Add ship from template
  socket.on('ops:addShipFromTemplate', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { templateId, name, isPartyShip } = data;
      const ship = operations.createShipFromTemplate(
        opsSession.campaignId,
        templateId,
        name,
        isPartyShip !== false
      );
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Ship added from template: ${ship.id} "${name}" (${templateId})`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add ship', error: error.message });
      socketLog.error('[OPS] Error adding ship from template:', error);
    }
  });

  // Add ship to campaign (raw data - legacy)
  socket.on('ops:addShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { name, shipData, isPartyShip } = data;
      const ship = operations.addShip(opsSession.campaignId, name, shipData, {
        isPartyShip: isPartyShip !== false,
        visibleToPlayers: true
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Ship added: ${ship.id} "${name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add ship', error: error.message });
      socketLog.error('[OPS] Error adding ship:', error);
    }
  });

  // Delete ship
  socket.on('ops:deleteShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete ships' });
        return;
      }
      const { shipId } = data;
      operations.deleteShip(shipId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipDeleted', { shipId });
      socketLog.info(`[OPS] Ship deleted: ${shipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete ship', error: error.message });
      socketLog.error('[OPS] Error deleting ship:', error);
    }
  });

  // --- Ship Systems & Damage ---

  // Get system status for current ship
  socket.on('ops:getSystemStatus', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const ship = operations.getShip(opsSession.shipId);
      const systemStatus = operations.getSystemStatuses(ship);
      const damagedSystems = operations.getDamagedSystems(ship);
      socket.emit('ops:systemStatus', { systemStatus, damagedSystems });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get system status', error: error.message });
      socketLog.error('[OPS] Error getting system status:', error);
    }
  });

  // GM applies damage to ship system
  socket.on('ops:applySystemDamage', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can apply damage' });
        return;
      }
      const { shipId, location, severity } = data;
      const targetShipId = shipId || opsSession.shipId;
      if (!targetShipId) {
        socket.emit('ops:error', { message: 'No ship specified' });
        return;
      }
      const result = operations.applySystemDamage(targetShipId, location, severity);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Log the damage
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(targetShipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'damage',
        message: `System damage: ${location} (Severity ${severity})`,
        actor: 'GM'
      });
      // Broadcast to ship crew
      io.to(`ops:bridge:${targetShipId}`).emit('ops:systemDamaged', {
        location,
        severity,
        totalSeverity: result.totalSeverity,
        message: result.message,
        systemStatus: result.systemStatus
      });
      socketLog.info(`[OPS] System damage applied: ${location} sev ${severity} on ${targetShipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to apply damage', error: error.message });
      socketLog.error('[OPS] Error applying system damage:', error);
    }
  });

  // Engineer attempts repair
  socket.on('ops:repairSystem', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check role - must be engineer or damage_control
      if (!opsSession.isGM && opsSession.role !== 'engineer' && opsSession.role !== 'damage_control') {
        socket.emit('ops:error', { message: 'Only engineers can repair systems' });
        return;
      }
      const { location, engineerSkill = 0 } = data;
      const result = operations.repairSystem(opsSession.shipId, location, engineerSkill);
      // Log the attempt
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'repair',
        message: result.message,
        actor: opsSession.isGM ? 'GM' : 'Engineer'
      });
      // Broadcast result to ship crew
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:repairAttempted', {
        ...result,
        location
      });
      socketLog.info(`[OPS] Repair attempted: ${location} - ${result.success ? 'success' : 'failed'}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to repair', error: error.message });
      socketLog.error('[OPS] Error repairing system:', error);
    }
  });

  // GM clears damage from system
  socket.on('ops:clearSystemDamage', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can clear damage' });
        return;
      }
      const { shipId, location } = data;
      const targetShipId = shipId || opsSession.shipId;
      if (!targetShipId) {
        socket.emit('ops:error', { message: 'No ship specified' });
        return;
      }
      const result = operations.clearSystemDamage(targetShipId, location);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Log the clear
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(targetShipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'repair',
        message: `Damage cleared: ${location === 'all' ? 'all systems' : location}`,
        actor: 'GM'
      });
      // Broadcast to ship crew
      io.to(`ops:bridge:${targetShipId}`).emit('ops:systemDamageCleared', {
        location: result.cleared,
        systemStatus: result.systemStatus
      });
      socketLog.info(`[OPS] System damage cleared: ${location} on ${targetShipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to clear damage', error: error.message });
      socketLog.error('[OPS] Error clearing system damage:', error);
    }
  });

  // --- Jump Travel ---

  // Check if ship can jump
  socket.on('ops:canJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { distance = 1 } = data;
      const result = operations.canInitiateJump(opsSession.shipId, distance);
      socket.emit('ops:jumpCheck', result);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to check jump', error: error.message });
      socketLog.error('[OPS] Error checking jump:', error);
    }
  });

  // Get current jump status
  socket.on('ops:getJumpStatus', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);
      socket.emit('ops:jumpStatus', status);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get jump status', error: error.message });
      socketLog.error('[OPS] Error getting jump status:', error);
    }
  });

  // Plot jump course (Astrogator action - shows info without initiating)
  socket.on('ops:plotJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check role - astrogator, pilot, or GM can plot
      if (!opsSession.isGM && opsSession.role !== 'astrogator' && opsSession.role !== 'pilot') {
        socket.emit('ops:error', { message: 'Only astrogator or pilot can plot jump courses' });
        return;
      }
      const { destination, distance = 1 } = data;
      if (!destination) {
        socket.emit('ops:error', { message: 'Destination required' });
        return;
      }

      // Get jump feasibility without initiating
      const check = operations.canInitiateJump(opsSession.shipId, distance);
      const campaign = operations.getCampaign(opsSession.campaignId);
      const ship = operations.getShip(opsSession.shipId);

      // Calculate arrival date (168 hours = 7 days)
      const arrivalDate = operations.advanceDate(campaign.current_date, 168, 0);

      // Check for unrefined fuel warnings
      const fuelPenalties = operations.getJumpFuelPenalties(opsSession.shipId, check.fuelNeeded || 0);

      // Build warnings list
      const warnings = [];
      if (fuelPenalties.hasUnrefined) {
        warnings.push(`Unrefined fuel detected: ${fuelPenalties.dmModifier} DM to jump check, ${(fuelPenalties.misjumpRisk * 100).toFixed(0)}% misjump risk`);
      }
      if (check.fuelNeeded && check.fuelAvailable) {
        const fuelAfterJump = check.fuelAvailable - check.fuelNeeded;
        if (fuelAfterJump < check.fuelNeeded) {
          warnings.push(`Warning: Insufficient fuel for return jump after arrival`);
        }
      }

      // Check if destination system is known
      const systemData = operations.getSystemData(destination);
      const destinationInfo = systemData ? {
        uwp: systemData.system.uwp,
        tradeCodes: systemData.system.tradeCodes,
        starport: systemData.system.uwp ? systemData.system.uwp[0] : '?',
        gasGiants: systemData.system.gasGiants || 0
      } : null;

      // Emit plot result (not initiating, just info)
      socket.emit('ops:jumpPlotted', {
        destination,
        distance,
        canJump: check.canJump,
        error: check.error || null,
        fuelNeeded: check.fuelNeeded || 0,
        fuelAvailable: check.fuelAvailable || 0,
        fuelAfterJump: (check.fuelAvailable || 0) - (check.fuelNeeded || 0),
        travelTime: '168 hours (7 days)',
        currentDate: campaign.current_date,
        arrivalDate,
        jumpRating: check.jumpRating || 0,
        warnings,
        destinationInfo,
        // Show player their skill matters
        astrogatorSkill: opsSession.role === 'astrogator' ? 'Your skill helps ensure safe arrival' : null
      });

      // Log the plotting (not the jump itself)
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'astrogation',
        message: `Jump course plotted to ${destination} (Jump-${distance}). Fuel: ${check.fuelNeeded || '?'} tons.`,
        actor: opsSession.isGM ? 'GM' : 'Astrogator'
      });

      socketLog.info(`[OPS] Jump course plotted to ${destination}, canJump: ${check.canJump}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to plot jump', error: error.message });
      socketLog.error('[OPS] Error plotting jump:', error);
    }
  });

  // Initiate jump (Astrogator or Pilot role)
  socket.on('ops:initiateJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check role - must be astrogator, pilot, or GM
      if (!opsSession.isGM && opsSession.role !== 'astrogator' && opsSession.role !== 'pilot') {
        socket.emit('ops:error', { message: 'Only astrogator or pilot can initiate jump' });
        return;
      }
      const { destination, distance = 1 } = data;
      if (!destination) {
        socket.emit('ops:error', { message: 'Destination required' });
        return;
      }
      const result = operations.initiateJump(opsSession.shipId, opsSession.campaignId, destination, distance);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Log the jump
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'jump',
        message: `Jump initiated to ${destination} (Jump-${distance}). ETA: ${result.jumpEndDate}`,
        actor: opsSession.isGM ? 'GM' : opsSession.role
      });
      // Broadcast to ship crew
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:jumpInitiated', {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : opsSession.role
      });
      socketLog.info(`[OPS] Jump initiated to ${destination} from ship ${opsSession.shipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to initiate jump', error: error.message });
      socketLog.error('[OPS] Error initiating jump:', error);
    }
  });

  // Complete jump (exit jump space)
  socket.on('ops:completeJump', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check if jump can be completed
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);
      if (!status.inJump) {
        socket.emit('ops:error', { message: 'Ship is not in jump space' });
        return;
      }
      if (!status.canExit) {
        socket.emit('ops:error', { message: `Jump not complete. ${status.hoursRemaining} hours remaining` });
        return;
      }
      const result = operations.completeJump(opsSession.shipId, opsSession.campaignId);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Stage 7: Advance game time to jump end date
      if (status.jumpEndDate) {
        operations.updateCampaign(opsSession.campaignId, { current_date: status.jumpEndDate });
      }
      // Refetch campaign with new date
      const updatedCampaign = operations.getCampaign(opsSession.campaignId);

      // Autorun 5: Load system contacts if destination has system data
      const systemData = operations.getSystemData(result.arrivedAt);
      let newContacts = [];
      if (systemData) {
        socketLog.info(`[OPS] Loading system data for ${result.arrivedAt}`);
        operations.seedSystemContacts(opsSession.campaignId, result.arrivedAt);
        newContacts = operations.getContactsByCampaign(opsSession.campaignId);
        // Update campaign sector/hex from system data
        operations.updateCampaign(opsSession.campaignId, {
          current_sector: systemData.system.sector,
          current_hex: systemData.system.hex
        });
      }

      // Log the arrival
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: updatedCampaign.current_date,
        entryType: 'jump',
        message: `Arrived at ${result.arrivedAt}`,
        actor: 'System'
      });

      // Add data link log entry if system has a starport
      if (systemData) {
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: updatedCampaign.current_date,
          entryType: 'comms',
          message: `Data link established with ${result.arrivedAt} Starport`,
          actor: 'Comms'
        });
      }

      // Broadcast to ship crew and campaign (include updated time, contacts, news and mail)
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:jumpCompleted', {
        ...result,
        newDate: updatedCampaign.current_date,
        contacts: newContacts,
        systemLoaded: !!systemData,
        news: systemData?.system?.news || [],
        mail: systemData?.system?.mail || {},
        roleContent: systemData?.system?.roleContent || {}
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:locationChanged', {
        newLocation: result.arrivedAt,
        newDate: updatedCampaign.current_date,
        contacts: newContacts
      });
      // Broadcast contacts update to all in campaign
      if (newContacts.length > 0) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactsReplaced', {
          contacts: newContacts,
          reason: `Arrived at ${result.arrivedAt}`
        });
      }
      // Broadcast time update
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeUpdated', {
        currentDate: updatedCampaign.current_date,
        reason: `Jump to ${result.arrivedAt}`
      });
      socketLog.info(`[OPS] Jump completed, arrived at ${result.arrivedAt}, date: ${updatedCampaign.current_date}, contacts: ${newContacts.length}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to complete jump', error: error.message });
      socketLog.error('[OPS] Error completing jump:', error);
    }
  });

  // Skip to jump exit (testing feature - advances time to allow exit)
  socket.on('ops:skipToJumpExit', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);

      if (!status.inJump) {
        socket.emit('ops:error', { message: 'Ship is not in jump space' });
        return;
      }

      if (status.canExit) {
        socket.emit('ops:error', { message: 'Jump can already be exited' });
        return;
      }

      // Advance campaign time to jump end date
      operations.updateCampaign(opsSession.campaignId, { current_date: status.jumpEndDate });

      // Refetch and broadcast new jump status
      const updatedCampaign = operations.getCampaign(opsSession.campaignId);
      const newStatus = operations.getJumpStatus(opsSession.shipId, updatedCampaign.current_date);

      // Broadcast time update
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeUpdated', {
        currentDate: updatedCampaign.current_date,
        reason: 'Time advanced to jump exit'
      });

      // Notify the astrogator
      socket.emit('ops:jumpStatusUpdated', {
        jumpStatus: newStatus,
        message: `Time advanced. You may now exit jump space.`
      });

      socketLog.info(`[OPS] Time skipped to jump exit: ${updatedCampaign.current_date}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to skip time', error: error.message });
      socketLog.error('[OPS] Error skipping to jump exit:', error);
    }
  });

  // --- Refueling Operations ---

  // Get fuel status for current ship
  socket.on('ops:getFuelStatus', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const fuelStatus = operations.getFuelStatus(opsSession.shipId);
      socket.emit('ops:fuelStatus', fuelStatus);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get fuel status', error: error.message });
      socketLog.error('[OPS] Error getting fuel status:', error);
    }
  });

  // Get available refueling sources
  socket.on('ops:getRefuelOptions', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      const sources = operations.getAvailableSources(opsSession.campaignId);
      // If on a ship, include current fuel status and capacity
      let fuelStatus = null;
      if (opsSession.shipId) {
        fuelStatus = operations.getFuelStatus(opsSession.shipId);
      }
      socket.emit('ops:refuelOptions', {
        sources,
        fuelStatus,
        fuelTypes: operations.FUEL_TYPES
      });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get refuel options', error: error.message });
      socketLog.error('[OPS] Error getting refuel options:', error);
    }
  });

  // Check if can refuel from source
  socket.on('ops:canRefuel', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { sourceId, tons } = data;
      const result = operations.canRefuel(opsSession.shipId, sourceId, tons);
      socket.emit('ops:canRefuelResult', result);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to check refuel', error: error.message });
      socketLog.error('[OPS] Error checking refuel:', error);
    }
  });

  // Execute refueling (Engineer or GM)
  socket.on('ops:refuel', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check role - must be engineer, pilot, or GM
      if (!opsSession.isGM && opsSession.role !== 'engineer' && opsSession.role !== 'pilot') {
        socket.emit('ops:error', { message: 'Only engineer or pilot can manage refueling' });
        return;
      }
      const { sourceId, tons } = data;
      const result = operations.refuel(opsSession.shipId, opsSession.campaignId, sourceId, tons);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Broadcast to ship crew
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:refueled', {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : opsSession.role
      });
      socketLog.info(`[OPS] Refueled ${tons} tons of ${result.fuelType} from ${sourceId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to refuel', error: error.message });
      socketLog.error('[OPS] Error refueling:', error);
    }
  });

  // Start fuel processing (Engineer role)
  socket.on('ops:startFuelProcessing', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // Check role - must be engineer or GM
      if (!opsSession.isGM && opsSession.role !== 'engineer') {
        socket.emit('ops:error', { message: 'Only engineer can process fuel' });
        return;
      }
      const { tons } = data;
      const result = operations.startFuelProcessing(opsSession.shipId, opsSession.campaignId, tons);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      // Broadcast to ship crew
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:fuelProcessingStarted', {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : 'Engineer'
      });
      socketLog.info(`[OPS] Started processing ${tons} tons of fuel (${result.timeHours}h)`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to start fuel processing', error: error.message });
      socketLog.error('[OPS] Error starting fuel processing:', error);
    }
  });

  // Check fuel processing status
  socket.on('ops:checkFuelProcessing', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const result = operations.checkFuelProcessing(opsSession.shipId, opsSession.campaignId);
      socket.emit('ops:fuelProcessingStatus', result);
      // If processing just completed, broadcast to crew
      if (result.completed) {
        io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:fuelProcessingCompleted', {
          tons: result.tons,
          newFuelStatus: result.newFuelStatus
        });
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to check fuel processing', error: error.message });
      socketLog.error('[OPS] Error checking fuel processing:', error);
    }
  });

  // Get jump fuel penalties (shows warning before jumping with unrefined fuel)
  socket.on('ops:getJumpFuelPenalties', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { fuelNeeded } = data;
      const penalties = operations.getJumpFuelPenalties(opsSession.shipId, fuelNeeded);
      socket.emit('ops:jumpFuelPenalties', penalties);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get fuel penalties', error: error.message });
      socketLog.error('[OPS] Error getting fuel penalties:', error);
    }
  });

  // --- GM-3: God Mode Handlers ---
  socket.on('ops:godModeUpdateShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId, updates } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const newState = { ...ship.current_state, ...updates };
      operations.updateShipState(shipId, newState);
      // Broadcast update to bridge
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', {
        shipId,
        current_state: newState
      });
      socketLog.info(`[OPS] God mode: Ship ${shipId} state updated by GM`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update ship state', error: error.message });
      socketLog.error('[OPS] Error in godModeUpdateShip:', error);
    }
  });

  socket.on('ops:godModeAddContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { campaignId, contact } = data;
      const newContact = operations.addContact(campaignId, contact);
      // Broadcast to all in campaign
      io.to(`ops:campaign:${campaignId}`).emit('ops:contactAdded', { contact: newContact });
      socketLog.info(`[OPS] God mode: Contact added to campaign ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add contact', error: error.message });
      socketLog.error('[OPS] Error in godModeAddContact:', error);
    }
  });

  socket.on('ops:godModeRepairAll', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      // Repair all systems to 100%
      const systems = ship.current_state?.systems || {};
      const repairedSystems = {};
      for (const [name, system] of Object.entries(systems)) {
        repairedSystems[name] = { ...system, status: 'operational', health: 100, issue: null };
      }
      // Restore hull to max
      const maxHull = ship.ship_data?.hull?.hullPoints || 40;
      const newState = { ...ship.current_state, hullPoints: maxHull, systems: repairedSystems };
      operations.updateShipState(shipId, newState);
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', { shipId, current_state: newState });
      socketLog.info(`[OPS] God mode: All systems repaired on ${shipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to repair systems', error: error.message });
      socketLog.error('[OPS] Error in godModeRepairAll:', error);
    }
  });

  socket.on('ops:godModeRefuel', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const maxFuel = ship.ship_data?.fuel?.capacity || 40;
      const newState = { ...ship.current_state, fuel: maxFuel };
      operations.updateShipState(shipId, newState);
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', { shipId, current_state: newState });
      socketLog.info(`[OPS] God mode: Ship ${shipId} fully refueled`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to refuel', error: error.message });
      socketLog.error('[OPS] Error in godModeRefuel:', error);
    }
  });

  socket.on('ops:godModeClearContacts', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { campaignId } = data;
      operations.clearCampaignContacts(campaignId);
      io.to(`ops:campaign:${campaignId}`).emit('ops:contactsCleared', { campaignId });
      socketLog.info(`[OPS] God mode: All contacts cleared in campaign ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to clear contacts', error: error.message });
      socketLog.error('[OPS] Error in godModeClearContacts:', error);
    }
  });

  // --- Mail System (Autorun 6) ---

  // Get mail for current player
  socket.on('ops:getMail', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const currentDate = campaign?.current_date || '1105-001';

      let mail;
      if (opsSession.isGM) {
        // GM sees all mail
        mail = operations.getMailByCampaign(opsSession.campaignId);
      } else {
        // Players see mail addressed to them
        mail = operations.getMailForPlayer(opsSession.campaignId, opsSession.accountId, currentDate);
      }

      const unreadCount = opsSession.isGM ? 0 :
        operations.getUnreadMailCount(opsSession.campaignId, opsSession.accountId, currentDate);

      socket.emit('ops:mailList', { mail, unreadCount });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get mail', error: error.message });
      socketLog.error('[OPS] Error getting mail:', error);
    }
  });

  // Mark mail as read
  socket.on('ops:markMailRead', (data) => {
    try {
      const { mailId } = data;
      operations.markMailRead(mailId);
      socket.emit('ops:mailUpdated', { mailId, isRead: true });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to mark mail read', error: error.message });
    }
  });

  // GM: Send mail
  socket.on('ops:sendMail', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can send mail' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const mail = operations.sendMail(opsSession.campaignId, {
        ...data,
        sentDate: campaign?.current_date || '1105-001'
      });
      socket.emit('ops:mailSent', { mail });

      // Notify recipient if they're online
      if (data.recipientId) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:newMail', {
          recipientId: data.recipientId,
          subject: mail.subject,
          senderName: mail.sender_name
        });
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to send mail', error: error.message });
      socketLog.error('[OPS] Error sending mail:', error);
    }
  });

  // --- NPC Contacts (Autorun 6) ---

  // Get NPC contacts
  socket.on('ops:getNPCContacts', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }

      let contacts;
      if (opsSession.isGM) {
        // GM sees all contacts
        contacts = operations.getNPCContactsByCampaign(opsSession.campaignId);
      } else {
        // Players see contacts visible to them
        contacts = operations.getNPCContactsForPlayer(opsSession.campaignId, opsSession.accountId);
      }

      socket.emit('ops:npcContactsList', { contacts, isGM: opsSession.isGM });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get NPC contacts', error: error.message });
      socketLog.error('[OPS] Error getting NPC contacts:', error);
    }
  });

  // GM: Add NPC contact
  socket.on('ops:addNPCContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add NPC contacts' });
        return;
      }
      const contact = operations.addNPCContact(opsSession.campaignId, data);
      socket.emit('ops:npcContactAdded', { contact });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add NPC contact', error: error.message });
      socketLog.error('[OPS] Error adding NPC contact:', error);
    }
  });

  // GM: Update NPC contact visibility
  socket.on('ops:updateNPCContactVisibility', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update NPC contact visibility' });
        return;
      }
      const { contactId, visibleTo } = data;
      const contact = operations.updateNPCContact(contactId, { visibleTo });
      socket.emit('ops:npcContactUpdated', { contact });

      // Notify players whose visibility changed
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:npcContactsRefresh');
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update NPC contact visibility', error: error.message });
      socketLog.error('[OPS] Error updating NPC contact visibility:', error);
    }
  });

  // --- Player Feedback (Autorun 6) ---

  // Submit feedback
  socket.on('ops:submitFeedback', (data) => {
    try {
      const feedback = operations.submitFeedback({
        campaignId: opsSession.campaignId,
        playerName: opsSession.isGuest ? opsSession.guestName : (opsSession.accountId || 'Anonymous'),
        ...data
      });
      socket.emit('ops:feedbackSubmitted', { feedback });
      socketLog.info(`[OPS] Feedback submitted: ${data.feedbackType} - ${data.title}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to submit feedback', error: error.message });
      socketLog.error('[OPS] Error submitting feedback:', error);
    }
  });

  // GM: Get all feedback
  socket.on('ops:getFeedback', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can view feedback' });
        return;
      }
      const feedback = operations.getAllFeedback({ limit: 100 });
      const stats = operations.getFeedbackStats();
      socket.emit('ops:feedbackList', { feedback, stats });
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get feedback', error: error.message });
      socketLog.error('[OPS] Error getting feedback:', error);
    }
  });

  // GM: Update feedback status
  socket.on('ops:updateFeedbackStatus', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update feedback status' });
        return;
      }
      const { feedbackId, status } = data;
      operations.updateFeedbackStatus(feedbackId, status);
      socket.emit('ops:feedbackStatusUpdated', { feedbackId, status });
      socketLog.info(`[OPS] Feedback ${feedbackId} marked as ${status}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update feedback status', error: error.message });
      socketLog.error('[OPS] Error updating feedback status:', error);
    }
  });

  // --- Disconnect Handler ---
  socket.on('disconnect', () => {
    try {
      // Clean up slot reservation
      if (opsSession.accountId) {
        slotReservations.delete(opsSession.accountId);
        // Notify campaign about slot becoming available
        if (opsSession.campaignId) {
          io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:slotStatusUpdate', {
            accountId: opsSession.accountId,
            status: 'available'
          });
          // Notify crew status update for disconnect
          io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
            action: 'disconnected',
            accountId: opsSession.accountId,
            role: opsSession.role,
            shipId: opsSession.shipId
          });
        }
      }
      // Clean up connection tracking
      connectedSockets.delete(socket.id);
      socketLog.info(`[OPS] Socket disconnected: ${socket.id}, released slot: ${opsSession.accountId || 'none'}`);
    } catch (error) {
      socketLog.error('[OPS] Error handling disconnect:', error);
    }
  });
}

/**
 * Get connected players for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Connected socket info
 */
function getConnectedPlayers(campaignId) {
  const players = [];
  for (const [socketId, session] of connectedSockets) {
    if (session.campaignId === campaignId) {
      players.push({
        socketId,
        accountId: session.accountId,
        shipId: session.shipId,
        role: session.role
      });
    }
  }
  return players;
}

/**
 * Check if a slot is reserved
 * @param {string} accountId - Player slot ID
 * @returns {boolean} True if reserved by another socket
 */
function isSlotReserved(accountId) {
  return slotReservations.has(accountId);
}

module.exports = {
  register,
  getConnectedPlayers,
  isSlotReserved,
  connectedSockets,
  slotReservations
};
