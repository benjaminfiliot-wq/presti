import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { ops_battement, ops_evenements_lire } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (statut: number, code: string) => NextResponse.json({ error: code }, { status: statut, headers: entetes })
type Commande = { id: string; etat: string; domaine: string | null; en_ligne_le: string | null; compte_supprime_le: string | null; retiree_le: string | null; matiere: Record<string, unknown> | null }
async function controlesDepuis(depuis: string): Promise<Set<string> | null> {
  const controles = new Set<string>()
  let apres = 0
  for (let page = 0; page < 100; page++) {
    // La RPC publique lit le journal ops sans exposer directement ce schéma à PostgREST.
    const lu = await ops_evenements_lire({ p_agent: 'systeme', p_apres: apres, p_limite: 200 })
    if (!lu.ok) return null
    for (const e of lu.data) {
      if (e.agent === 'qualite_sites' && e.type === 'qualite_site_controle' && e.le >= depuis && e.objet) controles.add(e.objet)
    }
    if (lu.data.length < 200) return controles
    apres = lu.data.at(-1)?.id ?? apres
  }
  return null
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== 'qualite_sites') return erreur(403, 'agent')
  if ((await pauseGenerale()).active) return NextResponse.json({ pause: true, sites: [] }, { headers: entetes })
  if (new URL(req.url).searchParams.get('battement') === '1') {
    const battement = await ops_battement({ p_nom: agent.nom })
    return battement.ok ? NextResponse.json({ ok: true }, { headers: entetes }) : erreur(503, 'battement')
  }
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: commandes, error: erreurCommandes } = await supabaseAdmin.from('sites_commandes')
    .select('id,etat,domaine,en_ligne_le,compte_supprime_le,retiree_le,matiere')
    .eq('etat', 'en_ligne').not('en_ligne_le', 'is', null).is('compte_supprime_le', null).is('retiree_le', null)
    .order('en_ligne_le', { ascending: true }).limit(100)
  if (erreurCommandes) return erreur(503, 'commandes')
  const controlesRecents = await controlesDepuis(depuis)
  if (!controlesRecents) return erreur(503, 'controles')
  const sites = ((commandes ?? []) as Commande[]).filter((c) => !controlesRecents.has(c.id)).flatMap((c) => {
    // Sans domaine propre, la route publique du site généré reste accessible après mise en ligne.
    const domaineValide = !!c.domaine && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.domaine)
    const urlEnLigne = domaineValide ? `https://${c.domaine}` : `https://prestiapp.fr/site-genere/${c.id}/`
    const matiere = c.matiere ?? {}
    const attendues = Object.fromEntries(['nom_artisan', 'siren', 'adresse', 'forme_juridique']
      .map((cle) => [cle, matiere[cle]]).filter(([, valeur]) => typeof valeur === 'string' && valeur.trim()))
    return [{ commande_id: c.id, etat: c.etat, domaine: c.domaine, url_en_ligne: urlEnLigne, en_ligne_le: c.en_ligne_le,
      compte_supprime_le: c.compte_supprime_le, retiree_le: c.retiree_le, mentions_attendues: attendues }]
  })
  return NextResponse.json({ sites }, { headers: entetes })
}
