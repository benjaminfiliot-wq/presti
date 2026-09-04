// Test permanent — accessibilité (v4 §14 + §7/E4).
//
// axe-core sur les pages que voient les CLIENTS de l'artisan : le site vitrine et la
// plateforme de contact. Ce sont elles qui doivent être irréprochables — un client qui
// n'arrive pas à demander un devis est un chantier perdu, et c'est aussi une obligation.
//
// On échoue sur les infractions sérieuses et critiques. Les mineures sont listées pour
// information, sans faire tomber le test : mieux vaut un test rouge qui veut dire
// quelque chose qu'un test rouge en permanence que plus personne ne lit.
//
// Usage : node scripts/a11y-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     ${d}` : ''}`) } }

// Un test qui dit « contraste insuffisant » sans dire OÙ ni COMBIEN ne sert à rien :
// on remonte le sélecteur, les couleurs et le rapport mesuré, pour chaque nœud fautif.
const decrire = (violations) => violations.flatMap((v) =>
  v.nodes.slice(0, 6).map((n) => {
    const mesure = (n.any ?? []).flatMap((c) => (c.data ? [c.data] : []))[0]
    const chiffres = mesure?.contrastRatio
      ? ` ${mesure.contrastRatio}:1 (texte ${mesure.fgColor} sur ${mesure.bgColor}, ${mesure.fontSize})`
      : ''
    return `${v.id} · ${n.target.join(' ')}${chiffres}`
  })).join('\n     ')

const img = (t, c) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${c}"/><text x="600" y="470" font-size="90" text-anchor="middle" fill="#fff" font-family="sans-serif">${t}</text></svg>`)

const slug = `verif-a11y-${Date.now()}`
let uid = null

try {
  const { data: u, error } = await sb.auth.admin.createUser({ email: `${slug}@presti-test.invalid`, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({
    id: uid, email: `${slug}@presti-test.invalid`, nom: 'Vérif Accès', metier: 'plombier', slug,
    plan: 'business', site_active: true, site_tier: 3, plateforme_active: true,
    theme: 'atelier', accent: '#D97757', bio: 'Artisan de test, supprimé aussitôt après la vérification.',
    zone_intervention: 'Nantes et 25 km alentour', horaires: 'Lun–Ven 8h–18h', tel_public: '02 40 00 00 00',
    services: [{ nom: 'Dépannage', description: 'Fuites et urgences.' }, { nom: 'Salle de bain', description: 'Rénovation complète.' }, { nom: 'Chauffe-eau', description: 'Pose et remplacement.' }],
    realisations: [{ image: img('A', '#2F4858'), titre: 'Salle de bain', specialite: 'Rénovation' }, { image: img('B', '#8A5A3B'), titre: 'Chaufferie', specialite: 'Chauffage' }],
  })

  const nav = await chromium.launch()
  // reducedMotion : axe mesure la couleur RÉELLEMENT peinte. Sans ça, il échantillonne
  // pendant les fondus et rapporte des couleurs mélangées (un titre à mi-transition sort
  // à 1,3:1 alors qu'il est parfaitement lisible une fois posé). Le code respecte déjà
  // prefers-reduced-motion en affichant tout d'emblée : c'est l'état final qu'on audite.
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })

  const auditer = async (url, titre) => {
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900) // laisser les révélations se terminer
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const graves = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    const mineures = r.violations.filter((v) => !graves.includes(v))
    const detail = decrire(graves)
    T(`${titre} : aucune infraction grave`, graves.length === 0, detail)
    if (mineures.length) console.log(`     ℹ️ ${mineures.length} mineure(s) : ${mineures.map((v) => v.id).join(', ')}`)
    return page
  }

  console.log('\n── 1. Le site vitrine')
  const p1 = await auditer(`${BASE}/site/${slug}`, 'site')

  console.log('\n── 2. La visionneuse ouverte (piège à focus compris)')
  await p1.locator('.site-gallery .site-shot').first().click()
  await p1.waitForSelector('.site-lb')
  const rl = await new AxeBuilder({ page: p1 }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const gravesLb = rl.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  T('visionneuse : aucune infraction grave', gravesLb.length === 0, decrire(gravesLb))
  await p1.close()

  console.log('\n── 3. La plateforme de contact')
  const p2 = await auditer(`${BASE}/p/${slug}`, 'plateforme')
  await p2.close()

  console.log('\n── 4. Navigation au clavier seul')
  const p3 = await ctx.newPage()
  await p3.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  const parcours = []
  for (let i = 0; i < 12; i++) {
    await p3.keyboard.press('Tab')
    parcours.push(await p3.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      const s = getComputedStyle(e)
      return { visible: s.outlineStyle !== 'none' || s.boxShadow !== 'none', tag: e.tagName }
    }))
  }
  const atteints = parcours.filter(Boolean)
  T('la tabulation atteint bien les éléments', atteints.length >= 6, `${atteints.length} éléments`)
  T('le focus est visible partout', atteints.every((e) => e.visible),
    atteints.filter((e) => !e.visible).map((e) => e.tag).join(', '))
  await p3.close()

  await nav.close()
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
