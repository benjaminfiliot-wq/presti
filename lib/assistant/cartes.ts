// L'assistant de gestion de la console — les CARTES d'action et les règles pures qui les entourent (plans/016, jalon A3).
//
// Module pur (ni réseau, ni base), rejoué par scripts/assistant-qa.mjs :
//  • le contenu d'une carte (ce que l'artisan lit avant de cliquer « Confirmer ») et son cycle de vie ;
//  • la résolution d'un nom ou d'un numéro vers UN objet de l'artisan, sans jamais choisir à sa place quand c'est ambigu ;
//  • les textes des relances, FIXES (le modèle n'écrit rien dans un e-mail de relance : pas d'injection, pas d'invention) ;
//  • la règle des nombres : un prix, un pourcentage ou une quantité de stock qui part dans une écriture doit venir de ce que
//    l'artisan a écrit ou d'une donnée lue — jamais du modèle seul ;
//  • les lignes d'un devis chiffrées avec les tarifs de l'artisan (le prix vient de SES tarifs, le modèle ne le fixe pas).
import { nombresDe, normaliser } from './cadrage'
import { nombresASourcer, type EntreeAction, type LigneEntree, type NomAction } from './outils-actions'

// ── Le cycle de vie d'une action ────────────────────────────────────────────────────────────────────

export const STATUTS_ACTION = ['en_attente', 'en_cours', 'executee', 'refusee', 'annulee', 'expiree', 'echec'] as const
export type StatutAction = typeof STATUTS_ACTION[number]
/** Une carte à confirmer n'attend pas indéfiniment : passé ce délai, elle expire (et ne s'exécute plus). */
export const VALIDITE_CARTE_MS = 24 * 3600 * 1000

export type LigneCarte = { label: string; valeur: string }
export type AvantApres = { libelle: string; avant: string; apres: string }
export type MessageCarte = { a: string; objet: string; texte: string }

/** Ce que l'artisan lit : stocké avec l'action (colonne `apercu`), rendu tel quel à l'écran. */
export type Apercu = {
  titre: string
  lignes: LigneCarte[]
  avant_apres: AvantApres[]
  /** Le message EXACT qui partira (e-mail ou réponse au client). */
  message: MessageCarte | null
  /** Ce qui mérite d'être lu avant de confirmer (acompte déjà facturé, e-mail manquant…). */
  alertes: string[]
  /** Vrai : une fois confirmée, l'action ne se défait pas (e-mail parti, facture scellée, encaissement). */
  irreversible: boolean
  lien: { href: string; libelle: string } | null
}

/** La carte telle que l'écran la reçoit : l'aperçu + l'état de l'action. */
export type CarteAction = Apercu & {
  id: string
  outil: NomAction
  mode: 'direct' | 'confirmation'
  statut: StatutAction
  /** Un clic sur « Annuler » défait l'action (directe, exécutée, avec de quoi la défaire). */
  annulable: boolean
  /** Ce que fait le clic sur « Annuler » (« Remettre le prix à 45,00 € »). */
  annulation_libelle: string | null
  resultat: string | null
  cree_le: string
  expire_le: string | null
}

/** De quoi défaire une action directe : un outil et ses entrées, rejoués par le serveur (jamais écrits par le modèle). */
export type Annulation = { outil: string; entrees: Record<string, unknown>; libelle: string }

/** Une carte expirée ou close ne s'exécute plus. */
export function peutConfirmer(a: { statut: string; expire_le: string | null }, maintenant = new Date()): { ok: true } | { ok: false; motif: 'deja_traitee' | 'expiree' } {
  if (a.statut !== 'en_attente') return { ok: false, motif: 'deja_traitee' }
  if (a.expire_le && new Date(a.expire_le).getTime() < maintenant.getTime()) return { ok: false, motif: 'expiree' }
  return { ok: true }
}

// ── Retrouver UN objet par son nom ───────────────────────────────────────────────────────────────────

