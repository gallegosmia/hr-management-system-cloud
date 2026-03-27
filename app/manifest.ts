import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Melann HR Kiosk',
    short_name: 'HR Kiosk',
    description: 'Attendance QR Scanner Kiosk',
    start_url: '/kiosk',
    display: 'standalone',
    background_color: '#064e3b',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ],
  }
}
