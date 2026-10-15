// Le passage quotidien des automatisations de la compta (alerte impayés, export mensuel), appelé par
// /api/cron/relances : Vercel n'accorde que deux tâches planifiées à cette formule, toutes deux prises.
// Le QUOI est dans lib/comptaAutomatisations.ts (pur, testé) ; ici, seulement lire, prendre, envoyer, se souvenir.
//
// Garanties :
//  • Drapeau baissé : la fonction ne lit rien et rend « fermé ». L'appelant ne l'appelle de toute façon pas sous pause générale.
//  • Jamais deux fois : une facture est PRISE (insertion dans compta_alertes_envoyees, clé primaire) avant l'envoi, un mois
//    est PRIS (mise à jour conditionnelle de dernier_export_mois) avant l'envoi ; un envoi refusé rend la prise, et
//    l'automatisation réessaie au passage suivant. Deux passages simultanés ne peuvent pas envoyer la même chose.
//  • Borné : MAX_COMPTES comptes par passage, une erreur sur un compte n'arrête pas les autres.
//  • Chaque lecture de factures porte `.eq('artisan_id', …)` du compte traité : un compte ne reçoit jamais les pièces d'un autre.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'
import { facturesASignaler, journalFacturesCsv, messageAlerte, moisAExporter, moisEnMots } from '@/lib/comptaAutomatisations'
import type { FacturePresti } from '@/lib/comptaTableau'

const MAX_COMPTES = 200
const COLONNES = 'id, artisan_id, numero, statut, date_emission, date_echeance, total_ttc, avoir_de, client_nom, payee_le'

type Bilan = { ferme?: true; comptes: number; alertes: number; exports: number; erreurs: string[] }

export async function tourCompta(maintenant = new Date()): Promise<Bilan> {
  const alerte = actif('comptaAlerteImpayes')
  const exporte = actif('comptaExportMensuel')
  const bilan: Bilan = { comptes: 0, alertes: 0, exports: 0, erreurs: [] }
  if (!alerte && !exporte) return { ...bilan, ferme: true }

  let lecture = supabaseAdmin.from('compta_reglages').select('artisan_id, alerte_impayes, alerte_jours, export_mensuel, export_email, dernier_export_mois').limit(MAX_COMPTES)
  lecture = alerte && exporte ? lecture.or('alerte_impayes.eq.true,export_mensuel.eq.true') : alerte ? lecture.eq('alerte_impayes', true) : lecture.eq('export_mensuel', true)
  const { data: reglages, error } = await lecture
  if (error) return { ...bilan, erreurs: [`réglages : ${error.message}`.slice(0, 160)] }

  for (const r of reglages ?? []) {
    bilan.comptes++
    try {
      const { data: artisan } = await supabaseAdmin.from('artisans').select('id, nom, email, plan').eq('id', r.artisan_id).maybeSingle()
      if (!artisan) continue
      // 15/10 (Benj) : l'automatisation de « Mes chiffres » est celle de l'offre Signature (capacité `chiffres.auto`). Un compte qui a réglé
      // l'alerte ou l'export puis a changé d'offre n'est plus servi — ses réglages restent, rien n'est effacé.
      if (!peut(artisan.plan, 'chiffres.auto')) continue
      const f = await supabaseAdmin.from('factures').select(COLONNES).eq('artisan_id', r.artisan_id).limit(2000)
      if (f.error) { bilan.erreurs.push(`factures : ${f.error.message}`.slice(0, 160)); continue }
      const factures = (f.data ?? []) as FacturePresti[]

      // (b) Alerte impayés, à l'artisan lui-même.
      if (alerte && r.alerte_impayes && artisan.email) {
        const deja = await supabaseAdmin.from('compta_alertes_envoyees').select('facture_id').eq('artisan_id', r.artisan_id).limit(5000)
        if (deja.error) throw new Error(deja.error.message)
        const candidates = facturesASignaler({ artisanId: r.artisan_id, factures, jours: r.alerte_jours, dejaSignalees: new Set((deja.data ?? []).map((x) => x.facture_id)), maintenant })
        if (candidates.length) {
          const prises = await supabaseAdmin.from('compta_alertes_envoyees')
            .upsert(candidates.map((c) => ({ facture_id: c.ref, artisan_id: r.artisan_id })), { onConflict: 'facture_id', ignoreDuplicates: true })
            .select('facture_id')
          if (prises.error) throw new Error(prises.error.message)
          const ids = new Set((prises.data ?? []).map((x) => x.facture_id))
          const aEnvoyer = candidates.filter((c) => ids.has(c.ref))
          if (aEnvoyer.length) {
            const m = messageAlerte(aEnvoyer)
            const envoi = await sendEmail({ to: artisan.email, subject: m.sujet, text: m.texte })
            if (envoi.ok) bilan.alertes += aEnvoyer.length
            else {
              await supabaseAdmin.from('compta_alertes_envoyees').delete().in('facture_id', [...ids]).eq('artisan_id', r.artisan_id)
              bilan.erreurs.push(`alerte non partie : ${envoi.error ?? 'raison inconnue'}`.slice(0, 160))
            }
          }
        }
      }

      // (c) Export mensuel, au comptable, au nom de l'artisan (réponse vers l'artisan).
      const mois = exporte && r.export_mensuel && r.export_email ? moisAExporter(maintenant, r.dernier_export_mois) : null
      if (mois) {
        let prise = supabaseAdmin.from('compta_reglages').update({ dernier_export_mois: mois }).eq('artisan_id', r.artisan_id)
        prise = r.dernier_export_mois === null ? prise.is('dernier_export_mois', null) : prise.eq('dernier_export_mois', r.dernier_export_mois)
        const { data: pris, error: ePrise } = await prise.select('artisan_id')
        if (ePrise) throw new Error(ePrise.message)
        if (pris?.length) {
          const { csv, nombre } = journalFacturesCsv(factures, r.artisan_id, mois)
          const nom = artisan.nom?.trim() || 'Votre client'
          const envoi = await sendEmail({
            to: r.export_email,
            subject: `Factures de ${moisEnMots(mois)} — ${nom}`,
            text: `Bonjour,\n\nVoici le journal des factures de ${moisEnMots(mois)} (${nombre} pièce${nombre > 1 ? 's' : ''}, avoirs compris), au format CSV, lisible dans Excel.\n\nBien cordialement,\n${nom}`,
            fromName: nom,
            replyTo: artisan.email ?? undefined,
            attachments: [{ filename: `factures-${mois}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') }],
          })
          if (envoi.ok) bilan.exports++
          else {
            await supabaseAdmin.from('compta_reglages').update({ dernier_export_mois: r.dernier_export_mois }).eq('artisan_id', r.artisan_id).eq('dernier_export_mois', mois)
            bilan.erreurs.push(`export non parti : ${envoi.error ?? 'raison inconnue'}`.slice(0, 160))
          }
        }
      }
    } catch (e) {
      bilan.erreurs.push((e instanceof Error ? e.message : String(e)).slice(0, 160))
    }
  }
  return bilan
}
