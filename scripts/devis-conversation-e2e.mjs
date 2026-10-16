// Vérif B2-3 : la carte Devis dans la conversation (§A3) — confidentialité du brouillon,
// acceptation horodatée/opposable, idempotence, demande de modification.
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

// Le compte de test doit pouvoir etre PURGE : `purger_compte_test` n'accepte que le domaine
// @presti-test.invalid. Ces suites creaient des comptes en @x.fr, que la purge refusait — une
// execution interrompue laissait donc une ligne `artisans` en production, comptee comme un
// client. C'est exactement le compte que zero-demo-e2e a signale le 08/09.
const st = Date.now(), slug = `dv-${st}`, email = `dv.${st}@presti-test.invalid`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!Aa9', email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business', plateforme_active: true, reponse_auto: false,
}) })
const lead = (await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Marc Petit', contact: 'marc@example.com', message: 'Un escalier en chêne', canal: 'formulaire', statut: 'nouveau' }) })).json())[0]
await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Un escalier en chêne' }) })
// Devis rattaché au fil, d'abord en BROUILLON
const devis = (await (await rest('devis', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, lead_id: lead.id, numero: 'DEV-2026-0001', objet: 'Escalier chêne massif', statut: 'brouillon', total_ht: 3000, total_tva: 600, total_ttc: 3600 }) })).json())[0]
await rest('devis_lignes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([
  { devis_id: devis.id, ordre: 0, designation: 'Escalier chêne massif', quantite: 1, unite: 'u', prix_unitaire_ht: 2600, tva_taux: 20 },
  { devis_id: devis.id, ordre: 1, designation: 'Pose et finitions', quantite: 1, unite: 'forfait', prix_unitaire_ht: 400, tva_taux: 20 },
]) })
console.log('seed', slug)

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } })
try {
  // 1) BROUILLON → invisible pour le client
  const c1 = await (await fetch(`${APP}/api/conversation?token=${lead.token}`)).json()
  ok(c1.devis == null, 'un devis en brouillon n’est PAS exposé au client')

  // 2) ENVOYÉ → la carte apparaît
  await rest(`devis?id=eq.${devis.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'envoye' }) })
  const c2 = await (await fetch(`${APP}/api/conversation?token=${lead.token}`)).json()
  ok(c2.devis?.id === devis.id && Number(c2.devis.total_ttc) === 3600, `devis envoyé exposé (${c2.devis?.total_ttc} €)`)
  ok((c2.devis?.lignes || []).length === 2, `lignes du devis fournies (${(c2.devis?.lignes || []).length})`)

  // 3) La carte est visible dans l'app, avec le montant
  await p.addInitScript(([s, t]) => { try { localStorage.setItem(`presti-convs-${s}`, JSON.stringify([{ token: t, titre: 'Escalier', ts: Date.now() }])) } catch {} }, [slug, lead.token])
  await p.goto(`${APP}/p/${slug}`, { waitUntil: 'load' }); await p.waitForTimeout(2600)
  await p.waitForSelector('.pchat-carte', { timeout: 12000 })
  ok(/3\s?600/.test(await p.locator('.pchat-carte-t').innerText()), `carte affichée avec le montant (${await p.locator('.pchat-carte-t').innerText()})`)
  await p.screenshot({ path: `${OUT}/b23-carte-devis.png` }); console.log('shot carte')

  // 4) ACCEPTER → horodaté + journalisé + lead gagné
  await p.getByRole('button', { name: /Accepter le devis/i }).click()
  await p.waitForTimeout(2500)
  const [d1] = await (await rest(`devis?id=eq.${devis.id}&select=statut,accepte_le,accepte_canal,accepte_ip`)).json()
  ok(d1.statut === 'accepte' && !!d1.accepte_le, `devis accepté et horodaté (${d1.accepte_le})`)
  ok(d1.accepte_canal === 'plateforme', `canal d’acceptation journalisé (${d1.accepte_canal})`)
  const [l1] = await (await rest(`leads?id=eq.${lead.id}&select=statut`)).json()
  ok(l1.statut === 'gagne', `conversation passée en « gagné » (${l1.statut})`)
  const msgs = await (await rest(`messages?lead_id=eq.${lead.id}&select=type,contenu`)).json()
  ok(msgs.some((m) => m.type === 'devis_accepte'), 'trace d’acceptation écrite dans le fil')
  ok(await p.locator('.pchat-carte.ok').count() === 1, 'la carte passe à l’état accepté')

  // 5) IDEMPOTENCE : ré-accepter ne change pas l'horodatage (la preuve est figée)
  const r2 = await (await fetch(`${APP}/api/conversation/devis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: lead.token, action: 'accepter' }) })).json()
  const [d2] = await (await rest(`devis?id=eq.${devis.id}&select=accepte_le`)).json()
  ok(r2.deja === true && d2.accepte_le === d1.accepte_le, 'ré-acceptation idempotente : horodatage inchangé')

  // 6) DEMANDE DE MODIFICATION sur un autre devis envoyé
  const d3 = (await (await rest('devis', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, lead_id: lead.id, numero: 'DEV-2026-0002', objet: 'Variante', statut: 'envoye', total_ttc: 4200 }) })).json())[0]
  const r3 = await (await fetch(`${APP}/api/conversation/devis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: lead.token, action: 'modifier', message: 'Pouvez-vous chiffrer sans la pose ?' }) })).json()
  ok(r3.ok === true, 'demande de modification acceptée par l’API')
  const msgs2 = await (await rest(`messages?lead_id=eq.${lead.id}&select=contenu`)).json()
  ok(msgs2.some((m) => /sans la pose/i.test(m.contenu || '')), 'la demande du client est bien dans le fil')
  const [d3b] = await (await rest(`devis?id=eq.${d3.id}&select=statut`)).json()
  ok(d3b.statut === 'envoye', 'une demande de modification ne change pas le statut du devis')
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await browser.close(); await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: u.id }) })
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
