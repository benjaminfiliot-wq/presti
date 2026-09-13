// scripts/controle-cerveaux-ui-verifier.mjs — le vérificateur de la tâche 014-16 : l'onglet « Cerveaux » du Poste de
// contrôle (v15 §8.3). Mécanique : fichiers, contrat d'API, synchronisation des onglets, périmètre, capture, typecheck.
//
// Usage : node scripts/controle-cerveaux-ui-verifier.mjs      (code 0 si tout passe, 1 sinon)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pngValide } from './lib/preuves.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let ko = 0
const T = (nom, cond, detail = '') => { if (cond) console.log(`  ✅ ${nom}`); else { ko++; console.log(`  ❌ ÉCHEC : ${nom}${detail ? ' — ' + detail : ''}`) } }
const lire = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''

console.log('── 1. Le composant')
const comp = lire(path.join(RACINE, 'app', 'controle', 'Cerveaux.tsx'))
T('app/controle/Cerveaux.tsx existe', comp.length > 0)
T('il passe par apiDirection, jamais par supabaseAdmin ni un accès fichier', /apiDirection/.test(comp) && !/supabaseAdmin|node:fs|readFileSync/.test(comp))
T('il lit GET /api/controle/cerveaux', /\/api\/controle\/cerveaux/.test(comp))
T('il affiche score, cas, ouverts et la dernière entrée', /score/.test(comp) && /ouverts/.test(comp) && /derniereEntree/.test(comp))
T('la phrase « Un score qui baisse ne se fusionne pas » est là', /ne se fusionne pas/.test(comp))

console.log('── 2. Le rail du Poste de contrôle')
const page = lire(path.join(RACINE, 'app', 'controle', 'page.tsx'))
T("'cerveaux' dans le type Onglet", /'cerveaux'/.test(page.slice(page.indexOf('type Onglet'), page.indexOf('type Onglet') + 500)))
T("ONGLETS contient 'cerveaux'", /ONGLETS[\s\S]{0,600}'cerveaux'/.test(page))
T('TITRES et NAV connaissent cerveaux', /cerveaux:\s*'/.test(page) && /id:\s*'cerveaux'/.test(page))
T('Cerveaux.tsx est rendu pour cet onglet', /<Cerveaux\b/.test(page) && /from '@\/app\/controle\/Cerveaux'|from '\.\/Cerveaux'/.test(page))

console.log('── 3. Rien hors périmètre depuis la prise de la tâche')
let porcelain = ''
try { porcelain = spawnSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }).stdout } catch { /* hors git */ }
const chemins = (txt) => txt.split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
const avant = path.join(RACINE, '.orchestre', 'en-cours', '014-16.avant.txt')
const dejaSales = new Set(fs.existsSync(avant) ? chemins(lire(avant)) : [])
const SENSIBLE = /^(app\/|lib\/|supabase\/|scripts\/|middleware\.ts$)/
const PERIMETRE = [/^app\/controle\/Cerveaux\.tsx$/, /^app\/controle\/page\.tsx$/]
const hors = chemins(porcelain).filter((p) => SENSIBLE.test(p) && !dejaSales.has(p) && !PERIMETRE.some((re) => re.test(p)))
T('rien de nouveau dans app/, lib/, supabase/, scripts/ hors app/controle/Cerveaux.tsx et app/controle/page.tsx', hors.length === 0, hors.slice(0, 6).join(', '))

console.log('── 4. La capture')
T('onglet-cerveaux.png dans .orchestre/preuves/014-16/ — un vrai PNG (≥ 10 Ko)', pngValide(path.join(RACINE, '.orchestre', 'preuves', '014-16', 'onglet-cerveaux.png')))

console.log('── 5. Typecheck et garde de commit')
const tc = spawnSync('npm', ['run', 'typecheck'], { cwd: RACINE, encoding: 'utf8', shell: process.platform === 'win32' })
T('tsc --noEmit', tc.status === 0, (tc.stdout + tc.stderr).split('\n').find((l) => /error TS/.test(l)) || `code ${tc.status}`)
const gc = spawnSync(process.execPath, ['scripts/garde-commit.mjs'], { cwd: RACINE, encoding: 'utf8' })
T('garde-commit', gc.status === 0, (gc.stdout + gc.stderr).trim().split('\n').at(-1))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
