import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { actif } from '@/lib/flags'
import { appareilDe, estRobot, lireVue, navigateurDe, origineMaison, paysDe } from '@/lib/audience'
import { PLAFOND_JOUR_AUDIENCE, cleJourAudience, clePlafond, empreinteDuJour } from '@/lib/audienceServeur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/audience — une vue d'une page publique de Presti (migrations 0090 à 0092 ; lib/audience.ts).
//
// Route anonyme, donc hostile par défaut. Le corps est relu contre la liste fermée des pages, le user-agent écarte
// robots et suites — mais ni l'un ni l'autre ne protège : tout se falsifie. Ce qui protège, ce sont deux bornes :
//   1. un plafond par ADRESSE (son réseau, /64 en IPv6), 120 vues par heure. Il était compté sur l'empreinte, qui
//      contient le navigateur : un user-agent changé à chaque requête le remettait à zéro, et une seule machine
//      pouvait remplir la base de l'offre gratuite (revue adversariale du 14/09) ;
//   2. un plafond du JOUR pour toute la mesure (lib/audienceServeur.ts) : même depuis mille adresses, le disque reste
//      borné. Au-delà, plus rien ne s'écrit jusqu'à minuit (Paris) ; l'onglet Visiteurs le dit.
//
// PAS de vérification des adresses bannies : `isBanned` lit `ip_bans` par un GET dont l'URL porte l'IP en clair, et
// Supabase journalise cette URL à la milliseconde, à côté de l'écriture de la vue — l'IP « non enregistrée » l'aurait
// été dans les journaux (contre-revue du 14/09). Une adresse bannie n'écrit pas plus qu'une autre : 120 vues par heure.
//
// Réponse 204 dans tous les cas, vue écrite ou non : la mesure ne casse jamais une page, et un refus détaillé
// apprendrait à qui la sonde quel filtre contourner. 404 tant que le drapeau est baissé.
const rien = () => new NextResponse(null, { status: 204 })
const PLAFOND_ADRESSE_HEURE = 120
let saturationDite = ''

export async function POST(req: Request) {
  if (!actif('audience')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  try {
    const ua = req.headers.get('user-agent') ?? ''
    if (estRobot(ua) || !origineMaison(req.headers.get('origin'), req.headers.get('referer'))) return rien()
    if (Number(req.headers.get('content-length') ?? 0) > 2000) return rien()
    let corps: unknown = null
    try { corps = JSON.parse((await req.text()).slice(0, 2000)) } catch { return rien() }
    const vue = lireVue(corps)
    const ip = getIp(req)
    if (!vue || ip === 'unknown') return rien()
    if (!(await consommerLimite(clePlafond(ip), PLAFOND_ADRESSE_HEURE, 3600))) return rien()
    const cleJour = cleJourAudience()
    if (!(await consommerLimite(cleJour, PLAFOND_JOUR_AUDIENCE, 86400))) {
      if (saturationDite !== cleJour) { saturationDite = cleJour; console.error(`[audience] plafond du jour atteint (${PLAFOND_JOUR_AUDIENCE} vues) : plus rien ne s'écrit avant minuit, heure de Paris`) }
      return rien()
    }
    const { error } = await supabaseAdmin.from('audience_vues').insert({
      chemin: vue.chemin, entree: vue.entree, source: vue.source, campagne: vue.campagne,
      appareil: appareilDe(ua, vue.tactile), navigateur: navigateurDe(ua), pays: paysDe(req.headers.get('x-vercel-ip-country')),
      empreinte: empreinteDuJour(ip, ua),
    })
    if (error) console.error('[audience] écriture refusée :', error.message)
    return rien()
  } catch {
    return rien()
  }
}
