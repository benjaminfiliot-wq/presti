// app/api/usine/porteur/rendu/route.ts — le résultat d'une soumission, rendu par le porteur du formulaire (fiche 026-095).
//
// POST { envoi_id, ok: true, preuve: { code_http, empreinte_texte, empreinte_avant, empreinte_apres, chemin_usine,
//        technologie, soumis_le } } → acq_envoi_envoye(p_envoi, p_preuve) : la base consigne « envoyé » avec la preuve
//        (les empreintes et le chemin sur l'usine, jamais les captures) ; elle refuse encore si la pause est active ou si
//        l'accord de Benj est tombé (ops:accord_perime).
// POST { envoi_id, ok: false, raison, definitif } → acq_formulaire_echec(p_envoi, p_raison, p_definitif) : la base compte
//        l'échec de la technologie et le signale ; un échec définitif annule l'envoi et marque le formulaire inéligible.
//
// Même garde que `travail`. Un corps mal formé : 400, sans rien écrire. Jamais de texte en journal.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { TECHNOLOGIES_FORMULAIRE } from '@/lib/agents/acquisition/contrat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const AGENT = 'facteur_usine'
const CORPS_MAX = 8_192
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export async function POST(req: Request) {
  if (actif('busAgents') === false) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')

  let brut: string
  try { brut = await req.text() } catch { return erreur(400, 'corps_invalide') }
  if (new TextEncoder().encode(brut).length > CORPS_MAX) return erreur(413, 'corps_trop_gros')
  let corps: unknown
  try { corps = JSON.parse(brut) } catch { return erreur(400, 'corps_invalide') }
  if (!objet(corps) || typeof corps.envoi_id !== 'string' || !UUID.test(corps.envoi_id) || typeof corps.ok !== 'boolean') return erreur(400, 'corps_invalide')
  const envoi = corps.envoi_id.toLowerCase()

  if (corps.ok === true) {
    const p = corps.preuve
    const soumisLe = objet(p) && typeof p.soumis_le === 'string' ? Date.parse(p.soumis_le) : NaN
    if (
      !objet(p) ||
      !Number.isInteger(p.code_http) || (p.code_http as number) < 100 || (p.code_http as number) > 599 ||
      typeof p.empreinte_texte !== 'string' || !SHA256.test(p.empreinte_texte) ||
      typeof p.empreinte_avant !== 'string' || !SHA256.test(p.empreinte_avant) ||
      typeof p.empreinte_apres !== 'string' || !SHA256.test(p.empreinte_apres) ||
      typeof p.chemin_usine !== 'string' || p.chemin_usine.length < 1 || p.chemin_usine.length > 300 || /\.\./.test(p.chemin_usine) ||
      typeof p.technologie !== 'string' || !(TECHNOLOGIES_FORMULAIRE as readonly string[]).includes(p.technologie) ||
      !Number.isFinite(soumisLe)
    ) return erreur(400, 'preuve_invalide')
    // la preuve, champ par champ : rien d'autre ne passe à la base
    const preuve = {
      code_http: p.code_http,
      empreinte_texte: p.empreinte_texte,
      empreinte_avant: p.empreinte_avant,
      empreinte_apres: p.empreinte_apres,
      chemin_usine: p.chemin_usine,
      technologie: p.technologie,
      soumis_le: new Date(soumisLe).toISOString(),
    }
    try {
      const { data, error } = await supabaseAdmin.rpc('acq_envoi_envoye', { p_envoi: envoi, p_preuve: preuve })
      if (error) return erreur(503, 'base_injoignable')
      const r = (objet(data) ? data : {}) as { ok?: unknown; raison?: unknown }
      if (r.ok === true) return NextResponse.json({ ok: true }, { headers: entetes })
      return NextResponse.json({ ok: false, raison: typeof r.raison === 'string' ? r.raison.slice(0, 40) : 'refus' }, { status: 409, headers: entetes })
    } catch { return erreur(503, 'base_injoignable') }
  }

  const raison = typeof corps.raison === 'string' ? corps.raison.trim() : ''
  if (!raison || raison.length > 200 || typeof corps.definitif !== 'boolean') return erreur(400, 'corps_invalide')
  try {
    const { data, error } = await supabaseAdmin.rpc('acq_formulaire_echec', { p_envoi: envoi, p_raison: raison, p_definitif: corps.definitif })
    if (error) return erreur(503, 'base_injoignable')
    const r = (objet(data) ? data : {}) as { ok?: unknown; raison?: unknown }
    if (r.ok === true) return NextResponse.json({ ok: true }, { headers: entetes })
    return NextResponse.json({ ok: false, raison: typeof r.raison === 'string' ? r.raison.slice(0, 40) : 'refus' }, { status: 404, headers: entetes })
  } catch { return erreur(503, 'base_injoignable') }
}
