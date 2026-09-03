// Devis brouillon depuis une conversation — la fonction que TOUT le monde appelle :
// le bouton « Devis auto » de la boîte (source 'manuel'), l'outil de l'assistant
// (source 'outil') et les règles d'automatisation (source 'regle'). Extraite de
// /api/devis/auto pour qu'il n'y ait qu'une seule façon de chiffrer une conversation.
//
// Idempotente pour les origines automatiques : un devis 'outil' ou 'regle' existe déjà pour
// ce lead → on le rend (`deja: true`) sans en créer un autre. L'index unique partiel de la
// migration 0050 garantit la même chose en base, même en rafale parallèle.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDevis } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import type { Tier } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'
import { catalogueDe } from '@/lib/prix'

export type SourceDevis = 'manuel' | 'outil' | 'regle'

export type ResultatDevisAuto =
  | { ok: true; id: string; numero: string; total_ttc: number; note: string | null; tier: Tier; deja: boolean }
  | { ok: false; error: string; outOfCredits?: boolean; status: 400 | 402 | 404 | 500 }

export async function creerDevisBrouillonPourLead(p: { artisanId: string; leadId: string; tier?: Tier | string; source: SourceDevis }): Promise<ResultatDevisAuto> {
  const { artisanId: uid, leadId, source } = p

  const { data: lead } = await supabaseAdmin
    .from('leads').select('id, artisan_id, nom_prospect, contact, message').eq('id', leadId).maybeSingle()
  if (!lead || lead.artisan_id !== uid) return { ok: false, error: 'Conversation introuvable', status: 404 }

  // Origine automatique : un seul devis par conversation, quoi qu'il arrive.
  if (source !== 'manuel') {
    const { data: existant } = await supabaseAdmin
      .from('devis').select('id, numero, total_ttc, notes').eq('lead_id', leadId).eq('source', source).maybeSingle()
    if (existant) return { ok: true, id: existant.id, numero: existant.numero, total_ttc: Number(existant.total_ttc || 0), note: existant.notes ?? null, tier: 'standard', deja: true }
  }

  const { data: art } = await supabaseAdmin
    .from('artisans').select('nom, metier, plan, is_founder, tva_regime').eq('id', uid).maybeSingle()
  if (!art) return { ok: false, error: 'Profil introuvable', status: 404 }

  // Description = besoin initial + tous les messages du prospect (ce qu'il a dit).
  const { data: msgs } = await supabaseAdmin
    .from('messages').select('sens, contenu').eq('lead_id', leadId).order('sent_at')
  const dits = (msgs ?? []).filter((m) => m.sens === 'in').map((m) => (m.contenu ?? '').trim()).filter(Boolean)
  const description = (dits.length ? dits.join('\n') : (lead.message ?? '')).slice(0, 4000)
  if (!description.trim()) return { ok: false, error: 'Pas assez d’éléments dans la conversation pour chiffrer.', status: 400 }

  const { model, tier } = resolveModel(typeof p.tier === 'string' ? p.tier : undefined, art.plan)
  const credit = await consumeCredit(uid, tier, !!art.is_founder)
  if (!credit.ok) return { ok: false, error: credit.error ?? 'Crédits épuisés — rechargez pour continuer.', outOfCredits: true, status: 402 }

  // Catalogue de prix (v4 §8) : SES tarifs d'abord, les ordres de grandeur du marché
  // en complément. Chaque poste porte sa provenance, que l'IA doit recopier telle quelle.
  let postes: Awaited<ReturnType<typeof catalogueDe>>['postes'] = []
  try { postes = (await catalogueDe(uid, art.metier)).postes } catch { /* pas de catalogue */ }

  let result: Awaited<ReturnType<typeof generateDevis>>
  try {
    result = await generateDevis({ nom: art.nom, metier: art.metier }, description, postes, model)
  } catch (e) {
    console.error('[devisAuto] IA:', e)
    return { ok: false, error: 'L’IA n’a pas pu générer le devis. Réessayez.', status: 500 }
  }

  // Création du devis (même logique que /api/devis) : numéro, totaux, lignes.
  const franchise = ((art.tva_regime as string | null) || 'franchise') === 'franchise'
  const eff = result.lignes.map((l) => normalizeLigne(l, franchise))
  const totals = computeTotals(eff, 0)
  const { data: nn } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'devis' })
  const numero = `DEV-${new Date().getFullYear()}-${String(nn ?? 1).padStart(4, '0')}`
  const clientEmail = lead.contact && lead.contact.includes('@') ? lead.contact.slice(0, 200) : null

  const { data: devis, error: dErr } = await supabaseAdmin
    .from('devis')
    .insert({
      artisan_id: uid, lead_id: leadId, source,
      numero, statut: 'brouillon', validite_jours: 90, remise_pct: 0, acompte_pct: 30,
      objet: `${art.metier || 'Travaux'} — ${lead.nom_prospect || 'client'}`.slice(0, 300),
      notes: result.note?.slice(0, 4000) || null,
      client_nom: (lead.nom_prospect || '').slice(0, 160) || null,
      client_email: clientEmail,
      total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc,
    })
    .select('id, numero').single()
  if (dErr) {
    // Course entre deux déclencheurs automatiques : l'index unique a tranché, on rend l'existant.
    if (source !== 'manuel' && /duplicate|unique/i.test(dErr.message)) {
      const { data: existant } = await supabaseAdmin.from('devis').select('id, numero, total_ttc, notes').eq('lead_id', leadId).eq('source', source).maybeSingle()
      if (existant) return { ok: true, id: existant.id, numero: existant.numero, total_ttc: Number(existant.total_ttc || 0), note: existant.notes ?? null, tier, deja: true }
    }
    console.error('[devisAuto] insert:', dErr.message)
    return { ok: false, error: 'Création du devis impossible', status: 500 }
  }

  if (eff.length) await supabaseAdmin.from('devis_lignes').insert(eff.map((l, i) => ({ devis_id: devis.id, ordre: i, ...l })))

  // On relie la conversation au devis (statut) sans casser gagné/perdu.
  await supabaseAdmin.from('leads').update({ statut: 'devis', updated_at: new Date().toISOString() }).eq('id', leadId).not('statut', 'in', '("gagne","perdu")')

  return { ok: true, id: devis.id, numero: devis.numero, total_ttc: totals.total_ttc, note: result.note ?? null, tier, deja: false }
}
