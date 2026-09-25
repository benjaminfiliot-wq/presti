// scripts/site-sorti-des-formules-verifier.mjs — le vérificateur de la tâche 014-12 (v15 §2.1 et §2.3) : le site
// vitrine n'est plus inclus dans aucune formule, et plus rien ne le promet — grille, landing, abonnement, aide,
// éditeur de site, publications, guide de démarchage. Mécanique : présence/absence de textes, drapeau, typecheck.
//
// Usage : node scripts/site-sorti-des-formules-verifier.mjs      (code 0 si tout passe, 1 sinon)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VAULT = path.resolve(RACINE, '..', 'SaaS')
let ko = 0
const T = (nom, cond, detail = '') => { if (cond) console.log(`  ✅ ${nom}`); else { ko++; console.log(`  ❌ ÉCHEC : ${nom}${detail ? ' — ' + detail : ''}`) } }
const lire = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const dit = (texte, ...mots) => mots.some((m) => sansAccents(texte).includes(sansAccents(m)))
const rec = (d, garder) => { const out = []; const f = (x) => { if (!fs.existsSync(x)) return; for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) f(p); else if (garder(p)) out.push(p) } }; f(d); return out }

console.log('── 1. La grille (lib/plans.ts)')
const plans = lire(path.join(RACINE, 'lib', 'plans.ts'))
const listes = plans.slice(plans.indexOf('const BASE'), plans.indexOf('export const PLANS'))
T("aucune capacité site.essentiel/pro/signature/slides3d dans BASE, STUDIO, SIGNATURE", !/'site\.(essentiel|pro|signature|slides3d)'/.test(listes))
T("plus de ligne « Site vitrine » dans la grille", !/label: 'Site vitrine'/.test(plans))
T("le domaine s'appelle « Votre nom de domaine sur la page de conversation »", /'Votre nom de domaine sur la page de conversation'/.test(plans))

console.log('── 2. Le bloc de vente, hors grille, derrière le drapeau')
for (const f of ['app/page.tsx', 'app/abonnement/page.tsx']) {
  const src = lire(path.join(RACINE, f))
  T(`${f} rend SITE_A_LA_DEMANDE (lib/siteCommande)`, /SITE_A_LA_DEMANDE/.test(src) && /from '@\/lib\/siteCommande'/.test(src))
  T(`${f} le conditionne à actif('siteCommandeVente')`, /actif\('siteCommandeVente'\)/.test(src))
  T(`${f} n'écrit pas 300 € en dur`, !/300\s?€/.test(src.replace(/PRIX_SITE_TEXTE|SITE_A_LA_DEMANDE/g, '')))
}

console.log('── 3. Plus rien ne promet le site inclus')
const promesses = ['site vitrine inclus', 'inclus dès l’Essentiel', "inclus des l'Essentiel", 'votre formule inclut le site', 'site vitrine — trois niveaux', 'site vitrine - trois niveaux']
const fichiers = [
  ...rec(path.join(RACINE, 'app', 'aide'), (p) => /\.tsx?$/.test(p)), path.join(RACINE, 'lib', 'aide.ts'), path.join(RACINE, 'app', 'profil', 'page.tsx'), path.join(RACINE, 'app', 'page.tsx'),
  ...rec(path.join(RACINE, 'app', 'abonnement'), (p) => /\.tsx?$/.test(p)), path.join(RACINE, 'plans', 'publications-lancement.md'), path.join(VAULT, 'Prospection', 'Guide-Presti-Demarchage.md'),
]
for (const f of fichiers) {
  const src = lire(f)
  if (!src) continue
  const trouvees = promesses.filter((p) => dit(src, p))
  T(`${path.relative(path.dirname(RACINE), f).split(path.sep).join('/')} : aucune promesse de site inclus`, trouvees.length === 0, trouvees.join(' | '))
}
const profil = lire(path.join(RACINE, 'app', 'profil', 'page.tsx'))
T("app/profil : plus d'éditeur de site ; le site à la demande reste proposé", /SITE_A_LA_DEMANDE/.test(profil) && !/genererSite|site-tiers|StyleAvance|\/api\/site\/generate/.test(profil))
const guide = lire(path.join(VAULT, 'Prospection', 'Guide-Presti-Demarchage.md'))
T('le guide de démarchage dit « à la demande, 300 € une fois … pas compris dans l’abonnement »', dit(guide, 'à la demande, 300 € une fois') && dit(guide, "pas compris dans l'abonnement", 'pas compris dans l’abonnement'))
const lancement = lire(path.join(RACINE, 'plans', 'publications-lancement.md'))
T('plans/publications-lancement.md ne dit plus « inclus dès l’Essentiel »', !dit(lancement, 'inclus dès l’Essentiel', "inclus des l'Essentiel"))

console.log('── 4. Typecheck et garde de commit')
const tc = spawnSync('npm', ['run', 'typecheck'], { cwd: RACINE, encoding: 'utf8', shell: process.platform === 'win32' })
T('tsc --noEmit', tc.status === 0, (tc.stdout + tc.stderr).split('\n').find((l) => /error TS/.test(l)) || `code ${tc.status}`)
const gc = spawnSync(process.execPath, ['scripts/garde-commit.mjs'], { cwd: RACINE, encoding: 'utf8' })
T('garde-commit', gc.status === 0, (gc.stdout + gc.stderr).trim().split('\n').at(-1))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
