import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import CombatLog from './CombatLog';
import HexGrid, { type Ship } from './HexGrid';
import RangeDisplay from './RangeDisplay';
import TurnIndicator from './TurnIndicator';
import WeaponSelector from './WeaponSelector';
import { hexDistance, rangeFromDistance, type HexPosition } from '../utils/hexGrid';

export default function CombatScreen() {
  const { gameState } = useGame();
  const socket = useSocket();

  // Determine turn state for button enabling/disabling
  const isMyTurn = gameState.currentTurn === gameState.playerShip;
  const gameStarted = (gameState.currentRound ?? 0) > 0;
  const hasShip = gameState.playerShip !== null;

  // Button disabled states
  const fireDisabled = !gameStarted || !isMyTurn || !hasShip;
  const endTurnDisabled = !gameStarted || !isMyTurn;

  const handleFire = () => {
    if (socket && !fireDisabled) {
      socket.emit('space:fire', { turret: 0, weapon: 0 });
    }
  };

  const handleEndTurn = () => {
    if (socket && !endTurnDisabled) {
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
      </div>

      {/* Turn Indicator */}
      <TurnIndicator />

      {/* Range Display */}
      <RangeDisplay range={range} distance={distance} />

      {/* Hex Grid */}
      <div style={{marginBottom: '20px'}}>
        <HexGrid
          scout={scoutShip}
          corsair={corsairShip}
          onHexClick={handleHexClick}
        />
      </div>

      {/* Weapon Selector */}
      <WeaponSelector />

      {/* Combat Actions */}
      <div style={{marginBottom: '20px'}}>
        <button
          onClick={handleFire}
          disabled={fireDisabled}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            opacity: fireDisabled ? 0.5 : 1,
            cursor: fireDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          🔥 Fire Weapon
        </button>
        <button
          onClick={handleEndTurn}
          disabled={endTurnDisabled}
          style={{
            padding: '10px 20px',
            opacity: endTurnDisabled ? 0.5 : 1,
            cursor: endTurnDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          ⏭️ End Turn
        </button>
      </div>

      {/* Combat Log - Enhanced Component */}
      <CombatLog entries={gameState.combatLog} />
    </div>
  );
}
