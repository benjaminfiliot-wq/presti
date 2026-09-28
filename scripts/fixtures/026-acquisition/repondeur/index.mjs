// scripts/fixtures/026-acquisition/repondeur/index.mjs — jeux d'essai de repondeur-qa (fiche 026-081, lot 6), écrit par
// Claude Code. Une copie approuvée des modèles et de la FAQ, marquée « Témoin » (026-096 exige que le juge la fournisse :
// modeles.ts et faq.ts, 026-083, n'existent pas encore), et le tableau des classes → réponse attendue (026-096 §Contexte).
// « assistant IA de Presti » est dans CHAQUE modèle de réponse (AI Act art. 50).

export const TEMOIN = 'Témoin — scripts/fixtures/026-acquisition/repondeur (jamais une vraie copie approuvée)'

export const MODELES_TEMOIN = Object.freeze({
  rep_faq_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. {reponse_faq} Le plus simple ensuite est d'en discuter 15 min avec Benjamin : {lien_rdv}" },
  rep_appel_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Le plus simple est d'en parler 15 min avec Benjamin : {lien_rdv}" },
  rep_prix_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Le site coûte 300 € une fois (TVA non applicable). Vous pouvez payer directement : {lien_paiement} ou en discuter 15 min : {lien_rdv}" },
  rep_prix_rdv_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Le site coûte 300 € une fois (TVA non applicable). Le plus simple est d'en discuter 15 min : {lien_rdv}" },
  stop_confirmation_v1: { type: 'confirmation_stop', texte: "Je suis l'assistant IA de Presti : c'est noté, vous ne recevrez plus aucun message de notre part." },
  rep_rgpd_accuse_v1: { type: 'reponse_rgpd', texte: "Je suis l'assistant IA de Presti. Votre demande est bien reçue : Benjamin Filiot vous répond dans le mois." },
  rep_rgpd_acces_v1: { type: 'reponse_rgpd', texte: "Je suis l'assistant IA de Presti. Voici les données que nous gardons sur vous : {export}" },
  rep_rgpd_efface_v1: { type: 'reponse_rgpd', texte: "Je suis l'assistant IA de Presti. C'est noté : vos données seront effacées sous 7 jours." },
  questions_entrant_v2: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Pour préparer votre maquette, dites-moi votre métier, votre ville et votre e-mail." },
  relance_oui_v1: { type: 'relance', texte: "Bonjour, je suis l'assistant IA de Presti. Un petit rappel : votre maquette vous attend toujours, {lien_maquette}." },
  lien_maquette_v1: { type: 'lien_maquette', texte: "Bonjour, je suis l'assistant IA de Presti. Voici votre maquette : {lien_maquette}. Sans réponse de votre part, je vous enverrai un rappel dans quelques jours." },
  lien_maquette_sans_annonce_v1: { type: 'lien_maquette', texte: "Bonjour, je suis l'assistant IA de Presti. Voici votre maquette : {lien_maquette}." },
  studio_accuse_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Merci pour votre intérêt ! Nous préparons un échantillon pour {entreprise}." },
  studio_echantillon_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. Voici votre échantillon vidéo." },
  studio_offre_v1: { type: 'reponse', texte: "Bonjour, je suis l'assistant IA de Presti. L'offre : {videos} vidéos pour {prix}. Pour commander : {paiement}" },
})

export const FAQ_TEMOIN = Object.freeze([
  Object.freeze({ id: 'faq-delai-temoin', question: 'Combien de temps pour avoir le site ?', reponse: 'Le site est prêt en 48 heures ouvrées.' }),
  Object.freeze({ id: 'faq-hebergement-temoin', question: 'Le site est-il hébergé chez vous ?', reponse: "Oui, l'hébergement est inclus, sans abonnement." }),
])

/** Le tableau des classes (026-096 §Contexte), structuré pour AC-1 : chaque entrée porte la réaction attendue. */
export const CAS = Object.freeze([
  { nom: 'question avec faq connue', classe: 'question', extra: { faq: 'faq-delai-temoin' }, attendu: { modele: 'rep_faq_v1', type: 'reponse' } },
  { nom: 'question sans faq', classe: 'question', extra: {}, attendu: { modele: 'rep_appel_v1', type: 'reponse' } },
  { nom: 'appel', classe: 'appel', extra: {}, attendu: { modele: 'rep_appel_v1', type: 'reponse' } },
  { nom: 'rgpd (accusé)', classe: 'rgpd', extra: {}, attendu: { modele: 'rep_rgpd_accuse_v1', type: 'reponse_rgpd' } },
  { nom: 'rgpd_acces', classe: 'rgpd_acces', extra: {}, attendu: { modele: 'rep_rgpd_acces_v1', type: 'reponse_rgpd' } },
  { nom: 'rgpd_effacement', classe: 'rgpd_effacement', extra: {}, attendu: { modele: 'rep_rgpd_efface_v1', type: 'reponse_rgpd' } },
  { nom: 'entrant sans candidat', classe: 'entrant', extra: {}, attendu: { modele: 'questions_entrant_v2', type: 'reponse' } },
  { nom: 'sensible', classe: 'sensible', extra: {}, attendu: null },
  { nom: 'hostile', classe: 'hostile', extra: {}, attendu: null },
  { nom: 'pas_maintenant', classe: 'pas_maintenant', extra: {}, attendu: null },
  { nom: 'reponse_auto', classe: 'reponse_auto', extra: {}, attendu: null },
  { nom: 'autre', classe: 'autre', extra: {}, attendu: null },
  { nom: 'a_lire', classe: 'a_lire', extra: {}, attendu: null },
  { nom: 'hors_fil', classe: 'hors_fil', extra: {}, attendu: null },
  { nom: 'ignoree', classe: 'ignoree', extra: {}, attendu: null },
  { nom: 'rgpd_autre', classe: 'rgpd_autre', extra: {}, attendu: null },
  { nom: 'oui (artisan)', classe: 'oui', extra: { cible: 'artisan' }, attendu: null },
])

// Le drapeau siteAchatPublic change prix → rep_prix_v1 (vrai) ou rep_prix_rdv_v1 (faux) : testé à part (RP-11).

const MOTS = (t) => String(t ?? '').toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]{6,}/g) ?? []
/**
 * Le premier mot de 6 lettres ou plus de `texteReponseRecue` (le message du prospect) qui se retrouve dans
 * `texteEnvoiRempli` (le texte préparé) SANS être déjà dans `gabarit` (le modèle brut, non rempli) : une valeur tirée du
 * texte libre de la personne, pas une coïncidence du modèle. Null si aucun.
 */
export function motFuiteDeReponse(gabarit, texteEnvoiRempli, texteReponseRecue) {
  const duGabarit = new Set(MOTS(gabarit))
  const desRempli = new Set(MOTS(texteEnvoiRempli))
  for (const m of MOTS(texteReponseRecue)) if (desRempli.has(m) && !duGabarit.has(m)) return m
  return null
}
