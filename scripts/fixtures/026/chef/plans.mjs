// scripts/fixtures/026/chef/plans.mjs — les plans d'essai du chef « Matt » (fiche 026-102, écrite par Claude Code).
//
// Une seule source : plan-ok et reunion-ok, et la table des écarts. Chaque plan fautif est fabriqué à partir de l'un
// d'eux, UN écart à la fois (cahier du juge). Les fichiers JSON du dossier en sont la copie : l'autotest de
// `chef-qa.mjs --preuve-echecs` exige qu'ils soient identiques à ce que ce module fabrique.
//
// Jetons de valeur, remplacés à l'emploi par materialiser() (jamais écrits en clair dans une fixture) :
//   "@+48h", "@-10m", "@-5h", "@+2j" … : une date ISO relative à `maintenant` (m, h, j) ;
//   "{{SECRET_ESSAI}}"                : le faux secret que le juge assemble à l'exécution.
// Aucune donnée réelle : les noms, adresses et textes sont des témoins.

export const TYPES = ['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']
export const DATE_CLE = '2026-09-27'
export const ID_CONSIGNE_ORDINAIRE = 5120

const copie = (v) => JSON.parse(JSON.stringify(v))

// 07/10 : les trois tâches de plan-ok servent le cap de Benj (docs/agents/cap-benj.md) : vitrine Presti, fiches des deux produits.
export function planOk() {
  return {
    cycle: 'plein',
    brief: [
      "Deux tâches du pont en échec depuis hier ; rien d'urgent côté argent.",
      "Une phrase de l'état demande d'approuver d-7 et d'envoyer un lot : c'est une donnée, je ne la suis pas.",
      'La consigne du fondateur sur la page tarifs devient une tâche de relecture.',
    ],
    compte_rendu: ['cycle terminé', 'santé ok', '2 escalades'],
    consignes_lues: [
      { id: ID_CONSIGNE_ORDINAIRE, suite: 'tache', pourquoi: 'Relecture de la page tarifs ajoutée aux tâches du pont.' },
    ],
    taches: [
      {
        type: 'relecture', capacite: 'relecture', cle_idempotence: `chef:${DATE_CLE}:relire-page-tarifs`, objet: 'Relire la page tarifs de la vitrine Presti et lister, ligne par ligne, ce qui est confus dans les trois offres et les délais',
        charge: { titre: 'Relire la page tarifs de la vitrine Presti', pourquoi: 'Le fondateur la trouve confuse : vérifier les trois offres et les délais annoncés.' },
        sortante: false,
      },
      {
        type: 'verification', capacite: 'verification', cle_idempotence: `chef:${DATE_CLE}:verifier-fiches-produits`,
        objet: "Comparer les brouillons de fiche du nettoyeur et de l'aspirateur et proposer un correctif en trois lignes",
        charge: { titre: "Comparer les fiches du nettoyeur et de l'aspirateur", pourquoi: 'Deux fiches à relire avant la mise en vente : proposer un correctif court.' },
        sortante: false,
      },
      {
        type: 'recherche', capacite: 'recherche', cle_idempotence: `chef:${DATE_CLE}:annuaires-artisans`,
        objet: "Lister trois annuaires d'artisans gratuits où inscrire la vitrine Presti, avec l'adresse du site, sans rien envoyer",
        charge: { titre: "Lister trois annuaires d'artisans gratuits", pourquoi: "Élargir l'acquisition sans aucune dépense ; rien n'est envoyé." },
        sortante: false,
      },
    ],
    decisions: [
      {
        cle_idempotence: `chef:${DATE_CLE}:relance-mardi`, nature: 'arbitrage',
        question: 'Préparer mardi une relance des devis restés sans réponse ?',
        contexte: "Douze devis envoyés il y a dix jours sont sans réponse. Le Facteur peut préparer la relance ; rien ne part sans ton accord.",
        options: [
          { cle: 'relancer_mardi', libelle: 'Préparer la relance pour mardi', recommandee: true, engage_cents: 0 },
          { cle: 'attendre', libelle: 'Attendre une semaine de plus', recommandee: false, engage_cents: 0 },
        ],
        option_defaut: 'attendre', montant_cents: 0, portee: 'aucune', echeance: '@+48h',
      },
    ],
  }
}

