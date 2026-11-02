// Application des règles d'automatisation, côté serveur (v5 §9 G1). La décision est dans
// lib/regles.ts (pure) ; ici on lit la règle de l'artisan, on regarde l'état réel de la
// conversation, et on exécute — en ne faisant jamais plus que ce que la règle autorise.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { qualifyLead } from '@/lib/ai'
import { peut, offreMinimale } from '@/lib/plans'
import { notifierArtisan as notifierArtisanReel } from '@/lib/notifications'
import { creerDevisBrouillonPourLead } from '@/lib/devisAuto'
import { mentionsManquantesEmission, versArtisanLegal } from '@/lib/legalArtisan'
import { acompteALAcceptation, acompteSeul, decider, normaliserMaillons, type Maillons } from '@/lib/regles'
import { lignesDuDevis } from '@/lib/pilote/serveur'
import { prixSources } from '@/lib/pilote/regles'
import { creerFacture } from '@/lib/factureDepuisDevis'

/**
 * Ce que les essais remplacent (scripts/securite-assistant-0211-qa.mjs, rejoué sans base ni modèle) : le chiffrage par le modèle,
 * l'émission de la facture d'acompte et la notification. Absent : les vrais.
 */
export type DependancesRegles = { creerDevis?: typeof creerDevisBrouillonPourLead; creerFacture?: typeof creerFacture; notifier?: typeof notifierArtisanReel }

type Regle = { maillons: Maillons; actif: boolean }

export async function regleDe(artisanId: string): Promise<Regle | null> {
  const { data } = await supabaseAdmin.from('regles_automatisation').select('maillons, actif').eq('artisan_id', artisanId).maybeSingle()
  if (!data) return null
  return { maillons: normaliserMaillons(data.maillons), actif: data.actif !== false }
}

type LeadCtx = { id: string; artisan_id: string; nom_prospect: string | null; contact: string | null; message?: string | null; type_chantier?: string | null; photos?: unknown; prise_en_main?: boolean | null }

/**
 * À appeler après chaque réponse de l'assistant. Rend ce qui a été fait, pour le journal
 * de la conversation et pour les tests — jamais silencieux.
 */
