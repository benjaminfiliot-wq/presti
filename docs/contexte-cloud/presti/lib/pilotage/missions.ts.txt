export const MISSIONS = [
  { cle: 'encaisse_eur', libelle: '300 € encaissés', cible: 300 },
  { cle: 'oui', libelle: '10 oui', cible: 10 },
  { cle: 'contacts_froids', libelle: '100 contacts froids', cible: 100 },
  { cle: 'sites_en_ligne', libelle: '1er site en ligne', cible: 1 },
] as const
export const NIVEAUX = [0, 300, 1000, 3000, 10000] as const
export const SUCCES = [
  { cle: 'premier_oui', libelle: 'Premier oui' }, { cle: 'premiere_vente', libelle: 'Première vente' },
  { cle: 'premier_site_en_ligne', libelle: 'Premier site en ligne' }, { cle: 'bilan_passe', libelle: 'Bilan passé' },
] as const
export const PALIERS_SALLE = { usine: [1, 10, 50] } as const
const valeur = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0
const chiffres = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
type Entree = { mesures?: Record<string, number | null>; objectif?: { libelle?: string; mesure?: string | null; cible?: number | null } | null; compteRendu?: string[]; bilan?: { bilan_le?: string | null; verdict?: string | null } | null; succesDates?: Record<string, string | null>; palier?: string | null; niveau?: number | null; sites_en_ligne?: number | null }
function niveauPour(xp: number) {
  const lv = NIVEAUX.filter(s => xp >= s).length
  const prochainSeuil = NIVEAUX[lv] ?? null
  const base = NIVEAUX[lv - 1] ?? 0
  return { lv, prochainSeuil, part: prochainSeuil == null ? 1 : Math.min(1, (xp - base) / (prochainSeuil - base)), xp, texte: `${chiffres(xp)} / ${prochainSeuil == null ? '—' : chiffres(prochainSeuil)} XP` }
}
export function palierSalle(cle: string, entree: Entree | null): { lv: number; texte: string } | null {
  const e = entree ?? {}
  let lv = 0
  if (cle === 'envois') lv = Number(/^P([1-9]\d*)$/.exec(e.palier ?? '')?.[1] ?? 0)
  else if (cle === 'usine') lv = PALIERS_SALLE.usine.filter(s => valeur(e.sites_en_ligne ?? e.mesures?.sites_en_ligne) >= s).length
  else if (cle === 'commandement') lv = e.niveau ?? niveauPour(valeur(e.mesures?.encaisse_eur)).lv
  return lv > 0 ? { lv, texte: `LV.${lv}` } : null
}
export function commandement(entree: Entree | null) {
  const e = entree ?? {}, mesures = e.mesures ?? {}, xp = valeur(mesures.encaisse_eur)
  const libelleBilan = e.bilan?.bilan_le && !Number.isNaN(Date.parse(e.bilan.bilan_le)) ? `bilan du ${e.bilan.bilan_le.slice(8,10)}/${e.bilan.bilan_le.slice(5,7)}` : 'bilan non daté, formulaire fermé'
  const missions = MISSIONS.map(m => {
    const v = valeur(mesures[m.cle]), succes = m.cle === 'oui' ? 'Premier oui' : m.cle === 'encaisse_eur' ? 'Première vente' : m.cle === 'sites_en_ligne' ? 'Premier site en ligne' : null
    return { cle: m.cle, libelle: m.cle === 'contacts_froids' ? `${m.libelle} (${libelleBilan})` : m.libelle, valeur: v, cible: m.cible, texte: `${v}/${m.cible}`, atteinte: v >= m.cible, debloque: succes ? `→ succès ${succes}` : null }
  })
  const dates = e.succesDates ?? {}
  const acquis: Record<string, boolean> = { premier_oui: valeur(mesures.oui) >= 1, premiere_vente: xp > 0, premier_site_en_ligne: valeur(mesures.sites_en_ligne) >= 1, bilan_passe: e.bilan?.verdict === 'P3' }
  const tousSucces = SUCCES.map(s => ({ ...s, debloque: acquis[s.cle], le: acquis[s.cle] ? dates[s.cle] ?? null : null }))
  const dernier = [...tousSucces].reverse().find(s => s.debloque)
  const objectif = e.objectif ? { libelle: e.objectif.libelle ?? '', par: 'PAR LE CHEF' as const, progression: e.objectif.mesure && e.objectif.cible ? Math.min(1, valeur(mesures[e.objectif.mesure]) / e.objectif.cible) : null } : null
  return { objectif, missions, niveau: niveauPour(xp), succes: dernier ? { cle: dernier.cle, libelle: dernier.libelle, le: dernier.le } : null, tousSucces, compteRendu: (e.compteRendu ?? []).slice(0, 3) }
}
