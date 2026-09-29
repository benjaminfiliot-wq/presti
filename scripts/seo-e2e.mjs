// Test permanent — indexation et données structurées (v4 §12 + §7/E4).
//
// Ce que la v3 devait livrer, vérifié plutôt que refait : indexation CONDITIONNELLE
// (un site non publié, ou dont l'artisan a coupé le référencement, ne doit jamais entrer
// dans un index), sitemap, canonique, JSON-LD valide, et white-label absolu — le mot
// « Presti » ne doit apparaître nulle part sur le site d'un artisan.
//
// Ajouté après l'audit final (§7 à §10) : un nom d'artisan hostile ne casse pas le JSON-LD,
// /favicon.ico existe (Safari), l'icône d'écran d'accueil iOS est déclarée, et chaque page
// publique porte SA canonique, SON titre et SON aperçu de partage — plus ceux de l'accueil.
//
// Usage : node scripts/seo-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
// Adresse publique attendue dans robots.txt, le sitemap et les canoniques : toujours le domaine de production, même quand
// BASE est un serveur local (le code fixe metadataBase sur https://prestiapp.fr). Fiche 026-008, 29/09.
const PUBLIC = 'https://prestiapp.fr'
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
  T('le sitemap est déclaré', robots.includes(`Sitemap: ${PUBLIC}/sitemap.xml`))

  console.log('\n── 2. sitemap.xml')
  const sm = await html(`${BASE}/sitemap.xml`)
  T('XML bien formé', sm.startsWith('<?xml') && sm.includes('</urlset>'))
  T('la page d’accueil y est', sm.includes(`<loc>${PUBLIC}</loc>`) || sm.includes(`<loc>${PUBLIC}/</loc>`))
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

  console.log('\n── 2 bis. Aucune page publique ne renvoie vers une boîte qui n’existe pas')
  for (const chemin of ['/', '/faq', '/cgu', '/confidentialite', '/mentions-legales', '/contact']) {
    const h = await html(`${BASE}${chemin}`)
    T(`${chemin} : aucun mailto:contact@prestiapp.fr (boîte morte — le formulaire /contact, lui, arrive)`, !/mailto:contact@prestiapp\.fr/i.test(h))
  }

  console.log('\n── 3. Un site NON PUBLIÉ ne s’indexe pas')
  const nonPublie = await html(`${BASE}/site/${slug}`)
  T('la page ne montre pas le site', /Site non publié|Site indisponible|Erreur 404/.test(nonPublie))
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

  console.log('\n── 7. Un nom d’artisan hostile ne referme pas la balise de données structurées')
  // Le contenu d'un bloc application/ld+json est lu en TEXTE BRUT jusqu'au premier « fin de
  // balise script » : sans échappement, un artisan qui met cette séquence dans son nom livre
  // la suite du document au parseur HTML. On le prouve avec un vrai nom hostile.
  await sb.from('artisans').update({ site_seo: true, nom: 'Vérif </script><b>SEO' }).eq('id', uid)
  const hostile = await html(`${BASE}/site/${slug}`)
  T('aucune balise refermée par la donnée de l’artisan', !hostile.includes('</script><b>'))
  const blocsHostiles = [...hostile.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  let nomRelu = null
  for (const b of blocsHostiles) { try { const o = JSON.parse(b); if (o.name) nomRelu = o.name } catch { /* signalé juste après */ } }
  T('les blocs restent du JSON lisible', blocsHostiles.length > 0 && nomRelu !== null)
  T('et le nom hostile y est intact, seulement échappé', nomRelu === 'Vérif </script><b>SEO', String(nomRelu))
  await sb.from('artisans').update({ nom: 'Vérif SEO' }).eq('id', uid)

  console.log('\n── 8. Icônes (Safari, écran d’accueil iOS)')
  const ico = await fetch(`${BASE}/favicon.ico`, { headers: { 'User-Agent': 'presti-verif' } })
  T('/favicon.ico répond 200 (Safari ne sait pas lire une icône SVG et retombe dessus)', ico.status === 200, `HTTP ${ico.status}`)
  T('… et sert bien une image', /image|icon/.test(ico.headers.get('content-type') || ''), ico.headers.get('content-type') || 'sans type')
  const accueil = await html(`${BASE}/`)
  T('l’accueil déclare une icône d’écran d’accueil iOS', /rel="apple-touch-icon"/.test(accueil))
  const sitePublie = await html(`${BASE}/site/${slug}`)
  T('le site de l’artisan aussi (sa marque, pas la nôtre)', /rel="apple-touch-icon"[^>]*\/site\//.test(sitePublie))
  T('et aucune icône de Presti ne s’y invite', !/rel="(icon|apple-touch-icon)"[^>]*(favicon\.ico|\/icon\.svg|\/icon1\.png)/.test(sitePublie))
  T('l’accueil déclare aussi une icône PNG multiple de 48 px (ce que Google affiche dans ses résultats)', /rel="icon"[^>]*\/icon1\.png[^>]*sizes="192x192"/.test(accueil))

  console.log('\n── 9. Chaque page porte SA canonique et SON titre (et non ceux de l’accueil)')
  // Piège du layout racine : `alternates.canonical: '/'` descend sur toute page qui ne le
  // redéfinit pas — la page se déclare alors comme étant l'accueil.
  const canonique = (h) => ((h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '').replace(/\/$/, '')
  const titre = (h) => (h.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  const pagesPubliques = ['/', '/faq', '/contact', '/login', '/signup', '/abonnement', '/reset-password']
  const titres = new Map()
  for (const chemin of pagesPubliques) {
    const h = chemin === '/' ? accueil : await html(`${BASE}${chemin}`)
    T(`${chemin} : canonique propre`, canonique(h) === `${PUBLIC}${chemin}`.replace(/\/$/, ''), canonique(h) || 'absente')
    T(`${chemin} : titre non vide`, titre(h).length > 0)
    titres.set(chemin, titre(h))
  }
  T('aucune page ne sert le titre de l’accueil', [...titres].filter(([c, t]) => c !== '/' && t === titres.get('/')).length === 0,
    [...titres].filter(([c, t]) => c !== '/' && t === titres.get('/')).map(([c]) => c).join(', '))
  for (const chemin of ['/login', '/signup', '/abonnement', '/reset-password']) {
    const h = await html(`${BASE}${chemin}`)
    T(`${chemin} : noindex (page de console, jamais un résultat de recherche)`, /name="robots"[^>]*noindex/.test(h))
  }
  const p404 = await html(`${BASE}/verif-404-${Date.now()}`)
  T('la 404 ne déclare AUCUNE canonique (elle n’a pas d’URL propre)', !/rel="canonical"/.test(p404))
  T('la 404 a son propre titre', /Page introuvable/.test(titre(p404)), titre(p404))

  console.log('\n── 10. Partage : chaque page a son propre aperçu')
  // Le layout racine ne fixe plus og:title ni og:description : Next les remplit avec le titre et
  // la description de chaque page. Le piège inverse est testé juste après — redéclarer un bloc
  // `openGraph` dans une page remplace celui de la racine EN ENTIER et fait disparaître l'image.
  const meta = (h, p) => (h.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1] || ''
  for (const chemin of ['/faq', '/contact', '/cgu', '/confidentialite', '/mentions-legales']) {
    const h = await html(`${BASE}${chemin}`)
    T(`${chemin} : og:title n’est pas celui de l’accueil`, meta(h, 'og:title') && meta(h, 'og:title') !== meta(accueil, 'og:title'), meta(h, 'og:title'))
    // Next décrit l'image générée par app/opengraph-image.tsx en og:image:url/width/height/alt
    // (descripteur), pas en og:image simple — d'où le test sur le préfixe.
    T(`${chemin} : l’image de partage est toujours servie`, /property="og:image/.test(h))
    // og:description ne peut être propre que si la page a une `description`. /cgu,
    // /confidentialite et /mentions-legales n'en ont pas encore : elles reprennent celle de la
    // racine — pas un mensonge d'identité, mais un texte de partage à écrire.
    if (['/faq', '/contact'].includes(chemin)) {
      T(`${chemin} : og:description n’est pas celle de l’accueil`, meta(h, 'og:description') !== meta(accueil, 'og:description'))
    }
  }
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