export async function declencherRegles(p: { lead: LeadCtx; nbReponsesIA: number; artisanEmail: string | null; artisanNom: string | null }, dep: DependancesRegles = {}): Promise<{ fait: 'rien' | 'devis_cree' | 'devis_envoye'; pourquoi?: string; devisId?: string }> {
  const regle = await regleDe(p.lead.artisan_id)
  if (!regle) return { fait: 'rien', pourquoi: 'aucune règle' }
  // Verrou SERVEUR (audit v5 §8, réellement posé le 05/09 : la première tentative avait échoué
  // sans que je m'en aperçoive). La règle est écrite depuis le navigateur (RLS), mais elle ne
  // s'exécute que si l'offre le permet (Signature) — sinon un Studio obtiendrait devis auto + acompte.
  const { data: art } = await supabaseAdmin.from('artisans').select('plan').eq('id', p.lead.artisan_id).maybeSingle()
  if (!peut(art?.plan, 'plateforme.regles')) return { fait: 'rien', pourquoi: `réservé à l'offre ${offreMinimale('plateforme.regles') ?? 'supérieure'}` }

  const { count } = await supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).eq('lead_id', p.lead.id)
  const photos = Array.isArray(p.lead.photos) ? p.lead.photos.length : 0
  // Qualifié = un type de chantier détecté DANS LE MESSAGE, ou l'assistant a déjà posé ses
  // questions (2 tours). `lead.type_chantier` ne suffit pas : à la capture, il retombe sur le
  // métier de l'artisan (« Bonjour, vous êtes disponible ? » chez un plombier → « Plomberie »),
  // et une règle « tout auto » chiffrait puis ENVOYAIT un devis sur une conversation vide
  // (audit final, auditeur E, M3).
  const { type_chantier: typeDuMessage } = qualifyLead(p.lead.message, null)
  const qualifie = !!typeDuMessage || p.nbReponsesIA >= 2

  const d = decider(regle.maillons, regle.actif, { qualifie, nbPhotos: photos, devisExistant: (count ?? 0) > 0, priseEnMain: p.lead.prise_en_main === true })
  if (d.action === 'rien') return { fait: 'rien', pourquoi: d.pourquoi }

  const r = await (dep.creerDevis ?? creerDevisBrouillonPourLead)({ artisanId: p.lead.artisan_id, leadId: p.lead.id, tier: d.modele, source: 'regle' })
  if (!r.ok) return { fait: 'rien', pourquoi: r.error }
  if (r.deja) return { fait: 'rien', pourquoi: 'devis déjà créé par la règle' }

  let envoye = false
  let prixNonSource = false
  if (d.envoyerSansValidation) {
    // « Tout auto » : le devis part seul — mais jamais sans les mentions obligatoires
    // (amende jusqu'à 3 000 € pour l'absence d'assurance décennale sur un devis du bâtiment),
    // ni avec un prix qui ne vient pas de l'artisan (02/11, §3.2 du prompt de Benj du 01/11 : « envoyer un devis […] avec un prix sans
    // source » ne s'automatise jamais). LA règle même du pilote (lib/pilote/regles.ts prixSources, relue au départ par
    // lib/pilote/executeur.ts) sur les lignes RELUES du devis créé : une ligne estimée, « à chiffrer » ou à 0 € → rien ne part, le devis
    // reste brouillon et la notification dit pourquoi. Lignes illisibles = non sourcées (fail-closed).
    const { data: art } = await supabaseAdmin.from('artisans').select('*').eq('id', p.lead.artisan_id).maybeSingle()
    const manquantes = art ? mentionsManquantesEmission(versArtisanLegal(art)) : ['profil']
    const lignes = await lignesDuDevis(p.lead.artisan_id, { id: r.id })
    prixNonSource = !lignes || !prixSources(lignes)
    if (manquantes.length === 0 && !prixNonSource) {
      await supabaseAdmin.from('devis').update({ statut: 'envoye', envoye_le: new Date().toISOString() }).eq('id', r.id)
      await supabaseAdmin.from('messages').insert({ lead_id: p.lead.id, sens: 'out', type: 'devis_envoye', contenu: `Devis ${r.numero} — ${r.total_ttc.toFixed(2)} € TTC` })
      envoye = true
    }
  }

  if (d.puisNotifier && p.artisanEmail) {
    const qui = p.lead.nom_prospect || p.lead.contact || 'un prospect'
    // Le nom reste « notifierArtisan » à l'appel : scripts/emails-e2e.mjs recense chaque point d'envoi par ce nom (sujet, type connu).
    const notifierArtisan = dep.notifier ?? notifierArtisanReel
    await notifierArtisan(p.lead.artisan_id, 'proposition', p.artisanEmail, {
      leadId: p.lead.id,
      subject: envoye ? `Devis ${r.numero} envoyé à ${qui}` : `Devis brouillon prêt — ${qui}`,
      text: envoye
        ? `Votre règle d'automatisation a chiffré et envoyé le devis ${r.numero} (${r.total_ttc.toFixed(2)} € TTC) dans la conversation avec ${qui}.\n\nRetrouvez-le dans votre espace (Devis).`
        : `L'assistant a qualifié la demande de ${qui} et préparé un devis brouillon ${r.numero} (${r.total_ttc.toFixed(2)} € TTC).${prixNonSource
          ? `\n\nVotre règle d'automatisation ne l'a pas envoyé seule : une ligne a un prix estimé ou à chiffrer, qui ne vient ni de vos tarifs ni de vous. Un devis ne part jamais seul avec un prix deviné : vérifiez ce prix avant de l'envoyer.`
          : ''}\n\nRien n'est parti : relisez-le et envoyez-le en un clic depuis votre espace (Devis), ou depuis la conversation.`,
    }).catch(() => {})
  }

  return { fait: envoye ? 'devis_envoye' : 'devis_cree', devisId: r.id }
}

