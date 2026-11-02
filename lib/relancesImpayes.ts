// Les relances AUTOMATIQUES des factures impayées (15/10/2026) — la partie PURE : quoi envoyer, à qui, quand, avec quel texte.
// L'envoi lui-même (lecture de la base, e-mail, mémoire de ce qui est parti) vit dans lib/relancesImpayesTour.ts, appelé par
// la tâche planifiée quotidienne (app/api/cron/relances) ; la base derrière, dans lib/relancesImpayesMagasin.ts.
//
// Règles (scripts/relances-impayes-qa.mjs les fait respecter) :
//  • DÉSACTIVÉ par défaut : rien ne part tant que l'artisan n'a pas coché « Relancer automatiquement mes factures échues ».
//  • Calendrier en jours APRÈS L'ÉCHÉANCE, défaut J+3, J+10, J+21 ; 1 à 3 relances, chacune entre 1 et 90 jours, deux relances
//    consécutives espacées d'au moins 2 jours.
//  • Une relance ne vise qu'une facture ÉMISE, échue, avec une adresse e-mail client valable, non arrêtée. Payée, annulée (avoir),
//    avoir elle-même, sans échéance : jamais.
//  • Le client a écrit depuis l'échéance (ou depuis la relance précédente) : les relances de CETTE facture s'arrêtent, et le journal
//    garde la raison. L'artisan peut aussi les arrêter, ou les reprendre, facture par facture.
//  • Jamais deux relances le même jour au même client ; au plus MAX_PAR_COMPTE_JOUR par compte et par jour ; le retard de passage
//    ne déclenche pas de rafale (une relance par passage, espacée de ECART_MIN jours de la précédente).
//  • Les factures échues depuis très longtemps lors de l'activation ne sont pas relancées en rafale : RATTRAPAGE_JOURS de tolérance
//    après le jour prévu, au-delà l'artisan les traite lui-même (relance préparée par l'assistant, ou « Mes chiffres »).
//  • Le texte est celui de l'artisan (modifiable, prévisualisable) ; le message dit qu'il est automatique ; aucun lien n'y figure.
//  • 25/10 (Benj, deux offres) : en SIGNATURE (`factures.relances.auto`) la relance part seule ; en STUDIO (`factures.relances` seule)
//    elle est préparée (statut « a_valider », sujet et texte gardés), l'artisan est prévenu, et rien ne part tant qu'il ne l'a pas
//    envoyée lui-même ; une relance préparée bloque sa facture jusqu'à ce qu'il l'envoie ou l'écarte (« rejetee »).
import { centimes, euros, jourParis } from './comptaTableau.ts'

export const MAX_RELANCES = 3
export const JOUR_MIN = 1
export const JOUR_MAX = 90
export const ECART_MIN = 2
export const RATTRAPAGE_JOURS = 10
export const MAX_PAR_COMPTE_JOUR = 10
export const TEXTE_MAX = 1500
export const TEXTE_MIN = 20
export const JOURS_PAR_DEFAUT: readonly number[] = [3, 10, 21]
const EMAIL_SIMPLE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/

export type Rang = 1 | 2 | 3
export type ReglagesRelances = { actif: boolean; jours: number[]; textes: Partial<Record<Rang, string>>; actif_depuis: string | null }
export const REGLAGES_RELANCES_PAR_DEFAUT: ReglagesRelances = { actif: false, jours: [...JOURS_PAR_DEFAUT], textes: {}, actif_depuis: null }

export const adresseValable = (v: unknown): v is string => typeof v === 'string' && v.length <= 254 && EMAIL_SIMPLE.test(v.trim())

// ─── Les textes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les variables que l'artisan peut glisser dans son texte. */
export const VARIABLES = ['client', 'numero', 'montant', 'echeance', 'retard', 'artisan'] as const
export type Variable = (typeof VARIABLES)[number]
export const DESCRIPTION_VARIABLES: Record<Variable, string> = {
  client: 'le nom du client', numero: 'le numéro de la facture', montant: 'le montant TTC', echeance: 'la date d’échéance', retard: 'le nombre de jours de retard', artisan: 'votre nom',
}

