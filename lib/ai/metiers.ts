// Profils par métier (v5 §7) — ce qu'un bon assistant sait AVANT d'ouvrir la bouche.
//
// Huit métiers, un profil chacun : vocabulaire juste, les 3 questions de qualification
// qui font vraiment avancer, les pièges à ne pas commettre, les unités usuelles et la TVA
// courante. Sélection souple depuis `artisans.metier` (« Plombier-chauffagiste » → plombier),
// repli sur un profil générique. Ces blocs ENRICHISSENT les prompts de lib/ai.ts, ils ne
// remplacent pas le cadrage déterministe (`analyzeLead`) qui reste la colonne vertébrale.
//
// Module pur : testable avec `node --experimental-strip-types`.

export type MetierId =
  | 'plombier' | 'electricien' | 'menuisier' | 'macon' | 'peintre' | 'carreleur' | 'couvreur' | 'paysagiste' | 'generique'

export type ProfilMetier = {
  id: MetierId
  label: string
  /** Radicaux (sans accents) reconnus dans `artisans.metier`, par ordre de priorité. */
  alias: string[]
  vocabulaire: string[]
  /** Les questions qui font avancer un chiffrage — 3 max, on ne pose que celles qui manquent. */
  questions: string[]
  pieges: string[]
  unites: string[]
  /** La TVA courante du métier, formulée pour le prompt (la franchise en base prime toujours). */
  tva: string
}

// TVA France, rappel commun : 10 % rénovation d'un logement achevé depuis plus de 2 ans,
// 5,5 % rénovation énergétique, 20 % neuf / extension / doute.
const TVA_RENOV = '10 % en rénovation d’un logement de plus de 2 ans, 20 % dans le neuf ou en cas de doute'

