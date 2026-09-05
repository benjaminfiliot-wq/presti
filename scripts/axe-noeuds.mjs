// Outil de diagnostic (v8) : les NŒUDS exacts des violations axe critiques/graves d'une liste de pages,
// sur un profil mobile, connecté avec le compte démo. Sert à corriger sans deviner.
//   node scripts/axe-noeuds.mjs [--base=http://localhost:3116] [--profil=iphone|pixel|ipad] /faq /devis/[id] …
import fs from 'node:fs'
import { chromium, webkit, devices } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim() }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d }
const BASE = arg('base', 'https://prestiapp.fr'), PROFIL = arg('profil', 'iphone')
const pages = process.argv.slice(2).filter((x) => !x.startsWith('--'))
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const users = await (await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: H })).json()
const u = (users.users || []).find((x) => x.email === 'demo-menuisier@presti-test.invalid')
const mdp = 'diag-' + Math.random().toString(36).slice(2, 10) + '-Aa1!'
await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ password: mdp }) })
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: mdp }) })).json()
await verifierSessionTest(sess.access_token)
const ref = SB.match(/https:\/\/([^.]+)\./)[1], key = `sb-${ref}-auth-token`
const devis = (await (await fetch(`${SB}/rest/v1/devis?select=id&artisan_id=eq.${u.id}&order=created_at.desc&limit=1`, { headers: H })).json())[0]?.id
const dev = { iphone: devices['iPhone 14'], pixel: devices['Pixel 7'], ipad: devices['iPad Mini'] }[PROFIL]
const b = await (PROFIL === 'pixel' ? chromium : webkit).launch()
const ctx = await b.newContext({ ...dev, locale: 'fr-FR', reducedMotion: 'reduce' })
if (/^http:\/\/localhost/.test(BASE)) await ctx.route(/^https:\/\/localhost(:\d+)?\//, async (route) => { const q = route.request(); try { const r = await fetch(q.url().replace(/^https:/, 'http:'), { method: q.method(), headers: q.headers() }); const h = {}; r.headers.forEach((v, k) => { if (!/^(content-encoding|transfer-encoding|content-length|connection)$/i.test(k)) h[k] = v }); await route.fulfill({ status: r.status, headers: h, body: Buffer.from(await r.arrayBuffer()) }) } catch { await route.abort() } })
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} }, [key, sess])
const p = await ctx.newPage()
for (const chemin of pages) {
  const url = `${BASE}${chemin.replace('[id]', devis ?? '')}`
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(400)
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  console.log(`=== ${chemin} [${PROFIL}]`)
  for (const v of r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')) for (const n of v.nodes.slice(0, 6)) console.log('  ', v.id, '|', n.target.join(' ').slice(0, 70), '|', (n.any[0]?.data ? JSON.stringify({ fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, r: n.any[0].data.contrastRatio }) : n.failureSummary?.split('\n')[1] || '').slice(0, 80), '|', (n.html || '').replace(/\s+/g, ' ').slice(0, 90))
}
await b.close()
