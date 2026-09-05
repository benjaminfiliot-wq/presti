import { supabase } from './supabaseClient'

// Bucket public des médias artisan (logos, réalisations). Un dossier par artisan (RLS).
export const MEDIA_BUCKET = 'artisan-media'

/**
 * Redimensionne une image en Blob (pas en data-URL) via canvas.
 * On stocke un FICHIER dans le bucket, plus jamais de base64 inliné dans la page (perf/LCP).
 */
export function resizeToBlob(file: File, max: number, type: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg', quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), type, quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}

/** Blob → data URL (base64). */
export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read'))
    r.readAsDataURL(b)
  })
}

/**
 * Compresse une photo prospect en WebP data URL, ≤ maxBytes (RGPD : le ré-encodage canvas
 * STRIPPE tout l'EXIF, géoloc comprise). Baisse la qualité par paliers si nécessaire.
 * Renvoie null si l'image est illisible.
 */
export async function compressPhotoToDataUrl(file: File, maxPx = 1600, maxBytes = 900_000): Promise<string | null> {
  try {
    let q = 0.72
    let blob = await resizeToBlob(file, maxPx, 'image/webp', q)
    while (blob.size > maxBytes && q > 0.4) { q -= 0.12; blob = await resizeToBlob(file, maxPx, 'image/webp', q) }
    if (blob.size > maxBytes) blob = await resizeToBlob(file, 1200, 'image/webp', 0.55)
    return await blobToDataUrl(blob)
  } catch { return null }
}

/**
 * Envoie le blob dans `artisan-media/<uid>/…` → renvoie l'URL publique (immuable, cache 1 an).
 *
 * Passe par /api/media et NON plus directement par le stockage (audit final, auditeur F,
 * majeur 4.3). Raison : le bucket n'avait aucun plafond par compte, et un plafond posé ici
 * ne vaudrait rien — la clé anon est publique, l'appel au stockage se refait à la main. Le
 * comptage doit donc vivre côté serveur, et le navigateur n'a plus le droit d'écrire
 * (migration 0059). `uid` reste dans la signature pour les appelants, mais le serveur ne
 * l'écoute pas : il écrit dans le dossier de la SESSION.
 *
 * L'erreur jetée porte le message du serveur (« Vous avez atteint la limite de … ») : un
 * appelant qui l'affiche dit à l'artisan ce qui se passe et comment en sortir.
 */
export async function uploadArtisanMedia(uid: string, blob: Blob, ext: string): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const jeton = data.session?.access_token
  if (!jeton) throw new Error('Session expirée, reconnecte-toi.')

  // Corps binaire brut (pas de base64) : le JSON aurait gonflé l'envoi d'un tiers, pour rien.
  const r = await fetch(`/api/media?ext=${encodeURIComponent(ext)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jeton}`,
      'content-type': blob.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'),
    },
    body: blob,
  })
  const rep = await r.json().catch(() => null)
  if (!r.ok || !rep?.url) throw new Error(rep?.error || 'Envoi de l’image impossible.')
  return String(rep.url)
}

// ── Préparation d'une photo de réalisation (v4 §7/E3) ─────────────────────────
// Les réalisations étaient stockées en 1100 px JPEG q0.72, alors que la première
// d'entre elles sert de fond de hero PLEIN ÉCRAN (avec un scale 1.08 en plus).
// Sur un écran moderne, c'était de l'agrandissement : flou garanti, quel que soit
// le soin apporté au reste. On garde donc un master large, en WebP (meilleur rapport
// qualité/poids que JPEG), et next/image en dérive les tailles et formats servis.

/** Largeur du master conservé, selon l'usage réel de la photo. */
const TAILLE_MASTER: Record<string, number> = { hero: 2400, galerie: 1800, portrait: 1600, detail: 1400 }

/** Vignette floutée (quelques centaines d'octets) : évite le trou blanc pendant le chargement. */
async function vignetteFloue(file: File): Promise<string | null> {
  try {
    const petit = await resizeToBlob(file, 16, 'image/jpeg', 0.5)
    const url = await blobToDataUrl(petit)
    return url.length < 3000 ? url : null
  } catch { return null }
}

export type PhotoPreparee = { blob: Blob; ext: string; blur: string | null }

/**
 * Ré-encode la photo pour le web. Le passage par canvas RETIRE tout l'EXIF au passage —
 * y compris la GÉOLOCALISATION : un artisan qui publie la photo d'un chantier ne doit
 * jamais publier l'adresse de son client.
 */
export async function preparerPhoto(file: File, role: string = 'galerie'): Promise<PhotoPreparee> {
  const max = TAILLE_MASTER[role] ?? TAILLE_MASTER.galerie
  // 0.82 en WebP ≈ qualité visuellement transparente ; en JPEG il aurait fallu 0.9 et le double du poids.
  let blob = await resizeToBlob(file, max, 'image/webp', 0.82)
  // Filet de sécurité : au-delà de 1,6 Mo on redescend d'un cran plutôt que d'alourdir la page.
  if (blob.size > 1_600_000) blob = await resizeToBlob(file, Math.round(max * 0.75), 'image/webp', 0.78)
  return { blob, ext: 'webp', blur: await vignetteFloue(file) }
}
