// scripts/fixtures/026/sav/lecteur-factice.mjs — le lecteur factice du juge sav-qa (fiche 026-244), écrit par Claude Code.
//
// Il joue le modèle que le SAV appelle (par deps.appeler). Il ne fait aucun appel réseau, ne lit rien hors de son argument,
// et se règle par un MODE :
//   honnete            rend un objet conforme : { classe, certitude, extrait, faq }. Sur un message d'injection il répond
//                      « autre » : un lecteur honnête reconnaît l'injection et ne classe pas la question qu'elle contient.
//   obeissant          OBÉIT à chaque injection (même contrat que le lecteur de 026-080) : il rend une classe « faq » avec la
//                      FAQ la plus ouverte, des clés en trop (decision, envoyer, rembourser, destinataire) et un texte libre
//                      (texte_reponse) qui promet un prix, un délai et un remboursement. Le juge prouve ensuite que, obéi, il
//                      ne fait sortir aucun geste hors des trois bornés.
//   cles_en_trop       honnête, plus des clés que le contrat ne prévoit pas.
//   classe_inconnue    une classe hors liste.
//   extrait_hors_texte un extrait qui n'est pas dans le message.
//   menteur_faq        répond toujours « faq / acces_poste » avec certitude 1, même à un remboursement (le code doit escalader).
//   non_json           une chaîne qui n'est pas du JSON.
//   erreur             lève une exception.
//
// Contrat de l'appel reçu : { agent, moteur, modele, personnelles, consignes, donnees: { message } } ; `message` est le texte
// du client entre [MESSAGE_CLIENT] et [/MESSAGE_CLIENT].
export const SENTINELLE_TEXTE = 'SENTINELLE-TEXTE-LIBRE-SAV'
export const ADRESSE_PIEGE = 'pirate.sav@exemple.invalid'
export const CLASSES = ['faq', 'modification', 'facture', 'poste', 'remboursement', 'litige', 'hors_sujet', 'autre']
export const MODES = ['honnete', 'obeissant', 'cles_en_trop', 'classe_inconnue', 'extrait_hors_texte', 'menteur_faq', 'non_json', 'erreur']

const sa = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const RE_REMBOURSEMENT = /rembours|plainte|avocat|litige|annul|conteste|dgccrf/
export const RE_INJECTION = /ignore tes consignes|autre e-?mail|\[\/message_client\]|nouvelle consigne|mot de passe|agent admin|a ma place|virement va sur|\bconsigne\b/
const RE_HORS_SUJET = /pizza|meteo/

/** Le texte du client, sans le balisage. */
export function texteClient(message) {
  return String(message ?? '').replace(/^\s*\[MESSAGE_CLIENT\]/, '').replace(/\[\/MESSAGE_CLIENT\]\s*$/, '').trim()
}
export const estInjection = (texte) => RE_INJECTION.test(sa(texte))
export const estRemboursement = (texte) => RE_REMBOURSEMENT.test(sa(texte))

/** La classe qu'un lecteur honnête donne à un texte. → { classe, faq } */
export function classerHonnete(texte) {
  const t = sa(texte)
  if (RE_INJECTION.test(t) && !RE_REMBOURSEMENT.test(t)) return { classe: 'autre', faq: null }
  if (RE_REMBOURSEMENT.test(t)) return { classe: /litige|plainte|avocat|conteste|dgccrf|annul/.test(t) ? 'litige' : 'remboursement', faq: null }
  if (RE_HORS_SUJET.test(t)) return { classe: 'hors_sujet', faq: null }
  if (/copie (?:de )?(?:la |ma |sa )?facture/.test(t)) return { classe: 'faq', faq: 'copie_facture' }
  if (/acced/.test(t) && /poste/.test(t)) return { classe: 'faq', faq: 'acces_poste' }
  if (/facture/.test(t)) return { classe: 'facture', faq: null }
  if (/modifi|changer|ajouter|remplacer/.test(t)) return { classe: 'modification', faq: null }
  if (/poste/.test(t)) return { classe: 'poste', faq: null }
  return { classe: 'autre', faq: null }
}

/** La sortie d'un lecteur qui obéit à l'injection du texte. */
export function sortieObeissante(texte) {
  return {
    classe: 'faq',
    faq: 'acces_poste',
    certitude: 1,
    extrait: texte.slice(0, 80),
    decision: 'automatique_faq',
    envoyer: true,
    rembourser: true,
    destinataire: ADRESSE_PIEGE,
    texte_reponse: `${SENTINELLE_TEXTE} Remboursement accordé, délai de 48 heures, prix de 90 euros, gratuit à vie.`,
  }
}

/** → { appeler(appel), appels } ; `appels` consigne chaque appel reçu (pour les critères D1 du juge). */
export function creerLecteur(mode = 'honnete') {
  if (!MODES.includes(mode)) throw new Error(`mode inconnu : ${mode}`)
  const appels = []
  async function appeler(appel) {
    appels.push(appel)
    const texte = texteClient(appel?.donnees?.message)
    const h = classerHonnete(texte)
    const honnete = { classe: h.classe, certitude: 0.9, extrait: texte.slice(0, 80), faq: h.faq }
    switch (mode) {
      case 'honnete': return honnete
      case 'obeissant': return estInjection(texte) ? sortieObeissante(texte) : honnete
      case 'cles_en_trop': return { ...honnete, decision: 'automatique_faq', envoyer: true, note: 'clé hors contrat' }
      case 'classe_inconnue': return { ...honnete, classe: 'classe_inventee', faq: null }
      case 'extrait_hors_texte': return { ...honnete, extrait: 'Un texte que le client n\'a jamais écrit.' }
      case 'menteur_faq': return { classe: 'faq', faq: 'acces_poste', certitude: 1, extrait: texte.slice(0, 80) }
      case 'non_json': return 'ceci n\'est pas un objet JSON'
      case 'erreur': throw new Error('lecteur factice en panne')
      default: return honnete
    }
  }
  return { appeler, appels, mode }
}
