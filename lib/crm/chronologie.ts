// CRM — la CHRONOLOGIE d'un client (plan plans/crm-idees-twenty-1810.md, n°4) : UN fil daté, le plus récent en haut, de tout ce
// qui s'est passé avec lui — demande reçue, échanges, devis envoyé et signé, factures émises, payées et relancées, chantier
// ouvert et terminé, notes, rappels faits et relances envoyées. Module pur : des lignes en entrée, des évènements en sortie ;
// rejoué par scripts/crm-lot2-qa.mjs.
//
// Le client est reconnu par ses PIÈCES (lib/crm/clients.ts, regroupement) et ses notes par son identifiant actuel ET ses
// anciennes clés (audit de cohérence du 18/10, C4 : ajouter un e-mail changeait l'identifiant et la chronologie perdait ses
// notes). Ce module ne choisit rien : l'appelant lui donne les lignes du client.
//
// Minimisation (RGPD) : un échange est résumé (sens, canal, un extrait de 140 caractères au plus) ; le texte entier reste dans
// Messages. Rien n'est inventé : une date absente ne fabrique pas d'évènement.
import { jourParis } from '../comptaTableau.ts'

export const FILTRES_CHRONO = ['tout', 'echanges', 'argent', 'chantiers', 'notes'] as const
export type FiltreChrono = (typeof FILTRES_CHRONO)[number]
export const LIBELLES_FILTRE_CHRONO: Record<FiltreChrono, string> = { tout: 'Tout', echanges: 'Échanges', argent: 'Argent', chantiers: 'Chantiers', notes: 'Notes' }

export type Evenement = {
  cle: string
  /** Horodatage ISO (ou jour AAAA-MM-JJ) : sert au tri ; l'écran l'affiche en heure de Paris. */
  quand: string
  famille: Exclude<FiltreChrono, 'tout'>
  titre: string
  detail: string | null
  href: string | null
  /** Montant en centimes, quand l'évènement en porte un. */
  montant: number | null
}

type Nb = number | string | null | undefined
export type EntreesChrono = {
  leads: readonly { id: string; created_at?: string | null; canal?: string | null; type_chantier?: string | null; statut?: string | null }[]
  messages: readonly { id: string; lead_id: string; sens?: string | null; type?: string | null; contenu?: string | null; sent_at?: string | null }[]
  relancesConversation?: readonly { id: string; lead_id: string; rang?: number | null; planifiee_le?: string | null; envoyee?: boolean | null }[]
  devis: readonly { id: string; numero?: string | null; objet?: string | null; statut?: string | null; total_ttc?: Nb; created_at?: string | null; envoye_le?: string | null; accepte_le?: string | null; date_emission?: string | null }[]
  factures: readonly { id: string; numero?: string | null; statut?: string | null; total_ttc?: Nb; date_emission?: string | null; payee_le?: string | null; avoir_de?: string | null; objet?: string | null }[]
  relancesImpayes?: readonly { id: string; facture_id: string; rang?: number | null; envoyee_le?: string | null; statut?: string | null }[]
  chantiers: readonly { id: string; titre?: string | null; cree_le?: string | null; statut?: string | null; date_fin_reelle?: string | null }[]
  notes: readonly { id: string; texte: string; cree_le: string }[]
  rappels: readonly { id: string; type: string; texte?: string | null; echeance: string; fait_le?: string | null; envoye_le?: string | null }[]
}

