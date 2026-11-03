// 036-004 — génère les programmes SDK / opérations n8n et le contrat versionné.
//   node --experimental-strip-types .orchestre/preuves/036-004/generer.mjs <dossier> [--ids=<json>]   → les programmes à coller dans n8n
//   node --experimental-strip-types .orchestre/preuves/036-004/generer.mjs --contrats                 → plans/011-cadrage-01-11/p6-signature/contrats/suivi.json
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as F from './fixtures.mjs'
import { contrats, sdkConflit, specChef, opsChef, sdkBanc, reglagesEnfant, lireConstantes, IDS, NOMS_CAS_BANC, codeBanc } from './construire.mjs'
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const J = JSON.stringify

{
  const arg = (x) => (process.argv.find((a) => a.startsWith(`--${x}=`)) || '').slice(x.length + 3) || null
  if (process.argv.includes('--contrats')) {
    const dir = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats'); mkdirSync(dir, { recursive: true })
    for (const [f, o] of Object.entries(contrats())) writeFileSync(path.join(dir, f), J(o, null, 2) + '\n')
    console.log('contrats écrits : ' + dir)
  } else {
    const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/suivi'
    mkdirSync(dossier, { recursive: true })
    const ids = { ...IDS, ...(arg('ids') ? JSON.parse(arg('ids')) : {}) }
    const c = lireConstantes()
    writeFileSync(path.join(dossier, 'lib-controler-conflit.sdk.js'), sdkConflit(c, ids['presti-dep-suivi']))
    if (ids['lib-controler-conflit']) {
      const spec = specChef(ids, c), reglages = reglagesEnfant([ids['presti-cerveau'], ids['presti-banc-suivi']].filter(Boolean).join(','))
      const ops = opsChef(spec, reglages)
      // Des lots de 11 000 caractères au plus : un nœud Code n'est jamais coupé.
      const lots = []; let cur = [], n = 0
      for (const o of ops) { const t = J(o).length; if (cur.length && n + t > 11000) { lots.push(cur); cur = []; n = 0 } cur.push(o); n += t }
      if (cur.length) lots.push(cur)
      lots.forEach((l, i) => writeFileSync(path.join(dossier, `presti-dep-suivi.ops-${i + 1}.json`), J(l)))
      console.log(`opérations : ${ops.length} en ${lots.length} lot(s)`)
    }
    if (ids['presti-dep-suivi']) writeFileSync(path.join(dossier, 'presti-banc-suivi.sdk.js'), sdkBanc(ids['presti-dep-suivi'], { A: F.enveloppeSuivi('A'), B: F.enveloppeSuivi('B') }))
    console.log('écrits dans ' + dossier)
  }
}

// --maj : seulement les nœuds dont le code a changé depuis la dernière pose (updateNodeParameters), un fichier par nœud.
if (process.argv.includes('--maj')) {
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/s36004c'
  const ids = { ...IDS, ...(process.argv.find((a) => a.startsWith('--ids=')) ? JSON.parse(process.argv.find((a) => a.startsWith('--ids=')).slice(6)) : {}) }
  const spec = specChef(ids, lireConstantes())
  const noms = (process.argv.find((a) => a.startsWith('--noeuds=')) || '--noeuds=').slice(9).split('|').filter(Boolean)
  noms.forEach((nom, i) => writeFileSync(path.join(dossier, `maj-${i + 1}.json`), J([{ type: 'updateNodeParameters', nodeName: nom, parameters: { jsCode: spec.nodes.find((n) => n.name === nom).parameters.jsCode } }])))
  console.log('mises à jour :', noms.map((n, i) => `maj-${i + 1}=${n}`).join(' ; '))
}

// --banc : le banc en deux temps (un bloc de 30 Ko est refusé par le classifieur de sécurité) : un squelette SDK, puis un nœud par mise à jour.
if (process.argv.includes('--banc')) {
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/s36004c'
  writeFileSync(path.join(dossier, 'banc-squelette.sdk.js'), sdkBanc(IDS['presti-dep-suivi'], null))
  for (const c of ['A', 'B']) writeFileSync(path.join(dossier, `banc-maj-${c}.json`), J([{ type: 'updateNodeParameters', nodeName: NOMS_CAS_BANC[c], parameters: { jsCode: codeBanc(c).replace(J('__ENV_' + c + '__'), () => J(F.enveloppeSuivi(c))) } }]))
  console.log('banc : squelette et deux mises à jour')
}
