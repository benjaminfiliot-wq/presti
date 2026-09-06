// Le compte de RELECTURE des stores (prompt v9 §5.4 ; critique des fiches du 07/09 : « aucun relecteur ne peut entrer »).
//
// Apple et Google testent l'app avec un compte qu'on leur donne. Personne chez eux ne lit une boîte email : le
// second facteur de ce compte est un CODE FIXE, connu du serveur par deux variables (RELECTURE_EMAIL, RELECTURE_CODE —
// app/api/auth/code/verifier/route.ts), jamais dans le dépôt. Ce script, idempotent :
//   1. crée (ou retrouve) le compte — email confirmé, mot de passe fort, offre Signature, visite guidée déjà vue ;
//   2. sème deux conversations et un devis de démonstration DIRECTEMENT en base (aucun appel IA, aucun email) ;
//   3. pose RELECTURE_EMAIL + RELECTURE_CODE sur Vercel (production) et dans .env.local (avec le mot de passe, pour
//      la suite code-connexion-e2e) ;
//   4. range email / mot de passe / code dans Documents/presti-secrets/relecture.txt — ce que Benj copie dans les
//      notes de relecture des stores. RIEN n'est affiché ici.
//
// Usage : node scripts/compte-relecture.mjs            (prod, depuis .env.local)
import fs from 'node:fs'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB || !SVC) { console.log('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents'); process.exit(1) }
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (chemin, init = {}) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...H, ...(init.headers || {}) } })
const admin = (chemin, init = {}) => fetch(`${SB}/auth/v1/admin/${chemin}`, { ...init, headers: { ...H, ...(init.headers || {}) } })

const EMAIL = (process.env.RELECTURE_EMAIL || 'relecture-stores@presti-test.invalid').toLowerCase() // .invalid : lib/email.ts n'y envoie jamais rien
const SLUG = 'atelier-relecture'
const SECRETS = 'C:/Users/benja/Documents/presti-secrets'
const motDePasse = process.env.RELECTURE_MOT_DE_PASSE || `Rel-${crypto.randomBytes(9).toString('base64url')}-${crypto.randomInt(10, 99)}`
const code = /^\d{6}$/.test(process.env.RELECTURE_CODE || '') ? process.env.RELECTURE_CODE : String(crypto.randomInt(100000, 999999))

// ── 1. le compte ─────────────────────────────────────────────────────────────────────────────────
let uid = null
{
  const r = await rest(`artisans?select=id&email=eq.${encodeURIComponent(EMAIL)}`)
  const [a] = await r.json().catch(() => [])
  uid = a?.id ?? null
}
if (!uid) {
  const r = await admin('users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: motDePasse, email_confirm: true }) })
  const u = await r.json()
  if (!u?.id) {
    // déjà dans auth (sans ligne artisans) : on le retrouve
    const l = await (await admin(`users?page=1&per_page=200`)).json()
    uid = (l?.users || []).find((x) => (x.email || '').toLowerCase() === EMAIL)?.id ?? null
    if (!uid) { console.log('❌ création du compte impossible :', JSON.stringify(u).slice(0, 160)); process.exit(1) }
  } else uid = u.id
  console.log('compte auth : créé')
} else {
  await admin(`users/${uid}`, { method: 'PUT', body: JSON.stringify({ password: motDePasse, email_confirm: true }) })
  console.log('compte auth : existant, mot de passe renouvelé')
}
const artisan = {
  id: uid, email: EMAIL, nom: 'Atelier Relecture', metier: 'Plombier-chauffagiste', slug: SLUG, plan: 'signature', credits: 250,
  aide_vues: ['visite:console'], siret: '90000000000000', forme_juridique: 'EI', adresse: '12 rue des Tests', code_postal: '75011', ville: 'Paris',
  assurance_nom: 'Assureur de démonstration', assurance_contrat: 'DEMO-0001',
}
const ra = await rest('artisans', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(artisan) })
if (!ra.ok) { console.log('❌ artisans :', ra.status, (await ra.text()).slice(0, 200)); process.exit(1) }
console.log(`artisan : ${artisan.nom} (${artisan.plan}, ${artisan.credits} crédits, visite guidée vue)`)

// ── 2. les données de démonstration (en base : 0 IA, 0 email) ────────────────────────────────────
const dejaLeads = await (await rest(`leads?select=id&artisan_id=eq.${uid}`)).json().catch(() => [])
if (!Array.isArray(dejaLeads) || dejaLeads.length === 0) {
  const il = (jours, heures = 0) => new Date(Date.now() - jours * 86400000 - heures * 3600000).toISOString()
  const leads = [
    { artisan_id: uid, nom_prospect: 'Camille Dupont', contact: 'camille.dupont@example.com', canal: 'site', message: 'Bonjour, mon chauffe-eau de 200 L ne chauffe plus depuis hier soir. Pouvez-vous passer cette semaine ?', statut: 'repondu', created_at: il(2, 3), updated_at: il(2, 2) },
    { artisan_id: uid, nom_prospect: 'Thomas Bernard', contact: 'thomas.bernard@example.com', canal: 'site', message: 'Bonjour, je voudrais un devis pour remplacer un mitigeur de cuisine et vérifier une petite fuite sous l’évier.', statut: 'nouveau', created_at: il(0, 5), updated_at: il(0, 5) },
  ]
  const rl = await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(leads) })
  const crees = await rl.json().catch(() => [])
  if (!rl.ok || !Array.isArray(crees) || crees.length !== 2) { console.log('❌ leads :', rl.status, JSON.stringify(crees).slice(0, 200)); process.exit(1) }
  const [c1, c2] = crees
  const messages = [
    { lead_id: c1.id, sens: 'in', type: 'manuel', contenu: leads[0].message, sent_at: il(2, 3) },
    { lead_id: c1.id, sens: 'out', type: 'manuel', contenu: 'Bonjour Camille, merci pour votre message. Je peux passer jeudi entre 9 h et 11 h pour diagnostiquer le chauffe-eau. Est-ce que cela vous convient ?', sent_at: il(2, 2) },
    { lead_id: c1.id, sens: 'in', type: 'manuel', contenu: 'Parfait pour jeudi 9 h, merci !', sent_at: il(1, 20) },
    { lead_id: c2.id, sens: 'in', type: 'manuel', contenu: leads[1].message, sent_at: il(0, 5) },
  ]
  const rm = await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(messages) })
  if (!rm.ok) { console.log('❌ messages :', rm.status, (await rm.text()).slice(0, 200)); process.exit(1) }
  console.log('démonstration : 2 conversations, 4 messages')
} else console.log(`démonstration : ${dejaLeads.length} conversation(s) déjà là`)

