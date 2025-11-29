import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import CombatLog from './CombatLog';

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

  return (
    <div className="combat-screen">
      <h1>⚔️ Space Combat</h1>

      {/* Player Info */}
      <div style={{marginBottom: '20px'}}>
        <p>Player: {gameState.playerNumber}</p>
        <p>Ship: {gameState.playerShip}</p>
        <p>Mode: {gameState.mode}</p>
        <p>Turn: {gameState.currentTurn}</p>
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
