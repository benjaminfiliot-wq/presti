export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })
}
async function requireFounder(req: Request): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const { data: userData } = await getUserRevocable(token)
  if (!userData?.user) return false
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  return !!me?.is_founder
}

// Lance un agent "temps réel" depuis le poste de contrôle. Aujourd'hui : gestion (bilan santé).
// Les agents qui lisent le dépôt (auditeur, animateur) tournent dans une session dev.
export async function POST(req: Request) {
  if (!(await requireFounder(req))) return json({ error: 'Réservé aux fondateurs' }, 403)
  const b = await req.json().catch(() => ({}))
  const agent = typeof b?.agent === 'string' ? b.agent : ''

  if (agent === 'gestion') return json(await gestion())
  if (agent === 'gestion-donnees') return json(await gestionDonnees())
  if (agent === 'mails-delivrabilite') return json(await mailsDelivrabilite())
  return json({ error: 'Agent inconnu ou non exécutable côté serveur (audit/animation/IA = session dev).' }, 400)
}

// Agent GESTION-DONNÉES : métriques de tunnel (agrégats uniquement, zéro donnée perso).
async function gestionDonnees() {
  const items: { k: string; ok: boolean | 'warn'; v: string }[] = []
  const push = (k: string, ok: boolean | 'warn', v: string) => items.push({ k, ok, v })
  // On passe la requête déjà construite (évite les frictions de type du query builder).
  const cnt = async (q: PromiseLike<{ count: number | null }>): Promise<number> => {
    try { const { count } = await q; return count ?? 0 } catch { return -1 }
  }
  const head = (t: string) => supabaseAdmin.from(t).select('id', { count: 'exact', head: true })
  const artisans = await cnt(head('artisans'))
  const leads = await cnt(head('leads'))
  const enDiscussion = await cnt(head('leads').eq('statut', 'en_discussion'))
  const nonLus = await cnt(head('leads').is('lu_le', null).in('statut', ['nouveau', 'en_discussion']))
  const gagnes = await cnt(head('leads').eq('statut', 'gagne'))
  const messages = await cnt(head('messages'))
  const devis = await cnt(head('devis'))
  const factures = await cnt(head('factures'))
  push('Artisans', artisans >= 0, String(artisans))
  push('Leads (conversations)', leads >= 0, String(leads))
  push('Conversations actives', true, String(enDiscussion))
  push('Non lus', nonLus === 0 ? true : 'warn', String(nonLus))
  push('Leads gagnés', true, String(gagnes))
  push('Messages échangés', messages >= 0, String(messages))
  push('Devis', devis >= 0, String(devis))
  push('Factures', factures >= 0, String(factures))
  try {
    const { data } = await supabaseAdmin.from('factures').select('total_ttc')
    const ca = (data ?? []).reduce((s: number, f: { total_ttc: number | null }) => s + (f.total_ttc ?? 0), 0)
    push('CA facturé (TTC)', true, `${ca.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`)
  } catch { push('CA facturé', 'warn', 'indisponible') }
  return { agent: 'gestion-donnees', at: new Date().toISOString(), items }
}

// Agent MAILS-DÉLIVRABILITÉ : statut du domaine Resend + DNS.
async function mailsDelivrabilite() {
  const items: { k: string; ok: boolean | 'warn'; v: string }[] = []
  const push = (k: string, ok: boolean | 'warn', v: string) => items.push({ k, ok, v })
  const key = process.env.RESEND_API_KEY
  if (!key) { push('Clé Resend', false, 'absente'); return { agent: 'mails-delivrabilite', at: new Date().toISOString(), items } }
  try {
    const list = await (await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })).json()
    const dom = (list.data || []).find((d: { name: string }) => d.name === 'prestiapp.fr')
    if (!dom) { push('Domaine prestiapp.fr', false, 'non ajouté'); return { agent: 'mails-delivrabilite', at: new Date().toISOString(), items } }
    push('Domaine prestiapp.fr', dom.status === 'verified', dom.status)
    const det = await (await fetch(`https://api.resend.com/domains/${dom.id}`, { headers: { Authorization: `Bearer ${key}` } })).json()
    const recs = det.records || []
    const has = (type: string, name: string) => recs.some((r: { type: string; name: string; status?: string }) => r.type === type && (r.name || '').includes(name))
    push('DKIM (resend._domainkey)', has('TXT', 'resend._domainkey'), has('TXT', 'resend._domainkey') ? 'présent' : 'manquant')
    push('SPF (send)', has('TXT', 'send'), has('TXT', 'send') ? 'présent' : 'manquant')
    push('MX (send)', has('MX', 'send'), has('MX', 'send') ? 'présent' : 'manquant')
  } catch { push('Resend', 'warn', 'API injoignable') }
  return { agent: 'mails-delivrabilite', at: new Date().toISOString(), items }
}

// Agent GESTION : bilan santé de la plateforme.
async function gestion() {
  const items: { k: string; ok: boolean | 'warn'; v: string }[] = []
  const push = (k: string, ok: boolean | 'warn', v: string) => items.push({ k, ok, v })

  // Prod + en-têtes
  try {
    const r = await fetch('https://prestiapp.fr/', { cache: 'no-store' })
    push('Site en ligne', r.ok, `HTTP ${r.status}`)
    push('CSP posée', !!r.headers.get('content-security-policy'), r.headers.get('content-security-policy') ? 'présente' : 'absente')
  } catch { push('Site en ligne', false, 'injoignable') }

  // Base
  try {
    const tables = ['artisans', 'leads', 'devis', 'factures', 'ip_bans'] as const
    const counts = await Promise.all(tables.map((t) => supabaseAdmin.from(t).select('id', { count: 'exact', head: true })))
    tables.forEach((t, i) => push(`Table ${t}`, true, `${counts[i].count ?? 0} lignes`))
  } catch { push('Base de données', false, 'erreur') }

  // Bans actifs
  try {
    const { data } = await supabaseAdmin.from('ip_bans').select('ip, expires_le')
    const now = Date.now()
    const actifs = (data ?? []).filter((b: { expires_le: string | null }) => !b.expires_le || new Date(b.expires_le).getTime() > now).length
    push('IP bannies (actives)', actifs === 0 ? true : 'warn', String(actifs))
  } catch { push('IP bannies', false, 'erreur') }

  // Resend
  try {
    const key = process.env.RESEND_API_KEY
    if (key) {
      const dr = await (await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })).json()
      const dom = (dr.data || []).find((d: { name: string }) => d.name === 'prestiapp.fr')
      push('Emails (Resend)', dom?.status === 'verified', `domaine ${dom?.status ?? 'inconnu'}`)
    } else push('Emails (Resend)', 'warn', 'clé absente')
  } catch { push('Emails (Resend)', 'warn', 'non vérifié') }

  // Crash reporting : erreurs applicatives sur 24 h
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await supabaseAdmin.from('app_errors').select('id', { count: 'exact', head: true }).gte('created_at', since)
    const n = count ?? 0
    push('Erreurs applicatives (24h)', n === 0 ? true : 'warn', String(n))
  } catch { push('Erreurs applicatives', 'warn', 'table indisponible') }

  return { agent: 'gestion', at: new Date().toISOString(), items }
}
