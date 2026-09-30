// scripts/usine-veille.mjs — la veille de l'usine : rapatrie les tâches Codex FINIES sur l'usine que personne ne suit
// (écrit le 25/09/2026, après le contre-examen de l'usine : « Rien d'automatique : Claude Code lance `lancer`, puis
// `recuperer` » — une tâche finie pendant que la session qui l'a lancée est fermée attendait sur le serveur).
//
// Usage (depuis C:/Users/benja/Documents/presti) :
//   node scripts/usine-veille.mjs [--essai] [--grace=30] [--boucle=<minutes>]
//     --essai            dit ce qu'il ferait, sans rien faire : ni recuperer ni nettoyer, aucun fichier écrit, ssh en lecture seule
//     --grace=<min>      une tâche finie depuis moins de <min> minutes est laissée à l'agent qui l'a lancée (défaut 30)
//     --boucle=<min>     un passage toutes les <min> minutes, jusqu'à Ctrl+C, SIGTERM ou le fichier
//                        .orchestre/travail/usine/veille.stop ; l'étape en cours (recuperer) n'est JAMAIS coupée.
//                        Sans --boucle (la tâche planifiée), ce même fichier met la veille en pause : rien n'est fait tant qu'il est là.
//     --simuler=<json>   rejoue un état de l'usine écrit à la main (essai forcé) : pour éprouver les décisions
//
// Un passage :
//   1. lit l'état des tâches sur l'usine (~/taches/<id>/ : code, pid vivant, marque `recupere`, etat.json), par ssh, en lecture seule ;
//   2. lit, sur le PC, les processus node qui ont `usine.mjs` dans leur ligne de commande (un `recuperer --attendre`,
//      un `lancer`… en cours pour cette tâche = un agent la suit) ;
//   3. choisit, pour chaque tâche : ne rien faire (en cours, déjà récupérée, fiche absente de en-cours/, suivie, finie depuis
//      moins de --grace, déjà rapatriée une fois…) ou la RAPATRIER ;
//   4. rapatrie, une tâche à la fois : `node scripts/usine.mjs recuperer <id>` (qui applique, passe la fiche en fait/ et
//      juge SUR LE PC), puis `node scripts/usine.mjs nettoyer <id>` si le verdict du PC est PASS ;
//   5. écrit une ligne par tâche rapatriée dans .orchestre/travail/usine/veille.jsonl (date, id, verdicts, durées) et le
//      résumé lisible du dernier passage dans .orchestre/travail/usine/veille-dernier.txt (tous deux ignorés par git).
// Il ne lance JAMAIS de tâche Codex (ni `lancer`, ni `executer`), ne committe jamais, ne touche ni scripts/usine.mjs ni
// scripts/orchestre.mjs : il appelle `recuperer` et `nettoyer` comme le ferait Claude Code, et leurs règles s'appliquent
// (le PC ne garde que ce que SON verdict juge PASS ; un rouge retire le patch).
// Prudence : dans le doute, il ne fait rien et le dit — processus du PC illisibles, patch déjà appliqué sans verdict
// (un `recuperer` tourne peut-être ailleurs), tâche déjà rapatriée une fois sans être appliquée (verdict de l'usine
// QUESTION, FAIL, QUOTA… ou `git apply --check` refusé) : ces cas-là sont pour un humain ou pour la session qui suit la tâche.
// Codes : 0 passage fait ; 1 un rapatriement n'a pas rendu PASS ; 2 usage ; 3 une autre veille tourne ; 5 usine injoignable.
// Doc : C:/Users/benja/Documents/presti-ops/usine/LISEZMOI.md, section « La veille : rapatriement automatique ».
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORCH = path.join(RACINE, '.orchestre')
const TRAVAIL = path.join(ORCH, 'travail', 'usine')
const JOURNAL = path.join(TRAVAIL, 'veille.jsonl')
const RESUME = path.join(TRAVAIL, 'veille-dernier.txt')
const VERROU = path.join(TRAVAIL, 'veille.verrou')
const ARRET = path.join(TRAVAIL, 'veille.stop')
const USINE = path.join(RACINE, 'scripts', 'usine.mjs')
// Mêmes hôte, clé et options que scripts/usine.mjs (PRESTI_USINE=usine@<ip> si l'instance a été recréée).
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const SSH = ['-i', path.join(os.homedir(), '.ssh', 'presti-usine'), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30']
const ID_VALIDE = /^\d{3}-[\w-]+$/

const args = process.argv.slice(2)
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : defaut }
const inconnues = args.filter((a) => !/^--(essai|grace=\d+|boucle=\d+|simuler=.+)$/.test(a))
if (inconnues.length) { console.error(`✗ option inconnue : ${inconnues.join(' ')}\n  node scripts/usine-veille.mjs [--essai] [--grace=30] [--boucle=<minutes>] [--simuler=<etat.json>]`); process.exit(2) }
const SIMULER = option('simuler')
const ESSAI = option('essai') === 'oui' || !!SIMULER
const GRACE_MIN = Number(option('grace', '30'))
const BOUCLE_MIN = option('boucle') ? Number(option('boucle')) : 0
if (BOUCLE_MIN && BOUCLE_MIN < 1) { console.error('✗ --boucle=<minutes> : 1 au moins'); process.exit(2) }

const maintenantIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const ouEstLaFiche = (id) => ['en-cours', 'fait', 'refuse', 'file'].find((d) => fs.existsSync(path.join(ORCH, d, `${id}.md`))) || null
const minutes = (s) => `${Math.round(s / 60)} min`
const secondes = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`

// ── 1. l'état de l'usine (lecture seule) ─────────────────────────────────────────────────────────────────────
// Une ligne par tâche : TACHE id code(-) date-du-code vivant(0/1) marque-recupere(-) etat.json. Horloge de l'usine
// (MAINTENANT) : les âges sont calculés avec elle, pas avec celle du PC. Sans la ligne FIN, la lecture est tenue pour ratée.
const LIRE_USINE = `
set -uo pipefail
echo "MAINTENANT $(date +%s)"
for d in "$HOME"/taches/*/; do
  [ -d "$d" ] || continue
  id=$(basename "$d"); code=-; tcode=0; vivant=0; rec=-; etat=null
  if [ -f "$d/code" ]; then code=$(tr -dc '0-9' < "$d/code"); tcode=$(stat -c %Y "$d/code"); fi
  if [ -f "$d/pid" ] && kill -0 "$(cat "$d/pid")" 2>/dev/null; then vivant=1; fi
  [ -f "$d/recupere" ] && rec=$(head -c 80 "$d/recupere" | tr -d '\\n\\t')
  [ -f "$d/etat.json" ] && etat=$(jq -c . "$d/etat.json" 2>/dev/null || echo null)
  printf 'TACHE\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "$id" "\${code:--}" "$tcode" "$vivant" "\${rec:--}" "$etat"
done
echo FIN
`
function lireUsine() {
  if (SIMULER) {
    const s = JSON.parse(fs.readFileSync(path.resolve(SIMULER), 'utf8'))
    return { maintenant: s.maintenant ?? Math.floor(Date.now() / 1000), taches: s.taches || [] }
  }
  const r = spawnSync('ssh', [...SSH, HOTE, 'bash -s'], { input: LIRE_USINE, encoding: 'utf8', timeout: 90_000, windowsHide: true, maxBuffer: 1 << 24 })
  const sortie = r.stdout || ''
  if (r.error || r.status !== 0 || !/^FIN$/m.test(sortie)) return { erreur: `ssh ${HOTE} : ${r.error?.message || String(r.stderr || '').trim().split('\n').pop() || `code ${r.status}`}` }
  const maintenant = Number((sortie.match(/^MAINTENANT (\d+)$/m) || [])[1] || Math.floor(Date.now() / 1000))
  const taches = sortie.split('\n').filter((l) => l.startsWith('TACHE\t')).map((l) => {
    const [, id, code, tcode, vivant, rec, ...etat] = l.split('\t')
    let e = null
    try { e = JSON.parse(etat.join('\t')) } catch { /* etat.json illisible */ }
    return { id, code: code === '-' || code === '' ? null : Number(code), tcode: Number(tcode) || 0, vivant: vivant === '1', recupere: rec === '-' ? null : rec, etat: e }
  })
  return { maintenant, taches }
}

