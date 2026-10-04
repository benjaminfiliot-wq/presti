#!/usr/bin/env node
// scripts/juges-026-transverse-mutations.mjs — la contre-vérification des juges du pont Telegram et du durcissement de l'usine
// (fiche 026-198) : pont-telegram-qa (--partie=routes,usine) et usine-durcie-qa (statique : faux système de fichiers, jamais --reel).
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script lui fait lire des COPIES :
//   · une copie intacte par commande (le témoin) : code 0 exigé ;
//   · puis, pour chaque mutation, la même copie avec UN remplacement de texte exact : code ≠ 0 exigé, avec la ligne
//     « FAIL <critère> — … » du critère attendu et le bilan qui le nomme.
// Les deux juges écrivent déjà « PASS|FAIL <critère> — … » et « <juge> : PASS|FAIL — ids » : aucun relais.
// Il ne corrige JAMAIS un juge, un jeu d'essai ni le dépôt en place : seule la copie sous .orchestre/travail/026-198/ est écrite
// (lien vers node_modules retiré par fs.unlinkSync avant toute suppression ; chaque texte muté est rétabli, son empreinte relue).
// Si une mutation passe, elle est écrite en tête du rapport et le script sort en code 1. Un témoin rouge n'arrête rien : il est
// écrit en tête du rapport, et une mutation n'est « concluante » que sur un critère que le témoin ne rougit pas déjà.
//
// Aucun --reel, aucun appel à la vraie API de Telegram, aucun jeton réel (les jugements tirent leurs jetons au hasard et parlent à
// des faux serveurs sur 127.0.0.1), aucune commande sur l'usine réelle : usine-durcie-qa rejoue durcir.sh dans un faux système
// de fichiers sous .orchestre/travail/. usine-durcie-qa demande bash et un système POSIX : sur le PC (Windows) il refuse, ce script
// se lance donc sur l'usine (node scripts/usine.mjs executer …) ou dans le cloud.
//
// Usage :
//   node scripts/juges-026-transverse-mutations.mjs                  tout ; code 0 si tout est pris
//   node scripts/juges-026-transverse-mutations.mjs --seul=<motif>   une mutation, un critère ou un juge (code 3 si tout est pris)
//   node scripts/juges-026-transverse-mutations.mjs --ancres         vérifie seulement que chaque « avant » est présent une fois
//   --budget=<min> (19 par défaut) · --garder
// Écrit sous .orchestre/travail/026-198/ et .orchestre/preuves/026-198/ (mutations.md, mutations.json, journaux/).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-198'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const COPIE = path.join(TRAVAIL, 'copie')
const JOURNAUX = path.join(PREUVES, 'journaux')

const JUGES = {
  pont: { script: 'scripts/pont-telegram-qa.mjs', nom: 'pont-telegram-qa' },
  durcie: { script: 'scripts/usine-durcie-qa.mjs', nom: 'usine-durcie-qa' },
}

// ── Les mutations : UN remplacement de texte exact chacune ──────────────────────────────────────────────────────────────────
// { juge, args, critere, fichier, avant, apres, nom } ; un « \n » d'une ancre s'écrit \r\n si le fichier est en CRLF.
const MUTATIONS = []
const muter = (juge, args, critere, fichier, avant, apres, nom) => MUTATIONS.push({ juge, args, critere, fichier, avant, apres, nom })
const TG = 'scripts/usine/telegram.mjs'
const ROUTES = '--partie=routes'
const USINE = '--partie=usine'

// pont-telegram-qa — les routes (lib/agents/telegram.ts, entree, sortie).
muter('pont', ROUTES, 'PT-7', 'lib/agents/telegram.ts',
  "export const COMMANDES = Object.freeze(['pause', 'etat', 'consigne'] as const)",
  "export const COMMANDES = Object.freeze(['pause', 'etat', 'consigne', 'reprise'] as const)",
  'une quatrième commande « reprise » dans la liste fermée')
muter('pont', ROUTES, 'PT-4', 'app/api/agents/telegram/entree/route.ts',
  "rpc('station_pause_par_agent', { p_agent: AGENT, p_motif: motifPause(corps.motif) })",
  "rpc('ops_interrupteur_poser', { p_nom: 'pause_generale', p_actif: false, p_agent: AGENT })",
  'la commande pause appelle ops_interrupteur_poser(…, false, …) : elle lève la pause au lieu de la poser')
muter('pont', ROUTES, 'PT-3', 'app/api/agents/telegram/sortie/route.ts',
  "messages.push({ id: `a-${l.id}`, texte: m.texte })",
  "messages.push({ id: `a-${l.id}`, texte: `${m.texte} ${String((l as unknown as Record<string, unknown>).sujet ?? '')}` })",
  'la route de sortie recopie le sujet de l’alerte dans le texte')
// pont-telegram-qa — le service de l'usine (scripts/usine/telegram.mjs, contre un faux Telegram et un faux Presti).
muter('pont', USINE, 'PT-11', TG,
  "import crypto from 'node:crypto'",
  "import crypto from 'node:crypto'\nimport http from 'node:http'\nhttp.createServer((_req, res) => res.end('ok')).listen(0, '127.0.0.1')",
  'le service ouvre un port (http.createServer(…).listen(…))')
