import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGeolocation } from '../../hooks/useGeolocation'
import { distanceMeters } from '../../utils/geo'
import { getUnlockedLocations, unlockLocation } from '../backend/api'
import {
  addBuildingsLayer,
  DEFAULT_CENTER,
  fetchAllBuildings,
  getBuildingsLayerId,
  setAllBuildings,
  setBuildingUnlocked,
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

// Ties the pieces together: MapLibre + 3D building extrusion + fog-of-war.
// Buildings stay flat/dark ("foggy") until the player's GPS (or a debug
// teleport/click) comes within UNLOCK_RADIUS_METERS, at which point they pop
// up in 3D and get persisted - to localStorage always, and to Supabase too
// when signed in - so they stay revealed later. Building footprints are the
// pre-baked public/data/buildings.geojson (see buildingsLayer.js), loaded
// once rather than fetched live.
export function MapView({ userId, onSelectLocation }) {
  const containerRef = useRef(null)
  const [map, setMap] = useState(null)
  const buildingsByIdRef = useRef(new Map()) // feature id -> GeoJSON feature
  const unlockedIdsRef = useRef(new Set())
  const visitedIdsRef = useRef(new Set()) // known-visited before this session even renders them
  const { position: realPosition, error: geoError } = useGeolocation()
  const [debugPreset, setDebugPreset] = useState(null)
  const position = debugPreset ?? realPosition

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

    instance.on('load', async () => {
      addBuildingsLayer(instance)

      // A failed fetch/Supabase call here must never prevent setMap() -
      // otherwise every button that depends on `map` (teleport, simulate,
      // the position marker) silently stops working with no visible error.
      try {
        const visited = loadVisitedBuildingIds()
        if (userId) {
          try {
            const remote = await getUnlockedLocations(userId)
            for (const { locations: loc } of remote) {
              const id = osmIdFromPlaceId(loc.google_place_id)
              if (id !== null) visited.add(id)
            }
          } catch (err) {
            console.error('Failed to load saved visits from Supabase:', err)
          }
        }
        visitedIdsRef.current = visited

        const geojson = await fetchAllBuildings()
        for (const feature of geojson.features) buildingsByIdRef.current.set(feature.id, feature)
        setAllBuildings(instance, geojson)
        for (const id of visited) {
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
  }, [userId])

  // "You are here" marker.
  const markerRef = useRef(null)
  useEffect(() => {
    if (!map || !position) return
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.style.cssText =
        'width:14px;height:14px;border-radius:50%;background:#e8a33d;border:2px solid #241503;box-shadow:0 0 0 4px rgba(232,163,61,0.35)'
      markerRef.current = new Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map)
    } else {
      markerRef.current.setLngLat([position.lng, position.lat])
    }
  }, [map, position])

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
    setDebugPreset(preset)
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

  // Click a building that's already unlocked to review it (leave a photo/note,
  // earn XP - see MapPage). Click anywhere else to drop the "you are here"
  // debug dot there, so exploration can be tested without real GPS.
  useEffect(() => {
    if (!map) return
    function onClick(e) {
      const [hit] = map.queryRenderedFeatures(e.point, { layers: [getBuildingsLayerId()] })
      if (hit && hit.state?.unlocked && onSelectLocation) {
        const building = buildingsByIdRef.current.get(hit.id)
        if (building) {
          onSelectLocation({
            id: `osm:${hit.id}`,
            name: building.properties.name,
            lat: building.properties.centroid.lat,
            lng: building.properties.centroid.lng,
          })
          return
        }
      }
      setDebugPreset({ name: 'Custom location', lat: e.lngLat.lat, lng: e.lngLat.lng })
    }
    map.on('click', onClick)
    return () => map.off('click', onClick)
  }, [map, onSelectLocation])

  return (
    <div style={{ position: 'relative', height: '460px', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {map && <FogOfWar map={map} position={position} revealRadiusMeters={UNLOCK_RADIUS_METERS * 2} />}
      <TeleportControls
        active={debugPreset}
        onTeleport={handleTeleport}
        onUseRealGps={() => setDebugPreset(null)}
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