export const TEXTES_PAR_DEFAUT: Record<Rang, string> = {
  1: 'Bonjour {client},\n\nSauf erreur ou omission de ma part, la facture {numero} de {montant} TTC, arrivée à échéance le {echeance}, n’a pas encore été réglée.\n\nSi le règlement est déjà parti, merci de ne pas tenir compte de ce message. Sinon, pourriez-vous y procéder prochainement ?\n\nBien cordialement,\n{artisan}',
  2: 'Bonjour {client},\n\nJe me permets de revenir vers vous au sujet de la facture {numero} de {montant} TTC, échue depuis le {echeance} ({retard}), qui reste impayée à ce jour.\n\nPourriez-vous me confirmer la date de règlement prévue ? Si un point pose difficulté, dites-le-moi : nous trouverons une solution.\n\nBien cordialement,\n{artisan}',
  3: 'Bonjour {client},\n\nLa facture {numero} de {montant} TTC, échue depuis le {echeance} ({retard}), n’est toujours pas réglée.\n\nMerci de procéder au règlement sans nouveau délai, ou de me contacter dès aujourd’hui si un point l’empêche.\n\nBien cordialement,\n{artisan}',
}

/** Ajouté en pied de chaque relance, non modifiable : le client sait qu’il s’agit d’un rappel automatique et comment répondre. */
export const PIED_AUTOMATIQUE = 'Ce rappel a été envoyé automatiquement. Si vous avez déjà réglé cette facture, ou si quelque chose pose problème, répondez simplement à ce message.'

const dateFr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const retardEnMots = (n: number) => (n > 0 ? `${n} jour${n > 1 ? 's' : ''} de retard` : 'échéance du jour')

export type VariablesRelance = Record<Variable, string>
export function variablesDe(p: { client: string | null; numero: string | null; totalTtc: number | string | null; echeance: string; joursRetard: number; artisan: string | null }): VariablesRelance {
  return {
    client: p.client?.trim() || 'Madame, Monsieur',
    numero: p.numero?.trim() || '(sans numéro)',
    montant: euros(centimes(p.totalTtc)),
    echeance: dateFr(p.echeance),
    retard: retardEnMots(p.joursRetard),
    artisan: p.artisan?.trim() || 'Votre artisan',
  }
}

/** Remplace {variable} ; une variable inconnue reste telle quelle (la validation les refuse avant). */
export const remplir = (modele: string, v: VariablesRelance): string => modele.replace(/\{([a-z]+)\}/g, (m, k: string) => ((VARIABLES as readonly string[]).includes(k) ? v[k as Variable] : m))

/** Le texte d'une relance : celui de l'artisan s'il en a écrit un pour ce rang, sinon le texte par défaut. */
export function texteDeLaRelance(rang: Rang, reglages: Pick<ReglagesRelances, 'textes'>, v: VariablesRelance): string {
  const propre = reglages.textes[rang]
  return remplir(typeof propre === 'string' && propre.trim() ? propre : TEXTES_PAR_DEFAUT[rang], v)
}

export const sujetDeLaRelance = (numero: string | null, artisan: string | null): string =>
  `Rappel — facture ${numero?.trim() || 'impayée'}${artisan?.trim() ? ` — ${artisan.trim()}` : ''}`.replace(/[\r\n]+/g, ' ').slice(0, 150)

/** Le message tel que le client le recevra (corps + pied automatique). */
export const messageComplet = (corps: string): string => `${corps.trim()}\n\n—\n${PIED_AUTOMATIQUE}`

// 25/10 (Benj) — offre Studio : la relance est PRÉPARÉE chaque matin, puis l'artisan la valide (capacité `factures.relances` sans
// `factures.relances.auto`). Le message qui part alors n'a pas été « envoyé automatiquement » : son pied ne le prétend pas.
export const PIED_VALIDE = 'Si vous avez déjà réglé cette facture, ou si quelque chose pose problème, répondez simplement à ce message.'
/** Le message préparé, tel que le client le recevra une fois validé (corps + pied sans « automatiquement »). */
export const messageAValider = (corps: string): string => `${corps.trim()}\n\n—\n${PIED_VALIDE}`
/** Longueur maximale d'un message préparé, pied compris (l'artisan peut le retoucher avant de l'envoyer). */
export const MESSAGE_VALIDE_MAX = TEXTE_MAX + 400
export const SUJET_MAX = 150

