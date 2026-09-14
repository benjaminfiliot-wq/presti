// Capture pour Richard (On Off Solutions) : une demande client + la réponse PRÉPARÉE par
// l'assistant, en attente de validation — l'état réel d'un compte Essentiel (mode assisté).
// Compte de test jetable, purgé à la fin.
import { chromium } from 'playwright'
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = process.argv[3]
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const st = Date.now(), email = `rich.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'On Off Solutions', metier: 'Électricien', ton_style: 'professionnel et direct', slug: `onoff-${st}`, plan: 'essentiel', tva_regime: 'reel', accent: '#2563EB', aide_vues: ['visite:console'] }) })

const iso = (min) => new Date(Date.now() - min * 60000).toISOString()
const DEMANDE = "Bonjour, nous venons d'acheter une maison de 1974, l'électricité n'a jamais été refaite, il y a encore des fusibles à broche au tableau. On aimerait tout remettre aux normes et rajouter des prises dans le séjour. Ça coûterait combien à peu près ? Est-ce que vous pouvez passer voir ? Merci"
const PREPAREE = "Bonjour Céline, merci de nous avoir contactés ! Votre projet est clair : mise aux normes complète du tableau avec passage aux disjoncteurs modernes, et ajout de prises au séjour — c'est exactement notre domaine.\n\nPour vous proposer un chiffrage juste, j'aurais besoin de quelques détails : combien de pièces dans la maison, et pouvez-vous m'indiquer combien de prises et d'interrupteurs vous souhaitez au total ?\n\nEnsuite, je pourrai vous proposer une visite technique pour constater l'état du tableau actuel, évaluer les saignées nécessaires et vous faire un devis complet et gratuit.\n\nQuels jours et créneaux vous arrangent ?"

const [lead] = await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Céline Marchand', contact: 'celine.marchand@example.com', message: DEMANDE, canal: 'formulaire', statut: 'nouveau', lu_le: null, updated_at: iso(3) }) })).json()
const rMsg = await rest('messages', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify([
  { lead_id: lead.id, sens: 'in', type: 'manuel', contenu: DEMANDE, etat: null, modele: null, sent_at: iso(4) },
  { lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: PREPAREE, etat: 'proposition', modele: 'standard', sent_at: iso(3) },
]) })
const corpsMsg = await rMsg.text()
console.log('insert messages ->', rMsg.status, corpsMsg.slice(0, 300))
if (!rMsg.ok) { await admin(`users/${u.id}`, { method: 'DELETE' }); throw new Error('insertion des messages refusee') }

const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()
await verifierSessionTest(sess.access_token)
const ref = SB.replace(/^https?:\/\//, '').split('.')[0]
const storeKey = `sb-${ref}-auth-token`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1240 }, deviceScaleFactor: 2 })
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} }, [storeKey, JSON.stringify(sess)])
  await page.goto(APP + '/messages', { waitUntil: 'load' }); await page.waitForTimeout(3500)
  await page.screenshot({ path: `${OUT}/richard-1-liste.png` }); console.log('shot liste')
  await page.click('.inbox-item'); await page.waitForTimeout(7000)
  await page.screenshot({ path: `${OUT}/richard-2-fil.png` }); console.log('shot fil')
  // La proposition est dans une zone de texte scrollable : on la déplie pour qu'elle soit
  // lisible d'un coup d'oeil (c'est ce que l'artisan voit en faisant défiler).
  await page.evaluate(() => {
    document.querySelectorAll('textarea').forEach((t) => {
      if (t.value && t.value.length > 200) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 8) + 'px' }
    })
  })
  // Le fil se cale en bas : on remonte pour avoir la question du client ET la proposition.
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200) el.scrollTop = 0
    })
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/richard-3-fil-deplie.png` }); console.log('shot fil deplie')
} finally {
  await browser.close()
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', email)
  // Purge des orphelins d'un run précédent qui aurait échoué avant le finally.
  const liste = await (await admin('users?per_page=200')).json()
  for (const x of (liste.users || [])) {
    if (/^rich\.\d+@example\.com$/.test(x.email || '') && x.id !== u.id) {
      await admin(`users/${x.id}`, { method: 'DELETE' }); console.log('orphelin purgé —', x.email)
    }
  }
}
