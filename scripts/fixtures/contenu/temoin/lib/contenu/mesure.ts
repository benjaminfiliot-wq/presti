// scripts/fixtures/contenu/temoin/lib/contenu/mesure.ts — TÉMOIN de `lib/contenu/mesure.ts` (026-213, partie
// « mesure »). Une donnée indisponible reste `non_mesure` : jamais un zéro inventé. Toute formule publique qui
// attribue une vente à une ligne porte « estimation », jamais une certitude.
import { verdictChiffre, porteUneAffirmationChiffree } from './_noyau'
import type { DepsLecteur } from '@/lib/agents/llm'

export type MesureBrute = { valeur?: number | null; erreur?: boolean; source: string; le: string }
export type Mesure = { valeur: number | null; disponible: boolean; source: string; le: string }

export function normaliserMesure(brut: MesureBrute): Mesure {
  if (brut.erreur || brut.valeur === undefined || brut.valeur === null) return { valeur: null, disponible: false, source: brut.source, le: brut.le }
  return { valeur: brut.valeur, disponible: true, source: brut.source, le: brut.le }
}

export async function verdictFormulePublique(
  libelle: string,
  source: string | null | undefined,
  estAttributionVente: boolean,
  deps: DepsLecteur = {},
): Promise<{ ok: true } | { ok: false; motif: string }> {
  if (estAttributionVente && !/estimation/i.test(libelle)) {
    return { ok: false, motif: 'une vente attribuée à une ligne par fenêtre temporelle doit porter la mention « estimation »' }
  }
  if (porteUneAffirmationChiffree(libelle)) {
    const v = await verdictChiffre(libelle, source, deps)
    if (!v.ok) return { ok: false, motif: v.motif }
  }
  return { ok: true }
}
