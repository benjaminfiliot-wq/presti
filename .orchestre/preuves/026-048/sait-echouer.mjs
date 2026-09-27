#!/usr/bin/env node
// Preuve que usine-socle-qa sait échouer (026-048), rejouable : node .orchestre/preuves/026-048/sait-echouer.mjs [--seulement=CF-3,SO-5]
//
// 1. Les trois groupes sur le TÉMOIN intact (temoin/, une mise en œuvre minimale écrite par Claude Code, qui n'est pas le
//    livrable de 026-050 ni de 026-053) : code 0 exigé.
// 2. Pour chaque critère CF-*, SO-*, SV-*, SV-IA-* : une copie du témoin, UN remplacement de texte exact (présent une seule
//    fois), puis le vrai juge avec --racine=<copie> --groupe=<groupe> : code ≠ 0 exigé, avec une ligne FAIL qui porte le critère.
// 3. Pour chaque critère de --preuve-echecs (AT-*, PE-*) : une copie du juge et de ses jeux d'essai, la même casse, et la copie
//    lancée en --preuve-echecs : code ≠ 0 et une ligne FAIL qui porte le critère (AT-1 : code 2, « bash introuvable »).
// Rien n'est modifié en place : tout se passe sous .orchestre/travail/usine-socle-qa/sait-echouer/. Écrit sait-echouer.md et
// sait-echouer.log à côté de ce script.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..')
const JUGE = path.join(DEPOT, 'scripts', 'usine-socle-qa.mjs')
const TEMOIN = path.join(ICI, 'temoin')
const BAC = path.join(DEPOT, '.orchestre', 'travail', 'usine-socle-qa', 'sait-echouer')
const seulement = (process.argv.find((a) => a.startsWith('--seulement=')) || '').slice(12).split(',').filter(Boolean)
const cleFactice = () => ['sk', 'live', `abcdefgh${'12345678'}WXYZ`].join('_') // assemblée ici : jamais en clair dans un fichier

