// Ajoute (idempotent) une variable d'environnement à un projet Vercel via l'API.
// Usage : node scripts/vercel-setup.mjs <KEY> <VALUE>
// Lit VERCEL_TOKEN depuis .env.local (gitignoré). Ne logge jamais le token.
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const TOKEN = env.VERCEL_TOKEN
const KEY = process.argv[2]
const VALUE = process.argv[3]
if (!TOKEN) { console.error('VERCEL_TOKEN manquant'); process.exit(1) }
if (!KEY || !VALUE) { console.error('usage: node scripts/vercel-setup.mjs <KEY> <VALUE>'); process.exit(1) }

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  return { ok: res.ok, status: res.status, json }
}

// 1) Valider le token
const me = await api('/v2/user')
if (!me.ok) { console.error('token invalide:', me.status, JSON.stringify(me.json).slice(0, 200)); process.exit(1) }
console.log('connecté Vercel comme:', me.json.user?.username || me.json.user?.email || '(ok)')

// 2) Trouver le projet 'presti' (perso puis équipes)
const scopes = [{ teamId: null }]
const teams = await api('/v2/teams')
if (teams.ok && Array.isArray(teams.json.teams)) for (const t of teams.json.teams) scopes.push({ teamId: t.id, teamName: t.name })

let project = null, scope = null
for (const s of scopes) {
  const q = s.teamId ? `?teamId=${s.teamId}&limit=100` : '?limit=100'
  const r = await api(`/v9/projects${q}`)
  if (!r.ok) continue
  const found = (r.json.projects || []).find((p) => p.name === 'presti' || (p.name || '').includes('presti'))
  if (found) { project = found; scope = s; break }
}
if (!project) { console.error('projet "presti" introuvable dans les scopes accessibles'); process.exit(1) }
const teamQ = scope.teamId ? `?teamId=${scope.teamId}` : ''
console.log('projet trouvé:', project.name, '| id:', project.id, scope.teamId ? `| équipe: ${scope.teamName}` : '| perso')

// 3) La variable existe déjà ?
const existing = await api(`/v10/projects/${project.id}/env${teamQ}`)
const already = existing.ok && (existing.json.envs || []).find((e) => e.key === KEY)
if (already) {
  console.log(`⚠️ ${KEY} existe déjà (targets: ${(already.target || []).join(',')}) — rien ajouté (pas d'écrasement).`)
  process.exit(0)
}

// 4) Créer la variable (encrypted, tous les environnements)
const add = await api(`/v10/projects/${project.id}/env${teamQ}`, {
  method: 'POST',
  body: JSON.stringify({ key: KEY, value: VALUE, type: 'encrypted', target: ['production', 'preview', 'development'] }),
})
if (!add.ok) { console.error('échec ajout:', add.status, JSON.stringify(add.json).slice(0, 300)); process.exit(1) }
console.log(`✅ ${KEY} ajoutée (production + preview + development). Un redéploiement est nécessaire pour l'activer.`)
