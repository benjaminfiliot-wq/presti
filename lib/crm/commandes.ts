// CRM — les commandes fournisseur : ce que l'artisan a COMMANDÉ (il le déclare, Presti ne commande rien), la date de livraison
// annoncée, et ce qui en découle : « livraison en retard », « attendue aujourd'hui », le message de relance à relire.
// Module pur (aucun import hors validation) : rejoué par scripts/crm-qa.mjs, utilisé par les routes /api/crm/commandes* ET par
// l'écran (même calcul de retard des deux côtés : « deux chiffres, un écran »).
//
// Règle de retard : une commande au statut « commandée » dont la livraison prévue est STRICTEMENT passée (jour de Paris).
// Livrée ou annulée : jamais en retard. Une livraison prévue AUJOURD'HUI n'est pas en retard : elle est « attendue ».
import { champsPermis, date, estObjet, identifiant, nombre, texte, type Resultat } from './valider.ts'

/** Ce que l'écran dit quand la table des commandes n'existe pas encore sur la base (migration 0158 non appliquée). */
export const MANQUE_MIGRATION_COMMANDES = 'Le suivi des commandes n’est pas encore installé sur cette base (migration 0158).'
export const STATUTS_COMMANDE = ['commandee', 'recue', 'annulee'] as const
export type StatutCommande = (typeof STATUTS_COMMANDE)[number]
export const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = { commandee: 'Commandée', recue: 'Reçue', annulee: 'Annulée' }

export type LigneCommande = { materiau_id: string | null; nom: string; quantite: number; unite: string }
/** Une commande telle que l'écran la lit (colonnes de COLONNES.commandes dans lib/crm/serveur.ts). */
export type CommandeA = {
  id: string
  fournisseur: string
  contact: string | null
  reference: string | null
  statut: StatutCommande
  commandee_le: string
  livraison_prevue: string
  recue_le: string | null
  chantier_id: string | null
  lignes: LigneCommande[]
  relances: number
  relance_le: string | null
  note: string | null
}

const nb = (v: unknown): number => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN; return Number.isFinite(n) ? n : 0 }
const joursEntre = (a: string, b: string): number => {
  const j = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.round((j(b) - j(a)) / 86_400_000)
}

/** Les lignes brutes de la base (jsonb) → lignes sûres : une ligne illisible est écartée, jamais devinée. */
export function lignesDe(brut: unknown): LigneCommande[] {
  if (!Array.isArray(brut)) return []
  return brut.flatMap((l): LigneCommande[] => {
    if (!estObjet(l) || typeof l.nom !== 'string' || !l.nom.trim()) return []
    const q = nb(l.quantite)
    if (!(q > 0)) return []
    return [{ materiau_id: typeof l.materiau_id === 'string' ? l.materiau_id : null, nom: l.nom.trim().slice(0, 200), quantite: Math.round(q * 100) / 100, unite: typeof l.unite === 'string' && l.unite.trim() ? l.unite.trim().slice(0, 16) : 'u' }]
  })
}

/** Une ligne de la table → la commande de l'écran (colonnes inconnues ou illisibles : null, jamais une valeur inventée). */
export function commandeDeLigne(r: Record<string, unknown>): CommandeA | null {
  const statut = STATUTS_COMMANDE.find((s) => s === r.statut)
  if (typeof r.id !== 'string' || !statut || typeof r.livraison_prevue !== 'string' || typeof r.fournisseur_nom !== 'string') return null
  return {
    id: r.id, fournisseur: r.fournisseur_nom, contact: typeof r.fournisseur_contact === 'string' ? r.fournisseur_contact : null,
    reference: typeof r.reference === 'string' ? r.reference : null, statut,
    commandee_le: typeof r.commandee_le === 'string' ? r.commandee_le : r.livraison_prevue, livraison_prevue: r.livraison_prevue,
    recue_le: typeof r.recue_le === 'string' ? r.recue_le : null, chantier_id: typeof r.chantier_id === 'string' ? r.chantier_id : null,
    lignes: lignesDe(r.lignes), relances: Math.max(0, Math.round(nb(r.relances))), relance_le: typeof r.relance_le === 'string' ? r.relance_le : null,
    note: typeof r.note === 'string' ? r.note : null,
  }
}