export const PROFILS_METIER: ProfilMetier[] = [
  {
    id: 'plombier', label: 'plombier', alias: ['plomb', 'sanitair', 'chauffag', 'chauffe', 'climatic', 'frigorist'],
    vocabulaire: ['arrivée d’eau', 'évacuation', 'groupe de sécurité', 'ballon / chauffe-eau', 'mitigeur', 'chasse d’eau', 'siphon', 'PER / cuivre / multicouche', 'vanne d’arrêt', 'mise en service'],
    questions: ['Où exactement ça fuit ou ça bloque (sous l’évier, WC, ballon, canalisation) et depuis quand ?', 'L’eau est-elle coupée / avez-vous pu couper l’arrivée générale ?', 'Quel matériel est en place (marque, âge, capacité du ballon) — une photo aide beaucoup.'],
    pieges: ['ne jamais diagnostiquer à distance une cause certaine (« c’est le joint »)', 'ne pas promettre un dépannage sans pièce en stock', 'ne pas parler gaz sans rappeler de couper et d’aérer'],
    unites: ['u (appareil)', 'ml (tuyauterie)', 'h (main d’œuvre)', 'forfait (dépannage, mise en service)'],
    tva: `${TVA_RENOV} ; 5,5 % pour un ballon thermodynamique, une chaudière à condensation ou une PAC (rénovation énergétique).`,
  },
  {
    id: 'electricien', label: 'électricien', alias: ['electric', 'electri', 'domotiq', 'courant'],
    vocabulaire: ['tableau électrique', 'disjoncteur / différentiel', 'mise aux normes NF C 15-100', 'point lumineux', 'prise / interrupteur', 'saignée', 'gaine ICTA', 'Consuel', 'mise à la terre', 'compteur Linky'],
    questions: ['Combien de points (prises, interrupteurs, luminaires) et dans quelles pièces ?', 'Le tableau actuel est-il récent ou à reprendre (photo du tableau ouvert si possible) ?', 'Logement occupé ou vide, murs pleins ou cloisons (pour les saignées) ?'],
    pieges: ['ne jamais rassurer sur une odeur de brûlé ou un disjoncteur qui saute : couper au général et faire constater', 'ne pas promettre le Consuel ni une attestation sans visite', 'ne pas confondre rénovation partielle et mise aux normes complète'],
    unites: ['u (point, appareillage)', 'ml (câble, gaine)', 'forfait (tableau, mise aux normes)', 'h'],
    tva: `${TVA_RENOV}.`,
  },
  {
    id: 'menuisier', label: 'menuisier', alias: ['menuis', 'ebenist', 'agenc', 'fenetr', 'porte'],
    vocabulaire: ['sur-mesure', 'dormant / ouvrant', 'dépose totale ou en rénovation', 'double vitrage', 'PVC / alu / bois', 'quincaillerie', 'habillage', 'calfeutrement', 'essence de bois', 'finition (lasure, vernis, huile)'],
    questions: ['Combien d’ouvertures ou de pièces, avec les dimensions approximatives (hauteur × largeur) ?', 'Matériau souhaité (bois, PVC, alu) et pose en rénovation (sur l’existant) ou dépose totale ?', 'Une photo de l’existant et de l’environnement (mur, tableau, appui) ?'],
    pieges: ['ne pas promettre un délai de fabrication (le sur-mesure dépend du fournisseur)', 'ne pas chiffrer sans dimensions', 'ne pas oublier la dépose et l’évacuation'],
    unites: ['u (ouvrage)', 'ml (placard, habillage, plinthe)', 'm² (parquet, lambris)', 'h'],
    tva: `${TVA_RENOV} ; 5,5 % pour des menuiseries isolantes qui améliorent la performance thermique.`,
  },
  {
    id: 'macon', label: 'maçon', alias: ['macon', 'gros oeuvre', 'beton', 'renovation', 'batiment', 'tce', 'tous corps'],
    vocabulaire: ['mur porteur', 'linteau / IPN', 'dalle', 'chape', 'parpaing / brique', 'fondations', 'enduit', 'ouverture', 'évacuation des gravats', 'étaiement'],
    questions: ['S’agit-il d’un mur porteur ou d’une cloison (une photo des deux côtés aide) ?', 'Quelles dimensions (longueur, hauteur, épaisseur ou surface au sol) ?', 'Accès au chantier pour les matériaux et les gravats (étage, cour, rue) ?'],
    pieges: ['jamais d’ouverture de mur porteur sans visite (et souvent un bureau d’études)', 'ne pas oublier l’évacuation des gravats et l’accès', 'extension / surélévation = neuf → TVA 20 %'],
    unites: ['m² (dalle, enduit, mur)', 'm³ (béton, gravats)', 'u (ouverture, linteau)', 'forfait', 'h'],
    tva: `${TVA_RENOV} ; une extension ou une construction neuve est à 20 %.`,
  },
  {
    id: 'peintre', label: 'peintre', alias: ['peint', 'decorat', 'platr', 'plaqu', 'enduit', 'ravalement'],
    vocabulaire: ['préparation des supports', 'rebouchage / ratissage', 'sous-couche', 'deux couches', 'finition mate / velours / satin', 'boiseries', 'toile de verre', 'protection', 'ravalement', 'lessivage'],
    questions: ['Quelles pièces et quelle surface approximative (murs, plafonds, boiseries) ?', 'État des supports : fissures, papier peint à retirer, humidité, trous ?', 'Pièces vides ou meublées, et une photo pour voir l’état ?'],
    pieges: ['ne pas sous-estimer la préparation (c’est le cœur du prix)', 'ne pas promettre une teinte ou une finition sans échantillon', 'ne pas ignorer l’humidité (traiter avant de peindre)'],
    unites: ['m² (murs, plafonds)', 'ml (plinthes, boiseries)', 'u (porte, radiateur)', 'forfait (protection, nettoyage)'],
    tva: `${TVA_RENOV}.`,
  },
  {
    id: 'carreleur', label: 'carreleur', alias: ['carrel', 'faienc', 'sol', 'revet', 'parquet'],
    vocabulaire: ['ragréage', 'dépose', 'pose droite / diagonale', 'grand format', 'joints', 'plinthes', 'étanchéité (SPEC)', 'chape', 'faïence', 'découpes'],
    questions: ['Quelle surface (m²) et quelle pièce (sol, murs, douche) ?', 'Le support actuel : ancien carrelage à déposer, chape brute, plancher bois ?', 'Le carrelage est-il déjà choisi / acheté (format, épaisseur) — une photo du support ?'],
    pieges: ['ne pas chiffrer sans surface ni état du support', 'ne pas oublier la dépose, le ragréage et les plinthes', 'douche à l’italienne = étanchéité obligatoire'],
    unites: ['m² (pose, dépose, ragréage)', 'ml (plinthes)', 'forfait (joints, finitions)', 'h'],
    tva: `${TVA_RENOV}.`,
  },
  {
    id: 'couvreur', label: 'couvreur', alias: ['couvr', 'toitur', 'toit', 'zingu', 'charpent', 'etanch'],
    vocabulaire: ['tuiles / ardoises', 'liteaux', 'écran sous-toiture', 'faîtage', 'gouttières / descentes', 'noue', 'solin', 'échafaudage', 'démoussage', 'Velux'],
    questions: ['Type de couverture (tuiles, ardoises, bac acier) et surface ou nombre de pans ?', 'Que se passe-t-il exactement (fuite, tuiles cassées, mousse) et depuis quand ?', 'Hauteur du bâtiment et accès (échafaudage possible ?) — une photo depuis le sol aide.'],
    pieges: ['ne jamais promettre une intervention par mauvais temps', 'ne pas oublier l’échafaudage et la sécurité (c’est un poste à part)', 'une fuite peut venir d’ailleurs que de la tuile visible : constater avant d’affirmer'],
    unites: ['m² (couverture, démoussage)', 'ml (gouttières, faîtage)', 'u (Velux, tuiles)', 'forfait (échafaudage)'],
    tva: `${TVA_RENOV} ; 5,5 % pour l’isolation des combles ou de la toiture.`,
  },
  {
    id: 'paysagiste', label: 'paysagiste', alias: ['paysag', 'jardin', 'espaces verts', 'elag', 'terrass', 'cloture'],
    vocabulaire: ['terrassement', 'engazonnement', 'plantation', 'taille', 'élagage', 'arrosage', 'dallage / pavage', 'clôture', 'évacuation des déchets verts', 'entretien saisonnier'],
    questions: ['Quelle surface de terrain ou de zone concernée (m²) ?', 'Que souhaitez-vous : création, entretien régulier ou intervention ponctuelle ?', 'Accès pour les engins et évacuation, et une photo du terrain ?'],
    pieges: ['ne pas promettre une date de plantation hors saison', 'ne pas oublier l’évacuation des déchets verts', 'l’élagage d’un grand arbre demande une visite (sécurité)'],
    unites: ['m² (gazon, dallage)', 'ml (haie, clôture)', 'u (arbre, arbuste)', 'h', 'forfait'],
    tva: `20 % par défaut (création, aménagement) ; 10 % pour l’entretien de jardin d’un logement de plus de 2 ans ; 10 % ou 20 % au cas par cas pour les plantations.`,
  },
]

