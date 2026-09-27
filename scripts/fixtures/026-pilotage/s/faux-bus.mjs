// scripts/fixtures/026-pilotage/s/faux-bus.mjs — le faux bus de station-reunion-qa (fiche 026-067), écrit par Claude Code.
// Un serveur 127.0.0.1 (port libre) qui imite, pour le seul jeton attendu, les quatre routes dont la réunion se sert :
//   POST /api/agents/reunion            { action: 'ouvrir' } → 200 { id } (ou 409 { code: 'deja_tenue' | 'pause' }) ;
//                                       { action: 'clore', id, lignes, objectif, idees } → 200 ;
//                                       { action: 'abandonner', id, motif } → 200 ;
//   GET  /api/agents/reunion/chiffres   → 200 { chiffres } (ou 503) ;
//   POST /api/agents/decisions          au contrat de 026-042 : { question, contexte?, options, defaut, montant_cents?,
//                                       portee, echeance, cle, tache? } → 201 { id, creee: true } (200 { creee: false } si
//                                       la clé est connue) ;
//   GET  /api/agents/evenements?apres=<id>&limite=<n> → 200 { evenements } (dont des consignes de Benj).
// Il REFUSE un corps mal nommé (clé inconnue, clé obligatoire absente, action inconnue) par 400, un jeton absent ou faux par
// 401, et CONSIGNE chaque appel, dans l'ordre : { methode, chemin, requete, corps, statut, jeton: 'bon' | 'faux' | 'absent' }
// (jamais la valeur du jeton). Rien ne sort de 127.0.0.1.
//   demarrerFauxBus({ jeton, scenario }) → { base, appels, arreter }
//   scenario : { ouvrir?: 'ok' | 'deja_tenue' | 'pause' | 'panne', chiffres?: 'ok' | 'panne', chiffresValeur?, evenements? }
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const lire = (nom) => JSON.parse(fs.readFileSync(path.join(ICI, nom), 'utf8'))
export const ID_REUNION = '90000000-0000-4000-8000-00000000c001'
const objet = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const seules = (x, permises, obligatoires) => objet(x) && Object.keys(x).every((k) => permises.includes(k)) && obligatoires.every((k) => k in x)

/** Le corps est-il au contrat ? → null, ou la raison du refus. */
export function corpsMalNomme(chemin, methode, corps) {
  if (chemin === '/api/agents/reunion' && methode === 'POST') {
    if (!objet(corps)) return 'corps illisible'
    if (corps.action === 'ouvrir') return seules(corps, ['action'], ['action']) ? null : 'ouvrir : { action } seul'
    if (corps.action === 'clore') return seules(corps, ['action', 'id', 'lignes', 'objectif', 'idees'], ['action', 'id', 'lignes', 'objectif', 'idees']) && Array.isArray(corps.lignes) && Array.isArray(corps.idees) && corps.idees.every((c) => typeof c === 'string') ? null : 'clore : { action, id, lignes, objectif, idees (clés) }'
    if (corps.action === 'abandonner') return seules(corps, ['action', 'id', 'motif'], ['action', 'id', 'motif']) && typeof corps.motif === 'string' ? null : 'abandonner : { action, id, motif }'
    return `action « ${corps.action} » inconnue`
  }
  if (chemin === '/api/agents/decisions' && methode === 'POST') {
    if (!seules(corps, ['question', 'contexte', 'options', 'defaut', 'montant_cents', 'portee', 'echeance', 'cle', 'tache'], ['question', 'options', 'defaut', 'portee', 'echeance', 'cle'])) return 'décision hors du contrat de 026-042 (clé inconnue ou obligatoire absente ; engage_cents, cle_idempotence et option_defaut sont propres au plan)'
    if (!Array.isArray(corps.options) || corps.options.length < 2 || corps.options.length > 3 || !corps.options.every((o) => seules(o, ['cle', 'libelle', 'recommandee'], ['cle', 'libelle']) && /^[a-z_]{2,30}$/.test(o.cle) && typeof o.libelle === 'string' && o.libelle.length >= 1 && o.libelle.length <= 80)) return 'options : 2 ou 3 { cle, libelle, recommandee }'
    if (!corps.options.some((o) => o.cle === corps.defaut)) return 'defaut : l’une des clés des options'
    return null
  }
  return null
}