// un devis, par l'API (numérotation, mentions, PDF — comme un vrai) avec une session attestée par la clé service
const dejaDevis = await (await rest(`devis?select=id&artisan_id=eq.${uid}`)).json().catch(() => [])
if (!Array.isArray(dejaDevis) || dejaDevis.length === 0) {
  const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
  const { verifierSessionTest } = await import('./lib/connexion-test.mjs')
  const s = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: motDePasse }) })).json()
  if (!s?.access_token) { console.log('❌ session du compte de relecture impossible'); process.exit(1) }
  await verifierSessionTest(s.access_token)
  const rd = await fetch(`${APP}/api/devis`, { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ objet: 'Remplacement chauffe-eau 200 L', client_nom: 'Camille Dupont', client_email: 'camille.dupont@example.com', lignes: [{ designation: 'Chauffe-eau 200 L, pose et raccordement', quantite: 1, unite: 'u', prix_unitaire_ht: 690, tva_taux: 10 }, { designation: 'Groupe de sécurité et flexibles', quantite: 1, unite: 'u', prix_unitaire_ht: 84, tva_taux: 10 }, { designation: 'Dépose et évacuation de l’ancien appareil', quantite: 1, unite: 'forfait', prix_unitaire_ht: 60, tva_taux: 10 }] }) })
  console.log(rd.ok ? 'démonstration : 1 devis créé par l’API' : `⚠️ devis non créé (HTTP ${rd.status}) : ${(await rd.text()).slice(0, 120)}`)
} else console.log(`démonstration : ${dejaDevis.length} devis déjà là`)

// ── 3. les variables (Vercel production + .env.local) ─────────────────────────────────────────────
for (const [k, v] of [['RELECTURE_EMAIL', EMAIL], ['RELECTURE_CODE', code]]) {
  const r = spawnSync(process.execPath, ['scripts/vercel-env.mjs', k, v, '--prod'], { encoding: 'utf8' })
  console.log(`  → Vercel ${k} : ${r.status === 0 ? 'posée (production)' : 'ÉCHEC ' + (r.stdout + r.stderr).slice(0, 120)}`)
  if (r.status !== 0) process.exit(1)
}
let env = fs.readFileSync('.env.local', 'utf8')
const poser = (k, v) => { if (new RegExp(`^${k}=`, 'm').test(env)) env = env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`); else env += `${env.endsWith('\n') ? '' : '\n'}${k}=${v}\n` }
if (!/# Compte de relecture des stores/.test(env)) env += `${env.endsWith('\n') ? '' : '\n'}# Compte de relecture des stores (scripts/compte-relecture.mjs) — code fixe, jamais dans le dépôt\n`
poser('RELECTURE_EMAIL', EMAIL); poser('RELECTURE_CODE', code); poser('RELECTURE_MOT_DE_PASSE', motDePasse)
fs.writeFileSync('.env.local', env)
console.log('  → .env.local : RELECTURE_EMAIL, RELECTURE_CODE, RELECTURE_MOT_DE_PASSE')

// ── 4. la fiche pour les notes de relecture (hors dépôt) ─────────────────────────────────────────
fs.mkdirSync(SECRETS, { recursive: true })
fs.writeFileSync(`${SECRETS}/relecture.txt`, `Compte de relecture des stores — Presti (généré le ${new Date().toISOString().slice(0, 10)} par scripts/compte-relecture.mjs)

À copier dans les notes de relecture (App Store Connect « Informations de connexion » / Play Console « Instructions pour l'accès à l'application ») :

  Email : ${EMAIL}
  Mot de passe : ${motDePasse}
  Code à 6 chiffres demandé après le mot de passe (« code envoyé par email ») : ${code}

Le code est fixe pour CE compte uniquement (variables RELECTURE_EMAIL / RELECTURE_CODE sur Vercel). Aucun email n'est envoyé.
Pour le renouveler : relancer le script (nouveau code, nouveau mot de passe), puis mettre à jour les notes des stores.
`)
console.log(`\n✅ Compte de relecture prêt (${EMAIL}). Identifiants dans ${SECRETS}/relecture.txt — à recopier dans les notes de relecture. Le déploiement suivant active le code fixe.`)
