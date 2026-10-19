// CRM — la validation des entrées, et rien d'autre. Module pur (aucun import) : rejoué par scripts/crm-qa.mjs.
//
// Règle : une entrée est REFUSÉE plutôt que corrigée en silence. Un champ inconnu fait échouer la requête (une faute de
// frappe côté écran ne doit pas passer pour un enregistrement réussi), un texte trop long est refusé (pas tronqué), une
// date doit exister au calendrier. Les limites sont celles des contraintes de la migration 0141 : la base les vérifie
// aussi, mais une erreur 400 lisible vaut mieux qu'une erreur 500 de contrainte.

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string }

const ok = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur })
const ko = <T = never>(erreur: string): Resultat<T> => ({ ok: false, erreur })

export const STATUTS_CHANTIER = ['a_planifier', 'planifie', 'en_cours', 'en_pause', 'termine', 'annule'] as const
export type StatutChantier = (typeof STATUTS_CHANTIER)[number]
export const LIBELLES_STATUT_CHANTIER: Record<StatutChantier, string> = {
  a_planifier: 'À planifier', planifie: 'Planifié', en_cours: 'En cours', en_pause: 'En pause', termine: 'Terminé', annule: 'Annulé',
}
export const ROLES_MEMBRE = ['artisan', 'compagnon', 'apprenti', 'salarie', 'sous_traitant', 'autre'] as const
export type RoleMembre = (typeof ROLES_MEMBRE)[number]
export const LIBELLES_ROLE: Record<RoleMembre, string> = {
  artisan: 'Artisan', compagnon: 'Compagnon', apprenti: 'Apprenti', salarie: 'Salarié', sous_traitant: 'Sous-traitant', autre: 'Autre',
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RE_EMPREINTE = /^[0-9a-f]{64}$/

export const estUuid = (v: unknown): v is string => typeof v === 'string' && RE_UUID.test(v)
export const estEmpreinte = (v: unknown): v is string => typeof v === 'string' && RE_EMPREINTE.test(v)

/** Un objet JSON simple (pas un tableau, pas null). */
export const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Refuse tout champ hors de la liste permise. */
export function champsPermis(b: Record<string, unknown>, permis: readonly string[]): Resultat<true> {
  const inconnus = Object.keys(b).filter((k) => !permis.includes(k))
  return inconnus.length ? ko(`Champ inconnu : ${inconnus.slice(0, 3).join(', ')}.`) : ok(true)
}

/** Un texte : espaces de bord retirés ; vide → null (ou erreur si requis) ; trop long → erreur. */
export function texte(v: unknown, nom: string, max: number, requis = false): Resultat<string | null> {
  if (v === undefined || v === null) return requis ? ko(`${nom} : obligatoire.`) : ok(null)
  if (typeof v !== 'string') return ko(`${nom} : texte attendu.`)
  // Les caractères de contrôle (hors retour à la ligne et tabulation) n'ont rien à faire dans une fiche.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v)) return ko(`${nom} : caractère invalide.`)
  const t = v.trim()
  if (!t) return requis ? ko(`${nom} : obligatoire.`) : ok(null)
  if ([...t].length > max) return ko(`${nom} : ${max} caractères au plus.`)
  return ok(t)
}

/** Une date calendaire « AAAA-MM-JJ » qui existe vraiment ; '' ou null → null. */
export function date(v: unknown, nom: string): Resultat<string | null> {
  if (v === undefined || v === null || v === '') return ok(null)
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ko(`${nom} : date attendue (AAAA-MM-JJ).`)
  const [a, m, j] = v.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j || a < 2000 || a > 2100) return ko(`${nom} : date inexistante.`)
  return ok(v)
}

/** Un identifiant (uuid) ; null/'' → null si permis. */
export function identifiant(v: unknown, nom: string, requis = false): Resultat<string | null> {
  if (v === undefined || v === null || v === '') return requis ? ko(`${nom} : obligatoire.`) : ok(null)
  return estUuid(v) ? ok(v.toLowerCase()) : ko(`${nom} : identifiant invalide.`)
}

/** Un nombre fini entre deux bornes (accepte « 12,5 »). */
export function nombre(v: unknown, nom: string, min: number, max: number, requis = false): Resultat<number | null> {
  if (v === undefined || v === null || v === '') return requis ? ko(`${nom} : obligatoire.`) : ok(null)
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*-?\d+([.,]\d+)?\s*$/.test(v) ? Number(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n)) return ko(`${nom} : nombre attendu.`)
  if (n < min || n > max) return ko(`${nom} : entre ${min} et ${max}.`)
  return ok(Math.round(n * 100) / 100)
}

