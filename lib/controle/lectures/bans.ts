// Vient de app/api/controle/securite/bans/route.ts (GET) : les bans d'IP et les abus des dernières 24 h, regroupés par IP.
// Rend `null` quand la table des bans est illisible (la route en fait un 503). La garde (domaine `securite`, rôle) reste à la route.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Ban = { ip: string; raison: string | null; auto: boolean; created_at: string; expires_le: string | null }

export async function bans() {
  const depuis = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const [lesBans, abus] = await Promise.all([
    supabaseAdmin.from('ip_bans').select('ip, raison, auto, created_at, expires_le').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('ip_abus').select('ip, raison, at').gte('at', depuis).order('at', { ascending: false }).limit(500),
  ])
  if (lesBans.error) return null
  const parIp: Record<string, { ip: string; n: number; raison: string; dernier: string }> = {}
  for (const a of (abus.data ?? []) as { ip: string; raison: string; at: string }[]) { const e = (parIp[a.ip] ||= { ip: a.ip, n: 0, raison: a.raison, dernier: a.at }); e.n++ }
  const maintenant = Date.now()
  return {
    bans: ((lesBans.data ?? []) as Ban[]).map((b) => ({ ...b, actif: !b.expires_le || new Date(b.expires_le).getTime() > maintenant })),
    abus24h: Object.values(parIp).sort((x, y) => y.n - x.n).slice(0, 30),
  }
}
