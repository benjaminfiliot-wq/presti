import { lireCsv, nettoyerTableur, tableauxDeBord, type ChampCanonique, type Ligne, type Rapport, type Sens } from './comptaImport.ts'

export type FichierCompta = { nom: string; texte: string; sensParDefaut: Sens; colonnes?: Partial<Record<number, ChampCanonique | null>>; calendrier1904?: boolean; erreursLecture?: string[] }
export type FichierRange = { nom: string; rapport: Rapport }
export type Rangement = { fichiers: FichierRange[]; lignes: Ligne[]; rejets: { fichier: string; ligne: number; raison: string }[]; doublons: number }

// Une seule clé pour les doublons entre fichiers. Les doublons internes sont déjà retirés par le moteur.
function cle(l: Ligne): string {
  const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return [l.date, l.sens, l.montant, normaliser(l.tiers), normaliser(l.libelle)].join('|')
}

export function rangerFichiers(fichiers: readonly FichierCompta[]): Rangement {
  const vus = new Set<string>()
  const lignes: Ligne[] = []
  const rejets: Rangement['rejets'] = []
  const ranges: FichierRange[] = []
  let doublons = 0
  for (const fichier of fichiers) {
    let rapport = nettoyerTableur(fichier.texte, { sensParDefaut: fichier.sensParDefaut, colonnes: fichier.colonnes })
    if (fichier.calendrier1904) {
      const indexDate = rapport.colonnes.findIndex((c) => c.champ === 'date')
      if (indexDate >= 0) {
        const cellules = lireCsv(fichier.texte)
        for (const ligne of cellules.slice(1)) {
          if (/^\d+(\.\d+)?$/.test(ligne[indexDate] ?? '')) ligne[indexDate] = String(Number(ligne[indexDate]) + 1462)
        }
        const texteCorrige = cellules.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')
        rapport = nettoyerTableur(texteCorrige, { sensParDefaut: fichier.sensParDefaut, colonnes: fichier.colonnes })
      }
    }
    const champs = rapport.colonnes.map((c) => c.champ).filter(Boolean)
    if (new Set(champs).size !== champs.length) rapport.erreur = 'Un champ est affecté à plusieurs colonnes : choisissez une seule colonne par champ.'
    if (fichier.erreursLecture?.length) rapport.erreur = fichier.erreursLecture.join(' ; ')
    ranges.push({ nom: fichier.nom, rapport })
    doublons += rapport.doublons
    if (rapport.erreur) { rejets.push({ fichier: fichier.nom, ligne: 1, raison: rapport.erreur }); continue }
    for (const rejet of rapport.rejets) rejets.push({ fichier: fichier.nom, ...rejet })
    for (const ligne of rapport.lignes) {
      const id = cle(ligne)
      if (vus.has(id)) { doublons++; continue }
      vus.add(id)
      lignes.push(ligne)
    }
  }
  return { fichiers: ranges, lignes, rejets, doublons }
}

export function calculerVue(lignes: readonly Ligne[]) {
  const tableaux = tableauxDeBord(lignes)
  const impayes = lignes.filter((l) => l.sens === 'recette' && l.statut === 'impaye')
    .sort((a, b) => a.date.localeCompare(b.date) || a.tiers.localeCompare(b.tiers))
  return { tableaux, impayes }
}

export function auditerVue(lignes: readonly Ligne[], vue: ReturnType<typeof calculerVue>): boolean {
  const cles = lignes.map(cle)
  const recettes = lignes.filter((l) => l.sens === 'recette').reduce((n, l) => n + l.montant, 0)
  const depenses = lignes.filter((l) => l.sens === 'depense').reduce((n, l) => n + l.montant, 0)
  const impayes = lignes.filter((l) => l.sens === 'recette' && l.statut === 'impaye')
  return new Set(cles).size === cles.length
    && vue.tableaux.nombre === lignes.length
    && vue.tableaux.recettes === recettes
    && vue.tableaux.depenses === depenses
    && vue.tableaux.benefice === recettes - depenses
    && vue.tableaux.impayes.nombre === impayes.length
    && vue.tableaux.impayes.montant === impayes.reduce((n, l) => n + l.montant, 0)
    && vue.impayes.length === impayes.length
    && vue.impayes.every((l, i) => cle(l) === cle([...impayes].sort((a, b) => a.date.localeCompare(b.date) || a.tiers.localeCompare(b.tiers))[i]))
}

export function preparerRelance(ligne: Ligne): string {
  return `Bonjour ${ligne.tiers},\n\nSauf erreur de ma part, le règlement de ${ligne.libelle || 'notre facture'} du ${ligne.date} reste à vérifier. Pourriez-vous me confirmer sa situation ?\n\nMerci,`
}

/** Journal détaillé pour le comptable, distinct de l’export des seuls totaux. */
export function exporterJournal(lignes: readonly Ligne[]): string {
  const cellule = (v: string) => `"${(/^[\s]*[=+\-@]|^[\t\r\n]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`
  const entetes = ['Date', 'Libellé', 'Client ou fournisseur', 'Montant', 'Type', 'Catégorie', 'Statut', 'Source']
  return '\uFEFF' + [entetes, ...lignes.map((l) => [l.date, l.libelle, l.tiers, (l.montant / 100).toFixed(2).replace('.', ','), l.sens === 'recette' ? 'Recette' : 'Dépense', l.categorie, l.statut === 'paye' ? 'Payé' : l.statut === 'impaye' ? 'Impayé' : 'Non renseigné', l.source])].map((r) => r.map(cellule).join(';')).join('\r\n')
}