/** Valide le sujet et le texte d'une relance préparée, éventuellement retouchés par l'artisan. Rend le couple nettoyé, ou l'erreur. */
export function lireRelanceRetouchee(sujet: unknown, texte: unknown): { ok: true; sujet: string; texte: string } | { ok: false; erreur: string } {
  if (typeof sujet !== 'string' || typeof texte !== 'string') return { ok: false, erreur: 'Relance illisible.' }
  const s = sujet.replace(/[\r\n]+/g, ' ').trim()
  const t = texte.replace(/\r\n/g, '\n').trim()
  if (!s) return { ok: false, erreur: 'Le sujet est vide.' }
  if (s.length > SUJET_MAX) return { ok: false, erreur: `Le sujet est trop long (${SUJET_MAX} caractères au plus).` }
  if (t.length < TEXTE_MIN) return { ok: false, erreur: `Le message est trop court (au moins ${TEXTE_MIN} caractères).` }
  if (t.length > MESSAGE_VALIDE_MAX) return { ok: false, erreur: `Le message est trop long (${MESSAGE_VALIDE_MAX} caractères au plus).` }
  if (/https?:\/\/|www\./i.test(t) || /https?:\/\/|www\./i.test(s)) return { ok: false, erreur: 'Pas de lien dans une relance : écrivez votre message sans adresse de site.' }
  return { ok: true, sujet: s, texte: t }
}

/** La notification à l'artisan quand une relance attend sa validation (offre Studio). Le sujet est imposé par la décision du 25/10. */
export function notificationPreparee(p: { numero: string | null; client: string | null; rang: number }): { sujet: string; texte: string } {
  const numero = p.numero?.trim() || 'sans numéro'
  return {
    sujet: `Relance de facture prête à valider — ${numero}`.replace(/[\r\n]+/g, ' ').slice(0, SUJET_MAX),
    texte: `La relance ${p.rang} de la facture ${numero}${p.client?.trim() ? ` (${p.client.trim()})` : ''} est prête. Ouvrez Factures pour la relire, la retoucher si besoin et l’envoyer d’un clic : rien ne part sans votre validation.`,
  }
}

/** Valide un texte écrit par l'artisan : longueur, variables connues, aucun lien. Null = valable. */
export function erreurTexte(t: string): string | null {
  const s = t.trim()
  if (s.length < TEXTE_MIN) return `Le texte est trop court (au moins ${TEXTE_MIN} caractères).`
  if (s.length > TEXTE_MAX) return `Le texte est trop long (${TEXTE_MAX} caractères au plus).`
  if (/https?:\/\/|www\./i.test(s)) return 'Pas de lien dans une relance automatique : écrivez votre message sans adresse de site.'
  for (const m of s.matchAll(/\{([^{}]*)\}/g)) if (!(VARIABLES as readonly string[]).includes(m[1])) return `La variable {${m[1]}} n’existe pas. Disponibles : ${VARIABLES.map((x) => `{${x}}`).join(', ')}.`
  if (/[{}]/.test(s.replace(/\{[a-z]+\}/g, ''))) return 'Accolades mal fermées dans le texte.'
  return null
}

// ─── Les réglages ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function erreurJours(j: unknown): string | null {
  if (!Array.isArray(j) || j.length < 1 || j.length > MAX_RELANCES) return `Le calendrier compte de 1 à ${MAX_RELANCES} relances.`
  if (!j.every((x) => Number.isInteger(x) && x >= JOUR_MIN && x <= JOUR_MAX)) return `Chaque relance tombe entre ${JOUR_MIN} et ${JOUR_MAX} jours après l’échéance.`
  for (let i = 1; i < j.length; i++) if (j[i] - j[i - 1] < ECART_MIN) return `Laissez au moins ${ECART_MIN} jours entre deux messages.`
  return null
}

/** Valide ce que l'artisan envoie depuis l'écran. Rien n'est deviné : une erreur nomme la raison. */
export function lireReglagesRelances(brut: unknown): { ok: true; reglages: Pick<ReglagesRelances, 'actif' | 'jours' | 'textes'> } | { ok: false; erreur: string } {
  if (typeof brut !== 'object' || brut === null) return { ok: false, erreur: 'Réglages illisibles.' }
  const b = brut as Record<string, unknown>
  if (typeof b.actif !== 'boolean') return { ok: false, erreur: 'Réglages illisibles.' }
  const jours = Array.isArray(b.jours) ? b.jours.map(Number) : null
  const e = erreurJours(jours)
  if (e) return { ok: false, erreur: e }
  const textes: Partial<Record<Rang, string>> = {}
  if (b.textes !== undefined && b.textes !== null) {
    if (typeof b.textes !== 'object' || Array.isArray(b.textes)) return { ok: false, erreur: 'Textes illisibles.' }
    for (const [k, v] of Object.entries(b.textes as Record<string, unknown>)) {
      if (!['1', '2', '3'].includes(k)) return { ok: false, erreur: 'Textes illisibles.' }
      if (v === null || v === '' || (typeof v === 'string' && v.trim() === TEXTES_PAR_DEFAUT[+k as Rang].trim())) continue
      if (typeof v !== 'string') return { ok: false, erreur: 'Textes illisibles.' }
      if (+k > (jours as number[]).length) continue
      const et = erreurTexte(v)
      if (et) return { ok: false, erreur: `Relance ${k} : ${et}` }
      textes[+k as Rang] = v.trim()
    }
  }
  return { ok: true, reglages: { actif: b.actif, jours: jours as number[], textes } }
}

