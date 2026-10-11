import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'

// « Une fonctionnalité non finie n'apparaît pas » : drapeau baissé, la route répond 404 côté serveur
// (avant, la page s'affichait avec « pas encore disponible » ; audit du 11/10).
export const metadata: Metadata = { title: 'Commander un pack pubs', robots: { index: false } }

export default function Layout({ children }: { children: ReactNode }) {
  if (!actif('packPub')) notFound()
  return children
}
