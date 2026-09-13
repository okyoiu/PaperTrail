// The characters a player can pick to walk the map as (see
// social/ProfileSetup.jsx; saved as profiles.character_id). They all share one
// side-view figure facing right, so the walk cycle in index.css works for
// every one of them - they differ in colors and what's on their head.

const OUTLINE = '#241503'
const SHOES = '#0f172a'

export const CHARACTERS = [
  {
    id: 'scout',
    name: 'Scout',
    accent: '#e8a33d',
    skin: '#f1c27d',
    jacket: '#e8a33d',
    jacketShade: '#c4842c',
    pack: '#9a3412',
    pants: '#334155',
    pantsShade: '#1e293b',
    headwear: { style: 'cap', color: '#1e293b', trim: '#e8a33d' },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    accent: '#3f9d5a',
    skin: '#c68642',
    jacket: '#3f9d5a',
    jacketShade: '#2f7a45',
    pack: '#7c5a2e',
    pants: '#57534e',
    pantsShade: '#44403c',
    headwear: { style: 'bucket', color: '#d6b77a', trim: '#7c5a2e' },
  },
  {
    id: 'ace',
    name: 'Ace',
    accent: '#3b82f6',
    skin: '#ffdbac',
    jacket: '#3b82f6',
    jacketShade: '#2563eb',
    pack: '#1e3a8a',
    pants: '#1f2937',
    pantsShade: '#111827',
    headwear: { style: 'ponytail', color: '#9a3412', trim: '#facc15' },
  },
  {
    id: 'nova',
    name: 'Nova',
    accent: '#a855f7',
    skin: '#8d5524',
    jacket: '#a855f7',
    jacketShade: '#7e22ce',
    pack: '#db2777',
    pants: '#334155',
    pantsShade: '#1e293b',
    headwear: { style: 'beanie', color: '#ec4899', trim: '#fbcfe8' },
  },
  {
    id: 'sage',
    name: 'Sage',
    accent: '#14b8a6',
    skin: '#f1c27d',
    jacket: '#14b8a6',
    jacketShade: '#0f766e',
    pack: '#7c2d12',
    pants: '#3f3f46',
    pantsShade: '#27272a',
    headwear: { style: 'longhair', color: '#4a2c12', trim: '#14b8a6' },
  },
  {
    id: 'juno',
    name: 'Juno',
    accent: '#f43f5e',
    skin: '#c68642',
    jacket: '#f43f5e',
    jacketShade: '#be123c',
    pack: '#1e293b',
    pants: '#475569',
    pantsShade: '#334155',
    headwear: { style: 'bun', color: '#1c1917', trim: '#f43f5e' },
  },
  {
    id: 'wren',
    name: 'Wren',
    accent: '#8b5cf6',
    skin: '#8d5524',
    jacket: '#8b5cf6',
    jacketShade: '#6d28d9',
    pack: '#0369a1',
    pants: '#1e293b',
    pantsShade: '#0f172a',
    headwear: { style: 'braids', color: '#231108', trim: '#c4b5fd' },
  },
  {
    id: 'kit',
    name: 'Kit',
    accent: '#f59e0b',
    skin: '#ffdbac',
    jacket: '#f59e0b',
    jacketShade: '#b45309',
    pack: '#365314',
    pants: '#292524',
    pantsShade: '#1c1917',
    headwear: { style: 'bob', color: '#7c2d12', trim: '#fde68a' },
  },
]

