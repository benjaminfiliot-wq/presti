// scripts/fixtures/026-pilotage/k/juge-lecture.mjs — les critères de station-claw3d-qa qui se lisent dans le SOURCE (fiche
// 026-170, écrit par Claude Code) : aucun serveur, aucun navigateur. Chaque fonction rend { echecs, detail } (echecs vide =
// vert) ; une racine sans moteur rend toujours un échec explicite (« moteur absent »), jamais un vert par défaut.
//
//   provenance : CL-1 (licence et PROVENANCE), CL-2 (fichiers retirés, aucun Tailwind), CL-3 (imports interdits, un seul
//                fetch, phaser exact), CL-4 (Carte.tsx : drapeau, next/dynamic, entree seulement)
//   verite     : CL-6 (sources interdites dans moteur/, graine de Phaser, « — » du décor)
//   pixel      : la configuration de Phaser (pixelArt, antialias, roundPixels), lue dans le source, pour CL-13
//   hygiene    : CL-16, la moitié « source » (l'alternative station\/.* de CHEMINS_APP_PRESTI)
import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { listerFichiers, sansCommentaires, importsDe, lireOuNull, court } from '../a/commun.mjs'

export const STATION = 'app/controle/station'
export const MOTEUR = `${STATION}/moteur`
export const CLAW3D = `${MOTEUR}/claw3d`
export const ENTREE = `${MOTEUR}/entree.tsx`
const EXT_SOURCE = /\.(?:tsx?|jsx?|mjs|cjs)$/
const posix = (p) => p.split(path.sep).join('/')

/** Les fichiers d'un dossier de la racine (chemins relatifs à la racine, /), [] si le dossier n'existe pas. */
export function fichiersSous(racine, dossier) {
  const d = path.join(racine, dossier)
  return [...listerFichiers(d)].sort().map((f) => `${dossier}/${posix(f)}`)
}
const sources = (racine, dossier) => fichiersSous(racine, dossier).filter((f) => EXT_SOURCE.test(f)).map((f) => ({ f, texte: lireOuNull(path.join(racine, f)) ?? '' }))
export const moteurPresent = (racine) => fs.existsSync(path.join(racine, ENTREE))
const absent = (racine) => (moteurPresent(racine) ? null : `moteur absent : ${ENTREE} n'existe pas sous ${court(racine, 60)}`)

// ── CL-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function cl1(racine) {
  const e = []
  const licence = lireOuNull(path.join(racine, CLAW3D, 'LICENSE-claw3d.txt'))
  const prov = lireOuNull(path.join(racine, CLAW3D, 'PROVENANCE.md'))
  if (licence === null) e.push(`${CLAW3D}/LICENSE-claw3d.txt absent (la notice MIT doit voyager avec le code copié)`)
  else {
    if (!/MIT License/.test(licence)) e.push('LICENSE-claw3d.txt ne porte pas « MIT License »')
    if (!/Luke The Dev/.test(licence)) e.push('LICENSE-claw3d.txt ne porte pas « Luke The Dev »')
    if (!/Permission is hereby granted/.test(licence)) e.push('LICENSE-claw3d.txt n\'a pas le corps de la licence MIT (« Permission is hereby granted… »)')
  }
  if (prov === null) e.push(`${CLAW3D}/PROVENANCE.md absent`)
  else {
    if (!/\b0565b78\b/.test(prov)) e.push('PROVENANCE.md ne cite pas le commit 0565b78')
    if (!prov.includes('lib/avatars/profile.ts')) e.push('PROVENANCE.md ne cite pas lib/avatars/profile.ts')
    const copies = fichiersSous(racine, CLAW3D).map((f) => f.slice(CLAW3D.length + 1)).filter((f) => !/^(?:LICENSE-claw3d\.txt|PROVENANCE\.md)$/.test(f))
    const manquants = copies.filter((f) => !prov.includes(f) && !prov.includes(path.posix.basename(f)))
    if (manquants.length) e.push(`PROVENANCE.md ne cite pas ${manquants.slice(0, 4).join(', ')}${manquants.length > 4 ? ` (+${manquants.length - 4})` : ''} : chaque fichier copié ou modifié y figure`)
  }
  return { echecs: e, detail: 'LICENSE-claw3d.txt (MIT License, Luke The Dev) et PROVENANCE.md (0565b78, lib/avatars/profile.ts, chaque fichier de claw3d/)' }
}

