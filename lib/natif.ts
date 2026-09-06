// Pont web ↔ natif (prompt v9 §4.2). Chargé par la console ; la coque Capacitor (mobile/) injecte
// `window.Capacitor` et ses plugins — le code web ne les importe JAMAIS en dur : il les lit derrière
// `estNatif()`, pour que le bundle web reste exactement le même dans un navigateur.
//
// Chaque fonctionnalité a un chemin natif et un repli web, choisis à l'exécution :
//   partager        : @capacitor/share  → navigator.share → copie du lien
//   partagerFichier : Filesystem + Share (feuille native avec le PDF) → navigator.share({ files }) → téléchargement
//   prendrePhoto    : @capacitor/camera (appareil ou galerie, 1600 px, qualité 80) → null (le <input type=file> reste)
//   scannerCodeBarres : @capacitor-mlkit/barcode-scanning → null (BarcodeDetector du navigateur, ou saisie)
//   vibrer          : @capacitor/haptics → rien
//   ouvrirExterne   : @capacitor/browser (navigateur système) → window.open
//   push natif      : @capacitor/push-notifications (app/NatifPont.tsx) — le web garde Web Push (J2)
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

const enBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})

/**
 * Partage d'un FICHIER (le PDF d'un devis) : feuille native (WhatsApp, Mail, AirDrop…) via le cache de l'app ;
 * sinon Web Share avec fichier (Android/Chrome, iOS/Safari) ; sinon téléchargement classique.
 */
export async function partagerFichier(nom: string, blob: Blob, o: { titre?: string; texte?: string } = {}): Promise<'natif' | 'web' | 'telechargement' | 'aucun'> {
  const fsys = plugin('Filesystem'), share = plugin('Share')
  if (fsys?.writeFile && share?.share) {
    try {
      const ecrit = (await fsys.writeFile({ path: nom, data: await enBase64(blob), directory: 'CACHE' })) as { uri?: string }
      if (ecrit?.uri) { await share.share({ title: o.titre ?? nom, text: o.texte, files: [ecrit.uri], dialogTitle: o.titre ?? nom }); return 'natif' }
    } catch { /* annulé ou indisponible : on tente la suite */ }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const fichier = new File([blob], nom, { type: blob.type || 'application/pdf' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (!nav.canShare || nav.canShare({ files: [fichier] })) {
      try { await navigator.share({ title: o.titre ?? nom, text: o.texte, files: [fichier] }); return 'web' } catch { /* annulé */ }
    }
  }
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = nom; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return 'telechargement'
  }
  return 'aucun'
}

/**
 * Une photo de chantier par la caméra native (ou la galerie), déjà réduite à 1600 px et qualité 80 AVANT
 * d'être envoyée. Rend un File prêt pour lib/media (qui ré-encode : l'EXIF ne part jamais). `null` hors coque,
 * ou si l'artisan annule : l'appelant garde alors son <input type="file">.
 */
export async function prendrePhoto(source: 'appareil' | 'galerie' | 'choix' = 'choix'): Promise<File | null> {
  const camera = plugin('Camera')
  if (!camera?.getPhoto) return null
  try {
    const r = (await camera.getPhoto({
      quality: 80, width: 1600, height: 1600, correctOrientation: true, resultType: 'base64',
      source: source === 'appareil' ? 'CAMERA' : source === 'galerie' ? 'PHOTOS' : 'PROMPT',
      promptLabelHeader: 'Photo de chantier', promptLabelPhoto: 'Depuis la galerie', promptLabelPicture: 'Prendre une photo', promptLabelCancel: 'Annuler',
    })) as { base64String?: string; format?: string }
    if (!r?.base64String) return null
    const format = (r.format || 'jpeg').toLowerCase()
    const type = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
    const octets = Uint8Array.from(atob(r.base64String), (c) => c.charCodeAt(0))
    return new File([octets], `chantier.${format === 'jpeg' ? 'jpg' : format}`, { type })
  } catch { return null } // annulé, ou permission refusée : l'appelant retombe sur son <input>
}

/**
 * Scan d'un code-barres par le module natif (ML Kit) : un lecteur plein écran, rapide, qui marche aussi
 * sur iPhone. Rend le code, ou `null` (annulé, refusé) ; `undefined` hors coque : l'appelant garde alors
 * BarcodeDetector ou la saisie manuelle.
 */
export async function scannerCodeBarres(): Promise<string | null | undefined> {
  const scanner = plugin('BarcodeScanner')
  if (!scanner?.scan) return undefined
  try {
    const p = (await scanner.requestPermissions?.()) as { camera?: string } | undefined
    if (p && p.camera !== 'granted' && p.camera !== 'limited') return null
    if (plateforme() === 'android' && scanner.isGoogleBarcodeScannerModuleAvailable) {
      const dispo = (await scanner.isGoogleBarcodeScannerModuleAvailable()) as { available?: boolean }
      if (!dispo?.available && scanner.installGoogleBarcodeScannerModule) await scanner.installGoogleBarcodeScannerModule()
    }
    const r = (await scanner.scan({ formats: ['EAN_13', 'EAN_8', 'CODE_128', 'CODE_39', 'UPC_A', 'UPC_E', 'ITF'] })) as { barcodes?: { rawValue?: string }[] }
    const v = r?.barcodes?.[0]?.rawValue?.trim()
    return v || null
  } catch { return null }
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
