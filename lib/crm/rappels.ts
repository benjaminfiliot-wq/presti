// CRM — les RAPPELS et RENDEZ-VOUS de l'artisan (plan plans/crm-idees-twenty-1810.md, n°1 ; table crm_rappels, migration 0162).
// Module pur (imports purs seulement) : rejoué par scripts/crm-lot2-qa.mjs.
//
//  • « À faire aujourd'hui » : les rappels non faits dont l'échéance est passée (en retard) ou aujourd'hui, puis les 7 jours suivants ;
//  • « Prochain rendez-vous » d'une fiche : le premier rappel de type visite / métré / rendez-vous à venir sur ses pièces ;
//  • les ÉCHÉANCES RAPIDES (demain, dans 3 jours, lundi) d'un geste « Me le rappeler » ;
//  • les DEVIS À RELANCER : envoyés, sans réponse depuis plus de 7 jours, encore valables — la même règle que la tuile « Relances
//    dues » (lib/tableau-de-bord/calculer.ts, `aRelancer`), lue depuis le même calcul, plus ce qui manquait : le geste.
//    La date d'envoi (`envoye_le`) n'est enregistrée que depuis le 18/10 (audit de cohérence, C1) : sans elle, on retombe sur la
//    date d'émission, puis de création, et l'écran dit « date d'envoi inconnue » (jamais une date inventée présentée comme sûre).
//  • le MESSAGE de relance préparé (l'artisan le relit et le modifie avant tout envoi ; sans lien, sans prix inventé).
import { jourParis } from '../comptaTableau.ts'
import { TYPES_RAPPEL, type TypeRappelV } from './valider.ts'
import { rattacherCle } from './clients.ts'
import { SEUIL_RELANCE_JOURS, VALIDITE_PAR_DEFAUT_JOURS } from '../tableau-de-bord/calculer.ts'

// La liste des types vit dans lib/crm/valider.ts (validation des routes) : une seule écriture.
export { TYPES_RAPPEL }
export type TypeRappel = TypeRappelV
export const LIBELLES_RAPPEL: Record<TypeRappel, string> = {
  rappeler: 'Rappeler', relancer_devis: 'Relancer le devis', visite: 'Visite technique', metre: 'Métré', rendez_vous: 'Rendez-vous', autre: 'À faire',
}
/** Les types qui sont des RENDEZ-VOUS (la case « Prochain rendez-vous » de la fiche client). */
export const TYPES_RENDEZ_VOUS: readonly TypeRappel[] = ['visite', 'metre', 'rendez_vous']

export type RappelLigne = {
  id: string; artisan_id?: string | null
  client_cle: string | null; lead_id: string | null; devis_id: string | null; chantier_id: string | null
  type: string; echeance: string; heure: string | null; texte: string | null; fait_le: string | null; origine: string; cree_le?: string | null
  /** Le message qui accompagne le rappel (relance d'un devis) est parti à cet instant. */
  envoye_le?: string | null
}
/** Un rappel tel que l'écran le montre : sa cible lisible et son lien. */
export type Rappel = RappelLigne & { cible: { objet: 'client' | 'lead' | 'devis' | 'chantier'; libelle: string; href: string | null }; retard: number }

const jourMs = (j: string) => Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10))
export const ecartJours = (de: string, a: string): number => Math.round((jourMs(a) - jourMs(de)) / 86_400_000)
export const ajouterJours = (j: string, n: number): string => new Date(jourMs(j) + n * 86_400_000).toISOString().slice(0, 10)

/** Les échéances proposées d'un toucher : demain, dans 3 jours, lundi prochain (jamais aujourd'hui : « plus tard » par définition). */
export function echeancesRapides(jour: string): { libelle: string; echeance: string }[] {
  const jds = new Date(jourMs(jour)).getUTCDay() // 0 dimanche … 6 samedi
  const versLundi = ((8 - jds) % 7) || 7
  return [
    { libelle: 'Demain', echeance: ajouterJours(jour, 1) },
    { libelle: 'Dans 3 jours', echeance: ajouterJours(jour, 3) },
    { libelle: 'Lundi', echeance: ajouterJours(jour, versLundi) },
  ]
}

