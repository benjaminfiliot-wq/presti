// scripts/fixtures/026-acquisition/douleurs/entrees.mjs — jeu d'essai du juge douleurs-qa (fiche 026-071), au format
// de `DOULEURS` (026-073, §2). Une entrée conforme et onze variantes fautives (une par règle du cahier DL-2/DL-3/DL-5),
// plus une entrée dont la page source est interdite par robots.txt (DL-4). Aucune donnée personnelle, aucun vrai nom,
// aucun domaine réel hors la seule entrée qui teste le domaine exclu du contrat (026-016), où le nom du domaine est la
// donnée même que la règle interdit — jamais un pseudo, un nom ou un numéro inventés.
//
// Chaque entrée porte soit `chemin` (servie par le serveur local du juge, pour DL-4 en --hors-ligne/--auto-controle),
// soit `source_url` (une adresse absolue, jamais relue : elle sert un contrôle structurel, pas la substance). `attendu`
// donne le critère qui doit la refuser, et un extrait de la raison ; `null` pour une entrée conforme.

const CITATION_PLOMBIER = "Le pire c'est les demandes qui arrivent le soir, pendant que je suis encore sur un chantier, et personne ne répond avant le lendemain matin."
const CITATION_MENUISIER = "Je ne sais jamais si les clients me trouvent parce que mon site existe ou juste par hasard, et je n'ai pas le temps de m'en occuper après une journée d'atelier."

const base = (over) => ({
  metier: 'plombier',
  citation: CITATION_PLOMBIER,
  chemin: '/plombier-devis-soir.html',
  relevee_le: '2026-09-01',
  mots_cles: ['devis', 'soir', 'reponse'],
  question: 'Les demandes qui arrivent le soir, pendant que vous êtes sur un chantier, qui y répond ?',
  accroche_objet: 'Le soir, qui répond à votre place ?',
  approuve: false,
  ...over,
})

