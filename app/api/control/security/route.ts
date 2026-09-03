export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })
}

// Vérifie que l'appelant est un fondateur.
async function requireFounder(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: userData } = await getUserRevocable(token)
  if (!userData?.user) return null
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  return me?.is_founder ? userData.user.id : null
}

// GET : liste des bans + IP les plus abusives (24h).
export async function GET(req: Request) {
  if (!(await requireFounder(req))) return json({ error: 'Réservé aux fondateurs' }, 403)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const [bansRes, abusRes] = await Promise.all([
    supabaseAdmin.from('ip_bans').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('ip_abus').select('ip, raison, at').gte('at', since).order('at', { ascending: false }).limit(500),
  ])
  const abus = (abusRes.data ?? []) as { ip: string; raison: string; at: string }[]
  const parIp: Record<string, { ip: string; count: number; raison: string; dernier: string }> = {}
  for (const a of abus) {
    const e = (parIp[a.ip] ||= { ip: a.ip, count: 0, raison: a.raison, dernier: a.at })
    e.count++
  }
  const now = Date.now()
  const bans = (bansRes.data ?? []).map((b: { ip: string; raison: string | null; auto: boolean; created_at: string; expires_le: string | null }) => ({
    ...b,
    actif: !b.expires_le || new Date(b.expires_le).getTime() > now,
  }))
  return json({
    bans,
    abus24h: Object.values(parIp).sort((a, b) => b.count - a.count).slice(0, 30),
    generatedAt: new Date().toISOString(),
  })
}

// POST : bannir manuellement une IP { ip, raison?, dureeH? } (dureeH absent = permanent).
export async function POST(req: Request) {
  if (!(await requireFounder(req))) return json({ error: 'Réservé aux fondateurs' }, 403)
  const b = await req.json().catch(() => ({}))
  const ip = typeof b?.ip === 'string' ? b.ip.trim().slice(0, 64) : ''
  if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) return json({ error: 'IP invalide' }, 400)
  const raison = typeof b?.raison === 'string' ? b.raison.slice(0, 200) : 'Ban manuel (fondateur)'
  const expires_le = Number(b?.dureeH) > 0 ? new Date(Date.now() + Number(b.dureeH) * 3600 * 1000).toISOString() : null
  const { error } = await supabaseAdmin.from('ip_bans').upsert({ ip, raison, auto: false, expires_le }, { onConflict: 'ip' })
  if (error) return json({ error: 'Ban impossible' }, 500)
  return json({ ok: true })
}

// DELETE : débannir { ip }.
export async function DELETE(req: Request) {
  if (!(await requireFounder(req))) return json({ error: 'Réservé aux fondateurs' }, 403)
  const b = await req.json().catch(() => ({}))
  const ip = typeof b?.ip === 'string' ? b.ip.trim() : ''
  if (!ip) return json({ error: 'IP requise' }, 400)
  await supabaseAdmin.from('ip_bans').delete().eq('ip', ip)
  return json({ ok: true })
}
