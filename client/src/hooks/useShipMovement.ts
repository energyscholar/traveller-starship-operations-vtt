/**
 * useShipMovement Hook
 *
 * Manages ship movement state and socket.io integration for hex-based movement.
 * Integrates with HexGrid component to handle ship positioning.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { HexPosition } from '../utils/hexGrid';

export interface ShipMovementState {
  /** Which ship the current player controls ('scout' | 'corsair' | null) */
  myShip: 'scout' | 'corsair' | null;
  /** Movement rating for the current ship */
  movementRating: number;
  /** Remaining movement points this turn */
  remainingMovement: number;
  /** Whether movement is currently allowed */
  canMove: boolean;
}

export interface UseShipMovementOptions {
  /** Socket.io client instance */
  socket: Socket | null;
  /** Movement ratings for each ship type */
  movementRatings?: Record<string, number>;
}

const DEFAULT_MOVEMENT_RATINGS = {
  scout: 3,
  corsair: 2,
  'free_trader': 2,
  'far_trader': 2
};

/**
 * Hook for managing ship movement via socket.io
 */
export function useShipMovement(options: UseShipMovementOptions) {
  const { socket, movementRatings = DEFAULT_MOVEMENT_RATINGS } = options;

  const [state, setState] = useState<ShipMovementState>({
    myShip: null,
    movementRating: 0,
    remainingMovement: 0,
    canMove: false
  });

  // Set which ship the player controls
  const setMyShip = useCallback((ship: 'scout' | 'corsair' | null) => {
    const rating = ship ? (movementRatings[ship] || 2) : 0;
    setState(prev => ({
      ...prev,
      myShip: ship,
      movementRating: rating,
      remainingMovement: rating,
      canMove: ship !== null
    }));
  }, [movementRatings]);

  // Handle hex click for movement
  const handleMove = useCallback((position: HexPosition) => {
    if (!socket || !state.myShip || !state.canMove) {
      console.warn('[MOVEMENT] Cannot move:', {
        hasSocket: !!socket,
        myShip: state.myShip,
        canMove: state.canMove
      });
      return;
    }

    console.log(`[MOVEMENT] Requesting move to (${position.q}, ${position.r})`);

    socket.emit('moveShip', {
      ship: state.myShip,
      to: position
    });
  }, [socket, state.myShip, state.canMove]);

  // Reset movement points
  const resetMovement = useCallback(() => {
    setState(prev => ({
      ...prev,
      remainingMovement: prev.movementRating,
      canMove: prev.myShip !== null
    }));
  }, []);

  // Spend movement points
  const spendMovement = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      remainingMovement: Math.max(0, prev.remainingMovement - amount),
      canMove: prev.remainingMovement - amount > 0
    }));
  }, []);

  // Listen for movement results from server
  useEffect(() => {
    if (!socket) return;

    const handleMoveResult = (data: any) => {
      console.log('[MOVEMENT] Movement completed:', data);
      // Could update remainingMovement here based on server response
    };

    const handleMoveError = (error: any) => {
      console.error('[MOVEMENT] Movement error:', error);
    };

    socket.on('space:moveResult', handleMoveResult);
    socket.on('space:moveError', handleMoveError);

    return () => {
      socket.off('space:moveResult', handleMoveResult);
      socket.off('space:moveError', handleMoveError);
    };
  }, [socket]);

  return {
    ...state,
    setMyShip,
    handleMove,
    resetMovement,
    spendMovement
  };
}
