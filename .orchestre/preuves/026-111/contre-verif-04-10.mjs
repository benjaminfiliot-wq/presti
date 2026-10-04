// 026-111 — témoin + 4 sabotages réversibles de la station, sur une COPIE propre (git worktree détaché à REF_111, HEAD par défaut).
// À lancer UNIQUEMENT dans un bac jetable de l'usine (node scripts/usine.mjs executer … -- node .orchestre/preuves/026-111/contre-verif-04-10.mjs) :
// le juge tourne au BANC (--racine=<copie>), sur 127.0.0.1 et sans réseau : aucun compte n'est créé, aucun .env n'est lu.
// La copie est un worktree à HEAD : aucun travail non commité d'une autre fiche n'y entre. Chaque sabotage : sha256 avant, une seule
// occurrence du texte remplacé exigée, sabotage écrit, juge joué, octets d'origine RÉÉCRITS (jamais git restore), sha256 relu.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const BAC = process.cwd()
const REF = process.env.REF_111 || 'HEAD'
const PREUVES = path.join(BAC, '.orchestre', 'preuves', '026-111')
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const sh = (cmd, args, opt = {}) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opt })
const sortie = (r) => `${r.stdout || ''}${r.stderr || ''}`.replace(/\x1b\[[0-9;]*m/g, '')

function main() {
  if (!BAC.startsWith('/home/usine/bacs/')) { console.log(`refus : pas un bac jetable de l'usine (${BAC})`); process.exitCode = 2; return }
  const copie = `/tmp/racine-111-${process.pid}`
  const ajout = sh('git', ['worktree', 'add', '--detach', copie, REF], { cwd: BAC })
  if (ajout.status !== 0) { console.log(`refus : git worktree add : ${sortie(ajout).slice(0, 300)}`); process.exitCode = 2; return }
  const tete = sh('git', ['rev-parse', 'HEAD'], { cwd: copie }).stdout.trim()
  const station = sh('git', ['rev-parse', '16be91f5^'], { cwd: copie }).stdout.trim()
  const ecarts = sh('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: copie }).stdout.trim().split('\n').filter(Boolean).length
  const p = (nom) => `contre-verif-04-10-${tete.slice(0, 8)}-${nom}`
  console.log(`copie propre : ${copie} à ${REF} = ${tete.slice(0, 8)} (écarts : ${ecarts}) ; parent du commit de la station (16be91f5) : ${station.slice(0, 8)}`)

  const juge = (nom, base) => {
    const args = ['scripts/pilotage-ecran-qa.mjs', '--partie=station', `--racine=${copie}`]
    if (base) args.push(`--base=${base}`)
    const t0 = Date.now()
    const r = sh(process.execPath, args, { cwd: BAC, timeout: 12 * 60_000 })
    const txt = sortie(r)
    fs.writeFileSync(path.join(PREUVES, `${p(nom)}.log`), `$ node ${args.join(' ')}\n# copie à ${tete} · code ${r.status} · ${Math.round((Date.now() - t0) / 1000)} s\n\n${txt}`)
    const echecs = txt.split('\n').filter((l) => /^❌ ST-\d+/.test(l)).map((l) => l.match(/^❌ (ST-\d+)/)[1])
    const verdict = (txt.match(/--partie=station : (PASS|FAIL[^\n]*)/) || [])[1] || `sans verdict (code ${r.status})`
    return { code: r.status, verdict, echecs, duree: Math.round((Date.now() - t0) / 1000), txt }
  }

  // ── témoins : sans sabotage ───────────────────────────────────────────────────────────────────────────────
  const t1 = juge('temoin-base-HEAD', null)
  console.log(`TEMOIN 1 (base HEAD) : ${t1.verdict} · code ${t1.code} · ${t1.duree} s · critères rouges : ${t1.echecs.join(', ') || 'aucun'}`)
  const t2 = juge('temoin-base-station', `${station}`)
  console.log(`TEMOIN 2 (base ${station.slice(0, 8)}) : ${t2.verdict} · code ${t2.code} · ${t2.duree} s · critères rouges : ${t2.echecs.join(', ') || 'aucun'}`)
  const base = t2.code === 0 ? station : null

  // ── le typecheck de la copie (node_modules du bac, lié) ───────────────────────────────────────────────────
  try { fs.symlinkSync(path.join(BAC, 'node_modules'), path.join(copie, 'node_modules')) } catch { /* déjà là */ }
  const tc = sh('npm', ['run', 'typecheck'], { cwd: copie, timeout: 10 * 60_000 })
  console.log(`TYPECHECK de la copie : code ${tc.status}`)
  fs.writeFileSync(path.join(PREUVES, 'contre-verif-04-10-typecheck.log'), `$ npm run typecheck (copie à HEAD ${tete})\n# code ${tc.status}\n\n${sortie(tc)}`)
  try { fs.unlinkSync(path.join(copie, 'node_modules')) } catch { /* rien */ }

  // ── 4 sabotages réversibles ───────────────────────────────────────────────────────────────────────────────
  const SABOTAGES = [
    { n: 1, f: 'app/controle/station/layout.tsx', attendu: 'ST-2',
      ancien: "if (!actif('pilotage')) notFound()", nouveau: "if (!actif('pilotage') && false) notFound()",
      texte: 'la garde du drapeau ne coupe plus : /controle/station répond 200 drapeau baissé' },
    { n: 2, f: 'app/controle/station/Commandement.tsx', attendu: 'ST-7',
      ancien: '<small className="mc-signature">{c.objectif.par}</small>', nouveau: "<small className=\"mc-signature\">{c.objectif.par.replace('PAR LE CHEF', 'PAR LE COMMANDANT')}</small>",
      texte: "l'objectif n'est plus signé « PAR LE CHEF »" },
    { n: 3, f: 'app/controle/station/station.css', attendu: 'ST-8 (et ST-16)',
      ancien: '.mc-element[data-nouveau] { animation: mc-entree 0.5s ease-out both; }', nouveau: '.mc-element[data-nouveau] { animation: mc-entree 0.5s ease-out both; }\n.mc-bandeau { animation: mc-entree 1s ease-in-out infinite alternate; }',
      texte: 'le bandeau tourne en boucle (animation infinie, garde de mouvement réduit intacte)' },
    { n: 4, f: 'app/controle/station/Attention.tsx', attendu: 'ST-13',
      ancien: '<span className="mc-att-titre">{c.titre}</span>', nouveau: '<span className="mc-att-titre">{c.titre}</span>\n            <button type="button" style={{ minHeight: 44 }}>Copier</button>',
      texte: 'une carte Attention porte un bouton « Copier »' },
  ]
  const lignes = []
  for (const s of SABOTAGES) {
    const f = path.join(copie, s.f)
    const origine = fs.readFileSync(f)
    const avant = sha(f)
    const occ = origine.toString('utf8').split(s.ancien).length - 1
    if (occ !== 1) { console.log(`SABOTAGE ${s.n} : ${occ} occurrence(s) de « ${s.ancien} » dans ${s.f} : une seule exigée, sabotage non joué`); lignes.push({ ...s, erreur: `${occ} occurrence(s)` }); continue }
    fs.writeFileSync(f, origine.toString('utf8').replace(s.ancien, () => s.nouveau))
    const sabotee = sha(f)
    const r = juge(`sabotage-${s.n}`, base)
    fs.writeFileSync(f, origine) // les octets d'origine, réécrits
    const apres = sha(f)
    const pris = r.code === 1 && r.echecs.length > 0
    lignes.push({ ...s, avant, sabotee, apres, restauree: avant === apres, verdict: r.verdict, code: r.code, echecs: r.echecs, pris })
    console.log(`SABOTAGE ${s.n} ${s.f} : ${r.verdict} · code ${r.code} · rouges : ${r.echecs.join(', ') || 'aucun'} · attendu ${s.attendu} · sha256 restaurée ${avant === apres ? 'OUI' : 'NON'}`)
  }
  fs.writeFileSync(path.join(PREUVES, 'contre-verif-04-10-resultats.json'), JSON.stringify({ tete, parentStation: station, copie: path.basename(copie), baseSabotages: base ?? 'HEAD', temoin1: { verdict: t1.verdict, code: t1.code, echecs: t1.echecs }, temoin2: { verdict: t2.verdict, code: t2.code, echecs: t2.echecs }, typecheck: tc.status, sabotages: lignes }, null, 2))

  sh('git', ['worktree', 'remove', '--force', copie], { cwd: BAC })
  const tous = lignes.length === SABOTAGES.length && lignes.every((l) => l.pris && l.restauree)
  console.log(`BILAN : témoin 1 ${t1.code === 0 ? 'PASS' : 'FAIL'}, témoin 2 ${t2.code === 0 ? 'PASS' : 'FAIL'}, typecheck ${tc.status}, sabotages pris ${lignes.filter((l) => l.pris).length}/${SABOTAGES.length}, restaurés ${lignes.filter((l) => l.restauree).length}/${SABOTAGES.length}`)
  process.exitCode = t1.code === 0 && tc.status === 0 && tous ? 0 : 1
}
main()
