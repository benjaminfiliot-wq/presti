// Sonde : le composeur de la boîte de réception, quand le clavier prend la place.
//
// L'audit du 07/09 a signalé « /messages [iphone] : le composeur reste visible, fenêtre réduite de
// 320 px » en échec, sans dire de combien il dépassait. Une suite qui dit « faux » sans donner le
// chiffre oblige à relancer trente minutes de vérifications pour voir une seule mesure.
//
// Cette sonde rejoue exactement le même geste, sur la seule page qui nous intéresse, et AFFICHE les
// mesures : la boîte du composeur, la hauteur visible, et de combien ça sort. Elle teste les DEUX
// façons dont un clavier réduit la place :
//
//   • le viewport de mise en page rétrécit — c'est ce que fait la suite mobile, et ce que fait
//     Android quand l'application est en mode « resize » ;
//   • seul le visualViewport rétrécit, la mise en page garde sa hauteur — c'est ce que fait iOS,
//     et c'est le cas que `Conversations.tsx` gère avec la variable `--vvh`.
//
// Le second est celui que Benj vit sur son téléphone. Les deux doivent tenir.
//
// Usage : node scripts/sonde-composeur.mjs [https://prestiapp.fr]

import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// connexion-test.mjs lit process.env : parser le fichier ne suffit pas, il faut poser les variables.
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const DEMO = 'demo-menuisier@presti-test.invalid'

const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const users = await (await admin('users?per_page=200')).json()
const u = (users.users ?? []).find((x) => x.email === DEMO)
if (!u) { console.log(`⛔ compte démo ${DEMO} introuvable`); process.exit(2) }

const mdp = 'sonde-' + Math.random().toString(36).slice(2, 10) + '-Aa1!'
await admin(`users/${u.id}`, { method: 'PUT', body: JSON.stringify({ password: mdp, email_confirm: true }) })
await rest(`artisans?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ aide_vues: ['visite:console'] }) })
const session = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO, password: mdp }) })).json()
if (!session?.access_token) { console.log('⛔ session impossible'); process.exit(2) }
await verifierSessionTest(session.access_token)
const storeKey = `sb-${SB.match(/https:\/\/([^.]+)\./)[1]}-auth-token`

const profil = { id: 'iphone', device: devices['iPhone 14'] }
const CLAVIER = 320

const b = await chromium.launch()
const ctx = await b.newContext({ ...profil.device, locale: 'fr-FR' })
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} }, [storeKey, session])
const p = await ctx.newPage()

console.log(`\n══ /messages sur ${profil.device.viewport.width}×${profil.device.viewport.height} ══\n`)
await p.goto(`${APP}/messages`, { waitUntil: 'networkidle', timeout: 60000 })

const items = p.locator('.inbox-item, .pil-item, [data-conv]')
// En developpement, la page se compile a la volee : 'networkidle' arrive avant que les fils
// n aient ete charges. On attend le premier fil, sans en faire un echec s il n y en a pas.
await items.first().waitFor({ state: 'attached', timeout: 25000 }).catch(() => {})
const nb = await items.count()
console.log(`fils listés : ${nb}`)
if (!nb) {
  console.log('⛔ aucun fil à ouvrir : sur téléphone, le composeur n’est affiché qu’avec un fil ouvert.')
  console.log('   Le test mobile échouerait ici pour une raison de DONNÉES, pas de mise en page.')
  await b.close(); process.exit(2)
}
await items.first().click()
await p.waitForTimeout(700)

const aSel = await p.locator('.inbox.has-sel').count()
console.log(`fil ouvert (.inbox.has-sel) : ${aSel ? 'oui' : 'NON — le fil ne s’ouvre pas'}`)

const mesurer = async (etiquette, hauteurVisible) => {
  const champ = p.locator('.inbox-compose textarea, textarea').first()
  const present = await champ.count()
  const boite = present ? await champ.boundingBox() : null
  const vvh = await p.evaluate(() => getComputedStyle(document.querySelector('.inbox') || document.body).getPropertyValue('--vvh').trim())
  if (!boite) { console.log(`  ${etiquette} : ${present ? 'composeur sans boîte (masqué)' : 'aucun composeur'}`); return }
  const bas = Math.round(boite.y + boite.height)
  const sort = bas - hauteurVisible
  console.log(`  ${etiquette} : composeur y=${Math.round(boite.y)}…${bas} · fenêtre ${hauteurVisible} px · --vvh="${vvh || '(vide)'}" → ${sort > 1 ? `❌ dépasse de ${sort} px` : '✅ tient'}`)
  // Savoir de combien ça sort ne dit pas QUI déborde. On mesure donc chaque boîte de la pile :
  // celle dont le bas dépasse en premier est la coupable, les suivantes ne font que la suivre.
  const pile = await p.evaluate(() => ['.inbox', '.inbox-thread', '.inbox-thead', '.inbox-back', '.inbox-ava', '.inbox-who', '.inbox-actions', '.inbox-msgs', '.inbox-compose', '.inbox-compose textarea', '.inbox-cbar'].map((sel) => {
    const e = document.querySelector(sel)
    if (!e) return { sel, absent: true }
    const r = e.getBoundingClientRect(), st = getComputedStyle(e)
    return { sel, haut: Math.round(r.top), bas: Math.round(r.bottom), h: Math.round(r.height),
      position: st.position, hauteurCss: st.height, minH: st.minHeight, flex: st.flex, boxSizing: st.boxSizing,
      pt: st.paddingTop, pb: st.paddingBottom, defile: e.scrollHeight > e.clientHeight + 1 }
  }))
  for (const b of pile) {
    if (b.absent) { console.log(`      ${b.sel.padEnd(16)} absent`); continue }
    console.log(`      ${b.sel.padEnd(16)} ${String(b.haut).padStart(4)}…${String(b.bas).padStart(4)} (h=${b.h}) ${b.position} css:${b.hauteurCss} min:${b.minH} flex:${b.flex} pad:${b.pt}/${b.pb} ${b.boxSizing}${b.defile ? ' défile' : ''}${b.bas > hauteurVisible + 1 ? '  ← DÉPASSE' : ''}`)
  }
}

await mesurer('au repos          ', profil.device.viewport.height)

// 1) La mise en page rétrécit (Android « resize », et ce que teste la suite mobile).
await p.setViewportSize({ width: profil.device.viewport.width, height: profil.device.viewport.height - CLAVIER })
await p.waitForTimeout(500)
await mesurer('viewport réduit   ', profil.device.viewport.height - CLAVIER)
await p.setViewportSize(profil.device.viewport)
await p.waitForTimeout(300)

// 2) Seul le visualViewport rétrécit (iOS) : la mise en page garde sa hauteur, `--vvh` doit agir.
await p.evaluate((clavier) => {
  const vv = window.visualViewport
  if (!vv) return
  Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - clavier })
  vv.dispatchEvent(new Event('resize'))
}, CLAVIER)
await p.waitForTimeout(500)
await mesurer('clavier iOS simulé', profil.device.viewport.height - CLAVIER)

await b.close()
console.log('')
