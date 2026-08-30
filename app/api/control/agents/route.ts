export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })
}
async function requireFounder(req: Request): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
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
  return json({ error: 'Agent inconnu ou non exécutable côté serveur (auditeur/animateur = session dev).' }, 400)
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

  return { agent: 'gestion', at: new Date().toISOString(), items }
}
