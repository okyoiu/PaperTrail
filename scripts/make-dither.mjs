// Generates the ordered-dither masks the frosted blur strips fade through
// (.bottom-nav and .safe-area-blur-top in App.css). Change the numbers below
// and re-run:
//   node scripts/make-dither.mjs

import { mkdirSync, writeFileSync } from 'node:fs'

// 4x4 Bayer matrix: the order pixels switch on as a ramp gets denser, which
// gives the classic checker/cross patterns at the in-between levels.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const CELL = 2 // CSS px per dither pixel

// A strip 4 cells wide (it tiles horizontally) whose pixel density goes from
// `from` to `to` over `rampPx`, then holds at `to` for another `holdPx`.
function ditherRamp({ rampPx, holdPx, from, to }) {
  const rampRows = Math.round(rampPx / CELL)
  const rows = rampRows + Math.round(holdPx / CELL)
  let path = ''
  for (let y = 0; y < rows; y++) {
    const level = y < rampRows ? from + ((to - from) * (y + 0.5)) / rampRows : to
    for (let x = 0; x < 4; x++) {
      if (level * 16 > BAYER[y % 4][x] + 0.5) path += `M${x * CELL} ${y * CELL}h${CELL}v${CELL}h-${CELL}z`
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${4 * CELL}" height="${rows * CELL}" shape-rendering="crispEdges"><path d="${path}"/></svg>\n`
}

const FILES = {
  // The nav's mask: fades the blur in over --bottom-nav-fade (24px), then
  // stays fully visible.
  'nav-mask.svg': ditherRamp({ rampPx: 24, holdPx: 200, from: 0, to: 1 }),
  // The top strip's fade: App.css keeps it solid under the notch, then this
  // thins it out over the 16px below.
  'top-mask.svg': ditherRamp({ rampPx: 16, holdPx: 0, from: 1, to: 0 }),
}

mkdirSync('public/dither', { recursive: true })
for (const [name, svg] of Object.entries(FILES)) {
  writeFileSync(`public/dither/${name}`, svg)
  console.log(`wrote public/dither/${name}`)
}