export const ENTREES_ESSAI = [
  {
    id: 'plombier-devis-soir',
    cas: 'conforme (plombier)',
    conforme: true,
    attendu: null,
    entree: base({ id: 'plombier-devis-soir' }),
  },
  {
    id: 'menuisier-visibilite',
    cas: 'conforme (menuisier)',
    conforme: true,
    attendu: null,
    entree: base({
      id: 'menuisier-visibilite', metier: 'menuisier', citation: CITATION_MENUISIER, chemin: '/menuisier-visibilite.html',
      mots_cles: ['visibilite', 'temps'], question: 'Vos nouveaux clients, est-ce vraiment votre site qui les amène ?',
      accroche_objet: "Est-ce vraiment votre site qui les amène ?",
    }),
  },
  {
    id: 'faute-citation-retouchee',
    cas: 'citation retouchée (un mot changé, absente de la page)',
    conforme: false,
    attendu: { id: 'DL-4', motif: 'absente' },
    entree: base({ id: 'faute-citation-retouchee', citation: "Le pire c'est les demandes qui arrivent le soir, pendant que je suis encore sur un chantier, et personne ne répond avant le mardi matin." }),
  },
  {
    id: 'faute-citation-longue',
    cas: 'citation de 250 signes (200 au plus attendu)',
    conforme: false,
    attendu: { id: 'DL-2', motif: '200' },
    entree: base({ id: 'faute-citation-longue', citation: 'Témoin '.repeat(36).trim().slice(0, 250).padEnd(250, '.') }),
  },
  {
    id: 'faute-pseudo-slash',
    cas: 'pseudo u/… dans la citation',
    conforme: false,
    attendu: { id: 'DL-3', motif: 'u/' },
    entree: base({ id: 'faute-pseudo-slash', citation: "Comme le dit u/ArtisanTemoin77, les demandes du soir sont un vrai problème pour nous." }),
  },
  {
    id: 'faute-arobase-pseudo',
    cas: 'pseudo @… dans la citation',
    conforme: false,
    attendu: { id: 'DL-3', motif: '@' },
    entree: base({ id: 'faute-arobase-pseudo', citation: "@ArtisanTemoin le confirme sur le fil : les demandes du soir posent un vrai problème." }),
  },
  {
    id: 'faute-email-citation',
    cas: 'adresse e-mail dans la citation',
    conforme: false,
    attendu: { id: 'DL-3', motif: 'e-mail' },
    entree: base({ id: 'faute-email-citation', citation: "Contactez-moi directement à contact@temoin-forum.invalid si vous avez la même galère le soir." }),
  },
  {
    id: 'faute-telephone-citation',
    cas: 'numéro de téléphone dans la citation',
    conforme: false,
    attendu: { id: 'DL-3', motif: 'phone' },
    entree: base({ id: 'faute-telephone-citation', citation: "Appelez-moi au 06 12 34 56 78, je vous raconterai mes soirées de devis." }),
  },
  {
    id: 'faute-domaine-exclu',
    // Le seul cas où l'adresse n'est pas en .invalid : c'est un domaine de la liste fermée DOMAINES_EXCLUS du contrat
    // (026-016), la donnée même que DL-3 doit reconnaître et refuser — jamais un domaine inventé ni une vraie page.
    cas: 'source sur un domaine exclu (annuaire)',
    conforme: false,
    attendu: { id: 'DL-3', motif: 'exclu' },
    entree: base({ id: 'faute-domaine-exclu', source_url: 'https://www.pagesjaunes.fr/avis/temoin', chemin: undefined }),
  },
  {
    id: 'faute-metier-inconnu',
    cas: 'métier inconnu',
    conforme: false,
    attendu: { id: 'DL-2', motif: 'metier' },
    entree: base({ id: 'faute-metier-inconnu', metier: 'temoin-metier-inexistant' }),
  },
  {
    id: 'faute-question-sans-point',
    cas: "question sans point d'interrogation",
    conforme: false,
    attendu: { id: 'DL-2', motif: '?' },
    entree: base({ id: 'faute-question-sans-point', question: 'Les demandes qui arrivent le soir, qui y répond' }),
  },
  {
    id: 'faute-question-longue',
    cas: 'question de plus de 160 signes',
    conforme: false,
    attendu: { id: 'DL-2', motif: '160' },
    entree: base({ id: 'faute-question-longue', question: `${'Les demandes qui arrivent le soir, pendant que vous êtes sur un chantier, et qui ne trouvent jamais personne pour y répondre avant le lendemain matin, ça vous arrive '.slice(0, 190)} ?` }),
  },
  {
    id: 'faute-id-double',
    cas: 'identifiant en double (reprend plombier-devis-soir)',
    conforme: false,
    attendu: { id: 'DL-2', motif: 'double' },
    entree: base({ id: 'plombier-devis-soir', citation: CITATION_MENUISIER, chemin: '/menuisier-visibilite.html' }),
  },
  {
    id: 'faute-page-interdite',
    cas: 'page interdite par robots.txt (PrestiRecenseur)',
    conforme: false,
    attendu: { id: 'DL-4', motif: 'robots' },
    entree: base({ id: 'faute-page-interdite', chemin: '/interdit/page.html' }),
  },
  {
    id: 'faute-terme-interdit',
    cas: 'terme interdit dans la question (liste noire de J3)',
    conforme: false,
    attendu: { id: 'DL-5', motif: 'garanti' },
    entree: base({ id: 'faute-terme-interdit', question: 'Vos devis du soir sont-ils garantis comme le jour ?' }),
  },
]

/**
 * Sert de source à un test de comptage (DL-1) : des entrées minimales, sans réseau, juste { id, metier }. `conforme`
 * vrai → 8 métiers à 5 entrées chacun (40 au total, chacun au-dessus de 3) ; faux → le premier métier retombe à
 * 2 entrées (couverture insuffisante et total sous 40), seul écart avec la version conforme.
 */
export function couvertureEssai(conforme) {
  const metiers = ['menuisier', 'plombier', 'chauffagiste', 'electricien', 'couvreur', 'charpentier', 'carreleur', 'peintre']
  const entrees = []
  for (const [k, m] of metiers.entries()) {
    const n = !conforme && k === 0 ? 2 : 5
    for (let i = 0; i < n; i++) entrees.push({ id: `${m}-${i}`, metier: m })
  }
  return entrees
}
