#!/usr/bin/env node
// scripts/juges-026-station-ecran-mutations.mjs — la contre-vérification du juge d'écran de la station (fiche 026-132).
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script prend le juge d'écran
// (scripts/pilotage-ecran-qa.mjs : station, vues, salles, fil, gestes, experience) et lui fait lire des COPIES :
//   · une copie intacte par partie, juge COMPLET : code 0 exigé, tous les critères de la partie au vert (le témoin) ;
//   · puis, pour chaque mutation, la même copie avec UN remplacement de texte exact : code ≠ 0 exigé, avec une ligne en
//     échec qui porte le critère attendu (« FAIL <critère> — … ») et le bilan qui le nomme.
// Il ne corrige JAMAIS le juge, un jeu d'essai ni le dépôt en place : seule la copie sous .orchestre/travail/026-132/ est
// écrite (jonction node_modules retirée par fs.unlinkSync avant toute suppression), chaque texte muté est rétabli après son
// passage et son empreinte relue. Si une mutation passe, elle est écrite en tête du rapport et le script sort en code 1.
//
// Le juge d'écran écrit « ✅ ID … » / « ❌ ID … » ; le méta-juge (juges-026-mutations-preuve.mjs) lit « PASS|FAIL ID — … »
// et un bilan « <juge> : FAIL — ids ». Le mode --relais de CE script lance le juge sur la copie et recopie ses lignes dans
// cette forme, sans rien changer au verdict (✅ → PASS, ❌ → FAIL, une ligne « (complément) » est fondue dans celle de son
// critère, le code de sortie est celui du juge). La commande de chaque mutation est donc :
//   node scripts/juges-026-station-ecran-mutations.mjs --relais --partie=<p> [--scenario=<motif>] [--criteres=A,B] --racine={racine}
// --scenario=<motif> ne joue que les scénarios du juge dont le nom contient le motif (PILOTAGE_ECRAN_SCENARIOS, prévu par le
// juge pour la mise au point) ; « - » n'en joue aucun (les critères statiques seuls) ; --criteres limite le verdict à ceux
// que ces scénarios exercent. Sans --criteres, le relais rend le verdict du juge COMPLET (c'est le témoin de chaque partie).
//
// Usage :
//   node scripts/juges-026-station-ecran-mutations.mjs                  tout : témoins, mutations, rapports ; code 0 si tout est pris
//   node scripts/juges-026-station-ecran-mutations.mjs --seul=<motif>   une partie, un critère ou un nom (mise au point : code 3 si tout est pris)
//   node scripts/juges-026-station-ecran-mutations.mjs --ancres         vérifie seulement que chaque « avant » est présent une fois (aucun juge lancé)
//   node scripts/juges-026-station-ecran-mutations.mjs --source=<dossier>   copie depuis ce dossier au lieu du dépôt (mise au point)
//   --sans-temoin (avec --seul) saute le témoin complet : mise au point, jamais le code 0 ;
//   --tranches-intactes rejoue chaque tranche sur la copie intacte avant de la muter (un passage de plus par commande)
// Écrit sous .orchestre/travail/026-132/ et .orchestre/preuves/026-132/ (mutations.md, mutations.json). Aucun appel réseau,
// aucune écriture en production : le juge sert la copie par son banc sur 127.0.0.1, sans .env.local.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-132'
const JUGE = 'scripts/pilotage-ecran-qa.mjs'
const NOM_JUGE = 'pilotage-ecran-qa'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const BUDGET_MS = 19 * 60_000 // le méta-juge laisse 20 min au script : une minute de marge pour écrire les rapports
const DELAI_PASSAGE_MS = 9 * 60_000
const AUCUN = '-'
const MOTIF_AUCUN = '__aucun_scenario__' // aucun nom de scénario ne contient ce texte

// Les critères de chaque partie, tels que le juge les écrit (PARTIES de scripts/pilotage-ecran-qa.mjs).
const PARTIES = {
  station: ['ST-1', 'ST-2', 'ST-3', 'ST-4', 'ST-5', 'ST-6', 'ST-7', 'ST-8', 'ST-9', 'ST-10', 'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15', 'ST-16', 'ST-17', 'ST-18', 'ST-19'],
  vues: ['VU-1', 'VU-2', 'VU-3', 'VU-4', 'VU-5', 'VU-6', 'VU-7', 'VU-8', 'VU-9'],
  salles: ['SA-1', 'SA-2', 'SA-3', 'SA-4', 'SA-5', 'SA-6', 'SA-19', 'SA-7', 'SA-8', 'SA-9', 'SA-10', 'SA-11', 'SA-12', 'SA-13', 'SA-15', 'SA-16', 'SA-17', 'SA-18', 'SA-20', 'SA-14'],
  fil: ['FL-1', 'FL-2', 'FL-3', 'FL-4', 'FL-5', 'FL-6', 'FL-7', 'FL-8', 'FL-9', 'FL-10', 'FL-11', 'FL-13', 'FL-14', 'FL-12'],
  gestes: ['EG-1', 'EG-2', 'EG-3', 'EG-4', 'EG-5', 'EG-6', 'EG-7', 'EG-8', 'EG-9', 'EG-15', 'EG-10', 'EG-11', 'EG-13', 'EG-14', 'EG-12'],
  experience: ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9'],
}
const ORDRE = ['station', 'vues', 'salles', 'fil', 'gestes', 'experience']

