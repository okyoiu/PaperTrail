// Bottom-right camera buttons: switch between the close walking view and a
// zoomed-out overview, and snap back to the player after panning away.
export function CameraControls({ zoomedOut, showRecenter, onToggleZoom, onRecenter }) {
  return (
    <div className="map-camera-controls">
      {showRecenter && (
        <button type="button" className="map-camera-button" onClick={onRecenter}>
          ◎ Recenter
        </button>
      )}
      <button type="button" className="map-camera-button" onClick={onToggleZoom}>
        {zoomedOut ? '⊕ Zoom in' : '⊖ Zoom out'}
      </button>
    </div>
  )
}
