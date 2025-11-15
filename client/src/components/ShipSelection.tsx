import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import ShipCard from './shared/ShipCard';

const AVAILABLE_SHIPS = ['Scout Ship', 'Free Trader', 'Patrol Corvette'];

export default function ShipSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gameState, updateGameState } = useGame();
  const socket = useSocket();

  const mode = searchParams.get('mode') || 'multiplayer';
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  useEffect(() => {
    updateGameState({ mode: mode as 'solo' | 'multiplayer' });
  }, [mode, updateGameState]);

  const handleShipSelect = (shipName: string) => {
    setSelectedShip(shipName);
    updateGameState({ playerShip: shipName });
    if (socket) {
      socket.emit('space:selectShip', { ship: shipName });
    }
  };

  const handleReady = () => {
    if (!selectedShip) {
      alert('Please select a ship first!');
      return;
    }
    if (socket) {
      socket.emit('space:ready');
    }
    // Navigate to combat (will be implemented in Step 5)
    navigate('/combat');
  };

  return (
    <div className="ship-selection-screen">
      <h1>Select Your Ship</h1>
      <p>Mode: {mode === 'solo' ? '🤖 Solo (vs AI)' : '👥 Multiplayer'}</p>

      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
        {AVAILABLE_SHIPS.map(ship => (
          <ShipCard
            key={ship}
            shipName={ship}
            selected={selectedShip === ship}
            onSelect={handleShipSelect}
          />
        ))}
      </div>

      <button
        onClick={handleReady}
        disabled={!selectedShip}
        style={{
          padding: '15px 30px',
          fontSize: '1.2em',
          marginTop: '30px',
          cursor: selectedShip ? 'pointer' : 'not-allowed',
          opacity: selectedShip ? 1 : 0.5
        }}
        data-test-id="ready-button"
      >
        Ready for Combat
      </button>
    </div>
  );
}
