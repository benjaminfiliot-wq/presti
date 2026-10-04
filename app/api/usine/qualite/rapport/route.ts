import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { pauseGenerale } from '@/lib/agents/pause'
import { ops_decision_creer, ops_evenement_ajouter } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const entetes = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code }, { status, headers: entetes })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODES = new Set(['indisponible', 'http_non_securise', 'certificat_invalide', 'poids_excessif', 'contraste_insuffisant', 'alt_manquant', 'lien_mort', 'mentions_absentes', 'formulaire_absent', 'formulaire_sans_action', 'formulaire_injoignable'])
type Objet = Record<string, unknown>
const objet = (v: unknown): v is Objet => !!v && typeof v === 'object' && !Array.isArray(v)
const nombre = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const liste = (v: unknown) => Array.isArray(v) ? v : []
const urlPublique = (valeur: unknown) => {
  try { const u = new URL(String(valeur)); return ['http:', 'https:'].includes(u.protocol) ? `${u.origin}${u.pathname}`.slice(0, 300) : null } catch { return null }
}

function mesurePublique(code: string, section: Objet): Objet {
  if (code === 'indisponible') return { statut: section.statut ?? null }
  if (code === 'http_non_securise') return { protocole: 'http' }
  if (code === 'certificat_invalide') return { certificat_valide: false }
  if (code === 'poids_excessif') return { octets: section.octets, budget_octets: 3 * 1024 * 1024 }
  if (code === 'contraste_insuffisant') return { insuffisants: liste(section.insuffisants).slice(0, 50).filter(objet).map((l) => ({
    element: String(l.element ?? '').slice(0, 100), ratio: nombre(l.ratio) ? l.ratio : null, seuil: nombre(l.seuil) ? l.seuil : null,
  })) }
  if (code === 'alt_manquant') return { images_sans_alt: section.images_sans_alt }
  if (code === 'lien_mort') return { liens_morts: liste(section.liens_morts).slice(0, 50).filter(objet).map((l) => ({
    url: urlPublique(l.url), statut: nombre(l.statut) ? l.statut : null, raison: String(l.raison ?? '').slice(0, 40),
  })) }
  if (code === 'mentions_absentes') return { absentes: liste(section.absentes).filter((x) => ['nom_artisan', 'siren', 'adresse', 'forme_juridique'].includes(x)).slice(0, 4) }
  if (code === 'formulaire_injoignable') return { point_entree_statut: section.point_entree_statut ?? null }
  if (code === 'formulaire_sans_action') return { methode: String(section.methode ?? '').slice(0, 8) }
  return {}
}

function relire(v: Objet): { panne: string; mesure: Objet }[] | null {
  const sections = ['disponibilite', 'poids', 'accessibilite', 'liens', 'mentions', 'formulaire']
  const sorties: { panne: string; mesure: Objet }[] = []
  for (const nom of sections) {
    const section = v[nom]
    if (section === null && nom !== 'disponibilite') continue
    if (!objet(section) || !Array.isArray(section.pannes)) return null
    for (const p of section.pannes) {
      if (!objet(p) || typeof p.panne !== 'string' || !CODES.has(p.panne) || !objet(p.mesure)) return null
      const code = p.panne
      if (['indisponible', 'http_non_securise', 'certificat_invalide'].includes(code) && nom !== 'disponibilite' || code === 'poids_excessif' && nom !== 'poids' ||
        ['contraste_insuffisant', 'alt_manquant'].includes(code) && nom !== 'accessibilite' ||
        code === 'lien_mort' && nom !== 'liens' || code === 'mentions_absentes' && nom !== 'mentions' ||
        code.startsWith('formulaire_') && nom !== 'formulaire') return null
      sorties.push({ panne: code, mesure: mesurePublique(code, section) })
    }
  }
  const disponibilite = v.disponibilite as Objet
  const poids = v.poids as Objet | null
  const accessibilite = v.accessibilite as Objet | null
  const liens = v.liens as Objet | null
  const mentions = v.mentions as Objet | null
  const formulaire = v.formulaire as Objet | null
  const attendues = new Set<string>()
  if (disponibilite.statut === null || nombre(disponibilite.statut) && Number(disponibilite.statut) >= 400) attendues.add('indisponible')
  else {
    if (disponibilite.protocole === 'http') attendues.add('http_non_securise')
    if (disponibilite.protocole === 'https' && disponibilite.certificat_valide === false) attendues.add('certificat_invalide')
    if (!poids || !nombre(poids.octets) || Number(poids.octets) < 0 || !accessibilite || !liens || !mentions || !formulaire) return null
    if (Number(poids.octets) > 3 * 1024 * 1024) attendues.add('poids_excessif')
    if (liste(accessibilite.insuffisants).length) attendues.add('contraste_insuffisant')
    if (Number(accessibilite.images_sans_alt) > 0) attendues.add('alt_manquant')
    if (liste(liens.liens_morts).length) attendues.add('lien_mort')
    if (liste(mentions.absentes).length) attendues.add('mentions_absentes')
    if (formulaire.present === false) attendues.add('formulaire_absent')
    else if (!formulaire.action) attendues.add('formulaire_sans_action')
    else if (liste(formulaire.pannes).some((p) => objet(p) && p.panne === 'formulaire_injoignable')) attendues.add('formulaire_injoignable')
  }
  if (sorties.length !== attendues.size || sorties.some((p) => !attendues.has(p.panne))) return null
  return sorties
}

