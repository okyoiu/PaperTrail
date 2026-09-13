// A small MapLibre control button, stacked under the zoom/compass buttons,
// that opens and closes the debug teleport menu (TeleportControls).
const BUG_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto">
  <rect x="8" y="6" width="8" height="14" rx="4" />
  <path d="M12 10v10M9 4l1.5 2M15 4l-1.5 2M8 13H4M20 13h-4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2" />
</svg>`

export class DebugToggleControl {
  constructor(onToggle) {
    this._onToggle = onToggle
  }

  onAdd() {
    this._container = document.createElement('div')
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    this._button = document.createElement('button')
    this._button.type = 'button'
    this._button.title = 'Debug menu'
    this._button.setAttribute('aria-label', 'Debug menu')
    this._button.innerHTML = BUG_ICON
    this._button.addEventListener('click', this._onToggle)
    this._container.appendChild(this._button)
    this.setActive(false)
    return this._container
  }

  onRemove() {
    this._button.removeEventListener('click', this._onToggle)
    this._container.remove()
  }

  // Highlights the button in the debug menu's amber while the menu is open.
  setActive(active) {
    if (!this._button) return
    this._button.setAttribute('aria-pressed', String(active))
    this._button.style.background = active ? '#e8a33d' : ''
    this._button.style.color = active ? '#241503' : '#333'
  }
}