// [critère, groupe, fichier du témoin, avant, après]
const G = [
  ['CF-1', 'coffre', 'scripts/usine/presti-coffre.sh', 'trouve=1', 'trouve=0'],
  ['CF-2', 'coffre', 'scripts/usine/presti-coffre.sh', 'TELEGRAM_CODE_APPAIRAGE "', 'TELEGRAM_CODE_APPAIRAGE SUPABASE_SERVICE_ROLE_KEY "'],
  ['CF-3', 'coffre', 'scripts/usine/presti-coffre.sh', 'refuser "valeur refusée pour $2"', 'refuser "valeur refusée pour $2 : $valeur"'],
  ['CF-4', 'coffre', 'scripts/usine/presti-coffre.sh', 'umask 077\n', ''],
  ['CF-5', 'coffre', 'scripts/usine/presti-coffre.sh', '| cut -d= -f1 | sort', '| cut -d= -f1'],
  ['CF-6', 'coffre', 'scripts/usine/presti-coffre.sh', 'echo "absent"', 'echo "rien"'],
  ['CF-7', 'coffre', 'scripts/usine/avec-coffre.mjs', 'const env = {}', 'const env = { ...process.env }'],
  ['CF-8', 'coffre', 'scripts/usine/avec-coffre.mjs', 'for (const n of noms) if (!coffre.has(n)) sortir(3, `${n} absent du coffre`)', ''],
  ['CF-9', 'coffre', 'scripts/usine/avec-coffre.mjs', 'process.exit(code ?? (signal ? 143 : 1))', 'process.exit(0)'],
  ['CF-10', 'coffre', 'scripts/usine/coffre-regles.mjs', "  if (/^eyJ/.test(valeur) && valeur.split('.').length === 3) return refus('forme de JWT refusée')\n", ''],
  ['CF-11', 'coffre', 'scripts/usine-coffre.mjs', 'finir(await distant(`poser ${nom}`, `${valeur}\\n`))', 'finir(await distant(`poser ${nom} ${valeur}`, `${valeur}\\n`))'],
  ['CF-12', 'coffre', 'scripts/usine-coffre.mjs', 'if (reste.length) refuser(`${cmd} ne prend aucun argument`)', ''],
  ['CF-13', 'coffre', 'scripts/usine-coffre.mjs', 'const code = await distant(`poser ${nom}`, `${jeton}\\n`)', 'const code = await distant(`poser ${nom} ${jeton}`, `${jeton}\\n`)'],
  ['SO-1', 'socle', 'scripts/usine-agents.mjs', "HOTE, 'bash -s']", "HOTE, 'bash -l']"],
  ['SO-2', 'socle', 'scripts/usine/socle.sh', 'sudo -n useradd --create-home --shell /usr/sbin/nologin agents\n', 'sudo -n useradd --create-home --shell /usr/sbin/nologin agents\n  sudo -n usermod -aG sudo agents\n'],
  ['SO-3', 'socle', 'scripts/usine/socle.sh', 'usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre\n', 'usine ALL=(agents) NOPASSWD:SETENV: /usr/local/bin/presti-coffre\n'],
  ['SO-4', 'socle', 'scripts/usine/socle.sh', 'set -euo pipefail\n', 'set -euo pipefail\nsudo -n apt-get install -y bubblewrap\n'],
  ['SO-5', 'socle', 'scripts/usine-agents.mjs', 'HUSKY=0 npm ci --ignore-scripts', 'HUSKY=0 npm ci'],
  ['SO-6', 'socle', 'scripts/usine-agents.mjs', "if (cmd === 'installer') {\n    L.push(", "if (cmd === 'installer') {\n    L.push('scp poste:/tmp/presti-atelier.service /etc/systemd/system/',"],
  ['SO-7', 'socle', 'scripts/usine-agents.mjs', '{ filtrer: true }', '{ filtrer: false }'],
  ['SO-8', 'socle', 'scripts/usine/presti-journal.sh', '  *) usage ;;\nesac', '  coffre) cat "$HOME/.config/presti/agents.env"; exit 0 ;;\n  *) usage ;;\nesac'],
  // Contre-vérification du 26/09 : un septième groupe accepté, et une clé du prototype acceptée (GROUPES[g] sans hasOwn).
  ['SO-6', 'socle', 'scripts/usine-agents.mjs', "  modeles: { motifs: ['presti-standard*', 'presti-facteur*'] },\n", "  modeles: { motifs: ['presti-standard*', 'presti-facteur*'] },\n  voleur: { motifs: ['presti-voleur*'] },\n"],
  ['SO-6', 'socle', 'scripts/usine-agents.mjs', '!Object.hasOwn(GROUPES, reste[0])', '!GROUPES[reste[0]]'],
  ['SO-9', 'socle', 'docs/agents/usine.md', 'Aucune charge factice.', ''],
  // Contre-vérification du 26/09 : le tableau « Les services » vidé de ses lignes (en-tête et séparateur gardés), puis une
  // ligne qui passe une variable hors de la liste fermée.
  ['SO-9', 'socle', 'docs/agents/usine.md', '|---|---|---|---|\n| presti-surveillance.service | aucun | agents | PRESTI_JETON_USINE |\n| presti-atelier.service | presti-atelier.timer | agents | PRESTI_JETON_ATELIER |\n| presti-livreur.service | presti-livreur.timer | agents | PRESTI_JETON_LIVREUR_USINE |\n| presti-chef-plein.service | presti-chef-plein.timer | agents | PRESTI_JETON_CHEF |\n| presti-porteur.service | presti-porteur.timer | agents | PRESTI_JETON_FACTEUR_USINE |\n| presti-standard.service | presti-standard.timer | agents | PRESTI_JETON_STANDARDISTE |\n| presti-facteur.service | presti-facteur.timer | agents | PRESTI_JETON_FACTEUR |\n', '|---|---|---|---|\n'],
  ['SO-9', 'socle', 'docs/agents/usine.md', '| agents | PRESTI_JETON_ATELIER |', '| agents | PRESTI_JETON_ATELIER, SUPABASE_SERVICE_ROLE_KEY |'],
  ['SO-10', 'socle', 'scripts/usine/socle.sh', 'set -euo pipefail\n', `set -euo pipefail\n# exemple ${cleFactice()}\n`],
  ['SV-1', 'surveillance', 'scripts/usine/surveillance.mjs', 'repos: cpu[3] + cpu[4]', 'repos: cpu[3]'],
  ['SV-2', 'surveillance', 'scripts/usine/surveillance.mjs', 'memDispo: mem.MemAvailable', 'memDispo: mem.MemFree'],
  ['SV-3', 'surveillance', 'scripts/usine/surveillance.mjs', "return nom === 'lo' ? s : s + v[0] + v[8]", 'return s + v[0] + v[8]'],
  ['SV-4', 'surveillance', 'scripts/usine/surveillance.mjs', 'const p95 = (v) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[Math.ceil(0.95 * s.length) - 1] }', 'const p95 = (v) => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0)'],
  ['SV-5', 'surveillance', 'scripts/usine/surveillance.mjs', "max < 22 ? 'danger'", "max < 20 ? 'danger'"],
  ['SV-6', 'surveillance', 'scripts/usine/surveillance.mjs', ".replace(/\\.\\d{3}Z$/, 'Z'), cpu, mem, res })", ".replace(/\\.\\d{3}Z$/, 'Z'), cpu, mem, res, hote: 'usine' })"],
  ['SV-7', 'surveillance', 'scripts/usine/surveillance.mjs', 't - etat.battement >= QUINZE', 't - etat.battement >= 5 * MINUTE'],
  ['SV-8', 'surveillance', 'scripts/usine/surveillance.mjs', "heureParis(t) >= '09:00'", "heureParis(t) >= '10:00'"],
  ['SV-9', 'surveillance', 'scripts/usine/surveillance.mjs', 'cle: `usine:seuil:${s}`', 'cle: `usine:seuil:${jourParis(t)}`'],
  ['SV-10', 'surveillance', 'scripts/usine/surveillance.mjs', "} catch (e) { incident(t, 'bus_injoignable', e?.cause?.code || e?.name || 'erreur'); return null }", '} catch (e) { throw e }'],
  ['SV-11', 'surveillance', 'scripts/usine/surveillance.mjs', '(!etat.memoire || t - etat.memoire >= 60 * MINUTE)', '(true)'],
  ['SV-12', 'surveillance', 'scripts/usine/surveillance.mjs', 'async function tour(t) {\n', 'async function tour(t) {\n  const finBoucle = Date.now() + 120; while (Date.now() < finBoucle) { /* charge */ }\n'],
  ['SV-13', 'surveillance', 'scripts/usine/surveillance.mjs', '  await tour(depart)\n', '  process.stderr.write(`jeton ${jeton}\\n`)\n  await tour(depart)\n'],
  ['SV-14', 'surveillance', 'scripts/usine/systemd/presti-surveillance.service', 'Environment=PRESTI_HOTE=usine\n', 'Environment=PRESTI_HOTE=usine\nEnvironmentFile=/home/agents/.config/presti/agents.env\n'],
  ['SV-15', 'surveillance', 'scripts/usine/surveillance.mjs', "if ((opt.service || opt['une-mesure']) && !proc && process.platform !== 'linux') sortir(2, 'la surveillance ne mesure que l\\'usine')\n", ''],
  ['SV-IA-1', 'surveillance', 'scripts/usine/surveillance.mjs', 'remis à ${heureParis(p.resets_at)}', 'remis à ${p.resets_at}'],
  ['SV-IA-2', 'surveillance', 'scripts/usine/surveillance.mjs', 'if (etat.ia.fournisseurs[p.provider] !== cle) {', 'if (true) {'],
  ['SV-IA-3', 'surveillance', 'scripts/usine/surveillance.mjs', "const masquer = (s) => String(s).replace(/@/g, '').replace(/\\d{9,}/g, '…').slice(0, 200)", 'const masquer = (s) => String(s).slice(0, 200)'],
  ['SV-IA-4', 'surveillance', 'scripts/usine/surveillance.mjs', "} catch (e) { incident(t, 'ia_injoignable', e?.code || e?.cause?.code || 'erreur') }", "} catch (e) { u = { served_provider: 'google', providers: [{ provider: 'google', model: 'invente', used: 0, limit: 10, unit: 'req/j', status: 'active', resets_at: new Date(t).toISOString() }] } }"],
]
// [critère, fichier de la copie (juge ou jeu d'essai), avant, après, code attendu (défaut : ≠ 0 avec la ligne FAIL)]
const P = [
  ['AT-1', 'scripts/usine-socle-qa.mjs', "existe('C:/Program Files/Git/bin/bash.exe')) return (BASH = 'C:/Program Files/Git/bin/bash.exe')", "existe('C:/sans-bash/bash.exe')) return (BASH = 'C:/sans-bash/bash.exe')", 'bash'],
  ['AT-2', 'scripts/fixtures/026/usine-socle/faux-ssh.mjs', 'fs.writeFileSync(`${base}.stdin`, entree)', 'fs.writeFileSync(`${base}.stdin`, "")'],
  ['AT-3', 'scripts/fixtures/026/usine-socle/faux-bus.mjs', "    for (const k of Object.keys(corps)) if (!permis.includes(k)) return refus('champ_inconnu', k)\n", ''],
  ['AT-4', 'scripts/fixtures/026/usine-socle/proc/stat-2', 'cpu  100300 2030', 'cpu  100400 2030'],
  ['AT-5', 'scripts/fixtures/026/usine-socle/mesures/attendus.json', '"cpu": 29.6', '"cpu": 29.7'],
  ['AT-6', 'scripts/fixtures/026/usine-socle/coffre/cas-valeurs.json', '"valeur": [{ "lettres": 32 }], "attendu": "accepte"', '"valeur": [{ "lettres": 32 }], "attendu": "refuse"'],
  ['AT-7', 'scripts/fixtures/026/usine-socle/enfant-espion.mjs', "empreintes[nom] = crypto.createHash('sha256').update(String(valeur)).digest('hex')", 'empreintes[nom] = String(valeur)'],
  ['AT-8', 'scripts/fixtures/026/usine-socle/unites/noms.json', '"motifs": ["presti-atelier*"]', '"motifs": ["presti-*"]'],
  ['AT-9', 'scripts/fixtures/026/usine-socle/freellmapi/reponses.json', 'gemini-3.5-flash · 14/20 req/j', 'gemini-3.5-flash · 15/20 req/j'],
  ['PE-1', 'scripts/usine-socle-qa.mjs', "const REFERENCE = '5012625'", "const REFERENCE = '0000000'"],
  ['PE-2', 'scripts/usine-socle-qa.mjs', "[['coffre', 'CF-1', 'PE-2']", "[['coffre', 'CF-2', 'PE-2']"],
  ['PE-3', 'scripts/usine-socle-qa.mjs', 'async function groupeSocle(R) {\n', "async function groupeSocle(R) {\n  throw new Error('plantage voulu')\n"],
  ['PE-4', 'scripts/usine-socle-qa.mjs', 'async function groupeSurveillance(R) {\n', 'async function groupeSurveillance(R) {\n  return\n'],
  ['PE-5', 'scripts/usine-socle-qa.mjs', 'fs.writeFileSync(f, `${L.join(\'\\n\')}\\n`)', "fs.writeFileSync(f, '')"],
]

