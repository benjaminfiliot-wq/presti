// Test permanent — compteurs de limitation ATOMIQUES (audit v4 §3, migration 0049).
//
// L'attaque de l'auditeur : 12 demandes en parallèle sur /api/leads → 11 passaient là où
// 6 sont permises (le `select count` de chacune précédait l'`insert` de toutes).
// On rejoue exactement ça, à deux niveaux :
//   1. la fonction SQL seule (12 appels parallèles → EXACTEMENT 6 vrais) ;
//   2. la route /api/leads en production (12 POST parallèles depuis une même IP →
//      au plus 6 leads créés, les autres en 429). « Au plus », parce que d'autres
//      demandes depuis cette IP dans les 10 dernières minutes comptent aussi.
//
// Prérequis : migration 0049 appliquée. Le compte de test est en mode manuel avec un
// contact téléphonique : aucun appel IA, aucun email au prospect.
// Usage : node scripts/limites-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
const cles = []

try {
  console.log('\n── 1. La fonction SQL : 12 appels parallèles, exactement 6 passent')
  const cle = `test:limites:${crypto.randomBytes(6).toString('hex')}`
  cles.push(cle)
  const rafale = await Promise.all(Array.from({ length: 12 }, () =>
    admin.rpc('consommer_limite', { p_cle: cle, p_max: 6, p_fenetre_s: 600 })))
  const erreurs = rafale.filter((r) => r.error)
  T('la fonction consommer_limite existe (migration 0049 appliquée)', erreurs.length === 0, erreurs[0]?.error?.message)
  const passes = rafale.filter((r) => r.data === true).length
  T(`exactement 6 appels sur 12 sont acceptés (obtenu : ${passes})`, passes === 6)
  const { data: apres } = await admin.rpc('consommer_limite', { p_cle: cle, p_max: 6, p_fenetre_s: 600 })
  T('le 13e est refusé aussi', apres === false)
  const { data: ligne } = await admin.from('limites').select('compteur').eq('cle', cle).maybeSingle()
  T('le compteur en base vaut 13', ligne?.compteur === 13, JSON.stringify(ligne))

  console.log('\n── 2. Une autre clé n’est pas affectée')
  const cle2 = `test:limites:${crypto.randomBytes(6).toString('hex')}`
  cles.push(cle2)
  const { data: autre } = await admin.rpc('consommer_limite', { p_cle: cle2, p_max: 1, p_fenetre_s: 600 })
  T('première demande sur une clé neuve : acceptée', autre === true)

  console.log('\n── 3. La table des compteurs est fermée au navigateur')
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: fuite } = await anon.from('limites').select('cle').limit(1)
  T('un anonyme ne lit pas la table limites', !fuite || fuite.length === 0)
  const { error: eRpc } = await anon.rpc('consommer_limite', { p_cle: cle2, p_max: 100, p_fenetre_s: 600 })
  T('un anonyme ne peut pas appeler consommer_limite', !!eRpc)

  console.log('\n── 4. La route /api/leads en production : 12 POST parallèles, au plus 6 leads')
  const st = Date.now()
  const email = `delivered+limites-${st}@resend.dev` // puits Resend : livré, jamais de bounce
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  comptes.push(u.user.id)
  const slug = `verif-limites-${st}`
  // reponse_auto=false + contact téléphonique : ni IA ni email au prospect, un email de
  // notification à l'artisan (puits Resend) par lead accepté, c'est tout.
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Vérif Limites', metier: 'Plombier', slug, plan: 'signature', reponse_auto: false })

  const reponses = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    fetch(`${BASE}/api/leads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, contact: `06 00 00 00 ${String(i).padStart(2, '0')}`, nom_prospect: `Rafale ${i}`, message: 'Test de limitation, à ignorer.' }),
    }).then((r) => r.status).catch(() => 0)))
  const acceptes = reponses.filter((s) => s === 200).length
  const refuses = reponses.filter((s) => s === 429).length
  console.log(`  codes : ${reponses.join(',')}`)
  T(`au plus 6 demandes acceptées (obtenu : ${acceptes})`, acceptes <= 6)
  T(`les autres sont refusées en 429 (obtenu : ${refuses})`, refuses >= 6 && acceptes + refuses === 12)
  const { count } = await admin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', u.user.id)
  T(`le nombre de leads en base suit (obtenu : ${count})`, (count ?? 0) === acceptes)
  if (acceptes < 6) console.log('  ℹ️  moins de 6 : d’autres demandes depuis cette IP ont compté dans les 10 dernières minutes')
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    const { data: leads } = await admin.from('leads').select('id').eq('artisan_id', uid)
    for (const l of leads ?? []) { await admin.from('messages').delete().eq('lead_id', l.id); await admin.from('relances').delete().eq('lead_id', l.id) }
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (cles.length) await admin.from('limites').delete().in('cle', cles)
  if (comptes.length) console.log(`🧹 ${comptes.length} artisan(s) de test supprimé(s), ${cles.length} compteur(s) de test purgé(s)`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
