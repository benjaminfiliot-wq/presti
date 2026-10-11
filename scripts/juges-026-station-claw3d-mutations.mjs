#!/usr/bin/env node
// scripts/juges-026-station-claw3d-mutations.mjs — la contre-vérification des juges de rendu de la station Claw3D (fiche 026-191).
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script prend les cinq juges de la station
// (station-claw3d-qa, station-ecran-qa, station-themes-qa, station-planche-qa, ecommerce-reservee-qa) et leur fait lire des COPIES :
//   · une copie intacte par commande (le témoin) : code 0 exigé ;
//   · puis, pour chaque mutation, la même copie avec UN remplacement de texte exact : code ≠ 0 exigé, avec la ligne
//     « FAIL <critère> — … » du critère attendu et le bilan qui le nomme.
// Il ne corrige JAMAIS un juge, un jeu d'essai ni le dépôt en place : seule la copie sous .orchestre/travail/026-191/ est écrite
// (les liens vers node_modules et public sont retirés par fs.unlinkSync avant toute suppression ; chaque texte muté est rétabli
// après son passage et son empreinte relue). Si une mutation passe, elle est écrite en tête du rapport et le script sort en code 1.
//
// Les juges écrivent « ✅ ID … » / « ❌ ID … » ; le méta-juge (juges-026-mutations-preuve.mjs) lit « PASS|FAIL ID — … » et un
// bilan « <juge> : FAIL — ids ». Le mode --relais de CE script lance le juge sur la copie et recopie ses lignes dans cette forme,
// sans rien changer au verdict (✅ → PASS, ❌ → FAIL, une ligne « (complément) » est fondue dans celle de son critère, le code de
// sortie est celui du juge). La commande de chaque mutation est donc :
//   node scripts/juges-026-station-claw3d-mutations.mjs --relais=<claw3d|ecran|themes|planche|ecommerce> [options du juge] --racine={racine}
// Une ligne en échec qui dit « préalable », « non jugé », « interrompu » ou rapporte un build cassé ne compte PAS comme une
// mutation prise : le juge n'a pas jugé la faute, il n'a pas pu juger.
//
// Usage :
//   node scripts/juges-026-station-claw3d-mutations.mjs                  tout : témoins, mutations, rapports ; code 0 si tout est pris
//   node scripts/juges-026-station-claw3d-mutations.mjs --seul=<motif>   une mutation, un critère ou un juge (mise au point : code 3 si tout est pris)
//   node scripts/juges-026-station-claw3d-mutations.mjs --ancres         vérifie seulement que chaque « avant » est présent une fois (aucun juge lancé)
//   --budget=<min>   le temps du script (19 par défaut : le méta-juge en laisse 20) ; --garder   garde la copie
// Écrit sous .orchestre/travail/026-191/ et .orchestre/preuves/026-191/ (mutations.md, mutations.json, journaux/). Aucun appel réseau,
// aucun --reel, aucun --constat, aucune écriture en production, aucun .env.local.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-191'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const JOURNAUX = path.join(PREUVES, 'journaux')
const SELF = 'scripts/juges-026-station-claw3d-mutations.mjs'

const JUGES = {
  claw3d: { script: 'scripts/station-claw3d-qa.mjs', nom: 'station-claw3d-qa' },
  ecran: { script: 'scripts/station-ecran-qa.mjs', nom: 'station-ecran-qa' },
  themes: { script: 'scripts/station-themes-qa.mjs', nom: 'station-themes-qa' },
  planche: { script: 'scripts/station-planche-qa.mjs', nom: 'station-planche-qa' },
  ecommerce: { script: 'scripts/ecommerce-reservee-qa.mjs', nom: 'ecommerce-reservee-qa' },
}

// ── Les mutations : UN remplacement de texte exact chacune ──────────────────────────────────────────────────────────────────
// { juge, args, critere, fichier, avant, apres, nom, rendu }   (rendu : le passage construit et sert la copie : le plus long)
// Les ancres sont des LIGNES uniques (les fichiers sont en CRLF dans le dépôt de Windows, en LF ailleurs).
const MUTATIONS = []
const muter = (juge, args, critere, fichier, avant, apres, nom, rendu = false) => MUTATIONS.push({ juge, args, critere, fichier, avant, apres, nom, rendu })
const ST = 'app/controle/station'
const MO = `${ST}/moteur`
const SCENE = `${MO}/scene/StationPixelScene.ts`
const ALEA = '(globalThis as unknown as { [k: string]: { random(): number } })["Mat" + "h"].random()'

