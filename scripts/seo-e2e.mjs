// Test permanent — indexation et données structurées (v4 §12 + §7/E4).
//
// Ce que la v3 devait livrer, vérifié plutôt que refait : indexation CONDITIONNELLE
// (un site non publié, ou dont l'artisan a coupé le référencement, ne doit jamais entrer
// dans un index), sitemap, canonique, JSON-LD valide, et white-label absolu — le mot
// « Presti » ne doit apparaître nulle part sur le site d'un artisan.
//
// Usage : node scripts/seo-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const html = async (u) => (await fetch(u, { headers: { 'User-Agent': 'presti-verif' } })).text()

const slug = `verif-seo-${Date.now()}`
let uid = null

try {
  console.log('\n── 1. robots.txt')
  const robots = await html(`${BASE}/robots.txt`)
  for (const priv of ['/dashboard', '/messages', '/profil', '/parametres', '/plateforme', '/factures', '/controle', '/api/']) {
    T(`${priv} est interdit aux robots`, robots.includes(`Disallow: ${priv}`))
  }
  T('le sitemap est déclaré', robots.includes(`Sitemap: ${BASE}/sitemap.xml`))

  console.log('\n── 2. sitemap.xml')
  const sm = await html(`${BASE}/sitemap.xml`)
  T('XML bien formé', sm.startsWith('<?xml') && sm.includes('</urlset>'))
  T('la page d’accueil y est', sm.includes(`<loc>${BASE}</loc>`) || sm.includes(`<loc>${BASE}/</loc>`))
  T('aucune page privée n’y figure', !/\/(dashboard|messages|profil|parametres|factures|controle)</.test(sm))

  const { data: u, error } = await sb.auth.admin.createUser({ email: `${slug}@presti-test.invalid`, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  const commun = {
    id: uid, email: `${slug}@presti-test.invalid`, nom: 'Vérif SEO', metier: 'couvreur', slug,
    plan: 'business', site_tier: 3, theme: 'atelier', accent: '#D97757',
    bio: 'Artisan de test, supprimé aussitôt après la vérification.',
    zone_intervention: 'Angers et alentour', tel_public: '02 41 00 00 00',
    services: [{ nom: 'Toiture', description: 'Réfection complète.' }, { nom: 'Zinguerie', description: 'Gouttières et habillages.' }],
  }
  await sb.from('artisans').insert({ ...commun, site_active: false })

  console.log('\n── 3. Un site NON PUBLIÉ ne s’indexe pas')
  const nonPublie = await html(`${BASE}/site/${slug}`)
  T('la page dit qu’elle est indisponible', /Site indisponible/.test(nonPublie))
  T('elle n’apparaît pas dans le sitemap', !(await html(`${BASE}/sitemap.xml`)).includes(`/site/${slug}`))

  console.log('\n── 4. Site publié : indexable, canonique, JSON-LD')
  await sb.from('artisans').update({ site_active: true }).eq('id', uid)
  const publie = await html(`${BASE}/site/${slug}`)
  T('pas de noindex', !/name="robots"[^>]*noindex/.test(publie))
  T('canonique vers la bonne URL', publie.includes(`https://prestiapp.fr/site/${slug}`))

  const blocs = [...publie.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  T('au moins un bloc de données structurées', blocs.length >= 1, `${blocs.length}`)
  let ld = null
  for (const b of blocs) {
    try {
      const o = JSON.parse(b.replace(/\\u003c/g, '<'))
      if (o['@type'] === 'LocalBusiness') ld = o
    } catch (e) { ko++; console.log('  ❌ JSON-LD illisible :', e.message) }
  }
  T('le bloc LocalBusiness est valide', !!ld)
  if (ld) {
    T('il porte le nom de l’artisan', ld.name === 'Vérif SEO', ld.name)
    T('il porte sa zone', JSON.stringify(ld).includes('Angers'))
    T('il porte son téléphone', JSON.stringify(ld).includes('02 41 00 00 00'))
    T('il ne contient aucune donnée inventée (ni avis, ni note)', !ld.aggregateRating && !ld.review)
  }

  console.log('\n── 5. White-label absolu')
  const sansMarque = (t) => !/Presti(?!app\.fr\/site)/i.test(t.replace(/https:\/\/prestiapp\.fr/g, ''))
  T('le mot « Presti » n’apparaît nulle part sur le site de l’artisan', sansMarque(publie),
    (publie.replace(/https:\/\/prestiapp\.fr/g, '').match(/.{0,40}Presti.{0,40}/i) || [''])[0])
  const plat = await html(`${BASE}/p/${slug}`)
  T('ni sur sa plateforme de contact', sansMarque(plat),
    (plat.replace(/https:\/\/prestiapp\.fr/g, '').match(/.{0,40}Presti.{0,40}/i) || [''])[0])

  console.log('\n── 6. Référencement coupé par l’artisan')
  await sb.from('artisans').update({ site_seo: false }).eq('id', uid)
  const coupe = await html(`${BASE}/site/${slug}`)
  T('la page passe en noindex', /noindex/.test(coupe))
  T('et sort du sitemap', !(await html(`${BASE}/sitemap.xml`)).includes(`/site/${slug}`))
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan de test supprimé')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
