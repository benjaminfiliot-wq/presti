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
import { LOT_RELANCES_MAX, nombresASourcer, type EntreeAction, type LigneEntree, type NomAction } from './outils-actions'

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
  /** 02/11 (L16) — une carte de LOT : chaque relance retenue avec son texte exact, chaque exclu avec son motif. Absent : carte d'un objet. */
  lot?: LotApercu
}

/** Une relance retenue dans un lot : le message EXACT qui partira chez ce client. */
export type RetenuLot = { numero: string; client: string | null; montant_ttc: number | null; envoye_le: string | null; message: MessageCarte }
/** Un devis visé par l'ordre, écarté du lot, et pourquoi (en clair, pour l'artisan). */
export type ExcluLot = { numero: string; client: string | null; motif: string }
export type LotApercu = { retenus: RetenuLot[]; exclus: ExcluLot[] }

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

// ── Les relances groupées : UNE carte de lot (02/11, lot L16 du chantier 4) ───────────────────────────
//
// plans/011-cadrage-01-11/chantier-4-assistant-plan.md §0 bis, rang 4 et question 1 : « une consigne sur plusieurs clients donne une seule
// carte de lot » — retenus, exclus et leur motif, validée d'un geste ; un objet seul garde le « fait tout seul ». Rang 8 : « une proposition
// écartée ne revient pas » — les refus des 7 derniers jours (outil, objet, date) entrent au contexte du tour. Le prompt de Benj : « Relance
// les devis envoyés il y a plus de 5 jours » (p3-assistant.md:160). Ici, les règles PURES ; les lectures sont dans actions-serveur.ts.

/** Une carte écartée par l'artisan ne se repropose pas d'elle-même pendant ce délai (rang 8 ; même délai que le détecteur n8n). */
export const REFUS_RETENUS_JOURS = 7

/**
 * L'ordre de l'artisan vise-t-il PLUSIEURS objets ? Deux numéros de pièce ou plus, un pluriel de pièces ou de clients (« les devis »,
 * « mes factures », « ces clients »), ou un quantifieur (« tous », « chaque », « ceux qui »). Sert à refuser qu'un ordre groupé se relance
 * devis par devis : il va dans une carte de lot. Un faux positif ne coûte qu'un clic (côté sûr). Un faux négatif (« Relance Leroy et
 * Garnier », « tout le monde », « 0101 et 0102 »…) n'est PAS rattrapé par la règle du tour pour la PREMIÈRE relance du message (audit
 * 032-028, D1) : c'est motifPasUnSeul, plus bas, qui l'empêche de partir d'office — la charge de la preuve est inversée.
 */
export function ordreGroupe(texte: string | null | undefined): boolean {
  const brut = String(texte ?? '')
  if (new Set((brut.toUpperCase().match(/\b(?:DEV|FAC)-\d{4}-\d{1,6}\b/g) ?? [])).size >= 2) return true
  const n = normaliser(brut)
  return / (?:tous|toutes|chaque|ceux|celles|plusieurs) /.test(n)
    || / (?:les|ces|mes|ses|nos|vos|leurs|des) (?:\S+ ){0,2}(?:devis|factures|clients|impayes|relances) /.test(n)
}

/** Un numéro de pièce complet (DEV-2026-0012, FAC-2026-0003). */
const NUMERO_PIECE = /\b(?:DEV|FAC)-\d{4}-\d{1,6}\b/gi
/** Les numéros de pièce complets écrits dans ce message, en majuscules, sans doublon. */
export function numerosDans(texte: string | null | undefined): string[] {
  return [...new Set((String(texte ?? '').match(NUMERO_PIECE) ?? []).map((n) => n.toUpperCase()))]
}

/**
 * Le numéro d'une pièce est-il écrit dans ce message ? (Un lot ne reprend une relance écartée que si l'artisan la nomme.) À ÉGALITÉ avec
 * un numéro extrait du message (audit 032-028, D6 : par sous-chaîne, DEV-2026-1000 était « nommé » dans DEV-2026-10001). Un numéro d'une
 * autre forme ne compte que borné de part et d'autre.
 */
