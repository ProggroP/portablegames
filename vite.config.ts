import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Relative Pfade: Der Build läuft in jedem Ordner eines Webspace.
// Mit BASE_PATH lässt sich ein fester Pfad erzwingen, zum Beispiel /spiele/.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'lizenzen.txt'],
      manifest: {
        // Feste Kennung der App. Entspricht der bisherigen, aus start_url abgeleiteten Kennung (/spiele/).
        id: './',
        name: 'PortableGames',
        short_name: 'PortableGames',
        description: 'Klassische Spiele für ein Smartphone, allein oder zu zweit.',
        lang: 'de',
        display: 'standalone',
        // Die App dreht die Darstellung selbst, je nach Spiel und Sitzordnung.
        orientation: 'any',
        background_color: '#12131A',
        theme_color: '#12131A',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  test: {
    include: ['src/**/*.test.ts']
  }
});