// station-claw3d-qa — ce qui se LIT d'abord (provenance, CL-6, grille, hygiène), puis ce qui se MESURE (build, Chromium).
muter('claw3d', '--partie=provenance', 'CL-1', `${MO}/claw3d/LICENSE-claw3d.txt`,
  'Permission is hereby granted, free of charge, to any person obtaining a copy',
  'Use of this software is permitted, free of charge, to any person obtaining a copy',
  'la notice MIT de LICENSE-claw3d.txt perd son corps (« Permission is hereby granted… »)')
muter('claw3d', '--partie=provenance', 'CL-3', 'app/controle/layout.tsx',
  "import { actif } from '@/lib/flags'",
  "import { actif } from '@/lib/flags'\nimport Phaser from 'phaser'\nvoid Phaser",
  'Phaser importé en statique dans app/controle/layout.tsx (toute la console le chargerait)')
muter('claw3d', '--partie=verite', 'CL-6', SCENE,
  'this.calme = 0;',
  'this.calme = Phaser.Math.Between(0, 0);',
  'un Phaser.Math.Between dans la scène (reveil())')
muter('claw3d', '--partie=grille', 'CL-15', `${MO}/grille/grille.ts`,
  'if (e.reservee || !e.poste) continue',
  'if (!e.poste) { if (e.reservee) salles[e.cle] = { x: e.porte.x, y: e.porte.y }; continue }',
  'destinations() range la porte de la salle réservée parmi les destinations')
muter('claw3d', '--partie=hygiene', 'CL-16', 'proxy.ts',
  '|station\\/.*|',
  '|',
  'station\\/.* retiré de CHEMINS_APP_PRESTI (les thèmes se serviraient sur le domaine d’un artisan)')
muter('claw3d', '--partie=verite', 'CL-5', SCENE,
  'p.image.setPosition(Math.round(x), Math.round(y));',
  `p.image.setPosition(Math.round(x) + Math.floor(${ALEA} * 3), Math.round(y));`,
  'un hasard caché (Math["Mat"+"h"].random) qui décale le sprite à l’arrivée : deux pages, deux images', true)
muter('claw3d', '--partie=verite', 'CL-7', SCENE,
  'const porte = carte.portes[acteur.salle], poste = carte.postes[acteur.salle];',
  'const lieu = acteur.motif === null ? "repos" : acteur.salle; const porte = carte.portes[lieu], poste = carte.postes[lieu];',
  'un agent sans motif (inactif) est envoyé au Repos : la déduction du prototype remise dans la scène', true)
muter('claw3d', '--partie=verite', 'CL-8', SCENE,
  'c.fillRect(0, 0, width, height);',
  'c.fillRect(0, 0, width, height);\n      c.fillStyle = "#ffffff";\n      c.fillText(String(pont.getState().acteurs.length), 4, 10);',
  'le nombre d’agents peint dans la texture du décor', true)
muter('claw3d', '--partie=repos', 'CL-9', `${MO}/adaptateur/index.ts`,
  'if (s === derniere) return',
  'if (s === derniere) void 0',
  'le pont est appelé à chaque lecture : la signature n’est plus comparée', true)
muter('claw3d', '--partie=garde', 'CL-10', `${ST}/Station.tsx`,
  "const noeudCarte = direct ? <Carte equipage={direct.equipage} tapis={direct.tapis} bulles={bulles} reglages={reglages} carte={direct.carte} /> : null",
  "const noeudCarte = <Carte equipage={direct?.equipage ?? null} tapis={direct?.tapis ?? null} bulles={bulles} reglages={reglages} carte={direct?.carte ?? null} />",
  '<Carte /> monté avant la réponse de vue=direct', true)
muter('claw3d', '--partie=csp', 'CL-11', `${MO}/entree.tsx`,
  'const [raison, setRaison] = useState<string | null>(null)',
  "const [raison, setRaison] = useState<string | null>(null)\n  useEffect(() => { void fetch('https://cdn.example.net/station.js', { mode: 'no-cors' }).catch(() => undefined) }, [])",
  'un fetch vers un hôte externe au montage de la carte', true)
