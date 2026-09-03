import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { aReverifier, COLONNES_OBSERVATION, type Observation, type SourceObservation } from './types'

// Observations de prix (§8 F1/F3) — côté serveur.
//
// Une observation appartient à l'artisan qui l'a demandée : jamais mutualisée, jamais
// agrégée (art. L342-1 CPI). Tout passe par `artisan_id` ; le trigger SQL refuse de
// rattacher une observation à un matériau ou à un fournisseur d'un autre artisan.
//
// F3 (l'assistant de recherche) appelle `enregistrerObservation` avec `source: 'recherche_ia'`
// APRÈS validation de l'artisan — rien n'est écrit sans son clic.

export type ObservationEntree = {
  materiau_id?: string | null
  fournisseur_id?: string | null
  /** Nom figé si le fournisseur n'a pas de fiche (ex. saisi librement). */
  fournisseur_nom?: string | null
  designation_vue?: string | null
  prix_ht?: number | null
  prix_ttc?: number | null
  unite?: string | null
  url?: string | null
  source: SourceObservation
  /** Ce qui a été VU, cité tel quel (1-2 lignes). */
  extrait?: string | null
  disponibilite?: string | null
  /** Date de l'observation (ISO). Par défaut : maintenant. Jamais dans le futur. */
  vu_le?: string | null
}

const texte = (v: unknown, max: number): string | null => { const s = String(v ?? '').trim().slice(0, max); return s || null }
const nombre = (v: unknown): number | null => { const n = Number(v); return v !== null && v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null }
const urlValide = (v: unknown): string | null => { const s = texte(v, 1000); return s && /^https?:\/\//i.test(s) ? s : null }

export function nettoyerObservation(uid: string, e: ObservationEntree) {
  const vu = e.vu_le ? new Date(e.vu_le) : new Date()
  const vuLe = Number.isFinite(vu.getTime()) && vu.getTime() <= Date.now() + 60_000 ? vu : new Date()
  return {
    artisan_id: uid,
    materiau_id: e.materiau_id || null,
    fournisseur_id: e.fournisseur_id || null,
    fournisseur_nom: texte(e.fournisseur_nom, 120),
    designation_vue: texte(e.designation_vue, 300),
    prix_ht: nombre(e.prix_ht),
    prix_ttc: nombre(e.prix_ttc),
    unite: texte(e.unite, 16),
    url: urlValide(e.url),
    source: e.source,
    extrait: texte(e.extrait, 600),
    disponibilite: texte(e.disponibilite, 120),
    vu_le: vuLe.toISOString(),
  }
}

/**
 * Enregistre une observation pour CET artisan, et recopie la plus récente sur la fiche
 * du matériau (`prix_vu_*`) pour lister sans jointure.
 */
export async function enregistrerObservation(uid: string, e: ObservationEntree): Promise<{ id: string } | { error: string }> {
  if (!['recherche_ia', 'saisie', 'facture'].includes(e.source)) return { error: 'Source inconnue.' }
  const ligne = nettoyerObservation(uid, e)
  if (ligne.prix_ht === null && ligne.prix_ttc === null) return { error: 'Il faut un prix (HT ou TTC).' }

  // Le nom du fournisseur est figé au moment de l'observation.
  if (ligne.fournisseur_id && !ligne.fournisseur_nom) {
    const { data: f } = await supabaseAdmin.from('fournisseurs').select('nom').eq('id', ligne.fournisseur_id).eq('artisan_id', uid).maybeSingle()
    if (!f) return { error: 'Fournisseur introuvable.' }
    ligne.fournisseur_nom = f.nom
  }
  if (ligne.materiau_id) {
    const { data: m } = await supabaseAdmin.from('materiaux').select('id').eq('id', ligne.materiau_id).eq('artisan_id', uid).maybeSingle()
    if (!m) return { error: 'Matériau introuvable.' }
  }

  const { data, error } = await supabaseAdmin.from('prix_observations').insert(ligne).select('id').single()
  if (error) { console.error('[inventaire] observation:', error.message); return { error: 'Enregistrement impossible.' } }

  if (ligne.materiau_id) {
    // On ne recopie que si c'est la plus récente : une facture d'il y a 3 mois ne doit
    // pas écraser un prix vu hier.
    const { data: m } = await supabaseAdmin.from('materiaux').select('prix_vu_le').eq('id', ligne.materiau_id).maybeSingle()
    const plusRecente = !m?.prix_vu_le || new Date(m.prix_vu_le).getTime() <= new Date(ligne.vu_le).getTime()
    if (plusRecente) {
      await supabaseAdmin.from('materiaux').update({
        prix_vu_ht: ligne.prix_ht ?? ligne.prix_ttc, prix_vu_le: ligne.vu_le, prix_vu_url: ligne.url,
        prix_vu_source: ligne.source, disponibilite_vue: ligne.disponibilite, maj_le: new Date().toISOString(),
      }).eq('id', ligne.materiau_id).eq('artisan_id', uid)
    }
  }
  return { id: data.id }
}

/** L'historique des prix vus d'un matériau — de l'artisan, et de lui seul. */
export async function listerObservations(uid: string, materiauId: string, limite = 50): Promise<Observation[]> {
  const { data } = await supabaseAdmin.from('prix_observations')
    .select(COLONNES_OBSERVATION)
    .eq('artisan_id', uid).eq('materiau_id', materiauId)
    .order('vu_le', { ascending: false }).limit(limite)
  return ((data ?? []) as unknown as Omit<Observation, 'a_reverifier'>[]).map((o) => ({ ...o, a_reverifier: aReverifier(o.vu_le) }))
}
