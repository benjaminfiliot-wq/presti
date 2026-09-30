#!/usr/bin/env node
// verifier-usine.mjs <id> — la commande `verifier` d'une fiche, jouée SUR L'USINE (Oracle, 4 cœurs, 24 Go) au lieu du PC (8 Go, saturé).
// Écrit le verdict exactement comme `node scripts/orchestre.mjs verifier <id>` (mêmes règles : code 0, aucune preuve de 0 octet,
// decisions.md intact ; même ligne dans .orchestre/verdicts.jsonl, plus "machine":"usine" ; même digest, même « ✓/✗ <id> : PASS/FAIL »,
// fiche fait/ → refuse/ si FAIL). Ne modifie PAS scripts/orchestre.mjs : le digest est régénéré par `orchestre.mjs digest`.
//
// Comment : `node scripts/usine.mjs executer --nom=verif-<id> --delai=<budget> --id=<id> --rapatrier=.orchestre/preuves/<id> -- bash -c '<verifier>'`
// (le bac de l'usine = HEAD du PC + non commités, comme pour tout executer ; les preuves écrites par la commande reviennent sur le PC).
// Un `verifier` qui est déjà un `usine.mjs executer …` tourne tel quel sur la même usine (executer sait qu'il y est : sans paquet ni ssh).
//
// Codes : 0 PASS ; 1 FAIL ; 2 usage ou panne de l'outil ; 3 « à vérifier sur le PC » (RIEN n'est écrit : ni verdict, ni déplacement de fiche).
// Code 3, dans quatre cas — un verdict de l'usine qui pourrait être faux ne vaut jamais un FAIL, qui rangerait la fiche en refuse/ :
//   1. la commande a besoin de secrets ou de choses que l'usine n'a pas (--reel, --live, .env*, service_role, Stripe, SUPABASE_*, clés…) ;
//   2. l'usine n'a pas jugé (paquet refusé, bac indisponible, ssh coupé, délai, commande tuée : codes 124 / 125 de executer) ;
//   3. la commande a échoué en parlant de secrets ou de fichiers absents du bac (ENOENT, module introuvable, .env.local, service_role…) ;
//   4. PRESTI_VERIFIER_PC=1 (le PC est demandé).
// PRESTI_RACINE ne sert qu'au banc d'essai (juges-croises-qa.mjs) : un dépôt jetable. Fin de script par process.exitCode (Node 24 sous Windows).
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'

const R = path.resolve(process.env.PRESTI_RACINE || 'C:/Users/benja/Documents/presti')
const ORCH = path.join(R, '.orchestre')
const id = process.argv[2] || ''
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const sortir = (code) => { process.exitCode = code }
const pc = (raison) => { console.log(`→ ${id} : à vérifier sur le PC — ${raison}`); sortir(3) }

