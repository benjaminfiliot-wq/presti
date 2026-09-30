#!/usr/bin/env node
// hooks/git-garde.mjs — crochet PreToolUse « Bash » et « PowerShell » de Claude Code (orchestre, fiche 026-139).
//
// Pourquoi ce fichier existe : le 13/09, un `git restore` lancé par un agent a effacé trois jours de travail.
// `~/.claude/settings.json` refuse des PRÉFIXES (`Bash(git restore:*)`) ; un préfixe ne voit pas
// `git -C ../x restore .`, `cd app && git checkout -- page.tsx`, `true; git clean -f` ni `bash -c "git reset --hard"`.
// Ce crochet lit la ligne entière, où que soit la commande, et refuse en code 2 ce qui détruit du travail non
// sauvegardé. Les interdits de settings.json restent la première barrière ; celui-ci est la seconde.
//
// Entrée : sur stdin, le JSON que Claude Code envoie aux crochets :
//   { "cwd": "…", "tool_name": "Bash" | "PowerShell", "tool_input": { "command": "…" } }
// Sortie : rien (code 0), ou un message sur stderr qui nomme la règle et donne l'issue sûre (code 2 = bloque l'outil).
//
// Règle d'or, comme read-garde : jamais d'exception non rattrapée. Au moindre doute sur l'ENTRÉE (JSON invalide,
// outil inconnu, commande absente), on laisse passer. Au doute sur la COMMANDE (code passé à node -e), on refuse.
//
// Ce que le crochet lit : la ligne découpée en segments (; && || | & retour à la ligne, parenthèses, accolades), en
// respectant les guillemets ; le contenu de `bash -c`, `sh -c`, `powershell -Command` (et -EncodedCommand), `pwsh`,
// `cmd /c`, `Invoke-Expression`/`iex`, `Start-Process … -ArgumentList`, `& <exe>`, `xargs`, `find -exec`, `sudo`, `env`,
// `$( … )` dans une chaîne, `@( … )`, un heredoc envoyé à un shell ; les chaînes littérales de `node -e`, `python -c`,
// `deno eval`. Il met de côté le texte d'un `-m`/`--message` de git commit, les arguments d'echo/Write-Host/Write-Output
// et les corps de heredoc : ce sont des textes, pas des commandes.
//
// Ce qu'il ne lit pas : un script (`node x.mjs`, `bash x.sh`), un alias ou une fonction définis ailleurs, une variable
// dont on ne connaît pas la valeur, une commande passée par un autre canal. Codex a ses propres règles, et Antigravity est
// couvert par l'instantané d'antigravity.mjs (voir README).

import fs from 'node:fs'
import path from 'node:path'

const PROFONDEUR_MAX = 8
const LONGUEUR_MAX = 400_000
const APPELS_MAX = 4000 // garde-fou : une chaîne pathologique ne doit pas faire exploser les relectures imbriquées
const ETAT = { appels: 0 }

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────
function lireStdin() {
  try { return fs.readFileSync(0, 'utf8') } catch { return '' }
}
function analyserEntree(texte) {
  const t = (texte || '').trim()
  if (!t) return {}
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : {} } catch { return {} }
}

// ── le refus ──────────────────────────────────────────────────────────────────────────────────────
const ISSUE = 'Prends un instantané (copie le dossier, ou `git stash push -m "…"`), ou demande à Benj.'
class Refus extends Error {
  constructor(regle, detail) { super(detail); this.regle = regle; this.detail = detail }
}
const refuser = (regle, detail) => { throw new Refus(regle, detail) }