/** Le tri d'une liste de rappels : par jour, puis heure (sans heure en premier dans la journée), puis création. */
export const trierRappels = <T extends Pick<RappelLigne, 'echeance' | 'heure' | 'id'>>(l: readonly T[]): T[] =>
  [...l].sort((a, b) => a.echeance.localeCompare(b.echeance) || String(a.heure ?? '').localeCompare(String(b.heure ?? '')) || a.id.localeCompare(b.id))

export type AFaire = { enRetard: Rappel[]; aujourdhui: Rappel[]; semaine: Rappel[]; total: number }

/** « À faire aujourd'hui » : en retard + aujourd'hui (non faits), et ce qui vient dans les 7 jours. */
export function aFaire(rappels: readonly Rappel[], jour: string): AFaire {
  const ouverts = trierRappels(rappels.filter((r) => !r.fait_le))
  const enRetard = ouverts.filter((r) => r.echeance < jour)
  const aujourdhui = ouverts.filter((r) => r.echeance === jour)
  const fin = ajouterJours(jour, 7)
  const semaine = ouverts.filter((r) => r.echeance > jour && r.echeance <= fin)
  return { enRetard, aujourdhui, semaine, total: enRetard.length + aujourdhui.length }
}

/** Le prochain rendez-vous (visite, métré, rendez-vous) non fait, aujourd'hui ou après, parmi des rappels déjà filtrés sur la fiche. */
export function prochainRendezVous<T extends Pick<RappelLigne, 'type' | 'echeance' | 'heure' | 'fait_le' | 'id'>>(rappels: readonly T[], jour: string): T | null {
  return trierRappels(rappels.filter((r) => !r.fait_le && TYPES_RENDEZ_VOUS.includes(r.type as TypeRappel) && r.echeance >= jour))[0] ?? null
}

/**
 * Les rappels d'une fiche : ceux qui visent le client lui-même ou une de ses pièces. `cible` : les identifiants des pièces de la
 * fiche (un client : ses demandes, devis, chantiers ; un chantier : lui-même et son devis).
 */
export function rappelsDe<T extends Pick<RappelLigne, 'client_cle' | 'lead_id' | 'devis_id' | 'chantier_id'>>(rappels: readonly T[], cible: { client?: string | null; leads?: readonly string[]; devis?: readonly string[]; chantiers?: readonly string[] }): T[] {
  const l = new Set(cible.leads ?? []), d = new Set(cible.devis ?? []), c = new Set(cible.chantiers ?? [])
  return rappels.filter((r) => (!!cible.client && r.client_cle === cible.client) || (!!r.lead_id && l.has(r.lead_id)) || (!!r.devis_id && d.has(r.devis_id)) || (!!r.chantier_id && c.has(r.chantier_id)))
}

// ── Les devis à relancer ─────────────────────────────────────────────────────────────────────────────────────────────────
export { SEUIL_RELANCE_JOURS }
export type DevisR = { id: string; artisan_id?: string | null; statut?: string | null; numero?: string | null; objet?: string | null; client_nom?: string | null; client_email?: string | null; lead_id?: string | null; total_ttc?: number | string | null; envoye_le?: string | null; date_emission?: string | null; created_at?: string | null; validite_jours?: number | string | null }
export type DevisARelancer = {
  devisId: string; numero: string | null; objet: string | null; client: string | null; email: string | null; montant: number
  /** Jour de l'envoi (ou de l'émission, à défaut) ; `dateSure` faux si la vraie date d'envoi n'est pas connue (C1). */
  envoyeLe: string; dateSure: boolean; jours: number
  /** Un rappel « relancer le devis » est déjà posé (non fait) : le geste propose de le traiter, pas d'en poser un second. */
  rappelId: string | null
  /** Relances déjà envoyées depuis le CRM (rappels « relancer le devis » dont le message est parti, crm_rappels.envoye_le). */
  relances: number
}

