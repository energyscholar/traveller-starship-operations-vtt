/**
 * HexGrid Component
 *
 * Renders an interactive SVG hex grid for ship movement and combat visualization.
 * Implements flat-top hex orientation matching the vanilla app.
 */

import { useCallback, useMemo } from 'react';
import { hexToPixel, HEX_SIZE, type HexPosition } from '../utils/hexGrid';

/** Grid configuration */
const GRID_SIZE = 10;  // 10x10 hex grid

/** Ship configuration */
export interface Ship {
  name: 'scout' | 'corsair';
  position: HexPosition;
  emoji: string;  // '🚀' for scout, '🏴\u200d☠️' for corsair
}

interface HexGridProps {
  /** Scout ship position and emoji */
  scout: Ship;
  /** Corsair ship position and emoji */
  corsair: Ship;
  /** Handler called when a hex is clicked */
  onHexClick?: (position: HexPosition) => void;
  /** Optional: currently selected hex for highlighting */
  selectedHex?: HexPosition | null;
}

/**
 * Generate SVG polygon points for a flat-top hexagon
 * @param centerX - Center x coordinate
 * @param centerY - Center y coordinate
 * @param size - Hex radius
 * @returns SVG points string
 */
function generateHexPoints(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export default function HexGrid({ scout, corsair, onHexClick, selectedHex }: HexGridProps) {
  /**
   * Handle hex click events
   */
  const handleHexClick = useCallback((q: number, r: number) => {
    if (onHexClick) {
      onHexClick({ q, r });
    }
  }, [onHexClick]);

  /**
   * Generate all hexagons for the grid
   * Memoized to avoid regenerating on every render
   */
  const hexagons = useMemo(() => {
    const hexes = [];
    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const pos = hexToPixel(q, r);
        const points = generateHexPoints(pos.x, pos.y, HEX_SIZE);
        const isSelected = selectedHex && selectedHex.q === q && selectedHex.r === r;

        hexes.push(
          <polygon
            key={`hex-${q}-${r}`}
            points={points}
            className={isSelected ? 'hex selected' : 'hex'}
            onClick={() => handleHexClick(q, r)}
            style={{
              fill: isSelected ? 'rgba(100, 150, 255, 0.3)' : 'rgba(50, 50, 50, 0.3)',
              stroke: isSelected ? '#6496ff' : '#444',
              strokeWidth: 1,
              cursor: 'pointer',
            }}
            data-q={q}
            data-r={r}
          />
        );
      }
    }
    return hexes;
  }, [selectedHex, handleHexClick]);

  /**
   * Render a ship marker (circle + emoji)
   */
  const renderShip = useCallback((ship: Ship) => {
    const pos = hexToPixel(ship.position.q, ship.position.r);
    const radius = HEX_SIZE * 0.6;

    return (
      <g key={`ship-${ship.name}`} data-ship={ship.name}>
        {/* Ship circle background */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={radius}
          className={`ship-marker ${ship.name}`}
          style={{
            fill: ship.name === 'scout' ? '#4a9eff' : '#ff4a4a',
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
        {/* Ship emoji */}
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {ship.emoji}
        </text>
      </g>
    );
  }, []);

  // Calculate SVG viewBox dimensions
  // Grid is 10x10, with offset of 50px, and some padding
  const svgWidth = GRID_SIZE * HEX_SIZE * 1.5 + 100;
  const svgHeight = GRID_SIZE * HEX_SIZE * 2 + 100;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{
        maxWidth: '600px',
        maxHeight: '600px',
        border: '1px solid #333',
        background: '#1a1a1a',
      }}
    >
      {/* Render all hexagons */}
      {hexagons}

      {/* Render ships on top of hexagons */}
      {renderShip(scout)}
      {renderShip(corsair)}
    </svg>
  );
}
