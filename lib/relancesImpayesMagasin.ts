// La base derrière les relances automatiques de factures (lib/relancesImpayesTour.ts). Service uniquement : chaque lecture et chaque
// écriture porte l'identifiant du compte traité. Tables : migration 0159 (relances_impayes_reglages, relances_impayes, relances_impayes_arrets),
// élargie par 0181 (relances « à valider » de l'offre Studio : statuts a_valider et rejetee, colonnes sujet et texte).
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { jourParis } from './comptaTableau.ts'
import { JOURS_PAR_DEFAUT, type ArretFacture, type EntreeJournal, type FactureRelancable, type ReglagesRelances } from './relancesImpayes.ts'
import type { Magasin } from './relancesImpayesTour.ts'

const COLONNES = 'id, artisan_id, numero, statut, avoir_de, date_echeance, total_ttc, client_nom, client_email, devis_id'
const lire = <T>(r: { data: T | null; error: { message: string } | null }, quoi: string): T => {
  if (r.error) throw new Error(`${quoi} : ${r.error.message}`.slice(0, 160))
  return r.data as T
}

/** Les réglages d'un artisan tels qu'ils sont en base (ou ceux par défaut : désactivé). */
export function reglagesDeLigne(l: { actif?: boolean; jours?: number[] | null; textes?: unknown; actif_depuis?: string | null } | null | undefined): ReglagesRelances {
  const t = l?.textes && typeof l.textes === 'object' && !Array.isArray(l.textes) ? (l.textes as Record<string, unknown>) : {}
  const textes: ReglagesRelances['textes'] = {}
  for (const k of ['1', '2', '3'] as const) if (typeof t[k] === 'string' && (t[k] as string).trim()) textes[+k as 1 | 2 | 3] = t[k] as string
  return { actif: l?.actif === true, jours: Array.isArray(l?.jours) && l!.jours!.length ? l!.jours!.map(Number) : [...JOURS_PAR_DEFAUT], textes, actif_depuis: l?.actif_depuis ?? null }
}

export const magasinSupabase: Magasin = {
  async comptes(limite) {
    const rows = lire(await supabaseAdmin.from('relances_impayes_reglages').select('artisan_id, actif, jours, textes, actif_depuis').eq('actif', true).limit(limite), 'réglages')
    return (rows ?? []).map((r) => ({ artisan_id: r.artisan_id as string, reglages: reglagesDeLigne(r) }))
  },
  async artisan(id) {
    const r = lire(await supabaseAdmin.from('artisans').select('id, nom, email, plan, is_founder, leads_pause').eq('id', id).maybeSingle(), 'artisan')
    return r ?? null
  },
  async suspendu(id) {
    const { suspensionEnCours } = await import('@/lib/suspension')
    return (await suspensionEnCours(id)) !== null
  },
  async factures(artisanId) {
    const r = lire(await supabaseAdmin.from('factures').select(COLONNES).eq('artisan_id', artisanId).eq('statut', 'emise').is('avoir_de', null)
      .not('date_echeance', 'is', null).lt('date_echeance', jourParis(new Date())).limit(2000), 'factures')
    return (r ?? []) as FactureRelancable[]
  },
  async facture(artisanId, factureId) {
    const r = lire(await supabaseAdmin.from('factures').select(COLONNES).eq('artisan_id', artisanId).eq('id', factureId).maybeSingle(), 'facture')
    return (r ?? null) as FactureRelancable | null
  },
  async journal(artisanId) {
    const r = lire(await supabaseAdmin.from('relances_impayes').select('id, facture_id, rang, jour, statut, envoyee_le, destinataire').eq('artisan_id', artisanId).limit(5000), 'journal')
    return (r ?? []) as (EntreeJournal & { id: string; destinataire: string })[]
  },
  async arrets(artisanId) {
    const r = lire(await supabaseAdmin.from('relances_impayes_arrets').select('facture_id, raison, le, reprise_le').eq('artisan_id', artisanId).limit(5000), 'arrêts')
    return new Map((r ?? []).map((x) => [x.facture_id as string, { raison: x.raison, le: x.le, reprise_le: x.reprise_le } as ArretFacture]))
  },
  async reponseClient(artisanId, facture, depuis) {
    const email = String(facture.client_email ?? '').trim()
    const ids = new Set<string>()
    if (facture.devis_id) {
      const dv = lire<{ lead_id: string | null } | null>(await supabaseAdmin.from('devis').select('lead_id').eq('id', facture.devis_id).eq('artisan_id', artisanId).maybeSingle(), 'devis')
      if (dv?.lead_id) ids.add(dv.lead_id as string)
    }
    if (email) {
      const ls = lire(await supabaseAdmin.from('leads').select('id').eq('artisan_id', artisanId).in('contact', [...new Set([email, email.toLowerCase()])]).limit(50), 'leads')
      for (const l of ls ?? []) ids.add(l.id as string)
    }
    if (!ids.size) return false
    const ms = lire(await supabaseAdmin.from('messages').select('id').in('lead_id', [...ids]).eq('sens', 'in').gt('sent_at', depuis).limit(1), 'messages')
    return (ms ?? []).length > 0
  },
  async prendre(e) {
    const { data, error } = await supabaseAdmin.from('relances_impayes').insert({ ...e, statut: 'prise' }).select('id').maybeSingle()
    if (error) {
      if (error.code === '23505') return null // déjà prise (même rang, ou déjà un message vers ce client aujourd'hui)
      throw new Error(`prise : ${error.message}`.slice(0, 160))
    }
    return (data?.id as string) ?? null
  },
  async confirmer(id, maintenant) {
    lire(await supabaseAdmin.from('relances_impayes').update({ statut: 'envoyee', envoyee_le: maintenant.toISOString() }).eq('id', id).select('id').maybeSingle(), 'confirmation')
  },
  async relacher(id) {
    lire(await supabaseAdmin.from('relances_impayes').delete().eq('id', id).eq('statut', 'prise').select('id').maybeSingle(), 'relâche')
  },
  // Offre Studio (migration 0181 : statut « a_valider », colonnes sujet et texte). Sans 0181 la mise à jour est refusée par la base :
  // le passage rend alors la prise et n'envoie rien (fail-closed).
  async aValider(id, contenu) {
    const r = lire(await supabaseAdmin.from('relances_impayes').update({ statut: 'a_valider', sujet: contenu.sujet, texte: contenu.texte }).eq('id', id).eq('statut', 'prise').select('id').maybeSingle(), 'préparation')
    if (!r) throw new Error('préparation : la relance prise a disparu')
  },
  async notifierPreparee(artisan, n) {
    const { notifierArtisan } = await import('@/lib/notifications')
    await notifierArtisan(artisan.id, 'proposition', artisan.email, { subject: n.sujet, text: n.texte })
  },
  async arreter(artisanId, factureId, raison, maintenant) {
    lire(await supabaseAdmin.from('relances_impayes_arrets').upsert({ facture_id: factureId, artisan_id: artisanId, raison, le: maintenant.toISOString(), reprise_le: null }, { onConflict: 'facture_id' }).select('facture_id'), 'arrêt')
  },
}
