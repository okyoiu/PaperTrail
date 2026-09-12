import { useEffect, useRef } from 'react'

// Shadow-of-War style fog: a dark canvas over the map with radial holes
// punched out at the player's position and any unlocked locations.
export default function FogOfWar({ map, unlockedPoints = [], playerPosition, revealRadius = 120 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!map) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function draw() {
      const { clientWidth, clientHeight } = map.getCanvas()
      canvas.width = clientWidth
      canvas.height = clientHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(4, 8, 20, 0.85)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const points = playerPosition ? [...unlockedPoints, playerPosition] : unlockedPoints
      ctx.globalCompositeOperation = 'destination-out'
      for (const point of points) {
        const { x, y } = map.project([point.lng, point.lat])
        const radius = point.radius ?? revealRadius
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, 'rgba(0,0,0,1)')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    map.on('move', draw)
    map.on('resize', draw)
    draw()

    return () => {
      map.off('move', draw)
      map.off('resize', draw)
    }
  }, [map, unlockedPoints, playerPosition, revealRadius])

  return <canvas ref={canvasRef} className="fog-canvas" />
}
