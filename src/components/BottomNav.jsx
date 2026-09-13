import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Hand-drawn-feeling line icons in the app's theme, colored by currentColor so
// the active tab tints them (see .bottom-nav in App.css). One per tab.
const ICONS = {
  map: (
    <path d="M12 2.6c-3.3 0-6 2.6-6 5.9 0 4.2 6 12 6 12s6-7.8 6-12c0-3.3-2.7-5.9-6-5.9Z M12 6.4a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />
  ),
  friends: (
    <path d="M9 11.4a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M15.4 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M3.4 19c0-3 2.5-5 5.6-5s5.6 2 5.6 5 M15 14.2c2.7.2 4.6 2 4.6 4.8" />
  ),
  album: (
    <path d="M4.5 6.5h3l1.2-1.8h6.6L16.5 6.5h3a1.6 1.6 0 0 1 1.6 1.6v9.3a1.6 1.6 0 0 1-1.6 1.6H4.5a1.6 1.6 0 0 1-1.6-1.6V8.1A1.6 1.6 0 0 1 4.5 6.5Z M12 15.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z" />
  ),
  profile: (
    <path d="M12 11.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z M5.4 19.4c0-3.4 2.9-5.8 6.6-5.8s6.6 2.4 6.6 5.8" />
  ),
}

const TABS = [
  { to: '/', label: 'Map', icon: 'map', end: true },
  { to: '/friends', label: 'Friends', icon: 'friends' },
  { to: '/album', label: 'Album', icon: 'album' },
  { to: '/login', label: 'Login', icon: 'profile', loggedInLabel: 'Profile' },
]

function NavIcon({ name }) {
  return (
    <svg
      className="bottom-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export function BottomNav() {
  const { user } = useAuth()

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'active' : undefined)}
        >
          <NavIcon name={tab.icon} />
          <span>{tab.to === '/login' && user ? tab.loggedInLabel : tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