export function booleen(v: unknown, nom: string): Resultat<boolean> {
  return typeof v === 'boolean' ? ok(v) : ko(`${nom} : vrai ou faux attendu.`)
}

export function parmi<T extends string>(v: unknown, nom: string, liste: readonly T[]): Resultat<T> {
  return typeof v === 'string' && (liste as readonly string[]).includes(v) ? ok(v as T) : ko(`${nom} : valeur inconnue.`)
}

/**
 * Applique une table de règles à un corps de requête : seuls les champs PRÉSENTS sont validés et rendus (une
 * modification partielle ne remet pas à zéro les autres). `requis` : champs qui doivent être présents.
 */
type Regle = (v: unknown) => Resultat<unknown>
function appliquer(b: unknown, regles: Record<string, Regle>, requis: readonly string[] = []): Resultat<Record<string, unknown>> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const permis = champsPermis(b, Object.keys(regles))
  if (!permis.ok) return permis
  const sortie: Record<string, unknown> = {}
  for (const k of requis) if (!(k in b)) { const r = regles[k](undefined); if (!r.ok) return r }
  for (const [k, v] of Object.entries(b)) {
    const r = regles[k](v)
    if (!r.ok) return r
    sortie[k] = r.valeur
  }
  return ok(sortie)
}

// ── Chantier ─────────────────────────────────────────────────────────────────────────────────────────────────
export type EntreeChantier = {
  devis_id?: string | null; titre?: string | null; client_nom?: string | null
  adresse?: string | null; code_postal?: string | null; ville?: string | null
  statut?: StatutChantier; date_debut?: string | null; date_fin_prevue?: string | null; date_fin_reelle?: string | null
  vehicule_id?: string | null; notes?: string | null; equipe?: string[]; generer_taches?: boolean
}

function listeIdentifiants(v: unknown, nom: string, max: number): Resultat<string[]> {
  if (!Array.isArray(v)) return ko(`${nom} : liste attendue.`)
  if (v.length > max) return ko(`${nom} : ${max} au plus.`)
  const ids = new Set<string>()
  for (const x of v) { if (!estUuid(x)) return ko(`${nom} : identifiant invalide.`); ids.add(x.toLowerCase()) }
  return ok([...ids])
}

const REGLES_CHANTIER: Record<string, Regle> = {
  devis_id: (v) => identifiant(v, 'Devis'),
  titre: (v) => texte(v, 'Nature des travaux', 200),
  client_nom: (v) => texte(v, 'Client', 200),
  adresse: (v) => texte(v, 'Adresse', 300),
  code_postal: (v) => { const r = texte(v, 'Code postal', 10); return r.ok && r.valeur && !/^[0-9A-Za-z -]{2,10}$/.test(r.valeur) ? ko('Code postal invalide.') : r },
  ville: (v) => texte(v, 'Ville', 80),
  statut: (v) => parmi(v, 'Statut', STATUTS_CHANTIER),
  date_debut: (v) => date(v, 'Date de début'),
  date_fin_prevue: (v) => date(v, 'Fin prévue'),
  date_fin_reelle: (v) => date(v, 'Fin réelle'),
  vehicule_id: (v) => identifiant(v, 'Véhicule'),
  notes: (v) => texte(v, 'Notes', 4000),
  equipe: (v) => listeIdentifiants(v, 'Équipe', 30),
  generer_taches: (v) => booleen(v, 'Générer les tâches'),
}

/** Création : un titre OU un devis (le titre se prend alors sur le devis). */
export function validerCreationChantier(b: unknown): Resultat<EntreeChantier> {
  const r = appliquer(b, REGLES_CHANTIER)
  if (!r.ok) return r
  const v = r.valeur as EntreeChantier
  if (!v.devis_id && !v.titre) return ko('Nature des travaux : obligatoire (ou choisissez un devis signé).')
  if ('date_fin_reelle' in v && v.date_fin_reelle) return ko('Fin réelle : se pose quand le chantier est terminé.')
  return coherenceDates(v)
}