const jourDe = (v: string | null | undefined): string | null => {
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : jourParis(new Date(t))
}
const centimes = (v: number | string | null | undefined): number => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN; return Number.isFinite(n) ? Math.round(n * 100) : 0 }

/**
 * Les devis envoyés restés sans réponse depuis PLUS de 7 jours et encore valables (validité du devis, 90 jours par défaut) : les
 * seuils sont ceux de lib/tableau-de-bord/calculer.ts, importés ; le compte est celui de la tuile « Relances dues » (scripts/crm-lot2-qa.mjs le vérifie).
 */
export function devisARelancer(p: { artisanId: string; devis: readonly DevisR[]; rappels: readonly Pick<RappelLigne, 'id' | 'devis_id' | 'type' | 'fait_le' | 'envoye_le'>[]; jour: string }): DevisARelancer[] {
  const sortie: DevisARelancer[] = []
  for (const d of p.devis) {
    if (d.artisan_id !== p.artisanId || d.statut !== 'envoye') continue
    const sure = jourDe(d.envoye_le)
    const envoye = sure ?? jourDe(d.date_emission) ?? jourDe(d.created_at)
    if (!envoye) continue
    const jours = ecartJours(envoye, p.jour)
    const validite = Number(d.validite_jours) > 0 ? Number(d.validite_jours) : VALIDITE_PAR_DEFAUT_JOURS
    if (jours <= SEUIL_RELANCE_JOURS || jours > validite) continue
    const r = p.rappels.find((x) => x.devis_id === d.id && x.type === 'relancer_devis' && !x.fait_le)
    sortie.push({
      devisId: d.id, numero: d.numero ?? null, objet: d.objet ?? null, client: d.client_nom ?? null, email: d.client_email ?? null, montant: centimes(d.total_ttc),
      envoyeLe: envoye, dateSure: !!sure, jours, rappelId: r?.id ?? null, relances: p.rappels.filter((x) => x.devis_id === d.id && !!x.envoye_le).length,
    })
  }
  return sortie.sort((a, b) => b.jours - a.jours || a.devisId.localeCompare(b.devisId))
}

/**
 * Le message de relance d'un devis, PRÉPARÉ : l'artisan le relit et le modifie avant « Envoyer ». Court, poli, sans lien, sans
 * prix (le montant est dans le devis déjà envoyé), sans délai inventé ; il ne promet rien que l'artisan n'ait écrit.
 */
export function messageRelanceDevis(p: { client: string | null; numero: string | null; objet: string | null; envoyeLe: string; dateSure: boolean; relances: number; signature: string | null }): string {
  const fr = (j: string) => j.split('-').reverse().join('/')
  const quoi = p.objet ? `pour « ${p.objet} »` : p.numero ? `n° ${p.numero}` : ''
  const quand = p.dateSure ? ` le ${fr(p.envoyeLe)}` : ''
  const lignes = [p.client ? `Bonjour ${p.client},` : 'Bonjour,', '']
  lignes.push(p.relances > 0
    ? `Je reviens vers vous une dernière fois au sujet du devis ${quoi}${quand}.`.replace(/\s+\./, '.')
    : `Je me permets de revenir vers vous au sujet du devis ${quoi} que je vous ai envoyé${quand}.`.replace(/\s+\./, '.'))
  lignes.push('Avez-vous pu le consulter ? Si vous avez des questions ou souhaitez un ajustement, je reste à votre disposition.')
  lignes.push('', 'Bien cordialement,')
  if (p.signature) lignes.push(p.signature)
  return lignes.join('\n').replace(/  +/g, ' ')
}

