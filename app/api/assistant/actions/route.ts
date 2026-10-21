import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { consommerLimite } from '@/lib/limites'
import { gardeAssistant } from '@/lib/assistant/garde'
import { actionsDeSession, versCarte } from '@/lib/assistant/actions-serveur'
import { journalEnBase } from '@/lib/assistant/executeurs'
import { magasinSupabase } from '@/lib/assistant/magasin'
import { annulerParRef } from '@/lib/pilote/serveur'
import { annulerAction, confirmerAction, refuserAction, type CodeRefus, type DependancesDecision } from '@/lib/assistant/confirmation'

export const runtime = 'nodejs'
export const maxDuration = 60

// Les décisions de l'artisan sur les cartes de l'assistant (plans/016-assistant.md, jalon A3).
//
// POST { id, decision: 'confirmer' | 'refuser' | 'annuler' }
//   confirmer : exécute l'action à confirmer (envoi, facture, encaissement, suppression, lot de prix), UNE seule fois ;
//   refuser   : écarte la carte, rien n'est fait ;
//   annuler   : défait une action exécutée quand elle a gardé de quoi se défaire (brouillon, tarif, stock, tâche, statut…).
// C'est le SEUL chemin qui exécute une action « à confirmer » : le modèle n'y accède pas (lib/assistant/confirmation.ts).
// Mêmes contrôles que POST /api/assistant : drapeau, session (révocation, suspension, double authentification), essai, offre
// Signature (lib/assistant/acces.ts) — côté serveur, jamais seulement dans l'interface. L'action est cherchée AVEC le compte de
// la session : l'identifiant d'une carte d'un autre compte répond « introuvable ».

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUT: Record<CodeRefus, number> = { introuvable: 404, deja_traitee: 409, expiree: 410, mode: 400, non_annulable: 409, echec: 422, indisponible: 503 }
const LIMITE_DECISIONS = { max: 120, fenetreSec: 10 * 60 }

export async function POST(req: Request) {
  const g = await gardeAssistant(req)
  if ('reponse' in g) return g.reponse

  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id.trim().toLowerCase() : ''
  const decision = b?.decision
  if (!UUID.test(id) || !['confirmer', 'refuser', 'annuler'].includes(decision)) return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 })
  if (!(await consommerLimite(`assistant-decisions:${g.uid}`, LIMITE_DECISIONS.max, LIMITE_DECISIONS.fenetreSec))) {
    return NextResponse.json({ error: 'Beaucoup de clics en peu de temps : reprenez dans quelques minutes.', code: 'debit' }, { status: 429 })
  }

  const magasin = magasinSupabase()
  // Les réalisateurs sont les mêmes que ceux des outils : mêmes routes, même session. Le contexte « conversation » ne sert qu'à
  // fabriquer des cartes, ce que les réalisateurs ne font pas.
  const srv = actionsDeSession({
    uid: g.uid, jeton: g.jeton, origine: new URL(req.url).origin, isFounder: g.isFounder, crm: g.crm, meilleursClients: false,
    conversationId: crypto.randomUUID(), tour: () => 1, magasin,
  })
  const deps: DependancesDecision = {
    magasin, realisateurs: srv.realisateurs, inverses: srv.inverses,
    journaliser: (l) => journalEnBase({ uid: g.uid, conversationId: l.conversationId, tour: l.tour })({ nom: l.nom, entree: l.entree, resultat: l.resultat, resume: l.resume, objet: l.objet ?? null }),
  }
  const r = decision === 'confirmer' ? await confirmerAction(deps, g.uid, id) : decision === 'refuser' ? await refuserAction(deps, g.uid, id) : await annulerAction(deps, g.uid, id)
  // Pilote automatique (21/10) : une carte confirmée ou refusée à la main sort de la file (elle ne partira pas une seconde fois).
  if (r.ok && decision !== 'annuler') await annulerParRef(g.uid, 'carte', id, decision === 'confirmer' ? 'confirmée par l’artisan' : 'refusée par l’artisan').catch(() => {})
  if (!r.ok) {
    const fiche = await magasin.lire(g.uid, id).catch(() => null)
    return NextResponse.json({ ok: false, code: r.code, error: r.erreur, ...(r.statut ? { statut: r.statut } : {}), ...(fiche ? { carte: versCarte(fiche) } : {}) }, { status: STATUT[r.code] ?? 400 })
  }
  return NextResponse.json({ ok: true, statut: r.statut, resume: r.resume, carte: versCarte(r.fiche) }, { headers: { 'Cache-Control': 'no-store' } })
}
