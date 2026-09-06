import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// La re-confirmation d'une écriture (prompt v10 §1) : toute action qui touche à l'argent, aux accès ou aux
// données d'un artisan exige que le fondateur redonne son mot de passe — vérifié côté serveur — et reçoit
// en échange un jeton court : 5 minutes, usage unique, une portée. Le jeton voyage dans l'en-tête
// `x-presti-reconfirmation` et n'est jamais stocké : seulement son empreinte (motif 0063).
//
// La biométrie de la coque ne prouve rien au serveur (app/VerrouNatif.tsx) : elle ne remplace pas ce jeton.
export type Portee = 'securite' | 'argent' | 'artisan' | 'reglages'
export const PORTEES: Portee[] = ['securite', 'argent', 'artisan', 'reglages']
export const DUREE_S = 300
export const EN_TETE = 'x-presti-reconfirmation'

const empreinte = (jeton: string) => crypto.createHash('sha256').update(jeton).digest('hex')

/** Émet un jeton pour ce fondateur et cette portée. Le mot de passe a DÉJÀ été vérifié par l'appelant. */
export async function emettre(uid: string, portee: Portee): Promise<{ jeton: string; expire_le: string } | null> {
  const jeton = crypto.randomBytes(32).toString('base64url')
  const expire_le = new Date(Date.now() + DUREE_S * 1000).toISOString()
  const { error } = await supabaseAdmin.from('reconfirmations').insert({ jeton_hash: empreinte(jeton), user_id: uid, portee, expire_le })
  if (error) { console.error('[direction] reconfirmation : insertion impossible :', error.message); return null }
  return { jeton, expire_le }
}

export type Verdict = 'ok' | 'absent' | 'rejoue' | 'expire' | 'portee' | 'indisponible'

/** Consomme le jeton (une seule instruction SQL : rejeu détecté, expiration et portée vérifiées). */
export async function consommer(uid: string, jeton: string, portee: Portee): Promise<Verdict> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(jeton)) return 'absent'
  const { data, error } = await supabaseAdmin.rpc('consommer_reconfirmation', { p_user: uid, p_hash: empreinte(jeton), p_portee: portee })
  if (error) { console.error('[direction] consommer_reconfirmation :', error.message); return 'indisponible' }
  return (['ok', 'absent', 'rejoue', 'expire', 'portee'] as Verdict[]).includes(data as Verdict) ? (data as Verdict) : 'indisponible'
}

const MESSAGES: Record<Exclude<Verdict, 'ok'>, string> = {
  absent: 'Confirmez cette action avec votre mot de passe.',
  rejoue: 'Cette confirmation a déjà servi : confirmez à nouveau.',
  expire: 'Confirmation expirée (5 minutes) : confirmez à nouveau.',
  portee: 'Cette confirmation ne couvre pas cette action : confirmez à nouveau.',
  indisponible: 'Confirmation impossible pour l’instant.',
}

/**
 * À appeler dans une route d'ÉCRITURE, après `estDirection`. Rend `null` si le jeton est bon (et consommé),
 * sinon la réponse à renvoyer telle quelle : 403 `reconfirmation_requise` (absent), 403 `rejoue|expire|portee`, 503.
 */
export async function exigerReconfirmation(req: Request, uid: string, portee: Portee): Promise<NextResponse | null> {
  const jeton = (req.headers.get(EN_TETE) || '').trim()
  const v = jeton ? await consommer(uid, jeton, portee) : 'absent'
  if (v === 'ok') return null
  const code = v === 'absent' ? 'reconfirmation_requise' : v
  return NextResponse.json({ error: MESSAGES[v], code, portee }, { status: v === 'indisponible' ? 503 : 403 })
}
