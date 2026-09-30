#!/usr/bin/env node
// test/git-garde-qa.mjs — juge du crochet PreToolUse hooks/git-garde.mjs (fiche 026-002 du dépôt presti, pour 026-139),
// écrit par Claude Code AVANT le crochet qu'il juge. L'exécutant qui le lance n'y touche jamais.
//
//   node test/git-garde-qa.mjs [--source=<dépôt orchestre>] [--seulement=GG-2,GG-3] [--graine=<n>]
//   node test/git-garde-qa.mjs --autotest     le juge sur un témoin « oracle » (vert), puis un défaut planté par critère
//
//   --source=<d>  le dépôt outil jugé (défaut : celui de ce fichier) ; --racine=<d> en est un synonyme
//   --graine=<n>  rejoue les 200 chaînes de GG-5 (la graine est affichée)
//
// Chaque cas est ENVOYÉ au crochet, comme le fait Claude Code : `node <source>/hooks/git-garde.mjs`, lancé dans un projet
// d'essai (os.tmpdir(), avec app/page.tsx, lib/plans.ts, fichier.txt, secret.txt et aucun chemin « main »), avec sur stdin
// { "hook_event_name": "PreToolUse", "cwd": <projet>, "tool_name": "Bash" | "PowerShell", "tool_input": { "command": … } }.
// Les cas communs partent avec Bash PUIS avec PowerShell ; les cas propres à PowerShell avec PowerShell seulement.
//
// Sortie : une ligne par critère, « PASS GG-n — … » ou « FAIL GG-n — … », dans l'ordre GG-1 … GG-7, GG-NR1, puis le bilan
// « git-garde-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide. Un crochet
// absent fait échouer GG-1 ; GG-2 à GG-5 sont alors « non jugés » (en échec).
//
//   GG-1   hooks/git-garde.mjs existe.
//   GG-2   chaque commande de la liste REFUSES rend le code 2, avec un stderr non vide qui propose l'issue sûre (le mot
//          « instantané » ou « git stash push »).
//   GG-3   chaque commande de la liste PERMISES rend le code 0, sans décision « deny » ni « block » sur stdout.
//   GG-4   une entrée vide, du JSON invalide et tool_name « Read » rendent le code 0 en moins d'une seconde (meilleur de
//          trois essais : le démarrage de node compte, pas la gigue du poste).
//   GG-5   200 chaînes tirées au hasard (graine affichée) rendent 0 ou 2, jamais une trace de pile.
//   GG-6   dans une copie de test/projet-factice, après `bin/orchestre.mjs init` : .claude/settings.json porte UNE entrée
//          PreToolUse au matcher « Bash|PowerShell » qui lance `node scripts/hooks/git-garde.mjs`, l'entrée « Read »
//          (read-garde) est gardée, scripts/hooks/git-garde.mjs est la copie du crochet ; un second init ne duplique rien.
//   GG-7   `node scripts/orchestre.mjs maj` recopie scripts/hooks/git-garde.mjs à l'identique (octet pour octet).
//   GG-NR1 `node test/preuve.mjs` est vert.
//
// Écritures : seulement sous os.tmpdir() (projets d'essai, témoin de l'autotest, rapport dernier.log refusé s'il fait
// 0 octet), tous supprimés à la fin sauf le rapport. Rien dans le dépôt orchestre ni dans ~/.claude.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const JUGE = 'git-garde-qa'
// Un lecteur qui ferme le tube (… | head) ne doit pas tuer le juge avant son ménage.
process.stdout.on('error', () => {}); process.stderr.on('error', () => {})
const OUTIL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CRITERES = ['GG-1', 'GG-2', 'GG-3', 'GG-4', 'GG-5', 'GG-6', 'GG-7', 'GG-NR1']
const COMMANDE_CROCHET = 'node scripts/hooks/git-garde.mjs'
const LES_DEUX = ['Bash', 'PowerShell']
const PS = ['PowerShell']

