export const ORDRE = ['rouge', 'orange', 'jaune', 'bleu'] as const
export const MAX_CARTES = 7
export const VIDE = 'Rien pour toi. L’équipage tourne.'
export const COULEUR_DE: Record<string, string> = Object.fromEntries(Object.entries({
  rouge: ['pause_generale','panne_agent','argent_bloque','coupe_circuit','jeton_meta_expire','usine_injoignable','envoi_sans_verdicts','canal_arrete','gmail_bloque','notice_perimee','jauge_pleine'],
  orange: ['appel','site_a_valider','paiement_non_rattache','decision_argent'],
  jaune: ['taches_bloquees','disjoncteur','quota_haut','jeton_externe','agent_muet','stockage','orchestre','technologie_en_pause','modele_suspendu','changer_message','bilan','vercel_pro'],
  bleu: ['escalade_chef','idee_chef'],
}).flatMap(([couleur, motifs]) => motifs.map(motif => [motif, couleur])))
type Source = { nombre?: number; rdv?: number; depuis?: string | null; agent?: string | null }
export function titreCarte(cle: string, source: Source): string {
  const n = source.nombre ?? 1
  if (cle === 'appel') return source.rdv ? `${n} appels à rendre, dont ${source.rdv} rendez-vous réservé${source.rdv > 1 ? 's' : ''}` : `${n} appel${n > 1 ? 's' : ''} à rendre`
  if (cle === 'escalade_chef') return `${n} escalade${n > 1 ? 's' : ''} du Chef → ta décision`
  if (cle === 'idee_chef') return `${n} idée${n > 1 ? 's' : ''} de la réunion → approuver ou tuer`
  if (cle === 'site_a_valider') return `${n} site${n > 1 ? 's' : ''} à valider → Mettre en ligne`
  if (cle === 'panne_agent') return `${source.agent ?? 'Agent'} en panne`
  const noms: Record<string, string> = { pause_generale: 'Pause générale active', argent_bloque: 'Paiement bloqué', coupe_circuit: 'Coupe-circuit ouvert', jeton_meta_expire: 'Jeton Meta expiré', usine_injoignable: 'Usine injoignable', envoi_sans_verdicts: 'Verdicts manquants', canal_arrete: 'Canal arrêté', gmail_bloque: 'Gmail bloqué', notice_perimee: 'Notice périmée', jauge_pleine: 'Jauge pleine', paiement_non_rattache: 'Paiement non rattaché', decision_argent: 'Décision sur l’argent', taches_bloquees: 'Tâches bloquées', disjoncteur: 'Disjoncteur ouvert', quota_haut: 'Quota haut', jeton_externe: 'Jeton externe à vérifier', agent_muet: 'Agent muet', stockage: 'Stockage à vérifier', orchestre: 'Orchestre à vérifier', technologie_en_pause: 'Technologie en pause', modele_suspendu: 'Modèle suspendu', changer_message: 'Message à changer', bilan: 'Bilan à décider', vercel_pro: 'Vercel Pro à examiner' }
  return `${n} · ${noms[cle] ?? cle.replaceAll('_', ' ')}`
}
function geste(cle: string, source: Source) {
  if (cle === 'appel') return { type: 'appels' as const }
  if (cle === 'decision_argent' || cle === 'argent_bloque') return { type: 'decisions' as const, cible: 'argent' }
  if (cle === 'escalade_chef') return { type: 'decisions' as const, cible: 'escalade' }
  if (cle === 'idee_chef') return { type: 'decisions' as const, cible: 'idee' }
  if (cle === 'site_a_valider') return { type: 'ouvrir' as const, cible: '/controle?onglet=sites' }
  if (source.agent && /^[a-z0-9_]{2,40}$/.test(source.agent)) return { type: 'ouvrir' as const, cible: `/controle/station?agent=${source.agent}` }
  return { type: 'ouvrir' as const, cible: '/controle?onglet=aujourdhui' }
}
export function cartesAttention(sources: Record<string, Source | null> | null, _maintenant: Date) {
  const cartes = Object.entries(sources ?? {}).filter(([, x]) => x && (x.nombre ?? 0) > 0).map(([cle, x]) => ({ cle, couleur: COULEUR_DE[cle] ?? 'jaune', nombre: x!.nombre ?? 0, titre: titreCarte(cle, x!), geste: geste(cle, x!), agent: x!.agent ?? null, depuis: x!.depuis ?? null }))
  cartes.sort((a,b) => a.cle === 'pause_generale' ? -1 : b.cle === 'pause_generale' ? 1 : ORDRE.indexOf(a.couleur as typeof ORDRE[number]) - ORDRE.indexOf(b.couleur as typeof ORDRE[number]) || b.nombre - a.nombre || (Date.parse(a.depuis ?? '') || 0) - (Date.parse(b.depuis ?? '') || 0))
  return { cartes: cartes.slice(0, MAX_CARTES).map(({ depuis: _depuis, ...c }) => c), total: cartes.length, vide: cartes.length ? null : VIDE }
}