/**
 * À l'acceptation d'un devis par le client : l'acompte que la règle demande (pourcentage, et s'il part seul), ou null.
 *
 * 02/11 (S5 du chantier 4) : MÊME verrou d'offre que declencherRegles. La règle s'écrit depuis le navigateur (RLS) : sans ce verrou, un
 * compte Studio obtenait une facture d'acompte à chaque acceptation. Offre illisible = pas de règles (fail-closed).
 */
export async function acompteApresAcceptation(artisanId: string): Promise<{ pct: number; seul: boolean } | null> {
  const regle = await regleDe(artisanId)
  if (!regle) return null
  const { data: art } = await supabaseAdmin.from('artisans').select('plan').eq('id', artisanId).maybeSingle()
  if (!peut(art?.plan, 'plateforme.regles')) return null
  const pct = acompteALAcceptation(regle.maillons, regle.actif)
  return pct ? { pct, seul: acompteSeul(regle.maillons) } : null
}

export type ResultatAcompte =
  | { fait: 'rien' }
  | { fait: 'facture_emise'; pct: number; numero: string }
  | { fait: 'refusee'; pct: number; erreur: string }
  | { fait: 'acompte_prepare'; pct: number }

/**
 * La facture d'acompte de la règle, à l'acceptation d'un devis (02/11, décision de Benj sur Q-S5) : au choix de l'artisan, elle part
 * SEULE (émise et scellée par le chemin de la facture manuelle : mentions bloquantes, numérotation, scellement), ou elle est PRÉPARÉE :
 * l'artisan est prévenu et l'émet d'un clic depuis le devis (« Facturer », type Acompte). Un refus (mentions manquantes) ne casse pas
 * l'acceptation : l'artisan est prévenu. Jamais rien sans le verrou d'offre d'acompteApresAcceptation.
 */
export async function acompteALAcceptationDuDevis(
  p: { artisanId: string; leadId: string; devisId: string; devisNumero: string | null; artisanEmail: string | null; qui: string },
  dep: DependancesRegles = {},
): Promise<ResultatAcompte> {
  const a = await acompteApresAcceptation(p.artisanId)
  if (!a) return { fait: 'rien' }
  const notifierArtisan = dep.notifier ?? notifierArtisanReel
  if (!a.seul) {
    if (p.artisanEmail) {
      await notifierArtisan(p.artisanId, 'devis_accepte', p.artisanEmail, {
        leadId: p.leadId,
        subject: `Facture d'acompte de ${a.pct} % à émettre — ${p.qui}`,
        text: `Votre règle d'automatisation prépare une facture d'acompte de ${a.pct} % quand le client accepte : ${p.qui} vient d'accepter le devis ${p.devisNumero ?? ''}.\n\nComme vous l'avez réglé, elle n'est pas émise toute seule. Émettez-la d'un clic depuis votre espace (Devis → ${p.devisNumero ?? 'le devis'} → Facturer → Acompte, ${a.pct} %).`,
      }).catch(() => {})
    }
    return { fait: 'acompte_prepare', pct: a.pct }
  }
  const f = await (dep.creerFacture ?? creerFacture)({ artisanId: p.artisanId, devisId: p.devisId, acomptePct: a.pct })
  if (f.ok) {
    await supabaseAdmin.from('messages').insert({ lead_id: p.leadId, sens: 'out', type: 'facture_emise', contenu: `Facture d'acompte ${f.numero} (${a.pct} %)` })
    return { fait: 'facture_emise', pct: a.pct, numero: f.numero }
  }
  if (p.artisanEmail) {
    await notifierArtisan(p.artisanId, 'devis_accepte', p.artisanEmail, { leadId: p.leadId, subject: `Facture d'acompte non créée — ${p.qui}`, text: `Votre règle demande une facture d'acompte de ${a.pct} % à l'acceptation, mais elle n'a pas pu être créée :\n\n${f.error}\n\nCréez-la depuis votre espace (Factures) une fois le profil complété.` }).catch(() => {})
  }
  return { fait: 'refusee', pct: a.pct, erreur: f.error }
}