// ── heredocs et here-strings ──────────────────────────────────────────────────────────────────────
const SHELLS = /(^|[\s;&|(])(?:[\w./\\:-]*[\\/])?(?:bash|sh|zsh|dash|ksh|fish|pwsh|powershell)(?:\.exe)?\b[^\n]*$/i

/** Retire le corps des heredocs (`<<EOF … EOF`) : c'est un texte, sauf s'il est lu par un shell (alors il part dans `extras`). */
function retirerHeredocs(texte, extras) {
  const lignes = texte.split('\n')
  const sortie = []
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i]
    sortie.push(ligne)
    const balises = []
    const re = /<<(-?)\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_][\w-]*))/g
    let m
    while ((m = re.exec(ligne)) !== null) {
      if (ligne[m.index - 1] === '<' || ligne[m.index + m[0].length] === '<') continue // <<< (here-string bash)
      balises.push({ tab: m[1] === '-', mot: m[2] || m[3] || m[4], avant: ligne.slice(0, m.index) })
    }
    let fin = i
    for (const b of balises) {
      let k = fin + 1
      const corps = []
      while (k < lignes.length) {
        const l = lignes[k].replace(/\r$/, '')
        if ((b.tab ? l.replace(/^\t+/, '') : l) === b.mot) break
        corps.push(lignes[k++])
      }
      if (k >= lignes.length) break // pas de délimiteur : ce n'est pas un heredoc, rien n'est retiré
      if (SHELLS.test(b.avant)) extras.push(corps.join('\n'))
      fin = k // le corps et la ligne du délimiteur ne sont pas recopiés
    }
    i = fin
  }
  return sortie.join('\n')
}

// ── découpage en segments ─────────────────────────────────────────────────────────────────────────
/**
 * Découpe une ligne en segments de commande. Respecte les guillemets, l'échappement (\ en Bash, ` en PowerShell)
 * et les here-strings @'…'@. Renvoie { segments: [{ texte, sep }], extras: [texte…] } ; `extras` reçoit ce qui
 * s'exécute à l'intérieur d'une chaîne ($( … ), `…`, @( … )).
 */
function decouper(texte, outil) {
  const ps = outil === 'PowerShell'
  const segments = []
  const extras = []
  let cour = ''
  let sep = ''
  const clore = (nouveauSep) => {
    if (cour.trim() !== '') segments.push({ texte: cour, sep })
    cour = ''
    sep = nouveauSep
  }
  const n = texte.length
  let q = null // null | "'" | '"'
  for (let i = 0; i < n; i++) {
    const c = texte[i]
    if (q === "'") {
      cour += c
      if (c === "'") q = null
      continue
    }
    if (q === '"') {
      if (c === '\\' && !ps && i + 1 < n) { cour += c + texte[++i]; continue }
      if (c === '`' && ps && i + 1 < n) { cour += c + texte[++i]; continue }
      if (c === '"') { cour += c; q = null; continue }
      if (c === '$' && texte[i + 1] === '(') { const fin = fermante(texte, i + 1); extras.push(texte.slice(i + 2, fin)); cour += texte.slice(i, fin + 1); i = fin; continue }
      if (c === '`' && !ps) { const fin = texte.indexOf('`', i + 1); if (fin > i) { extras.push(texte.slice(i + 1, fin)); cour += texte.slice(i, fin + 1); i = fin; continue } }
      cour += c
      continue
    }
    // hors guillemets
    if (c === '\\' && !ps && i + 1 < n) { cour += c + texte[++i]; continue }
    if (c === '`' && ps && i + 1 < n) { cour += c + texte[++i]; continue }
    if (c === '@' && (texte[i + 1] === "'" || texte[i + 1] === '"') && /^\r?\n/.test(texte.slice(i + 2))) {
      const guillemet = texte[i + 1]
      const fin = texte.indexOf(`\n${guillemet}@`, i + 2)
      const stop = fin < 0 ? n : fin + 3
      cour += texte.slice(i, stop)
      i = stop - 1
      continue
    }
    if (c === '@' && texte[i + 1] === '(') { const fin = fermante(texte, i + 1); extras.push(texte.slice(i + 2, fin)); cour += texte.slice(i, fin + 1); i = fin; continue }
    if (c === "'" || c === '"') { q = c; cour += c; continue }
    if (c === '#' && (i === 0 || /[\s;&|]/.test(texte[i - 1]))) {
      const fin = texte.indexOf('\n', i)
      i = fin < 0 ? n : fin - 1
      continue
    }
    if (c === ';' || c === '\n' || c === '\r') { clore(''); continue }
    if (c === '|') { if (texte[i + 1] === '|' || texte[i + 1] === '&') i++; clore('|'); continue }
    if (c === '&') { if (texte[i + 1] === '&') i++; clore(''); continue }
    if (c === '(' || c === ')' || c === '{' || c === '}') { clore(''); continue }
    cour += c
  }
  clore('')
  return { segments, extras }
}

/** Index de la parenthèse fermante qui répond à celle de `ouverte` (guillemets simples ignorés au mieux). */
function fermante(texte, ouverte) {
  let profondeur = 0
  for (let i = ouverte; i < texte.length; i++) {
    if (texte[i] === '(') profondeur++
    else if (texte[i] === ')') { profondeur--; if (profondeur === 0) return i }
  }
  return texte.length
}

