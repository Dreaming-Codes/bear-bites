import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import {
  PWADevContext,
  type PWADevOverrides,
  type InstallMethod,
  detectPlatform,
} from '@/hooks/usePWAInstall'
import { PWADevtoolsPanel } from './devtools'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWADevProviderProps {
  children: ReactNode
}

export function PWADevProvider({ children }: PWADevProviderProps) {
  const [overrides, setOverridesState] = useState<PWADevOverrides>({})
  const detectedPlatformInfo = detectPlatform()

  // Global PWA install state - captured once at app startup
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallableGlobal, setIsInstallableGlobal] = useState(false)
  const [installMethodGlobal, setInstallMethodGlobal] = useState<InstallMethod>(
    detectedPlatformInfo.installMethod,
  )
  const [isInstalledGlobal, setIsInstalledGlobal] = useState(false)

  const forcePromptCallbacks = useRef<Set<() => void>>(new Set())

  // Capture beforeinstallprompt and appinstalled events at app startup
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsInstalledGlobal(isStandalone)
    }

    checkInstalled()

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallableGlobal(true)
      setInstallMethodGlobal('native')
    }

    const handleAppInstalled = () => {
      setIsInstalledGlobal(true)
      setIsInstallableGlobal(false)
      setDeferredPrompt(null)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    )
    window.addEventListener('appinstalled', handleAppInstalled)

    // Also check on display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', checkInstalled)
    }
  }, [])

  const setOverrides = (newOverrides: PWADevOverrides) => {
    setOverridesState(newOverrides)
  }

  const clearOverrides = () => {
    setOverridesState({})
  }

  const forceShowPrompt = useCallback(() => {
    forcePromptCallbacks.current.forEach((callback) => callback())
  }, [])

  const subscribeToForcePrompt = useCallback((callback: () => void) => {
    forcePromptCallbacks.current.add(callback)
    return () => {
      forcePromptCallbacks.current.delete(callback)
    }
  }, [])

  return (
    <PWADevContext.Provider
      value={{
        overrides,
        setOverrides,
        clearOverrides,
        detectedPlatformInfo,
        forceShowPrompt,
        subscribeToForcePrompt,
        // Global PWA install state
        deferredPrompt,
        setDeferredPrompt,
        isInstallableGlobal,
        setIsInstallableGlobal,
        installMethodGlobal,
        setInstallMethodGlobal,
        isInstalledGlobal,
        setIsInstalledGlobal,
      }}
    >
      {children}
    </PWADevContext.Provider>
  )
}

export function createPWADevtoolsPlugin() {
  return {
    name: 'PWA Install',
    render: <PWADevtoolsPanelWrapper />,
  }
}

function PWADevtoolsPanelWrapper() {
  return <PWADevtoolsPanelConnected />
}

function PWADevtoolsPanelConnected() {
  const context = usePWADevContextInternal()

  if (!context) {
    return (
      <div style={{ padding: '12px', color: '#888', fontSize: '12px' }}>
        PWA Dev Provider not found. Make sure the app is wrapped with
        PWADevProvider.
      </div>
    )
  }

  return (
    <PWADevtoolsPanel
      overrides={context.overrides}
      setOverrides={context.setOverrides}
      clearOverrides={context.clearOverrides}
      forceShowPrompt={context.forceShowPrompt}
    />
  )
}

import { useContext } from 'react'

function usePWADevContextInternal() {
  return useContext(PWADevContext)
}

export default createPWADevtoolsPlugin()
