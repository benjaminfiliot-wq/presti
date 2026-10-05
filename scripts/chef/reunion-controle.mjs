// scripts/chef/reunion-controle.mjs — le compte rendu de la réunion du chef, vu par le RELAIS d'IA (scripts/usine/chef-modele.mjs).
//
// Quand Codex est à bout, la réunion passe par un moteur de secours (modèle libre, appel direct). Ce module lui donne la même aide
// qu'au cycle du chef (validerPlan, scripts/chef/commun.mjs) :
//   - exempleReunion / limitesReunion : les limites EXACTES du compte rendu et un exemple de JSON valide, dits au modèle ;
//   - validerReunion                  : les écarts (un chemin et une raison, jamais une valeur) que le relais rend au modèle pour correction ;
//   - reduireReunion                  : en dernier recours, une réduction déterministe SÛRE (ligne trop longue coupée sur une limite de mot,
//                                       objectif non conforme → null, idées au-delà de 3 retirées) — jamais un contenu inventé.
// validerReunion est le MIROIR des contrôles de scripts/chef/reunion.mjs (le validateur qui décide, lui, de clore ou d'abandonner) : un plan
// accepté ici l'est là-bas ; les juges (relais-ia-qa RC-11) comparent les deux sur les mêmes plans. Ce module ne remplace jamais reunion.mjs.
// Node seul, aucun effet de bord à l'import.

const HEURE = 3_600_000
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const TELEPHONE = /(?:\+33|0033|\b0)\s?[1-9](?:[\s.-]?\d{2}){4}\b/
const SECRETS = [
  /\b(?:sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{20,}/, /\bwhsec_[A-Za-z0-9]{10,}/, /\bsk-ant-[A-Za-z0-9_-]{10,}/, /\bre_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bAIza[A-Za-z0-9_-]{35}/, /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
]
const MESURES = [null, 'encaisse_eur', 'oui', 'contacts_froids', 'sites_en_ligne']
const CLES_IDEE = ['cle_idempotence', 'contexte', 'echeance', 'montant_cents', 'option_defaut', 'options', 'portee', 'question'].sort().join(',')
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const CONTROLES = /[\u0000-\u001f\u007f-\u009f]/
const CONTROLES_SAUF_RETOUR = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/
const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

export const LIGNE_MAX = 140
export const LIGNES_MAX = 5
export const IDEES_MAX = 3
export const jourDeParis = (maintenant = new Date()) => JOUR_PARIS.format(maintenant)

const signes = (s) => [...s].length
const objet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)

function fautesDeTexte(t) {
  const f = []
  if (EMAIL.test(t)) f.push('une adresse e-mail')
  if (TELEPHONE.test(t)) f.push('un numéro de téléphone')
  if (SECRETS.some((re) => re.test(t))) f.push('un secret')
  return f
}

/**
 * Les écarts du compte rendu (liste de « chemin : raison », sans aucune valeur) ; vide : le plan est conforme.
 * ctx : { jour: 'AAAA-MM-JJ' (jour de Paris), maintenant: Date, interdits?: [textes de l'exemple, jamais recopiés] }.
 */
