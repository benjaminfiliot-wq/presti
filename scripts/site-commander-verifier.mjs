// scripts/site-commander-verifier.mjs — le vérificateur mécanique de la tâche 014-01 (les quatre écrans de
// /site/commander, prompt v15 §3.1). Il ne juge pas le goût — Benj le fait avec ses yeux (H5) — il vérifie ce
// qui se vérifie sans yeux : les fichiers attendus, les garde-fous, le contrat d'API respecté, aucune écriture
// hors périmètre, les captures déposées, le typecheck et la garde de commit.
//
// Usage : node scripts/site-commander-verifier.mjs      (code 0 si tout passe, 1 sinon — c'est le verdict d'orchestre.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.join(RACINE, 'app', 'site', 'commander')
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', '014-01')
const PERIMETRE = [/^app\/site\/commander\//, /^app\/AppShell\.tsx$/, /^\.orchestre\//]

let ko = 0
const T = (nom, cond, detail = '') => { if (cond) console.log(`  ✅ ${nom}`); else { ko++; console.log(`  ❌ ÉCHEC : ${nom}${detail ? ' — ' + detail : ''}`) } }
const sources = () => {
  const out = []
  const rec = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else if (/\.tsx?$/.test(e.name)) out.push(p) } }
  rec(DOSSIER)
  return out
}
const tout = () => sources().map((f) => fs.readFileSync(f, 'utf8')).join('\n')

console.log('── 1. Les fichiers et les garde-fous')
const page = path.join(DOSSIER, 'page.tsx')
T('app/site/commander/page.tsx existe', fs.existsSync(page))
const src = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : ''
T("la page est gated : actif('siteCommande') + notFound()", /actif\('siteCommande'\)/.test(src) && /notFound\(\)/.test(src))
T('la page vit dans AppShell (console, pas site public)', /AppShell/.test(src))
const code = tout()
T('aucun secret ni client serveur côté client (supabaseAdmin, stripe, service_role)', !/supabaseAdmin|from 'stripe'|SERVICE_ROLE/.test(code))
T("aucun accès direct à la table (supabase.from('sites_commandes')) : tout passe par l'API", !/from\('sites_commandes'\)/.test(code))
T('aucun téléversement direct dans le bucket (supabase.storage) : /api/media seulement', !/\.storage\./.test(code) && /\/api\/media/.test(code))

console.log('── 2. Le contrat d’API')
T('GET/PUT /api/site/commander/brouillon utilisés', /\/api\/site\/commander\/brouillon/.test(code) && /PUT/.test(code))
T('POST /api/site/commander utilisé (la page Stripe)', /'\/api\/site\/commander'|`\/api\/site\/commander`|"\/api\/site\/commander"/.test(code) && /POST/.test(code))
T("le prix et le délai viennent de lib/siteCommande, jamais en dur", /from '@\/lib\/siteCommande'/.test(code) && /PRIX_SITE_TEXTE|PRIX_SITE_CENTS/.test(code) && !/300\s?€/.test(code.replace(/PRIX_SITE_TEXTE/g, '')))
T('les quatre écrans existent (domaine, zone, matière, paiement)', /domaine/.test(code) && /zone/.test(code) && /matiere/.test(code) && /paiement/.test(code))
T("retour Stripe géré (paiement=ok / paiement=annule)", /paiement=ok|'ok'/.test(code) && /annule/.test(code))

console.log('── 3. Le menu')
const shell = fs.readFileSync(path.join(RACINE, 'app', 'AppShell.tsx'), 'utf8')
T("entrée de menu /site/commander présente et gated par actif('siteCommandeVente')", /\/site\/commander/.test(shell) && /actif\('siteCommandeVente'\)/.test(shell))

console.log('── 4. Rien hors périmètre')
let porcelain = ''
try { porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }) } catch { /* hors git */ }
const chemins = (txt) => txt.split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
// L'état de l'arbre quand la tâche a été prise (écrit par orchestre.mjs prochaine) : on ne reproche à la tâche que
// ce qui a changé depuis — le dépôt porte souvent d'autres chantiers non committés, qui ne sont pas de son fait.
const avant = path.join(RACINE, '.orchestre', 'en-cours', '014-01.avant.txt')
const dejaSales = new Set(fs.existsSync(avant) ? chemins(fs.readFileSync(avant, 'utf8')) : [])
// Seules les zones sensibles comptent (app/, lib/, supabase/, scripts/, middleware).
const SENSIBLE = /^(app\/|lib\/|supabase\/|scripts\/|middleware\.ts$)/
const horsPerimetre = chemins(porcelain).filter((p) => SENSIBLE.test(p) && !dejaSales.has(p) && !PERIMETRE.some((re) => re.test(p)))
T('rien de nouveau dans app/, lib/, supabase/, scripts/ hors app/site/commander/** et app/AppShell.tsx', horsPerimetre.length === 0, horsPerimetre.slice(0, 6).join(', '))

console.log('── 5. Les captures')
const captures = fs.existsSync(PREUVES) ? fs.readdirSync(PREUVES).filter((f) => /^ecran-[1-4]\.png$/.test(f)) : []
T('quatre captures ecran-1.png … ecran-4.png dans .orchestre/preuves/014-01/', captures.length === 4, `${captures.length} trouvée(s)`)

console.log('── 6. Typecheck et garde de commit')
const tc = spawnSync('npm', ['run', 'typecheck'], { cwd: RACINE, encoding: 'utf8', shell: process.platform === 'win32' })
T('tsc --noEmit', tc.status === 0, (tc.stdout + tc.stderr).split('\n').find((l) => /error TS/.test(l)) || `code ${tc.status}`)
const gc = spawnSync(process.execPath, ['scripts/garde-commit.mjs'], { cwd: RACINE, encoding: 'utf8' })
T('garde-commit', gc.status === 0, (gc.stdout + gc.stderr).trim().split('\n').at(-1))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