muter('claw3d', '--partie=poids', 'CL-12', 'app/controle/page.tsx',
  "import { apiDirection } from './client'",
  "import { apiDirection } from './client'\nif (typeof window !== 'undefined') void import('phaser')",
  'Phaser importé par la page /controle (hors station)', true)
muter('claw3d', '--partie=pixel', 'CL-13', `${MO}/claw3d/OfficePhaserCanvas.tsx`,
  'toile.style.width = `${toile.width / densite}px`;',
  'toile.style.width = `${toile.width}px`;',
  'la largeur CSS du canevas n’est plus divisée par la densité (l’échelle comptée en pixels CSS)', true)
muter('claw3d', '--partie=contexte', 'CL-14', `${MO}/claw3d/OfficePhaserCanvas.tsx`,
  'webglcontextlost',
  'webglcontextkept',
  'le rattrapage de la perte de contexte WebGL retiré', true)

// station-ecran-qa — un passage par critère (--critere=), le moteur de la copie construit une fois par contenu.
muter('ecran', '--partie=verite --critere=CE-4', 'CE-4', SCENE,
  'if (!acteur.salle) return null;',
  'if (!acteur.salle || acteur.motif === "tache") return null;',
  'un agent qui prend une tâche ne va plus dans sa salle (tache_prise sans destination)', true)
muter('ecran', '--partie=camera --critere=CE-11', 'CE-11', `${MO}/camera/zones.ts`,
  "u.searchParams.set('salle', cle)",
  "u.searchParams.set('zone', cle)",
  'une zone [data-salle] ne pose plus ?salle= dans l’adresse', true)
muter('ecran', '--partie=acteurs --critere=CE-13', 'CE-13', `${MO}/acteurs/index.ts`,
  'eg.slice(0, 12)',
  'eg.slice(0, 11)',
  'l’égaliseur de l’écran de l’Expérience perd une barre (moteur/acteurs, 026-183)', true)
muter('ecran', '--partie=calque --critere=CE-16', 'CE-16', `${MO}/calque/index.ts`,
  'function dire(e: Element, t: string) { if (e.textContent !== t) e.textContent = t }',
  'function dire(e: Element, t: string) { if (e.innerHTML !== t) e.innerHTML = t }',
  'un nom d’agent rendu en HTML par le calque', true)
muter('ecran', '--partie=themes --critere=CE-17', 'CE-17', `${ST}/Habillage.tsx`,
  'appliquerReglages(noeud, fusionner(defautsDuTheme(theme), effectifs), theme)',
  'appliquerReglages(document.documentElement, fusionner(defautsDuTheme(theme), effectifs), theme)',
  'la palette du thème posée sur <html> (:root) au lieu du nœud .mc', true)
muter('ecran', '--partie=reglages --critere=CE-19', 'CE-19', `${ST}/reglages/Reglages.tsx`,
  'setBrouillon((avant) => { const n = copie(avant) as any; f(n); return elaguer(n) as Reglages })',
  'setBrouillon((avant) => { const n = copie(avant) as any; f(n); const e = elaguer(n) as Reglages; void ecrire(e); return e })',
  'l’aperçu écrit par PUT à chaque changement du brouillon', true)
muter('ecran', '--partie=salles2 --lot=b --critere=CE-22', 'CE-22', `${ST}/salles/Observatoire.tsx`,
  'nombre={vue.trouves}',
  'nombre={vue.trouves} nom={vue.entreprise}',
  'un nom de personne affiché dans l’Observatoire (salle de 026-189)', true)
muter('ecran', '--partie=webkit --critere=CE-24', 'CE-24', `${MO}/telephone/telephone.css`,
  '[data-station-carte] { touch-action: none; max-width: 100%; overflow-x: clip; }',
  '[data-station-carte] { touch-action: auto !important; max-width: 100%; overflow-x: clip; }',
  'touch-action: none retiré du cadre de la carte au téléphone', true)

// station-themes-qa — hors ligne : modules purs par ts-loader, thèmes lus dans public/station/themes/<clé>/.
muter('themes', '--partie=modules', 'TH-3', 'lib/pilotage/disposition.ts',
  'if (aCle(salles, SALLE_RESERVEE.cle) && salles[SALLE_RESERVEE.cle] !== reservee?.cle) return refus(',
  'if (false && aCle(salles, SALLE_RESERVEE.cle) && salles[SALLE_RESERVEE.cle] !== reservee?.cle) return refus(',
  'validerDisposition accepte la salle réservée déplacée')
