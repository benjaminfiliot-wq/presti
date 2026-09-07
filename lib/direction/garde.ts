import { NextResponse } from 'next/server'
import { authArtisan, estEchec, type EchecAuth } from '@/lib/authArtisan'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { getIp, isBanned } from '@/lib/security'
import { actif } from '@/lib/flags'

// La garde du Centre de direction (prompt v10 §1, §3) — UNE fois, pour toutes les routes app/api/controle/**.
//
// Avant : six routes api/control/* recopiaient « jeton → utilisateur → is_founder → 403 » (carte 2.1). Ici :
//   1. drapeau `direction` levé (sinon 404 : l'espace n'existe pas) ;
//   2. IP non bannie ;
//   3. `authArtisan(req)` : jeton valide, session non révoquée, second facteur PASSÉ (TOTP ou code email) —
//      rien à réimplémenter, c'est la même règle que pour tout artisan ;
//   4. `is_founder` (colonne gelée par le trigger 0055 : un jeton navigateur ne peut pas se l'attribuer) ;
//   5. plafond par fondateur (120 appels / min : un outil de travail, pas une API publique) ;
//   6. rôle (`direction_roles`) : `direction` = lecture + écriture, `lecture` = Alexandre (art. 7 du contrat).
//
// FAIL-CLOSED, et c'est voulu : une table absente (0065 pas collée), une erreur Supabase, un doute → refus
// (503 ou 403), jamais « au mieux ». Les briques appelées (`consommerLimite`, `isBanned`) sont fail-open par
// choix documenté chez elles ; on ne les « corrige » pas ici — la décision est la leur.
export type Role = 'direction' | 'lecture'
export type Fondateur = { uid: string; email: string | null; role: Role; iat: number; ip: string }
export type Refus = { error: string; status: 401 | 403 | 404 | 429 | 503; code?: EchecAuth['code'] | 'lecture_seule' | 'plafond' | 'indisponible' | 'banni' }

const ERREUR_FONDATEUR = 'Réservé aux fondateurs.'

/** Le fondateur qui appelle, ou un refus explicite. Lecture ET écriture passent par ici. */
export async function estFondateur(req: Request): Promise<Fondateur | Refus> {
  if (!actif('direction')) return { error: 'Introuvable.', status: 404 }
  const ip = getIp(req)
  const banni = await isBanned(ip)
  const s = await authArtisan(req)
  if (estEchec(s)) return { error: s.error, status: s.status, code: s.code }
  const { data: art, error } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', s.uid).maybeSingle()
  if (error) return { error: 'Direction indisponible pour l’instant.', status: 503, code: 'indisponible' }
  // Un fondateur qui a passé le second facteur n'est PAS refoulé par un ban d'adresse : sinon un ban posé sur sa
  // propre adresse fermait la direction pour toujours, le débannissement compris (revue du 07/09). Le ban garde
  // tout son effet sur le reste du site et sur quiconque n'est pas fondateur.
  if (!art?.is_founder) return banni ? { error: 'Accès refusé.', status: 403, code: 'banni' } : { error: ERREUR_FONDATEUR, status: 403 }
  if (!(await consommerLimite(`direction:${s.uid}`, 120, 60))) return { error: 'Trop d’appels. Patientez une minute.', status: 429, code: 'plafond' }
  const { data: r, error: eRole } = await supabaseAdmin.from('direction_roles').select('role').eq('user_id', s.uid).maybeSingle()
  // Table absente (migration 0065 pas collée) ou erreur : on ne devine pas un rôle — l'espace est fermé.
  if (eRole) return { error: 'Direction indisponible : migration 0065 absente ou base injoignable.', status: 503, code: 'indisponible' }
  const role: Role = r?.role === 'lecture' ? 'lecture' : 'direction'
  return { uid: s.uid, email: s.email, role, iat: s.iat, ip }
}

/** Comme `estFondateur`, mais refuse le rôle `lecture` : pour toute écriture. */
export async function estDirection(req: Request): Promise<Fondateur | Refus> {
  const f = await estFondateur(req)
  if (estRefus(f)) return f
  if (f.role !== 'direction') return { error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' }
  return f
}

export const estRefus = (r: Fondateur | Refus): r is Refus => 'error' in r

/** La réponse JSON d'un refus — même forme partout : `{ error, code }`. */
export const reponseRefus = (r: Refus) => NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