muter('pont', USINE, 'PT-10', TG,
  "process.on('exit', libererVerrou)",
  "process.on('exit', libererVerrou)\nconsole.log(`${new Date().toISOString()} telegram : jeton ${JETON_BOT}`)",
  'le jeton du bot écrit dans une ligne de journal')
muter('pont', USINE, 'PT-9', TG,
  '{ chat_id: chat, text: t, disable_web_page_preview: true }',
  "{ chat_id: chat, text: t, disable_web_page_preview: true, parse_mode: 'HTML' }",
  'parse_mode: HTML ajouté à sendMessage')
muter('pont', USINE, 'PT-15', TG,
  "if (!egaux(message.text.slice('/start '.length), CODE_ENV)) return",
  "if (false) return",
  'le service appaire la première conversation qui écrit /start, sans comparer le code')
muter('pont', USINE, 'PT-15', TG,
  'const FENETRE_APPAIRAGE_MS = 10 * 60_000',
  'const FENETRE_APPAIRAGE_MS = 1000 * 60_000',
  'la fenêtre d’appairage portée de 10 à 1 000 minutes')
muter('pont', USINE, 'PT-16', TG,
  "if (!Number.isSafeInteger(id) || id < etat.offset) return // déjà acquitté (même rejoué) : jamais un second effet",
  "if (!Number.isSafeInteger(id)) return // acquittement retiré",
  'un update_id rejoué reprend son effet (correction du 27/09 : un seul envoi, jamais un second effet)')
// usine-durcie-qa — durcir.sh dans un faux système, et usine.mjs preparer.
muter('durcie', '', 'UD-2', 'scripts/usine/durcir.sh',
  'for g in sudo docker; do',
  '$SUDO rm -f "$SD/presti-agents"\nfor g in sudo docker; do',
  'durcir.sh retire aussi la règle presti-agents')
muter('durcie', '', 'UD-2', 'scripts/usine/durcir.sh',
  "# rpcbind : coupé seulement si aucun partage NFS n'est monté.",
  "$SUDO ufw enable\n# rpcbind : coupé seulement si aucun partage NFS n'est monté.",
  'ufw enable ajouté à durcir.sh')
muter('durcie', '', 'UD-3', 'scripts/usine.mjs',
  'v=$(node -p "require(\'./node_modules/playwright/package.json\').version")',
  'sudo -n true\nv=$(node -p "require(\'./node_modules/playwright/package.json\').version")',
  'la préparation de l’usine exige encore sudo -n true du compte usine')

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const court = (t, n = 240) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const eol = (texte, s) => (texte.includes('\r\n') ? s.replace(/\r?\n/g, '\r\n') : s)
const o = (() => {
  const r = { racine: null, seul: null, ancres: false, garder: false, budget: 19 }
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { console.error(`✗ argument inattendu : ${a}`); process.exit(2) }
    const [, k, v] = m
    if (k === 'ancres' || k === 'garder') r[k] = true
    else if (k === 'budget' && /^\d+$/.test(v ?? '')) r.budget = Number(v)
    else if (k === 'seul' && v) r.seul = v
    else { console.error(`✗ option inconnue ou sans valeur : --${k}`); process.exit(2) }
  }
  return r
})()

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
  for (const d of ['app', 'lib', 'components', 'docs/agents', 'scripts/usine']) if (existe(path.join(RACINE, d))) fs.cpSync(path.join(RACINE, d), path.join(COPIE, d), { recursive: true, filter: filtre })
  for (const f of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts', 'scripts/usine.mjs', 'scripts/fermeture-e2e.mjs']) if (existe(path.join(RACINE, f))) { fs.mkdirSync(path.dirname(path.join(COPIE, f)), { recursive: true }); fs.copyFileSync(path.join(RACINE, f), path.join(COPIE, f)) }
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
}

