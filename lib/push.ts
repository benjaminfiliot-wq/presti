import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { actif } from '@/lib/flags'

// Envoi des notifications push à l'ARTISAN (prompt v9 §3.3). Web Push avec VAPID (J2) ; les jetons
// natifs APNs/FCM (J3) passeront par la même table et la même fonction.
//
// Règles :
//  • une charge utile = un titre + une ligne + une adresse Presti + un tag : JAMAIS le contenu d'un
//    message, ni un nom, ni une adresse, ni une photo — le détail est dans l'app (§3.2) ;
//  • plafond par artisan et par heure (lib/limites, atomique) : un flot de demandes ne devient pas
//    un flot de notifications ;
//  • 404 / 410 du service de push → l'abonnement est supprimé ; 3 échecs d'affilée → désactivé ;
//  • ne jette jamais : une notification qui échoue ne casse pas la route qui l'émet ;
//  • sans clés VAPID, sans table (migration 0064 non collée) ou drapeau `pushWeb` baissé : ne fait
//    rien, et le dit dans `raison`.

export type ChargePush = { titre: string; ligne: string; url: string; tag: string; renotify?: boolean }
export type ResultatPush = { envoyes: number; supprimes: number; desactives: number; raison?: 'desactive' | 'vapid_absent' | 'plafond' | 'table' | 'aucun_appareil' }

/** Notifications par artisan et par heure. Au-delà, on se tait — l'app, elle, montre tout. */
export const PLAFOND_PUSH_HEURE = 30
const ECHECS_MAX = 3

let vapidConfigure = false
function vapidPret(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  if (!vapidConfigure) {
    // Le « sujet » VAPID identifie l'expéditeur auprès du service de push : une URL de contact (pas une boîte email).
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://prestiapp.fr/contact', pub, priv)
    vapidConfigure = true
  }
  return true
}

/** La clé publique VAPID, telle que le navigateur doit la présenter au service de push. */
export const clePubliqueVapid = (): string | null => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null

/** Une adresse de destination valide : un chemin Presti, jamais une URL externe ni un `//hôte`. */
export const cheminSur = (url: string | null | undefined): string => (typeof url === 'string' && /^\/(?!\/)[^\s]*$/.test(url) ? url : '/dashboard')

/** La charge utile, bornée et sans champ inattendu — c'est CE JSON qui part, rien d'autre. */
export function chargeUtile(c: ChargePush): string {
  return JSON.stringify({
    titre: String(c.titre).slice(0, 60),
    ligne: String(c.ligne).slice(0, 120),
    url: cheminSur(c.url),
    tag: String(c.tag).slice(0, 60),
    renotify: !!c.renotify,
  })
}

type Abonnement = { id: string; endpoint: string; p256dh: string; auth: string; echecs: number }

/** Envoie la même notification à TOUS les appareils web actifs de l'artisan. */
export async function envoyerPushArtisan(artisanId: string, charge: ChargePush): Promise<ResultatPush> {
  const r: ResultatPush = { envoyes: 0, supprimes: 0, desactives: 0 }
  if (!actif('pushWeb')) return { ...r, raison: 'desactive' }
  if (!vapidPret()) return { ...r, raison: 'vapid_absent' }
  if (!(await consommerLimite(`push:artisan:${artisanId}`, PLAFOND_PUSH_HEURE, 3600))) return { ...r, raison: 'plafond' }

  const { data, error } = await supabaseAdmin
    .from('push_abonnements').select('id, endpoint, p256dh, auth, echecs')
    .eq('artisan_id', artisanId).eq('type', 'web').eq('actif', true)
  if (error) { console.error('[push] lecture des abonnements :', error.message); return { ...r, raison: 'table' } }
  const abos = (data ?? []) as Abonnement[]
  if (abos.length === 0) return { ...r, raison: 'aucun_appareil' }

  const corps = chargeUtile(charge)
  await Promise.all(abos.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, corps, { TTL: 3600, urgency: 'high' })
      r.envoyes++
      await supabaseAdmin.from('push_abonnements').update({ dernier_succes: new Date().toISOString(), echecs: 0 }).eq('id', a.id)
    } catch (e) {
      const statut = (e as { statusCode?: number })?.statusCode
      if (statut === 404 || statut === 410) {
        // L'abonnement n'existe plus côté service (navigateur désinstallé, permission retirée) : on l'oublie.
        await supabaseAdmin.from('push_abonnements').delete().eq('id', a.id)
        r.supprimes++
      } else {
        const echecs = (a.echecs ?? 0) + 1
        const desactiver = echecs >= ECHECS_MAX
        await supabaseAdmin.from('push_abonnements').update({ echecs, ...(desactiver ? { actif: false } : {}) }).eq('id', a.id)
        if (desactiver) r.desactives++
        console.error('[push] envoi raté', statut ?? '', (e as Error)?.message?.slice(0, 120) ?? '')
      }
    }
  }))
  return r
}
