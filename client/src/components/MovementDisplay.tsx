/**
 * MovementDisplay Component
 *
 * Shows ship movement rating and remaining movement points during combat.
 * Integrates with useShipMovement hook for real-time updates.
 */

export interface MovementDisplayProps {
  /** Ship movement rating (max movement per turn) */
  movementRating: number;
  /** Remaining movement points this turn */
  remainingMovement: number;
  /** Whether movement is currently allowed */
  canMove: boolean;
  /** Optional: compact mode for smaller displays */
  compact?: boolean;
}

export default function MovementDisplay({
  movementRating,
  remainingMovement,
  canMove,
  compact = false
}: MovementDisplayProps) {
  const percentRemaining = movementRating > 0
    ? (remainingMovement / movementRating) * 100
    : 0;

  // Color based on remaining movement
  const getColor = () => {
    if (!canMove) return '#666';
    if (percentRemaining > 66) return '#4ade80'; // Green
    if (percentRemaining > 33) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        border: `1px solid ${getColor()}`,
        fontSize: '0.9rem'
      }}>
        <span style={{ color: getColor(), fontWeight: 'bold' }}>
          {remainingMovement}/{movementRating}
        </span>
        <span style={{ color: '#999', fontSize: '0.8rem' }}>hexes</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#1a1a1a',
      border: '2px solid #333',
      borderRadius: '8px',
      minWidth: '180px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          color: '#ccc',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Movement
        </span>
        <span style={{
          color: getColor(),
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          {remainingMovement} / {movementRating}
        </span>
      </div>

      {/* Movement bar */}
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: '#2a2a2a',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentRemaining}%`,
          height: '100%',
          backgroundColor: getColor(),
          transition: 'width 0.3s ease, background-color 0.3s ease'
        }} />
      </div>

      {!canMove && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.75rem',
          color: '#999',
          textAlign: 'center'
        }}>
          No movement available
        </div>
      )}
    </div>
  );
}
