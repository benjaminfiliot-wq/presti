// Capture la plateforme v2 (portfolio + canaux) avec un artisan de test complet.
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'http://localhost:3400'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

// Placeholder "photo" en SVG (dégradé + label), encodé en data URL.
const shot = (label, c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="600" height="450" fill="url(#g)"/><text x="300" y="235" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,.85)" text-anchor="middle">${label}</text></svg>`)

const st = Date.now(), email = `platv2.${st}@example.com`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Duval Rénovation', metier: 'Multiservices / Rénovation', slug: `platv2-${st}`, plan: 'business',
  accent: '#0EA5A0', bio: 'Artisan rénovation depuis 14 ans à Bordeaux. Salle de bain, cuisine, carrelage, peinture — un travail soigné, un devis clair, des délais tenus.',
  zone_intervention: 'Bordeaux et 40 km alentour', horaires: 'Lun–Sam 8h–19h · Urgences 7j/7',
  services: [
    { nom: 'Rénovation salle de bain', description: 'Douche, carrelage, plomberie, faïence' },
    { nom: 'Cuisine clé en main', description: 'Pose, plomberie, électricité, crédence' },
    { nom: 'Carrelage & faïence', description: 'Sol et mur, tous formats' },
  ],
  realisations: [
    { image: shot('Salle de bain', '#0EA5A0', '#0b3d3a'), titre: 'Salle de bain complète — Mérignac', specialite: 'Carrelage' },
    { image: shot('Cuisine', '#D97757', '#5a2c1e'), titre: 'Cuisine clé en main — Talence', specialite: 'Rénovation' },
    { image: shot('Douche italienne', '#3B82F6', '#12294d'), titre: 'Douche à l\'italienne', specialite: 'Plomberie' },
    { image: shot('Terrasse', '#D9A441', '#5a4416'), titre: 'Terrasse carrelée 40 m²', specialite: 'Extérieur' },
  ],
  reseaux: { instagram: 'https://instagram.com/duval.renovation', facebook: 'https://facebook.com/duvalreno', site: 'https://duval-renovation.fr', google: 'https://g.page/duval' },
  tel_public: '06 12 34 56 78', email_public: 'contact@duval-renovation.fr', reponse_auto: true,
}) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(`${APP}/l/platv2-${st}`, { waitUntil: 'load' })
await page.waitForTimeout(3800) // laisse les reveals se jouer
await page.screenshot({ path: `${OUT}/platv2-full.png`, fullPage: true }); console.log('shot platv2-full')
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — nettoyé')
