// .orchestre/preuves/026-023/outils/sait-echouer.mjs — la preuve que les quatre juges du lot B savent échouer, écrite par
// Claude Code (fiche 026-023, étape 5). Pour chaque critère : une entrée cassée dans une maquette (jamais dans le dépôt), le
// juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.
//
//   node .orchestre/preuves/026-023/outils/sait-echouer.mjs [--seulement=AP,LC] [--mutation=EA-5,CD-3]
//   --seulement  ne joue que ces juges (témoins et mutations) ; le fichier de preuve est réécrit avec ces seuls juges.
//   --mutation   ne rejoue que ces critères et remplace leurs lignes dans la preuve existante (témoins conservés).
//
// Maquettes (sous .orchestre/travail/, jamais livrées) :
//   026-023-maquette    une implémentation témoin de 026-025 et 026-027 (AP, LC : tout vert avant mutation) ;
//   026-023-maquette-2  la même plus 026-030 et 026-035 (CD tout vert ; EA vert sauf EA-10, dont la base HEAD ne peut pas
//                       exister avant que 025 et 030 soient poussées : EA-10 se prouve sur la copie témoin) ;
//   026-023-temoin      app, lib, supabase de l'arbre courant : les critères (NR) s'y prouvent en --temoin.
// Écrit sait-echouer-juges.md et sait-echouer-juges.json dans .orchestre/preuves/026-023/. Aucun réseau.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const PREUVES = path.resolve(ICI, '..')
const R = path.resolve(PREUVES, '..', '..', '..')
const TRAVAIL = path.join(R, '.orchestre', 'travail')
const M1 = path.join(TRAVAIL, '026-023-maquette'), M2 = path.join(TRAVAIL, '026-023-maquette-2'), T = path.join(TRAVAIL, '026-023-temoin')
const JUGES = { AP: 'achat-public-qa', LC: 'lien-connexion-qa', CD: 'complement-dossier-qa', EA: 'achat-ecrans-qa' }
const seulement = (process.argv.find((a) => a.startsWith('--seulement=')) ?? '').slice(12).split(',').filter(Boolean)
const seulesMutations = (process.argv.find((a) => a.startsWith('--mutation=')) ?? '').slice(11).split(',').filter(Boolean)
const rel = (p) => path.relative(R, p).split(path.sep).join('/')
const court = (t, n = 300) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

if (!fs.existsSync(T)) { fs.mkdirSync(T, { recursive: true }); for (const d of ['app', 'lib', 'supabase']) fs.cpSync(path.join(R, d), path.join(T, d), { recursive: true }) }

