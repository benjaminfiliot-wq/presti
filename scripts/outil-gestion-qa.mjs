// scripts/outil-gestion-qa.mjs — juge de la tâche 036-020 (prompt 6, « tout passe par l'outil de gestion », Benj, 03/11/2026).
// Lecture statique, hors ligne, sans compte ni base. Il vérifie que :
//   A. le menu principal (app/AppShell.tsx) garde l'accueil, les conversations et l'outil de gestion, et n'a plus Devis, Factures, Stock,
//      Mes tarifs, ni Clients / Chantiers ;
//   B. l'outil de gestion (/crm sans paramètre) s'ouvre sur deux portes, « CRM 3D » et « Tableau de bord » ;
//   C. chaque écran métier est atteignable depuis l'outil de gestion (lien -> une page qui existe, ou un onglet du CRM qui existe) ;
//   D. aucune route n'a été supprimée (toute page ou route du dernier commit existe encore) ;
//   E. la scène 3D est présente et branchée, le mouvement réduit est respecté, la fiche d'un objet porte la ligne « fait : … ».
// Il prouve qu'il peut rougir : quatre mutants (écran inatteignable, route supprimée, porte 3D absente, « Devis » revenu au menu).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const RACINE = process.cwd()
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const SRC = {
  shell: lire('app/AppShell.tsx'),
  gestion: lire('app/crm/Gestion.tsx'),
  page: lire('app/crm/page.tsx'),
  atelier: lire('app/crm/atelier/Atelier.tsx'),
  scene: lire('app/crm/atelier/Scene3D.tsx'),
  panneau: lire('app/crm/atelier/Panneau.tsx'),
  fait: lire('app/crm/atelier/LigneFait.tsx'),
}
const existeDisque = (f) => fs.existsSync(path.join(RACINE, f))
const ROUTES_HEAD = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', 'app'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter((f) => /^app\/.*\/(page|route)\.tsx?$/.test(f) || /^app\/(page|route)\.tsx?$/.test(f))

