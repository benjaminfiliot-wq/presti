// scripts/fixtures/026-pilotage/e/lot.mjs — la fiche du lot e (026-172), lue par scripts/juges-026-pilotage-preuve.mjs --lot=e.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien.
//
// Référence : 16be91f, le commit de 026-111 lui-même (la station /controle/station en lecture, 30/09), et non celui du lot a (4041ec9, 24/09) que la fiche citait le
// 25/09 : la fiche compte sur 026-111 (le témoin a besoin de Station.tsx, qui ne monte <Carte /> qu'après le 200 de vue=direct). Ce commit porte la station et son cadre
// d'attente Carte.tsx, mais ni app/controle/station/moteur/ (le moteur de la carte, 026-179 à 026-186), ni le drapeau stationCarte, ni public/station/ (le thème,
// 026-185). Pas un commit plus récent : depuis 2a98eb1e (30/09) le dépôt porte un lien symbolique (.orchestre/preuves/026-garde-plafond) que l'extraction de la
// référence (a/commun.mjs, extraireTar) refuse. `absents` : le moteur et public/station/ (le défaut de la preuve, lib/pilotage/, existe déjà).
//
// Témoin (./temoin) : le MOTEUR MINIMAL du lot e (NOTES-TEMOIN.md, CONTRAT.md). Il pose, à la référence : Carte.tsx (le même cadre, avec le drapeau et le chargement de
// ./moteur/entree) ; moteur/entree.tsx (le seul module que Carte.tsx charge : il passe les propriétés de la carte au témoin et lui donne un cadre) ; la notice de
// Claw3D ; lib/flags.ts (la référence, plus le drapeau stationCarte) ; le thème Station (public/station/themes/station/theme.json) ; et, dans public/temoin-e/,
// UN MODULE PAR PARTIE — coeur (le thème, la toile, la boucle qui dort, les acteurs, le miroir, la bulle, « Zz », le halo, l'antenne, la nuit), camera, acteurs,
// calque, telephone, reglages, salles — de moins de 300 lignes chacun, chargés par le navigateur à l'exécution (import natif hors du bundle : un seul `next build`
// sert toute la preuve ; chaque sabotage change un de ces fichiers, jamais le bundle). Ce n'est PAS le moteur de la carte : il ne fait que ce que les parties du
// juge mesurent, sans Phaser (absent de node_modules avant 026-179) : un faux jeu `__stationGame` porte ce que le juge lit (loop.frame, canvas, textures « decor »).
//
// Huit entrées, une par regroupement de parties (chacune ≥ 3 critères verts distincts sur le témoin, avec CE-1 en premier, qui échoue sur la référence sans serveur ni
// navigateur) ; la recette est la huitième. Une partie à deux critères seulement (themes, webkit) est jugée avec une voisine, jamais seule.
//   verite               CE-2 … CE-8, CE-25, CE-26, CE-27
//   camera,webkit        CE-9, CE-10, CE-11, CE-24
//   acteurs              CE-12, CE-13
//   calque               CE-14, CE-15, CE-16, CE-28
//   themes,reglages      CE-17, CE-18, CE-19, CE-20, CE-29
//   salles2 --lot=a      CE-21, CE-23
//   salles2 --lot=b      CE-22, CE-23
//   station-recette      RK-0, RK-0-CARTE, RK-0-THEME, RK-0-DRAPEAU (les modes réels sont ceux de 026-193 : ni la preuve ni ce lot ne les lancent)
// Chaque entrée déclare au moins deux sabotages de CONTENU (premier critère CE-1 resté vert) qui tuent des critères distincts : un texte du témoin devient une faute
// que le juge doit nommer. Le juge d'écran prend ses captures en mode --temoin et sur la racine réelle ; pour tenir la preuve en 30 minutes il ne les prend pas
// sur les arbres de la preuve (--racine : JA-7 et JA-8), où seuls comptent les critères.
export const fiche = '026-172-essai'
export const reference = '16be91f59f9a01f8711cd1ff7f6f123bd110f81e'
export const temoin = './temoin'
export const absents = ['app/controle/station/moteur/', 'public/station/']

const P = 'public/temoin-e'
const COEUR = `${P}/coeur.js`, CAMERA = `${P}/camera.js`, ACTEURS = `${P}/acteurs.js`, CALQUE = `${P}/calque.js`, TEL = `${P}/telephone.js`, REGLAGES = `${P}/reglages.js`, SALLES = `${P}/salles.js`
const CARTE = 'app/controle/station/Carte.tsx', FLAGS = 'lib/flags.ts', THEME = 'public/station/themes/station/theme.json'
const ECRAN = 'scripts/station-ecran-qa.mjs'

