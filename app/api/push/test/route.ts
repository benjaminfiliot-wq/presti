import { NextResponse } from 'next/server'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { consommerLimite } from '@/lib/limites'
import { actif } from '@/lib/flags'
import { envoyerPushArtisan } from '@/lib/push'

// « M'envoyer un test » (prompt v9 §3.4) : une notification neutre vers tous les appareils abonnés
// de l'artisan — la preuve, sur le téléphone, que ça marche. 5 par compte et par heure.
// La réponse dit ce qui s'est passé (envoyés, oubliés, désactivés) : rien n'est promis à l'aveugle.

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, ...(s.code ? { code: s.code } : {}) }, { status: s.status })
  if (!actif('pushWeb')) return NextResponse.json({ error: 'Les notifications push ne sont pas encore disponibles.' }, { status: 503 })
  if (!(await consommerLimite(`push:test:${s.uid}`, 5, 3600))) return NextResponse.json({ error: 'Trop de tests. Patientez une heure.' }, { status: 429 })

  const r = await envoyerPushArtisan(s.uid, {
    titre: 'Presti',
    ligne: 'Les notifications fonctionnent sur cet appareil.',
    url: '/parametres?onglet=notifications',
    tag: 'test',
  })
  if (r.raison === 'aucun_appareil') return NextResponse.json({ ok: false, ...r, error: 'Aucun appareil abonné : activez d’abord les notifications sur cet appareil.' }, { status: 409 })
  if (r.raison === 'plafond') return NextResponse.json({ ok: false, ...r, error: 'Plafond horaire de notifications atteint.' }, { status: 429 })
  if (r.raison) return NextResponse.json({ ok: false, ...r, error: 'Envoi impossible pour le moment.' }, { status: 503 })
  return NextResponse.json({ ok: true, ...r })
}
