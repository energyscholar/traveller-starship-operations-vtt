import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../context/GameContext';

export default function MainMenu() {
  const navigate = useNavigate();
  const socket = useSocket();
  const { gameState } = useGame();

  const handleSpaceBattle = () => {
    navigate('/ship-selection?mode=multiplayer');
  };

  const handleSoloBattle = () => {
    navigate('/ship-selection?mode=solo');
  };

  const handleShipTemplates = () => {
    // TODO: Migrate ship templates page (later step)
    window.location.href = '/ship-templates.html';
  };

  const handleCustomizer = () => {
    // Will implement in Step 7
    navigate('/customizer');
  };

  return (
    <div className="main-menu-screen" data-screen="main-menu">
      {/* Header */}
      <div className="header">
        <h1>⚔️ Traveller Combat VTT</h1>
        <div className="stage">
          React Migration - Step 3 Complete
        </div>
        {gameState.connected && (
          <div className="connection-status" style={{ color: '#4ade80', fontSize: '0.9em', marginTop: '10px' }}>
            ✓ Connected: {gameState.socketId?.substring(0, 8)}
          </div>
        )}
      </div>

      {/* Main Menu Card */}
      <div className="card main-menu-card">
        <h2>🚀 Choose Your Mission</h2>

        <div className="menu-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            className="menu-button space-battle-btn"
            onClick={handleSpaceBattle}
            data-test-id="btn-space-battle"
            style={{ padding: '15px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            ⚔️ Space Battle (Multiplayer)
          </button>

          <button
            className="menu-button solo-battle-btn"
            onClick={handleSoloBattle}
            data-test-id="btn-solo-battle"
            style={{ padding: '15px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            🤖 Solo Battle (vs AI)
          </button>

          <button
            className="menu-button ship-templates-btn"
            onClick={handleShipTemplates}
            data-test-id="btn-ship-templates"
            style={{ padding: '15px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            📋 Ship Templates
          </button>

          <button
            className="menu-button ship-customizer-btn"
            onClick={handleCustomizer}
            data-test-id="btn-ship-customizer"
            style={{ padding: '15px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            🛠️ Ship Customizer
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="footer-info" style={{ textAlign: 'center', marginTop: '30px', color: '#888' }}>
        <p>Traveller Combat VTT - React Edition</p>
        <p>Migration: Step 3/8 Complete (37.5%)</p>
      </div>
    </div>
  );
}
