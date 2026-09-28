// scripts/fixtures/026-pilotage/c/contrat-blocs.mjs — le schéma exécutable des réponses de GET /api/controle/pilotage?bloc=…
// (contrat de 026-068, tel que 026-117 et 026-164 les lisent), écrit par Claude Code en 026-104. Le juge d'écran (lot c)
// valide avec lui ses jeux d'essai des blocs ; ses pièges (PIEGES_BLOCS) doivent chacun être refusés (JA-3 du lot c).
//
//   validerBloc(reponse, bloc) → string[]   (vide : conforme) ; bloc ∈ decider, appeler, entonnoir, code
//
// L'enveloppe : { bloc, valeur, source, a, cache?, erreur?, manque? } ; `valeur` nulle → `erreur` ou `manque` dit pourquoi ;
// jamais un nombre nu à la place de `valeur`. Les textes montrés à l'écran (question, contexte, libellés, lignes, messages)
// ne portent ni « @ », ni 9 chiffres de suite, ni « http » (seul `tel` porte un numéro, au format tel:).
//   decider   : { cartes: [{ id (uuid), question, contexte, montant (texte ou null), options: [{ cle, libelle, recommandee }]
//               (2 à 7, clés distinctes, au plus une recommandée), defaut: { cle, libelle } (une des options),
//               libelleDefaut, portee (null, argent, artisan, securite), echeance (ISO ou null), epinglee }] (au plus une
//               épinglée), autres (entier ≥ 0), invalides (entier ≥ 0) }
//   appeler   : { appels: [{ id (uuid), nom, tel (tel:… ou null), lignes: [deux textes], source (« Rendez-vous réservé »,
//               « Réponse à un message », « Commande de site »), sourceAppel (rdv, reponse ; absent pour une commande),
//               a (ISO) }], partiel (texte ou null) }
//   entonnoir : { j7, j30 : { contacts, reponses, oui, appels, ventes, chauds (entiers ≥ 0), parVariante, parCanal },
//               hypotheses }
//   code      : { file: [id], enCours: [{ id, agent, depuis }], verrousVieux: [id], derniers: [{ id, verdict PASS|FAIL, le }],
//               prs: { ouvertes, texte }, attention: [texte], perime, message (texte ou null), publie_le (ISO) }
export const BLOCS = ['decider', 'appeler', 'entonnoir', 'code']
export const PORTEES = [null, 'argent', 'artisan', 'securite']
export const SOURCES_APPEL = { 'Rendez-vous réservé': 'rdv', 'Réponse à un message': 'reponse', 'Commande de site': null }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const objet = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const entier = (x) => Number.isInteger(x) && x >= 0
const texte = (x) => typeof x === 'string' && x.trim().length > 0
const ID_TACHE = /^\d{3}-[\w-]+$/

function texteAffiche(chemin, t, E) {
  if (typeof t !== 'string') { E.push(`${chemin} : texte attendu`); return }
  if (t.includes('@')) E.push(`${chemin} : « @ » dans un texte affiché`)
  if (/\d{9}/.test(t.replace(/[\s.-]/g, ''))) E.push(`${chemin} : 9 chiffres de suite dans un texte affiché`)
  if (/https?:/i.test(t)) E.push(`${chemin} : « http » dans un texte affiché`)
}

function decider(v, E) {
  if (!Array.isArray(v.cartes)) { E.push('decider.cartes : liste attendue'); return }
  if (!entier(v.autres)) E.push('decider.autres : entier ≥ 0 attendu')
  if (!entier(v.invalides)) E.push('decider.invalides : entier ≥ 0 attendu')
  if (v.cartes.filter((c) => c?.epinglee === true).length > 1) E.push('decider : plus d’une carte épinglée')
  const ids = new Set()
  v.cartes.forEach((c, i) => {
    const p = `decider.cartes[${i}]`
    if (!objet(c)) { E.push(`${p} : objet attendu`); return }
    if (!UUID.test(String(c.id))) E.push(`${p}.id : uuid attendu`)
    if (ids.has(c.id)) E.push(`${p}.id : en double`); ids.add(c.id)
    for (const k of ['question', 'contexte', 'libelleDefaut']) if (!texte(c[k])) E.push(`${p}.${k} : texte attendu`); else texteAffiche(`${p}.${k}`, c[k], E)
    if (c.montant !== null && !texte(c.montant)) E.push(`${p}.montant : texte ou null attendu`)
    if (!PORTEES.includes(c.portee)) E.push(`${p}.portee : « ${c.portee} » hors de ${PORTEES.map(String).join(', ')}`)
    if (c.echeance !== null && !ISO.test(String(c.echeance))) E.push(`${p}.echeance : ISO ou null attendu`)
    if (typeof c.epinglee !== 'boolean') E.push(`${p}.epinglee : booléen attendu`)
    if (!Array.isArray(c.options) || c.options.length < 2 || c.options.length > 7) { E.push(`${p}.options : 2 à 7 options attendues (${Array.isArray(c.options) ? c.options.length : 'aucune liste'})`); return }
    const cles = c.options.map((o) => o?.cle)
    if (new Set(cles).size !== cles.length) E.push(`${p}.options : clés en double`)
    if (c.options.filter((o) => o?.recommandee === true).length > 1) E.push(`${p}.options : plus d’une option recommandée`)
    c.options.forEach((o, k) => { if (!texte(o?.cle) || !texte(o?.libelle) || typeof o?.recommandee !== 'boolean') E.push(`${p}.options[${k}] : { cle, libelle, recommandee } attendu`); else texteAffiche(`${p}.options[${k}].libelle`, o.libelle, E) })
    if (!objet(c.defaut) || !cles.includes(c.defaut.cle)) E.push(`${p}.defaut : une des options attendue`)
  })
}

