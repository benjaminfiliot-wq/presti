// app/api/usine/facteur/avis/route.ts — l'avis du second juge, rendu par l'usine ; l'approbation reste ici, sur Vercel
// (fiche 026-089, moitié qui juge).
//
// POST { envoi_id, empreinte, j2: { verdict: 'ok' | 'refus', raisons }, j2_version, passe? } : rejoue J3 sur le texte exact,
// fait J1, relit `peutEnvoyer`, puis approuve (`acq_envoi_approuver`, avec les trois verdicts) ou annule ; avec
// `passe: 'soir'`, le rejugement d'un envoi parti (un désaccord suspend son modèle). L'usine ne peut ni approuver seule ni
// faire approuver ce que J3 refuse : son avis n'est jamais que l'un des trois verdicts.
//
// Mêmes gardes que `travail` : busAgents (404 avant toute identité), jeton de l'agent `facteur` (403 sinon), battement,
// pause (423 : aucun avis accepté). Corps mal formé : 400 sans rien écrire ; un envoi déjà jugé : 409 sans rien écrire.
// Le jeton de la bibliothèque Meta vient du coffre (`acq_jeton_meta`), jamais d'une variable ; aucun texte ni adresse en
// journal ni en réponse. Cette route n'importe pas `@/lib/agents/llm`.
import { NextResponse } from 'next/server'
import { actif, FLAGS } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement, ops_evenement_ajouter } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { recuperateurReseau } from '@/lib/agents/acquisition/lecteurSite'
import { jugerAvecAvis, rejugerAvecAvis } from '@/lib/agents/acquisition/facteur'
import type { AvisJ2, DepsAvis } from '@/lib/agents/acquisition/facteur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const AGENT = 'facteur'
const CORPS_MAX = 8_192
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Le corps, validé à la main : rien d'autre que ces champs n'entre. */
function lireAvis(corps: unknown): AvisJ2 | null {
  if (!objet(corps) || typeof corps.envoi_id !== 'string' || !UUID.test(corps.envoi_id)) return null
  if (typeof corps.empreinte !== 'string' || !SHA256.test(corps.empreinte)) return null
  const j2 = corps.j2
  if (!objet(j2) || (j2.verdict !== 'ok' && j2.verdict !== 'refus') || !Array.isArray(j2.raisons)) return null
  if (j2.raisons.length > 5 || !j2.raisons.every((r) => typeof r === 'string' && r.length <= 200)) return null
  if (typeof corps.j2_version !== 'string' || corps.j2_version.length < 1 || corps.j2_version.length > 40) return null
  if (corps.passe !== undefined && corps.passe !== 'soir') return null
  return { envoi_id: corps.envoi_id.toLowerCase(), empreinte: corps.empreinte.toLowerCase(), j2: { verdict: j2.verdict, raisons: j2.raisons as string[] }, j2_version: corps.j2_version, ...(corps.passe === 'soir' ? { passe: 'soir' as const } : {}) }
}

/** Le jeton de la bibliothèque publicitaire de Meta, lu dans le coffre ; null s'il n'y en a pas (J1 dit alors « non vérifiable »). */
async function jetonMeta(): Promise<string | null> {
  try {
    const lecture = await supabaseAdmin.rpc('acq_jeton_meta')
    return lecture.error ? null : lecture.data?.[0]?.jeton ?? null
  } catch { return null }
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (!agent || estRefusAgent(agent)) return agent ? reponseRefusAgent(agent) : erreur(503, 'indisponible')
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas l'avis */ }

  let brut: string
  try { brut = await req.text() } catch { return erreur(400, 'corps_invalide') }
  if (new TextEncoder().encode(brut).length > CORPS_MAX) return erreur(413, 'corps_trop_gros')
  let corps: unknown
  try { corps = JSON.parse(brut) } catch { return erreur(400, 'corps_invalide') }
  const avis = lireAvis(corps)
  if (!avis) return erreur(400, 'corps_invalide')

  try {
    const pause = await pauseGenerale()
    if (!pause || pause.active) return erreur(423, 'pause')
    if (await magasinSupabase.enPause('facteur')) return erreur(423, 'pause')

    const deps: DepsAvis = {
      magasin: magasinSupabase,
      recuperer: recuperateurReseau,
      horloge: { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) },
      jetonMeta: await jetonMeta(),
      adresseReponse: (process.env.ACQ_ADRESSE_REPONSE ?? '').trim() || null,
      drapeaux: { siteAchatPublic: actif('siteAchatPublic'), varianteA: (FLAGS as Record<string, unknown>).varianteA === true },
      // L'offre du Studio (lib/studio/offre.ts, 026-166) n'est pas encore là : sans elle, J3 refuse tout `studio_offre_v1`.
      offre: null,
    }

    if (avis.passe === 'soir') {
      const r = await rejugerAvecAvis(deps, avis)
      if (!r.ok) return NextResponse.json({ ok: false, statut: 'perime' }, { headers: entetes })
      return NextResponse.json({ ok: true, statut: r.statut }, { headers: entetes })
    }

    const r = await jugerAvecAvis(deps, avis)
    if (!r.ok) {
      if (r.detail === 'deja_juge') return erreur(409, 'deja_juge')
      return NextResponse.json({ ok: false, statut: 'perime' }, { headers: entetes })
    }
    // Le Garde (J3) a jugé : un compteur, jamais un texte ni une adresse.
    if (r.j3?.juge) {
      const refus = r.j3.refus.length ? r.j3.refus.map((c) => `${c}:1`).join(',') : 'aucun'
      try { await ops_evenement_ajouter({ p_agent: 'garde', p_type: 'bilan_j3', p_resume: `juges=1 refus=${refus}`.slice(0, 200) }) } catch { /* le bilan est un plus */ }
    }
    return NextResponse.json({ ok: true, statut: r.statut }, { headers: entetes })
  } catch {
    return erreur(500, 'echec')
  }
}
