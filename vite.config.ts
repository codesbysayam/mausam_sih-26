import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const isHmrDisabled =
    process.env.DISABLE_HMR === 'true' ||
    Boolean(process.env.K_SERVICE || process.env.K_REVISION);

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isHmrDisabled
        ? [
            {
              name: 'mausam-disable-hmr-client-ws',
              apply: 'serve' as const,
              enforce: 'post' as const,
              transform(code: string, id: string) {
                if (id.includes('vite/dist/client/client.mjs') || id.endsWith('/@vite/client')) {
                  return code.replace(
                    /const transport = normalizeModuleRunnerTransport\([\s\S]*?\n\);\n(?=let willUnload = false;)/,
                    'const transport = normalizeModuleRunnerTransport({ connect() {}, disconnect() {}, send() {} });\n'
                  );
                }
                return null;
              },
            },
          ]
        : []),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: false,
        },
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          name: 'MAUSAM — Atmospheric Observatory',
          short_name: 'MAUSAM',
          description:
            'National meteorological observation, Doppler radar nowcasting, disaster warnings, and environmental intelligence for India.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#0B0C0D',
          background_color: '#0B0C0D',
          categories: ['weather', 'news', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/node_modules\//, /\.mjs$/i],
          runtimeCaching: [
            // CRITICAL: Never cache live telemetry diagnostics, health, or interactive AI/TTS routes
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/system') ||
                url.pathname.startsWith('/api/health') ||
                url.pathname.startsWith('/api/tts') ||
                url.pathname.startsWith('/api/ask-mausam') ||
                url.pathname.startsWith('/api/mausam/chat') ||
                url.pathname.startsWith('/api/chat') ||
                url.pathname.startsWith('/api/ai/'),
              handler: 'NetworkOnly',
            },
            // Read-only meteorological data: NetworkFirst with 5s timeout & 24h offline fallback cache
            {
              urlPattern: ({ url, request }) =>
                request.method === 'GET' &&
                (url.pathname.startsWith('/api/weather') ||
                  url.pathname.startsWith('/api/warnings') ||
                  url.pathname.startsWith('/api/radar') ||
                  url.pathname.startsWith('/api/cyclone') ||
                  url.pathname.startsWith('/api/agromet') ||
                  url.pathname.startsWith('/api/weather-news') ||
                  url.pathname.startsWith('/api/air-quality') ||
                  url.pathname.startsWith('/api/marine') ||
                  url.pathname.startsWith('/api/stations') ||
                  url.pathname.startsWith('/api/locations') ||
                  url.pathname.startsWith('/api/proxy/open-meteo') ||
                  url.pathname.startsWith('/api/proxy/air-quality')),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'mausam-meteorology-api-v1',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Direct Open-Meteo fallback endpoints
            {
              urlPattern: /^https:\/\/(api|air-quality-api)\.open-meteo\.com\/v1\//i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'mausam-open-meteo-v1',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // OpenStreetMap base map tiles for offline cartography continuity
            {
              urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mausam-osm-tiles-v1',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: !isHmrDisabled,
      ...(isHmrDisabled ? { ws: false as const } : {}),
      watch: isHmrDisabled ? null : {},
    },
  };
});
