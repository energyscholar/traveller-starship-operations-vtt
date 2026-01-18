/**
 * AR-XX: Chat Socket Handlers
 * Handles chat:send, chat:getHistory, chat:getPlayerList, chat:postAsNPC
 */

/**
 * Register chat handlers
 * @param {Object} ctx - Handler context from context.js
 */
function register(ctx) {
  const {
    socket, io, opsSession, operations,
    connectedSockets, socketLog, sanitizeError
  } = ctx;

  // chat:send - Send a message (broadcast or whisper)
  socket.on('chat:send', (data) => {
    try {
      const { message, type = 'broadcast', recipientId = null, speakAs = null } = data;
      const campaignId = opsSession.campaignId;

      if (!campaignId) {
        socket.emit('chat:error', { error: 'Not in a campaign' });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        socket.emit('chat:error', { error: 'Message cannot be empty' });
        return;
      }

      const trimmedMessage = message.trim().substring(0, 2000);

      // Determine sender identity
      let senderName = opsSession.playerName || 'Unknown';
      let senderRole = opsSession.selectedRole || 'player';
      let senderId = opsSession.accountId || socket.id;

      // GM can speak as different identities
      if (opsSession.isGM && speakAs) {
        if (speakAs === 'gm') {
          senderName = 'GM';
          senderRole = 'gm';
        } else if (speakAs.startsWith('char:')) {
          const charId = speakAs.replace('char:', '');
          const players = operations.getPlayerAccountsByCampaign(campaignId);
          for (const player of players) {
            if (player.id === charId) {
              senderName = player.slot_name || player.character_name || 'Character';
              senderRole = player.role || 'player';
              break;
            }
          }
        } else if (speakAs.startsWith('npc:')) {
          const npcName = speakAs.replace('npc:', '');
          senderName = npcName;
          senderRole = 'npc';
        }
      }

      // Get recipient info for whispers
      let recipientName = null;
      if (type === 'whisper' && recipientId) {
        for (const [sid, session] of connectedSockets) {
          if ((session.accountId === recipientId || sid === recipientId) && session.campaignId === campaignId) {
            recipientName = session.playerName;
            break;
          }
        }
        if (!recipientName) {
          socket.emit('chat:error', { error: 'Recipient not found' });
          return;
        }
      }

      // Store message
      const chatMessage = operations.chat.addMessage(campaignId, {
        senderId,
        senderName,
        senderRole,
        message: trimmedMessage,
        type,
        recipientId,
        recipientName,
        isAI: false
      });

      socketLog.info(`[CHAT] ${senderName} sent ${type}: ${trimmedMessage.substring(0, 50)}...`);

      // Broadcast or send whisper
      if (type === 'whisper' && recipientId) {
        socket.emit('chat:message', chatMessage);
        for (const [sid, session] of connectedSockets) {
          if ((session.accountId === recipientId || sid === recipientId) && session.campaignId === campaignId && sid !== socket.id) {
            io.to(sid).emit('chat:message', chatMessage);
          }
        }
      } else {
        for (const [sid, session] of connectedSockets) {
          if (session.campaignId === campaignId) {
            io.to(sid).emit('chat:message', chatMessage);
          }
        }
      }
    } catch (error) {
      socket.emit('chat:error', sanitizeError('Chat', error));
      socketLog.error('[CHAT] Error sending message:', error);
    }
  });

  // chat:getHistory - Get recent messages
  socket.on('chat:getHistory', () => {
    try {
      const campaignId = opsSession.campaignId;
      if (!campaignId) {
        socket.emit('chat:error', { error: 'Not in a campaign' });
        return;
      }

      const allMessages = operations.chat.getHistory(campaignId, 50);
      const myId = opsSession.accountId || socket.id;

      // Filter whispers - only show if sender or recipient
      // TODO: Whisper filtering not working correctly - third party joining later still sees
      // whispers in history. May be ID mismatch issue. Defer to follow-up.
      const messages = allMessages.filter(msg => {
        if (msg.type !== 'whisper') return true;
        return msg.senderId === myId || msg.recipientId === myId;
      });

      socket.emit('chat:history', { messages });
    } catch (error) {
      socket.emit('chat:error', sanitizeError('Chat', error));
      socketLog.error('[CHAT] Error getting history:', error);
    }
  });

  // chat:getPlayerList - Get connected players for whisper dropdown
  socket.on('chat:getPlayerList', () => {
    try {
      const campaignId = opsSession.campaignId;
      if (!campaignId) {
        socket.emit('chat:error', { error: 'Not in a campaign' });
        return;
      }

      const players = [];
      for (const [socketId, session] of connectedSockets) {
        if (session.campaignId === campaignId && session.playerName) {
          players.push({
            id: session.accountId || socketId,
            name: session.playerName,
            role: session.selectedRole || 'player'
          });
        }
      }
      socket.emit('chat:playerList', { players });
    } catch (error) {
      socket.emit('chat:error', sanitizeError('Chat', error));
      socketLog.error('[CHAT] Error getting player list:', error);
    }
  });

  // chat:postAsNPC - GM posts as an NPC
  socket.on('chat:postAsNPC', (data) => {
    try {
      const { npcId, npcName, message } = data;
      const campaignId = opsSession.campaignId;

      if (!campaignId) {
        socket.emit('chat:error', { error: 'Not in a campaign' });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('chat:error', { error: 'Only GM can post as NPC' });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        socket.emit('chat:error', { error: 'Message cannot be empty' });
        return;
      }

      const name = npcName || npcId || 'NPC';
      const chatMessage = operations.chat.postAsNPC(campaignId, name, message.trim());

      socketLog.info(`[CHAT] GM posted as NPC ${name}: ${message.substring(0, 50)}...`);

      for (const [sid, session] of connectedSockets) {
        if (session.campaignId === campaignId) {
          io.to(sid).emit('chat:message', chatMessage);
        }
      }
    } catch (error) {
      socket.emit('chat:error', sanitizeError('Chat', error));
      socketLog.error('[CHAT] Error posting as NPC:', error);
    }
  });
}

module.exports = { register };
