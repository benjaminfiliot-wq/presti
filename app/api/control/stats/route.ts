export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

type LeadRow = { id: string; nom_prospect: string | null; contact: string | null; statut: string | null; created_at: string; artisan_id: string }
type DevisRow = { id: string; numero: string | null; client_nom: string | null; objet: string | null; statut: string | null; total_ttc: number | null; created_at: string; artisan_id: string }
type ArtRow = { id: string; nom: string | null }

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })
}

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
  if (!userData?.user) return json({ error: 'Session expirée' }, 401)
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  if (!me?.is_founder) return json({ error: 'Réservé aux fondateurs' }, 403)

  const [leadsRes, devisRes, artRes] = await Promise.all([
    supabaseAdmin.from('leads').select('id,nom_prospect,contact,statut,created_at,artisan_id').order('created_at', { ascending: false }),
    supabaseAdmin.from('devis').select('id,numero,client_nom,objet,statut,total_ttc,created_at,artisan_id').order('created_at', { ascending: false }),
    supabaseAdmin.from('artisans').select('id,nom'),
  ])
  const L = (leadsRes.data ?? []) as LeadRow[]
  const D = (devisRes.data ?? []) as DevisRow[]
  const A = (artRes.data ?? []) as ArtRow[]

  const nameOf: Record<string, string> = {}
  A.forEach((a) => { nameOf[a.id] = a.nom || '—' })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const weekAgo = now.getTime() - 7 * 86400000
  const ts = (s: string) => { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : 0 }
  const sum = (arr: DevisRow[]) => arr.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0)

  const accepte = D.filter((d) => d.statut === 'accepte')
  const pipeline = D.filter((d) => d.statut === 'brouillon' || d.statut === 'envoye')
  const revenus = {
    accepte: sum(accepte),
    pipeline: sum(pipeline),
    mois: sum(accepte.filter((d) => ts(d.created_at) >= monthStart)),
  }
  const leadStat = (k: string) => L.filter((l) => l.statut === k).length
  const devisStat = (k: string) => D.filter((d) => d.statut === k).length

  const activity = [
    ...L.slice(0, 16).map((l) => ({ kind: 'lead' as const, title: l.nom_prospect || 'Client', sub: l.contact || '', artisan: nameOf[l.artisan_id] || '—', statut: l.statut || 'nouveau', montant: 0, at: l.created_at })),
    ...D.slice(0, 16).map((d) => ({ kind: 'devis' as const, title: d.client_nom || 'Client', sub: d.numero || d.objet || '', artisan: nameOf[d.artisan_id] || '—', statut: d.statut || 'brouillon', montant: Number(d.total_ttc) || 0, at: d.created_at })),
  ].sort((a, b) => ts(b.at) - ts(a.at)).slice(0, 14)

  const clientSet = new Set<string>()
  L.forEach((l) => { if (l.nom_prospect) clientSet.add(l.nom_prospect.trim().toLowerCase()) })
  D.forEach((d) => { if (d.client_nom) clientSet.add(d.client_nom.trim().toLowerCase()) })

  const tauxReponse = L.length ? Math.round((L.filter((l) => l.statut === 'repondu' || l.statut === 'gagne').length / L.length) * 100) : 0
  const tauxConversion = D.length ? Math.round((accepte.length / D.length) * 100) : 0

  return json({
    revenus,
    devis: { total: D.length, brouillon: devisStat('brouillon'), envoye: devisStat('envoye'), accepte: accepte.length, refuse: devisStat('refuse') },
    leads: { total: L.length, nouveau: leadStat('nouveau'), repondu: leadStat('repondu'), gagne: leadStat('gagne'), semaine: L.filter((l) => ts(l.created_at) >= weekAgo).length },
    clients: clientSet.size,
    artisans: A.length,
    tauxReponse,
    tauxConversion,
    activity,
    generatedAt: now.toISOString(),
  })
}
