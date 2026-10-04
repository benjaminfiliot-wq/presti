#!/usr/bin/env node
// scripts/juges-026-reseaux-mutations.mjs — la contre-vérification du juge du domaine réseaux (fiche 026-219, C16) : contenu-qa.mjs,
// lancé par `--racine=<copie>` sur une COPIE du code livré (lib/contenu/**, scripts/contenu/**, public/contenu/gabarits/**,
// supabase/migrations/*_contenu.sql, docs/marketing/**).
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script lui fait lire des COPIES :
//   · une copie intacte par partie (le témoin) : code 0 exigé ;
//   · puis, pour chaque mutation, la même copie avec UN remplacement de texte exact : code ≠ 0 exigé, avec la ligne
//     « FAIL <critère> — … » du critère attendu et le bilan qui le nomme.
// Il ne corrige JAMAIS le juge, un jeu d'essai ni le dépôt en place : seule la copie sous .orchestre/travail/026-219/ est écrite
// (lien vers node_modules retiré par fs.unlinkSync avant toute suppression ; chaque texte muté est rétabli, son empreinte relue).
// Si une mutation passe, elle est écrite en tête du rapport avec la lacune à signaler à 026-204 et le script sort en code 1.
//
// DÉCISION « tout est automatique » (Benj, 04/10/2026, D-0410-1 ; réponse à la question de l'usine sur cette fiche) : les contrôles
// automatiques (pause fail-closed, STOP/opposition, coût exactement nul, plafonds, Laya) remplacent l'accord individuel sur chaque
// publication Instagram/Facebook. Cette fiche ne mute donc plus « l'accord individuel retiré » de ces voies : elle mute chacune des
// gardes qui le remplacent (opposition, coût nul, pause avant le modèle, avant Graph, avant la mesure). `scripts/contenu-ecran-qa.mjs`
// n'existe pas (026-204 ne l'a pas livré) et n'est pas couvert ici. Le chemin TikTok exige encore l'accord individuel dans le code ET
// dans le juge (TT-2, « reste à trancher » de D-0410-9) : ses deux mutations (accord retiré, échéance acceptée) restent donc des
// fautes réelles aujourd'hui.
//
// Le mode --relais lance contenu-qa sur la copie et récrit ses lignes « ✅ ID — nom : détail » / « ❌ … » / « ➖ … » en
// « PASS|FAIL|SAUTE ID — détail », avec le bilan « contenu-qa --partie=<p> : FAIL — ids » que lit le méta-juge ; le code de
// sortie est celui du juge :
//   node scripts/juges-026-reseaux-mutations.mjs --relais=contenu --partie=<p> --racine={racine}
// Une ligne en échec qui dit « préalable », « non jugé » ou « interrompu » ne compte pas comme une mutation prise.
//
// Usage :
//   node scripts/juges-026-reseaux-mutations.mjs                  tout ; code 0 si tout est pris
//   node scripts/juges-026-reseaux-mutations.mjs --seul=<motif>   une mutation, un critère ou une partie (code 3 si tout est pris)
//   node scripts/juges-026-reseaux-mutations.mjs --ancres         vérifie seulement que chaque « avant » est présent une fois
//   --budget=<min> (19 par défaut) · --garder
// Écrit sous .orchestre/travail/026-219/ et .orchestre/preuves/026-219/ (mutations.md, mutations.json, journaux/). Aucun secret,
// aucun réseau réel (faux jev, faux Graph, faux TikTok dans les enfants du juge), aucun compte, aucun --reel.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-219'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const JOURNAUX = path.join(PREUVES, 'journaux')
const SELF = 'scripts/juges-026-reseaux-mutations.mjs'
const JUGE = { script: 'scripts/contenu-qa.mjs', nom: 'contenu-qa' }

// ── Les mutations : UN remplacement de texte exact chacune ──────────────────────────────────────────────────────────────────
// { partie, critere, fichier, avant, apres, nom }
const MUTATIONS = []
const muter = (partie, critere, fichier, avant, apres, nom) => MUTATIONS.push({ partie, critere, fichier, avant, apres, nom })
const LIGNES = 'lib/contenu/lignes.ts'
const META = 'lib/contenu/metaPublier.ts'
const MESURE = 'lib/contenu/mesure.ts'
const FAB = 'scripts/contenu/fabriquer.mjs'
const TIK = 'scripts/contenu/publier-tiktok.mjs'

