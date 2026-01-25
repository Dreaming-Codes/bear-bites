import { URL, fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const appVersion = packageJson.version || '0.0.0'

// Plugin to inject version into service worker
function serviceWorkerVersionPlugin() {
  return {
    name: 'sw-version',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist/client/sw.js')
      try {
        let swContent = readFileSync(swPath, 'utf-8')
        swContent = swContent.replace(/__APP_VERSION__/g, appVersion)
        writeFileSync(swPath, swContent)
        console.log(
          `[sw-version] Injected version ${appVersion} into service worker`,
        )
      } catch {
        // SW file might not exist in all build scenarios
      }
    },
  }
}

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    serviceWorkerVersionPlugin(),
  ],
})

export default config
