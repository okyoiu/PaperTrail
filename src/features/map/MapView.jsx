import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { addBuildingsLayer } from './buildingsLayer'

// Rice University campus — swap for your demo venue's coordinates
const DEFAULT_CENTER = [-95.4018, 29.7174]

export default function MapView({ center = DEFAULT_CENTER, onMapReady }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      // Placeholder style with no building data. Swap for a real vector source
      // (OpenFreeMap, Protomaps, or MapTiler free tier) once the team picks one.
      style: 'https://demotiles.maplibre.org/style.json',
      center,
      zoom: 16,
      pitch: 60,
      bearing: -17,
    })

    map.on('load', () => {
      addBuildingsLayer(map)
      onMapReady?.(map)
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="map-container" />
}
