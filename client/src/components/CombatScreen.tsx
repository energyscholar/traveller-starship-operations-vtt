import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import CombatLog from './CombatLog';
import HexGrid, { type Ship } from './HexGrid';
import { hexDistance, rangeFromDistance, type HexPosition } from '../utils/hexGrid';

export default function CombatScreen() {
  const { gameState } = useGame();
  const socket = useSocket();

  const handleFire = () => {
    if (socket) {
      socket.emit('space:fire', { turret: 0, weapon: 0 });
    }
  };

  const handleEndTurn = () => {
    if (socket) {
      socket.emit('space:endTurn');
    }
  };

  const handleHexClick = (position: HexPosition) => {
    if (socket && gameState.playerShip) {
      console.log(`[GRID] Clicked hex (${position.q}, ${position.r})`);
      socket.emit('moveShip', {
        ship: gameState.playerShip,
        to: position,
      });
    }
  };

  // Calculate range between ships
  const distance = hexDistance(
    gameState.shipPositions.scout,
    gameState.shipPositions.corsair
  );
  const range = rangeFromDistance(distance);

  // Prepare ship data for HexGrid component
  const scoutShip: Ship = {
    name: 'scout',
    position: gameState.shipPositions.scout,
    emoji: '🚀',
  };

  const corsairShip: Ship = {
    name: 'corsair',
    position: gameState.shipPositions.corsair,
    emoji: '🏴\u200d☠️',
  };

  return (
    <div className="combat-screen">
      <h1>⚔️ Space Combat</h1>

      {/* Player Info */}
      <div style={{marginBottom: '20px'}}>
        <p>Player: {gameState.playerNumber}</p>
        <p>Ship: {gameState.playerShip}</p>
        <p>Mode: {gameState.mode}</p>
        <p>Turn: {gameState.currentTurn}</p>
        <p>Range: {range} ({Math.floor(distance)} hexes)</p>
      </div>

      {/* Hex Grid */}
      <div style={{marginBottom: '20px'}}>
        <HexGrid
          scout={scoutShip}
          corsair={corsairShip}
          onHexClick={handleHexClick}
        />
      </div>

      {/* Combat Actions */}
      <div style={{marginBottom: '20px'}}>
        <button onClick={handleFire} style={{padding: '10px 20px', marginRight: '10px'}}>
          🔥 Fire Weapon
        </button>
        <button onClick={handleEndTurn} style={{padding: '10px 20px'}}>
          ⏭️ End Turn
        </button>
      </div>

      {/* Combat Log - Enhanced Component */}
      <CombatLog entries={gameState.combatLog} />
    </div>
  );
}
