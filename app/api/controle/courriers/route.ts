import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { boiteEntreprise } from '@/lib/direction/courriers'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/courriers — la boîte de l'entreprise, par FIL (prompt v10 §2.3).
//
// Un fil, une ligne : le dernier message donne le titre et la date, le statut du fil est le plus
// urgent de ses messages. C'est ce qu'on veut voir d'un coup d'œil — une pile de fils à traiter,
// pas une liste de messages où la même conversation revient six fois.
export async function GET(req: Request) {
  if (!actif('messagerie')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)

  const url = new URL(req.url)
  const filtre = url.searchParams.get('statut') ?? 'a_traiter'
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80)

  let requete = supabaseAdmin.from('courriers')
    .select('id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu, recu_le, statut, assigne_a, artisan_id')
    .order('recu_le', { ascending: false }).limit(300)
  if (filtre !== 'tous') requete = requete.eq('statut', filtre)
  if (q) requete = requete.or(`sujet.ilike.%${q}%,correspondant_email.ilike.%${q}%,correspondant_nom.ilike.%${q}%,apercu.ilike.%${q}%`)
  const { data, error } = await requete
  if (error) return NextResponse.json({ error: 'Boîte indisponible pour l’instant.' }, { status: 503 })

  const parFil = new Map<string, { fil: string; sujet: string | null; correspondant: string; email: string; dernier: string; messages: number; statut: string; artisan_id: string | null; sens: string }>()
  for (const c of data ?? []) {
    const e = parFil.get(c.fil)
    if (!e) {
      parFil.set(c.fil, {
        fil: c.fil, sujet: c.sujet, correspondant: c.correspondant_nom || c.correspondant_email, email: c.correspondant_email,
        dernier: c.recu_le, messages: 1, statut: c.statut, artisan_id: c.artisan_id, sens: c.sens,
      })
    } else {
      e.messages++
      // Le fil est « à traiter » dès qu'un seul de ses messages l'est.
      if (c.statut === 'a_traiter') e.statut = 'a_traiter'
      if (!e.artisan_id && c.artisan_id) e.artisan_id = c.artisan_id
    }
  }
  const fils = [...parFil.values()].sort((a, b) => b.dernier.localeCompare(a.dernier))
  const { count: aTraiter } = await supabaseAdmin.from('courriers').select('id', { count: 'exact', head: true }).eq('statut', 'a_traiter')

  return NextResponse.json({
    fils, aTraiter: aTraiter ?? 0, configuree: !!boiteEntreprise(), role: f.role,
    source: { source: 'base', a: new Date().toISOString(), cache: false },
    a: new Date().toISOString(),
  })
}
