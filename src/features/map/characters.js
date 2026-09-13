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
