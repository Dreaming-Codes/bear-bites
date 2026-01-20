import {
  type Platform,
  type Browser,
  type InstallMethod,
  type PWADevOverrides,
  detectPlatform,
} from '@/hooks/usePWAInstall'

const PLATFORMS: Platform[] = ['ios', 'android', 'desktop', 'unknown']
const BROWSERS: Browser[] = [
  'safari',
  'chrome',
  'firefox',
  'samsung',
  'edge',
  'opera',
  'other',
]
const INSTALL_METHODS: InstallMethod[] = [
  'native',
  'ios-safari',
  'ios-other',
  'samsung',
  'none',
]

interface PWADevtoolsPanelProps {
  overrides: PWADevOverrides
  setOverrides: (overrides: PWADevOverrides) => void
  clearOverrides: () => void
}

const PRESETS: { name: string; overrides: PWADevOverrides }[] = [
  {
    name: 'iOS Safari',
    overrides: {
      platform: 'ios',
      browser: 'safari',
      installMethod: 'ios-safari',
      isInstalled: false,
      isInstallable: false,
    },
  },
  {
    name: 'iOS Chrome',
    overrides: {
      platform: 'ios',
      browser: 'chrome',
      installMethod: 'ios-other',
      isInstalled: false,
      isInstallable: false,
    },
  },
  {
    name: 'Samsung Browser',
    overrides: {
      platform: 'android',
      browser: 'samsung',
      installMethod: 'samsung',
      isInstalled: false,
      isInstallable: false,
    },
  },
  {
    name: 'Chrome (Native)',
    overrides: {
      platform: 'android',
      browser: 'chrome',
      installMethod: 'native',
      isInstalled: false,
      isInstallable: true,
    },
  },
  {
    name: 'Installed',
    overrides: {
      isInstalled: true,
      isInstallable: false,
    },
  },
]

function PWADevtoolsPanel({
  overrides,
  setOverrides,
  clearOverrides,
}: PWADevtoolsPanelProps) {
  const detected = detectPlatform()
  const hasOverrides = Object.keys(overrides).length > 0

  const selectStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '12px',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
    display: 'block',
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '12px',
  }

  const buttonStyle: React.CSSProperties = {
    background: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    width: '100%',
  }

  const presetButtonStyle: React.CSSProperties = {
    background: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '11px',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        padding: '12px',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff',
        background: '#0d0d1a',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
        PWA Install Simulator
      </h3>

      {/* Detected values */}
      <div
        style={{
          ...sectionStyle,
          padding: '8px',
          background: '#1a1a2e',
          borderRadius: '6px',
        }}
      >
        <div style={{ ...labelStyle, marginBottom: '8px', color: '#666' }}>
          Detected
        </div>
        <div style={{ fontSize: '11px', color: '#888' }}>
          <div>
            Platform: <span style={{ color: '#fff' }}>{detected.platform}</span>
          </div>
          <div>
            Browser: <span style={{ color: '#fff' }}>{detected.browser}</span>
          </div>
          <div>
            Install Method:{' '}
            <span style={{ color: '#fff' }}>{detected.installMethod}</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Quick Presets</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              style={presetButtonStyle}
              onClick={() => setOverrides(preset.overrides)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Override controls */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Platform</div>
        <select
          value={overrides.platform ?? ''}
          onChange={(e) =>
            setOverrides({
              ...overrides,
              platform: (e.target.value as Platform) || undefined,
            })
          }
          style={selectStyle}
        >
          <option value="">Use detected</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Browser</div>
        <select
          value={overrides.browser ?? ''}
          onChange={(e) =>
            setOverrides({
              ...overrides,
              browser: (e.target.value as Browser) || undefined,
            })
          }
          style={selectStyle}
        >
          <option value="">Use detected</option>
          {BROWSERS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Install Method</div>
        <select
          value={overrides.installMethod ?? ''}
          onChange={(e) =>
            setOverrides({
              ...overrides,
              installMethod: (e.target.value as InstallMethod) || undefined,
            })
          }
          style={selectStyle}
        >
          <option value="">Use detected</option>
          {INSTALL_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>States</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <input
              type="checkbox"
              checked={overrides.isInstalled ?? false}
              onChange={(e) =>
                setOverrides({ ...overrides, isInstalled: e.target.checked })
              }
            />
            Installed
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <input
              type="checkbox"
              checked={overrides.isInstallable ?? false}
              onChange={(e) =>
                setOverrides({ ...overrides, isInstallable: e.target.checked })
              }
            />
            Installable
          </label>
        </div>
      </div>

      {/* Clear button */}
      {hasOverrides && (
        <button
          style={{ ...buttonStyle, background: '#dc2626' }}
          onClick={clearOverrides}
        >
          Clear Overrides
        </button>
      )}

      {hasOverrides && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            background: '#1e3a5f',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#93c5fd',
          }}
        >
          Overrides active. Go to Profile page to see the install UI.
        </div>
      )}
    </div>
  )
}

export { PWADevtoolsPanel }