// Le code de la fonction principale est dans une fonction : un `return` remplace l'ancien process.exit (assertion libuv de Node 24 sous Windows).
async function principal() {
  if (!/^(?:\d{3}-[\w-]+|dem-[0-9a-f]{8})$/.test(id)) { console.error('usage : node verifier-usine.mjs <id>'); return sortir(2) }
  if (process.env.PRESTI_VERIFIER_PC === '1') return pc('PRESTI_VERIFIER_PC=1')
  process.chdir(R)
  const fichier = ['fait', 'en-cours'].map((d) => path.join(ORCH, d, `${id}.md`)).find(existe)
  if (!fichier) { console.error(`✗ ${id} : ni dans fait/ ni dans en-cours/`); return sortir(2) }
  const dossier = path.basename(path.dirname(fichier))

  // ── l'en-tête de la fiche, lu comme l'orchestre le lit ────────────────────────────────────────────────────
  const m = lire(fichier).match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) { console.error(`✗ ${id} : pas d'en-tête YAML`); return sortir(2) }
  const champ = {}
  for (const l of m[1].split(/\r?\n/)) {
    const s = l.replace(/\s+#.*$/, ''); const i = s.indexOf(':')
    if (i < 1 || /^\s/.test(s) || s.startsWith('#')) continue
    champ[s.slice(0, i).trim()] = s.slice(i + 1).trim()
  }
  const sansGuillemets = (v) => (/^(['"])(.*)\1$/.test(v) ? v.slice(1, -1) : v)
  const verifierCmd = sansGuillemets(champ.verifier || '')
  const liste = (v) => (/^\[.*\]$/.test(v || '') ? v.slice(1, -1).split(',').map((x) => sansGuillemets(x.trim())).filter(Boolean) : [])
  const perimetre = liste(champ.perimetre)
    const config = (() => { try { return JSON.parse(lire(path.join(ORCH, 'orchestre.json'))) } catch { return {} } })()
  const maxMinutes = Number(config.maxMinutes) > 0 ? Number(config.maxMinutes) : 30
  const minutes = Math.min(Number((champ.budget || '').match(/minutes:\s*(\d+)/)?.[1]) || maxMinutes, maxMinutes)
  if (!verifierCmd) { console.error(`✗ ${id} : champ verifier absent`); return sortir(2) }
  const executantOrch = champ.executant || (Array.isArray(config.executants) && config.executants[0]) || 'antigravity'

  // ── 1. les secrets : « à vérifier sur le PC » ─────────────────────────────────────────────────────────────
  const SECRETS = /--reel\b|--live\b|--prod(uction)?\b|(^|[\s"'=\/\\])\.env(\.[\w-]+)?\b|service[_-]?role|stripe|SUPABASE_|presti-secrets|RESEND_|VERCEL_TOKEN|CRON_SECRET|API_KEY|process\.env|IMAP_|--vrai\b|--avec-secrets/i
  const s1 = verifierCmd.match(SECRETS)
  if (s1) return pc(`la commande verifier a besoin de secrets ou du poste (« ${s1[0].trim()} ») : jamais envoyée à l'usine`)

  // L'usine part d'origin/main : un HEAD pas encore poussé (commit d'une autre session en vol) est attendu quelques minutes, jamais poussé d'ici.
  if (!process.env.PRESTI_SANS_ATTENTE_HEAD) {
    const { headPousse } = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'head-pousse.mjs')).href)
    const h = headPousse({ cwd: R, maxS: Number(process.env.PRESTI_ATTENTE_HEAD_S) || 240 })
    if (!h.ok) return pc(`HEAD du PC (${h.tete}) toujours pas poussé après ${h.attenteS} s : l'usine part d'origin/main`)
  }

  // ── 2. la commande, sur l'usine ───────────────────────────────────────────────────────────────────────────
  const nom = `verif-${id}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32)
  const argv = ['scripts/usine.mjs', 'executer', `--nom=${nom}`, `--delai=${Math.max(5, minutes)}`, '--attendre=5', `--id=${id}`, `--rapatrier=.orchestre/preuves/${id}`, '--', 'bash', '-c', verifierCmd]
  const debut = Date.now()
  console.error(`· verifier-usine ${id} : ${verifierCmd.slice(0, 160)}${verifierCmd.length > 160 ? '…' : ''}  (bac ${nom}, délai ${minutes} min)`)
  const r = await new Promise((resoudre) => {
    const e = spawn(process.execPath, argv, { cwd: R, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let sortie = ''
    e.stdout.setEncoding('utf8'); e.stderr.setEncoding('utf8')
    e.stdout.on('data', (d) => { sortie += d }); e.stderr.on('data', (d) => { sortie += d })
    const garde = setTimeout(() => { try { spawnSync('taskkill', ['/PID', String(e.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) } catch { /* fini */ } }, (minutes + 25) * 60_000)
    e.on('close', (code) => { clearTimeout(garde); resoudre({ code: code ?? 125, sortie }) })
    e.on('error', (err) => { clearTimeout(garde); resoudre({ code: 125, sortie: `${sortie}\n${err.message}` }) })
  })
  const duree = Math.round((Date.now() - debut) / 1000)
  const brut = r.sortie.replace(/\x1b\[[0-9;]*m/g, '')
  // Les lignes de la MISE EN PLACE de executer (paquet, bac, retour) ne sont pas celles de la commande : hors de l'analyse du verdict.
  const bruit = (l) => /usine executer|^\s+(contrôle ✓|ne part pas)|^\s{4}[ADMRT]\s{2}\S|^\s+· écarté|^\s{4}\S+\s+\d+ octets$/.test(l)
  const lignes = brut.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !bruit(l))

  let code = r.code
  // Executer rend 125 « preuve absente » quand la commande a rendu 0 mais n'a rien écrit sous preuves/<id>/ : pour l'orchestre, ce n'est pas un échec.
  const aucunFichier = code === 125 && new RegExp(`--rapatrier=\\.orchestre/preuves/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} : aucun fichier écrit par la commande`).test(brut) && !/verdict non rendu/.test(brut)
  if (aucunFichier) code = 0
  // 124 (délai de l'usine) et 125 (rien lancé, ssh coupé, commande tuée…) : l'usine n'a PAS jugé.
  if (!aucunFichier && (code === 124 || code === 125 || code === 3)) {
    const motif = brut.split(/\r?\n/).filter((l) => /^✗/.test(l.trim())).slice(-1)[0]?.trim() || `usine executer a rendu ${code}`
    return pc(`l'usine n'a pas rendu de verdict (${motif.slice(0, 200)})`)
  }
  if (code !== 0) {
    const s3 = brut.match(/\.env(\.local)?\b|service[_-]?role|SUPABASE_[A-Z_]+|STRIPE_[A-Z_]+|RESEND_[A-Z_]+|ENOENT|ERR_MODULE_NOT_FOUND|Cannot find module|clé de service|missing (env|key)/i)
    if (s3) return pc(`la commande a échoué en parlant de secrets ou de fichiers absents du bac (« ${s3[0]} ») : un FAIL de l'usine pourrait être faux, le PC rejuge`)
  }

  // ── 3. le verdict, avec les règles de l'orchestre ─────────────────────────────────────────────────────────
  const journal = path.join(ORCH, 'preuves', id, 'verifier.log')
  fs.mkdirSync(path.dirname(journal), { recursive: true })
  fs.writeFileSync(journal, `$ ${champ.verifier}\n# ${maintenant()} · code ${code} · ${duree}s · machine usine\n\n${brut}`)
  const { fichiersVides } = await import(pathToFileURL(path.join(R, 'scripts', 'lib', 'preuves.mjs')).href)
  const vides = fichiersVides(path.join(ORCH, 'preuves', id)).map((v) => path.basename(v))
  // La quarantaine des décisions (ORB-9) : la même règle que l'orchestre.
  const sansQuarantaine = (texte) => {
    const i = texte.indexOf('## Proposées (quarantaine)')
    if (i < 0) return texte
    const reste = texte.slice(i); const j = reste.indexOf('\n## ', 1)
    return texte.slice(0, i) + texte.slice(j < 0 ? texte.length : i + j)
  }
  let violationDecisions = null
  const decisionsAvant = path.join(ORCH, 'preuves', id, 'decisions-avant.md')
  if (existe(decisionsAvant)) {
    const actuel = existe(path.join(ORCH, 'decisions.md')) ? lire(path.join(ORCH, 'decisions.md')) : ''
    if (sansQuarantaine(lire(decisionsAvant)) !== sansQuarantaine(actuel)) violationDecisions = 'decisions.md modifié hors de « ## Proposées (quarantaine) » depuis la prise de la tâche'
  }
  const verdict = code === 0 && !vides.length && !violationDecisions ? 'PASS' : 'FAIL'
  const ligne = verdict === 'PASS' ? '' : (violationDecisions || (vides.length ? `preuve vide : ${vides.slice(0, 4).join(', ')}` :
    (lignes.find((l) => /ÉCHEC|ECHEC|FAIL|✗|Error|Erreur|not ok|AssertionError/i.test(l)) || lignes.at(-1) || `code ${code}`))).slice(0, 160)

  // Le bail : un exécutant qui vérifie est vivant (battement), comme dans l'orchestre.
  const cheminLock = path.join(ORCH, 'en-cours', `${id}.lock`)
  const lock = {}
  if (existe(cheminLock)) for (const l of lire(cheminLock).split(/\r?\n/)) { const i = l.indexOf(':'); if (i > 0) lock[l.slice(0, i).trim()] = l.slice(i + 1).trim() }
  if (existe(cheminLock)) {
    const l = [`agent: ${lock.agent || ''}`, `depuis: ${lock.depuis || ''}`, `battement: ${maintenant()}`, `sha: ${lock.sha || ''}`]
    fs.writeFileSync(cheminLock, l.join('\n') + '\n')
  }
  // Les lignes produites depuis le sha de la prise (même calcul que compterLignes).
  const git = (...a) => { try { return spawnSync('git', a, { cwd: R, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true }).stdout || '' } catch { return '' } }
  const production = (() => {
    const sha = lock.sha
    if (!sha || sha.startsWith('(')) return 0
    const vault = config.vault ? `${path.basename(path.resolve(R, config.vault))}/` : null
    const chemins = perimetre.map((g) => String(g).replace(/\\/g, '/').split(/[*?{]/)[0]).filter((p) => p && !(vault && p.startsWith(vault)) && !p.startsWith('../'))
    if (!chemins.length) return 0
    let total = 0
    for (const l of git('diff', '--numstat', sha, '--', ...chemins).split('\n')) { const x = l.match(/^(\d+)\t(\d+)\t/); if (x) total += Number(x[1]) + Number(x[2]) }
    for (const f of git('ls-files', '--others', '--exclude-standard', '--', ...chemins).split('\n').filter(Boolean)) { try { total += lire(path.join(R, f)).split('\n').length } catch { /* binaire ou disparu */ } }
    return total
  })()
  fs.appendFileSync(path.join(ORCH, 'verdicts.jsonl'), JSON.stringify({ id, verdict, ligne, code, date: maintenant(), duree_s: duree, agent: lock.agent || '?', executant: executantOrch, lignes: production, dossier, machine: 'usine' }) + '\n')
  if (dossier === 'fait') {
    if (verdict === 'FAIL') { fs.mkdirSync(path.join(ORCH, 'refuse'), { recursive: true }); fs.renameSync(fichier, path.join(ORCH, 'refuse', path.basename(fichier))) }
    for (const suffixe of ['.lock', '.avant.txt', '.question.md', '.reponse.md']) { const q = path.join(ORCH, 'en-cours', id + suffixe); if (existe(q)) fs.unlinkSync(q) }
  }
  // Le digest (et le contexte si PASS) : par l'orchestre lui-même, qui reste seul à les écrire.
  const orch = (...a) => spawnSync(process.execPath, ['scripts/orchestre.mjs', ...a], { cwd: R, encoding: 'utf8', windowsHide: true, timeout: 5 * 60_000 })
  orch('digest')
  if (verdict === 'PASS') orch('contexte', '--silencieux')
  console.log(`${verdict === 'PASS' ? '✓' : '✗'} ${id} : ${verdict}${ligne ? ' — ' + ligne : ''} · ${duree}s · ${production} ligne(s) produite(s) · preuve : ${path.relative(R, journal).split(path.sep).join('/')} · machine : usine`)
  if (verdict === 'PASS') console.log('→ bloc terminé : /compact conseillé (et /clear entre deux chantiers)')
  sortir(verdict === 'PASS' ? 0 : 1)
}
await principal()
