import { useState, type ReactNode } from 'react'
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

  const setOverrides = (newOverrides: PWADevOverrides) => {
    setOverridesState(newOverrides)
  }

  const clearOverrides = () => {
    setOverridesState({})
  }

  return (
    <PWADevContext.Provider
      value={{
        overrides,
        setOverrides,
        clearOverrides,
        detectedPlatformInfo,
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
  // We need to access the context from within the tree
  // This component will be rendered inside TanStack devtools
  // but it's outside our provider, so we need a different approach
  return <PWADevtoolsPanelConnected />
}

function PWADevtoolsPanelConnected() {
  // Import the hook directly to access the context
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
    />
  )
}

import { useContext } from 'react'

function usePWADevContextInternal() {
  return useContext(PWADevContext)
}

export default createPWADevtoolsPlugin()
