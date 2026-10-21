import crypto from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { signalerPanneIA } from '@/lib/alerteService'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { genParams } from '@/lib/ai'
import { routerModele } from '@/lib/ai/routage'
import { MESSAGE_MAX, PLAFOND_TOURS, cadrerDemande, systemeAssistant } from '@/lib/assistant/cadrage'
import { executerTour } from '@/lib/assistant/boucle'
import { clientDeSession, executeursDeSession, journalEnBase } from '@/lib/assistant/executeurs'
import { gardeAssistant } from '@/lib/assistant/garde'
import { actionsDeSession } from '@/lib/assistant/actions-serveur'
import { actionsDisponibles, magasinSupabase } from '@/lib/assistant/magasin'
import { jourLisible } from '@/lib/assistant/donnees'
import { cleHistorique, lireHistorique, signerReponse } from '@/lib/assistant/historique'
import { preparerTour } from '@/lib/assistant/tour'
import { texteContexte } from '@/lib/crm/assistantCrm'
import { resoudreContexte } from '@/lib/crm/contexteAssistantServeur'

export const runtime = 'nodejs'
export const maxDuration = 60

// L'assistant de gestion de la console (plans/016-assistant.md, jalons A1 lecture et A2 brouillons ; outils CRM le 13/10).
//
// POST { conversation_id?, message, historique?, modele?, contexte? } → un flux NDJSON :
//   { e: 'conversation', id, contexte }   d'abord : l'identifiant de la conversation, GÉNÉRÉ ICI pour une nouvelle, et le contexte
//                               RETENU (ou null) ;
//   { e: 'consulte', outil, libelle }   pendant le tour, à chaque outil appelé (« l'assistant consulte : stock… ») ;
//   { e: 'fin', texte, signature, brouillons, consultes, tour, restants, palier, conversation_id }   à la fin ;
//   { e: 'erreur', message }   si le modèle ou le journal tombe (le crédit et le tour sont rendus : lib/assistant/tour.ts).
// Les refus d'avant le tour (drapeau, session, offre, conversation, plafond, crédit) sont des réponses JSON ordinaires.
//
// Ordre des contrôles, et pourquoi :
//  1. le drapeau (baissé : 404, la route n'existe pas) ;
//  2. la session (authArtisan : révocation, suspension, double authentification, code par e-mail) ;
//  3. l'offre, lue SOUS LA RLS avec le jeton de l'artisan : `assistant` (Signature, Business) ;
//  4. la conversation (audit d'attaque du 12/10, B2) : absente → un identifiant neuf, tiré ICI (crypto.randomUUID) ;
//     fournie → elle doit déjà exister ET être à lui (lue sous la RLS). L'écran ne choisit plus d'identifiant : plus de
//     squat d'un identifiant prévisible, plus de conversation « créée » par un identifiant inventé ;
//  5. le débit de requêtes, puis le PLAFOND de tours de la conversation (fonction SQL atomique, 0150 ; sans elle : refus) ;
//  6. le crédit du tour au tarif du palier (consumeCredit), rendu si le modèle échoue.
// L'historique renvoyé par l'écran n'est cru que pour les réponses de l'assistant SIGNÉES par ce serveur (B3,
// lib/assistant/historique.ts). Aucun outil ne touche la base avec la clé de service pour lire : lib/assistant/executeurs.ts.

const client = new Anthropic()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE_REQUETES = { max: 30, fenetreSec: 10 * 60 }
// Audit d'attaque du 12/10 : le plafond de 20 tours est PAR conversation, il ne borne aucun coût à lui seul ; celui-ci
// borne la journée du compte (une nouvelle conversation par message ne contourne donc rien).
const LIMITE_JOUR = { max: 200, fenetreSec: 24 * 3600 }

async function rendreTour(uid: string, conversationId: string) {
  const { error } = await supabaseAdmin.rpc('assistant_rendre_tour', { p_artisan: uid, p_conversation: conversationId })
  if (error) console.error('[assistant] rendre le tour :', error.message)
}

