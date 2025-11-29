// Game State Types for React Migration

/** Hex position in offset coordinates */
export interface HexPosition {
  q: number;  // Column
  r: number;  // Row
}

/** Ship positions on the hex grid */
export interface ShipPositions {
  scout: HexPosition;
  corsair: HexPosition;
}

export interface LogEntry {
  timestamp: number;
  message: string; // Legacy field, maps to 'header' in new component
  header?: string; // Optional: explicit header (use this or message)
  details?: string; // Optional: additional details (collapsible)
  type: 'hit' | 'miss' | 'critical' | 'damage' | 'missile' | 'info' | 'warning' | 'error' | 'success' | 'system';
}

export interface GameState {
  // Connection
  connected: boolean;
  socketId: string | null;

  // Player
  playerId: number | null;
  playerNumber: number | null;
  playerShip: string | null;

  // Opponent
  opponentShip: string | null;

  // Mode
  mode: 'solo' | 'multiplayer' | null;

  // Combat
  combat: any | null; // Will be typed more specifically later
  currentTurn: 'player1' | 'player2' | 'scout' | 'corsair' | null;
  currentRound: number | null;
  combatLog: LogEntry[];

  // Players
  assignments?: any; // Ship assignments
  totalPlayers?: number; // Total connected players
  initiative?: any; // Initiative data

  // Range
  selectedRange: string | null;

  // Hex Grid
  shipPositions: ShipPositions;
}
