// Firebase (prompt v9 §9, M3) : pose les deux fichiers du projet Firebase là où ils servent — SANS jamais les
// afficher ni les versionner.
//
//   node scripts/firebase-poser.mjs <google-services.json> <compte-de-service.json>
//
//  1. google-services.json (config CLIENT de l'app Android, paquet fr.prestiapp.app) :
//       → mobile/android/app/google-services.json (ignoré par git : la coque locale)
//       → secret GitHub ANDROID_GOOGLE_SERVICES_BASE64 (le workflow l'écrit avant de compiler)
//  2. la clé du compte de service (SECRET serveur : signe les envois FCM v1, lib/pushNatif.ts) :
//       → variable Vercel FIREBASE_SERVICE_ACCOUNT (production + preview, par scripts/vercel-env.mjs)
//       → .env.local (ajoutée si absente ; jamais réécrite)
//  Ensuite, à la main : `pushNatif: true` dans lib/flags.ts, push, tag mobile-v* → APK avec notifications natives.
//
// Rien de sensible n'est imprimé : seulement le project_id et les codes HTTP.
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawnSync } from 'node:child_process'
import sodium from 'libsodium-wrappers'

const [cheminGs, cheminSa] = process.argv.slice(2)
if (!cheminGs || !cheminSa) { console.log('usage : node scripts/firebase-poser.mjs <google-services.json> <compte-de-service.json>'); process.exit(2) }
const lireJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const REPO = 'benjaminfiliot-wq/presti', PAQUET = 'fr.prestiapp.app'

// ── 1. google-services.json ─────────────────────────────────────────────────────────────────────
const gs = lireJson(cheminGs)
if (!gs?.project_info?.project_id) { console.log('❌ google-services.json illisible (project_info.project_id attendu)'); process.exit(1) }
const client = (gs.client || []).find((c) => c?.client_info?.android_client_info?.package_name === PAQUET)
if (!client) { console.log(`❌ google-services.json : aucune app Android « ${PAQUET} » dedans (paquet attendu par la coque)`); process.exit(1) }
const projet = gs.project_info.project_id
console.log(`Firebase : projet « ${projet} », app Android ${PAQUET} ✔`)
const dest = path.join('mobile', 'android', 'app', 'google-services.json')
fs.copyFileSync(cheminGs, dest)
console.log(`  → ${dest} (ignoré par git)`)
const ignore = execSync(`git check-ignore -q "${dest}" && echo oui || echo non`, { encoding: 'utf8', shell: true }).trim()
if (ignore !== 'oui') { console.log('❌ ce chemin N’EST PAS ignoré par git : je m’arrête avant de versionner un fichier Firebase'); process.exit(1) }

// secret GitHub (boîte scellée libsodium, comme l'exige l'API)
await sodium.ready
const cred = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' })
const tok = cred.split('\n').find((x) => x.startsWith('password='))?.slice(9)
if (!tok) { console.log('❌ pas de jeton GitHub dans le trousseau git'); process.exit(1) }
const H = { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json', 'User-Agent': 'presti', 'Content-Type': 'application/json' }
const pk = await (await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, { headers: H })).json()
if (!pk.key) { console.log('❌ clé publique du dépôt indisponible'); process.exit(1) }
const poserSecret = async (nom, valeur) => {
  const chiffre = sodium.crypto_box_seal(Buffer.from(valeur), Buffer.from(pk.key, 'base64'))
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${nom}`, { method: 'PUT', headers: H, body: JSON.stringify({ encrypted_value: Buffer.from(chiffre).toString('base64'), key_id: pk.key_id }) })
  console.log(`  → secret GitHub ${nom} : HTTP ${r.status}`)
  return r.status === 201 || r.status === 204
}
if (!await poserSecret('ANDROID_GOOGLE_SERVICES_BASE64', fs.readFileSync(cheminGs).toString('base64'))) process.exit(1)

// ── 2. compte de service ────────────────────────────────────────────────────────────────────────
const sa = lireJson(cheminSa)
if (sa?.type !== 'service_account' || !sa.project_id || !sa.client_email || !sa.private_key) { console.log('❌ compte de service illisible (type service_account, project_id, client_email, private_key attendus)'); process.exit(1) }
if (sa.project_id !== projet) { console.log(`❌ le compte de service est du projet « ${sa.project_id} », pas « ${projet} »`); process.exit(1) }
if (!/^-----BEGIN PRIVATE KEY-----/.test(sa.private_key)) { console.log('❌ private_key : pas une clé PEM'); process.exit(1) }
const valeur = JSON.stringify({ type: sa.type, project_id: sa.project_id, client_email: sa.client_email, private_key: sa.private_key, token_uri: sa.token_uri || 'https://oauth2.googleapis.com/token' })
console.log(`Compte de service du projet « ${projet } » ✔ (${valeur.length} caractères)`)
const r = spawnSync(process.execPath, ['scripts/vercel-env.mjs', 'FIREBASE_SERVICE_ACCOUNT', valeur], { stdio: 'inherit' })
if (r.status !== 0) { console.log('❌ pose sur Vercel ratée'); process.exit(1) }
const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : ''
if (/^FIREBASE_SERVICE_ACCOUNT=/m.test(envLocal)) console.log('  → .env.local : FIREBASE_SERVICE_ACCOUNT déjà présente, laissée telle quelle')
else { fs.appendFileSync('.env.local', `${envLocal.endsWith('\n') || !envLocal ? '' : '\n'}# Firebase (M3) — compte de service FCM v1, posé par scripts/firebase-poser.mjs\nFIREBASE_SERVICE_ACCOUNT='${valeur}'\n`); console.log('  → .env.local : FIREBASE_SERVICE_ACCOUNT ajoutée') }

console.log(`\n✅ Firebase en place pour « ${projet} ». Reste : pushNatif: true dans lib/flags.ts → push → tag mobile-v* → la notification native se prouve sur le téléphone (TESTS.md lignes 4-5).`)