// ── les cas (fiche 026-002, point 4 ; revue du 24/09, C1) ────────────────────────────────────────────────────────────
export const REFUSES = [
  ...[
    'git restore .', 'git restore --source=HEAD~1 app/page.tsx', 'git -C ../presti restore x',
    'cd app && git checkout -- page.tsx', 'git checkout .', 'git checkout HEAD -- lib/plans.ts', 'git switch --discard-changes main',
    'git reset --hard', 'git reset --hard origin/main',
    'git clean -fd', 'git clean -xdf',
    'git push --force', 'git push -f origin main', 'git push --force-with-lease', 'git push origin +main',
    'git stash drop', 'git stash clear',
    'git update-ref -d refs/instantanes/ag-x', 'git reflog expire --expire=now --all', 'git gc --prune=now',
    'rm -rf node_modules', 'rm -r -f app', 'rm -fr app',
    'bash -c "git reset --hard"', 'true; git clean -f',
    // C1 : pas de « -- », ou pas de « git » en tête
    'git checkout HEAD app/page.tsx', 'git checkout app/page.tsx', 'git checkout -f main', 'git checkout --force main',
    'git rm -rf app', 'git rm -r app', 'git rm -f lib/plans.ts',
    'node -e "require(\'child_process\').execSync(\'git reset --hard\')"',
    'node --eval "require(\'child_process\').spawnSync(\'git\', [\'clean\', \'-fd\'])"',
    'python -c "import os; os.system(\'git reset --hard\')"',
  ].map((commande) => ({ commande, outils: LES_DEUX })),
  ...[
    'Remove-Item -Recurse -Force app', 'Remove-Item app -Force -Recurse', 'git reset --hard; Write-Host ok',
    'powershell -Command "git clean -fdx"', 'cmd /c "rd /s /q app"',
    'Invoke-Expression "git reset --hard"', "iex 'git clean -fdx'", "Start-Process git -ArgumentList 'reset','--hard'",
    'Start-Process -FilePath git.exe -ArgumentList "clean -fd"', '& git reset --hard', '& "C:\\Program Files\\Git\\cmd\\git.exe" reset --hard',
    'git.exe restore .',
  ].map((commande) => ({ commande, outils: PS })),
]
export const PERMISES = [
  ...[
    'git status', 'git diff', 'git log --oneline -5', 'git add -A', 'git fetch', 'git push origin main', 'git checkout -b essai',
    'git checkout main', 'git switch main', 'git stash push -m essai', 'git rm --cached secret.txt', 'git rm fichier.txt',
    'node -e "console.log(1)"', 'git commit -m "ne jamais faire git reset --hard"', 'echo "rm -rf /" > note.txt', 'rm fichier.txt',
  ].map((commande) => ({ commande, outils: LES_DEUX })),
  ...['Start-Process notepad.exe', 'Remove-Item fichier.txt'].map((commande) => ({ commande, outils: PS })),
]
const ISSUE_SURE = /instantan[ée]|git stash push/i
const TRACE = /^\s+at\s.+:\d+:\d+\)?\s*$/m

