// Le registre commun des relances (02/11, S4 du chantier 4 : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §3).
//
// Quatre chemins écrivent à un client au nom de l'artisan pour le relancer, et chacun ne lisait que SA trace :
//  • l'assistant et le pilote : assistant_actions (relancer_devis, relancer_facture exécutées, migration 0157) ;
//  • le CRM : crm_rappels.envoye_le (relance d'un devis, migration 0162) ;
//  • les impayés : relances_impayes.envoyee_le (migration 0159) ;
//  • la conversation : messages « relance » partis (cron du matin, app/api/cron/relances/route.ts).
// Un même client pouvait donc recevoir deux relances le même jour par deux chemins, et une lecture en erreur y valait « jamais relancé ».
// Ici une seule question, posée par chaque appelant juste AVANT l'envoi : ce dossier a-t-il été relancé, par n'importe quel chemin,
// depuis moins de RELANCE_DELAI_JOURS jours ?
//
// Le DOSSIER d'un objet : un devis, sa conversation (lead) et les factures de ce devis ; une facture, son devis et ce qui s'y rattache ;
// une conversation, ses devis et leurs factures. Chaque lecture est filtrée sur le compte (les messages, par une conversation du compte).
// Fail-closed : une lecture en erreur REFUSE la relance. Une table absente (migration non collée) est ignorée, et dite dans `ignorees`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const RELANCE_DELAI_JOURS = 3

export type CheminRelance = 'assistant' | 'crm' | 'impayes' | 'conversation'
export type TraceRelance = { chemin: CheminRelance; le: string }
export type Historique = { ok: true; traces: TraceRelance[]; ignorees: string[] } | { ok: false; erreur: string }
export type ObjetRelance = { type: 'devis' | 'facture' | 'lead'; id: string }
export type VerdictRelance =
  | { refus: false }
  | { refus: true; raison: 'illisible'; erreur: string }
  | { refus: true; raison: 'recente'; derniere: TraceRelance }

const LIBELLE_CHEMIN: Record<CheminRelance, string> = {
  assistant: 'par l’assistant', crm: 'depuis le CRM', impayes: 'par les relances d’impayés', conversation: 'dans la conversation',
}

/**
 * La décision, PURE. `sauf` : le chemin qui demande, quand il garde lui-même son propre rythme (les impayés à J+3, J+10, J+21 ; les
 * relances de conversation planifiées) — ses propres traces ne le bloquent pas, celles des autres chemins si. Une date illisible compte
 * comme récente (côté sûr).
 */
export function relanceRecente(h: Historique, maintenant: Date, opts: { delaiJours?: number; sauf?: CheminRelance } = {}): VerdictRelance {
  if (!h.ok) return { refus: true, raison: 'illisible', erreur: h.erreur }
  const delai = (opts.delaiJours ?? RELANCE_DELAI_JOURS) * 86_400_000
  const t = maintenant.getTime()
  const recentes = h.traces
    .filter((x) => x.chemin !== opts.sauf)
    .filter((x) => { const le = Date.parse(x.le); return !Number.isFinite(le) || t - le < delai })
    .sort((a, b) => b.le.localeCompare(a.le))
  return recentes.length ? { refus: true, raison: 'recente', derniere: recentes[0] } : { refus: false }
}

/** La phrase d'un refus, pour l'artisan (assistant, CRM). */
export function phraseRefus(v: VerdictRelance, jourFr: (iso: string) => string): string {
  if (!v.refus) return ''
  if (v.raison === 'illisible') return 'Le registre des relances est illisible pour le moment : rien ne part, réessayez dans un instant.'
  return `Ce client a déjà été relancé ${LIBELLE_CHEMIN[v.derniere.chemin]} le ${jourFr(v.derniere.le)} : on ne renvoie pas de relance avant ${RELANCE_DELAI_JOURS} jours.`
}

type Ligne = Record<string, unknown>
// Une TABLE absente (migration non collée) : PGRST205 ou 42P01, rien d'autre. 02/11 (contre-audit 032-004, D6) : une colonne absente
// (42703, PGRST204) passait pour une table absente, était ignorée, et la relance partait : c'est une erreur, donc un refus.
const ABSENTE = /PGRST205|42P01/
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

