// Test permanent — les failles trouvées par l'audit du 2026-09-03 restent fermées.
//
// Chaque cas rejoue EXACTEMENT l'attaque décrite par l'auditeur. C'est la seule façon de
// savoir qu'un correctif tient : refaire ce qui marchait.
//
// Usage : node scripts/audit-correctifs-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
async function artisan(plan = 'signature') {
  const email = `verif-fix-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Vérif Correctifs', metier: 'Plombier', slug: `verif-fix-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, plan })
  comptes.push(u.user.id)
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  return {
    uid: u.user.id, email, motDePasse, jeton: s.session.access_token,
    db: createClient(URL, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } }),
  }
}

try {
  console.log('\n── 1. Le bucket des photos de chantier n’est plus public')
  // Attaque de l'auditeur : lister et télécharger sans aucun jeton.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: liste } = await anon.storage.from('lead-media').list('')
  T('un anonyme ne peut plus lister le bucket', !liste || liste.length === 0, `${liste?.length} dossier(s) listé(s) !`)

  const { data: buckets } = await admin.storage.listBuckets()
  const lead = buckets?.find((b) => b.name === 'lead-media')
  T('le bucket est déclaré privé', lead && lead.public === false, JSON.stringify(lead))
  const artisanMedia = buckets?.find((b) => b.name === 'artisan-media')
  T('artisan-media reste public (logos et réalisations, c’est voulu)', artisanMedia?.public === true)

  console.log('\n── 2. Les colonnes sensibles sont figées côté navigateur')
  const A = await artisan()
  // Attaque : annuler sa propre déconnexion pour rétablir un accès volé.
  await admin.from('artisans').update({ sessions_invalides_avant: new Date().toISOString() }).eq('id', A.uid)
  await A.db.from('artisans').update({ sessions_invalides_avant: null }).eq('id', A.uid)
  const { data: apres } = await admin.from('artisans').select('sessions_invalides_avant').eq('id', A.uid).single()
  T('la révocation de sessions ne peut pas être annulée', apres.sessions_invalides_avant !== null,
    'un jeton volé pourrait rétablir son accès !')

  // Attaque : s'attribuer le domaine d'un concurrent.
  await A.db.from('artisans').update({ domaine: 'domaine-du-concurrent.fr', domaine_verifie: true }).eq('id', A.uid)
  const { data: dom } = await admin.from('artisans').select('domaine, domaine_verifie').eq('id', A.uid).single()
  T('le domaine personnalisé n’est pas écrivable', !dom.domaine, JSON.stringify(dom))
  T('et sa vérification non plus', dom.domaine_verifie !== true)

  // Ce qui doit RESTER modifiable : son profil.
  await A.db.from('artisans').update({ nom: 'Nouveau Nom' }).eq('id', A.uid)
  const { data: prof } = await admin.from('artisans').select('nom').eq('id', A.uid).single()
  T('l’artisan modifie toujours son propre profil', prof.nom === 'Nouveau Nom', prof.nom)

  console.log('\n── 3. La fonction d’inventaire n’est plus exécutable anonymement')
  const { data: mat } = await admin.from('materiaux').insert({ artisan_id: A.uid, nom: 'Stock à protéger', unite: 'u' }).select('id').single()
  await admin.rpc('appliquer_mouvement', { p_artisan: A.uid, p_materiau: mat.id, p_type: 'entree', p_quantite: 100, p_lieu: 'atelier' })
  const { error: eAnon } = await anon.rpc('appliquer_mouvement', { p_artisan: A.uid, p_materiau: mat.id, p_type: 'inventaire', p_quantite: 0, p_lieu: 'atelier' })
  T('un anonyme est refusé', !!eAnon, 'l’appel anonyme a été accepté !')
  const { data: stock } = await admin.from('stock').select('quantite').eq('materiau_id', mat.id).single()
  T('le stock est intact (100)', Number(stock.quantite) === 100, String(stock.quantite))

  // Et un artisan connecté ne peut pas agir pour un autre en trafiquant le paramètre.
  const B = await artisan()
  const { error: eAutre } = await B.db.rpc('appliquer_mouvement', { p_artisan: A.uid, p_materiau: mat.id, p_type: 'inventaire', p_quantite: 0, p_lieu: 'atelier' })
  T('un autre artisan ne peut pas viser le stock d’autrui', !!eAutre, 'l’appel a été accepté !')
  const { data: stock2 } = await admin.from('stock').select('quantite').eq('materiau_id', mat.id).single()
  T('le stock est toujours intact', Number(stock2.quantite) === 100, String(stock2.quantite))

  console.log('\n── 4. Une facture émise est scellée et inaltérable')
  const { data: f } = await admin.from('factures').insert({
    artisan_id: A.uid, numero: 'FAC-FIX-0001', statut: 'emise', objet: 'Test',
    client_nom: 'Client', total_ht: 1000, total_tva: 100, total_ttc: 1100,
    date_emission: new Date().toISOString().slice(0, 10),
    verrouillee: true, emise_le: new Date().toISOString(), empreinte: 'x'.repeat(64),
  }).select('id').single()

  // Attaque de l'auditeur : PostgREST avec le seul jeton du navigateur.
  const { data: modif } = await A.db.from('factures').update({ total_ttc: 1 }).eq('id', f.id).select('id')
  T('le montant ne peut pas être modifié depuis le navigateur', (modif ?? []).length === 0, `${modif?.length} ligne(s) modifiée(s) !`)
  const { data: suppr } = await A.db.from('factures').delete().eq('id', f.id).select('id')
  T('la facture ne peut pas être supprimée', (suppr ?? []).length === 0, `${suppr?.length} ligne(s) supprimée(s) !`)
  const { data: toujours } = await admin.from('factures').select('total_ttc').eq('id', f.id).maybeSingle()
  T('elle est toujours là, au bon montant', Number(toujours?.total_ttc) === 1100, JSON.stringify(toujours))
  await admin.from('factures').update({ verrouillee: false }).eq('id', f.id)
  await admin.from('factures').delete().eq('id', f.id)

  console.log('\n── 5. Marque blanche et canoniques')
  const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
  const { data: art } = await admin.from('artisans').select('slug').eq('id', A.uid).single()
  await admin.from('artisans').update({ site_active: true, plateforme_active: true }).eq('id', A.uid)
  const plat = await (await fetch(`${BASE}/p/${art.slug}`)).text()
  const canon = plat.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  T('la plateforme a sa propre canonique', canon?.includes(`/p/${art.slug}`), canon || '(aucune)')

  for (const page of ['faq', 'cgu', 'mentions-legales', 'confidentialite']) {
    const h = await (await fetch(`${BASE}/${page}`)).text()
    const c = h.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    T(`/${page} ne se déclare plus comme la page d’accueil`, c?.endsWith(`/${page}`), c || '(aucune)')
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('factures').update({ verrouillee: false }).eq('artisan_id', uid)
    for (const t of ['factures', 'materiaux', 'leads', 'devis']) await admin.from(t).delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} artisans de test supprimés`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