export function validerReunion(plan, ctx = {}) {
  const maintenant = ctx.maintenant ?? new Date()
  const jour = ctx.jour ?? jourDeParis(maintenant)
  const interdits = new Set((ctx.interdits ?? []).map((x) => String(x).trim()))
  const e = []
  if (!objet(plan)) return ['$ : un objet JSON est attendu (lignes, objectif, idees)']
  if (Object.keys(plan).sort().join(',') !== 'idees,lignes,objectif') e.push('$ : exactement les trois clés lignes, objectif et idees (ni plus, ni moins)')
  const texte = (t, ou, min, max, { retour = false } = {}) => {
    if (typeof t !== 'string') { e.push(`${ou} : une chaîne est attendue`); return }
    const n = signes(t.trim())
    if (n < min) e.push(`${ou} : ${n} signe(s), ${min} au moins`)
    if (signes(t) > max) e.push(`${ou} : ${signes(t)} signes, ${max} au plus`)
    if ((retour ? CONTROLES_SAUF_RETOUR : CONTROLES).test(t)) e.push(`${ou} : un caractère de contrôle`)
    for (const f of fautesDeTexte(t)) e.push(`${ou} : ${f} (interdit)`)
    if (interdits.has(t.trim())) e.push(`${ou} : recopie du texte de l'exemple (écris le tien, à partir des données)`)
  }
  const sansLienNiNumero = (t, ou) => { if (typeof t === 'string' && (t.includes('@') || /\d{9}/.test(t) || /http/i.test(t))) e.push(`${ou} : ni @, ni neuf chiffres de suite, ni lien`) }
  if (!Array.isArray(plan.lignes) || plan.lignes.length < 1 || plan.lignes.length > LIGNES_MAX) e.push(`$.lignes : 1 à ${LIGNES_MAX} lignes (${Array.isArray(plan.lignes) ? plan.lignes.length : 'aucune'} données)`)
  else {
    plan.lignes.forEach((l, i) => { texte(l, `$.lignes[${i}]`, 1, LIGNE_MAX); sansLienNiNumero(l, `$.lignes[${i}]`) })
  }
  const o = plan.objectif
  if (o !== null) {
    if (!objet(o) || Object.keys(o).sort().join(',') !== 'cible,libelle,mesure') e.push('$.objectif : null, ou un objet avec exactement libelle, mesure et cible')
    else {
      texte(o.libelle, '$.objectif.libelle', 5, 80)
      sansLienNiNumero(o.libelle, '$.objectif.libelle')
      if (!MESURES.includes(o.mesure)) e.push('$.objectif.mesure : encaisse_eur, oui, contacts_froids, sites_en_ligne ou null (aucune autre valeur)')
      if (!(o.cible === null || (Number.isInteger(o.cible) && o.cible >= 0 && o.cible <= 999_999_999))) e.push('$.objectif.cible : null, ou un entier de 0 à 999999999')
    }
  }
  if (!Array.isArray(plan.idees) || plan.idees.length > IDEES_MAX) e.push(`$.idees : un tableau de ${IDEES_MAX} idées au plus`)
  else {
    const vues = new Set()
    const motifCle = new RegExp(`^chef:${jour}:idee-[a-z0-9-]{3,75}$`)
    plan.idees.forEach((i, n) => {
      const ou = `$.idees[${n}]`
      if (!objet(i)) { e.push(`${ou} : un objet est attendu`); return }
      if (Object.keys(i).sort().join(',') !== CLES_IDEE) e.push(`${ou} : exactement les huit clés cle_idempotence, question, contexte, options, option_defaut, portee, montant_cents, echeance`)
      if (typeof i.cle_idempotence !== 'string' || !motifCle.test(i.cle_idempotence)) e.push(`${ou}.cle_idempotence : chef:${jour}:idee-<mot-clé> (minuscules, chiffres, tirets ; 3 à 75 signes après idee-)`)
      else if (vues.has(i.cle_idempotence)) e.push(`${ou}.cle_idempotence : en double`)
      else vues.add(i.cle_idempotence)
      texte(i.question, `${ou}.question`, 5, 300)
      texte(i.contexte, `${ou}.contexte`, 0, 2000, { retour: true })
      const opts = i.options
      if (!Array.isArray(opts) || opts.length !== 2) e.push(`${ou}.options : exactement deux options, lancer et reporter`)
      else {
        if (opts.map((x) => x?.cle).sort().join(',') !== 'lancer,reporter') e.push(`${ou}.options : exactement les clés lancer et reporter`)
        if (opts.filter((x) => x?.recommandee === true).length !== 1) e.push(`${ou}.options : une seule option recommandee à true`)
        opts.forEach((x, j) => {
          const oj = `${ou}.options[${j}]`
          if (!objet(x)) { e.push(`${oj} : un objet est attendu`); return }
          const k = Object.keys(x).sort().join(',')
          if (k !== 'cle,libelle,recommandee' && k !== 'cle,engage_cents,libelle,recommandee') e.push(`${oj} : les clés cle, libelle, recommandee et engage_cents (à 0)`)
          texte(x.libelle, `${oj}.libelle`, 1, 80)
          if (typeof x.recommandee !== 'boolean') e.push(`${oj}.recommandee : un booléen`)
          if ('engage_cents' in x && x.engage_cents !== 0) e.push(`${oj}.engage_cents : 0, une idée n'engage rien`)
        })
      }
      if (i.option_defaut !== 'reporter') e.push(`${ou}.option_defaut : "reporter"`)
      if (i.portee !== 'aucune') e.push(`${ou}.portee : "aucune"`)
      if (i.montant_cents !== 0) e.push(`${ou}.montant_cents : 0`)
      const ok = typeof i.echeance === 'string' && ISO.test(i.echeance)
      const d = ok ? Date.parse(i.echeance) - maintenant.getTime() : NaN
      if (!ok) e.push(`${ou}.echeance : une date ISO terminée par Z (ex. 2026-10-06T16:30:00Z)`)
      else if (!(d >= HEURE && d <= 7 * 24 * HEURE)) e.push(`${ou}.echeance : entre 1 heure et 7 jours après maintenant (maintenant : ${maintenant.toISOString()})`)
    })
  }
  return e
}

