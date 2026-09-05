// Pose (ou met à jour) une variable d'environnement sur le projet Vercel de Presti — par l'API.
//
// Usage : node scripts/vercel-env.mjs CLE valeur            → production + preview
//         node scripts/vercel-env.mjs CLE valeur --prod     → production seulement
//         node scripts/vercel-env.mjs --liste                → les clés présentes (jamais les valeurs)
//
// Lit VERCEL_TOKEN dans .env.local. La variable s'applique au PROCHAIN déploiement (un push
// suffit). Ne lit jamais la valeur d'une variable existante, n'en supprime aucune.
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const TOKEN = process.env.VERCEL_TOKEN
if (!TOKEN) { console.error('VERCEL_TOKEN absent de .env.local'); process.exit(2) }
const api = async (chemin, opts = {}) => {
  const r = await fetch(`https://api.vercel.com${chemin}`, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers ?? {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`)
  return j
}

const { projects } = await api('/v9/projects?limit=50')
const projet = projects.find((p) => /presti/i.test(p.name)) ?? projects[0]
if (!projet) { console.error('aucun projet Vercel'); process.exit(2) }
const equipe = projet.accountId ? `?teamId=${projet.accountId}` : ''

const [cle, valeur, ...flags] = process.argv.slice(2)
if (cle === '--liste' || !cle) {
  const { envs } = await api(`/v10/projects/${projet.id}/env${equipe}`)
  console.log(`${projet.name} — ${envs.length} variables :`, envs.map((e) => `${e.key} [${(e.target ?? []).join(',')}]`).join(' · '))
  process.exit(0)
}
if (!valeur) { console.error('valeur manquante'); process.exit(2) }
const target = flags.includes('--prod') ? ['production'] : ['production', 'preview']
const { envs } = await api(`/v10/projects/${projet.id}/env${equipe}`)
const existante = envs.find((e) => e.key === cle && (e.target ?? []).includes('production'))
if (existante) {
  await api(`/v9/projects/${projet.id}/env/${existante.id}${equipe}`, { method: 'PATCH', body: JSON.stringify({ value: valeur, target, type: 'encrypted' }) })
  console.log(`✅ ${cle} mise à jour sur ${projet.name} (${target.join(', ')}) — s'applique au prochain déploiement`)
} else {
  await api(`/v10/projects/${projet.id}/env${equipe}`, { method: 'POST', body: JSON.stringify({ key: cle, value: valeur, target, type: 'encrypted' }) })
  console.log(`✅ ${cle} créée sur ${projet.name} (${target.join(', ')}) — s'applique au prochain déploiement`)
}