/** Jours de retard de la livraison (> 0 = en retard) ; 0 si livrée, annulée ou pas encore due. */
export function retardLivraison(c: Pick<CommandeA, 'statut' | 'livraison_prevue'>, jour: string): number {
  if (c.statut !== 'commandee') return 0
  return Math.max(0, joursEntre(c.livraison_prevue, jour))
}
export const enRetard = (c: Pick<CommandeA, 'statut' | 'livraison_prevue'>, jour: string): boolean => retardLivraison(c, jour) > 0
export const attendueAujourdhui = (c: Pick<CommandeA, 'statut' | 'livraison_prevue'>, jour: string): boolean => c.statut === 'commandee' && c.livraison_prevue === jour
/** Les commandes encore attendues (ni reçues ni annulées). */
export const enCours = (l: readonly CommandeA[]): CommandeA[] => l.filter((c) => c.statut === 'commandee')

const fr = (d: string) => d.split('-').reverse().join('/')
const qte = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

/** Le libellé court d'une commande : « CMD-12 · Négoce Nord » (référence si elle existe). */
export const libelleCommande = (c: Pick<CommandeA, 'reference' | 'fournisseur'>): string => `${c.reference ? `${c.reference} · ` : ''}${c.fournisseur}`

/**
 * Le message de relance PRÉPARÉ : l'artisan le relit et le modifie avant tout envoi (rien ne part d'ici). Il ne cite que ce
 * que la commande dit (références, quantités, date annoncée) : aucun prix, aucune promesse, aucune donnée de client.
 */
export function texteRelance(c: CommandeA, jour: string, signature: string | null): string {
  const retard = retardLivraison(c, jour)
  const lignes = c.lignes.map((l) => `- ${qte(l.quantite)} ${l.unite} · ${l.nom}`)
  return [
    'Bonjour,', '',
    `Je me permets de revenir vers vous au sujet de ma commande${c.reference ? ` ${c.reference}` : ''} passée le ${fr(c.commandee_le)}.`,
    retard > 0 ? `La livraison était annoncée pour le ${fr(c.livraison_prevue)} et je ne l'ai pas reçue (${retard} jour${retard > 1 ? 's' : ''} de retard).` : `La livraison est annoncée pour le ${fr(c.livraison_prevue)}.`,
    ...(lignes.length ? ['', 'Pour rappel :', ...lignes] : []),
    '', 'Pouvez-vous me confirmer la date de livraison ?', 'Merci d’avance.',
    ...(signature ? ['', signature] : []),
  ].join('\n')
}

/** Une adresse e-mail plausible (pas de validation exhaustive : la boîte du fournisseur dira le reste). */
export const adresseMail = (v: string | null | undefined): string | null => (v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? v.trim() : null)
/** Un téléphone plausible dans le champ contact (qui est un texte libre) ; null sinon. */
export const telephone = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim()
  return /^[+()\d .-]{8,20}$/.test(t) && (t.match(/\d/g) ?? []).length >= 8 ? t : null
}

// ── Validation des entrées des routes ────────────────────────────────────────────────────────────────────────
export type EntreeCommande = {
  fournisseur_id: string | null; fournisseur_nom: string; fournisseur_contact: string | null; reference: string | null
  commandee_le: string | null; livraison_prevue: string; chantier_id: string | null; note: string | null
  lignes: { materiau_id: string | null; nom: string; quantite: number; unite: string }[]
}
const ko = <T = never>(erreur: string): Resultat<T> => ({ ok: false, erreur })