async function creerDecision(d: { commande_id: string; panne: string; mesure: Objet; periode: string }) {
  const contexte = JSON.stringify({ type: 'qualite_site', commande_id: d.commande_id, panne: d.panne, mesure: d.mesure }).slice(0, 1900)
  return ops_decision_creer({ p_agent: 'qualite_sites', p_question: `Site livré : corriger ${d.panne} pour ${d.commande_id} ?`, p_contexte: contexte,
    p_options: [{ cle: 'confier_livreur', libelle: 'Confier au Livreur', recommandee: true }, { cle: 'confier_claude', libelle: 'Confier à Claude Code', recommandee: false }, { cle: 'ignorer', libelle: 'Ignorer cette panne', recommandee: false }],
    p_defaut: 'confier_livreur', p_montant_cents: null, p_portee: 'artisan', p_echeance: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    p_cle: `qualite_site:${d.commande_id}:${d.panne}:${d.periode}`, p_tache: null })
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== 'qualite_sites') return erreur(403, 'agent')
  if ((await pauseGenerale()).active) return erreur(423, 'pause')
  const table = await exigerTable(agent, 'decisions')
  if (table) return reponseRefusAgent(table)
  let corps: unknown
  try { const brut = await req.text(); if (Buffer.byteLength(brut) > 64 * 1024) return erreur(413, 'corps_trop_grand'); corps = JSON.parse(brut) } catch { return erreur(400, 'json_invalide') }
  if (!objet(corps) || typeof corps.commande_id !== 'string' || !UUID.test(corps.commande_id) || typeof corps.sain !== 'boolean' ||
    !objet(corps.verdicts) || typeof corps.periode !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(corps.periode) ||
    corps.periode !== new Date().toISOString().slice(0, 7)) return erreur(400, 'rapport_invalide')
  const pannes = relire(corps.verdicts)
  if (!pannes || corps.sain !== (pannes.length === 0)) return erreur(400, 'verdicts_invalides')
  const { data: site, error: eSite } = await supabaseAdmin.from('sites_commandes').select('id').eq('id', corps.commande_id)
    .eq('etat', 'en_ligne').is('compte_supprime_le', null).is('retiree_le', null).maybeSingle()
  if (eSite) return erreur(503, 'commande_indisponible')
  if (!site) return erreur(404, 'commande')
  let creees = 0
  for (const p of pannes) {
    const decision = await creerDecision({ commande_id: corps.commande_id, panne: p.panne, mesure: p.mesure, periode: corps.periode })
    if (!decision.ok) return erreur(503, 'decision_indisponible')
    if (decision.data?.[0]?.creee) creees++
  }
  const evenement = await ops_evenement_ajouter({ p_agent: agent.nom, p_type: 'qualite_site_controle', p_objet: corps.commande_id,
    p_resume: `Contrôle qualité ${corps.periode} : ${pannes.length} panne(s)`, p_tache: null })
  if (!evenement.ok) return erreur(503, 'controle_non_date')
  return NextResponse.json({ decisions_creees: creees }, { headers: entetes })
}
