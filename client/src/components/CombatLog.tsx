import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../types/game-state';

interface CombatLogProps {
  entries: LogEntry[];
}

export default function CombatLog({ entries }: CombatLogProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

  // Auto-scroll to top when new entries are added (newest entries are at top)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [entries]);

  const toggleDetails = (index: number) => {
    const newExpanded = new Set(expandedIndexes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIndexes(newExpanded);
  };

  const getTypeColor = (type: LogEntry['type']): string => {
    const colorMap: Record<LogEntry['type'], string> = {
      hit: '#00ff00',      // Green
      miss: '#ff6b6b',     // Red
      critical: '#ff00ff', // Magenta
      damage: '#ff8800',   // Orange
      missile: '#00ffff',  // Cyan
      info: '#ffa500',     // Orange
      warning: '#ffff00',  // Yellow
      error: '#ff0000',    // Bright red
      success: '#4ade80',  // Green
      system: '#888888',   // Gray
    };
    return colorMap[type] || '#ffffff';
  };

  const getTypeEmoji = (type: LogEntry['type']): string => {
    const emojiMap: Record<LogEntry['type'], string> = {
      hit: '🎯',
      miss: '❌',
      critical: '💥',
      damage: '🔥',
      missile: '🚀',
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚫',
      success: '✅',
      system: '⚙️',
    };
    return emojiMap[type] || '•';
  };

  return (
    <div
      ref={logRef}
      style={{
        border: '1px solid #444',
        padding: '15px',
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: '#0a0a0a',
        borderRadius: '4px',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#fff' }}>
        ⚔️ Combat Log
      </h3>

      {entries.length === 0 && (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          No combat events yet...
        </div>
      )}

      {[...entries].reverse().map((entry, index) => {
        const isExpanded = expandedIndexes.has(index);
        const hasDetails = entry.details && entry.details.length > 0;
        const headerText = entry.header || entry.message; // Backward compatibility: use header if exists, otherwise message

        return (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              borderLeft: `4px solid ${getTypeColor(entry.type)}`,
              cursor: hasDetails ? 'pointer' : 'default',
            }}
            onClick={() => hasDetails && toggleDetails(index)}
          >
            {/* Header */}
            <div
              style={{
                fontWeight: 'bold',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{getTypeEmoji(entry.type)}</span>
              <span>{headerText}</span>
              {hasDetails && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: '#888',
                  }}
                >
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
            </div>

            {/* Details (collapsible) */}
            {hasDetails && isExpanded && (
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ccc',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              >
                {entry.details}
              </div>
            )}

            {/* Timestamp */}
            {entry.timestamp && (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: '#666',
                }}
              >
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