muter('themes', '--partie=modules', 'TH-6', 'lib/pilotage/reglages.ts',
  "if (typeof valeur === 'string' && RE_COULEUR.test(valeur)) noeud.style.setProperty(jeton, valeur)",
  "if (typeof valeur === 'string' && RE_COULEUR.test(valeur)) { noeud.style.setProperty(jeton, valeur); (globalThis as any).document?.documentElement?.style?.setProperty?.(jeton, valeur) }",
  'appliquerReglages pose aussi les jetons sur document.documentElement')
muter('themes', '--theme=station', 'TH-9', 'public/station/themes/station/licence.json',
  '"packs": [',
  `"packs": [${' '.repeat(760_000)}`,
  'un thème de 800 Kio (blancs ajoutés dans licence.json : le poids du dossier dépasse 700 Kio)')
muter('themes', '--theme=station', 'TH-10', 'public/station/themes/station/licence.json',
  '"dossier": "05-zwonky-spacers"',
  '"dossier": "99-hors-du-lot-a"',
  'un pack hors du lot A cité dans licence.json')

// station-planche-qa — la planche vit sur l'usine (atelier ~/claw3d-pixel, lot A, Chromium).
muter('planche', '--partie=planche', 'PN-2', 'docs/station/grille.json',
  '"reserve": {',
  '"reservee_retiree": {',
  'la salle réservée absente de la planche (docs/station/grille.json)', true)
muter('planche', '--partie=planche', 'PN-6', 'docs/station/planche.md',
  'palette:',
  'chiffres: 0 1 2 3 4 5 6 7 8 9\npalette:',
  'un chiffre peint dans le décor de la planche (la planche vit dans l’atelier, hors du dépôt)', true)

// ecommerce-reservee-qa — hors ligne.
muter('ecommerce', '', 'EC-1', 'lib/flags.ts',
  'ecommerce: false,',
  'ecommerce: true,',
  'le drapeau ecommerce levé')
muter('ecommerce', '', 'EC-4', 'supabase/migrations/0124_automatisme_sous_gardes.sql',
  '-- Migration corrective : 0099/0122 appliquées restent intactes.',
  '-- Migration corrective : 0099/0122 appliquées restent intactes.\ncreate table if not exists public.ecommerce_commandes (id bigint primary key);',
  'une table ecommerce créée par une migration (le fichier app/api/ecommerce/route.ts ne se plante pas par un remplacement de texte)')

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const court = (t, n = 240) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const dormirMs = (ms) => new Promise((r) => setTimeout(r, ms))

const o = (() => {
  const r = { relais: null, racine: null, seul: null, ancres: false, garder: false, budget: 19, reste: [] }
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { console.error(`✗ argument inattendu : ${a}`); process.exit(2) }
    const [, k, v] = m
    if (k === 'ancres' || k === 'garder') r[k] = true
    else if (k === 'budget' && /^\d+$/.test(v ?? '')) r.budget = Number(v)
    else if (['relais', 'racine', 'seul'].includes(k) && v) r[k] = v
    else if (r.relais) r.reste.push(a)
    else { console.error(`✗ option inconnue ou sans valeur : --${k}`); process.exit(2) }
  }
  return r
})()

