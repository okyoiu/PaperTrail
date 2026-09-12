# Building data (osmium-tool)

`buildings.geojson` in this folder is an empty placeholder — `buildingsLayer.js` loads it
at `/data/buildings.geojson`. Replace it with real 3D building footprints for the demo venue:

1. Install osmium-tool: `brew install osmium-tool` (macOS) — see https://osmcode.org/osmium-tool/ for other platforms.
2. Download the smallest OSM extract that covers your demo venue from https://download.geofabrik.de (e.g. a city or metro extract, not the whole state/country).
3. Filter to just buildings and export as GeoJSON:
   ```
   osmium tags-filter region.osm.pbf w/building -o buildings.osm.pbf
   osmium export buildings.osm.pbf -o buildings.geojson
   ```
4. Drop the resulting `buildings.geojson` in this folder, overwriting the placeholder.
5. Keep the extract tight — just the venue plus a couple of surrounding blocks — so it loads fast on stage.