/** Modification : le devis ne se change pas (un chantier reste attaché au devis dont il est né). */
export function validerModificationChantier(b: unknown): Resultat<EntreeChantier> {
  if (estObjet(b) && ('devis_id' in b || 'generer_taches' in b)) return ko('Le devis d’un chantier ne se change pas.')
  const r = appliquer(b, REGLES_CHANTIER)
  if (!r.ok) return r
  const v = r.valeur as EntreeChantier
  if ('titre' in v && !v.titre) return ko('Nature des travaux : obligatoire.')
  if (!Object.keys(v).length) return ko('Rien à modifier.')
  return coherenceDates(v)
}

function coherenceDates(v: EntreeChantier): Resultat<EntreeChantier> {
  if (v.date_debut && v.date_fin_prevue && v.date_fin_prevue < v.date_debut) return ko('La fin prévue est avant le début.')
  return ok(v)
}

// ── Tâche ────────────────────────────────────────────────────────────────────────────────────────────────────
export type EntreeTache = { libelle?: string; faite?: boolean; ordre?: number; membre_id?: string | null; quantite?: number | null; unite?: string | null }
const REGLES_TACHE: Record<string, Regle> = {
  libelle: (v) => texte(v, 'Tâche', 300, true),
  faite: (v) => booleen(v, 'Faite'),
  ordre: (v) => { const r = nombre(v, 'Ordre', 0, 10000); return r.ok && r.valeur !== null && !Number.isInteger(r.valeur) ? ko('Ordre : entier attendu.') : r },
  membre_id: (v) => identifiant(v, 'Membre'),
  quantite: (v) => nombre(v, 'Quantité', 0, 1_000_000),
  unite: (v) => texte(v, 'Unité', 16),
}
export function validerCreationTache(b: unknown): Resultat<EntreeTache | { depuis_devis: true }> {
  if (estObjet(b) && b.depuis_devis !== undefined) {
    return b.depuis_devis === true && Object.keys(b).length === 1 ? ok({ depuis_devis: true as const }) : ko('depuis_devis : seul, et à vrai.')
  }
  const r = appliquer(b, REGLES_TACHE, ['libelle'])
  return r.ok ? ok(r.valeur as EntreeTache) : r
}
export function validerModificationTache(b: unknown): Resultat<EntreeTache> {
  const r = appliquer(b, REGLES_TACHE)
  if (!r.ok) return r
  if (!Object.keys(r.valeur).length) return ko('Rien à modifier.')
  return ok(r.valeur as EntreeTache)
}

// ── Matériau réservé ─────────────────────────────────────────────────────────────────────────────────────────
export type EntreeReservation = { materiau_id?: string; quantite?: number; lieu?: string; note?: string | null }
const REGLES_RESERVATION: Record<string, Regle> = {
  materiau_id: (v) => identifiant(v, 'Matériau', true),
  quantite: (v) => { const r = nombre(v, 'Quantité', 0.01, 1_000_000, true); return r },
  lieu: (v) => texte(v, 'Lieu', 60, true),
  note: (v) => texte(v, 'Note', 300),
}
export function validerReservation(b: unknown): Resultat<EntreeReservation> {
  const r = appliquer(b, REGLES_RESERVATION, ['materiau_id', 'quantite'])
  if (!r.ok) return r
  const v = r.valeur as EntreeReservation
  return ok({ ...v, lieu: v.lieu ?? 'atelier' })
}
/** Modifier une réservation (pas le matériau) ; ou la sortir du stock : { action: 'sortir' } seul. */
export function validerModificationReservation(b: unknown): Resultat<EntreeReservation | { action: 'sortir' }> {
  if (estObjet(b) && 'action' in b) return b.action === 'sortir' && Object.keys(b).length === 1 ? ok({ action: 'sortir' as const }) : ko('Action inconnue.')
  if (estObjet(b) && 'materiau_id' in b) return ko('Le matériau d’une réservation ne se change pas : annulez-la et réservez l’autre.')
  const r = appliquer(b, REGLES_RESERVATION)
  if (!r.ok) return r
  if (!Object.keys(r.valeur).length) return ko('Rien à modifier.')
  return ok(r.valeur as EntreeReservation)
}

