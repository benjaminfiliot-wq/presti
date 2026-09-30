// POST /api/agents/telegram/entree — les commandes de Benj venues de son téléphone (fiche 026-195).
// Derrière le drapeau busAgents (404 avant toute identité) et le jeton de l'agent pont_telegram seul.
// Corps { commande, motif?, texte? }, la commande dans la liste FERMÉE de lib/agents/telegram.ts :
//   pause     pose la pause générale (station_pause_par_agent) ; le pont ne la lève JAMAIS, la reprise est un geste de Benj à la station ;
//   etat      { pause, rouge, orange, appels, en_panne }, des nombres, rien d'autre ;
//   consigne  une consigne de 3 à 200 signes pour le Chef (station_consigne_par_agent, même quota que la station).
// Une erreur de la base rend 503 avec son code `ops:…`, jamais 500.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { COULEUR_DE } from '@/lib/pilotage/attention'
import { CONSIGNE_MAX, CONSIGNE_MIN, codeErreurBase, estCommande, motifPause } from '@/lib/agents/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGENT = 'pont_telegram'
const DELAI_MS = 8_000
const SILENCE_MS = 2 * 3_600_000 // un agent muet depuis plus de 2 h est « en panne » (même seuil que l'alerte panne_agent)
const SANS_CACHE = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: SANS_CACHE })
const erreurBase = (e: { message?: unknown } | null | undefined) => { const code = codeErreurBase(e); console.error('[telegram/entree] base :', code); return erreur(503, code) }

type Source = { cle: string; nombre: number }
type AgentEtat = { battement_le?: string | null; en_pause?: boolean }

async function etat() {
  const [pause, sources, ops] = await Promise.all([
    pauseGenerale(),
    supabaseAdmin.rpc('pilotage_attention_sources').abortSignal(AbortSignal.timeout(DELAI_MS)),
    supabaseAdmin.rpc('ops_etat').abortSignal(AbortSignal.timeout(DELAI_MS)),
  ])
  if (sources.error) return { echec: sources.error }
  if (ops.error) return { echec: ops.error }
  const total = (couleur: string) => ((sources.data ?? []) as Source[]).filter((s) => COULEUR_DE[s.cle] === couleur).reduce((n, s) => n + (Number(s.nombre) || 0), 0)
  const appels = ((sources.data ?? []) as Source[]).filter((s) => s.cle === 'appel').reduce((n, s) => n + (Number(s.nombre) || 0), 0)
  const agents = ((ops.data as { agents?: AgentEtat[] } | null)?.agents ?? [])
  const maintenant = Date.now()
  const en_panne = agents.filter((a) => {
    if (a.en_pause) return false
    const t = a.battement_le ? Date.parse(a.battement_le) : NaN
    return !Number.isFinite(t) || maintenant - t > SILENCE_MS
  }).length
  return { reponse: { pause: pause.active === true, rouge: total('rouge'), orange: total('orange'), appels, en_panne } }
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')

  let corps: Record<string, unknown>
  try {
    const brut = await req.text()
    if (brut.length > 4 * 1024) return erreur(400, 'corps_trop_grand')
    corps = JSON.parse(brut)
  } catch { return erreur(400, 'json_invalide') }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps) || !estCommande(corps.commande)) return erreur(400, 'commande_invalide')

  try {
    if (corps.commande === 'pause') {
      const r = await supabaseAdmin.rpc('station_pause_par_agent', { p_agent: AGENT, p_motif: motifPause(corps.motif) }).abortSignal(AbortSignal.timeout(DELAI_MS))
      if (r.error) return erreurBase(r.error)
      return NextResponse.json({ ok: true, pause: true }, { headers: SANS_CACHE })
    }
    if (corps.commande === 'consigne') {
      const texte = corps.texte
      if (typeof texte !== 'string' || texte.length < CONSIGNE_MIN || texte.length > CONSIGNE_MAX) return erreur(400, 'texte_invalide')
      const r = await supabaseAdmin.rpc('station_consigne_par_agent', { p_agent: AGENT, p_texte: texte, p_agent_cible: 'chef' }).abortSignal(AbortSignal.timeout(DELAI_MS))
      if (r.error) return erreurBase(r.error)
      return NextResponse.json({ ok: true }, { headers: SANS_CACHE })
    }
    const e = await etat()
    if ('echec' in e && e.echec) return erreurBase(e.echec)
    return NextResponse.json(e.reponse, { headers: SANS_CACHE })
  } catch (x) {
    console.error('[telegram/entree] base injoignable :', x instanceof Error ? x.name : 'erreur')
    return erreur(503, 'base_injoignable')
  }
}
