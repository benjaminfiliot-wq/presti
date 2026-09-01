import { supabase } from './supabaseClient'

// Bucket public des médias artisan (logos, réalisations). Un dossier par artisan (RLS).
export const MEDIA_BUCKET = 'artisan-media'

/**
 * Redimensionne une image en Blob (pas en data-URL) via canvas.
 * On stocke un FICHIER dans le bucket, plus jamais de base64 inliné dans la page (perf/LCP).
 */
export function resizeToBlob(file: File, max: number, type: 'image/jpeg' | 'image/png' = 'image/jpeg', quality = 0.72): Promise<Blob> {
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

/** Envoie le blob dans `artisan-media/<uid>/…` → renvoie l'URL publique (immuable, cache 1 an). */
export async function uploadArtisanMedia(uid: string, blob: Blob, ext: string): Promise<string> {
  const rand = Math.random().toString(36).slice(2, 9)
  const path = `${uid}/${Date.now()}-${rand}.${ext}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
    contentType: blob.type || (ext === 'png' ? 'image/png' : 'image/jpeg'),
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}