// Les gardes qui remplacent l'accord individuel (D-0410-1).
muter('geste', 'GE-2', LIGNES,
  "if (deps.opposition === true) return refuser('STOP ou opposition : aucune publication')",
  "if (false) return refuser('STOP ou opposition : aucune publication')",
  'STOP ou opposition connue ignorée : la publication part quand même')
muter('geste', 'GE-2', LIGNES,
  "if (deps.coutEuros !== 0) return refuser('coût inconnu ou positif : publication refusée')",
  "if (false) return refuser('coût inconnu ou positif : publication refusée')",
  'coût inconnu ou positif accepté : le coût exactement nul n’est plus exigé')
muter('lignes', 'LN-7', LIGNES,
  "if (!(await sortiePermise()).permise) return refuser('pause générale : aucun appel au modèle', preuves)",
  'if (false) return refuser(\'pause générale : aucun appel au modèle\', preuves)',
  'la pause générale n’est plus relue avant chaque appel au modèle (entre deux textes)')
muter('meta', 'MP-6', META,
  "if (!(await sortiePermise()).permise) return refus('pause générale : aucune publication Graph', { etape: 'publication' })",
  "if (false) return refus('pause générale : aucune publication Graph', { etape: 'publication' })",
  'la pause générale n’est plus relue avant la publication Graph, après la fabrication du conteneur')
muter('mesure', 'ME-4', MESURE,
  "if (!(await sortiePermise()).permise) return { ok: false, motif: 'pause générale : aucun appel au modèle' }",
  "if (false) return { ok: false, motif: 'pause générale : aucun appel au modèle' }",
  'la pause générale n’est plus relue avant le contrôle d’un libellé chiffré par le modèle')
// Le plafond, le seuil de Laya, les chiffres sans source, le score qui ne décide jamais.
muter('lignes', 'LN-3', LIGNES,
  'fait >= ligne.quotaJour',
  'fait > ligne.quotaJour',
  'le plafond du jour dépassé d’une publication (>= devient >)')
muter('lignes', 'LN-4', LIGNES,
  'export const SEUIL_LAYA = 0.5',
  'export const SEUIL_LAYA = 0.49',
  'jev noul à 0,49 accepté (le seuil de Laya passe de 0,5 à 0,49)')
muter('mesure', 'ME-3', MESURE,
  "if (typeof source !== 'string' || !source.trim()) return { ok: false, motif: 'affirmation chiffrée sans source' }",
  "if (false) return { ok: false, motif: 'affirmation chiffrée sans source' }",
  'un libellé chiffré sans source est publié')
muter('mesure', 'ME-2', MESURE,
  "if (!/estimation/i.test(libelle)) return",
  "if (false) return",
  'une attribution de vente affichée sans la mention « estimation » (présentée comme certaine)')
muter('boucle', 'BO-2', 'lib/contenu/boucle.ts',
  "{ statut: 'tendance', raison: 'vues inconnues : le score de Laya seul ne suffit pas à refaire ni à suspendre' }",
  "{ statut: 'refaire', raison: 'vues inconnues : le score de Laya seul suffit à refaire' }",
  'jev score devient une permission de republier à lui seul')
// La fabrique : licence, audio.
muter('fabrication', 'FA-4', FAB,
  "if (m.pisteAudio !== true) return refus('sans_audio', 'vidéo silencieuse : aucune piste audio')",
  "if (false) return refus('sans_audio', 'vidéo silencieuse : aucune piste audio')",
  'une vidéo silencieuse est acceptée au dépôt')
muter('fabrication', 'FA-4', FAB,
  'const licence = normaliserLicence(m.licence)',
  "const licence = normaliserLicence(m.licence) || 'cc0'",
  'une licence inconnue est acceptée comme du CC0')
muter('gabarits', 'GA-2', 'public/contenu/gabarits/L2.json',
  '"licence_commerciale": true',
  '"licence_commerciale": false',
  'un gabarit sans licence commerciale')
// La veille, TikTok, les coûts.
muter('veille', 'VE-3', 'scripts/contenu/veille.mjs',
  'if (!peutIdentifier(texte, opts)) return { ok: true }',
  'if (!peutIdentifier(texte, opts) || /:cloud$/.test(m)) return { ok: true }',
  'un texte pouvant identifier un prospect part vers un modèle :cloud')
muter('tiktok', 'TT-3', TIK,
  "import { cleAccord, versionAvecMedia } from '../../lib/contenu/accord.ts'",
  "import { cleAccord, versionAvecMedia } from '../../lib/contenu/accord.ts'\nexport const LIRE_STUDIO = 'https://www.tiktok.com/tiktokstudio/analytics'",
  'TikTok Studio lu par le script (une adresse de TikTok Studio dans le code)')