/** POST /api/crm/commandes : refusée plutôt que corrigée (champ inconnu, date inexistante, 0 ligne, plus de 50 lignes). */
export function validerCommande(b: unknown, aujourdhui: string): Resultat<EntreeCommande> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const p = champsPermis(b, ['fournisseur_id', 'fournisseur', 'contact', 'reference', 'commandee_le', 'livraison_prevue', 'chantier_id', 'note', 'lignes'])
  if (!p.ok) return p
  const nom = texte(b.fournisseur, 'Fournisseur', 120, true); if (!nom.ok) return nom
  const contact = texte(b.contact, 'Contact', 200); if (!contact.ok) return contact
  const ref = texte(b.reference, 'Référence', 60); if (!ref.ok) return ref
  const note = texte(b.note, 'Note', 500); if (!note.ok) return note
  const fid = identifiant(b.fournisseur_id, 'Fournisseur'); if (!fid.ok) return fid
  const cid = identifiant(b.chantier_id, 'Chantier'); if (!cid.ok) return cid
  const cmd = date(b.commandee_le, 'Date de commande'); if (!cmd.ok) return cmd
  const liv = date(b.livraison_prevue, 'Livraison prévue'); if (!liv.ok) return liv
  if (!liv.valeur) return ko('Livraison prévue : obligatoire.')
  const debut = cmd.valeur ?? aujourdhui
  if (liv.valeur < debut) return ko('La livraison prévue ne peut pas précéder la date de commande.')
  if (!Array.isArray(b.lignes) || b.lignes.length < 1) return ko('Lignes : au moins une.')
  if (b.lignes.length > 50) return ko('Lignes : 50 au plus.')
  const lignes: EntreeCommande['lignes'] = []
  for (const l of b.lignes) {
    if (!estObjet(l)) return ko('Ligne invalide.')
    const pl = champsPermis(l, ['materiau_id', 'nom', 'quantite', 'unite']); if (!pl.ok) return pl
    const n = texte(l.nom, 'Désignation', 200, true); if (!n.ok) return n
    const q = nombre(l.quantite, 'Quantité', 0.01, 1_000_000, true); if (!q.ok) return q
    const u = texte(l.unite, 'Unité', 16); if (!u.ok) return u
    const m = identifiant(l.materiau_id, 'Matériau'); if (!m.ok) return m
    lignes.push({ materiau_id: m.valeur, nom: n.valeur!, quantite: Math.round(q.valeur! * 100) / 100, unite: u.valeur ?? 'u' })
  }
  return { ok: true, valeur: { fournisseur_id: fid.valeur, fournisseur_nom: nom.valeur!, fournisseur_contact: contact.valeur, reference: ref.valeur, commandee_le: cmd.valeur, livraison_prevue: liv.valeur, chantier_id: cid.valeur, note: note.valeur, lignes } }
}

export type ModificationCommande = { action: 'recue'; entrer_en_stock: boolean } | { action: 'annuler' } | { livraison_prevue: string }
/** PATCH /api/crm/commandes/[id] : UNE chose à la fois — marquer reçue (avec ou sans entrée en stock), annuler, ou déplacer la livraison. */
export function validerModificationCommande(b: unknown): Resultat<ModificationCommande> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const cles = Object.keys(b)
  if ('action' in b) {
    if (b.action === 'annuler') return cles.length === 1 ? { ok: true, valeur: { action: 'annuler' } } : ko('Annuler : seul.')
    if (b.action === 'recue') {
      const p = champsPermis(b, ['action', 'entrer_en_stock']); if (!p.ok) return p
      if ('entrer_en_stock' in b && typeof b.entrer_en_stock !== 'boolean') return ko('entrer_en_stock : vrai ou faux.')
      return { ok: true, valeur: { action: 'recue', entrer_en_stock: b.entrer_en_stock === true } }
    }
    return ko('Action inconnue.')
  }
  const p = champsPermis(b, ['livraison_prevue']); if (!p.ok) return p
  const d = date(b.livraison_prevue, 'Livraison prévue'); if (!d.ok) return d
  return d.valeur ? { ok: true, valeur: { livraison_prevue: d.valeur } } : ko('Livraison prévue : obligatoire.')
}

/** POST /api/crm/commandes/[id]/relancer : le message relu ET la confirmation explicite (`confirmer: true`), rien d'autre. */
export function validerRelance(b: unknown): Resultat<{ message: string }> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const p = champsPermis(b, ['message', 'confirmer']); if (!p.ok) return p
  if (b.confirmer !== true) return ko('Confirmation manquante : rien n’est envoyé sans votre accord.')
  const m = texte(b.message, 'Message', 2000, true); if (!m.ok) return m
  return { ok: true, valeur: { message: m.valeur! } }
}
