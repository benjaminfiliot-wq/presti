// Liens profonds de l'application (prompt v9 §4.4 et §7) — suite GRATUITE, sans navigateur, 0 IA.
//
//  1. `/.well-known/assetlinks.json` : servi sur les hôtes MAISON (qg.prestiapp.fr = la console, l'apex) en JSON,
//     pour le paquet `fr.prestiapp.app`, avec des empreintes SHA-256 bien formées, identique au fichier du dépôt ;
//  2. white-label : sur un hôte qui n'est pas maison, rien — 404, et jamais le nom du paquet ;
//  3. `/.well-known/apple-app-site-association` : servi et bien formé dès qu'il existe dans le dépôt (M1 : Team ID) ;
//     sinon la ligne est ⏳, pas ❌ — on ne fait pas semblant ;
//  4. cohérence : les chemins déclarés dans le manifeste Android (App Links) = ceux que le pont accepte
//     (`CHEMINS_CONSOLE` de app/NatifPont.tsx), et chacun existe vraiment sur la console ;
//  5. la coque : `server.url` sur qg.prestiapp.fr, `allowNavigation` fermée (nos hôtes seulement, jamais « * »).
//
// Usage : node scripts/liens-profonds-e2e.mjs            (prod)
//         TEST_BASE=http://localhost:3116 node scripts/liens-profonds-e2e.mjs
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'

// .env.local (NEXT_PUBLIC_DOMAINE_NEUTRE pour la sonde « hôte d’artisan ») — sans écraser l’environnement
try {
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* pas de .env.local : prod sans domaine neutre */ }

