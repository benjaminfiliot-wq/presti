// L'assistant comptable : l'artisan dépose ses fichiers tels quels, l'IA comprend leur forme,
// le code fait les comptes. Refonte du 11/10/2026 (la vidéo de référence : des Excel en désordre
// transformés en tableau de bord, sans que la personne range quoi que ce soit).
//
// Partage des rôles, et il ne bouge pas :
//  - l'IA dit OÙ sont les choses (quelle ligne est l'en-tête, quelle colonne est la date, quelle
//    feuille n'est qu'une synthèse) et classe les dépenses dans une liste fermée de catégories ;
//  - le code lit chaque cellule, calcule chaque centime et chaque total. Aucun chiffre ne vient du
//    modèle : un montant deviné qui a l'air calculé est pire qu'un montant absent.
// Ce que l'IA voit : les en-têtes et les textes des cellules, chiffres masqués (« 1 250,00 »
// devient « 9 999,99 »). Les montants, eux, ne quittent jamais le navigateur.
//
// Ce fichier est pur (aucun réseau, aucun stockage) : il tourne dans le navigateur, dans la route
// serveur qui valide la réponse du modèle, et dans les tests.
import { formatEnTete, formatEuros, lireCsv, lireCsvNumerote, lireDate, lireMontantCentimes, type ChampCanonique, type Ligne, type Sens } from './comptaImport.ts'
import { calculerVue, rangerFichiers, type FichierCompta, type Rangement } from './comptaArtisan.ts'

export const CATEGORIES_DEPENSES = [
  'Matériaux et fournitures', 'Sous-traitance', 'Carburant et déplacements', 'Véhicule',
  'Outillage et équipement', 'Assurances', 'Téléphone et internet', 'Loyer et énergie',
  'Banque et frais', 'Cotisations et impôts', 'Logiciels et abonnements', 'Repas',
  'Publicité', 'Autre',
] as const
export type CategorieDepense = typeof CATEGORIES_DEPENSES[number]

export type ChampPlan = ChampCanonique | 'debit' | 'credit'
const CHAMPS_PLAN: readonly ChampPlan[] = ['date', 'libelle', 'tiers', 'montant', 'debit', 'credit', 'sens', 'categorie', 'statut', 'source']

export type PlanFeuille = {
  /** « donnees » : des lignes à compter. « synthese » : des totaux déjà calculés (les compter les doublerait). */
  role: 'donnees' | 'synthese' | 'vide'
  /** Index (0 = première ligne non vide) de la ligne d'en-tête ; -1 si la feuille n'en a pas. */
  ligneEntete: number
  colonnes: Partial<Record<ChampPlan, number>>
  /** Vrai quand un même montant porte le signe : négatif = dépense (relevé bancaire). */
  montantSigne: boolean
  sensParDefaut: Sens
  raison: string
}
export type Plan = { feuilles: PlanFeuille[]; categories: Record<string, CategorieDepense>; origine: 'ia' | 'regles' }

export type FeuilleEchantillon = { nom: string; lignes: number; apercu: string[][]; valeurs: string[][] }
export type Echantillon = { feuilles: FeuilleEchantillon[] }

export const LIMITES_ECHANTILLON = { feuilles: 20, lignesApercu: 15, colonnes: 15, valeursParColonne: 60, longueur: 40 } as const

