// scripts/fixtures/026-acquisition/horloge-factice.mjs — une `Horloge` (contrat 026-016) en temps virtuel, écrite par
// Claude Code pour les juges du domaine acquisition.
//
// `maintenant()` rend l'instant virtuel en millisecondes depuis l'époque ; `attendre(ms)` avance le temps virtuel de `ms`
// et rend la main tout de suite (aucune vraie attente : un juge de 45 s virtuelles tourne en quelques millisecondes).
// Le juge avance lui-même le temps par `avancer(ms)` (l'expiration d'un bail, 25 h après un message reçu…) et lit
// `attentes`, la liste de chaque attente demandée { a, ms }.
//
// Départ par défaut : le mercredi 14/10/2026 à 10 h à Paris (8 h UTC), un jour ouvré après DATE_PREMIER_ENVOI, en 2026
// (l'année courante de l'audit « © AAAA » de 026-020).
export const DEPART_DEFAUT = Date.parse('2026-10-14T08:00:00.000Z')

export function creerHorloge(depart = DEPART_DEFAUT) {
  let t = typeof depart === 'string' ? Date.parse(depart) : Number(depart)
  if (!Number.isFinite(t)) throw new Error(`horloge factice : départ invalide (${depart})`)
  const attentes = []
  return {
    maintenant: () => t,
    async attendre(ms) {
      const n = Number(ms)
      if (!Number.isFinite(n) || n < 0) throw new Error(`horloge factice : attente invalide (${ms})`)
      attentes.push({ a: t, ms: n })
      t += n
      await Promise.resolve()
    },
    /** Avance le temps sans passer par une attente du module jugé. */
    avancer(ms) { t += Number(ms) },
    /** L'instant virtuel en ISO. */
    iso: () => new Date(t).toISOString(),
    attentes,
  }
}
