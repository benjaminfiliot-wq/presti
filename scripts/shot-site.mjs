// Capture le site vitrine /site/[slug] (Signature, tier 3) avec un artisan complet.
import { chromium } from 'playwright'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'http://localhost:3400'
const TIER = Number(process.argv[3] || 3)
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const shot = (label, c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="900" height="675" fill="url(#g)"/><text x="450" y="350" font-family="Georgia, serif" font-size="34" fill="rgba(255,255,255,.7)" text-anchor="middle">${label}</text></svg>`)

const st = Date.now(), email = `site.${st}@example.com`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!', email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier ébéniste', slug: `site-${st}`, plan: 'business',
  accent: '#C6853F', site_active: true, site_tier: TIER, plateforme_active: true,
  bio: 'Menuisier ébéniste à Lyon depuis 18 ans. Escaliers sur mesure, agencement intérieur, mobilier massif — le bois travaillé avec exigence, pièce après pièce.',
  zone_intervention: 'Lyon et Rhône', horaires: 'Lun–Ven 8h–18h · sur RDV le samedi', tel_public: '04 78 12 34 56', email_public: 'contact@atelier-vasseur.fr',
  services: [
    { nom: 'Escaliers sur mesure', description: 'Bois massif, limon central, garde-corps — conçus et posés dans les règles de l\'art.' },
    { nom: 'Agencement intérieur', description: 'Bibliothèques, dressings, verrières bois, boiseries — pensés pour votre espace.' },
    { nom: 'Mobilier massif', description: 'Tables, buffets, pièces uniques en chêne, noyer ou frêne.' },
    { nom: 'Rénovation & restauration', description: 'Parquets, portes anciennes, meubles de famille remis en beauté.' },
  ],
  realisations: [
    { image: shot('Escalier chene', '#3a2a17', '#0f0b06'), titre: 'Escalier suspendu en chêne — Croix-Rousse', specialite: 'Escalier' },
    { image: shot('Bibliotheque', '#4a3620', '#12100b'), titre: 'Bibliothèque sur mesure, 4 m', specialite: 'Agencement' },
    { image: shot('Table noyer', '#5a4126', '#171208'), titre: 'Table monoxyle en noyer', specialite: 'Mobilier' },
    { image: shot('Verriere bois', '#3f2f1c', '#100c07'), titre: 'Verrière atelier en bois', specialite: 'Agencement' },
    { image: shot('Dressing', '#4d3924', '#14100a'), titre: 'Dressing chêne clair', specialite: 'Agencement' },
  ],
  reseaux: { instagram: 'https://instagram.com/atelier.vasseur', facebook: 'https://facebook.com/ateliervasseur', google: 'https://g.page/vasseur' },
}) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(`${APP}/site/site-${st}`, { waitUntil: 'load' })
await page.waitForTimeout(4200)
await page.screenshot({ path: `${OUT}/site-full.png`, fullPage: true }); console.log('shot site-full (tier', TIER + ')')
await page.screenshot({ path: `${OUT}/site-hero.png` }); console.log('shot site-hero (viewport)')
await browser.close()
await admin(`users/${u.id}`, { method: 'DELETE' })
console.log('OK — nettoyé')
