// Apprentissage de l'artisan (few-shot, v5 §7) — l'assistant s'appuie sur SES réponses
// manuelles, SES devis acceptés et SES prix, injectés comme EXEMPLES dans le contexte.
//
// Règle absolue, répétée dans le prompt : un exemple montre le TON et la FORME. Ce n'est
// jamais un fait sur la demande en cours — ni un prix à recopier, ni un délai à promettre.
// Le bloc est plafonné (~1 500 tokens ≈ 6 000 caractères) : l'artisan le plus prolixe ne
// fait pas exploser le prompt.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sourceArtisan } from '@/lib/prix'

export type ExempleDevis = {
  objet: string | null
  lignes: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number }[]
}

export type ExemplesArtisan = {
  /** Ses 3 dernières réponses écrites à la main (sens 'out', type 'manuel'). */
  reponses: string[]
  /** Ses 3 derniers devis acceptés (objet + lignes). */
  devis: ExempleDevis[]
  /** Ses prix (prix_artisan) — désignation, unité, prix HT. */
  prix: { designation: string; unite: string; prix_ht: number }[]
}

export const EXEMPLES_VIDES: ExemplesArtisan = { reponses: [], devis: [], prix: [] }

/** Plafond du bloc injecté, en caractères (≈ 1 500 tokens à 4 caractères/token). */
export const PLAFOND_EXEMPLES = 6000

/**
 * Charge les exemples d'un artisan. Chaque source est indépendante et tolérante :
 * une table absente ou une erreur rend une liste vide, jamais une exception.
 */
export async function chargerExemples(artisanId: string): Promise<ExemplesArtisan> {
  if (!artisanId) return EXEMPLES_VIDES
  const [reponses, devis, prix] = await Promise.all([
    chargerReponses(artisanId).catch(() => [] as string[]),
    chargerDevisAcceptes(artisanId).catch(() => [] as ExempleDevis[]),
    sourceArtisan.catalogue({ artisanId, limite: 25 })
      .then((ps) => ps.map((p) => ({ designation: p.designation, unite: p.unite, prix_ht: p.prix_ht })))
      .catch(() => [] as ExemplesArtisan['prix']),
  ])
  return { reponses, devis, prix }
}

async function chargerReponses(artisanId: string): Promise<string[]> {
  // Les messages n'ont pas d'artisan_id : on passe par le lead (jointure interne + filtre).
  const { data } = await supabaseAdmin
    .from('messages')
    .select('contenu, sent_at, leads!inner(artisan_id)')
    .eq('leads.artisan_id', artisanId)
    .eq('sens', 'out').eq('type', 'manuel')
    .order('sent_at', { ascending: false })
    .limit(3)
  return ((data ?? []) as { contenu: string | null }[])
    .map((m) => (m.contenu ?? '').trim())
    .filter((c) => c.length >= 20)
}

async function chargerDevisAcceptes(artisanId: string): Promise<ExempleDevis[]> {
  const { data: ds } = await supabaseAdmin
    .from('devis').select('id, objet')
    .eq('artisan_id', artisanId).eq('statut', 'accepte')
    .order('updated_at', { ascending: false })
    .limit(3)
  const devis = (ds ?? []) as { id: string; objet: string | null }[]
  if (!devis.length) return []
  const { data: ls } = await supabaseAdmin
    .from('devis_lignes').select('devis_id, ordre, designation, quantite, unite, prix_unitaire_ht')
    .in('devis_id', devis.map((d) => d.id))
    .order('ordre', { ascending: true })
  const lignes = (ls ?? []) as { devis_id: string; designation: string | null; quantite: number; unite: string; prix_unitaire_ht: number }[]
  return devis.map((d) => ({
    objet: d.objet,
    lignes: lignes
      .filter((l) => l.devis_id === d.id && l.designation)
      .slice(0, 12)
      .map((l) => ({ designation: String(l.designation), quantite: Number(l.quantite), unite: l.unite || 'u', prix_unitaire_ht: Number(l.prix_unitaire_ht) })),
  })).filter((d) => d.lignes.length)
}

const tronquer = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

/**
 * Le bloc de prompt. `avecPrix` : true pour le CHIFFRAGE (les montants de ses devis passés
 * sont un repère de découpage), false pour une RÉPONSE (aucun montant ne doit pouvoir fuiter
 * dans un message au client).
 */
export function blocExemples(ex: ExemplesArtisan | null | undefined, opts: { avecPrix: boolean; plafond?: number }): string {
  if (!ex || (!ex.reponses.length && !ex.devis.length && !ex.prix.length)) return ''
  const plafond = opts.plafond ?? PLAFOND_EXEMPLES
  const parts: string[] = []

  if (ex.reponses.length) {
    parts.push(
      'Réponses que l\'artisan a écrites lui-même (imite le TON, les formules, la longueur — pas le contenu) :\n' +
        ex.reponses.slice(0, 3).map((r) => `« ${tronquer(r.replace(/\s+/g, ' '), 600)} »`).join('\n'),
    )
  }
  if (ex.devis.length) {
    parts.push(
      'Devis acceptés par ses clients (imite le DÉCOUPAGE en postes et la façon de nommer les lignes) :\n' +
        ex.devis.slice(0, 3).map((d) =>
          `- ${tronquer(d.objet || 'Devis', 80)} : ` +
          d.lignes.slice(0, 8).map((l) => `${tronquer(l.designation, 60)} (${l.quantite} ${l.unite}${opts.avecPrix ? ` à ${l.prix_unitaire_ht} € HT` : ''})`).join(' ; '),
        ).join('\n'),
    )
  }
  if (ex.prix.length) {
    parts.push(
      (opts.avecPrix ? 'Ses prix habituels (désignation | unité | prix HT) :\n' : 'Ce qu\'il vend habituellement (désignation | unité) — pour comprendre son offre, JAMAIS pour citer un prix :\n') +
        ex.prix.slice(0, 20).map((p) => `- ${tronquer(p.designation, 60)} | ${p.unite}${opts.avecPrix ? ` | ${p.prix_ht} €` : ''}`).join('\n'),
    )
  }

  let corps = parts.join('\n\n')
  if (corps.length > plafond) corps = corps.slice(0, plafond - 1).trimEnd() + '…'

  return `

EXEMPLES DE L'ARTISAN — ils montrent son TON et sa FORME, ce ne sont PAS des faits sur la demande actuelle. Ne recopie d'un exemple ni un prix, ni un délai, ni une promesse, ni un détail de chantier : chaque réponse repart de ce que CE client a écrit.
${corps}`
}
