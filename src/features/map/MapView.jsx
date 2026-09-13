import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { distanceMeters } from '../../utils/geo'
import { getUnlockedLocations, unlockLocation } from '../backend/api'
import {
  addBuildingsLayer,
  DEFAULT_CENTER,
  fetchAllBuildings,
  getBuildingsLayerId,
  osmIdFromPlaceId,
  osmPlaceId,
  setAllBuildings,
  setBuildingExplored,
  setBuildingUnlocked,
  UNNAMED_BUILDING,
} from './buildingsLayer'
import { CameraControls } from './CameraControls'
import { getCharacter } from './characters'
import { recordPosition } from './characterTrail'
import { DebugToggleControl } from './debugToggleControl'
import { FogOfWar } from './FogOfWar'
import { createPlayerAvatar } from './playerAvatar'
import { createRemotePlayerMarker } from './remotePlayerMarker'
import { TeleportControls } from './TeleportControls'
import { loadVisitedBuildingIds, saveVisitedBuilding } from './visitedBuildingsStore'

// Points at the worker pair emitted by maplibreWorkerAssets() in vite.config.js.
// Dev is left alone: Vite serves the worker straight from node_modules there, so
// maplibre's own runtime URL resolution already works. Must run before any Map is
// constructed, hence module scope rather than an effect.
if (import.meta.env.PROD) setWorkerUrl('/assets/maplibre-gl-worker.mjs')

const UNLOCK_RADIUS_METERS = 30
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Camera presets. The walking view hugs the player the way Pokemon Go does;
// the overview pulls back far enough to see a good chunk of campus.
const WALKING_VIEW = { zoom: 18, pitch: 60 }
const OVERVIEW = { zoom: 15.5, pitch: 40 }
const ZOOMED_OUT_BELOW = (WALKING_VIEW.zoom + OVERVIEW.zoom) / 2
// After a drag, the camera snaps back if the player is still within this
// fraction of the map's shorter side from center; any farther and it detaches
// so the user can look around.
const DETACH_FRACTION = 0.25
const FLY_MS = 1500
const VIEW_CHANGE_MS = 900

function linear(t) {
  return t
}

function cameraOnPlayer(position, view) {
  return { center: [position.lng, position.lat], zoom: view.zoom, pitch: view.pitch }
}

