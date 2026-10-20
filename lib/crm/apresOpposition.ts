// L'opposition du client aux messages d'après-chantier (migration 0171, audit de conformité du 20/10, A1). Côté serveur seulement :
// l'adresse n'est jamais gardée, seulement son empreinte (la même que la clé de débit de l'envoi).
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const empreinteAdresse = (email: string): string => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)

/** Le client a-t-il refusé les messages de cet artisan ? En cas de doute (base illisible), on répond « oui » : rien ne part. */
export async function clientOppose(artisanId: string, email: string | null): Promise<boolean> {
  if (!email) return false
  const { data, error } = await supabaseAdmin.from('crm_apres_opposition').select('empreinte').eq('artisan_id', artisanId).eq('empreinte', empreinteAdresse(email)).maybeSingle()
  if (error) { console.error('[crm/apres-chantier] opposition (lecture) :', error.message); return true }
  return !!data
}