/** Le juge : une fonction pure des sources et de la présence des fichiers, pour qu'un mutant puisse la faire échouer. */
function juger(src, existe) {
  const r = []
  const T = (nom, ok, detail = '') => r.push({ nom, ok: !!ok, detail })

  // A. le menu principal
  const nav = src.shell.slice(src.shell.indexOf('const NAV'), src.shell.indexOf('// §4 B3'))
  const cles = [...nav.matchAll(/key: '([a-z]+)'/g)].map((m) => m[1])
  const hrefsMenu = [...nav.matchAll(/href: '([^']+)'/g)].map((m) => m[1])
  for (const c of ['dashboard', 'messages', 'crm']) T(`A1 le menu garde « ${c} »`, cles.includes(c))
  for (const c of ['devis', 'factures', 'inventaire', 'tarifs', 'stock', 'clients', 'chantiers'])
    T(`A2 le menu n'a plus « ${c} »`, !cles.includes(c))
  for (const h of ['/devis', '/factures', '/inventaire', '/tarifs'])
    T(`A3 le menu ne pointe plus vers ${h}`, !hrefsMenu.includes(h))
  T('A4 l\'entrée de l\'outil de gestion s\'appelle « Outil de gestion » et mène à /crm', /key: 'crm'[^\n]*label: 'Outil de gestion', href: '\/crm'/.test(nav))
  T('A5 la coque v2 (hunks 032-041 en attente) est intacte', /const v2 = useConsoleV2\(\)/.test(src.shell) && /if \(v2\) \{/.test(src.shell))

  // B. les deux portes
  const portes = [...src.gestion.matchAll(/\{ cle: '(3d|tableau)', label: '([^']+)', href: '([^']+)'/g)].map((m) => ({ cle: m[1], label: m[2], href: m[3] }))
  const p3d = portes.find((p) => p.cle === '3d'), ptab = portes.find((p) => p.cle === 'tableau')
  T('B1 porte « CRM 3D » présente', p3d?.label === 'CRM 3D')
  T('B2 porte « Tableau de bord » présente', ptab?.label === 'Tableau de bord')
  T('B3 la porte 3D ouvre l\'onglet atelier du CRM', p3d?.href === '/crm?vue=atelier' && /id: 'atelier'/.test(src.page))
  T('B4 la porte tableau de bord ouvre /dashboard, qui existe', ptab?.href === '/dashboard' && existe('app/dashboard/page.tsx'))
  T('B5 les deux portes sont rendues (data-gestion-porte)', /data-gestion-porte=\{?/.test(src.gestion) && /PORTES\.map/.test(src.gestion))
  T('B6 /crm sans paramètre ouvre l\'outil de gestion, avec paramètre le CRM d\'avant', /porte === 'vue'\) return <CrmVue \/>/.test(src.page) && /<Gestion \/>/.test(src.page) && /p\.has\('vue'\)/.test(src.page))
  T('B7 l\'outil de gestion ne lit aucune donnée (ouvert à tous les comptes)', !/\/api\/crm/.test(src.gestion))

  // C. chaque écran métier atteignable
  const onglets = new Set([...src.page.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]))
  const ecrans = [...src.gestion.matchAll(/\{ cle: '([a-z]+)', label: '([^']+)', href: '([^']+)'[^\n]*groupe:/g)].map((m) => ({ cle: m[1], href: m[3] }))
  for (const attendu of ['devis', 'factures', 'inventaire', 'clients', 'chantiers', 'planning', 'equipe']) {
    const e = ecrans.find((x) => x.cle === attendu)
    T(`C1 « ${attendu} » est listé dans l'outil de gestion`, !!e)
    if (!e) continue
    const [chemin, requete = ''] = e.href.split('?')
    const vue = new URLSearchParams(requete).get('vue')
    const page = chemin === '/crm' ? 'app/crm/page.tsx' : `app${chemin}/page.tsx`
    T(`C2 « ${attendu} » -> ${e.href} : la page existe${vue ? ` et l'onglet « ${vue} » aussi` : ''}`, existe(page) && (!vue || onglets.has(vue)))
  }
  T('C3 chaque écran listé est rendu avec son data-gestion-ecran', /data-gestion-ecran=\{e\.cle\}/.test(src.gestion))

  // D. aucune route supprimée
  const manquantes = ROUTES_HEAD.filter((f) => !existe(f))
  T(`D1 aucune des ${ROUTES_HEAD.length} pages et routes du dernier commit n'a disparu`, manquantes.length === 0, manquantes.slice(0, 3).join(', '))

  // E. la scène 3D
  T('E1 la scène 3D existe', existe('app/crm/atelier/Scene3D.tsx') && /export default/.test(src.scene))
  T('E2 l\'atelier la charge à la demande', /dynamic\(\(\) => import\('\.\/Scene3D'\)/.test(src.atelier))
  T('E3 le CRM monte l\'atelier sur son onglet', /onglet === 'atelier'/.test(src.page) && /<Atelier /.test(src.page))
  T('E4 le mouvement réduit est respecté (scène et repli 2D)', /prefers-reduced-motion: reduce/.test(src.scene) && /prefers-reduced-motion: reduce/.test(src.atelier))
  T('E5 la fiche d\'un objet porte la ligne « fait : … »', /<LigneFait objet=\{objet\} \/>/.test(src.panneau) && /fait :/.test(src.fait) && /l\.etat === 'fait'/.test(src.fait))
  return r
}

const base = juger(SRC, existeDisque)
let rouge = 0
for (const x of base) { console.log(`${x.ok ? 'ok  ' : 'ECHEC'} ${x.nom}${x.ok || !x.detail ? '' : ' — ' + x.detail}`); if (!x.ok) rouge++ }
console.log(`\njuge : ${base.length - rouge}/${base.length}`)

// ── Les mutants : chacun doit faire rougir le juge ───────────────────────────────────────────
const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error('mutant sans prise : ' + a.slice(0, 40)); return s.replace(a, b) }
const MUTANTS = [
  ['M1 un écran métier inatteignable (Devis retiré de l\'outil de gestion)', () => [{ ...SRC, gestion: remplacer(SRC.gestion, "{ cle: 'devis'", "{ cle: 'devis_retire'") }, existeDisque]],
  ['M2 une route supprimée (/factures)', () => [SRC, (f) => f !== 'app/factures/page.tsx' && existeDisque(f)]],
  ['M3 la porte 3D absente', () => [{ ...SRC, gestion: remplacer(SRC.gestion, "{ cle: '3d', label: 'CRM 3D'", "{ cle: 'x3d', label: 'CRM'") }, existeDisque]],
  ['M4 « Devis » revenu au menu principal', () => [{ ...SRC, shell: remplacer(SRC.shell, "      { key: 'chiffres'", "      { key: 'devis', label: 'Devis', href: '/devis', icon: null },\n      { key: 'chiffres'") }, existeDisque]],
  ['M5 la scène 3D retirée de l\'atelier', () => [{ ...SRC, atelier: remplacer(SRC.atelier, "import('./Scene3D')", "import('./Autre')") }, existeDisque]],
]
let survivants = 0
console.log('\nmutants :')
for (const [nom, fab] of MUTANTS) {
  const [s, e] = fab()
  const echecs = juger(s, e).filter((x) => !x.ok)
  console.log(`${echecs.length ? 'tué     ' : 'SURVIVANT'} ${nom}${echecs.length ? ` (${echecs.map((x) => x.nom.split(' ')[0]).join(', ')})` : ''}`)
  if (!echecs.length) survivants++
}
process.exit(rouge || survivants ? 1 : 0)
