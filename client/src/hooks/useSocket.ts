import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGame } from '../context/GameContext';

export function useSocket() {
  const { updateGameState, addLogEntry } = useGame();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to server
    socketRef.current = io('http://localhost:3000');
    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      updateGameState({ connected: true, socketId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      updateGameState({ connected: false });
    });

    // Game events
    socket.on('welcome', (data) => {
      console.log('[Socket] Welcome:', data);
      updateGameState({
        playerId: data.playerId,
        playerNumber: data.playerId,
        playerShip: data.assignedShip,
      });
    });

    socket.on('space:autoAssigned', (data) => {
      console.log('[Socket] Auto-assigned:', data);
      updateGameState({
        playerShip: data.ship,
        mode: data.mode,
      });
    });

    socket.on('space:combatStart', (data) => {
      console.log('[Socket] Combat started:', data);
      updateGameState({ combat: data });
      addLogEntry('Combat started!', 'info');
    });

    socket.on('space:turnChange', (data) => {
      console.log('[Socket] Turn change:', data);
      updateGameState({ currentTurn: data.activePlayer });
      addLogEntry(`Turn ${data.turn}: Player ${data.activePlayer}'s turn`, 'info');
    });

    socket.on('space:combatUpdate', (data) => {
      console.log('[Socket] Combat update:', data);
      updateGameState({ combat: data.combat });
      if (data.log && Array.isArray(data.log)) {
        data.log.forEach((msg: string) => addLogEntry(msg, 'success'));
      }
    });

    socket.on('space:combatEnd', (data) => {
      console.log('[Socket] Combat ended:', data);
      addLogEntry(`Combat ended! Winner: Player ${data.winner}`, 'success');
    });

    socket.on('space:rangeSelected', (data) => {
      console.log('[Socket] Range selected:', data);
      updateGameState({ selectedRange: data.range });
    });

    socket.on('space:playerReady', (data) => {
      console.log('[Socket] Player ready:', data);
    });

    // Vanilla event handlers (for backward compatibility with server)
    socket.on('playerJoined', (data) => {
      console.log('[Socket] Player joined:', data);
      updateGameState({
        assignments: data.assignments,
        totalPlayers: data.totalPlayers,
      });
      addLogEntry(`Player ${data.playerId} joined as ${data.ship || 'spectator'}`, 'info');
    });

    socket.on('playerLeft', (data) => {
      console.log('[Socket] Player left:', data);
      updateGameState({
        assignments: data.assignments,
        totalPlayers: data.totalPlayers,
      });
      addLogEntry(`Player ${data.playerId} left`, 'warning');
    });

    socket.on('gameState', (data) => {
      console.log('[Socket] Game state received:', data);
      updateGameState({
        assignments: data.assignments,
        currentRound: data.currentRound || null,
        currentTurn: data.currentTurn || null,
        initiative: data.initiative || null,
      });
    });

    socket.on('gameReset', (data) => {
      console.log('[Socket] Game reset:', data);
      updateGameState({
        currentRound: data.currentRound || null,
        currentTurn: data.currentTurn || null,
      });
      addLogEntry(data.message || 'Game Reset', 'info');
    });

    socket.on('roundStart', (data) => {
      console.log('[Socket] Round started:', data);
      updateGameState({
        currentRound: data.round,
        currentTurn: data.currentTurn,
        initiative: data.initiative,
      });

      const initScout = data.initiative?.scout;
      const initCorsair = data.initiative?.corsair;
      const details = initScout && initCorsair
        ? `Initiative - Scout: ${initScout.total} | Corsair: ${initCorsair.total} | ${data.currentTurn?.toUpperCase()} goes first!`
        : '';

      addLogEntry(`Round ${data.round} Begins!`, 'info');
      if (details) {
        addLogEntry(details, 'system');
      }
    });

    socket.on('turnChange', (data) => {
      console.log('[Socket] Turn changed:', data);
      updateGameState({
        currentRound: data.round,
        currentTurn: data.currentTurn,
      });
      addLogEntry(`Turn: ${data.currentTurn?.toUpperCase()}`, 'info');
    });

    socket.on('gameError', (data) => {
      console.error('[Socket] Game error:', data);
      addLogEntry(data.message || 'Game error occurred', 'error');
    });

    socket.on('repairResult', (data) => {
      console.log('[Socket] Repair completed:', data);
      addLogEntry(
        `${data.ship?.toUpperCase()} Repaired: ${data.hullRepaired} HP`,
        'success'
      );
    });

    socket.on('repairError', (data) => {
      console.error('[Socket] Repair error:', data);
      addLogEntry(data.message || 'Repair failed', 'error');
    });

    socket.on('moveResult', (data) => {
      console.log('[Socket] Movement completed:', data);
      addLogEntry(
        `${data.ship?.toUpperCase()} Moved`,
        'info'
      );
    });

    socket.on('moveError', (data) => {
      console.error('[Socket] Movement error:', data);
      addLogEntry(data.message || 'Movement failed', 'error');
    });

    // Cleanup on unmount
    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('welcome');
      socket.off('space:autoAssigned');
      socket.off('space:combatStart');
      socket.off('space:turnChange');
      socket.off('space:combatUpdate');
      socket.off('space:combatEnd');
      socket.off('space:rangeSelected');
      socket.off('space:playerReady');
      // Vanilla events
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameState');
      socket.off('gameReset');
      socket.off('roundStart');
      socket.off('turnChange');
      socket.off('gameError');
      socket.off('repairResult');
      socket.off('repairError');
      socket.off('moveResult');
      socket.off('moveError');
      socket.disconnect();
    };
  }, [updateGameState, addLogEntry]);

  return socketRef.current;
}