// ── découpage en mots ─────────────────────────────────────────────────────────────────────────────
/** Mots d'un segment, guillemets retirés (`g''it` devient `git`), here-strings comprises. */
function mots(segment, outil) {
  const ps = outil === 'PowerShell'
  const sortie = []
  let cour = ''
  let actif = false
  const n = segment.length
  let q = null
  for (let i = 0; i < n; i++) {
    const c = segment[i]
    if (q === "'") { if (c === "'") { q = null } else cour += c; continue }
    if (q === '"') {
      if (c === '\\' && !ps && i + 1 < n && '"\\$`'.includes(segment[i + 1])) { cour += segment[++i]; continue }
      if (c === '`' && ps && i + 1 < n) { cour += segment[++i]; continue }
      if (c === '"') { q = null; continue }
      cour += c
      continue
    }
    if (c === '@' && (segment[i + 1] === "'" || segment[i + 1] === '"') && /^\r?\n/.test(segment.slice(i + 2))) {
      const guillemet = segment[i + 1]
      const debut = segment.indexOf('\n', i) + 1
      const fin = segment.indexOf(`\n${guillemet}@`, debut)
      cour += segment.slice(debut, fin < 0 ? n : fin).replace(/\r$/, '')
      actif = true
      i = fin < 0 ? n : fin + 2
      continue
    }
    if (c === '\\' && !ps && i + 1 < n && (segment[i + 1] === ' ' || segment[i + 1] === '"' || segment[i + 1] === "'" || segment[i + 1] === ';' || segment[i + 1] === '\\')) { cour += segment[++i]; actif = true; continue }
    if (c === '`' && ps && i + 1 < n) { cour += segment[++i]; actif = true; continue }
    if (c === "'" || c === '"') { q = c; actif = true; continue }
    if (/\s/.test(c)) { if (actif) { sortie.push(cour); cour = ''; actif = false } continue }
    cour += c
    actif = true
  }
  if (actif) sortie.push(cour)
  return sortie
}