// Each style's pieces drawn behind the head (`behind`) and on top of it (`over`).
const HEADWEAR = {
  cap: ({ color, trim }) => ({
    behind: '',
    over: `<path d="M13.5 15 a11.5 11.5 0 0 1 23 0 Z" fill="${color}"/>
    <path d="M34 12.5 h8 a2.75 2.75 0 0 1 0 5.5 h-8 Z" fill="${color}"/>
    <circle cx="26" cy="9" r="2.6" fill="${trim}" stroke="none"/>`,
  }),
  bucket: ({ color, trim }) => ({
    behind: '',
    over: `<path d="M16 13 a9 8.5 0 0 1 18 0 Z" fill="${color}"/>
    <rect x="16.8" y="10" width="16.4" height="2.6" fill="${trim}" stroke="none"/>
    <ellipse cx="25" cy="13.5" rx="14" ry="3" fill="${color}"/>`,
  }),
  ponytail: ({ color, trim }) => ({
    behind: `<path d="M17 10 C8 9 4.5 17 6.5 27 C9 22.5 12 19.5 16 18 Z" fill="${color}"/>`,
    over: `<path d="M14.2 19 C12.5 10 18 4.5 25 4.5 C31.5 4.5 36 8.5 36.3 13.5 C31 12.5 27 10.5 24.5 8 C22.5 12 19 16 14.2 19 Z" fill="${color}"/>
    <circle cx="15.5" cy="11.5" r="2" fill="${trim}" stroke="none"/>`,
  }),
  beanie: ({ color, trim }) => ({
    behind: `<circle cx="25" cy="3.2" r="3" fill="${trim}"/>`,
    over: `<path d="M14 14.5 a11 11.5 0 0 1 22 0 Z" fill="${color}"/>
    <rect x="12.5" y="11.5" width="25" height="4.5" rx="2.25" fill="${trim}"/>`,
  }),
  // Falls past the shoulders behind the figure, so it reads at map scale.
  longhair: ({ color, trim }) => ({
    behind: `<path d="M16.5 9 C6 11 4 25 7.5 40 C11.5 32 14 24 17.5 18 Z" fill="${color}"/>`,
    over: `<path d="M14 18 C12.5 9 18 4 25 4 C31.5 4 36 8 36.4 13.5 C31 12 27 10 24.5 7.5 C22 12 18.5 15.8 14 18 Z" fill="${color}"/>
    <circle cx="14.8" cy="24" r="2" fill="${trim}" stroke="none"/>`,
  }),
  // Topknot sitting high and slightly back of the crown.
  bun: ({ color, trim }) => ({
    behind: `<circle cx="19" cy="5.5" r="5.2" fill="${color}"/>`,
    over: `<path d="M14.3 17 C13 8.5 18.5 4 25 4 C31.3 4 36 8 36.4 13.5 C31 12 27 10 24.5 7.5 C22 11.8 18.5 15 14.3 17 Z" fill="${color}"/>
    <circle cx="19" cy="10" r="2.1" fill="${trim}" stroke="none"/>`,
  }),
  // Two plaits: one behind the head, one falling in front of the shoulder.
  braids: ({ color, trim }) => ({
    behind: `<path d="M15.5 11 C8.5 13 7 24 9.5 34 L14.5 32.5 C12.5 24 13 17 18 15 Z" fill="${color}"/>`,
    over: `<path d="M14.2 17.5 C13 8.5 18.5 4 25 4 C31.3 4 36 8 36.4 13.5 C31 12 27 10 24.5 7.5 C22 12 18.5 15.5 14.2 17.5 Z" fill="${color}"/>
    <path d="M33 20 C36 24 35.5 29 34 33 L30 32 C31.5 28 31.5 24 30 21 Z" fill="${color}"/>
    <circle cx="11.8" cy="33.5" r="1.9" fill="${trim}" stroke="none"/>
    <circle cx="32" cy="33" r="1.9" fill="${trim}" stroke="none"/>`,
  }),
  // Chin-length, tucked behind with a visible fringe.
  bob: ({ color, trim }) => ({
    behind: `<path d="M15 10 C9 13 8.5 22 11 27 L16.5 25.5 C14.5 21 14.5 15 17.5 12 Z" fill="${color}"/>`,
    over: `<path d="M13.8 20 C12.5 9 18.5 4 25 4 C31.5 4 36.2 8.5 36.4 14 C32 12.5 28 10.5 25.5 8 C23 13 18.5 17.5 13.8 20 Z" fill="${color}"/>
    <path d="M34.5 14 C36.5 18 36.5 22 35.5 25.5 L31.5 24.5 C32.5 21 32.5 17.5 31.5 14.5 Z" fill="${color}"/>
    <circle cx="20" cy="6.5" r="2" fill="${trim}" stroke="none"/>`,
  }),
}

// Unknown or missing ids (e.g. a profile from before characters existed) get
// the first character.
export function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0]
}

// The figure as SVG markup. Limbs are separate groups so CSS can swing them -
// see index.css. Everything interpolated comes from CHARACTERS above, never
// user input, so callers can safely set it as innerHTML.
export function characterSvg(character) {
  const { skin, jacket, jacketShade, pack, pants, pantsShade } = character
  const headwear = HEADWEAR[character.headwear.style](character.headwear)
  return `
<svg viewBox="0 0 48 70" width="44" height="64" aria-hidden="true">
  <g class="avatar-body" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round">
    <g class="avatar-limb avatar-arm-back"><rect x="19" y="29" width="7" height="16" rx="3.5" fill="${jacketShade}"/></g>
    <g class="avatar-limb avatar-leg-back"><rect x="19" y="45" width="8" height="18" rx="3" fill="${pantsShade}"/><rect x="18" y="61" width="13" height="7" rx="3.5" fill="${SHOES}"/></g>
    <g class="avatar-limb avatar-leg-front"><rect x="22" y="45" width="8" height="18" rx="3" fill="${pants}"/><rect x="21" y="61" width="13" height="7" rx="3.5" fill="${SHOES}"/></g>
    <rect x="8" y="28" width="11" height="18" rx="4" fill="${pack}"/>
    <rect x="14" y="26" width="19" height="23" rx="7" fill="${jacket}"/>
    <g class="avatar-limb avatar-arm-front"><rect x="21" y="29" width="7" height="16" rx="3.5" fill="${jacket}"/><circle cx="24.5" cy="46" r="2.8" fill="${skin}"/></g>
    ${headwear.behind}
    <circle cx="25" cy="16" r="10.5" fill="${skin}"/>
    ${headwear.over}
    <circle cx="30.5" cy="19.5" r="1.7" fill="${OUTLINE}" stroke="none"/>
  </g>
</svg>`
}
