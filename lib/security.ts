import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Système anti-hacker : bannissement d'IP + auto-ban sur abus répété.
// Utilisé côté serveur uniquement (service_role). Fail-open : en cas d'erreur DB,
// on ne bloque pas un vrai visiteur (la sécurité repose aussi sur RLS + rate-limit).

const AUTO_BAN_SEUIL = 12          // abus sur la fenêtre → ban automatique
const AUTO_BAN_FENETRE_MIN = 30    // minutes
const AUTO_BAN_DUREE_H = 24        // durée du ban auto

/** Extrait l'IP demandeuse (Vercel pose x-forwarded-for). */
export function getIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
}

/** true si l'IP est bannie (ban permanent ou non expiré). */
export async function isBanned(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  try {
    const { data } = await supabaseAdmin
      .from('ip_bans')
      .select('expires_le')
      .eq('ip', ip)
      .maybeSingle()
    if (!data) return false
    if (!data.expires_le) return true // permanent
    return new Date(data.expires_le).getTime() > Date.now()
  } catch {
    return false // fail-open
  }
}

/**
 * Enregistre un abus pour cette IP et déclenche un auto-ban si le seuil est franchi
 * sur la fenêtre glissante. Renvoie true si l'IP vient d'être bannie.
 */
export async function recordAbuse(ip: string, raison: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  try {
    await supabaseAdmin.from('ip_abus').insert({ ip, raison })
    const since = new Date(Date.now() - AUTO_BAN_FENETRE_MIN * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('ip_abus')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('at', since)
    if ((count ?? 0) >= AUTO_BAN_SEUIL) {
      const expires = new Date(Date.now() + AUTO_BAN_DUREE_H * 3600 * 1000).toISOString()
      await supabaseAdmin
        .from('ip_bans')
        .upsert({ ip, raison: `Auto : ${raison} (${count} abus / ${AUTO_BAN_FENETRE_MIN} min)`, auto: true, expires_le: expires }, { onConflict: 'ip' })
      console.warn('[security] auto-ban IP', ip)
      return true
    }
  } catch {
    /* fail-open : ne bloque jamais sur une erreur de comptage */
  }
  return false
}
