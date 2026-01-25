import { CheckCircle, Download, MoreVertical, Plus, Share } from 'lucide-react'
import type {InstallMethod} from '@/hooks/usePWAInstall';

interface InstallInstructionsProps {
  installMethod: InstallMethod
  isInstalled: boolean
  isInstallable: boolean
  onInstall: () => void
  /** Size variant for icons and spacing */
  variant?: 'default' | 'compact'
}

export function InstallInstructions({
  installMethod,
  isInstalled,
  isInstallable,
  onInstall,
  variant = 'default',
}: InstallInstructionsProps) {
  const iconSize = variant === 'compact' ? 14 : 16
  const stepSize = variant === 'compact' ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
  const spacing = variant === 'compact' ? 'gap-2' : 'gap-3'

  if (isInstalled) {
    return (
      <>
        <div className="flex items-center gap-3 text-primary">
          <CheckCircle size={20} />
          <span>Bear Bites is installed!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          You can access Bear Bites from your home screen.
        </p>
      </>
    )
  }

  if (isInstallable) {
    return (
      <>
        <button
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          <span>Install Now</span>
        </button>
        {variant === 'default' && (
          <p className="text-sm text-muted-foreground mt-2">
            Install for quick access and offline support.
          </p>
        )}
      </>
    )
  }

  if (installMethod === 'ios-safari') {
    return (
      <div className="space-y-3 text-sm">
        {variant === 'default' && (
          <p className="text-muted-foreground">
            To install Bear Bites on your device:
          </p>
        )}
        <ol className="space-y-2">
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              1
            </span>
            <span>
              Tap the{' '}
              <Share
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Share</strong> button in the toolbar
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              2
            </span>
            <span>
              Scroll down and tap{' '}
              <Plus
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Add to Home Screen</strong>
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              3
            </span>
            <span>
              Tap <strong>Add</strong> to confirm
            </span>
          </li>
        </ol>
      </div>
    )
  }

  if (installMethod === 'ios-other') {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-amber-500 shrink-0">⚠️</span>
          <p className="text-amber-700 dark:text-amber-400">
            Installing apps on iOS is only supported in Safari.
          </p>
        </div>
        <p className="text-muted-foreground">To install Bear Bites:</p>
        <ol className="space-y-2">
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              1
            </span>
            <span>
              Open this page in <strong>Safari</strong>
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              2
            </span>
            <span>
              Tap the{' '}
              <Share
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Share</strong> button
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              3
            </span>
            <span>
              Tap{' '}
              <Plus
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Add to Home Screen</strong>
            </span>
          </li>
        </ol>
      </div>
    )
  }

  if (installMethod === 'samsung') {
    return (
      <div className="space-y-3 text-sm">
        {variant === 'default' && (
          <p className="text-muted-foreground">
            To install Bear Bites on your device:
          </p>
        )}
        <ol className="space-y-2">
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              1
            </span>
            <span>
              Tap the{' '}
              <MoreVertical
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Menu</strong> button (three dots)
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              2
            </span>
            <span>
              Tap{' '}
              <Plus
                size={iconSize}
                className="inline-block align-text-bottom mx-0.5"
              />{' '}
              <strong>Add page to</strong>
            </span>
          </li>
          <li className={`flex items-start ${spacing}`}>
            <span
              className={`bg-primary text-primary-foreground rounded-full ${stepSize} flex items-center justify-center font-medium shrink-0`}
            >
              3
            </span>
            <span>
              Select <strong>Home screen</strong>
            </span>
          </li>
        </ol>
      </div>
    )
  }

  return null
}

export default InstallInstructions
