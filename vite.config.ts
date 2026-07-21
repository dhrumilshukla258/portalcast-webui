import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        navigateFallbackDenylist: [
          /^\/api/,
          /^\/proxy/,
          /^\/live\.m3u8/,
          /^\/player/,
        ],
        runtimeCaching: [
          {
            // Poster/thumbnail images — stable, non-tokenized URLs (unlike
            // stream/proxy URLs, which mint a fresh token per request/session).
            // Matched before the blanket /api rule below since Workbox uses
            // first-match-wins. CacheFirst since these paths are effectively
            // immutable once uploaded — no need to re-check the server on
            // every visit like the old StaleWhileRevalidate/1h setup did.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/images'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'poster-images',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
            },
          },
          {
            // Any remaining image request, regardless of origin — covers
            // Discover's TMDB-hosted artwork (AmbientBackdrop, MediaCard,
            // MediaCardRow), which the poster-images rule above doesn't match
            // since those are absolute cross-origin URLs, not portal-proxied
            // `/api/images/...` paths. Workbox is first-match-wins, so this
            // only catches what rule 1 didn't — no overlap. CacheFirst (not
            // StaleWhileRevalidate) since these URLs are effectively
            // immutable per-path; unlike the proxied posters there's no
            // known Cache-Control to mirror, so once cached there's no need
            // to ever re-request it in the background. `cacheableResponse`
            // allows opaque (status 0) responses to be cached too, since
            // cross-origin `<img>` requests go out without CORS and the SW
            // can't read their real status. This is what actually stops a
            // Discover row's images from re-fetching every time you switch
            // tabs and scroll back — the poster-images rule alone never
            // covered them.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              return (
                url.pathname.startsWith('/api') ||
                url.pathname.startsWith('/proxy') ||
                url.pathname.startsWith('/player') ||
                url.pathname.includes('.m3u8') ||
                url.pathname.includes('.ts') ||
                url.pathname.includes('.mp4')
              );
            },
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Portalcast',
        short_name: 'Portalcast',
        start_url: '.',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2015',
  },
  base: './',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/live.m3u8': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/player': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
