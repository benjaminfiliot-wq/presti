// Test permanent — réglages fins du site vitrine (v4 §7/E1).
//
// Le risque de ce chantier n'est pas « est-ce que ça marche », c'est « est-ce que ça
// casse les sites déjà en ligne ». Donc deux choses à prouver, dans cet ordre :
//   1. NON-RÉGRESSION : sans réglage, le site rend exactement les valeurs d'avant ;
//   2. le réglage, quand il existe, change bien ce qu'il annonce.
// Un artisan de test est créé, publié, puis entièrement supprimé.
// Usage : node scripts/site-style-e2e.mjs

import fs from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { resolveStyle, styleToCss, styleToData, STYLE_DEFAUT, COUPLES, PRESETS_METIER } from '../lib/siteStyle.ts'
import { contrastRatio, niveauWCAG } from '../lib/contrast.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SORTIE = process.env.SORTIE || '.'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. Non-régression : sans réglage, on n’émet RIEN')
for (const vide of [null, undefined, {}, 'nawak', 42, []]) {
  const s = resolveStyle(vide)
  const css = styleToCss(s)
  const data = styleToData(s)
  if (Object.keys(css).length || Object.keys(data).length) {
    ko++; console.log(`  ❌ ${JSON.stringify(vide)} produit ${JSON.stringify({ ...css, ...data })}`)
  }
}
if (ko === 0) { ok++; console.log('  ✅ six entrées vides ou farfelues ⇒ aucun style inline, aucun attribut') }
T('le défaut est bien le style par défaut', JSON.stringify(resolveStyle(null)) === JSON.stringify(STYLE_DEFAUT))

console.log('\n── 2. Bornes : rien de ce qui vient de la base ne peut sortir des plages')
const fou = resolveStyle({ couple: 'piratage', taille: 9999, interlettrage: -50, rayon: -12, filet: 99, largeur: 5, texture: 'javascript:', texture_force: 1e9, motion: null, accent2: 'red; background:url(x)', fond: '#GGGGGG' })
T('couple inconnu ⇒ défaut', fou.couple === 'atelier', fou.couple)
T('taille bornée', fou.taille === 19, String(fou.taille))
T('interlettrage borné', fou.interlettrage === -0.04, String(fou.interlettrage))
T('rayon borné', fou.rayon === 0, String(fou.rayon))
T('filet borné', fou.filet === 3, String(fou.filet))
T('largeur bornée', fou.largeur === 900, String(fou.largeur))
T('texture inconnue ⇒ aucune', fou.texture === 'aucune', fou.texture)
T('couleur non hexadécimale rejetée (pas d’injection CSS)', fou.accent2 === null && fou.fond === null, `${fou.accent2} / ${fou.fond}`)

console.log('\n── 3. Contraste')
T('noir sur blanc = 21:1', Math.round(contrastRatio('#000000', '#ffffff')) === 21)
T('le crème du thème est confortable', niveauWCAG(contrastRatio('#F5EFE4', '#1B1712')) === 'AAA')
T('un fond trop proche du texte est signalé', niveauWCAG(contrastRatio('#333333', '#1B1712')) === 'insuffisant')
T('couleur invalide ⇒ pas de plantage', contrastRatio('pas-une-couleur', '#fff') === 1)

console.log('\n── 4. Chaque preset métier est valide et distinct')
const empreintes = new Set()
for (const p of PRESETS_METIER) {
  const r = resolveStyle({ ...STYLE_DEFAUT, ...p.style })
  empreintes.add(JSON.stringify(r) + p.theme + p.accent)
  if (!COUPLES.some((c) => c.id === r.couple)) { ko++; console.log(`  ❌ ${p.nom} : couple inconnu`) }
}
T('les 8 presets survivent aux bornes', PRESETS_METIER.length === 8)
T('les 8 presets donnent 8 rendus différents', empreintes.size === 8, `${empreintes.size} distincts`)

