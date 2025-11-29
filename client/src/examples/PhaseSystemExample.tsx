import { useState, useEffect } from 'react';
import MultiShipDisplay, { type ShipData } from '../components/MultiShipDisplay';
import PhaseDisplay, { type Phase } from '../components/PhaseDisplay';

/**
 * Integration Example: Traveller Combat Phase System
 *
 * This example demonstrates:
 * - MultiShipDisplay with multiple ships
 * - PhaseDisplay with phase sequencing
 * - Integration with backend phase-system.js logic
 * - Initiative ordering and active ship tracking
 * - Phase advancement with round cycling
 */

// Mock backend functions (in real app, import from phase-system.js via API)
function calculateInitiative(pilotSkill: number, thrust: number): number {
  const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  return roll + pilotSkill + thrust;
}

function getInitiativeOrder(ships: ShipData[]): ShipData[] {
  const sorted = [...ships];
  sorted.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return (b.initiative || 0) - (a.initiative || 0);
    }
    return a.id.localeCompare(b.id);
  });
  return sorted;
}

const PHASE_SEQUENCE: Phase[] = ['manoeuvre', 'attack', 'actions', 'round_end'];

export default function PhaseSystemExample() {
  // Combat state
  const [ships, setShips] = useState<ShipData[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>('manoeuvre');
  const [currentRound, setCurrentRound] = useState(1);
  const [activeShipIndex, setActiveShipIndex] = useState(0);
  const [orderedShips, setOrderedShips] = useState<ShipData[]>([]);
  const [combatStarted, setCombatStarted] = useState(false);

  // Initialize example ships
  useEffect(() => {
    const exampleShips: ShipData[] = [
      {
        id: 'scout-01',
        name: 'Scout Ship "Beowulf"',
        hull: { current: 32, max: 40 },
        initiative: calculateInitiative(2, 2),
        color: '#4ade80'
      },
      {
        id: 'trader-01',
        name: 'Free Trader "Marava"',
        hull: { current: 55, max: 60 },
        initiative: calculateInitiative(1, 1),
        color: '#60a5fa'
      },
      {
        id: 'pirate-01',
        name: 'Corsair "Black Star"',
        hull: { current: 40, max: 40 },
        initiative: calculateInitiative(3, 3),
        color: '#ef4444'
      },
      {
        id: 'patrol-01',
        name: 'System Defense "Guardian"',
        hull: { current: 48, max: 50 },
        initiative: calculateInitiative(2, 2),
        color: '#8b5cf6'
      }
    ];

    setShips(exampleShips);
    const ordered = getInitiativeOrder(exampleShips);
    setOrderedShips(ordered);
  }, []);

  // Get current active ship
  const activeShip = orderedShips[activeShipIndex] || null;

  // Advance to next ship in initiative order
  const advanceToNextShip = () => {
    const nextIndex = (activeShipIndex + 1) % orderedShips.length;

    // If we've cycled through all ships, advance phase
    if (nextIndex === 0) {
      advancePhase();
    } else {
      setActiveShipIndex(nextIndex);
    }
  };

  // Advance to next phase
  const advancePhase = () => {
    const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
    const nextPhase = PHASE_SEQUENCE[(currentIndex + 1) % PHASE_SEQUENCE.length];

    setCurrentPhase(nextPhase);
    setActiveShipIndex(0); // Reset to first ship in new phase

    // If cycling back to manoeuvre, increment round
    if (nextPhase === 'manoeuvre') {
      setCurrentRound(prev => prev + 1);
    }
  };

  // Start combat
  const startCombat = () => {
    setCombatStarted(true);
    setActiveShipIndex(0);
  };

  // Reset combat
  const resetCombat = () => {
    setCombatStarted(false);
    setCurrentPhase('manoeuvre');
    setCurrentRound(1);
    setActiveShipIndex(0);

    // Re-roll initiative
    const newShips = ships.map(ship => ({
      ...ship,
      initiative: calculateInitiative(
        ship.id.includes('scout') || ship.id.includes('pirate') ? 2 : 1,
        ship.id.includes('pirate') ? 3 : ship.id.includes('scout') ? 2 : 1
      )
    }));
    setShips(newShips);
    setOrderedShips(getInitiativeOrder(newShips));
  };

  // Simulate damage to active ship
  const damageActiveShip = () => {
    if (!activeShip) return;

    setShips(prev => prev.map(ship => {
      if (ship.id === activeShip.id) {
        const damage = Math.floor(Math.random() * 10) + 5;
        const newCurrent = Math.max(0, ship.hull.current - damage);
        return {
          ...ship,
          hull: { ...ship.hull, current: newCurrent },
          isDestroyed: newCurrent <= 0
        };
      }
      return ship;
    }));

    setOrderedShips(prev => prev.map(ship => {
      if (ship.id === activeShip.id) {
        const damage = Math.floor(Math.random() * 10) + 5;
        const newCurrent = Math.max(0, ship.hull.current - damage);
        return {
          ...ship,
          hull: { ...ship.hull, current: newCurrent },
          isDestroyed: newCurrent <= 0
        };
      }
      return ship;
    }));
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>
        Traveller Combat Phase System - Integration Example
      </h1>

      {/* Control Panel */}
      <div style={{
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '2px solid #444'
      }}>
        <h2 style={{ marginBottom: '15px', fontSize: '1.3rem' }}>Combat Controls</h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!combatStarted ? (
            <button
              onClick={startCombat}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4ade80',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Start Combat
            </button>
          ) : (
            <>
              <button
                onClick={advanceToNextShip}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#60a5fa',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Next Ship's Turn ▶
              </button>

              <button
                onClick={advancePhase}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Skip to Next Phase ⏭️
              </button>

              <button
                onClick={damageActiveShip}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Damage Active Ship 💥
              </button>

              <button
                onClick={resetCombat}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Reset Combat
              </button>
            </>
          )}
        </div>

        {combatStarted && activeShip && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px'
          }}>
            <strong>Current Turn:</strong> {activeShip.name} (Initiative: {activeShip.initiative})
          </div>
        )}
      </div>

      {/* Phase Display */}
      {combatStarted && (
        <PhaseDisplay
          currentPhase={currentPhase}
          currentRound={currentRound}
          onAdvancePhase={advancePhase}
        />
      )}

      {/* Multi-Ship Display */}
      <MultiShipDisplay
        ships={ships}
        currentPhase={currentPhase}
        activeShipId={combatStarted ? activeShip?.id : null}
      />

      {/* Initiative Order Display */}
      {combatStarted && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '2px solid #444'
        }}>
          <h2 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>
            Initiative Order (Highest to Lowest)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orderedShips.map((ship, index) => (
              <div
                key={ship.id}
                style={{
                  padding: '10px',
                  backgroundColor: index === activeShipIndex ? `${ship.color}20` : '#0a0a0a',
                  border: `2px solid ${index === activeShipIndex ? ship.color : '#333'}`,
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: index === activeShipIndex ? 'bold' : 'normal' }}>
                  {index === activeShipIndex && '▶ '}
                  {index + 1}. {ship.name}
                </span>
                <span style={{ color: ship.color }}>
                  Initiative: {ship.initiative}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example Documentation */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '2px solid #444'
      }}>
        <h2 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>
          Integration Notes
        </h2>
        <ul style={{ lineHeight: '1.8', color: '#aaa' }}>
          <li><strong>Phase Sequencing:</strong> Manoeuvre → Attack → Actions → Round End (cycles back to Manoeuvre)</li>
          <li><strong>Initiative Order:</strong> Ships act in descending initiative order within each phase</li>
          <li><strong>Active Ship Tracking:</strong> Visual highlighting shows whose turn it is</li>
          <li><strong>Hull Damage:</strong> Color-coded health bars (Green &gt; 66%, Amber 33-66%, Red &lt; 33%)</li>
          <li><strong>Destroyed Ships:</strong> Ships with 0 hull are marked destroyed and dimmed</li>
          <li><strong>Round Tracking:</strong> Round counter increments when phase cycles back to Manoeuvre</li>
        </ul>
      </div>
    </div>
  );
}