// ── options ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function refuser(m) { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
function lireOptions(argv) {
  const o = { source: OUTIL, seulement: null, graine: null, autotest: false }
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
    if (!m) refuser(`argument inconnu : ${a}`)
    if ((m[1] === 'source' || m[1] === 'racine') && m[2]) o.source = path.resolve(m[2])
    else if (m[1] === 'seulement' && m[2]) o.seulement = m[2].split(',').map((x) => x.trim()).filter(Boolean)
    else if (m[1] === 'graine' && /^\d+$/.test(m[2] || '')) o.graine = Number(m[2])
    else if (m[1] === 'autotest' && m[2] === undefined) o.autotest = true
    else refuser(`option inconnue ou sans valeur : ${a}`)
  }
  if (o.seulement) for (const c of o.seulement) if (!CRITERES.includes(c)) refuser(`--seulement : critère inconnu ${c}`)
  if (!fs.existsSync(path.join(o.source, 'bin', 'orchestre.mjs'))) refuser(`--source : ${o.source} n'est pas un dépôt orchestre (bin/orchestre.mjs absent)`)
  if (o.graine === null) o.graine = Math.floor(Math.random() * 1e9)
  return o
}

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────────
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const versSlash = (p) => String(p).split(path.sep).join('/')
function mulberry32(graine) {
  let a = graine >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Un appel au crochet : stdin écrit puis fermé, code, stdout, stderr, durée. */
function appeler(crochet, entree, cwd, delaiMs = 10_000) {
  return new Promise((resoudre) => {
    const debut = process.hrtime.bigint()
    const enfant = spawn(process.execPath, [crochet], { cwd, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let out = '', err = '', fini = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { out += d })
    enfant.stderr.on('data', (d) => { err += d })
    enfant.stdin.on('error', () => { /* crochet sorti sans lire */ })
    const minuterie = setTimeout(() => { if (!fini) { try { enfant.kill('SIGKILL') } catch { /* mort */ } } }, delaiMs)
    enfant.on('close', (code) => { fini = true; clearTimeout(minuterie); resoudre({ code, out, err, ms: Number(process.hrtime.bigint() - debut) / 1e6 }) })
    enfant.on('error', (e) => { fini = true; clearTimeout(minuterie); resoudre({ code: 127, out, err: `${err}${e.message}`, ms: Number(process.hrtime.bigint() - debut) / 1e6 }) })
    enfant.stdin.end(entree)
  })
}
async function enParallele(taches, n = 4) {
  const res = new Array(taches.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, taches.length) }, async () => { while (i < taches.length) { const k = i++; res[k] = await taches[k]() } }))
  return res
}
const entree = (outil, commande, cwd) => JSON.stringify({ session_id: 'git-garde-qa', hook_event_name: 'PreToolUse', cwd, tool_name: outil, tool_input: { command: commande } })
function refusSurStdout(out) {
  try { const j = JSON.parse(out); return j?.hookSpecificOutput?.permissionDecision === 'deny' || j?.decision === 'block' } catch { return false }
}
function projetHook(racine) {
  const p = path.join(racine, 'projet-crochet')
  for (const [rel, c] of [['app/page.tsx', 'export default function Page() { return null }\n'], ['lib/plans.ts', 'export const plans = []\n'], ['fichier.txt', 'un fichier\n'], ['secret.txt', 'pas de secret ici\n']]) {
    fs.mkdirSync(path.dirname(path.join(p, rel)), { recursive: true }); fs.writeFileSync(path.join(p, rel), c)
  }
  return p
}
function executerSync(args, cwd, delaiMs = 120_000) {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: delaiMs, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` }
}

// ── le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(o) {
  const voulus = o.seulement || CRITERES
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-garde-qa-'))
  const res = {}
  const noter = (id, ok, d) => { res[id] = [ok, d] }
  const crochet = path.join(o.source, 'hooks', 'git-garde.mjs')
  try {
    const present = fs.existsSync(crochet)
    noter('GG-1', present, present ? `${versSlash(path.relative(o.source, crochet))} présent` : `hooks/git-garde.mjs absent de ${versSlash(o.source)}`)
    const projet = projetHook(tmp)
    if (!present) for (const id of ['GG-2', 'GG-3', 'GG-4', 'GG-5']) noter(id, false, 'non jugé : le crochet est absent (GG-1)')
    else {
      if (voulus.includes('GG-2')) {
        const essais = REFUSES.flatMap((c) => c.outils.map((outil) => ({ ...c, outil })))
        const r = await enParallele(essais.map((e) => () => appeler(crochet, entree(e.outil, e.commande, projet), projet)))
        const f = []
        essais.forEach((e, i) => {
          const x = r[i]
          if (x.code !== 2) f.push(`[${e.outil}] ${e.commande} → code ${x.code}`)
          else if (!x.err.trim()) f.push(`[${e.outil}] ${e.commande} → code 2 sans stderr`)
          else if (!ISSUE_SURE.test(x.err)) f.push(`[${e.outil}] ${e.commande} → stderr sans issue sûre (« instantané » ou « git stash push ») : « ${court(x.err, 60)} »`)
        })
        noter('GG-2', !f.length, f.length ? `${f.length}/${essais.length} refus manqué(s) — ${f.slice(0, 5).join(' · ')}${f.length > 5 ? ' · …' : ''}` : `${essais.length} envois (${REFUSES.length} commandes) refusés en code 2, stderr avec l'issue sûre`)
      }
      if (voulus.includes('GG-3')) {
        const essais = PERMISES.flatMap((c) => c.outils.map((outil) => ({ ...c, outil })))
        const r = await enParallele(essais.map((e) => () => appeler(crochet, entree(e.outil, e.commande, projet), projet)))
        const f = []
        essais.forEach((e, i) => {
          const x = r[i]
          if (x.code !== 0) f.push(`[${e.outil}] ${e.commande} → code ${x.code}${x.err.trim() ? ` « ${court(x.err, 50)} »` : ''}`)
          else if (refusSurStdout(x.out)) f.push(`[${e.outil}] ${e.commande} → code 0 mais décision de refus sur stdout`)
        })
        noter('GG-3', !f.length, f.length ? `${f.length}/${essais.length} permis refusé(s) — ${f.slice(0, 5).join(' · ')}${f.length > 5 ? ' · …' : ''}` : `${essais.length} envois (${PERMISES.length} commandes) permis en code 0`)
      }
      if (voulus.includes('GG-4')) {
        const f = []
        const cas = [['entrée vide', ''], ['JSON invalide', '{"tool_name": "Bash", "tool_input": {"command": "git reset --hard"'], ['tool_name Read', JSON.stringify({ hook_event_name: 'PreToolUse', cwd: projet, tool_name: 'Read', tool_input: { file_path: 'app/page.tsx' } })]]
        const mesures = []
        for (const [nom, texte] of cas) {
          let meilleur = null
          for (let k = 0; k < 3; k++) {
            const x = await appeler(crochet, texte, projet)
            if (x.code !== 0 || TRACE.test(x.err)) { meilleur = x; break }
            if (!meilleur || x.ms < meilleur.ms) meilleur = x
            if (x.ms < 1000) break
          }
          mesures.push(`${nom} ${Math.round(meilleur.ms)} ms`)
          if (meilleur.code !== 0) f.push(`${nom} → code ${meilleur.code}${TRACE.test(meilleur.err) ? ' avec une trace de pile' : ''}`)
          else if (meilleur.ms >= 1000) f.push(`${nom} → ${Math.round(meilleur.ms)} ms (une seconde au plus)`)
        }
        noter('GG-4', !f.length, f.length ? f.join(' · ') : `code 0 en moins d'une seconde : ${mesures.join(', ')}`)
      }
      if (voulus.includes('GG-5')) {
        const chaines = hasard(o.graine, 200)
        const r = await enParallele(chaines.map((c, i) => () => appeler(crochet, entree(LES_DEUX[i % 2], c, projet), projet)))
        const f = []
        r.forEach((x, i) => {
          if (x.code !== 0 && x.code !== 2) f.push(`chaîne ${i} → code ${x.code} (« ${court(JSON.stringify(chaines[i]), 50)} »)`)
          else if (TRACE.test(x.err) || TRACE.test(x.out)) f.push(`chaîne ${i} → trace de pile (« ${court(JSON.stringify(chaines[i]), 50)} »)`)
        })
        const refus = r.filter((x) => x.code === 2).length
        noter('GG-5', !f.length, f.length ? `${f.length}/200 — ${f.slice(0, 4).join(' · ')} — graine ${o.graine}` : `200 chaînes au hasard (graine ${o.graine}) : ${200 - refus} en code 0, ${refus} en code 2, aucune trace de pile`)
      }
    }
    if (voulus.includes('GG-6') || voulus.includes('GG-7')) {
      const [g6, g7] = jugerInitMaj(o, tmp, crochet)
      noter('GG-6', ...g6)
      noter('GG-7', ...g7)
    }
    if (voulus.includes('GG-NR1')) {
      // test/preuve.mjs est rarement instable sur ce poste (1 rouge en ~25 passages le 26/09, jamais reproduit : il lance un
      // `contexte` détaché puis efface son dossier d'essai). Un second passage est donc fait quand le premier rougit, et le
      // détail du premier reste dans la ligne ; une vraie régression rougit les deux fois.
      const passer = () => executerSync([path.join(o.source, 'test', 'preuve.mjs')], o.source, 10 * 60_000)
      const detail = (x) => { const L = x.sortie.split(/\r?\n/).filter((l) => l.trim()); const rouge = L.find((l) => /^\s*✗/.test(l)) || L.find((l) => /Error|EBUSY|EPERM|ENOTEMPTY/.test(l)); return `code ${x.code} : « ${court(L.at(-1) || '', 100)} »${x.code !== 0 && rouge ? ` · premier rouge : « ${court(rouge, 140)} »` : ''}` }
      const premier = passer()
      const r = premier.code === 0 ? premier : passer()
      noter('GG-NR1', r.code === 0, `node test/preuve.mjs → ${detail(r)}${r !== premier ? ` — second passage ; le premier : ${detail(premier)}` : ''}`)
    }
  } catch (e) {
    for (const id of voulus) if (!res[id]) noter(id, false, `le juge n'a pas pu mesurer : ${court(e.message, 160)}`)
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* os.tmpdir() : le système nettoiera */ }
  }
  const lignes = []
  const rouges = []
  for (const id of CRITERES) {
    if (!voulus.includes(id) && id !== 'GG-1') continue
    const [ok, d] = res[id] || [false, 'non jugé']
    const l = `${ok ? 'PASS' : 'FAIL'} ${id} — ${d}`
    console.log(l); lignes.push(l)
    if (!ok) rouges.push(id)
  }
  const bilan = `${JUGE}${o.seulement ? ` (seulement ${o.seulement.join(', ')})` : ''} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'} · source ${versSlash(o.source)}`
  console.log(bilan); lignes.push(bilan)
  const rapport = path.join(os.tmpdir(), JUGE, 'dernier.log')
  fs.mkdirSync(path.dirname(rapport), { recursive: true })
  fs.writeFileSync(rapport, lignes.join('\n') + '\n')
  if (!fs.statSync(rapport).size) { console.log(`ERREUR ${JUGE} : rapport de 0 octet, refusé`); return 1 }
  return rouges.length ? 1 : 0
}

