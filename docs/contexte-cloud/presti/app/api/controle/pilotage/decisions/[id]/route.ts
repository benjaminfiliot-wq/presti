import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { choixValide, porteeExigee, type Decision } from '@/lib/pilotage/decisions'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const { id } = await ctx.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Décision introuvable.' }, { status: 404 })

  const lecture = await supabaseAdmin.rpc('pilotage_decision', { p_id: id })
  if (lecture.error) return NextResponse.json({ error: 'Décision indisponible.' }, { status: 503 })
  const d = (Array.isArray(lecture.data) ? lecture.data[0] : lecture.data) as (Decision & { cle_idempotence?: string }) | null
  if (!d) return NextResponse.json({ error: 'Décision introuvable ou déjà tranchée.' }, { status: 404 })
  const b = await req.json().catch(() => null) as { choix?: unknown } | null
  const choix = b?.choix
  if (typeof choix !== 'string' || !choixValide(d, choix)) return NextResponse.json({ error: 'Choix invalide.' }, { status: 400 })
  const portee = porteeExigee(d)
  if (portee) {
    const refus = await exigerReconfirmation(req, f.uid, portee)
    if (refus) return refus
  }
  const journalOk = await journaliser({ acteur: f, action: 'decision_tranchee', cible_type: 'decision', cible_id: id, apres: { choix, portee, montant_cents: d.montant_cents }, reconfirme: !!portee }, req)
  if (!journalOk) return refusJournal()

  const resultat = await supabaseAdmin.rpc('ops_decision_trancher', { p_id: id, p_choix: choix, p_auteur: f.uid })
  const dejaTranchee = resultat.error?.message?.includes('ops:deja_tranchee') ?? false
  const reponseStandard = d.cle_idempotence?.startsWith('acq:reponse:') ?? false
  let reclassementRate = false
  if (reponseStandard && (!resultat.error || dejaTranchee)) {
    const suite = await supabaseAdmin.rpc('acq_reponse_reclasser', { p_decision: id, p_par: 'benj' })
    reclassementRate = !!suite.error
  }
  if (resultat.error) {
    const erreur = resultat.error.message
    const statut = dejaTranchee ? 409 : erreur.includes('ops:choix') ? 400 : erreur.includes('ops:auteur') ? 403 : 503
    return NextResponse.json({ error: reclassementRate ? "Décision prise ; la réponse n'a pas pu être rendue aux agents : rappuie." : dejaTranchee ? 'Décision déjà tranchée.' : statut === 503 ? "Rien n'a été fait." : statut === 400 ? 'Choix invalide.' : 'Accès refusé.' }, { status: statut })
  }
  const libelle = d.options.find(option => option.cle === choix)?.libelle ?? choix
  return NextResponse.json({ message: reclassementRate ? "Décision prise ; la réponse n'a pas pu être rendue aux agents : rappuie." : `Décision prise : ${libelle}` })
}