// ── Véhicule ─────────────────────────────────────────────────────────────────────────────────────────────────
export type EntreeVehicule = { nom?: string; immatriculation?: string | null; conducteur_id?: string | null; controle_technique_le?: string | null; entretien_le?: string | null; notes?: string | null; actif?: boolean }
const REGLES_VEHICULE: Record<string, Regle> = {
  nom: (v) => texte(v, 'Nom du véhicule', 80, true),
  immatriculation: (v) => { const r = texte(v, 'Immatriculation', 20); return r.ok && r.valeur && !/^[0-9A-Za-z -]{2,20}$/.test(r.valeur) ? ko('Immatriculation invalide.') : r.ok && r.valeur ? ok(r.valeur.toUpperCase()) : r },
  conducteur_id: (v) => identifiant(v, 'Conducteur'),
  controle_technique_le: (v) => date(v, 'Contrôle technique'),
  entretien_le: (v) => date(v, 'Entretien'),
  notes: (v) => texte(v, 'Notes', 1000),
  actif: (v) => booleen(v, 'Actif'),
}
export function validerVehicule(b: unknown, creation: boolean): Resultat<EntreeVehicule> {
  const r = appliquer(b, REGLES_VEHICULE, creation ? ['nom'] : [])
  if (!r.ok) return r
  if (!creation && !Object.keys(r.valeur).length) return ko('Rien à modifier.')
  return ok(r.valeur as EntreeVehicule)
}

// ── Membre de l'équipe ───────────────────────────────────────────────────────────────────────────────────────
export type EntreeMembre = { nom?: string; role?: RoleMembre; telephone?: string | null; actif?: boolean }
const REGLES_MEMBRE: Record<string, Regle> = {
  nom: (v) => texte(v, 'Nom', 120, true),
  role: (v) => parmi(v, 'Rôle', ROLES_MEMBRE),
  telephone: (v) => { const r = texte(v, 'Téléphone', 30); return r.ok && r.valeur && !/^\+?[0-9 .()-]{6,30}$/.test(r.valeur) ? ko('Téléphone invalide.') : r },
  actif: (v) => booleen(v, 'Actif'),
}
export function validerMembre(b: unknown, creation: boolean): Resultat<EntreeMembre> {
  const r = appliquer(b, REGLES_MEMBRE, creation ? ['nom'] : [])
  if (!r.ok) return r
  if (!creation && !Object.keys(r.valeur).length) return ko('Rien à modifier.')
  return ok(r.valeur as EntreeMembre)
}

// ── Note ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type CibleNote = { client: string } | { chantier_id: string } | { lead_id: string }
export function validerCreationNote(b: unknown): Resultat<{ texte: string; cible: CibleNote }> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const permis = champsPermis(b, ['texte', 'client', 'chantier_id', 'lead_id'])
  if (!permis.ok) return permis
  const t = texte(b.texte, 'Note', 4000, true)
  if (!t.ok) return t
  const cibles = (['client', 'chantier_id', 'lead_id'] as const).filter((k) => b[k] !== undefined && b[k] !== null && b[k] !== '')
  if (cibles.length !== 1) return ko('Une note se rattache à UN client, UN chantier ou UNE demande.')
  const k = cibles[0]
  if (k === 'client') return estEmpreinte(b.client) ? ok({ texte: t.valeur as string, cible: { client: b.client } }) : ko('Client : identifiant invalide.')
  const id = identifiant(b[k], k === 'chantier_id' ? 'Chantier' : 'Demande', true)
  if (!id.ok) return id
  return ok({ texte: t.valeur as string, cible: k === 'chantier_id' ? { chantier_id: id.valeur as string } : { lead_id: id.valeur as string } })
}
export function validerModificationNote(b: unknown): Resultat<{ texte: string }> {
  const r = appliquer(b, { texte: (v) => texte(v, 'Note', 4000, true) }, ['texte'])
  return r.ok ? ok({ texte: r.valeur.texte as string }) : r
}