// ── 5. En vrai, dans un navigateur.
const slug = `verif-style-${Date.now()}`
let uid = null
try {
  const { data: u, error } = await sb.auth.admin.createUser({ email: `${slug}@presti-test.invalid`, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({
    id: uid, email: `${slug}@presti-test.invalid`, nom: 'Vérif Style', metier: 'maçon', slug,
    plan: 'business', site_active: true, site_tier: 3, theme: 'atelier', accent: '#D97757',
    bio: 'Artisan de test, supprimé aussitôt après la vérification.',
    services: [{ nom: 'Gros œuvre', description: 'Fondations, murs porteurs, dalles.' }],
  })

  const nav = await chromium.launch()
  const page = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage()

  const mesure = async () => {
    await page.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
    return page.evaluate(() => {
      const site = document.querySelector('.site')
      const cs = getComputedStyle(site)
      const bloc = document.querySelector('.site-block')
      const h1 = document.querySelector('.site-hero h1')
      return {
        inline: site.getAttribute('style') || '',
        data: ['bouton', 'texture', 'motion', 'ls'].filter((k) => site.hasAttribute('data-' + k)).join(','),
        police: getComputedStyle(h1).fontFamily,
        largeur: bloc ? getComputedStyle(bloc).maxWidth : null,
        filet: bloc ? getComputedStyle(document.querySelector('.site-nav')).borderBottomWidth : null,
        voile: getComputedStyle(site, '::after').backgroundImage !== 'none',
        taille: cs.fontSize,
      }
    })
  }

  console.log('\n── 5. Dans un vrai navigateur — sans réglage')
  const avant = await mesure()
  await page.screenshot({ path: `${SORTIE}/site-defaut.png`, fullPage: false })
  T('aucune variable du mode avancé en style inline', !/--sfd|--srad|--swrap|--sscale/.test(avant.inline), avant.inline.slice(0, 90))
  T('aucun attribut data-* du mode avancé', avant.data === '', avant.data)
  T('largeur de contenu inchangée (1180px)', avant.largeur === '1180px', avant.largeur)
  T('traits fins (1px)', avant.filet === '1px', avant.filet)
  T('pas de voile de texture', !avant.voile)
  T('police d’origine (Fraunces)', /fraunces/i.test(avant.police), avant.police)

  console.log('\n── 6. Avec le preset « Maçon » appliqué')
  const macon = PRESETS_METIER.find((p) => p.id === 'macon')
  await sb.from('artisans').update({ site_style: resolveStyle({ ...STYLE_DEFAUT, ...macon.style }) }).eq('id', uid)
  const apres = await mesure()
  await page.screenshot({ path: `${SORTIE}/site-macon.png`, fullPage: false })
  T('la police a changé (Archivo)', /archivo/i.test(apres.police), apres.police)
  T('les traits sont plus épais (2px)', apres.filet === '2px', apres.filet)
  T('le voile de grain est présent', apres.voile)
  T('le rythme serré est bien émis', /--srhythm/.test(apres.inline), apres.inline.slice(0, 120))
  T('le rendu a réellement changé', JSON.stringify(avant) !== JSON.stringify(apres))

  console.log('\n── 6 bis. Sans photo : repli typographique, jamais d’image de banque')
  const heroTypo = await page.evaluate(() => {
    const h = document.querySelector('.site-hero')
    const imgs = Array.from(document.querySelectorAll('.site-hero img')).map((i) => i.src)
    return {
      typo: h.getAttribute('data-hero') === 'typo',
      hauteur: h.getBoundingClientRect().height,
      images: imgs,
      bande: document.querySelectorAll('.site-hero-strip li').length,
    }
  })
  T('le hero passe en composition typographique', heroTypo.typo)
  T('aucune image dans le hero', heroTypo.images.length === 0, heroTypo.images.join(', '))
  T('le grand vide a disparu', heroTypo.hauteur < 700, `${Math.round(heroTypo.hauteur)} px`)
  T('les vraies prestations remplissent l’espace', heroTypo.bande > 0, `${heroTypo.bande} prestations`)

  console.log('\n── 7. « Aucune animation » coupe bien tout')
  await sb.from('artisans').update({ site_style: resolveStyle({ motion: 'aucune' }) }).eq('id', uid)
  await page.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  const fige = await page.evaluate(() => {
    const el = document.querySelector('.site-reveal')
    return el ? { t: getComputedStyle(el).transitionDuration, o: getComputedStyle(el).opacity } : null
  })
  T('les révélations n’ont plus de transition', fige && /^0s(,\s*0s)*$/.test(fige.t), fige ? fige.t : 'aucun .site-reveal')
  T('et le contenu reste visible', fige && Number(fige.o) === 1, fige ? fige.o : '')

  await nav.close()
  console.log(`\n📸 captures : ${SORTIE}/site-defaut.png · ${SORTIE}/site-macon.png`)
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