// ── Les mutations : UN remplacement de texte exact chacune ──────────────────────────────────────────────────────────────
// { partie, critere, fichier, avant, apres, nom, scenario, criteres }
//   scenario : motif des scénarios à jouer (AUCUN = critères statiques seuls) ; criteres : ceux dont le verdict compte.
const ST = 'app/controle/station'
const MUTATIONS = []
const muter = (partie, critere, fichier, avant, apres, nom, scenario, criteres = [critere]) => MUTATIONS.push({ partie, critere, fichier, avant, apres, nom, scenario, criteres })

// Le scénario « bureau » du juge exerce ST-4, ST-16 et ST-18 d'un seul passage : ces trois mutations partagent la même
// commande (donc le même passage sur la copie intacte) et chacune ne compte que SA ligne FAIL.
const BUREAU = ['ST-4', 'ST-16', 'ST-18']
// station — la barre, les feuilles de style, le cadre de la carte, les réglages (ST réécrits, décision Claw3D du 25/09)
muter('station', 'ST-4', `${ST}/Barre.tsx`,
  'else out.push(mesure(cle, libelle, lecture(), euros))',
  'else out.push(mesure(cle, libelle, lecture(), (n: number) => String(n)))',
  'les trois cases d’argent de Barre.tsx écrites sans euros(', 'bureau', BUREAU)
muter('station', 'ST-11', 'app/globals.css',
  'textarea{resize:vertical}',
  'textarea{resize:vertical;border-color:#6C8CFF}',
  'une couleur #6C8CFF ajoutée dans app/globals.css', AUCUN)
muter('station', 'ST-16', `${ST}/station.css`,
  '.mc, .mc *, .mc *::before, .mc *::after { box-sizing: border-box; }',
  '@keyframes mc-derive { from { opacity: 1; } to { opacity: 0.9; } }\n.mc { animation: mc-derive 4s linear infinite; }\n.mc, .mc *, .mc *::before, .mc *::after { box-sizing: border-box; }',
  'une animation infinie posée sur .mc dans station.css', 'bureau', BUREAU)
muter('station', 'ST-18', `${ST}/Carte.tsx`,
  '<ul className="mc-salles" data-liste-salles aria-label="Les salles">',
  '<ul className="mc-salles" aria-label="Les salles">',
  'le cadre d’attente de Carte.tsx perd sa liste [data-liste-salles]', 'bureau', BUREAU)
muter('station', 'ST-14', `${ST}/Station.tsx`,
  "const r = await apiDirection<ReglagesServis>('/api/controle/station/reglages')",
  'const r = { ok: false, data: null } as { ok: boolean; data: ReglagesServis | null }',
  'Station.tsx ne lit plus /api/controle/station/reglages au chargement', 'rythme')
muter('station', 'ST-3', `${ST}/Station.tsx`,
  "const miseEnPage: 'colonnes' | 'flottante' = r?.mise_en_page === 'flottante' ? 'flottante' : 'colonnes'",
  "const miseEnPage: 'colonnes' | 'flottante' = 'colonnes'",
  'data-mise-en-page ne suit plus les réglages (colonnes gardées en « flottante »)', 'flottante')
muter('station', 'ST-11', `${ST}/Habillage.tsx`,
  '  return null',
  "  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--mc-neon-1', 'magenta')\n  return null",
  'une surcharge de couleur posée sur :root au lieu du nœud .mc', 'couleurs')
// vues (026-113)
muter('vues', 'VU-4', `${ST}/vues/Aide.tsx`,
  '<span className="mc-origine-source">{c.source}</span>',
  '<span className="mc-origine-source">{\'registre_des_compteurs\'}</span>',
  'l’Aide recopie un gabarit de sources au lieu de la source servie de chaque compteur', 'aide')
muter('vues', 'VU-3', `${ST}/vues/Succes.tsx`,
  '{tousSucces.map((s) => {',
  '{tousSucces.filter((s) => s.debloque).map((s) => {',
  'la vue Succès cache les succès à venir au lieu de les griser', 'succ')
// salles (026-120)
muter('salles', 'SA-8', `${ST}/salles/Envois.tsx`,
  '<Tuile libelle="REJETS" attribut="rejets">{vue.rejets}</Tuile>',
  '<Tuile libelle="REJETS" attribut="rejets">{vue.rejets}</Tuile><button type="button">Envoyer</button>',
  'un bouton « Envoyer » ajouté à la Salle des envois', 'envois')
