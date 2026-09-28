// scripts/fixtures/026-pilotage/p/lot.mjs — la fiche du lot p (026-168), lue par scripts/juges-026-pilotage-preuve.mjs --lot=p.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien. Écrit par Claude Code
// (la version du 26/09 n'avait ni témoin, ni sabotage, ni criteresMin) ; revu le 28/09 : l'atelier témoin est DANS le
// témoin, pour que ses sabotages atteignent PN-6, PN-8 et PN-9, que les seuls documents ne touchent pas.
//
// Référence : la même que les lots a et b (4041ec9) ; elle ne porte ni docs/station/ ni atelier-temoin/. Premier critère
// attendu en échec sur elle : PN-1 (les trois documents de la planche absents), rendu par le juge SUR LE POSTE, sans relance
// vers l'usine, sans atelier ni navigateur ; PN-2 à PN-9 y ont chacun leur ligne « non évalué ».
//
// Le juge : station-planche-qa --partie=planche --atelier=atelier-temoin. Le juge cherche un --atelier relatif d'abord dans
// la racine jugée : sur le témoin posé par la preuve, c'est ./temoin/atelier-temoin (un serveur minimal et une planche
// dessinée avec le seul lot A, ramené à une palette de 28 couleurs). La planche livrée (026-169) se dessinera dans
// ~/claw3d-pixel, qui n'a pas encore de commit « f0-planche » ; sans atelier témoin, aucun témoin vert ne serait possible. Son
// `verifier` à elle n'a pas --atelier : il juge ~/claw3d-pixel. L'atelier témoin n'est pas versionné et voyage avec les
// documents : le planche.md du témoin le cite par « atelier: racine », que le juge n'admet que pour un atelier non versionné
// posé dans la racine jugée (~/claw3d-pixel, un dépôt git, se cite toujours par son sha). Hors de la référence (JA-1, sur le
// poste), chaque passage du juge se relance sur l'usine (scripts/usine.mjs executer) : le PC n'a ni le lot A, ni Chromium ;
// les trois documents et l'atelier témoin de l'arbre jugé partent avec la relance (--envoi). --temoin (JA-2) lance et
// capture l'atelier RÉEL ~/claw3d-pixel dans son état actuel (le prototype B).
//
// Témoin (./temoin) : les trois documents de la planche (docs/station/…) et l'atelier témoin (atelier-temoin/…), suffixés
// .temoin. Sabotages : ceux des documents tuent PN-1, PN-2, PN-3, PN-4, PN-5 et PN-7 ; ceux de l'atelier tuent PN-6 à
// chaque taille et dans chaque vue (une donnée peinte à 1280 px seulement, au téléphone seulement, dans le Vaisseau, dans le
// portrait ; un écran chiffré ; un écran transparent), PN-2 (plaques masquées), PN-8 (une feuille brute du lot A servie),
// PN-9 (trois vues confondues : captures identiques), PN-5 (une sortie réseau de l'atelier), PN-7 (un personnage déclaré
// mais pas dessiné) et PN-3 (un décor lissé). Le contrôle JA-3 (./jeux.mjs) vérifie que chacun de PN-1 à PN-9 est tué par
// au moins un sabotage, et PN-6, PN-8 et PN-9 par un sabotage de l'atelier.
export const fiche = '026-168'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const temoin = './temoin'
export const absents = ['docs/station/', 'atelier-temoin/']
const PL = 'docs/station/planche.md', GR = 'docs/station/grille.json', LI = 'docs/station/licence-planche.json'
const JS = 'atelier-temoin/planche/planche.js', HT = 'atelier-temoin/planche/index.html', SV = 'atelier-temoin/server/index.js'
const PACK_04 = '{ "dossier": "04-rottingpixels-scifi-tileset", "titre": "2D Sci-Fi Platformer Tileset [16x16]", "auteur": "Rotting Pixels", "adresse": "https://opengameart.org/content/2d-sci-fi-platformer-tileset-16x16", "licence": "CC0", "date": "2026-09-25", "licence_json": "~/station-assets/04-rottingpixels-scifi-tileset/licence.json", "fichiers": ["fichiers/Sci-Fi Platformer Tileset [16x16][FREE] - RottingPixels/sci-fi-tileset.png"] },'
const PERSOS = 'for (const p of PERSONNAGES) sprite(p.sprite, p.x, p.y)'
export const juges = [
  {
    commande: 'scripts/station-planche-qa.mjs', arguments: ['--partie=planche', '--atelier=atelier-temoin'], loader: false, attendu: 'PN-1', criteresMin: 9, tailleMin: 30000,
    sabotages: [
      // Les documents.
      { nom: 'k-1440-faux', fichier: PL, avant: 'k.1440: 2', apres: 'k.1440: 3', tue: 'PN-3' },
      { nom: 'reserve-deplacee', fichier: GR, avant: '"reserve": { "x": 344, "y": 264, "l": 48, "h": 80 }', apres: '"reserve": { "x": 344, "y": 346, "l": 48, "h": 30 }', tue: 'PN-2' },
      { nom: 'palette-sans-magenta', fichier: PL, avant: ' #ff3cc7', apres: '', tue: 'PN-4' },
      { nom: 'licence-auteur', fichier: LI, avant: '"auteur": "zwonky"', apres: '"auteur": "Zwonky Studio"', tue: 'PN-5' },
      { nom: 'echelle-hors-licence', fichier: LI, avant: PACK_04, apres: '', tue: 'PN-7' },
      { nom: 'atelier-autre-commit', fichier: PL, avant: 'atelier: racine', apres: 'atelier: 1111111111111111111111111111111111111111', tue: 'PN-1' },
      { nom: 'grille-retiree', fichier: GR, retirer: true, tue: 'PN-1' },
      // L'atelier : aucune donnée, à chaque taille et dans chaque vue (PN-6), portrait compris.
      { nom: 'donnee-peinte-1280', fichier: JS, avant: `    if (!sansPersonnages && !tel) ${PERSOS}`, apres: `    if (vw < 1440 && !tel) aplat(donnees.jeu === 'a' ? CYAN : MAGENTA, 200, 30, 4, 4); if (!sansPersonnages && !tel) ${PERSOS}`, tue: 'PN-6' },
      { nom: 'donnee-peinte-telephone', fichier: JS, avant: '    if (tel) { aplat(VIOLET_PROFOND, 2, 16, 172, 302); cadre(MAGENTA, 2, 16, 172, 302, 2) }', apres: "    if (tel) { aplat(VIOLET_PROFOND, 2, 16, 172, 302); cadre(MAGENTA, 2, 16, 172, 302, 2); aplat(donnees.jeu === 'a' ? CYAN : MAGENTA, 100, 4, 4, 4) }", tue: 'PN-6' },
      { nom: 'donnee-vaisseau', fichier: JS, avant: '    aplat(CYAN, 132, 184, 8, 16); aplat(CYAN, 260, 184, 8, 16)', apres: "    aplat(donnees.jeu === 'a' ? CYAN : MAGENTA, 132, 184, 8, 16); aplat(CYAN, 260, 184, 8, 16)", tue: 'PN-6' },
      { nom: 'portrait-donnee', fichier: JS, avant: '  gp.fillStyle = VIOLET_PROFOND; gp.fillRect(0, 0, 16, 16)', apres: "  gp.fillStyle = donnees.jeu === 'a' ? VIOLET_PROFOND : ROUGE; gp.fillRect(0, 0, 16, 16)", tue: 'PN-6' },
      { nom: 'ecran-chiffre', fichier: JS, avant: "        e.textContent = '—'", apres: "        e.textContent = cle === 'radar' ? String(donnees.salles.radar.requetes_du_jour) : '—'", tue: 'PN-6' },
      { nom: 'ecran-transparent', fichier: HT, avant: '[data-ecran] { position: absolute; color: #b6f7ff;', apres: '[data-ecran] { position: absolute; color: transparent;', tue: 'PN-6' },
      // L'atelier : plaques visibles (PN-2), feuille brute (PN-8), captures distinctes (PN-9), réseau (PN-5), personnages
      // dessinés (PN-7), décor net (PN-3).
      { nom: 'plaques-masquees', fichier: HT, avant: '  .mode-portrait [data-plaque], .mode-portrait [data-ecran] { display: none; }', apres: '  [data-plaque], [data-ecran] { display: none !important; }', tue: 'PN-2' },
      { nom: 'feuille-brute', fichier: JS, avant: "  atlas.src = '/planche/atlas.png'", apres: "  atlas.src = '/planche/atlas.png'; const brute = new Image(); brute.src = '/planche/echelle-pack.png'; await brute.decode()", tue: 'PN-8' },
      { nom: 'vues-confondues', fichier: JS, avant: "  const vue = ['station', 'echelle', 'vaisseau'].includes(params.get('vue')) ? params.get('vue') : 'station'", apres: "  const vue = 'station'", tue: 'PN-9' },
      { nom: 'sortie-reseau', fichier: SV, avant: 'const PORT = Number(process.env.PORT || 3300)', apres: "const PORT = Number(process.env.PORT || 3300); fetch('https://exemple.invalid/fuite').catch(() => {})", tue: 'PN-5' },
      { nom: 'personnage-fantome', fichier: JS, avant: `!tel) ${PERSOS}`, apres: `!tel) for (const p of PERSONNAGES) if (p.nom !== 'facteur') sprite(p.sprite, p.x, p.y)`, tue: 'PN-7' },
      { nom: 'decor-lisse', fichier: HT, avant: '[data-planche="decor"] { position: fixed; z-index: 1; image-rendering: pixelated; }', apres: '[data-planche="decor"] { position: fixed; z-index: 1; image-rendering: auto; }', tue: 'PN-3' },
    ],
  },
]
export const controles = [
  { id: 'JA-3', module: './jeux.mjs', fonction: 'controleJeux' },
]
