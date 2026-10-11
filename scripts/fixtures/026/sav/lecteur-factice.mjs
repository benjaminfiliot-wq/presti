// scripts/fixtures/026/sav/lecteur-factice.mjs — le lecteur factice du SAV (sav-qa, fiche 026-244), écrit AVANT le module qu'il juge
// (lib/agents/sav/repondeurClient.ts, fiche 026-245). Même contrat que celui du Standard (026-080) : un `Lecteur` est une fonction
// `(entree, cfg) => Promise<unknown>` qui enregistre chaque appel (`.appels`) et rend une lecture réglable.
//
//   creerLecteur(fn)            lecteur générique : `fn(entree, n)` calcule la sortie du nème appel
//   creerLecteurFixe(valeur)    rend toujours la même valeur (ou lève si `valeur` est une Error)
//   creerLecteurConforme()      la lecture CORRECTE de chaque message du corpus (champ `lecture`)
//   creerLecteurObeissant()     OBÉIT à chaque injection du corpus (champ `obei`), jamais l'acteur : ce sont le module et son
//                               validateur qui doivent tenir. Conforme pour tout message qui n'est pas une injection.
//   creerLecteurScenario(nom)   la lecture conforme dégradée : cles_en_trop, classe_inconnue, extrait_hors_texte, texte_brut, panne
//
// Le lecteur reconnaît un message par son texte : `entree.texte` exact, sinon les 24 premiers caractères du texte retrouvés dans
// l'entrée sérialisée (le module peut entourer le texte de balises, mais ne doit pas le transformer : CONTRAT.md).
import fs from 'node:fs'

const CORPUS = JSON.parse(fs.readFileSync(new URL('./messages/corpus.json', import.meta.url), 'utf8'))
export const MESSAGES = Object.freeze([...CORPUS.ordinaires, ...CORPUS.injections, ...CORPUS.remboursements, ...CORPUS.hors_sujet, ...CORPUS.sans_identifiant])
const PREFIXE = 24

/** Le message du corpus dont `entree` porte le texte, ou null. */
export function messageDe(entree) {
  const direct = entree && typeof entree.texte === 'string' ? MESSAGES.find(m => m.texte === entree.texte) : null
  if (direct) return direct
  const brut = JSON.stringify(entree ?? null)
  let trouve = null
  for (const m of MESSAGES) if (brut.includes(JSON.stringify(m.texte.slice(0, PREFIXE)).slice(1, -1))) trouve = m
  return trouve
}

export function creerLecteur(reponseFn) {
  const appels = []
  const lecteur = async (entree, cfg) => {
    appels.push({ entree: JSON.parse(JSON.stringify(entree ?? null)), cfg: cfg === undefined ? null : JSON.parse(JSON.stringify(cfg)) })
    return typeof reponseFn === 'function' ? reponseFn(entree, appels.length) : reponseFn
  }
  lecteur.appels = appels
  return lecteur
}
export function creerLecteurFixe(valeur) {
  return creerLecteur(() => { if (valeur instanceof Error) throw valeur; return structuredClone(valeur) })
}

const lectureConforme = m => (m ? structuredClone(m.lecture) : { classe: 'question_autre', type_question: null, certitude: 0.5, extrait: '', demande_sensible: false })
export function creerLecteurConforme() { return creerLecteur(entree => lectureConforme(messageDe(entree))) }

/**
 * Le lecteur obéissant : pour toute injection du corpus (corpus.json → `obei`), il fait ce que le texte lui demande — classe
 * forcée, destinataire ou action en trop, réponse libre, classe inventée, drapeau de sensibilité masqué. Ce que le texte ne
 * demande pas, il le lit correctement.
 */
export function creerLecteurObeissant() {
  return creerLecteur(entree => {
    const m = messageDe(entree)
    return m && m.obei ? structuredClone(m.obei) : lectureConforme(m)
  })
}

/** La lecture conforme, dégradée d'une façon précise (ST-4 du Standard, repris) ; `panne` lève. */
export function creerLecteurScenario(nom) {
  return creerLecteur(entree => {
    const m = messageDe(entree)
    const l = lectureConforme(m)
    if (nom === 'cles_en_trop') return { ...l, action: 'envoyer', destinataire: 'x@exemple.invalid' }
    if (nom === 'classe_inconnue') return { ...l, classe: 'urgence_maximale' }
    if (nom === 'extrait_hors_texte') return { ...l, extrait: 'une phrase qui ne figure pas dans le message' }
    if (nom === 'texte_brut') return 'question_faq'
    if (nom === 'panne') throw Error('lecteur indisponible')
    throw Error(`scénario inconnu : ${nom}`)
  })
}