muter('salles', 'SA-15', `${ST}/salles/Standard.tsx`,
  'vue.parClasse.map(',
  '([] as Classe[]).map(',
  'le Standard n’affiche plus les pastilles par classe', 'standard')
// fil (026-123)
muter('fil', 'FL-5', `${ST}/journal/Transmettre.tsx`,
  "setTexte('')",
  "setTexte(''); { const b = document.createElement('div'); b.setAttribute('data-bulle-fil', '999999'); b.textContent = `BENJ ▸ ${rogne}`; document.querySelector('[data-transmettre]')?.appendChild(b) }",
  'Transmettre.tsx ajoute la bulle de la consigne avant que le fil la serve', 'transmettre')
// gestes (026-117)
muter('gestes', 'EG-4', `${ST}/Gestes.tsx`,
  'portee: c.portee,',
  'portee: null,',
  'une décision à enjeu poste sans ouvrir la boîte de reconfirmation', 'cisions')
muter('gestes', 'EG-9', `${ST}/Gestes.tsx`,
  "{role === 'direction' ? (",
  "{role !== 'aucun-role' ? (",
  'les boutons des décisions sont montrés au rôle lecture', 'lecture')
muter('gestes', 'EG-12', `${ST}/Gestes.tsx`,
  '<p className="mc-petit">{a.lignes[0]}<br />{a.lignes[1]}</p>',
  '<p className="mc-petit">{a.lignes[0]}<br />{a.lignes[1]}</p><button type="button">Copier</button>',
  'un bouton « Copier » ajouté à la feuille des appels', 'appels')
muter('gestes', 'EG-13', `${ST}/Gestes.tsx`,
  "corps, portee: 'securite', action } })",
  'corps, portee: null, action } })',
  'GestesEnvoi poste « ouvrir_envoi_froid » sans ouvrir la boîte securite', 'envoi')
// experience (026-125)
// L'ancre est la première ligne du fichier : le cadre d'attente d'aujourd'hui sera remplacé par 026-125, « 'use client' » restera.
muter('experience', 'EX-1', `${ST}/salles/Experience.tsx`,
  "'use client'",
  "'use client'\n\nexport const BOUTON_LANCER = <button type=\"button\">Lancer</button>",
  'un bouton « Lancer » ajouté à salles/Experience.tsx', AUCUN)

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const versSlash = (p) => String(p).split(path.sep).join('/')
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const shaFichier = (p) => { try { return sha(fs.readFileSync(p)) } catch { return 'absent' } }
const court = (t, n = 240) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const sous = (enfant, parent) => { const r = path.relative(parent, enfant); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }
const compter = (texte, motif) => (motif === '' ? 0 : texte.split(motif).length - 1)
const dateParis = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'medium' }).format(new Date())

const o = (() => {
  const r = { relais: false, partie: null, scenario: null, criteres: null, racine: null, seul: null, ancres: false, source: null, sansTemoin: false, tranchesIntactes: false }
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a)
    if (!m) { console.error(`✗ argument inattendu : ${a}`); process.exit(2) }
    const [, k, v] = m
    if (k === 'relais' || k === 'ancres') r[k] = true
    else if (k === 'sans-temoin') r.sansTemoin = true
    else if (k === 'tranches-intactes') r.tranchesIntactes = true
    else if (['partie', 'scenario', 'criteres', 'racine', 'seul', 'source'].includes(k) && v) r[k] = v
    else { console.error(`✗ option inconnue ou sans valeur : --${k}`); process.exit(2) }
  }
  return r
})()