/** 200 chaînes : des bouts de commandes dangereuses et banales mêlés, des guillemets orphelins, de l'unicode, du très long. */
function hasard(graine, n) {
  const alea = mulberry32(graine)
  const pioche = (t) => t[Math.floor(alea() * t.length)]
  const MOTS = ['git', 'git.exe', 'reset', '--hard', 'checkout', '--', '.', 'restore', 'clean', '-fd', '-xdf', 'push', '-f', '--force', '+main', 'rm', '-rf', '-r', '-f',
    'Remove-Item', '-Recurse', '-Force', 'bash', 'sh', '-c', 'powershell', '-Command', 'cmd', '/c', 'rd', '/s', '/q', 'node', '-e', 'python', '-c', 'iex',
    'Invoke-Expression', 'Start-Process', '-ArgumentList', '-FilePath', '&', ';', '&&', '||', '|', '>', '<', '"', "'", '`', '$(', '${', '}', ')', '(', '\\',
    '\n', '\t', 'app/page.tsx', 'main', 'HEAD', 'origin', 'stash', 'drop', 'update-ref', '-d', 'reflog', 'expire', 'gc', '--prune=now', '-C', '../x', 'echo',
    'Write-Host', 'commit', '-m', 'é', 'ß', '🙂', '中文', '\u202e', '\u0000', '%PATH%', '$env:HOME', '~', '*', '?', '[', ']', '{', ']]']
  const out = []
  for (let i = 0; i < n; i++) {
    const genre = alea()
    let s
    if (genre < 0.55) { const k = 1 + Math.floor(alea() * 12); s = Array.from({ length: k }, () => pioche(MOTS)).join(alea() < 0.8 ? ' ' : '') }
    else if (genre < 0.8) s = Array.from({ length: Math.floor(alea() * 80) }, () => String.fromCharCode(1 + Math.floor(alea() * 0x2fff))).join('')
    else if (genre < 0.9) s = Array.from({ length: 200 + Math.floor(alea() * 600) }, () => pioche(MOTS)).join(' ')
    else s = pioche(['', ' ', '"', "'", '\\', '$(', 'git', 'git ', 'git -C', 'rm -', '& "', 'bash -c "', 'node -e', 'iex', '--', ';;;;', '&&&&'])
    out.push(s)
  }
  return out
}

