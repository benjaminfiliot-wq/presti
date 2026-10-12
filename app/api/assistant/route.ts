import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { messageVerrou, peut } from '@/lib/plans'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { consommerLimite } from '@/lib/limites'
import { signalerPanneIA } from '@/lib/alerteService'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { genParams } from '@/lib/ai'
import { routerModele } from '@/lib/ai/routage'
import { HISTORIQUE_CARACTERES_MAX, HISTORIQUE_MESSAGES_MAX, MESSAGE_MAX, PLAFOND_TOURS, cadrerDemande, systemeAssistant } from '@/lib/assistant/cadrage'
import { executerTour, type EchangePasse } from '@/lib/assistant/boucle'
import { clientDeSession, executeursDeSession, journalEnBase } from '@/lib/assistant/executeurs'
import { jourLisible } from '@/lib/assistant/donnees'
import { preparerTour } from '@/lib/assistant/tour'

export const runtime = 'nodejs'
export const maxDuration = 60

// L'assistant de gestion de la console (plans/016-assistant.md, jalons A1 lecture et A2 brouillons).
//
// POST { conversation_id, message, historique?, modele? } → un flux NDJSON :
//   { e: 'consulte', outil, libelle }   pendant le tour, à chaque outil appelé (« l'assistant consulte : stock… ») ;
//   { e: 'fin', texte, brouillons, consultes, tour, restants, palier }   à la fin ;
//   { e: 'erreur', message }   si le modèle ou le journal tombe (le crédit et le tour sont rendus : lib/assistant/tour.ts).
// Les refus d'avant le tour (drapeau, session, offre, plafond, crédit) sont des réponses JSON ordinaires.
//
// Ordre des contrôles, et pourquoi :
//  1. le drapeau (baissé : 404, la route n'existe pas) ;
//  2. la session (authArtisan : révocation, suspension, double authentification, code par e-mail) ;
//  3. l'offre, lue SOUS LA RLS avec le jeton de l'artisan : `assistant` (Signature, Business) ;
//  4. le débit de requêtes, puis le PLAFOND de tours de la conversation (fonction SQL atomique, 0150 ; sans elle : refus) ;
//  5. le crédit du tour au tarif du palier (consumeCredit), rendu si le modèle échoue.
// Aucun outil ne touche la base avec la clé de service pour lire : voir lib/assistant/executeurs.ts.

const client = new Anthropic()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE_REQUETES = { max: 30, fenetreSec: 10 * 60 }

/** L'historique renvoyé par l'écran : forme stricte, derniers échanges seulement, borné en taille. */
function lireHistorique(brut: unknown): EchangePasse[] {
  if (!Array.isArray(brut)) return []
  const propres = brut
    .filter((e): e is { role: string; texte: string } => !!e && typeof e === 'object' && typeof (e as { texte?: unknown }).texte === 'string')
    .filter((e) => e.role === 'artisan' || e.role === 'assistant')
    .map((e) => ({ role: e.role as EchangePasse['role'], texte: e.texte.trim().slice(0, 4000) }))
    .filter((e) => e.texte)
    .slice(-HISTORIQUE_MESSAGES_MAX)
  const gardes: EchangePasse[] = []
  let reste = HISTORIQUE_CARACTERES_MAX
  for (const e of propres.reverse()) {
    if (e.texte.length > reste) break
    reste -= e.texte.length
    gardes.unshift(e)
  }
  return gardes
}

async function rendreTour(uid: string, conversationId: string) {
  const { error } = await supabaseAdmin.rpc('assistant_rendre_tour', { p_artisan: uid, p_conversation: conversationId })
  if (error) console.error('[assistant] rendre le tour :', error.message)
}

