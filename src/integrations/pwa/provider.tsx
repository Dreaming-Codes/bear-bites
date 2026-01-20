import { useState, useRef, useCallback, type ReactNode } from 'react'
import {
  PWADevContext,
  type PWADevOverrides,
  detectPlatform,
} from '@/hooks/usePWAInstall'
import { PWADevtoolsPanel } from './devtools'

interface PWADevProviderProps {
  children: ReactNode
}

export function PWADevProvider({ children }: PWADevProviderProps) {
  const [overrides, setOverridesState] = useState<PWADevOverrides>({})
  const detectedPlatformInfo = detectPlatform()

  const forcePromptCallbacks = useRef<Set<() => void>>(new Set())

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
