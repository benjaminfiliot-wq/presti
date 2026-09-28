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
import { pngValide } from './lib/preuves.mjs'

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
const avant = [path.join(RACINE, '.orchestre', 'en-cours', '014-01.avant.txt'), path.join(RACINE, '.orchestre', 'preuves', '014-01', 'avant.txt')].find((p) => fs.existsSync(p)) || ''
const dejaSales = new Set(fs.existsSync(avant) ? chemins(fs.readFileSync(avant, 'utf8')) : [])
// Seules les zones sensibles comptent (app/, lib/, supabase/, scripts/, middleware/proxy).
// Next 16 (fiche 026-004) : `middleware.ts` devient `proxy.ts` — les deux noms comptent.
const SENSIBLE = /^(app\/|lib\/|supabase\/|scripts\/|(middleware|proxy)\.ts$)/
const horsPerimetre = chemins(porcelain).filter((p) => SENSIBLE.test(p) && !dejaSales.has(p) && !PERIMETRE.some((re) => re.test(p)))
T('rien de nouveau dans app/, lib/, supabase/, scripts/ hors app/site/commander/** et app/AppShell.tsx', horsPerimetre.length === 0, horsPerimetre.slice(0, 6).join(', '))

console.log('── 5. Les captures — prises par le juge, pas par l\'agent (13/09 : quatre fichiers identiques livrés pour quatre écrans)')
// Chaque écran doit être adressable : /site/commander?etape=domaine|zone|matiere|paiement. Le juge lance le serveur,
// crée un compte artisan de test, capture en 390 px, supprime le compte. Les captures écrasent tout ce que l'agent a déposé.
const { capturer, distinctes } = await import('./lib/capture.mjs')
// Le titre (h3) de chaque écran, tel que la page l'écrit : le fil d'Ariane, lui, nomme les quatre étapes sur tous les écrans.
const ETAPES = [['domaine', 'Nom de domaine'], ['zone', 'Métier & Zone'], ['matiere', 'La matière'], ['paiement', 'Paiement']]
let ecrans = []
try {
  ecrans = await capturer({ racine: RACINE, dossier: PREUVES, largeur: 390, hauteur: 844, role: 'artisan', ecrans: ETAPES.map(([e, titre], i) => ({ nom: `ecran-${i + 1}`, chemin: `/site/commander?etape=${e}`, attendre: { dans: 'h3', texte: titre } })) })
} catch (e) { T('le juge a pu capturer (serveur next dev, compte de test, navigateur)', false, e.message.slice(0, 300)) }
if (ecrans.length === 4) {
  T('les quatre écrans se rendent connecté (pas de renvoi vers /login, pas de 404)', ecrans.every((r) => r.ok && !/\/login/.test(r.url) && !/404|introuvable|not found/i.test(r.texte)), ecrans.map((r) => `${r.nom} → ${r.url}`).join(' · '))
  T('quatre captures différentes : la page honore ?etape=domaine|zone|matiere|paiement', distinctes(ecrans), 'des captures identiques — la page ignore ?etape=')
  T('chaque écran ouvre sur son propre titre (h3 : Nom de domaine / Métier & Zone / La matière / Paiement)', ecrans.every((r) => r.attendu === true), ecrans.filter((r) => r.attendu !== true).map((r) => `${r.nom} (${r.chemin}) n'affiche pas son h3`).join(' · '))
  T('les quatre captures sont de vrais PNG (≥ 10 Ko)', ecrans.every((r) => pngValide(r.fichier)))
}

console.log('── 6. Typecheck et garde de commit')
const tc = spawnSync('npm', ['run', 'typecheck'], { cwd: RACINE, encoding: 'utf8', shell: process.platform === 'win32' })
T('tsc --noEmit', tc.status === 0, (tc.stdout + tc.stderr).split('\n').find((l) => /error TS/.test(l)) || `code ${tc.status}`)
const gc = spawnSync(process.execPath, ['scripts/garde-commit.mjs'], { cwd: RACINE, encoding: 'utf8' })
T('garde-commit', gc.status === 0, (gc.stdout + gc.stderr).trim().split('\n').at(-1))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