// ── noms de commandes ─────────────────────────────────────────────────────────────────────────────
/** `C:\Program Files\Git\cmd\git.exe`, `/usr/bin/git`, `\git`, `Git.EXE` deviennent `git`. */
function nom(mot) {
  let m = String(mot).replace(/^\\(?=[A-Za-z])/, '')
  m = m.split(/[\\/]/).pop() || ''
  m = m.replace(/\.(exe|cmd|bat|com|ps1)$/i, '')
  return m.toLowerCase()
}
const est_dynamique = (mot) => /[$`]/.test(mot)

const ENVELOPPES = {
  // nom : options qui prennent une valeur
  env: ['-u', '-C', '-S', '--unset', '--chdir'], command: [], sudo: ['-u', '-g', '-h', '-p', '-C', '-r', '-t', '-U'], doas: ['-u', '-C'],
  time: [], nohup: [], exec: [], builtin: [], nice: ['-n'], ionice: ['-c', '-n', '-p'], stdbuf: ['-i', '-o', '-e'], timeout: ['-s', '-k'],
  xargs: ['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a', '-l', '-i'], watch: ['-n', '-d'], setsid: [], call: [], noglob: [], caffeinate: [],
  wsl: ['-d', '-u', '--distribution', '--user', '--cd'],}
const MOTS_CLES = new Set(['if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until', '!'])
const NOMS_SUPPRESSION = new Set(['rm', 'ri', 'del', 'erase', 'rd', 'rmdir', 'remove-item'])
const SHELLS_C = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'ash', 'busybox'])
const PS_EXE = new Set(['powershell', 'pwsh'])
const INTERPRETES = new Map([
  ['node', ['-e', '--eval', '-p', '--print']], ['nodejs', ['-e', '--eval', '-p', '--print']], ['bun', ['-e', '--eval']],
  ['python', ['-c']], ['python3', ['-c']], ['py', ['-c']], ['pypy', ['-c']], ['pypy3', ['-c']],
  ['ruby', ['-e']], ['perl', ['-e', '-E']], ['php', ['-r']], ['deno', ['eval']],
])

// ── le cœur : une commande déjà découpée en mots ──────────────────────────────────────────────────
/** Contexte de lecture : outil, répertoire courant simulé (suivi des `cd`), profondeur. */
function analyserMots(tokens, ctx) {
  let i = 0
  for (let garde = 0; garde < 64 && i < tokens.length; garde++) {
    const t = tokens[i]
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || MOTS_CLES.has(t.toLowerCase())) { i++; continue }
    const n = nom(t)
    // enveloppes : on saute le mot et ses options, puis on relit
    if (Object.prototype.hasOwnProperty.call(ENVELOPPES, n)) {
      const avecValeur = ENVELOPPES[n]
      i++
      while (i < tokens.length) {
        const o = tokens[i]
        if (n === 'timeout' && /^\d/.test(o)) { i++; break }
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(o) && n === 'env') { i++; continue }
        if (o.startsWith('-') && o.length > 1) { i += avecValeur.includes(o) ? 2 : 1; continue }
        break
      }
      if (n === 'wsl' && tokens[i] === '--') i++
      continue
    }
    return commande(n, t, tokens.slice(i + 1), ctx)
  }
  return null
}

function commande(n, brut, args, ctx) {
  if (n === 'git') return analyserGit(args, ctx)
  if (NOMS_SUPPRESSION.has(n)) return analyserSuppression(n, args)
  if (n === 'echo' || n === 'write-output' || n === 'write-host' || n === 'printf') return null
  if (n === 'cd' || n === 'chdir' || n === 'set-location' || n === 'sl' || n === 'pushd' || n === 'push-location') {
    const cible = args.find((a) => !a.startsWith('-') && !est_dynamique(a))
    if (cible) ctx.cwd = path.resolve(ctx.cwd, cible)
    return null
  }
  if (SHELLS_C.has(n)) {
    const k = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a))
    if (k >= 0 && args[k + 1] !== undefined) return analyserTexte(args.slice(k + 1).join(' '), { ...ctx, outil: 'Bash' })
    return null
  }
  if (PS_EXE.has(n)) return analyserPowerShell(args, ctx)
  if (n === 'cmd') {
    const k = args.findIndex((a) => /^\/[ckr]$/i.test(a))
    if (k >= 0) return analyserTexte(args.slice(k + 1).join(' '), { ...ctx, outil: 'PowerShell' })
    return null
  }
  if (n === 'invoke-expression' || n === 'iex' || n === 'eval') {
    const reste = args.filter((a, i) => !(i === 0 && /^-c(ommand)?$/i.test(a)))
    return reste.length ? analyserTexte(reste.join(' '), ctx) : null
  }
  if (n === 'start-process' || n === 'saps' || (n === 'start' && ctx.outil === 'PowerShell')) return analyserStartProcess(args, ctx)
  if (n === 'find') return analyserFind(args, ctx)
  if (INTERPRETES.has(n)) return analyserCode(INTERPRETES.get(n), args, ctx)
  if (est_dynamique(brut)) return analyserGit(args, ctx) // `$g reset --hard` : la variable peut être git
  return null
}

// ── git ───────────────────────────────────────────────────────────────────────────────────────────
const OPTIONS_GLOBALES_AVEC_VALEUR = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env', '--attr-source'])
const OPTIONS_GLOBALES_SEULES = new Set(['-p', '-P', '--paginate', '--no-pager', '--no-replace-objects', '--bare', '--literal-pathspecs', '--glob-pathspecs', '--noglob-pathspecs', '--icase-pathspecs', '--no-optional-locks', '--no-lazy-fetch', '--html-path', '--man-path', '--info-path'])

/** Vrai si `mot` est l'option longue `--<nom>` ou une abréviation d'au moins `--<min lettres>` (git accepte les abréviations). */
function longue(mot, nomOption, min = 2, avecValeur = true) {
  if (!mot.startsWith('--') || mot === '--') return false
  const corps = avecValeur ? mot.slice(2).split('=')[0] : mot.slice(2)
  return corps.length >= min && nomOption.startsWith(corps)
}
/** Vrai si `mot` est un groupe d'options courtes (`-fd`, `-xdf`) qui contient la lettre. */
const courte = (mot, lettre) => /^-[A-Za-z]+$/.test(mot) && mot.slice(1).includes(lettre)
const estOption = (mot) => mot.startsWith('-') && mot.length > 1

function analyserGit(args, ctx) {
  let cwd = ctx.cwd
  let i = 0
  const alias = []
  while (i < args.length) {
    const a = args[i]
    if (a === '-C') { if (args[i + 1] !== undefined) cwd = path.resolve(cwd, args[i + 1]); i += 2; continue }
    if (a === '-c') { if (/^alias\./i.test(args[i + 1] || '')) alias.push(args[i + 1]); i += 2; continue }
    if (OPTIONS_GLOBALES_AVEC_VALEUR.has(a)) { i += 2; continue }
    if (/^--(git-dir|work-tree|namespace|exec-path|super-prefix|config-env|attr-source)=/.test(a)) { i++; continue }
    if (OPTIONS_GLOBALES_SEULES.has(a)) { i++; continue }
    break
  }
  const sous = args[i]
  if (sous === undefined) return null
  if (alias.length) refuser('git-alias', `« git -c ${alias[0]} » redéfinit une sous-commande à la volée : on ne peut pas lire ce qu'elle fera.`)
  const reste = args.slice(i + 1)
  const c2 = { ...ctx, cwd }
  switch (sous) {
    case 'restore': return refuser('git-restore', '`git restore` écrase le travail non sauvegardé, sans corbeille.')
    case 'checkout': return regleCheckout(reste, c2)
    case 'switch': return regleSwitch(reste)
    case 'reset': return regleReset(reste)
    case 'clean': return regleClean(reste)
    case 'push': return reglePush(reste)
    case 'rm': return regleRm(reste)
    case 'stash': return regleStash(reste)
    case 'update-ref': return regleUpdateRef(reste)
    case 'reflog': return regleReflog(reste)
    case 'gc': return regleGc(reste)
    case 'prune': return reglePrune(reste)
    default: return null
  }
}

