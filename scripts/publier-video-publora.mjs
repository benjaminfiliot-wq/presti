// Publier UNE vidéo sur la Page Facebook Presti via Publora — 12/10/2026.
//   node scripts/publier-video-publora.mjs <fichier.mp4> <legende.txt> [--maintenant | --dans <minutes>] [--reseau facebook|instagram]
// La vidéo est déposée dans le bucket public `promo` (Publora ne prend que des URL publiques, cf. promo-heberger.mjs),
// puis une publication par réseau. Sans --maintenant : brouillon. Avec : paraît dans les 2 minutes.
import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const [fichier, legendeF] = process.argv.slice(2).filter((a, i, t) => !a.startsWith('--') && !['--dans', '--reseau'].includes(t[i - 1]))
const MAINTENANT = process.argv.includes('--maintenant')
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null)
const DANS = arg('--dans') != null ? Number(arg('--dans')) : null
const RESEAU = arg('--reseau') || 'facebook'
if (!['facebook', 'instagram'].includes(RESEAU)) throw new Error('réseau inconnu : ' + RESEAU)
const env = {}
for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL, CLE_SB = env.SUPABASE_SERVICE_ROLE_KEY
const cle = `${path.basename(fichier)}`
const r = await fetch(`${SB}/storage/v1/object/promo/${cle}`, {
  method: 'POST', body: fs.readFileSync(fichier),
  headers: { Authorization: `Bearer ${CLE_SB}`, apikey: CLE_SB, 'Content-Type': 'video/mp4', 'x-upsert': 'true' },
})
if (!r.ok) throw new Error('dépôt ' + r.status + ' ' + (await r.text()))
const url = `${SB}/storage/v1/object/public/promo/${cle}`
const tete = await fetch(url, { method: 'HEAD' })
console.log('en ligne', tete.status, tete.headers.get('content-length'), url)

const BASE = 'https://api.publora.com/api/v1'
const H = { 'x-publora-key': env.PUBLORA_API_KEY, 'Content-Type': 'application/json' }
const { connections = [] } = await (await fetch(`${BASE}/platform-connections`, { headers: H })).json()
// Facebook seulement : la connexion LinkedIn de Publora est le profil PERSONNEL de Benj (« Benjamin Filiot »),
// et un compte qui ne s'appelle pas Presti ne se touche pas (Benj, 12/10).
// 17/10 : Instagram @prestiapp (compte Presti) ajouté ; jamais un autre compte Instagram.
const cibles = connections.filter((c) => RESEAU === 'facebook' ? /^facebook-/.test(c.platformId) : /^instagram-/.test(c.platformId) && c.username === 'prestiapp')
if (!cibles.length) throw new Error('aucune connexion Presti pour ' + RESEAU)
console.log('connexions', cibles.map((c) => `${c.platformId} ${c.username || c.displayName} ${c.tokenStatus}`))
const contenu = fs.readFileSync(legendeF, 'utf8').trim()
for (const c of cibles) {
  const corps = { content: contenu, platforms: [c.platformId], mediaUrls: [url] }
  if (MAINTENANT) corps.scheduledTime = new Date(Date.now() + 2 * 60e3).toISOString()
  if (DANS != null) corps.scheduledTime = new Date(Date.now() + DANS * 60e3).toISOString()
  const rep = await fetch(`${BASE}/create-post`, { method: 'POST', headers: H, body: JSON.stringify(corps) })
  console.log(c.platformId, rep.status, await rep.text())
}
process.exitCode = 0