export function nommeDans(texte: string | null | undefined, numero: string): boolean {
  const n = String(numero ?? '').trim().toUpperCase()
  if (!n) return false
  if (/^(?:DEV|FAC)-\d{4}-\d{1,6}$/.test(n)) return numerosDans(texte).includes(n)
  const motif = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Z0-9-])${motif}(?![A-Z0-9-])`).test(String(texte ?? '').toUpperCase())
}

// ── Une relance seule ne part d'office que si l'artisan a désigné UN SEUL objet, sans doute possible (audit 032-028, D1) ──────────────
/** Les mots qui ne désignent personne : civilités, formes de société, articles. */
const MOTS_NEUTRES_NOM = new Set(['m', 'mr', 'mme', 'mlle', 'mm', 'me', 'dr', 'monsieur', 'madame', 'mademoiselle', 'messieurs', 'mesdames', 'famille',
  'ste', 'societe', 'sarl', 'sas', 'sasu', 'eurl', 'sci', 'ets', 'etablissements', 'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'et'])
/** Les mots significatifs d'un nom de client (« M. Jean Leroy » → jean, leroy). */
export function motsDuNom(nom: string | null | undefined): string[] {
  return [...new Set(normaliser(String(nom ?? '')).trim().split(' ').filter((m) => m.length >= 2 && !/^\d+$/.test(m) && !MOTS_NEUTRES_NOM.has(m)))]
}
/**
 * Ce qui, dans un message, vise PLUSIEURS objets ou personne en particulier (texte normalisé, mots entourés d'espaces). 02/11 (contre-audit
 * 032-035, E4 et E6) : les mots qui ne font que RELIER (« et », « avec », « plus », la virgule) n'y sont plus — « Bonjour, relance M. Leroy »,
 * « avec un ton ferme », « tout de suite », « plus fermement » désignent un seul client ; ils comptent seulement s'ils relient un AUTRE mot
 * que ceux d'une consigne (CONNECTEURS, plus bas). L'anglais et l'allemand des ordres groupés y entrent (« and the others », « everyone »).
 */
const MARQUES_PLUSIEURS = / (?:tous|toutes|chaque|chacun|chacune|plusieurs|autres?|reste|restant|restants|restante|restantes|totalite|ensemble|gens|monde|clients|clientes|clientele|ceux|celles|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|dizaine|douzaine|aussi|egalement|pareil|idem|others?|everyone|everybody|all|both|rest|each|every|alle|beide) /
/** Ce qui relie deux désignations (« Leroy et Garnier », « Leroy, Garnier », « Leroy and Garnier », « Leroy puis Garnier »). */
const CONNECTEURS = / (?:et|puis|ou|avec|plus|ainsi|and|und|or|then|with) /
const SEPARATEURS = /[,;&+/\n]/
/**
 * Les mots d'une CONSIGNE qui ne désignent personne : salutations, politesse, verbes et mots de la relance, ton, temps, mots-outils. Un
 * message qui RELIE des mots (CONNECTEURS, SEPARATEURS) ne prouve « un seul client » que si tous ses autres mots sont d'ici ou du nom de
 * SON client : « Relance Leroy and Garnier », Garnier absent des clients relus, ne passe plus (E6). Un mot inconnu donne une carte (côté sûr).
 */
const MOTS_DE_CONSIGNE = new Set(('bonjour bonsoir salut hello hi coucou merci thanks stp svp plait please ok oui daccord accord vite rapidement '
  + 'relance relancer relancez relances relancer relanceras remind relaunch rappelle rappeler rappel envoie envoyer envoies renvoie renvoyer ecris ecrire '
  + 'message mail email courriel devis facture piece mot gentil gentiment poli poliment courtois courtoisement cordial cordiale cordialement '
  + 'ferme fermement fermete sec doux doucement ton style formule formulation phrase texte urgent urgence important '
  + 'tout suite maintenant aujourd hui demain matin soir semaine mois jour jours depuis encore toujours deja bientot '
  + 'il elle ils elles lui leur leurs on je j me m moi tu te t toi nous vous se s ce c ca cela ceci qui que qu quoi dont ou quand comment pourquoi '
  + 'son sa ses mon ma mes ton ta tes notre votre nos vos un une le la les l de du d des au aux a en y '
  + 'ne n pas plus jamais rien bien tres trop peu sans pour par sur sous dans chez vers apres avant entre '
  + 'est etait sera serait a ont avait as ai fait faire fais dis dire dit peux peut pourrais pourriez veux voudrais merci '
  + 'repondu repond repondre reponse nouvelles signe signer attend attendu attente oublie oublier paye payer regle regler '
  + 'et puis ou avec plus ainsi and und or then with the to him her please').split(' '))
/** Un nombre qui n'est pas un numéro de pièce : une durée, un montant, un pourcentage (« depuis 5 jours », « 1 200 € »), une date (E4). */
const NOMBRE_QUI_MESURE = /\d+(?:[.,\s]\d+)*\s*(?:jours?|j\b|semaines?|sem\b|mois|ans?|années?|h\b|heures?|€|eur\b|euros?|%|ht\b|ttc\b)/gi
const DATE_ECRITE = /\b\d{1,2}(?:er)?\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)(?:\s+\d{4})?\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi

/** Deux mots presque égaux (une faute de frappe : « Garnié » pour Garnier) : distance d'édition 1, 2 à partir de 7 lettres. */
function presqueEgal(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4) return false
  const max = Math.max(a.length, b.length) >= 7 ? 2 : 1
  if (Math.abs(a.length - b.length) > max) return false
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cour = [i]
    for (let j = 1; j <= b.length; j++) cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prec = cour
  }
  return prec[b.length] <= max
}

/**
 * 02/11 (contre-audit 032-035, E1 et E2) — la marque d'une carte qui ne part JAMAIS par le pilote automatique, posée dans ses entrées à sa
 * création (comme `_contenu_client_lu`, lib/pilote/regles.ts) : sa valeur est le motif (« plusieurs clients », sujet d'escalade, désignation
 * douteuse…). Le pilote la refuse à l'entrée (lib/pilote/serveur.ts piloterCarte), au départ (lib/pilote/executeur.ts carteDe) et dans ses
 * réalisateurs. Au clic de l'artisan, elle ne change rien : la carte part comme les autres.
 */
export const MARQUE_HORS_PILOTE = '_hors_pilote'
/** Le motif hors pilote porté par des entrées de carte, ou null. */
export function motifHorsPilote(entrees: unknown): string | null {
  const v = (entrees as Record<string, unknown> | null | undefined)?.[MARQUE_HORS_PILOTE]
  if (v === undefined || v === null || v === false) return null
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 280) : 'Cette carte attend le clic de l’artisan : elle ne part pas par le pilote automatique.'
}

/** Le motif d'un message qui vise plusieurs clients (repris par actions-serveur.ts pour la carte et le pilote). */
export const MOTIF_PLUSIEURS_CLIENTS = 'Le message vise plusieurs clients (ou tout le monde) : chaque relance attend le clic de l’artisan, aucune ne part d’office ni par le pilote.'

/**
 * 02/11 (contre-audit 032-035, E1) — le message vise-t-il, à coup sûr, PLUSIEURS clients ? Un quantifieur ou un pluriel (« tout le monde »,
 * « les deux », « and the others »), ou le nom d'un AUTRE client du compte, même à une faute près (« Garnié »). Rend le motif, ou null. Sert
 * deux fois : à la preuve du « fait tout seul » (motifPasUnSeul) et, quel que soit le mode, à tenir la carte hors du pilote automatique.
 */
export function visePlusieursClients(texte: string | null | undefined, cible: { client: string | null }, autresClients: readonly (string | null)[]): string | null {
  const n = normaliser(String(texte ?? ''))
  if (MARQUES_PLUSIEURS.test(n)) return MOTIF_PLUSIEURS_CLIENTS
  const mots = n.trim().split(' ').filter(Boolean)
  const siens = motsDuNom(cible.client)
  const leSien = new Set(siens)
  const nomSien = siens.join(' ')
  const autres = new Set(autresClients.map(motsDuNom).filter((m) => m.join(' ') !== nomSien).flat().filter((m) => !leSien.has(m)))
  const nomme = (m: string) => [...autres].some((a) => presqueEgal(m, a))
  // Le nom exact d'un autre client compte toujours ; à une faute près, seulement pour un mot qui n'est pas d'une consigne.
  if (mots.some((m) => !leSien.has(m) && (autres.has(m) || (!MOTS_DE_CONSIGNE.has(m) && !MOTS_NEUTRES_NOM.has(m) && nomme(m))))) return MOTIF_PLUSIEURS_CLIENTS
  return null
}

/**
 * La PREUVE POSITIVE qu'une relance seule peut partir d'office : le message de l'artisan désigne CE devis (ou cette facture) et lui seul.
 * Rend null si c'est prouvé, sinon le motif de la carte. Prouvé seulement si : aucun quantifieur ni autre client nommé (visePlusieursClients),
 * aucun mot inconnu relié par « et », « avec », une virgule… (E6), aucun autre numéro (ni complet ni abrégé ; une date écrite n'en est pas
 * un, E4), et soit le numéro complet de la pièce, soit un mot du nom de SON client qu'aucun autre client du compte ne porte — à condition que
 * ce client n'ait qu'UNE pièce en attente (`piecesDuClient`, E7 : le nom désigne un client, pas un objet). Dans le doute : une carte (un clic).
 * Ne lit pas ordreGroupe (refusé en amont, actions-serveur.ts) : les deux gardes se cumulent sans se masquer.
 */
export function motifPasUnSeul(texte: string | null | undefined, cible: { numero: string; client: string | null }, autresClients: readonly (string | null)[], piecesDuClient?: number): string | null {
  const brut = String(texte ?? '')
  const doute = 'Je n’ai pas pu être sûr du client visé : la relance attend le clic de l’artisan, elle ne part pas d’office.'
  const plusieurs = visePlusieursClients(brut, cible, autresClients)
  if (plusieurs) return plusieurs
  const n = normaliser(brut)
  const mots = n.trim().split(' ').filter(Boolean)
  const siens = motsDuNom(cible.client)
  const leSien = new Set(siens)
  const numero = String(cible.numero ?? '').toUpperCase()
  const leNumero = new Set(normaliser(numero).trim().split(' '))
  if ((CONNECTEURS.test(n) || SEPARATEURS.test(brut.replace(DATE_ECRITE, ' ')))
    && mots.some((m) => !leSien.has(m) && !leNumero.has(m) && !MOTS_DE_CONSIGNE.has(m) && !MOTS_NEUTRES_NOM.has(m))) {
    return 'Je n’ai pas pu être sûr du client visé (le message relie le nom à d’autres mots) : la relance attend le clic de l’artisan.'
  }
  const numeros = numerosDans(brut)
  if (numeros.length > 1 || (numeros.length === 1 && numeros[0] !== numero)) return 'Le numéro écrit par l’artisan n’est pas celui de cette pièce : la relance attend son clic.'
  if (/\d/.test(brut.replace(NUMERO_PIECE, ' ').replace(DATE_ECRITE, ' ').replace(NOMBRE_QUI_MESURE, ' '))) return 'Le message porte un numéro incomplet ou abrégé : la relance attend le clic de l’artisan.'
  if (numeros.length === 1) return null
  const nomSien = siens.join(' ')
  const autres = new Set(autresClients.map(motsDuNom).filter((m) => m.join(' ') !== nomSien).flat())
  if (!siens.some((m) => mots.includes(m) && !autres.has(m))) return doute
  if (piecesDuClient !== undefined && piecesDuClient !== 1) return `Ce client a ${piecesDuClient > 1 ? `${piecesDuClient} pièces` : 'des pièces'} en attente et le message ne dit pas laquelle : la relance attend le clic de l’artisan.`
  return null
}

/**
 * Les objets dont une carte a été ÉCARTÉE par l'artisan depuis `depuis` : une carte d'un objet (objet_id), ou une carte de lot (chacun de ses
 * retenus, entrees.lot[].id). Rend id → date du refus la plus récente. `outil` : seules ses cartes comptent (le détecteur n8n fait de même).
 */
export function refusRecents(fiches: readonly { outil: string; statut: string; objet_id: string | null; entrees: unknown; maj_le: string }[], outil: string, depuis: Date): Map<string, string> {
  const out = new Map<string, string>()
  const garder = (idObjet: unknown, le: string) => {
    if (typeof idObjet !== 'string' || !idObjet) return
    const avant = out.get(idObjet)
    if (!avant || avant < le) out.set(idObjet, le)
  }
  for (const f of fiches) {
    if (f.outil !== outil || f.statut !== 'refusee') continue
    const le = String(f.maj_le ?? '')
    const t = Date.parse(le)
    // Une date illisible compte comme récente (côté sûr : la relance n'est pas reproposée seule).
    if (Number.isFinite(t) && t < depuis.getTime()) continue
    garder(f.objet_id, le)
    const lot = (f.entrees as { lot?: unknown } | null)?.lot
    if (Array.isArray(lot)) for (const m of lot) garder((m as { id?: unknown } | null)?.id, le)
  }
  return out
}

/** La phrase d'un refus récent, pour l'artisan (motif d'un exclu, ou réponse au modèle). */
export const phraseEcartee = (le: string): string => `relance écartée par vous${fmtDate(le) ? ` le ${fmtDate(le)}` : ''} : pas reproposée (nommez le devis pour la relancer quand même)`

/** Le libellé d'une ligne de lot : numéro, client, montant, date d'envoi. */
const ligneRetenu = (r: RetenuLot): string => [r.numero, r.client?.trim() || 'client sans nom', r.montant_ttc !== null ? `${fmtEuros(r.montant_ttc)} TTC` : null, r.envoye_le ? `envoyé le ${fmtDate(r.envoye_le)}` : null].filter(Boolean).join(' · ')

/**
 * L'aperçu d'une carte de LOT de relances de devis : ce que l'artisan lit avant son unique clic. Les retenus (avec le texte exact de chaque
 * relance, dans `lot`, et le premier en entier dans `message`), les exclus et leur motif, le critère de l'ordre. Irréversible : une fois
 * confirmé, les e-mails partent. Au plus LOT_RELANCES_MAX retenus (au-delà, le serveur refuse avant d'appeler cette fonction).
 */
export function apercuLotRelances(p: { lot: LotApercu; ton: string; critere: string; alertes?: readonly string[] }): Apercu {
  const { retenus, exclus } = p.lot
  if (!retenus.length) throw new Error('lot de relances sans retenu')
  if (retenus.length > LOT_RELANCES_MAX) throw new Error('lot de relances trop grand')
  const n = retenus.length, k = exclus.length
  return {
    titre: `Relancer ${n} devis${k ? ` · ${k} exclu${k > 1 ? 's' : ''}` : ''}`,
    lignes: [
      { label: 'Ordre', valeur: p.critere },
      ...retenus.map((r) => ({ label: 'À relancer', valeur: ligneRetenu(r) })),
      ...exclus.map((x) => ({ label: 'Exclu', valeur: `${x.numero}${x.client?.trim() ? ` · ${x.client.trim()}` : ''} — ${x.motif}` })),
      { label: 'Ton', valeur: p.ton },
    ],
    avant_apres: [],
    message: retenus[0].message,
    alertes: [
      n > 1 ? `Chaque client reçoit SA relance, à son nom, avec le numéro, le montant et la date de son devis (ci-dessus, celle de ${retenus[0].numero}).` : 'Un seul devis retenu : sa relance est ci-dessus.',
      'Un lot ne part jamais d’office : rien n’est envoyé avant votre clic sur « Confirmer ». « Écarter » ne relance personne.',
      ...(p.alertes ?? []),
    ],
    irreversible: true,
    lien: { href: '/devis', libelle: 'Ouvrir les devis' },
    lot: { retenus: retenus.map((r) => ({ ...r })), exclus: exclus.map((x) => ({ ...x })) },
  }
}

// ── Les lignes d'un devis, chiffrées avec les tarifs de l'artisan ────────────────────────────────────

export type TarifLu = { id: string; designation: string; unite: string | null; prix_ht: number | string; tva_taux: number | string | null }
export type LigneDevisResolue = { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number; source_prix: string }

/**
 * 02/11 (contre-audit 032-004, D1 bis) — la provenance d'un prix sans tarif que l'artisan n'a PAS écrit lui-même : recopié d'une donnée lue
 * (un autre devis, peut-être une estimation) ou d'une réponse de l'assistant. La ligne garde son prix, mais ce prix n'est pas sourcé
 * (lib/pilote/regles.ts ligneSourcee) : le devis ne part jamais seul, l'artisan le relit d'abord.
 */
export const SOURCE_REPRISE = 'prix repris d’une donnée, à vérifier'

/**
 * Les PRIX (en centimes) écrits par l'ARTISAN lui-même : son message et ses messages de l'historique, jamais une réponse de l'assistant ni
 * une donnée lue. Un prix est un nombre qui porte une marque de prix : « 450 € », « 450 euros », « 450 HT », « 45 le m² », « € 450 ».
 * 02/11 (troisième audit 032-005, A3) : une quantité (« 45 m² »), une date (« le 15/11 »), un numéro (« 12 rue… », « DEV-2026-0120 »)
 * n'en est pas — ils coïncidaient avec une estimation recopiée et en faisaient un « prix donné par l'artisan ».
 */
const NOMBRE_PRIX = String.raw`\d{1,3}(?:[   .]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`
const PRIX_ECRIT = new RegExp(String.raw`€\s*(${NOMBRE_PRIX})|(${NOMBRE_PRIX})\s*(?:€|euros?\b|eur\b|e\s?ht\b|e\s?ttc\b|ht\b|ttc\b|(?:le|la|l'|l’|par|/)\s*(?:m2|m²|m3|m³|ml|m\b|mètre|metre|heure|h\b|pièce|piece|unité|unite|u\b|jour|forfait))`, 'gi')
// 02/11 (quatrième audit 032-006) : un prix marqué TTC n'est pas un prix HT ; jamais le nombre lui-même : « 450 € TTC » refuse 450 posé
// dans un champ HT.
// 02/11 (cinquième audit 032-007, « TTC ») : les autres graphies — « TVA comprise », « TVA incluse », « taxes comprises », « (TTC) »,
// « TVAC », et « TTC » écrit AVANT le nombre (« Prix TTC 450 € », « TTC : 450 € ») — et le TAUX : seule la forme HT au taux de TVA de
// la pièce est admise (450 € TTC à 10 % : 409,09 € HT ; 375 € HT, la forme à 20 %, ne l'est plus à 10 %).
const TTC_APRES = /^\s*(?:€\s*)?\(?\s*(?:ttc|t\.t\.c|toutes taxes|tvac\b|t\.?v\.?a\.?\s*(?:compris|inclus)|taxes?\s*(?:compris|inclus))/i
const HT_APRES = /^\s*(?:€\s*)?\(?\s*(?:h\.?t\b|hors tax)/i
// « TTC » juste avant le nombre, séparé par une espace, « : », « = », « de » ou « à » ; jamais le « TTC » qui suit un nombre précédent
// (« 450 € TTC, 300 € HT » : 300 reste HT — la virgule, ou l'« HT » qui suit, le disent).
const TTC_AVANT = /(\d\s*(?:€|euros?|eur)?\s*\(?\s*)?(?:ttc|t\.t\.c\.?|toutes taxes comprises|tvac|t\.?v\.?a\.? (?:comprise|incluse)|taxes (?:comprises|incluses))\s*\)?\s*[:=]?\s*(?:de |à |a )?(?:€\s*)?$/i
/** Le nombre trouvé à `debut` (match `m0`) dans `texte` est-il marqué TTC ? */
function marqueTtc(texte: string, debut: number, m0: string): boolean {
  if (/\bht\b/i.test(m0)) return false
  if (/ttc/i.test(m0)) return true
  const apres = texte.slice(debut + m0.length, debut + m0.length + 20)
  if (HT_APRES.test(apres)) return false
  if (TTC_APRES.test(apres)) return true
  const avant = TTC_AVANT.exec(texte.slice(Math.max(0, debut - 28), debut))
  return !!avant && !avant[1]
}
/** Les taux de TVA d'une pièce (lib/assistant/outils-actions.ts TVA_TAUX) ; défaut du produit : 10 %. */
const TAUX_TVA = [0, 5.5, 10, 20] as const
/**
 * Les prix écrits par l'artisan, en centimes HT, pour une pièce au taux de TVA `tvaTaux` (défaut 10 %, celui des lignes sans tarif) :
 * un prix sans marque de taxe tel quel ; un prix marqué TTC par sa seule forme HT à ce taux.
 */
export function prixEcrits(textes: readonly string[], tvaTaux: number = 10): Set<number> {
  const taux = (TAUX_TVA as readonly number[]).includes(tvaTaux) ? tvaTaux : 10
  const s = new Set<number>()
  for (const t of textes) {
    const texte = String(t ?? '')
    for (const m of texte.matchAll(PRIX_ECRIT)) {
      const ttc = marqueTtc(texte, m.index ?? 0, m[0])
      for (const n of nombresDe(m[1] ?? m[2] ?? '')) {
        s.add(Math.round((ttc ? Math.abs(n) / (1 + taux / 100) : Math.abs(n)) * 100))
      }
    }
  }
  return s
}
/**
 * Le prix `prixHt` n'est la forme HT d'un prix TTC écrit par l'artisan qu'à un AUTRE taux que `tvaTaux` : rend ces taux (vide sinon).
 * Sert à refuser par « prix TTC donné : quel taux de TVA ? » plutôt que d'enregistrer un HT au taux deviné (cinquième audit 032-007).
 */
export function tauxTtcPossibles(textes: readonly string[], prixHt: number, tvaTaux: number = 10): number[] {
  const c = Math.round(prixHt * 100)
  return TAUX_TVA.filter((t) => t !== tvaTaux && prixEcrits(textes, t).has(c) && !prixEcrits(textes, tvaTaux).has(c))
}

/**
 * Chaque ligne s'appuie sur un tarif de l'artisan (le prix vient de lui, pas du modèle) ou sur un prix que l'artisan a donné
 * (déjà vérifié par verifierSources). Une ligne sans prix reste à 0 € et est SIGNALÉE : « à chiffrer ».
 * 02/11 (D1 bis) : « prix donné par l'artisan » seulement si ce nombre est dans `nombresArtisan` (prixEcrits de ce qu'il a écrit) ;
 * sinon SOURCE_REPRISE, signalé dans `aVerifier`. Absent : aucun nombre n'est le sien (côté sûr).
 */
export function resoudreLignes(lignes: readonly LigneEntree[], tarifs: ReadonlyMap<string, TarifLu>, nombresArtisan: ReadonlySet<number> = new Set()): { lignes: LigneDevisResolue[]; aChiffrer: string[]; aVerifier: string[]; introuvables: string[] } {
  const out: LigneDevisResolue[] = []
  const aChiffrer: string[] = []
  const aVerifier: string[] = []
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
    const parLArtisan = donne && nombresArtisan.has(Math.round((l.prix_unitaire_ht as number) * 100))
    if (donne && !parLArtisan) aVerifier.push(l.designation)
    out.push({ designation: l.designation, quantite: l.quantite, unite: l.unite || 'u', prix_unitaire_ht: donne ? (l.prix_unitaire_ht as number) : 0, tva_taux: 10, source_prix: !donne ? 'à chiffrer' : parLArtisan ? 'prix donné par l’artisan' : SOURCE_REPRISE })
  }
  return { lignes: out, aChiffrer, aVerifier, introuvables }
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
