import { useCallback, useMemo, createContext, useContext } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export type Platform = 'ios' | 'android' | 'desktop' | 'unknown'
export type Browser =
  | 'safari'
  | 'chrome'
  | 'firefox'
  | 'samsung'
  | 'edge'
  | 'opera'
  | 'other'

export type InstallMethod =
  | 'native' // beforeinstallprompt is available
  | 'ios-safari' // iOS Safari - show share menu instructions
  | 'ios-other' // iOS non-Safari - tell user to use Safari
  | 'samsung' // Samsung Browser - show add to home screen instructions
  | 'none' // No install method available

export interface PlatformInfo {
  platform: Platform
  browser: Browser
  installMethod: InstallMethod
}

export interface PWADevOverrides {
  platform?: Platform
  browser?: Browser
  installMethod?: InstallMethod
  isInstalled?: boolean
  isInstallable?: boolean
}

interface PWADevContextValue {
  overrides: PWADevOverrides
  setOverrides: (overrides: PWADevOverrides) => void
  clearOverrides: () => void
  detectedPlatformInfo: PlatformInfo
  forceShowPrompt: () => void
  subscribeToForcePrompt: (callback: () => void) => () => void
  // Global PWA install state (captured at app startup)
  deferredPrompt: BeforeInstallPromptEvent | null
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void
  isInstallableGlobal: boolean
  setIsInstallableGlobal: (value: boolean) => void
  installMethodGlobal: InstallMethod
  setInstallMethodGlobal: (value: InstallMethod) => void
  isInstalledGlobal: boolean
  setIsInstalledGlobal: (value: boolean) => void
}

const PWADevContext = createContext<PWADevContextValue | null>(null)

export function usePWADevContext() {
  return useContext(PWADevContext)
}

export { PWADevContext }

export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', browser: 'other', installMethod: 'none' }
  }

  const ua = navigator.userAgent.toLowerCase()

  let platform: Platform = 'unknown'
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/.test(ua)

  if (isIOS) {
    platform = 'ios'
  } else if (isAndroid) {
    platform = 'android'
  } else if (/windows|macintosh|linux/.test(ua) && !isAndroid) {
    platform = 'desktop'
  }

  let browser: Browser = 'other'

  if (isIOS) {
    // On iOS, check if running in Safari or a different browser
    // Safari on iOS has no 'CriOS', 'FxiOS', 'OPiOS', 'EdgiOS' in UA
    const isChromeIOS = /crios/.test(ua)
    const isFirefoxIOS = /fxios/.test(ua)
    const isOperaIOS = /opios/.test(ua)
    const isEdgeIOS = /edgios/.test(ua)

    if (isChromeIOS) {
      browser = 'chrome'
    } else if (isFirefoxIOS) {
      browser = 'firefox'
    } else if (isEdgeIOS) {
      browser = 'edge'
    } else if (isOperaIOS) {
      browser = 'opera'
    } else {
      // Likely Safari (or Safari WebView in an in-app browser)
      browser = 'safari'
    }
  } else {
    // Non-iOS browser detection
    const isSamsungBrowser = /samsungbrowser/.test(ua)
    const isChrome = /chrome/.test(ua) && !/edg/.test(ua) && !isSamsungBrowser
    const isFirefox = /firefox/.test(ua)
    const isSafari =
      /safari/.test(ua) && !/chrome/.test(ua) && !/android/.test(ua)
    const isEdge = /edg/.test(ua)
    const isOpera = /opr\//.test(ua) || /opera/.test(ua)

    if (isSamsungBrowser) {
      browser = 'samsung'
    } else if (isEdge) {
      browser = 'edge'
    } else if (isOpera) {
      browser = 'opera'
    } else if (isChrome) {
      browser = 'chrome'
    } else if (isFirefox) {
      browser = 'firefox'
    } else if (isSafari) {
      browser = 'safari'
    }
  }

  let installMethod: InstallMethod = 'none'

  if (isIOS) {
    if (browser === 'safari') {
      installMethod = 'ios-safari'
    } else {
      installMethod = 'ios-other'
    }
  } else if (browser === 'samsung') {
    installMethod = 'samsung'
  }
  // Note: 'native' will be set when beforeinstallprompt fires

  return { platform, browser, installMethod }
}

export function usePWAInstall() {
  const detectedPlatformInfo = useMemo(() => detectPlatform(), [])

  const devContext = usePWADevContext()
  const overrides = devContext?.overrides

  // Use global state from context (captured at app startup) with fallbacks for SSR
  const deferredPrompt = devContext?.deferredPrompt ?? null
  const setDeferredPrompt = devContext?.setDeferredPrompt ?? (() => {})
  const isInstallableGlobal = devContext?.isInstallableGlobal ?? false
  const setIsInstallableGlobal =
    devContext?.setIsInstallableGlobal ?? (() => {})
  const installMethodGlobal =
    devContext?.installMethodGlobal ?? detectedPlatformInfo.installMethod
  const isInstalledGlobal = devContext?.isInstalledGlobal ?? false

  const isInstalled = overrides?.isInstalled ?? isInstalledGlobal
  const isInstallable = overrides?.isInstallable ?? isInstallableGlobal
  const installMethod = overrides?.installMethod ?? installMethodGlobal
  const platform = overrides?.platform ?? detectedPlatformInfo.platform
  const browser = overrides?.browser ?? detectedPlatformInfo.browser

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No installation prompt available')
      return false
    }

    await deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setIsInstallableGlobal(false)

    return outcome === 'accepted'
  }, [deferredPrompt, setDeferredPrompt, setIsInstallableGlobal])

  // Show if: installed, native prompt available, or platform supports manual install
  const showInstallSection =
    isInstalled ||
    isInstallable ||
    installMethod === 'ios-safari' ||
    installMethod === 'ios-other' ||
    installMethod === 'samsung'

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    installMethod,
    platform,
    browser,
    showInstallSection,
  }
}

export default usePWAInstall
