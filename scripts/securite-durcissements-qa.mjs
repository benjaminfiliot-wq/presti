#!/usr/bin/env node
// scripts/securite-durcissements-qa.mjs — juge des six durcissements de l'audit de sécurité du 20/10/2026.
// Aucun réseau (le « serveur Supabase » est un port local fermé, le DNS est simulé), aucune base, aucun envoi.
//
//  A. SSRF IMAP (lib/hoteSur.ts) : adresses privées / boucle / lien-local / CGNAT / IPv6 (::1, fc00::/7, fe80::/10, IPv4 mappée) refusées,
//     port 22 refusé, IP littérale refusée, nom public accepté, UNE adresse privée parmi les résolues suffit à refuser.
//  B. LIMITEURS : consommerLimiteStricte renvoie false quand la base est injoignable (consommerLimite reste fail-open : true).
//  C. SECRETS EN TEMPS CONSTANT (lib/secretEgal.ts) : égal / différent / longueurs différentes / vide / null.
//  D. SOURCES : plus aucune comparaison `Bearer` directe dans app/api ; subscribe sans l'en-tête Origin ; /api/leads vérifie les octets
//     des photos ; /api/leads/contact plafonne par IP en fail-closed ; la route canaux et la relève passent par hoteSur ; suite au lanceur.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/securite-durcissements-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
// Un port fermé en boucle locale : toute requête Supabase échoue tout de suite, sans quitter la machine.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'cle-de-test'

const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const fichiers = (dir) => fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []))

// ── A. SSRF IMAP
const H = await imp('lib/hoteSur.ts')
for (const ip of ['127.0.0.1', '127.8.8.8', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.10', '169.254.169.254', '0.0.0.0', '0.1.2.3', '100.64.0.1', '100.127.255.254', '224.0.0.1', '255.255.255.255',
  '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'febf::1', '::ffff:127.0.0.1', '::ffff:10.1.2.3', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', '2002:7f00:1::1', 'ff02::1', 'pas-une-ip', '']) {
  T(`A. adresse interdite : ${ip || '(vide)'}`, H.adresseInterdite(ip) === true)
}
for (const ip of ['8.8.8.8', '51.38.0.12', '172.15.0.1', '172.32.0.1', '100.63.255.255', '100.128.0.1', '2606:4700:4700::1111', '2a00:1450:4007:80f::200e', '::ffff:8.8.8.8']) {
  T(`A. adresse publique acceptée : ${ip}`, H.adresseInterdite(ip) === false)
}
const sim = (table) => async (h) => { if (!(h in table)) throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }); return table[h] }
const dns = sim({ 'imap.gmail.com': ['142.250.74.109', '2a00:1450:4007:80f::206d'], 'ssl0.ovh.net': ['51.254.0.1'], 'interne.example.fr': ['10.0.0.8'], 'mixte.example.fr': ['51.1.1.1', '192.168.0.9'], 'v6interne.example.fr': ['fe80::1'], 'mappe.example.fr': ['::ffff:127.0.0.1'], 'vide.example.fr': [] })
const v = (h, p) => H.verifierServeurImap(h, p, dns)
T('A. port 22 refusé', (await v('imap.gmail.com', 22)).raison === 'port')
for (const p of [25, 80, 110, 465, 587, 3306, 6379, 0, 99999]) T(`A. port ${p} refusé`, (await v('imap.gmail.com', p)).ok === false)
T('A. ports 993 et 143 acceptés (nom public)', (await v('imap.gmail.com', 993)).ok === true && (await v('ssl0.ovh.net', 143)).ok === true)
const g = await v('IMAP.Gmail.com', 993)
T('A. nom public : hôte normalisé, adresse IPv4 choisie', g.ok && g.hote === 'imap.gmail.com' && g.adresse === '142.250.74.109', JSON.stringify(g))
T('A. IP littérale refusée (v4)', (await v('8.8.8.8', 993)).raison === 'hote')
T('A. IP littérale refusée (v6)', (await v('2606:4700:4700::1111', 993)).raison === 'hote')
T('A. forme décimale refusée', (await v('2130706433', 993)).raison === 'hote')
for (const h of ['localhost', 'machine.local', 'api.internal', 'x.localhost', 'a b.fr', 'sans-point', 'imap..fr', '', 'imap.gmail.com/../x', 'user@imap.fr']) T(`A. hôte refusé : ${h || '(vide)'}`, (await v(h, 993)).ok === false)
T('A. nom résolvant vers 10/8 refusé', (await v('interne.example.fr', 993)).raison === 'prive')
T('A. UNE adresse privée parmi les résolues suffit', (await v('mixte.example.fr', 993)).raison === 'prive')
T('A. IPv6 lien-local refusée', (await v('v6interne.example.fr', 993)).raison === 'prive')
T('A. IPv4 mappée en IPv6 refusée', (await v('mappe.example.fr', 993)).raison === 'prive')
T('A. nom inconnu : refus « dns »', (await v('inconnu.example.fr', 993)).raison === 'dns')
T('A. aucune adresse résolue : refus', (await v('vide.example.fr', 993)).ok === false)
T('A. message artisan générique', H.MESSAGE_SERVEUR_INJOIGNABLE === 'Connexion impossible à ce serveur de messagerie.')

