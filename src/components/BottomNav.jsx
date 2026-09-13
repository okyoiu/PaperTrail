import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const TABS = [
  { to: '/', label: 'Map', icon: '🗺️', end: true },
  { to: '/friends', label: 'Friends', icon: '👥' },
  { to: '/album', label: 'Album', icon: '📸' },
  { to: '/login', label: 'Login', icon: '👤', loggedInLabel: 'Profile' },
]

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
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span>{tab.to === '/login' && user ? tab.loggedInLabel : tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
