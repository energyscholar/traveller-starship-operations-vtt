interface ShipCardProps {
  shipName: string;
  selected: boolean;
  onSelect: (shipName: string) => void;
}

export default function ShipCard({ shipName, selected, onSelect }: ShipCardProps) {
  return (
    <div
      className={`ship-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(shipName)}
      style={{
        padding: '20px',
        margin: '10px',
        border: selected ? '3px solid #4ade80' : '2px solid #444',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: selected ? '#1a3a1a' : '#1a1a1a'
      }}
    >
      <h3>{shipName}</h3>
      {selected && <span style={{color: '#4ade80'}}>✓ Selected</span>}
    </div>
  );
}
