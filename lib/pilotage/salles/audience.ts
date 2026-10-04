// 026-178 — l'Audience : audience('jour') de lib/controle/lectures (026-174), la MÊME lecture que l'onglet Visiteurs du Poste.
// Des visites, jamais un visiteur : sans cookie ni IP, le flux ne porte que la page et la minute ; les inscriptions du jour sont un
// nombre ; aucune liste d'abonnés. Seuls les champs nommés ici sortent (le reste de la lecture est ignoré). Sous `audience`.
import type { Contexte } from '../station'
import { lignes, nombre } from './outils'

export async function lire(c: Contexte) {
  const a = await c.deps.lectures.audience('jour')
  if (a.direct.erreur || !a.direct.valeur) throw new Error(a.direct.erreur ?? 'mesure d’audience absente')
  const d = a.direct.valeur as Record<string, unknown>
  return {
    en_ligne: nombre(d.en_ligne), visiteurs_jour: nombre(d.visiteurs_jour), vues_jour: nombre(d.vues_jour),
    pages: lignes(d.pages_7j).map((p) => ({ page: String(p.cle ?? ''), vues: nombre(p.n) })),
    minutes: lignes(d.flux).map((v) => ({ minute: v.a ?? null, page: String(v.chemin ?? ''), entree: v.entree === true })),
    campagnes: lignes(d.campagnes_7j).map((x) => ({ cle: String(x.cle ?? ''), vues: nombre(x.n) })),
    inscriptions_jour: a.inscriptions.valeur ?? null,
    saturee: a.saturee ?? null,
  }
}
