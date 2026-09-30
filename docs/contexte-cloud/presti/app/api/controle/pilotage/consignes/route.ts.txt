import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { EQUIPAGE } from '@/lib/pilotage/equipage'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const b = await req.json().catch(() => null) as { texte?: unknown; agent?: unknown } | null
  const texte = typeof b?.texte === 'string' ? b.texte.trim() : ''
  if (texte.length < 3 || texte.length > 200 || /[\x00-\x1f\x7f-\x9f]/.test(texte)) return NextResponse.json({ error: 'La consigne fait de 3 à 200 signes.' }, { status: 400 })
  const agent = b?.agent === undefined ? null : b.agent
  if (agent !== null && (typeof agent !== 'string' || !Object.hasOwn(EQUIPAGE, agent))) return NextResponse.json({ error: 'Agent inconnu.', agents: Object.keys(EQUIPAGE) }, { status: 400 })
  const journalOk = await journaliser({ acteur: f, action: 'consigne_transmise', cible_type: 'consigne', apres: { longueur: texte.length, agent } }, req)
  if (!journalOk) return refusJournal()
  const resultat = await supabaseAdmin.rpc('station_consigne_transmettre', { p_texte: texte, p_auteur: f.uid, p_agent: agent })
  if (resultat.error) {
    const erreur = resultat.error.message
    const statut = erreur.includes('ops:quota') ? 429 : erreur.includes('ops:auteur') ? 403 : erreur.includes('ops:texte') ? 400 : 503
    const message = statut === 429 ? '20 consignes par jour au plus.' : statut === 503 ? "Rien n'a été transmis." : statut === 403 ? 'Accès refusé.' : 'La consigne fait de 3 à 200 signes.'
    return NextResponse.json({ error: message }, { status: statut })
  }
  return NextResponse.json({ message: "Consigne transmise à l'équipage.", id: resultat.data })
}