export async function POST(req: Request) {
  if (!actif('assistant')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const uid = s.uid
  const jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''

  // Le profil se lit comme l'écran le lit : sous la RLS, avec le jeton de l'artisan.
  const { data: art } = await clientDeSession(jeton).from('artisans').select('nom, metier, plan, is_founder').eq('id', uid).maybeSingle()
  if (!art) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  const isFounder = !!art.is_founder
  if (!isFounder && !peut(art.plan as string | null, 'assistant')) {
    return NextResponse.json({ error: `L’assistant n’est pas dans votre offre. ${messageVerrou('assistant')}`, code: 'offre' }, { status: 403 })
  }

  const b = await req.json().catch(() => null)
  const conversationId = typeof b?.conversation_id === 'string' && UUID.test(b.conversation_id) ? b.conversation_id.toLowerCase() : ''
  const message = typeof b?.message === 'string' ? b.message.trim() : ''
  if (!conversationId) return NextResponse.json({ error: 'Conversation manquante.' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
  if (message.length > MESSAGE_MAX) return NextResponse.json({ error: `Message trop long (${MESSAGE_MAX} caractères au plus).` }, { status: 400 })
  const historique = lireHistorique(b?.historique)

  if (!(await consommerLimite(`assistant:${uid}`, LIMITE_REQUETES.max, LIMITE_REQUETES.fenetreSec))) {
    return NextResponse.json({ error: 'Beaucoup de messages en peu de temps : reprenez dans quelques minutes.', code: 'debit' }, { status: 429 })
  }

  // Le palier, choisi comme partout (lib/ai/routage.ts) : Standard par défaut, Pro ou Expert sur demande, borné par l'offre.
  const routage = routerModele({ plan: art.plan as string | null, demande: typeof b?.modele === 'string' ? b.modele : null })
  const maintenant = new Date()
  const jour = jourLisible(maintenant)
  const dernierAssistant = [...historique].reverse().find((e) => e.role === 'assistant')?.texte ?? null
  const cadrage = cadrerDemande(message, dernierAssistant)
  const systeme = systemeAssistant({ nom: art.nom as string | null, metier: art.metier as string | null, jour }, cadrage)
  const executeurs = executeursDeSession({ uid, jeton, origine: new URL(req.url).origin, isFounder })

  // Plafond (atomique en base, fail-closed : sans la migration 0150, aucun tour ne part), puis crédit, puis le tour.
  let tourPris = 0
  const prep = await preparerTour({
    palier: routage.tier,
    prendreTour: async () => {
      const { data, error } = await supabaseAdmin.rpc('assistant_prendre_tour', { p_artisan: uid, p_conversation: conversationId, p_max: PLAFOND_TOURS })
      if (error) { console.error('[assistant] prendre un tour :', error.message); return null }
      return data
    },
    rendreTour: () => rendreTour(uid, conversationId),
    consommerCredit: () => consumeCredit(uid, routage.tier, isFounder),
    rendreCredit: () => rendreCredit(uid, routage.tier, isFounder),
    signalerPanne: async (e) => { console.error('[assistant] tour :', e instanceof Error ? e.message : e); await signalerPanneIA('assistant de gestion (/api/assistant)', e) },
    executer: (onOutil) => executerTour({
      client,
      parametres: genParams(routage.model, 1500),
      systeme,
      historique,
      message,
      executeurs,
      brouillonsAutorises: cadrage.brouillon,
      journaliser: journalEnBase({ uid, conversationId, tour: tourPris }),
      onOutil,
      sourcesFixes: [jour, maintenant.toISOString().slice(0, 10)],
      signal: req.signal,
    }),
  })
  if (!prep.ok) return NextResponse.json(prep.corps, { status: prep.status })
  tourPris = prep.tour

  const encodeur = new TextEncoder()
  const flux = new ReadableStream<Uint8Array>({
    async start(controller) {
      const envoyer = (o: unknown) => { try { controller.enqueue(encodeur.encode(JSON.stringify(o) + '\n')) } catch { /* client parti */ } }
      try { await prep.jouer(envoyer) } finally { try { controller.close() } catch { /* déjà fermé */ } }
    },
  })
  return new Response(flux, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
}
