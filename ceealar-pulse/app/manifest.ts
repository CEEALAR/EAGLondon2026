import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CEEALAR Pulse',
    short_name: 'Pulse',
    description: 'CEEALAR conference relationship tool for EAG London 2026',
    start_url: '/attendees',
    display: 'standalone',
    background_color: '#FAF7F0',
    theme_color: '#0F766E',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