/** Habille les rappels pour l'écran : la cible lisible (client, demande, devis, chantier) et son lien, et les jours de retard. */
export function habillerRappels(rappels: readonly RappelLigne[], p: {
  jour: string
  devis: readonly { id: string; numero?: string | null; objet?: string | null; client_nom?: string | null }[]
  leads: readonly { id: string; type_chantier?: string | null; nom_prospect?: string | null }[]
  chantiers: readonly { id: string; titre?: string | null }[]
  /** Les clients (lib/crm/clients.ts) : identifiant actuel ET anciennes clés (audit de cohérence C4 : un e-mail ajouté change l'id). */
  clients: readonly { id: string; nom: string | null; anciens?: readonly string[] }[]
}): Rappel[] {
  const dv = new Map(p.devis.map((x) => [x.id, x])), ld = new Map(p.leads.map((x) => [x.id, x])), ch = new Map(p.chantiers.map((x) => [x.id, x]))
  return trierRappels(rappels).map((r) => {
    let cible: Rappel['cible']
    if (r.devis_id) { const d = dv.get(r.devis_id); cible = { objet: 'devis', libelle: [d?.numero ? `Devis ${d.numero}` : 'Devis', d?.client_nom].filter(Boolean).join(' · '), href: `/devis/${r.devis_id}` } }
    else if (r.chantier_id) cible = { objet: 'chantier', libelle: ch.get(r.chantier_id)?.titre?.trim() || 'Chantier', href: `/crm/chantiers/${r.chantier_id}` }
    else if (r.lead_id) { const l = ld.get(r.lead_id); cible = { objet: 'lead', libelle: [l?.type_chantier || 'Demande', l?.nom_prospect].filter(Boolean).join(' · '), href: '/messages' } }
    else { const c = r.client_cle ? rattacherCle(p.clients, r.client_cle) : null; cible = { objet: 'client', libelle: c?.nom ?? 'Client', href: c ? `/crm/clients/${c.id}` : null } }
    return { ...r, cible, retard: !r.fait_le && r.echeance < p.jour ? ecartJours(r.echeance, p.jour) : 0 }
  })
}

// ── « Relancer » un devis : la décision et le contrôle du message (POST /api/crm/relances, …/envoyer) ─────────────────────────
export const MAX_RELANCES_DEVIS = 3
/** Un devis se relance s'il est ENVOYÉ (pas signé, refusé, expiré ni brouillon), a une adresse e-mail, et moins de 3 relances. */
export function decisionRelance(devis: { statut?: string | null; client_email?: string | null } | null, relancesEnvoyees: number):
  { ok: true } | { ok: false; statut: 404 | 409 | 422; erreur: string } {
  if (!devis) return { ok: false, statut: 404, erreur: 'Devis introuvable.' }
  if (devis.statut !== 'envoye') return { ok: false, statut: 409, erreur: devis.statut === 'accepte' ? 'Ce devis est déjà signé : rien à relancer.' : 'Seul un devis envoyé, sans réponse, se relance.' }
  if (!devis.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(devis.client_email.trim())) return { ok: false, statut: 422, erreur: 'Ce devis n’a pas d’adresse e-mail : relancez le client par téléphone, puis cochez le rappel.' }
  if (relancesEnvoyees >= MAX_RELANCES_DEVIS) return { ok: false, statut: 409, erreur: `Ce devis a déjà été relancé ${MAX_RELANCES_DEVIS} fois : appelez plutôt le client.` }
  return { ok: true }
}
/**
 * Le message que l'artisan a relu : 10 à 4 000 caractères, et AUCUN lien (même règle que les relances d'impayés,
 * lib/relancesImpayes.ts : un lien dans une relance ressemble à de l'hameçonnage, et le devis est déjà chez le client).
 */
export function controlerMessageRelance(m: unknown): { ok: true; texte: string } | { ok: false; erreur: string } {
  if (typeof m !== 'string') return { ok: false, erreur: 'Message : texte attendu.' }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(m)) return { ok: false, erreur: 'Message : caractère invalide.' }
  const t = m.replace(/\r\n/g, '\n').trim()
  if ([...t].length < 10) return { ok: false, erreur: 'Message trop court.' }
  if ([...t].length > 4000) return { ok: false, erreur: 'Message : 4 000 caractères au plus.' }
  if (/https?:\/\/|www\.|(?<![@\w.-])[a-z0-9-]+\.(fr|com|net|org|io|app)\b/i.test(t)) return { ok: false, erreur: 'Pas de lien dans une relance : le devis est déjà chez le client (et un lien ressemble à une arnaque).' }
  return { ok: true, texte: t }
}
