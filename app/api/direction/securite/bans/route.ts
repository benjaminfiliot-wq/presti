import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estDirection, estRefus, reponseRefus } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// /api/direction/securite/bans — les bans d'IP, portés depuis api/control/security (prompt v10 §2.5) avec ce qui
// manquait : rôle direction pour écrire, RE-CONFIRMATION (portée « securite ») et JOURNAL avant/après. C'est
// l'écriture « accès » qui prouve la chaîne complète du J1. /controle garde son ancienne route jusqu'au J6.
type Ban = { ip: string; raison: string | null; auto: boolean; created_at: string; expires_le: string | null }
const IP = /^[0-9a-fA-F:.]{3,45}$/

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const depuis = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const [bans, abus] = await Promise.all([
    supabaseAdmin.from('ip_bans').select('ip, raison, auto, created_at, expires_le').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('ip_abus').select('ip, raison, at').gte('at', depuis).order('at', { ascending: false }).limit(500),
  ])
  if (bans.error) return NextResponse.json({ error: 'Bans indisponibles.' }, { status: 503 })
  const parIp: Record<string, { ip: string; n: number; raison: string; dernier: string }> = {}
  for (const a of (abus.data ?? []) as { ip: string; raison: string; at: string }[]) { const e = (parIp[a.ip] ||= { ip: a.ip, n: 0, raison: a.raison, dernier: a.at }); e.n++ }
  const maintenant = Date.now()
  return NextResponse.json({
    bans: ((bans.data ?? []) as Ban[]).map((b) => ({ ...b, actif: !b.expires_le || new Date(b.expires_le).getTime() > maintenant })),
    abus24h: Object.values(parIp).sort((x, y) => y.n - x.n).slice(0, 30),
    role: f.role, a: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const refus = await exigerReconfirmation(req, f.uid, 'securite')
  if (refus) return refus
  const b = (await req.json().catch(() => null)) as { ip?: unknown; raison?: unknown; dureeH?: unknown } | null
  const ip = typeof b?.ip === 'string' ? b.ip.trim().slice(0, 64) : ''
  if (!IP.test(ip)) return NextResponse.json({ error: 'IP invalide.' }, { status: 400 })
  const raison = typeof b?.raison === 'string' && b.raison.trim() ? b.raison.trim().slice(0, 200) : 'Ban manuel (direction)'
  const heures = Number(b?.dureeH)
  const expires_le = Number.isFinite(heures) && heures > 0 ? new Date(Date.now() + heures * 3_600_000).toISOString() : null
  const { data: avant } = await supabaseAdmin.from('ip_bans').select('ip, raison, auto, expires_le').eq('ip', ip).maybeSingle()
  const apres = { ip, raison, auto: false, expires_le }
  const { error } = await supabaseAdmin.from('ip_bans').upsert(apres, { onConflict: 'ip' })
  if (error) return NextResponse.json({ error: 'Ban impossible.' }, { status: 503 })
  if (!(await journaliser({ acteur: f, action: 'ban_ip', cible_type: 'ip', cible_id: ip, avant: avant ?? null, apres, reconfirme: true }, req))) {
    // Pas de journal → pas de ban : on remet l'état d'avant.
    if (avant) await supabaseAdmin.from('ip_bans').upsert(avant, { onConflict: 'ip' }); else await supabaseAdmin.from('ip_bans').delete().eq('ip', ip)
    return refusJournal()
  }
  return NextResponse.json({ ok: true, ban: apres })
}

export async function DELETE(req: Request) {
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const refus = await exigerReconfirmation(req, f.uid, 'securite')
  if (refus) return refus
  const b = (await req.json().catch(() => null)) as { ip?: unknown } | null
  const ip = typeof b?.ip === 'string' ? b.ip.trim() : ''
  if (!IP.test(ip)) return NextResponse.json({ error: 'IP invalide.' }, { status: 400 })
  const { data: avant } = await supabaseAdmin.from('ip_bans').select('ip, raison, auto, expires_le').eq('ip', ip).maybeSingle()
  if (!avant) return NextResponse.json({ ok: true, deja: true })
  const { error } = await supabaseAdmin.from('ip_bans').delete().eq('ip', ip)
  if (error) return NextResponse.json({ error: 'Retrait impossible.' }, { status: 503 })
  if (!(await journaliser({ acteur: f, action: 'deban_ip', cible_type: 'ip', cible_id: ip, avant, apres: null, reconfirme: true }, req))) {
    await supabaseAdmin.from('ip_bans').upsert(avant, { onConflict: 'ip' })
    return refusJournal()
  }
  return NextResponse.json({ ok: true })
}
