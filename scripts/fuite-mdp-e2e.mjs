// Vérifie la protection contre les mots de passe fuités (équivalent gratuit de la
// fonction « leaked password protection » de Supabase, réservée au plan Pro).
//
// Ce qu'on prouve, dans l'ordre d'importance :
//  1. le mot de passe ne QUITTE JAMAIS la machine — on n'envoie que 5 caractères ;
//  2. un mot de passe réellement fuité est reconnu ;
//  3. un mot de passe sain n'est pas refusé à tort ;
//  4. le relais ne peut pas servir de proxy ouvert ;
//  5. le chemin « mot de passe oublié » applique bien les mêmes règles — c'était la
//     porte de derrière, plus large que la porte d'entrée.
//
// Usage : node --experimental-strip-types scripts/fuite-mdp-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierFuite, recupererDepuisHibp, evaluerMotDePasse } from '../lib/motDePasse.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.SITE_URL || 'https://prestiapp.fr'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

const menage = { uid: null }
try {
  console.log('\n── 1. Le mot de passe ne quitte pas la machine (k-anonymat)')
  const SECRET = 'MonMotDePasseUltraSecret-2026'
  const envoye = []
  await verifierFuite(SECRET, async (prefixe) => { envoye.push(prefixe); return '' })
  const empreinte = crypto.createHash('sha1').update(SECRET).digest('hex').toUpperCase()
  T('un seul appel', envoye.length === 1, `${envoye.length} appels`)
  T('exactement 5 caractères transmis', envoye[0]?.length === 5, `transmis : « ${envoye[0]} » (${envoye[0]?.length})`)
  T('ce sont bien les 5 premiers de l’empreinte', envoye[0] === empreinte.slice(0, 5))
  T('le mot de passe lui-même n’apparaît nulle part', !envoye.join('|').includes(SECRET))
  T('l’empreinte complète n’est pas transmise', !envoye.join('|').includes(empreinte))

  console.log('\n── 2. Un mot de passe réellement fuité est reconnu')
  for (const faible of ['password', '12345678', 'azerty123', 'Chantier2019']) {
    const f = await verifierFuite(faible, recupererDepuisHibp)
    T(`« ${faible} » reconnu comme fuité`, f.compromis, f.indisponible ? 'HIBP injoignable' : 'introuvable dans les fuites')
    if (f.compromis) console.log(`     (retrouvé ${f.occurrences.toLocaleString('fr-FR')} fois)`)
  }

  console.log('\n── 3. Un mot de passe sain n’est pas refusé à tort')
  const sain = `tuile-caramel-vendredi-${crypto.randomBytes(6).toString('hex')}`
  const fSain = await verifierFuite(sain, recupererDepuisHibp)
  T('mot de passe inédit accepté', !fSain.compromis && !fSain.indisponible, JSON.stringify(fSain))
  T('et il passe aussi les règles de forme', evaluerMotDePasse(sain).ok)

  console.log('\n── 4. Panne du service : on laisse passer, on ne prétend rien')
  const fPanne = await verifierFuite('password', async () => { throw new Error('HIBP down') })
  T('ne bloque pas', !fPanne.compromis)
  T('et le signale comme indisponible', fPanne.indisponible)

  console.log('\n── 5. Le relais en production')
  const bon = await fetch(`${BASE}/api/auth/mdp-fuite`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixe: empreinte.slice(0, 5) }),
  })
  const texte = bon.ok ? await bon.text() : ''
  T('un préfixe valide répond 200', bon.ok, `HTTP ${bon.status}`)
  T('et renvoie bien une liste de suffixes', /^[0-9A-F]{35}:\d+/m.test(texte), texte.slice(0, 60))

  for (const mauvais of ['../../etc/passwd', 'ZZZZZ', 'ABC', 'ABCDEF', '']) {
    const r = await fetch(`${BASE}/api/auth/mdp-fuite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixe: mauvais }),
    })
    T(`préfixe « ${mauvais || '(vide)'} » refusé`, r.status === 400, `HTTP ${r.status}`)
  }

  console.log('\n── 6. La porte de derrière : « mot de passe oublié »')
  const email = `fuite-mdp-${Date.now()}@presti-test.invalid`
  const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
  if (eU) throw new Error('compte de test : ' + eU.message)
  menage.uid = u.user.id
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Test Fuite', metier: 'Plombier', slug: `fuite-mdp-${Date.now()}`, plan: 'essentiel' })

  const poser = async (motDePasse) => {
    const jeton = crypto.randomBytes(32).toString('hex')
    await admin.from('password_resets').insert({
      uid: u.user.id,
      token_hash: crypto.createHash('sha256').update(jeton).digest('hex'),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    const r = await fetch(`${BASE}/api/auth/reset-confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: jeton, password: motDePasse }),
    })
    return { status: r.status, corps: await r.json().catch(() => ({})) }
  }

  const court = await poser('azerty12')
  T('« azerty12 » (8 car.) refusé — avant, il passait', court.status === 400, `HTTP ${court.status} ${JSON.stringify(court.corps)}`)

  // Il faut un cas qui PASSE les règles de forme et se trouve quand même dans les fuites :
  // sinon c'est la déni-liste qui refuse, et on n'a rien prouvé sur HIBP. On le choisit
  // à l'exécution plutôt que de parier sur une constante qui peut sortir des fuites.
  let piege = null
  for (const c of ['Liverpool123', 'Sunshine2020', 'Marseille13', 'Chocolat2019', 'Printemps2020']) {
    if (!evaluerMotDePasse(c).ok) continue
    const f = await verifierFuite(c, recupererDepuisHibp)
    if (f.compromis) { piege = { mdp: c, occurrences: f.occurrences }; break }
  }
  T('un cas « passe la forme mais est fuité » a été trouvé', Boolean(piege), 'aucun candidat ne convient — élargir la liste')
  if (piege) {
    console.log(`     candidat : « ${piege.mdp} » (${piege.occurrences.toLocaleString('fr-FR')} fuites)`)
    const fuite = await poser(piege.mdp)
    T('un mot de passe fuité est refusé', fuite.status === 400, `HTTP ${fuite.status} ${JSON.stringify(fuite.corps)}`)
    T('et l’artisan sait pourquoi', /fuites de données/.test(fuite.corps?.error ?? ''), fuite.corps?.error)
  }

  const bonMdp = await poser(`chantier-caramel-${crypto.randomBytes(5).toString('hex')}`)
  T('un bon mot de passe passe toujours', bonMdp.status === 200, `HTTP ${bonMdp.status} ${JSON.stringify(bonMdp.corps)}`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (menage.uid) {
    await admin.from('password_resets').delete().eq('uid', menage.uid)
    await admin.from('artisans').delete().eq('id', menage.uid)
    await admin.auth.admin.deleteUser(menage.uid).catch(() => {})
    console.log('\n🧹 compte de test supprimé')
  }
}

console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