const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
const LOCAL = APP.startsWith('http://')
const PAQUET = 'fr.prestiapp.app'
const CONSOLE = 'qg.prestiapp.fr'
let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`) } }

/** GET par en-tête Host (fetch l'interdit) : le même serveur, vu depuis un hôte donné. */
const sonder = (hote, chemin) => new Promise((resolve) => {
  const { request } = LOCAL ? http : https
  const base = LOCAL ? { hostname: '127.0.0.1', port: Number(new URL(APP).port || 80) } : { hostname: 'prestiapp.fr', servername: 'prestiapp.fr', port: 443 }
  const req = request({ ...base, path: chemin, method: 'GET', headers: { Host: hote, 'user-agent': 'presti-liens-profonds-e2e' } }, (res) => {
    const morceaux = []; res.on('data', (c) => morceaux.push(c)); res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', t: Buffer.concat(morceaux).toString('utf8') }))
  })
  req.on('error', () => resolve({ status: 0, type: '', t: '' })); req.end()
})
const json = (t) => { try { return JSON.parse(t) } catch { return null } }
const EMPREINTE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

console.log(`\nliens-profonds-e2e — ${APP}\n`)

// ── 1. assetlinks.json sur les hôtes maison ─────────────────────────────────────────────────────
console.log('1. Android App Links — assetlinks.json')
const local = json(fs.readFileSync('public/.well-known/assetlinks.json', 'utf8'))
T('le fichier du dépôt est un tableau JSON avec une cible android_app pour ' + PAQUET, Array.isArray(local) && local.some((e) => e?.target?.namespace === 'android_app' && e.target.package_name === PAQUET))
const cibles = (Array.isArray(local) ? local : []).filter((e) => e?.target?.namespace === 'android_app')
T('relation « handle_all_urls » sur chaque cible', cibles.length > 0 && cibles.every((e) => (e.relation || []).includes('delegate_permission/common.handle_all_urls')))
const empreintes = cibles.flatMap((e) => e.target.sha256_cert_fingerprints || [])
T(`empreintes SHA-256 bien formées (${empreintes.length})`, empreintes.length > 0 && empreintes.every((f) => EMPREINTE.test(f)), empreintes.join(' '))
for (const hote of LOCAL ? [CONSOLE] : [CONSOLE, 'prestiapp.fr']) {
  const r = await sonder(hote, '/.well-known/assetlinks.json')
  const d = json(r.t)
  T(`${hote} : 200, application/json, identique au dépôt`, r.status === 200 && /application\/json/.test(r.type) && !!d && JSON.stringify(d) === JSON.stringify(local), `${r.status} ${r.type}`)
}

// ── 2. white-label ──────────────────────────────────────────────────────────────────────────────
console.log('\n2. Hôte d’artisan : rien de l’application')
const NEUTRE = (process.env.NEXT_PUBLIC_DOMAINE_NEUTRE || '').trim().toLowerCase()
const hotesArtisan = LOCAL ? ['mondomaine-artisan.fr', ...(NEUTRE ? [`demo.${NEUTRE}`] : [])] : [...(NEUTRE ? [`demo.${NEUTRE}`] : []), 'mondomaine-artisan.fr']
for (const hote of hotesArtisan) {
  const r = await Promise.all([sonder(hote, '/.well-known/assetlinks.json'), sonder(hote, '/.well-known/apple-app-site-association'), sonder(hote, '/.well-known/quoi-que-ce-soit.json')])
  T(`${hote} : /.well-known/* → 404, sans « ${PAQUET} »`, r.every((x) => x.status === 404 && !x.t.includes(PAQUET)), r.map((x) => x.status).join(' '))
}

// ── 3. AASA (iOS) ───────────────────────────────────────────────────────────────────────────────
console.log('\n3. iOS Universal Links — apple-app-site-association')
if (fs.existsSync('public/.well-known/apple-app-site-association')) {
  const aasaLocal = json(fs.readFileSync('public/.well-known/apple-app-site-association', 'utf8'))
  const appIds = aasaLocal?.applinks?.details?.flatMap((d) => d.appIDs || (d.appID ? [d.appID] : [])) || []
  T('le fichier du dépôt déclare applinks pour ' + PAQUET + ' (TEAMID.' + PAQUET + ')', appIds.length > 0 && appIds.every((id) => /^[A-Z0-9]{10}\./.test(id) && id.endsWith('.' + PAQUET)), appIds.join(' '))
  const r = await sonder(CONSOLE, '/.well-known/apple-app-site-association')
  T(`${CONSOLE} : 200, application/json, sans extension, identique au dépôt`, r.status === 200 && /application\/json/.test(r.type) && JSON.stringify(json(r.t)) === JSON.stringify(aasaLocal), `${r.status} ${r.type}`)
} else console.log('  ⏳ pas de fichier AASA dans le dépôt : attend le Team ID Apple (M1). Rien n’est prétendu.')

// ── 4. cohérence manifeste Android ↔ pont ───────────────────────────────────────────────────────
console.log('\n4. Chemins des liens profonds : manifeste Android = pont natif = pages réelles')
const manifeste = fs.readFileSync('mobile/android/app/src/main/AndroidManifest.xml', 'utf8')
const pont = fs.readFileSync('app/NatifPont.tsx', 'utf8')
const chemMan = [...manifeste.matchAll(/android:pathPrefix="(\/[a-z-]+)"/g)].map((m) => m[1]).sort()
const mPont = pont.match(/CHEMINS_CONSOLE = \/\^\\\/\(([a-z|-]+)\)/)
const chemPont = (mPont ? mPont[1].split('|') : []).map((c) => '/' + c).sort()
T(`les chemins du manifeste (${chemMan.length}) sont exactement ceux du pont (${chemPont.length})`, chemMan.length > 0 && JSON.stringify(chemMan) === JSON.stringify(chemPont), `manifeste ${chemMan.join(' ')} · pont ${chemPont.join(' ')}`)
T('autoVerify sur le filtre d’intention https de ' + CONSOLE, /android:autoVerify="true"/.test(manifeste) && manifeste.includes(`android:host="${CONSOLE}"`))
for (const c of chemMan) {
  const r = await sonder(CONSOLE, c)
  // déconnecté : la page existe (200) ou renvoie vers la connexion (3xx) — jamais 404
  T(`${CONSOLE}${c} répond (${r.status})`, [200, 301, 302, 307, 308].includes(r.status), String(r.status))
}

// ── 5. la coque ─────────────────────────────────────────────────────────────────────────────────
console.log('\n5. capacitor.config.ts : fermée sur nos hôtes')
const conf = fs.readFileSync('mobile/capacitor.config.ts', 'utf8')
T('server.url sur ' + CONSOLE, new RegExp(`https://${CONSOLE.replace('.', '\\.')}/`).test(conf))
T('allowNavigation : qg.prestiapp.fr et prestiapp.fr, jamais « * » seul', /allowNavigation/.test(conf) && conf.includes(`'${CONSOLE}'`) && conf.includes("'prestiapp.fr'") && !/allowNavigation[^\]]*'\*'/.test(conf))
T('allowNavigation : les hôtes de debug (vercel.app, localhost) seulement derrière PRESTI_MOBILE_DEBUG', /PRESTI_MOBILE_DEBUG/.test(conf) && /debug \? \[/.test(conf))
T('iOS : limitsNavigationsToAppBoundDomains + WKAppBoundDomains dans Info.plist', /limitsNavigationsToAppBoundDomains:\s*true/.test(conf) && fs.readFileSync('mobile/ios/App/App/Info.plist', 'utf8').includes('WKAppBoundDomains'))

console.log(`\n${ko ? '❌' : '✅'} liens-profonds-e2e : ${ok}/${ok + ko} — ${APP}`)
process.exitCode = ko ? 1 : 0