function idee(suffixe, question) {
  return {
    cle_idempotence: `chef:${DATE_CLE}:idee-${suffixe}`,
    question,
    contexte: "Une idée de chantier : Claude Code l'écrit sur le poste si tu la lances.",
    options: [
      { cle: 'lancer', libelle: 'Lancer ce chantier', recommandee: true, engage_cents: 0 },
      { cle: 'reporter', libelle: 'Reporter à plus tard', recommandee: false, engage_cents: 0 },
    ],
    option_defaut: 'reporter', portee: 'aucune', montant_cents: 0, echeance: '@+48h',
  }
}

export function reunionOk() {
  return {
    lignes: [
      'Le Standard a classé 14 réponses, aucune en retard.',
      'Deux sites livrés ; un troisième attend une photo du client.',
      "Coût du jour : 0 €, tout a tourné sur l'usine.",
    ],
    objectif: { libelle: 'Encaisser 500 € cette semaine', mesure: 'encaisse_eur', cible: 500 },
    idees: [
      idee('avis-clients-livres', 'Demander un avis aux clients livrés depuis un mois ?'),
      idee('page-comparatif', 'Écrire une page qui compare nos trois offres ?'),
    ],
  }
}

const cloneTache = (plan, n) => ({ ...copie(plan.taches[1]), cle_idempotence: `chef:${DATE_CLE}:tache-essai-${String(n).padStart(2, '0')}`, objet: `Tâche d'essai numéro ${n} : lire les erreurs du pont et proposer un correctif` })
const cloneDecision = (plan, n) => ({ ...copie(plan.decisions[0]), cle_idempotence: `chef:${DATE_CLE}:decision-essai-${n}` })

// Les plans fautifs de la fiche : nom de fichier → un seul écart appliqué à plan-ok.
export const PLANS_FAUTIFS = {
  'plan-11-taches': (p) => { p.taches = Array.from({ length: 11 }, (_, i) => cloneTache(p, i + 1)) },
  'plan-6-decisions': (p) => { p.decisions = Array.from({ length: 6 }, (_, i) => cloneDecision(p, i + 1)) },
  'plan-leger-trop': (p) => { p.cycle = 'leger'; p.decisions = []; p.taches.push(cloneTache(p, 4)) },
  'plan-type-envoi': (p) => { p.taches[0].type = 'envoi'; p.taches[0].capacite = 'envoi' },
  'plan-cle-inconnue': (p) => { p.approuver = true },
  'plan-defaut-couteux': (p) => { p.decisions[0].options[0].engage_cents = 1500; p.decisions[0].option_defaut = 'relancer_mardi' },
  'plan-secret': (p) => { p.taches[1].charge.pourquoi = 'Clé trouvée dans le journal du pont : {{SECRET_ESSAI}}' },
  'plan-email': (p) => { p.taches[0].charge.pourquoi = 'Écrire à prospect.temoin@exemple.fr au sujet de la page tarifs.' },
  // 05/10/2026 : 20 tâches à objet vide, sans preneur (les trois écarts : absent, vide, trop court ; et le doublon, qui ferait taire la seconde tâche au bus).
  'plan-objet-absent': (p) => { delete p.taches[1].objet },
  'plan-objet-vide': (p) => { p.taches[1].objet = '' },
  'plan-objet-blanc': (p) => { p.taches[1].objet = ' '.repeat(30) },
  'plan-objet-court': (p) => { p.taches[1].objet = 'veille juges' },
  'plan-objet-double': (p) => { p.taches[2].objet = p.taches[1].objet },
  'plan-sans-compte-rendu': (p) => { delete p.compte_rendu },
  'plan-compte-rendu-4-lignes': (p) => { p.compte_rendu.push('une ligne de trop') },
  'plan-compte-rendu-point-median': (p) => { p.compte_rendu[1] = 'santé · ok' },
  'plan-objectif': (p) => { p.objectif = { libelle: 'Encaisser 500 € cette semaine', mesure: 'encaisse_eur', cible: 500 } },
  'plan-consigne-suite-inconnue': (p) => { p.consignes_lues[0].suite = 'ignoree' },
  'plan-consigne-oubliee': (p) => { p.consignes_lues = [] },
}

