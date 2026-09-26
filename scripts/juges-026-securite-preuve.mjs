#!/usr/bin/env node
// scripts/juges-026-securite-preuve.mjs — la preuve de la fiche 026-002 (juges de la sécurité), écrite par Claude Code.
//
//   node scripts/juges-026-securite-preuve.mjs            (le verifier de 026-002, sans option)
//   node scripts/juges-026-securite-preuve.mjs --sans-autotest   saute JP-6, qui est alors « non jugé » : le bilan ne peut
//                                                         être que FAIL (sert à prouver vite que JP-1 à JP-5 savent rougir)
//
// Elle lance elle-même, l'un après l'autre, les trois juges écrits par 026-002 sur l'arbre actuel, puis leurs autotests, et
// mesure, sans rien reprendre d'un exécutant :
//
//   JP-1  chaque juge (syntaxe vérifiée par node --check) sort en code ≠ 0 et ≠ 2, jusqu'à son bilan, sans trace de pile,
//         et sa PREMIÈRE ligne en échec porte l'identifiant attendu : MO-1, IQ-1, GG-1. Une sortie vide, une erreur de
//         syntaxe ou un plantage sont un échec de la preuve, pas un « échec attendu ».
//   JP-2  les critères de non-régression sont verts sur l'arbre actuel : MO-NR1 et GG-NR1 (instantane-quotidien-qa n'en a pas).
//   JP-3  aucun des trois juges (ni cette preuve) ne contient un secret littéral, selon les motifs de la fiche 026-002 point 5,
//         recopiés ici en attendant MOTIFS_SECRETS de 026-005 ; les motifs sont d'abord éprouvés sur de faux secrets
//         assemblés à l'exécution (chacun doit être reconnu) et sur des textes propres (aucun ne doit l'être).
//   JP-4  après tous les passages, git status --porcelain de presti ne diffère de l'état d'avant que sous
//         .orchestre/travail/ et .orchestre/preuves/026-002/ (les périmètres des autres fiches de en-cours/ et la tenue
//         de l'orchestre — digest, verdicts, contexte, registre, dossiers de fiches — sont écartés : d'autres sessions y
//         écrivent pendant ce temps) ; git -C ../orchestre status --porcelain ne diffère que par test/git-garde-qa.mjs.
//   JP-5  le bac à sable d'instantane-quotidien-qa est créé puis supprimé par le juge lui-même, sous
//         .orchestre/travail/instantane-qa/ ; son dépôt nu est un chemin local de ce bac, jamais une URL (et les juges
//         tournent ici avec GIT_ALLOW_PROTOCOL=file : aucun envoi git réseau n'est possible).
//   JP-6  chaque juge passe son --autotest : son témoin est vert, puis chaque défaut planté (un remplacement de texte, au format
//         des mutations de 026-001) est attrapé par son critère ; le témoin est restauré et nettoyé.
//
// Écrit .orchestre/preuves/026-002/echecs-attendus.md (une ligne par juge : critère en échec aujourd'hui, extrait réel de sa
// sortie, critères NR verts ; puis les contrôles JP) et les sorties complètes sous .orchestre/preuves/026-002/sorties/.
// Code 0 seulement si JP-1 à JP-6 sont verts.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const NOM = 'juges-026-securite-preuve'
const PRESTI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCHESTRE = path.resolve(PRESTI, '..', 'orchestre')
const PREUVES = path.join(PRESTI, '.orchestre', 'preuves', '026-002')
const SORTIES = path.join(PREUVES, 'sorties')
const JUGES = [
  { chemin: 'scripts/media-octets-qa.mjs', nom: 'media-octets-qa', attendu: 'MO-1', nr: ['MO-NR1'], delaiMin: 15, autotestMin: 20 },
  { chemin: 'scripts/instantane-quotidien-qa.mjs', nom: 'instantane-quotidien-qa', attendu: 'IQ-1', nr: [], delaiMin: 10, autotestMin: 15 },
  { chemin: '../orchestre/test/git-garde-qa.mjs', nom: 'git-garde-qa', attendu: 'GG-1', nr: ['GG-NR1'], delaiMin: 10, autotestMin: 15 },
]
const RE_ECHEC = /FAIL|ÉCHEC|ECHEC|[ée]chec|✗|✘|not ok|\bKO\b|ERREUR/i // celle du méta-juge de 026-001
const TRACE = /^\s+at\s.+:\d+:\d+\)?\s*$/m
const SANS_AUTOTEST = process.argv.includes('--sans-autotest')
if (process.argv.slice(2).some((a) => a !== '--sans-autotest')) { console.log(`${'juges-026-securite-preuve'} : appel refusé — seule option : --sans-autotest`); process.exit(2) }
const ENV_JUGES = { GIT_ALLOW_PROTOCOL: 'file', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', FORCE_COLOR: '0' }

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────────
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const versSlash = (p) => String(p).split(path.sep).join('/')
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function lancer(args, cwd, delaiMs) {
  return new Promise((resoudre) => {
    const debut = Date.now()
    const enfant = spawn(process.execPath, args, { cwd, windowsHide: true, env: { ...process.env, ...ENV_JUGES } })
    let sortie = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => {
      expire = true
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' })
      else enfant.kill('SIGKILL')
    }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : code, sortie, expire, duree: (Date.now() - debut) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire, duree: (Date.now() - debut) / 1000 }) })
  })
}
function statut(depot) {
  const r = spawnSync('git', ['--no-optional-locks', '-C', depot, 'status', '--porcelain'], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 })
  return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean) : null
}
const cheminStatut = (l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop()
const prefixe = (g) => String(g).replace(/\\/g, '/').split(/[*?{]/)[0]
function perimetresEnCours() {
  const d = path.join(PRESTI, '.orchestre', 'en-cours')
  const out = []
  if (!fs.existsSync(d)) return out
  for (const f of fs.readdirSync(d).filter((x) => /\.md$/.test(x) && !/\.(question|reponse)\.md$/.test(x) && x !== '026-002.md')) {
    const m = /^perimetre:\s*\[(.*)\]\s*$/m.exec(fs.readFileSync(path.join(d, f), 'utf8'))
    if (m) for (const p of m[1].split(',').map((x) => x.trim()).filter(Boolean)) if (!p.startsWith('../')) out.push(prefixe(p))
  }
  return out
}
// La tenue de l'orchestre : écrite par scripts/orchestre.mjs (prochaine, verifier, digest, contexte), jamais par un juge.
const TENUE = ['.orchestre/digest.md', '.orchestre/verdicts.jsonl', '.orchestre/contexte.md', '.orchestre/agents.jsonl', '.orchestre/file/', '.orchestre/en-cours/', '.orchestre/fait/', '.orchestre/refuse/']
function ecarteePresti(chemin, perimetres) {
  const c = chemin.replace(/\\/g, '/')
  if (c.startsWith('.orchestre/travail/') || c.startsWith('.orchestre/preuves/026-002/') || c === '.orchestre/preuves/026-002') return 'permis'
  if (TENUE.some((t) => c === t || c.startsWith(t) || (t.endsWith('/') && t.startsWith(c)))) return 'tenue'
  if (perimetres.some((p) => p && (c.startsWith(p) || p.startsWith(c)))) return 'autre fiche'
  return null
}

// ── JP-3 : les motifs de la fiche 026-002 point 5 (assemblés : cette preuve ne se reconnaît pas elle-même) ─────────────
const MOTIFS = [
  { nom: 'stripe', re: new RegExp('\\b(?:' + ['sk', 'live'].join('_') + '|' + ['rk', 'live'].join('_') + '|' + ['sk', 'test'].join('_') + ')_[A-Za-z0-9]{20,}') },
  { nom: 'stripe_webhook', re: new RegExp(['wh', 'sec_'].join('')) },
  { nom: 'anthropic', re: new RegExp(['sk', 'ant', ''].join('-')) },
  { nom: 'resend', re: new RegExp('\\b' + 're' + '_[A-Za-z0-9_]{20,}') },
  { nom: 'supabase_service', jwt: true, re: new RegExp('\\b' + 'ey' + 'J[A-Za-z0-9_-]{4,}\\.(' + 'ey' + 'J[A-Za-z0-9_-]{4,})\\.[A-Za-z0-9_-]*', 'g') },
  { nom: 'cle_privee', re: new RegExp('-----BEGIN [A-Z ]*' + 'PRIVATE' + ' KEY-----') },
  { nom: 'google', re: new RegExp('AI' + 'za[0-9A-Za-z_-]{35}') },
  { nom: 'github', re: new RegExp(['gh', 'p_'].join('') + '|' + ['github', 'pat', ''].join('_')) },
]
function motifsTrouves(texte) {
  const noms = []
  for (const m of MOTIFS) {
    if (m.jwt) {
      for (const x of String(texte).matchAll(m.re)) {
        let charge = ''
        try { charge = Buffer.from(x[1], 'base64url').toString('utf8') } catch { /* pas un JWT */ }
        if (/service_role/.test(charge)) { noms.push(m.nom); break }
      }
    } else if (m.re.test(texte)) noms.push(m.nom)
  }
  return noms
}
function eprouverMotifs() {
  const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const alea = (n, jeu = ALNUM) => Array.from(crypto.randomBytes(n), (b) => jeu[b % jeu.length]).join('')
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const jwt = (role) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ iss: 'supabase', role })}.${alea(43)}`
  const faux = [
    ['stripe', ['sk', 'live', alea(28)].join('_')], ['stripe', ['rk', 'live', alea(28)].join('_')], ['stripe', ['sk', 'test', alea(28)].join('_')],
    ['stripe_webhook', ['wh', 'sec_', alea(32)].join('')], ['anthropic', ['sk', 'ant', 'api03', alea(40)].join('-')], ['resend', ['re', alea(28)].join('_')],
    ['supabase_service', jwt(['service', 'role'].join('_'))], ['cle_privee', `-----BEGIN ${'PRIVATE'} KEY-----\n${alea(64)}\n-----END ${'PRIVATE'} KEY-----`],
    ['google', ['AI', 'za', alea(35)].join('')], ['github', ['gh', 'p_', alea(36)].join('')], ['github', ['github', 'pat', alea(22)].join('_')],
  ]
  const propres = ['Le devis est prêt : 300 € TTC.', `Une clé publique : ${jwt('anon')}`, `Trop court : ${['sk', 'live', 'abc'].join('_')} ${['re', 'abc'].join('_')}`]
  const rates = faux.filter(([nom, v]) => !motifsTrouves(v).includes(nom)).map(([nom]) => nom)
  const fauxPositifs = propres.filter((t) => motifsTrouves(t).length).map((t) => court(t, 30))
  return { total: faux.length, rates, propres: propres.length, fauxPositifs }
}

// ── le déroulé ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  fs.mkdirSync(SORTIES, { recursive: true })
  const lignes = []
  const dire = (l = '') => { console.log(l); lignes.push(l) }
  const res = {}
  const noter = (id, ok, d) => { res[id] = [ok, d] }
  const avantPresti = statut(PRESTI), avantOrch = statut(ORCHESTRE)
  const perimetres = perimetresEnCours()
  dire(`${NOM} — ${new Date().toISOString()} · presti ${versSlash(PRESTI)} · orchestre ${versSlash(ORCHESTRE)}`)

  // 1. Les trois juges sur l'arbre actuel.
  const passages = {}
  for (const j of JUGES) {
    const f = path.resolve(PRESTI, j.chemin)
    const syntaxe = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8', windowsHide: true })
    if (j.nom === 'media-octets-qa') dire(`mémoire libre avant ${j.nom} (vérification des types) : ${Math.round(os.freemem() / 2 ** 20)} Mo`)
    const r = fs.existsSync(f) ? await lancer([f], PRESTI, j.delaiMin * 60_000) : { code: null, sortie: '', duree: 0 }
    passages[j.nom] = { ...r, syntaxe: syntaxe.status === 0 ? null : court(syntaxe.stderr, 200), existe: fs.existsSync(f) }
    fs.writeFileSync(path.join(SORTIES, `${j.nom}.log`), `$ node ${j.chemin}\n# code ${r.code} · ${r.duree.toFixed(1)} s\n\n${r.sortie}`)
    dire(`\n── ${j.chemin} (arbre actuel) : code ${r.code}, ${r.duree.toFixed(1)} s`)
    for (const l of r.sortie.split(/\r?\n/).filter((x) => x.trim())) dire(`  │ ${l}`)
  }

  // JP-1, JP-2
  const tableau = []
  {
    const f1 = [], f2 = []
    for (const j of JUGES) {
      const p = passages[j.nom]
      const L = p.sortie.split(/\r?\n/)
      const premiere = L.find((l) => RE_ECHEC.test(l) && !/^\s*(PASS|OK|✓)\b/.test(l)) || null
      const porte = premiere && new RegExp(`(?<![A-Za-z0-9])${echapperRe(j.attendu)}(?![A-Za-z0-9])`).test(premiere)
      const bilan = L.some((l) => new RegExp(`^${echapperRe(j.nom)}\\b.*: (PASS|FAIL)\\b`).test(l))
      if (!p.existe) f1.push(`${j.chemin} absent`)
      else if (p.syntaxe) f1.push(`${j.nom} : erreur de syntaxe (${p.syntaxe})`)
      else if (!p.sortie.trim()) f1.push(`${j.nom} : sortie vide`)
      else if (p.code === 0) f1.push(`${j.nom} : code 0 sur l'arbre actuel (il devrait échouer sur ${j.attendu})`)
      else if (p.code === 2 || p.code === null || p.code === 124 || p.code === 127) f1.push(`${j.nom} : code ${p.code}${p.expire ? ' (délai dépassé)' : p.code === 2 ? ' (appel refusé)' : ''}`)
      else if (TRACE.test(p.sortie)) f1.push(`${j.nom} : trace de pile dans la sortie (plantage, pas un échec attendu)`)
      else if (!bilan) f1.push(`${j.nom} : pas de ligne de bilan (le juge ne s'est pas rendu au bout)`)
      else if (!porte) f1.push(`${j.nom} : première ligne en échec « ${court(premiere, 90)} » au lieu de ${j.attendu}`)
      const nrVerts = j.nr.filter((c) => new RegExp(`^PASS ${echapperRe(c)}\\b`, 'm').test(p.sortie) && !new RegExp(`^FAIL ${echapperRe(c)}\\b`, 'm').test(p.sortie))
      for (const c of j.nr) if (!nrVerts.includes(c)) f2.push(`${j.nom} : ${c} n'est pas vert (« ${court(L.find((l) => l.includes(c)) || 'absent de la sortie', 90)} »)`)
      tableau.push({ j, code: p.code, premiere, nrVerts })
    }
    noter('JP-1', !f1.length, f1.length ? f1.join(' · ') : JUGES.map((j) => `${j.nom} code ${passages[j.nom].code}, premier échec ${j.attendu}`).join(' ; '))
    noter('JP-2', !f2.length, f2.length ? f2.join(' · ') : `critères NR verts : ${JUGES.flatMap((j) => j.nr).join(', ')} (instantane-quotidien-qa n'en a pas)`)
  }

  // JP-5 (lu dans la sortie d'instantane-quotidien-qa, vérifié sur le disque)
  {
    const f = []
    const sortie = passages['instantane-quotidien-qa'].sortie
    const bac = (/^bac à sable : (.+?) \(créé par le juge\)\s*$/m.exec(sortie) || [])[1]
    const nu = (/^dépôt nu : (.+?)(?: \(|\s*$)/m.exec(sortie) || [])[1]
    const racineBac = versSlash(path.join(PRESTI, '.orchestre', 'travail', 'instantane-qa')) + '/'
    if (!bac) f.push('la sortie ne dit pas où le bac à sable a été créé')
    else {
      if (!versSlash(bac).startsWith(racineBac)) f.push(`bac à sable hors de .orchestre/travail/instantane-qa/ : ${bac}`)
      if (fs.existsSync(bac)) f.push(`bac à sable resté sur le disque : ${bac}`)
      if (!sortie.includes(`bac à sable supprimé : ${bac}`)) f.push('la sortie ne dit pas que le juge a supprimé son bac à sable')
    }
    if (!nu) f.push('la sortie ne donne pas le dépôt nu')
    else {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(nu) || /^[^/\\]+@[^:]+:/.test(nu) || /^\\\\|^\/\//.test(nu)) f.push(`dépôt nu réseau : ${nu}`)
      else if (bac && !versSlash(nu).startsWith(versSlash(bac) + '/')) f.push(`dépôt nu hors du bac à sable : ${nu}`)
    }
    noter('JP-5', !f.length, f.length ? f.join(' · ') : `bac à sable créé et supprimé par le juge (${court(path.basename(bac), 40)}), dépôt nu local dans le bac ; juges lancés avec GIT_ALLOW_PROTOCOL=file`)
  }

  // JP-3
  {
    const f = []
    const e = eprouverMotifs()
    if (e.rates.length) f.push(`motifs qui ne reconnaissent pas leur faux secret : ${e.rates.join(', ')}`)
    if (e.fauxPositifs.length) f.push(`motifs qui signalent un texte propre : ${e.fauxPositifs.join(', ')}`)
    const scannes = [...JUGES.map((j) => j.chemin), 'scripts/juges-026-securite-preuve.mjs']
    for (const c of scannes) {
      const t = fs.existsSync(path.resolve(PRESTI, c)) ? fs.readFileSync(path.resolve(PRESTI, c), 'utf8') : null
      if (t === null) { f.push(`${c} illisible`); continue }
      const n = motifsTrouves(t)
      if (n.length) f.push(`${c} correspond au(x) motif(s) ${n.join(', ')}`)
    }
    noter('JP-3', !f.length, f.length ? f.join(' · ') : `aucun motif de secret dans ${scannes.length} fichiers (les 3 juges et cette preuve) ; motifs éprouvés : ${e.total - e.rates.length}/${e.total} faux secrets reconnus, 0 signalement sur ${e.propres} textes propres`)
  }

  // 2. Les autotests : le témoin vert, puis un défaut planté par critère.
  if (SANS_AUTOTEST) noter('JP-6', false, 'non jugé (--sans-autotest) : le bilan ne peut pas être PASS')
  else {
    const f = []
    const bilans = []
    for (const j of JUGES) {
      const fichier = path.resolve(PRESTI, j.chemin)
      if (j.nom === 'media-octets-qa') dire(`\nmémoire libre avant ${j.nom} --autotest (deux vérifications des types) : ${Math.round(os.freemem() / 2 ** 20)} Mo`)
      const r = await lancer([fichier, '--autotest'], PRESTI, j.autotestMin * 60_000)
      fs.writeFileSync(path.join(PREUVES, `autotest-${j.nom}.log`), `$ node ${j.chemin} --autotest\n# code ${r.code} · ${r.duree.toFixed(1)} s\n\n${r.sortie}`)
      dire(`\n── ${j.chemin} --autotest : code ${r.code}, ${r.duree.toFixed(1)} s`)
      for (const l of r.sortie.split(/\r?\n/).filter((x) => x.trim())) dire(`  │ ${l}`)
      const cas = r.sortie.split(/\r?\n/).filter((l) => /^(PASS|FAIL) AT-/.test(l))
      const rouges = cas.filter((l) => l.startsWith('FAIL'))
      const temoin = cas.some((l) => l.startsWith('PASS AT-temoin'))
      const bilan = new RegExp(`^${echapperRe(j.nom)} --autotest : PASS\\b`, 'm').test(r.sortie)
      if (r.code !== 0 || !bilan || !temoin || rouges.length || cas.length < 4) f.push(`${j.nom} --autotest : code ${r.code}${rouges.length ? `, ${rouges.length} cas en échec (${court(rouges[0], 80)})` : ''}${!temoin ? ', témoin pas vert' : ''}`)
      bilans.push(`${j.nom} ${cas.length - 1 - cas.filter((l) => /AT-(restauration|menage|jonction)/.test(l)).length} défauts plantés`)
    }
    noter('JP-6', !f.length, f.length ? f.join(' · ') : `témoins verts et défauts plantés attrapés par leur critère : ${bilans.join(', ')}`)
  }

  // JP-4 : l'hygiène, après tous les passages.
  {
    const f = []
    const apresPresti = statut(PRESTI), apresOrch = statut(ORCHESTRE)
    if (!avantPresti || !apresPresti) f.push('git status de presti illisible')
    else {
      const a = new Set(avantPresti), b = new Set(apresPresti)
      const diff = [...[...b].filter((l) => !a.has(l)).map((l) => ['+', l]), ...[...a].filter((l) => !b.has(l)).map((l) => ['-', l])]
      const reproches = diff.filter(([, l]) => !ecarteePresti(cheminStatut(l), perimetres))
      const ecartes = diff.filter(([, l]) => ['tenue', 'autre fiche'].includes(ecarteePresti(cheminStatut(l), perimetres)))
      if (reproches.length) f.push(`presti a bougé hors de .orchestre/travail/ et .orchestre/preuves/026-002/ : ${reproches.slice(0, 5).map(([s, l]) => `${s}${l.trim()}`).join(', ')}`)
      else if (ecartes.length) dire(`\n(JP-4 écarte ${ecartes.length} ligne(s) d'autres chantiers ou de la tenue de l'orchestre : ${ecartes.slice(0, 3).map(([s, l]) => `${s}${l.trim()}`).join(', ')})`)
    }
    if (!avantOrch || !apresOrch) f.push('git status de ../orchestre illisible')
    else {
      const a = new Set(avantOrch), b = new Set(apresOrch)
      const diff = [...[...b].filter((l) => !a.has(l)), ...[...a].filter((l) => !b.has(l))]
      const reproches = diff.filter((l) => cheminStatut(l) !== 'test/git-garde-qa.mjs')
      if (reproches.length) f.push(`../orchestre a bougé : ${reproches.slice(0, 5).join(', ')}`)
    }
    noter('JP-4', !f.length, f.length ? f.join(' · ') : 'git status de presti inchangé hors .orchestre/travail/ et .orchestre/preuves/026-002/ ; ../orchestre inchangé hors test/git-garde-qa.mjs')
  }

  // Bilan et echecs-attendus.md
  dire('')
  const rouges = []
  for (const id of ['JP-1', 'JP-2', 'JP-3', 'JP-4', 'JP-5', 'JP-6']) {
    const [ok, d] = res[id] || [false, 'non jugé']
    dire(`${ok ? 'PASS' : 'FAIL'} ${id} — ${d}`)
    if (!ok) rouges.push(id)
  }
  const md = [
    '# 026-002 — les juges de la sécurité échouent aujourd\'hui sur leur premier critère',
    '',
    `Écrit par \`node scripts/juges-026-securite-preuve.mjs\` le ${new Date().toISOString()}, sur l'arbre actuel. Une ligne par juge : le critère en échec aujourd'hui, l'extrait réel de sa sortie (sa première ligne en échec), les critères de non-régression verts. Les sorties complètes sont dans \`sorties/\` et \`autotest-*.log\`.`,
    '',
    '| Juge | Code | Critère en échec aujourd\'hui | Extrait réel de sa sortie | Critères NR verts |',
    '|---|---|---|---|---|',
    ...tableau.map((t) => `| \`${t.j.chemin}\` | ${t.code} | ${t.j.attendu} | ${String(court(t.premiere || '—', 200)).replace(/\|/g, '\\|')} | ${t.j.nr.length ? (t.nrVerts.join(', ') || '**aucun**') : '— (aucun critère NR)'} |`),
    '',
    '## Contrôles de la preuve',
    '',
    ...['JP-1', 'JP-2', 'JP-3', 'JP-4', 'JP-5', 'JP-6'].map((id) => { const [ok, d] = res[id] || [false, 'non jugé']; return `- **${id}** ${ok ? 'PASS' : 'FAIL'} — ${d}` }),
    '',
    `Verdict : **${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'}**`,
    '',
  ].join('\n')
  const fichierMd = path.join(PREUVES, 'echecs-attendus.md')
  fs.writeFileSync(fichierMd, md)
  if (!fs.statSync(fichierMd).size) { dire(`FAIL JP-0 — ${versSlash(path.relative(PRESTI, fichierMd))} de 0 octet`); rouges.push('JP-0') }
  dire(`${NOM} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'} · ${versSlash(path.relative(PRESTI, fichierMd))} écrit`)
  return rouges.length ? 1 : 0
}

principal().then((c) => process.exit(c)).catch((e) => { console.log(`FAIL ${NOM} — exception : ${e && e.stack ? e.stack : e}`); process.exit(1) })