function appeler(v, E) {
  if (!Array.isArray(v.appels)) { E.push('appeler.appels : liste attendue'); return }
  if (v.partiel !== null && !texte(v.partiel)) E.push('appeler.partiel : texte ou null attendu')
  v.appels.forEach((a, i) => {
    const p = `appeler.appels[${i}]`
    if (!objet(a)) { E.push(`${p} : objet attendu`); return }
    if (!UUID.test(String(a.id))) E.push(`${p}.id : uuid attendu`)
    if (!texte(a.nom)) E.push(`${p}.nom : texte attendu`); else texteAffiche(`${p}.nom`, a.nom, E)
    if (a.tel !== null && !/^tel:\+?\d{6,15}$/.test(String(a.tel))) E.push(`${p}.tel : « tel:… » ou null attendu`)
    if (!Array.isArray(a.lignes) || a.lignes.length !== 2) E.push(`${p}.lignes : deux lignes attendues`); else a.lignes.forEach((l, k) => texteAffiche(`${p}.lignes[${k}]`, l, E))
    if (!(a.source in SOURCES_APPEL)) E.push(`${p}.source : « ${a.source} » hors de ${Object.keys(SOURCES_APPEL).join(', ')}`)
    else {
      const attendu = SOURCES_APPEL[a.source]
      if (attendu === null && 'sourceAppel' in a) E.push(`${p} : une « Commande de site » ne porte pas de sourceAppel (aucun « Appel rendu »)`)
      if (attendu !== null && a.sourceAppel !== attendu) E.push(`${p}.sourceAppel : « ${a.sourceAppel} », « ${attendu} » attendu pour « ${a.source} »`)
    }
    if (!ISO.test(String(a.a))) E.push(`${p}.a : ISO attendu`)
  })
}

function entonnoir(v, E) {
  for (const k of ['j7', 'j30']) {
    const t = v[k]
    if (!objet(t)) { E.push(`entonnoir.${k} : objet attendu`); continue }
    for (const c of ['contacts', 'reponses', 'oui', 'appels', 'ventes', 'chauds']) if (!entier(t[c])) E.push(`entonnoir.${k}.${c} : entier ≥ 0 attendu`)
    for (const c of ['parVariante', 'parCanal']) if (!objet(t[c])) E.push(`entonnoir.${k}.${c} : objet attendu`)
    if (entier(t.oui) && entier(t.reponses) && t.oui > t.reponses) E.push(`entonnoir.${k} : plus de oui que de réponses`)
  }
}

function code(v, E) {
  for (const k of ['file', 'verrousVieux']) if (!Array.isArray(v[k]) || v[k].some((y) => !ID_TACHE.test(String(y)))) E.push(`code.${k} : liste d’identifiants de tâche attendue`)
  if (!Array.isArray(v.enCours) || v.enCours.some((y) => !objet(y) || !ID_TACHE.test(String(y.id)) || !texte(y.agent) || !ISO.test(String(y.depuis)))) E.push('code.enCours : [{ id, agent, depuis }] attendu')
  if (!Array.isArray(v.derniers) || v.derniers.some((y) => !objet(y) || !ID_TACHE.test(String(y.id)) || !['PASS', 'FAIL'].includes(y.verdict) || !ISO.test(String(y.le)))) E.push('code.derniers : [{ id, verdict PASS|FAIL, le }] attendu')
  if (!objet(v.prs) || !entier(v.prs.ouvertes) || !texte(v.prs.texte)) E.push('code.prs : { ouvertes, texte } attendu')
  if (!Array.isArray(v.attention)) E.push('code.attention : liste attendue'); else v.attention.forEach((l, i) => texteAffiche(`code.attention[${i}]`, l, E))
  if (typeof v.perime !== 'boolean') E.push('code.perime : booléen attendu')
  if (v.message !== null && !texte(v.message)) E.push('code.message : texte ou null attendu')
  if (v.perime && !texte(v.message)) E.push('code : périmé sans sa phrase')
  if (!ISO.test(String(v.publie_le))) E.push('code.publie_le : ISO attendu')
}

