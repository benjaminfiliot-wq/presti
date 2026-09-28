// scripts/fixtures/026-acquisition/maquettes/stockage-factice.mjs — un `Stockage` (contrat 026-016) en mémoire, pour les
// juges de la maquette (maquette-lien-qa, atelier-maquettes-qa, fiche 026-080), écrit par Claude Code.
//
// `creerStockageFactice({ occupationOctets, panne })` : dépôt, retrait, lecture, occupation réglable (une base fixe, plus
// les fichiers réellement déposés), panne simulée (chaque appel lève). Chaque appel est gardé dans `.appels` (mise en
// scène et inspection, hors contrat).
export function creerStockageFactice({ occupationOctets = 0, panne = false } = {}) {
  const fichiers = new Map()
  const appels = []
  let base = Number(occupationOctets) || 0
  let enPanne = !!panne
  const cloner = (o) => new Uint8Array(o)
  return {
    appels,
    async deposer(chemin, octets, type) {
      appels.push({ methode: 'deposer', chemin, taille: octets?.length ?? 0, type })
      if (enPanne) throw new Error('stockage factice : panne simulée')
      fichiers.set(chemin, { octets: cloner(octets), type: type ?? null })
    },
    async retirer(chemin) {
      appels.push({ methode: 'retirer', chemin })
      if (enPanne) throw new Error('stockage factice : panne simulée')
      fichiers.delete(chemin)
    },
    async lire(chemin) {
      appels.push({ methode: 'lire', chemin })
      if (enPanne) throw new Error('stockage factice : panne simulée')
      const f = fichiers.get(chemin)
      return f ? cloner(f.octets) : null
    },
    async occupationOctets() {
      appels.push({ methode: 'occupationOctets' })
      return base + [...fichiers.values()].reduce((s, f) => s + f.octets.length, 0)
    },
    // ── Mise en scène et inspection (hors contrat) ──────────────────────────────────────────────────────────────────────
    fichiers,
    existe: (chemin) => fichiers.has(chemin),
    definirOccupation(o) { base = Number(o) || 0 },
    definirPanne(p) { enPanne = !!p },
    /** Dépose directement, sans passer par `deposer` (mise en scène : un objet déjà en place). */
    poser(chemin, octets, type) { fichiers.set(chemin, { octets: cloner(octets), type: type ?? null }) },
  }
}
