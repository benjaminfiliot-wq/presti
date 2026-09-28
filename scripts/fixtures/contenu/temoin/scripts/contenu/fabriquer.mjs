// scripts/fixtures/contenu/temoin/scripts/contenu/fabriquer.mjs — TÉMOIN de `scripts/contenu/fabriquer.mjs`
// (026-209, partie « fabrication »). Refuse une ligne suspendue, un texte libre non approuvé, une idée dupliquée ;
// exige `vraisemblance()` (jev noul) sur chaque phrase chiffrée ; refuse une licence inconnue, une vidéo sans piste
// audio, ou une variante TikTok au-delà de 9,5 Mo — jamais un dépôt dans ces cas.
import { verdictChiffre, porteUneAffirmationChiffree } from '../../lib/contenu/_noyau'

export function verdictEntree(entree, ligne, ideesConnues) {
  if (ligne?.suspendue) return { ok: false, motif: 'ligne suspendue' }
  if (entree.texteLibre && !entree.approuve) return { ok: false, motif: 'texte libre non approuvé' }
  if (Array.isArray(ideesConnues) && ideesConnues.includes(entree.ideeId)) return { ok: false, motif: 'idée dupliquée' }
  return { ok: true }
}

export async function verdictPhrase(phrase, source, deps = {}) {
  if (!porteUneAffirmationChiffree(phrase)) return { ok: true }
  return verdictChiffre(phrase, source, deps)
}

export function verdictDepot(manifeste) {
  if (!manifeste.licence) return { ok: false, motif: 'licence inconnue' }
  if (manifeste.pisteAudio === false) return { ok: false, motif: 'vidéo silencieuse : aucune piste audio' }
  if (manifeste.reseau === 'tiktok' && (manifeste.tailleMo ?? 0) > 9.5) return { ok: false, motif: `taille ${manifeste.tailleMo} Mo > 9,5 Mo (TikTok)` }
  return { ok: true }
}
