import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ladestation Tracker',
  description: 'Interne Verwaltung defekter Ladestationen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