muter('tiktok', 'TT-2', TIK,
  'const a = accordValide(ctx.decision, video.id, versionVideo(video), maintenant)',
  'const a = { ok: true }',
  'le chemin TikTok n’exige plus l’accord individuel (exigé tant que D-0410-9 reste ouvert pour TikTok)')
muter('tiktok', 'TT-2', LIGNES,
  'if (!Number.isFinite(e) || e <= maintenantMs) return { ok: false, motif: "l\'échéance de la décision est passée ou illisible" }',
  'if (!Number.isFinite(e)) return { ok: false, motif: "l\'échéance de la décision est illisible" }',
  'une décision dont l’échéance est passée est acceptée (accordValide, voie TikTok)')
muter('couts', 'CO-1', 'lib/contenu/couts.ts',
  'const montant = estNombre(brut?.montant) ? brut.montant : null',
  'const montant = estNombre(brut?.montant) ? brut.montant : 0',
  'un montant inconnu devient zéro (une dépense inconnue paraît gratuite)')

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const court = (t, n = 240) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const eol = (texte, s) => (texte.includes('\r\n') ? s.replace(/\r?\n/g, '\r\n') : s)
const o = (() => {
  const r = { relais: null, racine: null, partie: null, seul: null, ancres: false, garder: false, budget: 19 }
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { console.error(`✗ argument inattendu : ${a}`); process.exit(2) }
    const [, k, v] = m
    if (k === 'ancres' || k === 'garder') r[k] = true
    else if (k === 'budget' && /^\d+$/.test(v ?? '')) r.budget = Number(v)
    else if (['relais', 'racine', 'partie', 'seul'].includes(k) && v) r[k] = v
    else { console.error(`✗ option inconnue ou sans valeur : --${k}`); process.exit(2) }
  }
  return r
})()

// ═══ Le relais ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RE_LIGNE_JUGE = /^(✅|❌|➖) ([A-Z0-9]{1,5}-[A-Z0-9-]+)(?: — (.*))?$/
function relais() {
  if (o.relais !== 'contenu') { console.log(`${SELF} : appel refusé — --relais=contenu attendu`); return 2 }
  if (!o.partie || !/^[a-z-]+$/.test(o.partie)) { console.log(`${JUGE.nom} : appel refusé — --partie=<une partie> attendue`); return 2 }
  if (!o.racine || !existe(o.racine)) { console.log(`${JUGE.nom} : appel refusé — --racine=<dossier> attendu`); return 2 }
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  const r = spawnSync(process.execPath, [path.join(RACINE, JUGE.script), `--partie=${o.partie}`, `--racine=${o.racine}`], { cwd: RACINE, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 10 * 60_000 })
  const sortie = sansAnsi(`${r.stdout ?? ''}${r.stderr ?? ''}`)
  const vus = new Map()
  const autres = []
  for (const l of sortie.split(/\r?\n/)) {
    const m = RE_LIGNE_JUGE.exec(l)
    if (!m) { if (l.trim() && !/^contenu-qa(?: --partie=\S+)? : (?:PASS|FAIL|SAUTE)\s*$/.test(l) && !/^\s+at .*:\d+:\d+/.test(l)) autres.push(l); continue }
    const [, signe, id, reste = ''] = m
    const etat = signe === '✅' ? 'PASS' : signe === '❌' ? 'FAIL' : 'SAUTE'
    if (!vus.has(id)) vus.set(id, { etat, detail: reste })
  }
  for (const l of autres.slice(0, 6)) console.log(`# ${court(l, 200)}`)
  for (const [id, v] of vus) console.log(`${v.etat} ${id} — ${v.detail || (v.etat === 'PASS' ? 'conforme' : 'en échec')}`)
  const rouges = [...vus].filter(([, v]) => v.etat === 'FAIL').map(([id]) => id)
  console.log(`${JUGE.nom} --partie=${o.partie} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : r.status === 0 ? 'PASS' : 'FAIL'}`)
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
  for (const d of ['lib', 'scripts/contenu', 'docs/marketing', 'public/contenu']) if (existe(path.join(RACINE, d))) fs.cpSync(path.join(RACINE, d), path.join(COPIE, d), { recursive: true, filter: filtre })
  fs.mkdirSync(path.join(COPIE, 'supabase', 'migrations'), { recursive: true })
  for (const f of fs.readdirSync(path.join(RACINE, 'supabase', 'migrations'))) if (/contenu/i.test(f) && f.endsWith('.sql')) fs.copyFileSync(path.join(RACINE, 'supabase', 'migrations', f), path.join(COPIE, 'supabase', 'migrations', f))
  for (const f of ['package.json', 'tsconfig.json']) if (existe(path.join(RACINE, f))) fs.copyFileSync(path.join(RACINE, f), path.join(COPIE, f))
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
}