export const PROFIL_GENERIQUE: ProfilMetier = {
  id: 'generique', label: 'artisan du bâtiment', alias: [],
  vocabulaire: ['fourniture et pose', 'dépose', 'main d’œuvre', 'mise en service', 'finitions'],
  questions: ['Pouvez-vous décrire précisément ce qui est à faire et où ?', 'Quelles dimensions ou surfaces approximatives ?', 'Une photo de l’existant ?'],
  pieges: ['ne pas chiffrer sans les éléments de base', 'ne pas s’engager sur un travail hors de son métier'],
  unites: ['u', 'm²', 'ml', 'h', 'forfait'],
  tva: `${TVA_RENOV}.`,
}

const normaliser = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Sélection SOUPLE du profil depuis `artisans.metier` : « Plombier-chauffagiste » → plombier,
 * « Électricien général » → électricien. Le premier profil dont un alias apparaît gagne
 * (l'ordre du tableau règle les cas mixtes : « plombier chauffagiste » reste plombier).
 */
export function detecterMetier(metier: string | null | undefined): MetierId {
  const n = ' ' + normaliser(metier || '') + ' '
  if (!n.trim()) return 'generique'
  // On regarde d'abord le PREMIER mot (le métier principal), puis le reste.
  const premier = n.trim().split(' ')[0]
  for (const p of PROFILS_METIER) if (p.alias.some((a) => premier.startsWith(a.replace(/\s/g, '')))) return p.id
  for (const p of PROFILS_METIER) if (p.alias.some((a) => n.includes(a))) return p.id
  return 'generique'
}

export function profilMetier(metier: string | null | undefined): ProfilMetier {
  const id = detecterMetier(metier)
  return PROFILS_METIER.find((p) => p.id === id) ?? PROFIL_GENERIQUE
}

/** La règle de TVA à énoncer : la franchise en base PRIME sur tout le reste. */
export function regleTva(profil: ProfilMetier, tvaRegime: string | null | undefined): string {
  if ((tvaRegime || 'franchise') === 'franchise') {
    return 'Cet artisan est en FRANCHISE EN BASE DE TVA (art. 293 B du CGI) : TVA non applicable, aucun taux à appliquer, les montants sont nets. Si le client demande la TVA, réponds simplement qu’elle n’est pas applicable à cette entreprise.'
  }
  return `TVA courante du métier : ${profil.tva} Le taux se choisit poste par poste et se confirme sur le devis, jamais dans un message.`
}

/** Bloc injecté dans les prompts de RÉPONSE (première réponse, conversation, relance). */
export function blocMetierReponse(profil: ProfilMetier, tvaRegime?: string | null): string {
  if (profil.id === 'generique') return ''
  return `

MÉTIER — ${profil.label.toUpperCase()} (connaissance du métier, à utiliser avec justesse, jamais pour étaler) :
- Vocabulaire juste : ${profil.vocabulaire.join(', ')}.
- Questions de qualification qui font avancer (n’en pose que celles dont la réponse MANQUE, 3 au maximum sur toute la conversation) : ${profil.questions.map((q, i) => `(${i + 1}) ${q}`).join(' ')}
- Pièges à éviter : ${profil.pieges.join(' ; ')}.
- ${regleTva(profil, tvaRegime)}`
}

/** Bloc injecté dans le prompt de CHIFFRAGE (generateDevis) : unités et TVA du métier. */
export function blocMetierChiffrage(profil: ProfilMetier, tvaRegime?: string | null): string {
  const franchise = (tvaRegime || 'franchise') === 'franchise'
  const tva = franchise
    ? 'RÉGIME DE TVA DE CET ARTISAN : franchise en base (art. 293 B du CGI) → "tva_taux": 0 sur TOUTES les lignes, et rappelle dans "note" que la TVA n’est pas applicable.'
    : `TVA courante du métier : ${profil.tva}`
  if (profil.id === 'generique') return `\n${tva}`
  return `
Unités usuelles du métier : ${profil.unites.join(' ; ')}. Vocabulaire attendu dans les désignations : ${profil.vocabulaire.slice(0, 6).join(', ')}.
Pièges du métier à refléter dans les postes et la note : ${profil.pieges.join(' ; ')}.
${tva}`
}
