// Gestion des domaines personnalisés via l'API Vercel (offre Signature, J9/G2).
// Le token (VERCEL_TOKEN) est un secret d'env ; les IDs projet/équipe ne sont pas secrets.
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_ysYhXsHolWZFCm9wTy0tSUTwer1I'
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_zSGgrVm4OVimzxeOtYhaAPd0'
const TOKEN = process.env.VERCEL_TOKEN || ''

const q = `teamId=${TEAM_ID}`
const H = () => ({ Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' })

export type DnsRecord = { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string }
export type DomainStatus = {
  ok: boolean            // ajouté au projet
  verified: boolean      // propriété prouvée (challenge TXT le cas échéant)
  served: boolean        // DNS pointant vers Vercel (config non « misconfigured »)
  records: DnsRecord[]   // ce que l'artisan doit poser chez son registrar
  error?: string
}

// Domaine nu valide (pas de protocole, pas de chemin, TLD ≥ 2). Refuse les domaines Presti.
export function normalizeDomain(input: string): string | null {
  const d = (input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null
  if (d === 'prestiapp.fr' || d.endsWith('.prestiapp.fr') || d.endsWith('.vercel.app')) return null
  return d
}

const isApex = (d: string) => d.split('.').length === 2

// Enregistrements DNS à communiquer à l'artisan (OVH/Ionos/Gandi).
function recordsFor(domain: string, verification?: { type: string; domain: string; value: string }[]): DnsRecord[] {
  const recs: DnsRecord[] = []
  if (isApex(domain)) recs.push({ type: 'A', name: '@', value: '76.76.21.21' })
  else recs.push({ type: 'CNAME', name: domain.split('.')[0], value: 'cname.vercel-dns.com' })
  for (const v of verification || []) {
    if (v.type?.toUpperCase() === 'TXT') recs.push({ type: 'TXT', name: v.domain, value: v.value })
  }
  return recs
}

export async function addDomain(domain: string): Promise<DomainStatus> {
  if (!TOKEN) return { ok: false, verified: false, served: false, records: [], error: 'Configuration serveur manquante.' }
  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?${q}`, {
    method: 'POST', headers: H(), body: JSON.stringify({ name: domain }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok && j?.error?.code !== 'domain_already_in_use' && j?.error?.code !== 'domain_taken') {
    return { ok: false, verified: false, served: false, records: [], error: j?.error?.message || 'Ajout du domaine impossible.' }
  }
  return getStatus(domain)
}

export async function getStatus(domain: string): Promise<DomainStatus> {
  if (!TOKEN) return { ok: false, verified: false, served: false, records: [], error: 'Configuration serveur manquante.' }
  const [dRes, cRes] = await Promise.all([
    fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}?${q}`, { headers: H() }),
    fetch(`https://api.vercel.com/v6/domains/${domain}/config?${q}`, { headers: H() }),
  ])
  const d = await dRes.json().catch(() => ({}))
  const c = await cRes.json().catch(() => ({}))
  if (!dRes.ok) return { ok: false, verified: false, served: false, records: recordsFor(domain), error: 'Domaine non rattaché.' }
  const verified = d.verified === true
  const served = verified && c?.misconfigured === false
  return { ok: true, verified, served, records: recordsFor(domain, d.verification) }
}

export async function removeDomain(domain: string): Promise<boolean> {
  if (!TOKEN) return false
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}?${q}`, { method: 'DELETE', headers: H() })
  return res.ok
}
