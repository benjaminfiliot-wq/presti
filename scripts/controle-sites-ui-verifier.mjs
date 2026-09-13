// scripts/controle-sites-ui-verifier.mjs — le vérificateur de la tâche 014-14 : l'onglet « Sites » du Poste de contrôle
// (v15 §3.2, l'écran de validation humaine). Mécanique : fichiers, garde-fous, contrat d'API, synchronisation des
// onglets, capture, typecheck, garde de commit. Le goût, c'est Benj.
//
// Usage : node scripts/controle-sites-ui-verifier.mjs      (code 0 si tout passe, 1 sinon)
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
const comp = lire(path.join(RACINE, 'app', 'controle', 'Sites.tsx'))
T('app/controle/Sites.tsx existe', comp.length > 0)
T('il passe par apiDirection (app/controle/client.ts), jamais par supabaseAdmin ni supabase.from', /apiDirection/.test(comp) && !/supabaseAdmin|\.from\('sites_commandes'\)/.test(comp))
T('il lit GET /api/controle/sites', /\/api\/controle\/sites/.test(comp))
T("il envoie POST /api/controle/sites/<id> avec action valider et regenerer", /action:\s*'valider'/.test(comp) && /action:\s*'regenerer'/.test(comp))
T('la consigne de régénération est demandée avant d’envoyer', /consigne/.test(comp))
T('les libellés d’état viennent de LIBELLE_ETAT (lib/siteCommande)', /LIBELLE_ETAT/.test(comp) && /from '@\/lib\/siteCommande'/.test(comp))
T('les quatre scores Lighthouse sont affichés quand ils existent', /scores/.test(comp) && /(performance|Performance)/.test(comp) && /(seo|SEO)/.test(comp))
// 014-14 livre l'onglet sans aperçu ni mise en ligne ; 014-18 (--avec-hebergement) les ajoute, une fois les routes prêtes.
const AVEC_HEBERGEMENT = process.argv.includes('--avec-hebergement')
if (!AVEC_HEBERGEMENT) T("pas d'aperçu ni de mise en ligne inventés (fonctionnalités pas encore construites)", !/mettre_en_ligne|apercu_jeton|Mettre en ligne/.test(comp))
else {
  T("le lien d'aperçu privé (`apercu`) est affiché quand il existe", /\.apercu\b|apercu\b/.test(comp) && /noopener/.test(comp))
  T("« Mettre en ligne » envoie action: 'mettre_en_ligne', réservé à l'état validee", /action:\s*'mettre_en_ligne'/.test(comp) && /'validee'/.test(comp))
  T('les enregistrements DNS rendus sont affichés (type, nom, valeur)', /dns/.test(comp) && /value/.test(comp))
}

console.log('── 2. Le rail du Poste de contrôle')
const page = lire(path.join(RACINE, 'app', 'controle', 'page.tsx'))
T("'sites' dans le type Onglet", /'sites'/.test(page.slice(page.indexOf('type Onglet'), page.indexOf('type Onglet') + 400)))
T("ONGLETS ajoute 'sites' derrière actif('siteCommande')", /actif\('siteCommande'\)\s*\?\s*\(\[\s*'sites'/.test(page))
T('TITRES et NAV connaissent sites', /sites:\s*'/.test(page) && /id:\s*'sites'/.test(page))
T('Sites.tsx est rendu pour cet onglet', /<Sites\b/.test(page) && /from '@\/app\/controle\/Sites'|from '\.\/Sites'/.test(page))

console.log('── 3. Rien hors périmètre depuis la prise de la tâche')
let porcelain = ''
try { porcelain = spawnSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }).stdout } catch { /* hors git */ }
const chemins = (txt) => txt.split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
const avant = [path.join(RACINE, '.orchestre', 'en-cours', '014-14.avant.txt'), path.join(RACINE, '.orchestre', 'preuves', '014-14', 'avant.txt')].find((p) => fs.existsSync(p)) || ''
const dejaSales = new Set(fs.existsSync(avant) ? chemins(lire(avant)) : [])
const SENSIBLE = /^(app\/|lib\/|supabase\/|scripts\/|middleware\.ts$)/
const PERIMETRE = [/^app\/controle\/Sites\.tsx$/, /^app\/controle\/page\.tsx$/]
const hors = chemins(porcelain).filter((p) => SENSIBLE.test(p) && !dejaSales.has(p) && !PERIMETRE.some((re) => re.test(p)))
T('rien de nouveau dans app/, lib/, supabase/, scripts/ hors app/controle/Sites.tsx et app/controle/page.tsx', hors.length === 0, hors.slice(0, 6).join(', '))

console.log('── 4. La capture')
const preuves = path.join(RACINE, '.orchestre', 'preuves', '014-14')
T('onglet-sites.png dans .orchestre/preuves/014-14/ — un vrai PNG (≥ 10 Ko)', pngValide(path.join(preuves, 'onglet-sites.png')))

console.log('── 5. Typecheck et garde de commit')
const tc = spawnSync('npm', ['run', 'typecheck'], { cwd: RACINE, encoding: 'utf8', shell: process.platform === 'win32' })
T('tsc --noEmit', tc.status === 0, (tc.stdout + tc.stderr).split('\n').find((l) => /error TS/.test(l)) || `code ${tc.status}`)
const gc = spawnSync(process.execPath, ['scripts/garde-commit.mjs'], { cwd: RACINE, encoding: 'utf8' })
T('garde-commit', gc.status === 0, (gc.stdout + gc.stderr).trim().split('\n').at(-1))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
