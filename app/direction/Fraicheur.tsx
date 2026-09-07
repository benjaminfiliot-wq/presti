'use client'

import { relTime } from '@/lib/direction/fraicheur'

// « Stripe · il y a 2 min » — la ligne de source et de fraîcheur sous chaque chiffre (prompt v10 §1).
// Une panne se voit, une estimation se dit, un manque s'explique en français (revue du 07/09 : « non mesuré (H2) »
// citait un numéro de ligne du plan, et « injoignable depuis 12:06 » donnait l'heure du DERNIER essai, pas celle
// du début de la panne).
const NOMS: Record<string, string> = { stripe: 'Stripe', supabase: 'Base', resend: 'Resend', anthropic: 'Anthropic', vercel: 'Vercel', app: 'Site', estimation: 'Estimation' }

export type SourceInfo = { source: string; a: string; cache?: boolean; erreur?: string; manque?: string }

/** « H2 : clé Anthropic Admin absente — estimation… » → « clé Anthropic Admin absente ». */
const raison = (m: string) => m.replace(/^H\d+\s*:\s*/, '').split(' — ')[0].trim()

export default function Fraicheur({ s, maintenant }: { s: SourceInfo; maintenant: number }) {
  const nom = NOMS[s.source] ?? s.source
  if (s.erreur) return <span className="dir-src crit" title={s.erreur}>{nom} injoignable (dernier essai {new Date(s.a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})</span>
  if (s.source === 'estimation') return <span className="dir-src warn" title={s.manque ?? 'Estimation, pas une facture'}>Estimation · {relTime(s.a, maintenant)}</span>
  if (s.manque) return <span className="dir-src warn" title={s.manque}>{nom} · non mesuré : {raison(s.manque)}</span>
  return <span className="dir-src">{nom} · {relTime(s.a, maintenant)}</span>
}
