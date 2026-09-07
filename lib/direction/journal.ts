import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp } from '@/lib/security'
import { lireUserAgent } from '@/lib/userAgent'
import type { Fondateur } from './garde'

// Le journal de direction (prompt v10 §1) : qui, quoi, quand, avant/après, IP — pour chaque action d'un
// fondateur. Règle : une écriture qui ne peut pas être journalisée N'A PAS LIEU (l'appelant répond 503 par
// `refusJournal()`), jamais « au mieux ». L'IP est gardée en clair côté serveur (preuve, comme ip_bans) ;
// `avant`/`apres` sont des objets minimaux : jamais un secret, jamais un contenu de prospect.
export type Action =
  | 'reconfirmation' | 'ban_ip' | 'deban_ip' | 'alerte_acquittee'
  | 'reglage_modifie' | 'role_modifie' | 'artisan_offre' | 'artisan_credits' | 'artisan_essai' | 'artisan_rembourse'
  | 'artisan_pause' | 'artisan_suspendu' | 'artisan_reactive' | 'artisan_email' | 'support_vu_comme'
  | 'apport_ajoute' | 'apport_modifie' | 'achat_ajoute' | 'obligation_modifiee' | 'reversement_modifie'
  | 'courrier_classe' | 'courrier_repondu' | 'artisan_portail' | 'cron_relance'
  // Le mode support (0074). `support_vu_comme` existait déjà : c'est la LECTURE elle-même.
  | 'support_ticket_ouvert' | 'support_ticket_ferme' | 'support_acces_demande'
  | 'support_acces_refuse' | 'support_acces_ouvert' | 'support_acces_ferme'

export type Entree = {
  acteur: Fondateur
  action: Action
  cible_type?: string
  cible_id?: string
  artisan_id?: string | null
  avant?: unknown
  apres?: unknown
  reconfirme?: boolean
}

const CLES_INTERDITES = /^(password|mot_de_passe|jeton|token|secret|cle|key|authorization|cookie|private_key)$/i
const TAILLE_MAX = 4000

/** Un état minimal, sûr à journaliser : clés sensibles retirées, taille bornée, jamais une chaîne brute géante. */
export function epurer(v: unknown, profondeur = 0): unknown {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.length > 500 ? v.slice(0, 500) + '…' : v
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return profondeur > 3 ? '[…]' : v.slice(0, 50).map((x) => epurer(x, profondeur + 1))
  if (typeof v === 'object') {
    if (profondeur > 3) return '{…}'
    const o: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!CLES_INTERDITES.test(k)) o[k] = epurer(x, profondeur + 1)
    return o
  }
  return String(v)
}

const borner = (v: unknown): unknown => {
  const e = epurer(v)
  if (e === null) return null
  const s = JSON.stringify(e)
  return s.length > TAILLE_MAX ? { tronque: true, apercu: s.slice(0, TAILLE_MAX) } : e
}

/** Écrit la ligne. Rend `false` si l'insertion échoue : l'appelant DOIT alors refuser l'action. */
export async function journaliser(e: Entree, req: Request): Promise<boolean> {
  const ua = lireUserAgent(req.headers.get('user-agent'))
  const { error } = await supabaseAdmin.from('journal_direction').insert({
    acteur_id: e.acteur.uid,
    acteur_email: e.acteur.email,
    action: e.action,
    cible_type: e.cible_type ?? null,
    cible_id: e.cible_id ?? null,
    artisan_id: e.artisan_id ?? null,
    avant: borner(e.avant),
    apres: borner(e.apres),
    ip: getIp(req),
    agent: `${ua.appareil} · ${ua.navigateur}`.slice(0, 120),
    reconfirme: e.reconfirme === true,
  })
  if (error) { console.error('[direction] journal : insertion impossible :', error.message); return false }
  return true
}

/** La réponse d'une écriture refusée faute de journal. */
export const refusJournal = () => NextResponse.json({ error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' }, { status: 503 })