// ─── La décision ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export type FactureRelancable = {
  id: string; artisan_id: string; numero: string | null; statut: string | null; avoir_de: string | null
  date_echeance: string | null; total_ttc: number | string | null; client_nom: string | null; client_email: string | null; devis_id?: string | null
}
export type EntreeJournal = { facture_id: string; rang: number; jour: string; statut: string; envoyee_le?: string | null }

export type RaisonRien =
  | 'inactif' | 'pas_emise' | 'annulee' | 'avoir' | 'payee' | 'sans_echeance' | 'pas_echue' | 'sans_email' | 'montant_nul'
  | 'arretee' | 'client_a_repondu' | 'termine' | 'trop_ancienne' | 'trop_tot' | 'pas_encore' | 'deja_aujourdhui' | 'a_valider' | 'deja_relancee_ailleurs'
export type Decision = { action: 'envoyer'; rang: Rang; joursRetard: number; destinataire: string } | { action: 'rien'; raison: RaisonRien }

export const ecartJours = (a: string, b: string): number =>
  Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86_400_000)

export const LIBELLE_RAISON: Record<RaisonRien, string> = {
  inactif: 'Relances automatiques désactivées', pas_emise: 'Facture non émise', annulee: 'Facture annulée', avoir: 'Avoir : rien à relancer', payee: 'Facture payée',
  sans_echeance: 'Pas de date d’échéance', pas_echue: 'Pas encore échue', sans_email: 'Pas d’adresse e-mail client valable', montant_nul: 'Montant nul',
  arretee: 'Relances arrêtées', client_a_repondu: 'Le client a répondu', termine: 'Toutes les relances prévues sont parties', trop_ancienne: 'Échue depuis trop longtemps pour une relance automatique',
  trop_tot: 'Prochaine relance trop proche de la précédente', pas_encore: 'Prochaine relance pas encore due', deja_aujourdhui: 'Un message est déjà parti aujourd’hui vers ce client',
  a_valider: 'Une relance préparée attend votre validation',
  deja_relancee_ailleurs: 'Ce client a été relancé il y a moins de 3 jours par un autre chemin (assistant, CRM ou conversation)',
}

/**
 * Faut-il relancer cette facture aujourd'hui, et laquelle ? PURE : ne lit rien, n'écrit rien.
 *  • `journal` : les relances déjà prises ou parties POUR CETTE FACTURE (ou pour le compte entier : le filtre est refait ici).
 *  • `arretee` : l'artisan, ou une réponse du client, a arrêté les relances de cette facture.
 *  • `reponseClient` : le client a écrit depuis la référence (échéance, ou relance précédente). Calculée par l'appelant, seulement
 *    quand une relance serait due (c'est une lecture de plus).
 *  • `destinatairesDuJour` : les adresses déjà jointes aujourd'hui par ce compte.
 *  • `relanceeAilleurs` (02/11, S4) : le registre commun (lib/relancesRegistre.ts) dit que ce client a été relancé par un AUTRE chemin
 *    depuis moins de 3 jours, ou qu'il est illisible. Calculée par l'appelant, seulement quand une relance serait due.
 */
