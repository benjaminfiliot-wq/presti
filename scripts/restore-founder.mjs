// Restaure un accès FONDATEUR (§17 v4). Idempotent : peut être rejoué sans dommage.
// - crée le compte auth s'il manque (email confirmé), ou le réutilise ;
// - si FOUNDER_PW est fourni en variable d'environnement, définit ce mot de passe
//   (JAMAIS écrit dans le repo, un fichier, un log ou un commit) ; sinon compte sans mot de passe ;
// - crée/met à jour la ligne `artisans` : is_founder=true, plan business, slug historique, crédits ;
// - génère un MAGIC LINK de connexion (accès immédiat sans manipuler de mot de passe).
// Usage :  node scripts/restore-founder.mjs            (accès par magic link, recommandé)
//    ou :  FOUNDER_PW='********' node scripts/restore-founder.mjs   (définit aussi un mot de passe)
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
if (!SB || !SVC) { console.error('SUPABASE URL / SERVICE_ROLE manquant dans .env.local'); process.exit(1) }
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const auth = (p, o = {}) => fetch(`${SB}/auth/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const EMAIL = process.argv[2] || 'benjaminfiliot@gmail.com'
const SLUG = process.argv[3] || 'benjamin-filiot'
const PW = process.env.FOUNDER_PW || null
const REDIRECT = 'https://qg.prestiapp.fr'

// 1) Retrouver l'utilisateur auth (pagination) sans jamais logger de secret.
async function findUser(email) {
  for (let page = 1; page <= 20; page++) {
    const j = await (await admin(`users?per_page=200&page=${page}`)).json()
    const list = j.users || j || []
    const u = list.find((x) => (x.email || '').toLowerCase() === email.toLowerCase())
    if (u) return u
    if (list.length < 200) break
  }
  return null
}

let user = await findUser(EMAIL)
if (!user) {
  const body = { email: EMAIL, email_confirm: true, ...(PW ? { password: PW } : {}) }
  const r = await admin('users', { method: 'POST', body: JSON.stringify(body) })
  user = await r.json()
  if (!user.id) { console.error('Création utilisateur échouée :', JSON.stringify(user).slice(0, 200)); process.exit(1) }
  console.log('✓ compte auth créé')
} else {
  if (PW) { await admin(`users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password: PW, email_confirm: true }) }); console.log('✓ mot de passe réinitialisé') }
  else console.log('✓ compte auth déjà présent')
}

// 2) Slug libre ? (ne pas voler le slug d'un autre artisan)
const clash = await (await rest(`artisans?slug=eq.${SLUG}&select=id`)).json()
const slug = (Array.isArray(clash) && clash.some((a) => a.id !== user.id)) ? `${SLUG}-${Math.random().toString(36).slice(2, 6)}` : SLUG

// 3) Upsert de la ligne artisans (fondateur)
const row = { id: user.id, email: EMAIL, slug, plan: 'business', is_founder: true, credits: 1000 }
await rest('artisans?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) })
console.log(`✓ ligne artisans à jour (slug=${slug}, is_founder=true, plan=business)`)

// 4) Magic link de connexion immédiate (aucun mot de passe manipulé)
const link = await (await admin('generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email: EMAIL, options: { redirect_to: REDIRECT } }) })).json()
const url = link.action_link || link.properties?.action_link
console.log('\n=== ACCÈS FONDATEUR RESTAURÉ pour', EMAIL, '===')
if (url) console.log('Lien de connexion (à usage unique, ouvre-le dans ton navigateur) :\n' + url)
else console.log('Magic link non généré (' + JSON.stringify(link).slice(0, 160) + ') — utilise « mot de passe oublié » sur qg.prestiapp.fr.')
console.log('\nAstuce : une fois connecté, définis un mot de passe dans les paramètres.')
