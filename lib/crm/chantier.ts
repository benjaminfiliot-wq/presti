// CRM — ce qui se calcule sur UN chantier : tâches nées du devis, avancement, retard, et les trois boutons de la fiche.
// Module pur (un seul import, pur aussi) : rejoué par scripts/crm-qa.mjs.
import { centimes, facturesComptees, type FacturePresti } from '../comptaTableau.ts'
import { argentDossier, estAcompte, type Argent, type FactureArgent } from './argent.ts'

export type LigneDevis = { id: string; ordre?: number | null; designation?: string | null; quantite?: number | string | null; unite?: string | null }
export type TacheExistante = { devis_ligne_id?: string | null; ordre?: number | null }
export type NouvelleTache = { devis_ligne_id: string; libelle: string; quantite: number | null; unite: string | null; ordre: number }

const LIBELLE_MAX = 300

/**
 * Les tâches à créer à partir des lignes d'un devis : une par ligne qui a une désignation, dans l'ordre du devis, à la
 * suite des tâches existantes. Une ligne qui a DÉJÀ sa tâche sur ce chantier est sautée (générer deux fois ne double
 * rien ; l'index chantier_taches_ligne_unique le garantit aussi en base). Le libellé est la désignation, espaces
 * resserrés, coupée à 300 caractères ; la quantité n'est gardée que si elle est un nombre positif.
 */
export function tachesDepuisDevis(lignes: readonly LigneDevis[], existantes: readonly TacheExistante[]): NouvelleTache[] {
  const deja = new Set(existantes.map((t) => t.devis_ligne_id).filter((x): x is string => !!x))
  let ordre = existantes.reduce((m, t) => Math.max(m, Number.isFinite(Number(t.ordre)) ? Number(t.ordre) : 0), -1) + 1
  const triees = [...lignes].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0) || String(a.id).localeCompare(String(b.id)))
  const sortie: NouvelleTache[] = []
  for (const l of triees) {
    if (!l.id || deja.has(l.id)) continue
    const libelle = typeof l.designation === 'string' ? l.designation.replace(/\s+/g, ' ').trim() : ''
    if (!libelle) continue
    const q = typeof l.quantite === 'number' ? l.quantite : typeof l.quantite === 'string' ? Number(l.quantite.replace(',', '.')) : NaN
    const unite = typeof l.unite === 'string' && l.unite.trim() ? l.unite.trim().slice(0, 16) : null
    sortie.push({ devis_ligne_id: l.id, libelle: [...libelle].slice(0, LIBELLE_MAX).join(''), quantite: Number.isFinite(q) && q > 0 ? Math.round(q * 100) / 100 : null, unite, ordre: ordre++ })
    deja.add(l.id)
  }
  return sortie
}

/** Avancement en % entier (tâches faites / tâches) ; null sans tâche — l'écran affiche « — », jamais un faux 0 %. */
export function avancement(taches: readonly { faite?: boolean | null }[]): { pct: number | null; faites: number; total: number } {
  const total = taches.length
  const faites = taches.filter((t) => t.faite === true).length
  return { pct: total ? Math.round((faites / total) * 100) : null, faites, total }
}

/**
 * La colonne d'INDICATEURS d'un chantier (plan du 18/10, n°2) : l'argent du devis, la matière sortie du stock et l'avancement.
 * L'argent vient de lib/crm/argent.ts (le même calcul que la frise et la colonne « à encaisser » du pipeline).
 *
 * La matière : les réservations SORTIES du stock, quantité × dernier prix vu HT du matériau (inventaire). Ce n'est pas le prix
 * payé ce jour-là : l'écran dit « au dernier prix vu ». Une sortie dont le matériau n'a aucun prix connu n'est pas comptée, et
 * elle est comptée à part (`sansPrix`).
 *
 * La « marge sur matériaux » : devis HT − matière sortie HT, rapportée au devis HT. Toujours dite ESTIMÉE, et SUR MATÉRIAUX :
 * la main-d'œuvre, les déplacements et la matière achetée hors stock n'y sont pas — ce n'est pas un bénéfice. null (« — ») sans
 * devis HT ou sans aucune sortie chiffrée (sinon elle vaudrait 100 %, ce qui est faux) ; `partielle` si des sorties n'ont pas
 * de prix (elle est alors surestimée).
 */
export type Indicateurs = {
  /** Le devis du chantier (la case « Devis » ouvre sa page) ; null sans devis. */
  devisId: string | null
  argent: Argent
  /** HT du devis, en centimes ; null sans devis. */
  devisHt: number | null
  matiere: { sortie: number; lignes: number; sansPrix: number }
  marge: { montant: number; pct: number; partielle: boolean } | null
  avancement: { pct: number | null; faites: number; total: number }
  retard: number | null
}
export function indicateurs(p: {
  devis: { id?: string; statut?: string | null; total_ttc?: number | string | null; total_ht?: number | string | null; acompte_pct?: number | string | null } | null
  factures: readonly FactureArgent[]
  /** Les réservations du chantier ; seules les « sorti » comptent. */
  materiaux: readonly { statut?: string | null; quantite?: number | string | null; prix_vu_ht?: number | string | null }[]
  taches: readonly { faite?: boolean | null }[]
  chantier: { statut?: string | null; date_fin_prevue?: string | null }
  jour: string
}): Indicateurs {
  const argent = argentDossier(p.devis, p.factures)
  const devisHt = p.devis && p.devis.total_ht !== null && p.devis.total_ht !== undefined && p.devis.total_ht !== '' ? centimes(p.devis.total_ht) : null
  let sortie = 0, lignes = 0, sansPrix = 0
  for (const m of p.materiaux) {
    if (m.statut !== 'sorti') continue
    const q = num(m.quantite)
    const prix = m.prix_vu_ht === null || m.prix_vu_ht === undefined || m.prix_vu_ht === '' ? null : num(m.prix_vu_ht)
    if (prix === null || !Number.isFinite(prix) || prix < 0) { sansPrix++; continue }
    lignes++
    sortie += Math.round(q * prix * 100)
  }
  const marge = devisHt && devisHt > 0 && lignes > 0 ? { montant: devisHt - sortie, pct: Math.round(((devisHt - sortie) / devisHt) * 100), partielle: sansPrix > 0 } : null
  return { devisId: p.devis?.id ?? null, argent, devisHt, matiere: { sortie, lignes, sansPrix }, marge, avancement: avancement(p.taches), retard: joursDeRetard(p.chantier, p.jour) }
}
const num = (v: number | string | null | undefined): number => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN; return Number.isFinite(n) ? n : 0 }