export type Trouve<T> = { ok: true; item: T } | { ok: false; erreur: string; candidats: string[] }

/**
 * Retrouve un objet de l'artisan par un nom ou un mot. D'abord l'égalité (accents et casse ignorés), puis « contient »,
 * puis « tous les mots sont contenus ». Zéro résultat ou plusieurs : un refus qui liste les candidats — jamais un choix
 * silencieux (supprimer, facturer ou envoyer le mauvais objet est le pire des échecs).
 */
export function trouverUnique<T>(items: readonly T[], texte: string, labels: (t: T) => string[], nature: string): Trouve<T> {
  const q = normaliser(texte).trim()
  if (!q) return { ok: false, erreur: `${nature} : nom manquant`, candidats: [] }
  const nl = (t: T) => labels(t).map((l) => normaliser(l).trim()).filter(Boolean)
  const exacts = items.filter((t) => nl(t).includes(q))
  const contient = exacts.length ? exacts : items.filter((t) => nl(t).some((l) => l.includes(q)))
  const mots = q.split(/\s+/).filter((m) => m.length > 1)
  const tous = contient.length || mots.length < 2 ? contient : items.filter((t) => nl(t).some((l) => mots.every((m) => l.includes(m))))
  if (tous.length === 1) return { ok: true, item: tous[0] }
  const montres = (tous.length ? tous : items).slice(0, 6).map((t) => labels(t)[0] ?? '?')
  if (!tous.length) return { ok: false, erreur: `${nature} introuvable : « ${texte} ».${items.length ? ' Ceux que je vois : ' + montres.join(' ; ') + '.' : ''}`, candidats: montres }
  return { ok: false, erreur: `${nature} ambigu : « ${texte} » correspond à ${tous.length} éléments (${montres.join(' ; ')}). Demande à l'artisan lequel.`, candidats: montres }
}

// ── Les nombres qui doivent venir de l'artisan ───────────────────────────────────────────────────────

/**
 * Rend un message d'erreur pour le modèle si un nombre à sourcer (prix hors tarif, pourcentage, quantité de stock) ne figure
 * dans AUCUNE source (ce que l'artisan a écrit, données lues pendant le tour). Null si tout est sourcé.
 */
export function verifierSources(nom: NomAction, entree: EntreeAction, sources: readonly string[]): string | null {
  const aSourcer = nombresASourcer(nom, entree)
  if (!aSourcer.length) return null
  const connus = new Set<number>()
  for (const s of sources) for (const n of nombresDe(s)) connus.add(Math.round(n * 100))
  const fautifs = aSourcer.filter(({ valeur }) => valeur !== 0 && valeur !== 1 && !connus.has(Math.round(Math.abs(valeur) * 100)) && !connus.has(Math.round(valeur * 100)))
  if (!fautifs.length) return null
  return `Le nombre ${fautifs.map((f) => `${f.valeur} (${f.champ})`).join(', ')} ne figure ni dans ce que l'artisan t'a écrit ni dans les données lues : ne l'invente pas. Demande-le-lui (en chiffres), ou utilise un tarif de lire_tarifs.`
}

