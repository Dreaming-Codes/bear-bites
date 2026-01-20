import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { usePWAInstall, usePWADevContext } from '@/hooks/usePWAInstall'
import { InstallInstructions } from '@/components/InstallInstructions'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'pwa-install-prompt'
const VISIT_THRESHOLD = 3

interface StorageData {
  visitCount: number
  dismissed: boolean
  lastVisit: number
}

function getStorageData(): StorageData {
  if (typeof window === 'undefined') {
    return { visitCount: 0, dismissed: false, lastVisit: 0 }
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // Ignore parse errors
  }
  return { visitCount: 0, dismissed: false, lastVisit: 0 }
}

function setStorageData(data: StorageData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const {
    isInstalled,
    isInstallable,
    installMethod,
    promptInstall,
    showInstallSection,
  } = usePWAInstall()

  // Subscribe to force prompt from devtools
  const devContext = usePWADevContext()

  useEffect(() => {
    if (!devContext?.subscribeToForcePrompt) return

    const unsubscribe = devContext.subscribeToForcePrompt(() => {
      setShowPrompt(true)
    })

    return unsubscribe
  }, [devContext])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Don't show if already installed
    if (isInstalled) return

    // Don't show if there's no install method available
    if (!showInstallSection) return

    const data = getStorageData()

    // Don't show if already dismissed
    if (data.dismissed) return

    // Check if this is a new session (more than 30 minutes since last visit)
    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000
    const isNewSession = now - data.lastVisit > thirtyMinutes

    if (isNewSession) {
      const newVisitCount = data.visitCount + 1
      setStorageData({
        ...data,
        visitCount: newVisitCount,
        lastVisit: now,
      })

      // Show prompt if we've reached the threshold
      if (newVisitCount >= VISIT_THRESHOLD) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 1500)
        return () => clearTimeout(timer)
      }
    } else {
      setStorageData({ ...data, lastVisit: now })
    }
  }, [isInstalled, showInstallSection])

  const handleDismiss = () => {
    setShowPrompt(false)
    const data = getStorageData()
    setStorageData({ ...data, dismissed: true })
  }

  const handleInstall = async () => {
    if (isInstallable) {
      const accepted = await promptInstall()
      if (accepted) {
        setShowPrompt(false)
        const data = getStorageData()
        setStorageData({ ...data, dismissed: true })
      }
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl',
          'animate-in slide-in-from-bottom-4 duration-300',
        )}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Download size={32} className="text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2">
            Install Bear Bites
          </h2>

          {/* Description */}
          <p className="text-muted-foreground text-center mb-6">
            Add Bear Bites to your home screen for quick access and a better
            experience.
          </p>

          {/* Install instructions */}
          <InstallInstructions
            installMethod={installMethod}
            isInstalled={false}
            isInstallable={isInstallable}
            onInstall={handleInstall}
            variant="compact"
          />

          {/* Maybe later button */}
          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
