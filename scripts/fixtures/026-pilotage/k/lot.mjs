// scripts/fixtures/026-pilotage/k/lot.mjs — la fiche du lot k (026-170), lue par scripts/juges-026-pilotage-preuve.mjs --lot=k.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien.
//
// Référence : le HEAD de main noté par la fiche (1c87006) ; elle ne porte ni app/controle/station/ (le moteur, Carte.tsx, la
// page) ni le drapeau stationCarte ni l'alternative station\/.* de proxy.ts ni "phaser" dans package.json. `absents` : le dossier
// app/controle/station/ (le défaut de la preuve, lib/pilotage/, existe déjà à la référence).
//
// Témoin (./temoin) : le MOTEUR MINIMAL écrit par le sous-agent « témoin » (aucune ligne de Claw3D, aucune de l'atelier ; moins de
// 300 lignes par fichier) : Carte.tsx, Station.tsx, page.tsx, moteur/ (entree, adaptateur, types, scene/{hote,scene,decor},
// calque, grille, theme/charger, claw3d/{LICENSE, PROVENANCE, OfficeSceneBridge}), lib/avatars/profile.ts, et trois fichiers de
// la référence à une ligne près (package.json : phaser 3.90.0 ; lib/flags.ts : stationCarte ; proxy.ts : station\/.*). Ce n'est
// PAS le moteur de K1 à K3 : il ne fait que ce que les dix parties mesurent (NOTES-TEMOIN.md).
//
// Quatre juges, un par regroupement des seize critères CL (chacun ≥ 3 critères, chacun avec un premier critère qui échoue sur
// la référence sans serveur ni navigateur). L'ordre des critères d'une ligne est celui du jugement : ce qui se lit d'abord
// (station-claw3d-qa, en-tête).
//   provenance                 CL-1 (attendu) CL-2 CL-3 CL-4
//   verite,grille              CL-6 (attendu) CL-15 CL-5 CL-7 CL-8
//   repos,garde,pixel,contexte CL-9 (attendu) CL-10 CL-13 CL-14
//   hygiene,csp,poids          CL-16 (attendu) CL-11 CL-12
// Les sabotages de CONTENU (premier critère resté vert) : un texte du témoin devient une faute que le juge doit nommer. Ceux
// qui exigent un build de production sont peu nombreux (le cache de builds du juge en garde le résultat) : chacun est repris
// de JK-3. Le piège « Phaser importé dans app/controle/layout.tsx » se joue sur lib/flags.ts, seul fichier partagé par la
// console, le site et la page publique que le témoin possède (layout.tsx est celui de la référence, qu'un sabotage ne touche pas).
export const fiche = '026-170'
export const reference = '1c87006aa35a152cb918ab368225e1976a1328da'
export const temoin = './temoin'
export const absents = ['app/controle/station/']

const S = 'app/controle/station'
const M = `${S}/moteur`
const CARTE = `${S}/Carte.tsx`, STATION = `${S}/Station.tsx`
const LICENCE = `${M}/claw3d/LICENSE-claw3d.txt`
const ENTREE = `${M}/entree.tsx`, ADAPT = `${M}/adaptateur.ts`, HOTE = `${M}/scene/hote.ts`, SCENE = `${M}/scene/scene.ts`, DECOR = `${M}/scene/decor.ts`
const GRILLE = `${M}/grille/grille.ts`, CHARGER = `${M}/theme/charger.ts`
const FLAGS = 'lib/flags.ts', PROXY = 'proxy.ts'

// Les fautes réutilisées d'une ligne à l'autre.
const FETCH_EXTERNE = { fichier: CHARGER, avant: 'const r = await fetch(', apres: "void fetch('https://exemple.invalid/telemetrie', { mode: 'no-cors' }).catch(() => {})\n  const r = await fetch(" }
const PHASER_PARTAGE = { fichier: FLAGS, avant: 'export const actif = (f: Flag): boolean => FLAGS[f]', apres: "export const actif = (f: Flag): boolean => FLAGS[f]\nif (typeof window !== 'undefined') void import('phaser')" }