// ═══ Le relais : un juge, vu du méta-juge ════════════════════════════════════════════════════════════════════════════════════
const RE_LIGNE_JUGE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)(?: (.*))?$/
function relais() {
  const juge = JUGES[o.relais]
  if (!juge) { console.log(`${SELF} : appel refusé — --relais=<${Object.keys(JUGES).join('|')}> attendu`); return 2 }
  if (!o.racine || !existe(o.racine)) { console.log(`${juge.nom} : appel refusé — --racine=<dossier> attendu`); return 2 }
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  const r = spawnSync(process.execPath, [path.join(RACINE, juge.script), ...o.reste, `--racine=${o.racine}`], { cwd: RACINE, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 17 * 60_000 })
  const sortie = sansAnsi(`${r.stdout ?? ''}${r.stderr ?? ''}`)
  const vus = new Map() // id → { ok, detail }, dans l'ordre où le juge les écrit
  const autres = []
  for (const l of sortie.split(/\r?\n/)) {
    const m = RE_LIGNE_JUGE.exec(l)
    if (!m) { if (l.trim() && !/^\s+at .*:\d+:\d+/.test(l)) autres.push(l); continue }
    const [, signe, id, reste = ''] = m
    const detail = reste.replace(/ \(complément\)$/, '').trim()
    const ok = signe === '✅'
    if (vus.has(id)) { const v = vus.get(id); v.ok = v.ok && ok; v.detail += ` ; ${detail}` } else vus.set(id, { ok, detail })
  }
  const bilan = autres.filter((l) => /^[\w.-]+(?: --[\w-]+(?:=\S+)?)* : (?:PASS|FAIL)(?: — .*)?$/.test(l)).at(-1)
  for (const l of autres.filter((x) => x !== bilan).slice(0, 6)) console.log(`# ${court(l, 200)}`)
  for (const [id, v] of vus) console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.detail || (v.ok ? 'conforme' : 'en échec')}`)
  const rouges = [...vus].filter(([, v]) => !v.ok).map(([id]) => id)
  console.log(bilan ?? `${juge.nom}${o.reste.length ? ` ${o.reste.join(' ')}` : ''} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : r.status === 0 ? 'PASS' : 'FAIL'}`)
  return r.status === null ? 124 : r.status
}
if (o.relais) process.exit(relais())

// ═══ La copie ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
function retirer(dir) {
  if (!existe(dir)) return
  const rel = path.relative(TRAVAIL, dir)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('suppression hors travail refusée')
  for (const nom of fs.readdirSync(dir)) {
    const p = path.join(dir, nom), st = fs.lstatSync(p)
    if (st.isSymbolicLink()) fs.unlinkSync(p)
    else if (st.isDirectory()) retirer(p)
    else fs.unlinkSync(p)
  }
  fs.rmdirSync(dir)
}
const IGNORE = new Set(['node_modules', '.next', '.git'])
const filtre = (src) => !IGNORE.has(path.basename(src)) && !src.endsWith('.tsbuildinfo')
function copier() {
  retirer(COPIE)
  fs.mkdirSync(COPIE, { recursive: true })
  // docs/ pèse 150 Mo : seuls docs/station (planche) et docs/ecommerce (EC-3) sont lus par ces juges.
  for (const d of ['app', 'lib', 'components', 'supabase', 'docs/station', 'docs/ecommerce']) if (existe(path.join(RACINE, d))) fs.cpSync(path.join(RACINE, d), path.join(COPIE, d), { recursive: true, filter: filtre })
  for (const f of ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']) if (existe(path.join(RACINE, f))) fs.copyFileSync(path.join(RACINE, f), path.join(COPIE, f))
  fs.mkdirSync(path.join(COPIE, 'scripts'), { recursive: true })
  for (const f of ['fermeture-e2e.mjs']) if (existe(path.join(RACINE, 'scripts', f))) fs.copyFileSync(path.join(RACINE, 'scripts', f), path.join(COPIE, 'scripts', f))
  // public/ : un dossier réel dont public/station est une copie PHYSIQUE (les mutations de thème l'écrivent) et le reste des liens.
  const pub = path.join(RACINE, 'public')
  fs.mkdirSync(path.join(COPIE, 'public'), { recursive: true })
  for (const e of fs.readdirSync(pub, { withFileTypes: true })) {
    const a = path.join(pub, e.name), b = path.join(COPIE, 'public', e.name)
    if (e.name === 'station') fs.cpSync(a, b, { recursive: true })
    else if (e.isDirectory()) fs.symlinkSync(a, b, 'junction')
    else if (fs.statSync(a).size < 8 * 1024 * 1024) fs.copyFileSync(a, b)
  }
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
}

// ═══ Lancer une commande sous délai ═════════════════════════════════════════════════════════════════════════════════════════
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function lancer(args, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CE_SCRIPT, '--relais=' + args[0], ...args.slice(1), `--racine=${COPIE}`], { cwd: RACINE, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true })
    let sortie = '', expire = false
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) { flux.setEncoding('utf8'); flux.on('data', (d) => { if (sortie.length < 4_000_000) sortie += d }) }
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), duree_s: (Date.now() - t0) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, duree_s: (Date.now() - t0) / 1000, expire }) })
  })
}
const commandeDe = (m) => `node ${SELF} --relais=${m.juge}${m.args ? ` ${m.args}` : ''} --racine={racine}`
const argsDe = (m) => [m.juge, ...m.args.split(/\s+/).filter(Boolean)]
/** Les lignes d'un passage, par critère : { id → { signe, ligne } } et le bilan. */
function lignesDe(sortie) {
  const par = new Map()
  for (const l of sortie.split(/\r?\n/)) { const m = /^(PASS|FAIL) (\S+) — (.*)$/.exec(l); if (m && !par.has(m[2])) par.set(m[2], { signe: m[1], ligne: l, detail: m[3] }) }
  const bilan = sortie.split(/\r?\n/).filter((l) => /^[\w.-]+(?: --[\w-]+(?:=\S+)?)* : (?:PASS|FAIL)(?: — .*)?$/.test(l)).at(-1) ?? null
  return { par, bilan }
}
// Un échec qui n'est pas un jugement de la faute : le juge n'a pas pu juger (préalable, build cassé, non jugé).
const RE_INFRA = /préalable|non jugé|non évalué|interrompu|ne se prépare pas|absent de node_modules|moteur absent|Failed to compile|error TS|Type error|next build|appel refusé|injoignable|le juge ne peut pas/i
function verdict(sortie, critere) {
  const { par, bilan } = lignesDe(sortie)
  const l = par.get(critere)
  if (!l) return { ok: false, raison: `aucune ligne « ${critere} » dans la sortie` }
  if (l.signe !== 'FAIL') return { ok: false, raison: `${critere} rapporté ${l.signe} : « ${court(l.ligne, 120)} »` }
  if (RE_INFRA.test(l.detail)) return { ok: false, raison: `${critere} en échec pour une raison d'infrastructure, pas pour la faute : « ${court(l.detail, 160)} »` }
  if (!bilan || !/ : FAIL — /.test(bilan) || !bilan.split(' : FAIL — ')[1].split(/,\s*/).includes(critere)) return { ok: false, raison: `le bilan ne nomme pas ${critere} : « ${court(bilan ?? 'aucun bilan', 100)} »` }
  return { ok: true, ligne: l.ligne }
}
const rougesDe = (sortie) => [...lignesDe(sortie).par].filter(([, v]) => v.signe === 'FAIL').map(([id]) => id)