// ── l'exemple et les limites, dits au modèle ───────────────────────────────────────────────────────────────────────────────
/** Un compte rendu valide, au contenu volontairement fictif (le modèle doit écrire le sien : validerReunion refuse la recopie). */
export function exempleReunion(jour, maintenantMs = Date.now()) {
  const echeance = `${new Date(maintenantMs + 24 * HEURE).toISOString().slice(0, 16)}:00Z`
  return {
    lignes: [
      'Marché : (un chiffre précis).',
      'Bloque : (un blocage précis).',
      'Coûte : (un coût précis).',
    ],
    objectif: null,
    idees: [{
      cle_idempotence: `chef:${jour}:idee-exemple-forme`,
      question: '(Une question à approuver ou à tuer ?)',
      contexte: '(Deux phrases.)',
      options: [
        { cle: 'lancer', libelle: '(Lancer : une demi-phrase)', recommandee: false, engage_cents: 0 },
        { cle: 'reporter', libelle: '(Reporter : une demi-phrase)', recommandee: true, engage_cents: 0 },
      ],
      option_defaut: 'reporter', portee: 'aucune', montant_cents: 0, echeance,
    }],
  }
}
/** Les textes de l'exemple : un plan qui les recopie est refusé. */
export function textesDeLExemple(jour, maintenantMs) {
  const x = exempleReunion(jour, maintenantMs)
  return [...x.lignes, ...x.idees.flatMap((i) => [i.question, i.contexte, ...i.options.map((o) => o.libelle)])]
}
/** Le bloc de consigne que le relais ajoute au message d'un moteur de secours quand la sortie demandée est reunion.json. */
export function limitesReunion(jour, maintenantMs = Date.now()) {
  const x = exempleReunion(jour, maintenantMs)
  return [
    'LIMITES EXACTES du JSON de la réunion (au moindre écart, le compte rendu ENTIER est refusé : compte tes signes, vise court) :',
    '- Un seul objet, avec exactement les trois clés lignes, objectif et idees.',
    `- lignes : 1 à ${LIGNES_MAX} chaînes de ${LIGNE_MAX} signes AU PLUS chacune (vise 100) ; sans @, sans lien, sans suite de 9 chiffres, sans adresse e-mail ni numéro de téléphone.`,
    '- objectif : null (le choix par défaut, valable quand il ne change pas) ou { "libelle": 5 à 80 signes, "mesure": "encaisse_eur" | "oui" | "contacts_froids" | "sites_en_ligne" | null, "cible": un entier >= 0 ou null } ; aucune autre valeur de mesure.',
    `- idees : ${IDEES_MAX} idées AU PLUS (une liste vide est permise). Chaque idée a exactement les huit clés cle_idempotence ("chef:${jour}:idee-<mot-clé en minuscules, chiffres et tirets>"), question (5 à 300 signes), contexte (0 à 2000), options, option_defaut, portee, montant_cents, echeance.`,
    '- options : EXACTEMENT deux objets { "cle", "libelle", "recommandee", "engage_cents" } : la cle "lancer" et la cle "reporter" ; libelle de 80 signes AU PLUS (une demi-phrase) ; une seule recommandee à true ; engage_cents à 0.',
    '- option_defaut : "reporter" ; portee : "aucune" ; montant_cents : 0.',
    `- echeance : une date ISO UTC terminée par Z, entre 1 heure et 7 jours après maintenant (maintenant : ${new Date(maintenantMs).toISOString()}).`,
    'Exemple de FORME valide (le contenu est fictif : écris le tien à partir des données, ne recopie rien de l\'exemple) :',
    JSON.stringify(x, null, 1),
    'Dans le doute : des lignes courtes, "objectif": null, et "idees": [] plutôt qu\'un champ trop long.',
  ].join('\n')
}