export function demarrerFauxBus({ jeton, scenario = {} }) {
  const appels = []
  const cles = new Set()
  const chiffres = scenario.chiffresValeur ?? lire('chiffres-reunion.json').chiffres
  const evenements = scenario.evenements ?? lire('evenements.json').evenements.filter((e) => e.type === 'consigne' || e.type === 'reunion_close')
  const serveur = http.createServer((req, res) => {
    let brut = ''
    req.setEncoding('utf8')
    req.on('data', (d) => { brut += d })
    req.on('end', () => {
      const u = new URL(req.url, 'http://127.0.0.1')
      const auth = req.headers.authorization ?? ''
      const etatJeton = !auth ? 'absent' : auth === `Bearer ${jeton}` ? 'bon' : 'faux'
      let corps = null
      try { corps = brut ? JSON.parse(brut) : null } catch { corps = '(illisible)' }
      const repondre = (statut, x) => { appels.push({ methode: req.method, chemin: u.pathname, requete: u.search, corps, statut, jeton: etatJeton }); res.writeHead(statut, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)) }
      if (etatJeton !== 'bon') return repondre(401, { error: 'Jeton d’agent absent ou inconnu.' })
      const faute = corpsMalNomme(u.pathname, req.method, corps)
      if (faute) return repondre(400, { error: `Corps mal nommé : ${faute}` })
      if (u.pathname === '/api/agents/reunion' && req.method === 'POST') {
        if (corps.action === 'ouvrir') {
          const o = scenario.ouvrir ?? 'ok'
          if (o === 'deja_tenue') return repondre(409, { error: 'La réunion du jour est déjà tenue.', code: 'deja_tenue' })
          if (o === 'pause') return repondre(409, { error: 'Pause générale : pas de réunion.', code: 'pause' })
          if (o === 'panne') return repondre(503, { error: 'Base indisponible.' })
          return repondre(200, { id: ID_REUNION })
        }
        if (corps.id !== ID_REUNION) return repondre(404, { error: 'Réunion introuvable.', code: 'reunion' })
        return repondre(200, { ok: true })
      }
      if (u.pathname === '/api/agents/reunion/chiffres' && req.method === 'GET') return scenario.chiffres === 'panne' ? repondre(503, { error: 'Base indisponible.' }) : repondre(200, { chiffres })
      if (u.pathname === '/api/agents/decisions' && req.method === 'POST') {
        const connue = cles.has(corps.cle)
        cles.add(corps.cle)
        return repondre(connue ? 200 : 201, { id: `90000000-0000-4000-8000-${String(cles.size).padStart(12, '0')}`, creee: !connue })
      }
      if (u.pathname === '/api/agents/evenements' && req.method === 'GET') {
        const apres = Number(u.searchParams.get('apres') ?? 0)
        return repondre(200, { evenements: evenements.filter((e) => e.id > (Number.isFinite(apres) ? apres : 0)) })
      }
      return repondre(404, { error: 'Route inconnue du faux bus.' })
    })
  })
  // Une connexion gardée ouverte ne doit pas se fermer sous le script pendant qu'il attend le modèle (5 s par défaut dans
  // Node) : la requête d'abandon, envoyée après le délai, tomberait sur une socket fermée à l'instant, et le faux bus
  // inventerait une panne que le vrai bus n'a pas.
  serveur.keepAliveTimeout = 120_000
  serveur.headersTimeout = 121_000
  return new Promise((ok, ko) => {
    serveur.once('error', ko)
    serveur.listen(0, '127.0.0.1', () => ok({
      base: `http://127.0.0.1:${serveur.address().port}`,
      appels,
      arreter: () => new Promise((f) => { serveur.closeAllConnections?.(); serveur.close(() => f()) }),
    }))
  })
}