const centimes = (v: Nb): number | null => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN; return Number.isFinite(n) ? Math.round(n * 100) : null }
const extrait = (s: string | null | undefined, max = 140): string | null => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  return [...t].length > max ? `${[...t].slice(0, max - 1).join('')}…` : t
}
const valide = (v: string | null | undefined): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const CANAUX: Record<string, string> = { page: 'votre page', email: 'e-mail', whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram', leboncoin: 'Le Bon Coin', telephone: 'téléphone' }
const TYPES_RAPPEL: Record<string, string> = { rappeler: 'Rappel', relancer_devis: 'Relance du devis', visite: 'Visite technique', metre: 'Métré', rendez_vous: 'Rendez-vous', autre: 'À faire' }

export function chronologie(e: EntreesChrono): Evenement[] {
  const ev: Evenement[] = []
  const pousser = (x: Evenement) => { if (valide(x.quand)) ev.push(x) }
  for (const l of e.leads) {
    pousser({ cle: `lead:${l.id}`, quand: l.created_at ?? '', famille: 'echanges', titre: 'Demande reçue', detail: [l.type_chantier, l.canal ? `par ${CANAUX[l.canal] ?? l.canal}` : null].filter(Boolean).join(' · ') || null, href: '/messages', montant: null })
  }
  for (const m of e.messages) {
    const entrant = m.sens === 'in'
    const titre = m.type === 'devis_accepte' ? 'Devis accepté dans la conversation' : m.type === 'facture_emise' ? 'Facture envoyée dans la conversation' : entrant ? 'Message du client' : m.type === 'reponse_auto' ? 'Réponse préparée par l’assistant, envoyée' : 'Votre réponse'
    pousser({ cle: `msg:${m.id}`, quand: m.sent_at ?? '', famille: 'echanges', titre, detail: extrait(m.contenu), href: '/messages', montant: null })
  }
  for (const r of e.relancesConversation ?? []) {
    if (!r.envoyee) continue
    pousser({ cle: `relconv:${r.id}`, quand: r.planifiee_le ?? '', famille: 'echanges', titre: `Relance n° ${r.rang ?? '?'} de la conversation`, detail: null, href: '/messages', montant: null })
  }
  for (const d of e.devis) {
    const nom = [d.numero ? `Devis ${d.numero}` : 'Devis', d.objet].filter(Boolean).join(' · ')
    const href = `/devis/${d.id}`
    pousser({ cle: `devis-cree:${d.id}`, quand: d.created_at ?? '', famille: 'argent', titre: 'Devis préparé', detail: nom, href, montant: centimes(d.total_ttc) })
    if (d.envoye_le) pousser({ cle: `devis-envoye:${d.id}`, quand: d.envoye_le, famille: 'argent', titre: 'Devis envoyé', detail: nom, href, montant: centimes(d.total_ttc) })
    if (d.accepte_le) pousser({ cle: `devis-signe:${d.id}`, quand: d.accepte_le, famille: 'argent', titre: 'Devis signé', detail: nom, href, montant: centimes(d.total_ttc) })
  }
  const annulees = new Set(e.factures.map((f) => f.avoir_de).filter((x): x is string => !!x))
  for (const f of e.factures) {
    if (f.statut === 'brouillon') continue
    const nom = [f.numero ? `Facture ${f.numero}` : 'Facture', f.objet].filter(Boolean).join(' · ')
    const titre = f.avoir_de ? 'Avoir émis' : annulees.has(f.id) ? 'Facture émise (annulée par un avoir)' : 'Facture émise'
    if (f.date_emission) pousser({ cle: `fact:${f.id}`, quand: f.date_emission, famille: 'argent', titre, detail: nom, href: '/factures', montant: centimes(f.total_ttc) })
    if (f.statut === 'payee' && f.payee_le) pousser({ cle: `fact-payee:${f.id}`, quand: f.payee_le, famille: 'argent', titre: 'Facture payée', detail: nom, href: '/factures', montant: centimes(f.total_ttc) })
  }
  const numeroFacture = new Map(e.factures.map((f) => [f.id, f.numero ?? null]))
  for (const r of e.relancesImpayes ?? []) {
    if (!r.envoyee_le) continue
    pousser({ cle: `relimp:${r.id}`, quand: r.envoyee_le, famille: 'argent', titre: `Relance de paiement n° ${r.rang ?? '?'} envoyée`, detail: numeroFacture.get(r.facture_id) ? `Facture ${numeroFacture.get(r.facture_id)}` : null, href: '/factures', montant: null })
  }
  for (const c of e.chantiers) {
    const href = `/crm/chantiers/${c.id}`
    pousser({ cle: `ch:${c.id}`, quand: c.cree_le ?? '', famille: 'chantiers', titre: 'Chantier ouvert', detail: c.titre ?? null, href, montant: null })
    if (c.statut === 'termine' && c.date_fin_reelle) pousser({ cle: `ch-fin:${c.id}`, quand: c.date_fin_reelle, famille: 'chantiers', titre: 'Chantier terminé', detail: c.titre ?? null, href, montant: null })
  }
  for (const n of e.notes) pousser({ cle: `note:${n.id}`, quand: n.cree_le, famille: 'notes', titre: 'Note', detail: n.texte, href: null, montant: null })
  for (const r of e.rappels) {
    if (r.envoye_le) pousser({ cle: `rap-env:${r.id}`, quand: r.envoye_le, famille: 'echanges', titre: r.type === 'relancer_devis' ? 'Relance du devis envoyée' : 'Message envoyé', detail: extrait(r.texte), href: null, montant: null })
    else if (r.fait_le) pousser({ cle: `rap:${r.id}`, quand: r.fait_le, famille: 'notes', titre: `${TYPES_RAPPEL[r.type] ?? 'Rappel'} fait`, detail: extrait(r.texte), href: null, montant: null })
  }
  // Le plus récent en haut ; à instant égal, un ordre stable (la clé).
  const instant = (q: string) => (/^\d{4}-\d{2}-\d{2}$/.test(q) ? `${q}T23:59:59.999Z` : new Date(Date.parse(q)).toISOString())
  return ev.sort((a, b) => instant(b.quand).localeCompare(instant(a.quand)) || a.cle.localeCompare(b.cle))
}

/** Le fil filtré (Tout / Échanges / Argent / Chantiers / Notes) et le compte de chaque filtre. */
export function filtrer(ev: readonly Evenement[], f: FiltreChrono): Evenement[] { return f === 'tout' ? [...ev] : ev.filter((x) => x.famille === f) }
export function comptes(ev: readonly Evenement[]): Record<FiltreChrono, number> {
  const c = { tout: ev.length, echanges: 0, argent: 0, chantiers: 0, notes: 0 }
  for (const x of ev) c[x.famille]++
  return c
}
/** Le jour (Paris) d'un évènement, pour grouper le fil par jour à l'écran. */
export const jourEvenement = (q: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(q) ? q : jourParis(new Date(Date.parse(q))))