const TOUS = [
  {
    commande: ECRAN, arguments: ['--partie=verite'], loader: false, attendu: 'CE-1', criteresMin: 11,
    sabotages: [
      { nom: 'boucle-sans-sommeil', fichier: COEUR, avant: 'if (actif && !T.detruit) requestAnimationFrame(pas); else enMarche = false', apres: 'if (!T.detruit) requestAnimationFrame(pas); else enMarche = false', tue: 'CE-3' },
      { nom: 'bulle-tronquee', fichier: COEUR, avant: 'a.elBulle.textContent = a.bulle', apres: 'a.elBulle.textContent = a.bulle.slice(0, 12)', tue: 'CE-4' },
      { nom: 'antenne-sur-lectures-identiques', fichier: COEUR, avant: 'const nouvelles = bulles.filter((b) => b.id > T.maxBulle)', apres: 'const nouvelles = bulles.filter((b) => b.id >= T.maxBulle)', tue: 'CE-26' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=camera,webkit'], loader: false, attendu: 'CE-1', criteresMin: 5,
    sabotages: [
      { nom: 'zoom-non-borne', fichier: CAMERA, avant: 'T.vue.zoom = Math.min(3, Math.max(1, T.vue.zoom + dz))', apres: 'T.vue.zoom = Math.min(5, Math.max(1, T.vue.zoom + dz))', tue: 'CE-9' },
      { nom: 'reservee-sans-zone', fichier: CAMERA, avant: 'zones.replaceChildren()\n    for (const e of T.theme.emplacements) {', apres: 'zones.replaceChildren()\n    for (const e of T.theme.emplacements.filter((x) => !x.reservee)) {', tue: 'CE-11' },
      { nom: 'touch-action-libre', fichier: TEL, avant: "touchAction: 'none', overflow: 'hidden' }", apres: "touchAction: 'auto', overflow: 'hidden' }", tue: 'CE-24' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=acteurs'], loader: false, attendu: 'CE-1', criteresMin: 3,
    sabotages: [
      { nom: 'deux-carres-pour-un', fichier: ACTEURS, avant: 'for (let i = 0; i < v.carres; i++) lancer(v.etape, etapes)', apres: 'for (let i = 0; i < v.carres + 1; i++) lancer(v.etape, etapes)', tue: 'CE-12' },
      { nom: 'egaliseur-a-onze-barres', fichier: ACTEURS, avant: 'eg.slice(0, 12)', apres: 'eg.slice(0, 11)', tue: 'CE-13' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=calque'], loader: false, attendu: 'CE-1', criteresMin: 5,
    sabotages: [
      { nom: 'plaque-en-html', fichier: CALQUE, avant: 'n.textContent = plaqueDe(e.cle)', apres: 'n.innerHTML = plaqueDe(e.cle)', tue: 'CE-16' },
      { nom: 'infobulle-sans-modele', fichier: CALQUE, avant: "['data-i-modele', a.modele || 'sans IA']", apres: "['data-i-modele', 'sans IA']", tue: 'CE-28' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=themes,reglages'], loader: false, attendu: 'CE-1', criteresMin: 6,
    sabotages: [
      { nom: 'echelle-non-entiere', fichier: COEUR, avant: 'T.k = Math.max(1, Math.floor((cadre * T.dpr) / g.largeur))', apres: 'T.k = Math.max(1, (cadre * T.dpr) / g.largeur)', tue: 'CE-17' },
      { nom: 'apercu-qui-ecrit', fichier: REGLAGES, avant: "(etat.brouillon.couleurs ??= {})['--mc-accent'] = couleur.value; appliquer() } })", apres: "(etat.brouillon.couleurs ??= {})['--mc-accent'] = couleur.value; appliquer(); enregistrer() } })", tue: 'CE-19' },
      { nom: 'reservee-deplacable', fichier: REGLAGES, avant: 'if (salles[reservee.cle] !== reservee.cle) return', apres: 'if (false) return', tue: 'CE-20' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=salles2', '--lot=a'], loader: false, attendu: 'CE-1', criteresMin: 3,
    sabotages: [
      { nom: 'euros-a-zero', fichier: SALLES, avant: ': `niveau et euros : ${HORS}`)', apres: ": '0 €')", tue: 'CE-21' },
      { nom: 'resume-absent', fichier: SALLES, avant: '    n.append(resume)', apres: '    void resume', tue: 'CE-23' },
    ],
  },
  {
    commande: ECRAN, arguments: ['--partie=salles2', '--lot=b'], loader: false, attendu: 'CE-1', criteresMin: 3,
    sabotages: [
      { nom: 'ecommerce-avec-bouton', fichier: SALLES, avant: "ecommerce: () => ligne(p, { 'data-reservee': '' }, 'Branche réservée : rien n\\'est construit.'),", apres: "ecommerce: () => { ligne(p, { 'data-reservee': '' }, 'Branche réservée : rien n\\'est construit.'); const b = el('button', { type: 'button' }); b.textContent = 'Ouvrir'; p.append(b) },", tue: 'CE-22' },
      { nom: 'panneau-hors-ecran', fichier: SALLES, avant: "position: 'fixed', top: tel ? '120px' : '0', bottom: '0', right: '0', width: tel ? '100%' : '480px', maxWidth: '100vw', zIndex: '55'", apres: "position: 'absolute', top: '0', left: '0', width: '900px', zIndex: '55'", tue: 'CE-23' },
    ],
  },
  {
    commande: 'scripts/station-recette.mjs', arguments: [], loader: false, attendu: 'RK-0', criteresMin: 4,
    sabotages: [
      { nom: 'drapeau-lu-nulle-part', fichier: CARTE, avant: "{actif('stationCarte') ? <Moteur", apres: '{true ? <Moteur', tue: 'RK-0-CARTE' },
      { nom: 'theme-station-retire', fichier: THEME, retirer: true, tue: 'RK-0-THEME' },
      { nom: 'drapeau-absent-de-flags', fichier: FLAGS, avant: '  stationCarte: false,', apres: '', tue: 'RK-0-DRAPEAU' },
    ],
  },
]


export const juges = TOUS.filter((_, i) => [4,5,6].includes(i))
export const controles = []
