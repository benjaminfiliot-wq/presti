// scripts/fixtures/026-pilotage/b/fabriquer-temoin.mjs — refabrique ce que le témoin du lot b DÉRIVE de ses migrations de
// référence (fiche 026-066) : les jumeaux `_A_COLLER_sql_editor_<n>.sql` (copie) et `_NU.sql` (scripts/sql-nu.mjs, avec le
// contrôle en pied), et les comptes rendus d'essai FACTICES que pilotage-sql-qa lit sur le témoin (--essai=…).
//
//   node scripts/fixtures/026-pilotage/b/fabriquer-temoin.mjs
//
// À relancer après toute retouche d'une migration de référence (temoin/supabase/migrations/0*_*.sql.temoin) ou d'un
// scénario (scenarios-sql.mjs) : l'empreinte du nu et les clés du scénario changent. Un compte rendu factice n'est PAS un
// essai : aucun SQL n'a tourné ; il ne sert qu'à prouver que le juge sait lire un compte rendu conforme et en refuser un
// faux (sabotages de lot.mjs). Les vrais comptes rendus sont dans .orchestre/preuves/<fiche jugée>/essai-a-sec.txt.
// N'écrit que sous temoin/ et .orchestre/travail/fabriquer-temoin-b/.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { B, R, TRAVAIL, exigerSousTravail } from './commun.mjs'
import { jumeauNuCoupe, empreinte, clesScenario } from '../../../lib/sql-essai.mjs'
import { SCENARIOS } from './scenarios-sql.mjs'

const T = path.join(B, 'temoin')
const MIGRATIONS = [['0107', 'pilotage_lecture', 'lecture'], ['0108', 'pilotage_echanges', 'echanges'], ['0112', 'pilotage_station', 'station'], ['0113', 'station_reglages', 'reglages']]
const tmp = exigerSousTravail(path.join(TRAVAIL, 'fabriquer-temoin-b'))
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
let n = 0
for (const [num, nom, mig] of MIGRATIONS) {
  const src = path.join(T, 'supabase', 'migrations', `${num}_${nom}.sql.temoin`)
  const ctrl = path.join(T, 'supabase', 'controles', `${num}_${nom}.sql.temoin`)
  if (!fs.existsSync(src) || !fs.existsSync(ctrl)) { console.log(`— ${num}_${nom} : migration ou contrôle de référence absent, sauté`); continue }
  fs.copyFileSync(src, path.join(tmp, `${num}_${nom}.sql`))
  fs.copyFileSync(ctrl, path.join(tmp, `controle_${num}.sql`))
  const jumeau = `_A_COLLER_sql_editor_${num}.sql`, nu = `_A_COLLER_sql_editor_${num}_NU.sql`
  fs.copyFileSync(src, path.join(tmp, jumeau))
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'sql-nu.mjs'), `${num}_${nom}.sql`, nu, '--controle', `controle_${num}.sql`], { cwd: tmp, encoding: 'utf8', windowsHide: true })
  if (r.status !== 0) { console.log(`❌ sql-nu ${num} : ${r.stdout}${r.stderr}`); process.exit(1) }
  for (const f of [jumeau, nu]) fs.copyFileSync(path.join(tmp, f), path.join(T, 'supabase', 'migrations', `${f}.temoin`))
  const cles = clesScenario(SCENARIOS[mig])
  const resultat = Object.fromEntries(cles.map((k) => [k, true]))
  const texte = [
    `COMPTE RENDU FACTICE du témoin du lot b (fiche 026-066) pour --migration=${mig} : AUCUN essai n'a tourné.`,
    'Il reprend la forme de ce que execute_sql rend (le message de l\'exception) pour prouver que pilotage-sql-qa sait le lire.',
    `ERROR:  P0001: ESSAI_A_SEC ${empreinte(jumeauNuCoupe(path.join(tmp, nu)))} ${JSON.stringify(resultat)}`,
    'APRES rien_ne_reste=true',
    '',
  ].join('\n')
  const dest = path.join(T, 'scripts', 'fixtures', '026-pilotage', 'b', 'essais', `${mig}.txt.temoin`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, texte)
  console.log(`✅ ${num}_${nom} : jumeaux refaits, compte rendu factice à ${cles.length} clés`)
  n++
}
console.log(`${n} migration(s) de référence traitée(s)`)

// ── Les fichiers EXISTANTS que les fiches jugées retouchent, dérivés de la référence du lot (4041ec9) ────────────────────
// lib/flags.ts gagne `pilotage: false,` (026-068) ; scripts/fermeture-e2e.mjs gagne la ligne 'pilotage' de sa carte (026-068,
// complétée par 026-074) ; lib/direction/journal.ts gagne les neuf actions de 026-074. Rien d'autre ne bouge : RL-1 et GE-5
// comparent ces fichiers, clé par clé et ligne par ligne, au commit de base (--base=4041ec9 dans lot.mjs).
const REF = '4041ec9b41432576037dbc0b45e0647bd60a0347'
const { lireBase } = await import('./commun.mjs')
const inserer = (rel, avant, ajout) => {
  const src = lireBase(REF, rel)
  if (src === null || src.split(avant).length !== 2) { console.log(`❌ ${rel} : « ${avant} » introuvable (ou en double) dans ${REF.slice(0, 7)}`); process.exit(1) }
  const dest = path.join(T, `${rel}.temoin`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, src.replace(avant, () => ajout + avant))
  console.log(`✅ ${rel} dérivé de ${REF.slice(0, 7)}`)
}
inserer('lib/flags.ts', '} as const', "  /** 026-068 — le Pilotage de la station (GET /api/controle/pilotage et ses routes d'écriture) : baissé, chaque route\n   *  répond 404 et la station n'existe pas. Se lève à la recette (026-140). */\n  pilotage: false,\n")
const ROUTES = ['app/api/controle/pilotage/route.ts', 'app/api/controle/pilotage/decisions/[id]/route.ts', 'app/api/controle/pilotage/appels/[id]/route.ts', 'app/api/controle/pilotage/agents/[nom]/route.ts', 'app/api/controle/pilotage/consignes/route.ts', 'app/api/controle/pilotage/gestes/route.ts']
inserer('scripts/fermeture-e2e.mjs', "    'inventaireOcr':", `    'pilotage': ['route', '/api/controle/pilotage', 'GET', ${ROUTES.map((r) => `'${r}'`).join(', ')}],\n`)
inserer('lib/direction/journal.ts', "\n\nexport type Entree", "\n  // Le Pilotage de la station (026-074) : les gestes du fondateur, chacun journalisé avant d'agir.\n  | 'decision_tranchee' | 'appel_rendu' | 'agent_pause' | 'consigne_transmise'\n  | 'envoi_froid_ouvert' | 'technologie_reprise' | 'canal_rouvert' | 'modele_leve' | 'palier_plafond'")
