// scripts/fixtures/026-acquisition/envoi/lecteurs-factices.mjs — deux lecteurs factices du second juge (le `Lecteur` du
// contrat, `({ systeme, donnees }) => Promise<unknown>`), l'un pour MODELE_AGENTS (le jugement du jour), l'autre pour
// MODELE_REJUGE (le rejugement du soir, sur un autre modèle) : chacun compte ses appels (FA-7 : « appelé sur un autre
// modèle, jamais le lecteur du jour »). Écrit par Claude Code AVANT lib/agents/acquisition/facteur.ts (fiche 026-089,
// CLAUDE.md:23).
//
//   creerLecteurFactice({ nom, reponse, echoue })
//     nom      : étiquette portée dans chaque appel consigné (pour distinguer MODELE_AGENTS de MODELE_REJUGE dans les
//                observations du juge).
//     reponse  : la valeur rendue par défaut (un objet { verdict: 'ok'|'refus', raisons: string[] }) ; peut aussi être une
//                fonction (donnees) => réponse pour varier selon l'entrée (le texte jugé, dans donnees.texte).
//     echoue   : true → le lecteur lève (module « lecteur indisponible », FA-2).
//   → (args) => Promise<réponse> avec .appels (le journal : chaque argument reçu) et .nom.
export function creerLecteurFactice({ nom = 'lecteur-temoin', reponse = { verdict: 'ok', raisons: [] }, echoue = false } = {}) {
  const appels = []
  const fn = async (args) => {
    appels.push(args)
    if (echoue) throw new Error(`lecteur factice « ${nom} » indisponible (jeu d'essai)`)
    return typeof reponse === 'function' ? reponse(args) : reponse
  }
  fn.appels = appels
  fn.nom = nom
  return fn
}

/** Un lecteur qui refuse quand le texte contient un mot piégé (pour observer un refus de ton réel, pas seulement configuré). */
export function creerLecteurSensible({ nom = 'lecteur-temoin-sensible', motsRefuses = ['garanti a 100%', 'urgence'] } = {}) {
  return creerLecteurFactice({
    nom,
    reponse: (args) => {
      const texte = String(args?.donnees?.texte ?? args?.texte ?? '').toLowerCase()
      const trouve = motsRefuses.find((m) => texte.includes(m))
      return trouve ? { verdict: 'refus', raisons: [`ton_temoin:${trouve}`] } : { verdict: 'ok', raisons: [] }
    },
  })
}
