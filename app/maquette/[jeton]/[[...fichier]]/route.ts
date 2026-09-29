import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { servirMaquette } from '@/lib/agents/acquisition/maquettesLien'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function GET(req: Request, ctx: { params: Promise<{ jeton: string; fichier?: string[] }> }) {
  const { jeton, fichier } = await ctx.params
  const adresse = ipPseudonyme(getIp(req)) ?? 'inconnue'
  const permis = await consommerLimite(`maquette:lecture:${adresse}`, 60, 600)
  if (!permis) return new Response('Trop de demandes.', { status: 429, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } })
  const nom = fichier?.length === 1 ? fichier[0] : fichier ? fichier.join('/') : undefined
  const resultat = await servirMaquette(jeton, nom, { magasin: magasinSupabase, stockage }, req.headers.get('range'))
  const corps = typeof resultat.corps === 'string' ? resultat.corps : Buffer.from(resultat.corps)
  return new Response(corps, { status: resultat.statut, headers: resultat.entetes })
}