const copier = (de, vers) => {
  fs.mkdirSync(vers, { recursive: true })
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    const a = path.join(de, e.name), b = path.join(vers, e.name)
    if (e.isDirectory()) copier(a, b); else fs.copyFileSync(a, b)
  }
}
const nettoyer = (d) => { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* tenu */ } }
function muter(fichier, avant, apres) {
  const t = fs.readFileSync(fichier, 'utf8').replace(/\r\n/g, '\n')
  const n = t.split(avant).length - 1
  if (n !== 1) throw new Error(`« avant » présent ${n} fois dans ${fichier}`)
  const i = t.indexOf(avant)
  fs.writeFileSync(fichier, t.slice(0, i) + apres + t.slice(i + avant.length))
}
function lancer(args, cwd) {
  return new Promise((ok) => {
    const debut = Date.now()
    const e = spawn(process.execPath, args, { cwd, windowsHide: true })
    let s = ''
    e.stdout.on('data', (d) => { s += d })
    e.stderr.on('data', (d) => { s += d })
    const m = setTimeout(() => e.kill(), 15 * 60_000)
    e.on('close', (code) => { clearTimeout(m); ok({ code, sortie: s, duree: (Date.now() - debut) / 1000 }) })
  })
}
const ligneFail = (sortie, c) => sortie.split(/\r?\n/).find((l) => new RegExp(`(?<![A-Za-z0-9])${c.replace(/-/g, '\\-')}(?![A-Za-z0-9-])`).test(l) && /^(FAIL|\s+✗)/.test(l)) || null

