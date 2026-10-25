import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import path from 'path';

/**
 * The oldest browsers the web app supports (owner, 2026-10-24: devices from 2018 on): Chrome and
 * Android WebView 69 (Samsung Tizen 5.5 TVs from 2019, Android phones), Safari / iOS 12,
 * Firefox 78, Edge 79. The JavaScript is compiled down to them with only the polyfills the code
 * uses, and the CSS is lowered (postcss.config.mjs, css.lightningcss below). Checked in a real
 * Chromium 69: before this the app did not start there at all ("Unexpected token ?").
 */
const SUPPORTED = ['chrome >= 69', 'and_chr >= 69', 'safari >= 12', 'ios_saf >= 12', 'firefox >= 78', 'edge >= 79', 'samsung >= 10'];
const ESBUILD_TARGETS = ['chrome69', 'safari12', 'ios12', 'firefox78', 'edge79'];

export default defineConfig({
  plugins: [
    react(),
    // Modern (ES module) chunks only, compiled for SUPPORTED, plus the core-js polyfills they need
    // there (Array.prototype.at, structuredClone, Promise.allSettled...). Every SUPPORTED browser
    // runs ES modules, so no separate legacy bundle is built.
    legacy({ modernTargets: SUPPORTED, modernPolyfills: true, renderLegacyChunks: false }),
    // The app's code runs once the intro is on screen and moving: as a plain module script it
    // ran right after the page was read, often before its first frame, holding the main thread
    // ~0.85 s, so the intro's first frame came with its clock already past the slide (owner,
    // 2026-10-24: "webui shows no animation"). The file still downloads at once (modulepreload);
    // index.html's intro calls window.__pcStartApp two frames after it is drawn, or at once.
    {
      name: 'app-after-intro-frame',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler: (html) =>
          html.replace(/<script type="module" crossorigin src="([^"]*assets\/index-[^"]*\.js)"><\/script>/, (_tag, src) =>
            `<link rel="modulepreload" crossorigin href="${src}">` +
            `<script>window.__pcStartApp = function () { if (window.__pcAppStarted) return; window.__pcAppStarted = 1; ` +
            `var s = document.createElement('script'); s.type = 'module'; s.crossOrigin = ''; s.src = '${src}'; document.head.appendChild(s); };</script>`),
      },
    },
    // The polyfills (48 KB gzipped) only where something is missing: a current browser has the
    // newest features they cover (iterator helpers, Set methods: Chrome 122, Safari 18.4,
    // Firefox 131) and skips them. Written in while the page is parsed, so they still run before
    // the app's module (deferred scripts run in document order).
    {
      name: 'polyfills-only-when-needed',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler: (html) =>
          html.replace(/<script type="module" crossorigin src="([^"]*polyfills-[^"]*)"><\/script>/, (_tag, src) =>
            `<script>if (!(window.Iterator && Iterator.prototype && Iterator.prototype.toArray && Set.prototype.union && window.structuredClone && Array.prototype.findLast)) document.write('<script type="module" crossorigin src="${src}"><\\/script>');</script>`),
      },
    },
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
                maxEntries: 3000,
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
        name: 'PortalCast',
        short_name: 'PortalCast',
        start_url: '.',
        display: 'standalone',
        background_color: '#0B1020',
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
  css: {
    // Colours (oklch), logical properties (padding-inline...) and inset lowered for SUPPORTED.
    lightningcss: { targets: browserslistToTargets(browserslist(SUPPORTED)) },
  },
  build: {
    target: ESBUILD_TARGETS,
    cssTarget: ESBUILD_TARGETS,
    cssMinify: 'lightningcss',
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
