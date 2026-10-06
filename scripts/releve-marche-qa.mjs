#!/usr/bin/env node
// scripts/releve-marche-qa.mjs — juge du relevé de marché quotidien (scripts/usine/releve-marche.mjs, 06/10/2026).
// Sans réseau : de faux Firecrawl et Apify locaux ; il teste la SUBSTANCE (valeurs lues, plafonds tenus, un seul relevé par jour, aucune clé écrite,
// jamais « vendu » pour un prix demandé), pas l'existence d'un fichier. Usage : node scripts/releve-marche-qa.mjs [--preuve-echecs]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const PREUVE = process.argv.includes('--preuve-echecs')
for (const a of process.argv.slice(2)) if (a !== '--preuve-echecs' && !a.startsWith('--racine=')) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const RACINE = path.resolve(process.argv.find((a) => a.startsWith('--racine='))?.slice(9) || DEPOT)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'marche-qa-'))
const CLE_FC = 'fc-' + 'a1b2c3d4'.repeat(4)
const JETON_AP = 'apify_api_' + 'Z9y8X7w6V5u4'.repeat(3)

const MD_EBAY = [
  'Résultats', '',
  "[Kit Tournevis de Précision 115 en 1La page s'ouvre dans une nouvelle fenêtre ou un nouvel onglet](https://x/1)", 'Neuf | Pro', '27,99 EUR', 'Achat immédiat', 'Livraison gratuite', '20 vendus', '',
  "[Coffret 60 embouts magnétiquesLa page s'ouvre dans une nouvelle fenêtre ou un nouvel onglet](https://x/2)", '12,50 EUR', '+3,99 EUR pour la livraison', '',
  "[Tournevis pro 6 piècesLa page s'ouvre dans une nouvelle fenêtre ou un nouvel onglet](https://x/3)", '1 209,50 EUR', 'Livraison gratuite', '',
].join('\n')
const ITEMS_TT = [
  { id: '1', views: 1097050, likes: 7387, uploadedAtFormatted: '2026-09-10', channel: { username: 'fixit' }, postPage: 'https://www.tiktok.com/@fixit/video/1', title: '55 outils, un kit' },
  { id: '2', views: 246827, likes: 6004, uploadedAtFormatted: '2026-09-02', channel: { username: 'bricaillerie' }, postPage: 'https://www.tiktok.com/@b/video/2', title: 'Jeu de tournevis 115 pièces' },
  { id: '3', views: 2508, likes: 13, uploadedAtFormatted: '2026-08-30', channel: { username: 'sj' }, postPage: 'https://www.tiktok.com/@s/video/3', title: 'Fanttik' },
]