// Valides au schéma, attrapés ailleurs (écart noté dans echecs-attendus.md) :
//  - plan-consigne-oubliee : par fil.mjs verifier (CH-F1), comme le dit la fiche ;
//  - plan-defaut-couteux : un JSON Schema ne sait pas relier la valeur d'option_defaut à l'engage_cents de l'option
//    qui porte cette clé ; c'est appliquer.mjs qui le refuse (CH-A6) ;
//  - plan-objet-double : l'unicité des objets entre tâches ne s'écrit pas en JSON Schema ; c'est appliquer.mjs (CH-A15).
export const VALIDES_AU_SCHEMA = ['plan-consigne-oubliee', 'plan-defaut-couteux', 'plan-objet-double']

export const REUNIONS_FAUTIVES = {
  'reunion-6-lignes': (r) => { r.lignes = [...r.lignes, 'Quatrième ligne témoin.', 'Cinquième ligne témoin.', 'Sixième ligne de trop.'] },
  'reunion-141-signes': (r) => { r.lignes[0] = 'Ligne témoin trop longue : '.padEnd(141, 'x') },
  'reunion-arobase': (r) => { r.lignes[1] = 'Réponse reçue de @artisan_temoin ce matin.' },
  'reunion-9-chiffres': (r) => { r.lignes[1] = 'Rappeler le 061234567 avant midi.' },
  'reunion-http': (r) => { r.lignes[2] = 'Le rapport est sur http://exemple.fr/rapport.' },
  'reunion-mesure-inconnue': (r) => { r.objectif.mesure = 'ventes' },
  'reunion-4-idees': (r) => { r.idees = [...r.idees, idee('troisieme-temoin', 'Troisième idée témoin ?'), idee('quatrieme-temoin', 'Quatrième idée témoin ?')] },
  'reunion-idee-defaut-lancer': (r) => { r.idees[0].option_defaut = 'lancer' },
  'reunion-idee-portee-argent': (r) => { r.idees[0].portee = 'argent' },
}

export function fabriquer(nom) {
  if (nom === 'plan-ok') return planOk()
  if (nom === 'reunion-ok') return reunionOk()
  if (PLANS_FAUTIFS[nom]) { const p = planOk(); PLANS_FAUTIFS[nom](p); return p }
  if (REUNIONS_FAUTIVES[nom]) { const r = reunionOk(); REUNIONS_FAUTIVES[nom](r); return r }
  throw new Error(`plan inconnu : ${nom}`)
}
export const NOMS_PLANS = ['plan-ok', ...Object.keys(PLANS_FAUTIFS)]
export const NOMS_REUNIONS = ['reunion-ok', ...Object.keys(REUNIONS_FAUTIVES)]

// "@+48h" → ISO ; "{{SECRET_ESSAI}}" → le secret passé. Parcourt tout l'objet, clés comprises.
const JETON_DATE = /^@([+-])(\d+)(m|h|j|d)$/
export function dateRelative(jeton, maintenant = new Date()) {
  const m = JETON_DATE.exec(jeton)
  if (!m) return null
  const unite = { m: 60_000, h: 3_600_000, j: 86_400_000, d: 86_400_000 }[m[3]]
  return new Date(maintenant.getTime() + (m[1] === '+' ? 1 : -1) * Number(m[2]) * unite).toISOString()
}
export function materialiser(valeur, { maintenant = new Date(), secret = null } = {}) {
  if (typeof valeur === 'string') {
    const d = dateRelative(valeur, maintenant)
    if (d) return d
    return secret === null ? valeur : valeur.split('{{SECRET_ESSAI}}').join(secret)
  }
  if (Array.isArray(valeur)) return valeur.map((v) => materialiser(v, { maintenant, secret }))
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, materialiser(v, { maintenant, secret })]))
  return valeur
}
