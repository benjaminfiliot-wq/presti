// app/api/usine/pubs/depot/route.ts — POST : une adresse signée de dépôt par fichier du travail que le tourneur de l'usine détient (fiche 026-200).
//
// Mêmes gardes que `travail` (identité `studio` seule ; pause générale ou pause de l'agent → 423, rien n'est signé). Corps : { travail, fichiers: [{ chemin, type, taille }] }.
//   - le travail doit être détenu : un pack `payee` sous bail, ou une décision `studio_echantillon` encore à fabriquer (sinon 404) ;
//   - chaque fichier passe par cheminPermis et LIMITES (lib/pubs/usinePubs.ts) : packs-pubs/<pack>/livraison/ (trois MP4 et trois visuels, 60 Mo au plus)
//     ou packs-pubs/studio/<marque>/echantillon-<n>.mp4 (UN MP4, 3 Mo au plus) ; le moindre écart est un 400 et aucune adresse n'est signée ;
//   - le stockage (ops_stockage_octets) au-delà de 60 % du gigaoctet partagé, ou non mesurable → 507, aucune adresse ;
//   - sinon une adresse signée (createSignedUploadUrl) par fichier, et rien d'autre : { ok: true, depots: [{ chemin, url }] }.
// `upsert` : un travail repris après une panne dépose à nouveau les mêmes noms, qui ne doivent pas être refusés comme « déjà là » ; l'adresse ne vaut
// que pour le chemin signé, jamais pour un autre.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement, ops_stockage_octets } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { AGENT, BUCKET, estCleMarque, estObjet, estUuid, sousBail, stockageAccepte, validerDepot } from '@/lib/pubs/usinePubs'
import type { Travail } from '@/lib/pubs/usinePubs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: entetes })
const CORPS_MAX = 20_000

/** Le travail que le tourneur dit détenir : un pack payé sous bail, ou une décision d'échantillon encore à fabriquer. null s'il n'en détient aucun. */
async function detenu(id: string): Promise<Travail | null> {
  const p = await supabaseAdmin.from('packs_pubs').select('id, etat, verifications').eq('id', id).maybeSingle()
  if (p.error) throw new Error('packs_pubs')
  if (p.data) {
    const l = p.data as { etat?: unknown; verifications?: unknown }
    return l.etat === 'payee' && sousBail(l.verifications, Date.now()) ? { genre: 'pack', id } : null
  }
  const r = await supabaseAdmin.rpc('acq_studio_a_fabriquer', { p_limite: 50 })
  if (r.error || !Array.isArray(r.data)) return null
  const m = (r.data as Record<string, unknown>[]).find((x) => x.decision_id === id && x.opposition !== true && x.refus !== true)
  return m && estCleMarque(m.marque_cle) ? { genre: 'studio', id, marque: m.marque_cle } : null
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: AGENT }) } catch { /* un battement manqué ne change pas le travail */ }
  if ((await pauseGenerale()).active) return erreur(423, 'pause')

  let corps: unknown
  try {
    const texte = await req.text()
    if (texte.length > CORPS_MAX) return erreur(400, 'corps_invalide')
    corps = JSON.parse(texte)
  } catch { return erreur(400, 'corps_invalide') }
  if (!estObjet(corps) || !estUuid(corps.travail)) return erreur(400, 'corps_invalide')

  try {
    const travail = await detenu(corps.travail.toLowerCase())
    if (!travail) return erreur(404, 'travail_introuvable')
    const v = validerDepot(travail, corps.fichiers)
    if (!v.ok) return erreur(400, v.raison)
    const mesure = await ops_stockage_octets()
    if (!mesure.ok || !stockageAccepte(mesure.data)) return erreur(507, 'stockage')
    const depots: { chemin: string; url: string }[] = []
    for (const f of v.fichiers) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(f.objet, { upsert: true })
      if (error || !data?.signedUrl) return erreur(502, 'stockage_indisponible')
      depots.push({ chemin: f.chemin, url: data.signedUrl })
    }
    return NextResponse.json({ ok: true, depots }, { headers: entetes })
  } catch {
    return erreur(503, 'indisponible')
  }
}
