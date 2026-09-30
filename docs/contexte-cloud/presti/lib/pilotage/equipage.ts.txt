import { MOTEUR_DE } from '@/lib/agents/moteurs'
import { compteARebours } from './barre'
import { masquer } from './fil'

export const SALLES = [
  ['commandement','Commandement','decision'], ['reunion','Salle de réunion','decision'], ['radar','Radar','veille'], ['redaction','Rédaction','travail'], ['envois','Salle des envois','travail'], ['standard','Standard','travail'], ['atelier','Atelier des maquettes','travail'], ['usine','Usine à sites','travail'], ['recettes','Recettes','argent'], ['tresorerie','Trésorerie','argent'], ['crieur','Tour du Crieur','travail'], ['studio','Studio pubs','travail'], ['experience','Salle Expérience','travail'], ['machines','Salle des machines','veille'], ['chantier','Chantier du code','travail'], ['audience','Audience','veille'], ['securite','Sécurité','veille'], ['presti','Presti','argent'], ['observatoire','Observatoire','veille'], ['repos','Salle de repos','repos'],
].map(([cle, plaque, genre]) => ({ cle, plaque, genre }))
export const SALLE_RESERVEE = { cle: 'ecommerce', plaque: 'E-commerce', genre: 'reservee' } as const
export const CLES_SALLE = [...SALLES.map(x => x.cle), SALLE_RESERVEE.cle]
const descriptifs: Record<string, [string, string, string]> = {
  chef:['Chef','Direction','commandement'], vigie_meta:['Vigie Meta','Veille Meta','radar'], recenseur:['Recenseur','Prospection','radar'], juge_faits:['Juge des faits','Vérification','redaction'], redacteur:['Plume','Rédaction','redaction'], garde:['Garde','Contrôle','redaction'], facteur:['Facteur','Courrier','envois'], facteur_usine:['Porteur','Courrier usine','envois'], standardiste:['Standard','Accueil','standard'], repondeur:['Répondeur','Réponses','standard'], atelier_maquettes:['Atelier','Maquettes','atelier'], redacteur_site:['Rédacteur des sites','Sites','usine'], livreur:['Livreur','Livraison','usine'], livreur_usine:['Livreur usine','Livraison usine','usine'], tresorier:['Trésorier','Trésorerie','tresorerie'], crieur:['Crieur','Publications','crieur'], studio:['Studio','Publicité','studio'], experience:['Expérience','Expériences','experience'], a0:['Veilleur','Surveillance','machines'], systeme:['Système','Système','machines'],
  // 25e identité (décision du chef d'entreprise du 27/09, fiche 026-070 § « machines ») : l'agent `usine` (homonyme de la
  // salle `usine`, § « Homonymie usine ») siège en Salle des machines, jamais dans la salle `usine` — libellé « Surveillant »
  // pour lever la confusion à l'écran. Manquante ici depuis la livraison : EQ-1 la réclamait déjà (contre-vérification du 28/09).
  usine:['Surveillant','Surveillance','machines'], pont:['Pont','Code','chantier'], contenu:['Contenu','Contenu','audience'], pont_telegram:['Telegram','Sécurité','securite'], douleurs:['Douleurs','Observatoire','observatoire'],
}
export const EQUIPAGE: Record<string, { libelle: string; role: string; salle: string; avatar: string }> = Object.fromEntries(Object.entries(descriptifs).map(([nom, [libelle, role, salle]]) => [nom, { libelle, role, salle, avatar: nom }]))
type Agent = { nom: string; etat?: string; en_pause?: boolean; disjoncteur_ouvert_le?: string | null; battement_le?: string | null; periode_minutes?: number; prochain_le?: string | null; cout_mois_eur?: number | null; modele?: string | null; fournisseur?: string | null; fournisseur_reel?: string | null; modele_le?: string | null }
type Evenement = { id?: number; agent?: string | null; type?: string; resume?: string | null; le?: string | null }
type Position = { salle: string; motif: 'porte' | 'tache' | 'reunion' | 'pause' | 'panne' }
export function point(etat: string | null): string { return etat === 'actif' ? 'cyan' : etat === 'pause' ? 'gris' : etat === 'panne' || etat === 'disjoncteur' ? 'rouge' : 'jaune' }
export function cadence(agent: Agent, maintenant: Date): string {
  if (agent.nom === 'chef' && agent.prochain_le) return `cycle dans ${compteARebours(new Date(agent.prochain_le), maintenant)}`
  const p = agent.periode_minutes
  if (p == null) return '—'
  if (p >= 10080) return p >= 43200 ? 'chaque mois' : 'sur demande'
  if (p >= 1440) return `tous les ${Math.round(p / 1440)} j`
  if (p >= 60) return `toutes les ${Math.round(p / 60)} h`
  return `toutes les ${p} min`
}
function etatDe(a: Agent, maintenant: Date): string {
  if (a.etat) return a.etat
  if (a.disjoncteur_ouvert_le) return 'disjoncteur'
  if (a.en_pause) return 'pause'
  if (!a.battement_le) return 'jamais'
  const age = maintenant.getTime() - Date.parse(a.battement_le), periode = (a.periode_minutes ?? 0) * 60000
  return age > 2 * periode + 7200000 ? 'panne' : age > 2 * periode ? 'muet' : 'actif'
}
const titulaire = (nom: string) => EQUIPAGE[nom] ?? { libelle: nom, role: 'Agent', salle: 'machines', avatar: 'defaut' }
export function etatInitial(agents: readonly Agent[] | null) {
  const positions: Record<string, Position> = {}, etats: Record<string, string> = {}, taches: Record<string, boolean> = {}
  for (const a of agents ?? []) { const etat = a.etat ?? (a.en_pause ? 'pause' : a.disjoncteur_ouvert_le ? 'disjoncteur' : 'actif'); etats[a.nom] = etat; taches[a.nom] = false; positions[a.nom] = etat === 'pause' ? { salle: 'repos', motif: 'pause' } : ['panne','disjoncteur'].includes(etat) ? { salle: titulaire(a.nom).salle, motif: 'panne' } : { salle: titulaire(a.nom).salle, motif: 'porte' } }
  return { positions, etats, taches, reunion: false, vus: [] as number[] }
}
export function appliquerEvenement(etat: ReturnType<typeof etatInitial>, evenement: Evenement) {
  const nom = evenement.agent ?? ''
  if (evenement.type === 'battement' || evenement.id != null && etat.vus.includes(evenement.id)) return etat
  const reunion = evenement.type === 'reunion_ouverte' ? true : ['reunion_close','reunion_abandonnee'].includes(evenement.type ?? '') ? false : etat.reunion
  if (!(nom in etat.positions) && reunion === etat.reunion) return etat
  const taches = { ...etat.taches }
  if (nom in etat.positions && !['reunion_ouverte','reunion_close','reunion_abandonnee'].includes(evenement.type ?? '')) taches[nom] = true
  const positions: Record<string, Position> = {}
  for (const agent of Object.keys(etat.positions)) {
    const e = etat.etats[agent], salle = titulaire(agent).salle
    positions[agent] = e === 'pause' ? { salle: 'repos', motif: 'pause' } : e === 'panne' || e === 'disjoncteur' ? { salle, motif: 'panne' } : reunion ? { salle: 'reunion', motif: 'reunion' } : { salle, motif: taches[agent] ? 'tache' : 'porte' }
  }
  return { ...etat, positions, taches, reunion, vus: evenement.id == null ? etat.vus : [...etat.vus, evenement.id] }
}
export function positions(agents: readonly Agent[] | null, evenements: readonly Evenement[] | null): Record<string, Position> {
  let etat = etatInitial(agents)
  for (const e of [...(evenements ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) etat = appliquerEvenement(etat, e)
  return etat.positions
}
export function modeleAffiche(ligne: Agent | null, maintenant: Date): { texte: string; source: 'vu' | 'prevu' | 'aucun' } {
  if (ligne?.modele && ligne.modele_le && Number.isFinite(Date.parse(ligne.modele_le)) && maintenant.getTime() - Date.parse(ligne.modele_le) <= 7 * 86400000 && maintenant.getTime() >= Date.parse(ligne.modele_le)) {
    const fournisseur = ligne.fournisseur === 'openai-codex' ? 'Codex' : ligne.fournisseur === 'freellmapi' ? ligne.fournisseur_reel ?? 'freellmapi' : ligne.fournisseur ?? 'inconnu'
    return { texte: `${ligne.modele} · ${fournisseur}${ligne.fournisseur === 'freellmapi' ? ' · gratuit' : ''}`, source: 'vu' }
  }
  const moteur = ligne?.nom ? MOTEUR_DE[ligne.nom] : null
  return moteur ? { texte: `${moteur.modele} (pas encore appelé)`, source: 'prevu' } : { texte: 'sans IA', source: 'aucun' }
}
export function equipage(lignes: readonly Agent[] | null, evenements: readonly Evenement[] | null, maintenant: Date) {
  const pos = positions((lignes ?? []).map(a => ({ ...a, etat: etatDe(a, maintenant) })), evenements)
  return (lignes ?? []).map(a => {
    const d = titulaire(a.nom), etat = etatDe(a, maintenant)
    const dernier = [...(evenements ?? [])].filter(x => x.agent === a.nom && x.type !== 'battement').sort((x,y) => (y.id ?? 0) - (x.id ?? 0))[0]
    return { nom: a.nom, libelle: d.libelle, role: d.role, etat, point: point(etat), activite: dernier ? masquer(dernier.resume) : 'En attente de tâche', activite_le: dernier?.le ?? null, cadence: cadence(a, maintenant), prochain_le: a.prochain_le ?? null, cout_mois_eur: a.cout_mois_eur ?? null, salle: d.salle, avatar: d.avatar, position: pos[a.nom], modele: modeleAffiche(a, maintenant) }
  }).sort((a, b) => SALLES.findIndex(s => s.cle === a.salle) - SALLES.findIndex(s => s.cle === b.salle) || a.nom.localeCompare(b.nom, 'fr'))
}
