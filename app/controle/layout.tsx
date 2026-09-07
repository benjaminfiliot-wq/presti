import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'

// /direction — le Poste de contrôle (prompt v10). Ce layout est SERVEUR : drapeau baissé → 404, l'espace
// n'existe pas. L'identité, elle, ne peut pas être vérifiée ici (le jeton vit dans localStorage — dette cookie,
// plans/apres-demo.md) : la page est cliente, redirige sans session, et TOUTES les données passent par
// app/api/controle/** derrière lib/direction/garde.ts. Le HTML servi ici est une coquille vide, prouvé par
// scripts/direction-e2e.mjs.
export const metadata: Metadata = {
  title: 'Direction',
  description: 'Le poste de direction de Presti.',
  alternates: { canonical: '/controle' },
  robots: { index: false, follow: false },
}

export default function DirectionLayout({ children }: { children: ReactNode }) {
  if (!actif('direction')) notFound()
  return <>{children}</>
}