function jugerInitMaj(o, tmp, crochet) {
  const g6 = [], g7 = []
  const projet = path.join(tmp, 'projet')
  fs.cpSync(path.join(o.source, 'test', 'projet-factice'), projet, { recursive: true })
  const git = (a) => spawnSync('git', a, { cwd: projet, windowsHide: true })
  git(['init', '-q']); git(['add', '-A']); git(['-c', 'user.email=essai@exemple.invalid', '-c', 'user.name=essai', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'base', '--no-verify'])
  const bin = path.join(o.source, 'bin', 'orchestre.mjs')
  const lireSettings = () => { try { return JSON.parse(fs.readFileSync(path.join(projet, '.claude', 'settings.json'), 'utf8')) } catch { return null } }
  const examiner = (s, quand) => {
    const f = []
    if (!s) return [`${quand} : .claude/settings.json absent ou illisible`]
    const pre = Array.isArray(s.hooks?.PreToolUse) ? s.hooks.PreToolUse : []
    const garde = pre.filter((e) => (e?.hooks || []).some((h) => h?.command === COMMANDE_CROCHET))
    if (garde.length !== 1) f.push(`${quand} : ${garde.length} entrée(s) PreToolUse qui lancent « ${COMMANDE_CROCHET} » au lieu d'une`)
    else {
      const m = String(garde[0].matcher ?? '')
      const ens = m.split('|').map((x) => x.trim()).sort().join('|')
      if (ens !== 'Bash|PowerShell') f.push(`${quand} : matcher « ${m} » au lieu de « Bash|PowerShell »`)
    }
    if (!pre.some((e) => e?.matcher === 'Read' && (e.hooks || []).some((h) => h?.command === 'node scripts/hooks/read-garde.mjs'))) f.push(`${quand} : l'entrée PreToolUse « Read » (read-garde) a disparu`)
    return f
  }
  const i1 = executerSync([bin, 'init', 'projet', '--projet=essai-git-garde'], tmp)
  if (i1.code !== 0) g6.push(`init en code ${i1.code} : ${court(i1.sortie.split(/\r?\n/).filter(Boolean).at(-1), 100)}`)
  g6.push(...examiner(lireSettings(), 'après init'))
  const copie = path.join(projet, 'scripts', 'hooks', 'git-garde.mjs')
  const source = fs.existsSync(crochet) ? fs.readFileSync(crochet) : null
  if (!fs.existsSync(copie)) g6.push('scripts/hooks/git-garde.mjs non posé par init')
  else if (source && !fs.readFileSync(copie).equals(source)) g6.push('scripts/hooks/git-garde.mjs posé par init diffère du crochet')
  const i2 = executerSync([bin, 'init', 'projet'], tmp)
  if (i2.code !== 0) g6.push(`second init en code ${i2.code}`)
  g6.push(...examiner(lireSettings(), 'après un second init'))
  // GG-7 : maj recopie le crochet à l'identique
  if (!source) g7.push('pas de crochet dans la source : rien à recopier (GG-1)')
  else {
    fs.mkdirSync(path.dirname(copie), { recursive: true })
    fs.writeFileSync(copie, '// ancienne version du crochet, que maj doit remplacer\n')
    const m = executerSync([path.join(projet, 'scripts', 'orchestre.mjs'), 'maj'], projet)
    if (m.code !== 0) g7.push(`maj en code ${m.code} : ${court(m.sortie.split(/\r?\n/).filter(Boolean).at(-1), 100)}`)
    if (!fs.existsSync(copie) || !fs.readFileSync(copie).equals(source)) g7.push('après maj, scripts/hooks/git-garde.mjs n’est pas la copie octet pour octet du crochet')
  }
  return [
    [!g6.length, g6.length ? g6.join(' · ') : 'init : une entrée PreToolUse « Bash|PowerShell » → node scripts/hooks/git-garde.mjs, l’entrée Read gardée, le crochet copié ; un second init ne duplique rien'],
    [!g7.length, g7.length ? g7.join(' · ') : 'maj : scripts/hooks/git-garde.mjs recopié octet pour octet'],
  ]
}