const FORMES = { decider, appeler, entonnoir, code }
/** Les défauts d'une réponse de GET /api/controle/pilotage?bloc=<bloc> ; vide si elle est conforme. */
export function validerBloc(rep, bloc) {
  const E = []
  if (!BLOCS.includes(bloc)) return [`bloc « ${bloc} » inconnu (${BLOCS.join(', ')})`]
  if (!objet(rep)) return ['réponse : objet attendu']
  if (rep.bloc !== bloc) E.push(`bloc : « ${rep.bloc} », « ${bloc} » attendu`)
  if (!texte(rep.source) || !ISO.test(String(rep.a))) E.push('bloc sans source ni a')
  if (typeof rep.valeur === 'number') E.push('valeur numérique nue')
  if (E.length) return E
  if (rep.valeur === null) { if (!texte(rep.erreur) && !texte(rep.manque)) E.push(`${bloc} : valeur nulle sans erreur ni manque`); else texteAffiche(`${bloc}.${rep.erreur ? 'erreur' : 'manque'}`, rep.erreur ?? rep.manque, E); return E }
  if (!objet(rep.valeur)) return [`${bloc}.valeur : objet attendu`]
  FORMES[bloc](rep.valeur, E)
  return E
}

// ── Les pièges : chacun doit être refusé ─────────────────────────────────────────────────────────────────────────────────
const cl = (x) => JSON.parse(JSON.stringify(x))
export const PIEGES_BLOCS = [
  { nom: 'bloc-sans-source', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); delete r.source; return r } },
  { nom: 'valeur-nombre', bloc: 'decider', fabriquer: (j) => ({ ...cl(j.decider), valeur: 3 }) },
  { nom: 'huit-options', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); const o = r.valeur.cartes[0].options; while (o.length < 8) o.push({ cle: `o${o.length}`, libelle: `Option ${o.length}`, recommandee: false }); return r } },
  { nom: 'une-option', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); r.valeur.cartes[0].options = r.valeur.cartes[0].options.slice(0, 1); r.valeur.cartes[0].defaut = { ...r.valeur.cartes[0].options[0] }; return r } },
  { nom: 'deux-recommandees', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); for (const o of r.valeur.cartes[1].options) o.recommandee = true; return r } },
  { nom: 'portee-inconnue', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); r.valeur.cartes[0].portee = 'tout'; return r } },
  { nom: 'question-arobase', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); r.valeur.cartes[0].question = 'Écrire à contact@exemple.invalid ?'; return r } },
  { nom: 'deux-epinglees', bloc: 'decider', fabriquer: (j) => { const r = cl(j.decider); r.valeur.cartes[0].epinglee = true; r.valeur.cartes[1].epinglee = true; return r } },
  { nom: 'commande-appel-rendu', bloc: 'appeler', fabriquer: (j) => { const r = cl(j.appeler); r.valeur.appels.find((a) => a.source === 'Commande de site').sourceAppel = 'reponse'; return r } },
  { nom: 'rdv-sans-source-appel', bloc: 'appeler', fabriquer: (j) => { const r = cl(j.appeler); delete r.valeur.appels[0].sourceAppel; return r } },
  { nom: 'tel-nu', bloc: 'appeler', fabriquer: (j) => { const r = cl(j.appeler); r.valeur.appels[0].tel = '0611223344'; return r } },
  { nom: 'ligne-neuf-chiffres', bloc: 'appeler', fabriquer: (j) => { const r = cl(j.appeler); r.valeur.appels[1].lignes[1] = 'Rappeler au 0611223344'; return r } },
  { nom: 'oui-sans-reponse', bloc: 'entonnoir', fabriquer: (j) => { const r = cl(j.entonnoir); r.valeur.j7.oui = r.valeur.j7.reponses + 1; return r } },
  { nom: 'perime-muet', bloc: 'code', fabriquer: (j) => { const r = cl(j.code); r.valeur.perime = true; r.valeur.message = null; return r } },
]
