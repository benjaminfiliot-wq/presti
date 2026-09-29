// app/api/usine/porteur/travail/route.ts — ce que le porteur du formulaire prend, sur l'usine (fiche 026-095).
//
// GET  → { envois: [{ id, texte, objet, reference, technologie, formulaire }], adresse } : les formulaires que le Facteur a
//        approuvés (trois verdicts, puis l'accord individuel de Benj), réservés au porteur par un bail de 15 min. Rien
//        d'autre : aucune adresse de prospect, aucun autre champ.
// GET ?verifier=<envoi_id> → { ok, raison?, empreinte_texte? } : la relecture, juste avant de soumettre, de la pause, du
//        statut de l'envoi, de l'opposition du prospect et de l'accord de Benj (lecture seule). Un doute vaut un refus.
//
// Le jeton est celui de l'agent `facteur_usine`, derrière le drapeau `busAgents` (404 sinon). Chaque appel authentifié bat
// (`ops_battement`). Rien ne sort : pause générale active, hors lundi-vendredi 8 h-18 h de Paris, relève du Gmail aveugle
// depuis plus de 15 min (le message promet « écrivez STOP à … » : personne ne lirait la réponse), formulaire coupé.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AGENT = 'facteur_usine'
const RELEVE_MAX_MS = 15 * 60_000
const LIMITE = 10
const BAIL_S = 900
const entetes = { 'cache-control': 'no-store' }
const rien = () => NextResponse.json({ envois: [] }, { headers: entetes })
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })

/** Lundi à vendredi, 8 h à 18 h à Paris (l'heure d'été et d'hiver sont celles de la base de fuseaux, pas un décalage écrit en dur). */
function fenetreOuverte(maintenant: Date): boolean {
  const morceaux = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(maintenant)
  const jour = morceaux.find((p) => p.type === 'weekday')?.value ?? ''
  const heure = Number(morceaux.find((p) => p.type === 'hour')?.value ?? NaN)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(jour) && heure >= 8 && heure < 18
}

type Etat = { releve_gmail_le?: string | null; formulaire_coupe_jusqua?: string | null; technologies?: { technologie: string; etat: string }[] }

/** L'état d'envoi de la base ; null si elle ne répond pas (un doute vaut un refus). */
async function etatEnvoi(): Promise<Etat | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_etat_envoi', {})
    if (error || !data || typeof data !== 'object') return null
    return data as Etat
  } catch { return null }
}
const futur = (iso: string | null | undefined, maintenant: number) => !!iso && Number.isFinite(Date.parse(iso)) && Date.parse(iso) > maintenant
const releveFrais = (iso: string | null | undefined, maintenant: number) => !!iso && Number.isFinite(Date.parse(iso)) && maintenant - Date.parse(iso) <= RELEVE_MAX_MS

export async function GET(req: Request) {
  if (actif('busAgents') === false) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas le travail */ }

  const maintenant = Date.now()
  let verifier: string | null = null
  try { verifier = new URL(req.url).searchParams.get('verifier') } catch { verifier = null }

  // ── la relecture d'un envoi juste avant la soumission ──
  if (verifier !== null) {
    const ferme = (raison: string) => NextResponse.json({ ok: false, raison }, { headers: entetes })
    if (!UUID.test(verifier)) return erreur(400, 'envoi')
    if ((await pauseGenerale()).active) return ferme('pause')
    const etat = await etatEnvoi()
    if (!etat) return ferme('etat_illisible')
    if (futur(etat.formulaire_coupe_jusqua, maintenant)) return ferme('formulaire_coupe')
    if (!releveFrais(etat.releve_gmail_le, maintenant)) return ferme('releve_gmail')
    try {
      const { data, error } = await supabaseAdmin.rpc('acq_porteur_verifier', { p_envoi: verifier })
      if (error || !data || typeof data !== 'object') return ferme('lecture_indisponible')
      const d = data as { ok?: unknown; raison?: unknown; empreinte_texte?: unknown }
      if (d.ok === true && typeof d.empreinte_texte === 'string' && /^[0-9a-f]{64}$/.test(d.empreinte_texte)) {
        return NextResponse.json({ ok: true, empreinte_texte: d.empreinte_texte }, { headers: entetes })
      }
      return ferme(typeof d.raison === 'string' ? d.raison.slice(0, 40) : 'refus')
    } catch { return ferme('lecture_indisponible') }
  }

  // ── le travail ──
  if ((await pauseGenerale()).active) return rien()
  if (!fenetreOuverte(new Date(maintenant))) return rien()
  const etat = await etatEnvoi()
  if (!etat || !releveFrais(etat.releve_gmail_le, maintenant) || futur(etat.formulaire_coupe_jusqua, maintenant)) return rien()
  const adresse = (process.env.ACQ_ADRESSE_REPONSE ?? '').trim()
  if (!adresse) return rien() // sans adresse de réponse, le formulaire ne promet rien qu'on puisse tenir : rien n'est réservé

  let lignes: unknown
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_formulaires_a_porter', { p_limite: LIMITE, p_bail_s: BAIL_S })
    if (error) return rien()
    lignes = data
  } catch { return rien() }
  if (!Array.isArray(lignes)) return rien()
  const enPause = new Set((etat.technologies ?? []).filter((t) => t.etat === 'pause').map((t) => t.technologie))
  const envois = lignes
    .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
    .map((l) => {
      const formulaire = (l.formulaire && typeof l.formulaire === 'object' ? l.formulaire : null) as Record<string, unknown> | null
      const technologie = typeof l.technologie === 'string' ? l.technologie : typeof formulaire?.technologie === 'string' ? formulaire.technologie : null
      return { id: l.id, texte: l.texte, objet: l.objet ?? null, reference: l.reference ?? null, technologie, formulaire }
    })
    .filter((e) => typeof e.id === 'string' && typeof e.texte === 'string' && e.formulaire !== null && !(e.technologie && enPause.has(e.technologie)))
  return NextResponse.json({ envois, adresse }, { headers: entetes })
}
