// Inventaire automatique du produit (prompt v6 §2) → plans/inventaire-produit.md + plans/couverture.md
//
// On ne peut auditer que ce qu'on a listé. Ce script lit le code, pas la mémoire de quelqu'un :
// pages, routes API, migrations, drapeaux, emails, crons, capacités par offre, suites de test.
// Puis il croise chaque élément avec les scripts de test pour dire QUI le teste — et surtout qui
// ne le teste pas. Une case vide est un test à écrire, pas une case à oublier.
//
//   node scripts/inventaire-produit.mjs
//
// Lecture seule sur le code. Une seule requête réseau : la sonde des migrations en base (via la
// clé de service de .env.local), sautée si la clé manque.
import fs from 'node:fs'
import path from 'node:path'

const RACINE = process.cwd()
const lire = (p) => fs.readFileSync(path.join(RACINE, p), 'utf8')
const existe = (p) => fs.existsSync(path.join(RACINE, p))

for (const l of (existe('.env.local') ? lire('.env.local') : '').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

// ── Parcours de fichiers (sans dépendance) ──────────────────────────────────────
function marcher(dossier, filtre, acc = []) {
  if (!existe(dossier)) return acc
  for (const e of fs.readdirSync(path.join(RACINE, dossier), { withFileTypes: true })) {
    const p = path.posix.join(dossier, e.name)
    if (e.isDirectory()) { if (!/node_modules|\.next|\.git/.test(e.name)) marcher(p, filtre, acc) }
    else if (filtre(p)) acc.push(p)
  }
  return acc
}

// ── 1. Pages ─────────────────────────────────────────────────────────────────
const SURFACES = [
  [/^app\/site\//, 'site artisan'], [/^app\/p\//, 'plateforme client'],
  [/^app\/(dashboard|devis|factures|inventaire|parametres|profil|messages|outils|plateforme|controle|onboarding)\b/, 'console'],
]
function surfaceDe(p) { for (const [re, s] of SURFACES) if (re.test(p)) return s; return 'landing' }
function cheminPage(p) {
  return '/' + p.replace(/^app\//, '').replace(/\/?page\.tsx$/, '').replace(/\(.*?\)\//g, '')
}
const pages = marcher('app', (p) => p.endsWith('page.tsx') && !p.startsWith('app/api/')).map((p) => {
  const src = lire(p)
  const auth = /getUserRevocable|supabase\.auth\.getUser|useSession|redirect\('\/login'|requireUser|authInventaire/.test(src) || /'use client'/.test(src) && /auth\.getSession|access_token|jeton/.test(src)
  return { fichier: p, chemin: cheminPage(p) || '/', surface: surfaceDe(p), auth, client: /'use client'/.test(src) }
}).sort((a, b) => a.chemin.localeCompare(b.chemin))

// ── 2. Routes API ─────────────────────────────────────────────────────────────
const routes = marcher('app/api', (p) => p.endsWith('route.ts')).map((p) => {
  const src = lire(p)
  const methodes = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1])
  const auth = /getUserRevocable|authInventaire|requireFounder|isFounder|authArtisan\(|verifierSession\(/.test(src) ? 'jeton artisan'
    : /CRON_SECRET/.test(src) ? 'secret cron'
    : /stripe\.webhooks\.constructEvent/.test(src) ? 'signature Stripe'
    : /leadByToken|\btoken\b.*maybeSingle|TOKEN_RE/.test(src) ? 'jeton de conversation'
    : 'publique'
  const plan = [...src.matchAll(/peut\([^,]+,\s*'([^']+)'/g)].map((m) => m[1])
  const plafonds = [...src.matchAll(/consommerLimite\(`([^`]+)`,\s*(\d+),\s*([\d_ *]+)\)/g)].map((m) => `${m[1].replace(/\$\{[^}]+\}/g, '·')} ${m[2]}/${m[3].replace(/[_ ]/g, '')}s`)
  const credits = /consumeCredit\(/.test(src)
  const ia = /generateConversationReply|generateLeadReply|generateDevis|rechercherChezFournisseurs|client\.messages|declencherRegles/.test(src)
  return { fichier: p, chemin: '/' + p.replace(/\/route\.ts$/, '').replace(/^app\//, '').replace(/\[([^\]]+)\]/g, ':$1'), methodes, auth, plan, plafonds, credits, ia }
}).sort((a, b) => a.chemin.localeCompare(b.chemin))

// ── 3. Migrations ─────────────────────────────────────────────────────────────
const migrations = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()
const aColler = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((f) => f.startsWith('_A_COLLER_')).sort()
// Sondes : un objet caractéristique par migration récente, lu en base par la clé de service.
const SONDES = {
  '0047': { colonne: ['artisans', 'aide_vues'] }, '0048': { table: 'materiaux' }, '0049': { table: 'limites' },
  '0050': { table: 'regles_automatisation' }, '0051': { rpc: 'artisan_par_ancien_slug', args: { p_slug: 'x' } },
  '0052': { colonne: ['artisans', 'suppression_demandee_le'] }, '0053': { table: 'plateforme_config' },
  '0054': { rpc: 'purger_compte_test', args: { p_id: '00000000-0000-4000-8000-000000000000' } },
  '0055': { colonne: ['devis', 'envoye_le'] }, '0056': { table: 'recherche_cache' },
}
const etatMigrations = {}
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  for (const [num, s] of Object.entries(SONDES)) {
    try {
      if (s.table) { const { error } = await admin.from(s.table).select('*').limit(0); etatMigrations[num] = !error }
      else if (s.colonne) { const { error } = await admin.from(s.colonne[0]).select(s.colonne[1]).limit(0); etatMigrations[num] = !error }
      else if (s.rpc) { const { error } = await admin.rpc(s.rpc, s.args); etatMigrations[num] = !error || !/function .* does not exist|Could not find/i.test(error.message) }
    } catch { etatMigrations[num] = false }
  }
}

// ── 4. Drapeaux ───────────────────────────────────────────────────────────────
const flagsSrc = existe('lib/flags.ts') ? lire('lib/flags.ts') : ''
const drapeaux = [...flagsSrc.matchAll(/^\s+([a-zA-Z0-9]+):\s*(true|false),/gm)].map((m) => m[1] === 'true' ? null : { nom: m[1], leve: m[2] === 'true' }).filter(Boolean)
const tousTs = marcher('app', (p) => /\.(ts|tsx)$/.test(p)).concat(marcher('lib', (p) => /\.(ts|tsx)$/.test(p)))
for (const d of drapeaux) {
  d.usages = tousTs.filter((p) => p !== 'lib/flags.ts' && new RegExp(`\\b${d.nom}\\b`).test(lire(p)))
}

// ── 5. Emails ─────────────────────────────────────────────────────────────────
const emails = []
for (const p of tousTs) {
  const src = lire(p)
  if (/^lib\/(email|notifications|alerteService)\.ts$/.test(p)) continue
  for (const m of src.matchAll(/(sendEmail|notifierArtisan|notifierEntreprise)\(/g)) {
    const ligne = src.slice(0, m.index).split('\n').length
    const bloc = src.slice(m.index, m.index + 900)
    const sujet = (bloc.match(/subject:\s*(`[^`]*`|'[^']*'|"[^"]*")/) || [])[1] ?? ''
    const type = (bloc.match(/notifierArtisan\([^,]+,\s*'([^']+)'/) || [])[1] ?? ''
    emails.push({ fichier: `${p}:${ligne}`, fonction: m[1], sujet: sujet.replace(/\s+/g, ' ').slice(0, 70), type, destinataire: m[1] === 'notifierEntreprise' ? 'entreprise' : m[1] === 'notifierArtisan' ? 'artisan' : (bloc.match(/to:\s*([^,\n]+)/) || [])[1]?.trim().slice(0, 40) ?? '?' })
  }
}
const alertes = existe('lib/alerteService.ts') ? [...lire('lib/alerteService.ts').matchAll(/^\s+(solde|authentification|debit|surcharge|inconnu):/gm)].map((m) => m[1]) : []

// ── 6. Crons ──────────────────────────────────────────────────────────────────
const vercel = existe('vercel.json') ? JSON.parse(lire('vercel.json')) : { crons: [] }
const crons = (vercel.crons ?? []).map((c) => ({ ...c, fichier: `app${c.path}/route.ts`, existe: existe(`app${c.path}/route.ts`) }))
const cronsSansPlanif = marcher('app/api/cron', (p) => p.endsWith('route.ts')).map((p) => '/' + p.replace(/^app\//, '').replace(/\/route\.ts$/, '')).filter((c) => !crons.some((x) => x.path === c))

// ── 7. Capacités par offre ────────────────────────────────────────────────────
const plansSrc = existe('lib/plans.ts') ? lire('lib/plans.ts') : ''
function tableau(nom) {
  const m = plansSrc.match(new RegExp(`const ${nom}: Capacite\\[\\] = \\[([\\s\\S]*?)\\]`))
  return m ? [...m[1].matchAll(/'([a-z_.]+)'/g)].map((x) => x[1]) : []
}
const BASE = tableau('BASE'), STUDIO = tableau('STUDIO').filter((c) => !BASE.includes(c)), SIGNATURE = tableau('SIGNATURE').filter((c) => !BASE.includes(c) && !STUDIO.includes(c))
const capacites = [...BASE.map((c) => ({ cap: c, offre: 'essentiel' })), ...STUDIO.map((c) => ({ cap: c, offre: 'studio' })), ...SIGNATURE.map((c) => ({ cap: c, offre: 'signature' }))]
for (const c of capacites) c.verrous = tousTs.filter((p) => p !== 'lib/plans.ts' && lire(p).includes(`'${c.cap}'`))

// ── 8. Suites ─────────────────────────────────────────────────────────────────
const lanceur = existe('scripts/tout-verifier.mjs') ? lire('scripts/tout-verifier.mjs') : ''
const suites = [...lanceur.matchAll(/\{\s*nom:\s*'([^']+)'[^}]*?args:\s*\[([^\]]*)\][^}]*?cout:\s*'([a-z]+)'/g)].map((m) => ({
  nom: m[1], script: (m[2].match(/'scripts\/[^']+'/) || [''])[0].replace(/'/g, ''), cout: m[3],
}))
const scriptsTest = marcher('scripts', (p) => /-e2e\.mjs$|verifier\.mjs$|-test\.mjs$/.test(p))
// Ce que le lanceur écarte VOLONTAIREMENT, avec sa raison. On lit le texte, on n'importe pas :
// importer `tout-verifier.mjs` l'exécuterait, et compter les suites lancerait les suites.
const ecartes = new Map([...(lanceur.match(/export const HORS_LANCEUR = \{[\s\S]*?\n\}/) ?? [''])[0]
  .matchAll(/'([^']+\.mjs)':\s*'([^']*)'/g)].map((m) => [m[1], m[2]]))
const nonLances = scriptsTest.filter((s) => !suites.some((x) => x.script === s) && !/tout-verifier/.test(s) && !ecartes.has(s.replace('scripts/', '')))
// Ce que l'audit NOCTURNE joue vraiment : `.github/workflows/audit.yml` appelle `tout-verifier.mjs`
// SANS `--tout`, donc les suites de coût 'ia' sautent, et celles qui manquent au lanceur ne tournent
// jamais. Une suite qu'aucune nuit ne joue a été vue une fois, à la main, puis plus jamais.
const jouees = new Set(suites.filter((s) => s.cout !== 'ia').map((s) => s.script.replace('scripts/', '')))

// ── 9. Couverture : qui teste quoi ────────────────────────────────────────────
const corpusTests = Object.fromEntries(scriptsTest.map((s) => [s, lire(s)]))
function testeurs(motifs) {
  const res = new Set()
  for (const [s, src] of Object.entries(corpusTests)) if (motifs.some((m) => m && (m instanceof RegExp ? m.test(src) : src.includes(m)))) res.add(s.replace('scripts/', ''))
  return [...res].sort()
}
// Un paramètre (:id, [slug]) peut s'écrire ${id}, ${slug} ou un UUID dans un test : on le tolère.
const PARAM = '[^/\\s\'"`]+'
const echapper = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const couverture = {
  // Un paramètre (:id, [slug]) peut être écrit ${id}, ${slug}, 00000000-… dans un test : on le tolère.
  routes: routes.map((r) => ({ ...r, testeurs: testeurs([new RegExp(echapper(r.chemin).replace(/:[a-z]+/g, PARAM))]) })),
  pages: pages.map((p) => ({ ...p, testeurs: testeurs([p.chemin === '/' ? "'/'" : new RegExp(echapper(p.chemin).replace(/\\\[[^\]]+\\\]/g, PARAM))]) })),
  capacites: capacites.map((c) => ({ ...c, testeurs: testeurs([`'${c.cap}'`]) })),
  // Un email est couvert par un test qui cite son fichier (scripts/emails-e2e.mjs tient la carte) ou son sujet.
  emails: emails.map((e) => ({ ...e, testeurs: testeurs([e.fichier.replace(/:\d+$/, ''), e.type ? `'${e.type}'` : '', e.sujet.replace(/[`'"]/g, '').slice(0, 25)].filter(Boolean)) })),
  crons: crons.map((c) => ({ ...c, testeurs: testeurs([c.path]) })),
  drapeaux: drapeaux.map((d) => ({ ...d, testeurs: testeurs([`'${d.nom}'`, `.${d.nom}`]) })),
}
const vides = Object.entries(couverture).flatMap(([k, arr]) => arr.filter((x) => !x.testeurs.length).map((x) => ({ type: k, cle: x.chemin ?? x.cap ?? x.path ?? x.nom ?? x.fichier })))
// L'ANGLE MORT : testé, mais par personne la nuit. Deux chiffres justes se contredisaient — « 0 case
// vide » et « aucune suite jouée ne touche /api/stripe/portail ». Le second manquait ; il est là.
const aveugles = Object.entries(couverture).flatMap(([k, arr]) => arr
  .filter((x) => x.testeurs.length && !x.testeurs.some((t) => jouees.has(t)))
  .map((x) => ({ type: k, cle: x.chemin ?? x.cap ?? x.path ?? x.nom ?? x.fichier, testeurs: x.testeurs })))

// ── Écriture ──────────────────────────────────────────────────────────────────
const maintenant = new Date().toISOString().slice(0, 16).replace('T', ' ')
const md = []
md.push(`# Inventaire du produit — généré le ${maintenant}\n`)
md.push(`> Produit par \`scripts/inventaire-produit.mjs\` en lisant le code. Ne pas éditer à la main : relancer.\n`)
md.push(`| Élément | Nombre |\n|---|---|\n| Pages | ${pages.length} |\n| Routes API | ${routes.length} |\n| Migrations | ${migrations.length} (dernière : ${migrations.at(-1)}) |\n| Drapeaux | ${drapeaux.length} (${drapeaux.filter((d) => d.leve).length} levés) |\n| Envois d'email | ${emails.length} (+ ${alertes.length} motifs d'alerte de service) |\n| Crons | ${crons.length} planifiés${cronsSansPlanif.length ? ` · ⚠️ ${cronsSansPlanif.length} route(s) cron sans planification : ${cronsSansPlanif.join(', ')}` : ''} |\n| Capacités | ${capacites.length} (${BASE.length} socle, +${STUDIO.length} Studio, +${SIGNATURE.length} Signature) |\n| Suites de test | ${suites.length} dans le lanceur (${jouees.size} jouées chaque nuit)${nonLances.length ? ` · ⚠️ ${nonLances.length} script(s) de test que rien n’appelle` : ''}${ecartes.size ? ` · ${ecartes.size} écarté(s) volontairement` : ''}${aveugles.length ? ` · ⚠️ ${aveugles.length} élément(s) en angle mort de l’audit` : ''} |\n`)

md.push(`\n## Pages (${pages.length})\n\n| Chemin | Surface | Auth | Rendu | Fichier |\n|---|---|---|---|---|`)
for (const p of pages) md.push(`| \`${p.chemin}\` | ${p.surface} | ${p.auth ? 'oui' : 'non'} | ${p.client ? 'client' : 'serveur'} | ${p.fichier} |`)

md.push(`\n## Routes API (${routes.length})\n\n| Route | Méthodes | Auth | Plan requis | Plafonds | Crédits | IA |\n|---|---|---|---|---|---|---|`)
for (const r of routes) md.push(`| \`${r.chemin}\` | ${r.methodes.join(', ') || '—'} | ${r.auth} | ${r.plan.join(', ') || '—'} | ${r.plafonds.join(' · ') || '—'} | ${r.credits ? 'oui' : '—'} | ${r.ia ? '⚡' : '—'} |`)

md.push(`\n## Migrations (${migrations.length})\n\nPosées à la main dans le SQL Editor (mot de passe Postgres désaligné). Sondes en base sur les dix dernières :\n`)
md.push(`| Migration | En base |\n|---|---|`)
for (const m of migrations.slice(-10)) { const num = m.slice(0, 4); md.push(`| ${m} | ${etatMigrations[num] === undefined ? 'non sondée' : etatMigrations[num] ? '✅' : '❌ ABSENTE'} |`) }
md.push(`\nFichiers à coller présents : ${aColler.join(', ')}.`)

md.push(`\n## Drapeaux (${drapeaux.length})\n\n| Drapeau | État | Consommé par |\n|---|---|---|`)
for (const d of drapeaux) md.push(`| \`${d.nom}\` | ${d.leve ? 'levé' : 'baissé'} | ${d.usages.length ? d.usages.join(', ') : '⚠️ **nulle part** (drapeau mort)'} |`)

md.push(`\n## Emails envoyés (${emails.length})\n\n| Où | Fonction | Type / sujet | Destinataire |\n|---|---|---|---|`)
for (const e of emails) md.push(`| ${e.fichier} | ${e.fonction} | ${e.type || e.sujet || '—'} | ${e.destinataire} |`)
md.push(`\nAlertes de service (\`lib/alerteService.ts\`) : ${alertes.join(', ') || 'aucune'} — une par heure et par motif, vers l'adresse de l'entreprise.`)

md.push(`\n## Crons (${crons.length})\n\n| Chemin | Fréquence | Fichier |\n|---|---|---|`)
for (const c of crons) md.push(`| \`${c.path}\` | \`${c.schedule}\` | ${c.existe ? c.fichier : '❌ route absente'} |`)
if (cronsSansPlanif.length) md.push(`\n⚠️ Routes cron sans planification (jamais appelées seules) : ${cronsSansPlanif.map((c) => `\`${c}\``).join(', ')}`)

md.push(`\n## Capacités par offre (${capacites.length})\n\n| Capacité | Offre minimale | Verrouillée dans |\n|---|---|---|`)
for (const c of capacites) md.push(`| \`${c.cap}\` | ${c.offre} | ${c.verrous.length ? c.verrous.join(', ') : '⚠️ **aucun verrou serveur**'} |`)

md.push(`\n## Suites de test (${suites.length})\n\n| Suite | Script | Coût |\n|---|---|---|`)
for (const s of suites) md.push(`| ${s.nom} | ${s.script} | ${s.cout} |`)
if (nonLances.length) md.push(`\n⚠️ Scripts de test absents du lanceur : ${nonLances.map((s) => `\`${s}\``).join(', ')}`)

fs.writeFileSync(path.join(RACINE, 'plans/inventaire-produit.md'), md.join('\n') + '\n')

const cv = []
cv.push(`# Couverture — qui teste quoi — généré le ${maintenant}\n`)
cv.push(`> Généré par \`scripts/inventaire-produit.mjs\`. **Une case vide est un test à écrire ; un angle mort est un test à brancher.** Cases vides : **${vides.length}** · angles morts de l’audit nocturne : **${aveugles.length}**.\n`)
cv.push(`## Règles de couverture\n`)
cv.push(`- **L'effet d'un réglage = le comportement observé sur chaque route qui le lit.** Prouver qu'un réglage s'enregistre ne prouve rien : le 05/09, les trois modes de réponse s'enregistraient parfaitement et se comportaient pareil (deux sources de vérité, lues dans un ordre différent selon la route). Un réglage est couvert quand une suite l'écrit, appelle CHAQUE route qui le lit, et constate la différence — aller ET retour (\`modes-e2e\`).`)
cv.push(`- Une case vide est un test à écrire, pas une case à oublier.`)
cv.push(`- **Une case remplie par une suite que l’audit ne joue pas ne surveille rien.** L’audit nocturne lance \`tout-verifier.mjs\` sans \`--tout\` : une suite absente du lanceur, ou de coût \`ia\`, n’a été jouée qu’une fois, à la main. L’élément qu’elle seule couvre est un ANGLE MORT — le 07/09, il y en avait dix pendant que ce rapport annonçait « 0 case vide ».\n`)
cv.push(`## Cases vides (${vides.length})\n`)
if (vides.length) { cv.push(`| Type | Élément |\n|---|---|`); for (const v of vides) cv.push(`| ${v.type} | \`${v.cle}\` |`) } else cv.push('Aucune.')

cv.push(`\n## Angles morts de l’audit nocturne (${aveugles.length})\n`)
cv.push(`Testé, mais par aucune suite que la nuit joue. À lire comme : « si ça casse en production, personne ne le saura avant qu’un artisan le dise. »\n`)
if (aveugles.length) { cv.push(`| Type | Élément | Couvert seulement par |\n|---|---|---|`); for (const a of aveugles) cv.push(`| ${a.type} | \`${a.cle}\` | ${a.testeurs.join(', ')} |`) } else cv.push('Aucun.')
for (const [titre, cle, arr] of [['Routes API', 'chemin', couverture.routes], ['Pages', 'chemin', couverture.pages], ['Capacités', 'cap', couverture.capacites], ['Emails', 'fichier', couverture.emails], ['Crons', 'path', couverture.crons], ['Drapeaux', 'nom', couverture.drapeaux]]) {
  cv.push(`\n## ${titre}\n\n| Élément | Suites |\n|---|---|`)
  for (const x of arr) cv.push(`| \`${x[cle]}\` | ${x.testeurs.length ? x.testeurs.join(', ') : '**—**'} |`)
}
fs.writeFileSync(path.join(RACINE, 'plans/couverture.md'), cv.join('\n') + '\n')

console.log(`Inventaire : ${pages.length} pages · ${routes.length} routes · ${migrations.length} migrations · ${drapeaux.length} drapeaux · ${emails.length} emails · ${crons.length} crons · ${capacites.length} capacités · ${suites.length} suites`)
console.log(`Migrations sondées : ${Object.entries(etatMigrations).map(([k, v]) => `${k}${v ? '✅' : '❌'}`).join(' ')}`)
console.log(`Drapeaux morts : ${drapeaux.filter((d) => !d.usages.length).map((d) => d.nom).join(', ') || 'aucun'}`)
console.log(`Capacités sans verrou serveur : ${capacites.filter((c) => !c.verrous.length).map((c) => c.cap).join(', ') || 'aucune'}`)
console.log(`Cases vides de couverture : ${vides.length}`)
console.log(`Angles morts de l’audit nocturne : ${aveugles.length}${aveugles.length ? ` — ${aveugles.slice(0, 4).map((a) => a.cle).join(', ')}${aveugles.length > 4 ? '…' : ''}` : ''}`)
if (nonLances.length) console.log(`⚠️  Scripts de test qu’AUCUN lanceur n’appelle et qui ne sont pas déclarés dans HORS_LANCEUR : ${nonLances.length} — ${nonLances.map((s) => s.replace('scripts/', '')).join(', ')}`)
else console.log(`Scripts de test hors lanceur : 0 non déclaré (${ecartes.size} écartés avec leur raison)`)
console.log(`→ plans/inventaire-produit.md · plans/couverture.md`)