export function decider(p: {
  facture: FactureRelancable; reglages: ReglagesRelances; journal: readonly EntreeJournal[]; arretee: boolean
  reponseClient?: boolean; destinatairesDuJour?: ReadonlySet<string>; relanceeAilleurs?: boolean; maintenant: Date
}): Decision {
  const { facture: f, reglages: r } = p
  const rien = (raison: RaisonRien): Decision => ({ action: 'rien', raison })
  if (!r.actif) return rien('inactif')
  if (f.avoir_de) return rien('avoir')
  if (f.statut === 'annulee') return rien('annulee')
  if (f.statut === 'payee') return rien('payee')
  if (f.statut !== 'emise') return rien('pas_emise')
  if (centimes(f.total_ttc) <= 0) return rien('montant_nul')
  if (!f.date_echeance || !/^\d{4}-\d{2}-\d{2}/.test(f.date_echeance)) return rien('sans_echeance')
  if (!adresseValable(f.client_email)) return rien('sans_email')
  if (p.arretee) return rien('arretee')

  const aujourdhui = jourParis(p.maintenant)
  const retard = ecartJours(aujourdhui, f.date_echeance.slice(0, 10))
  if (retard <= 0) return rien('pas_echue')

  const siennes = p.journal.filter((e) => e.facture_id === f.id)
  // Offre Studio : une relance préparée qui attend la validation de l'artisan bloque la facture — ni reproposée, ni suivie de la
  // suivante, tant qu'il ne l'a ni envoyée ni écartée. Toute ligne du journal (prise, à valider, envoyée, écartée) occupe son rang.
  if (siennes.some((e) => e.statut === 'a_valider')) return rien('a_valider')
  const rangsPris = new Set(siennes.map((e) => e.rang))
  // Les relances encore à faire, dans l'ordre. Celle qu'on envoie : la première dont le jour est venu ET dont la fenêtre
  // (jour prévu + RATTRAPAGE_JOURS) n'est pas close — un retard de passage se rattrape, une vieille facture ne déclenche pas de rafale.
  const libres = r.jours.map((jour, i) => ({ rang: (i + 1) as Rang, jour })).filter((x) => !rangsPris.has(x.rang))
  if (!libres.length) return rien('termine')
  const choisie = libres.find((x) => retard >= x.jour && retard <= x.jour + RATTRAPAGE_JOURS)
  if (!choisie) return rien(libres.some((x) => retard < x.jour) ? 'pas_encore' : 'trop_ancienne')
  const rang = choisie.rang
  const dernier = siennes.map((e) => e.jour).sort().at(-1)
  if (dernier && ecartJours(aujourdhui, dernier) < ECART_MIN) return rien('trop_tot')

  const destinataire = f.client_email!.trim().toLowerCase()
  if (p.destinatairesDuJour?.has(destinataire)) return rien('deja_aujourdhui')
  if (p.reponseClient) return rien('client_a_repondu')
  if (p.relanceeAilleurs) return rien('deja_relancee_ailleurs')
  return { action: 'envoyer', rang, joursRetard: retard, destinataire }
}

/** Le moment à partir duquel un message du client compte comme une réponse : la dernière relance envoyée ou la reprise par l'artisan, sinon l'échéance. */
export function referenceReponse(f: Pick<FactureRelancable, 'id' | 'date_echeance'>, journal: readonly EntreeJournal[], repriseLe?: string | null): string {
  const jalons = journal.filter((e) => e.facture_id === f.id && e.envoyee_le).map((e) => e.envoyee_le as string)
  if (repriseLe) jalons.push(repriseLe)
  return jalons.sort().at(-1) ?? `${(f.date_echeance ?? '').slice(0, 10)}T00:00:00Z`
}
export type ArretFacture = { raison: 'artisan' | 'reponse_client'; le: string; reprise_le: string | null }

/** Ce que l'écran montre pour une facture : l'état en une ligne. Pur, pour que l'écran et le juge lisent la même chose. */
export function etatPourEcran(p: { facture: FactureRelancable; reglages: ReglagesRelances; journal: readonly EntreeJournal[]; arret: Pick<ArretFacture, 'raison' | 'le'> | null; maintenant: Date }): string | null {
  const f = p.facture
  const envoyees = p.journal.filter((e) => e.facture_id === f.id && e.statut === 'envoyee').sort((a, b) => a.rang - b.rang)
  const dernier = envoyees.at(-1)
  if (p.arret) return p.arret.raison === 'reponse_client' ? `Relances arrêtées : le client a répondu (${dateFr(p.arret.le)})` : `Relances arrêtées par vous (${dateFr(p.arret.le)})`
  const enAttente = p.journal.find((e) => e.facture_id === f.id && e.statut === 'a_valider')
  if (enAttente) return `Relance ${enAttente.rang} prête à valider (préparée le ${dateFr(enAttente.jour)})`
  if (dernier && envoyees.length >= p.reglages.jours.length) return `Relance ${dernier.rang} envoyée le ${dateFr(dernier.envoyee_le ?? dernier.jour)} — dernière prévue`
  if (dernier) return `Relance ${dernier.rang} envoyée le ${dateFr(dernier.envoyee_le ?? dernier.jour)}`
  if (!p.reglages.actif || f.statut !== 'emise' || f.avoir_de || !f.date_echeance) return null
  const prochain = p.reglages.jours[0]
  const dateRelance = new Date(Date.parse(`${f.date_echeance.slice(0, 10)}T12:00:00Z`) + prochain * 86_400_000).toISOString().slice(0, 10)
  return dateRelance >= jourParis(p.maintenant) ? `Première relance prévue le ${dateFr(dateRelance)}` : null
}