function createElement(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

// Built with textContent rather than innerHTML because review text is user input.
// With onOpenReview, each photo is a button that opens that review larger.
function reviewPopupContent(name, reviews, onOpenReview) {
  const root = createElement('div', 'review-popup')
  root.append(createElement('strong', null, name))
  for (const review of reviews) {
    const item = createElement('div', 'review-popup-item')
    if (review.rating) {
      item.append(
        createElement('div', 'review-popup-stars', '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)),
      )
    }
    if (review.body) item.append(createElement('p', null, review.body))
    if (review.photo_url) {
      const img = createElement('img')
      img.src = review.photo_url
      img.alt = ''
      if (onOpenReview) {
        const photoButton = createElement('button', 'review-photo-button')
        photoButton.type = 'button'
        photoButton.setAttribute('aria-label', 'View photo larger')
        photoButton.addEventListener('click', () =>
          onOpenReview({ title: name, rating: review.rating, body: review.body, photoUrl: review.photo_url }),
        )
        photoButton.append(img)
        item.append(photoButton)
      } else {
        item.append(img)
      }
    }
    root.append(item)
  }
  return root
}

// The one map: MapLibre + 3D fog-of-war buildings (colored by whether the
// player has walked up to or reviewed them - see buildingsLayer.js), the
// player's character (tap it to review where you're standing) with a camera
// that follows it, other players' characters (see hooks/usePlayersMap.js),
// and a book icon on every place the player has reviewed (tapping a photo in
// its popup calls onOpenReview). exploredPlaceIds are the google_place_ids
// the player has reviewed; the `osm:` ones color their building.
export function MapView({
  userId,
  characterId,
  position,
  debugPreset,
  onSetDebugPosition,
  geoError,
  players,
  reviews,
  exploredPlaceIds,
  onSelectLocation,
  onReviewHere,
  onOpenReview,
}) {
  const containerRef = useRef(null)
  const [map, setMap] = useState(null)
  const buildingsByIdRef = useRef(new Map()) // feature id -> GeoJSON feature
  const unlockedIdsRef = useRef(new Set())
  const exploredIdsRef = useRef(new Set())
  const [debugOpen, setDebugOpen] = useState(false) // debug menu starts hidden
  const debugToggleRef = useRef(null)
  const avatarRef = useRef(null)
  const playerMarkersRef = useRef(new Map()) // user id -> remote player marker
  const bookMarkersRef = useRef([])

  // Camera. While `following`, it stays centered on the player at viewRef's
  // zoom/pitch - a preset, or wherever the user last pinched/scrolled to. The
  // refs mirror state that map event handlers need to read.
  const [following, setFollowing] = useState(true)
  const followingRef = useRef(true)
  const [zoomedOut, setZoomedOut] = useState(false)
  const viewRef = useRef(WALKING_VIEW)
  const positionRef = useRef(null)
  const userGestureRef = useRef(false)

  // Map + buildings setup (once).
  useEffect(() => {
    const instance = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 15,
      pitch: 55,
      bearing: -17,
    })
    instance.addControl(new NavigationControl(), 'top-right')
    debugToggleRef.current = new DebugToggleControl(() => setDebugOpen((open) => !open))
    instance.addControl(debugToggleRef.current, 'top-right')

    // 'style.load' rather than 'load': 'load' waits until every visible tile
    // has rendered, which left the map unclickable (no dot, no building
    // clicks) for many seconds on a slow connection or busy GPU.
    instance.once('style.load', async () => {
      addBuildingsLayer(instance)

      // A failed fetch here must never prevent setMap() - every control and
      // marker depends on `map`, and would otherwise silently do nothing.
      try {
        const geojson = await fetchAllBuildings()
        for (const feature of geojson.features) buildingsByIdRef.current.set(feature.id, feature)
        setAllBuildings(instance, geojson)
        for (const id of loadVisitedBuildingIds()) {
          if (!buildingsByIdRef.current.has(id)) continue
          unlockedIdsRef.current.add(id)
          setBuildingUnlocked(instance, id, true)
        }
      } catch (err) {
        console.error('Failed to load buildings:', err)
      } finally {
        setMap(instance)
      }
    })

    return () => instance.remove()
  }, [])

  useEffect(() => {
    debugToggleRef.current?.setActive(debugOpen)
  }, [map, debugOpen])

  // Buildings this user unlocked (and reviewed) in earlier sessions or on
  // other devices - unlocks.explored_at is kept in sync from reviews by the
  // database, see supabase/schema.sql.
  useEffect(() => {
    if (!map || !userId) return
    getUnlockedLocations(userId)
      .then((remote) => {
        for (const { explored_at: exploredAt, locations: loc } of remote) {
          const id = osmIdFromPlaceId(loc?.google_place_id)
          if (id === null || !buildingsByIdRef.current.has(id)) continue
          unlockedIdsRef.current.add(id)
          if (exploredAt) {
            exploredIdsRef.current.add(id)
            setBuildingExplored(map, id, true)
          } else {
            setBuildingUnlocked(map, id, true)
          }
        }
      })
      .catch((err) => console.error('Failed to load saved visits from Supabase:', err))
  }, [map, userId])

  // Paint a building in the explored color as soon as it's reviewed (the
  // list comes from the player's reviews, so this also covers cold loads).
  useEffect(() => {
    if (!map) return
    for (const placeId of exploredPlaceIds) {
      const id = osmIdFromPlaceId(placeId)
      if (id === null || exploredIdsRef.current.has(id) || !buildingsByIdRef.current.has(id)) continue
      exploredIdsRef.current.add(id)
      unlockedIdsRef.current.add(id)
      setBuildingExplored(map, id, true)
    }
  }, [map, exploredPlaceIds])

  // The player's character. It isn't drawn until the first position arrives.
  useEffect(() => {
    if (!map) return
    const avatar = createPlayerAvatar(map)
    avatarRef.current = avatar
    return () => {
      avatar.remove()
      avatarRef.current = null
    }
  }, [map])

  // Swapped in place, so picking a new character doesn't reset the walk.
  useEffect(() => {
    avatarRef.current?.setCharacter(getCharacter(characterId))
  }, [map, characterId])

  // Walk the character to each new position, with the camera following in
  // step (same duration, linear easing) so the character stays centered.
  useEffect(() => {
    const avatar = avatarRef.current
    if (!map || !avatar || !position) return
    positionRef.current = position
    const { duration, teleported } = avatar.moveTo(position)
    // Any camera animation would cancel a pinch or drag in progress; the
    // gesture's moveend handler below recenters once it's over.
    if (!followingRef.current || userGestureRef.current) return

    const camera = cameraOnPlayer(position, viewRef.current)
    if (teleported) map.flyTo({ ...camera, duration: FLY_MS })
    else map.easeTo({ ...camera, duration, easing: linear })
  }, [map, position])

  // While following, zoom gestures pivot on the player instead of the cursor.
  useEffect(() => {
    if (!map) return
    const options = following ? { around: 'center' } : undefined
    map.scrollZoom.enable(options)
    map.touchZoomRotate.enable(options)
  }, [map, following])

  // Only user gestures (drag, pinch, scroll, zoom buttons) carry
  // originalEvent, which tells them apart from the follow camera's own moves.
  useEffect(() => {
    if (!map) return

    function onMoveStart(e) {
      if (e.originalEvent) userGestureRef.current = true
    }

    function onMoveEnd(e) {
      if (!e.originalEvent || !userGestureRef.current) return
      userGestureRef.current = false
      viewRef.current = { zoom: map.getZoom(), pitch: map.getPitch() }
      setZoomedOut(map.getZoom() < ZOOMED_OUT_BELOW)

      const current = positionRef.current
      if (!followingRef.current || !current) return
      const player = map.project([current.lng, current.lat])
      const { clientWidth: width, clientHeight: height } = map.getContainer()
      const offCenter = Math.hypot(player.x - width / 2, player.y - height / 2)
      if (offCenter > Math.min(width, height) * DETACH_FRACTION) {
        followingRef.current = false
        setFollowing(false)
      } else if (offCenter > 1) {
        map.easeTo({ ...cameraOnPlayer(current, viewRef.current), duration: 300 })
      }
    }

    map.on('movestart', onMoveStart)
    map.on('moveend', onMoveEnd)
    return () => {
      map.off('movestart', onMoveStart)
      map.off('moveend', onMoveEnd)
    }
  }, [map])

  // Tapping your character reviews the nearest named building in unlock
  // range, or else a bare pin that MapPage names.
  useEffect(() => {
    const element = avatarRef.current?.element
    if (!element || !position || !onReviewHere) return

    function handleClick() {
      let nearest = null
      let nearestDistance = UNLOCK_RADIUS_METERS
      for (const building of buildingsByIdRef.current.values()) {
        if (building.properties.name === UNNAMED_BUILDING) continue
        const distance = distanceMeters(building.properties.centroid, position)
        if (distance <= nearestDistance) {
          nearest = building
          nearestDistance = distance
        }
      }

      onReviewHere(
        nearest
          ? {
              id: osmPlaceId(nearest.id),
              name: nearest.properties.name,
              lat: nearest.properties.centroid.lat,
              lng: nearest.properties.centroid.lng,
            }
          : {
              id: `pin:${position.lat.toFixed(4)},${position.lng.toFixed(4)}`,
              name: null,
              lat: position.lat,
              lng: position.lng,
            },
      )
    }

    element.classList.add('is-clickable')
    element.setAttribute('title', 'Leave a review here')
    element.addEventListener('click', handleClick)
    return () => {
      element.removeEventListener('click', handleClick)
      element.classList.remove('is-clickable')
      element.removeAttribute('title')
    }
  }, [map, position, onReviewHere])

  // Other players' characters, kept in sync with live_locations. Each one
  // walks to its new position (see remotePlayerMarker.js); players who drop
  // off the list (left the map, went friends-only) are removed.
  useEffect(() => {
    if (!map) return
    const markers = playerMarkersRef.current
    const visibleIds = new Set()

    for (const player of players) {
      visibleIds.add(player.userId)
      let marker = markers.get(player.userId)
      if (!marker) {
        marker = createRemotePlayerMarker(map)
        markers.set(player.userId, marker)
      }
      marker.setPlayer(player)
      marker.moveTo(player)
    }

    for (const [id, marker] of markers) {
      if (visibleIds.has(id)) continue
      marker.remove()
      markers.delete(id)
    }
  }, [map, players])

  // Everything else is torn down with the map, but these hold animation frames.
  useEffect(() => {
    const markers = playerMarkersRef.current
    return () => {
      for (const marker of markers.values()) marker.remove()
      markers.clear()
    }
  }, [map])

  // One book icon per reviewed place; its popup lists the reviews left there.
  useEffect(() => {
    if (!map) return
    for (const marker of bookMarkersRef.current) marker.remove()

    const byLocation = new Map()
    for (const review of reviews) {
      const loc = review.locations
      if (!loc) continue
      if (!byLocation.has(loc.id)) byLocation.set(loc.id, { loc, reviews: [] })
      byLocation.get(loc.id).reviews.push(review)
    }

    bookMarkersRef.current = [...byLocation.values()].map(({ loc, reviews: reviewsHere }) => {
      const element = createElement('div', 'map-marker-book', '📖')
      element.title = `You reviewed ${loc.name}`
      return new Marker({ element, anchor: 'bottom' })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(
          new Popup({ offset: 24, maxWidth: '240px' }).setDOMContent(
            reviewPopupContent(loc.name, reviewsHere, onOpenReview),
          ),
        )
        .addTo(map)
    })
  }, [map, reviews, onOpenReview])

  // Add each move to the character's trail (see characterTrail.js) and reveal
  // buildings anywhere along it - a walk unlocks the ones it passes, not just
  // the one it stops at - saving that they've been visited.
  useEffect(() => {
    if (!map || !position) return
    const path = recordPosition(position)
    for (const building of buildingsByIdRef.current.values()) {
      const id = building.id
      if (unlockedIdsRef.current.has(id)) continue
      const { centroid } = building.properties
      if (!path.some((point) => distanceMeters(centroid, point) <= UNLOCK_RADIUS_METERS)) continue

      unlockedIdsRef.current.add(id)
      setBuildingUnlocked(map, id, true)
      saveVisitedBuilding({
        id,
        name: building.properties.name,
        lat: building.properties.centroid.lat,
        lng: building.properties.centroid.lng,
      })

      if (userId) {
        unlockLocation(userId, {
          placeId: osmPlaceId(id),
          name: building.properties.name,
          lat: building.properties.centroid.lat,
          lng: building.properties.centroid.lng,
        }).catch(() => {})
      }
    }
  }, [map, position, userId])

  function startFollowing() {
    followingRef.current = true
    setFollowing(true)
  }

  function handleRecenter() {
    startFollowing()
    const current = positionRef.current
    if (current) map?.easeTo({ ...cameraOnPlayer(current, viewRef.current), duration: VIEW_CHANGE_MS })
  }

  // Zooms around the player while following, or around the middle of the map
  // after panning away.
  function handleToggleZoom() {
    if (!map) return
    const view = viewRef.current.zoom < ZOOMED_OUT_BELOW ? WALKING_VIEW : OVERVIEW
    viewRef.current = view
    setZoomedOut(view === OVERVIEW)
    const current = positionRef.current
    const camera = followingRef.current && current ? cameraOnPlayer(current, view) : view
    map.easeTo({ ...camera, duration: VIEW_CHANGE_MS })
  }

  function handleTeleport(preset) {
    onSetDebugPosition(preset)
    startFollowing()
    map?.flyTo({ ...cameraOnPlayer(preset, viewRef.current), duration: FLY_MS })
  }

  function handleUseRealGps() {
    onSetDebugPosition(null)
    startFollowing()
  }

  // Preview-only: lifts the fog from every loaded building so you can see
  // what a fully-walked area looks like without walking to each one.
  // Deliberately doesn't touch unlockedIdsRef or call saveVisitedBuilding/
  // unlockLocation - so nothing here gets persisted (a refresh reverts it),
  // and a real visit to one of these buildings later still saves normally.
  function handleRevealAll() {
    if (!map) return
    for (const id of buildingsByIdRef.current.keys()) {
      setBuildingUnlocked(map, id, true)
    }
  }

  // Click any building to open its review card (see MapPage). Click anywhere
  // else to walk the character there (a debug position), so exploration can
  // be tested without real GPS.
  useEffect(() => {
    if (!map) return
    function onClick(e) {
      // Clicks on marker/popup DOM elements bubble up to the map too.
      if (e.originalEvent.target.closest?.('.maplibregl-marker, .maplibregl-popup')) return

      const [hit] = map.queryRenderedFeatures(e.point, { layers: [getBuildingsLayerId()] })
      const building = hit && buildingsByIdRef.current.get(hit.id)
      if (building && onSelectLocation) {
        onSelectLocation({
          // Unlocked = the character has walked here, which is what lets the
          // player review it ("Reveal all buildings" only lights them up).
          visited: unlockedIdsRef.current.has(hit.id),
          explored: exploredIdsRef.current.has(hit.id),
          id: osmPlaceId(hit.id),
          name: building.properties.name,
          lat: building.properties.centroid.lat,
          lng: building.properties.centroid.lng,
        })
        return
      }
      onSetDebugPosition({ name: 'Custom location', lat: e.lngLat.lat, lng: e.lngLat.lng })
    }
    map.on('click', onClick)
    return () => map.off('click', onClick)
  }, [map, onSelectLocation, onSetDebugPosition])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {map && <FogOfWar map={map} position={position} revealRadiusMeters={UNLOCK_RADIUS_METERS * 2} />}
      {debugOpen && (
        <TeleportControls
          active={debugPreset}
          onTeleport={handleTeleport}
          onUseRealGps={handleUseRealGps}
          onRevealAll={handleRevealAll}
          onClose={() => setDebugOpen(false)}
        />
      )}
      {map && (
        <CameraControls
          zoomedOut={zoomedOut}
          showRecenter={!following && Boolean(position)}
          onToggleZoom={handleToggleZoom}
          onRecenter={handleRecenter}
        />
      )}
      {geoError && !debugPreset && (
        <p
          style={{
            position: 'absolute',
            bottom: 'calc(var(--bottom-nav-h, 0px) + var(--bottom-nav-fade, 0px) + var(--safe-bottom, 0px) + 44px)',
            left: 12,
            color: '#e8a33d',
            margin: 0,
          }}
        >
          {geoError}
        </p>
      )}
    </div>
  )
}
