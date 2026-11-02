// Banc de développement du moteur de pixels (033-008) : http://localhost:3100/landing/pixels/banc (jamais 127.0.0.1).
// Répond 404 hors développement : rien de ce banc n'existe en production.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Banc from './Banc'

export const metadata: Metadata = { title: 'Banc des pixels', robots: { index: false, follow: false } }

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <Banc />
}
