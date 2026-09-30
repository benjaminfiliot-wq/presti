import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal, type Action } from '@/lib/direction/journal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Geste = 'ouvrir_envoi_froid' | 'reprendre_technologie' | 'rouvrir_canal' | 'lever_modele' | 'palier_plafond'
const GESTES: readonly Geste[] = ['ouvrir_envoi_froid', 'reprendre_technologie', 'rouvrir_canal', 'lever_modele', 'palier_plafond']
const ACTIONS: Record<Geste, Action> = { ouvrir_envoi_froid: 'envoi_froid_ouvert', reprendre_technologie: 'technologie_reprise', rouvrir_canal: 'canal_rouvert', lever_modele: 'modele_leve', palier_plafond: 'palier_plafond' }
const REFUS: Record<string, string> = {
  'ops:trop_tot': 'Pas avant le lundi 12/10/2026 : envoi_froid reste fermé.',
  'ops:mesure_absente': "La mesure à sec n'a pas réussi (026-165) : envoi_froid reste fermé.",
  'ops:epreuve_absente': "L'épreuve de bout en bout n'a pas encore réussi (026-163) : envoi_froid reste fermé.",
  'ops:notice_absente': "La notice en ligne n'est pas vérifiée depuis 7 jours (026-162) : envoi_froid reste fermé.",
}

export async function POST(req: Request) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'securite', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const b = await req.json().catch(() => null) as Record<string, unknown> | null
  const geste = b?.geste
  if (typeof geste !== 'string' || !GESTES.includes(geste as Geste)) return NextResponse.json({ error: 'Geste inconnu.' }, { status: 400 })
  const action = geste as Geste
  const parametres: Record<string, string | number> = {}
  if (action === 'reprendre_technologie') {
    if (typeof b?.technologie !== 'string' || !/^[a-z0-9_]{2,40}$/.test(b.technologie)) return NextResponse.json({ error: 'Technologie inconnue.' }, { status: 400 })
    parametres.p_technologie = b.technologie
  }
  if (action === 'rouvrir_canal') {
    if (typeof b?.canal !== 'string' || !['formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie'].includes(b.canal)) return NextResponse.json({ error: 'Canal inconnu.' }, { status: 400 })
    parametres.p_canal = b.canal
  }
  if (action === 'lever_modele') {
    if (typeof b?.modele !== 'string' || !/^[a-z0-9_]{2,60}$/.test(b.modele)) return NextResponse.json({ error: 'Modèle inconnu.' }, { status: 400 })
    parametres.p_modele = b.modele
  }
  if (action === 'palier_plafond') {
    if (typeof b?.palier !== 'string' || !/^P[0-4]$/.test(b.palier) || typeof b.par_jour !== 'number' || !Number.isInteger(b.par_jour) || b.par_jour < 0 || b.par_jour > 300) return NextResponse.json({ error: 'Palier ou plafond invalide.' }, { status: 400 })
    parametres.p_id = b.palier
    parametres.p_par_jour = b.par_jour
  }
  if (action === 'ouvrir_envoi_froid' && !actif('siteAchatPublic')) return NextResponse.json({ error: "L'achat public est fermé : le lien de paiement mènerait à une page fermée." }, { status: 409 })
  const refus = await exigerReconfirmation(req, f.uid, 'securite')
  if (refus) return refus
  const journalOk = await journaliser({ acteur: f, action: ACTIONS[action], cible_type: 'envoi', apres: { geste: action, ...parametres }, reconfirme: true }, req)
  if (!journalOk) return refusJournal()
  const resultat = action === 'ouvrir_envoi_froid'
    ? await supabaseAdmin.rpc('acq_envoi_froid_ouvrir', { p_auteur: f.uid })
    : action === 'reprendre_technologie'
      ? await supabaseAdmin.rpc('acq_technologie_reprendre', { p_technologie: parametres.p_technologie, p_auteur: f.uid })
      : action === 'rouvrir_canal'
        ? await supabaseAdmin.rpc('acq_canal_rouvrir', { p_canal: parametres.p_canal, p_auteur: f.uid })
        : action === 'lever_modele'
          ? await supabaseAdmin.rpc('acq_modele_lever', { p_modele: parametres.p_modele, p_auteur: f.uid })
          : await supabaseAdmin.rpc('acq_palier_plafond', { p_id: parametres.p_id, p_par_jour: parametres.p_par_jour, p_auteur: f.uid })
  if (resultat.error) {
    const erreur = resultat.error.message
    const refusConnu = Object.keys(REFUS).find(code => erreur.includes(code))
    const statut = refusConnu ? 409 : erreur.includes('ops:borne') ? 400 : erreur.includes('ops:auteur') ? 403 : 503
    return NextResponse.json({ error: refusConnu ? REFUS[refusConnu] : statut === 503 ? "Rien n'a été fait." : statut === 403 ? 'Accès refusé.' : 'Plafond invalide.' }, { status: statut })
  }
  const messages: Record<Geste, string> = { ouvrir_envoi_froid: 'Envoi à froid ouvert.', reprendre_technologie: `Technologie ${b?.technologie} reprise.`, rouvrir_canal: `Canal ${b?.canal} rouvert.`, lever_modele: `Modèle ${b?.modele} rétabli.`, palier_plafond: `Plafond du palier ${b?.palier} modifié.` }
  return NextResponse.json({ message: messages[action] })
}
