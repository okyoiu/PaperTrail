import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import InstallPrompt from './features/mobile/InstallPrompt'
import { ProfileSetupModal } from './features/social/ProfileSetupModal'
import { AuthProvider } from './hooks/useAuth'
import { AddFriendPage } from './pages/AddFriendPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import './App.css'

function App() {
  const immersive = useLocation().pathname === '/'

  return (
    <AuthProvider>
      <div className="app-shell">
        {!immersive && (
          <header className="app-topbar">
            <h1>Visit Tracker</h1>
            <InstallPrompt />
          </header>
        )}

        <main className={immersive ? 'app-content app-content--immersive' : 'app-content'}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/friends" element={<AddFriendPage />} />
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