/** Jours de retard d'un chantier ouvert dont la fin prévue est STRICTEMENT passée (jour de Paris) ; 0 sinon, null sans date. */
export function joursDeRetard(c: { statut?: string | null; date_fin_prevue?: string | null }, aujourdhui: string): number | null {
  if (!c.date_fin_prevue || !/^\d{4}-\d{2}-\d{2}$/.test(c.date_fin_prevue)) return null
  if (c.statut === 'termine' || c.statut === 'annule') return 0
  if (c.date_fin_prevue >= aujourdhui) return 0
  const j = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.round((j(aujourdhui) - j(c.date_fin_prevue)) / 86_400_000)
}

export type Bouton = { actif: boolean; raison: string | null; solde?: boolean }
export type ActionsChantier = { facturer: Bouton; notifier: Bouton }

/**
 * Les boutons « Facturer » et « Notifier le client » n'appellent que des chemins qui EXISTENT déjà, et seulement quand ce
 * chemin fait exactement ce que le bouton annonce. Sinon le bouton est désactivé et dit pourquoi (jamais un faux succès) :
 *
 *  • Facturer → POST /api/factures { devis_id } (lib/factureDepuisDevis.ts) : facture le devis ENTIER, ou son SOLDE (acomptes
 *    déduits) s'il n'a que des factures d'acompte. Actif pour un devis signé sans facture complète ni de solde.
 *  • Notifier le client → POST /api/messages { action: 'reply' } : la réponse dans la conversation de la demande, par son
 *    canal. Actif seulement si le devis vient d'une demande marquée GAGNÉE : pour toute autre demande, ce chemin la
 *    repasse « répondue » et programme les relances commerciales (J+2, J+5, J+10) — on ne relance pas un client signé.
 */
export function actionsChantier(p: {
  devis: { id: string; statut?: string | null; lead_id?: string | null; total_ttc?: number | string | null } | null
  factures: readonly FactureArgent[]
  leadStatut: string | null
}): ActionsChantier {
  const signe = p.devis?.statut === 'accepte'
  const comptees = p.devis ? facturesComptees(p.factures.filter((f) => f.devis_id === p.devis!.id)) as FactureArgent[] : []
  // Audit de cohérence du 18/10, C3 corrigé : sur un devis dont seuls des ACOMPTES sont facturés, le même chemin émet la facture
  // du SOLDE (lignes du devis moins chaque acompte, lib/factureDepuisDevis.ts). Une facture complète ou de solde existe : désactivé.
  const du = p.devis && p.devis.total_ttc !== undefined && p.devis.total_ttc !== null ? centimes(p.devis.total_ttc) : null
  const completes = comptees.filter((f) => !estAcompte(f, du))
  const facturer: Bouton = !p.devis
    ? { actif: false, raison: 'Ce chantier n’a pas de devis : la facture se crée depuis l’écran Factures.' }
    : !signe
      ? { actif: false, raison: 'Le devis n’est pas signé.' }
      : completes.length
        ? { actif: false, raison: 'Ce devis est déjà facturé (facture complète ou de solde) : pour la refaire, émettez d’abord un avoir depuis l’écran Factures.' }
        : comptees.length ? { actif: true, raison: null, solde: true } : { actif: true, raison: null }
  const notifier: Bouton = !p.devis?.lead_id
    ? { actif: false, raison: 'Ce chantier ne vient pas d’une demande reçue : aucune conversation où écrire au client.' }
    : p.leadStatut !== 'gagne'
      ? { actif: false, raison: 'La demande n’est pas marquée gagnée : répondre d’ici relancerait le client comme un prospect. Écrivez-lui depuis Messages.' }
      : { actif: true, raison: null }
  return { facturer, notifier }
}

/** Le texte préparé de « Notifier le client » : l'artisan le relit et le modifie avant tout envoi. */
export function messageNotification(p: { titre: string; statut: string; avancementPct: number | null; dateDebut: string | null; dateFinPrevue: string | null }): string {
  const fr = (d: string) => d.split('-').reverse().join('/')
  const lignes = [`Bonjour,`, ``]
  if (p.statut === 'termine') lignes.push(`Le chantier « ${p.titre} » est terminé.`)
  else if (p.statut === 'en_cours') lignes.push(`Le chantier « ${p.titre} » avance${p.avancementPct !== null ? ` : ${p.avancementPct} % des tâches sont faites` : ''}.`)
  else if (p.dateDebut) lignes.push(`Le chantier « ${p.titre} » commencera le ${fr(p.dateDebut)}.`)
  else lignes.push(`Voici où en est le chantier « ${p.titre} ».`)
  if (p.statut !== 'termine' && p.dateFinPrevue) lignes.push(`La fin est prévue le ${fr(p.dateFinPrevue)}.`)
  lignes.push(``, `Je reste à votre disposition pour toute question.`)
  return lignes.join('\n')
}