// ── Rappel (0162, crm_rappels) ────────────────────────────────────────────────────────────────────────────────
export const TYPES_RAPPEL = ['rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre'] as const
export type TypeRappelV = (typeof TYPES_RAPPEL)[number]
export type CibleRappel = { client: string } | { lead_id: string } | { devis_id: string } | { chantier_id: string }
export type EntreeRappel = { cible: CibleRappel; type: TypeRappelV; echeance: string; heure: string | null; texte: string | null }
/** Une heure « HH:MM » qui existe (00:00 à 23:59) ; '' ou null → null. */
export function heure(v: unknown, nom: string): Resultat<string | null> {
  if (v === undefined || v === null || v === '') return ok(null)
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return ko(`${nom} : heure attendue (HH:MM).`)
  return ok(v)
}
export function validerCreationRappel(b: unknown): Resultat<EntreeRappel> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const permis = champsPermis(b, ['client', 'lead_id', 'devis_id', 'chantier_id', 'type', 'echeance', 'heure', 'texte'])
  if (!permis.ok) return permis
  const cibles = (['client', 'lead_id', 'devis_id', 'chantier_id'] as const).filter((k) => b[k] !== undefined && b[k] !== null && b[k] !== '')
  if (cibles.length !== 1) return ko('Un rappel se rattache à UN client, UNE demande, UN devis ou UN chantier.')
  const k = cibles[0]
  let cible: CibleRappel
  if (k === 'client') { if (!estEmpreinte(b.client)) return ko('Client : identifiant invalide.'); cible = { client: b.client } }
  else {
    const id = identifiant(b[k], ({ lead_id: 'Demande', devis_id: 'Devis', chantier_id: 'Chantier' } as const)[k], true)
    if (!id.ok) return id
    cible = { [k]: id.valeur as string } as CibleRappel
  }
  const type = b.type === undefined ? ok('rappeler' as TypeRappelV) : parmi(b.type, 'Type', TYPES_RAPPEL)
  if (!type.ok) return type
  const e = date(b.echeance, 'Échéance')
  if (!e.ok) return e
  if (!e.valeur) return ko('Échéance : obligatoire.')
  const h = heure(b.heure, 'Heure')
  if (!h.ok) return h
  const t = texte(b.texte, 'Texte', 300)
  if (!t.ok) return t
  return ok({ cible, type: type.valeur, echeance: e.valeur, heure: h.valeur, texte: t.valeur })
}
/** Cocher (fait), décaler (échéance, heure), corriger (type, texte). La cible ne change pas. */
export type ModificationRappel = { fait?: boolean; echeance?: string; heure?: string | null; texte?: string | null; type?: TypeRappelV }
export function validerModificationRappel(b: unknown): Resultat<ModificationRappel> {
  const r = appliquer(b, {
    fait: (v) => booleen(v, 'Fait'),
    echeance: (v) => { const d = date(v, 'Échéance'); return d.ok && !d.valeur ? ko('Échéance : obligatoire.') : d },
    heure: (v) => heure(v, 'Heure'),
    texte: (v) => texte(v, 'Texte', 300),
    type: (v) => parmi(v, 'Type', TYPES_RAPPEL),
  })
  if (!r.ok) return r
  if (!Object.keys(r.valeur).length) return ko('Rien à modifier.')
  return ok(r.valeur as ModificationRappel)
}

// ── Déplacement manuel dans le pipeline ──────────────────────────────────────────────────────────────────────
export const ETAPES_PIPELINE = ['demande', 'devis_envoye', 'signe', 'chantier', 'a_facturer', 'paye'] as const
export type EtapePipeline = (typeof ETAPES_PIPELINE)[number]
export type EntreeDeplacement = { objet: 'devis' | 'lead' | 'chantier'; id: string; vers: EtapePipeline; note: string | null }
export function validerDeplacement(b: unknown): Resultat<EntreeDeplacement> {
  if (!estObjet(b)) return ko('Corps de requête invalide.')
  const permis = champsPermis(b, ['objet', 'id', 'vers', 'note'])
  if (!permis.ok) return permis
  const objet = parmi(b.objet, 'Objet', ['devis', 'lead', 'chantier'] as const)
  if (!objet.ok) return objet
  const id = identifiant(b.id, 'Dossier', true)
  if (!id.ok) return id
  const vers = parmi(b.vers, 'Colonne', ETAPES_PIPELINE)
  if (!vers.ok) return vers
  const note = texte(b.note, 'Note', 300)
  if (!note.ok) return note
  return ok({ objet: objet.valeur, id: id.valeur as string, vers: vers.valeur, note: note.valeur })
}

/** Lit un corps JSON borné (taille) : rend l'objet, ou une erreur et son statut. */
export async function lireCorps(req: Request, max = 32_768): Promise<Resultat<unknown> & { statut?: number }> {
  const annoncee = Number(req.headers.get('content-length') ?? 0)
  if (annoncee > max) return { ok: false, erreur: 'Requête trop grande.', statut: 413 }
  const brut = await req.text().catch(() => null)
  if (brut === null) return { ok: false, erreur: 'Corps illisible.', statut: 400 }
  if (brut.length > max) return { ok: false, erreur: 'Requête trop grande.', statut: 413 }
  try { return { ok: true, valeur: JSON.parse(brut) } } catch { return { ok: false, erreur: 'JSON invalide.', statut: 400 } }
}