const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 220)}`); if (!cond) rouges.push(nom) }
const lire = (f) => fs.readFileSync(f, 'utf8')

function serveur(gestionnaire) {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => { const m = []; req.on('data', (d) => m.push(d)); req.on('end', () => gestionnaire(req, rep, Buffer.concat(m).toString('utf8'))) })
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port, appels: [] }))
  })
}
async function mondes({ ebayStatut = 200, apifyStatut = 201 } = {}) {
  const fc = await serveur((req, rep, corps) => { fc.appels.push({ auth: req.headers.authorization, corps }); rep.writeHead(ebayStatut, { 'content-type': 'application/json' }); rep.end(JSON.stringify(ebayStatut === 200 ? { success: true, data: { markdown: MD_EBAY } } : { success: false })) })
  const ap = await serveur((req, rep, corps) => { ap.appels.push({ url: req.url, auth: req.headers.authorization, corps }); rep.writeHead(apifyStatut, { 'content-type': 'application/json' }); rep.end(JSON.stringify(apifyStatut === 201 ? ITEMS_TT : { error: 'x' })) })
  return { fc, ap, fermer: () => { fc.s.close(); ap.s.close() } }
}
function lancer(racine, { travail, liste, extra = [], env = {} }) {
  const argv = [path.join(racine, 'scripts/usine/releve-marche.mjs'), `--travail=${travail}`, `--liste=${liste}`, ...extra]
  return new Promise((res) => {
    const e = { PATH: process.env.PATH, ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}), HOME: travail, ...env }
    const c = spawn(process.execPath, argv, { env: e, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let sortie = ''
    c.stdout.on('data', (d) => { sortie += d }); c.stderr.on('data', (d) => { sortie += d })
    const t = setTimeout(() => { try { c.kill('SIGKILL') } catch { /* sorti */ } }, 60_000)
    c.on('close', (code) => { clearTimeout(t); res({ code, sortie }) })
  })
}
function listeDe(dossier, n, plafonds = {}) {
  const f = path.join(dossier, `liste-${n}.json`)
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(f, JSON.stringify({ plafonds: { firecrawl_par_jour: 12, apify_usd_par_jour: 0.15, tiktok_par_recherche: 20, ...plafonds }, produits: Array.from({ length: n }, (_, i) => ({ id: `produit-${i}`, ebay: `mot ebay ${i}`, tiktok: [`mot tiktok ${i}`] })) }))
  return f
}
const fichiersDe = (d, sortie = []) => { if (!fs.existsSync(d)) return sortie; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) fichiersDe(p, sortie); else sortie.push(p) } return sortie }

async function juger(racine, pref = '') {
  const env = (m) => ({ FIRECRAWL_API_KEY: CLE_FC, APIFY_TOKEN: JETON_AP, MARCHE_FIRECRAWL_URL: `http://127.0.0.1:${m.fc.port}/v1/scrape`, MARCHE_APIFY_URL: `http://127.0.0.1:${m.ap.port}/run` })
  // RM-1 : la valeur lue et le calcul
  {
    const m = await mondes(), d = path.join(TMP, pref + 'rm1')
    const r = await lancer(racine, { travail: path.join(d, 'sortie'), liste: listeDe(d, 1), env: env(m) })
    m.fermer()
    const jf = fichiersDe(path.join(d, 'sortie')).find((f) => /\d{4}-\d{2}-\d{2}\.json$/.test(f))
    const J = jf ? JSON.parse(lire(jf)) : null
    const p = J?.produits?.[0]
    ok('RM-1 eBay : 3 annonces lues, prix médian 27,99 €, une « 20 vendus » repérée, port gratuit lu', r.code === 0 && p?.ebay?.annonces === 3 && p.ebay.prix_demande_median === 27.99 && p.ebay.plus_vendus?.[0]?.vendus === 20 && p.ebay.plus_vendus?.[0]?.port === 0, JSON.stringify(p?.ebay) + ' code ' + r.code + ' ' + r.sortie)
    ok('RM-2 TikTok : 3 vidéos lues, 2 à plus de 100 000 vues, la plus vue en tête avec son lien', p?.tiktok?.[0]?.videos === 3 && p.tiktok[0].plus_de_100k === 2 && p.tiktok[0].top[0].vues === 1097050 && /tiktok\.com\/@fixit\/video\/1/.test(p.tiktok[0].top[0].lien), JSON.stringify(p?.tiktok?.[0]).slice(0, 200))
    const md = fichiersDe(path.join(d, 'sortie')).find((f) => f.endsWith('.md'))
    const texte = md ? lire(md) : ''
    ok('RM-3 le résumé dit « demandés », pas « vendus », et ne calcule aucune marge', /demand/i.test(texte) && !/\bmarge\s*:?\s*\d/i.test(texte) && !/prix vendus? (m[ée]dian|moyen)/i.test(texte) && /pas des prix vendus/.test(texte), texte.slice(0, 200))
    const tout = fichiersDe(path.join(d, 'sortie')).map(lire).join('\n') + r.sortie
    ok('RM-4 aucune clé ni jeton dans la sortie, les fichiers ou le journal', !tout.includes(CLE_FC) && !tout.includes(JETON_AP) && !/fc-[a-z0-9]{32}|apify_api_/i.test(tout), 'fuite')
    ok('RM-5 les clés partent en Bearer vers leurs fournisseurs seulement', m.fc.appels.every((a) => a.auth === `Bearer ${CLE_FC}`) && m.ap.appels.every((a) => a.auth === `Bearer ${JETON_AP}`) && m.fc.appels.length === 1 && m.ap.appels.length === 1, JSON.stringify([m.fc.appels.length, m.ap.appels.length]))
  }
  // RM-6 : un seul relevé par jour
  {
    const m = await mondes(), d = path.join(TMP, pref + 'rm6'), liste = listeDe(d, 1), travail = path.join(d, 'sortie')
    await lancer(racine, { travail, liste, env: env(m) })
    const avant = m.fc.appels.length + m.ap.appels.length
    const r2 = await lancer(racine, { travail, liste, env: env(m) })
    const apres = m.fc.appels.length + m.ap.appels.length
    const r3 = await lancer(racine, { travail, liste, extra: ['--force'], env: env(m) })
    m.fermer()
    ok('RM-6 un seul relevé par jour : le 2e passage n\'appelle rien (« déjà relevé »), --force relève', r2.code === 0 && apres === avant && /déjà relevé/.test(r2.sortie) && r3.code === 0 && m.fc.appels.length + m.ap.appels.length > apres, `${avant}/${apres} ${r2.sortie}`)
  }
  // RM-7 : plafonds
  {
    const m = await mondes(), d = path.join(TMP, pref + 'rm7')
    const r = await lancer(racine, { travail: path.join(d, 'sortie'), liste: listeDe(d, 6, { firecrawl_par_jour: 2, apify_usd_par_jour: 0.05 }), env: env(m) })
    m.fermer()
    ok('RM-7 plafonds tenus : 6 produits, 2 crédits Firecrawl au plus, un seul appel Apify (0,05 $ de plafond du jour)', m.fc.appels.length === 2 && m.ap.appels.length === 1 && /plafond du jour atteint/.test(fichiersDe(path.join(d, 'sortie')).map(lire).join('\n')), `${m.fc.appels.length}/${m.ap.appels.length} ${r.sortie}`)
    ok('RM-8 le plafond d\'Apify part avec chaque appel (maxTotalChargeUsd)', m.ap.appels.length >= 1 && m.ap.appels.every((a) => /maxTotalChargeUsd=0\.05/.test(a.url)), JSON.stringify(m.ap.appels.map((a) => a.url)))
  }
  // RM-9 : pannes
  {
    const m = await mondes({ ebayStatut: 500, apifyStatut: 500 }), d = path.join(TMP, pref + 'rm9')
    const r = await lancer(racine, { travail: path.join(d, 'sortie'), liste: listeDe(d, 1), env: env(m) })
    m.fermer()
    const J = JSON.parse(lire(fichiersDe(path.join(d, 'sortie')).find((f) => /\d{4}-\d{2}-\d{2}\.json$/.test(f))))
    ok('RM-9 sources en panne : aucun chiffre inventé, deux incidents notés, code 1', r.code === 1 && J.produits[0].ebay === null && J.produits[0].tiktok.length === 0 && J.incidents.length === 2, `${r.code} ${JSON.stringify(J.incidents)}`)
  }
  // RM-10 : sans clé
  {
    const m = await mondes(), d = path.join(TMP, pref + 'rm10')
    const r = await lancer(racine, { travail: path.join(d, 'sortie'), liste: listeDe(d, 1), env: { MARCHE_FIRECRAWL_URL: `http://127.0.0.1:${m.fc.port}/v1/scrape`, MARCHE_APIFY_URL: `http://127.0.0.1:${m.ap.port}/run` } })
    m.fermer()
    ok('RM-10 sans clé : aucun appel réseau, code 1', r.code === 1 && m.fc.appels.length === 0 && m.ap.appels.length === 0, `${r.code} ${m.fc.appels.length}/${m.ap.appels.length}`)
  }
  // RM-11 : la liste de surveillance du dépôt est valide et bornée
  {
    const L = JSON.parse(lire(path.join(racine, 'docs/ecommerce/surveillance-produits.json')))
    const bornes = L.plafonds?.firecrawl_par_jour <= 30 && L.plafonds?.apify_usd_par_jour <= 0.5 && L.plafonds?.tiktok_par_recherche <= 30
    ok('RM-11 la liste de surveillance : produits à mots-clés, plafonds ≤ 30 crédits, 0,5 $ et 30 vidéos', Array.isArray(L.produits) && L.produits.length >= 3 && L.produits.every((p) => typeof p.id === 'string' && typeof p.ebay === 'string' && Array.isArray(p.tiktok)) && bornes)
  }
  // RM-12 : les unités
  {
    const svc = lire(path.join(racine, 'scripts/usine/systemd/presti-preneur-marche.service')), tim = lire(path.join(racine, 'scripts/usine/systemd/presti-preneur-marche.timer'))
    const ex = svc.match(/^ExecStart=(.*)$/m)?.[1] ?? ''
    ok('RM-12 unités : compte agents, seuls FIRECRAWL_API_KEY et APIFY_TOKEN, pas d\'EnvironmentFile, un minuteur quotidien', /^User=agents$/m.test(svc) && !/^EnvironmentFile=/m.test(svc) && /avec-coffre\.mjs FIRECRAWL_API_KEY APIFY_TOKEN -- \/usr\/bin\/node scripts\/usine\/releve-marche\.mjs/.test(ex) && !/PRESTI_JETON_/.test(ex) && /^Type=oneshot$/m.test(svc) && /^OnCalendar=\S+/m.test(tim) && /^Unit=presti-preneur-marche\.service$/m.test(tim) && !/Persistent=true/.test(tim), ex)
  }
}