/** Les relances PARTIES du dossier de `objet`, par les quatre chemins. Lecture seule ; `client` : supabaseAdmin hors essais. */
export async function historiqueRelances(artisanId: string, objet: ObjetRelance, client: Pick<SupabaseClient, 'from'> = supabaseAdmin): Promise<Historique> {
  const ignorees: string[] = []
  const lire = async (table: string, q: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>): Promise<Ligne[]> => {
    const { data, error } = await q
    if (error) {
      if (ABSENTE.test(`${error.code ?? ''} ${error.message ?? ''}`)) { ignorees.push(table); return [] }
      throw new Error(`${table} : ${error.message ?? 'lecture refusée'}`)
    }
    if (!Array.isArray(data)) throw new Error(`${table} : réponse illisible`)
    return data as Ligne[]
  }
  try {
    const devisIds = new Set<string>(), factureIds = new Set<string>()
    let leadId: string | null = null
    if (objet.type === 'devis') {
      const [d] = await lire('devis', client.from('devis').select('id, lead_id').eq('artisan_id', artisanId).eq('id', objet.id).limit(1))
      if (!d) return { ok: false, erreur: 'devis introuvable sur ce compte' }
      devisIds.add(String(d.id)); leadId = txt(d.lead_id)
    } else if (objet.type === 'facture') {
      const [f] = await lire('factures', client.from('factures').select('id, devis_id').eq('artisan_id', artisanId).eq('id', objet.id).limit(1))
      if (!f) return { ok: false, erreur: 'facture introuvable sur ce compte' }
      factureIds.add(String(f.id))
      const devisId = txt(f.devis_id)
      if (devisId) {
        const [d] = await lire('devis', client.from('devis').select('id, lead_id').eq('artisan_id', artisanId).eq('id', devisId).limit(1))
        if (d) { devisIds.add(String(d.id)); leadId = txt(d.lead_id) }
      }
    } else {
      const [l] = await lire('leads', client.from('leads').select('id').eq('artisan_id', artisanId).eq('id', objet.id).limit(1))
      if (!l) return { ok: false, erreur: 'conversation introuvable sur ce compte' }
      leadId = String(l.id)
    }
    if (leadId) for (const d of await lire('devis', client.from('devis').select('id').eq('artisan_id', artisanId).eq('lead_id', leadId).limit(50))) devisIds.add(String(d.id))
    if (devisIds.size) for (const f of await lire('factures', client.from('factures').select('id').eq('artisan_id', artisanId).in('devis_id', [...devisIds]).limit(200))) factureIds.add(String(f.id))

    const traces: TraceRelance[] = []
    const objets = [...devisIds, ...factureIds]
    if (objets.length) {
      for (const a of await lire('assistant_actions', client.from('assistant_actions').select('maj_le').eq('artisan_id', artisanId).in('outil', ['relancer_devis', 'relancer_facture']).eq('statut', 'executee').in('objet_id', objets).order('maj_le', { ascending: false }).limit(20))) traces.push({ chemin: 'assistant', le: String(a.maj_le) })
    }
    if (devisIds.size) {
      for (const r of await lire('crm_rappels', client.from('crm_rappels').select('envoye_le').eq('artisan_id', artisanId).in('devis_id', [...devisIds]).not('envoye_le', 'is', null).order('envoye_le', { ascending: false }).limit(20))) traces.push({ chemin: 'crm', le: String(r.envoye_le) })
    }
    if (factureIds.size) {
      for (const r of await lire('relances_impayes', client.from('relances_impayes').select('envoyee_le').eq('artisan_id', artisanId).in('facture_id', [...factureIds]).not('envoyee_le', 'is', null).order('envoyee_le', { ascending: false }).limit(20))) traces.push({ chemin: 'impayes', le: String(r.envoyee_le) })
    }
    if (leadId) {
      // Une relance PROPOSÉE (offre Studio, pas encore validée) ou écartée n'est pas partie : elle ne compte pas.
      for (const m of await lire('messages', client.from('messages').select('sent_at, etat').eq('lead_id', leadId).eq('type', 'relance').eq('sens', 'out').order('sent_at', { ascending: false }).limit(20))) {
        if (m.etat !== 'proposition' && m.etat !== 'rejete') traces.push({ chemin: 'conversation', le: String(m.sent_at) })
      }
    }
    return { ok: true, traces, ignorees }
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : String(e) }
  }
}