function regleCheckout(reste, ctx) {
  const positionnels = []
  let creation = false
  for (let k = 0; k < reste.length; k++) {
    const a = reste[k]
    if (a === '--') refuser('git-checkout-chemin', '`git checkout … --` remplace des fichiers par la version de l\'index ou d\'un commit.')
    if (a === '.') refuser('git-checkout-point', '`git checkout .` remplace tous les fichiers suivis par la version de l\'index.')
    if (a === '-f' || longue(a, 'force', 2, false) || courte(a, 'f')) refuser('git-checkout-force', '`git checkout --force` jette les modifications locales.')
    if (longue(a, 'pathspec-from-file', 3) || longue(a, 'pathspec-file-nul', 3, false)) refuser('git-checkout-chemin', '`git checkout --pathspec-from-file` remplace des fichiers.')
    if (a === '-p' || longue(a, 'patch', 2, false)) refuser('git-checkout-chemin', '`git checkout --patch` jette des morceaux de modifications.')
    if (a === '-b' || a === '-B' || longue(a, 'orphan', 3)) { creation = true; k++; if (reste[k] === undefined) break; continue }
    if (/^-[bB]./.test(a)) { creation = true; continue }
    if (estOption(a)) { if (longue(a, 'conflict', 3) && !a.includes('=')) k++; continue }
    positionnels.push(a)
  }
  if (creation) return null
  if (positionnels.length >= 2) refuser('git-checkout-chemins', '`git checkout <arbre> <chemin>…` (sans « -- ») remplace des fichiers : plusieurs arguments positionnels.')
  if (positionnels.length === 1) {
    const p = positionnels[0]
    if (/[*?[]/.test(p)) refuser('git-checkout-chemin', `« ${p} » est un motif de chemin : \`git checkout <motif>\` remplace des fichiers.`)
    if (chemin_existe(ctx.cwd, p)) refuser('git-checkout-chemin', `« ${p} » désigne un chemin qui existe : \`git checkout ${p}\` remplacerait ce fichier au lieu de changer de branche.`)
  }
  return null
}
function chemin_existe(cwd, p) {
  try {
    if (!p || p === '-') return false
    return fs.existsSync(path.resolve(cwd, p))
  } catch { return false }
}
function regleSwitch(reste) {
  for (const a of reste) {
    if (a === '--') break
    if (longue(a, 'discard-changes', 2, false) || a === '-f' || longue(a, 'force', 2, false) || courte(a, 'f')) refuser('git-switch-force', '`git switch --discard-changes` (ou `-f`) jette les modifications locales.')
  }
  return null
}
function regleReset(reste) {
  for (const a of reste) {
    if (a === '--') break
    if (longue(a, 'hard', 2, false) || longue(a, 'merge', 3, false)) refuser('git-reset-hard', '`git reset --hard` (ou `--merge`) jette les modifications locales et déplace la branche.')
  }
  return null
}
function regleClean(reste) {
  for (const a of reste) {
    if (a === '--') break
    if (longue(a, 'force', 2, false) || courte(a, 'f')) refuser('git-clean', '`git clean -f` supprime les fichiers non suivis, sans corbeille.')
  }
  return null
}
function reglePush(reste) {
  let apresDoubleTiret = false
  for (let k = 0; k < reste.length; k++) {
    const a = reste[k]
    if (a === '--') { apresDoubleTiret = true; continue }
    if (!apresDoubleTiret && estOption(a)) {
      if (a === '-o' || (longue(a, 'push-option', 3) && !a.includes('='))) { k++; continue }
      if (a === '-f' || courte(a, 'f') || longue(a, 'force-with-lease', 3) || longue(a, 'force-if-includes', 3, false) || longue(a, 'mirror', 3, false)) refuser('git-push-force', '`git push --force` (ou `--force-with-lease`, `--mirror`) réécrit l\'historique distant.')
      continue
    }
    if (a.startsWith('+')) refuser('git-push-force', `« ${a} » : une référence préfixée par « + » force la mise à jour distante.`)
  }
  return null
}
function regleRm(reste) {
  let danger = false
  let cache = false
  for (const a of reste) {
    if (a === '--') break
    if (longue(a, 'cached', 3, false)) { cache = true; continue }
    if (a === '-r' || a === '-f' || courte(a, 'r') || courte(a, 'f') || longue(a, 'force', 3, false) || longue(a, 'recursive', 3, false)) danger = true
  }
  if (danger && !cache) refuser('git-rm-force', '`git rm -r` ou `-f` supprime des fichiers du disque et de l\'index (sans `--cached`).')
  return null
}
function regleStash(reste) {
  const sous = reste.find((a) => !estOption(a))
  if (sous === 'drop' || sous === 'clear') refuser('git-stash-drop', `\`git stash ${sous}\` détruit des instantanés que rien d'autre ne garde.`)
  return null
}
function regleUpdateRef(reste) {
  for (const a of reste) {
    if (a === '--') break
    if (a === '-d' || longue(a, 'delete', 3, false)) refuser('git-update-ref-d', '`git update-ref -d` supprime une référence : les commits qu\'elle tenait deviennent inatteignables.')
  }
  return null
}
function regleReflog(reste) {
  const sous = reste.find((a) => !estOption(a))
  if (sous === 'expire' || sous === 'delete') refuser('git-reflog', `\`git reflog ${sous}\` efface le journal qui permet de retrouver un commit perdu.`)
  return null
}
function regleGc(reste) {
  for (let k = 0; k < reste.length; k++) {
    const a = reste[k]
    if (longue(a, 'prune', 3)) {
      const v = a.includes('=') ? a.split('=').slice(1).join('=') : reste[k + 1]
      if (/^(now|all)$/i.test(v || '') || /^0\b/.test(v || '')) refuser('git-gc-prune', '`git gc --prune=now` supprime tout de suite les objets inatteignables.')
    }
  }
  return null
}
function reglePrune(reste) {
  if (reste.some((a) => /^(now|all)$/i.test(a) || /^--expire=(now|all)$/i.test(a))) refuser('git-gc-prune', '`git prune --expire now` supprime tout de suite les objets inatteignables.')
  return null
}

// ── suppression de fichiers ───────────────────────────────────────────────────────────────────────
function analyserSuppression(n, args) {
  let recursif = false
  let force = false
  for (const a of args) {
    if (a === '--') break
    if (n === 'rd' || n === 'rmdir') { if (/^\/s$/i.test(a)) refuser('rd-s', '`rd /s` (ou `rmdir /s`) supprime un dossier et tout son contenu, sans corbeille.') }
    if ((n === 'del' || n === 'erase') && /^\/s$/i.test(a)) recursif = true
    if ((n === 'del' || n === 'erase') && /^\/[fq]$/i.test(a)) force = true
    const m = /^-([A-Za-z]+)(?::(.*))?$/.exec(a)
    if (m) {
      const nomParam = m[1]
      const valeur = (m[2] || '').toLowerCase()
      const desactive = valeur === '$false' || valeur === '0' || valeur === 'false'
      if (/^(r|re|rec|recu|recur|recurs|recurse)$/i.test(nomParam)) { if (!desactive) recursif = true; continue }
      if (/^(fo|for|forc|force)$/i.test(nomParam)) { if (!desactive) force = true; continue }
      // options courtes de rm (-rf, -fr, -R, -Rf) : chaque lettre compte. Jamais pour un paramètre PowerShell
      // (-Confirm, -LiteralPath) : une majuscule autre que R, ou plus de quatre lettres, n'est pas un groupe d'options courtes.
      if (n !== 'remove-item' && n !== 'ri' && nomParam.length <= 4 && /^[a-zA-Z]+$/.test(nomParam) && nomParam.replace(/R/g, '') === nomParam.replace(/R/g, '').toLowerCase()) {
        if (/[rR]/.test(nomParam)) recursif = true
        if (nomParam.includes('f')) force = true
      }
      continue
    }
    if (a.startsWith('--')) {
      if (longue(a, 'recursive', 3, false)) recursif = true
      if (longue(a, 'force', 3, false)) force = true
    }
  }
  if (recursif && force) refuser('rm-recursif-force', 'Une suppression à la fois récursive et forcée (`rm -rf`, `Remove-Item -Recurse -Force`) efface un dossier entier sans corbeille.')
  return null
}

// ── PowerShell, Start-Process, find, code passé à un interpréteur ─────────────────────────────────
const PS_AVEC_VALEUR = /^-(executionpolicy|ep|windowstyle|w|inputformat|outputformat|version|workingdirectory|configurationname|settingsfile)$/i
function analyserPowerShell(args, ctx) {
  let i = 0
  while (i < args.length) {
    const a = args[i]
    if (/^-(e|ec|enc|encodedcommand)$/i.test(a) || /^-enc(o(d(e(d(c(o(m(m(a(n(d)?)?)?)?)?)?)?)?)?)?)?$/i.test(a)) {
      let decode = ''
      try { decode = Buffer.from(args[i + 1] || '', 'base64').toString('utf16le') } catch { decode = '' }
      return analyserTexte(decode, { ...ctx, outil: 'PowerShell' })
    }
    if (/^-c(o(m(m(a(n(d)?)?)?)?)?)?$/i.test(a)) return analyserTexte(args.slice(i + 1).join(' '), { ...ctx, outil: 'PowerShell' })
    if (/^-f(i(l(e)?)?)?$/i.test(a)) return null
    if (PS_AVEC_VALEUR.test(a)) { i += 2; continue }
    if (a.startsWith('-')) { i++; continue }
    return analyserTexte(args.slice(i).join(' '), { ...ctx, outil: 'PowerShell' })
  }
  return null
}

const SP_AVEC_VALEUR = /^-(workingdirectory|wo|verb|v|windowstyle|wi|redirectstandardoutput|redirectstandarderror|redirectstandardinput|credential|cr|environment)$/i
function analyserStartProcess(args, ctx) {
  let exe = null
  let liste = ''
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (/^-f(i(l(e(p(a(t(h)?)?)?)?)?)?)?$/i.test(a)) { exe = args[++i] ?? null; continue }
    if (/^-a(r(g(u(m(e(n(t(l(i(s(t)?)?)?)?)?)?)?)?)?)?)?$/i.test(a) || /^-args$/i.test(a)) { liste = args[++i] ?? ''; continue }
    if (SP_AVEC_VALEUR.test(a)) { i++; continue }
    if (a.startsWith('-')) continue
    if (exe === null) exe = a
    else if (!liste) liste = a
  }
  if (exe === null) return null
  const texte = `${exe} ${liste.replace(/^@\(|\)$/g, '').replace(/,/g, ' ')}`
  return analyserTexte(texte, { ...ctx, outil: 'PowerShell' })
}