const SABOTAGES = [
  ['RM-6', 'scripts/usine/releve-marche.mjs', "if (!o.force && fs.existsSync(fichier))", "if (false && fs.existsSync(fichier))"],
  ['RM-7', 'scripts/usine/releve-marche.mjs', "creditsFc--", "creditsFc -= 0"],
  ['RM-8', 'scripts/usine/releve-marche.mjs', "?timeout=150&maxTotalChargeUsd=${encodeURIComponent(plafondUsd)}", "?timeout=150"],
  ['RM-4', 'scripts/usine/releve-marche.mjs', "console.log(`marché : ${jour}, ${reponses}", "console.log(`clé ${cleFc} marché : ${jour}, ${reponses}"],
  ['RM-1', 'scripts/usine/releve-marche.mjs', "prix_demande_median: mediane(prix)", "prix_demande_median: mediane(prix) + 1"],
  ['RM-2', 'scripts/usine/releve-marche.mjs', "x.vues >= 100_000", "x.vues >= 1_000_000"],
  ['RM-3', 'scripts/usine/releve-marche.mjs', "Prix **demandés** sur eBay.fr (pas des prix vendus)", "Prix vendus sur eBay.fr"],
  ['RM-9', 'scripts/usine/releve-marche.mjs', "return reponses ? 0 : 1", "return 0"],
  ['RM-10', 'scripts/usine/releve-marche.mjs', "if (!o.sansEbay && cleFc && creditsFc > 0", "if (!o.sansEbay && creditsFc > 0"],
  ['RM-12', 'scripts/usine/systemd/presti-preneur-marche.service', 'FIRECRAWL_API_KEY APIFY_TOKEN --', 'FIRECRAWL_API_KEY APIFY_TOKEN PRESTI_JETON_PRENEUR --'],
]
const FICHIERS = ['scripts/usine/releve-marche.mjs', 'scripts/usine/systemd/presti-preneur-marche.service', 'scripts/usine/systemd/presti-preneur-marche.timer', 'docs/ecommerce/surveillance-produits.json']
function copie(nom) {
  const d = path.join(TMP, nom)
  for (const f of FICHIERS) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.copyFileSync(path.join(DEPOT, f), path.join(d, f)) }
  return d
}

