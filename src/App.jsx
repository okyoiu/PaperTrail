import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import InstallPrompt from './features/mobile/InstallPrompt'
import { ProfileSetupModal } from './features/social/ProfileSetupModal'
import { AuthProvider } from './hooks/useAuth'
import { AddFriendPage } from './pages/AddFriendPage'
import { AlbumPage } from './pages/AlbumPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import './App.css'

function App() {
  const immersive = useLocation().pathname === '/'

  return (
    <AuthProvider>
      <div className={immersive ? 'app-shell app-shell--immersive' : 'app-shell'}>
        {!immersive && (
          <header className="app-topbar">
            <span className="app-brand">
              <svg className="app-brand-pin" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2.4c-3.5 0-6.3 2.7-6.3 6.2 0 4.4 6.3 12.6 6.3 12.6s6.3-8.2 6.3-12.6c0-3.5-2.8-6.2-6.3-6.2Z"
                  fill="var(--pin)"
                  stroke="var(--pin-deep)"
                  strokeWidth="1.2"
                />
                <circle cx="12" cy="8.6" r="2.4" fill="#fffdf6" />
              </svg>
              <span className="app-brand-name">RiceHack Quest</span>
            </span>
            <InstallPrompt />
          </header>
        )}

        <main className={immersive ? 'app-content app-content--immersive' : 'app-content'}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/friends" element={<AddFriendPage />} />
            <Route path="/album" element={<AlbumPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>

        <BottomNav />
        <ProfileSetupModal />
        <div className="safe-area-blur-top" aria-hidden="true" />
      </div>
    </AuthProvider>
  )
}

export default App
