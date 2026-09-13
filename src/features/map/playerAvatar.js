import { Marker } from 'maplibre-gl'
import { bearingDegrees, distanceMeters } from '../../utils/geo'
import { characterSvg, getCharacter } from './characters'

// Farther than this between two fixes is a jump (a debug teleport, or GPS
// coming back after a gap), so the character appears there instead of walking.
const TELEPORT_METERS = 200
// Each walk between fixes lasts about as long as the gap since the previous
// fix, so steady ~1Hz GPS reads as continuous walking instead of hop-pause-hop.
const MIN_GLIDE_MS = 300
const MAX_GLIDE_MS = 1200
// When the GPS doesn't report speed, moves shorter than this count as jitter:
// the character still slides over, but without the walk cycle or turning.
const MIN_STEP_METERS = 1.5
const MIN_WALKING_SPEED_MPS = 0.5
// Keeps the walk cycle going across the short pause before the next fix.
const STOP_WALKING_AFTER_MS = 800

// innerHTML is fine here: every caller passes static markup (including the
// figures from characters.js), never user input.
function createElement(className, html) {
  const node = document.createElement('div')
  node.className = className
  if (html) node.innerHTML = html
  return node
}

// The player's Pokemon Go-style character: an upright sprite (always facing
// the camera, so it stays readable at any pitch) standing on a ring that lies
// flat on the map and points the way they're walking. Between position fixes
// it walks rather than jumps, and moveTo() reports how long that walk takes
// so the camera can follow in step. setCharacter() swaps which character it is.
export function createPlayerAvatar(map, character = getCharacter()) {
  const figureElement = createElement('player-avatar-figure')
  const element = createElement('player-avatar')
  element.append(figureElement)
  const ringElement = createElement('player-ring', '<div class="player-ring-heading"></div>')
  const figure = new Marker({ element, anchor: 'bottom', subpixelPositioning: true })
  const ring = new Marker({
    element: ringElement,
    pitchAlignment: 'map',
    rotationAlignment: 'map',
    subpixelPositioning: true,
  })
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let shown = null // { lat, lng } the character is drawn at right now
  let heading = null // degrees clockwise from north
  let lastFixAt = 0
  let frameId = null
  let stopWalkingTimer = null

  function place(lngLat) {
    shown = lngLat
    figure.setLngLat([lngLat.lng, lngLat.lat])
    ring.setLngLat([lngLat.lng, lngLat.lat])
  }

  // A flat sprite can only look left or right, so pick whichever side of the
  // screen the heading points toward. Walking straight toward or away from
  // the camera keeps the last facing rather than flickering.
  function updateFacing() {
    if (heading === null) return
    const sideways = Math.sin(((heading - map.getBearing()) * Math.PI) / 180)
    if (Math.abs(sideways) > 0.2) element.classList.toggle('is-facing-left', sideways < 0)
  }

  function turnTo(newHeading) {
    heading = newHeading
    ring.setRotation(newHeading)
    ringElement.classList.add('has-heading')
    updateFacing()
  }

  function startWalking() {
    clearTimeout(stopWalkingTimer)
    element.classList.add('is-walking')
  }

  function stopWalkingSoon() {
    clearTimeout(stopWalkingTimer)
    stopWalkingTimer = setTimeout(() => element.classList.remove('is-walking'), STOP_WALKING_AFTER_MS)
  }

  function glide(from, to, duration) {
    const start = performance.now()
    function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      place({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t })
      if (t < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        frameId = null
        stopWalkingSoon()
      }
    }
    frameId = requestAnimationFrame(step)
  }

  // Returns { duration, teleported }: how long the walk to `position` takes
  // (0 when the character is placed there directly), and whether it was a
  // jump too far to walk (including the very first fix).
  function moveTo(position) {
    const target = { lat: position.lat, lng: position.lng }
    const now = performance.now()
    const sinceLastFix = now - lastFixAt
    lastFixAt = now
    cancelAnimationFrame(frameId)

    if (!shown) {
      place(target)
      figure.addTo(map)
      ring.addTo(map)
      return { duration: 0, teleported: true }
    }

    const distance = distanceMeters(shown, target)
    if (distance > TELEPORT_METERS) {
      clearTimeout(stopWalkingTimer)
      element.classList.remove('is-walking')
      place(target)
      return { duration: 0, teleported: true }
    }

    const walking =
      position.speed != null ? position.speed >= MIN_WALKING_SPEED_MPS : distance >= MIN_STEP_METERS
    if (walking) {
      startWalking()
      if (Number.isFinite(position.heading)) turnTo(position.heading)
      else if (distance >= MIN_STEP_METERS) turnTo(bearingDegrees(shown, target))
    }

    if (reducedMotion.matches) {
      place(target)
      stopWalkingSoon()
      return { duration: 0, teleported: false }
    }

    const duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, sinceLastFix))
    glide(shown, target, duration)
    return { duration, teleported: false }
  }

  // Replaces the figure and ring color only, so position, facing, and the
  // walk cycle carry on as they were.
  function setCharacter(newCharacter) {
    figureElement.innerHTML = characterSvg(newCharacter)
    element.style.setProperty('--avatar-accent', newCharacter.accent)
    ringElement.style.setProperty('--avatar-accent', newCharacter.accent)
  }

  function remove() {
    cancelAnimationFrame(frameId)
    clearTimeout(stopWalkingTimer)
    map.off('rotate', updateFacing)
    figure.remove()
    ring.remove()
  }

  setCharacter(character)
  map.on('rotate', updateFacing)
  return { element, moveTo, setCharacter, remove }
}