// ── CL-2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RETIRES = ['RetroOffice3D', 'OfficeScreen', 'OfficeBuilderScene', 'OfficeViewerScene', 'LightingSystem', 'AmbienceSystem', 'AgentEffectsSystem']
const TAILWIND = /^(?:[a-z0-9-]+:)*-?(?:flex|grid|block|inline|inline-block|inline-flex|hidden|absolute|relative|fixed|sticky|container|truncate|w-[\w./[\]-]+|h-[\w./[\]-]+|min-[wh]-[\w./[\]-]+|max-[wh]-[\w./[\]-]+|p[xytrbl]?-[\w./[\]-]+|m[xytrbl]?-[\w./[\]-]+|gap-[\w./]+|space-[xy]-[\w./]+|text-[\w./[\]#-]+|bg-[\w./[\]#-]+|border(?:-[\w./[\]#-]+)?|rounded(?:-[\w./-]+)?|shadow(?:-[\w./-]+)?|items-[a-z]+|justify-[a-z]+|self-[a-z]+|font-[a-z]+|z-[\w[\]]+|top-[\w./[\]-]+|left-[\w./[\]-]+|right-[\w./[\]-]+|bottom-[\w./[\]-]+|inset-[\w./[\]-]+|opacity-\d+|overflow-[a-z]+|cursor-[a-z-]+|transition(?:-[a-z]+)?|duration-\d+|grid-cols-\d+|col-span-\d+|leading-[\w./]+|tracking-[\w./]+|uppercase|lowercase|capitalize|underline|sr-only)$/
export function cl2(racine) {
  const a = absent(racine)
  if (a) return { echecs: [a], detail: '' }
  const e = []
  const tous = fichiersSous(racine, STATION)
  for (const f of tous) {
    const nom = path.posix.basename(f)
    const base = nom.replace(/\.[^.]+$/, '')
    if (RETIRES.some((r) => base.includes(r))) e.push(`${f} : fichier retiré par le §0.3 (${RETIRES.find((r) => base.includes(r))})`)
    if (nom === 'presence.ts') e.push(`${f} : presence.ts est retiré par le §0.3`)
    if (/\.glb$/i.test(nom)) e.push(`${f} : un .glb (modèle 3D) n'a rien à faire ici`)
    if (/(?:^|\/)server\//.test(f.slice(STATION.length))) e.push(`${f} : rien de server/ de Claw3D`)
    if (/(?:^|\/)src\/app\/api\//.test(f)) e.push(`${f} : rien de src/app/api/ de Claw3D`)
  }
  for (const { f, texte } of sources(racine, MOTEUR)) {
    const s = sansCommentaires(texte)
    for (const m of s.matchAll(/\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:`([^`$]*)`|"([^"]*)"|'([^']*)')\s*\})/g)) {
      const jetons = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').split(/\s+/).filter(Boolean)
      const tw = jetons.find((j) => TAILWIND.test(j))
      if (tw) { e.push(`${f} : classe Tailwind « ${tw} » dans un className (le moteur n'utilise que le CSS de Presti)`); break }
    }
    if (/@tailwind\b|@apply\b/.test(texte)) e.push(`${f} : @tailwind ou @apply`)
  }
  for (const f of fichiersSous(racine, MOTEUR).filter((x) => /\.css$/.test(x))) {
    if (/@tailwind\b|@apply\b/.test(lireOuNull(path.join(racine, f)) ?? '')) e.push(`${f} : @tailwind ou @apply`)
  }
  return { echecs: e, detail: `${tous.length} fichier(s) sous ${STATION} : aucun des fichiers retirés par le §0.3, aucun .glb, rien de server/ ni de src/app/api/, aucune classe Tailwind dans moteur/` }
}

// ── CL-3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NATIFS = new Set(builtinModules.flatMap((m) => [m, m.replace(/^node:/, '')]))
const interdit = (spec) => {
  const s = spec.replace(/^node:/, 'node:')
  if (/^node:/.test(s) || NATIFS.has(s.split('/')[0])) return `module Node « ${spec} »`
  if (s === 'ws' || s.startsWith('ws/')) return 'ws (WebSocket)'
  if (/^three(?:\/|$)/.test(s) || s.startsWith('@react-three/')) return `${spec} (3D)`
  if (/^pixi(?:\.js)?(?:\/|$)/.test(s) || s.startsWith('@pixi/')) return `${spec} (pixi)`
  if (/(?:^|\/)lib\/(?:gateway|runtime)(?:\/|$)/.test(s)) return `${spec} (passerelle ou runtime de Claw3D)`
  if (/multiavatar/i.test(s)) return `${spec} (multiavatar)`
  if (/\.glb(?:\?|$)/i.test(s)) return `${spec} (.glb)`
  return null
}
export function cl3(racine) {
  const e = []
  // Phaser : partout dans app/ et lib/ (un import dans app/controle/layout.tsx charge Phaser sur toute la console).
  const tousSources = [...sources(racine, 'app'), ...sources(racine, 'lib')]
  for (const { f, texte } of tousSources) {
    for (const i of importsDe(texte)) {
      if (i.spec !== 'phaser' && !/^phaser\//.test(i.spec ?? '')) continue
      if (i.type) continue // import type : effacé à la compilation
      if (!f.startsWith(`${MOTEUR}/`)) e.push(`${f} importe phaser hors de ${MOTEUR}/ (il chargerait Phaser bien au-delà de la carte)`)
      else if (i.genre !== 'dynamique') e.push(`${f} importe phaser en statique (${i.genre}) : seul import("phaser") est admis`)
    }
  }
  const stat = sources(racine, STATION)
  let fetchs = 0
  for (const { f, texte } of stat) {
    for (const i of importsDe(texte)) {
      if (i.spec === null) { if (i.genre === 'dynamique') e.push(`${f} : un import() dynamique non littéral (impossible de savoir ce qu'il charge)`); continue }
      const raison = interdit(i.spec)
      if (raison) e.push(`${f} importe ${raison}`)
    }
    const s = sansCommentaires(texte)
    if (/\.glb\b/i.test(s)) e.push(`${f} nomme un fichier .glb`)
    if (/\bnew\s+(?:WebSocket|EventSource)\b|\bnavigator\s*\.\s*sendBeacon\b/.test(s)) e.push(`${f} ouvre une WebSocket, une EventSource ou un sendBeacon (aucune passerelle)`)
    if (f.startsWith(`${MOTEUR}/`) && /\bURLSearchParams\b/.test(s)) e.push(`${f} lit l'adresse (URLSearchParams) : aucun interrupteur de vérité par l'adresse dans moteur/`)
    const n = [...s.matchAll(/(?<![\w$.])fetch\s*\(/g)].length
    fetchs += n
    if (n && f !== `${MOTEUR}/theme/charger.ts`) e.push(`${f} : fetch( hors de moteur/theme/charger.ts`)
    if (n && f === `${MOTEUR}/theme/charger.ts`) {
      if (n > 1) e.push(`${f} : ${n} fetch( (un seul admis)`)
      if (!/fetch\s*\(\s*(?:`\/station\/themes\/\$\{|'\/station\/themes\/'\s*\+|"\/station\/themes\/"\s*\+|\/\*.*\*\/\s*)/.test(s.replace(/\s+/g, ' '))) e.push(`${f} : le fetch( ne vise pas le préfixe fixe /station/themes/ suivi d'une clé`)
      if (!(/['"]station['"]/.test(s) && /['"]vaisseau['"]/.test(s) && /['"]essai['"]/.test(s))) e.push(`${f} : la liste fermée des clés (station, vaisseau, essai) n'y figure pas`)
    }
  }
  if (fetchs > 1) e.push(`${fetchs} fetch( sous ${STATION}/ (un au plus)`)
  let pj = null
  try { pj = JSON.parse(lireOuNull(path.join(racine, 'package.json')) ?? 'null') } catch { /* illisible */ }
  if (pj?.dependencies?.phaser !== '3.90.0') e.push(`package.json : "phaser" doit valoir exactement "3.90.0" (trouvé ${JSON.stringify(pj?.dependencies?.phaser ?? pj?.devDependencies?.phaser ?? null)})`)
  return { echecs: e, detail: `${tousSources.length} sources de app/ et lib/ lus : phaser importé seulement par import("phaser") sous ${MOTEUR}/, aucun import interdit sous ${STATION}/, ${fetchs} fetch( (moteur/theme/charger.ts), aucun URLSearchParams dans moteur/, "phaser": "3.90.0"` }
}

// ── CL-4 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function cl4(racine) {
  const e = []
  const t = lireOuNull(path.join(racine, STATION, 'Carte.tsx'))
  if (t === null) return { echecs: [`${STATION}/Carte.tsx absent`], detail: '' }
  const s = sansCommentaires(t)
  if (!/\bactif\s*\(\s*['"]stationCarte['"]\s*\)/.test(s)) e.push('Carte.tsx ne lit pas actif(\'stationCarte\')')
  const dyn = [...s.matchAll(/\bdynamic\s*\(([\s\S]*?)\)\s*(?:;|\n|$)/g)]
  if (dyn.length !== 1) e.push(`Carte.tsx : ${dyn.length} appel(s) de next/dynamic (un seul attendu)`)
  else {
    const corps = dyn[0][1].replace(/\s+/g, ' ')
    if (!/ssr\s*:\s*false/.test(corps)) e.push('Carte.tsx : next/dynamic sans { ssr: false }')
    const cibles = [...corps.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1])
    if (cibles.length !== 1 || !/^\.\/moteur\/entree$/.test(cibles[0])) e.push(`Carte.tsx : next/dynamic doit charger ./moteur/entree et lui seul (trouvé : ${cibles.join(', ') || 'rien'})`)
  }
  if (!/from\s*['"]next\/dynamic['"]/.test(s)) e.push('Carte.tsx n\'importe pas next/dynamic')
  for (const i of importsDe(t)) if (i.spec && /(?:^|\/)moteur(?:\/|$)/.test(i.spec) && i.genre !== 'dynamique') e.push(`Carte.tsx importe ${i.spec} en statique (le moteur ne se charge que par next/dynamic)`)
  for (const i of importsDe(t)) if (i.spec && /claw3d/.test(i.spec)) e.push(`Carte.tsx importe ${i.spec} : jamais moteur/claw3d/ en direct (D1)`)
  if (!/data-station-carte/.test(t)) e.push('Carte.tsx : le cadre [data-station-carte] du moteur (celui que les juges de rendu cherchent) est absent')
  if (!/SALLES|data-liste-salles|data-station-attente/.test(t)) e.push('Carte.tsx : le cadre d\'attente et la liste des salles de 026-111 (SALLES, data-liste-salles ou data-station-attente) ont disparu : baissé, le drapeau doit les garder')
  return { echecs: e, detail: 'Carte.tsx lit actif(\'stationCarte\'), charge moteur/entree par un seul next/dynamic({ ssr: false }), sans import direct de moteur/claw3d/, et garde son cadre d\'attente' }
}

// ── CL-6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const INTERDITS_MOTEUR = [
  [/\bMath\s*\.\s*random\b/, 'Math.random'],
  [/\bPhaser\s*\.\s*Math\s*\.\s*(?:Between|FloatBetween)\b|\b(?:Float)?Between\s*\(/, 'Phaser.Math.Between'],
  [/\bRND\b|\bMath\s*\.\s*RND\b/, 'Phaser.Math.RND'],
  [/\bGetRandom\b|\bgetRandom\b/, 'GetRandom'],
  [/\bShuffle\b|\.shuffle\s*\(/, 'Shuffle'],
  [/\bDate\s*\.\s*now\b/, 'Date.now'],
  [/\bperformance\s*\.\s*now\b/, 'performance.now'],
  [/\bnew\s+Date\b/, 'new Date'],
  [/\bsetInterval\b/, 'setInterval'],
  [/\bcrypto\s*\.\s*getRandomValues\b|\brandomUUID\b/, 'crypto (hasard)'],
]
export function cl6(racine) {
  const a = absent(racine)
  if (a) return { echecs: [a], detail: '' }
  const e = []
  const src = sources(racine, MOTEUR)
  for (const { f, texte } of src) {
    const s = sansCommentaires(texte)
    for (const [re, nom] of INTERDITS_MOTEUR) if (re.test(s)) e.push(`${f} : ${nom} (le moteur ne tire rien au hasard et ne lit aucune horloge)`)
    if (/\baddEvent\s*\(/.test(s) && /\bloop\s*:\s*true\b|\brepeat\s*:\s*(?:-1|Infinity)\b/.test(s.slice(s.search(/\baddEvent\s*\(/)))) e.push(`${f} : time.addEvent en boucle`)
    if (/\btweens\s*\.\s*(?:add|chain|create)\b|\bTween\b|\bthis\.tweens\b/.test(s) && /\brepeat\s*:\s*-\s*1\b|\byoyo\s*:/.test(s)) e.push(`${f} : tween en repeat: -1 ou yoyo`)
    else if (/\brepeat\s*:\s*-\s*1\b|\byoyo\s*:\s*true\b/.test(s)) e.push(`${f} : repeat: -1 ou yoyo (animation qui ne s'arrête jamais)`)
  }
  const graine = src.some(({ texte }) => /\bseed\s*:\s*\[\s*(['"])station\1\s*\]/.test(sansCommentaires(texte)))
  if (!graine) e.push("la configuration de Phaser ne porte pas seed: ['station'] (Phaser se sème sinon par Date.now() * Math.random())")
  return { echecs: e, detail: `${src.length} source(s) de moteur/ lus (commentaires ôtés) : ni Math.random, ni Between, ni RND, ni GetRandom, ni Shuffle, ni horloge (Date.now, performance.now, new Date), ni setInterval, ni addEvent en boucle, ni tween infini ; seed: ['station']` }
}

// ── La configuration de Phaser, lue dans le source (CL-13) ───────────────────────────────────────────────────────────────
export function configPhaser(racine) {
  const e = []
  const src = sources(racine, MOTEUR).map(({ texte }) => sansCommentaires(texte)).join('\n')
  for (const [cle, v] of [['pixelArt', 'true'], ['antialias', 'false'], ['roundPixels', 'true']]) {
    if (!new RegExp(`\\b${cle}\\s*:\\s*${v}\\b`).test(src)) e.push(`la configuration de Phaser ne porte pas ${cle}: ${v}`)
  }
  return e
}

// ── CL-8, moitié source : « — » dans le décor ────────────────────────────────────────────────────────────────────────────
export function ecransVides(racine) {
  const src = sources(racine, MOTEUR).map(({ texte }) => sansCommentaires(texte)).join('\n')
  return /['"`][^'"`\n]*—[^'"`\n]*['"`]/.test(src) ? [] : ['aucun texte « — » dans moteur/ : l\'écran d\'une salle sans donnée doit dire « — »']
}

// ── CL-16, moitié source ─────────────────────────────────────────────────────────────────────────────────────────────────
export function cl16Source(racine) {
  const e = []
  const t = lireOuNull(path.join(racine, 'proxy.ts')) ?? lireOuNull(path.join(racine, 'middleware.ts'))
  if (t === null) return ['proxy.ts absent']
  const m = /\bCHEMINS_APP_PRESTI\s*=\s*(\/\^[^\n]*\$\/)/.exec(t)
  if (!m) return ['CHEMINS_APP_PRESTI introuvable dans proxy.ts (une expression régulière littérale attendue)']
  if (!/\bstation\\\/\.\*/.test(m[1])) e.push('CHEMINS_APP_PRESTI ne porte pas l\'alternative station\\/.*')
  return e
}
