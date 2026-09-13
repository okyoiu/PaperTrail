import { Marker, Popup } from 'maplibre-gl'
import { bearingDegrees, distanceMeters } from '../../utils/geo'
import { characterSvg, getCharacter } from './characters'
import { TELEPORT_METERS } from './playerAvatar'

// Positions arrive every few seconds (see hooks/usePlayersMap.js), so a walk
// between two of them is drawn over this long rather than as a jump.
const GLIDE_MS = 900
// Closer than this is GPS jitter: leave the figure where it is.
const MIN_STEP_METERS = 1.5

function createElement(tag, className) {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function describeAge(isoTimestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoTimestamp).getTime()) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  return minutes <= 1 ? '1 min ago' : `${minutes} min ago`
}

// Another player's character on the map: their name above the figure, which
// walks to each new position facing the way it's going, like the player's own
// avatar (playerAvatar.js) minus the ring and the camera. Tapping it opens a
// popup with who they are and when they were last seen.
export function createRemotePlayerMarker(map) {
  const element = createElement('div', 'map-marker-player')
  const nameElement = createElement('span', 'map-marker-player-name')
  const figureElement = createElement('div', 'player-avatar-figure')
  element.append(nameElement, figureElement)
  const popup = new Popup({ offset: 68, closeButton: false })
  const marker = new Marker({ element, anchor: 'bottom', subpixelPositioning: true }).setPopup(popup)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let shown = null // { lat, lng } the figure is drawn at right now
  let styleKey = null
  let frameId = null

  function place(lngLat) {
    shown = lngLat
    marker.setLngLat([lngLat.lng, lngLat.lat])
  }

  // A flat sprite can only look left or right (see playerAvatar.js).
  function face(bearing) {
    const sideways = Math.sin(((bearing - map.getBearing()) * Math.PI) / 180)
    if (Math.abs(sideways) > 0.2) element.classList.toggle('is-facing-left', sideways < 0)
  }

  function glide(from, to) {
    const start = performance.now()
    element.classList.add('is-walking')
    function step(now) {
      const t = Math.min(1, (now - start) / GLIDE_MS)
      place({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t })
      if (t < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        frameId = null
        element.classList.remove('is-walking')
      }
    }
    frameId = requestAnimationFrame(step)
  }

  function moveTo(position) {
    const target = { lat: position.lat, lng: position.lng }
    cancelAnimationFrame(frameId)
    frameId = null

    if (!shown) {
      place(target)
      marker.addTo(map)
      return
    }

    const distance = distanceMeters(shown, target)
    if (distance < MIN_STEP_METERS) return
    if (distance > TELEPORT_METERS || reducedMotion.matches) {
      element.classList.remove('is-walking')
      place(target)
      return
    }
    face(bearingDegrees(shown, target))
    glide(shown, target)
  }

  // player: { username, characterId, isFriend, updatedAt } (see usePlayersMap).
  // The DOM is only rebuilt when the look changes, since this runs on every move.
  function setPlayer(player) {
    const character = getCharacter(player.characterId)
    const nextKey = `${character.id}|${player.isFriend}|${player.username}`
    if (nextKey !== styleKey) {
      styleKey = nextKey
      element.classList.toggle('is-friend', player.isFriend)
      element.style.setProperty('--avatar-accent', character.accent)
      nameElement.textContent = player.username // user input, so text only
      figureElement.innerHTML = characterSvg(character) // static markup, see characters.js
    }
    popup.setText(`${player.username} · ${player.isFriend ? 'Friend' : 'Explorer'} · ${describeAge(player.updatedAt)}`)
  }

  function remove() {
    cancelAnimationFrame(frameId)
    marker.remove()
  }

  return { moveTo, setPlayer, remove }
}
