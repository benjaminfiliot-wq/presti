#!/usr/bin/env node
// Sabotages de crieur-qa --partie=route (lot « tout est automatique », 04/10/2026) : chaque faute est posée DANS UN BAC GELÉ de
// l'usine (node scripts/usine.mjs executer -- node scripts/sabotages-crieur-qa-0410.mjs M0 M1 …), le juge est
// rejoué, le critère visé doit passer au rouge, puis le fichier est restauré. Un sabotage non pris = code 1.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
const R = process.cwd()
const ROUTE = 'app/api/cron/crieur/route.ts', PUBLORA = 'lib/crieur/publora.ts'
const unique = (t, a) => { const n = t.split(a).length - 1; if (n !== 1) throw new Error(`motif attendu 1 fois, trouvé ${n} : ${a.slice(0, 80)}`); return a }
const MUT = {
  M0: { nom: 'témoin vert (aucune faute)', fichier: ROUTE, fn: (t) => t, attendu: null },
  H1: { nom: "hermétique : clé Publora absente et coût déclaré à 0,5 dans l'environnement de la machine", fichier: ROUTE, fn: (t) => t, attendu: null, env: { PUBLORA_API_KEY: '', PUBLORA_COUT_PAR_PUBLICATION_EUR: '0.5' } },
  H2: { nom: "hermétique : clé quelconque et coût 0 dans l'environnement de la machine", fichier: ROUTE, fn: (t) => t, attendu: null, env: { PUBLORA_API_KEY: 'cle-bidon-pour-le-test', PUBLORA_COUT_PAR_PUBLICATION_EUR: '0' } },
  M1: { nom: 'programmation sans coût nul exigé (route)', fichier: ROUTE, attendu: 'CR-7BIS',
    fn: (t) => t.replace(unique(t, "if (process.env.PUBLORA_COUT_PAR_PUBLICATION_EUR !== '0') { erreurs++; incidents.push('Crieur : coût Publora inconnu ou positif, programmation refusée'); continue }"), '') },
  M2: { nom: 'programmerPublication accepte un coût inconnu (publora.ts)', fichier: PUBLORA, attendu: 'CR-7BIS',
    fn: (t) => t.replace(unique(t, "if (coutEuros !== 0) throw new Error('Crieur : coût inconnu ou positif, programmation refusée')"), '') },
  M3: { nom: "écriture de 'programmee' sans relire la pause après la demande", fichier: ROUTE, attendu: 'CR-7BIS',
    fn: (t) => { const re = /(await programmerPublication\([^\n]*\r?\n\s*)if \(!\(await sortiePermise\(\)\)\.permise\) \{/; if (!re.test(t)) throw new Error('motif M3 absent'); return t.replace(re, (m, a) => `${a}if (false) {`) } },
  M4: { nom: 'pause générale sans suspension des programmées (première lecture)', fichier: ROUTE, attendu: 'CR-7BIS',
    fn: (t) => t.replace('const bilan = await signalerProgrammees()', "const bilan: Awaited<ReturnType<typeof signalerProgrammees>> = { ok: true, programmees: 0, suspendues: 0, signalees: false }") },
  M5: { nom: "statut 'programmee' inséré d'emblée à la réservation", fichier: ROUTE, attendu: 'CR-7BIS',
    fn: (t) => t.replace(unique(t, "statut: 'erreur', programmee_pour: pub.programmee_pour, raisons })"), "statut: 'programmee', programmee_pour: pub.programmee_pour, raisons })") },
  M6: { nom: 'coût passé à programmerPublication ≠ 0 (route)', fichier: ROUTE, attendu: 'CR-7BIS',
    fn: (t) => { const re = /(await programmerPublication\(publoraId, pub\.programmee_pour, `crieur-\$\{reservation\.data\.id\}`, )0\)/; if (!re.test(t)) throw new Error('motif M6 absent'); return t.replace(re, (m, a) => `${a}1)`) } },
  M7: { nom: 'pause lue par pauseGenerale (ouvre au doute) au lieu de sortiePermise', fichier: ROUTE, attendu: 'CR-17',
    fn: (t) => t.replace(unique(t, "from '@/lib/agents/sortie'"), "from '@/lib/agents/pause'") },
  M8: { nom: 'première lecture de la pause neutralisée (crieur_posts lu avant)', fichier: ROUTE, attendu: 'CR-17',
    fn: (t) => t.replace('if (!(await sortiePermise()).permise) {', 'if (false) {') },
  M9: { nom: 'scheduledTime envoyé dans create-post', fichier: PUBLORA, attendu: 'CR-7',
    fn: (t) => t.replace(unique(t, "const corps = { content: publication.contenu, platforms: publication.plateformes,"), "const corps = { content: publication.contenu, platforms: publication.plateformes, scheduledTime: '2030-01-01T00:00:00Z',") },
  M10: { nom: 'jeton non contrôlé', fichier: ROUTE, attendu: 'CR-5',
    fn: (t) => t.replace(unique(t, "if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })"), '') },
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MUT)
let nonPris = 0
for (const id of ids) {
  const m = MUT[id]; if (!m) { console.log(`SABOTAGE ${id} : inconnu`); nonPris++; continue }
  const f = `${R}/${m.fichier}`, original = fs.readFileSync(f, 'utf8')
  let sortie = '', code = null, erreurMutation = null
  try {
    const muté = m.fn(original)
    if (m.attendu !== null && muté === original) throw new Error('mutation sans effet')
    fs.writeFileSync(f, muté)
    const r = spawnSync(process.execPath, ['scripts/crieur-qa.mjs', '--partie=route'], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 900_000, env: { ...process.env, ...(m.env || {}) } })
    sortie = `${r.stdout || ''}${r.stderr || ''}`; code = r.status
  } catch (e) { erreurMutation = String(e.message || e) } finally { fs.writeFileSync(f, original) }
  if (erreurMutation) { console.log(`SABOTAGE ${id} (${m.nom}) : NON POSÉ — ${erreurMutation}`); nonPris++; continue }
  if (m.attendu === null) {
    const vert = code === 0 && /crieur-qa : PASS/.test(sortie)
    console.log(`TÉMOIN ${id} (${m.nom}) : ${vert ? 'VERT (code 0)' : `ROUGE (code ${code}) — ANORMAL`}`)
    if (!vert) { nonPris++; console.log(sortie.split('\n').filter((l) => /^FAIL/.test(l)).join('\n')) }
    continue
  }
  const rouge = new RegExp(`^FAIL ${m.attendu}\\b`, 'm').test(sortie) && code === 1
  const autres = [...sortie.matchAll(/^FAIL (CR-[0-9A-Z]+)/gm)].map((x) => x[1]).filter((x) => x !== m.attendu)
  console.log(`SABOTAGE ${id} (${m.nom}) → ${m.attendu} : ${rouge ? 'PRIS (rouge, code 1)' : `NON PRIS (code ${code})`}${autres.length ? ` · autres rouges : ${[...new Set(autres)].join(',')}` : ''}`)
  if (!rouge) { nonPris++; console.log(sortie.split('\n').filter((l) => /^(PASS|FAIL) CR-/.test(l)).join('\n').slice(0, 1500)) }
}
console.log(nonPris === 0 ? `SABOTAGES : ${ids.length}/${ids.length} conformes` : `SABOTAGES : ${nonPris} NON PRIS`)
process.exitCode = nonPris === 0 ? 0 : 1
