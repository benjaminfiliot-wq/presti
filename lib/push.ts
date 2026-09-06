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
export type ResultatPush = {
  envoyes: number; supprimes: number; desactives: number
  /** Appareils natifs laissés de côté faute de compte de service Firebase (M3). */
  natifsIgnores?: number
  raison?: 'desactive' | 'vapid_absent' | 'plafond' | 'table' | 'aucun_appareil'
}

/** Notifications par artisan et par heure. Au-delà, on se tait — l'app, elle, montre tout. */
export const PLAFOND_PUSH_HEURE = 30
const ECHECS_MAX = 3

let vapidEtat: 'inconnu' | 'ok' | 'ko' = 'inconnu'
function vapidPret(): boolean {
  if (vapidEtat !== 'inconnu') return vapidEtat === 'ok'
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false // absentes : on réessaiera (elles peuvent arriver au prochain déploiement)
  try {
    // Le « sujet » VAPID identifie l'expéditeur auprès du service de push : une URL de contact (pas une boîte email).
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://prestiapp.fr/contact', pub, priv)
    vapidEtat = 'ok'
  } catch (e) {
    // Clés mal formées : on le dit une fois, et plus aucune route ne tombe en 500 pour ça.
    console.error('[push] clés VAPID invalides :', (e as Error).message)
    vapidEtat = 'ko'
  }
  return vapidEtat === 'ok'
}

/** La clé publique VAPID, telle que le navigateur doit la présenter au service de push — une seule source, côté serveur. */
export const clePubliqueVapid = (): string | null => process.env.VAPID_PUBLIC_KEY || null

/** Une adresse de destination valide : un chemin Presti — jamais une URL externe, ni `//hôte`, ni `/\hôte` (que `new URL` résout aussi vers un autre hôte). */
export const cheminSur = (url: string | null | undefined): string => (typeof url === 'string' && /^\/(?![/\\])[^\s\\]*$/.test(url) ? url : '/dashboard')

/** Taille fixe de la charge chiffrée : sa longueur ne révèle pas le type d'événement au service de push. */
export const TAILLE_CHARGE = 512

/** La charge utile, bornée, sans champ inattendu, rembourrée à taille fixe — c'est CE JSON qui part, rien d'autre. */
export function chargeUtile(c: ChargePush): string {
  const base = {
    titre: String(c.titre).slice(0, 60),
    ligne: String(c.ligne).slice(0, 120),
    url: cheminSur(c.url),
    tag: String(c.tag).slice(0, 60),
    renotify: !!c.renotify,
  }
  const manque = TAILLE_CHARGE - JSON.stringify(base).length - ',"p":""'.length
  return JSON.stringify(manque > 0 ? { ...base, p: ' '.repeat(manque) } : base)
}

type Abonnement = { id: string; type: 'web' | 'ios' | 'android'; endpoint: string | null; jeton: string | null; p256dh: string | null; auth: string | null; echecs: number }

/** Un envoi raté : ce que le service a répondu, et s'il faut oublier l'appareil. */
type Echec = { statut?: number; disparu: boolean; message: string }

async function noterSucces(a: Abonnement, r: ResultatPush) {
  r.envoyes++
  await supabaseAdmin.from('push_abonnements').update({ dernier_succes: new Date().toISOString(), echecs: 0 }).eq('id', a.id)
}
async function noterEchec(a: Abonnement, e: Echec, r: ResultatPush) {
  if (e.disparu) {
    // L'abonnement n'existe plus côté service (app désinstallée, permission retirée) : on l'oublie.
    await supabaseAdmin.from('push_abonnements').delete().eq('id', a.id)
    r.supprimes++
  } else if (e.statut && e.statut >= 400 && e.statut < 500 && e.statut !== 429) {
    // 400/401/403/413… : c'est l'abonnement qui est en cause. Trois fois d'affilée → désactivé.
    const echecs = (a.echecs ?? 0) + 1
    const desactiver = echecs >= ECHECS_MAX
    await supabaseAdmin.from('push_abonnements').update({ echecs, ...(desactiver ? { actif: false } : {}) }).eq('id', a.id)
    if (desactiver) r.desactives++
    console.error('[push] abonnement refusé', a.type, e.statut, e.message)
  } else {
    // 429, 5xx, panne réseau, Firebase absent : le service, pas l'appareil — pas d'échec définitif contre lui.
    console.error('[push] envoi raté (service)', a.type, e.statut ?? 'réseau', e.message)
  }
}

/** Envoie la même notification à TOUS les appareils actifs de l'artisan — web (VAPID) et natifs (FCM). */
export async function envoyerPushArtisan(artisanId: string, charge: ChargePush): Promise<ResultatPush> {
  const r: ResultatPush = { envoyes: 0, supprimes: 0, desactives: 0 }
  if (!actif('pushWeb')) return { ...r, raison: 'desactive' }

  const { data, error } = await supabaseAdmin
    .from('push_abonnements').select('id, type, endpoint, jeton, p256dh, auth, echecs')
    .eq('artisan_id', artisanId).eq('actif', true)
  if (error) { console.error('[push] lecture des abonnements :', error.message); return { ...r, raison: 'table' } }
  const abos = (data ?? []) as Abonnement[]
  if (abos.length === 0) return { ...r, raison: 'aucun_appareil' }
  const webs = abos.filter((a) => a.type === 'web' && a.endpoint && a.p256dh && a.auth)
  const natifs = abos.filter((a) => a.type !== 'web' && a.jeton)
  if (webs.length > 0 && !vapidPret()) return { ...r, raison: 'vapid_absent' }
  // Le plafond ne décompte que des envois réellement tentés : un artisan sans appareil ne le consomme pas.
  if (!(await consommerLimite(`push:artisan:${artisanId}`, PLAFOND_PUSH_HEURE, 3600))) return { ...r, raison: 'plafond' }

  const corps = chargeUtile(charge)
  const { envoyerPushNatif, firebasePret } = await import('@/lib/pushNatif')
  const natif = { titre: String(charge.titre).slice(0, 60), ligne: String(charge.ligne).slice(0, 120), url: cheminSur(charge.url), tag: String(charge.tag).slice(0, 60) }
  if (natifs.length > 0 && !firebasePret()) r.natifsIgnores = natifs.length

  await Promise.all([
    ...webs.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint!, keys: { p256dh: a.p256dh!, auth: a.auth! } }, corps, { TTL: 3600, urgency: 'high' })
        await noterSucces(a, r)
      } catch (e) {
        const statut = (e as { statusCode?: number })?.statusCode
        await noterEchec(a, { statut, disparu: statut === 404 || statut === 410, message: (e as Error)?.message?.slice(0, 120) ?? '' }, r)
      }
    }),
    ...(firebasePret() ? natifs.map(async (a) => {
      const res = await envoyerPushNatif(a.jeton!, a.type as 'android' | 'ios', natif)
      if (res.ok) await noterSucces(a, r)
      else await noterEchec(a, { statut: res.statut, disparu: res.disparu, message: res.code ?? '' }, r)
    }) : []),
  ])
  return r
}