export const juges = [
  {
    commande: 'scripts/station-claw3d-qa.mjs', arguments: ['--partie=provenance'], loader: false, attendu: 'CL-1', criteresMin: 4,
    sabotages: [
      { nom: 'notice-absente', fichier: LICENCE, retirer: true, tue: 'CL-1' },
      { nom: 'classe-tailwind', fichier: ENTREE, avant: "<div ref={hote} style={{ width: '100%' }} />", apres: "<div ref={hote} className=\"flex p-4\" style={{ width: '100%' }} />", tue: 'CL-2' },
      { nom: 'import-three', fichier: DECOR, avant: "import type { Theme } from '../types'", apres: "import type { Theme } from '../types'\nimport * as THREE from 'three'\nvoid THREE", tue: 'CL-3' },
      { nom: 'fetch-externe-deuxieme', ...FETCH_EXTERNE, tue: 'CL-3' },
      { nom: 'phaser-charge-partout', ...PHASER_PARTAGE, tue: 'CL-3' },
      { nom: 'carte-charge-autre-chose', fichier: CARTE, avant: "dynamic(() => import('./moteur/entree'), { ssr: false })", apres: "dynamic(() => import('./moteur/scene/hote'), { ssr: false })", tue: 'CL-4' },
    ],
  },
  {
    commande: 'scripts/station-claw3d-qa.mjs', arguments: ['--partie=verite,grille'], loader: false, attendu: 'CL-6', criteresMin: 5,
    sabotages: [
      { nom: 'between-cache', fichier: SCENE, avant: "this.add.image(0, 0, 'decor').setOrigin(0, 0)", apres: "this.add.image(0, 0, 'decor').setOrigin(0, 0); void Phaser.Math.Between(0, 1)", tue: 'CL-6' },
      { nom: 'reservee-prise-pour-destination', fichier: GRILLE, avant: '    if (!e || e.reservee || !e.poste) continue', apres: '    if (!e) continue', tue: 'CL-15' },
      { nom: 'reservee-ouverte-a-la-marche', fichier: GRILLE, avant: 'poser(cx, cy, false); continue }', apres: 'poser(cx, cy, true); continue }', tue: 'CL-15' },
      { nom: 'inactif-au-repos', fichier: ADAPT, avant: "salle: motif === 'pause' ? 'repos' : a.position.salle,", apres: "salle: motif === 'pause' || motif === 'porte' ? 'repos' : a.position.salle,", tue: 'CL-7' },
      { nom: 'chiffre-peint-dans-le-decor', fichier: SCENE, avant: 'this.vu = true', apres: "this.vu = true; { const t = this.textures.get('decor') as any; const g = t.getContext() as CanvasRenderingContext2D; g.fillStyle = '#ffffff'; g.font = `${6 * k}px monospace`; g.fillText(etat.acteurs.map((x) => x.libelle).join(' '), 8 * k, 12 * k); t.refresh() }", tue: 'CL-8' },
      { nom: 'hasard-de-la-page', fichier: ADAPT, avant: "bulle: derniere.get(a.nom)?.texte ?? '', rang: noms.indexOf(a.nom),", apres: "bulle: derniere.get(a.nom)?.texte ?? '', rang: noms.indexOf(a.nom) + ((Math.floor(performance.timeOrigin) >> (noms.indexOf(a.nom) % 16)) & 15),", tue: 'CL-5' },
    ],
  },
  {
    commande: 'scripts/station-claw3d-qa.mjs', arguments: ['--partie=repos,garde,pixel,contexte'], loader: false, attendu: 'CL-9', criteresMin: 4,
    sabotages: [
      { nom: 'pont-appele-a-chaque-lecture', fichier: ADAPT, avant: 'if (signature === this.signature) return', apres: 'if (signature === this.signature && false) return', tue: 'CL-9' },
      { nom: 'carte-avant-le-200', fichier: STATION, avant: "if (etat === 'verification') return <p>Vérification de l’accès…</p>", apres: "if (etat === 'verification') return <Carte equipage={[]} tapis={null} bulles={[]} reglages={{}} carte={null} />", tue: 'CL-10' },
      { nom: 'k-non-entier', fichier: HOTE, avant: 'Math.max(1, Math.floor((cadreCss * densite) / largeurGrille))', apres: 'Math.max(1, (cadreCss * densite) / largeurGrille)', tue: 'CL-13' },
      { nom: 'contexte-perdu-sans-reprise', fichier: HOTE, avant: "toile.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault(); void basculer() })", apres: "toile.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault() })", tue: 'CL-14' },
    ],
  },
  {
    commande: 'scripts/station-claw3d-qa.mjs', arguments: ['--partie=hygiene,csp,poids'], loader: false, attendu: 'CL-16', criteresMin: 3,
    sabotages: [
      { nom: 'proxy-sans-station', fichier: PROXY, avant: '|station\\/.*|', apres: '|', tue: 'CL-16' },
      { nom: 'fetch-vers-un-hote-externe', ...FETCH_EXTERNE, tue: 'CL-11' },
      { nom: 'phaser-charge-partout', ...PHASER_PARTAGE, tue: 'CL-12' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleSchema' },
  { id: 'JA-4', module: './controles.mjs', fonction: 'controleSecrets' },
]