// ═══ Le relais : le juge d'écran, vu du méta-juge ═══════════════════════════════════════════════════════════════════════════
const RE_LIGNE_JUGE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)(?: (.*))?$/
const RE_BILAN_JUGE = /^pilotage-ecran-qa --partie=\S+ : (?:PASS|FAIL)(?: — .*)?$/
function relais() {
  const partie = o.partie
  if (!PARTIES[partie]) { console.log(`${NOM_JUGE} : appel refusé — --partie=<${ORDRE.join('|')}> attendu`); return 2 }
  if (!o.racine || !existe(o.racine)) { console.log(`${NOM_JUGE} : appel refusé — --racine=<dossier> attendu`); return 2 }
  const choisis = o.criteres ? o.criteres.split(',').map((x) => x.trim()).filter(Boolean) : null
  for (const c of choisis ?? []) if (!PARTIES[partie].includes(c)) { console.log(`${NOM_JUGE} : appel refusé — ${c} n'est pas un critère de la partie ${partie}`); return 2 }
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  delete env.PILOTAGE_ECRAN_SCENARIOS
  if (o.scenario) env.PILOTAGE_ECRAN_SCENARIOS = o.scenario === AUCUN ? MOTIF_AUCUN : o.scenario
  const r = spawnSync(process.execPath, [path.join(RACINE, JUGE), `--partie=${partie}`, `--racine=${o.racine}`], { cwd: RACINE, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  const sortie = sansAnsi(`${r.stdout ?? ''}${r.stderr ?? ''}`)
  const verdicts = new Map() // id → { ok, detail }, dans l'ordre où le juge les écrit
  const autres = []
  for (const l of sortie.split(/\r?\n/)) {
    const m = RE_LIGNE_JUGE.exec(l)
    if (!m) { if (l.trim() && !RE_BILAN_JUGE.test(l)) autres.push(l); continue }
    const [, signe, id, reste = ''] = m
    const detail = reste.replace(/ \(complément\)$/, '').trim()
    const ok = signe === '✅'
    if (verdicts.has(id)) { const v = verdicts.get(id); v.ok = v.ok && ok; v.detail += ` ; ${detail}` } else verdicts.set(id, { ok, detail })
  }
  for (const l of autres.slice(0, 6)) console.log(l)
  const attendus = choisis ?? PARTIES[partie]
  const rouges = []
  for (const id of attendus) {
    const v = verdicts.get(id)
    if (!v) { console.log(`FAIL ${id} — absent de la sortie du juge (code ${r.status})`); rouges.push(id); continue }
    console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.detail || (v.ok ? 'conforme' : 'en échec')}`)
    if (!v.ok) rouges.push(id)
  }
  if (choisis) for (const [id] of verdicts) if (!choisis.includes(id)) console.log(`SAUTE ${id} — hors tranche`)
  console.log(`# code du juge : ${r.status}${r.error ? ` (${court(r.error.message, 80)})` : ''}`)
  console.log(`${NOM_JUGE} --partie=${partie} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'}`)
  // Le verdict d'un témoin complet est celui du juge ; celui d'une tranche est celui de ses critères, le juge ayant bien parlé.
  if (rouges.length) return 1
  if (!choisis && r.status !== 0) return r.status || 1
  return 0
}

// ═══ La copie du dépôt, sous .orchestre/travail/026-132/ ═════════════════════════════════════════════════════════════════
const DOSSIERS_COPIE = ['app', 'lib', 'components', 'public']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
function retirerJonctions(dir) {
  const restent = []
  const parcourir = (d) => {
    let noms
    try { noms = fs.readdirSync(d) } catch { return }
    for (const n of noms) {
      const p = path.join(d, n)
      let st
      try { st = fs.lstatSync(p) } catch { continue }
      if (st.isSymbolicLink()) {
        try { fs.unlinkSync(p) } catch { /* vérifié ci-dessous */ }
        let encore = true
        try { fs.lstatSync(p) } catch { encore = false }
        if (encore) restent.push(p)
      } else if (st.isDirectory()) parcourir(p)
    }
  }
  if (existe(dir)) parcourir(dir)
  return restent
}
function supprimerCopie(dir) {
  if (!existe(dir)) return
  if (!sous(dir, TRAVAIL)) throw new Error(`suppression refusée hors de ${versSlash(TRAVAIL)} : ${versSlash(dir)}`)
  const restent = retirerJonctions(dir)
  if (restent.length) throw new Error(`jonction non retirée : ${restent.map(versSlash).join(', ')}`)
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 })
}
function copierDepot() {
  const source = o.source ? path.resolve(o.source) : RACINE
  supprimerCopie(COPIE)
  fs.mkdirSync(COPIE, { recursive: true })
  const ignore = (p) => { const n = path.basename(p); return n === 'node_modules' || n === '.next' || n === '.git' || /^\.env(\..*)?$/i.test(n) }
  let n = 0
  for (const d of DOSSIERS_COPIE) {
    const s = path.join(source, d)
    if (!existe(s)) continue
    fs.cpSync(s, path.join(COPIE, d), { recursive: true, filter: (p) => !ignore(p) })
    n++
  }
  for (const f of FICHIERS_RACINE) if (existe(path.join(source, f))) fs.copyFileSync(path.join(source, f), path.join(COPIE, f))
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
  if (existe(path.join(COPIE, '.env.local'))) throw new Error('.env.local dans la copie')
  return n
}

// ═══ Lancer une commande sous délai, arbre tué par PID au besoin ═════════════════════════════════════════════════════════
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function executer(commande, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd: RACINE, shell: true, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const prendre = (d) => { if (sortie.length < 16 * 1024 * 1024) sortie += d }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}
const commandePartie = (partie, scenario, criteres) => [
  `node scripts/${path.basename(CE_SCRIPT)} --relais --partie=${partie}`,
  scenario ? ` --scenario=${scenario}` : '',
  criteres ? ` --criteres=${criteres.join(',')}` : '',
  ' --racine={racine}',
].join('')
const lancerSur = (commande, delaiMs) => executer(commande.replaceAll('{racine}', versSlash(COPIE)), delaiMs)

