'use client'

import { relTime } from '@/lib/direction/fraicheur'

// « Stripe · il y a 2 min » — la ligne de source et de fraîcheur sous chaque chiffre (prompt v10 §1).
// Une panne se voit (« Stripe injoignable depuis 12:04 »), un manque se dit (« non mesuré (H2) »).
const NOMS: Record<string, string> = { stripe: 'Stripe', supabase: 'Base', resend: 'Resend', anthropic: 'Anthropic', vercel: 'Vercel', app: 'Site', estimation: 'Estimation' }

export type SourceInfo = { source: string; a: string; cache?: boolean; erreur?: string; manque?: string }

export default function Fraicheur({ s, maintenant }: { s: SourceInfo; maintenant: number }) {
  const nom = NOMS[s.source] ?? s.source
  if (s.erreur) return <span className="dir-src crit" title={s.erreur}>{nom} injoignable depuis {new Date(s.a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
  if (s.manque) return <span className="dir-src warn" title={s.manque}>{nom} · non mesuré ({s.manque.split(' ')[0].replace(':', '')})</span>
  return <span className="dir-src">{nom} · {relTime(s.a, maintenant)}</span>
}
