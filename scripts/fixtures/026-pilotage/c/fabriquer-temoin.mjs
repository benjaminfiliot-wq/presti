// scripts/fixtures/026-pilotage/c/fabriquer-temoin.mjs — ce que le témoin du lot c (026-104, écrit par Claude Code) DÉRIVE
// de la référence : `node scripts/fixtures/026-pilotage/c/fabriquer-temoin.mjs` réécrit ces fichiers ; `--verifier` ne
// réécrit rien et sort en 1 si l'un d'eux n'est pas à jour (le contrôle JA-3 du lot le fait aussi, en mémoire).
//
//   lib/flags.ts            la référence avec le seul drapeau `pilotage: false,` ajouté (026-068) ;
//   app/controle/page.tsx   la référence avec la seule entrée « Station » en tête du rail et la redirection de
//                           ?onglet=pilotage&decision=<uuid> vers /controle/station (026-111, point 12) ;
//   les routes que la recette statique (RE-0) exige : celles des témoins des lots b (026-066, commité) et s (026-067),
//   recopiées telles quelles (elles ne sont jamais servies par le banc : l'écran les trouve par l'interception du juge).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..')
const TEMOIN = path.join(ICI, 'temoin')
export const REFERENCE = '4041ec9b41432576037dbc0b45e0647bd60a0347'
const lireRef = (rel) => {
  const r = spawnSync('git', ['show', `${REFERENCE}:${rel}`], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  if (r.status !== 0) throw new Error(`git show ${REFERENCE.slice(0, 7)}:${rel} : ${r.stderr}`)
  return r.stdout
}
const remplacerUne = (texte, avant, apres, quoi) => {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`${quoi} : « ${avant.slice(0, 60)} » figure ${n} fois, exactement 1 attendue`)
  return texte.replace(avant, () => apres)
}

export function derives() {
  const out = {}
  out['lib/flags.ts'] = remplacerUne(lireRef('lib/flags.ts'), '  audience: true,\n} as const',
    '  audience: true,\n  /** 026-068 — le Pilotage et la station Mission Control (/controle/station, /api/controle/pilotage, /api/controle/station).\n   *  TÉMOIN du lot c (026-104) : baissé ; le juge le lève dans sa copie seulement. */\n  pilotage: false,\n} as const', 'lib/flags.ts')
  let p = lireRef('app/controle/page.tsx')
  p = remplacerUne(p, "  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'\n",
    "  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'\n  // 026-111 : les liens du digest (/controle?onglet=pilotage&decision=<id>) mènent à la station, la décision gardée si c'est un UUID.\n  useEffect(() => { if (demande !== 'pilotage' || !actif('pilotage')) return; const d = params.get('decision'); router.replace(`/controle/station${d && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d) ? `?decision=${d}` : ''}`) }, [demande, params, router])\n", 'app/controle/page.tsx (redirection)')
  p = remplacerUne(p, '            {NAV.filter((e) => ONGLETS.includes(e.id)).map((e) => {\n',
    '            {actif(\'pilotage\') ? <a href="/controle/station" data-entree-station><span><b>Station</b><small>Mission Control : agents, argent, attention</small></span></a> : null}\n            {NAV.filter((e) => ONGLETS.includes(e.id)).map((e) => {\n', 'app/controle/page.tsx (entrée Station)')
  out['app/controle/page.tsx'] = p
  return out
}
// Les routes de RE-0, recopiées des témoins des lots b et s (présence seulement).
export const ROUTES_RE0 = {
  'app/api/controle/pilotage/route.ts': 'b', 'app/api/controle/pilotage/decisions/[id]/route.ts': 'b', 'app/api/controle/pilotage/appels/[id]/route.ts': 'b',
  'app/api/controle/pilotage/agents/[nom]/route.ts': 'b', 'app/api/controle/pilotage/consignes/route.ts': 'b', 'app/api/controle/pilotage/gestes/route.ts': 'b',
  'app/api/controle/station/route.ts': 's', 'app/api/agents/reunion/route.ts': 's',
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verifier = process.argv.includes('--verifier')
  const faux = []
  for (const [rel, texte] of Object.entries(derives())) {
    const f = path.join(TEMOIN, `${rel}.temoin`)
    if (verifier) { if ((fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null) !== texte.replace(/\r\n/g, '\n')) faux.push(rel); continue }
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, texte)
  }
  for (const [rel, lot] of Object.entries(ROUTES_RE0)) {
    const f = path.join(TEMOIN, `${rel}.temoin`)
    const src = path.join(ICI, '..', lot, 'temoin', `${rel}.temoin`)
    if (verifier) { if (!fs.existsSync(f) || !fs.statSync(f).size) faux.push(rel); continue }
    if (!fs.existsSync(src)) { console.log(`${rel} : absent du témoin du lot ${lot}, gardé tel quel`); continue }
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(src, f)
  }
  console.log(verifier ? (faux.length ? `pas à jour : ${faux.join(', ')}` : 'témoin dérivé à jour') : 'témoin dérivé écrit')
  process.exit(faux.length ? 1 : 0)
}
