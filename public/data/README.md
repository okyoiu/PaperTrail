# Building data (osmium-tool)

`buildings.geojson` has real 3D building footprints for Rice University's campus (487
buildings, ~210KB) — `buildingsLayer.js` loads it at `/data/buildings.geojson`.

## How it was generated

Rather than downloading a full state-level Geofabrik extract (Texas alone is 500MB+) just
to throw most of it away, this was pulled directly for a tight bounding box around campus
via the Overpass API, then converted with osmium:

```bash
# 1. Query Overpass for buildings in a bounding box (south,west,north,east)
curl -s --data-urlencode data@query.overpassql \
  https://overpass-api.de/api/interpreter -o rice.osm
# query.overpassql:
#   [out:xml][timeout:60];
#   (
#     way["building"](29.712,-95.408,29.723,-95.394);
#     relation["building"](29.712,-95.408,29.723,-95.394);
#   );
#   out body;
#   >;
#   out skel qt;

# 2. Overpass's recursive `>;` can emit a handful of duplicate elements —
#    dedupe before osmium will accept the file (see git history for the
#    dedupe script if needed again for a different venue).

# 3. Sort into osmium's required node/way/relation ID order, then export
osmium sort rice-dedup.osm -o rice-sorted.osm --overwrite
osmium export rice-sorted.osm -o buildings.geojson --overwrite --geometry-types=polygon
```

## If you need to change the venue

Only ~10% of buildings have OSM `height` or `building:levels` tags (the rest fall back to
a flat 8m in `buildingsLayer.js`), so pick a bounding box tight enough to load fast, but
don't expect every building to have realistic height data — that's an OSM data coverage
limit, not something fixable in our code.
