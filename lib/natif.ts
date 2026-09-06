// Pont web ↔ natif (prompt v9 §4.2). Chargé par la console ; la coque Capacitor (mobile/) injecte
// `window.Capacitor` et ses plugins — le code web ne les importe JAMAIS en dur : il les lit derrière
// `estNatif()`, pour que le bundle web reste exactement le même dans un navigateur.
//
// Chaque fonctionnalité a un chemin natif et un repli web, choisis à l'exécution :
//   partager   : @capacitor/share  → navigator.share → copie du lien
//   vibrer     : @capacitor/haptics → rien
//   ouvrir     : @capacitor/browser (navigateur système) → window.open
//   push natif : @capacitor/push-notifications (J3, lib/pushNatif) — le web garde Web Push (J2)
// Rien ici ne parle de Presti à un client d'artisan : ces fonctions ne sont appelées que dans la console.

type PluginCapacitor = Record<string, (...args: unknown[]) => Promise<unknown>>
type Capacitor = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: Record<string, PluginCapacitor | undefined>
}

const cap = (): Capacitor | null => (typeof window !== 'undefined' ? ((window as Window & { Capacitor?: Capacitor }).Capacitor ?? null) : null)

/** Sommes-nous dans la coque native (iOS ou Android) ? */
export const estNatif = (): boolean => !!cap()?.isNativePlatform?.()

export const plateforme = (): 'ios' | 'android' | 'web' => {
  const p = cap()?.getPlatform?.()
  return p === 'ios' || p === 'android' ? p : 'web'
}

/** Un plugin natif par son nom (`Share`, `Haptics`, `Camera`…), ou null hors coque. */
export const plugin = (nom: string): PluginCapacitor | null => (estNatif() ? cap()?.Plugins?.[nom] ?? null : null)

/** Partage d'un lien ou d'un texte : feuille native → Web Share → copie dans le presse-papiers. */
export async function partager(o: { titre?: string; texte?: string; url?: string }): Promise<'natif' | 'web' | 'copie' | 'aucun'> {
  const share = plugin('Share')
  if (share?.share) {
    try { await share.share({ title: o.titre, text: o.texte, url: o.url, dialogTitle: o.titre }); return 'natif' } catch { /* annulé ou indisponible : on tente la suite */ }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try { await navigator.share({ title: o.titre, text: o.texte, url: o.url }); return 'web' } catch { /* annulé */ }
  }
  const contenu = o.url ?? o.texte ?? ''
  if (contenu && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(contenu); return 'copie' } catch { /* presse-papiers refusé */ }
  }
  return 'aucun'
}

/** Retour haptique léger (validation, envoi, scan réussi). Silencieux hors coque. */
export async function vibrer(style: 'leger' | 'succes' | 'avertissement' = 'leger'): Promise<void> {
  const h = plugin('Haptics')
  if (!h) return
  try {
    if (style === 'leger') await h.impact?.({ style: 'LIGHT' })
    else await h.notification?.({ type: style === 'succes' ? 'SUCCESS' : 'WARNING' })
  } catch { /* pas de moteur haptique */ }
}

/** Ouvre une adresse HORS de l'app (navigateur système) : site d'un artisan, Stripe, fournisseur. */
export async function ouvrirExterne(url: string): Promise<void> {
  const b = plugin('Browser')
  if (b?.open) { try { await b.open({ url }); return } catch { /* repli */ } }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}