// ── 2. qui suit une tâche sur le PC ────────────────────────────────────────────────────────────────────────
// Les processus node dont la ligne de commande contient usine.mjs (recuperer --attendre, lancer, executer --id=…).
// null = illisible : la veille ne fait alors rien.
function processusUsinePC() {
  let liste
  if (process.platform === 'win32') {
    // En JSON : un objet seul s'il n'y a qu'un processus node, un tableau sinon ; rien du tout s'il n'y en a aucun.
    const ps = "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 90_000 })
    if (r.error || r.status !== 0) return null
    try { const j = r.stdout.trim() ? JSON.parse(r.stdout) : []; liste = (Array.isArray(j) ? j : [j]).map((p) => ({ pid: Number(p.ProcessId), ligne: String(p.CommandLine || '') })) } catch { return null }
  } else {
    const r = spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8', timeout: 30_000 })
    if (r.error || r.status !== 0) return null
    liste = r.stdout.split('\n').map((l) => l.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean).map((m) => ({ pid: Number(m[1]), ligne: m[2] }))
  }
  return liste.filter((p) => p.pid && p.pid !== process.pid && /usine\.mjs/i.test(p.ligne) && !/usine-veille\.mjs/i.test(p.ligne))
}
const suiviePar = (procs, id) => procs.filter((p) => new RegExp(`(^|[\\s"'=])${id.replace(/[-]/g, '\\-')}($|[\\s"'])`).test(p.ligne))

