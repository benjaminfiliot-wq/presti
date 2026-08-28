// Ajoute (ou lit) le domaine prestiapp.fr dans Resend et affiche les DNS à poser chez OVH.
// Usage : node scripts/resend-domain.mjs
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const KEY = env.RESEND_API_KEY
if (!KEY) { console.error('RESEND_API_KEY manquant'); process.exit(1) }
const DOMAIN = 'prestiapp.fr'

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const t = await res.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  return { ok: res.ok, status: res.status, j }
}

const list = await api('/domains')
let dom = list.ok && (list.j.data || []).find((d) => d.name === DOMAIN)

if (!dom) {
  console.log(`Ajout du domaine ${DOMAIN} (région eu-west-1)…`)
  const add = await api('/domains', { method: 'POST', body: JSON.stringify({ name: DOMAIN, region: 'eu-west-1' }) })
  if (!add.ok) { console.error('échec ajout:', add.status, JSON.stringify(add.j).slice(0, 300)); process.exit(1) }
  dom = add.j
} else {
  console.log(`Domaine déjà présent (id ${dom.id}, statut ${dom.status}) — récupération des DNS…`)
  const det = await api(`/domains/${dom.id}`)
  if (det.ok) dom = det.j
}

console.log(`\n=== ${DOMAIN} · statut: ${dom.status} ===`)
console.log('DNS À AJOUTER CHEZ OVH (zone DNS de prestiapp.fr) :\n')
for (const r of dom.records || []) {
  console.log(`• Type ${r.type}${r.priority ? ' (priorité ' + r.priority + ')' : ''}`)
  console.log(`  Nom/Host : ${r.name}`)
  console.log(`  Valeur   : ${r.value}`)
  console.log('')
}
console.log('Une fois posés chez OVH, la vérification Resend passe "verified" (quelques min à qq heures).')
