// POST /api/site/commander/public/renvoyer { commande } — renvoyer le lien de connexion d'un achat sans compte (fiche
// 026-025), depuis la page de confirmation, quand le premier n'est pas arrivé ou a expiré.
//
// La réponse est TOUJOURS la même, 200 { ok: true } : commande payée, inconnue, en brouillon, déjà rattachée ou plafond
// atteint — la route ne dit rien de ce qui existe. Elle n'accepte jamais d'adresse : le lien part à l'adresse de la
// commande, rien d'autre (un champ `email` dans le corps est ignoré). Plafonds : 3 envois par heure et par commande, et
// 20 demandes par heure et par adresse IP pseudonymisée (une rafale d'identifiants au hasard ne remplit pas la table des
// compteurs). Baissé, le drapeau siteAchatPublic répond 404.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { getIp, isBanned, ipPseudonyme } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ouvrirCompteAcheteur } from '@/lib/siteAchatPublic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Un identifiant de commande plausible (uuid en production) : rien d'autre ne part vers la base ni vers les compteurs. */
const ID = /^[A-Za-z0-9-]{1,64}$/

export async function POST(req: Request) {
  if (!actif('siteAchatPublic') || !actif('siteCommande')) return new NextResponse(null, { status: 404 })
  const neutre = NextResponse.json({ ok: true })

  const corps = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const commande = typeof corps?.commande === 'string' ? corps.commande.trim() : ''
  if (!ID.test(commande)) return neutre
  const ip = getIp(req)
  if (await isBanned(ip)) return neutre
  if (!(await consommerLimiteStricte(`site-public:renvoi-ip:${ipPseudonyme(ip) ?? 'inconnue'}`, 20, 3600))) return neutre
  if (!(await consommerLimiteStricte(`site-public:renvoi:${commande}`, 3, 3600))) return neutre

  try {
    const { data, error } = await supabaseAdmin.from('sites_commandes').select('id, etat, achat_public, artisan_id').eq('id', commande).maybeSingle()
    if (error) throw new Error(error.message)
    // Payée, publique, et toujours sans compte : sinon, rien (le compte rattaché se connecte normalement).
    if (data && data.etat === 'payee' && data.achat_public === true && !data.artisan_id) await ouvrirCompteAcheteur(commande)
  } catch (e) {
    console.error('[site public] renvoi du lien', commande, e instanceof Error ? e.message : e)
  }
  return neutre
}
