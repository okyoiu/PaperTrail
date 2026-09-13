import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import App from './App.jsx'

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('notch')) {
  document.documentElement.dataset.fakeNotch = ''
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
