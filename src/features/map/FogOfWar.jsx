import { useEffect, useRef } from 'react'

const FOG_COLOR = 'rgba(176, 196, 214, 0.55)'

// A canvas "flashlight" overlay on top of the MapLibre canvas: everything is
// fogged except a soft-edged circle around the player's real-world position,
// sized in real meters (not fixed pixels) so it stays consistent across zoom.
export function FogOfWar({ map, position, revealRadiusMeters = 60 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!map) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function pixelRadiusAt(lngLat) {
      // Project the center and a point offset north by the reveal radius,
      // then measure the pixel distance between them - correct at any zoom.
      const metersPerDegreeLat = 111320
      const p1 = map.project(lngLat)
      const p2 = map.project([lngLat[0], lngLat[1] + revealRadiusMeters / metersPerDegreeLat])
      return Math.hypot(p2.x - p1.x, p2.y - p1.y)
    }

    function draw() {
      const { clientWidth: w, clientHeight: h } = map.getContainer()
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = FOG_COLOR
      ctx.fillRect(0, 0, w, h)

      if (!position) return
      const center = map.project([position.lng, position.lat])
      const radius = pixelRadiusAt([position.lng, position.lat])

      ctx.globalCompositeOperation = 'destination-out'
      const gradient = ctx.createRadialGradient(
        center.x,
        center.y,
        radius * 0.5,
        center.x,
        center.y,
        radius,
      )
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    draw()
    map.on('move', draw)
    map.on('resize', draw)
    return () => {
      map.off('move', draw)
      map.off('resize', draw)
    }
  }, [map, position, revealRadiusMeters])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  )
}