async function principal() {
  if (!PREUVE) {
    const avant = rouges.length
    await juger(RACINE)
    console.log(`\n${rouges.length - avant ? '✗' : '✓'} releve-marche-qa : ${rouges.length ? 'rouge(s) : ' + rouges.join(', ') : 'tous les critères verts'}`)
    return rouges.length ? 1 : 0
  }
  console.log('## témoin'); await juger(copie('temoin'), 'temoin-')
  let ko = rouges.length; rouges.length = 0
  console.log('\n## sabotages (chacun doit rendre rouge le critère visé)')
  let n = 0
  for (const [id, rel, avant, apres] of SABOTAGES) {
    n++
    const d = copie(`sab-${n}`), f = path.join(d, rel)
    const t = lire(f)
    if (!t.includes(avant)) { console.log(`FAIL sabotage ${n} → ${id} : texte à saboter introuvable`); ko++; continue }
    fs.writeFileSync(f, t.replace(avant, () => apres))
    const log = console.log; console.log = () => {}
    rouges.length = 0
    try { await juger(d, `s${n}-`) } finally { console.log = log }
    const attrape = rouges.includes(id) || rouges.some((r) => r.startsWith(id))
    console.log(`${attrape ? 'PASS' : 'FAIL'} sabotage ${n} → ${id} ${attrape ? 'rouge' : 'RESTE VERT'} : ${rel}`)
    if (!attrape) ko++
  }
  console.log(`\n${ko ? '✗' : '✓'} releve-marche-qa --preuve-echecs : ${SABOTAGES.length} sabotage(s)${ko ? `, ${ko} écart(s)` : ' tous attrapés'}`)
  return ko ? 1 : 0
}
process.exitCode = await principal()
fs.rmSync(TMP, { recursive: true, force: true })
