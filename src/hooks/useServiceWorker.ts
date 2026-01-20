import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service worker registered:', registration.scope)

        setInterval(
          () => {
            registration.update()
          },
          60 * 60 * 1000,
        ) // Check every hour
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed:', error)
      })
  }, [])
}

export default useServiceWorker