function analyserFind(args, ctx) {
  for (let i = 0; i < args.length; i++) {
    if (['-exec', '-execdir', '-ok', '-okdir'].includes(args[i])) {
      let j = i + 1
      const morceau = []
      while (j < args.length && args[j] !== ';' && args[j] !== '+' && args[j] !== '\\;') morceau.push(args[j++])
      analyserMots(morceau, ctx)
      i = j
    }
  }
  return null
}

/** Le code passé à `node -e`, `python -c`, `deno eval` : une chaîne littérale qui nomme git est lue comme une commande. */
function analyserCode(options, args, ctx) {
  const k = args.findIndex((a) => options.includes(a) || (a.startsWith('--eval=') && options.includes('--eval')))
  if (k < 0) return null
  const code = args[k].includes('=') && args[k].startsWith('--eval=') ? args[k].slice(7) : args.slice(k + 1).join(' ')
  const litteraux = []
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/gs
  let m
  while ((m = re.exec(code)) !== null) litteraux.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(['"`\\])/g, '$1'))
  for (let j = 0; j < litteraux.length; j++) {
    const l = litteraux[j].trim()
    if (nom(l.split(/\s+/)[0] || '') === 'git') {
      // « git » seul, puis ses arguments en chaînes séparées (spawnSync('git', ['clean', '-fd'])) : on recolle
      analyserTexte(`${l} ${litteraux.slice(j + 1).join(' ')}`, ctx)
    } else if (l) analyserTexte(l, ctx)
  }
  if (/\b(rmSync|rmdirSync|rmtree|rimraf|removeSync|emptyDirSync)\b/.test(code) && /(recursive|force|rmtree|rimraf|removeSync|emptyDirSync)/.test(code)) {
    refuser('code-suppression', 'Du code passé à l\'interpréteur supprime des fichiers de façon récursive : ce code n\'a pas de raison de le faire en ligne de commande.')
  }
  return null
}

// ── un texte de commande entier ───────────────────────────────────────────────────────────────────
function analyserTexte(texte, ctx) {
  if (ctx.profondeur >= PROFONDEUR_MAX) return null
  const suite = { ...ctx, profondeur: ctx.profondeur + 1 }
  const extras = []
  if (++ETAT.appels > APPELS_MAX) return null
  // une commande coupée par « \ » (Bash) ou « ` » (PowerShell) en fin de ligne reste une seule commande
  const continuee = suite.outil === 'Bash' ? String(texte).replace(/\\\r?\n/g, ' ') : String(texte).replace(/`\r?\n/g, ' ')
  const propre = suite.outil === 'Bash' ? retirerHeredocs(continuee, extras) : continuee
  const { segments, extras: internes } = decouper(propre, suite.outil)
  extras.push(...internes)
  let dernierEcho = null
  for (const s of segments) {
    const tokens = mots(s.texte, suite.outil)
    if (!tokens.length) continue
    const tete = nom(tokens[0])
    // « echo "rm -rf x" | bash », « 'rm -rf x' | iex » : le texte envoyé dans le tube devient la commande
    if (s.sep === '|' && dernierEcho && (SHELLS_C.has(tete) || PS_EXE.has(tete) || tete === 'iex' || tete === 'invoke-expression') && !tokens.slice(1).some((a) => /^-[a-zA-Z]*c/.test(a))) {
      analyserTexte(dernierEcho, suite)
    }
    dernierEcho = (tete === 'echo' || tete === 'write-output' || tete === 'write-host' || tete === 'printf') ? tokens.slice(1).filter((a) => !/^-[neE]+$/.test(a)).join(' ')
      : (tokens.length === 1 && /s/.test(tokens[0]) ? tokens[0] : null)
    analyserMots(tokens, suite)
  }
  for (const e of extras) analyserTexte(e, suite)
  return null
}

// ── le crochet ────────────────────────────────────────────────────────────────────────────────────
function principal() {
  const entree = analyserEntree(lireStdin())
  const outil = entree.tool_name
  if (outil !== 'Bash' && outil !== 'PowerShell') return 0
  const ti = entree.tool_input && typeof entree.tool_input === 'object' ? entree.tool_input : {}
  const commandeTexte = typeof ti.command === 'string' ? ti.command : ''
  if (!commandeTexte.trim() || commandeTexte.length > LONGUEUR_MAX) return 0
  let cwd = process.cwd()
  if (typeof entree.cwd === 'string' && entree.cwd.trim()) cwd = path.resolve(entree.cwd)
  try {
    analyserTexte(commandeTexte, { outil, cwd, profondeur: 0 })
  } catch (e) {
    if (e instanceof Refus) {
      process.stderr.write(`git-garde : commande refusée (règle ${e.regle}). ${e.detail} ${ISSUE}\n`)
      return 2
    }
    return 0 // erreur imprévue du crochet lui-même : on ne bloque pas l'agent
  }
  return 0
}

let code = 0
try { code = principal() } catch { code = 0 }
process.exitCode = code
