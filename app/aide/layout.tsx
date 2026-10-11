import type { ReactNode } from 'react'
import type { Metadata } from 'next'

// Le centre d'aide de l'espace artisan : un titre propre et pas d'indexation (audit du 11/10).
export const metadata: Metadata = { title: 'Centre d’aide', alternates: { canonical: '/aide' }, robots: { index: false } }

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
