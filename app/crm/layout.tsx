import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import './crm.css'

// « Une fonctionnalité non finie n'apparaît pas » : drapeau `crm` baissé, /crm et tout ce qui est dessous répondent 404
// côté serveur — la page n'est pas rendue, rien dans le DOM ne trahit son existence.
export const metadata: Metadata = { title: 'CRM atelier', robots: { index: false, follow: false } }

export default function Layout({ children }: { children: ReactNode }) {
  if (!actif('crm')) notFound()
  return children
}