const journal = []
const lignes = []
const masquer = (s) => String(s).split(cleFactice()).join('<clé factice assemblée>') // jamais la forme de clé dans une preuve
const SORTIE = seulement.length ? 'sait-echouer-partiel' : 'sait-echouer' // un rejeu partiel n'écrase jamais la preuve complète
const ecrire = () => {
  fs.writeFileSync(path.join(ICI, `${SORTIE}.log`), masquer(journal.join('\n')))
  const ok = lignes.filter((l) => l.juste).length
  fs.writeFileSync(path.join(ICI, `${SORTIE}.md`), masquer([
    '# usine-socle-qa sait échouer (026-048)', '',
    `Produit par \`node .orchestre/preuves/026-048/sait-echouer.mjs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}. Témoin : \`.orchestre/preuves/026-048/temoin/\` (mise en œuvre minimale écrite par Claude Code, qui n'est le livrable ni de 026-050 ni de 026-053). Chaque ligne : une copie, UN remplacement de texte exact, le juge relancé ; « juste » = code attendu et ligne FAIL qui porte le critère. Sorties complètes : \`sait-echouer.log\`.`, '',
    '| Critère | Cas | Fichier cassé | Code | Juste | Ligne relevée (extrait réel) |', '|---|---|---|---|---|---|',
    ...lignes.map((l) => `| ${l.c} | ${l.cas} | \`${l.fichier}\` | ${l.code} | ${l.juste ? 'oui' : '**NON**'} | ${String(l.ligne || '—').replace(/\|/g, '\\|').slice(0, 220)} |`), '',
    `Bilan : ${ok}/${lignes.length} justes.`, ''].join('\n')))
}

