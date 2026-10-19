// Passage quotidien : les devis ENVOYÉS dont la validité est dépassée passent à « expiré » (audit de cohérence du 18/10, C8).
//
// Avant : seul l'artisan pouvait passer un devis à « expiré », à la main. La colonne « Devis envoyé » du pipeline gardait donc
// pour toujours un devis vieux de quatre mois, pendant que la tuile « devis en attente » (et « Mes chiffres ») l'écartait
// après sa validité : deux montants différents pour la même question. La règle de dépassement est UNE (lib/comptaTableau.ts,
// devisDepasse) : la tuile l'applique à la lecture, ce passage l'écrit en base, et tous les écrans suivent le statut.
//
// Garanties :
//   • on n'écrit QUE `statut = 'expire'` (et `updated_at`), et seulement si le devis est encore « envoye » au moment de
//     l'écriture (`.eq('statut', 'envoye')`) : un client qui accepte pendant le passage n'est jamais écrasé ;
//   • l'artisan peut le rouvrir (statut « Envoyé » dans l'écran Devis) : la date d'envoi repart alors d'aujourd'hui
//     (lib/devisStatut.ts), et le devis a de nouveau toute sa validité devant lui ;
//   • les comptes de DÉMONSTRATION (est_demo) ne sont pas touchés : leurs données sont figées pour la vitrine ; ni un devis
//     dont le compte n'existe plus ;
//   • chaque expiration est tracée dans le journal du CRM (origine « systeme ») ; une trace qui échoue n'empêche rien ;
//   • `artisanId` restreint le passage à UN compte (suites de test) ; sans lui, tous les comptes.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { devisDepasse, jourParis } from '@/lib/comptaTableau'

const PAGE = 1000
const PLAFOND = 20_000

export type ResultatExpiration = { lus: number; expires: number; erreurs: string[] }

export async function expirerDevisDepasses(p: { maintenant?: Date; artisanId?: string } = {}): Promise<ResultatExpiration> {
  const jour = jourParis(p.maintenant ?? new Date())
  const erreurs: string[] = []
  type Ligne = { id: string; artisan_id: string; statut: string; envoye_le: string | null; date_emission: string | null; created_at: string | null; validite_jours: number | null }
  const lus: Ligne[] = []
  for (let de = 0; de < PLAFOND; de += PAGE) {
    let q = supabaseAdmin.from('devis').select('id, artisan_id, statut, envoye_le, date_emission, created_at, validite_jours').eq('statut', 'envoye')
    if (p.artisanId) q = q.eq('artisan_id', p.artisanId)
    const { data, error } = await q.order('id').range(de, de + PAGE - 1)
    if (error) return { lus: lus.length, expires: 0, erreurs: [`devis (lecture) : ${error.message}`] }
    lus.push(...((data ?? []) as Ligne[]))
    if ((data ?? []).length < PAGE) break
  }
  const candidats = lus.filter((d) => devisDepasse(d, jour))
  if (!candidats.length) return { lus: lus.length, expires: 0, erreurs }

  // Les comptes de démonstration restent tels quels ; un devis dont le compte n'existe plus (débris de suites de test) aussi.
  const comptes = [...new Set(candidats.map((d) => d.artisan_id))]
  const reels = new Set<string>()
  for (let i = 0; i < comptes.length; i += 200) {
    const { data, error } = await supabaseAdmin.from('artisans').select('id, est_demo').in('id', comptes.slice(i, i + 200))
    if (error) return { lus: lus.length, expires: 0, erreurs: [`artisans (lecture) : ${error.message}`] }
    for (const a of (data ?? []) as { id: string; est_demo: boolean | null }[]) if (!a.est_demo) reels.add(a.id)
  }

  let expires = 0
  for (const d of candidats.filter((x) => reels.has(x.artisan_id))) {
    const { data, error } = await supabaseAdmin.from('devis').update({ statut: 'expire', updated_at: new Date().toISOString() })
      .eq('id', d.id).eq('artisan_id', d.artisan_id).eq('statut', 'envoye').select('id')
    if (error) { erreurs.push(`devis ${d.id.slice(0, 8)} : ${error.message}`); continue }
    if (!data?.length) continue // accepté, refusé ou rouvert entre-temps : rien à faire
    expires++
    const validite = Number(d.validite_jours) > 0 ? Number(d.validite_jours) : 90
    const { error: ej } = await supabaseAdmin.from('crm_journal').insert({
      artisan_id: d.artisan_id, objet: 'devis', objet_id: d.id, champ: 'statut', de: 'envoye', vers: 'expire', origine: 'systeme',
      note: `Validité de ${validite} jours dépassée : devis passé à « expiré » automatiquement. Repassez-le à « Envoyé » pour le rouvrir.`,
    })
    if (ej) erreurs.push(`journal du devis ${d.id.slice(0, 8)} : ${ej.message}`)
  }
  return { lus: lus.length, expires, erreurs }
}