export async function POST(req: Request) {
  // 1-3. Drapeau, session, essai, offre : la décision pure de lib/assistant/acces.ts (404 / 401 / 403), côté SERVEUR.
  const g = await gardeAssistant(req)
  if ('reponse' in g) return g.reponse
  const { uid, jeton, isFounder } = g
  const art = { nom: g.nom, metier: g.metier, plan: g.plan }

  const b = await req.json().catch(() => null)
  const message = typeof b?.message === 'string' ? b.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
  if (message.length > MESSAGE_MAX) return NextResponse.json({ error: `Message trop long (${MESSAGE_MAX} caractères au plus).` }, { status: 400 })

  // B2 — l'identifiant de conversation vient du serveur. Fourni par l'écran : il doit exister et être au compte (RLS).
  const fourni = b?.conversation_id
  let conversationId: string
  let nouvelle = false
  if (fourni === undefined || fourni === null || fourni === '') {
    conversationId = crypto.randomUUID()
    nouvelle = true
  } else {
    if (typeof fourni !== 'string' || !UUID.test(fourni)) return NextResponse.json({ error: 'Conversation introuvable : ouvrez une nouvelle conversation.', code: 'conversation' }, { status: 404 })
    const { data: conv, error: eConv } = await clientDeSession(jeton).from('assistant_conversations').select('id').eq('id', fourni.toLowerCase()).eq('artisan_id', uid).maybeSingle()
    if (eConv) { console.error('[assistant] conversation :', eConv.message); return NextResponse.json({ error: 'L’assistant est indisponible pour l’instant.', code: 'indisponible' }, { status: 503 }) }
    if (!conv) return NextResponse.json({ error: 'Conversation introuvable : ouvrez une nouvelle conversation.', code: 'conversation' }, { status: 404 })
    conversationId = fourni.toLowerCase()
  }
  // B3 — l'historique : les réponses de l'assistant ne sont gardées que signées par ce serveur, pour CETTE conversation.
  const cle = cleHistorique()
  const { historique, ecartees } = lireHistorique(b?.historique, { cle, uid, conversationId: nouvelle ? null : conversationId })
  if (ecartees) console.warn(`[assistant] ${ecartees} réponse(s) d’historique sans signature valide écartée(s)`)

  if (!(await consommerLimiteStricte(`assistant:${uid}`, LIMITE_REQUETES.max, LIMITE_REQUETES.fenetreSec))) {
    return NextResponse.json({ error: 'Beaucoup de messages en peu de temps : reprenez dans quelques minutes.', code: 'debit' }, { status: 429 })
  }
  if (!(await consommerLimiteStricte(`assistant-jour:${uid}`, LIMITE_JOUR.max, LIMITE_JOUR.fenetreSec))) {
    return NextResponse.json({ error: 'Limite de messages atteinte pour aujourd’hui : l’assistant revient demain.', code: 'debit' }, { status: 429 })
  }

  // 21/10 — le CONTEXTE de l'assistant ouvert depuis le CRM (« ce chantier », « cette commande ») : { type, id } seulement. L'objet est
  // RELU sous la RLS et filtré par le compte (lib/crm/contexteAssistantServeur.ts) ; introuvable ou d'un autre compte → aucun contexte,
  // sans erreur. Seul son libellé, lu en base, est donné au modèle (une phrase neutre) : aucun identifiant. Il va dans la CONSIGNE et non
  // dans le message : le message de l'artisan est la source des nombres permis (lib/assistant/boucle.ts, anti-fabrication) — un numéro
  // de devis ou une date du libellé ne doit jamais devenir un prix « donné par l'artisan ».
  const contexte = b?.contexte !== undefined && b?.contexte !== null ? await resoudreContexte(clientDeSession(jeton), uid, b.contexte) : null

  // Le palier, choisi comme partout (lib/ai/routage.ts) : Standard par défaut, Pro ou Expert sur demande, borné par l'offre.
  // Un agent qui AGIT : Pro par défaut (1 crédit, comme Standard), Expert (3 crédits) sur demande de l'artisan.
  const routage = routerModele({ plan: art.plan, demande: typeof b?.modele === 'string' ? b.modele : 'pro' })
  const maintenant = new Date()
  const jour = jourLisible(maintenant)
  const dernierAssistant = [...historique].reverse().find((e) => e.role === 'assistant')?.texte ?? null
  const cadrage = cadrerDemande(message, dernierAssistant)
  // Le CRM : la décision même des routes /api/crm/* (lib/crm/acces.ts : drapeau ou essai du compte, puis capacité `crm`).
  const crm = g.crm
  // Les actions n'existent que si leur table (journal et cartes, migration 0157) est là : sans elle, l'assistant lit et prépare des
  // brouillons comme avant. Fail-closed : jamais d'action sans carte ni journal.
  const actionsOk = await actionsDisponibles()
  let tourPris = 0
  const systeme = systemeAssistant({ nom: art.nom, metier: art.metier, jour, crm, actions: actionsOk }, cadrage)
    + (contexte ? `\n\nCONTEXTE DE L'ÉCRAN : l'artisan t'écrit depuis le CRM, ${texteContexte(contexte)}. « Ce chantier », « ce devis », « cette commande »… désignent cet objet : retrouve-le avec tes outils de lecture, par son nom. Ce contexte n'est ni une demande ni une source de chiffres.` : '')
  const ctxSession = { uid, jeton, origine: new URL(req.url).origin, isFounder, crm, meilleursClients: cadrage.meilleursClients }
  const actionsSrv = actionsOk ? actionsDeSession({ ...ctxSession, conversationId, tour: () => tourPris, magasin: magasinSupabase() }) : undefined
  const executeurs = executeursDeSession(ctxSession, actionsSrv)

  // Plafond (atomique en base, fail-closed : sans la migration 0150, aucun tour ne part), puis crédit, puis le tour.
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
      crm,
      // Les outils d'écriture n'existent que si l'artisan demande une action dans CE message (et si la table des actions est là).
      actions: actionsOk && cadrage.actionDemandee,
      journaliser: journalEnBase({ uid, conversationId, tour: tourPris }),
      onOutil,
      sourcesFixes: [jour, maintenant.toISOString().slice(0, 10)],
      signal: req.signal,
    }),
  })
  // Un refus d'avant le tour garde l'identifiant (déjà créé en base pour une nouvelle conversation) : l'écran le réutilise.
  if (!prep.ok) return NextResponse.json({ ...prep.corps, ...(prep.corps.code === 'credit' ? { conversation_id: conversationId } : {}) }, { status: prep.status })
  tourPris = prep.tour

  const encodeur = new TextEncoder()
  const flux = new ReadableStream<Uint8Array>({
    async start(controller) {
      const envoyer = (o: unknown) => { try { controller.enqueue(encodeur.encode(JSON.stringify(o) + '\n')) } catch { /* client parti */ } }
      try {
        envoyer({ e: 'conversation', id: conversationId, contexte: contexte ? { type: contexte.type, libelle: contexte.libelle } : null })
        // La réponse part signée (B3) : renvoyée dans l'historique du tour suivant, elle seule sera crue.
        await prep.jouer((ev) => envoyer(ev.e === 'fin' ? { ...ev, conversation_id: conversationId, signature: signerReponse(cle, { uid, conversationId, texte: ev.texte }) } : ev))
      } finally { try { controller.close() } catch { /* déjà fermé */ } }
    },
  })
  return new Response(flux, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
}
