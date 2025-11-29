import { createContext, useState, useContext, useCallback, type ReactNode } from 'react';
import type { GameState, LogEntry } from '../types/game-state';

interface GameContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
  addLogEntry: (message: string, type?: LogEntry['type']) => void;
  resetGameState: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hook to use game context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

// Initial game state
const initialGameState: GameState = {
  // Connection
  connected: false,
  socketId: null,

  // Player
  playerId: null,
  playerNumber: null,
  playerShip: null,

  // Opponent
  opponentShip: null,

  // Mode
  mode: null,

  // Combat
  combat: null,
  currentTurn: null,
  currentRound: null,
  combatLog: [],

  // Range
  selectedRange: null,
};

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const addLogEntry = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: Date.now(),
      message,
      type,
    };
    setGameState(prev => ({
      ...prev,
      combatLog: [...prev.combatLog, entry],
    }));
  }, []);

  const resetGameState = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  const value: GameContextType = {
    gameState,
    updateGameState,
    addLogEntry,
    resetGameState,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;
