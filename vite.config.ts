import { URL, fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { defineConfig, build as viteBuild } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const appVersion = packageJson.version || '0.0.0'

/**
 * Custom plugin that:
 * 1. Compiles src/sw.ts → dist/client/sw.js via a Vite sub-build
 * 2. Scans dist/client/ for build assets and generates a precache manifest
 * 3. Injects the manifest into sw.js replacing self.__WB_MANIFEST
 */
function serviceWorkerPlugin() {
  let clientOutDir: string
  let hasBuilt = false

  return {
    name: 'service-worker',
    apply: 'build' as const,
    configResolved(config: any) {
      clientOutDir = resolve(config.root, 'dist/client')
    },
    async closeBundle() {
      // Only build once (closeBundle fires for both client and SSR builds)
      if (hasBuilt) return
      hasBuilt = true
      const swSrc = resolve(__dirname, 'src/sw.ts')
      const swDest = resolve(clientOutDir, 'sw.js')

      // Step 1: Build the SW with Vite (compiles TS, bundles workbox imports)
      await viteBuild({
        configFile: false,
        root: __dirname,
        resolve: {
          alias: {
            '@': resolve(__dirname, 'src'),
          },
        },
        build: {
          lib: {
            entry: swSrc,
            formats: ['es'],
            fileName: () => 'sw.js',
          },
          outDir: clientOutDir,
          emptyOutDir: false,
          minify: true,
          sourcemap: false,
          rollupOptions: {
            output: {
              entryFileNames: 'sw.js',
              // SW must be a single file — inline all imports
              inlineDynamicImports: true,
            },
          },
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        // Don't apply other plugins — just build the SW
        plugins: [],
      })

      // Step 2: Scan build output for precache manifest
      const manifest = generatePrecacheManifest(clientOutDir)
      console.log(
        `[service-worker] Generated precache manifest with ${manifest.length} entries`,
      )

      // Step 3: Inject manifest into sw.js
      let swContent = readFileSync(swDest, 'utf-8')
      swContent = swContent.replace(
        'self.__WB_MANIFEST',
        JSON.stringify(manifest),
      )
      writeFileSync(swDest, swContent)
      console.log(`[service-worker] Built and injected manifest into sw.js`)
    },
  }
}

/** File extensions to include in the precache manifest */
const PRECACHE_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.html',
  '.json',
  '.png',
  '.ico',
  '.svg',
  '.webp',
  '.woff2',
  '.woff',
])

/** Paths to exclude from precaching */
const PRECACHE_EXCLUDES = ['/sw.js', '/.vite/']

function generatePrecacheManifest(
  dir: string,
  base = '/',
): Array<{ url: string; revision: string | null }> {
  const manifest: Array<{ url: string; revision: string | null }> = []

  function walk(currentDir: string) {
    for (const entry of readdirSync(currentDir)) {
      const fullPath = join(currentDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walk(fullPath)
        continue
      }

      const ext = extname(entry)
      if (!PRECACHE_EXTENSIONS.has(ext)) continue

      const url = base + fullPath.slice(dir.length + 1).replace(/\\/g, '/')

      // Skip excluded paths
      if (PRECACHE_EXCLUDES.some((exc) => url.includes(exc))) continue

      // Vite-hashed assets don't need a revision (hash is in the filename)
      // Vite format: name-HASH.ext (e.g. main-Bd3LIvpN.js, styles-CfzptAwS.css)
      const hasContentHash = /-[a-zA-Z0-9_-]{8,}\.\w+$/.test(entry)

      if (hasContentHash) {
        manifest.push({ url, revision: null })
      } else {
        // Non-hashed files (manifest.json, icons, etc.) — compute a revision hash
        const content = readFileSync(fullPath)
        const revision = createHash('md5').update(content).digest('hex')
        manifest.push({ url, revision })
      }
    }
  }

  walk(dir)
  return manifest
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
    serviceWorkerPlugin(),
  ],
})

export default config
