// Ce que l'ENVOI d'un devis écrit sur le devis lui-même (POST /api/devis/[id]/envoyer), hors PDF, e-mail et relances.
// Extrait de la route pour que scripts/coherence-flux-qa.mjs rejoue EXACTEMENT cette écriture : la route rend un PDF
// (lib/DevisPDF.tsx, JSX non chargeable hors Next), le test ne peut pas l'appeler entière.
//
// C1 (audit de cohérence du 18/10) : la date d'envoi est enregistrée — premier envoi, ou renvoi d'un devis rouvert
// (lib/devisStatut.ts). Un simple renvoi d'un devis déjà « envoyé » et daté garde sa date : la validité et les relances
// partent du premier envoi.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { datesDuStatut, type EtatDevis } from '@/lib/devisStatut'

export async function enregistrerEnvoi(devis: EtatDevis & { id: string }, artisanId: string, maintenant: Date = new Date()): Promise<{ error: { message: string } | null }> {
  const { error } = await supabaseAdmin.from('devis').update({
    statut: 'envoye', updated_at: maintenant.toISOString(),
    ...(devis.envoye_le ? {} : { envoye_le: maintenant.toISOString() }),
    ...datesDuStatut(devis, 'envoye', maintenant),
  }).eq('id', devis.id).eq('artisan_id', artisanId)
  return { error }
}