// ── --autotest : un témoin « oracle », puis un défaut planté par critère ─────────────────────────────────────────────
// Le témoin est une copie du dépôt outil (os.tmpdir()) où hooks/git-garde.mjs est un ORACLE : il refuse exactement la liste
// REFUSES, sans lire les commandes. Il prouve que le juge sait passer au vert (stdin, cwd, codes, stderr, délais, init, maj,
// preuve.mjs), puis au rouge sur chaque défaut planté. Il ne prouve pas qu'un crochet réel est juste : c'est 026-139.
const MESSAGE_ORACLE = 'git-garde : commande refusée (règle : liste du juge). Prends un instantané, ou `git stash push -m …` ; demande à Benj.\\n'
function oracle() {
  const liste = [...new Set(REFUSES.map((c) => c.commande))].map((c) => `  ${JSON.stringify(c)},`).join('\n')
  return `#!/usr/bin/env node
// Témoin ORACLE de hooks/git-garde.mjs, fabriqué par test/git-garde-qa.mjs --autotest. Il ne lit pas les commandes.
import fs from 'node:fs'
const REFUS = new Set([
${liste}
])
const MESSAGE = '${MESSAGE_ORACLE}'
let texte = ''
try { texte = fs.readFileSync(0, 'utf8') } catch { texte = '' }
let entree
try { entree = JSON.parse(texte) } catch { process.exit(0) }
if (!entree || (entree.tool_name !== 'Bash' && entree.tool_name !== 'PowerShell')) process.exit(0)
const commande = entree.tool_input && typeof entree.tool_input.command === 'string' ? entree.tool_input.command : ''
if (REFUS.has(commande)) { process.stderr.write(MESSAGE); process.exit(2) }
process.exit(0)
`
}
const CAS_AUTOTEST = [
  { nom: 'crochet-absent', retirer: 'hooks/git-garde.mjs', attendu: 'GG-1', aussi: ['GG-2', 'GG-3', 'GG-4', 'GG-5', 'GG-6', 'GG-7'] },
  { nom: 'option-C-oubliee', fichier: 'hooks/git-garde.mjs', avant: '  "git -C ../presti restore x",\n', apres: '', attendu: 'GG-2', seulement: 'GG-2,GG-3' },
  { nom: 'remove-item-ordre', fichier: 'hooks/git-garde.mjs', avant: '  "Remove-Item app -Force -Recurse",\n', apres: '', attendu: 'GG-2', seulement: 'GG-2,GG-3' },
  { nom: 'stderr-vide', fichier: 'hooks/git-garde.mjs', avant: 'process.stderr.write(MESSAGE)', apres: "process.stderr.write('')", attendu: 'GG-2', seulement: 'GG-2,GG-3' },
  { nom: 'stderr-sans-issue', fichier: 'hooks/git-garde.mjs', avant: 'Prends un instantané, ou `git stash push -m …` ; demande à Benj.', apres: 'Refusé.', attendu: 'GG-2', seulement: 'GG-2,GG-3' },
  { nom: 'commit-m-inspecte', fichier: 'hooks/git-garde.mjs', avant: 'const REFUS = new Set([\n', apres: 'const REFUS = new Set([\n  "git commit -m \\"ne jamais faire git reset --hard\\"",\n', attendu: 'GG-3', seulement: 'GG-2,GG-3' },
  { nom: 'rm-cached-refuse', fichier: 'hooks/git-garde.mjs', avant: 'const REFUS = new Set([\n', apres: 'const REFUS = new Set([\n  "git rm --cached secret.txt",\n', attendu: 'GG-3', seulement: 'GG-2,GG-3' },
  { nom: 'json-invalide-exception', fichier: 'hooks/git-garde.mjs', avant: 'try { entree = JSON.parse(texte) } catch { process.exit(0) }', apres: 'entree = JSON.parse(texte)', attendu: 'GG-4', seulement: 'GG-4' },
  { nom: 'read-lent', fichier: 'hooks/git-garde.mjs', avant: "if (!entree || (entree.tool_name !== 'Bash'", apres: "if (entree && entree.tool_name === 'Read') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500)\nif (!entree || (entree.tool_name !== 'Bash'", attendu: 'GG-4', seulement: 'GG-4' },
  { nom: 'trace-sur-hasard', fichier: 'hooks/git-garde.mjs', avant: 'if (REFUS.has(commande))', apres: "if (commande.includes('$(')) throw new TypeError('essai : chaîne imprévue')\nif (REFUS.has(commande))", attendu: 'GG-5', seulement: 'GG-5' },
  { nom: 'gabarit-sans-crochet', fichier: 'gabarits/settings.json', avant: '"node scripts/hooks/git-garde.mjs"', apres: '"node scripts/hooks/autre-garde.mjs"', attendu: 'GG-6', seulement: 'GG-6,GG-7' },
  { nom: 'gabarit-matcher-bash', fichier: 'gabarits/settings.json', avant: '"matcher": "Bash|PowerShell"', apres: '"matcher": "Bash"', attendu: 'GG-6', seulement: 'GG-6,GG-7' },
  { nom: 'maj-oublie-crochet', fichier: 'bin/orchestre.mjs', avant: "fs.readdirSync(path.join(source, 'hooks')).filter((f) => f.endsWith('.mjs')).map((h)", apres: "fs.readdirSync(path.join(source, 'hooks')).filter((f) => f.endsWith('.mjs') && f !== 'git-garde.mjs').map((h)", attendu: 'GG-7', seulement: 'GG-6,GG-7' },
  { nom: 'preuve-rouge', fichier: 'test/preuve.mjs', avant: 'let echecs = 0', apres: 'let echecs = 1', attendu: 'GG-NR1', seulement: 'GG-NR1' },
]
function copierOutil(de, vers) {
  fs.cpSync(de, vers, { recursive: true, filter: (p) => { const b = path.basename(p); return b !== '.git' && b !== 'node_modules' } })
}
function poserTemoin(T) {
  fs.writeFileSync(path.join(T, 'hooks', 'git-garde.mjs'), oracle())
  const f = path.join(T, 'gabarits', 'settings.json')
  const s = JSON.parse(fs.readFileSync(f, 'utf8'))
  s.hooks.PreToolUse = [...(s.hooks.PreToolUse || []).filter((e) => !(e.hooks || []).some((h) => h.command === COMMANDE_CROCHET)), { matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: COMMANDE_CROCHET }] }]
  fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n')
}
const rougesDe = (sortie) => [...new Set(sortie.split(/\r?\n/).map((l) => /^FAIL (GG-[A-Z0-9]+)\b/.exec(l)).filter(Boolean).map((m) => m[1]))]
function lancerJuge(T, seulement) {
  return new Promise((resoudre) => {
    const args = [fileURLToPath(import.meta.url), `--source=${T}`, ...(seulement ? [`--seulement=${seulement}`] : [])]
    const debut = Date.now()
    const enfant = spawn(process.execPath, args, { cwd: T, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let sortie = ''
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
    enfant.on('close', (code) => resoudre({ code, sortie, duree: (Date.now() - debut) / 1000 }))
  })
}
async function autotest() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'git-garde-qa-autotest-'))
  const T = path.join(base, 'temoin')
  const lignes = []
  const dire = (l) => { console.log(l); lignes.push(l) }
  let ok = true
  try {
    copierOutil(OUTIL, T)
    poserTemoin(T)
    dire(`témoin : copie du dépôt outil dans ${versSlash(T)}, hooks/git-garde.mjs = oracle (liste REFUSES), gabarits/settings.json avec l'entrée Bash|PowerShell`)
    const t0 = await lancerJuge(T, null)
    const r0 = rougesDe(t0.sortie)
    const vert = t0.code === 0 && !r0.length && CRITERES.every((c) => new RegExp(`^PASS ${c}\\b`, 'm').test(t0.sortie))
    dire(`${vert ? 'PASS' : 'FAIL'} AT-temoin — témoin en code ${t0.code}${r0.length ? `, rouges : ${r0.join(', ')}` : ', GG-1 à GG-NR1 verts'} (${t0.duree.toFixed(0)} s)`)
    if (!vert) { ok = false; for (const l of t0.sortie.split(/\r?\n/).filter((x) => /^FAIL /.test(x))) dire(`    ${court(l, 240)}`) }
    for (const c of CAS_AUTOTEST) {
      const cible = path.join(T, c.retirer || c.fichier)
      const original = fs.readFileSync(cible, 'utf8')
      if (c.retirer) fs.rmSync(cible)
      else {
        const nb = original.split(c.avant).length - 1
        if (nb !== 1) { ok = false; dire(`FAIL AT-${c.nom} — « avant » présent ${nb} fois dans ${c.fichier}`); continue }
        fs.writeFileSync(cible, original.replace(c.avant, () => c.apres))
      }
      let r
      try { r = await lancerJuge(T, c.seulement) } finally { fs.writeFileSync(cible, original) }
      const rouges = rougesDe(r.sortie)
      const permis = new Set([c.attendu, ...(c.aussi || [])])
      const ligne = r.sortie.split(/\r?\n/).find((l) => new RegExp(`^FAIL ${c.attendu}\\b`).test(l))
      const bon = r.code !== 0 && !!ligne && rouges.every((x) => permis.has(x))
      if (!bon) ok = false
      dire(`${bon ? 'PASS' : 'FAIL'} AT-${c.nom} — ${c.retirer ? `${c.retirer} retiré` : `${c.fichier} muté`} → code ${r.code}, rouges ${rouges.join(', ') || 'aucun'} (attendu ${c.attendu}${c.aussi ? ` + ${c.aussi.join(', ')}` : ''})${ligne ? ` · « ${court(ligne, 150)} »` : ''}`)
    }
    const restaure = fs.readFileSync(path.join(T, 'hooks', 'git-garde.mjs'), 'utf8') === oracle()
    if (!restaure) ok = false
    dire(`${restaure ? 'PASS' : 'FAIL'} AT-restauration — le témoin est revenu à l'original après chaque cas`)
  } finally {
    try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* os.tmpdir() */ }
  }
  dire(`${JUGE} --autotest : ${ok ? 'PASS' : 'FAIL'} — ${CAS_AUTOTEST.length} défauts plantés`)
  const rapport = path.join(os.tmpdir(), JUGE, 'autotest.log')
  fs.mkdirSync(path.dirname(rapport), { recursive: true })
  fs.writeFileSync(rapport, lignes.join('\n') + '\n')
  if (!fs.statSync(rapport).size) { console.log(`ERREUR ${JUGE} : rapport de 0 octet, refusé`); return 1 }
  return ok ? 0 : 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = lireOptions(process.argv.slice(2))
  process.exit(o.autotest ? await autotest() : await juger(o))
}
