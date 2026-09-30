import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerPurge } from '@/lib/agents/acquisition/maquettesLien'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enregistrerPassage } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const stockage = {
  async lire(chemin: string): Promise<Uint8Array | null> {
    const { data, error } = await supabaseAdmin.storage.from('maquettes').download(chemin)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
  },
  async retirer(chemin: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from('maquettes').remove([chemin])
    if (error) throw error
  },
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const pause = await pauseGenerale()
  if (pause.active) return NextResponse.json({ pause: true, source: pause.source })
  try {
    if (await magasinSupabase.enPause('atelier_maquettes')) return NextResponse.json({ pause: true })
    const bilan = await executerPurge({ magasin: magasinSupabase, stockage })
    await enregistrerPassage('acq-maquettes-purge', bilan, true)
    return NextResponse.json({ ok: true, ...bilan })
  } catch (e) {
    await enregistrerPassage('acq-maquettes-purge', { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
