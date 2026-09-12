import { useEffect, useState } from 'react'

// iOS Safari never fires beforeinstallprompt (Apple platform restriction, not
// fixable from here), so there's no programmatic install button possible there.
function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
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
    return <div className="install-hint">Tap Share → Add to Home Screen</div>
  }

  return null
}
