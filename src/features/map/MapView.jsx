import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { distanceMeters } from '../../utils/geo'
import { getUnlockedLocations, unlockLocation } from '../backend/api'
import {
  addBuildingsLayer,
  DEFAULT_CENTER,
  fetchAllBuildings,
  getBuildingsLayerId,
  setAllBuildings,
  setBuildingUnlocked,
  UNNAMED_BUILDING,
} from './buildingsLayer'
import { FogOfWar } from './FogOfWar'
import { TeleportControls } from './TeleportControls'
import { loadVisitedBuildingIds, saveVisitedBuilding } from './visitedBuildingsStore'

const UNLOCK_RADIUS_METERS = 30
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

function osmIdFromPlaceId(placeId) {
  const match = /^osm:(\d+)$/.exec(placeId ?? '')
  return match ? Number(match[1]) : null
}

function createElement(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

// Built with textContent rather than innerHTML because review text is user input.
function reviewPopupContent(name, reviews) {
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
      item.append(img)
    }
    root.append(item)
  }
  return root
}

// The one map: MapLibre + 3D fog-of-war buildings, the player's dot (tap it
// to review where you're standing), accepted friends' dots, and a book icon
// on every place the player has reviewed.
export function MapView({
  userId,
  position,
  debugPreset,
  onSetDebugPosition,
  geoError,
  friends,
  reviews,
  onSelectLocation,
  onReviewHere,
}) {
  const containerRef = useRef(null)
  const [map, setMap] = useState(null)
  const buildingsByIdRef = useRef(new Map()) // feature id -> GeoJSON feature
  const unlockedIdsRef = useRef(new Set())
  const selfMarkerRef = useRef(null)
  const friendMarkersRef = useRef(new Map()) // user_id -> Marker
  const bookMarkersRef = useRef([])

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

  // Buildings this user unlocked in earlier sessions or on other devices.
  useEffect(() => {
    if (!map || !userId) return
    getUnlockedLocations(userId)
      .then((remote) => {
        for (const { locations: loc } of remote) {
          const id = osmIdFromPlaceId(loc?.google_place_id)
          if (id === null || !buildingsByIdRef.current.has(id)) continue
          unlockedIdsRef.current.add(id)
          setBuildingUnlocked(map, id, true)
        }
      })
      .catch((err) => console.error('Failed to load saved visits from Supabase:', err))
  }, [map, userId])

  // "You are here" marker.
  useEffect(() => {
    if (!map || !position) return
    if (!selfMarkerRef.current) {
      selfMarkerRef.current = new Marker({ element: createElement('div', 'map-marker-self') })
        .setLngLat([position.lng, position.lat])
        .addTo(map)
    } else {
      selfMarkerRef.current.setLngLat([position.lng, position.lat])
    }
  }, [map, position])

  // Tapping your own dot reviews the nearest named building in unlock range,
  // or else a bare pin that MapPage names.
  useEffect(() => {
    const element = selfMarkerRef.current?.getElement()
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
              id: `osm:${nearest.id}`,
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
    element.title = 'Leave a review here'
    element.addEventListener('click', handleClick)
    return () => {
      element.removeEventListener('click', handleClick)
      element.classList.remove('is-clickable')
      element.removeAttribute('title')
    }
  }, [map, position, onReviewHere])

  // Friends' dots, kept in sync with live_locations.
  useEffect(() => {
    if (!map) return
    const markers = friendMarkersRef.current
    const visibleIds = new Set()

    for (const friend of friends) {
      visibleIds.add(friend.user_id)
      const username = friend.profiles?.username ?? 'Friend'
      let marker = markers.get(friend.user_id)
      if (!marker) {
        const element = createElement('div', 'map-marker-friend', username.charAt(0).toUpperCase())
        marker = new Marker({ element })
          .setLngLat([friend.lng, friend.lat])
          .setPopup(new Popup({ offset: 14, closeButton: false }))
          .addTo(map)
        markers.set(friend.user_id, marker)
      } else {
        marker.setLngLat([friend.lng, friend.lat])
      }
      marker.getPopup().setText(`${username} · updated ${new Date(friend.updated_at).toLocaleTimeString()}`)
    }

    for (const [id, marker] of markers) {
      if (visibleIds.has(id)) continue
      marker.remove()
      markers.delete(id)
    }
  }, [map, friends])

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
        .setPopup(new Popup({ offset: 24, maxWidth: '240px' }).setDOMContent(reviewPopupContent(loc.name, reviewsHere)))
        .addTo(map)
    })
  }, [map, reviews])

  // Reveal buildings the player walks up to, and save that they've been visited.
  useEffect(() => {
    if (!map || !position) return
    for (const building of buildingsByIdRef.current.values()) {
      const id = building.id
      if (unlockedIdsRef.current.has(id)) continue
      if (distanceMeters(building.properties.centroid, position) > UNLOCK_RADIUS_METERS) continue

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
          placeId: `osm:${id}`,
          name: building.properties.name,
          lat: building.properties.centroid.lat,
          lng: building.properties.centroid.lng,
        }).catch(() => {})
      }
    }
  }, [map, position, userId])

  function handleTeleport(preset) {
    onSetDebugPosition(preset)
    map?.flyTo({ center: [preset.lng, preset.lat], zoom: 16 })
  }

  // Preview-only: lights up every building already loaded nearby so you can
  // see what a fully-explored area looks like without walking to each one.
  // Deliberately doesn't touch unlockedIdsRef or call saveVisitedBuilding/
  // unlockLocation - so nothing here gets persisted (a refresh reverts it),
  // and a real visit to one of these buildings later still saves normally.
  function handleSimulateExplored() {
    if (!map) return
    for (const id of buildingsByIdRef.current.keys()) {
      setBuildingUnlocked(map, id, true)
    }
  }

  // Click any building to open its review card (see MapPage). Click anywhere
  // else to drop the "you are here" debug dot there, so exploration can be
  // tested without real GPS.
  useEffect(() => {
    if (!map) return
    function onClick(e) {
      // Clicks on marker/popup DOM elements bubble up to the map too.
      if (e.originalEvent.target.closest?.('.maplibregl-marker, .maplibregl-popup')) return

      const [hit] = map.queryRenderedFeatures(e.point, { layers: [getBuildingsLayerId()] })
      const building = hit && buildingsByIdRef.current.get(hit.id)
      if (building && onSelectLocation) {
        onSelectLocation({
          id: `osm:${hit.id}`,
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
    <div style={{ position: 'relative', height: '460px', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {map && <FogOfWar map={map} position={position} revealRadiusMeters={UNLOCK_RADIUS_METERS * 2} />}
      <TeleportControls
        active={debugPreset}
        onTeleport={handleTeleport}
        onUseRealGps={() => onSetDebugPosition(null)}
        onSimulateExplored={handleSimulateExplored}
      />
      {geoError && !debugPreset && (
        <p style={{ position: 'absolute', bottom: 8, left: 8, color: '#e8a33d', margin: 0 }}>
          {geoError}
        </p>
      )}
    </div>
  )
}