// ═══ Lancer ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function lancer(partie, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CE_SCRIPT, '--relais=contenu', `--partie=${partie}`, `--racine=${COPIE}`], { cwd: RACINE, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true })
    let sortie = '', expire = false
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) { flux.setEncoding('utf8'); flux.on('data', (d) => { if (sortie.length < 4_000_000) sortie += d }) }
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), duree_s: (Date.now() - t0) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, duree_s: (Date.now() - t0) / 1000, expire }) })
  })
}
const commandeDe = (m) => `node ${SELF} --relais=contenu --partie=${m.partie} --racine={racine}`
const RE_BILAN = /^[\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)* : (?:PASS|FAIL)(?: — .*)?$/
function lignesDe(sortie) {
  const par = new Map()
  for (const l of sortie.split(/\r?\n/)) { const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l); if (m && !par.has(m[2])) par.set(m[2], { signe: m[1], ligne: l, detail: m[3] }) }
  const bilan = sortie.split(/\r?\n/).filter((l) => RE_BILAN.test(l)).at(-1) ?? null
  return { par, bilan }
}
const RE_INFRA = /préalable|non jugé|non évalué|interrompu|appel refusé|injoignable|import du module|erreur d'import|Cannot find|ERR_MODULE/i
function verdict(sortie, critere) {
  const { par, bilan } = lignesDe(sortie)
  const l = par.get(critere)
  if (!l) return { ok: false, raison: `aucune ligne « ${critere} » dans la sortie` }
  if (l.signe !== 'FAIL') return { ok: false, raison: `${critere} rapporté ${l.signe} : « ${court(l.ligne, 140)} »` }
  if (RE_INFRA.test(l.detail)) return { ok: false, raison: `${critere} en échec pour une raison d'infrastructure, pas pour la faute : « ${court(l.detail, 160)} »` }
  if (!bilan || !/ : FAIL — /.test(bilan) || !bilan.split(' : FAIL — ')[1].split(/,\s*/).includes(critere)) return { ok: false, raison: `le bilan ne nomme pas ${critere} : « ${court(bilan ?? 'aucun bilan', 100)} »` }
  return { ok: true, ligne: l.ligne }
}
const rougesDe = (sortie) => [...lignesDe(sortie).par].filter(([, v]) => v.signe === 'FAIL').map(([id]) => id)

