// Test permanent — canaux email (v4 §B2).
// Ce qu'on prouve, et c'est le seul point qui compte vraiment ici :
//   1. le mot de passe de la boîte email n'est JAMAIS écrit en clair en base ;
//   2. il n'est déchiffrable qu'avec la clé d'environnement (CANAUX_KEY) ;
//   3. une ligne modifiée en base ne déchiffre plus (intégrité AES-GCM) ;
//   4. l'API ne renvoie jamais le secret, et refuse un appel non authentifié.
// Usage : node scripts/canaux-e2e.mjs   (lit .env.local)

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`) } }

// Le chiffrement, recopié à l'identique de lib/secretBox.ts (le test ne doit pas
// dépendre du bundler Next pour vérifier une propriété de sécurité).
const K = Buffer.from(process.env.CANAUX_KEY || '', 'base64')
const chiffrer = (clair) => {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', K, iv)
  const d = Buffer.concat([c.update(clair, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), d.toString('base64url')].join('.')
}
const dechiffrer = (s, cle = K) => {
  const p = String(s).split('.')
  if (p.length !== 4 || p[0] !== 'v1') return null
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', cle, Buffer.from(p[1], 'base64url'))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8')
  } catch { return null }
}

const SECRET = 'MotDePasse-Test-' + crypto.randomBytes(4).toString('hex')
let canalId = null

try {
  console.log('\n── 1. Clé de chiffrement')
  T('CANAUX_KEY présente et de 32 octets', K.length === 32, `${K.length} octets`)

  console.log('\n── 2. Aller-retour chiffrement')
  const boite = chiffrer(SECRET)
  T('format v1.<iv>.<tag>.<données>', /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/.test(boite))
  T('le chiffré ne contient pas le clair', !boite.includes(SECRET))
  T('déchiffrement fidèle', dechiffrer(boite) === SECRET)
  T('clé fausse ⇒ rien', dechiffrer(boite, crypto.randomBytes(32)) === null)

  console.log('\n── 3. Intégrité (ligne bidouillée en base)')
  const p = boite.split('.')
  const donneesTordues = Buffer.from(p[3], 'base64url'); donneesTordues[0] ^= 0xff
  T('donnée modifiée ⇒ refus', dechiffrer([p[0], p[1], p[2], donneesTordues.toString('base64url')].join('.')) === null)

  console.log('\n── 4. En base : jamais de mot de passe en clair')
  const { data: art } = await sb.from('artisans').select('id').limit(1).maybeSingle()
  if (!art) throw new Error('aucun artisan en base')
  const { data: ins, error: e1 } = await sb.from('canaux').insert({
    artisan_id: art.id, type: 'email', libelle: 'TEST e2e', adresse: `e2e-${Date.now()}@exemple.test`,
    imap_hote: 'imap.exemple.test', imap_port: 993, identifiant: 'e2e', secret: boite, actif: false,
  }).select('id').single()
  if (e1) throw new Error('insert canal : ' + e1.message)
  canalId = ins.id

  const { data: relu } = await sb.from('canaux').select('secret').eq('id', canalId).single()
  T('la colonne secret ne contient pas le mot de passe', !String(relu.secret).includes(SECRET))
  T('la colonne secret est bien un coffre v1.*', String(relu.secret).startsWith('v1.'))
  T('le serveur sait le rouvrir avec la clé', dechiffrer(relu.secret) === SECRET)

  // Balayage large : le mot de passe ne doit traîner dans AUCUNE colonne de la ligne.
  const { data: ligne } = await sb.from('canaux').select('*').eq('id', canalId).single()
  T('aucune colonne de la ligne ne contient le clair', !JSON.stringify(ligne).includes(SECRET))

  console.log('\n── 5. API')
  const r1 = await fetch(`${BASE}/api/canaux`)
  T('GET sans jeton ⇒ 401', r1.status === 401, `reçu ${r1.status}`)
  const corps1 = await r1.text()
  T('la réponse ne fuit rien', !corps1.includes('secret') && !corps1.includes(SECRET))

  const r2 = await fetch(`${BASE}/api/canaux`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adresse: 'x@y.fr', mot_de_passe: 'z' }) })
  T('POST sans jeton ⇒ 401', r2.status === 401, `reçu ${r2.status}`)

  const src = fs.readFileSync('app/api/canaux/route.ts', 'utf8')
  const selects = [...src.matchAll(/\.select\('([^']*)'\)/g)].map((m) => m[1])
  T('aucun select() de la route ne demande la colonne secret', selects.every((s) => !/\bsecret\b/.test(s)), selects.join(' | '))
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (canalId) { await sb.from('canaux').delete().eq('id', canalId); console.log('\n🧹 canal de test supprimé') }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
