// Côté serveur uniquement : retrouve l'artisan derrière une ANCIENNE adresse (0051), pour
// que les pages publiques redirigent définitivement au lieu de répondre « introuvable ».
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { ArtisanAdresse } from '@/lib/urls'

export async function artisanParAncienSlug(slug: string): Promise<ArtisanAdresse | null> {
  if (!slug) return null
  const { data } = await supabaseAdmin.rpc('artisan_par_ancien_slug', { p_slug: slug })
  const row = Array.isArray(data) ? data[0] : null
  return row?.slug ? { slug: row.slug, domaine: row.domaine ?? null, domaine_verifie: row.domaine_verifie ?? null } : null
}