async function principal() {
  const retenues = o.seul ? MUTATIONS.filter((m) => [m.juge, m.critere, m.nom, m.fichier].some((y) => y.includes(o.seul))) : MUTATIONS
  if (!retenues.length) { console.error(`aucune mutation ne correspond à --seul=${o.seul}`); process.exitCode = 2; return }
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.mkdirSync(JOURNAUX, { recursive: true })
  const debut = Date.now(), fin = debut + o.budget * 60_000
  const defauts = [], lignes = [], rapport = [], temoins = []
  const dir = COPIE
  try {
    copier()
    // Les ancres : chaque « avant » présent exactement une fois dans la copie intacte.
    const originaux = new Map()
    const jouables = []
    for (const m of retenues) {
      const f = path.join(dir, m.fichier)
      if (!existe(f)) { defauts.push(`${m.critere} ${m.nom} : fichier absent de la copie (${m.fichier}) — la fiche qui le livre n'est pas passée ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ${m.fichier} absent`); continue }
      if (!originaux.has(f)) originaux.set(f, lire(f))
      const n = originaux.get(f).split(m.avant).length - 1
      if (n !== 1) { defauts.push(`${m.critere} ${m.nom} : texte « avant » présent ${n} fois dans ${m.fichier} (une seule attendue) ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ancre présente ${n} fois dans ${m.fichier}`); continue }
      jouables.push(m)
    }
    if (o.ancres) {
      for (const l of lignes) console.log(l)
      console.log(`${jouables.length}/${retenues.length} ancres présentes une fois`)
      process.exitCode = defauts.length ? 1 : 0
      return
    }
    // Les passages les moins longs d'abord : ce qui se lit, puis ce qui se construit.
    jouables.sort((a, b) => Number(a.rendu) - Number(b.rendu))
    const commandes = new Map() // clé → { m, temoin }
    let n = 0
    for (const m of jouables) {
      const cle = commandeDe(m)
      if (!commandes.has(cle)) commandes.set(cle, { m, temoin: null, rouges: [] })
    }
    // Les témoins : la copie intacte, une fois par commande, au moment de la première mutation qui la veut.
    for (const m of jouables) {
      const cle = commandeDe(m)
      const c = commandes.get(cle)
      if (Date.now() + (m.rendu ? 120_000 : 30_000) > fin) { defauts.push(`${m.critere} ${m.nom} : non jouée — le budget de ${o.budget} min est épuisé`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; budget épuisé`); continue }
      if (!c.temoin) {
        const r = await lancer(argsDe(m), Math.max(60_000, Math.min(fin - Date.now(), 14 * 60_000)))
        ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-temoin-${m.juge}${m.args ? '-' + m.args.replace(/[^\w=,-]+/g, '_') : ''}.log`), `$ ${cle}\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
        c.temoin = r
        c.rouges = rougesDe(r.sortie)
        const etat = r.code === 0 ? 'vert' : `rouge (code ${r.code}${r.expire ? ', délai dépassé' : ''} ; ${c.rouges.join(', ') || 'aucune ligne en échec'})`
        temoins.push(`${m.juge} ${m.args || ''} : témoin ${etat} en ${r.duree_s.toFixed(0)} s`)
        console.log(`TÉMOIN ${m.juge} ${m.args || ''} : ${etat}`)
        if (r.code !== 0) defauts.push(`TÉMOIN ${m.juge} ${m.args || ''} rouge : code ${r.code}${r.expire ? ' (délai dépassé)' : ''} ; critères en échec : ${c.rouges.join(', ') || 'aucun nommé'} ; ${court(r.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 200)}`)
      }
      // Un témoin rouge sur le critère visé : la mutation ne prouve rien (le juge échoue déjà sans elle).
      if (c.temoin.expire || c.temoin.code === 124) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin hors délai`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin n'a pas fini`); continue }
      if (c.rouges.includes(m.critere)) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; le témoin échoue déjà sur ${m.critere} (critère non rejoué intact)`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin est déjà rouge sur ${m.critere}`); continue }
      const f = path.join(dir, m.fichier), original = originaux.get(f)
      fs.writeFileSync(f, original.replace(m.avant, () => m.apres))
      let r
      try { r = await lancer(argsDe(m), Math.max(60_000, Math.min(fin - Date.now() + 60_000, 14 * 60_000))) }
      finally { fs.writeFileSync(f, original) }
      if (sha(Buffer.from(lire(f))) !== sha(Buffer.from(original))) throw new Error(`${m.fichier} n'a pas été rétabli`)
      ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-${m.critere}-${m.juge}.log`), `$ ${cle}\n# ${m.fichier} : « ${court(m.avant, 120)} » → « ${court(m.apres, 120)} »\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
      const v = verdict(r.sortie, m.critere)
      const ok = r.code !== 0 && !r.expire && v.ok
      const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${ok ? v.ligne : `${r.expire ? 'délai dépassé' : `code ${r.code}`} : ${v.raison ?? 'aucun critère nommé en échec'}`}`
      lignes.push(ligne); console.log(ligne)
      if (!ok) defauts.push(ligne)
      else rapport.push({ juge: JUGES[m.juge].script, commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: Number(r.duree_s.toFixed(1)) })
    }
    const total = retenues.length
    ecrire(path.join(PREUVES, 'mutations.md'), `# Mutations des juges de la station Claw3D (026-191)\n\n${defauts.length ? `## ÉCHECS (${defauts.length})\n${defauts.map((d) => `- ${d}`).join('\n')}\n\n` : ''}## Témoins (copie intacte)\n${temoins.map((t) => `- ${t}`).join('\n') || '- aucun'}\n\n## Mutations\n${lignes.map((l) => `- ${l}`).join('\n')}\n\nBilan : ${rapport.length}/${total} mutations prises sur leur critère nommé, en ${((Date.now() - debut) / 60_000).toFixed(1)} min (budget ${o.budget} min).\n`)
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    console.log(`026-191 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${total} mutations prises`)
    process.exitCode = defauts.length ? 1 : o.seul ? 3 : 0
  } finally {
    if (!o.garder && !o.ancres) { try { retirer(COPIE) } catch (e) { console.error(`copie non retirée : ${e.message}`) } }
    else if (o.ancres) { try { retirer(COPIE) } catch { /* relevé plus bas */ } }
  }
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
