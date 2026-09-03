// Test permanent — mentions obligatoires BLOQUANTES avant émission
// (audit v4 §3 : « 10/10 comptes en production ont siret = null » ; 15 € par mention
// manquante, jusqu'à 3 000 € sans l'assurance décennale sur un devis du bâtiment).
//
// Ce qu'on prouve :
//   1. un artisan SANS mentions peut créer et sauvegarder un devis (brouillon jamais bloqué) ;
//   2. l'ENVOI de ce devis est refusé (422) avec la liste de ce qui manque, le lien vers
//      /parametres, un message en français — et le devis reste en brouillon ;
//   3. la CRÉATION d'une facture est refusée de même, sans consommer de numéro ;
//   4. une fois les mentions remplies, le même devis part et la facture se crée.
//
// Usage : node scripts/mentions-bloquantes-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
try {
  const st = Date.now()
  const email = `delivered+mentions-${st}@resend.dev`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  comptes.push(u.user.id)
  // Volontairement SANS siret, forme juridique, adresse ni assurance : le cas des 10/10 comptes.
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Sans Mentions', metier: 'Maçon', slug: `verif-mentions-${st}`, plan: 'signature' })
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }

  console.log('\n── 1. Le brouillon n’est jamais bloqué')
  const dev = await (await fetch(`${BASE}/api/devis`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ objet: 'Mur de clôture', client_nom: 'Client Test', client_email: 'delivered@resend.dev', lignes: [{ designation: 'Parpaings et pose', quantite: 10, unite: 'm²', prix_unitaire_ht: 80, tva_taux: 20 }] }),
  })).json()
  T('le devis se crée en brouillon sans aucune mention', !!dev?.id, JSON.stringify(dev).slice(0, 200))

  console.log('\n── 2. L’envoi du devis est refusé tant que les mentions manquent')
  const env1 = await fetch(`${BASE}/api/devis/${dev.id}/envoyer`, { method: 'POST', headers: H })
  const j1 = await env1.json().catch(() => ({}))
  T('HTTP 422', env1.status === 422, `HTTP ${env1.status} ${JSON.stringify(j1).slice(0, 200)}`)
  T('code mentions_manquantes', j1.code === 'mentions_manquantes')
  T('la liste nomme le SIRET et l’assurance', Array.isArray(j1.manquantes) && j1.manquantes.includes('SIRET') && j1.manquantes.includes('Assurance professionnelle'), JSON.stringify(j1.manquantes))
  T('la liste nomme aussi la forme juridique et l’adresse', Array.isArray(j1.manquantes) && j1.manquantes.includes('Forme juridique') && j1.manquantes.includes('Adresse'))
  T('le message dit quoi remplir et où (Paramètres)', typeof j1.error === 'string' && /Paramètres/.test(j1.error) && /SIRET/.test(j1.error) && /brouillon est conservé/.test(j1.error), j1.error)
  T('le lien pointe vers /parametres', j1.lien === '/parametres', j1.lien)
  const { data: d1 } = await admin.from('devis').select('statut').eq('id', dev.id).single()
  T('le devis est toujours en brouillon', d1.statut === 'brouillon', d1.statut)

  console.log('\n── 3. La création d’une facture est refusée de même')
  const { data: avant } = await admin.from('artisans').select('compteur_facture').eq('id', u.user.id).single()
  const fac1 = await fetch(`${BASE}/api/factures`, { method: 'POST', headers: H, body: JSON.stringify({ devis_id: dev.id }) })
  const f1 = await fac1.json().catch(() => ({}))
  T('HTTP 422', fac1.status === 422, `HTTP ${fac1.status} ${JSON.stringify(f1).slice(0, 200)}`)
  T('le message parle de « cette facture »', typeof f1.error === 'string' && /cette facture/.test(f1.error), f1.error)
  const { count: nbF } = await admin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', u.user.id)
  T('aucune facture créée', (nbF ?? 0) === 0, String(nbF))
  const { data: apres } = await admin.from('artisans').select('compteur_facture').eq('id', u.user.id).single()
  T('aucun numéro de facture consommé', (apres.compteur_facture ?? 0) === (avant.compteur_facture ?? 0), `${avant.compteur_facture} → ${apres.compteur_facture}`)

  console.log('\n── 4. Mentions remplies → le même devis part, la facture se crée')
  await admin.from('artisans').update({
    forme_juridique: 'EI', siret: '55203253400646', adresse: '4 rue des Charpentiers', code_postal: '17000', ville: 'La Rochelle',
    assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-778812', assurance_activites: 'garantie décennale — maçonnerie',
  }).eq('id', u.user.id)
  const env2 = await fetch(`${BASE}/api/devis/${dev.id}/envoyer`, { method: 'POST', headers: H })
  const j2 = await env2.json().catch(() => ({}))
  T('le devis est envoyé (200)', env2.status === 200 && j2.ok === true, `HTTP ${env2.status} ${JSON.stringify(j2).slice(0, 200)}`)
  const { data: d2 } = await admin.from('devis').select('statut').eq('id', dev.id).single()
  T('statut passé à « envoye »', d2.statut === 'envoye', d2.statut)
  const fac2 = await fetch(`${BASE}/api/factures`, { method: 'POST', headers: H, body: JSON.stringify({ devis_id: dev.id }) })
  const f2 = await fac2.json().catch(() => ({}))
  T('la facture se crée (200)', fac2.status === 200 && !!f2.id, `HTTP ${fac2.status} ${JSON.stringify(f2).slice(0, 200)}`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('factures').update({ verrouillee: false }).eq('artisan_id', uid)
    for (const t of ['factures', 'devis', 'leads']) await admin.from(t).delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} artisan de test supprimé`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
