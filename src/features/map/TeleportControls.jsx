// Debug-only: fake the player's GPS position so the fog-of-war reveal can be
// tested without physically walking to campus. Overrides real geolocation
// until "Use real GPS" is pressed again.
export const TELEPORT_PRESETS = [
  { name: 'Main campus (Hamman Hall)', lat: 29.7201, lng: -95.4018 },
  { name: 'Rice Village', lat: 29.716, lng: -95.4165 },
]

export function TeleportControls({ active, onTeleport, onUseRealGps, onSimulateExplored }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 10,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'rgba(16,27,33,0.85)',
        border: '1px solid #2b424c',
        borderRadius: 8,
        padding: 8,
        fontSize: 12,
      }}
    >
      <strong style={{ color: '#e4ece8' }}>Debug: teleport</strong>
      {TELEPORT_PRESETS.map((preset) => (
        <button
          key={preset.name}
          type="button"
          onClick={() => onTeleport(preset)}
          style={{
            background: active?.name === preset.name ? '#e8a33d' : 'transparent',
            color: active?.name === preset.name ? '#241503' : '#e4ece8',
            border: '1px solid #2b424c',
            borderRadius: 5,
            padding: '4px 8px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {preset.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onUseRealGps}
        style={{
          background: !active ? '#63b183' : 'transparent',
          color: !active ? '#0d1512' : '#e4ece8',
          border: '1px solid #2b424c',
          borderRadius: 5,
          padding: '4px 8px',
          cursor: 'pointer',
        }}
      >
        Use real GPS
      </button>
      <button
        type="button"
        onClick={onSimulateExplored}
        title="Preview only - doesn't save these as real visits"
        style={{
          background: 'transparent',
          color: '#e4ece8',
          border: '1px dashed #2b424c',
          borderRadius: 5,
          padding: '4px 8px',
          cursor: 'pointer',
        }}
      >
        Simulate explored
      </button>
    </div>
  )
}
