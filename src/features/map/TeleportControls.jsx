import { REVIEW_XP_AWARD } from '../game/xp'
import { useAchievements } from '../../hooks/useAchievements'

// Debug-only: fake the player's GPS position so the fog-of-war reveal can be
// tested without physically walking to campus. Overrides real geolocation
// until "Use real GPS" is pressed again.
export const TELEPORT_PRESETS = [
  { name: 'Main campus (Hamman Hall)', lat: 29.7201, lng: -95.4018 },
  { name: 'Rice Village', lat: 29.716, lng: -95.4165 },
]

const progressButtonStyle = {
  flex: 1,
  background: 'transparent',
  color: '#e4ece8',
  border: '1px solid #2b424c',
  borderRadius: 5,
  padding: '4px 8px',
  cursor: 'pointer',
}

// Opened by the bug-icon map control (see debugToggleControl.js), and closes
// again after each teleport/reveal, because the open panel covers a large part
// of the map (including buildings you'd click). The progress buttons leave it
// open so they can be pressed repeatedly; both are display-only.
export function TeleportControls({ active, onTeleport, onUseRealGps, onRevealAll, onAddXp, onClose }) {
  const { previewAchievement } = useAchievements()

  function runAndClose(action) {
    action()
    onClose()
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(var(--safe-top, 0px) + var(--xp-corner-h, 0px) + 8px)', // below MapPage's XP bar
        left: 8,
        maxWidth: 240, // clear of the camera buttons on the right
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
        color: '#e4ece8',
      }}
    >
      <strong>Debug: teleport</strong>
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
        onClick={() => runAndClose(onRevealAll)}
        title="Preview only - lifts the fog without saving any visits"
        style={{
          background: 'transparent',
          color: '#e4ece8',
          border: '1px dashed #2b424c',
          borderRadius: 5,
          padding: '4px 8px',
          cursor: 'pointer',
        }}
      >
        Reveal all buildings
      </button>
      <strong style={{ marginTop: 4 }}>Debug: progress</strong>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={onAddXp}
          title="Display only - grows the XP bar without saving anything"
          style={progressButtonStyle}
        >
          +{REVIEW_XP_AWARD} XP
        </button>
        <button
          type="button"
          onClick={previewAchievement}
          title="Display only - plays the next achievement toast"
          style={progressButtonStyle}
        >
          Show achievement
        </button>
      </div>
      <span style={{ color: '#8a9aa1', fontSize: 11 }}>
        Click a building or your character to review; click elsewhere to walk there
      </span>
    </div>
  )
}
