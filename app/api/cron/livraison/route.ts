import { NextResponse } from 'next/server'
import { bearerEgal } from '@/lib/secretEgal' // audit du 20/10 : comparaison du secret en temps constant
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { tourLivraison } from '@/lib/siteLivraison'

export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!bearerEgal(auth, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin.from('sites_commandes').select('courriels').limit(1)
  if (error) return NextResponse.json({ error: 'livraison indisponible' }, { status: error.code === '42703' ? 503 : 500 })
  try { return NextResponse.json({ ok: true, ...(await tourLivraison()) }) }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'livraison impossible' }, { status: 500 }) }
}