async function principal() {
  const retenues = o.seul ? MUTATIONS.filter((m) => [m.partie, m.critere, m.nom, m.fichier].some((y) => y.includes(o.seul))) : MUTATIONS
  if (!retenues.length) { console.error(`aucune mutation ne correspond à --seul=${o.seul}`); process.exitCode = 2; return }
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.mkdirSync(JOURNAUX, { recursive: true })
  const debut = Date.now(), fin = debut + o.budget * 60_000
  const defauts = [], lignes = [], rapport = [], temoins = [], lacunes = []
  try {
    copier()
    const originaux = new Map(), jouables = []
    for (const m of retenues) {
      const f = path.join(COPIE, m.fichier)
      if (!existe(f)) { defauts.push(`${m.critere} ${m.nom} : fichier absent de la copie (${m.fichier}) ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ${m.fichier} absent`); continue }
      if (!originaux.has(f)) originaux.set(f, lire(f))
      const n = originaux.get(f).split(eol(originaux.get(f), m.avant)).length - 1
      if (n !== 1) { defauts.push(`${m.critere} ${m.nom} : texte « avant » présent ${n} fois dans ${m.fichier} (une seule attendue) ; mutation non jouée`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; ancre présente ${n} fois dans ${m.fichier}`); continue }
      jouables.push(m)
    }
    if (o.ancres) {
      for (const l of lignes) console.log(l)
      console.log(`${jouables.length}/${retenues.length} ancres présentes une fois`)
      process.exitCode = defauts.length ? 1 : 0
      return
    }
    const temoinsParPartie = new Map()
    let n = 0
    for (const m of jouables) {
      if (Date.now() + 60_000 > fin) { defauts.push(`${m.critere} ${m.nom} : non jouée, le budget de ${o.budget} min est épuisé`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; budget épuisé`); continue }
      if (!temoinsParPartie.has(m.partie)) {
        const r = await lancer(m.partie, Math.max(60_000, Math.min(fin - Date.now(), 8 * 60_000)))
        ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-temoin-${m.partie}.log`), `$ ${commandeDe(m)}\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
        const c = { r, rouges: rougesDe(r.sortie) }
        temoinsParPartie.set(m.partie, c)
        const etat = r.code === 0 ? 'vert' : `rouge (code ${r.code}${r.expire ? ', délai dépassé' : ''} ; ${c.rouges.join(', ') || 'aucune ligne en échec'})`
        temoins.push(`${m.partie} : témoin ${etat} en ${r.duree_s.toFixed(0)} s`)
        console.log(`TÉMOIN ${m.partie} : ${etat}`)
        if (r.code !== 0) defauts.push(`TÉMOIN ${m.partie} rouge : code ${r.code}${r.expire ? ' (délai dépassé)' : ''} ; critères en échec : ${c.rouges.join(', ') || 'aucun nommé'}`)
      }
      const c = temoinsParPartie.get(m.partie)
      if (c.r.expire || c.r.code === 124) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin hors délai`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin n'a pas fini`); continue }
      if (c.rouges.includes(m.critere)) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; le témoin échoue déjà sur ${m.critere}`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin est déjà rouge sur ${m.critere}`); continue }
      if (c.r.code !== 0 && !c.rouges.length) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin en code ${c.r.code} sans critère nommé`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin sort en code ${c.r.code} sans critère en échec`); continue }
      const f = path.join(COPIE, m.fichier), original = originaux.get(f)
      fs.writeFileSync(f, original.replace(eol(original, m.avant), () => eol(original, m.apres)))
      let r
      try { r = await lancer(m.partie, Math.max(60_000, Math.min(fin - Date.now() + 60_000, 8 * 60_000))) }
      finally { fs.writeFileSync(f, original) }
      if (sha(lire(f)) !== sha(original)) throw new Error(`${m.fichier} n'a pas été rétabli`)
      ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-${m.critere}-${m.partie}.log`), `$ ${commandeDe(m)}\n# ${m.fichier} : « ${court(m.avant, 120)} » → « ${court(m.apres, 120)} »\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
      const v = verdict(r.sortie, m.critere)
      const ok = r.code !== 0 && !r.expire && v.ok
      const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${ok ? v.ligne : `${r.expire ? 'délai dépassé' : `code ${r.code}`} : ${v.raison ?? 'aucun critère nommé en échec'}`}`
      lignes.push(ligne); console.log(ligne)
      if (!ok) {
        defauts.push(ligne)
        if (r.code === 0) lacunes.push(`${m.critere} : « ${m.nom} » n'est pas attrapée par contenu-qa --partie=${m.partie} (code 0) : lacune à signaler à 026-204`)
      } else rapport.push({ juge: JUGE.script, commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: Number(r.duree_s.toFixed(1)) })
    }
    ecrire(path.join(PREUVES, 'mutations.md'), `# Mutations du juge du domaine réseaux (026-219, C16)\n\nDécision « tout est automatique » (D-0410-1) : les mutations visent les gardes automatiques qui remplacent l'accord individuel ; contenu-ecran-qa.mjs n'existe pas et n'est pas couvert.\n\n${lacunes.length ? `## LACUNES à signaler à 026-204 (mutation non attrapée)\n${lacunes.map((d) => `- ${d}`).join('\n')}\n\n` : ''}${defauts.length ? `## ÉCHECS (${defauts.length})\n${defauts.map((d) => `- ${d}`).join('\n')}\n\n` : ''}## Témoins (copie intacte)\n${temoins.map((t) => `- ${t}`).join('\n') || '- aucun'}\n\n## Mutations\n${lignes.map((l) => `- ${l}`).join('\n')}\n\nBilan : ${rapport.length}/${retenues.length} mutations prises sur leur critère nommé, en ${((Date.now() - debut) / 60_000).toFixed(1)} min (budget ${o.budget} min).\n`)
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    console.log(`026-219 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises`)
    process.exitCode = defauts.length ? 1 : o.seul ? 3 : 0
  } finally {
    if (!o.garder || o.ancres) { try { retirer(COPIE) } catch (e) { console.error(`copie non retirée : ${e.message}`) } }
  }
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