// ── la réduction déterministe sûre ───────────────────────────────────────────────────────────────────────────────────────
/** Coupe une ligne trop longue sur une limite de mot et ajoute « … » (140 signes au plus), ou null si la couper perdrait trop de sens. */
export function couperLigne(t) {
  const cp = [...String(t).trim()]
  if (cp.length <= LIGNE_MAX) return cp.join('')
  if (cp.length > 2 * LIGNE_MAX) return null // une ligne qui fait plus du double n'est pas une ligne un peu longue : on ne la mutile pas
  const tete = cp.slice(0, LIGNE_MAX - 1)
  let k = /\s/u.test(cp[LIGNE_MAX - 1]) ? LIGNE_MAX - 1 : tete.map((c) => /\s/u.test(c)).lastIndexOf(true)
  if (k < Math.floor(LIGNE_MAX / 2)) return null // pas de limite de mot dans la seconde moitié : couper au milieu d'un mot changerait le sens
  const garde = tete.slice(0, k).join('').replace(/[\s,;:.\-–—(«"]+$/u, '')
  return signes(garde) >= Math.floor(LIGNE_MAX / 2) ? `${garde}…` : null
}
/** Un compte rendu qui a un sens : au moins une vraie phrase, aucune ligne en double, aucun gabarit entre chevrons ou parenthèses laissé tel quel. */
function aUnSens(plan) {
  const l = plan.lignes
  if (!Array.isArray(l) || !l.length) return false
  if (new Set(l.map((x) => String(x).trim().toLowerCase())).size !== l.length) return false
  if (!l.some((x) => signes(String(x).trim()) >= 20)) return false
  return !l.some((x) => /[<>]|\(\s*(?:une|un|deux)\b/i.test(String(x)))
}
/**
 * Réduit un compte rendu refusé UNIQUEMENT par des écarts de taille ou de forme sans enjeu : ligne trop longue (coupée sur une limite de mot),
 * objectif non conforme (→ null : l'objectif ne change pas), idées au-delà de 3 (les trois premières). Rend { plan, notes } si le résultat
 * passe validerReunion ET garde un sens ; null sinon (le compte rendu reste refusé : vide, absurde, adresse, secret, clé fautive…).
 */
export function reduireReunion(plan, ctx = {}) {
  if (!objet(plan)) return null
  const p = structuredClone(plan)
  const notes = []
  if (Array.isArray(p.lignes)) {
    p.lignes = p.lignes.map((l, i) => {
      if (typeof l !== 'string' || signes(l) <= LIGNE_MAX) return l
      const c = couperLigne(l)
      if (c === null) return l
      notes.push(`lignes[${i}] coupée de ${signes(l)} à ${signes(c)} signes`)
      return c
    })
  }
  if (!('objectif' in p)) { p.objectif = null; notes.push('objectif absent : null') }
  else if (p.objectif !== null && validerReunion({ ...p, objectif: p.objectif }, ctx).some((x) => x.startsWith('$.objectif'))) { p.objectif = null; notes.push('objectif non conforme : null') }
  if (!('idees' in p)) { p.idees = []; notes.push('idees absent : liste vide') }
  else if (Array.isArray(p.idees) && p.idees.length > IDEES_MAX) { notes.push(`idees : ${p.idees.length} ramenées à ${IDEES_MAX}`); p.idees = p.idees.slice(0, IDEES_MAX) }
  if (!notes.length) return null
  if (validerReunion(p, ctx).length || !aUnSens(p)) return null
  return { plan: p, notes }
}
