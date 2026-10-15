// Serveur seulement (clé de service) : la garde « la plateforme est-elle ouverte à cet artisan ? » des routes PUBLIQUES de la plateforme
// (conversation d'un client, relances, comptes clients…). Décision : lib/plateformeAcces.ts (Studio et au-dessus, 15/10).
// Refus : 403 { code: 'plateforme' }, message neutre pour le client — sans lire ni écrire quoi que ce soit, sans crédit consommé.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MESSAGE_PUBLIC_SANS_PLATEFORME, plateformeOuverte } from '@/lib/plateformeAcces'

export const refusSansPlateforme = (): NextResponse =>
  NextResponse.json({ error: MESSAGE_PUBLIC_SANS_PLATEFORME, code: 'plateforme' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })

/** null : la plateforme de cet artisan est ouverte, la route continue. Sinon : la réponse à renvoyer telle quelle. */
export async function refusSiSansPlateforme(artisanId: string): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', artisanId).maybeSingle()
  if (error) {
    console.error('[plateforme] lecture de l’offre :', error.message)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return data && plateformeOuverte(data) ? null : refusSansPlateforme()
}
