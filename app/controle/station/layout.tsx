import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Pixelify_Sans } from 'next/font/google'
import { actif } from '@/lib/flags'
import './station.css'

// /controle/station — la station Mission Control (fiche 026-111). Ce layout est SERVEUR : drapeau `pilotage` baissé →
// 404, la station n'existe pas. Le HTML servi ici est une coquille vide : l'identité, la version et les chiffres ne
// viennent qu'après la session, par les routes de /api/controle (derrière la garde des fondateurs).
export const metadata: Metadata = {
  title: 'Station',
  description: 'La station de contrôle de l’équipage.',
  robots: { index: false, follow: false },
}

// La police pixel (OFL) : chargée par next/font, donc servie depuis notre propre domaine (aucune adresse externe,
// la CSP reste inchangée). Elle ne sert qu'au calque de la carte et aux plaques ; le reste garde les polices de Presti.
const police = Pixelify_Sans({ subsets: ['latin', 'latin-ext'], variable: '--mc-police-pixel', display: 'swap' })

export default function StationLayout({ children }: { children: ReactNode }) {
  if (!actif('pilotage')) notFound()
  return <div className={police.variable} style={{ display: 'contents' }}>{children}</div>
}