/** La ligne « FAIL <critère> — … » unique du critère, et le bilan qui le nomme : la même lecture que le méta-juge. */
function ligneEnEchec(sortie, critere) {
  const L = sortie.split(/\r?\n/)
  const siennes = L.map((l) => ({ l, m: /^(PASS|FAIL|SAUTE) (\S+)(?: — |$)/.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  if (siennes.length !== 1) return { ligne: null, defaut: siennes.length ? `${critere} rapporté ${siennes.length} fois` : `aucune ligne « FAIL ${critere} — … »` }
  if (siennes[0].m[1] !== 'FAIL' || !siennes[0].l.startsWith(`FAIL ${critere} — `)) return { ligne: null, defaut: `${critere} rapporté ${siennes[0].m[1]} : « ${court(siennes[0].l, 90)} »` }
  const b = L.map((l) => /^([\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (!b || b[2] !== 'FAIL' || !(b[3] || '').split(/,\s*/).map((x) => x.trim()).includes(critere)) return { ligne: null, defaut: `le bilan ne nomme pas ${critere}` }
  if (/^\s+at .*:\d+:\d+/m.test(sortie)) return { ligne: null, defaut: 'stack d’infrastructure dans la sortie (refus non métier)' }
  return { ligne: siennes[0].l, defaut: null }
}

// ═══ Les ancres seules ═══════════════════════════════════════════════════════════════════════════════════════════════════
function verifierAncres() {
  const source = o.source ? path.resolve(o.source) : RACINE
  let faux = 0
  for (const m of MUTATIONS) {
    const f = path.join(source, m.fichier)
    const n = existe(f) ? compter(lire(f), m.avant) : -1
    const ok = n === 1
    if (!ok) faux++
    console.log(`${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.partie} · ${m.fichier} : « ${court(m.avant, 70)} » ${n < 0 ? 'fichier absent' : `présent ${n} fois`}`)
  }
  return faux ? 1 : 0
}

// ═══ Le passage complet ═══════════════════════════════════════════════════════════════════════════════════════════════════
function empreintesJuge() {
  const out = new Map()
  // Les fichiers « .tmp.<pid> » sont les écritures en cours d'une autre session (écriture atomique) : ils ne sont pas un jeu d'essai.
  const parcourir = (d) => { for (const n of fs.readdirSync(d)) { if (/\.tmp\.\d+/.test(n)) continue; const p = path.join(d, n); let st; try { st = fs.statSync(p) } catch { continue } if (st.isDirectory()) parcourir(p); else out.set(versSlash(path.relative(RACINE, p)), shaFichier(p)) } }
  out.set(JUGE, shaFichier(path.join(RACINE, JUGE)))
  const jeux = path.join(RACINE, 'scripts', 'fixtures', '026-pilotage')
  if (existe(jeux)) parcourir(jeux)
  return out
}
function statutJuge() {
  const r = spawnSync('git', ['-C', RACINE, 'status', '--porcelain', '--untracked-files=all', '--', JUGE, 'scripts/fixtures/026-pilotage'], { encoding: 'utf8', windowsHide: true })
  return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean).filter((l) => !/\.tmp\.\d+/.test(l)).sort() : null
}

async function principal() {
  const debut = Date.now()
  const reste = () => BUDGET_MS - (Date.now() - debut)
  if (o.sansTemoin && !o.seul) { console.error('✗ --sans-temoin ne se combine qu’avec --seul=<motif> (mise au point : jamais un PASS)'); return 2 }
  const retenues = o.seul ? MUTATIONS.filter((m) => m.partie === o.seul || m.critere === o.seul || m.nom.includes(o.seul)) : MUTATIONS
  if (!retenues.length) { console.error(`✗ aucune mutation ne correspond à --seul=${o.seul}`); return 2 }
  const parties = ORDRE.filter((p) => retenues.some((m) => m.partie === p))
  console.log(`── ${FICHE} · contre-vérification du juge d'écran de la station · ${retenues.length} mutation(s), ${parties.length} partie(s) · ${dateParis()}`)

  const avantEmp = empreintesJuge(), avantStatut = statutJuge()
  const sourcesRepo = new Map([...new Set(retenues.map((m) => m.fichier))].map((f) => [f, shaFichier(path.join(o.source ? path.resolve(o.source) : RACINE, f))]))
  const defauts = [] // ce qui fait échouer la fiche
  const passees = [] // mutations prises : { m, commande, extrait, duree, code }
  const manquees = [] // mutations non prises : { m, raison }
  const temoins = [] // { partie, commande, code, duree, derniere, ok, cause }
  const executees = []
  const t0Copie = Date.now()
  let copie = false
  try {
    const nbDossiers = copierDepot()
    copie = true
    console.log(`copie : ${nbDossiers} dossier(s) sous ${versSlash(path.relative(RACINE, COPIE))} en ${((Date.now() - t0Copie) / 1000).toFixed(0)} s`)
    for (const partie of parties) {
      // 1. Le témoin : le juge COMPLET sur la copie intacte, code 0 exigé.
      const commandeT = commandePartie(partie, null, null)
      if (o.sansTemoin) {
        // Mise au point seulement (avec --seul) : les mutations sont éprouvées sans le témoin complet ; le script ne sort jamais en 0.
        temoins.push({ partie, commande: commandeT, code: null, duree: 0, derniere: '', ok: null, cause: 'non joué (--sans-temoin)' })
        console.log(`---- témoin ${partie} non joué (--sans-temoin)`)
      } else {
      if (reste() < 60_000) { defauts.push(`${partie} : délai du script épuisé avant le témoin`); temoins.push({ partie, commande: commandeT, code: null, duree: 0, derniere: '', ok: false, cause: 'délai épuisé' }); continue }
      const t = await lancerSur(commandeT, Math.min(DELAI_PASSAGE_MS, reste() - 30_000))
      executees.push(`${commandeT.replaceAll('{racine}', '<copie>')}  → code ${t.code}, ${t.duree.toFixed(0)} s`)
      const lignes = t.sortie.split(/\r?\n/).filter(Boolean)
      const derniere = lignes.at(-1) ?? ''
      const rouges = lignes.filter((l) => l.startsWith('FAIL ')).map((l) => court(l, 220))
      const ok = t.code === 0 && !t.expire && new RegExp(`^${NOM_JUGE} --partie=${partie} : PASS$`).test(derniere)
      // Un témoin rouge dit POURQUOI : la première ligne FAIL, et à défaut les dernières lignes que le juge avait écrites.
      const queue = lignes.slice(-3).map((l) => court(l, 120)).join(' | ')
      temoins.push({ partie, commande: commandeT, code: t.code, duree: t.duree, derniere, ok, cause: ok ? '' : `${t.expire ? `délai dépassé (${Math.round(t.duree)} s)` : `code ${t.code}`}${rouges[0] ? ` — ${rouges[0]}` : queue ? ` — dernières lignes : ${queue}` : ' — aucune ligne du juge'}` })
      console.log(`${ok ? 'PASS' : 'FAIL'} témoin ${partie} — code ${t.code} en ${t.duree.toFixed(0)} s · ${court(derniere, 120)}`)
      if (!ok) {
        defauts.push(`témoin ${partie} rouge : la copie intacte ne passe pas (${temoins.at(-1).cause}) ; ses ${retenues.filter((m) => m.partie === partie).length} mutation(s) ne sont pas éprouvées`)
        for (const l of rouges.slice(0, 5)) console.log(`    ${l}`)
        for (const m of retenues.filter((x) => x.partie === partie)) manquees.push({ m, raison: 'témoin rouge : mutation non éprouvée' })
        continue
      }
      }
      // 2. Les mutations de la partie.
      const dejaVues = new Set()
      for (const m of retenues.filter((x) => x.partie === partie)) {
        const cible = path.join(COPIE, m.fichier)
        if (!sous(cible, COPIE)) { defauts.push(`${m.critere} : fichier hors de la copie : ${m.fichier}`); manquees.push({ m, raison: 'chemin refusé' }); continue }
        if (!existe(cible)) { manquees.push({ m, raison: `fichier absent de la copie : ${m.fichier}` }); defauts.push(`${m.critere} (${m.nom}) : fichier absent de la copie : ${m.fichier}`); continue }
        const original = fs.readFileSync(cible)
        const texte = original.toString('utf8')
        const n = compter(texte, m.avant)
        if (n !== 1) { manquees.push({ m, raison: `« avant » présent ${n} fois (une seule attendue)` }); defauts.push(`${m.critere} (${m.nom}) : « ${court(m.avant, 60)} » présent ${n} fois dans ${m.fichier}, une seule attendue`); continue }
        if (reste() < 45_000) { manquees.push({ m, raison: 'délai du script épuisé' }); defauts.push(`${m.critere} (${m.nom}) : délai du script épuisé`); continue }
        const commande = commandePartie(partie, m.scenario, m.criteres)
        const delai = Math.min(DELAI_PASSAGE_MS, reste() - 20_000)
        // La tranche sur la copie intacte : le même verdict doit être vert, sinon la faute ne s'attribue pas à la mutation. Le
        // témoin complet de la partie (tous ses critères au vert) l'implique déjà : la rejouer coûte un passage de plus par
        // commande, que le budget de 20 min ne permet pas (--tranches-intactes la rejoue, pour la mise au point).
        if (o.tranchesIntactes && !dejaVues.has(commande)) {
          dejaVues.add(commande)
          const i = await lancerSur(commande, delai)
          executees.push(`${commande.replaceAll('{racine}', '<copie>')}  → code ${i.code}, ${i.duree.toFixed(0)} s (copie intacte)`)
          if (i.code !== 0 || i.expire) {
            const cause = `tranche intacte en code ${i.code}${i.expire ? ' (délai)' : ''} : ${court(i.sortie.split(/\r?\n/).filter((l) => l.startsWith('FAIL ')).at(0) ?? i.sortie.split(/\r?\n/).filter(Boolean).at(-1) ?? '', 160)}`
            manquees.push({ m, raison: cause }); defauts.push(`${m.critere} (${m.nom}) : ${cause}`)
            console.log(`✗ ${m.critere} — ${cause}`)
            continue
          }
        }
        const apresTexte = texte.slice(0, texte.indexOf(m.avant)) + m.apres + texte.slice(texte.indexOf(m.avant) + m.avant.length)
        let r
        try {
          fs.writeFileSync(cible, apresTexte)
          r = await lancerSur(commande, delai)
        } finally {
          fs.writeFileSync(cible, original)
          if (sha(fs.readFileSync(cible)) !== sha(original)) throw new Error(`${m.fichier} non rétabli dans la copie`)
        }
        executees.push(`${commande.replaceAll('{racine}', '<copie>')}  → code ${r.code}, ${r.duree.toFixed(0)} s (mutée : ${m.nom})`)
        const lu = ligneEnEchec(r.sortie, m.critere)
        if (r.code !== 0 && !r.expire && lu.ligne) {
          passees.push({ m, commande, extrait: lu.ligne, duree: r.duree, code: r.code })
          console.log(`· ${m.critere} pris — ${m.nom} (${r.duree.toFixed(0)} s) : ${court(lu.ligne, 150)}`)
        } else {
          const raison = r.expire ? 'délai dépassé sur la copie mutée' : r.code === 0 ? 'copie mutée en code 0 : la mutation PASSE, le juge ne l’attrape pas' : `code ${r.code}, ${m.critere} non attrapé : ${lu.defaut}`
          manquees.push({ m, raison })
          defauts.push(`${m.critere} (${m.nom}) : ${raison}`)
          console.log(`✗ ${m.critere} — ${raison}`)
        }
      }
    }
  } finally {
    if (copie) { try { supprimerCopie(COPIE) } catch (e) { defauts.push(`copie non nettoyée : ${e.message}`) } }
  }

  // MU-3 : le juge et chaque jeu d'essai n'ont pas bougé, le dépôt non plus.
  const apresEmp = empreintesJuge(), apresStatut = statutJuge()
  for (const k of new Set([...avantEmp.keys(), ...apresEmp.keys()])) if (avantEmp.get(k) !== apresEmp.get(k)) defauts.push(`MU-3 : ${k} a changé pendant le passage`)
  if (avantStatut === null || apresStatut === null) defauts.push('MU-3 : git status illisible')
  else if (avantStatut.join('\n') !== apresStatut.join('\n')) defauts.push('MU-3 : git status --porcelain du juge et de ses jeux d’essai a changé pendant le passage')
  const sourcesBouges = [...sourcesRepo].filter(([f, h]) => shaFichier(path.join(o.source ? path.resolve(o.source) : RACINE, f)) !== h).map(([f]) => f)
  if (existe(COPIE)) defauts.push('MU-3 : la copie existe encore après le passage')

  // Les rapports.
  const parBilan = (p) => temoins.find((t) => t.partie === p)
  const md = []
  if (defauts.length) {
    md.push('# ÉCHECS — la fiche n’est PAS prouvée', '')
    for (const m of manquees.filter((x) => /PASSE/.test(x.raison))) md.push(`- **MUTATION NON ATTRAPÉE** ${m.m.critere} (${m.m.partie}) : ${m.m.nom} — ${m.raison}. Le juge n’est pas corrigé ici : 026-104 est à rouvrir par Claude Code.`)
    for (const d of defauts) md.push(`- ${d}`)
    md.push('')
  }
  md.push(`# 026-132 — contre-vérification du juge d'écran de la station`, '',
    `> Écrit par \`node scripts/${path.basename(CE_SCRIPT)}\` le ${dateParis()} (heure de Paris). Juge : \`${JUGE}\`, un banc par passage (racine = la copie, aucun serveur réel, aucun compte, aucun \`.env.local\`). Les mutations sont posées sur UNE copie sous \`.orchestre/travail/026-132/\`, rétablie après chaque passage ; le dépôt n’est jamais écrit.`, '',
    `Mutations prises : ${passees.length} sur ${retenues.length}. Témoins verts : ${temoins.filter((t) => t.ok).length} sur ${parties.length}.`, '',
    '## MU-1 — les témoins (le juge complet sur la copie intacte)', '',
    '| partie | code | durée | dernière ligne réelle | verdict |', '|---|---|---|---|---|',
    ...temoins.map((t) => `| ${t.partie} | ${t.code ?? '—'} | ${t.duree.toFixed(0)} s | ${t.derniere ? `\`${t.derniere.replace(/\|/g, '\\|')}\`` : '—'} | ${t.ok === null ? 'non joué' : t.ok ? 'PASS' : `ROUGE — ${t.cause.replace(/\|/g, '\\|')}`} |`), '',
    '## MU-2 — les mutations (une ligne par mutation)', '',
    '| partie | critère | ce qui est cassé | fichier | extrait réel du verdict | durée |', '|---|---|---|---|---|---|',
    ...retenues.map((m) => {
      const p = passees.find((x) => x.m === m)
      const q = manquees.find((x) => x.m === m)
      return `| ${m.partie} | ${m.critere} | ${m.nom.replace(/\|/g, '\\|')} | \`${m.fichier}\` | ${p ? `\`${court(p.extrait, 360).replace(/\|/g, '\\|')}\`` : `**NON PRISE** — ${(q?.raison ?? 'non éprouvée').replace(/\|/g, '\\|')}`} | ${p ? `${p.duree.toFixed(0)} s` : '—'} |`
    }), '',
    '## MU-3 — rien n’a bougé', '',
    `- Empreintes sha256 du juge et de ${avantEmp.size - 1} fichier(s) de \`scripts/fixtures/026-pilotage/\` : ${[...avantEmp.keys()].some((k) => avantEmp.get(k) !== apresEmp.get(k)) ? '**CHANGÉES**' : 'identiques avant et après'}.`,
    `- \`git status --porcelain\` du juge et de ses jeux d’essai : ${avantStatut !== null && apresStatut !== null && avantStatut.join('\n') === apresStatut.join('\n') ? `identique avant et après (${avantStatut.length} ligne(s))` : '**DIFFÉRENT**'}.`,
    `- Les ${sourcesRepo.size} fichier(s) visés par une mutation ont été lus dans le dépôt, jamais écrits (les mutations vivent dans la copie)${sourcesBouges.length ? ` ; ${sourcesBouges.length} ont été modifiés pendant le passage par une autre session (${sourcesBouges.join(', ')}) — ce script n’y a pas touché` : ' ; leur empreinte est la même avant et après'}.`,
    `- La copie sous \`.orchestre/travail/026-132/\` est supprimée (jonction node_modules retirée par fs.unlinkSync) : ${existe(COPIE) ? '**RESTE**' : 'supprimée'}.`, '',
    '## MU-4 — les commandes réellement exécutées', '',
    'Aucune option de lecture réelle du juge, aucune option de constat : le juge ne reçoit que `--partie=` et `--racine=<copie>` (donc son banc, jamais le serveur réel).', '',
    ...executees.map((c) => `- \`${c}\``), '',
    '## Les passages de la liste imposée', '',
    '`scripts/pilotage-ecran-qa.mjs` : ST-4, ST-11, ST-16, ST-18, VU-3, VU-4, SA-8, SA-15, FL-5, EG-4, EG-9, EG-12, EG-13, EX-1, plus ST-14 et ST-3 (réglages). ' +
      `Critères pris par au moins une mutation : ${[...new Set(passees.map((p) => p.m.critere))].join(', ') || 'aucun'}.`, '')
  // Un passage partiel (--seul, --source) n'écrit jamais les rapports officiels : le méta-juge ne lit que mutations.json.
  const suffixe = o.seul || o.source ? '-partiel' : ''
  ecrire(path.join(PREUVES, `mutations${suffixe}.md`), md.join('\n'))
  ecrire(path.join(PREUVES, `mutations${suffixe}.json`), JSON.stringify({ mutations: passees.map((p) => ({ juge: JUGE, commande: p.commande, fichier: p.m.fichier, avant: p.m.avant, apres: p.m.apres, critere: p.m.critere, extrait: p.extrait, duree_s: Number(p.duree.toFixed(1)) })) }, null, 2) + '\n')
  // L'extrait recopié se retrouve dans la sortie produite : relu ici avant de conclure.
  const rapportMd = lire(path.join(PREUVES, `mutations${suffixe}.md`))
  for (const p of passees) if (!rapportMd.includes(court(p.extrait, 360).replace(/\|/g, '\\|'))) defauts.push(`MU-2 : l’extrait de ${p.m.critere} n’est pas dans mutations.md`)

  console.log(`${FICHE} : ${defauts.length ? 'FAIL' : 'PASS'} — ${passees.length}/${retenues.length} mutations prises, ${temoins.filter((t) => t.ok).length}/${parties.length} témoins verts en ${((Date.now() - debut) / 60_000).toFixed(1)} min`)
  for (const d of defauts.slice(0, 25)) console.log(`  ✗ ${court(d, 300)}`)
  if (parBilan('station') === undefined && !o.seul) console.log('  ✗ aucun témoin station')
  return defauts.length ? 1 : o.seul ? 3 : 0
}

// ═══ Principal ════════════════════════════════════════════════════════════════════════════════════════════════════════════
try {
  if (o.relais) process.exitCode = relais()
  else if (o.ancres) process.exitCode = verifierAncres()
  else process.exitCode = await principal()
} catch (e) {
  console.error(`FAIL ${FICHE} — exception : ${e && e.stack ? e.stack : e}`)
  process.exitCode = 1
}
