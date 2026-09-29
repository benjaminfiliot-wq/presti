// scripts/contenu/lib/depot.mjs — l'adaptateur de dépôt de la fabrique de vidéos (fiche 026-209, étape 5).
//
// Parle au bus de Presti sous l'identité `contenu` SEULEMENT : le jeton PRESTI_JETON_CONTENU vient de l'environnement que
// `scripts/usine/avec-coffre.mjs` a construit à partir du coffre de l'usine ; il n'est jamais lu ailleurs, jamais écrit,
// jamais affiché (les messages ne citent que des codes). Jamais une clé de service. Il ne dépose que dans le bucket privé
// `contenu`, par des URL signées que la route rend, sur le modèle de `/api/agents/usine/depot` (026-200).
//
// La route `POST /api/agents/contenu/depot` reste à livrer [à vérifier le jour de la fiche] : tant qu'elle répond 404,
// `sonderDepot` rend `route_absente` et la fabrique s'arrête AVANT tout rendu, en le disant. Toutes les fonctions rendent
// un code, jamais une exception ; un 423 (`agent_en_pause`) devient `pause` : rien ne s'obstine en pause générale ni en
// pause de l'agent `contenu`.
import fs from 'node:fs'

const DELAI_MS = 30_000
const ESSAIS_PUT = 3

/** Un dépôt par route du bus, pour l'identité `contenu`. `env` est passé (jamais `process.env` lu ici). */
export function creerDepot({ env = {}, fetchImpl = globalThis.fetch } = {}) {
  const base = env.PRESTI_URL || 'https://prestiapp.fr'
  const jeton = env.PRESTI_JETON_CONTENU || null

  async function bus(route, corps) {
    if (!jeton) return { code: 'jeton_absent' }
    let r
    try {
      r = await fetchImpl(new URL(route, base), { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: JSON.stringify(corps ?? {}), signal: AbortSignal.timeout(DELAI_MS) })
    } catch { return { code: 'reseau' } }
    let json = null
    try { json = await r.json() } catch { /* corps absent ou illisible */ }
    if (r.status === 404) return { code: 'route_absente', status: 404 }
    if (r.status === 401 || r.status === 403) return { code: 'jeton_refuse', status: r.status }
    if (r.status === 423) return { code: 'pause', status: 423 } // agent_en_pause ou pause générale : même conduite
    if (r.status === 507) return { code: 'stockage', status: 507 }
    if (r.status >= 500) return { code: `bus_${r.status}`, status: r.status }
    if (r.status !== 200) return { code: `bus_${r.status}`, status: r.status }
    return { code: 'ok', json }
  }

  return {
    /** La route existe-t-elle, le jeton passe-t-il, l'agent n'est-il pas en pause ? */
    async sonderDepot() {
      const r = await bus('/api/agents/contenu/depot', { operation: 'sonder' })
      return r.code === 'ok' ? { ok: true } : { ok: false, code: r.code }
    },
    /** Les fichiers déjà déposés sous un préfixe, avec leur sha256 : l'état EXTERNE, lu avant toute reprise. */
    async lister(prefixe) {
      const r = await bus('/api/agents/contenu/depot', { operation: 'lister', prefixe })
      if (r.code !== 'ok' || !Array.isArray(r.json?.fichiers)) throw new Error(`lister : ${r.code}`)
      return r.json.fichiers.filter((f) => f && typeof f.nom === 'string' && typeof f.sha256 === 'string').map((f) => ({ nom: f.nom, sha256: f.sha256 }))
    },
    /** Dépose un fichier : la route rend une URL signée, le fichier y est envoyé (trois essais sur une panne du serveur). */
    async deposer(f) {
      const r = await bus('/api/agents/contenu/depot', { operation: 'deposer', fichiers: [{ nom: f.nom, octets: f.octets, type: f.type, sha256: f.sha256 }] })
      if (r.code !== 'ok') return { ok: false, code: r.code }
      const url = r.json?.depots?.find((d) => d?.nom === f.nom)?.url
      if (typeof url !== 'string') return { ok: false, code: 'url_absente' }
      let corps
      try { corps = f.contenu ?? fs.readFileSync(f.chemin) } catch { return { ok: false, code: 'fichier_absent' } }
      for (let essai = 1; essai <= ESSAIS_PUT; essai++) {
        try {
          const p = await fetchImpl(url, { method: 'PUT', headers: { 'content-type': f.type }, body: corps, signal: AbortSignal.timeout(DELAI_MS) })
          if (p.ok) return { ok: true }
          if (p.status < 500) return { ok: false, code: `put_${p.status}` }
        } catch { /* nouvel essai */ }
      }
      return { ok: false, code: 'put_echec' }
    },
    /** `ops_battement('contenu')` après un passage réussi ; faux (sans rien défaire) si l'agent est en pause. */
    async battement() {
      const r = await bus('/api/agents/battement')
      return r.code === 'ok'
    },
  }
}
