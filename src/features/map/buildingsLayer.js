// Building footprints generated via osmium-tool — see public/data/README.md
export function addBuildingsLayer(map) {
  map.addSource('osm-buildings', {
    type: 'geojson',
    data: '/data/buildings.geojson',
  })

  map.addLayer({
    id: 'osm-buildings-3d',
    source: 'osm-buildings',
    type: 'fill-extrusion',
    paint: {
      'fill-extrusion-color': '#7c8ff0',
      'fill-extrusion-height': ['coalesce', ['get', 'height'], 8],
      'fill-extrusion-opacity': 0.85,
    },
  })
}
