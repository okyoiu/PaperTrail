import { useEffect, useState } from 'react'

// iOS Safari never fires beforeinstallprompt (Apple platform restriction, not
// fixable from here), so there's no programmatic install button possible there.
function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// This is a mobile-only feature - desktop Chrome/Edge also fire
// beforeinstallprompt and would happily "install" the site as a standalone
// desktop app window, which is confusing rather than useful here.
function isMobileDevice() {
  return /iphone|ipad|ipod|android/i.test(window.navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (!isMobileDevice()) return

    function handler(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (isIos() && !isStandalone()) {
      setShowIosHint(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!isMobileDevice()) return null

  if (deferredPrompt) {
    return (
      <button
        className="install-button"
        onClick={async () => {
          deferredPrompt.prompt()
          await deferredPrompt.userChoice
          setDeferredPrompt(null)
        }}
      >
        Install App
      </button>
    )
  }

  if (showIosHint) {
    return (
      <div className="install-hint">
        <span aria-hidden="true">📤</span> Add to Home Screen
      </div>
    )
  }

  return null
}
