import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { getPlateformeConfig, modeEffectif } from '@/lib/plateformeConfig'
import { offreMinimale } from '@/lib/plans'

// Le mode de réponse tel que le SERVEUR l'applique (prompt v7, bloc 1e). L'écran de réglages
// affichait le mode choisi ; le serveur pouvait en appliquer un autre (verrou d'offre) sans le
// dire — « je clique auto, ça demande une validation ». Cette route rend les deux, et le motif.
export const runtime = 'nodejs'

export async function GET(req: Request) {
  // 15/10 (Benj) : l'écran « Ma plateforme » commence avec Studio, pour tous les comptes. Le lien de conversation et la réponse
  // préparée par l'IA, eux, n'en dépendent pas (la page publique lit la config côté serveur, sans passer par ici).
  const s = await exigerCapacite(req, 'plateforme.gestion', 'L’écran « Ma plateforme »')
  if ('reponse' in s) return s.reponse
  const { data: a } = await supabaseAdmin.from('artisans').select('plan, leads_pause').eq('id', s.uid).maybeSingle()
  const cfg = await getPlateformeConfig(s.uid)
  const eff = modeEffectif(a?.plan, cfg)
  return NextResponse.json({
    mode_reponse: cfg.mode_reponse,
    mode_effectif: eff.mode,
    motif: eff.motif,
    pause: a?.leads_pause === true,
    offre_auto: offreMinimale('plateforme.ia.auto'),
  })
}