// 1. Le témoin intact.
for (const g of ['coffre', 'socle', 'surveillance']) {
  if (seulement.length && !seulement.some((c) => G.find((x) => x[0] === c && x[1] === g))) continue
  const r = await lancer([JUGE, `--groupe=${g}`, `--racine=${TEMOIN}`], DEPOT)
  journal.push(`$ node scripts/usine-socle-qa.mjs --groupe=${g} --racine=<témoin intact>\n# code ${r.code} · ${r.duree.toFixed(0)} s\n${r.sortie}`)
  const fin = r.sortie.trim().split(/\r?\n/).pop()
  lignes.push({ c: `témoin ${g}`, cas: 'intact : PASS attendu', fichier: 'temoin/', code: r.code, juste: r.code === 0, ligne: fin })
  console.log(`${r.code === 0 ? '·' : '✗'} témoin ${g} intact : code ${r.code} (${r.duree.toFixed(0)} s)`)
  ecrire()
}
// 2. Les critères des groupes, sur des copies mutées du témoin.
for (const [n, [c, g, f, avant, apres]] of G.entries()) {
  if (seulement.length && !seulement.includes(c)) continue
  const d = path.join(BAC, `${c}-${n}`) // un dossier par cas : un critère peut en avoir plusieurs
  nettoyer(d)
  copier(TEMOIN, d)
  muter(path.join(d, f), avant, apres)
  const r = await lancer([JUGE, `--groupe=${g}`, `--racine=${d}`], DEPOT)
  const ligne = ligneFail(r.sortie, c)
  const juste = r.code !== 0 && !!ligne
  journal.push(`$ node scripts/usine-socle-qa.mjs --groupe=${g} --racine=<témoin muté pour ${c}>\n# ${f} : « ${masquer(avant).slice(0, 80)} » → « ${masquer(apres).slice(0, 80)} »\n# code ${r.code} · ${r.duree.toFixed(0)} s\n${r.sortie}`)
  lignes.push({ c, cas: `${g} : « ${masquer(avant).replace(/\n/g, '⏎').slice(0, 60)} » → « ${masquer(apres).replace(/\n/g, '⏎').slice(0, 60)} »`, fichier: `temoin/${f}`, code: r.code, juste, ligne: ligne && ligne.trim() })
  console.log(`${juste ? '·' : '✗'} ${c} : code ${r.code}, ${ligne ? ligne.trim().slice(0, 140) : 'AUCUNE ligne FAIL qui porte le critère'} (${r.duree.toFixed(0)} s)`)
  nettoyer(d)
  ecrire()
}
// 3. Les critères de --preuve-echecs, sur des copies mutées du juge et de ses jeux d'essai.
for (const [c, f, avant, apres, attendu] of P) {
  if (seulement.length && !seulement.includes(c)) continue
  const d = path.join(BAC, c)
  nettoyer(d)
  fs.mkdirSync(path.join(d, 'scripts'), { recursive: true })
  fs.copyFileSync(JUGE, path.join(d, 'scripts', 'usine-socle-qa.mjs'))
  copier(path.join(DEPOT, 'scripts', 'fixtures', '026', 'usine-socle'), path.join(d, 'scripts', 'fixtures', '026', 'usine-socle'))
  muter(path.join(d, f), avant, apres)
  const env = attendu === 'bash' ? { ...process.env, PATH: path.dirname(process.execPath), Path: undefined } : process.env
  const r = await new Promise((ok) => {
    const debut = Date.now()
    const e = spawn(process.execPath, [path.join(d, 'scripts', 'usine-socle-qa.mjs'), '--preuve-echecs'], { cwd: d, env: Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined)), windowsHide: true })
    let s = ''
    e.stdout.on('data', (x) => { s += x }); e.stderr.on('data', (x) => { s += x })
    e.on('close', (code) => ok({ code, sortie: s, duree: (Date.now() - debut) / 1000 }))
  })
  const ligne = attendu === 'bash' ? (r.sortie.split(/\r?\n/).find((l) => /bash introuvable/.test(l)) || null) : ligneFail(r.sortie, c)
  const juste = attendu === 'bash' ? r.code === 2 && !!ligne : r.code !== 0 && !!ligne
  journal.push(`$ node <copie>/scripts/usine-socle-qa.mjs --preuve-echecs   (copie mutée pour ${c})\n# ${f} : « ${avant.slice(0, 80)} » → « ${apres.slice(0, 80)} »\n# code ${r.code} · ${r.duree.toFixed(0)} s\n${r.sortie}`)
  lignes.push({ c, cas: `« ${avant.replace(/\n/g, '⏎').slice(0, 50)} » → « ${apres.replace(/\n/g, '⏎').slice(0, 50)} »`, fichier: f, code: r.code, juste, ligne: ligne && ligne.trim() })
  console.log(`${juste ? '·' : '✗'} ${c} : code ${r.code}, ${ligne ? ligne.trim().slice(0, 140) : 'AUCUNE ligne attendue'} (${r.duree.toFixed(0)} s)`)
  nettoyer(d)
  ecrire()
}
const faux = lignes.filter((l) => !l.juste)
console.log(`sait-echouer : ${lignes.length - faux.length}/${lignes.length} justes${faux.length ? ` — à revoir : ${faux.map((l) => l.c).join(', ')}` : ''}`)
process.exit(faux.length ? 1 : 0)
