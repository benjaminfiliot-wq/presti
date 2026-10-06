// Qualification déterministe d'une demande entrante (0 coût IA) : le type de chantier, lu dans le message.
//
// Pourquoi un module à part (06/10, vague 2) : le tableau de bord /chiffres range les demandes par type de chantier, et ce
// rangement n'est utile que si la qualification est juste. Elle vivait dans lib/ai.ts, mêlée aux prompts ; ici, elle n'importe
// rien, ce qui permet au juge scripts/qualification-qa.mjs de la charger seule et de la saboter sur une copie.
//
// Les mots ajoutés le 06/10 viennent des demandes réelles restées sans type en production (« mitigeur », « vitre »,
// « bibliothèque ») et du vocabulaire courant des quatre métiers ciblés par la stratégie (docs/presti/STRATEGIE-GLOBALE-0610.md
// §1 : plombier-chauffagiste, électricien, menuisier, couvreur). Et un défaut d'origine : la clé « electric » ne prend pas
// « électrique » (q, pas c) ; seule « tableau électrique » le rattrapait, « panneau électrique » restait sans type.

/** Minuscule sans accents ni ponctuation, espaces normalisés — pour la détection de mots-clés. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques combinants)
    .replace(/[^a-z0-9]+/g, ' ') // ponctuation/apostrophes → espaces
    .trim()
}

/** true si l'un des mots-clés (déjà "sans accents") apparaît dans le texte normalisé `n`. */
export function has(n: string, keys: string[]): boolean {
  // Audit v5 : `includes` prenait « je voudrais SAVoir » pour un SAV (réclamation), « PANNEaux » pour
  // une panne, « imPORTEant » pour de la menuiserie. Mot entier (pluriel toléré) ; une clé de six
  // lettres et plus vaut aussi comme début de mot (« inondation », « dépannage »).
  return keys.some((k) => {
    const kk = normalize(k)
    if (!kk) return false
    const e = kk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(kk.length >= 6 ? `(^| )${e}` : `(^| )${e}(s|x|e|es)?( |$)`).test(n)
  })
}

// Type de chantier déduit des mots-clés de la demande. Ordre = priorité de tranche : la première famille trouvée l'emporte
// (« fenêtre de toit » est de la toiture parce que Toiture passe avant Menuiserie ; « compteur d'eau » de la plomberie parce
// que Plomberie passe avant Électricité).
export const TYPE_CHANTIER: { label: string; keys: string[] }[] = [
  { label: 'Plomberie', keys: ['fuite', 'robinet', 'mitigeur', 'chauffe eau', 'wc', 'toilette', 'evier', 'lavabo', 'canalisation', 'tuyau', 'douche', 'baignoire', 'degat des eaux', 'siphon', 'chasse d eau', 'debouch', 'compteur d eau', 'adoucisseur', 'groupe de securite'] },
  { label: 'Chauffage', keys: ['chaudiere', 'radiateur', 'pompe a chaleur', 'pac', 'thermostat', 'plancher chauffant', 'chauffage', 'ballon d eau', 'climatisation', 'clim', 'frigo', 'poele a granules', 'poele a bois'] },
  { label: 'Électricité', keys: ['electric', 'electrique', 'prise', 'tableau electrique', 'tableau', 'disjoncteur', 'differentiel', 'court circuit', 'compteur', 'luminaire', 'eclairage', 'spot', 'interrupteur', 'panne de courant', 'mise aux normes', 'cablage', 'recablage', 'borne de recharge', 'vmc', 'interphone', 'visiophone', 'consuel'] },
  { label: 'Toiture', keys: ['toit', 'toiture', 'tuile', 'ardoise', 'gouttiere', 'charpente', 'zinguerie', 'faitage', 'couverture', 'demoussage', 'velux', 'chenau', 'solin'] },
  { label: 'Menuiserie', keys: ['fenetre', 'porte', 'volet', 'parquet', 'escalier', 'dressing', 'placard', 'veranda', 'menuiserie', 'portail', 'store', 'bibliotheque', 'meuble sur mesure', 'meubles sur mesure', 'agencement', 'baie vitree', 'lambris', 'plinthe'] },
  { label: 'Vitrerie', keys: ['vitre', 'vitrage', 'miroir'] },
  { label: 'Peinture', keys: ['peinture', 'peindre', 'enduit', 'papier peint', 'ravalement', 'lasure'] },
  { label: 'Maçonnerie', keys: ['macon', 'dalle', 'terrasse', 'fondation', 'parpaing', 'extension', 'chape', 'beton', 'ouverture de mur'] },
  { label: 'Carrelage', keys: ['carrelage', 'carreau', 'faience', 'pose de sol'] },
  { label: 'Salle de bain', keys: ['salle de bain', 'salle d eau'] },
  { label: 'Cuisine', keys: ['cuisine', 'plan de travail', 'credence'] },
  { label: 'Isolation', keys: ['isolation', 'isoler', 'combles', 'laine de verre'] },
  { label: 'Serrurerie', keys: ['serrure', 'serrurier', 'porte blindee', 'cylindre', 'verrou'] },
]

// Tournures où un mot-clé ne désigne pas un chantier : « prise en charge » n'est pas une prise électrique, « ma demande porte
// sur » n'est pas une porte. Elles sont effacées du message avant la recherche (mots entiers, sur le texte normalisé).
export const TOURNURES_NEUTRES = [
  'prise en charge', 'prise de rendez vous', 'prise de rdv', 'prise de mesure', 'prise de mesures', 'prise de cote', 'prise de cotes',
  'porte sur', 'portes ouvertes', 'porte monnaie', 'couverture decennale', 'couverture d assurance', 'couverture assurance',
]

function sansTournuresNeutres(n: string): string {
  let t = ` ${n} `
  for (const tour of TOURNURES_NEUTRES) t = t.split(` ${normalize(tour)} `).join(' ')
  return t.replace(/ +/g, ' ').trim()
}

/** Métier → libellé de repli quand aucun mot-clé de la demande ne tranche. */
export function metierToType(metier?: string | null): string | null {
  if (!metier) return null
  const m = normalize(metier)
  const map: [string, string][] = [
    ['plomb', 'Plomberie'], ['chauffag', 'Chauffage'], ['frigoriste', 'Chauffage'], ['climatis', 'Chauffage'],
    ['electric', 'Électricité'], ['couvreur', 'Toiture'], ['toitur', 'Toiture'], ['charpent', 'Toiture'],
    ['menuis', 'Menuiserie'], ['ebenist', 'Menuiserie'], ['vitrier', 'Vitrerie'], ['peintr', 'Peinture'], ['macon', 'Maçonnerie'],
    ['carrel', 'Carrelage'], ['serrur', 'Serrurerie'],
  ]
  for (const [k, v] of map) if (m.includes(k)) return v
  return null
}

/** Le type de chantier d'une demande : lu dans le message, à défaut le métier de l'artisan, à défaut null. */
export function typeChantier(message?: string | null, metier?: string | null): string | null {
  const n = sansTournuresNeutres(normalize((message || '').trim()))
  if (n) { const hit = TYPE_CHANTIER.find((t) => has(n, t.keys)); if (hit) return hit.label }
  return metierToType(metier)
}