/** Les nombres d'un texte sortant (réponse à un client) : tous doivent avoir une source. Rend les nombres fautifs. */
export function nombresSansSource(texte: string, sources: readonly string[]): string[] {
  const connus = new Set<number>()
  for (const s of sources) for (const n of nombresDe(s)) connus.add(Math.round(n * 100))
  const fautifs: string[] = []
  for (const m of String(texte ?? '').matchAll(/\d{1,3}(?:[   .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)) {
    const lectures = nombresDe(m[0])
    if (!lectures.length || lectures.some((n) => n === 0 || n === 1)) continue
    if (lectures.some((n) => connus.has(Math.round(n * 100)))) continue
    fautifs.push(m[0].trim())
  }
  return [...new Set(fautifs)]
}

// ── Formats ──────────────────────────────────────────────────────────────────────────────────────────

export const fmtEuros = (n: number | string | null | undefined): string => {
  const v = Number(n)
  return `${(Number.isFinite(v) ? v : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
export const fmtDate = (iso: string | null | undefined): string => {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
export const fmtNombre = (n: number | string | null | undefined): string => {
  const v = Number(n)
  return (Number.isFinite(v) ? v : 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

// ── Les textes de relance : fixes ────────────────────────────────────────────────────────────────────

const salut = (client: string | null) => (client?.trim() ? `Bonjour ${client.trim()},` : 'Bonjour,')

export function texteRelanceDevis(p: { client: string | null; numero: string; objet: string | null; totalTtc: number | null; envoyeLe: string | null; validiteJours: number | null; artisan: string; ton: 'cordial' | 'ferme' }): { objet: string; texte: string } {
  const quand = p.envoyeLe ? ` que je vous ai envoyé le ${fmtDate(p.envoyeLe)}` : ' que je vous ai envoyé'
  const montant = p.totalTtc !== null ? `, d'un montant de ${fmtEuros(p.totalTtc)} TTC` : ''
  const objet = p.objet?.trim() ? ` (${p.objet.trim()})` : ''
  const validite = p.validiteJours ? ` Pour mémoire, il est valable ${p.validiteJours} jours.` : ''
  const corps = p.ton === 'ferme'
    ? `Je reviens vers vous au sujet du devis ${p.numero}${objet}${montant},${quand}, resté sans réponse à ce jour.${validite}\n\nPour pouvoir planifier mon intervention, merci de me faire connaître votre décision dans les meilleurs délais, ou de me dire ce qui vous retient : je peux ajuster le devis si besoin.`
    : `Je me permets de revenir vers vous au sujet du devis ${p.numero}${objet}${montant},${quand}. Avez-vous pu en prendre connaissance ?${validite}\n\nJe reste à votre disposition pour toute question, ou pour ajuster le devis si besoin.`
  return { objet: `Votre devis ${p.numero} — ${p.artisan}`, texte: `${salut(p.client)}\n\n${corps}\n\nBien cordialement,\n${p.artisan}` }
}

export function texteRelanceFacture(p: { client: string | null; numero: string; totalTtc: number | null; echeance: string | null; joursRetard: number | null; artisan: string; ton: 'cordial' | 'ferme' }): { objet: string; texte: string } {
  const montant = p.totalTtc !== null ? ` d'un montant de ${fmtEuros(p.totalTtc)} TTC` : ''
  const ech = p.echeance ? `, arrivée à échéance le ${fmtDate(p.echeance)}` : ''
  const corps = p.ton === 'ferme'
    ? `La facture ${p.numero}${montant}${ech}, reste impayée à ce jour${p.joursRetard && p.joursRetard > 0 ? ` (${p.joursRetard} jour${p.joursRetard > 1 ? 's' : ''} après son échéance)` : ''}.\n\nJe vous remercie de bien vouloir la régler sans délai, ou de me contacter dès aujourd'hui si un point pose difficulté. Si le règlement vient de partir, merci de ne pas tenir compte de ce message.`
    : `Sauf erreur ou omission de ma part, la facture ${p.numero}${montant}${ech}, n'a pas encore été réglée.\n\nSi le règlement est déjà parti, merci de ne pas tenir compte de ce message. Sinon, pourriez-vous y procéder prochainement ? Je reste joignable si vous avez la moindre question.`
  return { objet: `Facture ${p.numero} — ${p.artisan}`, texte: `${salut(p.client)}\n\n${corps}\n\nBien cordialement,\n${p.artisan}` }
}

// ── Les lignes d'un devis, chiffrées avec les tarifs de l'artisan ────────────────────────────────────

export type TarifLu = { id: string; designation: string; unite: string | null; prix_ht: number | string; tva_taux: number | string | null }
export type LigneDevisResolue = { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number; source_prix: string }

/**
 * Chaque ligne s'appuie sur un tarif de l'artisan (le prix vient de lui, pas du modèle) ou sur un prix que l'artisan a donné
 * (déjà vérifié par verifierSources). Une ligne sans prix reste à 0 € et est SIGNALÉE : « à chiffrer ».
 */
export function resoudreLignes(lignes: readonly LigneEntree[], tarifs: ReadonlyMap<string, TarifLu>): { lignes: LigneDevisResolue[]; aChiffrer: string[]; introuvables: string[] } {
  const out: LigneDevisResolue[] = []
  const aChiffrer: string[] = []
  const introuvables: string[] = []
  for (const l of lignes) {
    if (l.tarif_id) {
      const t = tarifs.get(l.tarif_id)
      if (!t) { introuvables.push(l.designation || l.tarif_id); continue }
      const tva = Number(t.tva_taux)
      out.push({ designation: l.designation || t.designation, quantite: l.quantite, unite: l.unite || t.unite || 'u', prix_unitaire_ht: Number(t.prix_ht), tva_taux: Number.isFinite(tva) ? tva : 10, source_prix: 'tarif de l’artisan' })
      continue
    }
    const donne = l.prix_unitaire_ht !== null && l.prix_unitaire_ht > 0
    if (!donne) aChiffrer.push(l.designation)
    out.push({ designation: l.designation, quantite: l.quantite, unite: l.unite || 'u', prix_unitaire_ht: donne ? (l.prix_unitaire_ht as number) : 0, tva_taux: 10, source_prix: donne ? 'prix donné par l’artisan' : 'à chiffrer' })
  }
  return { lignes: out, aChiffrer, introuvables }
}

/** Les lignes retirées d'un devis : par position (« 2 », 1 = première) ou par désignation. Rend les indices (0-based) à retirer, et ce qui n'a pas été trouvé. */
export function indicesARetirer(designations: readonly string[], demandes: readonly string[]): { indices: number[]; introuvables: string[] } {
  const indices = new Set<number>()
  const introuvables: string[] = []
  for (const d of demandes) {
    const t = d.trim()
    if (/^\d{1,3}$/.test(t)) {
      const i = Number(t) - 1
      if (i >= 0 && i < designations.length) indices.add(i); else introuvables.push(t)
      continue
    }
    const q = normaliser(t).trim()
    const i = designations.findIndex((x) => normaliser(x).trim() === q)
    if (i >= 0) indices.add(i); else introuvables.push(t)
  }
  return { indices: [...indices].sort((a, b) => a - b), introuvables }
}

// ── Les liens ────────────────────────────────────────────────────────────────────────────────────────

export type TypeObjet = 'devis' | 'conversation' | 'facture' | 'chantier' | 'article' | 'tarif' | 'tache' | 'note' | 'membre'
export const TYPES_OBJET: readonly TypeObjet[] = ['devis', 'conversation', 'facture', 'chantier', 'article', 'tarif', 'tache', 'note', 'membre']

export function lienDe(type: TypeObjet | null, id: string | null): { href: string; libelle: string } | null {
  if (!type) return null
  switch (type) {
    case 'devis': return id ? { href: `/devis/${id}`, libelle: 'Ouvrir le devis' } : { href: '/devis', libelle: 'Ouvrir les devis' }
    case 'conversation': return id ? { href: `/messages?lead=${id}`, libelle: 'Ouvrir la conversation' } : { href: '/messages', libelle: 'Ouvrir Messages' }
    case 'facture': return { href: '/factures', libelle: 'Ouvrir les factures' }
    case 'chantier': case 'tache': case 'note': case 'membre': return id && type === 'chantier' ? { href: `/crm/chantiers/${id}`, libelle: 'Ouvrir le chantier' } : { href: '/crm', libelle: 'Ouvrir le CRM' }
    case 'article': return { href: '/inventaire', libelle: 'Ouvrir l’inventaire' }
    case 'tarif': return { href: '/tarifs', libelle: 'Ouvrir les tarifs' }
  }
}
