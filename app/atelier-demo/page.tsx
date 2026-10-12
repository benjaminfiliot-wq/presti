import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Demo from './Demo'

// Page de DÉMONSTRATION interne de l'atelier 3D (captures, mesures de performance) : données FICTIVES, injectées côté
// client seulement, aucune lecture ni écriture. Elle n'existe que si le serveur est lancé avec PRESTI_DEMO_ATELIER=1
// (jamais posé en production) : sinon 404, comme une page qui n'existe pas.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Atelier — démonstration interne', robots: { index: false, follow: false } }

export default function Page() {
  if (process.env.PRESTI_DEMO_ATELIER !== '1') notFound()
  return <Demo />
}
