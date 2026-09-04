// Pose (ou met à jour) des variables d'environnement sur le projet Vercel, sans jamais afficher
// leur valeur. Écrit uniquement les variables nommées en argument, jamais toutes.
//
//   node scripts/vercel-variables.mjs --lister
//   node scripts/vercel-variables.mjs STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_TAXE_AUTO
//
// Les valeurs sont lues dans .env.local et .stripe-webhook.local, jamais saisies à la main ni
// affichées. Le jeton Vercel vient de VERCEL_TOKEN.
import fs from 'node:fs'

function charger(fichier) {
  if (!fs.existsSync(fichier)) return
  for (const l of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
charger('.env.local')
charger('.stripe-webhook.local')
charger('.stripe-taxe.local')

const JETON = process.env.VERCEL_TOKEN
if (!JETON) { console.log('❌ VERCEL_TOKEN absent de .env.local'); process.exit(1) }

const LISTER = process.argv.includes('--lister')
const noms = process.argv.slice(2).filter((a) => !a.startsWith('--'))

async function api(chemin, options = {}) {
  const r = await fetch(`https://api.vercel.com${chemin}`, {
    ...options,
    headers: { Authorization: `Bearer ${JETON}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const corps = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`${r.status} ${corps?.error?.message || JSON.stringify(corps).slice(0, 200)}`)
  return corps
}

const { projects } = await api('/v9/projects?limit=50')
const projet = projects.find((p) => p.name === 'presti') || projects.find((p) => /presti/i.test(p.name))
if (!projet) { console.log(`❌ Projet introuvable. Projets visibles : ${projects.map((p) => p.name).join(', ')}`); process.exit(1) }
console.log(`Projet : ${projet.name}`)

const { envs } = await api(`/v9/projects/${projet.id}/env?decrypt=false`)
const parNom = new Map(envs.map((e) => [e.key, e]))

if (LISTER || !noms.length) {
  console.log('\nVariables déjà en place (valeurs jamais lues) :')
  for (const e of envs.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${e.key.padEnd(30)} ${(e.target || []).join(', ')}`)
  }
  process.exit(0)
}

// Par défaut les trois environnements. `--production` restreint : une clé RÉELLE n'a rien à faire
// dans les environnements de préversion et de développement, où n'importe quelle branche la lirait.
const CIBLES = process.argv.includes('--production') ? ['production'] : ['production', 'preview', 'development']

for (const nom of noms) {
  const valeur = process.env[nom]
  if (valeur === undefined || valeur === '') { console.log(`  ⏭  ${nom} — aucune valeur trouvée en local, ignorée`); continue }
  const existant = parNom.get(nom)
  try {
    if (existant) {
      await api(`/v10/projects/${projet.id}/env/${existant.id}`, {
        method: 'PATCH',
        // Le type n'est JAMAIS renvoyé : Vercel refuse de changer le type d'une variable marquée
        // « sensible », et c'est une bonne chose — on met la valeur à jour, pas le régime de secret.
        body: JSON.stringify({ value: valeur, target: CIBLES }),
      })
      console.log(`  ♻️  ${nom} — mise à jour (${valeur.length} caractères)`)
    } else {
      await api(`/v10/projects/${projet.id}/env?upsert=true`, {
        method: 'POST',
        body: JSON.stringify({ key: nom, value: valeur, type: 'encrypted', target: CIBLES }),
      })
      console.log(`  ✅ ${nom} — créée (${valeur.length} caractères)`)
    }
  } catch (e) {
    console.log(`  ❌ ${nom} — ${String(e.message).slice(0, 160)}`)
  }
}

console.log('\nUn nouveau déploiement est nécessaire pour que ces variables soient prises en compte.')
