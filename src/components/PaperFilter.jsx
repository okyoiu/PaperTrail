// A shared SVG filter, #paper-scrap, that turns a plain white fill into a
// paper scrap like the hand-drawn art's cards: ragged edges, faint grain, and
// a soft pencil-shaded shadow. Rendered once in App. Apply it to a
// pseudo-element's background so text on top stays crisp (see .xp-bar-level
// and .achievement-toast in index.css).
export function PaperFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="paper-scrap" x="-20%" y="-40%" width="140%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" result="edgeNoise" />
        <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="4" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="2" result="grain" />
        <feColorMatrix
          in="grain"
          type="matrix"
          values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0.14 0"
          result="greyGrain"
        />
        <feComposite in="greyGrain" in2="rough" operator="in" result="grainOnPaper" />
        <feMerge result="paper">
          <feMergeNode in="rough" />
          <feMergeNode in="grainOnPaper" />
        </feMerge>
        <feDropShadow in="paper" dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.35" />
      </filter>
    </svg>
  )
}
