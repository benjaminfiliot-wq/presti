// Application des règles d'automatisation, côté serveur (v5 §9 G1). La décision est dans
// lib/regles.ts (pure) ; ici on lit la règle de l'artisan, on regarde l'état réel de la
// conversation, et on exécute — en ne faisant jamais plus que ce que la règle autorise.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { peut, offreMinimale } from '@/lib/plans'
import { notifierArtisan } from '@/lib/notifications'
import { creerDevisBrouillonPourLead } from '@/lib/devisAuto'
import { mentionsManquantesEmission, versArtisanLegal } from '@/lib/legalArtisan'
import { acompteALAcceptation, decider, normaliserMaillons, type Maillons } from '@/lib/regles'

type Regle = { maillons: Maillons; actif: boolean }

export async function regleDe(artisanId: string): Promise<Regle | null> {
  const { data } = await supabaseAdmin.from('regles_automatisation').select('maillons, actif').eq('artisan_id', artisanId).maybeSingle()
  if (!data) return null
  return { maillons: normaliserMaillons(data.maillons), actif: data.actif !== false }
}

type LeadCtx = { id: string; artisan_id: string; nom_prospect: string | null; contact: string | null; type_chantier?: string | null; photos?: unknown; prise_en_main?: boolean | null }

/**
 * À appeler après chaque réponse de l'assistant. Rend ce qui a été fait, pour le journal
 * de la conversation et pour les tests — jamais silencieux.
 */
export async function declencherRegles(p: { lead: LeadCtx; nbReponsesIA: number; artisanEmail: string | null; artisanNom: string | null }): Promise<{ fait: 'rien' | 'devis_cree' | 'devis_envoye'; pourquoi?: string; devisId?: string }> {
  const regle = await regleDe(p.lead.artisan_id)
  if (!regle) return { fait: 'rien', pourquoi: 'aucune règle' }
  // Verrou SERVEUR (audit v5 §8, réellement posé le 05/09 : la première tentative avait échoué
  // sans que je m'en aperçoive). La règle est écrite depuis le navigateur (RLS), mais elle ne
  // s'exécute que si l'offre le permet — sinon un Essentiel obtiendrait devis auto + acompte.
  const { data: art } = await supabaseAdmin.from('artisans').select('plan').eq('id', p.lead.artisan_id).maybeSingle()
  if (!peut(art?.plan, 'plateforme.regles')) return { fait: 'rien', pourquoi: `réservé à l'offre ${offreMinimale('plateforme.regles') ?? 'supérieure'}` }

  const { count } = await supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).eq('lead_id', p.lead.id)
  const photos = Array.isArray(p.lead.photos) ? p.lead.photos.length : 0
  // Qualifié = un type de chantier détecté, ou l'assistant a déjà posé ses questions (2 tours).
  const qualifie = !!p.lead.type_chantier || p.nbReponsesIA >= 2

  const d = decider(regle.maillons, regle.actif, { qualifie, nbPhotos: photos, devisExistant: (count ?? 0) > 0, priseEnMain: p.lead.prise_en_main === true })
  if (d.action === 'rien') return { fait: 'rien', pourquoi: d.pourquoi }

  const r = await creerDevisBrouillonPourLead({ artisanId: p.lead.artisan_id, leadId: p.lead.id, tier: d.modele, source: 'regle' })
  if (!r.ok) return { fait: 'rien', pourquoi: r.error }
  if (r.deja) return { fait: 'rien', pourquoi: 'devis déjà créé par la règle' }

  let envoye = false
  if (d.envoyerSansValidation) {
    // « Tout auto » : le devis part seul — mais jamais sans les mentions obligatoires
    // (amende jusqu'à 3 000 € pour l'absence d'assurance décennale sur un devis du bâtiment).
    const { data: art } = await supabaseAdmin.from('artisans').select('*').eq('id', p.lead.artisan_id).maybeSingle()
    const manquantes = art ? mentionsManquantesEmission(versArtisanLegal(art)) : ['profil']
    if (manquantes.length === 0) {
      await supabaseAdmin.from('devis').update({ statut: 'envoye', envoye_le: new Date().toISOString() }).eq('id', r.id)
      await supabaseAdmin.from('messages').insert({ lead_id: p.lead.id, sens: 'out', type: 'devis_envoye', contenu: `Devis ${r.numero} — ${r.total_ttc.toFixed(2)} € TTC` })
      envoye = true
    }
  }

  if (d.puisNotifier && p.artisanEmail) {
    const qui = p.lead.nom_prospect || p.lead.contact || 'un prospect'
    await notifierArtisan(p.lead.artisan_id, 'proposition', p.artisanEmail, {
      
      subject: envoye ? `Devis ${r.numero} envoyé à ${qui}` : `Devis brouillon prêt — ${qui}`,
      text: envoye
        ? `Votre règle d'automatisation a chiffré et envoyé le devis ${r.numero} (${r.total_ttc.toFixed(2)} € TTC) dans la conversation avec ${qui}.\n\nRetrouvez-le dans votre espace (Devis).`
        : `L'assistant a qualifié la demande de ${qui} et préparé un devis brouillon ${r.numero} (${r.total_ttc.toFixed(2)} € TTC).\n\nRien n'est parti : relisez-le et envoyez-le en un clic depuis votre espace (Devis), ou depuis la conversation.`,
      replyTo: 'contact@prestiapp.fr',
    }).catch(() => {})
  }

  return { fait: envoye ? 'devis_envoye' : 'devis_cree', devisId: r.id }
}

/** À l'acceptation d'un devis par le client : le pourcentage d'acompte à facturer, ou null. */
export async function acompteApresAcceptation(artisanId: string): Promise<number | null> {
  const regle = await regleDe(artisanId)
  return regle ? acompteALAcceptation(regle.maillons, regle.actif) : null
}
