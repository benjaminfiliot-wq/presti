// Vérif B2-2 : l'écran « Ma plateforme → Intelligence » règle bien la configuration serveur.
import { chromium } from 'playwright'
import fs from 'fs'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// Les aides partagées (connexion-test, etc.) lisent `process.env`, pas cet objet : sans cette
// ligne, leurs URL commencent par « undefined ». On ne remplace jamais une variable déjà posée.
for (const [cle, valeur] of Object.entries(env)) if (!process.env[cle]) process.env[cle] = valeur

const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

const st = Date.now(), slug = `in-${st}`, email = `in.${st}@x.fr`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business', plateforme_active: true, reponse_auto: true,
}) })
console.log('seed', slug)

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
try {
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click(); await codeEmailSiDemande(p, email); await p.waitForTimeout(3500)
  await p.goto(`${APP}/plateforme`, { waitUntil: 'load' })
  await p.waitForSelector('.pcfg-modes', { timeout: 15000 })

  ok(await p.locator('.pcfg-mode').count() === 3, 'les 3 modes de réponse sont proposés')
  ok(await p.locator('.pcfg-mode.on b').innerText() === 'Automatique', 'sans config : part du comportement actuel (Automatique)')
  ok((await p.locator('.prof-link span').innerText()).includes(`/p/${slug}`), 'le lien de la plateforme est affiché')
  await p.screenshot({ path: `${OUT}/b22-intelligence.png`, fullPage: true }); console.log('shot intelligence')

  // Régler : mode assistée + ton direct + plage horaire + plafond
  await p.locator('.pcfg-mode', { hasText: 'Assistée' }).click()
  await p.locator('.pcfg-seg button', { hasText: 'Direct' }).first().click()
  await p.locator('.prof-toggle input[type=checkbox]').first().uncheck()
  await p.waitForTimeout(300)
  await p.locator('.pcfg-seg button', { hasText: 'Jamais' }).first().click() // devis auto = jamais
  const champMots = p.locator('input[placeholder*="urgence"]')
  await champMots.fill('urgence, fuite, gaz, dégât des eaux, sinistre')
  await p.getByRole('button', { name: /^Enregistrer$/ }).click()
  await p.waitForSelector('.msg', { timeout: 12000 })
  ok(/enregistr/i.test(await p.locator('.msg').innerText()), 'enregistrement confirmé')
  await p.waitForTimeout(1200)

  const [row] = await (await rest(`plateforme_config?artisan_id=eq.${u.id}&select=*`)).json()
  ok(row?.mode_reponse === 'assistee', `mode persisté (${row?.mode_reponse})`)
  ok(row?.ton === 'direct', `ton persisté (${row?.ton})`)
  ok(row?.auto_24_7 === false, `plage horaire activée (auto_24_7=${row?.auto_24_7})`)
  ok(row?.devis_auto === 'jamais', `devis auto persisté (${row?.devis_auto})`)
  ok(Array.isArray(row?.escalade_mots) && row.escalade_mots.includes('sinistre'), `mots d'escalade persistés (${(row?.escalade_mots || []).length} mots)`)

  // Rechargement : l'écran relit bien la config
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('.pcfg-modes', { timeout: 15000 })
  ok(await p.locator('.pcfg-mode.on b').innerText() === 'Assistée', 'après rechargement, le mode enregistré est repris')
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await browser.close(); await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
