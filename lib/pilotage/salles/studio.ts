// 026-178 — le Studio pubs : packs_pubs (0102), colonnes explicites sans adresse ni consigne. Les montants (prix_cents → euros)
// vont dans la sous-partie `montants` (comptabilite) ; sans elle la salle montre les packs et leur étape, jamais un prix. Sous `sante`.
import type { Contexte } from '../station'
import { lignes } from './outils'

export async function lire(c: Contexte) {
  const r = await c.deps.db.from('packs_pubs').select('id, etat, type, prix_cents, paye_le, livre_le').neq('etat', 'brouillon').order('cree_le', { ascending: false }).limit(20)
  if (r.error) throw new Error(`packs_pubs : ${r.error.message}`)
  const packs = lignes(r.data)
  return {
    packs: packs.map((p) => ({ id: p.id, etape: p.etat, type: p.type ?? 'locale', paye_le: p.paye_le ?? null, livre_le: p.livre_le ?? null })),
    montants: await c.env('salle.studio.montants', async () => packs.map((p) => ({ id: p.id, prix_eur: (p.prix_cents ?? 0) / 100 }))),
  }
}
const ETAPE_PACK: Record<string, string> = { payee: 'paye', fabriquee: 'fabrique', livree: 'livre' }
/** La ligne « packs » de la carte : packs_pubs compté par état ; « dossier » n'a pas de source (un brouillon n'est pas un dossier). */
export async function etapesPacks(c: Contexte) {
  const r = await c.deps.db.from('packs_pubs').select('id, etat').neq('etat', 'brouillon')
  if (r.error) throw new Error(`packs_pubs : ${r.error.message}`)
  const n: Record<string, number> = {}
  for (const p of lignes(r.data)) if (ETAPE_PACK[p.etat]) n[ETAPE_PACK[p.etat]] = (n[ETAPE_PACK[p.etat]] ?? 0) + 1
  return Object.entries(n).map(([etape, jour]) => ({ etape, jour }))
}