// ── 3. la décision, tâche par tâche ────────────────────────────────────────────────────────────────────────
function decider(t, maintenant, procs) {
  const rien = (etat, raison) => ({ action: 'rien', etat, raison })
  if (!ID_VALIDE.test(t.id)) return rien('?', 'identifiant hors de la règle NNN-slug : ignorée')
  const v = t.etat?.verdict || '—'
  if (t.code === null) return t.vivant ? rien('en cours', `tour ${t.etat?.tour ?? '?'}, depuis ${t.etat?.debut ?? '?'}`) : rien('arrêtée sans code', `le tourneur est mort sans code de fin : à regarder à la main (node scripts/usine.mjs recuperer ${t.id} --forcer, ou nettoyer --forcer)`)
  const ici = path.join(TRAVAIL, t.id)
  const juge = lireJson(path.join(ici, 'verdict-pc.json'))
  const ou = ouEstLaFiche(t.id)
  if (t.recupere) {
    const aNettoyer = juge?.verdict === 'PASS' && ou === 'fait'
    return rien(`finie (code ${t.code}), récupérée`, `marque « ${t.recupere} »${aNettoyer ? ` ; pas encore nettoyée : node scripts/usine.mjs nettoyer ${t.id}` : ''}`)
  }
  const fin = t.etat?.fin ? Math.floor(Date.parse(t.etat.fin) / 1000) : t.tcode
  const age = Math.max(0, maintenant - fin)
  const etat = `finie il y a ${minutes(age)} (code ${t.code}, verdict de l'usine ${v})`
  if (ou !== 'en-cours') return rien(etat, `fiche en ${ou || 'aucun dossier de l’orchestre'}/ sur le PC, pas en en-cours/ : recuperer n'a rien à y appliquer`)
  if (juge) return rien(etat, `verdict du PC déjà rendu (${juge.verdict}, ${juge.date}) : recuperer le redirait`)
  if (fs.existsSync(path.join(ici, 'applique.json'))) return rien(etat, 'patch déjà appliqué sur le PC sans verdict : un recuperer tourne peut-être ailleurs, ou a été interrompu → à reprendre à la main (recuperer rejuge)')
  if (procs === null) return rien(etat, 'processus du PC illisibles : impossible de savoir si un agent la suit, je ne touche à rien')
  const suivi = suiviePar(procs, t.id)
  if (suivi.length) return rien(etat, `suivie sur le PC par ${suivi.map((p) => `pid ${p.pid} (${p.ligne.replace(/^.*?usine\.mjs/i, 'usine.mjs').slice(0, 60)})`).join(', ')}`)
  if (age < GRACE_MIN * 60) return rien(etat, `finie depuis moins de ${GRACE_MIN} min (--grace) : laissée à l'agent qui l'a lancée`)
  const local = lireJson(path.join(ici, 'etat.json'))
  if (local?.fin && local.fin === t.etat?.fin) return rien(etat, `déjà rapatriée une fois (etat.json du ${local.fin} dans ${path.relative(RACINE, ici).split(path.sep).join('/')}/) sans être appliquée${v !== 'PASS' ? ` : verdict de l'usine ${v}` : ' (git apply --check refusé ?)'} → à traiter à la main, la veille ne rejoue pas`)
  return { action: 'recuperer', etat, raison: `personne ne la suit : je la rapatrie (recuperer${v === 'PASS' ? ', puis nettoyer si le PC rend PASS' : ` : verdict de l'usine ${v}, rien ne sera appliqué`})`, age, fin }
}

// ── 4. l'action : recuperer, puis nettoyer si PASS — un enfant à la fois, jamais coupé ─────────────────────────────
let enfantEnCours = null
function usineMjs(argv, sortieVers) {
  return new Promise((resoudre) => {
    const debut = Date.now()
    // detached : l'enfant a sa propre console (Windows) ou son propre groupe (Linux) ; un Ctrl+C sur la veille ne le coupe
    // donc pas au milieu d'un git apply — la veille attend sa fin, puis s'arrête.
    const enfant = spawn(process.execPath, [USINE, ...argv], { cwd: RACINE, detached: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    enfantEnCours = { argv, pid: enfant.pid }
    let texte = ''
    const relayer = (b) => { const s = b.toString(); texte += s; process.stdout.write(s.replace(/^(?=.)/gm, '    │ ')) }
    enfant.stdout.on('data', relayer); enfant.stderr.on('data', relayer)
    const fin = (code) => {
      enfantEnCours = null
      if (sortieVers) fs.appendFileSync(sortieVers, `# ${maintenantIso()} · node scripts/usine.mjs ${argv.join(' ')} · code ${code} · ${secondes(Date.now() - debut)}\n${texte}\n`)
      resoudre({ code, texte, ms: Date.now() - debut })
    }
    enfant.on('close', (code) => fin(code ?? 1))
    enfant.on('error', (e) => { texte += String(e.message); fin(127) })
  })
}
async function rapatrier(t, d) {
  const ici = path.join(TRAVAIL, t.id)
  fs.mkdirSync(ici, { recursive: true })
  const log = path.join(ici, 'veille.log')
  const debut = Date.now()
  console.log(`  → node scripts/usine.mjs recuperer ${t.id}`)
  const r = await usineMjs(['recuperer', t.id], log)
  const juge = lireJson(path.join(ici, 'verdict-pc.json'))
  const verdictPC = juge?.verdict || null
  let n = null
  if (r.code === 0 && verdictPC === 'PASS' && ouEstLaFiche(t.id) === 'fait') {
    console.log(`  → node scripts/usine.mjs nettoyer ${t.id}`)
    n = await usineMjs(['nettoyer', t.id], log)
  }
  const derniere = r.texte.trim().split('\n').filter((l) => /^[✓✗?⚠…]/.test(l.trim())).pop() || r.texte.trim().split('\n').pop() || ''
  const ligne = {
    date: maintenantIso(), id: t.id, agent: t.etat?.agent || null,
    verdict_usine: t.etat?.verdict || null, code_usine: t.code,
    recuperer: r.code, verdict_pc: verdictPC, ligne_pc: juge?.ligne || null, patch_retire: juge?.retire ?? null,
    nettoye: n ? n.code === 0 : false, nettoyer: n ? n.code : null,
    fiche: ouEstLaFiche(t.id),
    durees_s: {
      codex_usine: t.etat?.debut && t.etat?.fin ? Math.round((Date.parse(t.etat.fin) - Date.parse(t.etat.debut)) / 1000) : null,
      attente_avant_veille: d.age,
      recuperer: Math.round(r.ms / 1000), nettoyer: n ? Math.round(n.ms / 1000) : null,
      total_veille: Math.round((Date.now() - debut) / 1000),
    },
    fin_recuperer: derniere.trim().slice(0, 200),
  }
  fs.appendFileSync(JOURNAL, JSON.stringify(ligne) + '\n')
  const ok = r.code === 0 && verdictPC === 'PASS'
  return { ok, texte: `${ok ? '✓' : '✗'} ${t.id} : recuperer code ${r.code}, verdict du PC ${verdictPC || 'aucun'}${n ? `, nettoyer code ${n.code}` : ''} · ${secondes(r.ms)}${n ? ` + ${secondes(n.ms)}` : ''} — ${derniere.trim().slice(0, 140)}` }
}

// ── le verrou : une seule veille à la fois (essai exclu : il n'écrit rien) ───────────────────────────────────────
function prendreVerrou() {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  for (let essai = 0; essai < 2; essai++) {
    try {
      const fd = fs.openSync(VERROU, 'wx')
      fs.writeSync(fd, `${process.pid} ${maintenantIso()}\n`); fs.closeSync(fd)
      process.on('exit', () => { try { if (fs.readFileSync(VERROU, 'utf8').startsWith(`${process.pid} `)) fs.unlinkSync(VERROU) } catch { /* déjà retiré */ } })
      return true
    } catch {
      const [pid, depuis] = (fs.existsSync(VERROU) ? fs.readFileSync(VERROU, 'utf8') : '').trim().split(' ')
      let vivant = false
      try { process.kill(Number(pid), 0); vivant = true } catch { /* mort */ }
      if (vivant) { console.error(`✗ une autre veille tourne (pid ${pid}, depuis ${depuis}) : rien n'est fait (si ce pid n'est pas une veille : supprimer ${path.relative(RACINE, VERROU).split(path.sep).join('/')})`); return false }
      fs.rmSync(VERROU, { force: true }) // verrou d'une veille morte
    }
  }
  return false
}

// ── un passage ───────────────────────────────────────────────────────────────────────────────────────────
let arret = false
async function passage() {
  const t0 = Date.now()
  const lignes = [`# veille de l'usine · ${maintenantIso()} · ${HOTE}${SIMULER ? ` · SIMULATION (${SIMULER})` : ''}${ESSAI ? ' · ESSAI : rien n’est fait' : ''} · grâce ${GRACE_MIN} min`]
  const dire = (l) => { lignes.push(l); console.log(l) }
  console.log(lignes[0])
  const u = lireUsine()
  if (u.erreur) {
    dire(`✗ usine injoignable : ${u.erreur} — rien n'est fait`)
    if (!ESSAI) { fs.appendFileSync(JOURNAL, JSON.stringify({ date: maintenantIso(), erreur: u.erreur }) + '\n'); fs.writeFileSync(RESUME, lignes.join('\n') + '\n') }
    return 5
  }
  const procs = SIMULER ? (lireJson(path.resolve(SIMULER))?.processus ?? []) : processusUsinePC()
  if (procs === null) dire('⚠ processus du PC illisibles (PowerShell) : aucune tâche ne sera rapatriée à ce passage')
  if (!u.taches.length) dire('· aucune tâche sur l’usine')
  const decisions = u.taches.map((t) => ({ t, d: decider(t, u.maintenant, procs) }))
  for (const { t, d } of decisions) dire(`${d.action === 'recuperer' ? (ESSAI ? '→ FERAIT' : '→') : '·'} ${t.id.padEnd(14)} ${d.etat} — ${d.raison}`)
  const aFaire = decisions.filter((x) => x.d.action === 'recuperer')
  let code = 0
  if (ESSAI) dire(`= essai : ${aFaire.length} tâche(s) seraient rapatriées${aFaire.length ? ` (${aFaire.map((x) => x.t.id).join(', ')})` : ''} ; rien n'a été fait`)
  else {
    for (const { t, d } of aFaire) {
      if (arret || fs.existsSync(ARRET)) { dire(`· arrêt demandé : ${t.id} et la suite attendront le prochain passage`); break }
      // Juste avant d'agir, on regarde encore si quelqu'un vient de la prendre (un passage peut durer, recuperer juge sur le PC).
      const encore = processusUsinePC()
      if (encore === null || suiviePar(encore, t.id).length) { dire(`· ${t.id} : ${encore === null ? 'processus du PC illisibles' : 'prise entre-temps par un processus du PC'} : laissée`); continue }
      const r = await rapatrier(t, d)
      dire(r.texte)
      if (!r.ok) code = 1
    }
    dire(`= ${aFaire.length} tâche(s) à rapatrier à ce passage · ${secondes(Date.now() - t0)}`)
    fs.writeFileSync(RESUME, lignes.join('\n') + '\n')
  }
  return code
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────────────
if (!ESSAI && !prendreVerrou()) process.exit(3)
let reveil = null
const arreter = (signal) => {
  if (arret) { console.log(`… arrêt déjà demandé${enfantEnCours ? ` : j'attends la fin de usine.mjs ${enfantEnCours.argv.join(' ')} (jamais coupé)` : ''}`); return }
  arret = true
  console.log(`· ${signal} reçu : arrêt propre${enfantEnCours ? ` après usine.mjs ${enfantEnCours.argv.join(' ')}` : ''}`)
  if (reveil) reveil()
}
for (const s of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) { try { process.on(s, () => arreter(s)) } catch { /* signal absent sur cette plateforme */ } }

// Passage seul (celui de la tâche planifiée) : veille.stop présent = en pause, rien n'est fait tant qu'il est là.
if (!BOUCLE_MIN && !ESSAI && fs.existsSync(ARRET)) { console.log(`· ${maintenantIso()} · veille en pause : ${path.relative(RACINE, ARRET).split(path.sep).join('/')} présent, rien n'est fait`); process.exit(0) }
if (!BOUCLE_MIN) process.exit(await passage())
console.log(`· boucle : un passage toutes les ${BOUCLE_MIN} min · arrêt : Ctrl+C, ou créer ${path.relative(RACINE, ARRET).split(path.sep).join('/')}`)
let n = 0
while (!arret) {
  if (fs.existsSync(ARRET)) { console.log(`· ${path.relative(RACINE, ARRET).split(path.sep).join('/')} présent : arrêt`); break }
  n++
  await passage()
  if (arret) break
  // Attente interrompue par un signal ou par le fichier d'arrêt (vérifié toutes les 5 s).
  await new Promise((resoudre) => {
    const fin = Date.now() + BOUCLE_MIN * 60_000
    const t = setInterval(() => { if (Date.now() >= fin || fs.existsSync(ARRET)) { clearInterval(t); reveil = null; resoudre() } }, 5_000)
    reveil = () => { clearInterval(t); reveil = null; resoudre() }
  })
}
console.log(`✓ veille arrêtée proprement après ${n} passage(s)`)
process.exit(0)