// ═══ Lancer ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
const argvDe = (m) => [path.join(RACINE, JUGES[m.juge].script), ...m.args.split(/\s+/).filter(Boolean), `--racine=${COPIE}`]
const commandeDe = (m) => `node ${JUGES[m.juge].script}${m.args ? ` ${m.args}` : ''} --racine={racine}`
function lancer(m, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, argvDe(m), { cwd: RACINE, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true })
    let sortie = '', expire = false
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) { flux.setEncoding('utf8'); flux.on('data', (d) => { if (sortie.length < 4_000_000) sortie += d }) }
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), duree_s: (Date.now() - t0) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, duree_s: (Date.now() - t0) / 1000, expire }) })
  })
}
const RE_BILAN = /^[\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)* : (?:PASS|FAIL)(?: — .*)?$/
function lignesDe(sortie) {
  const par = new Map()
  for (const l of sortie.split(/\r?\n/)) { const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l); if (m && !par.has(m[2])) par.set(m[2], { signe: m[1], ligne: l, detail: m[3] }) }
  const bilan = sortie.split(/\r?\n/).filter((l) => RE_BILAN.test(l)).at(-1) ?? null
  return { par, bilan }
}
const RE_INFRA = /préalable|non jugé|non évalué|interrompu|appel refusé|injoignable|le juge ne peut pas|POSIX/i
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
    const commandes = new Map()
    let n = 0
    for (const m of jouables) {
      const cle = commandeDe(m)
      if (!commandes.has(cle)) commandes.set(cle, { temoin: null, rouges: [] })
      const c = commandes.get(cle)
      if (Date.now() + 60_000 > fin) { defauts.push(`${m.critere} ${m.nom} : non jouée, le budget de ${o.budget} min est épuisé`); lignes.push(`NON JOUÉE ${m.critere} — ${m.nom} ; budget épuisé`); continue }
      if (!c.temoin) {
        const r = await lancer(m, Math.max(60_000, Math.min(fin - Date.now(), 10 * 60_000)))
        ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-temoin-${m.juge}${m.args ? '-' + m.args.replace(/[^\w=,-]+/g, '_') : ''}.log`), `$ ${cle}\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
        c.temoin = r
        c.rouges = rougesDe(r.sortie)
        const etat = r.code === 0 ? 'vert' : `rouge (code ${r.code}${r.expire ? ', délai dépassé' : ''} ; ${c.rouges.join(', ') || 'aucune ligne en échec'})`
        temoins.push(`${m.juge} ${m.args || ''} : témoin ${etat} en ${r.duree_s.toFixed(0)} s`)
        console.log(`TÉMOIN ${m.juge} ${m.args || ''} : ${etat}`)
        if (r.code !== 0) defauts.push(`TÉMOIN ${m.juge} ${m.args || ''} rouge : code ${r.code}${r.expire ? ' (délai dépassé)' : ''} ; critères en échec : ${c.rouges.join(', ') || 'aucun nommé'} ; ${court(r.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 200)}`)
      }
      if (c.temoin.expire || c.temoin.code === 124) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin hors délai`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin n'a pas fini`); continue }
      if (c.rouges.includes(m.critere)) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; le témoin échoue déjà sur ${m.critere}`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin est déjà rouge sur ${m.critere}`); continue }
      if (c.temoin.code !== 0 && !c.rouges.length) { lignes.push(`NON CONCLUANTE ${m.critere} — ${m.nom} ; témoin en code ${c.temoin.code} sans critère nommé`); defauts.push(`${m.critere} ${m.nom} : non concluante, le témoin sort en code ${c.temoin.code} sans critère en échec`); continue }
      const f = path.join(COPIE, m.fichier), original = originaux.get(f)
      fs.writeFileSync(f, original.replace(eol(original, m.avant), () => eol(original, m.apres)))
      let r
      try { r = await lancer(m, Math.max(60_000, Math.min(fin - Date.now() + 60_000, 10 * 60_000))) }
      finally { fs.writeFileSync(f, original) }
      if (sha(lire(f)) !== sha(original)) throw new Error(`${m.fichier} n'a pas été rétabli`)
      ecrire(path.join(JOURNAUX, `${String(++n).padStart(2, '0')}-${m.critere}-${m.juge}.log`), `$ ${cle}\n# ${m.fichier} : « ${court(m.avant, 120)} » → « ${court(m.apres, 120)} »\n# code ${r.code} · ${r.duree_s.toFixed(1)} s\n\n${r.sortie.slice(0, 200_000)}`)
      const v = verdict(r.sortie, m.critere)
      const ok = r.code !== 0 && !r.expire && v.ok
      const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${ok ? v.ligne : `${r.expire ? 'délai dépassé' : `code ${r.code}`} : ${v.raison ?? 'aucun critère nommé en échec'}`}`
      lignes.push(ligne); console.log(ligne)
      if (!ok) defauts.push(ligne)
      else rapport.push({ juge: JUGES[m.juge].script, commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: Number(r.duree_s.toFixed(1)) })
    }
    ecrire(path.join(PREUVES, 'mutations.md'), `# Mutations des juges du pont Telegram et du durcissement de l'usine (026-198)\n\nAucun --reel, aucun jeton réel, aucun appel à Telegram : faux serveurs sur 127.0.0.1 et faux système de fichiers.\n\n${defauts.length ? `## ÉCHECS (${defauts.length})\n${defauts.map((d) => `- ${d}`).join('\n')}\n\n` : ''}## Témoins (copie intacte)\n${temoins.map((t) => `- ${t}`).join('\n') || '- aucun'}\n\n## Mutations\n${lignes.map((l) => `- ${l}`).join('\n')}\n\nBilan : ${rapport.length}/${retenues.length} mutations prises sur leur critère nommé, en ${((Date.now() - debut) / 60_000).toFixed(1)} min (budget ${o.budget} min).\n`)
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    console.log(`026-198 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises`)
    process.exitCode = defauts.length ? 1 : o.seul ? 3 : 0
  } finally {
    if (!o.garder || o.ancres) { try { retirer(COPIE) } catch (e) { console.error(`copie non retirée : ${e.message}`) } }
  }
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
