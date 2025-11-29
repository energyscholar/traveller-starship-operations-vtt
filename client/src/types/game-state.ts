// Game State Types for React Migration

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
  currentTurn: 'player1' | 'player2' | null;
  combatLog: LogEntry[];

  // Range
  selectedRange: string | null;
}
