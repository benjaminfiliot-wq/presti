export const HEURE_REUNION = { heure: 18, minute: 0, fuseau: 'Europe/Paris', source: 'rectification du 24/09, §4.6 (supposé)' } as const
export const HEURES_NUIT = { debut: 20, fin: 7, source: 'Ecosysteme-Interface-Poste §3.1 A (supposé, à confirmer par Benj)' } as const

const fuseau = 'Europe/Paris'
const parties = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)])) as Record<string, number>
const cleJour = (date: Date) => { const p = parties(date); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` }
const instantParis = (jour: string, heure: number) => {
  const midi = new Date(`${jour}T12:00:00Z`)
  const p = parties(midi)
  const decalage = (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - midi.getTime()) / 60000
  return new Date(Date.parse(`${jour}T00:00:00Z`) + heure * 3600000 - decalage * 60000)
}
export function compteARebours(cible: Date | null, maintenant: Date): string {
  if (!cible || !Number.isFinite(cible.getTime())) return '—'
  const ecart = cible.getTime() - maintenant.getTime()
  if (ecart < 0) return `en retard de ${Math.ceil(-ecart / 60000)} min`
  if (ecart < 60000) return 'maintenant'
  const minutes = Math.ceil(ecart / 60000)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}
export function prochaineReunion(maintenant: Date, derniere: { jour: string; statut: string } | null): Date {
  const aujourdhui = cleJour(maintenant)
  const finie = derniere?.jour === aujourdhui && ['close', 'abandonnee'].includes(derniere.statut)
  const jourCible = finie ? new Date(Date.parse(`${aujourdhui}T12:00:00Z`) + 86400000).toISOString().slice(0, 10) : aujourdhui
  return instantParis(jourCible, HEURE_REUNION.heure)
}
export function heureParis(maintenant: Date): string { const p = parties(maintenant); return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` }
export function quota(part: number | null | undefined) { return part == null || !Number.isFinite(part) ? { texte: 'non mesuré', ton: 'muet' as const } : { texte: `${Math.round(part * 100)} %`, ton: part > 0.75 ? 'alerte' as const : 'normal' as const } }
type Canal = { canal?: string; plafond?: number | null; utilises?: number | null; palier?: string | null }
export function envoisBarre(parCanal: readonly Canal[] | null, palier: string | null): string {
  const ligne = parCanal?.find(x => x.canal === 'formulaire_site')
  return ligne && (ligne.plafond ?? 0) > 0 && palier ? `${ligne.utilises ?? 0}/${ligne.plafond} · ${palier}` : '— · formulaire fermé'
}
export function agentsActifs(cartes: readonly { point?: string }[] | null) { const total = cartes?.length ?? 0; const actifs = cartes?.filter(x => x.point === 'cyan').length ?? 0; return { actifs, total, texte: `AGENTS ${actifs}/${total} ACTIFS` } }
export function jour(lancement: string | null, maintenant: Date): string {
  if (!lancement || !/^\d{4}-\d{2}-\d{2}$/.test(lancement)) return '—'
  const ecart = Math.floor((Date.parse(`${cleJour(maintenant)}T00:00:00Z`) - Date.parse(`${lancement}T00:00:00Z`)) / 86400000)
  return Number.isFinite(ecart) && ecart >= 0 ? `JOUR ${ecart + 1}` : '—'
}
export function nuit(maintenant: Date): boolean { const h = parties(maintenant).hour; return h >= HEURES_NUIT.debut || h < HEURES_NUIT.fin }
type Entree = { cartes?: { point?: string }[]; chef?: { prochain_le?: string | null; modele?: string | null }; cycles?: number | null; reunion?: { jour: string; statut: string } | null; quotas?: { claude5h?: number | null; claudeSemaine?: number | null; codex5h?: number | null }; compteurs?: Canal[]; palier?: string | null; experience?: { statut?: string | null; jour?: number | null; gains_eur?: number | null }; pause?: { active?: boolean }; attention?: { total?: number }; lancement?: string | null }
export function barre(entree: Entree | null, maintenant: Date) {
  const e = entree ?? {}
  const compteurs: { cle: string; libelle: string; texte: string; ton: 'normal' | 'alerte' | 'muet'; source: string }[] = []
  const ajouter = (cle: string, libelle: string, texte: string, source: string, ton: 'normal' | 'alerte' | 'muet' = texte === '—' ? 'muet' : 'normal') => compteurs.push({ cle, libelle, texte, ton, source })
  ajouter('agents', 'AGENTS ACTIFS', e.cartes ? agentsActifs(e.cartes).texte : '—', 'equipage')
  ajouter('chef', 'CHEF DANS', e.chef?.prochain_le ? compteARebours(new Date(e.chef.prochain_le), maintenant) : '—', 'agents')
  ajouter('modele_chef', 'MODÈLE DU CHEF', e.chef?.modele ?? '—', 'agents')
  ajouter('cycles', "CYCLES AUJOURD’HUI", e.cycles == null ? '—' : String(e.cycles), 'evenements')
  ajouter('reunion', 'RÉUNION DANS', compteARebours(prochaineReunion(maintenant, e.reunion ?? null), maintenant), 'reunion')
  const claude = quota(e.quotas?.claude5h ?? null); ajouter('quota_claude', 'QUOTA CLAUDE 5 H · SEMAINE', claude.texte, 'quotas', claude.ton)
  const codex = quota(e.quotas?.codex5h ?? null); ajouter('quota_codex', 'QUOTA CODEX 5 H', codex.texte, 'quotas', codex.ton)
  ajouter('envois', 'ENVOIS DU JOUR', e.compteurs ? envoisBarre(e.compteurs, e.palier ?? null) : '—', 'formulaire', e.compteurs ? 'normal' : 'muet')
  if (e.experience?.statut === 'en_cours') ajouter('experience', 'EXPÉRIENCE', `J${e.experience.jour ?? 1}/30 · ${e.experience.gains_eur ?? 0} €`, 'experience')
  return { compteurs, auto: { actif: !e.pause?.active, texte: e.pause?.active ? 'PAUSE' : 'AUTO' }, cloche: e.attention?.total ?? 0, heure: heureParis(maintenant), jour: jour(e.lancement ?? null, maintenant), nuit: nuit(maintenant) }
}
