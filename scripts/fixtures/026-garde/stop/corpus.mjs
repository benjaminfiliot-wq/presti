// scripts/fixtures/026-garde/stop/corpus.mjs — les jeux d'essai du juge garde-stop-qa (décision de Benj du 30/09 : les garde-fous
// automatiques remplacent son accord à chaque envoi). Textes et expéditeurs seulement : aucune dépendance, aucune donnée réelle
// (tout domaine se termine par .invalid, toute personne est inventée).
//
// Le cas jugé : un STOP ou une demande RGPD reçu en NOUVEL e-mail, hors de tout fil (ni envoi, ni conversation, ni prospect
// connus). Règle attendue : l'opposition et la demande RGPD passent AVANT le rattachement à un fil ; si l'expéditeur n'est pas
// exploitable, une carte « attention » est ouverte, jamais un silence.

/** L'expéditeur ordinaire des essais : un domaine professionnel inventé. */
export const EXPEDITEUR = 'Jean.Dupont@Atelier-Temoin.invalid'
export const ADRESSE_ATTENDUE = 'jean.dupont@atelier-temoin.invalid'
export const DOMAINE_PRO = 'atelier-temoin.invalid'

// ── GS-1 : les formes d'un STOP (casse, accents, ponctuation) ────────────────────────────────────────────────────────────
export const STOPS = [
  'stop', 'STOP', 'Stop', 'Stop à vos mails', 'STOP !!!', 'stop.', '« STOP »', '"stop"',
  'Arrêtez', 'ARRÊTEZ SVP', 'arretez de m’écrire', 'Arrêtez vos mails, merci.',
  'désinscription', 'DÉSINSCRIPTION', 'desinscription', 'Désinscrivez-moi de votre liste',
  'je m’oppose', "Je m'oppose à ces courriels", 'JE M’OPPOSE.',
  'ne me contactez plus', 'Ne me contactez plus !', 'NE ME CONTACTEZ PLUS, MERCI',
  'STOP\r\n\r\nLe 12/10/2026, Presti a écrit :\n> Bonjour, une maquette pour votre site…',
]

// ── GS-2 : les demandes sur les données (RGPD) ───────────────────────────────────────────────────────────────────────────
export const RGPDS = [
  "Bonjour, je souhaite exercer mon droit d'accès à mes données personnelles.",
  "Supprimez mes données s'il vous plaît.",
  "Conformément au RGPD, je demande l'effacement de mes informations.",
  "J'exige l'effacement de mes données personnelles (article 17).",
  'Si vous ne supprimez pas mes données, je saisis la CNIL.',
  'SUPPRIMEZ MES DONNÉES',
  'Quelles données personnelles avez-vous sur moi ? Merci de me répondre.',
]

/** STOP et demande RGPD dans le même message : l'opposition s'applique d'abord. */
export const STOP_ET_RGPD = 'STOP, et supprimez mes données personnelles.'

// ── GS-3 : des expéditeurs inexploitables ────────────────────────────────────────────────────────────────────────────────
export const EXPEDITEURS_INEXPLOITABLES = [
  undefined, null, '', '   ', 'pas une adresse', 'Jean Dupont', '@', 'jean@', 'jean@atelier', '<>', 'MAILER-DAEMON',
  'jean dupont@atelier-temoin.invalid', 'a@b@c.invalid', 'jean..dupont@atelier-temoin.invalid',
]

// ── GS-4 : des messages ordinaires hors fil, qui doivent rester `hors_fil` ──────────────────────────────────────────────
export const ORDINAIRES_HORS_FIL = [
  'Bonjour, qui êtes-vous ?',
  'Bonjour, je ne me souviens pas vous avoir contacté.',
  'Nos machines font un stop à la chaîne de montage chaque soir, vous pouvez passer voir ?',
  'Je ne veux pas de stop à la chaîne de montage, pouvez-vous chiffrer un autre poste ?',
  'Stoppage du chantier jusqu’en janvier, rappelez-moi après.',
  'Le robinet d’arrêt et le stop-tout sont à remplacer, vous intervenez à Lille ?',
  'Non, pas avant janvier',
  "Non, c'est combien ?",
  'Nous avons un arrêt de chantier cette semaine, pouvez-vous reprendre le crépi ?',
  'Je cherche une menuiserie pour un escalier, avez-vous des disponibilités ?',
]

// ── GS-5 : les expéditeurs de la durabilité ─────────────────────────────────────────────────────────────────────────────
/** Nom affiché, chevrons, alias « +étiquette », casse mêlée. */
export const EXPEDITEUR_AFFICHE = '"Dupont, Jean" <Jean.Dupont+Devis@Atelier-Temoin.invalid>'
export const ADRESSE_AFFICHE = 'jean.dupont+devis@atelier-temoin.invalid'
export const ADRESSE_AFFICHE_BASE = 'jean.dupont@atelier-temoin.invalid'
/** Une messagerie gratuite : l'adresse est en opposition, jamais tout le domaine. */
export const EXPEDITEUR_GRATUIT = 'Marie.Martin@Gmail.com'
export const ADRESSE_GRATUITE = 'marie.martin@gmail.com'
export const AUTRE_ADRESSE_GRATUITE = 'autre.personne@gmail.com'
export const AUTRE_ADRESSE_MEME_DOMAINE = 'comptabilite@atelier-temoin.invalid'

/** Les méthodes du magasin que le Standard a le droit d'appeler en écriture (026-085 §8, plus le bilan). */
export const ECRITURES_PERMISES = [
  'classerReponse', 'opposer', 'mettreAJour', 'creerDecision', 'enregistrerCandidats', 'ajouterEmailEntrant', 'demanderEffacement',
  'actesFaits', 'evenement', 'reponseRecue',
]
/** Les méthodes par lesquelles un message part, ou se prépare à partir. */
export const METHODES_ENVOI = [
  'preparerEnvoi', 'approuverEnvoi', 'marquerEnvoye', 'creerLienRdv', 'creerLienMaquette', 'reponseRepondue', 'formulairesAPorter',
]