function lancer(prefixe, racine, temoin) {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', `scripts/${JUGES[prefixe]}.mjs`, `--racine=${racine}`, ...(temoin ? ['--temoin'] : [])], { cwd: R, encoding: 'utf8', timeout: 900_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  return { code: r.status, sortie, lignes: sortie.split(/\r?\n/).map((l) => l.trim()), duree: Math.round((Date.now() - t0) / 1000) }
}
/** Remplace `de` par `a` (fins de ligne du fichier respectées) ; rend l'original pour la restauration. */
function muter(fichier, remplacements) {
  const original = fs.readFileSync(fichier)
  let t = original.toString('utf8')
  const eol = t.includes('\r\n') ? '\r\n' : '\n'
  for (const [de, a] of remplacements) {
    const re = new RegExp(de.split('\n').map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'))
    if (!re.test(t)) throw new Error(`« ${court(de, 60)} » introuvable dans ${rel(fichier)}`)
    t = t.replace(re, a.replace(/\n/g, eol))
  }
  fs.writeFileSync(fichier, t)
  return original
}

const TYPE = "export const temoinType: number = 'texte'"
const MUTATIONS = [
  // ── AP (maquette 1) ────────────────────────────────────────────────────────────────────────────────────────────────────
  { juge: 'AP', critere: 'AP-1', racine: M1, fichier: 'lib/siteAchatPublic.ts', de: 'export async function purgerBrouillonsPublics(', a: 'async function purgerBrouillonsPublics(' },
  { juge: 'AP', critere: 'AP-2', racine: M1, fichier: 'lib/siteCommandeServeur.ts', de: "    billing_address_collection: 'required',", a: "    billing_address_collection: p.public ? 'auto' : 'required'," },
  { juge: 'AP', critere: 'AP-3', racine: M1, fichier: 'lib/siteCommandeServeur.ts', de: '          unit_amount: PRIX_SITE_CENTS,', a: '          unit_amount: PRIX_SITE_CENTS + 1,' },
  { juge: 'AP', critere: 'AP-4', racine: M1, fichier: 'app/api/site/commander/public/route.ts', de: "  if (corps.cgu !== true) champs.push('cgu')", a: "  if (corps.cgu === 'jamais') champs.push('cgu')" },
  { juge: 'AP', critere: 'AP-5', racine: M1, fichier: 'app/api/stripe/webhook/route.ts', de: '        if (apres?.achat_public && !apres.lien_envoye_le) await ouvrirCompteAcheteur(commandeId)', a: "        if (apres?.achat_public && !apres.lien_envoye_le) console.log('[maquette] compte différé', commandeId, typeof ouvrirCompteAcheteur)" },
  { juge: 'AP', critere: 'AP-6', racine: M1, fichier: 'lib/siteAchatPublic.ts', de: '    critique: true,', a: '    critique: false,' },
  { juge: 'AP', critere: 'AP-7', racine: M1, fichier: 'app/api/site/commander/public/renvoyer/route.ts', de: ', 3, 3600)', a: ', 5, 3600)' },
  { juge: 'AP', critere: 'AP-8', racine: M1, fichier: 'lib/siteAchatPublic.ts', de: '  const limite = new Date(Date.now() - 7 * 86_400_000).toISOString()', a: '  const limite = new Date(Date.now() - 30 * 86_400_000).toISOString()' },
  { juge: 'AP', critere: 'AP-9', racine: M1, fichier: 'lib/flags.ts', de: '  siteAchatPublic: false,', a: '  siteAchatPublic: true,' },
  { juge: 'AP', critere: 'AP-10', racine: T, temoin: true, fichier: 'lib/stripe.ts', de: 'export const stripe = key ? new Stripe(key) : null', a: 'export const stripe = key ? new Stripe(key, { maxNetworkRetries: 0 }) : null' },
  { juge: 'AP', critere: 'AP-11', racine: M1, fichier: 'lib/siteAchatPublic.ts', de: 'export async function purgerBrouillonsPublics(', a: `${TYPE}\nexport async function purgerBrouillonsPublics(` },
  // ── LC (maquette 1) ────────────────────────────────────────────────────────────────────────────────────────────────────
  { juge: 'LC', critere: 'LC-1', racine: M1, fichier: 'app/api/auth/lien/route.ts', de: 'const TH = /^[0-9a-f]{20,128}$/i', a: 'const TH = /^[0-9a-f]{20,128}$/i\nexport async function GET() { return new Response(null, { status: 405 }) }' },
  { juge: 'LC', critere: 'LC-2', racine: M1, fichier: 'app/api/auth/lien/route.ts', de: "  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })", a: '  void ip' },
  { juge: 'LC', critere: 'LC-3', racine: M1, fichier: 'app/api/auth/lien/route.ts', de: ', 20, 600))', a: ', 30, 600))' },
  { juge: 'LC', critere: 'LC-4', racine: M1, fichier: 'app/api/auth/lien/route.ts', de: 'const TH = /^[0-9a-f]{20,128}$/i', a: "const TH = /^[0-9a-f]{20,128}$/i\nconst aal = 'aal2'\nvoid aal" },
  { juge: 'LC', critere: 'LC-5', racine: M1, fichier: 'app/connexion/lien/page.tsx', remplacements: [
    ["import { Suspense, useState } from 'react'", "import { Suspense, useEffect, useState } from 'react'"],
    ["  const [message, setMessage] = useState('')", "  const [message, setMessage] = useState('')\n  useEffect(() => { fetch('/api/auth/lien', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ th: params?.get('th') ?? '' }) }) }, [params])"],
  ] },
  { juge: 'LC', critere: 'LC-6', racine: M1, fichier: 'lib/siteAchatPublic.ts', de: ".eq('id', c.id).is('artisan_id', null).select('id')", a: ".eq('id', c.id).select('id')" },
  { juge: 'LC', critere: 'LC-7', racine: M1, fichier: 'app/api/auth/lien/route.ts', de: 'const TH = /^[0-9a-f]{20,128}$/i', a: `const TH = /^[0-9a-f]{20,128}$/i\n${TYPE}` },
  { juge: 'LC', critere: 'LC-9', racine: T, temoin: true, fichier: 'lib/connexion.ts', de: 'export const MINUTES_CODE = 10', a: 'export const MINUTES_CODE = 11' },
  // ── CD (maquette 2) ────────────────────────────────────────────────────────────────────────────────────────────────────
  { juge: 'CD', critere: 'CD-1', racine: M2, fichier: 'lib/siteCommandeServeur.ts', de: 'export async function commandesACompleter(', a: 'async function commandesACompleter(' },
  { juge: 'CD', critere: 'CD-2', racine: M2, fichier: 'lib/siteCommande.ts', de: '      prestations: liste(m.prestations, 12, 80),', a: '      prestations: liste(m.prestations, 13, 80),' },
  { juge: 'CD', critere: 'CD-3', racine: M2, fichier: 'lib/siteCommande.ts', de: "export const PRIX_SITE_TEXTE = '300 €'", a: "export const PRIX_SITE_TEXTE = '299 €'" },
  { juge: 'CD', critere: 'CD-3', racine: T, temoin: true, fichier: 'lib/siteCommande.ts', de: "export const PRIX_SITE_TEXTE = '300 €'", a: "export const PRIX_SITE_TEXTE = '299 €'" },
  { juge: 'CD', critere: 'CD-4', racine: M2, fichier: 'lib/siteCommandeServeur.ts', de: '  const champs = { domaine_mode: b.domaine_mode,', a: '  const champs = { ...(brut as Record<string, unknown>), domaine_mode: b.domaine_mode,' },
  { juge: 'CD', critere: 'CD-5', racine: M2, fichier: 'app/api/site/commander/complement/route.ts', de: "    await rattacherCommandesParEmail(g.auth.uid, g.auth.email ?? '')\n    const commandes = await commandesACompleter(g.auth.uid)", a: "    const commandes = await commandesACompleter(g.auth.uid)\n    await rattacherCommandesParEmail(g.auth.uid, g.auth.email ?? '')" },
  { juge: 'CD', critere: 'CD-6', racine: M2, fichier: 'app/api/site/commander/complement/route.ts', de: "export const runtime = 'nodejs'", a: `export const runtime = 'nodejs'\n${TYPE}` },
  // ── EA (maquette 2) ────────────────────────────────────────────────────────────────────────────────────────────────────
  { juge: 'EA', critere: 'EA-1', racine: M2, fichier: 'app/site/commander/merci/page.tsx', de: "  if (!actif('siteAchatPublic') || !actif('siteCommande')) notFound()", a: "  if (!actif('siteAchatPublic') || !actif('siteCommande')) console.warn('fermé')" },
  { juge: 'EA', critere: 'EA-2', racine: M2, fichier: 'app/site/acheter/page.tsx', de: '        <label>Commune principale<input name="commune"', a: '        <label>Téléphone<input name="telephone" type="tel" style={{ display: \'block\', width: \'100%\' }} /></label>\n        <label>Commune principale<input name="commune"' },
  { juge: 'EA', critere: 'EA-3', racine: M2, fichier: 'app/site/commander/merci/page.tsx', remplacements: [
    ["import { Suspense, useState } from 'react'", "import { Suspense, useEffect, useState } from 'react'"],
    ['  const [busy, setBusy] = useState(false)', "  const [busy, setBusy] = useState(false)\n  useEffect(() => { fetch('/api/site/commander/public/renvoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commande: params?.get('commande') ?? '' }) }) }, [params])"],
  ] },
  { juge: 'EA', critere: 'EA-4', racine: M2, fichier: 'app/site/commander/page.tsx', de: "  const etapes = completer ? ETAPES.filter((e) => e.id !== 'paiement') : ETAPES.filter((e) => e.id !== 'prestations')", a: "  const etapes = completer ? ETAPES : ETAPES.filter((e) => e.id !== 'prestations')" },
  { juge: 'EA', critere: 'EA-5', racine: M2, fichier: 'lib/suiteSure.ts', de: "  if (s.includes('//') || s.includes('\\\\') || s.includes(':') || /[\\r\\n]/.test(s)) return '/outils'", a: "  if (s.includes('//') || s.includes(':') || /[\\r\\n]/.test(s)) return '/outils'" },
  { juge: 'EA', critere: 'EA-6', racine: M2, fichier: 'app/site/acheter/page.tsx', de: "    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '1.5rem 1rem' }}>", a: "    <main style={{ minWidth: '600px', maxWidth: '40rem', margin: '0 auto', padding: '1.5rem 1rem' }}>" },
  { juge: 'EA', critere: 'EA-8', racine: M2, fichier: 'lib/suiteSure.ts', de: 'export function suiteSure(', a: `${TYPE}\nexport function suiteSure(` },
  { juge: 'EA', critere: 'EA-9', racine: M2, fichier: 'lib/urls.ts', de: "'prestiapp', 'acheter', 'commander',", a: "'prestiapp', 'acheter'," },
  { juge: 'EA', critere: 'EA-10', racine: T, temoin: true, fichier: 'lib/siteCommande.ts', de: "export const DELAI_ANNONCE = '48 h ouvrées'", a: "export const DELAI_ANNONCE = '48 h ouvrees'" },
]

const FICHIER_JSON = path.join(PREUVES, 'sait-echouer-juges.json')
const precedent = seulesMutations.length && fs.existsSync(FICHIER_JSON) ? JSON.parse(fs.readFileSync(FICHIER_JSON, 'utf8')) : null
const resultat = precedent ? { ...precedent, rejoue_le: new Date().toISOString(), rejouees: seulesMutations } : { produit_le: new Date().toISOString(), temoins: {}, mutations: [] }
const prefixes = Object.keys(JUGES).filter((p) => !seulement.length || seulement.includes(p))
// ── Les témoins avant mutation ────────────────────────────────────────────────────────────────────────────────────────────
for (const p of precedent ? [] : prefixes) {
  const racine = p === 'AP' || p === 'LC' ? M1 : M2
  const c = lancer(p, racine, false), t = lancer(p, T, true)
  resultat.temoins[p] = { maquette: rel(racine), complet: { code: c.code, duree: c.duree, rouges: c.lignes.filter((l) => l.startsWith('❌')).map((l) => court(l, 200)) }, temoin: { code: t.code, rouges: t.lignes.filter((l) => l.startsWith('❌')).map((l) => court(l, 200)) } }
  console.log(`${p} : maquette complet → code ${c.code} (${c.duree} s, ${resultat.temoins[p].complet.rouges.length} rouge(s)) ; copie témoin --temoin → code ${t.code}`)
}
// ── Les mutations ─────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const m of MUTATIONS) {
  if (!prefixes.includes(m.juge)) continue
  if (seulesMutations.length && !seulesMutations.includes(m.critere)) continue
  const fichier = path.join(m.racine, m.fichier)
  let original = null
  const entree = { juge: m.juge, critere: m.critere, mode: m.temoin ? 'temoin' : 'complet', fichier: rel(fichier), pris: false, code: null, ligne: null, restaure: false, duree: null }
  try {
    original = muter(fichier, m.remplacements ?? [[m.de, m.a]])
    const r = lancer(m.juge, m.racine, !!m.temoin)
    entree.code = r.code; entree.duree = r.duree
    entree.ligne = r.lignes.find((l) => l.startsWith(`❌ ${m.critere} `) || l === `❌ ${m.critere}`) ?? null
    entree.pris = r.code !== 0 && !!entree.ligne
    if (!entree.ligne) entree.ligne = `(aucune ligne rouge ${m.critere} ; dernière ligne : ${court(r.lignes.filter(Boolean).at(-1), 160)})`
  } catch (e) { entree.ligne = `(mutation impossible : ${e.message})` } finally {
    if (original) { fs.writeFileSync(fichier, original); entree.restaure = fs.readFileSync(fichier).equals(original) }
  }
  const i = resultat.mutations.findIndex((x) => x.juge === entree.juge && x.critere === entree.critere && x.mode === entree.mode)
  if (i >= 0) resultat.mutations[i] = { ...entree, rejouee_le: new Date().toISOString() }; else resultat.mutations.push(entree)
  console.log(`${m.critere} (${entree.mode}) : ${entree.pris ? 'PRIS' : 'NON PRIS'} — code ${entree.code}, ${entree.duree ?? '?'} s, restauré ${entree.restaure} — ${court(entree.ligne, 140)}`)
}
// ── Les preuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const pris = resultat.mutations.filter((m) => m.pris).length
const md = [
  '# Les quatre juges du lot B savent échouer',
  '',
  `Produit par \`node .orchestre/preuves/026-023/outils/sait-echouer.mjs\` le ${resultat.produit_le}${resultat.rejoue_le ? ` (${resultat.rejouees.join(', ')} rejouée(s) le ${resultat.rejoue_le}, après un complément du jeu d'essai)` : ''}. Maquettes : \`.orchestre/travail/026-023-maquette/\` (implémentation témoin de 026-025 et 026-027, jamais livrée) et \`.orchestre/travail/026-023-maquette-2/\` (la même plus 026-030 et 026-035) ; copie témoin : \`.orchestre/travail/026-023-temoin/\` (app, lib, supabase de l'arbre courant). Pour chaque ligne : une entrée cassée, le juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.`,
  '',
  '## Témoins avant mutation',
  '',
  ...Object.entries(resultat.temoins).map(([p, t]) => `- ${p} : ${t.maquette}, mode complet → code ${t.complet.code}${t.complet.rouges.length ? ` ; rouge(s) de départ : ${t.complet.rouges.join(' · ')}` : ' (tout vert)'} ; copie témoin, --temoin → code ${t.temoin.code}`),
  '',
  resultat.temoins.EA?.complet.rouges.some((l) => l.startsWith('❌ EA-10')) ? 'EA-10 reste rouge sur la maquette 2 : il compare lib/flags.ts, lib/siteCommande.ts, lib/siteCommandeServeur.ts et app/api/site/commander/** à HEAD, et la maquette 2 porte les changements de 026-025 et 026-030, qui seront poussées avant que 026-035 se juge. Sa capacité à échouer se prouve sur la copie témoin (dernière ligne du tableau).' : '',
  '',
  '## Mutations',
  '',
  '| Juge | Critère | Mode | Fichier cassé | Code | Pris | Restauré | Ligne rouge (extrait réel) |',
  '|---|---|---|---|---|---|---|---|',
  ...resultat.mutations.map((m) => `| ${m.juge} | ${m.critere} | ${m.mode} | ${m.fichier} | ${m.code ?? '—'} | ${m.pris ? 'oui' : 'NON'} | ${m.restaure ? 'oui' : 'NON'} | ${String(m.ligne).replace(/\|/g, '\\|')} |`),
  '',
  `Bilan : ${pris} mutation(s) prise(s) sur ${resultat.mutations.length}${resultat.mutations.every((m) => m.restaure) ? ', tous les originaux restaurés' : ' — ATTENTION : un original n\'est pas restauré'}.`,
  '',
].filter((l, i, a) => !(l === '' && a[i - 1] === ''))
fs.writeFileSync(FICHIER_JSON, `${JSON.stringify(resultat, null, 1)}\n`)
fs.writeFileSync(path.join(PREUVES, 'sait-echouer-juges.md'), `${md.join('\n')}\n`)
console.log(`\nBilan : ${pris}/${resultat.mutations.length} prises — ${rel(path.join(PREUVES, 'sait-echouer-juges.md'))}`)
process.exit(pris === resultat.mutations.length && resultat.mutations.every((m) => m.restaure) ? 0 : 1)