// ── B. LIMITEURS
const L = await imp('lib/limites.ts')
const silence = console.error; console.error = () => {}
let strict, ouvert
try { strict = await L.consommerLimiteStricte('qa:securite', 1, 60); ouvert = await L.consommerLimite('qa:securite', 1, 60) } finally { console.error = silence }
T('B. consommerLimiteStricte : false quand la base est injoignable', strict === false, String(strict))
T('B. consommerLimite reste fail-open (true) — comportement inchangé ailleurs', ouvert === true, String(ouvert))

// ── C. SECRETS EN TEMPS CONSTANT
const S = await imp('lib/secretEgal.ts')
T('C. secretEgal : identiques', S.secretEgal('abc123', 'abc123') === true)
T('C. secretEgal : différents, même longueur', S.secretEgal('abc123', 'abc124') === false)
T('C. secretEgal : longueurs différentes', S.secretEgal('abc12', 'abc123') === false && S.secretEgal('abc1234', 'abc123') === false)
T('C. secretEgal : vide / absent refusés (fail-closed)', S.secretEgal('', '') === false && S.secretEgal(null, 'x') === false && S.secretEgal('x', undefined) === false && S.secretEgal('x', '') === false)
T('C. secretEgal : multi-octets', S.secretEgal('été', 'été') === true && S.secretEgal('été', 'ete') === false)
T('C. bearerEgal : en-tête exact', S.bearerEgal('Bearer s3cret', 's3cret') === true)
T('C. bearerEgal : refuse sans préfixe, mauvais secret, secret absent, en-tête absent', S.bearerEgal('s3cret', 's3cret') === false && S.bearerEgal('Bearer autre', 's3cret') === false && S.bearerEgal('Bearer undefined', undefined) === false && S.bearerEgal('Bearer ', '') === false && S.bearerEgal(null, 's3cret') === false)

// ── D. SOURCES
const cron = fichiers('app/api/cron').concat(['app/api/agents/tic/route.ts', 'app/api/canaux/relever/route.ts'])
const restes = cron.filter((f) => /!==\s*`Bearer/.test(sansCommentaires(lire(f))))
T('D. aucun `!== `Bearer` dans app/api/cron, agents/tic, canaux/relever', restes.length === 0, restes.join(', '))
const toutes = fichiers('app/api').filter((f) => /[!=]==\s*`Bearer/.test(sansCommentaires(lire(f))))
T('D. aucune comparaison `Bearer` directe dans tout app/api', toutes.length === 0, toutes.join(', '))
T('D. les crons utilisent bearerEgal', cron.filter((f) => f.startsWith('app/api/cron/') && f.endsWith('route.ts')).every((f) => lire(f).includes('bearerEgal')))
const sub = sansCommentaires(lire('app/api/subscribe/route.ts'))
T("D. subscribe : plus de req.headers.get('origin')", !/headers\.get\(\s*['"]origin['"]/i.test(sub))
T('D. subscribe : success_url / cancel_url sur la constante du site', /BASE_PRESTI/.test(sub) && /success_url:\s*`\$\{origin\}/.test(sub))
T('D. portail Stripe : même correction', !/headers\.get\(\s*['"]origin['"]/i.test(sansCommentaires(lire('app/api/stripe/portail/route.ts'))))
const leads = sansCommentaires(lire('app/api/leads/route.ts'))
T('D. leads : detecterTypeImage sur les octets des photos', /detecterTypeImage\(buf\)/.test(leads) && /vrai\.type/.test(leads) && !/contentType:\s*`image\/\$\{m\[1\]\}`/.test(leads))
T('D. leads : plafond IP en fail-closed', /consommerLimiteStricte\(`leads:ip:/.test(leads))
const contact = sansCommentaires(lire('app/api/leads/contact/route.ts'))
const iLim = contact.indexOf('consommerLimiteStricte(`leads-contact:ip:')
const iMail = contact.search(/sendEmail\(|notifierArtisan\(/g)
T('D. leads/contact : plafond IP strict (5 / heure) avant tout envoi', iLim > 0 && iMail > iLim && /,\s*5\s*,\s*3600\)/.test(contact))
for (const f of ['app/api/conversation/route.ts', 'app/api/conversation/stream/route.ts', 'app/api/conversation/devis/route.ts', 'app/api/contact/route.ts', 'app/api/prospects/entrant/route.ts']) {
  T(`D. limiteur strict : ${f}`, /consommerLimiteStricte/.test(lire(f)) && !/\bconsommerLimite\b/.test(sansCommentaires(lire(f))))
}
T('D. canaux : le test de connexion artisan passe par hoteSur', /artisan:\s*true/.test(lire('app/api/canaux/route.ts')) && /verifierServeurImap/.test(lire('lib/canaux.ts')))
T("D. relève : revalidation de l'hôte à chaque passage (rebinding DNS)", /verifierServeurImap\(/.test(lire('lib/releveCanal.ts')) && /servername:\s*verdict\.hote/.test(lire('lib/releveCanal.ts')))
T('D. la suite est au tableau SUITES du lanceur', lire('scripts/tout-verifier.mjs').includes('securite-durcissements-qa.mjs'))

console.log(`\nsecurite-durcissements-qa : ${rouges.length ? 'FAIL' : 'PASS'} — ${verts} verts, ${rouges.length} rouges${rouges.length ? ' : ' + rouges.join(' | ') : ''}`)
process.exit(rouges.length ? 1 : 0)
