import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import InstallPrompt from './features/mobile/InstallPrompt'
import { AddFriendPage } from './pages/AddFriendPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <h1>Visit Tracker</h1>
        <InstallPrompt />
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/friends" element={<AddFriendPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}

export default App
