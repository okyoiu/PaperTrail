import { useState } from 'react'

// Debug-only: fake the player's GPS position so the fog-of-war reveal can be
// tested without physically walking to campus. Overrides real geolocation
// until "Use real GPS" is pressed again.
export const TELEPORT_PRESETS = [
  { name: 'Main campus (Hamman Hall)', lat: 29.7201, lng: -95.4018 },
  { name: 'Rice Village', lat: 29.716, lng: -95.4165 },
]

const panelStyle = {
  position: 'absolute',
  top: 8,
  left: 8,
  zIndex: 10,
  pointerEvents: 'auto',
  background: 'rgba(16,27,33,0.85)',
  border: '1px solid #2b424c',
  borderRadius: 8,
  fontSize: 12,
  color: '#e4ece8',
}

// Collapsed by default, and collapses again after each action, because the
// open panel covers a large part of the map (including buildings you'd click).
export function TeleportControls({ active, onTeleport, onUseRealGps, onSimulateExplored }) {
  const [open, setOpen] = useState(false)

  function runAndClose(action) {
    action()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...panelStyle, padding: '4px 10px', cursor: 'pointer' }}
      >
        Debug{active ? `: ${active.name}` : ''} ▾
      </button>
    )
  }

  return (
    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>Debug: teleport</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close debug panel"
          style={{ background: 'transparent', color: '#e4ece8', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      {TELEPORT_PRESETS.map((preset) => (
        <button
          key={preset.name}
          type="button"
          onClick={() => runAndClose(() => onTeleport(preset))}
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
        onClick={() => runAndClose(onUseRealGps)}
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
        onClick={() => runAndClose(onSimulateExplored)}
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
      <span style={{ color: '#8a9aa1', fontSize: 11 }}>
        Click a building or your dot to review; click elsewhere to move your dot
      </span>
    </div>
  )
}