// — Masquage : la forme d'une cellule reste lisible, sa valeur non. —
export function masquerCellule(v: string): string {
  return v.replace(/\s+/g, ' ').trim().replace(/\d/g, '9').slice(0, LIMITES_ECHANTILLON.longueur)
}
function cleTexte(v: string): string {
  return masquerCellule(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function estNombreOuDate(v: string): boolean {
  const s = v.trim()
  return s === '' || lireMontantCentimes(s) !== null || lireDate(s) !== null
}

/** Ce qui part vers l'IA : forme des feuilles et textes, jamais un montant. */
export function construireEchantillon(fichiers: readonly FichierCompta[]): Echantillon {
  const L = LIMITES_ECHANTILLON
  return {
    feuilles: fichiers.slice(0, L.feuilles).map((f) => {
      const tableau = lireCsv(f.texte)
      const apercu = tableau.slice(0, L.lignesApercu).map((r) => r.slice(0, L.colonnes).map(masquerCellule))
      const largeur = Math.min(L.colonnes, Math.max(0, ...tableau.map((r) => r.length)))
      const valeurs: string[][] = []
      for (let c = 0; c < largeur; c++) {
        const vues = new Set<string>()
        for (const r of tableau) {
          const v = r[c] ?? ''
          if (estNombreOuDate(v)) continue
          vues.add(masquerCellule(v))
          if (vues.size >= L.valeursParColonne) break
        }
        valeurs.push([...vues])
      }
      return { nom: f.nom.slice(0, 80), lignes: tableau.length, apercu, valeurs }
    }),
  }
}

// — Les règles : ce que le code sait faire seul, sans IA (et en secours si l'IA ne répond pas). —
const SYN_DEBIT = ['debit', 'debits', 'sortie', 'sorties', 'montant debit', 'depense', 'depenses', 'decaissement']
const SYN_CREDIT = ['credit', 'credits', 'entree', 'entrees', 'montant credit', 'recette', 'recettes', 'encaissement']
function normEntete(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function champEntete(e: string): ChampPlan | null {
  const n = normEntete(e)
  if (SYN_DEBIT.includes(n)) return 'debit'
  if (SYN_CREDIT.includes(n)) return 'credit'
  return formatEnTete(e)
}
const MOTS_DEPENSE = /achat|depense|frais|charge|fournisseur|banque|releve|compte/
const MOTS_SYNTHESE = /synthese|recap|bilan|total|tcd|graph|resume|tableau de bord/

const REGLES_CATEGORIES: [CategorieDepense, string[]][] = [
  ['Matériaux et fournitures', ['point p', 'leroy merlin', 'castorama', 'brico', 'bricomarche', 'bricodepot', 'cedeo', 'gedimat', 'bigmat', 'rexel', 'sonepar', 'yesss', 'materiaux', 'materiau', 'fournitures', 'fourniture', 'placo', 'ciment', 'peinture', 'tollens', 'seigneurie', 'dispano', 'cged', 'chausson', 'tout faire', 'weldom', 'mr bricolage']],
  ['Outillage et équipement', ['outillage', 'outil', 'outils', 'wurth', 'makita', 'bosch', 'hilti', 'festool', 'kiloutou', 'loxam', 'location materiel', 'manomano', 'facom', 'dewalt']],
  ['Carburant et déplacements', ['carburant', 'gazole', 'gasoil', 'essence', 'esso', 'shell', 'avia', 'total energies', 'totalenergies', 'station', 'peage', 'autoroute', 'aprr', 'sanef', 'vinci autoroutes', 'parking', 'sncf', 'deplacement']],
  ['Véhicule', ['garage', 'pneu', 'pneus', 'norauto', 'feu vert', 'speedy', 'midas', 'controle technique', 'vidange', 'leasing', 'vehicule', 'utilitaire']],
  ['Assurances', ['assurance', 'axa', 'maaf', 'macif', 'smabtp', 'allianz', 'generali', 'mma', 'groupama', 'decennale', 'rc pro', 'maif', 'matmut', 'hiscox']],
  ['Téléphone et internet', ['orange', 'sfr', 'bouygues', 'free mobile', 'sosh', 'red by sfr', 'telephone', 'internet', 'forfait', 'mobile']],
  ['Banque et frais', ['frais bancaires', 'frais bancaire', 'commission', 'commissions', 'agios', 'cotisation carte', 'frais de tenue', 'qonto', 'shine', 'sumup', 'banque', 'frais']],
  ['Cotisations et impôts', ['urssaf', 'impot', 'impots', 'dgfip', 'cfe', 'tva', 'cipav', 'cotisation', 'cotisations', 'sie', 'chambre des metiers', 'cma']],
  ['Logiciels et abonnements', ['abonnement', 'logiciel', 'google', 'microsoft', 'adobe', 'ovh', 'canva', 'notion', 'apple', 'office']],
  ['Loyer et énergie', ['loyer', 'bail', 'edf', 'engie', 'electricite', 'eau', 'gaz', 'local', 'depot', 'entrepot']],
  ['Repas', ['restaurant', 'repas', 'boulangerie', 'mcdo', 'mcdonald', 'burger', 'sandwich', 'traiteur', 'cafe']],
  ['Publicité', ['pages jaunes', 'pagesjaunes', 'facebook', 'meta', 'google ads', 'publicite', 'flyer', 'flyers', 'vistaprint', 'imprimerie', 'pub']],
  ['Sous-traitance', ['sous traitance', 'sous traitant', 'soustraitance', 'prestataire', 'interim', 'interimaire']],
]

/** Classement par mots-clés, quand l'IA n'a rien dit sur ce texte. Null plutôt qu'une catégorie inventée. */
export function categorieParRegles(texte: string): CategorieDepense | null {
  const n = ` ${normEntete(texte)} `
  if (n.trim() === '') return null
  for (const [categorie, mots] of REGLES_CATEGORIES) if (mots.some((m) => n.includes(` ${m} `))) return categorie
  return null
}

function planFeuilleParRegles(f: FichierCompta): PlanFeuille {
  const tableau = lireCsv(f.texte)
  const nomNorm = normEntete(f.nom)
  const sensParDefaut: Sens = MOTS_DEPENSE.test(nomNorm) ? 'depense' : 'recette'
  const vide = (role: PlanFeuille['role'], raison: string): PlanFeuille => ({ role, ligneEntete: -1, colonnes: {}, montantSigne: false, sensParDefaut, raison })
  if (tableau.length < 2) return vide('vide', 'Feuille vide ou réduite à une ligne.')
  // L'en-tête n'est pas toujours la première ligne : un titre, une date d'édition, un logo la précèdent souvent.
  for (let h = 0; h < Math.min(10, tableau.length - 1); h++) {
    const colonnes: Partial<Record<ChampPlan, number>> = {}
    tableau[h].forEach((e, i) => { const c = champEntete(e); if (c && colonnes[c] === undefined) colonnes[c] = i })
    const aMontant = colonnes.montant !== undefined || colonnes.debit !== undefined || colonnes.credit !== undefined
    if (colonnes.date === undefined || !aMontant) continue
    const montantSigne = colonnes.montant !== undefined && colonnes.sens === undefined
      && tableau.slice(h + 1).some((r) => (lireMontantCentimes(r[colonnes.montant!] ?? '') ?? 0) < 0)
    const synthese = MOTS_SYNTHESE.test(nomNorm)
    return { role: synthese ? 'synthese' : 'donnees', ligneEntete: h, colonnes, montantSigne, sensParDefaut, raison: synthese ? 'Le nom de la feuille indique une synthèse : ses totaux ne sont pas recomptés.' : 'Colonnes reconnues par leurs en-têtes.' }
  }
  return vide('vide', 'Aucune colonne date et montant reconnue.')
}

export function planParRegles(fichiers: readonly FichierCompta[]): Plan {
  return { feuilles: fichiers.map(planFeuilleParRegles), categories: {}, origine: 'regles' }
}

// — La réponse du modèle n'est jamais crue sur parole : chaque champ est revalidé ici. —
function entier(v: unknown): number | null { return typeof v === 'number' && Number.isInteger(v) ? v : null }

export type PlanIA = { feuilles: (PlanFeuille | null)[]; categories: { valeur: string; categorie: CategorieDepense }[] }

/**
 * Valide la réponse brute de l'IA contre l'échantillon envoyé. Une feuille mal décrite devient
 * `null` (le navigateur lui appliquera ses règles) ; une catégorie n'est gardée que pour un texte
 * réellement envoyé et dans la liste fermée. Appelée deux fois : par la route, puis par le
 * navigateur sur ce que la route lui rend.
 */
export function validerPlanIA(brut: unknown, echantillon: Echantillon): PlanIA | null {
  if (typeof brut !== 'object' || brut === null) return null
  const b = brut as { feuilles?: unknown; categories?: unknown }
  if (!Array.isArray(b.feuilles) || b.feuilles.length !== echantillon.feuilles.length) return null
  const feuilles = b.feuilles.map((x, i): PlanFeuille | null => {
    if (typeof x !== 'object' || x === null) return null
    const f = echantillon.feuilles[i]
    const largeur = Math.max(0, ...f.apercu.map((r) => r.length), f.valeurs.length)
    const o = x as Record<string, unknown>
    const role = o.role === 'donnees' || o.role === 'synthese' || o.role === 'vide' ? o.role : null
    const ligneEntete = entier(o.ligneEntete)
    const sens = o.sensParDefaut === 'depense' || o.sensParDefaut === 'recette' ? o.sensParDefaut : null
    if (role === null || ligneEntete === null || ligneEntete < -1 || ligneEntete >= Math.max(1, f.apercu.length) || sens === null) return null
    const colonnes: Partial<Record<ChampPlan, number>> = {}
    const brutes = (typeof o.colonnes === 'object' && o.colonnes !== null ? o.colonnes : {}) as Record<string, unknown>
    const prises = new Set<number>()
    for (const [cle, v] of Object.entries(brutes)) {
      if (v === null) continue
      const n = entier(v)
      if (!CHAMPS_PLAN.includes(cle as ChampPlan) || n === null || n < 0 || n >= largeur || prises.has(n)) return null
      prises.add(n)
      colonnes[cle as ChampPlan] = n
    }
    if (role === 'donnees') {
      const aMontant = colonnes.montant !== undefined || colonnes.debit !== undefined || colonnes.credit !== undefined
      if (colonnes.date === undefined || !aMontant) return null
      if (colonnes.montant !== undefined && (colonnes.debit !== undefined || colonnes.credit !== undefined)) return null
    }
    const raison = typeof o.raison === 'string' ? o.raison.replace(/\s+/g, ' ').trim().replace(/\d/g, '').slice(0, 160) : ''
    return { role, ligneEntete, colonnes, montantSigne: o.montantSigne === true, sensParDefaut: sens, raison: raison || 'Structure reconnue.' }
  })
  const envoyes = new Set(echantillon.feuilles.flatMap((f) => f.valeurs.flat()).map(cleTexte))
  const categories: PlanIA['categories'] = []
  if (Array.isArray(b.categories)) {
    for (const c of b.categories.slice(0, 2000)) {
      if (typeof c !== 'object' || c === null) continue
      const { valeur, categorie } = c as { valeur?: unknown; categorie?: unknown }
      if (typeof valeur !== 'string' || typeof categorie !== 'string') continue
      if (!envoyes.has(cleTexte(valeur)) || !(CATEGORIES_DEPENSES as readonly string[]).includes(categorie)) continue
      categories.push({ valeur: masquerCellule(valeur), categorie: categorie as CategorieDepense })
    }
  }
  return { feuilles, categories }
}

/** Le plan final : l'avis de l'IA là où il est valide, les règles partout ailleurs. */
export function completerPlan(ia: PlanIA, regles: Plan): Plan {
  const categories: Record<string, CategorieDepense> = {}
  for (const c of ia.categories) categories[cleTexte(c.valeur)] = c.categorie
  return {
    feuilles: regles.feuilles.map((r, i) => ia.feuilles[i] ?? { ...r, raison: `${r.raison} (règles de base : l’IA n’a pas su lire cette feuille)` }),
    categories,
    origine: 'ia',
  }
}

// — Appliquer un plan : réécrire chaque feuille sous une forme que le moteur connaît. —
export type Etape = { texte: string; ton: 'info' | 'ok' | 'attention' }
export type ResultatAssistant = { rangement: Rangement; etapes: Etape[]; ignorees: { nom: string; raison: string }[]; totauxIgnores: number; classees: number }

const ENTETES_CANONIQUES: ChampCanonique[] = ['date', 'libelle', 'tiers', 'montant', 'sens', 'categorie', 'statut', 'source']
const LIGNE_TOTAL = /^\s*(sous[\s-]?)?tota(l|ux)\b|^\s*solde\b|^\s*report\b|^\s*cumul\b/i
const enCsv = (lignes: string[][]) => lignes.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')

function preparerFeuille(f: FichierCompta, p: PlanFeuille): { fichier: FichierCompta; numeros: number[]; totaux: number; ligneEntete: number } {
  const numerotees = lireCsvNumerote(f.texte)
  const tableau = numerotees.map((x) => x.cellules)
  const debut = p.ligneEntete + 1
  const c = p.colonnes
  const lire = (r: string[], champ: ChampPlan) => (c[champ] === undefined ? '' : (r[c[champ]!] ?? '').trim())
  const sortie: string[][] = [ENTETES_CANONIQUES]
  const numeros: number[] = []
  let totaux = 0
  for (let k = debut; k < tableau.length; k++) {
    const r = tableau[k]
    // Une ligne « Total », « Solde », « Report » sans date lisible est une somme, pas une opération.
    if (!lireDate(lire(r, 'date')) && r.some((v) => LIGNE_TOTAL.test(v))) { totaux++; continue }
    let montant = lire(r, 'montant')
    let sens = lire(r, 'sens')
    if (c.montant === undefined) {
      const credit = lireMontantCentimes(lire(r, 'credit'))
      const debit = lireMontantCentimes(lire(r, 'debit'))
      if (credit !== null && credit !== 0) { montant = lire(r, 'credit').replace(/^-/, ''); sens = 'recette' }
      else if (debit !== null && debit !== 0) { montant = lire(r, 'debit').replace(/^[-(]|\)$/g, ''); sens = 'depense' }
      else montant = lire(r, 'credit') || lire(r, 'debit')
    } else if (p.montantSigne && c.sens === undefined) {
      const cents = lireMontantCentimes(montant)
      if (cents !== null) { sens = cents < 0 ? 'depense' : 'recette'; montant = (Math.abs(cents) / 100).toFixed(2).replace('.', ',') }
    }
    if (!sens) sens = p.sensParDefaut
    sortie.push([lire(r, 'date'), lire(r, 'libelle'), lire(r, 'tiers'), montant, sens, lire(r, 'categorie'), lire(r, 'statut'), lire(r, 'source')])
    numeros.push(numerotees[k].ligne)
  }
  return { fichier: { nom: f.nom, texte: enCsv(sortie), sensParDefaut: p.sensParDefaut, colonnes: Object.fromEntries(ENTETES_CANONIQUES.map((x, i) => [i, x])), calendrier1904: f.calendrier1904, erreursLecture: f.erreursLecture }, numeros, totaux, ligneEntete: numerotees[p.ligneEntete]?.ligne ?? p.ligneEntete + 1 }
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`

export function appliquerPlan(fichiers: readonly FichierCompta[], plan: Plan): ResultatAssistant {
  const etapes: Etape[] = []
  const ignorees: ResultatAssistant['ignorees'] = []
  const prets: { fichier: FichierCompta; numeros: number[] }[] = []
  let totauxIgnores = 0
  fichiers.forEach((f, i) => {
    const p = plan.feuilles[i] ?? planFeuilleParRegles(f)
    if (p.role !== 'donnees') {
      ignorees.push({ nom: f.nom, raison: p.raison })
      etapes.push({ texte: `${f.nom} : mise de côté. ${p.raison}`, ton: p.role === 'synthese' ? 'info' : 'attention' })
      return
    }
    const { fichier, numeros, totaux, ligneEntete } = preparerFeuille(f, p)
    totauxIgnores += totaux
    prets.push({ fichier, numeros })
    const reconnues = Object.keys(p.colonnes).map((k) => ({ date: 'date', libelle: 'libellé', tiers: 'client ou fournisseur', montant: 'montant', debit: 'débit', credit: 'crédit', sens: 'type', categorie: 'catégorie', statut: 'statut', source: 'source' }[k] ?? k))
    etapes.push({ texte: `${f.nom} : ${reconnues.join(', ')}${ligneEntete > 1 ? ` (en-tête trouvé ligne ${ligneEntete})` : ''}${p.montantSigne ? ', montants signés lus comme recettes et dépenses' : ''}.`, ton: 'ok' })
  })
  const rangement = rangerFichiers(prets.map((x) => x.fichier))
  // Les numéros de ligne cités sont ceux du fichier de l'artisan, pas ceux de la feuille réécrite.
  const numerosPar = new Map(prets.map((x) => [x.fichier.nom, x.numeros]))
  rangement.rejets = rangement.rejets.map((r) => ({ ...r, ligne: r.ligne > 1 ? (numerosPar.get(r.fichier)?.[r.ligne - 2] ?? r.ligne) : r.ligne }))
  let classees = 0
  rangement.lignes = rangement.lignes.map((l) => {
    if (l.sens !== 'depense' || (l.categorie && l.categorie !== 'Sans catégorie')) return l
    const categorie = plan.categories[cleTexte(l.libelle)] ?? plan.categories[cleTexte(l.tiers)] ?? categorieParRegles(`${l.libelle} ${l.tiers}`)
    if (!categorie) return l
    classees++
    return { ...l, categorie }
  })
  if (totauxIgnores) etapes.push({ texte: `${pluriel(totauxIgnores, 'ligne de total ignorée', 'lignes de total ignorées')} : les compter doublerait les montants.`, ton: 'info' })
  if (rangement.doublons) etapes.push({ texte: `${pluriel(rangement.doublons, 'doublon retiré', 'doublons retirés')}.`, ton: 'info' })
  if (classees) etapes.push({ texte: `${pluriel(classees, 'dépense classée', 'dépenses classées')} par catégorie.`, ton: 'ok' })
  if (rangement.rejets.length) etapes.push({ texte: `${pluriel(rangement.rejets.length, 'ligne illisible mise de côté', 'lignes illisibles mises de côté')} : le détail est listé plus bas.`, ton: 'attention' })
  return { rangement, etapes, ignorees, totauxIgnores, classees }
}

/** Fusionne un nouvel import avec les chiffres déjà enregistrés, sans doubler une ligne déjà là. */
export function fusionnerLignes(existantes: readonly Ligne[], nouvelles: readonly Ligne[]): { lignes: Ligne[]; ajoutees: number; dejaLa: number } {
  const cleLigne = (l: Ligne) => [l.date, l.sens, l.montant, normEntete(l.tiers), normEntete(l.libelle)].join('|')
  const vues = new Set(existantes.map(cleLigne))
  const lignes = [...existantes]
  let ajoutees = 0
  let dejaLa = 0
  for (const l of nouvelles) {
    const k = cleLigne(l)
    if (vues.has(k)) { dejaLa++; continue }
    vues.add(k)
    lignes.push(l)
    ajoutees++
  }
  return { lignes, ajoutees, dejaLa }
}

// — La seule question qu'on pose à l'artisan : une colonne AMBIGUË. —
// Deux colonnes qui peuvent l'une et l'autre être « la » date (Date facture, Date échéance), « le » montant
// (Montant HT, Montant TTC, Total) ou « le » client : l'assistant en a choisi une, mais c'est un choix, pas
// une lecture. On le montre et on laisse l'artisan trancher. Tout le reste est rangé sans lui demander.
export type ChampAmbigu = 'date' | 'montant' | 'tiers'
export type QuestionColonne = { feuille: number; nomFeuille: string; champ: ChampAmbigu; candidates: { colonne: number; entete: string }[]; choisie: number | null }
const INDICES_CHAMP: Record<ChampAmbigu, RegExp> = {
  date: /\bdate\b|\bjour\b/,
  montant: /\bmontant\b|\btotal\b|\bprix\b|\bsomme\b|\bttc\b|\bht\b/,
  tiers: /\bclient\b|\bfournisseur\b|\btiers\b|\bbeneficiaire\b/,
}

export function colonnesAmbigues(fichiers: readonly FichierCompta[], plan: Plan): QuestionColonne[] {
  const questions: QuestionColonne[] = []
  fichiers.forEach((f, i) => {
    const p = plan.feuilles[i]
    if (!p || p.role !== 'donnees' || p.ligneEntete < 0) return
    // Débit / crédit : deux colonnes de montant voulues, pas une ambiguïté.
    const avecDebitCredit = p.colonnes.debit !== undefined || p.colonnes.credit !== undefined
    const entetes = (lireCsv(f.texte)[p.ligneEntete] ?? []).slice(0, LIMITES_ECHANTILLON.colonnes)
    for (const champ of Object.keys(INDICES_CHAMP) as ChampAmbigu[]) {
      if (champ === 'montant' && avecDebitCredit) continue
      const autres = new Set(Object.entries(p.colonnes).filter(([c]) => c !== champ).map(([, n]) => n))
      const candidates = entetes
        .map((e, colonne) => ({ colonne, entete: e.trim() }))
        .filter((c) => c.entete && !autres.has(c.colonne) && (INDICES_CHAMP[champ].test(normEntete(c.entete)) || champEntete(c.entete) === champ))
      if (candidates.length >= 2) questions.push({ feuille: i, nomFeuille: f.nom, champ, candidates, choisie: p.colonnes[champ] ?? null })
    }
  })
  return questions
}

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const jourFr = (iso: string) => { const [a, m, j] = iso.split('-').map(Number); return `${j} ${MOIS_NOMS[m - 1]} ${a}` }

/** Le bilan en mots. Chaque nombre cité sort du calcul, aucun n'est écrit par le modèle. */
export function bilanEnMots(lignes: readonly Ligne[]): string[] {
  if (!lignes.length) return []
  const { tableaux: t } = calculerVue(lignes)
  const phrases: string[] = []
  if (t.periode.debut && t.periode.fin) phrases.push(`Du ${jourFr(t.periode.debut)} au ${jourFr(t.periode.fin)} : ${formatEuros(t.recettes)} de recettes et ${formatEuros(t.depenses)} de dépenses, soit ${formatEuros(t.benefice)} de ${t.benefice >= 0 ? 'bénéfice' : 'perte'}.`)
  const poste = t.depensesParCategorie.find((c) => c.categorie !== 'Sans catégorie')
  if (poste) phrases.push(`Votre plus gros poste de dépenses : ${poste.categorie.toLowerCase()}, ${formatEuros(poste.montant)}${poste.part !== null ? ` (${String(poste.part).replace('.', ',')} %)` : ''}.`)
  const meilleur = [...t.parMois].sort((a, b) => b.recettes - a.recettes)[0]
  if (meilleur && t.parMois.length > 1 && meilleur.recettes > 0) { const [a, m] = meilleur.mois.split('-').map(Number); phrases.push(`Votre meilleur mois : ${MOIS_NOMS[m - 1]} ${a}, avec ${formatEuros(meilleur.recettes)} de recettes.`) }
  if (t.impayes.nombre) phrases.push(`${pluriel(t.impayes.nombre, 'facture impayée', 'factures impayées')} pour ${formatEuros(t.impayes.montant)} : les relances sont prêtes, il ne reste qu’à les relire.`)
  else phrases.push('Aucun impayé dans vos fichiers.')
  return phrases
}
